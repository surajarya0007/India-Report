import { Request, Response } from 'express';
import prisma from '../config/db';
import redis from '../config/redis';
import { fetchLatestNews } from '../services/newsService';
import { scrapeArticle } from '../services/scraperService';
import { synthesizeArticle } from '../services/aiService';
import { sanitizeImageUrl } from '../utils/imageUtils';

/**
 * Executes the ingestion pipeline step-by-step:
 * 1. Fetch top latest articles (up to ARTICLE_FETCH_LIMIT).
 * 2. Filter out duplicate source URLs.
 * 3. Scrape body text of new articles using Firecrawl.
 * 4. Synthesize summary, headline, sentiment, and categories using Gemini.
 * 5. Write to PostgreSQL via Prisma.
 * 6. Invalidate Redis cache "homepage:news".
 */
export async function runIngestionPipeline(category?: string, country?: string, search?: string): Promise<{ ingestedCount: number; skippedCount: number; errorsCount: number }> {
  let ingestedCount = 0;
  let skippedCount = 0;
  let errorsCount = 0;

  try {
    let targetCategory = category;
    let targetCountry = country;
    const targetSearch = search?.trim() || undefined;

    console.log(`[Pipeline] Ingestion pipeline started. Target category: ${targetCategory || 'none'}, Target country: ${targetCountry || 'none'}, Search: ${targetSearch || 'none'}`);

    // 2. Fetch raw articles
    const rawArticles = await fetchLatestNews(targetCategory, targetCountry, targetSearch);
    console.log(`[Pipeline] Found ${rawArticles.length} raw articles to process.`);

    // 3. Loop through each article
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

        // Scraping content with fallback — use resolved real URL for actual article content/image
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

        // AI Synthesis with raw metadata fallback
        let synthesis;
        try {
          synthesis = await synthesizeArticle(raw.title, rawContent);
        } catch (geminiError) {
          console.warn(`[Pipeline] Gemini synthesis failed for "${raw.title}". Falling back to raw metadata:`, geminiError);
          
          // Smart fallback categories based on Currents/Google News category or query parameter category
          const fallbackCategories: string[] = [];
          if (raw.category && raw.category.length > 0) {
            raw.category.forEach(c => {
              const lower = c.toLowerCase();
              if (lower.includes('tech') || lower.includes('science')) fallbackCategories.push('Tech');
              if (lower.includes('business') || lower.includes('economy')) fallbackCategories.push('Business');
              if (lower.includes('finance')) fallbackCategories.push('Finance');
              if (lower.includes('politics') || lower.includes('government')) fallbackCategories.push('Politics');
              if (lower.includes('entertainment') || lower.includes('art') || lower.includes('culture')) fallbackCategories.push('Entertainment');
              if (lower.includes('sport')) fallbackCategories.push('Sports');
              if (lower.includes('world') || lower.includes('regional')) fallbackCategories.push('World');
              if (lower.includes('health') || lower.includes('medical')) fallbackCategories.push('Health');
            });
          }
          
          if (fallbackCategories.length === 0) {
            if (targetCategory) {
              const capitalized = targetCategory.charAt(0).toUpperCase() + targetCategory.slice(1);
              const mapped = capitalized === 'Technology' ? 'Tech' : (capitalized === 'Sports' ? 'Sports' : capitalized);
              fallbackCategories.push(mapped);
            } else {
              fallbackCategories.push('Tech');
            }
          }

          synthesis = {
            headline: raw.title.substring(0, 100),
            summary: raw.description || 'Details are available at the source link.',
            content: rawContent || raw.description || 'Full factual content could not be synthesized. Please read the full story at the source link.',
            sentiment: 'Neutral',
            categories: fallbackCategories
          };
        }

        // Map queried filters to output categories to populate frontend tabs correctly
        const finalCategories = [...synthesis.categories];
        if (targetCountry === 'IN' && !finalCategories.includes('India')) {
          finalCategories.push('India');
        }
        if (targetCategory === 'world' && !finalCategories.includes('World')) {
          finalCategories.push('World');
        }
        if (targetCategory === 'politics' && !finalCategories.includes('Politics')) {
          finalCategories.push('Politics');
        }
        if (targetCategory === 'sports' && !finalCategories.includes('Sports')) {
          finalCategories.push('Sports');
        }
        if (targetCategory) {
          const capitalized = targetCategory.charAt(0).toUpperCase() + targetCategory.slice(1);
          const mappedCat = capitalized === 'Technology' ? 'Tech' : (capitalized === 'Sports' ? 'Sports' : capitalized);
          const allowed = ['Tech', 'Business', 'Science', 'Health', 'Entertainment', 'Finance', 'Politics', 'World', 'India', 'Sports'];
          if (allowed.includes(mappedCat) && !finalCategories.includes(mappedCat)) {
            finalCategories.push(mappedCat);
          }
        }
        if (targetSearch && !finalCategories.includes(targetSearch)) {
          finalCategories.push(targetSearch);
        }

        const cleanedImageUrl = sanitizeImageUrl(articleImageUrl);
        if (articleImageUrl && !cleanedImageUrl) {
          console.log(`[Pipeline] Rejected Google News placeholder image for "${raw.title}"`);
        }

        // Storage in Supabase
        await prisma.article.create({
          data: {
            sourceUrl: raw.url,
            headline: synthesis.headline,
            summary: synthesis.summary,
            content: synthesis.content,
            sentiment: synthesis.sentiment,
            categories: finalCategories,
            sourceName: raw.source,
            imageUrl: cleanedImageUrl
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
        console.log('[Pipeline] Invalidating Upstash Redis home cache keys matching homepage:news*...');
        const keys = await redis.keys('homepage:news*');
        if (keys.length > 0) {
          await redis.del(...keys);
          console.log(`[Pipeline] Deleted cache keys: ${keys.join(', ')}`);
        }
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
    const category = req.query.category as string;
    const country = req.query.country as string;
    const search = req.query.search as string;
    const result = await runIngestionPipeline(category, country, search);
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
