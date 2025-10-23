# Hướng dẫn tích hợp PayOS Payment Gateway

## 📋 Tổng quan

Đã tích hợp thành công PayOS Payment Gateway vào hệ thống POS. Khách hàng có thể thanh toán qua:
- 🏦 VietQR (quét mã QR bằng app ngân hàng)
- 💳 Thẻ ATM/Visa/Mastercard
- 📱 Ví điện tử (MoMo, ZaloPay, ShopeePay, ViettelPay)

## 🔧 Các file đã thêm/sửa đổi

### Backend

1. **Migration SQL**: `backend/migrate-add-payment-gateway.sql`
   - Tạo bảng `payment_transaction` để lưu giao dịch
   - Thêm các phương thức thanh toán mới

2. **PayOS Client**: `backend/src/lib/payosClient.js`
   - Tích hợp API PayOS
   - Hỗ trợ tạo payment request, kiểm tra trạng thái, verify webhook

3. **Controller**: `backend/src/controllers/paymentsController.js`
   - `createPayOSPayment`: Tạo payment request
   - `payOSWebhook`: Xử lý webhook từ PayOS
   - `checkPayOSStatus`: Kiểm tra trạng thái thanh toán

4. **Routes**: `backend/src/routes/payments.js`
   - `POST /api/v1/payments/payos/create`
   - `POST /api/v1/payments/payos/webhook` (public endpoint)
   - `GET /api/v1/payments/payos/status/:refCode`

5. **Express Setup**: `backend/index.js`
   - Thêm middleware để preserve raw body cho webhook verification

### Frontend

1. **Component**: `frontend/src/components/PaymentQRPanel.jsx`
   - Hiển thị QR code thanh toán
   - Realtime update qua SSE khi nhận được tiền
   - Tự động refresh order khi thanh toán thành công

2. **Payment Section**: `frontend/src/components/PaymentSection.jsx`
   - Tích hợp PaymentQRPanel
   - Hiển thị khi chọn phương thức PAYOS

3. **API Client**: `frontend/src/api.js`
   - `createPayOSPayment(orderId, amount)`
   - `checkPayOSStatus(refCode)`

## 🚀 Hướng dẫn setup

### Bước 1: Chạy Migration

```bash
cd backend
psql -U postgres -d coffee_shop -f migrate-add-payment-gateway.sql
```

### Bước 2: Tạo file .env

Tạo file `backend/.env` với nội dung:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=123456
DB_NAME=coffee_shop

# Server Configuration
NODE_ENV=development
PORT=5000

# JWT Secret
JWT_SECRET=your-secret-key-here-change-in-production

# PayOS Configuration
PAYOS_CLIENT_ID=0f56e2e5-13bb-4220-a12d-5781092d7142
PAYOS_API_KEY=f642422d-01bb-45ff-b71c-e83896e6115c
PAYOS_CHECKSUM_KEY=6df7fb8cae0659eb2f0fc2e90554dac114c0c483c1a4876e8ac5fe1bc5c22268
PAYOS_API_URL=https://api-merchant.payos.vn
WEBHOOK_SECRET=6df7fb8cae0659eb2f0fc2e90554dac114c0c483c1a4876e8ac5fe1bc5c22268
APP_BASE_URL=http://localhost:5000
```

### Bước 3: Khởi động server

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (terminal khác)
cd frontend
npm run dev
```

## 🧪 Test local với ngrok

### 1. Cài đặt ngrok

```bash
# Download từ https://ngrok.com/download
# Hoặc dùng chocolatey (Windows)
choco install ngrok
```

### 2. Expose local server

```bash
ngrok http 5000
```

Bạn sẽ nhận được URL như: `https://abc123.ngrok-free.app`

### 3. Cấu hình webhook trên PayOS

