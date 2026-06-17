import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchNews, triggerIngest, Article } from '../lib/api';

export function useNews() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [ingesting, setIngesting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [sentimentFilter, setSentimentFilter] = useState<'All' | 'Positive'>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  const loadNews = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const data = await fetchNews();
      setArticles(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch news articles.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  const runManualIngest = useCallback(async () => {
    setIngesting(true);
    try {
      const res = await triggerIngest();
      // Always refresh to fetch any newly processed articles
      await loadNews(false);
      return res;
    } catch (err: any) {
      console.error(err);
      return {
        success: false,
        message: err.message || 'Failed to trigger ingestion pipeline.',
        ingestedCount: 0,
        skippedCount: 0,
        errorsCount: 0
      };
    } finally {
      setIngesting(false);
    }
  }, [loadNews]);

  useEffect(() => {
    loadNews();
  }, [loadNews]);

  // Client-side filtering logic
  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      // 1. Sentiment Filtering (Instant client-side filter)
      if (sentimentFilter === 'Positive' && article.sentiment !== 'Positive') {
        return false;
      }
      // 2. Category Filtering (Optional but premium filter)
      if (categoryFilter !== 'All' && !article.categories.includes(categoryFilter)) {
        return false;
      }
      return true;
    });
  }, [articles, sentimentFilter, categoryFilter]);

  // List of unique categories found in current articles for filter dropdown/tabs
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    articles.forEach((a) => {
      if (Array.isArray(a.categories)) {
        a.categories.forEach((c) => cats.add(c));
      }
    });
    return Array.from(cats);
  }, [articles]);

  return {
    articles,
    filteredArticles,
    loading,
    ingesting,
    error,
    sentimentFilter,
    setSentimentFilter,
    categoryFilter,
    setCategoryFilter,
    availableCategories,
    refresh: () => loadNews(true),
    triggerIngest: runManualIngest
  };
}
export type UseNewsReturn = ReturnType<typeof useNews>;
