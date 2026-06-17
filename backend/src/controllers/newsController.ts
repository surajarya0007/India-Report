import { Request, Response } from 'express';
import prisma from '../config/db';
import redis from '../config/redis';

const CACHE_KEY = 'homepage:news';
const CACHE_TTL = 3600; // 1 hour in seconds

/**
 * GET /api/news
 * Returns 20 most recent articles.
 * Checks Upstash Redis first, falls back to Supabase and updates cache on miss.
 */
export async function getRecentNews(req: Request, res: Response) {
  try {
    // 1. Check Upstash Redis cache
    if (redis) {
      try {
        const cachedData = await redis.get(CACHE_KEY);
        if (cachedData) {
          console.log('[NewsController] Cache hit for "homepage:news". Returning cached data.');
          // Since data might be stringified in redis, parse and return it
          const parsedData = typeof cachedData === 'string' ? JSON.parse(cachedData) : cachedData;
          return res.status(200).json({
            success: true,
            source: 'cache',
            data: parsedData
          });
        }
      } catch (redisError) {
        console.error('[NewsController] Redis read error (bypassing cache):', redisError);
      }
    }

    // 2. Cache Miss: Query Supabase (PostgreSQL) via Prisma
    console.log('[NewsController] Cache miss for "homepage:news". Querying Supabase database...');
    const articles = await prisma.article.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    });

    // 3. Cache the query results in Redis (TTL = 3600s)
    if (redis && articles.length > 0) {
      try {
        await redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(articles));
        console.log(`[NewsController] Cached ${articles.length} articles in Redis with TTL of ${CACHE_TTL}s.`);
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
    console.error('[NewsController] Error retrieving news:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve news articles.',
      error: error.message || error
    });
  }
}
