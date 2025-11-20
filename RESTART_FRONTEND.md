# 🔄 Hướng dẫn Restart Frontend

## ⚠️ QUAN TRỌNG: Sau khi tạo file .env

File `.env` đã được tạo với API key của bạn. Bây giờ bạn **PHẢI restart frontend** để Vite đọc file `.env`.

---

## 📋 Các bước restart:

### **Bước 1: Dừng Frontend**

1. Tìm terminal đang chạy `npm run dev`
2. Nhấn **Ctrl+C** để dừng

### **Bước 2: Chạy lại Frontend**

```bash
cd frontend
npm run dev
```

### **Bước 3: Kiểm tra**

1. Mở trình duyệt: `http://localhost:5173/customer/checkout`
2. Chọn **"Giao hàng"**
3. Google Maps sẽ hiển thị! 🎉

---

## ✅ Nếu Maps hiển thị:

- ✅ Bạn sẽ thấy:
  - Marker đỏ: Vị trí quán (Đường 3/2, Ninh Kiều, Cần Thơ)
  - Vòng tròn đỏ: Bán kính 2km
  - Có thể nhập địa chỉ hoặc click trên map

---

## ❌ Nếu vẫn không hiện:

1. **Kiểm tra Console (F12):**
   - Có lỗi gì không?
   - Có message "API key not authorized" không?

2. **Kiểm tra API Key trong Google Cloud:**
   - Đã thêm `http://localhost:5173/*` vào HTTP referrers chưa?
   - Đã bật đủ 3 API chưa? (Maps JavaScript, Places, Geocoding)

3. **Kiểm tra file .env:**
   - File có trong `frontend/.env` không?
   - API key có đúng không? (Bắt đầu bằng `AIzaSy`)

---

## 🎯 Tóm tắt:

```bash
# 1. Dừng frontend (Ctrl+C)
# 2. Chạy lại:
cd frontend
npm run dev
# 3. Refresh trang checkout
```

