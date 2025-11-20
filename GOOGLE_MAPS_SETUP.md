# 🗺️ Hướng dẫn cấu hình Google Maps API

## 📋 Yêu cầu

1. **Google Maps API Key** với các API sau được bật:
   - Maps JavaScript API
   - Places API
   - Geocoding API (tùy chọn, để reverse geocoding)

## 🔑 Cách lấy API Key

1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo project mới hoặc chọn project hiện có
3. Vào **APIs & Services** → **Library**
4. Bật các API:
   - **Maps JavaScript API**
   - **Places API**
5. Vào **APIs & Services** → **Credentials**
6. Tạo **API Key** mới
7. **Quan trọng:** Giới hạn API Key:
   - **Application restrictions:** HTTP referrers
   - **Website restrictions:** Thêm domain của bạn (ví dụ: `localhost:5173/*`, `yourdomain.com/*`)

## ⚙️ Cấu hình

### Frontend (.env)

Tạo file `frontend/.env`:

```env
VITE_GOOGLE_MAPS_API_KEY=YOUR_API_KEY_HERE
```

### Backend

Địa chỉ quán đã được cấu hình trong code:
- **Vị trí:** Gần Đại học Cần Thơ
- **Tọa độ:** 10.0310° N, 105.7690° E
- **Địa chỉ:** Đường 3/2, Ninh Kiều, Cần Thơ
- **Bán kính giao hàng:** 2km

Nếu muốn thay đổi, sửa trong:
- `frontend/src/pages/customer/CheckoutPage.jsx` (dòng 45-49)
- `backend/src/services/posService.js` (trong hàm `saveDeliveryInfo`)

## 🧪 Test

1. Chạy migration:
   ```bash
   node backend/migrate-add-delivery-order.cjs
   ```

2. Restart backend và frontend

3. Test trên frontend:
   - Vào trang checkout
   - Chọn "Giao hàng"
   - Nhập địa chỉ trong ô tìm kiếm
   - Xem bản đồ hiển thị
   - Kiểm tra validation bán kính 2km

## 💰 Chi phí

Google Maps API có free tier:
- **$200 credit/tháng** (đủ cho ~28,000 requests)
- Sau đó: $7/1000 requests

Với mô hình nhỏ, thường không vượt quá free tier.

## 🔒 Bảo mật

**QUAN TRỌNG:** Không commit API key vào git!

1. Thêm vào `.gitignore`:
   ```
   frontend/.env
   ```

2. Sử dụng environment variables
3. Giới hạn API key theo domain trong Google Cloud Console

