import { GoogleGenerativeAI } from '@google/generative-ai';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import prisma from '../config/db';
import { GEMINI_MODEL_CHAIN } from '../config/constants';
import { articleUrl } from '../utils/seo';

const CHAT_MODEL = GEMINI_MODEL_CHAIN[0];
const RAG_SEARCH_THRESHOLD = 0.58;
const EMBEDDING_DIMENSIONS = 768;

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'have',
  'he', 'her', 'his', 'i', 'in', 'is', 'it', 'its', 'of', 'on', 'or', 'that',
  'the', 'their', 'them', 'there', 'these', 'they', 'this', 'to', 'was', 'were',
  'will', 'with', 'after', 'before', 'about', 'into', 'over', 'under', 'while',
  'what', 'when', 'where', 'who', 'why', 'how', 'latest', 'new', 'news',
]);

type ChunkType = 'headline' | 'summary' | 'paragraph';

export interface RagArticleLike {
  id: string;
  keyword: string;
  headline: string;
  summary: string[];
  contentBlocks: string[];
  sectionHeadings?: string[];
  categories: string[];
  sentiment: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface ArticleChunkDraft {
  type: ChunkType;
  position: number;
  content: string;
}

export interface RagSearchResult {
  articleId: string;
  headline: string;
  keyword: string;
  categories: string[];
  sentiment: string;
  createdAt: string;
  updatedAt: string;
  articleUrl: string;
  chunkType: ChunkType;
  chunkPosition: number;
  chunkContent: string;
  similarity: number;
}

export interface RagChatSource extends RagSearchResult {
  snippet: string;
}

export interface RagChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

const getApiKeys = (): string[] => {
  const raw = process.env.GEMINI_API_KEY || '';
  return raw
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k && k !== 'your_gemini_or_openai_key' && !k.startsWith('your_'));
};

function hasGeminiApiKey(): boolean {
  return getApiKeys().length > 0;
}

function getChatModel(apiKey?: string) {
  const key = apiKey || getApiKeys()[0];
  if (!key) {
    throw new Error('Gemini API key is not configured.');
  }

  const genAI = new GoogleGenerativeAI(key);
  return genAI.getGenerativeModel({ model: CHAT_MODEL });
}

