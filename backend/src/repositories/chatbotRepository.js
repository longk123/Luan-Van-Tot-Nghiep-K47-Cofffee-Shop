// Chatbot Repository - Database layer for chatbot
import { pool } from '../db.js';
import { v4 as uuidv4 } from 'uuid';

export default {
  // ==================== CONVERSATIONS ====================
  
  /**
   * Create new conversation
   * customerAccountId can be null for guest users
   */
  async createConversation(customerAccountId) {
    const sessionId = uuidv4();
    const sql = `
      INSERT INTO chatbot_conversations (customer_account_id, session_id, status)
      VALUES ($1, $2, 'ACTIVE')
      RETURNING id, customer_account_id, session_id, started_at, last_message_at, message_count, status
    `;
    const { rows } = await pool.query(sql, [customerAccountId || null, sessionId]);
    return rows[0];
  },

  /**
   * Get or create active conversation for customer
   * customerAccountId can be null for guest users
   */
  async getOrCreateActiveConversation(customerAccountId) {
    // For guest users (null customerAccountId), always create new conversation
    // For logged-in users, try to get existing active conversation
    if (customerAccountId) {
      const getSql = `
        SELECT id, customer_account_id, session_id, started_at, last_message_at, message_count, status
        FROM chatbot_conversations
        WHERE customer_account_id = $1 AND status = 'ACTIVE'
        ORDER BY last_message_at DESC
        LIMIT 1
      `;
      const { rows } = await pool.query(getSql, [customerAccountId]);
      
      if (rows.length > 0) {
        return rows[0];
      }
    }
    
    // Create new conversation (for both guest and logged-in users)
    return await this.createConversation(customerAccountId);
  },

  /**
   * Get conversation by ID
   */
  async getConversationById(conversationId) {
    const sql = `
      SELECT id, customer_account_id, session_id, started_at, last_message_at, message_count, status
      FROM chatbot_conversations
      WHERE id = $1
    `;
    const { rows } = await pool.query(sql, [conversationId]);
    return rows[0];
  },

  /**
   * Get conversations by customer
   */
  async getConversationsByCustomer(customerAccountId, limit = 10) {
    const sql = `
      SELECT id, customer_account_id, session_id, started_at, last_message_at, message_count, status
      FROM chatbot_conversations
      WHERE customer_account_id = $1
      ORDER BY last_message_at DESC
      LIMIT $2
    `;
    const { rows } = await pool.query(sql, [customerAccountId, limit]);
    return rows;
  },

  /**
   * End conversation
   */
  async endConversation(conversationId) {
    const sql = `
      UPDATE chatbot_conversations
      SET status = 'ENDED', updated_at = NOW()
      WHERE id = $1
      RETURNING id, status
    `;
    const { rows } = await pool.query(sql, [conversationId]);
    return rows[0];
  },

  // ==================== MESSAGES ====================

  /**
   * Create message
   */
  async createMessage({ conversationId, role, content, intent = null, metadata = null }) {
    const sql = `
      INSERT INTO chatbot_messages (conversation_id, role, content, intent, metadata)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, conversation_id, role, content, intent, metadata, created_at
    `;
    const { rows } = await pool.query(sql, [
      conversationId,
      role,
      content,
      intent,
      metadata ? JSON.stringify(metadata) : null
    ]);
    return rows[0];
  },

  /**
   * Get messages by conversation
   */
  async getMessagesByConversation(conversationId, limit = 50) {
    const sql = `
      SELECT id, conversation_id, role, content, intent, metadata, created_at
      FROM chatbot_messages
      WHERE conversation_id = $1
      ORDER BY created_at ASC
      LIMIT $2
    `;
    const { rows } = await pool.query(sql, [conversationId, limit]);
    return rows.map(row => ({
      ...row,
      metadata: row.metadata ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) : null
    }));
  },

  /**
   * Get recent messages for context (last N messages)
   */
  async getRecentMessages(conversationId, limit = 10) {
    const sql = `
      SELECT id, conversation_id, role, content, intent, metadata, created_at
      FROM chatbot_messages
      WHERE conversation_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;
    const { rows } = await pool.query(sql, [conversationId, limit]);
    return rows
      .reverse() // Reverse to get chronological order
      .map(row => ({
        ...row,
        metadata: row.metadata ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) : null
      }));
  }
};

