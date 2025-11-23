# 🤖 ĐỀ XUẤT: Tích hợp Chatbot AI vào Customer Portal

*Ngày: 2025-11-22*

---

## 🎯 MỤC ĐÍCH

Tích hợp **Chatbot AI** vào Customer Portal để:
- ✅ **Tăng điểm luận văn** (AI component là điểm mạnh)
- ✅ Hỗ trợ khách hàng 24/7
- ✅ Tự động hóa customer service
- ✅ Thể hiện kỹ năng tích hợp AI/ML

---

## 💡 TẠI SAO CÓ AI THÌ DATABASE LỚN HƠN LÀ HỢP LÝ?

### ✅ **Lý do hợp lý:**

1. **AI cần dữ liệu để học:**
   - Chat history (conversations)
   - User queries & responses
   - Training data
   - Intent classification data

2. **AI cần context:**
   - Menu items (để recommend)
   - Order history (để suggest)
   - Customer preferences
   - Business rules

3. **AI cần tracking:**
   - Conversation logs
   - Intent accuracy
   - User satisfaction
   - Model performance metrics

### 📊 **Database với AI sẽ có thêm:**

- **Chatbot tables:** 3-5 bảng
- **AI training data:** 2-3 bảng
- **Analytics cho AI:** 1-2 bảng
- **Tổng: ~6-10 bảng mới**

**→ Tổng database: 41 + 8 = ~49 bảng** - Vẫn hợp lý cho luận văn có AI!

---

## 🏗️ KIẾN TRÚC CHATBOT AI

### **Option 1: OpenAI GPT (Recommended - Dễ nhất)**

#### **Ưu điểm:**
- ✅ Dễ tích hợp (API đơn giản)
- ✅ Chất lượng cao (GPT-3.5/4)
- ✅ Hỗ trợ tiếng Việt tốt
- ✅ Có thể fine-tune với menu data

#### **Cần:**
- OpenAI API key
- Prompt engineering
- Context injection (menu, orders)

#### **Chi phí:**
- ~$0.002 per 1K tokens (GPT-3.5)
- ~$0.01-0.03 per 1K tokens (GPT-4)
- Ước tính: $5-20/tháng cho demo

---

### **Option 2: Google Gemini (Free tier tốt)**

#### **Ưu điểm:**
- ✅ Free tier: 60 requests/minute
- ✅ Hỗ trợ tiếng Việt
- ✅ Dễ tích hợp

#### **Cần:**
- Google Cloud API key
- Prompt engineering

---

### **Option 3: Local LLM (Ollama - Miễn phí)**

#### **Ưu điểm:**
- ✅ Hoàn toàn miễn phí
- ✅ Không cần internet
- ✅ Privacy tốt

#### **Nhược điểm:**
- ⚠️ Cần server mạnh
- ⚠️ Chất lượng thấp hơn GPT
- ⚠️ Setup phức tạp hơn

---

## 📋 DATABASE SCHEMA CHO CHATBOT

### **1. Bảng `chatbot_conversations`**
```sql
CREATE TABLE chatbot_conversations (
  id SERIAL PRIMARY KEY,
  customer_account_id INT REFERENCES customer_accounts(id),
  session_id TEXT, -- Cho guest users
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  status TEXT DEFAULT 'ACTIVE', -- ACTIVE, ENDED, ABANDONED
  language TEXT DEFAULT 'vi',
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_chatbot_conv_customer ON chatbot_conversations(customer_account_id);
CREATE INDEX idx_chatbot_conv_session ON chatbot_conversations(session_id);
```

### **2. Bảng `chatbot_messages`**
```sql
CREATE TABLE chatbot_messages (
  id SERIAL PRIMARY KEY,
  conversation_id INT REFERENCES chatbot_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  intent TEXT, -- 'menu_inquiry', 'order_status', 'reservation', etc.
  entities JSONB, -- Extracted entities (product names, dates, etc.)
  confidence DECIMAL(3,2), -- 0.00 - 1.00
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chatbot_msg_conv ON chatbot_messages(conversation_id);
CREATE INDEX idx_chatbot_msg_intent ON chatbot_messages(intent);
```

### **3. Bảng `chatbot_intents`**
```sql
CREATE TABLE chatbot_intents (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL, -- 'menu_inquiry', 'order_status', etc.
  description TEXT,
  examples TEXT[], -- Training examples
  response_template TEXT,
  action_type TEXT, -- 'query_menu', 'check_order', 'create_reservation', etc.
  active BOOLEAN DEFAULT TRUE
);
```

