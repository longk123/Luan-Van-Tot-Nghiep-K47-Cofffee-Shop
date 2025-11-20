# 📦 Giải thích phần "Mang đi" (Takeaway) trong Customer Portal

## 🎯 Tổng quan

Phần "Mang đi" cho phép khách hàng đặt hàng online để mang về, không cần ngồi tại quán.

---

## 🔄 Quy trình hoạt động

### 1. **Chọn loại đơn hàng**
- Khách hàng chọn **"Mang đi"** hoặc **"Tại quán"**
- Khi chọn "Mang đi":
  - Hiển thị form **"Thông tin nhận hàng"**
  - Ẩn phần **"Chọn bàn"** (chỉ có khi chọn "Tại quán")

### 2. **Nhập thông tin**

#### **Thông tin khách hàng** (Bắt buộc):
- Họ tên *
- Số điện thoại *
- Email (tùy chọn)

#### **Thông tin nhận hàng** (Chỉ hiện khi chọn "Mang đi"):
- **Thời gian nhận hàng** * (required)
  - Khách chọn thời gian muốn đến lấy hàng
  - Format: `HH:mm` (ví dụ: 14:30)
- **Địa chỉ nhận hàng** (tùy chọn)
  - Nếu có delivery service
- **Ghi chú** (tùy chọn)
  - Yêu cầu đặc biệt, ví dụ: "Ít đá", "Không đường"

### 3. **Tạo đơn hàng**

Khi khách click **"Đặt hàng"**:

```javascript
// 1. Tạo đơn hàng TAKEAWAY (không có bàn)
orderResponse = await api.createTakeawayOrder();
// → POST /api/v1/pos/orders
// → Body: { order_type: 'TAKEAWAY' }
// → Tạo đơn với ban_id = NULL, order_type = 'TAKEAWAY'

// 2. Thêm items từ cart vào đơn
for (const item of cart.items) {
  await api.addItemToOrder(orderId, {
    mon_id: item.item_id,
    bien_the_id: item.variant_id,
    so_luong: item.quantity,
    // + options/toppings nếu có
  });
}

// 3. Áp dụng promo code (nếu có)
if (cart.promoCode) {
  await api.applyPromoCode(orderId, cart.promoCode);
}

// 4. Thanh toán
if (paymentMethod === 'ONLINE') {
  // Redirect đến PayOS
  window.location.href = paymentResponse.data.checkoutUrl;
} else {
  // Thanh toán tiền mặt
  await api.checkoutOrder(orderId, 'CASH');
  // → Đơn chuyển sang trạng thái PAID
}

// 5. Xóa giỏ hàng và redirect
await customerApi.clearCart();
navigate('/customer/orders/success?orderId=' + orderId);
```

---

## 📊 Database Schema

### Bảng `don_hang`:
```sql
- id: SERIAL PRIMARY KEY
- ban_id: NULL (vì không có bàn)
- order_type: 'TAKEAWAY'
- order_source: 'ONLINE' (từ customer portal)
- customer_account_id: ID khách hàng (nếu đã đăng nhập)
- trang_thai: 'OPEN' → 'PAID' → 'COMPLETED'
- opened_at: Thời gian đặt hàng
- closed_at: Thời gian thanh toán
```

### Đặc điểm:
- ✅ `ban_id = NULL` (không gắn với bàn nào)
- ✅ `order_type = 'TAKEAWAY'`
- ✅ Tự động hủy sau 30 phút nếu vẫn OPEN (backend tự xử lý)
- ✅ Hiển thị trong trang "Takeaway Orders" của staff

---

## 🆚 So sánh: Mang đi vs Tại quán

| Tính năng | Mang đi (TAKEAWAY) | Tại quán (DINE_IN) |
|-----------|-------------------|-------------------|
| **Bàn** | Không cần | Phải chọn bàn |
| **Thông tin nhận hàng** | Có (thời gian, địa chỉ) | Không |
| **ban_id** | NULL | ID của bàn |
| **Hiển thị ở đâu** | Takeaway Orders page | POS Dashboard (theo bàn) |
| **Tự động hủy** | Sau 30 phút nếu OPEN | Không (phải thanh toán) |

---

## 🔍 Code Flow

### Frontend (`CheckoutPage.jsx`):

```javascript
// 1. State
const [orderType, setOrderType] = useState('TAKEAWAY');
const [deliveryInfo, setDeliveryInfo] = useState({
  deliveryTime: '',      // Thời gian nhận hàng
  deliveryAddress: '',   // Địa chỉ (optional)
  notes: ''             // Ghi chú
});

// 2. UI hiển thị
{orderType === 'TAKEAWAY' && (
  <div>
    <h2>Thông tin nhận hàng</h2>
    <input type="time" value={deliveryInfo.deliveryTime} />
    <input type="text" value={deliveryInfo.deliveryAddress} />
    <textarea value={deliveryInfo.notes} />
  </div>
)}

// 3. Submit
if (orderType === 'TAKEAWAY') {
  orderResponse = await api.createTakeawayOrder();
}
```

### Backend (`posRepository.js`):

```javascript
// Tạo đơn mang đi
async createOrderNoTable({ nhanVienId, caLamId }) {
  const sql = `
    INSERT INTO don_hang (ban_id, nhan_vien_id, ca_lam_id, trang_thai, order_type)
    VALUES (NULL, $1, $2, 'OPEN', 'TAKEAWAY')
    RETURNING *;
  `;
  // ban_id = NULL → không gắn với bàn
  // order_type = 'TAKEAWAY' → đơn mang đi
}
```

---

## ⚠️ Lưu ý

### 1. **Thông tin nhận hàng chưa được lưu**
- Hiện tại `deliveryInfo` (thời gian, địa chỉ) chưa được lưu vào database
- Có thể lưu vào:
  - `don_hang.ghi_chu` (tạm thời)
  - Hoặc tạo bảng `don_hang_delivery_info` riêng

### 2. **Tự động hủy đơn**
- Backend tự động hủy đơn TAKEAWAY nếu:
  - `trang_thai = 'OPEN'`
  - `opened_at < NOW() - INTERVAL '30 minutes'`
- Điều này tránh đơn "treo" quá lâu

### 3. **Customer Account**
- Nếu khách đã đăng nhập: `customer_account_id` được lưu
- Nếu khách chưa đăng nhập: `customer_account_id = NULL`, dùng `session_id`

---

## 🚀 Cải thiện có thể thêm

1. **Lưu thông tin nhận hàng:**
   - Tạo bảng `don_hang_delivery_info`
   - Lưu `delivery_time`, `delivery_address`, `notes`

2. **Thông báo cho staff:**
   - Khi có đơn TAKEAWAY mới → hiển thị trong Takeaway Orders page
   - SSE (Server-Sent Events) để real-time update

3. **Tính phí giao hàng:**
   - Nếu có delivery service
   - Thêm vào tổng tiền

4. **Tracking đơn hàng:**
   - Trạng thái: Đang chuẩn bị → Sẵn sàng → Đã lấy
   - Thông báo cho khách khi đơn sẵn sàng

---

## 📝 Tóm tắt

**"Mang đi"** là tính năng cho phép khách hàng:
- ✅ Đặt hàng online không cần bàn
- ✅ Chọn thời gian nhận hàng
- ✅ Thanh toán online hoặc tiền mặt
- ✅ Đơn được tạo với `order_type = 'TAKEAWAY'`, `ban_id = NULL`
- ✅ Hiển thị trong Takeaway Orders page cho staff xử lý

