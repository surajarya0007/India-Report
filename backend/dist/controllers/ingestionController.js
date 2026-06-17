"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runIngestionPipeline = runIngestionPipeline;
exports.triggerIngestion = triggerIngestion;
const db_1 = __importDefault(require("../config/db"));
const redis_1 = __importDefault(require("../config/redis"));
const newsService_1 = require("../services/newsService");
const scraperService_1 = require("../services/scraperService");
const aiService_1 = require("../services/aiService");
/**
 * Executes the ingestion pipeline step-by-step:
 * 1. Fetch top 20 latest articles.
 * 2. Filter out duplicate source URLs.
 * 3. Scrape body text of new articles using Firecrawl.
 * 4. Synthesize summary, headline, sentiment, and categories using Gemini.
 * 5. Write to PostgreSQL via Prisma.
 * 6. Invalidate Redis cache "homepage:news".
 */
async function runIngestionPipeline() {
    console.log('[Pipeline] Ingestion pipeline started.');
    let ingestedCount = 0;
    let skippedCount = 0;
    let errorsCount = 0;
    try {
        // 1. Ingestion Check
        const rawArticles = await (0, newsService_1.fetchLatestNews)();
        console.log(`[Pipeline] Found ${rawArticles.length} raw articles to process.`);
        // 2. Loop through each article
        for (const raw of rawArticles) {
            try {
                // Deduplication Check
                const existing = await db_1.default.article.findUnique({
                    where: { sourceUrl: raw.url }
                });
                if (existing) {
                    skippedCount++;
                    continue;
                }
                console.log(`[Pipeline] Processing new article: "${raw.title}"`);
                // Scraping content
                const rawContent = await (0, scraperService_1.scrapeArticle)(raw.url, raw.title);
                // AI Synthesis
                const synthesis = await (0, aiService_1.synthesizeArticle)(raw.title, rawContent);
                // Storage in Supabase
                await db_1.default.article.create({
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
            }
            catch (err) {
                console.error(`[Pipeline] Error processing article at ${raw.url}:`, err);
                errorsCount++;
            }
        }
        // 4. Cache Invalidation
        if (ingestedCount > 0) {
            if (redis_1.default) {
                console.log('[Pipeline] Invalidating Upstash Redis home cache "homepage:news".');
                await redis_1.default.del('homepage:news');
            }
            else {
                console.log('[Pipeline] Cache invalidation skipped: Redis client not configured.');
            }
        }
        else {
            console.log('[Pipeline] No new articles ingested. Keeping existing Redis cache.');
        }
        console.log(`[Pipeline] Pipeline finished. Ingested: ${ingestedCount}, Skipped: ${skippedCount}, Errors: ${errorsCount}`);
    }
    catch (error) {
        console.error('[Pipeline] Critical error during ingestion pipeline execution:', error);
    }
    return { ingestedCount, skippedCount, errorsCount };
}
/**
 * Express controller to manually trigger ingestion.
 */
async function triggerIngestion(req, res) {
    try {
        const result = await runIngestionPipeline();
        res.status(200).json({
            success: true,
            message: 'Ingestion pipeline executed successfully.',
            ...result
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Ingestion pipeline failed.',
            error: error.message || error
        });
    }
}
