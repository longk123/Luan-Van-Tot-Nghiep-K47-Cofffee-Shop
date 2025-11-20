# 📝 Tạo file .env - Hướng dẫn nhanh

## ✅ API Key của bạn:
```
AIzaSyAPyWkkHroqbo35NUd0yV5Kaog3rxWxuM0
```

---

## 🔧 Cách tạo file .env:

### **Cách 1: Dùng Terminal (Khuyến nghị)**

Mở terminal trong thư mục `frontend/` và chạy:

**Windows PowerShell:**
```powershell
cd frontend
echo "VITE_GOOGLE_MAPS_API_KEY=AIzaSyAPyWkkHroqbo35NUd0yV5Kaog3rxWxuM0" | Out-File -FilePath .env -Encoding utf8
```

**Windows CMD:**
```cmd
cd frontend
echo VITE_GOOGLE_MAPS_API_KEY=AIzaSyAPyWkkHroqbo35NUd0yV5Kaog3rxWxuM0 > .env
```

**Linux/Mac:**
```bash
cd frontend
echo "VITE_GOOGLE_MAPS_API_KEY=AIzaSyAPyWkkHroqbo35NUd0yV5Kaog3rxWxuM0" > .env
```

---

### **Cách 2: Tạo thủ công**

1. Vào thư mục `frontend/`
2. Tạo file mới tên: **`.env`** (chú ý: có dấu chấm ở đầu!)
3. Mở file và thêm nội dung:
   ```
   VITE_GOOGLE_MAPS_API_KEY=AIzaSyAPyWkkHroqbo35NUd0yV5Kaog3rxWxuM0
   ```
4. **Lưu file**

---

## ⚠️ QUAN TRỌNG: Restart Frontend

Sau khi tạo file `.env`, bạn **PHẢI restart frontend**:

1. **Dừng frontend** (Ctrl+C trong terminal đang chạy `npm run dev`)
2. **Chạy lại:**
   ```bash
   cd frontend
   npm run dev
   ```

---

## ✅ Kiểm tra

1. Mở: `http://localhost:5173/customer/checkout`
2. Chọn **"Giao hàng"**
3. Google Maps sẽ hiển thị! 🎉

---

## 🔍 Kiểm tra file đã tạo chưa:

```bash
cd frontend
cat .env
# hoặc
type .env  # Windows CMD
Get-Content .env  # Windows PowerShell
```

Nếu thấy dòng:
```
VITE_GOOGLE_MAPS_API_KEY=AIzaSyAPyWkkHroqbo35NUd0yV5Kaog3rxWxuM0
```

→ ✅ Đã tạo thành công!

