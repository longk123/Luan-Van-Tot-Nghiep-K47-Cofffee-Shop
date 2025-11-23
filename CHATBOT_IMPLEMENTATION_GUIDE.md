# 🤖 HƯỚNG DẪN: Tích hợp Chatbot AI vào Customer Portal

*Ngày: 2025-11-22*

---

## 🎯 TỔNG QUAN

Tích hợp **AI Chatbot** vào Customer Portal để:
- ✅ Hỗ trợ khách hàng 24/7
- ✅ Tự động hóa customer service
- ✅ **Tăng điểm luận văn** (AI component là điểm mạnh)

---

## 🚀 QUICK START (3-5 ngày)

### **Step 1: Database Migration (1 ngày)**

Tạo file: `backend/migrate-add-chatbot-tables.cjs`

```javascript
// Tạo 5 bảng cho chatbot
1. chatbot_conversations
2. chatbot_messages
3. chatbot_intents
4. chatbot_training_data
5. chatbot_analytics
```

### **Step 2: Backend API (2 ngày)**

1. **Repository:** `backend/src/repositories/chatbotRepository.js`
2. **Service:** `backend/src/services/chatbotService.js` (OpenAI integration)
3. **Controller:** `backend/src/controllers/chatbotController.js`
4. **Routes:** `backend/src/routes/chatbot.js`

### **Step 3: Frontend Component (2 ngày)**

1. **Component:** `frontend/src/components/customer/ChatbotWidget.jsx`
2. **Tích hợp:** Vào `CustomerLayout.jsx`
3. **Styling:** Floating button + Chat window

---

## 💡 PROMPT ENGINEERING

### **System Prompt:**

```
Bạn là trợ lý AI của Coffee Shop. Nhiệm vụ của bạn:
1. Trả lời câu hỏi về menu, giá cả
2. Kiểm tra trạng thái đơn hàng
3. Hỗ trợ đặt bàn
4. Gợi ý món dựa trên sở thích

Luôn trả lời bằng tiếng Việt, thân thiện và chuyên nghiệp.
```

### **Context Injection:**

```javascript
const context = {
  menu: await getMenuItems(),
  userOrders: await getUserOrders(userId),
  userPreferences: await getUserPreferences(userId)
};

const prompt = `
System: ${systemPrompt}
Context:
- Menu: ${JSON.stringify(context.menu)}
- User Orders: ${JSON.stringify(userOrders)}
- User Preferences: ${JSON.stringify(userPreferences)}

User: ${userMessage}
`;
```

---

## 📊 FEATURES ĐỀ XUẤT

### **Basic (Phase 1):**
1. ✅ Q&A về menu
2. ✅ Order status check
3. ✅ Simple recommendations

### **Advanced (Phase 2):**
1. ✅ Reservation booking via chat
2. ✅ Order placement via chat
3. ✅ Sentiment analysis
4. ✅ Multi-turn conversations

---

## 🎓 CHO BÁO CÁO LUẬN VĂN

### **Cách trình bày:**

1. **Abstract/Introduction:**
   - "Hệ thống tích hợp AI Chatbot để hỗ trợ khách hàng 24/7"
   - "Sử dụng OpenAI GPT để xử lý ngôn ngữ tự nhiên"

2. **Dedicated Chapter:**
   - Chương riêng về "Tích hợp AI Chatbot"
   - Giải thích architecture, database, API
   - Demo và evaluation

3. **Database:**
   - "Database có 49 bảng, bao gồm 5 bảng cho AI Chatbot"
   - "Chatbot cần lưu conversation history và training data"

---

**Status:** 📋 Ready to Implement

