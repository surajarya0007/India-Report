import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const isRealApiConfigured = (): boolean => {
  return !!(GEMINI_API_KEY && GEMINI_API_KEY !== 'your_gemini_or_openai_key' && !GEMINI_API_KEY.startsWith('your_'));
};

export interface SynthesizedArticle {
  headline: string;
  summary: string;
  content: string;
  sentiment: 'Positive' | 'Negative' | 'Neutral';
  categories: string[];
}

/**
 * Synthesize article content using Gemini 1.5 Flash.
 */
export async function synthesizeArticle(title: string, rawText: string): Promise<SynthesizedArticle> {
  if (!isRealApiConfigured()) {
    throw new Error('[AIService] API key not configured.');
  }

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);
    
    // Using structured output mode by specifying responseMimeType and responseSchema
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      tools: [{ googleSearch: {} } as any],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object' as any,
          properties: {
            headline: {
              type: 'string' as any,
              description: 'AI-generated catchy headline under 10 words.'
            },
            summary: {
              type: 'string' as any,
              description: 'AI-generated 3-sentence objective summary of the article, enriched with verified facts.'
            },
            content: {
              type: 'string' as any,
              description: 'AI-generated detailed and descriptive news article of 3 to 4 paragraphs (minimum 250 words) covering all facts, using standard journalistic structure, separated by double newlines (\\n\\n).'
            },
            sentiment: {
              type: 'string' as any,
              enum: ['Positive', 'Negative', 'Neutral']
            },
            categories: {
              type: 'array' as any,
              items: {
                type: 'string' as any,
                enum: ['Tech', 'Business', 'Science', 'Health', 'Entertainment', 'Finance']
              },
              description: 'Array of categories applicable to the article content.'
            }
          },
          required: ['headline', 'summary', 'content', 'sentiment', 'categories']
        }
      }
    });

    const systemPrompt = `You are a professional journalist and AI news assistant for "India Reports", an autonomous self-updating news platform.
Your task is to analyze the provided scraped article text and output a JSON object.
Use the Google Search tool to:
1. Verify the facts in the article to ensure only confirmed details are included.
2. Search Google to retrieve additional relevant details, context, and background information to write a more descriptive, informative summary and full article.
3. If the input text is short or is a fallback description, query Google Search for the full story to ensure the output is rich and detailed.

Output a JSON object containing:
1. "headline": A catchy and engaging headline summarizing the news in under 10 words.
2. "summary": A concise, objective 3-sentence summary of the article containing rich, verified details. Do not write more or less than exactly 3 sentences. This is used for the homepage newsfeed cards.
3. "content": A highly detailed and descriptive news article of 3 to 4 paragraphs (at least 250 words) written in a premium, professional journalistic style. Include background details, quotes, stats, or consequences of the event. Use double newlines (\\n\\n) to separate paragraphs. Do not use markdown tags inside the paragraphs.
4. "sentiment": Evaluate the tone of the article and classify it strictly as "Positive", "Negative", or "Neutral".
5. "categories": A list of applicable categories. Select only from these values: "Tech", "Business", "Science", "Health", "Entertainment", "Finance".

Format the output strictly as a JSON object matching the requested schema.`;

    const userPrompt = `Title: ${title}\n\nContent:\n${rawText}`;

    console.log(`[AIService] Synthesizing article with Gemini: "${title}"`);
    
    let result;
    let attempts = 3;
    for (let i = 1; i <= attempts; i++) {
      try {
        result = await model.generateContent([
          { text: systemPrompt },
          { text: userPrompt }
        ]);
        break;
      } catch (err: any) {
        if (i === attempts) throw err;
        console.warn(`[AIService] Gemini call failed (attempt ${i}/${attempts}), retrying in 2s... Error:`, err.message || err);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    if (!result) {
      throw new Error('Gemini execution returned empty result.');
    }

    const responseText = result.response.text();
    const synthesized: SynthesizedArticle = JSON.parse(responseText);

    // Validate properties and return
    return {
      headline: (synthesized.headline || title).substring(0, 100),
      summary: synthesized.summary || 'Summary could not be generated.',
      content: synthesized.content || synthesized.summary || '',
      sentiment: ['Positive', 'Negative', 'Neutral'].includes(synthesized.sentiment) 
        ? synthesized.sentiment 
        : 'Neutral',
      categories: Array.isArray(synthesized.categories) && synthesized.categories.length > 0
        ? synthesized.categories.filter(cat => ['Tech', 'Business', 'Science', 'Health', 'Entertainment', 'Finance'].includes(cat))
        : ['Tech']
    };

  } catch (error) {
    console.error(`[AIService] Gemini synthesis failed for "${title}":`, error);
    throw error;
  }
}

