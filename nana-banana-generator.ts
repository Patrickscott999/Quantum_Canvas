import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { writeFile } from 'fs';

async function generateNanaBananaContent() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-1.5-flash',
  });

  const prompt = `Create a detailed character profile and story for "Nana Banana", a whimsical banana grandmother character. Include:
    1. Physical description (how she looks as an anthropomorphic banana)
    2. Personality traits
    3. Her backstory
    4. Her special abilities or skills
    5. A short adventure story featuring Nana Banana
    6. Ideas for merchandise or branding
    
    Make it fun, creative, and suitable for children's content!`;

  try {
    console.log('Generating Nana Banana character content...\n');
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log(text);
    
    // Save to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `nana-banana-story-${timestamp}.txt`;
    
    writeFile(fileName, text, 'utf8', (err) => {
      if (err) {
        console.error(`Error writing file ${fileName}:`, err);
        return;
      }
      console.log(`\nContent saved to ${fileName}`);
    });
    
  } catch (error) {
    console.error('Error generating content:', error);
  }
}

if (!process.env.GEMINI_API_KEY) {
  console.error('Error: GEMINI_API_KEY environment variable is not set');
  console.log('Please set your API key in a .env file');
  process.exit(1);
}

generateNanaBananaContent();