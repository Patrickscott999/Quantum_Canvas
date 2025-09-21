import { Handler } from '@netlify/functions';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
      const imageModel = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash-image-preview'
      });

      // Use the correct format for image generation
      const imagePrompt = `Generate an image: ${prompt}`;

      const result = await imageModel.generateContent({
        contents: [{
          role: 'user',
          parts: [{
            text: imagePrompt
          }]
        }]
      });

      const response = result.response;
      console.log('Response received from Gemini:', JSON.stringify({
        candidates: response.candidates?.length,
        parts: response.candidates?.[0]?.content?.parts?.length
      }));

      // Check if we have image data in the response
      if (response.candidates && response.candidates[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          console.log('Part type:', part.inlineData ? 'inlineData' : 'text');

          if (part.inlineData) {
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

      // If we get here, the model responded with text instead of an image
      const textResponse = response.candidates?.[0]?.content?.parts?.[0]?.text;
      console.log('Model responded with text instead of image:', textResponse);

      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Your API key does not have access to image generation with Gemini 2.5 Flash Image Preview.',
          prompt,
          note: 'The model responded with text instead of generating an image. You may need to request access to image generation capabilities from Google AI.',
          modelResponse: textResponse
        }),
      };

    } catch (error: any) {
      console.error('Gemini image generation failed:', error);

      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Failed to generate image with Gemini nano banana model.',
          details: error.message,
          prompt,
          note: 'Ensure your API key has access to Gemini 2.5 Flash Image Preview model.'
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