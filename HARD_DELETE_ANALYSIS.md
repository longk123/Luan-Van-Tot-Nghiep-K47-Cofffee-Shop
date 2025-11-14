# Phân Tích Hard Delete vs Soft Delete

## 📊 Tổng Quan

Hệ thống hiện tại đang dùng **HỖN HỢP** cả hard delete và soft delete. Sau đây là phân tích chi tiết:

---

## ✅ Đang Dùng Soft Delete (ĐÚNG)

### 1. **Users/Employees** ✅
- **File**: `backend/src/repositories/userRepository.js`
- **Method**: `softDelete(userId)`
- **Cách**: `UPDATE users SET is_active = FALSE`
- **Status**: ✅ Đã đúng

### 2. **Menu Items (Món)** ✅
- **File**: `backend/src/controllers/menuCRUDController.js`
- **Method**: `deleteItem()`
- **Cách**: `UPDATE mon SET active = false`
- **Status**: ✅ Đã đúng

### 3. **Menu Categories (Danh mục)** ✅
- **File**: `backend/src/controllers/menuCRUDController.js`
- **Method**: `deleteCategory()`
- **Cách**: `UPDATE loai_mon SET active = false`
- **Status**: ✅ Đã đúng

---

## ❌ Đang Dùng Hard Delete (CẦN ĐỔI)

### 1. **Areas (Khu vực)** ⚠️ CẦN ĐỔI
- **File**: `backend/src/repositories/areasRepository.js`
- **Method**: `deleteAreaHard(id)`
- **Hiện tại**: `DELETE FROM khu_vuc WHERE id=$1`
- **Đã có**: `toggleAreaActive(id)` - nhưng route DELETE vẫn dùng hard delete
- **Vấn đề**: 
  - Mất dữ liệu lịch sử
  - Có thể ảnh hưởng đến báo cáo
  - Đã có `active` field nhưng không dùng
- **Giải pháp**: 
  - Route DELETE nên dùng `toggleAreaActive` hoặc `UPDATE khu_vuc SET active = false`
  - Hoặc thêm `deleted_at` column

### 2. **Tables (Bàn)** ⚠️ CẦN ĐỔI
- **File**: `backend/src/repositories/tablesRepository.js`
- **Method**: `removeTable(id)`
- **Hiện tại**: `DELETE FROM ban WHERE id=$1`
- **Vấn đề**:
  - Mất dữ liệu lịch sử về bàn đã từng có
  - Có thể ảnh hưởng đến báo cáo doanh thu theo bàn
- **Giải pháp**:
  - Thêm `is_deleted BOOLEAN DEFAULT FALSE` hoặc `deleted_at TIMESTAMP`
  - Đổi `removeTable` thành soft delete

### 3. **Promotions (Khuyến mãi)** ⚠️ CẦN ĐỔI
- **File**: `backend/src/repositories/promotionRepository.js`
- **Method**: `delete(id)`
- **Hiện tại**: `DELETE FROM khuyen_mai WHERE id = $1`
- **Đã có**: `toggleActive(id, active)` method
- **Vấn đề**:
  - Mất lịch sử khuyến mãi đã áp dụng
  - Có thể ảnh hưởng đến báo cáo doanh thu
- **Giải pháp**:
  - Route DELETE nên dùng `toggleActive(id, false)` thay vì hard delete
  - Hoặc thêm `deleted_at` column

---

## ⚠️ CẦN XEM XÉT

### 1. **Order Items (Chi tiết đơn hàng)** - CÓ THỂ GIỮ HARD DELETE
- **File**: `backend/src/controllers/posItemsController.js`
- **Method**: `deleteOrderItem()`
- **Hiện tại**: `DELETE FROM don_hang_chi_tiet WHERE id=$1`
- **Lý do có thể giữ**:
  - Đây là transaction data, có thể xóa trước khi thanh toán
  - Đã có trigger/validation chặn xóa khi order đã PAID
  - Không ảnh hưởng đến báo cáo (chỉ xóa khi order chưa thanh toán)
- **Khuyến nghị**: ⚠️ Có thể giữ hard delete, nhưng nên thêm log/audit

### 2. **Junction Tables (Bảng liên kết)** - OK
- **User Roles**: `DELETE FROM user_roles` - OK, đây là junction table
- **Reservation Tables**: `DELETE FROM dat_ban_ban` - OK, junction table
- **Order Options**: `DELETE FROM don_hang_chi_tiet_tuy_chon` - OK, transaction detail
- **Promotion Orders**: `DELETE FROM don_hang_khuyen_mai` - OK, transaction detail

---

## 📋 Kế Hoạch Thực Hiện

### Priority 1: Quan trọng nhất
1. ✅ **Areas** - Đổi route DELETE sang dùng `toggleAreaActive` hoặc soft delete
2. ✅ **Tables** - Thêm `deleted_at` và đổi `removeTable` sang soft delete
3. ✅ **Promotions** - Đổi route DELETE sang dùng `toggleActive(false)`

### Priority 2: Cải thiện
4. Thêm `deleted_at` column cho Areas (nếu chưa có)
5. Cập nhật tất cả queries để filter out deleted records
6. Thêm migration script để thêm `deleted_at` columns

---

## 🔍 Checklist Trước Khi Đổi

- [ ] Kiểm tra tất cả queries SELECT để đảm bảo filter deleted records
- [ ] Kiểm tra foreign keys và constraints
- [ ] Tạo migration script
- [ ] Backup database
- [ ] Test trên staging environment
- [ ] Cập nhật API documentation
- [ ] Cập nhật frontend nếu cần

---

## 💡 Best Practices

1. **Luôn dùng soft delete** cho:
   - Master data (Users, Areas, Tables, Menu items, Promotions)
   - Dữ liệu có quan hệ với báo cáo
   - Dữ liệu cần audit trail

2. **Có thể dùng hard delete** cho:
   - Junction tables (user_roles, dat_ban_ban)
   - Transaction details trước khi thanh toán
   - Temporary/cache data

3. **Thêm `deleted_at` column** thay vì chỉ `is_active`:
   - Biết được thời gian xóa
   - Dễ implement auto-cleanup sau X ngày
   - Linh hoạt hơn trong query

