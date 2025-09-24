import { Handler } from '@netlify/functions';
import { GoogleGenerativeAI } from '@google/generative-ai';
import sharp from 'sharp';
import Busboy from 'busboy';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

function fileToGenerativePart(buffer: Buffer, mimeType: string) {
  return {
    inlineData: {
      data: buffer.toString('base64'),
      mimeType
    }
  };
}

function parseMultipartData(body: string, contentType: string, isBase64Encoded: boolean): Promise<{ fields: Record<string, string>, files: Array<{ fieldname: string, buffer: Buffer, mimetype: string }> }> {
  return new Promise((resolve, reject) => {
    const fields: Record<string, string> = {};
    const files: Array<{ fieldname: string, buffer: Buffer, mimetype: string }> = [];

    const busboy = Busboy({
      headers: {
        'content-type': contentType
      }
    });

    busboy.on('field', (fieldname, val) => {
      fields[fieldname] = val;
    });

    busboy.on('file', (fieldname, file, info) => {
      const { filename, encoding, mimeType } = info;
      const chunks: Buffer[] = [];

      file.on('data', (chunk) => {
        chunks.push(chunk);
      });

      file.on('end', () => {
        const buffer = Buffer.concat(chunks);
        files.push({
          fieldname,
          buffer,
          mimetype: mimeType
        });
      });
    });

    busboy.on('finish', () => {
      resolve({ fields, files });
    });

    busboy.on('error', (err) => {
      reject(err);
    });

    if (isBase64Encoded) {
      busboy.write(Buffer.from(body, 'base64'));
    } else {
      busboy.write(body);
    }
    busboy.end();
  });
}

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

    const body = event.body;
    const contentType = event.headers['content-type'] || event.headers['Content-Type'];

    if (!body || !contentType) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No data or content type provided' }),
      };
    }

    if (!contentType.includes('multipart/form-data')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Content-Type must be multipart/form-data' }),
      };
    }

    // Parse multipart form data
    const { fields, files } = await parseMultipartData(body, contentType, event.isBase64Encoded || false);

    if (files.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No image file provided' }),
      };
    }

    const imageFile = files[0];
    if (!imageFile.mimetype.startsWith('image/')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Uploaded file is not an image' }),
      };
    }

    // Parse manipulation parameters
    const operation = fields.operation || 'resize';
    const width = fields.width ? parseInt(fields.width) : undefined;
    const height = fields.height ? parseInt(fields.height) : undefined;
    const quality = fields.quality ? parseInt(fields.quality) : 80;
    const format = fields.format || 'jpeg';
    const blur = fields.blur ? parseFloat(fields.blur) : undefined;
    const sharpen = fields.sharpen ? parseFloat(fields.sharpen) : undefined;
    const brightness = fields.brightness ? parseFloat(fields.brightness) : undefined;
    const contrast = fields.contrast ? parseFloat(fields.contrast) : undefined;
    const saturation = fields.saturation ? parseFloat(fields.saturation) : undefined;
    const hue = fields.hue ? parseInt(fields.hue) : undefined;
    const grayscale = fields.grayscale === 'true';
    const flip = fields.flip === 'true';
    const flop = fields.flop === 'true';
    const rotate = fields.rotate ? parseInt(fields.rotate) : undefined;
    const prompt = fields.prompt;

    let sharpInstance = sharp(imageFile.buffer);

    // Apply transformations based on operation
    switch (operation) {
      case 'resize':
        if (width || height) {
          sharpInstance = sharpInstance.resize(width, height, {
            fit: 'inside',
            withoutEnlargement: true
          });
        }
        break;

      case 'crop':
        if (width && height) {
          sharpInstance = sharpInstance.resize(width, height, {
            fit: 'cover',
            position: 'center'
          });
        }
        break;

      case 'enhance':
        if (brightness !== undefined) {
          sharpInstance = sharpInstance.modulate({ brightness });
        }
        if (contrast !== undefined) {
          sharpInstance = sharpInstance.modulate({ saturation: contrast });
        }
        if (saturation !== undefined) {
          sharpInstance = sharpInstance.modulate({ saturation });
        }
        if (hue !== undefined) {
          sharpInstance = sharpInstance.modulate({ hue });
        }
        break;

      case 'filter':
        if (grayscale) {
          sharpInstance = sharpInstance.grayscale();
        }
        if (blur !== undefined) {
          sharpInstance = sharpInstance.blur(blur);
        }
        if (sharpen !== undefined) {
          sharpInstance = sharpInstance.sharpen(sharpen);
        }
        break;

      case 'transform':
        if (flip) {
          sharpInstance = sharpInstance.flip();
        }
        if (flop) {
          sharpInstance = sharpInstance.flop();
        }
        if (rotate !== undefined) {
          sharpInstance = sharpInstance.rotate(rotate);
        }
        break;

      case 'ai-enhance':
        if (prompt && genAI) {
          // Use Gemini Vision to analyze and understand the user's request
          const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
          const imagePart = fileToGenerativePart(imageFile.buffer, imageFile.mimetype);

          const analysisPrompt = `Look at this image and understand what the user wants to do: "${prompt}"

Please analyze the image and provide specific processing instructions in JSON format. Based on the user's request, determine what changes are needed:

For adjustments like "brighter", "more vibrant", "darker", "more contrast", "softer", "sharper":
- brightness: 0.5-2.0 (1.0 = no change, >1.0 = brighter, <1.0 = darker)
- saturation: 0.5-2.0 (1.0 = no change, >1.0 = more vibrant, <1.0 = less vibrant)
- contrast: 0.5-2.0 (1.0 = no change, >1.0 = more contrast, <1.0 = less contrast)
- sharpen: 0-5 (0 = no sharpening, higher = more sharp)
- blur: 0-5 (0 = no blur, higher = more blur)

For color changes like "warmer", "cooler", "more red", "blue tint":
- hue: -180 to 180 (degrees to shift hue)
- temperature: "warm" or "cool" or "neutral"

For effects like "vintage", "black and white", "sepia":
- grayscale: true/false
- sepia: true/false
- vintage: true/false

For transformations:
- rotate: degrees to rotate (-360 to 360)
- flip: true/false (vertical flip)
- flop: true/false (horizontal flip)

Only include the parameters that are relevant to the user's request. Respond with valid JSON only.`;

          try {
            const result = await model.generateContent([analysisPrompt, imagePart]);
            const response = result.response.text();
            console.log('AI Response:', response);

            // Clean the response to extract JSON
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
              throw new Error('No JSON found in response');
            }

            const aiSuggestions = JSON.parse(jsonMatch[0]);
            console.log('AI Suggestions:', aiSuggestions);

            // Apply brightness adjustment
            if (aiSuggestions.brightness && aiSuggestions.brightness !== 1.0) {
              sharpInstance = sharpInstance.modulate({ brightness: aiSuggestions.brightness });
            }

            // Apply saturation adjustment
            if (aiSuggestions.saturation && aiSuggestions.saturation !== 1.0) {
              sharpInstance = sharpInstance.modulate({ saturation: aiSuggestions.saturation });
            }

            // Apply contrast (using gamma for better contrast control)
            if (aiSuggestions.contrast && aiSuggestions.contrast !== 1.0) {
              const gamma = aiSuggestions.contrast > 1.0 ? 1.0 / aiSuggestions.contrast : aiSuggestions.contrast;
              sharpInstance = sharpInstance.gamma(gamma);
            }

            // Apply hue shift
            if (aiSuggestions.hue && aiSuggestions.hue !== 0) {
              sharpInstance = sharpInstance.modulate({ hue: aiSuggestions.hue });
            }

            // Apply temperature adjustment
            if (aiSuggestions.temperature) {
              if (aiSuggestions.temperature === 'warm') {
                sharpInstance = sharpInstance.modulate({ brightness: 1.05, saturation: 1.1 }).tint({ r: 255, g: 245, b: 235 });
              } else if (aiSuggestions.temperature === 'cool') {
                sharpInstance = sharpInstance.modulate({ brightness: 0.95, saturation: 1.1 }).tint({ r: 235, g: 245, b: 255 });
              }
            }

            // Apply sharpening
            if (aiSuggestions.sharpen && aiSuggestions.sharpen > 0) {
              sharpInstance = sharpInstance.sharpen({ sigma: aiSuggestions.sharpen });
            }

            // Apply blur
            if (aiSuggestions.blur && aiSuggestions.blur > 0) {
              sharpInstance = sharpInstance.blur(aiSuggestions.blur);
            }

            // Apply grayscale
            if (aiSuggestions.grayscale) {
              sharpInstance = sharpInstance.grayscale();
            }

            // Apply sepia effect
            if (aiSuggestions.sepia) {
              sharpInstance = sharpInstance.modulate({ saturation: 0.3, brightness: 1.1 }).tint({ r: 255, g: 245, b: 215 });
            }

            // Apply vintage effect
            if (aiSuggestions.vintage) {
              sharpInstance = sharpInstance
                .modulate({ brightness: 0.9, saturation: 0.8 })
                .gamma(1.2)
                .tint({ r: 255, g: 250, b: 230 });
            }

            // Apply transformations
            if (aiSuggestions.rotate && aiSuggestions.rotate !== 0) {
              sharpInstance = sharpInstance.rotate(aiSuggestions.rotate);
            }
            if (aiSuggestions.flip) {
              sharpInstance = sharpInstance.flip();
            }
            if (aiSuggestions.flop) {
              sharpInstance = sharpInstance.flop();
            }

          } catch (parseError) {
            console.log('AI analysis failed, applying intelligent fallback based on prompt:', parseError);

            // Intelligent fallback based on common keywords in the prompt
            const lowerPrompt = prompt.toLowerCase();

            if (lowerPrompt.includes('bright') || lowerPrompt.includes('lighter')) {
              sharpInstance = sharpInstance.modulate({ brightness: 1.3 });
            } else if (lowerPrompt.includes('dark') || lowerPrompt.includes('dimmer')) {
              sharpInstance = sharpInstance.modulate({ brightness: 0.7 });
            }

            if (lowerPrompt.includes('vibrant') || lowerPrompt.includes('colorful') || lowerPrompt.includes('saturated')) {
              sharpInstance = sharpInstance.modulate({ saturation: 1.4 });
            } else if (lowerPrompt.includes('muted') || lowerPrompt.includes('desaturated')) {
              sharpInstance = sharpInstance.modulate({ saturation: 0.6 });
            }

            if (lowerPrompt.includes('contrast')) {
              sharpInstance = sharpInstance.gamma(0.8);
            }

            if (lowerPrompt.includes('sharp')) {
              sharpInstance = sharpInstance.sharpen(2);
            } else if (lowerPrompt.includes('soft') || lowerPrompt.includes('blur')) {
              sharpInstance = sharpInstance.blur(1);
            }

            if (lowerPrompt.includes('warm')) {
              sharpInstance = sharpInstance.modulate({ brightness: 1.05 }).tint({ r: 255, g: 245, b: 235 });
            } else if (lowerPrompt.includes('cool')) {
              sharpInstance = sharpInstance.modulate({ brightness: 0.95 }).tint({ r: 235, g: 245, b: 255 });
            }

            if (lowerPrompt.includes('black and white') || lowerPrompt.includes('grayscale')) {
              sharpInstance = sharpInstance.grayscale();
            }

            if (lowerPrompt.includes('vintage') || lowerPrompt.includes('retro')) {
              sharpInstance = sharpInstance.modulate({ brightness: 0.9, saturation: 0.8 }).gamma(1.2).tint({ r: 255, g: 250, b: 230 });
            }

            if (lowerPrompt.includes('sepia')) {
              sharpInstance = sharpInstance.modulate({ saturation: 0.3, brightness: 1.1 }).tint({ r: 255, g: 245, b: 215 });
            }
          }
        } else {
          // Default enhancement when no prompt provided
          sharpInstance = sharpInstance.modulate({ brightness: 1.1, saturation: 1.1 }).sharpen(1);
        }
        break;
    }

    // Convert to specified format and quality
    switch (format.toLowerCase()) {
      case 'jpeg':
      case 'jpg':
        sharpInstance = sharpInstance.jpeg({ quality });
        break;
      case 'png':
        sharpInstance = sharpInstance.png({ quality });
        break;
      case 'webp':
        sharpInstance = sharpInstance.webp({ quality });
        break;
      case 'avif':
        sharpInstance = sharpInstance.avif({ quality });
        break;
      default:
        sharpInstance = sharpInstance.jpeg({ quality });
        break;
    }

    // Process the image
    const processedBuffer = await sharpInstance.toBuffer();
    const base64Image = processedBuffer.toString('base64');
    const mimeType = `image/${format}`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        imageUrl: `data:${mimeType};base64,${base64Image}`,
        operation,
        parameters: {
          width, height, quality, format, blur, sharpen,
          brightness, contrast, saturation, hue, grayscale,
          flip, flop, rotate, prompt
        },
        originalSize: imageFile.buffer.length,
        processedSize: processedBuffer.length,
        note: 'Image processed successfully with Sharp'
      }),
    };

  } catch (error: any) {
    console.error('Error manipulating image:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to manipulate image',
        details: error.message
      }),
    };
  }
};