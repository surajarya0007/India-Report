const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export interface Article {
  id: string;
  sourceUrl: string;
  headline: string;
  summary: string;
  content?: string;
  sentiment: 'Positive' | 'Negative' | 'Neutral';
  categories: string[];
  sourceName: string;
  imageUrl?: string;
  enrichmentStatus?: 'pending' | 'complete';
  createdAt: string;
}

export interface FetchNewsResponse {
  success: boolean;
  source: 'cache' | 'database';
  data: Article[];
}

export interface IngestTriggerResponse {
  success: boolean;
  status: 'processing';
  message: string;
}

export type IngestJobStatus = 'idle' | 'processing' | 'scraping' | 'complete' | 'error';

export interface IngestStatusResponse {
  success: boolean;
  status: IngestJobStatus;
  message: string;
  startedAt?: string;
  completedAt?: string;
  ingestedCount?: number;
  skippedCount?: number;
  errorsCount?: number;
  error?: string;
}

export interface IngestResult {
  success: boolean;
  message: string;
  ingestedCount: number;
  skippedCount: number;
  errorsCount: number;
}

const POLL_INTERVAL_MS = 4_000;
const POLL_TIMEOUT_MS = 10 * 60 * 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch the latest news articles from the backend API.
 */
export async function fetchNews(category?: string, search?: string): Promise<Article[]> {
  try {
    const params = new URLSearchParams();
    if (search) {
      params.append('search', search);
    } else if (category && category !== 'Home') {
      params.append('category', category);
    }
    const queryString = params.toString();
    const url = queryString ? `${API_URL}/api/news?${queryString}` : `${API_URL}/api/news`;
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    const res: FetchNewsResponse = await response.json();
    return res.success ? res.data : [];
  } catch (error) {
    console.error('[API] fetchNews error:', error);
    return [];
  }
}

/**
 * Poll ingestion status until complete, error, or timeout.
 */
export async function pollIngestStatus(
  onTick?: (status: IngestStatusResponse) => void
): Promise<IngestResult> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const status = await fetchIngestStatus();
    onTick?.(status);

    if (status.status === 'complete') {
      return {
        success: true,
        message: status.message,
        ingestedCount: status.ingestedCount ?? 0,
        skippedCount: status.skippedCount ?? 0,
        errorsCount: status.errorsCount ?? 0,
      };
    }

    if (status.status === 'error') {
      return {
        success: false,
        message: status.error || status.message,
        ingestedCount: status.ingestedCount ?? 0,
        skippedCount: status.skippedCount ?? 0,
        errorsCount: status.errorsCount ?? 0,
      };
    }

    await sleep(POLL_INTERVAL_MS);
  }

  return {
    success: false,
    message: 'Ingestion timed out. Try refreshing in a moment.',
    ingestedCount: 0,
    skippedCount: 0,
    errorsCount: 0,
  };
}

export async function fetchIngestStatus(): Promise<IngestStatusResponse> {
  try {
    const response = await fetch(`${API_URL}/api/news/ingest/status`, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error('[API] fetchIngestStatus error:', error);
    return {
      success: false,
      status: 'error',
      message: error.message || 'Failed to fetch ingestion status.',
    };
  }
}

/**
 * Start background ingestion (202 Accepted) and wait for completion via polling.
 */
export async function triggerIngest(
  category?: string,
  country?: string,
  search?: string,
  onStatus?: (status: IngestStatusResponse) => void
): Promise<IngestResult> {
  try {
    let url = `${API_URL}/api/news/ingest`;
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (category) params.append('category', category);
    if (country) params.append('country', country);
    const queryString = params.toString();
    if (queryString) url += `?${queryString}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.status !== 202 && !response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return await pollIngestStatus(onStatus);
  } catch (error: any) {
    console.error('[API] triggerIngest error:', error);
    return {
      success: false,
      message: error.message || 'Failed to trigger ingestion pipeline.',
      ingestedCount: 0,
      skippedCount: 0,
      errorsCount: 0,
    };
  }
}

/**
 * Fetch a single article by its ID (includes full content).
 */
export async function fetchArticleById(id: string): Promise<Article | null> {
  try {
    const response = await fetch(`${API_URL}/api/news/${id}`, { cache: 'no-store' });
    if (!response.ok) return null;
    const res = await response.json();
    return res.success ? res.data : null;
  } catch (error) {
    console.error('[API] fetchArticleById error:', error);
    return null;
  }
}

/**
 * Triggers on-demand scraping and AI enrichment for a single article stub.
 */
export async function enrichArticleById(id: string): Promise<Article | null> {
  try {
    const response = await fetch(`${API_URL}/api/news/${id}/enrich`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) return null;
    const res = await response.json();
    return res.success ? res.data : null;
  } catch (error) {
    console.error('[API] enrichArticleById error:', error);
    return null;
  }
}
