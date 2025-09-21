import { Handler } from '@netlify/functions';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const handler: Handler = async (event, context) => {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': 'https://quantum-canvas.netlify.app',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    if (!process.env.GEMINI_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'GEMINI_API_KEY not configured' }),
      };
    }

    const { prompt } = JSON.parse(event.body || '{}');

    if (!prompt) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Prompt is required' }),
      };
    }

    console.log('Generating image for prompt:', prompt);

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
    });

    // Generate enhanced description and create a visual placeholder
    try {
      console.log('Generating enhanced description with Gemini...');

      const enhancedPrompt = `Create an extremely detailed, vivid description of an image based on this prompt: "${prompt}".
      Include specific details about:
      - Visual composition and layout
      - Colors, lighting, and atmosphere
      - Textures and materials
      - Style and artistic approach
      - Mood and emotional tone
      - Specific objects and their placement
      Make it as if you're describing a real masterpiece painting.`;

      const textModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const textResult = await textModel.generateContent(enhancedPrompt);
      const description = textResult.response.text();

      // Create a stylized placeholder with the description
      const canvas = `
        <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <rect width="512" height="512" fill="url(#bg)"/>
          <circle cx="256" cy="256" r="100" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
          <circle cx="256" cy="256" r="60" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="1"/>
          <text x="256" y="240" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="18" font-weight="bold" filter="url(#glow)">✨ AI Generated</text>
          <text x="256" y="270" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="14" opacity="0.9">Description</text>
          <text x="256" y="320" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-family="Arial, sans-serif" font-size="12">"${prompt.substring(0, 40)}${prompt.length > 40 ? '...' : ''}"</text>
        </svg>
      `;

      const imageUrl = `data:image/svg+xml;base64,${Buffer.from(canvas).toString('base64')}`;

      console.log('Enhanced description generated successfully');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          imageUrl,
          description,
          prompt,
          note: 'AI-generated visual concept with detailed description'
        }),
      };

    } catch (error: any) {
      console.error('Gemini text generation failed:', error);

      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'AI description service temporarily unavailable. Please try again.',
          details: error.message,
          prompt
        }),
      };
    }

  } catch (error: any) {
    console.error('Error generating image:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to generate image',
        details: error.message
      }),
    };
  }
};