// Chatbot Controller - Handle HTTP requests for chatbot
import chatbotService from '../services/chatbotService.js';
import { asyncHandler } from '../middleware/error.js';

export default {
  /**
   * POST /api/v1/customer/chatbot/chat
   * Send message to chatbot
   */
  chat: asyncHandler(async (req, res) => {
    const { message } = req.body;
    const customerAccountId = req.customer?.customerId || null;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message không được để trống'
      });
    }

    const result = await chatbotService.chat({
      customerAccountId,
      message: message.trim()
    });

    res.json({
      success: true,
      data: result
    });
  }),

  /**
   * GET /api/v1/customer/chatbot/conversations
   * Get customer conversations
   */
  getConversations: asyncHandler(async (req, res) => {
    const customerAccountId = req.customer?.customerId || null;

    if (!customerAccountId) {
      return res.status(401).json({
        success: false,
        error: 'Cần đăng nhập để xem lịch sử chat'
      });
    }

    const conversations = await chatbotService.getConversations(customerAccountId);

    res.json({
      success: true,
      data: conversations
    });
  }),

  /**
   * GET /api/v1/customer/chatbot/conversations/:id/messages
   * Get messages in a conversation
   */
  getMessages: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const customerAccountId = req.customer?.customerId || null;

    const conversationId = parseInt(id);
    if (isNaN(conversationId)) {
      return res.status(400).json({
        success: false,
        error: 'ID conversation không hợp lệ'
      });
    }

    const messages = await chatbotService.getMessages(conversationId);

    res.json({
      success: true,
      data: messages
    });
  }),

  /**
   * GET /api/v1/customer/chatbot/conversation/active
   * Get or create active conversation
   */
  getActiveConversation: asyncHandler(async (req, res) => {
    const customerAccountId = req.customer?.customerId || null;

    const conversation = await chatbotService.getOrCreateConversation(customerAccountId);
    const messages = await chatbotService.getMessages(conversation.id);

    res.json({
      success: true,
      data: {
        conversation,
        messages
      }
    });
  })
};

