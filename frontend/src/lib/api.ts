const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export interface Article {
  id: string;
  sourceUrl: string;
  headline: string;
  summary: string;
  sentiment: 'Positive' | 'Negative' | 'Neutral';
  categories: string[];
  sourceName: string;
  createdAt: string;
}

export interface FetchNewsResponse {
  success: boolean;
  source: 'cache' | 'database';
  data: Article[];
}

export interface IngestResponse {
  success: boolean;
  message: string;
  ingestedCount: number;
  skippedCount: number;
  errorsCount: number;
}

/**
 * Fetch the latest news articles from the backend API.
 */
export async function fetchNews(): Promise<Article[]> {
  try {
    const response = await fetch(`${API_URL}/api/news`, {
      cache: 'no-store'
    });
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
 * Manually trigger the news ingestion pipeline.
 */
export async function triggerIngest(): Promise<IngestResponse> {
  try {
    const response = await fetch(`${API_URL}/api/news/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error('[API] triggerIngest error:', error);
    return {
      success: false,
      message: error.message || 'Failed to trigger ingestion pipeline.',
      ingestedCount: 0,
      skippedCount: 0,
      errorsCount: 0
    };
  }
}
