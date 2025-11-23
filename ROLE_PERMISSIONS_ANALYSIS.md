# Phân tích: Phân quyền các Role - Có hợp lý không?

## 📊 Tổng quan các Role hiện tại

### **1. WAITER (Phục vụ)**
### **2. CASHIER (Thu ngân)**
### **3. KITCHEN (Pha chế/Bếp)**
### **4. MANAGER (Quản lý)**
### **5. ADMIN (Quản trị viên)**

---

## 🔍 Phân tích chi tiết từng Role

### **1. WAITER (Phục vụ)**

#### **✅ Quyền truy cập:**
- ✅ `/dashboard` - Dashboard (tạo đơn, xem bàn)
- ✅ `/waiter/delivery` - Xem đơn giao hàng được phân công

#### **✅ Chức năng có thể làm:**
- ✅ Tạo đơn DINE_IN (tại quán)
- ✅ Tạo đơn TAKEAWAY (mang đi)
- ✅ Thêm/sửa/xóa món trong đơn
- ✅ Áp dụng khuyến mãi
- ✅ Xem menu để tư vấn khách
- ✅ Xem đơn giao hàng được phân công
- ✅ Cập nhật trạng thái giao hàng (ASSIGNED → OUT_FOR_DELIVERY → DELIVERED)

#### **❌ Chức năng KHÔNG thể làm:**
- ❌ Thanh toán đơn (chỉ Cashier/Manager)
- ❌ Hủy đơn (chỉ Manager/Admin)
- ❌ Tạo đơn DELIVERY (chỉ Customer Portal hoặc Cashier)
- ❌ Mở/đóng ca làm việc
- ❌ Xem báo cáo, thống kê
- ❌ Quản lý menu, inventory, employees

#### **📝 Đánh giá:**
- ✅ **HỢP LÝ** - Phù hợp với vai trò phục vụ
- ✅ Phân công rõ ràng: Phục vụ vs Thanh toán
- ⚠️ **Cần lưu ý:** Waiter cần có ca Cashier đang mở mới tạo được đơn

---

### **2. CASHIER (Thu ngân)**

#### **✅ Quyền truy cập:**
- ✅ `/dashboard` - Dashboard (tạo đơn, xem bàn)
- ✅ `/pos` - POS page
- ✅ `/takeaway` - Quản lý đơn mang đi và giao hàng

#### **✅ Chức năng có thể làm:**
- ✅ Mở ca làm việc (shift)
- ✅ Tạo đơn DINE_IN, TAKEAWAY, DELIVERY
- ✅ Thêm/sửa/xóa món trong đơn
- ✅ **Thanh toán đơn** (CASH, CARD, ONLINE)
- ✅ Áp dụng khuyến mãi
- ✅ Phân công đơn giao hàng cho Waiter
- ✅ Đóng ca và xem báo cáo ca
- ✅ Xem đơn trong ca của mình

#### **❌ Chức năng KHÔNG thể làm:**
- ❌ Hủy đơn (chỉ Manager/Admin)
- ❌ Quản lý menu, inventory, employees
- ❌ Xem báo cáo tổng hợp (chỉ Manager/Admin)
- ❌ Quản lý khu vực, bàn

#### **📝 Đánh giá:**
- ✅ **HỢP LÝ** - Phù hợp với vai trò thu ngân
- ✅ Tập trung vào bán hàng và thanh toán
- ✅ Có thể quản lý đơn mang đi và giao hàng

---

### **3. KITCHEN (Pha chế/Bếp)**

#### **✅ Quyền truy cập:**
- ✅ `/kitchen` - Kitchen Display System (KDS)

#### **✅ Chức năng có thể làm:**
- ✅ Xem hàng đợi món (QUEUED)
- ✅ Bắt đầu làm món (QUEUED → MAKING)
- ✅ Hoàn tất món (MAKING → DONE)
- ✅ Hủy món (nếu cần)
- ✅ Xem lịch sử món đã làm
- ✅ Xem thống kê ca làm việc (số món, thời gian trung bình)

