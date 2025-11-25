# 📦 Giải Thích: Đơn Giao Hàng & Khách Hàng Có Tài Khoản vs Vãng Lai

**Ngày tạo:** 2025-01-XX

---

## ❓ **CÂU HỎI 1: Đơn Giao Hàng Có Hủy Được Không?**

### ✅ **TRẢ LỜI: CÓ, nhưng có điều kiện**

Đơn giao hàng (DELIVERY) **CÓ THỂ HỦY** với các điều kiện sau:

### **Điều Kiện Hủy Đơn:**

1. ✅ **Đơn phải ở trạng thái `OPEN`**
   - Không thể hủy đơn đã thanh toán (`PAID`)
   - Không thể hủy đơn đã hủy (`CANCELLED`)

2. ✅ **Tất cả món phải chưa bắt đầu làm**
   - Không có món nào ở trạng thái `MAKING` hoặc `DONE`
   - Nếu có món đã bắt đầu làm → **KHÔNG THỂ HỦY**
   - Phải liên hệ bếp/pha chế để hủy từng món trước

3. ✅ **Nhân viên phải có ca đang mở**
   - Phải mở ca làm việc trước khi hủy đơn

### **Cách Hủy Đơn Giao Hàng:**

#### **Từ POS (Thu ngân/Manager):**
```javascript
// API: POST /api/v1/pos/orders/:orderId/cancel
// Body: { reason: "Lý do hủy" }

// Logic trong backend/src/services/posService.js
async cancelOrderService({ orderId, userId, reason }) {
  // 1. Kiểm tra đơn tồn tại
  // 2. Kiểm tra trạng thái (không được PAID hoặc CANCELLED)
  // 3. Kiểm tra tất cả món chưa bắt đầu làm
  // 4. Cập nhật trạng thái = 'CANCELLED'
  // 5. Lưu lý do hủy
}
```

#### **Từ Customer Portal (Khách hàng):**
- ⚠️ **Hiện tại CHƯA có chức năng hủy đơn từ Customer Portal**
- Khách hàng phải gọi điện hoặc liên hệ quán để hủy

### **Lưu Ý Quan Trọng:**

1. **Đơn đã thanh toán (PAID):**
   - ❌ **KHÔNG THỂ HỦY** trực tiếp
   - Phải làm **HOÀN TIỀN** (refund) nếu muốn hủy

2. **Đơn đã bắt đầu giao hàng:**
   - Nếu `delivery_status = 'OUT_FOR_DELIVERY'` → Không nên hủy
   - Phải liên hệ shipper để quay lại

3. **Tự động hủy:**
   - Đơn TAKEAWAY tự động hủy sau **30 phút** nếu vẫn OPEN
   - Đơn DELIVERY **KHÔNG** tự động hủy (cần hủy thủ công)

---

## ❓ **CÂU HỎI 2: Khác Nhau Giữa Khách Hàng Có Tài Khoản và Khách Vãng Lai?**

### ✅ **TRẢ LỜI: Có nhiều khác biệt quan trọng**

---

## 📊 **BẢNG SO SÁNH CHI TIẾT**

| Tính năng | Khách có tài khoản | Khách vãng lai |
|-----------|-------------------|----------------|
| **Đăng nhập** | ✅ Có (phone/email + password) | ❌ Không |
| **Lưu thông tin** | ✅ Lưu trong `customer_accounts` | ⚠️ Chỉ lưu tạm thời |
| **Giỏ hàng** | ✅ Lưu theo `customer_account_id` | ✅ Lưu theo `session_id` |
| **Lịch sử đơn hàng** | ✅ Xem được tất cả đơn | ❌ Không xem được |
| **Theo dõi đơn hàng** | ✅ Xem trạng thái real-time | ❌ Không xem được |
| **Đặt lại đơn** | ✅ Có thể đặt lại đơn cũ | ❌ Không có |
| **Điểm tích lũy** | ⚠️ Có cột nhưng chưa tích điểm | ❌ Không có |
| **Thông báo** | ✅ Nhận thông báo đơn hàng | ❌ Không nhận |
| **Đặt bàn online** | ✅ Có thể đặt bàn | ❌ Không thể đặt bàn |
| **Chat với bot** | ✅ Lưu lịch sử chat | ⚠️ Chat tạm thời |

---

## 🔍 **CHI TIẾT KỸ THUẬT**

### **1. Database Schema**

#### **Khách có tài khoản:**
```sql
-- Bảng customer_accounts
CREATE TABLE customer_accounts (
  id SERIAL PRIMARY KEY,
  phone TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  loyalty_points INT DEFAULT 0,
  ...
);

-- Đơn hàng
don_hang (
  customer_account_id INT REFERENCES customer_accounts(id),
  -- customer_account_id = 123 (có giá trị)
)

-- Giỏ hàng
customer_cart (
  customer_account_id INT REFERENCES customer_accounts(id),
  session_id NULL,
  -- customer_account_id = 123, session_id = NULL
)
```