1. Đăng nhập vào [PayOS Dashboard](https://my.payos.vn)
2. Vào **Cấu hình > Webhook**
3. Nhập URL: `https://abc123.ngrok-free.app/api/v1/payments/payos/webhook`
4. Lưu cấu hình

### 4. Test thanh toán

1. Mở ứng dụng POS tại `http://localhost:3000`
2. Tạo đơn hàng
3. Chọn phương thức thanh toán **PayOS**
4. Click "Tạo mã thanh toán PayOS"
5. Quét QR code bằng app ngân hàng (sandbox)
6. Xác nhận thanh toán
7. Hệ thống sẽ tự động cập nhật trong vài giây

## 📱 Flow thanh toán

```
1. Nhân viên chọn "PayOS" trong Payment Section
   ↓
2. Click "Tạo mã thanh toán PayOS"
   ↓
3. Frontend gọi POST /api/v1/payments/payos/create
   ↓
4. Backend tạo payment_transaction (status: PENDING)
   ↓
5. Backend gọi PayOS API để tạo payment request
   ↓
6. PayOS trả về checkoutUrl và qrUrl
   ↓
7. Frontend hiển thị QR code cho khách hàng
   ↓
8. Khách hàng quét QR và thanh toán
   ↓
9. PayOS gửi webhook đến /api/v1/payments/payos/webhook
   ↓
10. Backend verify signature và xử lý webhook
    ↓
11. Backend cập nhật payment_transaction (status: PAID)
    ↓
12. Backend tạo order_payment record
    ↓
13. Backend emit SSE event "PAYMENT_UPDATE"
    ↓
14. Frontend nhận SSE event và refresh UI
    ↓
15. Hiển thị "Thanh toán thành công ✅"
```

## 🔒 Security

### Webhook Verification

Webhook từ PayOS được verify bằng HMAC-SHA256 signature:

```javascript
const signature = req.headers['x-payos-signature'];
const rawBody = req.rawBody; // Raw JSON string
const isValid = verifyWebhookSignature(rawBody, signature);
```

**Important**: Middleware trong `index.js` phải preserve raw body để verify signature chính xác.

### Database

- `payment_transaction.gateway_txn_id` có UNIQUE INDEX để tránh duplicate webhook
- Status check trước khi process: nếu đã PAID thì skip (idempotency)
- Transaction được wrap trong DB transaction để đảm bảo consistency

## 📊 Database Schema

### Bảng `payment_transaction`

| Column | Type | Description |
|--------|------|-------------|
| id | bigserial | Primary key |
| order_id | int4 | FK đến don_hang |
| payment_method_code | text | 'PAYOS' |
| ref_code | varchar(128) | Mã tham chiếu hệ thống (timestamp + random) |
| gateway_txn_id | varchar(256) | Transaction ID từ PayOS |
| gateway_payload | jsonb | Toàn bộ webhook payload (debug) |
| amount | bigint | Số tiền (VND) |
| currency | varchar(12) | 'VND' |
| status | varchar(32) | PENDING, PAID, FAILED, REFUNDED |
| created_at | timestamptz | Thời gian tạo |
| updated_at | timestamptz | Thời gian cập nhật |

## 🎯 Features

✅ Tạo QR code thanh toán realtime
✅ Hiển thị checkout URL cho khách
✅ Auto-refresh UI khi nhận được webhook
✅ Idempotent webhook processing
✅ Signature verification
✅ Multi-tender support (có thể kết hợp với tiền mặt)
✅ Payment history tracking
✅ Error handling và retry logic

## 🐛 Troubleshooting

### Webhook không nhận được

1. Kiểm tra ngrok đang chạy: `ngrok http 5000`
2. Kiểm tra webhook URL đã cấu hình đúng trên PayOS Dashboard
3. Xem logs trong terminal backend
4. Test thử bằng curl (xem phần dưới)

### Test webhook thủ công bằng curl

```bash
# Tính signature (Linux/Mac)
RAW='{"code":"00","desc":"success","data":{"orderCode":1729599123456,"amount":50000,"reference":"FT12345","transactionDateTime":"2025-10-22T10:30:00+07:00"}}'
SIG=$(printf "%s" "$RAW" | openssl dgst -sha256 -hmac "6df7fb8cae0659eb2f0fc2e90554dac114c0c483c1a4876e8ac5fe1bc5c22268" | sed 's/^.* //')

# Gọi webhook
curl -X POST http://localhost:5000/api/v1/payments/payos/webhook \
  -H "Content-Type: application/json" \
  -H "x-payos-signature: $SIG" \
  -d "$RAW"
```

### QR code không hiển thị

1. Kiểm tra PayOS credentials trong `.env`
2. Xem response từ PayOS API trong backend logs
3. Kiểm tra `PAYOS_API_URL` có đúng không

### Payment không tự động cập nhật

1. Kiểm tra SSE connection: mở DevTools > Network > Filter "events"
2. Kiểm tra webhook đã được gọi chưa (xem backend logs)
3. Thử click nút "Kiểm tra trạng thái" để poll manually

## 📝 Notes

- **Sandbox Environment**: PayOS credentials hiện tại là sandbox, chỉ dùng để test
- **Production**: Khi deploy production cần:
  - Đổi credentials sang production keys
  - Cấu hình webhook URL production
  - Đổi `APP_BASE_URL` sang domain thật
  - Enable SSL/HTTPS
  
- **Refund**: Hiện tại chưa implement refund qua PayOS API (chỉ có refund manual)
- **Timeout**: PayOS payment request hết hạn sau 15 phút

## 🎉 Hoàn tất!

Hệ thống PayOS đã sẵn sàng sử dụng. Chúc bạn test thành công! 🚀

---

**Người thực hiện**: AI Assistant  
**Ngày tích hợp**: 22/10/2025  
**Version**: 1.0.0

