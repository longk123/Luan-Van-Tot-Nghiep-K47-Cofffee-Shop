# ⚡ TEST NHANH - 5 PHÚT

## 🔧 **TEST BACKEND (Tôi test giúp bạn)**

### **Bước 1: Lấy Token**
1. Mở `http://localhost:5173` → Đăng nhập
2. F12 → Console → Gõ: `localStorage.getItem('token')`
3. Copy token

### **Bước 2: Chạy Script Test**
```bash
cd backend

# Windows PowerShell:
$env:TEST_TOKEN="paste_token_here"
node test-export-backend.js

# Hoặc Linux/Mac:
export TEST_TOKEN="paste_token_here"
node test-export-backend.js
```

**Kết quả:** Script sẽ test tất cả (15 tests) và lưu files vào `backend/test-exports/`

---

## 🌐 **TEST FRONTEND (Bạn tự test)**

### **Bước 1: Mở Dashboard**
```
http://localhost:5173 → Manager Dashboard → Tab "Doanh thu"
```

### **Bước 2: Click Export**
1. **Nhìn:** Có 3 nút bên phải (Excel xanh, PDF đỏ, CSV xanh)
2. **Click Excel:**
   - ✅ Button hiện "Đang xuất..."
   - ✅ File download
   - ✅ Mở file → Có data

3. **Click PDF:** Tương tự
4. **Click CSV:** Tương tự

### **Bước 3: Profit Tab**
- Chuyển tab → Test tương tự

---

## ✅ **CHECKLIST NHANH**

**Backend:**
- [ ] Script chạy → Passed 15/15
- [ ] Files trong `backend/test-exports/` có data

**Frontend:**
- [ ] Có 3 nút export
- [ ] Click → Download file
- [ ] File mở được, có data

---

**Chi tiết:** Xem `FRONTEND_TESTING_STEPS.md`
