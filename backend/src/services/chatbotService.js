// Chatbot Service - Business logic with Gemini AI integration
import { GoogleGenerativeAI } from '@google/generative-ai';
import chatbotRepository from '../repositories/chatbotRepository.js';
import customerRepository from '../repositories/customerRepository.js';
import promotionRepository from '../repositories/promotionRepository.js';
import analyticsService from './analyticsService.js';
import { pool } from '../db.js';

// Helper function to get Gemini API key from system_settings or env
async function getGeminiApiKey() {
  try {
    // Try to get from system_settings first
    const { rows } = await pool.query(`
      SELECT value FROM system_settings WHERE key = 'gemini_api_key'
    `);
    
    if (rows.length > 0 && rows[0].value && rows[0].value.trim() !== '') {
      return rows[0].value.trim();
    }
  } catch (error) {
    console.warn('⚠️ Could not get Gemini API key from system_settings:', error.message);
  }
  
  // Fallback to environment variable
  return process.env.GEMINI_API_KEY || null;
}

// Initialize Gemini (will be initialized lazily when needed)
let genAI = null;
let geminiApiKey = null;

async function initializeGemini() {
  if (genAI) return genAI; // Already initialized
  
  geminiApiKey = await getGeminiApiKey();
  
  if (!geminiApiKey) {
    console.error('❌ GEMINI_API_KEY not found in system_settings or environment variables!');
    return null;
  }
  
  genAI = new GoogleGenerativeAI(geminiApiKey);
  return genAI;
}