#### **Khách vãng lai:**
```sql
-- Đơn hàng
don_hang (
  customer_account_id NULL,
  -- customer_account_id = NULL
)

-- Giỏ hàng
customer_cart (
  customer_account_id NULL,
  session_id TEXT,
  -- customer_account_id = NULL, session_id = 'abc123xyz'
)
```

---

### **2. Tạo Đơn Hàng**

#### **Khách có tài khoản:**
```javascript
// Backend: backend/src/repositories/customerRepository.js
async createOrderFromCart({ customerId, orderType }) {
  // customerId = 123 (có giá trị)
  INSERT INTO don_hang (
    customer_account_id,  // = 123
    order_type,
    order_source = 'ONLINE'
  ) VALUES ($1, $2, $3)
}
```

**Kết quả:**
- ✅ `customer_account_id = 123`
- ✅ `order_source = 'ONLINE'`
- ✅ Có thể liên kết với tài khoản
- ✅ Xem được trong lịch sử đơn hàng

#### **Khách vãng lai:**
```javascript
// Backend: backend/src/repositories/customerRepository.js
async createOrderFromCart({ customerId = null, orderType }) {
  // customerId = null
  // Tạo customer account tạm thời (không có password)
  const guestCustomer = await upsertCustomer({
    fullName: customerInfo.fullName,
    phone: customerInfo.phone,
    email: customerInfo.email
  });
  
  INSERT INTO don_hang (
    customer_account_id,  // = guestCustomer.id (tạm thời)
    order_type,
    order_source = 'ONLINE'
  ) VALUES ($1, $2, $3)
}
```

**Kết quả:**
- ⚠️ `customer_account_id = 456` (tài khoản tạm thời, không có password)
- ✅ `order_source = 'ONLINE'`
- ❌ Không thể đăng nhập để xem lại
- ❌ Không có lịch sử đơn hàng

---

### **3. Giỏ Hàng**

#### **Khách có tài khoản:**
```javascript
// Frontend: localStorage.getItem('customerToken')
// Backend: Lưu theo customer_account_id

customer_cart (
  customer_account_id = 123,
  session_id = NULL,
  items = [{...}]
)
```

**Đặc điểm:**
- ✅ Giỏ hàng lưu vĩnh viễn
- ✅ Đồng bộ trên mọi thiết bị (nếu đăng nhập cùng tài khoản)
- ✅ Không mất khi đóng browser

#### **Khách vãng lai:**
```javascript
// Frontend: localStorage.getItem('sessionId') hoặc tạo mới
// Backend: Lưu theo session_id

customer_cart (
  customer_account_id = NULL,
  session_id = 'abc123xyz',
  items = [{...}]
)
```

**Đặc điểm:**
- ⚠️ Giỏ hàng lưu tạm thời (7 ngày)
- ❌ Chỉ lưu trên browser hiện tại
- ⚠️ Có thể mất nếu xóa localStorage/cookies
- ✅ Tự động xóa sau 7 ngày

---

### **4. Lịch Sử Đơn Hàng**

#### **Khách có tài khoản:**
```sql
-- API: GET /api/v1/customer/orders
SELECT * FROM don_hang 
WHERE customer_account_id = $1
ORDER BY opened_at DESC
```

**Kết quả:**
- ✅ Xem được TẤT CẢ đơn hàng đã đặt
- ✅ Xem chi tiết từng đơn
- ✅ Xem trạng thái real-time
- ✅ Có thể đặt lại đơn cũ

#### **Khách vãng lai:**
```sql
-- Không có API để xem lịch sử
-- Vì không có customer_account_id cố định
```

**Kết quả:**
- ❌ **KHÔNG XEM ĐƯỢC** lịch sử đơn hàng
- ❌ Phải nhớ số đơn để tra cứu
- ❌ Không thể đặt lại đơn cũ

---

### **5. Theo Dõi Đơn Hàng**

#### **Khách có tài khoản:**
```javascript
// API: GET /api/v1/customer/orders/:orderId
// Kiểm tra: customer_account_id = req.customer.customerId

// Có thể xem:
- Trạng thái đơn (OPEN, PAID, COMPLETED, CANCELLED)
- Thời gian ước tính
- Trạng thái giao hàng (nếu là DELIVERY)
- Chi tiết món
```

**Kết quả:**
- ✅ Xem được trạng thái real-time
- ✅ Nhận thông báo khi đơn thay đổi
- ✅ Xem được lịch sử giao hàng

#### **Khách vãng lai:**
```javascript
// Không có API để theo dõi
// Phải gọi điện hoặc đến quán để hỏi
```

**Kết quả:**
- ❌ **KHÔNG XEM ĐƯỢC** trạng thái
- ❌ Không nhận thông báo
- ❌ Phải tự liên hệ quán

---

### **6. Đặt Lại Đơn**

#### **Khách có tài khoản:**
```javascript
// API: POST /api/v1/customer/orders/:orderId/reorder
// Lấy đơn cũ → Tạo đơn mới với cùng món

// Có thể:
- Chọn đơn cũ từ lịch sử
- Click "Đặt lại"
- Tự động thêm vào giỏ hàng
- Chỉnh sửa trước khi đặt
```

