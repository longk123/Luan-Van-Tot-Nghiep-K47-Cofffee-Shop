// Test Chatbot API
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const API_BASE = 'http://localhost:3000/api/v1/customer';

async function testChatbot() {
  console.log('🤖 Testing Chatbot API...\n');

  try {
    // Test 1: Get active conversation (guest)
    console.log('📝 Test 1: Get active conversation (guest)...');
    const convRes = await fetch(`${API_BASE}/chatbot/conversation/active`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!convRes.ok) {
      const error = await convRes.json();
      console.error('❌ Error:', error);
      return;
    }
    
    const convData = await convRes.json();
    console.log('✅ Conversation:', convData.data?.conversation?.id || 'New conversation');
    console.log('   Messages:', convData.data?.messages?.length || 0);

    // Test 2: Send message
    console.log('\n💬 Test 2: Send message "Menu có gì?"...');
    const chatRes = await fetch(`${API_BASE}/chatbot/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Menu có gì?'
      })
    });

    if (!chatRes.ok) {
      const error = await chatRes.json();
      console.error('❌ Error:', error);
      return;
    }

    const chatData = await chatRes.json();
    console.log('✅ Response:', chatData.data?.message);
    console.log('   Conversation ID:', chatData.data?.conversationId);

    // Test 3: Send another message
    console.log('\n💬 Test 3: Send message "Cà phê đen giá bao nhiêu?"...');
    const chatRes2 = await fetch(`${API_BASE}/chatbot/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Cà phê đen giá bao nhiêu?'
      })
    });

    if (!chatRes2.ok) {
      const error = await chatRes2.json();
      console.error('❌ Error:', error);
      return;
    }

    const chatData2 = await chatRes2.json();
    console.log('✅ Response:', chatData2.data?.message);

    console.log('\n✅ All tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('   Make sure backend is running on http://localhost:3000');
  }
}

testChatbot();

