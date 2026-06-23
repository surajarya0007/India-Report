import type { MetadataRoute } from 'next';
import { articleUrl, fetchArticlesForSitemap, siteUrl } from '../lib/seo';

export const dynamic = 'force-dynamic';
export const revalidate = 900;

const staticRoutes = [
  '',
  '/about',
  '/advertise',
  '/contact',
  '/e-paper',
  '/ethics-policy',
  '/privacy-policy',
  '/terms',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const articles = await fetchArticlesForSitemap();

  return [
    ...staticRoutes.map((route) => ({
      url: `${siteUrl}${route}`,
      lastModified: now,
      changeFrequency: route === '' ? 'hourly' as const : 'weekly' as const,
      priority: route === '' ? 1 : 0.5,
    })),
    ...articles.map((article) => ({
      url: articleUrl(article.id, article.headline),
      lastModified: new Date(article.updatedAt || article.createdAt),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
  ];
}
