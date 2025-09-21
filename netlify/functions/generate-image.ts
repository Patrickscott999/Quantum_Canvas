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

    // Generate real images using Gemini 2.5 Flash Image Preview (nano banana)
    try {
      console.log('Generating image with Gemini 2.5 Flash Image Preview...');

      const imageModel = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash-image-preview'
      });

      const result = await imageModel.generateContent([prompt]);
      const response = result.response;

      // Check if we have image data in the response
      if (response.candidates && response.candidates[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
            const imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;

            console.log('Image generated successfully with Gemini 2.5 Flash Image Preview');
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({
                success: true,
                imageUrl,
                prompt,
                note: 'Generated with Gemini 2.5 Flash Image Preview (nano banana)'
              }),
            };
          }
        }
      }

      // If no image was found in response, log the response for debugging
      console.log('No image found in response:', JSON.stringify(response, null, 2));

      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'No image was generated. The model may not have access to image generation.',
          prompt,
          details: 'Response received but no image data found'
        }),
      };

    } catch (error: any) {
      console.error('Gemini image generation failed:', error);

      // If the model isn't available, try generating a description instead
      try {
        console.log('Falling back to text description...');
        const textModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const enhancedPrompt = `Create an extremely detailed, vivid description of an image based on this prompt: "${prompt}". Include visual composition, colors, lighting, textures, style, and mood.`;
        const textResult = await textModel.generateContent(enhancedPrompt);
        const description = textResult.response.text();

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Image generation model not available. Generated description instead.',
            description,
            prompt,
            note: 'Your API key may not have access to Gemini 2.5 Flash Image Preview. Contact Google AI to enable image generation.'
          }),
        };
      } catch (fallbackError) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'AI service temporarily unavailable. Please try again.',
            details: error.message,
            prompt
          }),
        };
      }
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