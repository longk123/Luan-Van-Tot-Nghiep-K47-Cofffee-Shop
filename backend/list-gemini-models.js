// List available Gemini models for this API key
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error('❌ GEMINI_API_KEY not found!');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);

async function listModels() {
  try {
    console.log('📋 Listing available models...\n');
    
    // Try to list models (if API supports it)
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
    const data = await response.json();
    
    if (data.models) {
      console.log('✅ Available models:');
      data.models.forEach(model => {
        console.log(`   - ${model.name}`);
        if (model.supportedGenerationMethods) {
          console.log(`     Methods: ${model.supportedGenerationMethods.join(', ')}`);
        }
      });
    } else {
      console.log('❌ Could not list models. Response:', data);
    }
  } catch (error) {
    console.error('❌ Error listing models:', error.message);
    console.log('\n💡 This API key might need to enable Gemini API in Google Cloud Console.');
    console.log('💡 Or try using API key from: https://aistudio.google.com/app/apikey');
  }
}

listModels();

