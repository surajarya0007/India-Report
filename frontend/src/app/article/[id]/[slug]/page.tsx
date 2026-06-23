import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import ArticleClient from '../ArticleClient';
import {
  PUBLISHER_NAME,
  SITE_NAME,
  articlePath,
  articleUrl,
  buildArticleDescription,
  fetchArticleForSeo,
  fetchRelatedArticlesForSeo,
  siteUrl,
  slugifyHeadline,
} from '../../../../lib/seo';

export const revalidate = 900;

type ArticlePageParams = {
  params: Promise<{ id: string; slug: string }>;
};

export async function generateMetadata({ params }: ArticlePageParams): Promise<Metadata> {
  const { id } = await params;
  const article = await fetchArticleForSeo(id);

  if (!article) {
    return {
      title: `Article Not Found | ${SITE_NAME}`,
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const description = buildArticleDescription(article);
  const canonicalUrl = articleUrl(article.id, article.headline);
  const images = article.imageUrl ? [{ url: article.imageUrl, alt: article.headline }] : [];

  return {
    title: `${article.headline} | ${SITE_NAME}`,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    authors: [{ name: PUBLISHER_NAME }],
    keywords: [
      article.keyword,
      ...(article.categories || []),
      'India Reports',
      'India news',
    ].filter(Boolean),
    openGraph: {
      type: 'article',
      url: canonicalUrl,
      siteName: SITE_NAME,
      title: article.headline,
      description,
      publishedTime: article.createdAt,
      modifiedTime: article.updatedAt || article.createdAt,
      authors: [PUBLISHER_NAME],
      section: article.categories?.[0],
      tags: article.categories,
      images,
    },
    twitter: {
      card: article.imageUrl ? 'summary_large_image' : 'summary',
      title: article.headline,
      description,
      images: article.imageUrl ? [article.imageUrl] : undefined,
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageParams) {
  const { id, slug } = await params;
  const article = await fetchArticleForSeo(id);

  if (!article) {
    notFound();
  }

  const canonicalSlug = slugifyHeadline(article.headline);
  if (slug !== canonicalSlug) {
    redirect(articlePath(article.id, article.headline));
  }

  const relatedArticles = await fetchRelatedArticlesForSeo(article);
  const related = relatedArticles.slice(0, 5);
  const moreStories = relatedArticles.filter((story) => !related.some((item) => item.id === story.id)).slice(0, 4);
  const description = buildArticleDescription(article);
  const canonicalUrl = articleUrl(article.id, article.headline);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.headline,
    description,
    image: article.imageUrl ? [article.imageUrl] : undefined,
    datePublished: article.createdAt,
    dateModified: article.updatedAt || article.createdAt,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl,
    },
    author: {
      '@type': 'Organization',
      name: PUBLISHER_NAME,
      url: siteUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: siteUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl}/favicon.ico`,
      },
    },
    articleSection: article.categories?.[0],
    keywords: [article.keyword, ...(article.categories || [])].filter(Boolean).join(', '),
    isAccessibleForFree: true,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <ArticleClient
        initialArticle={article}
        initialRelated={related}
        initialMoreStories={moreStories}
      />
    </>
  );
}
