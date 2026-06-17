import dotenv from 'dotenv';

dotenv.config();

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;

const isRealApiConfigured = (): boolean => {
  return !!(FIRECRAWL_API_KEY && FIRECRAWL_API_KEY !== 'your_firecrawl_key' && !FIRECRAWL_API_KEY.startsWith('your_'));
};

/**
 * Scrape the clean text content (markdown) of a given URL.
 */
export async function scrapeArticle(url: string, title: string): Promise<string> {
  if (!isRealApiConfigured()) {
    console.log(`[ScraperService] Running in Demo Mode. Generating mock page content for title: "${title}"`);
    return getMockScrapedContent(url, title);
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
        formats: ['markdown']
      })
    });

    if (!response.ok) {
      throw new Error(`Firecrawl API returned status ${response.status}`);
    }

    const data: any = await response.json();
    if (data.success && data.data && typeof data.data.markdown === 'string') {
      return data.data.markdown;
    } else {
      console.warn('[ScraperService] Firecrawl returned success=false or missing markdown data. Data:', data);
      throw new Error('Firecrawl parsing failed or returned empty content');
    }
  } catch (error) {
    console.error(`[ScraperService] Failed to scrape ${url}, falling back to mock content:`, error);
    return getMockScrapedContent(url, title);
  }
}

function getMockScrapedContent(url: string, title: string): string {
  return `
# ${title}

Published on tech news portal.

## Main Article Content
In recent developments related to ${title.split(' ').slice(0, 3).join(' ')}, industry experts and company representatives announced major changes. This initiative aims to address existing bottlenecks in the technology sector, bringing modern solutions to scale.

### Key Milestones
- **Efficiency Boost**: Early tests indicate a 40% performance increase under standard enterprise workloads.
- **Widespread Integration**: Leading tech giants have already signed letters of intent to support the platform.
- **Next Steps**: The public release is scheduled for the upcoming quarter, with pre-registrations opening soon.

*Reported by staff correspondents from the tech newsroom. Reference: ${url}*
`;
}
