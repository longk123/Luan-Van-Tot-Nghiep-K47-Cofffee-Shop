# 🤖 GIẢI THÍCH ĐƠN GIẢN: Chatbot là gì và cách tạo

*Ngày: 2025-11-22*

---

## 🎯 **CHATBOT LÀ GÌ?**

### **Ví dụ thực tế:**
Bạn vào website quán cà phê, thấy một **hộp chat** ở góc màn hình:
- Bạn gõ: "Menu hôm nay có gì?"
- Chatbot trả lời: "Menu hôm nay có: Cà phê đen (25k), Cà phê sữa (30k), Latte (45k)..."
- Bạn gõ: "Tôi muốn đặt 1 ly latte"
- Chatbot: "Bạn muốn size nào? (S/M/L)"

**→ Đó chính là chatbot!**

---

## 🧠 **CHATBOT HOẠT ĐỘNG NHƯ THẾ NÀO?**

### **Cách 1: Rule-Based (Cũ, đơn giản)**
```
Nếu user gõ "menu" → Trả về danh sách menu
Nếu user gõ "giá" → Trả về bảng giá
Nếu user gõ "đặt bàn" → Hỏi thông tin đặt bàn
```

**Nhược điểm:** 
- ❌ Phải viết từng rule
- ❌ Không hiểu ngữ cảnh
- ❌ Không tự nhiên

### **Cách 2: AI-Based (Mới, thông minh) - CHÚNG TA SẼ DÙNG**
```
User: "Menu hôm nay có gì?"
→ AI hiểu: User muốn xem menu
→ AI tự động query database lấy menu
→ AI trả lời tự nhiên: "Menu hôm nay có..."
```

**Ưu điểm:**
- ✅ Hiểu ngữ cảnh
- ✅ Trả lời tự nhiên
- ✅ Học được từ dữ liệu
- ✅ Không cần viết từng rule

---

## 🏗️ **KIẾN TRÚC CHATBOT (Đơn giản)**

```
┌─────────────┐
│   USER      │
│  (Khách)    │
└──────┬──────┘
       │
       │ Gõ: "Menu có gì?"
       ▼
┌─────────────────────┐
│  FRONTEND           │
│  ChatbotWidget.jsx  │ ← Hiển thị chat UI
└──────┬──────────────┘
       │
       │ POST /api/v1/chatbot/chat
       │ { message: "Menu có gì?" }
       ▼
┌─────────────────────┐
│  BACKEND            │
│  chatbotController  │ ← Nhận request
└──────┬──────────────┘
       │
       │ Gọi chatbotService
       ▼
┌─────────────────────┐
│  chatbotService     │ ← Xử lý logic
│  - Build context     │
│  - Call OpenAI API   │
└──────┬──────────────┘
       │
       │ POST https://api.openai.com/v1/chat/completions
       │ { 
       │   model: "gpt-3.5-turbo",
       │   messages: [
       │     { role: "system", content: "Bạn là chatbot..." },
       │     { role: "user", content: "Menu có gì?" }
       │   ]
       │ }
       ▼
┌─────────────────────┐
│  OPENAI API         │ ← AI xử lý
│  (GPT-3.5/GPT-4)    │
└──────┬──────────────┘
       │
       │ Trả về: "Menu hôm nay có: Cà phê đen..."
       ▼
┌─────────────────────┐
│  chatbotService     │ ← Lưu vào database
│  - Save message      │
│  - Return response   │
└──────┬──────────────┘
       │
       │ { message: "Menu hôm nay có: ..." }
       ▼
┌─────────────────────┐
│  FRONTEND           │
│  Hiển thị response   │ ← User thấy câu trả lời
└─────────────────────┘
```

---

## 📝 **VÍ DỤ CỤ THỂ: User hỏi "Menu có gì?"**

### **Bước 1: User gõ message**
```javascript
// Frontend: ChatbotWidget.jsx
const [message, setMessage] = useState("Menu có gì?");
```

### **Bước 2: Gửi lên backend**
```javascript
// Frontend gọi API
const response = await api.post('/chatbot/chat', {
  message: "Menu có gì?",
  customer_id: currentUser.id
});
```

