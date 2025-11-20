# 🗺️ ROADMAP PHÁT TRIỂN - CoffeePOS System

**Ngày cập nhật:** 2025-11-20  
**Trạng thái hiện tại:** 85% hoàn thành

---

## 📊 TỔNG QUAN HIỆN TẠI

### ✅ Đã hoàn thành (85%)
- ✅ POS System (100%)
- ✅ Kitchen Display System (100%)
- ✅ Inventory Management (100%)
- ✅ Reservation System (100%)
- ✅ Analytics & Reports (90%)
- ✅ Payment Integration (100%)
- ✅ Customer Portal Backend (100%)
- ⏳ Customer Portal Frontend (70% - còn 6 pages)

### ❌ Còn thiếu (15%)
- ⏳ Customer Portal Frontend (6 pages)
- ❌ Employee Management
- ❌ Promotion Management UI
- ❌ Expense Tracking
- ❌ Settings Page
- ❌ Notification System

---

## 🎯 ĐỀ XUẤT THEO THỨ TỰ ƯU TIÊN

### 🔥 **PRIORITY 1 - Hoàn thiện Customer Portal** (2-3 ngày)

**Lý do:** Khách hàng cần dùng được ngay, tăng trải nghiệm

**Cần làm:**
1. ✅ HomePage - **ĐÃ XONG**
2. ✅ MenuPage - **ĐÃ XONG**
3. ✅ CustomerLogin - **ĐÃ XONG**
4. ⏳ **ProductDetailPage** - Chi tiết sản phẩm với variants/options
5. ⏳ **CartPage** - Giỏ hàng với update/remove
6. ⏳ **CheckoutPage** - Thanh toán (tích hợp POS backend)
7. ⏳ **CustomerRegister** - Đăng ký
8. ⏳ **OrderHistoryPage** - Lịch sử đơn hàng
9. ⏳ **CustomerReservationPage** - Đặt bàn online

**Thời gian:** 2-3 ngày  
**Impact:** ⭐⭐⭐⭐⭐ (Cao nhất - Khách hàng dùng được)

---

### 🔥 **PRIORITY 2 - Quản lý Nhân viên** (2-3 ngày)

**Lý do:** Quan trọng cho quản lý, đã có spec chi tiết

**Cần làm:**
1. Backend APIs:
   - CRUD users (POST, GET, PUT, DELETE)
   - Update roles
   - Reset password
   - Get employee stats

2. Frontend:
   - `EmployeeManagement.jsx` page (đã có nhưng chưa hoàn chỉnh)
   - Employee list với search/filter
   - Create/Edit employee modal
   - Tab "Lịch sử ca"
   - Tab "Hiệu suất"

**Files cần tạo:**
- `backend/src/routes/users.js`
- `backend/src/controllers/userController.js`
- `backend/src/services/userService.js`
- Update `frontend/src/pages/EmployeeManagement.jsx`

**Thời gian:** 2-3 ngày  
**Impact:** ⭐⭐⭐⭐ (Cao - Quản lý nhân sự)

**Spec:** `EMPLOYEE_MANAGEMENT_SPEC.md` (đã có)

---

### 🟡 **PRIORITY 3 - Promotion Management UI** (1-2 ngày)

**Lý do:** Backend đã có, chỉ cần UI. Tăng doanh thu

**Cần làm:**
1. Frontend:
   - `PromotionManagement.jsx` page (đã có nhưng chưa hoàn chỉnh)
   - CRUD promotions form
   - Promotion list với filters
   - Promotion detail modal
   - Tích hợp vào POS (nhập mã KM)

2. Backend (nếu thiếu):
   - GET `/api/v1/promotions` (list với filters)
   - POST `/api/v1/promotions` (create)
   - PUT `/api/v1/promotions/:id` (update)
   - DELETE `/api/v1/promotions/:id`
   - GET `/api/v1/promotions/:id/stats` (thống kê)

**Thời gian:** 1-2 ngày  
**Impact:** ⭐⭐⭐⭐ (Cao - Marketing, tăng doanh thu)

**Spec:** `PROMOTION_MANAGEMENT_SPEC.md` (đã có)

---

### 🟡 **PRIORITY 4 - Expense Tracking** (2-3 ngày)

**Lý do:** Quan trọng cho báo cáo tài chính, tính lợi nhuận thực

**Cần làm:**
1. Database:
   - Bảng `chi_phi` đã có, cần kiểm tra schema
   - Có thể cần thêm bảng `loai_chi_phi`

2. Backend:
   - CRUD expenses APIs
   - Expense reports (theo tháng, loại)
   - Tích hợp vào Profit Report

3. Frontend:
   - `ExpenseManagement.jsx` page
   - Form nhập chi phí
   - Expense list với filters
   - Expense reports
   - Cập nhật Profit Report để trừ expenses

