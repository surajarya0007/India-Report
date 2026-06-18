import dotenv from 'dotenv';
import Parser from 'rss-parser';
import { ARTICLE_FETCH_LIMIT } from '../config/constants';

dotenv.config();

// Configure rss-parser to also capture the <source> element's url attribute
const parser = new Parser({
  customFields: {
    item: [['source', 'source', { keepArray: false }]],
  }
});

export interface RawArticle {
  title: string;
  url: string;          // Google News redirect URL (used as DB unique key)
  realUrl?: string;     // Resolved actual article URL (used for scraping)
  source: string;
  publishedAt: string;
  description: string;
  category?: string[];
}

/**
 * Extract the real article URL from the RSS item's source element.
 * Google News RSS <source> tags contain the publisher URL.
 * Falls back to undefined if not available.
 */
function extractRealUrl(item: any): string | undefined {
  // rss-parser captures <source url="..."> as item.source
  if (item.source && typeof item.source === 'object' && item.source.$?.url) {
    return item.source.$.url;
  }
  if (item.source && typeof item.source === 'string' && item.source.startsWith('http')) {
    return item.source;
  }
  // Some feeds expose the real link in item['content:encoded'] or item.link directly as non-google URL
  if (item.link && !item.link.includes('news.google.com')) {
    return item.link;
  }
  return undefined;
}

/**
 * Fetch the latest news articles from Google News RSS feed, optionally filtered by category, country, or free-text search.
 */
export async function fetchLatestNews(category?: string, country?: string, searchQuery?: string): Promise<RawArticle[]> {
  try {
    let query = '';

    if (searchQuery) {
      query = searchQuery;
    } else if (!category && !country) {
      query = 'latest news';
    } else {
      const parts = [];
      if (category) {
        parts.push(category);
      }
      if (country === 'IN') {
        parts.push('India');
      } else if (country) {
        parts.push(country);
      }
      query = parts.join(' ');
    }

    // Determine language and country parameters for Google News
    const hl = 'en-IN';
    const gl = 'IN';
    const ceid = 'IN:en';
    
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${hl}&gl=${gl}&ceid=${ceid}`;
    console.log(`[NewsService] Fetching Google News RSS: ${url}`);
    
    const feed = await parser.parseURL(url);
    if (!feed.items || feed.items.length === 0) {
      console.warn('[NewsService] Google News RSS returned empty feed.');
      return [];
    }

    const items = feed.items.slice(0, ARTICLE_FETCH_LIMIT);

    // Extract real URLs from RSS source attributes
    const resolvedUrls = items.map(item => extractRealUrl(item));

    return items.map((item, i) => {
      // Google News title usually ends with " - Source Name"
      let cleanTitle = item.title || 'Untitled Article';
      let sourceName = 'Google News';
      
      const parts = cleanTitle.split(' - ');
      if (parts.length > 1) {
        sourceName = parts.pop()?.trim() || 'Google News';
        cleanTitle = parts.join(' - ').trim();
      }

      const realUrl = resolvedUrls[i];
      if (realUrl) {
        console.log(`[NewsService] Resolved: ${cleanTitle.substring(0, 50)} → ${realUrl.substring(0, 80)}`);
      }

      // Build categories matching the queried category
      const articleCategories: string[] = [];
      if (category) {
        const lower = category.toLowerCase();
        if (lower.includes('tech') || lower.includes('technology')) articleCategories.push('Tech');
        else if (lower.includes('science')) articleCategories.push('Science');
        else if (lower.includes('business')) articleCategories.push('Business');
        else if (lower.includes('finance')) articleCategories.push('Finance');
        else if (lower.includes('politics')) articleCategories.push('Politics');
        else if (lower.includes('entertainment')) articleCategories.push('Entertainment');
        else if (lower.includes('sport')) articleCategories.push('Sports');
        else if (lower.includes('world')) articleCategories.push('World');
        else if (lower.includes('health')) articleCategories.push('Health');
      }

      return {
        title: cleanTitle,
        url: item.link || '',       // Google redirect URL = unique DB key
        realUrl: realUrl,           // Real article URL = used for scraping
        source: sourceName,
        publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
        description: item.contentSnippet || item.content || '',
        category: articleCategories
      };
    });
  } catch (error) {
    console.error('[NewsService] Error fetching from Google News RSS:', error);
    throw error;
  }
}

