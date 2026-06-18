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
 * Fetch the latest news articles from the backend API, optionally filtered by category.
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
    const response = await fetch(url, {
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
 * Manually trigger the news ingestion pipeline with optional category/country filter.
 */
export async function triggerIngest(category?: string, country?: string, search?: string): Promise<IngestResponse> {
  try {
    let url = `${API_URL}/api/news/ingest`;
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (category) params.append('category', category);
    if (country) params.append('country', country);
    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
    const response = await fetch(url, {
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

/**
 * Fetch a single article by its ID.
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
