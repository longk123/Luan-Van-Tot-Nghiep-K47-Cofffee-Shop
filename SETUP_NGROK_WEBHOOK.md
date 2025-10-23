# 🌐 Hướng dẫn Setup Ngrok + PayOS Webhook

## ✅ Bước 1: Ngrok đang chạy

Ngrok đã được khởi động trong background. 

**Mở terminal mới** và chạy lệnh này để xem public URL:

```bash
ngrok http 5000
```

Bạn sẽ thấy output như này:

```
Session Status                online
Account                       your-email@example.com
Version                       3.24.0
Region                        Asia Pacific (ap)
Latency                       -
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123.ngrok-free.app -> http://localhost:5000

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

**Copy URL này**: `https://abc123.ngrok-free.app` ← (URL của bạn sẽ khác)

---

## 🔧 Bước 2: Cấu hình Webhook trên PayOS Dashboard

### 1. Đăng nhập PayOS:
- Vào: https://my.payos.vn
- Login bằng tài khoản bạn đã tạo PayOS credentials

### 2. Vào Settings → Webhook:
- Click menu bên trái → **Cài đặt** hoặc **Settings**
- Tìm phần **Webhook URL** hoặc **Notification URL**

### 3. Nhập Webhook URL:
```
https://abc123.ngrok-free.app/api/v1/payments/payos/webhook
```
*(Thay `abc123.ngrok-free.app` bằng URL ngrok của bạn)*

### 4. Save/Lưu cấu hình

---

## 🧪 Bước 3: Test Webhook

### 1. Tạo thanh toán mới:
- Vào POS → Click "Thanh toan online"
- QR sẽ hiển thị

### 2. Thanh toán (Sandbox):
- Click "🌐 Mở trang thanh toán"
- Trên trang PayOS sandbox, click "Thanh toán" (giả lập)

### 3. Xem backend logs:

Nếu webhook hoạt động, bạn sẽ thấy:

```
📦 PayOS Webhook received: {...}
✅ PayOS Webhook: Valid signature
💰 PayOS Webhook: Payment PAID
```

### 4. UI tự động cập nhật:
- Order tự động đóng
- Hiển thị "Thanh toán thành công ✅"
- Có thể in hóa đơn

---

## 🔍 Debug (Nếu webhook không hoạt động)

### 1. Xem ngrok requests:
Mở trình duyệt: **http://127.0.0.1:4040**

Đây là **ngrok dashboard** - xem tất cả requests đến từ PayOS!

### 2. Kiểm tra backend logs:
```bash
# Xem terminal đang chạy npm run dev
# Tìm dòng có "Webhook received"
```

### 3. Test webhook thủ công:

```bash
curl -X POST https://abc123.ngrok-free.app/api/v1/payments/payos/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

Nếu backend logs hiển thị webhook received → Ngrok hoạt động!

---

## ⚠️ Lưu ý:

- Ngrok URL sẽ **đổi mỗi lần restart** (trừ khi dùng paid plan)
- Nếu restart ngrok → phải **cập nhật lại webhook URL** trên PayOS
- Ngrok free có **giới hạn requests/phút**

---

## 🎉 Khi hoàn tất:

Bạn sẽ có hệ thống thanh toán online **hoàn chỉnh**:
- ✅ QR code từ PayOS thật
- ✅ Webhook realtime tự động
- ✅ UI update không cần refresh
- ✅ Production-ready!

---

**Tiếp theo:**
1. Chạy `ngrok http 5000` trong terminal mới
2. Copy URL (vd: `https://abc123.ngrok-free.app`)
3. Cấu hình trên PayOS Dashboard
4. Test thanh toán!

