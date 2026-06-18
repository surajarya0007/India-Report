import { Request, Response } from 'express';
import prisma from '../config/db';
import redis from '../config/redis';
import { fetchLatestNews } from '../services/newsService';
import { scrapeArticle } from '../services/scraperService';
import { synthesizeArticle } from '../services/aiService';
import { sanitizeImageUrl } from '../utils/imageUtils';
import {
  GEMINI_INPUT_MAX_CHARS,
  GEMINI_RPM_DELAY_BY_MODEL,
  GEMINI_RPM_DELAY_MS,
  SCRAPE_CONCURRENCY,
} from '../config/constants';
import {
  getIngestionStatus,
  isIngestionRunning,
  markIngestionComplete,
  markIngestionError,
  markIngestionStarted,
} from '../services/ingestionStatus';

interface PipelineContext {
  targetCategory?: string;
  targetCountry?: string;
  targetSearch?: string;
}

function buildStubCategories(raw: { category?: string[] }, ctx: PipelineContext): string[] {
  const categories: string[] = [];

  if (raw.category?.length) {
    raw.category.forEach((c) => {
      const lower = c.toLowerCase();
      if (lower.includes('tech') || lower.includes('science')) categories.push('Tech');
      if (lower.includes('business') || lower.includes('economy')) categories.push('Business');
      if (lower.includes('finance')) categories.push('Finance');
      if (lower.includes('politics') || lower.includes('government')) categories.push('Politics');
      if (lower.includes('entertainment') || lower.includes('art') || lower.includes('culture')) categories.push('Entertainment');
      if (lower.includes('sport')) categories.push('Sports');
      if (lower.includes('world') || lower.includes('regional')) categories.push('World');
      if (lower.includes('health') || lower.includes('medical')) categories.push('Health');
    });
  }

  if (categories.length === 0 && ctx.targetCategory) {
    const capitalized = ctx.targetCategory.charAt(0).toUpperCase() + ctx.targetCategory.slice(1);
    const mapped = capitalized === 'Technology' ? 'Tech' : capitalized === 'Sports' ? 'Sports' : capitalized;
    categories.push(mapped);
  }

  if (categories.length === 0) {
    categories.push('Tech');
  }

  return applyFilterCategories(categories, ctx);
}

function applyFilterCategories(categories: string[], ctx: PipelineContext): string[] {
  const finalCategories = [...categories];

  if (ctx.targetCountry === 'IN' && !finalCategories.includes('India')) {
    finalCategories.push('India');
  }
  if (ctx.targetCategory === 'world' && !finalCategories.includes('World')) {
    finalCategories.push('World');
  }
  if (ctx.targetCategory === 'politics' && !finalCategories.includes('Politics')) {
    finalCategories.push('Politics');
  }
  if (ctx.targetCategory === 'sports' && !finalCategories.includes('Sports')) {
    finalCategories.push('Sports');
  }
  if (ctx.targetCategory) {
    const capitalized = ctx.targetCategory.charAt(0).toUpperCase() + ctx.targetCategory.slice(1);
    const mappedCat = capitalized === 'Technology' ? 'Tech' : capitalized === 'Sports' ? 'Sports' : capitalized;
    const allowed = ['Tech', 'Business', 'Science', 'Health', 'Entertainment', 'Finance', 'Politics', 'World', 'India', 'Sports'];
    if (allowed.includes(mappedCat) && !finalCategories.includes(mappedCat)) {
      finalCategories.push(mappedCat);
    }
  }
  if (ctx.targetSearch && !finalCategories.includes(ctx.targetSearch)) {
    finalCategories.push(ctx.targetSearch);
  }

  return finalCategories;
}

function mapCategoryToCacheKey(category?: string): string | undefined {
  if (!category) return undefined;
  const lower = category.toLowerCase();
  if (lower === 'technology') return 'Tech';
  if (lower === 'world') return 'World';
  if (lower === 'sports') return 'Sports';
  const capitalized = category.charAt(0).toUpperCase() + category.slice(1);
  return capitalized === 'Technology' ? 'Tech' : capitalized;
}

/**
 * Invalidate only the Redis keys affected by this ingest run.
 */
