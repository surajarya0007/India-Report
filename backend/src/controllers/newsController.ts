import { Request, Response } from 'express';
import prisma from '../config/db';
import redis from '../config/redis';

const CACHE_KEY = 'homepage:news';
const CACHE_TTL = 3600; // 1 hour in seconds

// High quality mock articles for resilient fallback
const MOCK_ARTICLES = [
  {
    id: 'mock-1',
    sourceUrl: 'https://techcrunch.com/openai-gpt-5-release',
    headline: 'OpenAI Releases GPT-5 With Advanced Multimodal Reasoning',
    summary: 'OpenAI has officially released its next-generation artificial intelligence model, GPT-5, globally. The new model demonstrates human-level performance on complex engineering and scientific benchmarks. Early developers report significant improvements in coding assistance and math logic.',
    sentiment: 'Positive',
    categories: ['Tech', 'Business'],
    sourceName: 'TechCrunch',
    createdAt: new Date().toISOString()
  },
  {
    id: 'mock-2',
    sourceUrl: 'https://www.bbc.com/news/space-starship-launch',
    headline: 'SpaceX Starship Completes Historic Orbital Flight Test',
    summary: 'SpaceX completed its most successful test flight of the massive Starship rocket system today. Both the Super Heavy booster and the upper stage completed their planned trajectories before splashing down. Elon Musk announced that commercial launches will begin in the coming year.',
    sentiment: 'Positive',
    categories: ['Science', 'Tech'],
    sourceName: 'BBC News',
    createdAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'mock-3',
    sourceUrl: 'https://www.bloomberg.com/news/articles/nvidia-earnings-report',
    headline: 'Nvidia Stock Hits Record High Following Strong Q1 Earnings',
    summary: 'Nvidia Corporation reported quarterly revenue that exceeded analyst expectations, driven by insatiable demand for AI processors. The company also announced a new line of Blackwell Ultra chips scheduled for late 2026. Shareholders reacted positively, pushing the stock up by 8% in after-hours trading.',
    sentiment: 'Positive',
    categories: ['Finance', 'Business', 'Tech'],
    sourceName: 'Bloomberg',
    createdAt: new Date(Date.now() - 7200000).toISOString()
  },
  {
    id: 'mock-4',
    sourceUrl: 'https://www.theverge.com/apple-wwdc-keynote-summary',
    headline: 'Apple Unveils Advanced Siri Powered by On-Device AI',
    summary: 'Apple introduced a major upgrade to Siri at its annual WWDC developer conference, integrating a localized LLM. The new Siri can perform complex tasks across multiple native applications with high accuracy. Users will be able to opt-in starting with the upcoming iOS updates.',
    sentiment: 'Neutral',
    categories: ['Tech', 'Entertainment'],
    sourceName: 'The Verge',
    createdAt: new Date(Date.now() - 10800000).toISOString()
  },
  {
    id: 'mock-5',
    sourceUrl: 'https://www.reuters.com/business/global-market-downturn-inflation',
    headline: 'Global Markets Dip Amid Concerns Over High Inflation Rates',
    summary: 'Major stock indices across Europe and Asia closed lower today as central banks hinted at keeping interest rates elevated. Investors remain cautious about corporate earnings in the retail and energy sectors. Analysts warn that consumer spending could contract in the coming quarter.',
    sentiment: 'Negative',
    categories: ['Finance', 'Business'],
    sourceName: 'Reuters',
    createdAt: new Date(Date.now() - 14400000).toISOString()
  }
];

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

    // 2. Cache Miss: Query Supabase (PostgreSQL) via Prisma (with fallback)
    console.log('[NewsController] Cache miss for "homepage:news". Querying Supabase database...');
    let articles: any[] = [];
    try {
      articles = await prisma.article.findMany({
        orderBy: {
          createdAt: 'desc'
        },
        take: 20
      });
    } catch (dbError: any) {
      console.warn('[NewsController] Supabase database query failed. Falling back to local mock data. Error:', dbError.message || dbError);
      articles = MOCK_ARTICLES;
    }

    // If database returned nothing, also use mock data
    if (!articles || articles.length === 0) {
      articles = MOCK_ARTICLES;
    }

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
      source: articles === MOCK_ARTICLES ? 'demo-fallback' : 'database',
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
    // Try DB first
    let article: any = null;
    try {
      article = await prisma.article.findUnique({ where: { id } });
    } catch (dbError) {
      // DB unavailable, fall through to mock
    }

    // Try mock articles as fallback
    if (!article) {
      article = MOCK_ARTICLES.find(a => a.id === id) ?? null;
    }

    if (!article) {
      return res.status(404).json({ success: false, message: 'Article not found.' });
    }

    return res.status(200).json({ success: true, data: article });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
