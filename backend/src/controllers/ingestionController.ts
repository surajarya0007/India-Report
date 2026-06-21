import { Request, Response } from 'express';
import Parser from 'rss-parser';
import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from '../config/db';
import redis from '../config/redis';
import { scrapeArticle } from '../services/scraperService';
import { sanitizeImageUrl } from '../utils/imageUtils';
import {
  getIngestionStatus,
  isIngestionRunning,
  markIngestionComplete,
  markIngestionError,
  markIngestionStarted,
} from '../services/ingestionStatus';

const parser = new Parser({
  customFields: {
    item: [['source', 'source', { keepArray: false }]],
  },
});

const CATEGORY_FEEDS: Record<string, string> = {
  'Tech': 'https://news.google.com/news/rss/headlines/section/topic/TECHNOLOGY?hl=en-IN&gl=IN&ceid=IN:en',
  'Business': 'https://news.google.com/news/rss/headlines/section/topic/BUSINESS?hl=en-IN&gl=IN&ceid=IN:en',
  'Science': 'https://news.google.com/news/rss/headlines/section/topic/SCIENCE?hl=en-IN&gl=IN&ceid=IN:en',
  'Health': 'https://news.google.com/news/rss/headlines/section/topic/HEALTH?hl=en-IN&gl=IN&ceid=IN:en',
  'Entertainment': 'https://news.google.com/news/rss/headlines/section/topic/ENTERTAINMENT?hl=en-IN&gl=IN&ceid=IN:en',
  'Sports': 'https://news.google.com/news/rss/headlines/section/topic/SPORTS?hl=en-IN&gl=IN&ceid=IN:en',
  'World': 'https://news.google.com/news/rss/headlines/section/topic/WORLD?hl=en-IN&gl=IN&ceid=IN:en',
  'India': 'https://news.google.com/news/rss/headlines/section/topic/NATION?hl=en-IN&gl=IN&ceid=IN:en'
};

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

interface SynthesisOutput {
  headline: string;
  summary: string[];
  contentBlocks: string[];
  sectionHeadings: string[];
  highlightedFacts: string[];
  sentiment: 'Positive' | 'Negative' | 'Neutral';
  categories: string[];
}

function isGoogleNewsUrl(url: string): boolean {
  return url.includes('news.google.com');
}

function extractRealUrl(item: any): string | undefined {
  if (item.link && !isGoogleNewsUrl(item.link)) {
    return item.link;
  }
  return undefined;
}

import { GEMINI_MODEL_CHAIN } from '../config/constants';

/**
 * Uses Gemini (with model fallback) to extract 5 trending keywords/topics from a list of headlines.
 */
async function extractTrendingKeywords(category: string, headlines: string[], excludedKeywords: string[] = []): Promise<string[]> {
  if (!GEMINI_API_KEY) {
    console.warn('[Ingestion] No Gemini API key. Skipping trend extraction.');
    return headlines.slice(0, 3);
  }

  const exclusionText = excludedKeywords.length > 0
    ? `\n\nCRITICAL RULE: Do NOT identify or return any stories, topics, or events that are identical or highly similar/semantically overlapping with the following recently covered topics/queries:\n${excludedKeywords.map(k => `- ${k}`).join('\n')}\nFocus on finding other emerging, secondary, or new stories from the headlines.`
    : '';

  const prompt = `You are a trend-discovery engine. Below is a list of recent headlines in the category "${category}". Identify the top 5 distinct trending stories, events, or specific news developments that are dominating the news based on these headlines.

CRITICAL INSTRUCTION: Do NOT return broad or generic keywords/categories (e.g. do NOT return "Cybersecurity threats", "AI", "Cricket", "World Cup"). Instead, return highly specific, descriptive, event-driven queries representing the actual news story (e.g. "Google DeepMind cybersecurity insider threat AI roadmap", "NEET exam paper leak supreme court hearing controversy", "India vs Afghanistan T20 World Cup super eight match"). Each query should be descriptive and optimized to search Google News for articles covering that specific event.

Return a JSON array of strings.${exclusionText}
Headlines:
${headlines.map((h, i) => `${i + 1}. ${h}`).join('\n')}`;

  let lastError: any;
  for (const modelName of GEMINI_MODEL_CHAIN) {
    try {
      console.log(`[Ingestion] Extracting trends using model: ${modelName}`);
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'array',
            items: { type: 'string' },
            description: 'Top 5 distinct, descriptive, event-driven queries representing specific news stories dominating the headlines.'
          } as any
        }
      });

      const result = await model.generateContent(prompt);
      return JSON.parse(result.response.text().trim());
    } catch (error: any) {
      lastError = error;
      console.warn(`[Ingestion] Trend extraction failed with model ${modelName}. Trying next model. Error:`, error.message || error);
    }
  }

  console.error(`[Ingestion] All models in fallback chain failed for trend extraction.`, lastError);
  return headlines.slice(0, 3); // Fallback to raw titles
}