#### **❌ Chức năng KHÔNG thể làm:**
- ❌ Tạo đơn
- ❌ Thanh toán
- ❌ Xem báo cáo doanh thu
- ❌ Quản lý menu, inventory
- ❌ Truy cập Dashboard, POS

#### **📝 Đánh giá:**
- ✅ **HỢP LÝ** - Phù hợp với vai trò pha chế/bếp
- ✅ Tập trung vào chế biến món
- ✅ Không bị phân tâm bởi các chức năng khác

---

### **4. MANAGER (Quản lý)**

#### **✅ Quyền truy cập:**
- ✅ `/dashboard` - Dashboard (view only hoặc full access nếu có role Cashier)
- ✅ `/manager` - Manager Dashboard (báo cáo, thống kê)
- ✅ `/inventory` - Quản lý kho
- ✅ `/menu-management` - Quản lý menu
- ✅ `/areas` - Quản lý khu vực & bàn
- ✅ `/employees` - Quản lý nhân viên
- ✅ `/promotion-management` - Quản lý khuyến mãi
- ✅ `/pos` - POS (nếu có role Cashier)
- ✅ `/takeaway` - Quản lý đơn mang đi (nếu có role Cashier)
- ✅ `/kitchen` - Xem KDS (nếu có role Kitchen)
- ✅ `/waiter/delivery` - Xem đơn giao hàng

#### **✅ Chức năng có thể làm:**
- ✅ **Tất cả chức năng của Cashier** (nếu có role Cashier)
- ✅ **Tất cả chức năng của Kitchen** (nếu có role Kitchen)
- ✅ Xem báo cáo tổng hợp (doanh thu, lợi nhuận, KPI)
- ✅ Xem báo cáo ca làm việc
- ✅ Quản lý menu (thêm/sửa/xóa món, danh mục, topping)
- ✅ Quản lý kho (nhập/xuất, kiểm kê)
- ✅ Quản lý nhân viên (thêm/sửa/xóa, gán roles)
- ✅ Quản lý khu vực & bàn
- ✅ Quản lý khuyến mãi
- ✅ **Hủy đơn** (nếu cần)
- ✅ Xem tất cả hóa đơn
- ✅ In báo cáo

#### **❌ Chức năng KHÔNG thể làm:**
- ❌ Quản lý hệ thống (chỉ Admin)
- ❌ Xóa dữ liệu quan trọng (chỉ Admin)

#### **📝 Đánh giá:**
- ✅ **HỢP LÝ** - Phù hợp với vai trò quản lý
- ✅ Toàn quyền quản lý hoạt động hàng ngày
- ✅ Có thể làm mọi việc trừ quản lý hệ thống

---

### **5. ADMIN (Quản trị viên)**

#### **✅ Quyền truy cập:**
- ✅ **Tất cả các trang** (không giới hạn)

#### **✅ Chức năng có thể làm:**
- ✅ **Tất cả chức năng của Manager**
- ✅ **Tất cả chức năng của Cashier**
- ✅ **Tất cả chức năng của Kitchen**
- ✅ Quản lý hệ thống
- ✅ Xóa dữ liệu (nếu cần)
- ✅ Cấu hình hệ thống

#### **📝 Đánh giá:**
- ✅ **HỢP LÝ** - Phù hợp với vai trò quản trị viên
- ✅ Toàn quyền, không giới hạn

---

## ⚠️ Vấn đề và Đề xuất

### **1. WAITER không thể xem đơn trong ca**

**Vấn đề:**
- Waiter tạo đơn nhưng không thể xem danh sách đơn trong ca
- Chỉ Cashier/Manager mới xem được "Đơn hàng trong ca"

**Đề xuất:**
- ✅ Cho Waiter xem đơn trong ca (chỉ xem, không thanh toán)
- Hoặc: Waiter chỉ cần xem đơn mình tạo (có thể thêm filter)

**File cần cập nhật:**
- `frontend/src/pages/Dashboard.jsx` - `canViewCurrentShiftOrders`

---

### **2. WAITER không thể xem Takeaway Orders**

**Vấn đề:**
- Waiter có thể tạo đơn TAKEAWAY nhưng không thể xem danh sách đơn TAKEAWAY
- `/takeaway` chỉ cho phép Cashier/Manager/Admin