async function invalidateIngestionCache(ctx: PipelineContext, hadIngest: boolean): Promise<void> {
  if (!hadIngest || !redis) return;

  const keysToDelete = new Set<string>(['homepage:news:all']);

  if (ctx.targetCountry === 'IN') {
    keysToDelete.add('homepage:news:India');
  }

  const cacheCategory = mapCategoryToCacheKey(ctx.targetCategory);
  if (cacheCategory) {
    keysToDelete.add(`homepage:news:${cacheCategory}`);
  }

  if (ctx.targetSearch) {
    keysToDelete.add(`homepage:news:search:${ctx.targetSearch.toLowerCase()}`);
  }

  const keys = [...keysToDelete];
  console.log(`[Pipeline] Invalidating Redis cache keys: ${keys.join(', ')}`);
  await redis.del(...keys);
}

function buildFallbackSynthesis(
  raw: { title: string; description: string; category?: string[] },
  rawContent: string,
  ctx: PipelineContext
) {
  return {
    headline: raw.title.substring(0, 100),
    summary: raw.description || 'Details are available at the source link.',
    content: rawContent || raw.description || 'Full factual content could not be synthesized. Please read the full story at the source link.',
    sentiment: 'Neutral' as const,
    categories: (() => {
      const cats = buildStubCategories(raw, ctx).filter((c) =>
        ['Tech', 'Business', 'Science', 'Health', 'Entertainment', 'Finance'].includes(c)
      );
      return cats.length > 0 ? cats : ['Tech'];
    })(),
    modelUsed: undefined as string | undefined,
  };
}

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await fn(items[index], index);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * Executes the ingestion pipeline:
 * 1. Fetch RSS articles (up to INGEST_LIMIT)
 * 2. Batch dedup + save stubs immediately (enrichmentStatus: pending)
 * 3. Scrape (parallel) → Gemini (sequential) → update rows (enrichmentStatus: complete)
 */
