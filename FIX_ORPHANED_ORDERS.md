# Sửa Lỗi Đơn Hàng "Mồ Côi" Từ Customer Portal

## 🐛 Vấn Đề

Khi khách hàng đặt hàng từ Customer Portal:
- ❌ Order được tạo với `ca_lam_id = NULL`
- ❌ Query `getCurrentShiftOrders` chỉ lấy đơn có `ca_lam_id = $1`
- ❌ **Đơn hàng KHÔNG hiển thị** trong giao diện thu ngân
- ❌ Thu ngân không biết có đơn mới từ website

## ✅ Giải Pháp Đã Áp Dụng

### 1. **Tự Động Gán Vào Ca Đang Mở**

**File:** `backend/src/repositories/customerRepository.js`

Khi tạo order từ Customer Portal:
- ✅ Tự động tìm ca CASHIER đang mở
- ✅ Gán `ca_lam_id` vào order
- ✅ Nếu không có ca đang mở, `ca_lam_id = NULL` (sẽ được gán khi mở ca mới)

```javascript
// Tự động gán vào ca CASHIER đang mở (nếu có)
let caLamId = null;
try {
  const { default: shiftsRepository } = await import('../repositories/shiftsRepository.js');
  const openShift = await shiftsRepository.getOpenCashierShift();
  if (openShift && openShift.id) {
    caLamId = openShift.id;
  }
} catch (error) {
  // Nếu không lấy được ca, vẫn tạo đơn với ca_lam_id = NULL
}
```

### 2. **SSE Event Real-time**

**File:** `backend/src/services/customerService.js`

Khi tạo order xong:
- ✅ Emit SSE event `order.created`
- ✅ Emit SSE event `order.updated`
- ✅ Frontend tự động refresh danh sách đơn

```javascript
emitEvent('order.created', { 
  orderId: order.id, 
  orderType: order.order_type,
  source: 'customer_portal',
  ca_lam_id: order.ca_lam_id 
});
emitEvent('order.updated', { orderId: order.id });
```

## 📊 Kết Quả

### **Trước khi sửa:**
- ❌ Đơn từ Customer Portal: `ca_lam_id = NULL`
- ❌ Không hiển thị trong POS
- ❌ Thu ngân không biết có đơn mới

### **Sau khi sửa:**
- ✅ Đơn từ Customer Portal: `ca_lam_id = <ca đang mở>`
- ✅ Hiển thị ngay trong POS
- ✅ SSE event thông báo real-time
- ✅ Thu ngân thấy đơn mới ngay lập tức

## 🔄 Flow Hoạt Động

1. **Khách hàng đặt hàng từ Customer Portal**
   - Tạo order với `ca_lam_id = <ca đang mở>`
   - Emit SSE event `order.created`

2. **Frontend POS nhận SSE event**
   - Tự động refresh danh sách đơn
   - Hiển thị đơn mới ngay lập tức

3. **Thu ngân thấy đơn mới**
   - Đơn hiển thị trong `CurrentShiftOrders`
   - Có thể xử lý đơn như bình thường

## ⚠️ Trường Hợp Đặc Biệt

### **Không có ca đang mở:**
- Order được tạo với `ca_lam_id = NULL`
- Khi mở ca mới, tự động gán các đơn `ca_lam_id = NULL` vào ca mới
- (Logic này đã có sẵn trong `shiftsRepository.openShift`)

## ✅ Test

1. Mở ca làm việc (POS)
2. Khách hàng đặt hàng từ Customer Portal
3. Kiểm tra:
   - ✅ Đơn hiển thị trong POS ngay lập tức
   - ✅ Đơn có `ca_lam_id` = ca đang mở
   - ✅ SSE event được gửi

## 📝 Files Đã Sửa

1. `backend/src/repositories/customerRepository.js`
   - Thêm logic tự động gán `ca_lam_id`

2. `backend/src/services/customerService.js`
   - Thêm SSE event khi tạo order

