"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.synthesizeArticle = synthesizeArticle;
const generative_ai_1 = require("@google/generative-ai");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const isRealApiConfigured = () => {
    return !!(GEMINI_API_KEY && GEMINI_API_KEY !== 'your_gemini_or_openai_key' && !GEMINI_API_KEY.startsWith('your_'));
};
/**
 * Synthesize article content using Gemini 1.5 Flash.
 */
async function synthesizeArticle(title, rawText) {
    if (!isRealApiConfigured()) {
        console.log(`[AIService] Running in Demo Mode. Analyzing locally: "${title}"`);
        return getLocalMockAnalysis(title, rawText);
    }
    try {
        const genAI = new generative_ai_1.GoogleGenerativeAI(GEMINI_API_KEY);
        // Using structured output mode by specifying responseMimeType and responseSchema
        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: 'object',
                    properties: {
                        headline: {
                            type: 'string',
                            description: 'AI-generated catchy headline under 10 words.'
                        },
                        summary: {
                            type: 'string',
                            description: 'AI-generated 3-sentence objective summary of the article.'
                        },
                        sentiment: {
                            type: 'string',
                            enum: ['Positive', 'Negative', 'Neutral']
                        },
                        categories: {
                            type: 'array',
                            items: {
                                type: 'string',
                                enum: ['Tech', 'Business', 'Science', 'Health', 'Entertainment', 'Finance']
                            },
                            description: 'Array of categories applicable to the article content.'
                        }
                    },
                    required: ['headline', 'summary', 'sentiment', 'categories']
                }
            }
        });
        const systemPrompt = `You are a professional journalist and AI news assistant for "India Reports", an autonomous self-updating news platform.
Your task is to analyze the provided scraped article text and output a JSON object containing:
1. "headline": A catchy and engaging headline summarizing the news in under 10 words.
2. "summary": A concise, objective 3-sentence summary of the article. Do not write more or less than exactly 3 sentences.
3. "sentiment": Evaluate the tone of the article and classify it strictly as "Positive", "Negative", or "Neutral".
4. "categories": A list of applicable categories. Select only from these values: "Tech", "Business", "Science", "Health", "Entertainment", "Finance".

Format the output strictly as a JSON object matching the requested schema.`;
        const userPrompt = `Title: ${title}\n\nContent:\n${rawText}`;
        console.log(`[AIService] Synthesizing article with Gemini: "${title}"`);
        const result = await model.generateContent([
            { text: systemPrompt },
            { text: userPrompt }
        ]);
        const responseText = result.response.text();
        const synthesized = JSON.parse(responseText);
        // Validate properties and return
        return {
            headline: (synthesized.headline || title).substring(0, 100),
            summary: synthesized.summary || 'Summary could not be generated.',
            sentiment: ['Positive', 'Negative', 'Neutral'].includes(synthesized.sentiment)
                ? synthesized.sentiment
                : 'Neutral',
            categories: Array.isArray(synthesized.categories) && synthesized.categories.length > 0
                ? synthesized.categories.filter(cat => ['Tech', 'Business', 'Science', 'Health', 'Entertainment', 'Finance'].includes(cat))
                : ['Tech']
        };
    }
    catch (error) {
        console.error(`[AIService] Gemini synthesis failed for "${title}", using fallback:`, error);
        return getLocalMockAnalysis(title, rawText);
    }
}
/**
 * Perform a deterministic heuristic analysis when Gemini API is unavailable.
 */
function getLocalMockAnalysis(title, rawText) {
    // Catchy headline under 10 words
    const titleWords = title.split(' ');
    const headline = titleWords.length <= 9 ? title : titleWords.slice(0, 8).join(' ') + '...';
    // Categories deduction based on content keywords
    const categories = [];
    const textLower = (title + ' ' + rawText).toLowerCase();
    if (textLower.includes('ai') || textLower.includes('software') || textLower.includes('google') || textLower.includes('apple') || textLower.includes('tech') || textLower.includes('gpu')) {
        categories.push('Tech');
    }
    if (textLower.includes('raise') || textLower.includes('acquire') || textLower.includes('valuation') || textLower.includes('business') || textLower.includes('million') || textLower.includes('billion')) {
        categories.push('Business');
    }
    if (textLower.includes('space') || textLower.includes('launch') || textLower.includes('starship') || textLower.includes('science') || textLower.includes('nasa')) {
        categories.push('Science');
    }
    if (textLower.includes('health') || textLower.includes('clinical') || textLower.includes('medicine')) {
        categories.push('Health');
    }
    if (textLower.includes('movie') || textLower.includes('show') || textLower.includes('event') || textLower.includes('entertainment')) {
        categories.push('Entertainment');
    }
    if (textLower.includes('finance') || textLower.includes('shares') || textLower.includes('stock') || textLower.includes('market')) {
        categories.push('Finance');
    }
    if (categories.length === 0) {
        categories.push('Tech');
    }
    // Sentiment deduction
    let sentiment = 'Neutral';
    if (textLower.includes('record') || textLower.includes('success') || textLower.includes('growth') || textLower.includes('breakthrough') || textLower.includes('positive') || textLower.includes('soar')) {
        sentiment = 'Positive';
    }
    else if (textLower.includes('fail') || textLower.includes('decline') || textLower.includes('lawsuit') || textLower.includes('negative') || textLower.includes('drop') || textLower.includes('down')) {
        sentiment = 'Negative';
    }
    // 3-sentence summary creation
    const sentence1 = `${title} marks a significant milestone in the technology and industry space.`;
    const sentence2 = `Key indicators show that this development will impact both developers and end-users alike.`;
    const sentence3 = `Furthermore, analysts predict that this shift could trigger widespread adoption of similar paradigms.`;
    const summary = `${sentence1} ${sentence2} ${sentence3}`;
    return {
        headline,
        summary,
        sentiment,
        categories
    };
}