function hashToken(token: string): number {
  let hash = 2166136261;
  for (let i = 0; i < token.length; i++) {
    hash ^= token.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function textToVector(text: string): number[] {
  const vector = new Array(EMBEDDING_DIMENSIONS).fill(0);
  const tokens = tokenize(text);

  if (tokens.length === 0) {
    return vector;
  }

  for (const token of tokens) {
    const index = hashToken(token) % EMBEDDING_DIMENSIONS;
    vector[index] += 1;
  }

  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (norm > 0) {
    return vector.map((value) => value / norm);
  }

  return vector;
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function stripChunkPrefix(content: string): string {
  return content
    .replace(/^Article:\s*.*?\|\s*/i, '')
    .replace(/^Summary\s*\d+:\s*/i, '')
    .replace(/^Paragraph\s*\d+:\s*/i, '')
    .replace(/^Section:\s*.*?\|\s*/i, '')
    .trim();
}

function vectorLiteral(values: number[]): string {
  return `[${values.map((value) => Number.isFinite(value) ? value : 0).join(',')}]`;
}

export function buildArticleChunks(article: RagArticleLike): ArticleChunkDraft[] {
  const primaryCategory = article.categories?.[0] || 'News';
  const headline = normalizeText(article.headline);
  const keyword = normalizeText(article.keyword || headline);
  const chunks: ArticleChunkDraft[] = [];

  chunks.push({
    type: 'headline',
    position: 0,
    content: `Article: ${headline} | Category: ${article.categories.join(', ')} | Keyword: ${keyword} | Headline: ${headline}`,
  });

  (article.summary || []).filter(Boolean).forEach((summary, index) => {
    chunks.push({
      type: 'summary',
      position: index,
      content: `Article: ${headline} | Summary ${index + 1}: ${normalizeText(summary)}`,
    });
  });

  (article.contentBlocks || []).filter(Boolean).forEach((paragraph, index) => {
    const sectionHeadingIndex = Math.floor(index / 2);
    const sectionHeading = article.sectionHeadings?.[sectionHeadingIndex];
    const prefix = sectionHeading
      ? `Article: ${headline} | Category: ${primaryCategory} | Section: ${normalizeText(sectionHeading)} | Paragraph ${index + 1}:`
      : `Article: ${headline} | Category: ${primaryCategory} | Paragraph ${index + 1}:`;

    chunks.push({
      type: 'paragraph',
      position: index,
      content: `${prefix} ${normalizeText(paragraph)}`,
    });
  });

  return chunks;
}

async function embedTexts(texts: string[]): Promise<number[][]> {
  if (!texts.length) {
    return [];
  }

  return texts.map((text) => textToVector(text));
}

async function embedQuery(query: string): Promise<number[]> {
  return textToVector(query);
}

function buildCategoryFilter(category?: string) {
  if (!category) {
    return Prisma.empty;
  }

  return Prisma.sql`AND ${category} = ANY(a.categories)`;
}

function buildChunkInsertValues(articleId: string, chunks: ArticleChunkDraft[], embeddings: number[][]) {
  return chunks.map((chunk, index) => {
    const embedding = vectorLiteral(embeddings[index] || []);
    return Prisma.sql`(${randomUUID()}, ${articleId}, ${chunk.type}, ${chunk.position}, ${chunk.content}, ${embedding}::vector)`;
  });
}

export async function replaceArticleChunks(article: RagArticleLike): Promise<number> {
  const chunks = buildArticleChunks(article);

  if (!chunks.length) {
    return 0;
  }

  const embeddings = await embedTexts(chunks.map((chunk) => chunk.content));
  const insertValues = buildChunkInsertValues(article.id, chunks, embeddings);

  await prisma.$transaction(async (tx) => {
    await tx.articleChunk.deleteMany({ where: { articleId: article.id } });
    await tx.$executeRaw(
      Prisma.sql`
        INSERT INTO "ArticleChunk" ("id", "articleId", "type", "position", "content", "embedding")
        VALUES ${Prisma.join(insertValues)}
      `
    );
  });

  return chunks.length;
}

export async function replaceArticleChunksById(articleId: string): Promise<number> {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: {
      id: true,
      keyword: true,
      headline: true,
      summary: true,
      contentBlocks: true,
      sectionHeadings: true,
      categories: true,
      sentiment: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!article) {
    throw new Error('Article not found for vector indexing.');
  }

  return replaceArticleChunks(article);
}

export async function indexArticleIfPossible(article: RagArticleLike): Promise<boolean> {
  try {
    await replaceArticleChunks(article);
    return true;
  } catch (error) {
    console.error('[RAG] Failed to index article chunks:', error);
    return false;
  }
}

export async function backfillMissingArticleChunks(limit = 20): Promise<{
  indexedCount: number;
  skippedCount: number;
  errorsCount: number;
  totalCount: number;
}> {
  const articles = await prisma.article.findMany({
    where: {
      chunks: { none: {} },
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
    select: {
      id: true,
      keyword: true,
      headline: true,
      summary: true,
      contentBlocks: true,
      sectionHeadings: true,
      categories: true,
      sentiment: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  let indexedCount = 0;
  let skippedCount = 0;
  let errorsCount = 0;

  for (const article of articles) {
    try {
      const created = await replaceArticleChunks(article);
      if (created > 0) {
        indexedCount++;
      } else {
        skippedCount++;
      }
    } catch (error) {
      errorsCount++;
      console.error(`[RAG] Backfill failed for article "${article.id}":`, error);
    }
  }

  return {
    indexedCount,
    skippedCount,
    errorsCount,
    totalCount: articles.length,
  };
}

export async function getRagCoverageStats(): Promise<{
  totalArticles: number;
  indexedArticles: number;
  missingArticles: number;
  totalChunks: number;
  chunksByType: Record<string, number>;
  coveragePercent: number;
  lastIndexedAt: string | null;
}> {
  const [totalArticles, indexedArticles, totalChunks, chunkTypeGroups, latestChunk] = await Promise.all([
    prisma.article.count(),
    prisma.article.count({ where: { chunks: { some: {} } } }),
    prisma.articleChunk.count(),
    prisma.articleChunk.groupBy({
      by: ['type'],
      _count: { id: true },
    }),
    prisma.articleChunk.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
  ]);

  const chunksByType: Record<string, number> = {};
  chunkTypeGroups.forEach((group: { type: string; _count: { id: number } }) => {
    chunksByType[group.type] = group._count.id;
  });

  const missingArticles = Math.max(totalArticles - indexedArticles, 0);
  const coveragePercent = totalArticles === 0 ? 0 : Math.round((indexedArticles / totalArticles) * 100);

  return {
    totalArticles,
    indexedArticles,
    missingArticles,
    totalChunks,
    chunksByType,
    coveragePercent,
    lastIndexedAt: latestChunk?.createdAt?.toISOString() || null,
  };
}

export async function searchSemanticArticles(
  query: string,
  options?: {
    limit?: number;
    category?: string;
    threshold?: number;
  }
): Promise<RagSearchResult[]> {
  const limit = options?.limit ?? 8;
  const threshold = options?.threshold ?? RAG_SEARCH_THRESHOLD;
  const category = options?.category?.trim();
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return [];
  }

  try {
    const queryEmbedding = await embedQuery(normalizedQuery);
    const vector = vectorLiteral(queryEmbedding);
    const categoryFilter = buildCategoryFilter(category);

    const rows = await prisma.$queryRaw<Array<{
      articleId: string;
      keyword: string;
      headline: string;
      categories: string[];
      sentiment: string;
      createdAt: Date;
      updatedAt: Date;
      chunkType: ChunkType;
      chunkPosition: number;
      chunkContent: string;
      similarity: number;
    }>>(Prisma.sql`
      WITH scored AS (
        SELECT
          ac."articleId" AS "articleId",
          a.keyword AS keyword,
          a.headline AS headline,
          a.categories AS categories,
          a.sentiment AS sentiment,
          a."createdAt" AS "createdAt",
          a."updatedAt" AS "updatedAt",
          ac.type AS "chunkType",
          ac.position AS "chunkPosition",
          ac.content AS "chunkContent",
          1 - (ac.embedding <=> ${vector}::vector) AS similarity,
          ROW_NUMBER() OVER (
            PARTITION BY ac."articleId"
            ORDER BY ac.embedding <=> ${vector}::vector ASC, ac.position ASC
          ) AS rn
        FROM "ArticleChunk" ac
        JOIN "Article" a ON a.id = ac."articleId"
        WHERE 1 = 1
        ${categoryFilter}
      )
      SELECT *
      FROM scored
      WHERE rn = 1 AND similarity >= ${threshold}
      ORDER BY similarity DESC, "createdAt" DESC
      LIMIT ${limit}
    `);

    return rows.map((row) => ({
      articleId: row.articleId,
      headline: row.headline,
      keyword: row.keyword,
      categories: row.categories || [],
      sentiment: row.sentiment,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      articleUrl: articleUrl(row.categories?.[0] || 'news', row.headline),
      chunkType: row.chunkType,
      chunkPosition: row.chunkPosition,
      chunkContent: row.chunkContent,
      similarity: Number(row.similarity),
    }));
  } catch (error) {
    console.error('[RAG] Semantic search failed:', error);
    return [];
  }
}

export async function keywordSearchArticles(
  query: string,
  options?: {
    limit?: number;
    category?: string;
  }
): Promise<RagSearchResult[]> {
  try {
    const normalizedQuery = normalizeText(query);
    const limit = options?.limit ?? 8;
    const category = options?.category?.trim();

    if (!normalizedQuery) {
      return [];
    }

    const whereClause: Prisma.ArticleWhereInput = {
      OR: [
        { keyword: { contains: normalizedQuery, mode: 'insensitive' } },
        { headline: { contains: normalizedQuery, mode: 'insensitive' } },
        { categories: { has: normalizedQuery } },
      ],
    };

    if (category) {
      whereClause.AND = [{ categories: { has: category } }];
    }

    const articles = await prisma.article.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        keyword: true,
        headline: true,
        categories: true,
        sentiment: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return articles.map((article, index) => ({
      articleId: article.id,
      headline: article.headline,
      keyword: article.keyword,
      categories: article.categories || [],
      sentiment: article.sentiment,
      createdAt: article.createdAt.toISOString(),
      updatedAt: article.updatedAt.toISOString(),
      articleUrl: articleUrl(article.categories?.[0] || 'news', article.headline),
      chunkType: index === 0 ? 'headline' : 'summary',
      chunkPosition: 0,
      chunkContent: article.headline,
      similarity: Math.max(0.45, 0.9 - index * 0.05),
    }));
  } catch (error) {
    console.error('[RAG] Keyword fallback search failed:', error);
    return [];
  }
}

export async function retrieveArticlesForQuery(
  query: string,
  options?: {
    limit?: number;
    category?: string;
  }
): Promise<RagSearchResult[]> {
  const semanticResults = await searchSemanticArticles(query, options);
  if (semanticResults.length > 0) {
    return semanticResults;
  }

  return keywordSearchArticles(query, options);
}

export async function buildRagAnswer(
  query: string,
  history: RagChatHistoryMessage[],
  sources: RagSearchResult[]
): Promise<{ answer: string; suggestions: string[] }> {
  const sourceLines = sources.length
    ? sources
        .map(
          (source, index) =>
            `${index + 1}. ${source.headline} (${source.articleUrl})\n${stripChunkPrefix(source.chunkContent).slice(0, 320)}`
        )
        .join('\n\n')
    : 'No strong article matches were found.';

  const historyText = history
    .slice(-6)
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join('\n');

  const prompt = `You are the India Reports article assistant.
Answer only from the provided India Reports sources.
If the sources do not cover the user question well, say that clearly and suggest related internal articles.
Do not browse the web. Do not invent facts.
Keep the answer concise, useful, and grounded in the article snippets.

Conversation:
${historyText || 'No prior conversation.'}

User question:
${query}

Sources:
${sourceLines}

Return ONLY valid JSON with:
{
  "answer": string,
  "suggestions": string[]
}
`;

  if (!hasGeminiApiKey()) {
    return {
      answer: sources.length
        ? `I found ${sources.length} relevant article${sources.length === 1 ? '' : 's'} in India Reports, but the assistant model is not configured.`
        : 'I could not find enough matching coverage in India Reports right now.',
      suggestions: sources.slice(0, 3).map((source) => source.headline),
    };
  }

  try {
    const model = getChatModel();
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const text = result.response.text().trim();
    const parsed = JSON.parse(text);
    return {
      answer: typeof parsed.answer === 'string' ? parsed.answer : '',
      suggestions: Array.isArray(parsed.suggestions)
        ? parsed.suggestions.filter((item: unknown): item is string => typeof item === 'string')
        : [],
    };
  } catch (error) {
    console.error('[RAG] Answer generation failed:', error);
    return {
      answer: sources.length
        ? `I found matching coverage in India Reports for "${query}", but I could not generate a polished answer just now.`
        : `I could not find enough matching coverage in India Reports for "${query}".`,
      suggestions: sources.slice(0, 3).map((source) => source.headline),
    };
  }
}

export function buildSourceSnippet(content: string): string {
  return stripChunkPrefix(content);
}

export function buildArticleLink(category: string, headline: string): string {
  return articleUrl(category, headline);
}

export function articleMatchesCategory(article: { categories?: string[] }, category?: string): boolean {
  if (!category) return true;
  return !!article.categories?.includes(category);
}
