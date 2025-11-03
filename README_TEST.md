# 📋 TÓM TẮT: CÁCH TEST

## 🔧 **TEST BACKEND**

### **Script đã sẵn:**
- `backend/test-export-backend.js` (đầy đủ)
- `backend/test-export-simple.js` (đơn giản - DÙNG CÁI NÀY)

### **Cách chạy:**
```bash
# 1. Lấy token từ browser
# 2. Chạy:
cd backend
$env:TEST_TOKEN="your_token" ; node test-export-simple.js
```

**Xem:** `CACH_TEST_BACKEND.md`

---

## 🌐 **TEST FRONTEND**

### **Làm theo từng bước:**
1. Mở Manager Dashboard
2. Tab "Doanh thu" → Click export buttons
3. Tab "Lợi nhuận" → Click export buttons

**Xem:** `FRONTEND_TESTING_STEPS.md` (chi tiết)  
**Hoặc:** `TEST_NHANH.md` (tóm tắt)

---

## ✅ **CHECKLIST**

- [ ] Backend: Script chạy → Passed
- [ ] Frontend: Export buttons hoạt động
- [ ] Files download được
- [ ] Files mở được, có data

---

**Files đã tạo:**
- ✅ `backend/test-export-simple.js` - Script test backend
- ✅ `CACH_TEST_BACKEND.md` - Hướng dẫn test backend
- ✅ `FRONTEND_TESTING_STEPS.md` - Hướng dẫn test frontend chi tiết
- ✅ `TEST_NHANH.md` - Tóm tắt nhanh
