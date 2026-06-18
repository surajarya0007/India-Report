import { Request, Response } from 'express';
import prisma from '../config/db';
import redis from '../config/redis';
import { sanitizeArticleImage } from '../utils/imageUtils';
import { ARTICLE_FETCH_LIMIT } from '../config/constants';

const CACHE_KEY = 'homepage:news';
const CACHE_TTL = 3600; // 1 hour in seconds



/**
 * GET /api/news
 * Returns the most recent articles (up to ARTICLE_FETCH_LIMIT).
 * Checks Upstash Redis first, falls back to Supabase and updates cache on miss.
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
    // 1. Check Upstash Redis cache
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
            data: sanitized
          });
        }
      } catch (redisError) {
        console.error('[NewsController] Redis read error (bypassing cache):', redisError);
      }
    }

    // 2. Cache Miss: Query Supabase (PostgreSQL) via Prisma
    console.log(`[NewsController] Cache miss for "${cacheKey}". Querying Supabase database...`);
    
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
          has: category
        }
      };
    }

    const articles = (await prisma.article.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc'
      },
      take: ARTICLE_FETCH_LIMIT
    })).map((a) => sanitizeArticleImage(a));

    // 3. Cache the query results in Redis (TTL = 3600s)
    if (redis && articles.length > 0) {
      try {
        await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(articles));
        console.log(`[NewsController] Cached ${articles.length} articles in Redis for key "${cacheKey}" with TTL of ${CACHE_TTL}s.`);
      } catch (redisError) {
        console.error('[NewsController] Redis write error:', redisError);
      }
    }

    return res.status(200).json({
      success: true,
      source: 'database',
      data: articles
    });

  } catch (error: any) {
    console.error('[NewsController] Critical error retrieving news:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve news articles.',
      error: error.message || error
    });
  }
}

/**
 * GET /api/news/:id
 * Returns a single article by ID from DB or mock fallback.
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