**Kết quả:**
- ✅ Tiện lợi, nhanh chóng
- ✅ Không cần nhập lại món

#### **Khách vãng lai:**
```javascript
// Không có chức năng này
```

**Kết quả:**
- ❌ Phải đặt lại từ đầu
- ❌ Phải nhập lại tất cả món

---

### **7. Điểm Tích Lũy (Loyalty Points)**

#### **Khách có tài khoản:**
```sql
-- Bảng customer_accounts
loyalty_points INT DEFAULT 0

-- ⚠️ LƯU Ý: Hiện tại CHƯA có logic tích điểm tự động
-- Cột loyalty_points có trong database nhưng chưa được sử dụng
```

**Trạng thái hiện tại:**
- ⚠️ Database có cột `loyalty_points` (mặc định = 0)
- ⚠️ Backend API có trả về `loyaltyPoints` trong response
- ❌ **CHƯA CÓ** logic tự động tích điểm khi đặt hàng
- ❌ **CHƯA CÓ** UI hiển thị điểm tích lũy
- ❌ **CHƯA CÓ** chức năng đổi điểm lấy quà

**Kết quả:**
- ⚠️ Có cột trong database nhưng chưa hoạt động
- ❌ Chưa tích điểm tự động
- ❌ Chưa có UI để xem điểm

#### **Khách vãng lai:**
```sql
-- Không có điểm tích lũy
-- Vì không có customer_account_id cố định
```

**Kết quả:**
- ❌ **KHÔNG CÓ** điểm tích lũy
- ❌ Không được giảm giá từ điểm

---

### **8. Đặt Bàn Online**

#### **Khách có tài khoản:**
```javascript
// API: POST /api/v1/customer/reservations
// Body: { customer_account_id, ... }

// Có thể:
- Đặt bàn online
- Xem lịch sử đặt bàn
- Hủy đặt bàn
- Nhận thông báo
```

**Kết quả:**
- ✅ Đặt bàn dễ dàng
- ✅ Quản lý đặt bàn

#### **Khách vãng lai:**
```javascript
// Không có chức năng đặt bàn
// Vì cần đăng nhập
```

**Kết quả:**
- ❌ **KHÔNG THỂ** đặt bàn online
- ❌ Phải gọi điện

---

### **9. Chat với Bot**

#### **Khách có tài khoản:**
```javascript
// Backend: backend/src/repositories/chatbotRepository.js
chatbot_conversations (
  customer_account_id = 123,
  session_id = NULL
)

// Lưu lịch sử chat
// Có thể xem lại cuộc trò chuyện
```

**Kết quả:**
- ✅ Lưu lịch sử chat
- ✅ Xem lại cuộc trò chuyện
- ✅ Bot nhớ thông tin khách hàng

#### **Khách vãng lai:**
```javascript
// Backend: backend/src/repositories/chatbotRepository.js
chatbot_conversations (
  customer_account_id = NULL,
  session_id = 'abc123xyz'
)

// Chat tạm thời
// Mất khi đóng browser
```

**Kết quả:**
- ⚠️ Chat tạm thời
- ❌ Mất lịch sử khi đóng browser
- ⚠️ Bot không nhớ thông tin

---

## 📋 **TÓM TẮT**

### **Khách có tài khoản:**
- ✅ Đăng nhập được
- ✅ Lưu thông tin vĩnh viễn
- ✅ Xem lịch sử đơn hàng
- ✅ Theo dõi đơn hàng real-time
- ✅ Đặt lại đơn cũ
- ⚠️ Có cột điểm tích lũy (chưa hoạt động)
- ✅ Đặt bàn online
- ✅ Lưu lịch sử chat

### **Khách vãng lai:**
- ❌ Không đăng nhập được
- ⚠️ Lưu thông tin tạm thời
- ❌ Không xem được lịch sử
- ❌ Không theo dõi được đơn
- ❌ Không đặt lại được
- ❌ Không có điểm tích lũy (cả 2 đều chưa có)
- ❌ Không đặt bàn online
- ⚠️ Chat tạm thời

---

## 💡 **KHUYẾN NGHỊ**

### **Cho Khách Hàng:**
- ✅ **Nên đăng ký tài khoản** để:
  - Xem lịch sử đơn hàng
  - Theo dõi đơn hàng real-time
  - Đặt lại đơn cũ nhanh chóng
  - Đặt bàn online
  - ⚠️ Điểm tích lũy: Có cột trong database nhưng chưa hoạt động (sẽ có trong tương lai)

### **Cho Quán:**
- ✅ Khuyến khích khách đăng ký tài khoản
- ✅ Tặng điểm thưởng cho khách mới đăng ký
- ✅ Gửi email/SMS thông báo đơn hàng cho khách có tài khoản
- ✅ Hỗ trợ khách vãng lai qua điện thoại

---

**Cập nhật:** 2025-01-XX

