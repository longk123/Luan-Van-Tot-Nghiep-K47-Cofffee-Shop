// migrate-add-chatbot-tables.cjs
// Migration: Thêm bảng cho chatbot AI (chỉ cho Customer Portal)
// Date: 2025-11-22

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'coffee_shop',
});

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('🤖 Bắt đầu migration: Chatbot AI tables...');
    
    await client.query('BEGIN');
    
    // 1. Bảng chatbot_conversations (Cuộc hội thoại)
    console.log('📝 Tạo bảng chatbot_conversations...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS chatbot_conversations (
        id SERIAL PRIMARY KEY,
        customer_account_id INT REFERENCES customer_accounts(id) ON DELETE CASCADE,
        session_id TEXT UNIQUE, -- UUID cho session
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        message_count INT DEFAULT 0,
        status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ENDED')),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    
    // Indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_chatbot_conv_customer 
      ON chatbot_conversations(customer_account_id);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_chatbot_conv_session 
      ON chatbot_conversations(session_id);
    `);
    
    // 2. Bảng chatbot_messages (Tin nhắn)
    console.log('💬 Tạo bảng chatbot_messages...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS chatbot_messages (
        id SERIAL PRIMARY KEY,
        conversation_id INT NOT NULL REFERENCES chatbot_conversations(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK (role IN ('user', 'bot', 'system')),
        content TEXT NOT NULL,
        intent TEXT, -- Phân loại intent (nếu có)
        metadata JSONB, -- Thông tin bổ sung
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    
    // Indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_chatbot_msg_conv 
      ON chatbot_messages(conversation_id);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_chatbot_msg_created 
      ON chatbot_messages(created_at);
    `);
    
    // 3. Trigger: Cập nhật last_message_at và message_count
    console.log('⚙️ Tạo trigger cập nhật conversation...');
    await client.query(`
      CREATE OR REPLACE FUNCTION trg_update_chatbot_conversation()
      RETURNS TRIGGER AS $$
      BEGIN
        UPDATE chatbot_conversations
        SET 
          last_message_at = NOW(),
          message_count = message_count + 1,
          updated_at = NOW()
        WHERE id = NEW.conversation_id;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    await client.query(`
      DROP TRIGGER IF EXISTS trg_chatbot_msg_update_conv ON chatbot_messages;
      CREATE TRIGGER trg_chatbot_msg_update_conv
      AFTER INSERT ON chatbot_messages
      FOR EACH ROW
      EXECUTE FUNCTION trg_update_chatbot_conversation();
    `);
    
    await client.query('COMMIT');
    console.log('✅ Migration chatbot tables thành công!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Lỗi migration:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(console.error);

