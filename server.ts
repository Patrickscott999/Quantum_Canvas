import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { HfInference } from '@huggingface/inference';
import mime from 'mime';
import { writeFile, mkdir, readFile } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

const app = express();
const PORT = process.env.PORT || 3000;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const hf = new HfInference(process.env.HF_TOKEN || '');

app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/generated', express.static('generated'));

const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

async function ensureDirectories() {
  const dirs = ['generated', 'public'];
  for (const dir of dirs) {
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
  }
}

function fileToGenerativePart(buffer: Buffer, mimeType: string) {
  return {
    inlineData: {
      data: buffer.toString('base64'),
      mimeType
    }
  };
}

async function saveGeneratedImage(base64Data: string, mimeType: string): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const extension = mime.getExtension(mimeType) || 'png';
  const fileName = `generated-${timestamp}.${extension}`;
  const filePath = path.join('generated', fileName);
  
  const buffer = Buffer.from(base64Data, 'base64');
  await writeFile(filePath, buffer);
  
  return `/generated/${fileName}`;
}


app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log('Generating image with Nano Banana for prompt:', prompt);
    
    // Use Gemini 2.5 Flash Image (Nano Banana) for actual image generation
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash-image-preview',
    });

    const enhancedPrompt = `Create a high-quality, detailed image: ${prompt}. 
      Make it visually appealing, colorful, and professional-looking.`;

    const result = await model.generateContent({
      contents: [{ 
        role: 'user', 
        parts: [{ text: enhancedPrompt }] 
      }]
    });

    const response = result.response;
    
    if (response.candidates?.[0]?.content?.parts) {
      // Look for image data in the response
      for (const part of response.candidates[0].content.parts) {
        if ('inlineData' in part && part.inlineData) {
          // Found image data - save it
          const imageUrl = await saveGeneratedImage(
            part.inlineData.data, 
            part.inlineData.mimeType || 'image/png'
          );
          
          console.log('Real image generated successfully:', imageUrl);
          res.json({ 
            success: true, 
            imageUrl,
            prompt,
            note: 'Generated with Gemini 2.5 Flash Image (Nano Banana)'
          });
          return;
        }
      }
      
      // No image found, might be text response
      const textPart = response.candidates[0].content.parts.find(part => 'text' in part);
      if (textPart && 'text' in textPart) {
        console.log('Received text response instead of image:', textPart.text);
        res.status(400).json({ 
          error: 'Model returned text instead of image. Try a more specific image prompt.',
          details: textPart.text 
        });
      } else {
        throw new Error('No valid content in response');
      }
    } else {
      throw new Error('No candidates in response');
    }

  } catch (error: any) {
    console.error('Error generating image with Nano Banana:', error);
    
    // Check if it's a quota error and provide helpful message
    if (error.message?.includes('quota') || error.message?.includes('Too Many Requests')) {
      console.log('Quota exceeded for Nano Banana model');
      res.status(429).json({ 
        error: 'API quota exceeded',
        details: 'Gemini 2.5 Flash Image free tier quota exceeded. Please wait or enable billing.',
        retryAfter: '24 hours for quota reset, or enable billing at https://aistudio.google.com/'
      });
      return;
    }
    
    res.status(500).json({ 
      error: 'Failed to generate image',
      details: error.message 
    });
  }
});

app.post('/api/manipulate-image', upload.single('image'), async (req, res) => {
  try {
    const { prompt } = req.body;
    const file = req.file;
    
    if (!prompt || !file) {
      return res.status(400).json({ error: 'Prompt and image are required' });
    }

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
    });

    const imagePart = fileToGenerativePart(file.buffer, file.mimetype);
    
    const enhancedPrompt = `Analyze this uploaded image and create a detailed description of how it would look after this transformation: "${prompt}". 
      Describe the visual changes, colors, style modifications, and overall appearance of the transformed image.`;

    console.log('Analyzing image transformation for prompt:', prompt);
    
    const result = await model.generateContent({
      contents: [{ 
        role: 'user', 
        parts: [
          { text: enhancedPrompt },
          imagePart
        ] 
      }]
    });

    const response = await result.response;
    const description = response.text();

    // Create a placeholder transformed image URL
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const imageId = Math.floor(Math.random() * 1000) + 500;
    const placeholderUrl = `https://picsum.photos/800/600?random=${imageId}`;
    
    // Save the transformation description
    const fileName = `transformation-${timestamp}.txt`;
    const filePath = path.join('generated', fileName);
    await writeFile(filePath, `Original Image: ${file.originalname}\nTransformation: ${prompt}\n\nGenerated Description:\n${description}`);
    
    console.log('Image transformation description generated successfully');
    res.json({ 
      success: true, 
      imageUrl: placeholderUrl,
      description: description,
      prompt,
      note: 'This is a placeholder transformed image. In a production app, you would use image manipulation APIs or AI services.'
    });

  } catch (error: any) {
    console.error('Error analyzing image transformation:', error);
    res.status(500).json({ 
      error: 'Failed to analyze image transformation',
      details: error.message 
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    apiKeySet: !!process.env.GEMINI_API_KEY 
  });
});

async function startServer() {
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY is not set in .env file');
    process.exit(1);
  }
  
  await ensureDirectories();
  
  app.listen(PORT, () => {
    console.log(`⚛️ Quantum Canvas Server running on http://localhost:${PORT}`);
    console.log(`🎨 Open your browser to http://localhost:${PORT} to start creating!`);
  });
}

startServer();