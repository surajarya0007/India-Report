import { Request, Response } from 'express';
import prisma from '../config/db';
import redis from '../config/redis';
import { sanitizeArticleImage, sanitizeImageUrl } from '../utils/imageUtils';
import { DISPLAY_LIMIT, GEMINI_INPUT_MAX_CHARS } from '../config/constants';
import { scrapeArticle } from '../services/scraperService';
import { synthesizeArticle } from '../services/aiService';

const CACHE_TTL = 3600;

const LIST_SELECT = {
  id: true,
  sourceUrl: true,
  headline: true,
  summary: true,
  imageUrl: true,
  categories: true,
  sentiment: true,
  sourceName: true,
  enrichmentStatus: true,
  createdAt: true,
} as const;

/**
 * GET /api/news — list endpoint (no full content field).
 */
export async function getRecentNews(req: Request, res: Response) {
  const category = req.query.category as string;
  const search = req.query.search as string;
  const cacheKey = search
    ? `homepage:news:search:${search.toLowerCase()}`
    : category && category !== 'Home' && category !== 'undefined'
      ? `homepage:news:${category}`
      : 'homepage:news:all';

  try {
    if (redis) {
      try {
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
          console.log(`[NewsController] Cache hit for "${cacheKey}". Returning cached data.`);
          const parsedData = typeof cachedData === 'string' ? JSON.parse(cachedData) : cachedData;
          const sanitized = Array.isArray(parsedData)
            ? parsedData.map((a) => sanitizeArticleImage(a))
            : parsedData;
          return res.status(200).json({
            success: true,
            source: 'cache',
            data: sanitized,
          });
        }
      } catch (redisError) {
        console.error('[NewsController] Redis read error (bypassing cache):', redisError);
      }
    }

    console.log(`[NewsController] Cache miss for "${cacheKey}". Querying database...`);

    let whereClause = {};
    if (search) {
      whereClause = {
        OR: [
          { categories: { has: search } },
          { headline: { contains: search, mode: 'insensitive' } },
          { summary: { contains: search, mode: 'insensitive' } },
        ],
      };
    } else if (category && category !== 'Home' && category !== 'undefined') {
      whereClause = {
        categories: {
          has: category,
        },
      };
    }

    const articles = (
      await prisma.article.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: DISPLAY_LIMIT,
        select: LIST_SELECT,
      })
    ).map((a) => sanitizeArticleImage(a));

    if (redis && articles.length > 0) {
      try {
        await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(articles));
        console.log(`[NewsController] Cached ${articles.length} articles in Redis for key "${cacheKey}".`);
      } catch (redisError) {
        console.error('[NewsController] Redis write error:', redisError);
      }
    }

    return res.status(200).json({
      success: true,
      source: 'database',
      data: articles,
    });
  } catch (error: any) {
    console.error('[NewsController] Critical error retrieving news:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve news articles.',
      error: error.message || error,
    });
  }
}

/**
 * GET /api/news/:id — full article including content.
 */
export async function getArticleById(req: Request, res: Response) {
  const { id } = req.params;
  try {
    const article = await prisma.article.findUnique({ where: { id } });

    if (!article) {
      return res.status(404).json({ success: false, message: 'Article not found.' });
    }

    return res.status(200).json({ success: true, data: sanitizeArticleImage(article) });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * POST /api/news/:id/enrich — Scrapes and enriches a single article stub on-demand.
 */
const activeEnrichments = new Map<string, Promise<any>>();

/**
 * POST /api/news/:id/enrich — Scrapes and enriches a single article stub on-demand.
 */
export async function enrichArticleOnDemand(req: Request, res: Response) {
  const { id } = req.params;

  if (activeEnrichments.has(id)) {
    console.log(`[On-Demand Ingest] Duplicate request detected for article ${id}. Awaiting existing enrichment...`);
    try {
      const result = await activeEnrichments.get(id);
      return res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  const performEnrichment = async () => {
    const article = await prisma.article.findUnique({ where: { id } });

    if (!article) {
      throw new Error('Article not found.');
    }

    if (article.enrichmentStatus === 'complete') {
      return sanitizeArticleImage(article);
    }

    let rawContent = '';
    let articleImageUrl: string | undefined;

    if (article.rawContent) {
      console.log(`[On-Demand Ingest] Using pre-scraped content for: "${article.headline}"`);
      rawContent = article.rawContent;
      articleImageUrl = article.imageUrl || undefined;
    } else {
      console.log(`[On-Demand Ingest] No pre-scraped content. Scraping on-the-fly for: "${article.headline}"`);
      const scrapeUrl = article.sourceUrl;
      try {
        const scrapeResult = await scrapeArticle(scrapeUrl, article.headline);
        rawContent = scrapeResult.markdown;
        articleImageUrl = scrapeResult.imageUrl;
      } catch (scrapeError) {
        console.warn(`[On-Demand Ingest] Scraper failed for ${scrapeUrl}. Falling back to description:`, scrapeError);
        rawContent = article.summary || article.headline;
      }
    }

    const trimmedContent = rawContent.slice(0, GEMINI_INPUT_MAX_CHARS);

    let synthesis;
    try {
      synthesis = await synthesizeArticle(article.headline, trimmedContent);
    } catch (geminiError) {
      console.warn(`[On-Demand Ingest] Gemini synthesis failed for "${article.headline}". Falling back to raw metadata:`, geminiError);
      synthesis = {
        headline: article.headline,
        summary: article.summary,
        content: rawContent || article.summary,
        sentiment: 'Neutral' as const,
        categories: article.categories.length > 0 ? article.categories : ['Tech'],
      };
    }

    const cleanedImageUrl = sanitizeImageUrl(articleImageUrl) || article.imageUrl;

    const updatedArticle = await prisma.article.update({
      where: { id },
      data: {
        headline: synthesis.headline,
        summary: synthesis.summary,
        content: synthesis.content,
        sentiment: synthesis.sentiment,
        categories: synthesis.categories,
        imageUrl: cleanedImageUrl,
        enrichmentStatus: 'complete',
      },
    });

    if (redis) {
      try {
        const keysToDelete = ['homepage:news:all'];
        if (updatedArticle.categories) {
          updatedArticle.categories.forEach(cat => {
            keysToDelete.push(`homepage:news:${cat}`);
          });
        }
        console.log(`[On-Demand Ingest] Invalidating Redis caches: ${keysToDelete.join(', ')}`);
        await redis.del(...keysToDelete);
      } catch (redisErr) {
        console.error('[On-Demand Ingest] Redis delete error:', redisErr);
      }
    }

    return sanitizeArticleImage(updatedArticle);
  };

  const promise = performEnrichment();
  activeEnrichments.set(id, promise);

  try {
    const result = await promise;
    return res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    console.error('[On-Demand Ingest] Critical error during on-demand enrichment:', error);
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    activeEnrichments.delete(id);
  }
}
