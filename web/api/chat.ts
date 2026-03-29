import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';

export const config = {
  runtime: 'edge',
};

// Allow CORS for local development
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async function handler(req: Request) {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Messages are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Call the Anthropic API using the Vercel AI SDK
    const result = await streamText({
      model: anthropic('claude-3-7-sonnet-20250219'), // Using the latest Claude 3.7 Sonnet model
      system: 'You are Girok AI, a smart assistant focused on productivity, finance, and creativity. Be helpful, concise, and professional.',
      messages,
      // You can also add tool calls here if needed in the future
    });

    // Return the stream response back to the client
    return new Response(result.textStream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error('Chat API Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'An error occurred' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
