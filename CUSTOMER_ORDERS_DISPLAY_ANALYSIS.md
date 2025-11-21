# Phân Tích Hiển Thị Đơn Hàng Từ Customer Portal

## 📋 4 Câu Hỏi Cần Trả Lời

### 1. **Khi khách đặt bàn thì có hiển thị trong danh sách đặt bàn của thu ngân không?**

**Trả lời:** ✅ **CÓ, NHƯNG CHỈ TRONG DASHBOARD**

- ✅ Có nút "DS Đặt bàn" trong Dashboard
- ✅ Hiển thị trong `ReservationsList` component
- ❌ **KHÔNG có trong giao diện POS** (trang `/pos`)
- ⚠️ Thu ngân phải vào Dashboard để xem đặt bàn

**Vị trí:**
- `frontend/src/pages/Dashboard.jsx` - Có nút "DS Đặt bàn"
- `frontend/src/components/ReservationsList.jsx` - Component hiển thị danh sách

---

### 2. **Khi khách đặt đơn pickup thì có hiển thị cho thu ngân biết không?**

**Trả lời:** ✅ **CÓ**

- ✅ Hiển thị trong trang `/takeaway` (TakeawayOrders.jsx)
- ✅ Hiển thị trong `CurrentShiftOrders` (tab "Đơn hàng trong ca")
- ✅ SSE event tự động refresh khi có đơn mới
- ✅ Đã sửa lỗi "mồ côi" - đơn tự động gán vào ca đang mở

**Vị trí:**
- `frontend/src/pages/TakeawayOrders.jsx` - Trang quản lý đơn mang đi
- `frontend/src/components/CurrentShiftOrders.jsx` - Danh sách đơn trong ca

---

### 3. **Có hiển thị thông tin gì của khách hàng để xác nhận không?**

**Trả lời:** ❌ **CHƯA CÓ**

**Hiện tại:**
- ❌ Không hiển thị tên khách hàng
- ❌ Không hiển thị số điện thoại
- ❌ Không hiển thị email
- ❌ Chỉ hiển thị: Mã đơn, thời gian, món, trạng thái

**Backend có lưu:**
- ✅ `don_hang.khach_hang_id` - ID khách hàng
- ✅ `customer_accounts` - Bảng lưu thông tin khách hàng
- ⚠️ **NHƯNG API không trả về** thông tin này

**Cần cập nhật:**
- Cập nhật view `v_takeaway_pending` để JOIN với `customer_accounts`
- Hoặc cập nhật API `getTakeawayOrders` để trả về thông tin khách hàng

---

### 4. **Có phân biệt đơn mang đi được đặt trước và không được đặt trước không?**

**Trả lời:** ❌ **CHƯA CÓ**

**Hiện tại:**
- ❌ Không có field `order_source` trong database
- ❌ Không phân biệt đơn từ Customer Portal vs đơn tại quán
- ❌ Tất cả đơn TAKEAWAY hiển thị giống nhau

**Cần làm:**
- Thêm field `order_source` vào bảng `don_hang` (hoặc dùng `khach_hang_id` để phân biệt)
- Cập nhật frontend để hiển thị badge "Đặt trước" / "Tại quán"
- Hoặc dùng logic: `khach_hang_id IS NOT NULL` = đặt trước

---

## 📊 Tóm Tắt

| Câu hỏi | Trả lời | Ghi chú |
|---------|---------|---------|
| 1. Đặt bàn hiển thị trong POS? | ⚠️ Chỉ trong Dashboard | Cần thêm vào POS |
| 2. Đơn pickup hiển thị? | ✅ Có | Đã sửa lỗi "mồ côi" |
| 3. Thông tin khách hàng? | ❌ Chưa có | Cần cập nhật API |
| 4. Phân biệt đặt trước? | ❌ Chưa có | Cần thêm logic |

---

## 🔧 Cần Làm

### 1. **Thêm thông tin khách hàng vào đơn TAKEAWAY**
- Cập nhật view `v_takeaway_pending` hoặc query `getTakeawayOrders`
- JOIN với `customer_accounts` để lấy tên, SĐT
- Hiển thị trong frontend

### 2. **Phân biệt đơn đặt trước vs tại quán**
- Dùng `khach_hang_id IS NOT NULL` để phân biệt
- Hoặc thêm field `order_source` ('CUSTOMER_PORTAL', 'POS')
- Hiển thị badge trong frontend

### 3. **Thêm đặt bàn vào POS**
- Thêm nút "Đặt bàn" vào giao diện POS
- Hoặc sidebar hiển thị đặt bàn sắp tới