/**
 * Uses Gemini (with model fallback) to synthesize scraped content into a single professional, objective article dossier.
 */
async function synthesizeTrendDossier(topic: string, sources: { headline: string; content: string; imageUrl?: string | null }[]): Promise<SynthesisOutput> {
  const sourcesText = sources.map((s, i) => `Source ${i + 1}: ${s.headline}\nContent:\n${s.content.slice(0, 2500)}`).join('\n\n---\n\n');

  const prompt = `You are a senior journalist at a premium news publication writing a comprehensive editorial dossier for "India Reports".
Your article must match the depth, structure, and length of high-quality publications like BBC, The Hindu, or Reuters.

Topic: "${topic}"

Write a detailed, professional, multi-section article. Your output MUST follow these strict rules:
1. HEADLINE: Write a highly catchy, engaging, and professional headline. It must be active, punchy, and directly reflect the overall sentiment of the story (e.g., dramatic/urgent for Negative stories, inspiring/breakthrough-focused for Positive stories, and intriguing/authoritative for Neutral stories). Avoid dry, purely descriptive, or passive headlines.
2. SUMMARY: Write exactly 5 distinct, factual bullet points. Each bullet must be a full, complete sentence (minimum 20 words). Cover different angles: what happened, who is involved, what the impact is, what experts/officials say, and what happens next. Do NOT use markdown in summary.
3. CONTENT BLOCKS: Write exactly 8 complete paragraphs in English. Each paragraph must be at least 80 words. The first paragraph is the lead paragraph.
   * Use double-asterisk markdown (e.g. **Google** or **7,000mAh**) to bold ONLY the most critical entities, key figures, or statistics. Cap it to a maximum of 2-3 short key terms per paragraph. Do not over-bold or bold common words, as it looks cluttered.
4. SECTION HEADINGS: Write exactly 4 section headings (short, bold editorial titles, 3-6 words each) that will appear before paragraphs 2, 4, 6, and 8 respectively. Do NOT use markdown formatting here.
5. HIGHLIGHTED FACTS: Extract exactly 4 standalone key statistics, quotes, or notable facts that can be displayed as pull-quotes or callout boxes. Each must be a single compelling sentence. Do NOT use markdown.
6. SENTIMENT: Choose the overall tone: Positive, Negative, or Neutral.
7. CATEGORIES: Tag with 1-3 relevant categories.

Do NOT use any markdown tags, headings, links, or lists inside the content blocks other than double asterisks (**) for bold text.

Sources:
${sourcesText}`;

  let lastError: any;
  for (const modelName of GEMINI_MODEL_CHAIN) {
    try {
      console.log(`[Ingestion] Synthesizing dossier using model: ${modelName}`);
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'object',
            properties: {
              headline: { type: 'string', description: 'A highly catchy, journalistic headline (under 15 words) tailored to reflect the article\'s overall sentiment (Positive, Negative, or Neutral).' },
              summary: {
                type: 'array',
                items: { type: 'string' },
                description: 'Exactly 5 distinct bullet points, each a complete sentence of minimum 20 words covering different story angles.'
              },
              contentBlocks: {
                type: 'array',
                items: { type: 'string' },
                description: 'Exactly 8 full prose paragraphs, each at least 80 words. Use double-asterisks (**) selectively to bold a maximum of 2-3 key entities or figures per paragraph.'
              },
              sectionHeadings: {
                type: 'array',
                items: { type: 'string' },
                description: 'Exactly 4 editorial section headings (3-6 words each) for paragraphs 2, 4, 6, and 8.'
              },
              highlightedFacts: {
                type: 'array',
                items: { type: 'string' },
                description: 'Exactly 4 pull-quote worthy facts, statistics, or notable statements as single compelling sentences.'
              },
              sentiment: { type: 'string', enum: ['Positive', 'Negative', 'Neutral'] },
              categories: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: ['Tech', 'Business', 'Science', 'Health', 'Entertainment', 'Finance', 'Politics', 'World', 'India', 'Sports']
                }
              }
            },
            required: ['headline', 'summary', 'contentBlocks', 'sectionHeadings', 'highlightedFacts', 'sentiment', 'categories']
          } as any
        }
      });

      const result = await model.generateContent(prompt);
      return JSON.parse(result.response.text().trim());
    } catch (error: any) {
      lastError = error;
      console.warn(`[Ingestion] Synthesis failed with model ${modelName}. Trying next model. Error:`, error.message || error);
    }
  }

  throw lastError || new Error('All models in fallback chain failed for synthesis.');
}

