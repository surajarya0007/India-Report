import { Request, Response } from 'express';
import prisma from '../config/db';
import redis from '../config/redis';
import { sanitizeArticleImage } from '../utils/imageUtils';
import { DISPLAY_LIMIT } from '../config/constants';

const CACHE_TTL = 3600;

const LIST_SELECT = {
  id: true,
  keyword: true,
  headline: true,
  summary: true,
  imageUrl: true,
  imageUrls: true,
  categories: true,
  sentiment: true,
  enrichmentStatus: true,
  createdAt: true,
} as const;

/**
 * GET /api/news — list endpoint.
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
          { keyword: { contains: search, mode: 'insensitive' } },
          { categories: { has: search } },
          { headline: { contains: search, mode: 'insensitive' } },
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
 * GET /api/news/:id — full article details.
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
 * PATCH /api/news/:id/image — update the active cover image.
 */
export async function updateArticleImage(req: Request, res: Response) {
  const { id } = req.params;
  const { imageUrl } = req.body;

  if (!imageUrl) {
    return res.status(400).json({ success: false, message: 'imageUrl is required.' });
  }

  try {
    const article = await prisma.article.update({
      where: { id },
      data: { imageUrl }
    });

    if (redis) {
      try {
        const cacheKeys = ['homepage:news:all', ...article.categories.map(c => `homepage:news:${c}`)];
        for (const key of cacheKeys) {
          await redis.del(key);
        }
        console.log(`[NewsController] Invalidated Redis cache for article "${id}" update.`);
      } catch (redisError) {
        console.error('[NewsController] Redis deletion error:', redisError);
      }
    }

    return res.status(200).json({ success: true, data: sanitizeArticleImage(article) });
  } catch (error: any) {
    console.error('[NewsController] Error updating article image:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}
