import { Handler } from '@netlify/functions';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { HfInference } from '@huggingface/inference';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const hf = new HfInference(process.env.HF_TOKEN || '');

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

    const enhancedPrompt = `Create a detailed description for an AI image generator based on this prompt: "${prompt}". Make the description vivid, specific, and optimized for AI image generation. Include details about style, lighting, composition, and visual elements.`;

    const result = await model.generateContent(enhancedPrompt);
    const description = result.response.text();

    // Try Hugging Face image generation
    let imageUrl = null;
    let note = '';

    try {
      if (process.env.HF_TOKEN) {
        console.log('Generating image with Hugging Face...');
        const imageBlob = await hf.textToImage({
          model: 'stabilityai/stable-diffusion-xl-base-1.0',
          inputs: description,
        });

        // Convert blob to base64
        const arrayBuffer = await imageBlob.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        imageUrl = `data:image/png;base64,${base64}`;
        note = 'Generated with Stable Diffusion XL';
        console.log('Image generated successfully with Hugging Face');
      } else {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'HF_TOKEN is required for AI image generation. Please add your Hugging Face token to environment variables.',
            description,
            prompt
          }),
        };
      }
    } catch (hfError) {
      console.error('Hugging Face generation failed:', hfError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'AI image generation failed. Please try again.',
          details: hfError.message,
          description,
          prompt
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        imageUrl,
        description,
        prompt,
        note
      }),
    };

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