// Helper function to get model with fallback
async function getModel() {
  const ai = await initializeGemini();
  if (!ai) return null;
  
  // Try different model names (some API keys may have access to different models)
  const modelNames = [
    'gemini-1.5-flash-latest',  // Latest flash model
    'gemini-1.5-flash',         // Flash model
    'gemini-1.5-pro-latest',    // Latest pro model
    'gemini-pro'                // Legacy model
  ];
  
  // Try first model (most common)
  return ai.getGenerativeModel({ model: modelNames[0] });
}

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
    return `Bạn là trợ lý AI thân thiện, vui vẻ và rất linh hoạt của quán cà phê DevCoffee. 

## PHONG CÁCH GIAO TIẾP:
- Thân thiện, gần gũi như một người bạn
- Sử dụng emoji phù hợp để tạo cảm giác thân thiện
- Trả lời tự nhiên, không quá máy móc
- Hiểu được nhiều cách hỏi khác nhau của khách hàng
- Có thể trả lời nhiều câu hỏi trong một lượt

## KHẢ NĂNG HIỂU NGÔN NGỮ:
- Hiểu tiếng Việt không dấu: "cafe sua" = "cà phê sữa"
- Hiểu viết tắt: "cf" = "cà phê", "kmai" = "khuyến mãi", "gg" = "giao hàng"
- Hiểu từ đồng nghĩa: "ship" = "giao hàng", "book" = "đặt bàn"
- Hiểu câu hỏi không hoàn chỉnh: "giá?" = "giá món này bao nhiêu?"
- Hiểu ngữ cảnh từ các tin nhắn trước

## THÔNG TIN QUÁN:
- 🏠 Địa chỉ: 123 Đường 3/2, Phường Xuân Khánh, Ninh Kiều, Cần Thơ
- 📞 Hotline: 0292 388 888
- 📧 Email: info@coffeeshop-demo.vn
- ⏰ Giờ mở cửa: T2-T6: 7:00-22:00 | T7-CN: 8:00-23:00

## DỊCH VỤ:
1. **Giao hàng:** 
   - Chỉ giao trong Quận Ninh Kiều, Cần Thơ
   - Phí ship: 8,000đ (cố định)
   - Thời gian: 30-60 phút

2. **Đặt bàn:**
   - Đặt qua website hoặc gọi điện
   - Miễn phí, không cần cọc
   - Cần: Tên, SĐT, số người, thời gian

3. **Thanh toán:** Tiền mặt, chuyển khoản, PayOS/VietQR

## MENU (giá tham khảo):
${context.menu}

## DANH MỤC:
${context.categories}

## KHUYẾN MÃI ĐANG CÓ:
${context.promotions}

## TOP MÓN BÁN CHẠY (30 ngày):
${context.bestSellers}
${context.customer}

## HƯỚNG DẪN TRẢ LỜI:
1. Khi khách hỏi về tài khoản, điểm thưởng, lịch sử đơn → Hướng dẫn vào mục "Tài khoản" trên website
2. Khi khách hỏi món ngon/best seller → Giới thiệu top món bán chạy với lý do tại sao ngon
3. Khi khách hỏi giá → Cho biết khoảng giá và gợi ý size phù hợp
4. Khi khách hỏi nhiều thứ → Trả lời đầy đủ từng phần, gọn gàng
5. Khi không chắc → Đề nghị liên hệ hotline hoặc hỏi lại cho rõ
6. Luôn kết thúc bằng câu hỏi hoặc gợi ý hành động tiếp theo

## QUY TẮC:
- Trả lời bằng tiếng Việt, thân thiện
- Ngắn gọn nhưng đầy đủ thông tin (3-5 câu)
- Sử dụng markdown: **in đậm**, *nghiêng*, danh sách
- Đừng lặp lại y nguyên thông tin, hãy diễn đạt tự nhiên`;
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
      const ai = await initializeGemini();
      if (!ai) {
        throw new Error('Gemini API not initialized. Check GEMINI_API_KEY in system_settings or .env');
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
          const testModel = ai.getGenerativeModel({ model: modelName });
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
      
      // Smart fallback - xử lý nhiều trường hợp linh hoạt
      const userMessage = (message || '').toLowerCase()
        .replace(/[áàảãạăắằẳẵặâấầẩẫậ]/g, 'a')
        .replace(/[éèẻẽẹêếềểễệ]/g, 'e')
        .replace(/[íìỉĩị]/g, 'i')
        .replace(/[óòỏõọôốồổỗộơớờởỡợ]/g, 'o')
        .replace(/[úùủũụưứừửữự]/g, 'u')
        .replace(/[ýỳỷỹỵ]/g, 'y')
        .replace(/đ/g, 'd');
      
      const responseParts = [];
      
      // Pattern matching linh hoạt - EXPANDED với nhiều ngữ cảnh hơn
      const patterns = {
        // === MENU & ĐỒ UỐNG ===
        bestSellers: /ban chay|best|top|ngon|nen thu|hay uong|pho bien|nhieu nguoi|yeu thich|recommend|de xuat|gioi thieu|thu gi|uong gi|dat nhieu|hot|trend/,
        menu: /menu|thuc don|mon|nuoc|gia|bao nhieu|order|xem mon|co mon|co gi|ban gi|phuc vu|danh sach/,
        coffee: /ca phe|cafe|cf|coffee|espresso|americano|latte|cappuccino|mocha|macchiato|den|sua da|bac xiu|nau|phin/,
        tea: /tra|tea|tra dao|tra sua|tra xanh|tra oolong|tra sen|matcha|hong tra|tra chanh|tra tac/,
        milk: /sua|milk|sua tuoi|sua chua|yogurt|sua dau|sua hat/,
        juice: /nuoc ep|juice|sinh to|smoothie|da xay|frappe|nuoc cam|nuoc tao|nuoc dua/,
        food: /banh|cake|cookie|snack|do an|thuc an|an gi|banh mi|sandwich|croissant|tiramisu|cheesecake/,
        size: /size|kich thuoc|lon|nho|vua|s|m|l|upsize|them|it da|nhieu da|it duong|nhieu duong/,
        topping: /topping|tran chau|thach|kem|whipping|foam|shot|extra|them|bo sung/,
        sweet: /ngot|duong|it ngot|nhieu ngot|khong duong|sugar free|diet|healthy/,
        ice: /da|ice|nong|hot|lanh|cold|am|warm|it da|nhieu da|khong da/,
        
        // === DỊCH VỤ ===
        delivery: /giao hang|delivery|ship|mang di|takeaway|dat mang|giao|phi ship|ship fee|giao tan noi|order online|dat online/,
        dineIn: /tai quan|ngoi quan|dine in|an tai|uong tai|ngoi|cho ngoi|ban trong/,
        booking: /dat ban|book|giu cho|table|ban trong|dat cho|reservation|hen/,
        pickup: /tu den lay|pick up|lay tai|den lay|tu lay/,
        
        // === GIÁ CẢ & THANH TOÁN ===
        price: /gia|bao nhieu|tien|cost|price|phi|re|dat|mac|binh dan/,
        payment: /thanh toan|tra tien|pay|chuyen khoan|tien mat|cash|payos|qr|the|card|vi dien tu|momo|zalopay|banking/,
        promo: /khuyen mai|giam gia|ma|voucher|discount|code|promo|uu dai|sale|free|mien phi|tang|gift/,
        
        // === THÔNG TIN QUÁN ===
        address: /dia chi|o dau|cho nao|quan o|den quan|tim quan|location|address|duong|nha|so|phuong|quan|thanh pho|can tho|ninh kieu/,
        hours: /gio|mo cua|dong cua|hoat dong|lam viec|open|close|may gio|den may gio|tu may gio|sang|chieu|toi|khuya/,
        contact: /lien he|goi|call|phone|dien thoai|hotline|zalo|contact|email|facebook|fanpage|instagram/,
        parking: /dau xe|parking|gui xe|cho xe|de xe|oto|xe may|xe dap/,
        wifi: /wifi|internet|mat khau|password|mang|ket noi/,
        facilities: /may lanh|dieu hoa|toilet|wc|nha ve sinh|o cam|sac|charge|tien ich/,
        
        // === TÀI KHOẢN & KHÁCH HÀNG ===
        account: /tai khoan|account|dang nhap|login|dang ky|register|sign up|mat khau|password|quen mat khau/,
        profile: /thong tin|profile|ca nhan|ho ten|sdt|so dien thoai|email|doi thong tin|cap nhat/,
        history: /lich su|history|don hang|da dat|da mua|don cu|xem lai/,
        points: /diem|thuong|tich diem|reward|loyalty|member|thanh vien|vip|uu dai thanh vien/,
        
        // === HỖ TRỢ & PHẢN HỒI ===
        help: /giup|help|ho tro|support|can gi|lam gi|huong dan|chi|cach|the nao|sao|nhu nao/,
        complaint: /khieu nai|complain|phan nan|gop y|feedback|danh gia|review|hai long|khong hai long|te|do|chan|buc/,
        refund: /hoan tien|refund|tra lai|doi tra|huy don|cancel|khong muon|bo|thoi/,
        
        // === GIAO TIẾP XÃ HỘI ===
        greeting: /xin chao|chao|hello|hi|hey|alo|chao ban|chao buoi|good morning|good afternoon|good evening/,
        thanks: /cam on|thank|thanks|biet on|appreciate/,
        bye: /tam biet|bye|goodbye|hen gap|see you|gap lai|di nhe|thoi nhe/,
        sorry: /xin loi|sorry|loi|that loi|pardon/,
        
        // === CÂU HỎI CHUNG ===
        who: /ban la ai|la gi|chatbot|ai|robot|may|bot|tro ly/,
        weather: /thoi tiet|weather|troi|mua|nang|lanh|nong/,
        joke: /cuoi|vui|joke|funny|hai|tieu lam|dua/,
        random: /bat ky|ngau nhien|random|gi cung duoc|tuy|chon ho|de xuat/
      };
      
      // === XỬ LÝ TỪNG PATTERN ===
      
      // Chào hỏi
      if (patterns.greeting.test(userMessage)) {
        const greetings = [
          `Xin chào bạn! 👋 Rất vui được gặp bạn tại **DevCoffee**! Hôm nay bạn muốn thưởng thức gì nào? ☕`,
          `Hello! 🌟 Chào mừng đến với DevCoffee! Tôi có thể giúp gì cho bạn?`,
          `Chào bạn! ☕ DevCoffee xin phục vụ! Bạn muốn xem menu hay đặt hàng ngay?`
        ];
        responseParts.push(greetings[Math.floor(Math.random() * greetings.length)]);
      }
      
      // Cảm ơn
      if (patterns.thanks.test(userMessage)) {
        const thanks = [
          `Không có gì ạ! 😊 Cảm ơn bạn đã ghé thăm DevCoffee. Chúc bạn có trải nghiệm tuyệt vời! 🌟`,
          `Dạ không có chi! 💕 Rất vui được phục vụ bạn! Hẹn gặp lại nhé!`,
          `Cảm ơn bạn đã tin tưởng DevCoffee! ☕ Chúc bạn ngày mới tốt lành!`
        ];
        responseParts.push(thanks[Math.floor(Math.random() * thanks.length)]);
      }
      
      // Tạm biệt
      if (patterns.bye.test(userMessage)) {
        responseParts.push(`Tạm biệt bạn! 👋 Hẹn gặp lại tại DevCoffee nhé! Chúc bạn một ngày tuyệt vời! 🌟☕`);
      }
      
      // Bot là ai
      if (patterns.who.test(userMessage)) {
        responseParts.push(`🤖 Tôi là **trợ lý AI** của DevCoffee!

Tôi có thể giúp bạn:
• Xem menu và giá cả
• Gợi ý món ngon
• Thông tin đặt hàng, giao hàng
• Đặt bàn trước
• Khuyến mãi và ưu đãi
• Thông tin quán

Hỏi tôi bất cứ điều gì về DevCoffee nhé! 😊`);
      }
      
      // Tài khoản
      if (patterns.account.test(userMessage) || patterns.profile.test(userMessage)) {
        responseParts.push(`👤 **Về tài khoản của bạn:**

**Đăng nhập/Đăng ký:**
• Nhấn vào icon 👤 góc trên bên phải
• Chọn "Đăng nhập" hoặc "Đăng ký"
• Có thể đăng nhập bằng SĐT + mật khẩu

**Xem thông tin tài khoản:**
• Nhấn vào tên của bạn → "Tài khoản"
• Xem: Thông tin cá nhân, Lịch sử đơn, Đặt bàn, Điểm thưởng

💡 Đăng nhập để theo dõi đơn hàng và tích điểm nhé!`);
      }
      
      // Lịch sử đơn hàng
      if (patterns.history.test(userMessage)) {
        responseParts.push(`📋 **Xem lịch sử đơn hàng:**

1. Đăng nhập vào tài khoản
2. Nhấn vào tên bạn → **"Đơn hàng"**
3. Xem tất cả đơn đã đặt

Bạn có thể:
• Xem chi tiết từng đơn
• Theo dõi trạng thái giao hàng
• Đặt lại đơn cũ

📞 Cần hỗ trợ? Gọi **0292 388 888**`);
      }
      
      // Điểm thưởng
      if (patterns.points.test(userMessage)) {
        responseParts.push(`🎁 **Chương trình tích điểm:**

• Mỗi 10,000đ = 1 điểm
• Điểm có thể đổi ưu đãi
• Xem điểm trong mục "Tài khoản"

💡 Đăng nhập khi đặt hàng để tích điểm tự động!`);
      }

      // Top món bán chạy
      if (patterns.bestSellers.test(userMessage)) {
        try {
          const bestSellers = await analyticsService.getTopMenuItems(30, 5);
          if (bestSellers && bestSellers.length > 0) {
            const items = bestSellers.map((item, i) => {
              const emoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '⭐';
              return `${emoji} **${item.name}** - ${item.quantity_sold} phần`;
            }).join('\n');
            responseParts.push(`🏆 **Top món được yêu thích nhất:**\n\n${items}\n\n_Đây là những món "must-try" khi đến DevCoffee!_ 😋`);
          } else {
            responseParts.push(`🏆 **Món được yêu thích:**\n\n🥇 Cà phê sữa đá - Đậm đà, thơm ngon\n🥈 Bạc xỉu - Béo ngậy, ngọt dịu\n🥉 Trà đào cam sả - Thanh mát, sảng khoái\n⭐ Cappuccino - Chuẩn vị Ý\n⭐ Trà sữa trân châu - Thơm ngon, dai dai\n\n_Bạn muốn thử món nào?_ 😋`);
          }
        } catch {
          responseParts.push(`🏆 **Món được yêu thích:**\n\n🥇 Cà phê sữa đá\n🥈 Bạc xỉu\n🥉 Trà đào cam sả\n⭐ Cappuccino\n⭐ Trà sữa trân châu`);
        }
      }
      
      // Cà phê
      if (patterns.coffee.test(userMessage) && !patterns.bestSellers.test(userMessage)) {
        responseParts.push(`☕ **Menu Cà phê DevCoffee:**

**Cà phê Việt Nam:**
• Cà phê đen đá: 15k - 20k
• Cà phê sữa đá: 20k - 25k
• Bạc xỉu: 25k - 30k
• Cà phê phin: 25k - 35k

**Cà phê Ý:**
• Espresso: 25k - 30k
• Americano: 30k - 35k
• Cappuccino: 35k - 45k
• Latte: 35k - 45k
• Mocha: 40k - 50k

💡 Có thể chọn size S/M/L và điều chỉnh đường, đá!`);
      }
      
      // Trà
      if (patterns.tea.test(userMessage) && !patterns.bestSellers.test(userMessage)) {
        responseParts.push(`🍵 **Menu Trà DevCoffee:**

**Trà trái cây:**
• Trà đào cam sả: 25k - 35k
• Trà chanh leo: 25k - 30k
• Trà vải: 28k - 35k
• Trà tắc: 20k - 25k

**Trà sữa:**
• Trà sữa trân châu: 30k - 40k
• Trà sữa matcha: 35k - 45k
• Hồng trà sữa: 30k - 38k
• Oolong sữa: 32k - 40k

🧋 Thêm topping: trân châu, thạch, pudding...`);
      }
      
      // Nước ép / Sinh tố
      if (patterns.juice.test(userMessage)) {
        responseParts.push(`🥤 **Nước ép & Sinh tố:**

**Nước ép tươi:**
• Cam: 25k - 30k
• Táo: 28k - 35k
• Dưa hấu: 22k - 28k
• Ổi: 25k - 30k

**Sinh tố:**
• Sinh tố bơ: 35k - 45k
• Sinh tố xoài: 30k - 40k
• Sinh tố dâu: 32k - 42k

**Đá xay:**
• Đá xay chocolate: 35k - 45k
• Đá xay cookies: 38k - 48k

🍓 100% nguyên liệu tươi mỗi ngày!`);
      }
      
      // Bánh & Đồ ăn
      if (patterns.food.test(userMessage)) {
        responseParts.push(`🍰 **Bánh & Đồ ăn nhẹ:**

**Bánh ngọt:**
• Tiramisu: 35k - 45k
• Cheesecake: 40k - 50k
• Bánh flan: 20k - 25k
• Croissant: 25k - 35k

**Bánh mặn:**
• Bánh mì que: 15k - 20k
• Sandwich: 30k - 40k
• Bánh mì thịt: 25k - 35k

🥐 Làm tươi mỗi ngày, kết hợp hoàn hảo với cà phê!`);
      }
      
      // Size
      if (patterns.size.test(userMessage)) {
        responseParts.push(`📏 **Các size đồ uống:**

• **Size S** (Nhỏ): Giá gốc
• **Size M** (Vừa): +5k - 8k
• **Size L** (Lớn): +10k - 15k

**Tùy chỉnh thêm:**
• Ít đá / Nhiều đá: Miễn phí
• Ít đường / Nhiều đường: Miễn phí
• Upsize: +5k - 15k

💡 Chọn size phù hợp khi đặt hàng nhé!`);
      }
      
      // Topping
      if (patterns.topping.test(userMessage)) {
        responseParts.push(`🧋 **Topping thêm:**

• Trân châu đen: +8k
• Trân châu trắng: +8k
• Thạch dừa: +5k
• Thạch trái cây: +8k
• Pudding: +10k
• Kem cheese: +12k
• Whipping cream: +10k
• Extra shot espresso: +15k

👉 Thêm topping khi đặt hàng để ngon hơn!`);
      }
      
      // Độ ngọt
      if (patterns.sweet.test(userMessage)) {
        responseParts.push(`🍬 **Tùy chỉnh độ ngọt:**

• **100%** - Ngọt chuẩn
• **70%** - Ít ngọt
• **50%** - Ngọt vừa
• **30%** - Rất ít ngọt
• **0%** - Không đường

💡 Ghi chú độ ngọt khi đặt hàng nhé!`);
      }
      
      // Đá
      if (patterns.ice.test(userMessage) && !patterns.price.test(userMessage)) {
        responseParts.push(`🧊 **Tùy chỉnh đá:**

**Đồ uống lạnh:**
• Đá bình thường
• Ít đá
• Nhiều đá
• Không đá (để riêng)

**Đồ uống nóng:**
• Nóng chuẩn
• Ấm

💡 Chọn theo sở thích khi đặt hàng!`);
      }
      
      // Địa chỉ & Thông tin quán
      if (patterns.address.test(userMessage) || patterns.hours.test(userMessage) || patterns.contact.test(userMessage)) {
        responseParts.push(`📍 **DevCoffee - Thông tin liên hệ:**

🏠 **Địa chỉ:** 123 Đường 3/2, P. Xuân Khánh, Q. Ninh Kiều, TP. Cần Thơ

⏰ **Giờ mở cửa:**
• T2 - T6: 7:00 - 22:00
• T7 - CN: 8:00 - 23:00

📞 **Hotline:** 0292 388 888
📧 **Email:** info@coffeeshop-demo.vn
🌐 **Website:** coffeeshop-demo.vn

🅿️ Có chỗ đậu xe rộng rãi, wifi miễn phí!`);
      }
      
      // Đậu xe
      if (patterns.parking.test(userMessage)) {
        responseParts.push(`🅿️ **Đậu xe tại DevCoffee:**

• **Xe máy:** Miễn phí, có bãi riêng
• **Ô tô:** Có chỗ đậu, miễn phí
• Bảo vệ trông xe 24/7

📍 Bãi xe ngay trước quán, rất tiện lợi!`);
      }
      
      // Wifi
      if (patterns.wifi.test(userMessage)) {
        responseParts.push(`📶 **Wifi tại DevCoffee:**

• **Wifi miễn phí** cho khách hàng
• Tốc độ cao, ổn định
• Hỏi mật khẩu tại quầy hoặc xem trên bàn

💻 Không gian yên tĩnh, phù hợp làm việc!`);
      }
      
      // Tiện ích
      if (patterns.facilities.test(userMessage)) {
        responseParts.push(`🏪 **Tiện ích tại DevCoffee:**

• ❄️ Máy lạnh mát mẻ
• 📶 Wifi miễn phí tốc độ cao
• 🔌 Ổ cắm sạc điện thoại/laptop
• 🚻 Nhà vệ sinh sạch sẽ
• 🅿️ Bãi đậu xe rộng
• 🪑 Không gian thoải mái

💼 Phù hợp làm việc, học tập, họp nhóm!`);
      }
      
      // Menu chung
      if (patterns.menu.test(userMessage) && !patterns.bestSellers.test(userMessage) && !patterns.coffee.test(userMessage) && !patterns.tea.test(userMessage)) {
        responseParts.push(`📋 **Menu DevCoffee:**

☕ **Cà phê:** 15k - 50k
🍵 **Trà:** 20k - 45k
🧋 **Trà sữa:** 30k - 45k
🥤 **Nước ép & Sinh tố:** 22k - 45k
🍰 **Bánh ngọt:** 20k - 50k

👉 Xem chi tiết tại mục **"Thực đơn"** trên website!
💡 Hỏi tôi về món cụ thể để biết thêm nhé!`);
      }
      
      // Giao hàng
      if (patterns.delivery.test(userMessage)) {
        responseParts.push(`🚚 **Dịch vụ giao hàng:**

📍 **Khu vực:** Quận Ninh Kiều, Cần Thơ
💰 **Phí ship:** 8,000đ (cố định)
⏱️ **Thời gian:** 30-60 phút

**Cách đặt:**
1. Thêm món vào giỏ hàng
2. Chọn "Giao hàng"
3. Nhập địa chỉ
4. Chọn thanh toán & Đặt

_Hoặc gọi_ 📞 **0292 388 888**`);
      }
      
      // Tại quán
      if (patterns.dineIn.test(userMessage) && !patterns.booking.test(userMessage)) {
        responseParts.push(`🪑 **Uống tại quán:**

• Không gian rộng rãi, thoáng mát
• Nhiều góc đẹp check-in
• Wifi miễn phí, có ổ cắm sạc
• Phục vụ tận bàn

**Quy trình:**
1. Chọn bàn hoặc nhờ nhân viên
2. Gọi món tại bàn/quầy
3. Thanh toán khi về

💡 Đặt bàn trước nếu đi đông nhé!`);
      }
      
      // Tự đến lấy
      if (patterns.pickup.test(userMessage)) {
        responseParts.push(`🏃 **Tự đến lấy (Pickup):**

1. Đặt hàng trên website
2. Chọn "Mang đi" (Takeaway)
3. Đến quán lấy khi sẵn sàng

⏱️ **Thời gian:** 10-15 phút sau đặt
📍 **Địa chỉ:** 123 Đường 3/2, Ninh Kiều, Cần Thơ

💡 Tiết kiệm phí ship, nhanh gọn!`);
      }
      
      // Thanh toán
      if (patterns.payment.test(userMessage)) {
        responseParts.push(`💳 **Phương thức thanh toán:**

**Tại quán:**
• 💵 Tiền mặt
• 📱 Chuyển khoản / QR

**Đặt online:**
• 💵 Tiền mặt khi nhận (COD)
• 📱 PayOS / VietQR
• 💳 Chuyển khoản

**Thông tin chuyển khoản:**
• Ngân hàng: [Xem khi thanh toán]
• Nội dung: [Mã đơn hàng]

✅ An toàn, tiện lợi!`);
      }
      
      // Giá
      if (patterns.price.test(userMessage) && !patterns.delivery.test(userMessage)) {
        responseParts.push(`💰 **Giá cả tại DevCoffee:**

• Cà phê: 15k - 50k
• Trà: 20k - 45k
• Sinh tố: 25k - 45k
• Bánh: 20k - 50k

💡 Giá hợp lý, chất lượng đảm bảo!
👉 Xem chi tiết từng món trong **"Thực đơn"**`);
      }
      
      // Khuyến mãi
      if (patterns.promo.test(userMessage)) {
        try {
          const promos = await promotionRepository.getAll({ status: 'active' });
          if (promos && promos.length > 0) {
            const promoList = promos.slice(0, 5).map(p => {
              let desc = `• **${p.ma}**`;
              if (p.loai === 'PERCENT') desc += ` - Giảm ${p.gia_tri}%`;
              else if (p.loai === 'FIXED') desc += ` - Giảm ${p.gia_tri.toLocaleString()}đ`;
              if (p.mo_ta) desc += ` (${p.mo_ta})`;
              return desc;
            }).join('\n');
            responseParts.push(`🎉 **Khuyến mãi đang có:**\n\n${promoList}\n\n💡 Nhập mã khi thanh toán để được giảm giá!`);
          } else {
            responseParts.push(`🎉 Hiện tại chưa có khuyến mãi. Theo dõi để không bỏ lỡ nhé! 💝`);
          }
        } catch {
          responseParts.push(`🎉 Liên hệ quán để biết thêm về khuyến mãi!`);
        }
      }
      
      // Đặt bàn
      if (patterns.booking.test(userMessage)) {
        responseParts.push(`🪑 **Đặt bàn tại DevCoffee:**

**Cách 1:** Đặt trên website
• Vào mục **"Đặt bàn"**
• Chọn ngày, giờ, số người
• Chọn bàn hoặc để nhân viên sắp xếp
• Nhập thông tin & Xác nhận

**Cách 2:** Gọi điện
📞 **0292 388 888**

✨ Đặt bàn **miễn phí**, không cần cọc!
📍 Đặt trước để được phục vụ tốt nhất!`);
      }
      
      // Khiếu nại / Góp ý
      if (patterns.complaint.test(userMessage)) {
        responseParts.push(`📝 **Góp ý & Phản hồi:**

Chúng tôi luôn lắng nghe bạn!

**Cách gửi góp ý:**
• 📞 Hotline: 0292 388 888
• 📧 Email: info@coffeeshop-demo.vn
• 💬 Chat trực tiếp với tôi
• 🏪 Nói trực tiếp với nhân viên

💝 Mọi ý kiến đều giúp chúng tôi hoàn thiện hơn!`);
      }
      
      // Hoàn tiền / Hủy đơn
      if (patterns.refund.test(userMessage)) {
        responseParts.push(`💸 **Hủy đơn & Hoàn tiền:**

**Hủy đơn:**
• Đơn chưa xác nhận: Hủy được ngay
• Đơn đã xác nhận: Liên hệ hotline

**Hoàn tiền:**
• Đơn online đã thanh toán: Hoàn trong 3-5 ngày
• Đơn tiền mặt: Hoàn tại quán

📞 Liên hệ: **0292 388 888** để được hỗ trợ!`);
      }
      
      // Xin lỗi
      if (patterns.sorry.test(userMessage)) {
        responseParts.push(`Không sao đâu bạn! 😊 Có gì tôi có thể giúp bạn không?`);
      }
      
      // Thời tiết (trả lời vui)
      if (patterns.weather.test(userMessage)) {
        responseParts.push(`🌤️ Dù trời nắng hay mưa, DevCoffee vẫn luôn chờ đón bạn với ly cà phê thơm ngon! ☕

☀️ Nắng nóng? → Thử **Trà đào cam sả** mát lạnh
🌧️ Mưa lạnh? → **Cappuccino nóng** ấm áp

Ghé quán thôi nào! 😄`);
      }
      
      // Joke
      if (patterns.joke.test(userMessage)) {
        const jokes = [
          `☕ Tại sao cà phê luôn buồn? Vì nó bị "đắng" quá! 😄`,
          `🤔 Barista hỏi khách: "Anh muốn cà phê đậm hay nhạt?" - Khách: "Đậm như tình yêu, nhạt như lương tháng!" 😂`,
          `☕ Cà phê và tôi có điểm chung: Cả hai đều làm người ta không ngủ được! 😴`
        ];
        responseParts.push(jokes[Math.floor(Math.random() * jokes.length)]);
      }
      
      // Gợi ý ngẫu nhiên
      if (patterns.random.test(userMessage)) {
        const suggestions = [
          `🎲 Hôm nay tôi gợi ý bạn thử **Cà phê sữa đá** - Đậm đà đúng vị Việt Nam! ☕`,
          `🎲 Bạn nên thử **Trà đào cam sả** - Thanh mát, ngọt tự nhiên! 🍑`,
          `🎲 Gợi ý: **Bạc xỉu** - Béo ngậy, dễ uống cho người mới! 🥛`,
          `🎲 Thử ngay **Cappuccino** - Chuẩn vị Ý, foam mịn! ☕`
        ];
        responseParts.push(suggestions[Math.floor(Math.random() * suggestions.length)]);
      }
      
      // Nếu không match gì hoặc là câu hỏi help
      if (responseParts.length === 0 || patterns.help.test(userMessage)) {
        const greeting = responseParts.length === 0 ? `Xin chào! 👋 Tôi là trợ lý AI của **DevCoffee**.\n\n` : '';
        responseParts.push(`${greeting}Tôi có thể giúp bạn:

☕ **Cà phê / Trà / Menu** - Xem thức uống
🏆 **Top món bán chạy** - Món được yêu thích
📍 **Địa chỉ / Giờ mở cửa** - Thông tin quán
🚚 **Giao hàng / Ship** - Đặt hàng online
🪑 **Đặt bàn** - Giữ chỗ trước
🎉 **Khuyến mãi / Mã giảm giá** - Ưu đãi
👤 **Tài khoản / Đơn hàng** - Thông tin cá nhân
💳 **Thanh toán** - Phương thức trả tiền

💬 Hỏi tôi bất cứ điều gì nhé!
📞 Hoặc gọi: **0292 388 888**`);
      }
      
      // Ghép câu trả lời
      let fallbackResponse = responseParts.join('\n\n---\n\n');
      
      // Thêm gợi ý nếu chỉ có 1 phần
      if (responseParts.length === 1 && !patterns.greeting.test(userMessage) && !patterns.thanks.test(userMessage) && !patterns.help.test(userMessage)) {
        fallbackResponse += `\n\n💬 _Cần gì thêm không? Hỏi tôi về menu, khuyến mãi, đặt bàn..._`;
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

