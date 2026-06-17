import { Request, Response } from 'express';
import prisma from '../config/db';
import redis from '../config/redis';
import { fetchLatestNews } from '../services/newsService';
import { scrapeArticle } from '../services/scraperService';
import { synthesizeArticle } from '../services/aiService';

/**
 * Executes the ingestion pipeline step-by-step:
 * 1. Fetch top 20 latest articles.
 * 2. Filter out duplicate source URLs.
 * 3. Scrape body text of new articles using Firecrawl.
 * 4. Synthesize summary, headline, sentiment, and categories using Gemini.
 * 5. Write to PostgreSQL via Prisma.
 * 6. Invalidate Redis cache "homepage:news".
 */
export async function runIngestionPipeline(): Promise<{ ingestedCount: number; skippedCount: number; errorsCount: number }> {
  console.log('[Pipeline] Ingestion pipeline started.');
  let ingestedCount = 0;
  let skippedCount = 0;
  let errorsCount = 0;

  try {
    // 1. Ingestion Check
    const rawArticles = await fetchLatestNews();
    console.log(`[Pipeline] Found ${rawArticles.length} raw articles to process.`);

    // 2. Loop through each article
    for (const raw of rawArticles) {
      try {
        // Deduplication Check
        const existing = await prisma.article.findUnique({
          where: { sourceUrl: raw.url }
        });

        if (existing) {
          skippedCount++;
          continue;
        }

        console.log(`[Pipeline] Processing new article: "${raw.title}"`);

        // Scraping content
        const rawContent = await scrapeArticle(raw.url, raw.title);

        // AI Synthesis
        const synthesis = await synthesizeArticle(raw.title, rawContent);

        // Storage in Supabase
        await prisma.article.create({
          data: {
            sourceUrl: raw.url,
            headline: synthesis.headline,
            summary: synthesis.summary,
            sentiment: synthesis.sentiment,
            categories: synthesis.categories,
            sourceName: raw.source
          }
        });

        ingestedCount++;
        console.log(`[Pipeline] Ingested: "${synthesis.headline}"`);
      } catch (err) {
        console.error(`[Pipeline] Error processing article at ${raw.url}:`, err);
        errorsCount++;
      }
    }

    // 4. Cache Invalidation
    if (ingestedCount > 0) {
      if (redis) {
        console.log('[Pipeline] Invalidating Upstash Redis home cache "homepage:news".');
        await redis.del('homepage:news');
      } else {
        console.log('[Pipeline] Cache invalidation skipped: Redis client not configured.');
      }
    } else {
      console.log('[Pipeline] No new articles ingested. Keeping existing Redis cache.');
    }

    console.log(`[Pipeline] Pipeline finished. Ingested: ${ingestedCount}, Skipped: ${skippedCount}, Errors: ${errorsCount}`);
  } catch (error) {
    console.error('[Pipeline] Critical error during ingestion pipeline execution:', error);
  }

  return { ingestedCount, skippedCount, errorsCount };
}

/**
 * Express controller to manually trigger ingestion.
 */
export async function triggerIngestion(req: Request, res: Response) {
  try {
    const result = await runIngestionPipeline();
    res.status(200).json({
      success: true,
      message: 'Ingestion pipeline executed successfully.',
      ...result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Ingestion pipeline failed.',
      error: error.message || error
    });
  }
}
