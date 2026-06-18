import { Request, Response } from 'express';
import prisma from '../config/db';
import redis from '../config/redis';
import { fetchLatestNews } from '../services/newsService';
import { scrapeArticle } from '../services/scraperService';
import { synthesizeArticle } from '../services/aiService';
import { sanitizeImageUrl, extractOgImageFromUrl } from '../utils/imageUtils';
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
  markIngestionScraping,
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
async function invalidateIngestionCache(
  ctx: PipelineContext,
  hadIngest: boolean,
  additionalCategories?: string[]
): Promise<void> {
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

  if (additionalCategories) {
    additionalCategories.forEach((cat) => {
      keysToDelete.add(`homepage:news:${cat}`);
    });
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
): Promise<{
  ingestedCount: number;
  skippedCount: number;
  errorsCount: number;
  createdArticles?: any[];
}> {
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

    // Phase 1: save RSS stubs immediately (scraper happens in background later)
    const stubRecords = [];
    for (const raw of newArticles) {
      const created = await prisma.article.create({
        data: {
          sourceUrl: raw.realUrl || raw.url,
          headline: raw.title.substring(0, 100),
          summary: raw.description || raw.title,
          content: null,
          rawContent: null,
          sentiment: 'Neutral',
          categories: buildStubCategories(raw, ctx),
          sourceName: raw.source,
          imageUrl: null,
          enrichmentStatus: 'pending',
        },
      });
      stubRecords.push(created);
    }

    ingestedCount = stubRecords.length;
    console.log(`[Pipeline] Saved ${stubRecords.length} stub articles (pending enrichment).`);
    await invalidateIngestionCache(ctx, true);
    return { ingestedCount, skippedCount, errorsCount, createdArticles: stubRecords };
  } catch (error) {
    console.error('[Pipeline] Critical error during ingestion pipeline execution:', error);
    throw error;
  }
}

/**
 * Scrapes saved articles in the background and populates their rawContent and imageUrl fields.
 */
async function scrapeArticlesInBackground(articles: any[], ctx: PipelineContext) {
  console.log(`[Pipeline Background] Starting background scraping for ${articles.length} articles...`);

  await runWithConcurrency(articles, SCRAPE_CONCURRENCY, async (article) => {
    try {
      console.log(`[Pipeline Background] Crawling article: "${article.headline}"`);
      const scrapeResult = await scrapeArticle(article.sourceUrl, article.headline);
      const cleanedImageUrl = sanitizeImageUrl(scrapeResult.imageUrl) || null;

      const updatedArticle = await prisma.article.update({
        where: { id: article.id },
        data: {
          rawContent: scrapeResult.markdown,
          imageUrl: cleanedImageUrl,
        },
      });

      console.log(`[Pipeline Background] Scraped & saved background details for: "${article.headline}"`);
      // Invalidate cache immediately for this article's categories
      await invalidateIngestionCache(ctx, true, updatedArticle.categories);
    } catch (err) {
      console.error(`[Pipeline Background] Failed to scrape background details for ${article.sourceUrl}:`, err);
    }
  });

  console.log(`[Pipeline Background] Completed background scraping. Invalidating caches.`);
  await invalidateIngestionCache(ctx, true);
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
      if (result.createdArticles && result.createdArticles.length > 0) {
        markIngestionScraping(); // transition to scraping status in background

        const ctx: PipelineContext = {
          targetCategory: category,
          targetCountry: country,
          targetSearch: search?.trim() || undefined,
        };
        
        scrapeArticlesInBackground(result.createdArticles, ctx)
          .then(() => {
            markIngestionComplete({
              ingestedCount: result.ingestedCount,
              skippedCount: result.skippedCount,
              errorsCount: result.errorsCount,
            });
          })
          .catch((err) => {
            console.error('[Pipeline Background] Scrape error:', err);
            markIngestionComplete({
              ingestedCount: result.ingestedCount,
              skippedCount: result.skippedCount,
              errorsCount: result.errorsCount,
            });
          });
      } else {
        markIngestionComplete({
          ingestedCount: result.ingestedCount,
          skippedCount: result.skippedCount,
          errorsCount: result.errorsCount,
        });
      }
    })
    .catch((error: Error) => {
      markIngestionError(error.message || 'Unknown error');
    });
}
