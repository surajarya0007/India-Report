"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchLatestNews = fetchLatestNews;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const NEWS_API_KEY = process.env.NEWS_API_KEY;
// Check if actual credentials are provided
const isRealApiConfigured = () => {
    return !!(NEWS_API_KEY && NEWS_API_KEY !== 'your_news_api_key' && !NEWS_API_KEY.startsWith('your_'));
};
/**
 * Fetch the top 20 business/tech articles.
 * Triggers every 15 minutes.
 */
async function fetchLatestNews() {
    if (!isRealApiConfigured()) {
        console.log('[NewsService] Running in Demo Mode. Generating realistic mock articles...');
        return getMockArticles();
    }
    try {
        // Currents API endpoint
        // Format: https://api.currentsapi.services/v1/search?category=technology&category=business&apiKey=...
        const category = 'technology'; // Can search for technology, business
        const url = `https://api.currentsapi.services/v1/search?language=en&category=${category}&limit=20&apiKey=${NEWS_API_KEY}`;
        console.log(`[NewsService] Fetching from Currents API: ${url.replace(NEWS_API_KEY, '***')}`);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Currents API returned status ${response.status}`);
        }
        const data = await response.json();
        if (data.status !== 'ok' || !Array.isArray(data.news)) {
            console.warn('[NewsService] Currents API returned error status or empty news. Data:', data);
            return [];
        }
        // Map to normalized structure
        return data.news.map((item) => ({
            title: item.title || 'Untitled Article',
            url: item.url,
            source: item.author || 'Currents News',
            publishedAt: item.published || new Date().toISOString()
        }));
    }
    catch (error) {
        console.error('[NewsService] Error fetching from Currents API, falling back to mock articles:', error);
        return getMockArticles();
    }
}
function getMockArticles() {
    const sources = ['TechCrunch', 'BBC News', 'VentureBeat', 'Wired', 'Bloomberg', 'The Verge'];
    const techTopics = [
        'OpenAI launches new GPT-5 model with advanced reasoning capabilities',
        'Apple announces groundbreaking features for iOS 20 at WWDC',
        'Google Cloud introduces new TPU v6 chips for enterprise AI workloads',
        'SpaceX successfully launches Starship on sixth test flight',
        'Nvidia reaches record valuation as AI chip demand continues to soar',
        'Supabase raises $100M to expand open-source database platform',
        'Prisma ORM releases native support for Edge functions and SQLite',
        'Microsoft integrates Copilot deeper into Windows 11 taskbar',
        'Tesla unveils fully autonomous Cybercab in California event',
        'Meta releases Llama 4 open source LLM with 1 trillion parameters'
    ];
    return techTopics.map((title, index) => {
        const source = sources[index % sources.length];
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        return {
            title,
            url: `https://www.example.com/news/${slug}-${Date.now() - index * 60000}`,
            source,
            publishedAt: new Date(Date.now() - index * 5 * 60 * 1000).toISOString()
        };
    });
}
