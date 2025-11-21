# Trạng Thái Hiển Thị Đơn Hàng Trong Giao Diện Thu Ngân (POS)

## 📊 Tóm Tắt

### ✅ **ĐÃ HIỂN THỊ:**

1. **Đơn tại bàn (DINE_IN)**
   - ✅ Hiển thị trong `CurrentShiftOrders.jsx`
   - ✅ Hiển thị tên bàn và khu vực
   - ✅ Badge màu nâu

2. **Đơn mang đi (TAKEAWAY)**
   - ✅ Hiển thị trong `CurrentShiftOrders.jsx`
   - ✅ Hiển thị trong `TakeawayOrders.jsx` (trang riêng)
   - ✅ Badge màu cam
   - ⚠️ Không phân biệt nguồn (POS hay Customer Portal)

### ❌ **CHƯA HIỂN THỊ:**

1. **Đơn giao hàng (DELIVERY)**
   - ❌ **KHÔNG hiển thị** trong `CurrentShiftOrders.jsx`
   - ❌ **KHÔNG hiển thị** trong `TakeawayOrders.jsx`
   - ✅ Backend API đã trả về DELIVERY orders
   - ⚠️ **CẦN CẬP NHẬT** frontend để hiển thị

2. **Đặt bàn (Reservations)**
   - ✅ Hiển thị trong Dashboard (`ReservationsList.jsx`)
   - ❌ **KHÔNG hiển thị** trong giao diện POS
   - ⚠️ Thu ngân phải vào Dashboard để xem đặt bàn

## 🔧 Đã Cập Nhật

### 1. **CurrentShiftOrders.jsx**
- ✅ Thêm hiển thị DELIVERY orders
- ✅ Badge màu xanh cho DELIVERY
- ✅ Hiển thị "Giao hàng" thay vì "Mang đi"

## 📝 Cần Làm Thêm

### 1. **Hiển Thị Đặt Bàn Trong POS**
- [ ] Thêm nút "Đặt bàn" vào giao diện POS
- [ ] Hoặc hiển thị danh sách đặt bàn sắp tới trong sidebar
- [ ] Cho phép thu ngân check-in đặt bàn từ POS

### 2. **Phân Biệt Nguồn Đơn Hàng**
- [ ] Thêm badge "Từ website" cho đơn từ Customer Portal
- [ ] Hoặc icon khác biệt cho đơn online

### 3. **Chi Tiết Đơn Giao Hàng**
- [ ] Hiển thị địa chỉ giao hàng trong modal chi tiết
- [ ] Hiển thị số điện thoại người nhận
- [ ] Hiển thị khoảng cách và phí ship

## 🎯 Kết Luận

**Hiện tại:**
- ✅ Đơn tại bàn: Hiển thị đầy đủ
- ✅ Đơn mang đi: Hiển thị đầy đủ
- ✅ Đơn giao hàng: **ĐÃ CẬP NHẬT** - hiển thị trong CurrentShiftOrders
- ⚠️ Đặt bàn: Chỉ hiển thị trong Dashboard, không có trong POS

**Khuyến nghị:**
- Nên thêm đặt bàn vào giao diện POS để thu ngân dễ quản lý
- Có thể thêm tab "Đặt bàn" hoặc sidebar hiển thị đặt bàn sắp tới

