import { generateText, streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  headers: {
    'HTTP-Referer': process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000',
    'X-Title': 'OpenChat',
  },
});

export async function POST(request: Request) {
  try {
    const { messages, model, temperature, topP, maxTokens } = await request.json();

    if (!process.env.OPENROUTER_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'OpenRouter API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!model) {
      return new Response(
        JSON.stringify({ error: 'Model is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const modelInstance = openrouter.chat(model);

    const result = await streamText({
      model: modelInstance,
      messages,
      temperature: temperature ?? 0.7,
      topP: topP ?? 1,
      maxTokens: maxTokens ?? 2048,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);
    const message =
      error instanceof Error ? error.message : 'An error occurred';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
