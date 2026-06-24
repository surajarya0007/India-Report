import type { Article } from './api';

export const SITE_NAME = 'India Reports';
export const PUBLISHER_NAME = 'India Reports Editorial Desk';
export const DEFAULT_SITE_URL = 'https://india-report-frontend-qzqmxyljqa-el.a.run.app';
export const CATEGORY_NAMES = [
  'India',
  'World',
  'Business',
  'Tech',
  'Sports',
  'Science',
  'Finance',
  'Health',
  'Entertainment',
  'Politics',
] as const;

export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  DEFAULT_SITE_URL
).replace(/\/$/, '');

const backendUrl = (
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'development' ? 'http://localhost:5000' : '')
).replace(/\/$/, '');

export interface ArticleSitemapEntry {
  id: string;
  headline: string;
  createdAt: string;
  updatedAt?: string;
  categories: string[];
}

export function slugifyHeadline(headline: string): string {
  return headline
    .toLowerCase()
    .replace(/['’"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90) || 'article';
}

export function articlePath(category: string, headline?: string): string {
  const slug = headline ? slugifyHeadline(headline) : 'article';
  return `/${categorySlug(category)}/${slug}`;
}

export function categorySlug(category: string): string {
  return slugifyHeadline(category);
}

export function categoryNameFromSlug(slug: string): string | null {
  return CATEGORY_NAMES.find((category) => categorySlug(category) === slug) || null;
}

export function categoryPath(category: string): string {
  return `/category/${categorySlug(category)}`;
}

export function categoryUrl(category: string): string {
  return `${siteUrl}${categoryPath(category)}`;
}

function apiUrl(path: string): string {
  if (!backendUrl) {
    throw new Error('BACKEND_URL is not configured for server-side SEO fetches.');
  }

  return `${backendUrl}${path}`;
}

export function articleUrl(category: string, headline?: string): string {
  return `${siteUrl}${articlePath(category, headline)}`;
}

export async function findArticleByCategoryAndSlug(category: string, slug: string): Promise<Article | null> {
  const articles = await fetchArticlesForCategory(category);
  const match = articles.find((article) => slugifyHeadline(article.headline) === slug);
  if (!match) return null;
  return fetchArticleForSeo(match.id);
}

export function buildArticleDescription(article: Article): string {
  const firstSummary = article.summary?.find(Boolean);
  const firstBlock = article.contentBlocks?.find(Boolean);
  const fallback = firstSummary || firstBlock || article.headline;

  return fallback
    .replace(/\*\*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 155);
}

export async function fetchArticleForSeo(id: string): Promise<Article | null> {
  try {
    const response = await fetch(apiUrl(`/api/news/${encodeURIComponent(id)}`), {
      next: { revalidate: 900 },
    });

    if (!response.ok) return null;

    const result = await response.json();
    return result.success ? result.data : null;
  } catch (error) {
    console.error('[SEO] Failed to fetch article:', error);
    return null;
  }
}

export async function fetchArticlesForSitemap(): Promise<ArticleSitemapEntry[]> {
  try {
    const response = await fetch(apiUrl('/api/news/sitemap'), {
      next: { revalidate: 900 },
    });

    if (!response.ok) return [];

    const result = await response.json();
    return result.success && Array.isArray(result.data) ? result.data : [];
  } catch (error) {
    console.error('[SEO] Failed to fetch sitemap articles:', error);
    return [];
  }
}

export async function fetchArticlesForCategory(category: string): Promise<Article[]> {
  try {
    const response = await fetch(apiUrl(`/api/news?category=${encodeURIComponent(category)}`), {
      next: { revalidate: 900 },
    });

    if (!response.ok) return [];

    const result = await response.json();
    return result.success && Array.isArray(result.data) ? result.data : [];
  } catch (error) {
    console.error(`[SEO] Failed to fetch category articles for "${category}":`, error);
    return [];
  }
}

export async function fetchRelatedArticlesForSeo(article: Article): Promise<Article[]> {
  try {
    const response = await fetch(apiUrl('/api/news'), {
      next: { revalidate: 300 },
    });

    if (!response.ok) return [];

    const result = await response.json();
    const allArticles: Article[] = result.success && Array.isArray(result.data) ? result.data : [];
    const categories = article.categories || [];

    return allArticles
      .filter((candidate) => candidate.id !== article.id)
      .sort((a, b) => {
        const aMatches = a.categories?.some((category) => categories.includes(category)) ? 1 : 0;
        const bMatches = b.categories?.some((category) => categories.includes(category)) ? 1 : 0;
        if (bMatches !== aMatches) return bMatches - aMatches;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  } catch (error) {
    console.error('[SEO] Failed to fetch related articles:', error);
    return [];
  }
}