export async function runIngestionPipeline(
  category?: string,
  country?: string,
  search?: string
): Promise<{ ingestedCount: number; skippedCount: number; errorsCount: number }> {
  let ingestedCount = 0;
  let skippedCount = 0;
  let errorsCount = 0;

  const ctx: PipelineContext = {
    targetCategory: category,
    targetCountry: country,
    targetSearch: search?.trim() || undefined,
  };

  try {
    console.log(
      `[Pipeline] Ingestion pipeline started. Target category: ${ctx.targetCategory || 'none'}, Target country: ${ctx.targetCountry || 'none'}, Search: ${ctx.targetSearch || 'none'}`
    );

    const rawArticles = await fetchLatestNews(ctx.targetCategory, ctx.targetCountry, ctx.targetSearch);
    console.log(`[Pipeline] Found ${rawArticles.length} raw articles to process.`);

    if (rawArticles.length === 0) {
      return { ingestedCount, skippedCount, errorsCount };
    }

    const urls = rawArticles.map((a) => a.url).filter(Boolean);
    const existingRows = await prisma.article.findMany({
      where: { sourceUrl: { in: urls } },
      select: { sourceUrl: true },
    });
    const existingUrls = new Set(existingRows.map((r) => r.sourceUrl));

    const newArticles = rawArticles.filter((raw) => {
      if (existingUrls.has(raw.url)) {
        skippedCount++;
        return false;
      }
      return true;
    });

    if (newArticles.length === 0) {
      console.log('[Pipeline] All articles already exist. Nothing to ingest.');
      return { ingestedCount, skippedCount, errorsCount };
    }

    // Phase 1: save RSS stubs immediately
    const stubRecords = await Promise.all(
      newArticles.map((raw) =>
        prisma.article.create({
          data: {
            sourceUrl: raw.url,
            headline: raw.title.substring(0, 100),
            summary: raw.description || raw.title,
            content: raw.description || null,
            sentiment: 'Neutral',
            categories: buildStubCategories(raw, ctx),
            sourceName: raw.source,
            imageUrl: null,
            enrichmentStatus: 'pending',
          },
        })
      )
    );

    ingestedCount = stubRecords.length;
    console.log(`[Pipeline] Saved ${stubRecords.length} stub articles (pending enrichment).`);
    await invalidateIngestionCache(ctx, true);

    // Phase 2: scrape in parallel batches, enrich sequentially with Gemini
    type EnrichTarget = { raw: (typeof newArticles)[0]; articleId: string };

    const enrichTargets: EnrichTarget[] = newArticles.map((raw, i) => ({
      raw,
      articleId: stubRecords[i].id,
    }));

    const scrapeResults = await runWithConcurrency(enrichTargets, SCRAPE_CONCURRENCY, async ({ raw }) => {
      let rawContent = '';
      let articleImageUrl: string | undefined;
      const scrapeUrl = raw.realUrl || raw.url;

      try {
        const scrapeResult = await scrapeArticle(scrapeUrl, raw.title);
        rawContent = scrapeResult.markdown;
        articleImageUrl = scrapeResult.imageUrl;
      } catch (scrapeError) {
        console.warn(`[Pipeline] Scraper failed for ${scrapeUrl}. Falling back to description:`, scrapeError);
        rawContent = raw.description || raw.title;
      }

      return { rawContent, articleImageUrl };
    });

    let lastModelDelay = GEMINI_RPM_DELAY_MS;

    for (let i = 0; i < enrichTargets.length; i++) {
      const { raw, articleId } = enrichTargets[i];
      const { rawContent, articleImageUrl } = scrapeResults[i];

      try {
        console.log(`[Pipeline] Enriching article: "${raw.title}"`);

        const trimmedContent = rawContent.slice(0, GEMINI_INPUT_MAX_CHARS);

        let synthesis;
        try {
          const result = await synthesizeArticle(raw.title, trimmedContent);
          synthesis = result;
          if (result.modelUsed) {
            lastModelDelay = GEMINI_RPM_DELAY_BY_MODEL[result.modelUsed] ?? GEMINI_RPM_DELAY_MS;
          }
        } catch (geminiError) {
          console.warn(`[Pipeline] Gemini synthesis failed for "${raw.title}". Falling back to raw metadata:`, geminiError);
          synthesis = buildFallbackSynthesis(raw, rawContent, ctx);
        }

        const finalCategories = applyFilterCategories(synthesis.categories, ctx);
        const cleanedImageUrl = sanitizeImageUrl(articleImageUrl);
        if (articleImageUrl && !cleanedImageUrl) {
          console.log(`[Pipeline] Rejected Google News placeholder image for "${raw.title}"`);
        }

        await prisma.article.update({
          where: { id: articleId },
          data: {
            headline: synthesis.headline,
            summary: synthesis.summary,
            content: synthesis.content,
            sentiment: synthesis.sentiment,
            categories: finalCategories,
            imageUrl: cleanedImageUrl,
            enrichmentStatus: 'complete',
          },
        });

        console.log(`[Pipeline] Enriched: "${synthesis.headline}"`);

        if (i < enrichTargets.length - 1) {
          console.log(`[Pipeline] Waiting ${lastModelDelay / 1000}s before next article (RPM pacing)...`);
          await new Promise((resolve) => setTimeout(resolve, lastModelDelay));
        }
      } catch (err) {
        console.error(`[Pipeline] Error enriching article at ${raw.url}:`, err);
        errorsCount++;
      }
    }

    await invalidateIngestionCache(ctx, ingestedCount > 0);

    console.log(`[Pipeline] Pipeline finished. Ingested: ${ingestedCount}, Skipped: ${skippedCount}, Errors: ${errorsCount}`);
  } catch (error) {
    console.error('[Pipeline] Critical error during ingestion pipeline execution:', error);
    throw error;
  }

  return { ingestedCount, skippedCount, errorsCount };
}

/**
 * GET /api/news/ingest/status
 */
export function getIngestionStatusHandler(_req: Request, res: Response) {
  res.status(200).json({
    success: true,
    ...getIngestionStatus(),
  });
}

/**
 * POST /api/news/ingest — returns 202 immediately; pipeline runs in background.
 */
export async function triggerIngestion(req: Request, res: Response) {
  if (isIngestionRunning()) {
    return res.status(202).json({
      success: true,
      ...getIngestionStatus(),
    });
  }

  const category = req.query.category as string;
  const country = req.query.country as string;
  const search = req.query.search as string;

  markIngestionStarted();

  res.status(202).json({
    success: true,
    status: 'processing',
    message: 'Ingestion pipeline started. Poll /api/news/ingest/status for progress.',
  });

  void runIngestionPipeline(category, country, search)
    .then((result) => {
      markIngestionComplete(result);
    })
    .catch((error: Error) => {
      markIngestionError(error.message || 'Unknown error');
    });
}
