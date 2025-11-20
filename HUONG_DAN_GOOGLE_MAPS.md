# 🗺️ Hướng dẫn cấu hình Google Maps - BẮT BUỘC

## ⚠️ Google Maps chưa hiện? Làm theo các bước sau:

### Bước 1: Lấy Google Maps API Key

1. **Truy cập:** https://console.cloud.google.com/
2. **Đăng nhập** bằng tài khoản Google
3. **Tạo project mới** (hoặc chọn project có sẵn):
   - Click vào dropdown project ở trên cùng
   - Click "New Project"
   - Đặt tên: "Coffee Shop POS" (hoặc tên khác)
   - Click "Create"

4. **Bật các API cần thiết:**
   - Vào **APIs & Services** → **Library**
   - Tìm và bật:
     - ✅ **Maps JavaScript API** (Click "Enable")
     - ✅ **Places API** (Click "Enable")
     - ✅ **Geocoding API** (Click "Enable" - để reverse geocoding khi click trên map)

5. **Tạo API Key:**
   - Vào **APIs & Services** → **Credentials**
   - Click **"+ CREATE CREDENTIALS"** → **"API key"**
   - Copy API key vừa tạo (sẽ có dạng: `AIzaSy...`)

6. **Giới hạn API Key (QUAN TRỌNG để bảo mật):**
   - Click vào API key vừa tạo
   - **Application restrictions:** Chọn **"HTTP referrers (web sites)"**
   - **Website restrictions:** Thêm:
     ```
     http://localhost:5173/*
     http://localhost:5173
     https://yourdomain.com/*
     ```
   - **API restrictions:** Chọn **"Restrict key"** và chỉ chọn:
     - Maps JavaScript API
     - Places API
     - Geocoding API
   - Click **"Save"**

---

### Bước 2: Tạo file .env trong frontend

1. **Tạo file:** `frontend/.env`
2. **Thêm nội dung:**
   ```env
   VITE_GOOGLE_MAPS_API_KEY=AIzaSy...your_api_key_here...
   ```
   (Thay `AIzaSy...your_api_key_here...` bằng API key bạn vừa copy)

3. **Lưu file**

---

### Bước 3: Restart Frontend

**QUAN TRỌNG:** Sau khi tạo file `.env`, bạn **PHẢI restart** frontend server:

1. **Dừng frontend** (Ctrl+C trong terminal đang chạy `npm run dev`)
2. **Chạy lại:**
   ```bash
   cd frontend
   npm run dev
   ```

**Lý do:** Vite chỉ đọc `.env` khi khởi động, không tự động reload!

---

### Bước 4: Kiểm tra

1. Mở trình duyệt: `http://localhost:5173/customer/checkout`
2. Chọn **"Giao hàng"**
3. Bản đồ Google Maps sẽ hiển thị:
   - ✅ Marker đỏ: Vị trí quán
   - ✅ Vòng tròn đỏ: Bán kính 2km
   - ✅ Có thể nhập địa chỉ hoặc click trên map

---

## 🔍 Troubleshooting

### ❌ Bản đồ vẫn không hiện?

1. **Kiểm tra Console (F12):**
   - Có lỗi gì không?
   - Có message "Google Maps API key chưa được cấu hình" không?

2. **Kiểm tra file .env:**
   - File có đúng tên `.env` (không phải `.env.txt`)?
   - File có trong thư mục `frontend/`?
   - API key có đúng format? (Bắt đầu bằng `AIzaSy`)

3. **Kiểm tra đã restart frontend chưa:**
   - Vite cần restart để đọc `.env`

4. **Kiểm tra API Key trong Google Cloud:**
   - API key có bị restrict quá chặt không?
   - Có bật đủ 3 API chưa? (Maps JavaScript, Places, Geocoding)
   - Có thêm `localhost:5173/*` vào HTTP referrers chưa?

5. **Kiểm tra billing:**
   - Google Cloud cần enable billing (nhưng có $200 free credit/tháng)
   - Vào **Billing** → Enable billing account

---

## 💰 Chi phí

- **Free tier:** $200 credit/tháng (đủ cho ~28,000 requests)
- **Sau free tier:** ~$7/1000 requests
- **Với quán nhỏ:** Thường không vượt quá free tier

---

## 📝 Tóm tắt nhanh

```bash
# 1. Lấy API key từ Google Cloud Console
# 2. Tạo file frontend/.env
echo "VITE_GOOGLE_MAPS_API_KEY=YOUR_API_KEY_HERE" > frontend/.env

# 3. Restart frontend
cd frontend
npm run dev
```

---

## ✅ Checklist

- [ ] Đã tạo project trong Google Cloud Console
- [ ] Đã bật Maps JavaScript API
- [ ] Đã bật Places API
- [ ] Đã bật Geocoding API
- [ ] Đã tạo API Key
- [ ] Đã giới hạn API Key (HTTP referrers)
- [ ] Đã tạo file `frontend/.env`
- [ ] Đã thêm API key vào file `.env`
- [ ] Đã restart frontend server
- [ ] Bản đồ hiển thị trên trang checkout

