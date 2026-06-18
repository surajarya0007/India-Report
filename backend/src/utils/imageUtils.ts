/** Google News default placeholder logo — always reject this CDN image ID */
const GOOGLE_NEWS_PLACEHOLDER_ID = 'J6_coFbogxhRI9iM864NL_liGXvsQp2AupsKei7z0cNNfDvGUmWUy20nuUhkREQyrpY4bEeIBuc';

/**
 * Returns null when the URL is the generic Google News placeholder logo.
 * Otherwise returns the original URL.
 */
export function sanitizeImageUrl(url?: string | null): string | null {
  if (!url || typeof url !== 'string') return null;

  const normalized = url.trim();
  if (!normalized) return null;

  // Match the placeholder by its stable Google CDN image ID (with or without query params)
  if (normalized.includes(GOOGLE_NEWS_PLACEHOLDER_ID)) {
    return null;
  }

  return normalized;
}

/**
 * Strip placeholder images from article objects before API responses / caching.
 */
export function sanitizeArticleImage<T extends { imageUrl?: string | null }>(article: T): T {
  return {
    ...article,
    imageUrl: sanitizeImageUrl(article.imageUrl),
  };
}