**Đề xuất:**
- ⚠️ **Có thể không cần** - Waiter chỉ cần tạo đơn, Cashier quản lý
- Hoặc: Cho Waiter xem đơn TAKEAWAY (chỉ xem, không phân công giao hàng)

---

### **3. CASHIER có thể tạo đơn DELIVERY**

**Vấn đề:**
- Cashier có thể tạo đơn DELIVERY từ `/takeaway`
- Nhưng đơn DELIVERY thường được tạo từ Customer Portal

**Đánh giá:**
- ✅ **HỢP LÝ** - Cashier có thể nhận order qua điện thoại và tạo đơn DELIVERY
- Không cần thay đổi

---

### **4. MANAGER có thể có nhiều role**

**Vấn đề:**
- Manager có thể có cả role Cashier và Kitchen
- Điều này có hợp lý không?

**Đánh giá:**
- ✅ **HỢP LÝ** - Manager có thể làm nhiều việc khi cần
- Manager có thể:
  - Có role Cashier → Có thể bán hàng, thanh toán
  - Có role Kitchen → Có thể xem KDS
  - Không có role Cashier → Chỉ xem báo cáo (view only)

---

### **5. KITCHEN không thể xem thông tin đơn**

**Vấn đề:**
- Kitchen chỉ thấy món cần làm, không thấy thông tin đơn (bàn, khách hàng)
- Có thể cần thông tin để ưu tiên làm món

**Đánh giá:**
- ✅ **HỢP LÝ** - Kitchen chỉ cần biết món nào cần làm
- Thông tin chi tiết có thể xem trong KDS (đã có bàn, khu vực)

---

## 📋 Tổng hợp đánh giá

### **✅ HỢP LÝ:**

1. **WAITER:**
   - ✅ Có thể tạo đơn (DINE_IN, TAKEAWAY)
   - ✅ Không thể thanh toán (đúng)
   - ✅ Không thể hủy đơn (đúng)
   - ✅ Có thể giao hàng (đúng)

2. **CASHIER:**
   - ✅ Có thể tạo đơn và thanh toán (đúng)
   - ✅ Có thể quản lý đơn mang đi và giao hàng (đúng)
   - ✅ Không thể quản lý menu/inventory (đúng)

3. **KITCHEN:**
   - ✅ Chỉ xem và cập nhật trạng thái món (đúng)
   - ✅ Không bị phân tâm bởi các chức năng khác (đúng)

4. **MANAGER:**
   - ✅ Toàn quyền quản lý (đúng)
   - ✅ Có thể có nhiều role (linh hoạt)

5. **ADMIN:**
   - ✅ Toàn quyền (đúng)

---

### **✅ ĐÃ CẢI THIỆN:**

1. **✅ WAITER có thể xem đơn trong ca:**
   - Đã cập nhật: Waiter có thể xem đơn trong ca (chỉ xem, không thanh toán)
   - File: `frontend/src/pages/Dashboard.jsx` - `canViewCurrentShiftOrders`

2. **✅ WAITER có thể xem đơn TAKEAWAY:**
   - Đã cập nhật: Waiter có thể xem đơn TAKEAWAY (chỉ xem, không phân công giao hàng)
   - File: `frontend/src/pages/TakeawayOrders.jsx` - Thêm `isWaiter` check

---

## 🎯 Kết luận

### **✅ Tổng thể: HỢP LÝ (8/10)**

**Ưu điểm:**
- ✅ Phân quyền rõ ràng
- ✅ Phù hợp với vai trò thực tế
- ✅ Bảo mật tốt (không có quyền thừa)
- ✅ Linh hoạt (Manager có thể có nhiều role)

**Đã cải thiện:**
- ✅ Waiter có thể xem đơn trong ca (chỉ xem)
- ✅ Waiter có thể xem đơn TAKEAWAY (chỉ xem, không phân công)

**Kết quả:**
- ✅ Phân quyền hoàn chỉnh và hợp lý
- ✅ Waiter có đủ thông tin để làm việc
- ✅ Vẫn giữ nguyên bảo mật (không có quyền thừa)

