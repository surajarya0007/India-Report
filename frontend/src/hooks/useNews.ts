import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchNews, triggerIngest, Article } from '../lib/api';

export function useNews(category?: string, search?: string) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [ingesting, setIngesting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [sentimentFilter, setSentimentFilter] = useState<'All' | 'Positive'>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  const loadNews = useCallback(async (showLoading = true) => {
    if (search) return;
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const data = await fetchNews(category);
      setArticles(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch news articles.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [category, search]);

  const loadSearchResults = useCallback(async (query: string, showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const data = await fetchNews(undefined, query);
      setArticles(data);
      return data;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch news articles.');
      return [];
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  const runManualIngest = useCallback(async () => {
    setIngesting(true);
    try {
      let queryCategory: string | undefined;
      let queryCountry: string | undefined;
      let querySearch: string | undefined;

      if (search) {
        querySearch = search;
      } else if (category === 'India') {
        queryCountry = 'IN';
      } else if (category === 'World') {
        queryCategory = 'world';
      } else if (category === 'Tech') {
        queryCategory = 'technology';
      } else if (category && category !== 'Home') {
        queryCategory = category.toLowerCase();
      }

      const res = await triggerIngest(queryCategory, queryCountry, querySearch);
      if (search) {
        await loadSearchResults(search, false);
      } else {
        await loadNews(false);
      }
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
  }, [category, search, loadNews, loadSearchResults]);

  const runSearch = useCallback(async (query: string) => {
    setError(null);
    setArticles([]);
    setLoading(true);
    setIngesting(false);

    try {
      // 1. Load existing matches from the database first
      const existing = await loadSearchResults(query, true);
      const hadCachedResults = existing.length > 0;

      // 2. Fetch additional latest stories from Google News
      setIngesting(true);
      const res = await triggerIngest(undefined, undefined, query);

      // 3. Refresh with any newly ingested articles
      await loadSearchResults(query, false);

      return { ...res, hadCachedResults, cachedCount: existing.length };
    } catch (err: any) {
      setError(err.message || 'Failed to search news.');
      return {
        success: false,
        message: err.message || 'Failed to search news.',
        ingestedCount: 0,
        skippedCount: 0,
        errorsCount: 0,
        hadCachedResults: false,
        cachedCount: 0,
      };
    } finally {
      setIngesting(false);
      setLoading(false);
    }
  }, [loadSearchResults]);

  useEffect(() => {
    if (!search) {
      loadNews();
    }
  }, [loadNews, search]);

  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      if (sentimentFilter === 'Positive' && article.sentiment !== 'Positive') {
        return false;
      }
      if (categoryFilter !== 'All' && !article.categories.includes(categoryFilter)) {
        return false;
      }
      return true;
    });
  }, [articles, sentimentFilter, categoryFilter]);

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
    refresh: () => (search ? loadSearchResults(search) : loadNews(true)),
    triggerIngest: runManualIngest,
    searchNews: runSearch,
  };
}
export type UseNewsReturn = ReturnType<typeof useNews>;
