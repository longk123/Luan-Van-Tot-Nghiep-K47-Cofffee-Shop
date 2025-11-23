# Tổng hợp các thay đổi hệ thống khi Waiter có thể tạo đơn

## 📋 Tổng quan

Khi cho phép Waiter tạo đơn, hệ thống cần đảm bảo:
1. ✅ Tracking đúng người tạo đơn (Waiter) và người thanh toán (Cashier)
2. ✅ Báo cáo, thống kê tính đúng
3. ✅ Hóa đơn hiển thị đầy đủ thông tin
4. ✅ Báo cáo ca làm việc tính đúng doanh thu

---

## ✅ Đã hoàn thành

### 1. **Frontend - Quyền truy cập**
- ✅ Mở quyền Dashboard cho Waiter (`main.jsx`)
- ✅ Waiter tự động lấy ca Cashier đang mở
- ✅ Ẩn nút "Thanh toán" và "Hủy đơn" cho Waiter
- ✅ Hiển thị thông báo "Vui lòng gọi Cashier để thanh toán"

### 2. **Backend - Tạo đơn**
- ✅ Waiter tạo đơn tự động gắn với ca Cashier (`ca_lam_id`)
- ✅ Đơn track `nhan_vien_id` = Waiter (người tạo)
- ✅ Payment track `created_by` = Cashier (người thanh toán)

---

## 🔧 Cần thực hiện

### 1. **Cập nhật View Hóa đơn**

**File:** `backend/migrate-update-invoice-for-waiter.cjs`

**Thay đổi:**
- Cập nhật `v_invoice_header` để hiển thị:
  - `nguoi_tao_don`: Người tạo đơn (Waiter)
  - `thu_ngan`: Người thanh toán (Cashier, từ payment đầu tiên)
  - Giữ `thu_ngan` để backward compatibility

**Chạy migration:**
```bash
cd backend
node migrate-update-invoice-for-waiter.cjs
```

### 2. **Cập nhật Invoice PDF**

**File:** `backend/src/controllers/invoiceController.js`

**Thay đổi:**
- ✅ Đã cập nhật để hiển thị cả người tạo đơn và người thanh toán (nếu khác nhau)
- Hiển thị:
  - "Người tạo đơn: [Waiter]" (nếu khác người thanh toán)
  - "Thu ngân: [Cashier]"

### 3. **Cập nhật Frontend Invoice Display**

**File:** `frontend/src/pages/ManagerDashboard.jsx`

**Cần kiểm tra:**
- Hiển thị đúng `nguoi_tao_don` và `thu_ngan` trong chi tiết hóa đơn
- Nếu `nguoi_tao_don !== thu_ngan` → Hiển thị cả 2

**Vị trí:** Khoảng dòng 1500-1600 (phần hiển thị chi tiết invoice)

---

## ✅ Đã đúng (Không cần thay đổi)

### 1. **Báo cáo ca làm việc (Shift Reports)**

**File:** `backend/src/repositories/posRepository.js` - `getCurrentShiftOrders()`

**Lý do OK:**
- Query filter theo `ca_lam_id` → Đơn do Waiter tạo (có `ca_lam_id` của Cashier) sẽ được tính vào ca Cashier
- Hiển thị `nhan_vien_ten` (người tạo đơn) → Đúng

### 2. **Báo cáo doanh thu**

**File:** `backend/src/repositories/analyticsRepository.js`

**Lý do OK:**
- Các query tính doanh thu dựa trên `ca_lam_id` → Đúng
- Đơn do Waiter tạo có `ca_lam_id` của Cashier → Tính vào doanh thu ca Cashier

### 3. **Thống kê KPI**

**File:** `backend/src/repositories/analyticsRepository.js` - `getOverviewKPIs()`

**Lý do OK:**
- Tính doanh thu từ `closed_at` và `trang_thai = 'PAID'` → Đúng
- Không phụ thuộc vào `nhan_vien_id` → Đúng

### 4. **Payment Tracking**

**File:** `backend/src/controllers/paymentsController.js`

