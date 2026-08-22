import OpenAI from 'openai';

// Simple token estimation (rough approximation)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export async function POST(request: Request) {
  const startTime = Date.now();

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

    const openrouter = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : 'http://localhost:3000',
        'X-Title': 'OpenChat',
      },
    });

    // Calculate input tokens
    const inputText = messages.map((m: any) => m.content).join(' ');
    const inputTokens = estimateTokens(inputText);

    // Convert messages to OpenAI format, handling images
    const formattedMessages = messages.map((msg: any) => {
      if (msg.parts && msg.parts.length > 0) {
        // Message with images
        const content: any[] = [];
        msg.parts.forEach((part: any) => {
          if (part.type === 'text' && part.text) {
            content.push({ type: 'text', text: part.text });
          } else if (part.type === 'image' && part.image) {
            content.push({
              type: 'image_url',
              image_url: {
                url: part.image, // base64 data URL
              },
            });
          }
        });
        return {
          role: msg.role,
          content,
        };
      }
      return {
        role: msg.role,
        content: msg.content,
      };
    });

    const stream = await openrouter.chat.completions.create({
      model,
      messages: formattedMessages as any,
      temperature: temperature ?? 0.7,
      top_p: topP ?? 1,
      max_tokens: maxTokens ?? 2048,
      stream: true,
    });

    // Convert to readable stream for response
    const encoder = new TextEncoder();
    let outputText = '';

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) {
              outputText += delta;
              controller.enqueue(encoder.encode(delta));
            }
          }

          // Send metadata at the end
          const outputTokens = estimateTokens(outputText);
          const totalTokens = inputTokens + outputTokens;
          const duration = (Date.now() - startTime) / 1000;

          const metadata = `\n\n[METADATA]${JSON.stringify({
            inputTokens,
            outputTokens,
            totalTokens,
            duration: duration.toFixed(2),
          })}[/METADATA]`;

          controller.enqueue(encoder.encode(metadata));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
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
