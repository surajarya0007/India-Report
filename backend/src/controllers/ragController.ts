import { Request, Response } from 'express';
import {
  indexArticleIfPossible,
  buildRagAnswer,
  retrieveArticlesForQuery,
  type RagChatHistoryMessage,
  type RagArticleLike,
} from '../services/ragService';

import { runIngestionPipeline } from './ingestionController';
import {
  markIngestionStarted,
  markIngestionComplete,
  markIngestionError,
} from '../services/ingestionStatus';

function parseLimit(value: unknown, fallback = 8): number {
  const limit = Number(value);
  if (!Number.isFinite(limit) || limit <= 0) {
    return fallback;
  }
  return Math.min(Math.floor(limit), 20);
}

/**
 * GET /api/rag/search
 */
export async function searchRagArticles(req: Request, res: Response) {
  const query = String(req.query.q || req.query.query || '').trim();
  const category = String(req.query.category || '').trim() || undefined;
  const limit = parseLimit(req.query.limit, 8);

  if (!query) {
    return res.status(400).json({ success: false, message: 'Query is required.' });
  }

  try {
    const results = await retrieveArticlesForQuery(query, { limit, category });
    return res.status(200).json({
      success: true,
      query,
      results,
    });
  } catch (error: any) {
    console.error('[RAGController] Search error:', error);
    return res.status(500).json({ success: false, message: 'Failed to search India Reports content.' });
  }
}

/**
 * POST /api/rag/chat
 */
export async function chatWithArticles(req: Request, res: Response) {
  const query = String(req.body?.query || '').trim();
  const category = String(req.body?.category || '').trim() || undefined;
  const limit = parseLimit(req.body?.limit, 6);
  const history = Array.isArray(req.body?.history) ? req.body.history : [];

  if (!query) {
    return res.status(400).json({ success: false, message: 'Query is required.' });
  }

  const sanitizedHistory: RagChatHistoryMessage[] = history
    .filter((item: any) => item && (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string')
    .slice(-8)
    .map((item: any) => ({
      role: item.role,
      content: item.content,
    }));

  try {
    let sources = await retrieveArticlesForQuery(query, { limit, category });
    let answer = await buildRagAnswer(query, sanitizedHistory, sources);

    // If Gemini specifies that we need ingestion and provides a search keyword
    if (answer.needsIngestion && answer.searchKeyword) {
      console.log(`[RAG] Inline ingestion triggered for keyword: "${answer.searchKeyword}"`);
      markIngestionStarted('search', answer.searchKeyword);
      
      try {
        const ingestRes = await runIngestionPipeline(undefined, undefined, answer.searchKeyword, 'search');
        
        markIngestionComplete('search', {
          ingestedCount: ingestRes.ingestedCount,
          skippedCount: ingestRes.skippedCount,
          errorsCount: ingestRes.errorsCount,
        });

        if (ingestRes.ingestedCount > 0) {
          console.log(`[RAG] Ingestion successful. Re-querying vector index for: "${query}"`);
          sources = await retrieveArticlesForQuery(query, { limit, category });
          answer = await buildRagAnswer(query, sanitizedHistory, sources);
        }
      } catch (ingestError: any) {
        console.error(`[RAG] Inline ingestion failed:`, ingestError);
        markIngestionError('search', ingestError.message || String(ingestError));
      }
    }

    return res.status(200).json({
      success: true,
      query,
      answer: answer.answer,
      suggestions: answer.suggestions,
      sources,
    });
  } catch (error: any) {
    console.error('[RAGController] Chat error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate a grounded answer.' });
  }
}

/**
 * POST /api/rag/index
 */
export async function indexArticle(req: Request, res: Response) {
  const article = req.body?.article as RagArticleLike | undefined;
  if (!article?.id || !article?.headline) {
    return res.status(400).json({ success: false, message: 'Valid article payload is required.' });
  }

  try {
    const success = await indexArticleIfPossible(article);
    return res.status(200).json({ success });
  } catch (error: any) {
    console.error('[RAGController] Index error:', error);
    return res.status(500).json({ success: false, message: 'Failed to index article chunks.' });
  }
}