**Thời gian:** 2-3 ngày  
**Impact:** ⭐⭐⭐⭐ (Cao - Báo cáo tài chính chính xác)

---

### 🟢 **PRIORITY 5 - Settings Page** (1-2 ngày)

**Lý do:** Tăng tính linh hoạt, cấu hình hệ thống

**Cần làm:**
1. Database:
   - Bảng `settings` hoặc `cau_hinh` (key-value store)

2. Backend:
   - GET `/api/v1/settings`
   - PUT `/api/v1/settings/:key`
   - Settings: VAT, invoice header/footer, default opening cash, etc.

3. Frontend:
   - `SettingsPage.jsx`
   - Tabs: General, Invoice, Shifts, System
   - Form cấu hình từng mục

**Thời gian:** 1-2 ngày  
**Impact:** ⭐⭐⭐ (Trung bình - Tăng tính linh hoạt)

---

### 🟢 **PRIORITY 6 - Notification System** (2-3 ngày)

**Lý do:** Cải thiện UX, thông báo real-time

**Cần làm:**
1. Database:
   - Bảng `notifications`
   - Bảng `notification_reads`

2. Backend:
   - SSE endpoint cho notifications
   - APIs: list, mark as read, delete

3. Frontend:
   - Notification bell icon (Header)
   - Notification dropdown/panel
   - Toast notifications
   - Auto-refresh notifications

**Thời gian:** 2-3 ngày  
**Impact:** ⭐⭐⭐ (Trung bình - Cải thiện UX)

---

## 📅 KẾ HOẠCH 2 TUẦN

### **Tuần 1:**
- **Ngày 1-2:** Hoàn thiện Customer Portal (ProductDetail, Cart, Checkout)
- **Ngày 3-4:** Customer Portal (Register, OrderHistory, Reservation)
- **Ngày 5:** Testing Customer Portal + Fix bugs

### **Tuần 2:**
- **Ngày 1-2:** Employee Management
- **Ngày 3:** Promotion Management UI
- **Ngày 4:** Expense Tracking
- **Ngày 5:** Settings Page

---

## 🎯 ĐỀ XUẤT CỦA TÔI CHO BẠN

### **Option 1: Hoàn thiện Customer Portal trước** ⭐⭐⭐⭐⭐
**Lý do:**
- Khách hàng có thể dùng ngay
- Tăng trải nghiệm người dùng
- Dễ demo cho khách hàng
- 6 pages còn lại, mỗi page ~2-3 giờ

**Thời gian:** 2-3 ngày  
**Kết quả:** Customer Portal 100% hoàn thành

---

### **Option 2: Employee Management** ⭐⭐⭐⭐
**Lý do:**
- Quan trọng cho quản lý
- Đã có spec chi tiết
- Nền tảng cho các tính năng sau (payroll, performance review)

**Thời gian:** 2-3 ngày  
**Kết quả:** Quản lý nhân viên đầy đủ

---

### **Option 3: Promotion Management UI** ⭐⭐⭐⭐
**Lý do:**
- Backend đã có, chỉ cần UI
- Tăng doanh thu ngay
- Dễ implement (1-2 ngày)

**Thời gian:** 1-2 ngày  
**Kết quả:** Khuyến mãi hoạt động đầy đủ

---

## 💡 KHUYẾN NGHỊ CỦA TÔI

### **Nếu bạn muốn demo sớm:**
→ **Hoàn thiện Customer Portal** (Option 1)
- Khách hàng có thể đặt hàng online ngay
- Trải nghiệm đầy đủ từ xem menu → đặt hàng → thanh toán

### **Nếu bạn muốn quản lý tốt hơn:**
→ **Employee Management** (Option 2)
- Quản lý nhân viên dễ dàng
- Theo dõi hiệu suất
- Nền tảng cho payroll sau này

### **Nếu bạn muốn tăng doanh thu:**
→ **Promotion Management UI** (Option 3)
- Chạy khuyến mãi ngay
- Marketing hiệu quả
- Dễ implement nhất

---

## 🚀 BẠN MUỐN LÀM GÌ?

**Tôi khuyến nghị:** Bắt đầu với **Customer Portal** vì:
1. ✅ Đã có 70% - chỉ còn 6 pages
2. ✅ Có template rõ ràng
3. ✅ Khách hàng dùng được ngay
4. ✅ Dễ demo

**Hoặc nếu bạn muốn làm Employee Management:**
- Tôi đã có spec chi tiết
- Có thể bắt đầu ngay
- Quan trọng cho quản lý

**Hoặc Promotion Management:**
- Nhanh nhất (1-2 ngày)
- Tăng doanh thu ngay

---

**Bạn muốn làm chức năng nào? Tôi sẽ hỗ trợ chi tiết!** 🎯

