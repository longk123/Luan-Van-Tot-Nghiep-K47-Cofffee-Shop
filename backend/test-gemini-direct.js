// Test Gemini API directly
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const API_KEY = process.env.GEMINI_API_KEY;

console.log('🔑 API Key:', API_KEY ? API_KEY.substring(0, 20) + '...' : 'NOT FOUND');

if (!API_KEY) {
  console.error('❌ GEMINI_API_KEY not found!');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);

// Test different model names (based on available models)
const modelNames = [
  'gemini-2.5-flash',      // Latest stable flash
  'gemini-2.0-flash',      // Stable flash
  'gemini-flash-latest',   // Latest flash (auto-updates)
  'gemini-2.5-pro',        // Pro model
  'gemini-pro-latest'      // Latest pro (auto-updates)
];

async function testModel(modelName) {
  try {
    console.log(`\n🔄 Testing model: ${modelName}...`);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent('Hello, say hi in Vietnamese');
    const response = result.response.text();
    console.log(`✅ ${modelName} WORKS!`);
    console.log(`   Response: ${response.substring(0, 100)}...`);
    return { modelName, success: true, response };
  } catch (error) {
    console.log(`❌ ${modelName} FAILED: ${error.message}`);
    return { modelName, success: false, error: error.message };
  }
}

async function testAll() {
  console.log('🧪 Testing all Gemini models...\n');
  
  for (const modelName of modelNames) {
    const result = await testModel(modelName);
    if (result.success) {
      console.log(`\n✅ FOUND WORKING MODEL: ${result.modelName}`);
      console.log('💡 Use this model name in chatbotService.js');
      break;
    }
  }
}

testAll().catch(console.error);

