# 🧪 HƯỚNG DẪN TEST CHATBOT

*Ngày: 2025-11-22*

---

## 🚀 **BƯỚC 1: START BACKEND**

```bash
cd backend
npm run dev
```

**Kiểm tra:** Backend chạy tại `http://localhost:3000`

---

## 🎨 **BƯỚC 2: START FRONTEND**

Mở terminal mới:

```bash
cd frontend
npm run dev
```

**Kiểm tra:** Frontend chạy tại `http://localhost:5173`

---

## 🧪 **BƯỚC 3: TEST CHATBOT**

### **Cách 1: Test qua Frontend (Khuyến nghị)**

1. Mở browser: `http://localhost:5173/customer`
2. Scroll xuống, tìm nút chat ở góc dưới bên phải (màu nâu)
3. Click vào nút chat
4. Gõ: "Menu có gì?"
5. Chatbot sẽ trả lời!

### **Cách 2: Test qua API (Terminal)**

```bash
cd backend
node test-chatbot-api.js
```

---

## ✅ **TEST CASES**

### **Test 1: Basic Chat**
```
User: "Menu có gì?"
Bot: [Trả lời về menu]
```

### **Test 2: Price Question**
```
User: "Cà phê đen giá bao nhiêu?"
Bot: [Trả lời về giá]
```

### **Test 3: Order Help**
```
User: "Làm sao để đặt hàng?"
Bot: [Hướng dẫn đặt hàng]
```

### **Test 4: Guest User**
- Không cần đăng nhập
- Chatbot vẫn hoạt động
- Conversation được lưu với session_id

---

## 🐛 **TROUBLESHOOTING**

### **Lỗi: "fetch failed"**
- ✅ Kiểm tra backend có chạy không: `http://localhost:3000/api/v1/health`
- ✅ Kiểm tra port 3000 có bị chiếm không

### **Lỗi: "GEMINI_API_KEY not found"**
- ✅ Kiểm tra file `.env` trong `backend/`
- ✅ Đảm bảo có dòng: `GEMINI_API_KEY=AIzaSyAjLz96RkpjjTs7VZ5bkKCDk8d7BcUGz7Q`

### **Lỗi: "Cannot find module '@google/generative-ai'"**
```bash
cd backend
npm install @google/generative-ai
```

### **Lỗi: "Database connection failed"**
- ✅ Kiểm tra PostgreSQL đang chạy
- ✅ Kiểm tra database `coffee_shop` tồn tại
- ✅ Kiểm tra `.env` có đúng DB credentials

### **Chatbot không trả lời**
- ✅ Kiểm tra console (F12) có lỗi không
- ✅ Kiểm tra Network tab xem API call có thành công không
- ✅ Kiểm tra backend logs

---

## 📊 **KIỂM TRA DATABASE**

### **Xem conversations:**
```sql
SELECT * FROM chatbot_conversations ORDER BY created_at DESC LIMIT 5;
```

### **Xem messages:**
```sql
SELECT * FROM chatbot_messages ORDER BY created_at DESC LIMIT 10;
```

### **Xem conversation với messages:**
```sql
SELECT 
  c.id,
  c.customer_account_id,
  c.message_count,
  m.role,
  m.content,
  m.created_at
FROM chatbot_conversations c
LEFT JOIN chatbot_messages m ON m.conversation_id = c.id
WHERE c.id = 1
ORDER BY m.created_at ASC;
```

---

## 🎯 **EXPECTED BEHAVIOR**

### **Khi mở chat lần đầu:**
- Hiển thị welcome message: "Xin chào! Tôi là trợ lý AI..."
- Input box sẵn sàng nhận message

### **Khi gửi message:**
1. User message hiển thị ngay (màu nâu, bên phải)
2. Loading indicator xuất hiện
3. Bot response hiển thị (màu trắng, bên trái)
4. Auto scroll xuống message mới

### **Khi đóng/mở lại chat:**
- Load lại conversation history
- Hiển thị tất cả messages trước đó

---

## 📝 **NOTES**

- ✅ Chatbot hoạt động cho cả guest và logged-in users
- ✅ Conversation được lưu vào database
- ✅ Gemini API có rate limit: 60 req/phút (free tier)
- ✅ Nếu vượt rate limit, sẽ có error message

---

**Status:** ✅ Ready to test!  
**Next:** Start backend và frontend, rồi test!

