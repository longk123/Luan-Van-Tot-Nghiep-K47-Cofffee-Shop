# ⚡ Hướng Dẫn Test Nhanh

## 🔧 **TEST BACKEND - CHẠY SCRIPT**

### **Bước 1: Cài node-fetch (nếu chưa có)**
```bash
cd backend
npm install node-fetch@3
```

### **Bước 2: Lấy Token**
1. Mở browser: `http://localhost:5173`
2. Đăng nhập
3. F12 → Console → gõ:
   ```javascript
   localStorage.getItem('token')
   ```
4. Copy token

### **Bước 3: Set Token và Chạy Test**
```bash
# Linux/Mac:
export TEST_TOKEN="your_token_here"
node test-export-backend.js

# Windows PowerShell:
$env:TEST_TOKEN="your_token_here"
node test-export-backend.js

# Hoặc edit file test-export-backend.js, thay TOKEN = '' thành TOKEN = 'your_token'
```

### **Bước 4: Kiểm Tra Kết Quả**
- Script sẽ test tất cả report types (revenue, profit, products, promotions, customers)
- Test tất cả formats (excel, pdf, csv)
- Test error cases
- Files sẽ được lưu trong `backend/test-exports/`

**Kết quả:**
```
✅ Passed: 15/15
❌ Failed: 0/15
```

---

## 🌐 **TEST FRONTEND - LÀM THEO TỪNG BƯỚC**

### **1. Mở Manager Dashboard**
```
http://localhost:5173 → Đăng nhập → Manager Dashboard
```

### **2. Test Revenue Tab**
1. Click tab **"Doanh thu"**
2. **Nhìn:** Có 3 nút bên phải header (Excel, PDF, CSV)
3. **Click Excel:**
   - Button hiện "Đang xuất..."
   - File download
   - Mở file → Kiểm tra có data không
4. **Click PDF:** Tương tự
5. **Click CSV:** Tương tự

### **3. Test Profit Tab**
- Tương tự Revenue tab

### **4. Test Error (Optional)**
- Tắt backend
- Click export
- Kiểm tra có error message không

---

## ✅ **CHECKLIST NHANH**

**Backend:**
- [ ] Chạy script → Tất cả PASS
- [ ] Files trong `backend/test-exports/` có data

**Frontend:**
- [ ] Revenue tab có 3 nút export
- [ ] Click export → File download
- [ ] File mở được và có data
- [ ] Profit tab export hoạt động

---

**Chi tiết đầy đủ xem:** `FRONTEND_TESTING_STEPS.md`
