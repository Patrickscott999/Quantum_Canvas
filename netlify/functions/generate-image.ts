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

    // Use Gemini to generate images via Imagen
    try {
      console.log('Generating image with Gemini Imagen...');

      const imageModel = genAI.getGenerativeModel({ model: 'imagen-3.0-generate-001' });

      const result = await imageModel.generateContent({
        contents: [{
          role: 'user',
          parts: [{ text: prompt }]
        }]
      });

      // Check if we have image data in the response
      const response = result.response;
      if (response.candidates && response.candidates[0]?.content?.parts) {
        const imagePart = response.candidates[0].content.parts.find(part => part.inlineData);

        if (imagePart && imagePart.inlineData) {
          const imageUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;

          console.log('Image generated successfully with Gemini Imagen');
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              imageUrl,
              prompt,
              note: 'Generated with Google Gemini Imagen'
            }),
          };
        }
      }

      // Fallback: if Imagen doesn't work, generate a descriptive response
      const fallbackPrompt = `Create a detailed, vivid description of an image based on this prompt: "${prompt}". Describe the visual elements, colors, composition, style, and mood in rich detail.`;

      const textModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const textResult = await textModel.generateContent(fallbackPrompt);
      const description = textResult.response.text();

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Image generation is not available with this Gemini model configuration.',
          description,
          prompt,
          note: 'Generated detailed description instead. Image generation requires Imagen model access.'
        }),
      };

    } catch (error: any) {
      console.error('Gemini image generation failed:', error);

      // Try to generate just a text description as fallback
      try {
        const fallbackPrompt = `Create a detailed, vivid description of an image based on this prompt: "${prompt}". Describe the visual elements, colors, composition, style, and mood in rich detail.`;

        const textModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const textResult = await textModel.generateContent(fallbackPrompt);
        const description = textResult.response.text();

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Image generation failed, but created description instead.',
            description,
            prompt,
            note: 'This Gemini API key may not have access to image generation models.'
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