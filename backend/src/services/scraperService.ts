import dotenv from 'dotenv';
import { sanitizeImageUrl } from '../utils/imageUtils';

dotenv.config();

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;

const isRealApiConfigured = (): boolean => {
  return !!(FIRECRAWL_API_KEY && FIRECRAWL_API_KEY !== 'your_firecrawl_key' && !FIRECRAWL_API_KEY.startsWith('your_'));
};

export interface ScrapeResult {
  markdown: string;
  imageUrl?: string;
}

/**
 * Scrape the clean text content (markdown) and og:image of a given URL.
 * Returns both the markdown body and the primary image URL when available.
 */
export async function scrapeArticle(url: string, title: string): Promise<ScrapeResult> {
  if (!isRealApiConfigured()) {
    throw new Error('[ScraperService] API key not configured.');
  }

  try {
    console.log(`[ScraperService] Scraping URL via Firecrawl: ${url}`);
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: url,
        formats: ['markdown'],
      })
    });

    if (!response.ok) {
      throw new Error(`Firecrawl API returned status ${response.status}`);
    }

    const data: any = await response.json();
    if (data.success && data.data) {
      const markdown = typeof data.data.markdown === 'string' ? data.data.markdown : '';

      // Extract image from Firecrawl metadata — scan all keys for image-related fields
      const meta = data.data.metadata || {};

      // Firecrawl uses both colon-style (og:image) and camelCase (ogImage) keys
      let imageUrl: string | undefined =
        sanitizeImageUrl(
          meta['og:image'] ||
          meta['ogImage'] ||
          meta['twitter:image'] ||
          meta['twitterImage'] ||
          meta['og:image:url']
        ) ?? undefined;

      // Fallback: scan all metadata keys for any image URL
      if (!imageUrl) {
        for (const key of Object.keys(meta)) {
          if (key.toLowerCase().includes('image')) {
            const val = meta[key];
            const candidate = typeof val === 'string' ? val : (Array.isArray(val) ? val[0] : undefined);
            const sanitized = sanitizeImageUrl(candidate);
            if (sanitized) {
              imageUrl = sanitized;
              break;
            }
          }
        }
      }

      imageUrl = sanitizeImageUrl(imageUrl) ?? undefined;

      if (imageUrl) {
        console.log(`[ScraperService] Found image for "${title}": ${imageUrl}`);
      } else if (
        meta['og:image'] ||
        meta['ogImage'] ||
        meta['twitter:image'] ||
        meta['twitterImage']
      ) {
        console.log(`[ScraperService] Rejected Google News placeholder image for "${title}"`);
      } else {
        console.log(`[ScraperService] No image found for "${title}". Meta keys: ${Object.keys(meta).filter(k => k.toLowerCase().includes('image') || k.toLowerCase().includes('og')).join(', ')}`);
      }

      return { markdown, imageUrl };
    } else {
      console.warn('[ScraperService] Firecrawl returned success=false or missing data. Data:', data);
      throw new Error('Firecrawl parsing failed or returned empty content');
    }
  } catch (error) {
    console.error(`[ScraperService] Failed to scrape ${url}:`, error);
    throw error;
  }
}
