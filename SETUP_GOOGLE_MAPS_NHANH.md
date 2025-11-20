# ⚡ Hướng dẫn nhanh: Cấu hình Google Maps

## 🚨 Vấn đề: Google Maps chưa hiện

**Nguyên nhân:** File `.env` chưa được tạo hoặc chưa có API key.

---

## ✅ Giải pháp (3 bước):

### **Bước 1: Lấy Google Maps API Key** (5 phút)

1. Truy cập: **https://console.cloud.google.com/**
2. Tạo project mới → Đặt tên: "Coffee Shop"
3. Bật API:
   - Vào **APIs & Services** → **Library**
   - Tìm và bật:
     - ✅ **Maps JavaScript API**
     - ✅ **Places API**  
     - ✅ **Geocoding API**
4. Tạo API Key:
   - Vào **APIs & Services** → **Credentials**
   - Click **"+ CREATE CREDENTIALS"** → **"API key"**
   - **Copy API key** (dạng: `AIzaSy...`)
5. Giới hạn API Key:
   - Click vào API key vừa tạo
   - **Application restrictions:** Chọn **"HTTP referrers (web sites)"**
   - **Website restrictions:** Thêm:
     ```
     http://localhost:5173/*
     ```
   - Click **"Save"**

---

### **Bước 2: Tạo file `.env`** (1 phút)

1. Vào thư mục `frontend/`
2. Tạo file mới tên: **`.env`** (chú ý: có dấu chấm ở đầu!)
3. Thêm nội dung:
   ```env
   VITE_GOOGLE_MAPS_API_KEY=AIzaSy...dán_api_key_của_bạn_vào_đây...
   ```
   (Thay `AIzaSy...` bằng API key bạn vừa copy)

4. **Lưu file**

---

### **Bước 3: Restart Frontend** (QUAN TRỌNG!)

**⚠️ BẮT BUỘC:** Sau khi tạo file `.env`, bạn **PHẢI restart** frontend:

1. **Dừng frontend** (Ctrl+C trong terminal)
2. **Chạy lại:**
   ```bash
   cd frontend
   npm run dev
   ```

**Lý do:** Vite chỉ đọc file `.env` khi khởi động, không tự động reload!

---

## ✅ Kiểm tra

1. Mở: `http://localhost:5173/customer/checkout`
2. Chọn **"Giao hàng"**
3. Bản đồ Google Maps sẽ hiển thị! 🎉

---

## ❌ Vẫn không hiện?

### Kiểm tra:

1. **File `.env` có đúng tên không?**
   - ✅ Đúng: `.env`
   - ❌ Sai: `.env.txt`, `env`, `frontend.env`

2. **File `.env` có trong thư mục `frontend/` không?**
   - Kiểm tra: `frontend/.env` (không phải `frontend/frontend/.env`)

3. **API key có đúng format không?**
   - ✅ Đúng: `AIzaSy...` (bắt đầu bằng `AIzaSy`)
   - ❌ Sai: Có khoảng trắng, thiếu ký tự

4. **Đã restart frontend chưa?**
   - ⚠️ **QUAN TRỌNG:** Phải restart sau khi tạo `.env`

5. **Console (F12) có lỗi gì không?**
   - Mở Console (F12) → Xem có lỗi gì
   - Thường gặp: "This API key is not authorized" → Kiểm tra lại API restrictions

---

## 📝 Tóm tắt nhanh

```bash
# 1. Lấy API key từ Google Cloud Console
# 2. Tạo file frontend/.env
# 3. Thêm: VITE_GOOGLE_MAPS_API_KEY=your_key_here
# 4. Restart frontend: npm run dev
```

---

## 💡 Tip

Nếu bạn chưa có Google Cloud account:
- Tạo tài khoản Google (miễn phí)
- Cần thẻ tín dụng để enable billing (nhưng có $200 free credit/tháng)
- Với quán nhỏ, thường không mất phí