### **4. Bảng `chatbot_training_data`**
```sql
CREATE TABLE chatbot_training_data (
  id SERIAL PRIMARY KEY,
  user_query TEXT NOT NULL,
  intent TEXT,
  entities JSONB,
  correct_response TEXT,
  is_validated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **5. Bảng `chatbot_analytics`**
```sql
CREATE TABLE chatbot_analytics (
  id SERIAL PRIMARY KEY,
  conversation_id INT REFERENCES chatbot_conversations(id),
  intent TEXT,
  accuracy DECIMAL(3,2),
  user_satisfaction INT CHECK (user_satisfaction BETWEEN 1 AND 5),
  resolved BOOLEAN, -- Did chatbot solve user's problem?
  escalated_to_human BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Tổng: 5 bảng mới cho chatbot**

---

## 🎨 FRONTEND COMPONENT

### **ChatbotWidget Component**

```jsx
// frontend/src/components/customer/ChatbotWidget.jsx
- Floating button (bottom-right)
- Chat window (expandable)
- Message bubbles
- Typing indicator
- Quick actions (menu, order status, reservation)
```

### **Tính năng:**
- ✅ Real-time chat
- ✅ Quick actions buttons
- ✅ Menu search integration
- ✅ Order status check
- ✅ Reservation booking
- ✅ Typing animation
- ✅ Message history

---

## 🔧 BACKEND API

### **Endpoints:**

```javascript
// POST /api/v1/chatbot/chat
// Body: { conversation_id?, message, session_id? }
// Response: { message, intent, entities, suggestions }

// GET /api/v1/chatbot/conversations
// Query: ?customer_account_id=X&limit=20

// GET /api/v1/chatbot/conversations/:id/messages

// POST /api/v1/chatbot/feedback
// Body: { message_id, rating, feedback }
```

---

## 🚀 IMPLEMENTATION PLAN

### **Phase 1: Basic Chatbot (3-5 ngày)**

1. **Database:**
   - [ ] Tạo 5 bảng chatbot
   - [ ] Migration script

2. **Backend:**
   - [ ] Chatbot controller
   - [ ] Chatbot service (OpenAI integration)
   - [ ] Intent classification (rule-based hoặc simple ML)
   - [ ] API endpoints

3. **Frontend:**
   - [ ] ChatbotWidget component
   - [ ] Tích hợp vào CustomerLayout
   - [ ] UI/UX đẹp

4. **Features:**
   - [ ] Basic Q&A về menu
   - [ ] Order status check
   - [ ] Simple intent detection

---

### **Phase 2: Advanced Features (5-7 ngày)**

1. **AI Enhancement:**
   - [ ] Fine-tuning với menu data
   - [ ] Context injection (order history, preferences)
   - [ ] Multi-turn conversations

2. **Features:**
   - [ ] Menu recommendations
   - [ ] Reservation booking via chat
   - [ ] Order placement via chat
   - [ ] Sentiment analysis

3. **Analytics:**
   - [ ] Conversation analytics
   - [ ] Intent accuracy tracking
   - [ ] User satisfaction metrics

---

## 📊 CÁCH TRÌNH BÀY TRONG BÁO CÁO

### **Chương mới: "Tích hợp AI Chatbot"**

```
Chương 5: Tích hợp AI Chatbot vào Customer Portal
  5.1. Tổng quan
    5.1.1. Mục đích và lợi ích
    5.1.2. Kiến trúc hệ thống
  
  5.2. Database Design cho Chatbot
    5.2.1. ERD cho chatbot module
    5.2.2. Mô tả các bảng
    5.2.3. Relationships
  
  5.3. AI Integration
    5.3.1. OpenAI GPT Integration
    5.3.2. Prompt Engineering
    5.3.3. Context Injection
    5.3.4. Intent Classification
  
  5.4. Implementation
    5.4.1. Backend API
    5.4.2. Frontend Component
    5.4.3. Real-time Communication
  
  5.5. Testing & Evaluation
    5.5.1. Test cases
    5.5.2. Accuracy metrics
    5.5.3. User satisfaction
  
  5.6. Kết quả và Đánh giá
```

### **Điểm mạnh khi có AI:**

1. ✅ **Thể hiện kỹ năng AI/ML**
2. ✅ **Tích hợp công nghệ mới (OpenAI API)**
3. ✅ **Giải quyết vấn đề thực tế (customer service)**
4. ✅ **Database lớn hơn là hợp lý** (AI cần data)

---

## 💰 CHI PHÍ ƯỚC TÍNH

### **OpenAI GPT-3.5:**
- Input: $0.50 per 1M tokens
- Output: $1.50 per 1M tokens
- **Demo 1 tháng:** ~$5-10

### **Google Gemini (Free tier):**
- 60 requests/minute
- **Demo: Miễn phí**

### **Ollama (Local):**
- **Miễn phí** (nhưng cần server)

---

## 🎯 KHUYẾN NGHỊ

### **Nên dùng: OpenAI GPT-3.5**

**Lý do:**
1. ✅ Dễ tích hợp nhất
2. ✅ Chất lượng tốt
3. ✅ Chi phí thấp cho demo
4. ✅ Hỗ trợ tiếng Việt tốt
5. ✅ Có thể demo trực tiếp

### **Timeline:**
- **Phase 1 (Basic):** 3-5 ngày
- **Phase 2 (Advanced):** 5-7 ngày
- **Tổng: 8-12 ngày**

---

## 📝 KẾT LUẬN

### **Với AI Chatbot:**
- ✅ Database 49 bảng → **HỢP LÝ** (AI cần data)
- ✅ Thể hiện kỹ năng AI/ML → **ĐIỂM CAO**
- ✅ Giải quyết vấn đề thực tế → **THỰC TẾ**
- ✅ Tích hợp công nghệ mới → **HIỆN ĐẠI**

### **Cách trình bày:**
1. **Nhấn mạnh AI component** trong abstract/introduction
2. **Dedicated chapter** cho AI Chatbot
3. **Demo video** chatbot hoạt động
4. **Metrics & evaluation** cho AI performance

---

**Status:** 📋 Proposal Ready  
**Next Step:** Implement Phase 1 (Basic Chatbot)

