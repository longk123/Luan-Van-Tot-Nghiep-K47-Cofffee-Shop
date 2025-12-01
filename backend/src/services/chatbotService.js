// Chatbot Service - Business logic with Gemini AI integration
import { GoogleGenerativeAI } from '@google/generative-ai';
import chatbotRepository from '../repositories/chatbotRepository.js';
import customerRepository from '../repositories/customerRepository.js';
import promotionRepository from '../repositories/promotionRepository.js';
import analyticsService from './analyticsService.js';

// Initialize Gemini
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY not found in environment variables!');
}

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

// Helper function to get model with fallback
function getModel() {
  if (!genAI) return null;
  
  // Try different model names (some API keys may have access to different models)
  const modelNames = [
    'gemini-1.5-flash-latest',  // Latest flash model
    'gemini-1.5-flash',         // Flash model
    'gemini-1.5-pro-latest',    // Latest pro model
    'gemini-pro'                // Legacy model
  ];
  
  // Try first model (most common)
  return genAI.getGenerativeModel({ model: modelNames[0] });
}

const model = getModel();

export default {
  /**
   * Get or create active conversation
   */
  async getOrCreateConversation(customerAccountId) {
    return await chatbotRepository.getOrCreateActiveConversation(customerAccountId);
  },

  /**
   * Build context for AI (menu, customer info, promotions, etc.)
   */
  async buildContext(customerAccountId = null) {
    // Get menu data
    const menuItems = await customerRepository.getMenuItems();
    const categories = await customerRepository.getActiveCategories();

    // Format menu for context
    const menuContext = menuItems.map(item => {
      const price = item.gia_tu ? `Từ ${item.gia_tu.toLocaleString('vi-VN')}đ` : 'Liên hệ';
      return `- ${item.ten} (${item.loai_ten}): ${price}`;
    }).join('\n');

    const categoriesContext = categories.map(cat => `- ${cat.ten}`).join('\n');

    // Get active promotions
    let promotionsContext = '';
    try {
      const activePromotions = await promotionRepository.getAll({ 
        status: 'active' 
      });
      if (activePromotions && activePromotions.length > 0) {
        promotionsContext = activePromotions.map(promo => {
          let desc = `- ${promo.ten} (Mã: ${promo.ma})`;
          if (promo.mo_ta) desc += `: ${promo.mo_ta}`;
          if (promo.loai === 'PERCENT') {
            desc += ` - Giảm ${promo.gia_tri}%`;
            if (promo.gia_tri_toi_da) desc += ` (tối đa ${promo.gia_tri_toi_da.toLocaleString('vi-VN')}đ)`;
          } else if (promo.loai === 'FIXED') {
            desc += ` - Giảm ${promo.gia_tri.toLocaleString('vi-VN')}đ`;
          }
          if (promo.don_hang_toi_thieu) {
            desc += ` (Đơn tối thiểu: ${promo.don_hang_toi_thieu.toLocaleString('vi-VN')}đ)`;
          }
          return desc;
        }).join('\n');
      } else {
        promotionsContext = 'Hiện tại không có khuyến mãi nào đang diễn ra.';
      }
    } catch (error) {
      console.error('Error fetching promotions:', error);
      promotionsContext = 'Không thể tải thông tin khuyến mãi.';
    }

    // Get best seller items (top 10 trong 30 ngày gần nhất)
    let bestSellersContext = '';
    try {
      const bestSellers = await analyticsService.getTopMenuItems(30, 10);
      if (bestSellers && bestSellers.length > 0) {
        bestSellersContext = bestSellers.map((item, index) => {
          const rank = index + 1;
          const variant = item.variant ? ` (${item.variant})` : '';
          return `${rank}. ${item.name}${variant} - Đã bán ${item.quantity_sold} phần`;
        }).join('\n');
      } else {
        bestSellersContext = 'Hiện tại chưa có dữ liệu về món bán chạy.';
      }
    } catch (error) {
      console.error('Error fetching best sellers:', error);
      bestSellersContext = 'Không thể tải thông tin món bán chạy.';
    }

    // Get customer info if logged in
    let customerContext = '';
    if (customerAccountId) {
      const customer = await customerRepository.findById(customerAccountId);
      if (customer) {
        customerContext = `\nKhách hàng: ${customer.full_name || 'Khách hàng'} (SĐT: ${customer.phone})`;
      }
    }

    return {
      menu: menuContext,
      categories: categoriesContext,
      promotions: promotionsContext,
      bestSellers: bestSellersContext,
      customer: customerContext
    };
  },

  /**
   * Build system prompt
   */
  async buildSystemPrompt(context) {
    return `Bạn là trợ lý AI thân thiện của DevCoffee. Nhiệm vụ của bạn:

1. **Trả lời câu hỏi về menu:**
   - Giới thiệu các món có trong menu
   - Giải thích về các loại đồ uống
   - Tư vấn món phù hợp với sở thích
   - Thông tin về giá cả và size

2. **Hỗ trợ đặt hàng:**
   - Hướng dẫn cách đặt hàng online
   - Giải thích về giỏ hàng và thanh toán
   - Tư vấn về size và topping
   - Các loại đơn hàng: Mang đi (TAKEAWAY), Tại quán (DINE_IN), Giao hàng (DELIVERY)

3. **Thông tin quán:**
   - Địa chỉ: 123 Đường 3/2, Phường Xuân Khánh, Ninh Kiều, Cần Thơ
   - Điện thoại: 0292 388 888
   - Email: info@coffeeshop-demo.vn
   - Giờ mở cửa: Thứ 2 - Thứ 6: 7:00 - 22:00, Thứ 7 - Chủ nhật: 8:00 - 23:00

4. **Dịch vụ giao hàng:**
   - Chỉ giao hàng trong quận Ninh Kiều, Cần Thơ (không giới hạn bán kính, chỉ cần thuộc quận Ninh Kiều)
   - Phí giao hàng: 8,000đ (cố định)
   - Thời gian giao hàng: 30-60 phút (tùy khoảng cách)

5. **Đặt bàn:**
   - Khách hàng có thể đặt bàn trước qua website hoặc gọi điện
   - Cần thông tin: Tên, SĐT, Số người, Thời gian, Khu vực mong muốn
   - Đặt bàn miễn phí, có thể đặt cọc để giữ chỗ

6. **Phương thức thanh toán:**
   - Tiền mặt (khi nhận hàng hoặc tại quán)
   - Thanh toán online (PayOS/VietQR) - cho đơn hàng online
   - Thẻ tín dụng/ghi nợ (nếu có)

7. **Khuyến mãi:**
   - Áp dụng mã khuyến mãi khi thanh toán
   - Một số mã có thể cộng dồn, một số không
   - Có thể có điều kiện đơn hàng tối thiểu

8. **Món bán chạy (Best Seller):**
   - Khi khách hỏi về món ngon, món bán chạy, hoặc món nên thử, hãy giới thiệu các món trong danh sách best seller
   - Giải thích tại sao các món này được nhiều người yêu thích
   - Khuyến khích khách thử các món best seller

**Menu hiện tại:**
${context.menu}

**Danh mục:**
${context.categories}

**Khuyến mãi đang diễn ra:**
${context.promotions}

**Top món bán chạy (30 ngày gần nhất):**
${context.bestSellers}
${context.customer}

**Quy tắc:**
- Luôn trả lời bằng tiếng Việt, thân thiện và chuyên nghiệp
- Nếu không biết câu trả lời chính xác, hãy đề nghị khách hàng liên hệ trực tiếp qua điện thoại
- Khuyến khích khách hàng đặt hàng hoặc đặt bàn
- Giữ câu trả lời ngắn gọn, dễ hiểu (tối đa 3-4 câu)
- Khi khách hỏi về khuyến mãi, hãy liệt kê các mã đang có và cách sử dụng
- Khi khách hỏi về đặt bàn, hãy hướng dẫn các bước đặt bàn
- Khi khách hỏi về món ngon, món bán chạy, hoặc món nên thử, hãy giới thiệu các món best seller từ danh sách trên`;
  },

  /**
   * Get conversation history for context
   */
  async getConversationHistory(conversationId, limit = 5) {
    const messages = await chatbotRepository.getRecentMessages(conversationId, limit);
    return messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));
  },

  /**
   * Send message and get AI response
   * customerAccountId can be null for guest users
   */
  async chat({ customerAccountId, message }) {
    try {
      // 1. Get or create conversation (handles null customerAccountId for guests)
      const conversation = await this.getOrCreateConversation(customerAccountId || null);

      // 2. Save user message
      await chatbotRepository.createMessage({
        conversationId: conversation.id,
        role: 'user',
        content: message
      });

      // 3. Build context
      const context = await this.buildContext(customerAccountId);
      const systemPrompt = await this.buildSystemPrompt(context);

      // 4. Get conversation history (last 5 messages for context)
      const history = await this.getConversationHistory(conversation.id, 5);

      // 5. Call Gemini API
      if (!genAI) {
        throw new Error('Gemini API not initialized. Check GEMINI_API_KEY in .env');
      }

      console.log('🤖 Calling Gemini API...');
      console.log('📝 Message:', message.substring(0, 50) + '...');
      
      // Use generateContent for simpler API call
      const prompt = `${systemPrompt}\n\nUser: ${message}\nAssistant:`;
      
      console.log('📤 Sending to Gemini...');
      
      // Try with different model names if first fails
      // Based on available models from API: gemini-2.5-flash, gemini-2.0-flash, gemini-flash-latest, etc.
      let result;
      let response;
      const modelNames = [
        'gemini-2.5-flash',      // Latest stable flash model
        'gemini-2.0-flash',      // Stable flash model
        'gemini-flash-latest',   // Latest flash (auto-updates)
        'gemini-2.5-pro',        // Pro model
        'gemini-pro-latest'      // Latest pro (auto-updates)
      ];
      let lastError;
      
      for (const modelName of modelNames) {
        try {
          console.log(`🔄 Trying model: ${modelName}...`);
          const testModel = genAI.getGenerativeModel({ model: modelName });
          result = await testModel.generateContent(prompt);
          response = result.response.text();
          console.log(`✅ Success with model: ${modelName}`);
          console.log('✅ Gemini response received:', response.substring(0, 100) + '...');
          break;
        } catch (modelError) {
          console.log(`❌ Model ${modelName} failed:`, modelError.message);
          lastError = modelError;
          if (modelName === modelNames[modelNames.length - 1]) {
            // Last model failed, throw error
            throw lastError;
          }
          // Try next model
          continue;
        }
      }
      
      if (!response) {
        throw lastError || new Error('All models failed');
      }

      // 6. Save bot response
      await chatbotRepository.createMessage({
        conversationId: conversation.id,
        role: 'bot',
        content: response
      });

      return {
        conversationId: conversation.id,
        message: response
      };
    } catch (error) {
      console.error('❌ Chatbot error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      // Kiểm tra lỗi cụ thể và trả lời thông minh hơn
      // Xử lý NHIỀU yêu cầu trong 1 câu hỏi
      const userMessage = message?.toLowerCase() || '';
      const responseParts = [];
      
      // Kiểm tra từng loại yêu cầu
      const wantsBestSellers = userMessage.includes('bán chạy') || userMessage.includes('best') || 
                               userMessage.includes('top') || userMessage.includes('ngon nhất');
      const wantsAddress = userMessage.includes('địa chỉ') || userMessage.includes('ở đâu') || 
                          userMessage.includes('thông tin') || userMessage.includes('quán');
      const wantsMenu = userMessage.includes('menu') || userMessage.includes('thực đơn') || 
                       (userMessage.includes('món') && !wantsBestSellers);
      const wantsDelivery = userMessage.includes('giao hàng') || userMessage.includes('delivery') || 
                           userMessage.includes('ship');
      const wantsPromo = userMessage.includes('khuyến mãi') || userMessage.includes('giảm giá') || 
                        userMessage.includes('mã');
      const wantsBooking = userMessage.includes('đặt bàn') || userMessage.includes('book');
      
      // Top món bán chạy
      if (wantsBestSellers) {
        try {
          const bestSellers = await analyticsService.getTopMenuItems(30, 5);
          if (bestSellers && bestSellers.length > 0) {
            const items = bestSellers.map((item, i) => `${i+1}. **${item.name}** - Đã bán ${item.quantity_sold} phần`).join('\n');
            responseParts.push(`🏆 **Top 5 món bán chạy nhất:**\n\n${items}\n\n_Đây là các món được khách hàng yêu thích nhất trong 30 ngày qua!_`);
          } else {
            responseParts.push(`🏆 **Các món được yêu thích:**\n\n1. Cà phê sữa đá\n2. Bạc xỉu\n3. Trà đào cam sả\n4. Cappuccino\n5. Trà sữa trân châu`);
          }
        } catch {
          responseParts.push(`🏆 **Các món được yêu thích:**\n\n1. Cà phê sữa đá\n2. Bạc xỉu\n3. Trà đào cam sả\n4. Cappuccino\n5. Trà sữa trân châu`);
        }
      }
      
      // Thông tin quán & địa chỉ
      if (wantsAddress) {
        responseParts.push(`📍 **Thông tin quán DevCoffee:**

🏠 **Địa chỉ:** 123 Đường 3/2, Phường Xuân Khánh, Quận Ninh Kiều, TP. Cần Thơ
📞 **Hotline:** 0292 388 888
📧 **Email:** info@coffeeshop-demo.vn
🌐 **Website:** coffeeshop-demo.vn

⏰ **Giờ mở cửa:**
• Thứ 2 - Thứ 6: 7:00 - 22:00
• Thứ 7 - Chủ nhật: 8:00 - 23:00

🅿️ **Tiện ích:** Wifi miễn phí, Chỗ đậu xe rộng rãi, Máy lạnh`);
      }
      
      // Menu
      if (wantsMenu) {
        responseParts.push(`📋 **Thực đơn DevCoffee:**

☕ **Cà phê:**
• Cà phê đen: 15,000đ - 25,000đ
• Cà phê sữa: 20,000đ - 30,000đ
• Bạc xỉu: 25,000đ - 35,000đ
• Cappuccino: 35,000đ - 45,000đ
• Latte: 35,000đ - 45,000đ

🍵 **Trà & Đồ uống khác:**
• Trà đào cam sả: 25,000đ - 35,000đ
• Trà sữa trân châu: 30,000đ - 40,000đ
• Sinh tố các loại: 30,000đ - 45,000đ

👉 Xem đầy đủ tại mục "Thực đơn" trên website!`);
      }
      
      // Giao hàng
      if (wantsDelivery) {
        responseParts.push(`🚚 **Dịch vụ giao hàng:**

📍 **Phạm vi:** Quận Ninh Kiều, TP. Cần Thơ
💰 **Phí giao hàng:** 8,000đ (cố định)
⏱️ **Thời gian giao:** 30-60 phút tùy khoảng cách
💳 **Thanh toán:** Tiền mặt khi nhận hàng hoặc chuyển khoản

👉 Đặt hàng ngay trên website hoặc gọi 0292 388 888!`);
      }
      
      // Khuyến mãi
      if (wantsPromo) {
        try {
          const promos = await promotionRepository.getAll({ status: 'active' });
          if (promos && promos.length > 0) {
            const promoList = promos.slice(0, 3).map(p => `• Mã **${p.ma}**: ${p.mo_ta || p.ten}`).join('\n');
            responseParts.push(`🎉 **Khuyến mãi đang có:**\n\n${promoList}\n\n_Nhập mã khi thanh toán để được giảm giá!_`);
          } else {
            responseParts.push(`🎉 Hiện tại chưa có khuyến mãi. Hãy theo dõi để không bỏ lỡ nhé!`);
          }
        } catch {
          responseParts.push(`🎉 Vui lòng liên hệ quán để biết thêm về các chương trình khuyến mãi!`);
        }
      }
      
      // Đặt bàn
      if (wantsBooking) {
        responseParts.push(`🪑 **Đặt bàn:**

Bạn có thể đặt bàn qua:
1. 🌐 Website: Mục "Đặt bàn"
2. 📞 Hotline: 0292 388 888

📝 **Thông tin cần có:** Họ tên, SĐT, Số người, Ngày giờ, Khu vực mong muốn
🎉 **Đặt bàn hoàn toàn miễn phí!**`);
      }
      
      // Nếu không match gì cả, trả lời chung
      let fallbackResponse;
      if (responseParts.length === 0) {
        fallbackResponse = `Xin chào! 👋 Tôi là trợ lý AI của **DevCoffee**.

Tôi có thể giúp bạn:
• 🏆 Top món bán chạy nhất
• 📋 Xem menu và giá cả
• 📍 Địa chỉ và thông tin quán
• 🚚 Dịch vụ giao hàng
• 🎉 Khuyến mãi hiện có
• 🪑 Đặt bàn trước

Hãy hỏi tôi nhé! Ví dụ: "Cho tôi xem top 5 món bán chạy và địa chỉ quán"

📞 Hoặc gọi ngay: **0292 388 888**`;
      } else {
        // Ghép các phần lại với nhau
        fallbackResponse = responseParts.join('\n\n---\n\n');
        
        // Thêm lời kết nếu có nhiều hơn 1 phần
        if (responseParts.length > 1) {
          fallbackResponse += `\n\n---\n\n💬 _Còn thắc mắc gì khác? Hãy hỏi tôi hoặc gọi_ 📞 **0292 388 888**`;
        } else {
          fallbackResponse += `\n\n👉 Hãy thử ngay nhé! Hoặc hỏi tôi thêm về menu, khuyến mãi, giao hàng...`;
        }
      }
      
      // Try to get conversation and save fallback
      try {
        const conversation = await this.getOrCreateConversation(customerAccountId || null);
        await chatbotRepository.createMessage({
          conversationId: conversation.id,
          role: 'bot',
          content: fallbackResponse
        });

        // Return fallback response instead of throwing
        return {
          conversationId: conversation.id,
          message: fallbackResponse
        };
      } catch (saveError) {
        console.error('❌ Error saving fallback:', saveError);
        // If we can't save, still return fallback response
        return {
          conversationId: null,
          message: fallbackResponse
        };
      }
    }
  },

  /**
   * Get conversation messages
   */
  async getMessages(conversationId) {
    return await chatbotRepository.getMessagesByConversation(conversationId);
  },

  /**
   * Get customer conversations
   */
  async getConversations(customerAccountId) {
    return await chatbotRepository.getConversationsByCustomer(customerAccountId);
  }
};