### **Bước 3: Backend xử lý**
```javascript
// backend/src/services/chatbotService.js
async function chat(message, customerId) {
  // 1. Lấy menu từ database
  const menu = await menuRepository.getAll();
  
  // 2. Build context cho AI
  const context = `
    Bạn là chatbot của quán cà phê.
    Menu hiện tại:
    ${menu.map(m => `- ${m.ten}: ${m.gia}đ`).join('\n')}
  `;
  
  // 3. Gọi OpenAI API
  const aiResponse = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: context },
      { role: "user", content: message }
    ]
  });
  
  // 4. Lưu vào database
  await chatbotRepository.saveMessage({
    customer_id: customerId,
    user_message: message,
    bot_response: aiResponse.choices[0].message.content
  });
  
  // 5. Trả về response
  return aiResponse.choices[0].message.content;
}
```

### **Bước 4: OpenAI xử lý**
```
OpenAI nhận:
- System: "Bạn là chatbot... Menu: Cà phê đen: 25k..."
- User: "Menu có gì?"

OpenAI trả về:
"Menu hôm nay có:
- Cà phê đen: 25,000đ
- Cà phê sữa: 30,000đ
- Latte: 45,000đ
..."
```

### **Bước 5: Frontend hiển thị**
```javascript
// ChatbotWidget.jsx
<div className="message bot">
  Menu hôm nay có:
  - Cà phê đen: 25,000đ
  - Cà phê sữa: 30,000đ
  ...
</div>
```

---

## 🗄️ **DATABASE CẦN GÌ?**

### **Bảng 1: `chatbot_conversations`**
Lưu mỗi cuộc hội thoại:
```
id | customer_id | started_at | last_message_at
1  | 5           | 2025-11-22 | 2025-11-22
```

### **Bảng 2: `chatbot_messages`**
Lưu từng tin nhắn:
```
id | conversation_id | role | content | created_at
1  | 1               | user | "Menu có gì?" | 2025-11-22
2  | 1               | bot  | "Menu hôm nay có..." | 2025-11-22
```

**Tại sao cần lưu?**
- ✅ Để AI nhớ context (câu trước)
- ✅ Để phân tích sau này
- ✅ Để cải thiện chatbot

---

## 🔧 **CÁC BƯỚC IMPLEMENT**

### **Bước 1: Tạo Database Tables**
```sql
-- Bảng conversations
CREATE TABLE chatbot_conversations (
  id SERIAL PRIMARY KEY,
  customer_id INT REFERENCES customer_accounts(id),
  started_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng messages
CREATE TABLE chatbot_messages (
  id SERIAL PRIMARY KEY,
  conversation_id INT REFERENCES chatbot_conversations(id),
  role TEXT CHECK (role IN ('user', 'bot')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **Bước 2: Setup OpenAI**
```bash
# Install package
npm install openai

