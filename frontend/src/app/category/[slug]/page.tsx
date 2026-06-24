import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Layout from '../../../components/Layout';
import type { Article } from '../../../lib/api';
import {
  PUBLISHER_NAME,
  SITE_NAME,
  articlePath,
  buildArticleDescription,
  categoryNameFromSlug,
  categoryUrl,
  fetchArticlesForCategory,
  siteUrl,
} from '../../../lib/seo';

export const dynamic = 'force-dynamic';
export const revalidate = 900;

type CategoryPageParams = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

function sortArticlesByFreshness(articles: Article[]): Article[] {
  return [...articles].sort((a, b) => {
    const aTime = new Date(a.updatedAt || a.createdAt).getTime();
    const bTime = new Date(b.updatedAt || b.createdAt).getTime();
    return bTime - aTime;
  });
}

function getCategoryDescription(category: string, articleCount: number) {
  if (!articleCount) {
    return `Latest ${category} coverage from India Reports.`;
  }

  return `Latest ${category} coverage from India Reports, including ${articleCount} recent article${articleCount === 1 ? '' : 's'} and ongoing updates.`;
}

export async function generateMetadata({ params, searchParams }: CategoryPageParams): Promise<Metadata> {
  const { slug } = await params;
  const searchP = await searchParams;
  const page = searchP?.page ? parseInt(searchP.page as string) : 1;
  const category = categoryNameFromSlug(slug);

  if (!category) {
    return {
      title: `Category Not Found | ${SITE_NAME}`,
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const { articles: rawArticles } = await fetchArticlesForCategory(category, page);
  const articles = sortArticlesByFreshness(rawArticles);
  const canonicalUrl = page > 1 ? `${categoryUrl(category)}?page=${page}` : categoryUrl(category);
  const description = getCategoryDescription(category, articles.length);

  return {
    title: `${category} News & Reports | ${SITE_NAME}`,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    authors: [{ name: PUBLISHER_NAME }],
    openGraph: {
      type: 'website',
      url: canonicalUrl,
      siteName: SITE_NAME,
      title: `${category} News & Reports`,
      description,
    },
    twitter: {
      card: 'summary',
      title: `${category} News & Reports`,
      description,
    },
  };
}

function CategoryCard({ article, featured = false }: { article: Article; featured?: boolean }) {
  const description = buildArticleDescription(article);
  const hasImage = Boolean(article.imageUrl);
  const category = article.categories?.[0];
  const href = articlePath(category || 'news', article.headline);

  return (
    <article
      style={{
        display: 'grid',
        gridTemplateColumns: featured && hasImage ? 'minmax(0, 1.2fr) minmax(0, 0.8fr)' : '1fr',
        gap: featured ? 20 : 12,
        padding: featured ? 20 : 16,
        border: '1px solid var(--border-primary)',
        borderRadius: 8,
        background: 'var(--bg-primary)',
        boxShadow: '0 6px 20px rgba(0,0,0,0.04)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {category ? (
          <span style={{
            display: 'inline-flex',
            width: 'fit-content',
            padding: '4px 10px',
            borderRadius: 999,
            background: 'var(--ticker-bg)',
            color: 'var(--color-ink)',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>
            {category}
          </span>
        ) : null}
        <h2 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: featured ? 'clamp(24px, 2.4vw, 34px)' : 18,
          lineHeight: 1.2,
          margin: 0,
        }}>
          <Link href={href} style={{ color: 'inherit', textDecoration: 'none' }}>
            {article.headline}
          </Link>
        </h2>
        <p style={{
          margin: 0,
          color: 'var(--color-ink-muted)',
          fontSize: 14,
          lineHeight: 1.7,
        }}>
          {description}
        </p>
        <div style={{ fontSize: 12, color: 'var(--color-ink-ghost)' }}>
          Updated {new Date(article.updatedAt || article.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </div>
      </div>

      {featured && hasImage ? (
        <div style={{
          position: 'relative',
          minHeight: 260,
          borderRadius: 8,
          overflow: 'hidden',
          background: 'var(--bg-secondary)',
        }}>
          <Image
            src={article.imageUrl!}
            alt={article.headline}
            fill
            sizes="(max-width: 768px) 100vw, 40vw"
            style={{ objectFit: 'cover' }}
            unoptimized
          />
        </div>
      ) : null}
    </article>
  );
}

export default async function CategoryPage({ params, searchParams }: CategoryPageParams) {
  const { slug } = await params;
  const searchP = await searchParams;
  const page = searchP?.page ? parseInt(searchP.page as string) : 1;
  const category = categoryNameFromSlug(slug);

  if (!category) {
    notFound();
  }

  const { articles: rawArticles, totalPages } = await fetchArticlesForCategory(category, page);
  const articles = sortArticlesByFreshness(rawArticles);
  const featuredArticle = page === 1 ? articles[0] : null;
  const otherArticles = page === 1 ? articles.slice(1) : articles;
  const canonicalUrl = page > 1 ? `${categoryUrl(category)}?page=${page}` : categoryUrl(category);
  const description = getCategoryDescription(category, articles.length);

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: siteUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: category,
        item: canonicalUrl,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c') }}
      />
      <Layout activeNav={category}>
        <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px var(--container-padding) 48px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
            <span style={{
              display: 'inline-flex',
              width: 'fit-content',
              padding: '5px 12px',
              borderRadius: 999,
              background: 'var(--ticker-bg)',
              color: 'var(--color-ink)',
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}>
              Category
            </span>
            <h1 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(30px, 4vw, 52px)',
              lineHeight: 1.08,
              margin: 0,
              letterSpacing: '-0.02em',
            }}>
              {category}
            </h1>
            <p style={{
              margin: 0,
              maxWidth: 800,
              color: 'var(--color-ink-muted)',
              fontSize: 16,
              lineHeight: 1.75,
            }}>
              {description}
            </p>
            <div style={{ fontSize: 12, color: 'var(--color-ink-ghost)' }}>
              {articles.length} article{articles.length === 1 ? '' : 's'} available in this section
            </div>
          </div>

          {featuredArticle ? (
            <div style={{ marginBottom: 24 }}>
              <CategoryCard article={featuredArticle} featured />
            </div>
          ) : null}

          {otherArticles.length > 0 ? (
            <section style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 16,
            }}>
              {otherArticles.map((article) => (
                <CategoryCard key={article.id} article={article} />
              ))}
            </section>
          ) : featuredArticle ? null : (
            <div style={{
              padding: 24,
              border: '1px solid var(--border-primary)',
              borderRadius: 8,
              color: 'var(--color-ink-muted)',
            }}>
              No articles have been published in this category yet.
            </div>
          )}

          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 48,
              paddingTop: 24,
              borderTop: '1px solid var(--border-primary)',
            }}>
              {page > 1 ? (
                <Link href={`/category/${slug}${page - 1 > 1 ? `?page=${page - 1}` : ''}`} style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  background: 'var(--bg-secondary)',
                  color: 'var(--color-ink)',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: 14,
                }}>
                  ← Previous Page
                </Link>
              ) : <div />}
              
              <div style={{ fontSize: 13, color: 'var(--color-ink-muted)' }}>
                Page {page} of {totalPages}
              </div>

              {page < totalPages ? (
                <Link href={`/category/${slug}?page=${page + 1}`} style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  background: 'var(--bg-secondary)',
                  color: 'var(--color-ink)',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: 14,
                }}>
                  Next Page →
                </Link>
              ) : <div />}
            </div>
          )}

          <div style={{ marginTop: 28, fontSize: 13, color: 'var(--color-ink-ghost)' }}>
            Browse the latest reports in {category} or return to the <Link href="/" style={{ color: 'inherit' }}>home page</Link>.
          </div>
        </main>
      </Layout>
    </>
  );
}
