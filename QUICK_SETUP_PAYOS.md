# 🚀 Quick Setup PayOS - 3 Bước Đơn Giản

## Bước 1: Chạy Migration (Tạo bảng trong database)

### Cách 1: Dùng script tự động (Windows)
```bash
cd backend
run-payos-migration.bat
```

### Cách 2: Chạy thủ công
```bash
cd backend
psql -U postgres -d coffee_shop -f migrate-add-payment-gateway.sql
# Nhập password: 123456
```

## Bước 2: Copy file .env

```bash
cd backend
copy .env.example .env
```

**Hoặc tạo thủ công file `backend/.env`** với nội dung đã có sẵn trong `.env.example`

## Bước 3: Restart server

```bash
cd backend
npm run dev
```

## ✅ Xong! Test ngay:

1. Mở ứng dụng: http://localhost:3000
2. Tạo đơn hàng
3. Click "Thu tiền"
4. Chọn **PAYOS (Gateway)**
5. Click "Tạo mã thanh toán PayOS"
6. Xem QR code hiển thị!

---

## 🧪 Test Webhook (Optional - để nhận payment realtime)

### 1. Cài ngrok
```bash
# Download: https://ngrok.com/download
# Hoặc: choco install ngrok
```

### 2. Expose server
```bash
ngrok http 5000
# Copy URL: https://abc123.ngrok-free.app
```

### 3. Cấu hình webhook trên PayOS
- Vào: https://my.payos.vn
- Settings > Webhook
- URL: `https://abc123.ngrok-free.app/api/v1/payments/payos/webhook`

### 4. Test thanh toán thật!
- Quét QR bằng app ngân hàng
- Hệ thống tự động cập nhật trong vài giây! ✨

---

**Nếu gặp lỗi gì, xem file `PAYOS_INTEGRATION_GUIDE.md` để troubleshoot!**