# Thêm vào .env
OPENAI_API_KEY=sk-xxxxx...
```

### **Bước 3: Tạo Backend Service**
```javascript
// backend/src/services/chatbotService.js
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function chat(message, customerId) {
  // 1. Lấy context (menu, orders, etc.)
  const menu = await getMenu();
  
  // 2. Build system prompt
  const systemPrompt = `
    Bạn là chatbot của quán cà phê.
    Menu: ${JSON.stringify(menu)}
    Nhiệm vụ: Trả lời câu hỏi của khách hàng về menu, đặt hàng, v.v.
  `;
  
  // 3. Gọi OpenAI
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: message }
    ]
  });
  
  // 4. Trả về
  return response.choices[0].message.content;
}
```

### **Bước 4: Tạo Backend API**
```javascript
// backend/src/controllers/chatbotController.js
export async function chat(req, res) {
  const { message } = req.body;
  const customerId = req.user.id;
  
  const response = await chatbotService.chat(message, customerId);
  
  res.json({ message: response });
}
```

### **Bước 5: Tạo Frontend Component**
```jsx
// frontend/src/components/customer/ChatbotWidget.jsx
function ChatbotWidget() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  
  async function sendMessage() {
    // Thêm user message
    setMessages([...messages, { role: "user", content: input }]);
    
    // Gọi API
    const response = await api.post('/chatbot/chat', {
      message: input
    });
    
    // Thêm bot response
    setMessages([...messages, 
      { role: "user", content: input },
      { role: "bot", content: response.message }
    ]);
    
    setInput("");
  }
  
  return (
    <div className="chatbot">
      <div className="messages">
        {messages.map(msg => (
          <div className={`message ${msg.role}`}>
            {msg.content}
          </div>
        ))}
      </div>
      <input 
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyPress={e => e.key === 'Enter' && sendMessage()}
      />
      <button onClick={sendMessage}>Gửi</button>
    </div>
  );
}
```

---

## 💡 **VÍ DỤ THỰC TẾ: User đặt hàng qua chatbot**

### **Scenario:**
```
User: "Tôi muốn đặt 1 ly latte size L"
Bot: "Bạn có muốn thêm topping không? (Whipped cream, Caramel...)"
User: "Thêm whipped cream"
Bot: "Đã thêm vào giỏ hàng! Tổng: 55,000đ. Bạn muốn thanh toán ngay?"
User: "Có"
Bot: "Đang chuyển đến trang thanh toán..."
```

### **Code xử lý:**
```javascript
// chatbotService.js
async function chat(message, customerId) {
  // 1. Phân tích intent (AI tự động)
  const intent = await detectIntent(message);
  // intent = "ADD_TO_CART"
  
  // 2. Nếu là đặt hàng, extract thông tin
  if (intent === "ADD_TO_CART") {
    const { item, size, quantity } = await extractOrderInfo(message);
    // item = "latte", size = "L", quantity = 1
    
    // 3. Thêm vào giỏ hàng
    await cartRepository.addItem(customerId, {
      mon_id: item.id,
      size: size,
      quantity: quantity
    });
    
    // 4. Trả lời
    return "Đã thêm vào giỏ hàng! Tổng: 55,000đ";
  }
  
  // 5. Nếu không phải đặt hàng, dùng AI trả lời
  return await openai.chat.completions.create({...});
}
```

---

## 🎯 **TÓM TẮT: Chatbot hoạt động như thế nào?**

### **Đơn giản nhất:**
1. **User gõ message** → Frontend
2. **Frontend gửi lên Backend** → API
3. **Backend gọi OpenAI** → AI xử lý
4. **OpenAI trả về response** → Backend
5. **Backend lưu vào database** → Lưu lại
6. **Backend trả về Frontend** → API response
7. **Frontend hiển thị** → User thấy câu trả lời

### **Với AI:**
- ✅ AI **tự động hiểu** ý user
- ✅ AI **tự động trả lời** tự nhiên
- ✅ AI **nhớ context** (câu trước)
- ✅ AI **học được** từ dữ liệu

---

## 🚀 **BẮT ĐẦU TỪ ĐÂU?**

### **Option 1: Đơn giản nhất (Không dùng AI)**
```javascript
// Rule-based chatbot
if (message.includes("menu")) {
  return "Menu: Cà phê đen, Cà phê sữa...";
}
if (message.includes("giá")) {
  return "Giá: Cà phê đen 25k, Cà phê sữa 30k...";
}
```

### **Option 2: Dùng AI (Khuyến nghị)**
```javascript
// AI-based chatbot
const response = await openai.chat.completions.create({
  model: "gpt-3.5-turbo",
  messages: [
    { role: "system", content: "Bạn là chatbot..." },
    { role: "user", content: message }
  ]
});
```

---

## ❓ **CÂU HỎI THƯỜNG GẶP**

### **Q1: Tại sao cần OpenAI?**
**A:** OpenAI (GPT) giúp chatbot:
- Hiểu ngữ cảnh tự nhiên
- Trả lời tự nhiên như người
- Không cần viết từng rule

### **Q2: Có tốn tiền không?**
**A:** 
- GPT-3.5-turbo: ~$0.002/1000 tokens (rất rẻ)
- 1 cuộc hội thoại: ~500-1000 tokens
- 1000 cuộc hội thoại: ~$1-2
- **→ Rất rẻ cho testing!**

### **Q3: Có thể dùng Google Gemini không?**
**A:** Có! Gemini có free tier, rẻ hơn OpenAI.

### **Q4: Cần học AI không?**
**A:** Không! Chỉ cần:
- Biết gọi API
- Biết truyền data vào
- Biết nhận response về

---

## 📚 **TÀI LIỆU THAM KHẢO**

1. **OpenAI API Docs:** https://platform.openai.com/docs
2. **OpenAI Node.js SDK:** https://github.com/openai/openai-node
3. **Google Gemini:** https://ai.google.dev/

---

**Kết luận:** Chatbot = Frontend UI + Backend API + AI Service (OpenAI/Gemini)

**Bạn đã hiểu chưa?** Nếu còn thắc mắc, hỏi tôi nhé! 😊

