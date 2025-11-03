# 🧪 CÁCH TEST BACKEND - 3 BƯỚC

## ⚡ **NHANH NHẤT**

### **Bước 1: Lấy Token (10 giây)**
1. Mở: `http://localhost:5173`
2. Đăng nhập
3. **F12** → **Console** → Gõ:
   ```javascript
   localStorage.getItem('token')
   ```
4. **Copy token** (chuỗi dài bắt đầu `eyJ...`)

### **Bước 2: Chạy Test (30 giây)**
```bash
cd backend

# Windows PowerShell:
$env:TEST_TOKEN="paste_token_vào_đây"
node test-export-simple.js

# Hoặc Linux/Mac:
export TEST_TOKEN="paste_token_vào_đây"
node test-export-simple.js
```

### **Bước 3: Xem Kết Quả**
- ✅ Passed: X tests
- ❌ Failed: X tests  
- 📁 Files trong `backend/test-exports/`

---

## 📝 **CHI TIẾT HƠN**

Script sẽ test:
- ✅ Revenue Excel/PDF/CSV
- ✅ Profit Excel/PDF/CSV
- ✅ Products Excel/PDF/CSV
- ✅ Promotions Excel/PDF/CSV
- ✅ Customers Excel/PDF/CSV
- ✅ Error cases (missing params, invalid format, etc.)

**Tổng: ~15 tests**

---

## 🐛 **NẾU LỖI**

**Lỗi: "Backend chưa chạy"**
→ Chạy: `cd backend && npm start`

**Lỗi: "Need token"**
→ Làm lại bước 1

**Lỗi: "401 Unauthorized"**
→ Token hết hạn, đăng nhập lại lấy token mới

---

**Xong! Sau đó test frontend theo `FRONTEND_TESTING_STEPS.md`**
