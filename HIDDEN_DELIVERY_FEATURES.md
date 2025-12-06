# Các tính năng Giao hàng (Delivery) đã được ẨN

**Ngày cập nhật:** 2024

## Mục đích
Để đơn giản hóa hệ thống cho bài luận văn, các tính năng liên quan đến **Giao hàng (Delivery)** đã được ẨN (không xóa code).

## Các file đã chỉnh sửa

### 1. `frontend/src/main.jsx`
- ❌ Comment out import `WaiterDeliveryPage`
- ❌ Comment out route `/waiter/delivery`

### 2. `frontend/src/pages/Dashboard.jsx`
- ❌ Ẩn tab "Giao hàng" trong filter (thay bằng `{false && ...}`)
- ❌ Ẩn nút "Ví giao hàng" cho Waiter
- ❌ Ẩn nút "Quản lý tiền thu hộ" cho Cashier/Manager

### 3. `frontend/src/pages/Kitchen.jsx`
- ❌ Ẩn nút filter "Giao hàng" (thêm `{false && ...}`)

### 4. `frontend/src/pages/ManagerDashboard.jsx`
- ❌ Comment out tab "Phục vụ & Giao hàng" (waiter-delivery)
- ❌ Comment out tab "Ví Shipper" (shipper-wallet)

### 5. `frontend/src/pages/customer/CheckoutPage.jsx`
- ❌ Ẩn nút chọn "Giao hàng" trong phần loại đơn hàng

### 6. `frontend/src/pages/TakeawayOrders.jsx`
- ❌ Ẩn tab "Giao hàng"
- ❌ Ẩn tab "Tất cả" (vì bao gồm delivery)

## Cách khôi phục

Nếu muốn bật lại tính năng giao hàng:

1. **main.jsx**: Bỏ comment import và route `WaiterDeliveryPage`
2. **Dashboard.jsx**: Xóa `{false && ...}` trước các phần đã ẩn
3. **Kitchen.jsx**: Xóa `{false && ...}` trước nút filter Giao hàng
4. **ManagerDashboard.jsx**: Bỏ comment các tab waiter-delivery và shipper-wallet
5. **CheckoutPage.jsx**: Xóa `{false && (...)}` quanh nút Giao hàng
6. **TakeawayOrders.jsx**: Xóa `{false && (...)}` quanh các tab

## Ghi chú

- Code không bị xóa, chỉ bị ẩn bằng điều kiện `false &&` hoặc comment
- Các tính năng backend vẫn hoạt động bình thường
- Nếu có đơn giao hàng cũ trong database, chúng vẫn hiển thị đúng trong lịch sử đơn hàng