**Lý do OK:**
- `order_payment.created_by` = Người thanh toán (Cashier) → Đúng
- `order_payment.ca_lam_id` = Ca của Cashier → Đúng

---

## 📊 Kiểm tra các phần khác

### 1. **Báo cáo lợi nhuận (Profit Report)**

**File:** `backend/src/repositories/analyticsRepository.js` - `getProfitReport()`

**Status:** ✅ OK
- Tính theo `ca_lam_id` hoặc thời gian → Đúng
- Không phụ thuộc vào `nhan_vien_id` → Đúng

### 2. **Thống kê nhân viên**

**File:** `backend/src/repositories/userRepository.js` - `getUserStats()`

**Cần kiểm tra:**
- Nếu có thống kê "Số đơn tạo" → Cần đảm bảo tính đúng đơn do Waiter tạo
- Nếu có thống kê "Doanh thu" → Cần đảm bảo tính theo `ca_lam_id` (không phải `nhan_vien_id`)

### 3. **Báo cáo Top Menu Items**

**File:** `backend/src/repositories/analyticsRepository.js` - `getTopMenuItems()`

**Status:** ✅ OK
- Tính theo thời gian, không phụ thuộc vào `nhan_vien_id` → Đúng

---

## 🎯 Checklist Implementation

### Backend
- [x] Waiter tạo đơn gắn với ca Cashier
- [x] Payment track người thanh toán
- [ ] **Cập nhật view `v_invoice_header`** (migration)
- [x] Cập nhật invoice PDF

### Frontend
- [x] Mở quyền Dashboard cho Waiter
- [x] Ẩn nút thanh toán/hủy đơn
- [ ] **Cập nhật hiển thị invoice detail** (nếu cần)

### Testing
- [ ] Test Waiter tạo đơn → Kiểm tra `nhan_vien_id` và `ca_lam_id`
- [ ] Test Cashier thanh toán → Kiểm tra `order_payment.created_by`
- [ ] Test hóa đơn → Kiểm tra hiển thị đúng người tạo đơn và người thanh toán
- [ ] Test báo cáo ca → Kiểm tra đơn do Waiter tạo có trong ca Cashier
- [ ] Test báo cáo doanh thu → Kiểm tra tính đúng

---

## 📝 Lưu ý quan trọng

### 1. **Phân biệt người tạo đơn và người thanh toán**

- **Người tạo đơn (`nhan_vien_id`):** Waiter (hoặc Cashier nếu tự tạo)
- **Người thanh toán (`order_payment.created_by`):** Cashier (hoặc Manager)

### 2. **Ca làm việc**

- Đơn do Waiter tạo có `ca_lam_id` = Ca của Cashier
- Doanh thu tính vào ca Cashier
- Báo cáo ca hiển thị đúng

### 3. **Backward Compatibility**

- View `v_invoice_header` vẫn có `thu_ngan` (để tương thích)
- Thêm `nguoi_tao_don` để phân biệt rõ ràng

---

## 🚀 Các bước tiếp theo

1. **Chạy migration:**
   ```bash
   cd backend
   node migrate-update-invoice-for-waiter.cjs
   ```

2. **Kiểm tra invoice:**
   - Tạo đơn bằng Waiter
   - Thanh toán bằng Cashier
   - Xem hóa đơn → Kiểm tra hiển thị đúng

3. **Kiểm tra báo cáo:**
   - Xem báo cáo ca → Kiểm tra đơn do Waiter tạo
   - Xem báo cáo doanh thu → Kiểm tra tính đúng

4. **Test toàn bộ workflow:**
   - Waiter tạo đơn → Cashier thanh toán → Xem hóa đơn → Xem báo cáo

---

## ✅ Kết luận

Hệ thống đã được thiết kế tốt, chỉ cần:
1. ✅ Cập nhật view `v_invoice_header` (migration)
2. ✅ Cập nhật invoice PDF (đã làm)
3. ⚠️ Kiểm tra frontend invoice display (nếu cần)

Các phần báo cáo, thống kê đã đúng vì:
- Tính theo `ca_lam_id` (không phải `nhan_vien_id`)
- Đơn do Waiter tạo có `ca_lam_id` của Cashier → Tính đúng

