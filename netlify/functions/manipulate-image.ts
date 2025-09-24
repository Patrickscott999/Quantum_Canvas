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
          // Use Gemini Vision to analyze and suggest improvements
          const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

          const imagePart = fileToGenerativePart(imageFile.buffer, imageFile.mimetype);

          const result = await model.generateContent([
            `Analyze this image and suggest specific image processing parameters based on this request: "${prompt}".
             Respond with a JSON object containing recommended values for: brightness (0.5-2.0), contrast (0.5-2.0), saturation (0.5-2.0),
             sharpen (0-10), blur (0-10), and any other processing recommendations.`,
            imagePart
          ]);

          const response = result.response.text();
          try {
            const aiSuggestions = JSON.parse(response);
            if (aiSuggestions.brightness) sharpInstance = sharpInstance.modulate({ brightness: aiSuggestions.brightness });
            if (aiSuggestions.contrast) sharpInstance = sharpInstance.linear(aiSuggestions.contrast, 0);
            if (aiSuggestions.saturation) sharpInstance = sharpInstance.modulate({ saturation: aiSuggestions.saturation });
            if (aiSuggestions.sharpen) sharpInstance = sharpInstance.sharpen(aiSuggestions.sharpen);
            if (aiSuggestions.blur) sharpInstance = sharpInstance.blur(aiSuggestions.blur);
          } catch (parseError) {
            console.log('AI suggestions could not be parsed, applying default enhancements');
            sharpInstance = sharpInstance.modulate({ brightness: 1.1, saturation: 1.1 }).sharpen(1);
          }
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