/**
 * Searches Google News for articles matching a query/keyword.
 */
async function fetchArticlesForKeyword(keyword: string): Promise<{ title: string; url: string; description: string }[]> {
  try {
    const hl = 'en-IN';
    const gl = 'IN';
    const ceid = 'IN:en';
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=${hl}&gl=${gl}&ceid=${ceid}`;
    const feed = await parser.parseURL(url);
    if (!feed.items) return [];

    return feed.items.slice(0, 10).map((item) => ({
      title: item.title || 'Untitled',
      url: extractRealUrl(item) || item.link || '',
      description: item.contentSnippet || item.content || ''
    }));
  } catch (error) {
    console.error(`[Ingestion] Error searching Google News for "${keyword}":`, error);
    return [];
  }
}

/**
 * Invalidate Redis Cache
 */
async function invalidateCache(categories: string[]) {
  if (!redis) return;
  try {
    const keys = ['homepage:news:all', ...categories.map(c => `homepage:news:${c}`)];
    console.log(`[Ingestion] Invalidating Redis caches: ${keys.join(', ')}`);
    await redis.del(...keys);
  } catch (err) {
    console.error('[Ingestion] Redis cache invalidation error:', err);
  }
}

/**
 * Runs parallel crawling of URLs with concurrency.
 */
async function crawlSources(sources: { title: string; url: string; description: string }[]): Promise<{ headline: string; content: string; imageUrl?: string | null }[]> {
  const results: { headline: string; content: string; imageUrl?: string | null }[] = [];
  const concurrency = 3;
  let index = 0;

  async function worker() {
    while (index < sources.length) {
      const currentIdx = index++;
      const source = sources[currentIdx];
      if (!source.url) {
        results.push({ headline: source.title, content: source.description, imageUrl: null });
        continue;
      }

      try {
        console.log(`[Ingestion] Scraping: ${source.url}`);
        const scrapeResult = await scrapeArticle(source.url, source.title);
        results.push({
          headline: source.title,
          content: scrapeResult.markdown || source.description,
          imageUrl: scrapeResult.imageUrl || null
        });
      } catch (err) {
        console.warn(`[Ingestion] Scrape failed for ${source.url}, falling back to description:`, err);
        results.push({ headline: source.title, content: source.description, imageUrl: null });
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, sources.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * Ingestion runner
 */
export async function runIngestionPipeline(
  category?: string,
  country?: string,
  search?: string
): Promise<{ ingestedCount: number; skippedCount: number; errorsCount: number }> {
  let ingestedCount = 0;
  let skippedCount = 0;
  let errorsCount = 0;

  // Case 1: Search-based Ingestion (On demand search query)
  if (search && search.trim()) {
    const keyword = search.trim();
    console.log(`[Ingestion] Starting search-based ingestion for: "${keyword}"`);

    // Check deduplication
    const existing = await prisma.article.findFirst({
      where: {
        keyword: { equals: keyword, mode: 'insensitive' },
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
      }
    });

    if (existing) {
      console.log(`[Ingestion] Keyword "${keyword}" already ingested today. Skipping.`);
      return { ingestedCount: 0, skippedCount: 1, errorsCount: 0 };
    }

    const items = await fetchArticlesForKeyword(keyword);
    if (items.length === 0) {
      console.warn(`[Ingestion] No sources found for "${keyword}"`);
      return { ingestedCount: 0, skippedCount: 0, errorsCount: 1 };
    }

    try {
      const crawled = await crawlSources(items);
      const synthesis = await synthesizeTrendDossier(keyword, crawled);
      
      // Pull all successfully scraped image URLs from sources
      const imageUrls = crawled
        .map(c => c.imageUrl)
        .filter((url): url is string => !!url)
        .map(url => sanitizeImageUrl(url))
        .filter((url): url is string => !!url);
      
      // Remove duplicates
      const uniqueImageUrls = Array.from(new Set(imageUrls));
      const imageUrl = uniqueImageUrls[0] || null;

      await prisma.article.create({
        data: {
          keyword,
          headline: synthesis.headline,
          summary: synthesis.summary,
          contentBlocks: synthesis.contentBlocks,
          sectionHeadings: synthesis.sectionHeadings || [],
          highlightedFacts: synthesis.highlightedFacts || [],
          sentiment: synthesis.sentiment,
          categories: synthesis.categories,
          imageUrl,
          imageUrls: uniqueImageUrls,
          enrichmentStatus: 'complete'
        }
      });

      ingestedCount++;
      await invalidateCache(synthesis.categories);
    } catch (err) {
      console.error(`[Ingestion] Synthesis/save failed for search topic "${keyword}":`, err);
      errorsCount++;
    }

    return { ingestedCount, skippedCount, errorsCount };
  }

  // Case 2: General Trending Topics Ingestion
  let categoriesToIngest = Object.keys(CATEGORY_FEEDS);
  if (category) {
    const matchedKey = Object.keys(CATEGORY_FEEDS).find(k => k.toLowerCase() === category.toLowerCase());
    categoriesToIngest = matchedKey ? [matchedKey] : [];
  }
  console.log(`[Ingestion] Starting general trending ingestion for categories: ${categoriesToIngest.join(', ')}`);

  // Get keywords ingested in the last 24 hours to exclude them from trend extraction
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentArticles = await prisma.article.findMany({
    where: {
      createdAt: { gte: twentyFourHoursAgo },
    },
    select: {
      keyword: true,
    },
  });
  const excludedKeywords = Array.from(new Set(recentArticles.map(a => a.keyword).filter(Boolean)));
  console.log(`[Ingestion] Excluded keywords from the last 24 hours:`, excludedKeywords);

  const runningExcludedKeywords = [...excludedKeywords];

  for (const cat of categoriesToIngest) {
    const url = CATEGORY_FEEDS[cat];
    if (!url) continue;

    try {
      console.log(`[Ingestion] Fetching feed for category: ${cat}`);
      const feed = await parser.parseURL(url);
      if (!feed.items || feed.items.length === 0) continue;

      const headlines = feed.items.slice(0, 40).map(item => item.title || '');
      const trendingKeywords = await extractTrendingKeywords(cat, headlines, runningExcludedKeywords);
      console.log(`[Ingestion] Category "${cat}" trending keywords:`, trendingKeywords);

      for (const keyword of trendingKeywords) {
        // Deduplication: check if keyword exists today
        const existing = await prisma.article.findFirst({
          where: {
            keyword: { equals: keyword, mode: 'insensitive' },
            createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
          }
        });

        if (existing) {
          console.log(`[Ingestion] Topic "${keyword}" already ingested today. Skipping.`);
          skippedCount++;
          continue;
        }

        console.log(`[Ingestion] Processing trending topic: "${keyword}"`);
        const searchItems = await fetchArticlesForKeyword(keyword);
        if (searchItems.length === 0) {
          skippedCount++;
          continue;
        }

        try {
          const crawled = await crawlSources(searchItems);
          const synthesis = await synthesizeTrendDossier(keyword, crawled);
          
          // Pull all successfully scraped image URLs from sources
          const imageUrls = crawled
            .map(c => c.imageUrl)
            .filter((url): url is string => !!url)
            .map(url => sanitizeImageUrl(url))
            .filter((url): url is string => !!url);
          
          // Remove duplicates
          const uniqueImageUrls = Array.from(new Set(imageUrls));
          const imageUrl = uniqueImageUrls[0] || null;
          
          await prisma.article.create({
            data: {
              keyword,
              headline: synthesis.headline,
              summary: synthesis.summary,
              contentBlocks: synthesis.contentBlocks,
              sectionHeadings: synthesis.sectionHeadings || [],
              highlightedFacts: synthesis.highlightedFacts || [],
              sentiment: synthesis.sentiment,
              categories: synthesis.categories,
              imageUrl,
              imageUrls: uniqueImageUrls,
              enrichmentStatus: 'complete'
            }
          });

          ingestedCount++;
          runningExcludedKeywords.push(keyword);
          await invalidateCache(synthesis.categories);
        } catch (keywordErr) {
          console.error(`[Ingestion] Failed synthesis for topic "${keyword}":`, keywordErr);
          errorsCount++;
        }
      }
    } catch (catErr) {
      console.error(`[Ingestion] Failed category processing for ${cat}:`, catErr);
      errorsCount++;
    }
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
      markIngestionComplete({
        ingestedCount: result.ingestedCount,
        skippedCount: result.skippedCount,
        errorsCount: result.errorsCount,
      });
    })
    .catch((error: Error) => {
      markIngestionError(error.message || 'Unknown error');
    });
}
