# 🧪 HƯỚNG DẪN TEST TOÀN BỘ HỆ THỐNG - CoffeePOS

**Ngày tạo:** 2025-01-XX  
**Phiên bản:** 1.0  
**Thời gian ước tính:** 2-3 giờ để test đầy đủ

---

## 📋 **MỤC LỤC**

1. [Chuẩn Bị Test](#chuẩn-bị-test)
2. [Test Authentication & Authorization](#test-authentication--authorization)
3. [Test Menu Management](#test-menu-management)
4. [Test Area & Table Management](#test-area--table-management)
5. [Test Shift Management](#test-shift-management)
6. [Test POS System](#test-pos-system)
7. [Test Takeaway Orders](#test-takeaway-orders)
8. [Test Kitchen Display System (KDS)](#test-kitchen-display-system-kds)
9. [Test Payments](#test-payments)
10. [Test Invoices](#test-invoices)
11. [Test Reports & Analytics](#test-reports--analytics)
12. [Test Export Functionality](#test-export-functionality)
13. [Test Promotion Management](#test-promotion-management)
14. [Test Inventory Management](#test-inventory-management)
15. [Test Reservation System](#test-reservation-system)
16. [Test Customer Portal](#test-customer-portal)
17. [Test Real-time Updates](#test-real-time-updates)
18. [Checklist Tổng Hợp](#checklist-tổng-hợp)

---

## 🔧 **CHUẨN BỊ TEST**

### **1. Khởi Động Hệ Thống**

#### **Backend Server:**
```bash
cd backend
npm start
# Hoặc
npm run dev
```

**Kiểm tra:**
- ✅ Server chạy tại `http://localhost:5000`
- ✅ Console hiển thị: "Server running on port 5000"
- ✅ Không có lỗi startup
- ✅ Database connection thành công

#### **Frontend Server:**
```bash
cd frontend
npm run dev
```

**Kiểm tra:**
- ✅ Server chạy tại `http://localhost:5173`
- ✅ Browser tự động mở
- ✅ Không có lỗi compile
- ✅ Không có lỗi trong Console (F12)

### **2. Tài Khoản Test**

| Vai trò | Username | Password | Quyền |
|---------|----------|----------|-------|
| Admin | admin | admin123 | Tất cả quyền |
| Manager | manager | manager123 | Quản lý |
| Cashier | cashier | cashier123 | Thu ngân |
| Kitchen | kitchen | kitchen123 | Bếp |

### **3. Tools Cần Thiết**

- ✅ Browser (Chrome/Firefox/Edge)
- ✅ DevTools (F12)
- ✅ Postman hoặc Thunder Client (test API)
- ✅ Database client (pgAdmin/DBeaver) - tùy chọn

---

## 🔐 **TEST AUTHENTICATION & AUTHORIZATION**

### **Test 1: Đăng Nhập**

**Bước:**
1. Mở `http://localhost:5173`
2. Nhập username và password
3. Click "Đăng nhập"

**Kiểm tra:**
- ✅ Đăng nhập thành công
- ✅ Redirect đến dashboard đúng theo role
- ✅ Token được lưu trong localStorage
- ✅ User info hiển thị đúng (tên, role)

### **Test 2: Đăng Xuất**

**Bước:**
1. Click vào user menu
2. Click "Đăng xuất"

**Kiểm tra:**
- ✅ Token bị xóa khỏi localStorage
- ✅ Redirect về trang login
- ✅ Không thể truy cập dashboard khi chưa đăng nhập

### **Test 3: Phân Quyền**

**Test với từng role:**

#### **Admin:**
- ✅ Có thể truy cập tất cả pages
- ✅ Có thể quản lý users
- ✅ Có thể xem tất cả reports

#### **Manager:**
- ✅ Có thể quản lý menu, bàn, ca làm việc
- ✅ Có thể xem reports
- ✅ KHÔNG thể quản lý users (nếu có)

#### **Cashier:**
- ✅ Chỉ có thể truy cập POS
- ✅ KHÔNG thể truy cập Manager Dashboard
- ✅ KHÔNG thể quản lý menu

#### **Kitchen:**
- ✅ Chỉ có thể truy cập Kitchen Display
- ✅ KHÔNG thể truy cập POS
- ✅ KHÔNG thể truy cập Manager Dashboard

### **Test 4: Token Expiry**

**Bước:**
1. Đăng nhập
2. Chờ token hết hạn (hoặc xóa token trong localStorage)
3. Thực hiện action bất kỳ

**Kiểm tra:**
- ✅ Hiển thị thông báo "Phiên đăng nhập hết hạn"
- ✅ Redirect về trang login
- ✅ Token được xóa

---

## 🍽️ **TEST MENU MANAGEMENT**

**Yêu cầu:** Đăng nhập với role Manager hoặc Admin

### **Test 1: Quản Lý Danh Mục**

**Bước:**
1. Vào "Quản lý Thực đơn"
2. Tab "Danh mục"
3. Click "Thêm danh mục"
4. Điền: Tên "Đồ uống", Mô tả "Các loại đồ uống"
5. Click "Lưu"

**Kiểm tra:**
- ✅ Danh mục xuất hiện trong danh sách
- ✅ Có thể sửa danh mục
- ✅ Có thể xóa danh mục (nếu không có sản phẩm)

### **Test 2: Quản Lý Sản Phẩm**

**Bước:**
1. Tab "Đồ uống"
2. Click "Thêm sản phẩm"
3. Điền đầy đủ thông tin:
   - Tên: "Cà phê đen"
   - Danh mục: Chọn danh mục
   - Giá: 25000
   - Mô tả: "Cà phê đen truyền thống"
4. Click "Lưu"

**Kiểm tra:**
- ✅ Sản phẩm xuất hiện trong danh sách
- ✅ Có thể sửa sản phẩm
- ✅ Có thể xóa sản phẩm (nếu không có trong đơn)

### **Test 3: Quản Lý Size**

**Bước:**
1. Tab "Size"
2. Thêm size: S, M, L
3. Gán giá cho từng size

**Kiểm tra:**
- ✅ Size hiển thị trong POS khi chọn sản phẩm
- ✅ Giá tự động cập nhật theo size

### **Test 4: Quản Lý Tùy Chọn (Options)**

**Bước:**
1. Tab "Tùy chọn"
2. Thêm tùy chọn: "Đường", "Đá"
3. Thêm các mức: "Ít", "Vừa", "Nhiều"

**Kiểm tra:**
- ✅ Tùy chọn hiển thị trong POS
- ✅ Có thể chọn nhiều tùy chọn
- ✅ Giá tùy chọn được tính đúng

### **Test 5: Quản Lý Topping**

**Bước:**
1. Tab "Topping"
2. Thêm topping: "Trân châu", "Thạch"
3. Đặt giá cho từng topping

**Kiểm tra:**
- ✅ Topping hiển thị trong POS
- ✅ Giá topping được cộng vào tổng tiền
- ✅ Có thể chọn nhiều topping

### **Test 6: Tìm Kiếm & Lọc**

**Bước:**
1. Nhập từ khóa vào ô tìm kiếm
2. Lọc theo danh mục

**Kiểm tra:**
- ✅ Kết quả tìm kiếm chính xác
- ✅ Lọc hoạt động đúng

---

## 🏠 **TEST AREA & TABLE MANAGEMENT**

**Yêu cầu:** Đăng nhập với role Manager hoặc Admin

### **Test 1: Quản Lý Khu Vực**

**Bước:**
1. Vào "Quản lý Khu vực & Bàn"
2. Tab "Khu vực"
3. Click "Thêm khu vực"
4. Điền: Tên "Tầng 1", Mô tả "Khu vực tầng 1"
5. Click "Lưu"

**Kiểm tra:**
- ✅ Khu vực xuất hiện trong danh sách
- ✅ Có thể sửa khu vực
- ✅ Có thể xóa khu vực (nếu không có bàn)

### **Test 2: Quản Lý Bàn**

**Bước:**
1. Tab "Bàn"
2. Chọn khu vực
3. Click "Thêm bàn"
4. Điền: Số bàn "1", Số chỗ "4"
5. Click "Lưu"

**Kiểm tra:**
- ✅ Bàn xuất hiện trong danh sách
- ✅ Bàn hiển thị trong POS
- ✅ Có thể sửa bàn
- ✅ Có thể xóa bàn (nếu không có đơn)

### **Test 3: Lock/Unlock Bàn**

**Bước:**
1. Click icon "Khóa" trên một bàn
2. Bàn bị khóa
3. Click lại để mở khóa

**Kiểm tra:**
- ✅ Bàn bị khóa không thể tạo đơn
- ✅ Bàn đã mở khóa có thể tạo đơn

---

## 💼 **TEST SHIFT MANAGEMENT**

**Yêu cầu:** Đăng nhập với role Manager hoặc Admin

### **Test 1: Mở Ca**

**Bước:**
1. Vào Manager Dashboard
2. Tìm phần "Quản lý Ca"
3. Click "Mở ca"
4. Nhập số tiền đầu ca (ví dụ: 1000000)
5. Click "Xác nhận"

**Kiểm tra:**
- ✅ Ca được mở thành công
- ✅ Hiển thị thông tin ca: Người mở, Thời gian, Tiền đầu ca
- ✅ Không thể mở ca mới khi đang có ca đang mở
- ✅ POS có thể hoạt động

### **Test 2: Đóng Ca**

**Bước:**
1. Sau khi có một số đơn đã thanh toán
2. Click "Đóng ca"
3. Xem báo cáo ca

**Kiểm tra:**
- ✅ Hiển thị báo cáo ca:
  - Tổng doanh thu
  - Số đơn hàng
  - Tiền mặt đầu ca
  - Tiền mặt cuối ca
  - Chênh lệch
- ✅ Có thể in báo cáo
- ✅ Ca được đóng thành công
- ✅ Có thể mở ca mới sau khi đóng

### **Test 3: Xem Lịch Sử Ca**

**Bước:**
1. Xem danh sách các ca đã đóng
2. Click vào một ca để xem chi tiết

**Kiểm tra:**
- ✅ Hiển thị đầy đủ thông tin ca
- ✅ Có thể xem báo cáo chi tiết
- ✅ Có thể in lại báo cáo

---

## 🛒 **TEST POS SYSTEM**

**Yêu cầu:** Đăng nhập với role Cashier, Manager hoặc Admin

### **Test 1: Tạo Đơn Tại Bàn**

**Bước:**
1. Vào Dashboard → Chọn chế độ "POS"
2. Chọn một bàn trống
3. Click "Tạo đơn"
4. Thêm món vào đơn:
   - Chọn sản phẩm
   - Chọn size (nếu có)
   - Chọn tùy chọn (đường, đá)
   - Chọn topping (nếu có)
   - Nhập số lượng
5. Click "Thêm vào đơn"

**Kiểm tra:**
- ✅ Đơn được tạo thành công
- ✅ Món xuất hiện trong Order Drawer
- ✅ Tổng tiền được tính đúng
- ✅ Bàn chuyển sang trạng thái "Có khách"
- ✅ Món được gửi đến Kitchen Display

### **Test 2: Sửa Món Trong Đơn**

**Bước:**
1. Click vào món trong Order Drawer
2. Sửa số lượng hoặc tùy chọn
3. Click "Cập nhật"

**Kiểm tra:**
- ✅ Món được cập nhật
- ✅ Tổng tiền được tính lại đúng

### **Test 3: Xóa Món Trong Đơn**

**Bước:**
1. Click icon "Xóa" trên món
2. Xác nhận xóa

**Kiểm tra:**
- ✅ Món bị xóa khỏi đơn
- ✅ Tổng tiền được tính lại

### **Test 4: Đổi Bàn**

**Bước:**
1. Trong Order Drawer, click "Đổi bàn"
2. Chọn bàn mới
3. Xác nhận

**Kiểm tra:**
- ✅ Đơn được chuyển sang bàn mới
- ✅ Bàn cũ trở về trạng thái trống
- ✅ Bàn mới chuyển sang trạng thái "Có khách"

### **Test 5: Áp Dụng Khuyến Mãi**

**Bước:**
1. Trong Order Drawer, tìm ô nhập mã khuyến mãi
2. Nhập mã khuyến mãi hợp lệ
3. Click "Áp dụng"

**Kiểm tra:**
- ✅ Khuyến mãi được áp dụng
- ✅ Số tiền giảm hiển thị đúng
- ✅ Tổng tiền được tính lại

### **Test 6: Thanh Toán**

**Bước:**
1. Click "Thanh toán"
2. Chọn phương thức thanh toán:
   - Tiền mặt
   - Online (PayOS)
   - Thẻ
3. Nhập số tiền (nếu tiền mặt)
4. Click "Xác nhận thanh toán"

**Kiểm tra:**
- ✅ Thanh toán thành công
- ✅ Hóa đơn được in (nếu có máy in)
- ✅ Bàn trở về trạng thái trống
- ✅ Đơn được lưu vào database
- ✅ Doanh thu được cập nhật

### **Test 7: Hủy Đơn**

**Bước:**
1. Click "Hủy đơn"
2. Nhập lý do hủy
3. Xác nhận

**Kiểm tra:**
- ✅ Đơn bị hủy
- ✅ Bàn trở về trạng thái trống
- ✅ Món trong Kitchen được hủy

### **Test 8: Tạo Đơn Mang Đi**

**Bước:**
1. Click "Đơn mang đi" (hoặc button tương tự)
2. Thêm món
3. Thanh toán

**Kiểm tra:**
- ✅ Đơn được tạo với loại "TAKEAWAY"
- ✅ Không cần chọn bàn
- ✅ Thanh toán thành công

---

## 🥡 **TEST TAKEAWAY ORDERS**

**Yêu cầu:** Đăng nhập với role Cashier, Manager hoặc Admin

### **Test 1: Xem Danh Sách Đơn Mang Đi**

**Bước:**
1. Vào "Đơn mang đi"
2. Xem danh sách đơn

**Kiểm tra:**
- ✅ Hiển thị tất cả đơn mang đi
- ✅ Hiển thị trạng thái: Chờ làm, Đang làm, Hoàn thành
- ✅ Có thể lọc theo trạng thái

### **Test 2: Tạo Đơn Mang Đi Mới**

**Bước:**
1. Click "Tạo đơn mới"
2. Thêm món
3. Thanh toán

**Kiểm tra:**
- ✅ Đơn được tạo thành công
- ✅ Hiển thị trong danh sách
- ✅ Gửi đến Kitchen Display

### **Test 3: Đánh Dấu Giao Hàng**

**Bước:**
1. Chọn đơn đã hoàn thành
2. Click "Đã giao hàng"

**Kiểm tra:**
- ✅ Trạng thái đơn cập nhật
- ✅ Đơn được lưu vào lịch sử

---

## 👨‍🍳 **TEST KITCHEN DISPLAY SYSTEM (KDS)**

**Yêu cầu:** Đăng nhập với role Kitchen, Manager hoặc Admin

### **Test 1: Xem Hàng Đợi**

**Bước:**
1. Vào "Kitchen Display"
2. Xem cột "Chờ làm"

**Kiểm tra:**
- ✅ Hiển thị tất cả món chờ làm
- ✅ Hiển thị thông tin: Tên món, Bàn/Số đơn, Số lượng, Ghi chú
- ✅ Sắp xếp theo thời gian tạo

### **Test 2: Bắt Đầu Làm Món**

**Bước:**
1. Click "Bắt đầu" trên một món
2. Món chuyển sang cột "Đang làm"

**Kiểm tra:**
- ✅ Món chuyển sang cột "Đang làm"
- ✅ Timer bắt đầu đếm
- ✅ Trạng thái cập nhật real-time

### **Test 3: Hoàn Thành Món**

**Bước:**
1. Click "Hoàn thành" trên món đang làm
2. Món được đánh dấu hoàn thành

**Kiểm tra:**
- ✅ Món biến mất khỏi board
- ✅ Chuyển sang lịch sử
- ✅ POS được thông báo

### **Test 4: Hủy Món**

**Bước:**
1. Click "Hủy" trên một món
2. Xác nhận hủy

**Kiểm tra:**
- ✅ Món bị hủy
- ✅ Biến mất khỏi board
- ✅ POS được thông báo

### **Test 5: Lọc Theo Khu Vực/Bàn**

**Bước:**
1. Chọn filter "Khu vực" hoặc "Bàn"
2. Xem kết quả

**Kiểm tra:**
- ✅ Chỉ hiển thị món của khu vực/bàn đã chọn
- ✅ Filter hoạt động đúng

### **Test 6: Real-time Updates**

**Bước:**
1. Mở 2 browser:
   - Browser 1: POS (tạo đơn)
   - Browser 2: Kitchen Display
2. Tạo đơn mới trong POS

**Kiểm tra:**
- ✅ Món xuất hiện ngay lập tức trong Kitchen Display
- ✅ Không cần refresh trang

---

## 💳 **TEST PAYMENTS**

### **Test 1: Thanh Toán Tiền Mặt**

**Bước:**
1. Tạo đơn trong POS
2. Click "Thanh toán"
3. Chọn "Tiền mặt"
4. Nhập số tiền khách đưa
5. Click "Xác nhận"

**Kiểm tra:**
- ✅ Tính tiền thừa đúng
- ✅ Thanh toán thành công
- ✅ Hóa đơn được tạo
- ✅ Doanh thu được cập nhật

### **Test 2: Thanh Toán Online (PayOS)**

**Bước:**
1. Tạo đơn trong POS
2. Click "Thanh toán"
3. Chọn "Online"
4. Quét QR code hoặc nhập thông tin
5. Thanh toán

**Kiểm tra:**
- ✅ QR code hiển thị
- ✅ Có thể quét bằng app ngân hàng
- ✅ Thanh toán thành công
- ✅ Redirect về trang thành công
- ✅ Đơn được cập nhật

### **Test 3: Thanh Toán Thẻ**

**Bước:**
1. Tạo đơn trong POS
2. Click "Thanh toán"
3. Chọn "Thẻ"
4. Nhập thông tin thẻ (hoặc giả lập)
5. Xác nhận

**Kiểm tra:**
- ✅ Thanh toán thành công
- ✅ Đơn được cập nhật

### **Test 4: Thanh Toán Nhiều Phương Thức (Multi-tender)**

**Bước:**
1. Tạo đơn trong POS
2. Click "Thanh toán"
3. Chọn nhiều phương thức:
   - Tiền mặt: 50000
   - Online: 100000
4. Xác nhận

**Kiểm tra:**
- ✅ Tổng số tiền đúng
- ✅ Thanh toán thành công
- ✅ Lịch sử thanh toán ghi đầy đủ

### **Test 5: Hoàn Tiền (Refund)**

**Bước:**
1. Vào lịch sử đơn hàng
2. Chọn đơn đã thanh toán
3. Click "Hoàn tiền"
4. Nhập lý do
5. Xác nhận

**Kiểm tra:**
- ✅ Hoàn tiền thành công
- ✅ Đơn được đánh dấu "Đã hoàn tiền"
- ✅ Doanh thu được điều chỉnh

---

## 🧾 **TEST INVOICES**

### **Test 1: Xem Hóa Đơn**

**Bước:**
1. Sau khi thanh toán
2. Xem hóa đơn được tạo

**Kiểm tra:**
- ✅ Hiển thị đầy đủ thông tin:
  - Tên quán
  - Địa chỉ
  - Số hóa đơn
  - Ngày giờ
  - Danh sách món
  - Tổng tiền
  - Phương thức thanh toán

### **Test 2: In Hóa Đơn**

**Bước:**
1. Click "In hóa đơn"
2. Chọn máy in (nếu có)

**Kiểm tra:**
- ✅ Hóa đơn được in
- ✅ Format đẹp, dễ đọc
- ✅ Tiếng Việt hiển thị đúng

### **Test 3: In Lại Hóa Đơn**

**Bước:**
1. Vào lịch sử đơn hàng
2. Chọn đơn đã thanh toán
3. Click "In lại"

**Kiểm tra:**
- ✅ Có thể in lại hóa đơn
- ✅ Thông tin giống hóa đơn gốc

---

## 📊 **TEST REPORTS & ANALYTICS**

**Yêu cầu:** Đăng nhập với role Manager hoặc Admin

### **Test 1: Revenue Report (Báo Cáo Doanh Thu)**

**Bước:**
1. Vào Manager Dashboard
2. Tab "Doanh thu"
3. Chọn khoảng thời gian
4. Xem báo cáo

**Kiểm tra:**
- ✅ Hiển thị:
  - Tổng doanh thu
  - Doanh thu tại bàn
  - Doanh thu mang đi
  - Số đơn hàng
  - Đơn trung bình
- ✅ Biểu đồ hiển thị đúng
- ✅ Có thể xem chi tiết theo ngày

### **Test 2: Profit Report (Báo Cáo Lợi Nhuận)**

**Bước:**
1. Tab "Lợi nhuận"
2. Chọn khoảng thời gian
3. Xem báo cáo

**Kiểm tra:**
- ✅ Hiển thị:
  - Tổng doanh thu
  - Tổng chi phí
  - Lợi nhuận gộp
  - Tỷ lệ lợi nhuận
- ✅ Chi tiết theo sản phẩm
- ✅ Màu sắc: Lợi nhuận âm (đỏ), dương (xanh)

### **Test 3: Products Report (Báo Cáo Sản Phẩm)**

**Bước:**
1. Tab "Sản phẩm"
2. Xem báo cáo

**Kiểm tra:**
- ✅ Hiển thị:
  - Tên sản phẩm
  - Danh mục
  - Số lượng bán
  - Doanh thu
  - Giá trung bình
- ✅ Có thể sắp xếp, lọc

### **Test 4: Promotions Report (Báo Cáo Khuyến Mãi)**

**Bước:**
1. Tab "Khuyến mãi"
2. Xem báo cáo

**Kiểm tra:**
- ✅ Hiển thị:
  - Tên khuyến mãi
  - Loại
  - Số lần dùng
  - Tổng giảm giá

### **Test 5: Customers Report (Báo Cáo Khách Hàng)**

**Bước:**
1. Tab "Khách hàng"
2. Xem báo cáo

**Kiểm tra:**
- ✅ Hiển thị:
  - Khách hàng/Bàn
  - Số đơn
  - Tổng chi tiêu
  - Trung bình/đơn

---

## 📥 **TEST EXPORT FUNCTIONALITY**

**Yêu cầu:** Đăng nhập với role Manager hoặc Admin

### **Test 1: Export Revenue Report - Excel**

**Bước:**
1. Vào Manager Dashboard → Tab "Doanh thu"
2. Click nút "Excel" (màu xanh lá)
3. Đợi file download

**Kiểm tra:**
- ✅ Button hiển thị "Đang xuất..."
- ✅ File Excel download: `revenue_<timestamp>.xlsx`
- ✅ File mở được
- ✅ Sheet 1 "Tổng Quan": Có 6 rows với data
- ✅ Sheet 2 "Chi Tiết Theo Ngày": Có data
- ✅ Currency format có ₫
- ✅ Tiếng Việt hiển thị đúng

### **Test 2: Export Revenue Report - PDF**

**Bước:**
1. Click nút "PDF" (màu đỏ)
2. Đợi file download

**Kiểm tra:**
- ✅ File PDF download: `revenue_<timestamp>.pdf`
- ✅ Header: "BÁO CÁO COFFEE SHOP"
- ✅ Tiếng Việt hiển thị ĐÚNG (không bị ????)
- ✅ Có section "TỔNG QUAN"
- ✅ Có section "CHI TIẾT THEO NGÀY"

### **Test 3: Export Revenue Report - CSV**

**Bước:**
1. Click nút "CSV" (màu xanh dương)
2. Đợi file download

**Kiểm tra:**
- ✅ File CSV download: `revenue_<timestamp>.csv`
- ✅ Mở bằng Excel → Tiếng Việt đúng
- ✅ Có headers row
- ✅ Có data rows

### **Test 4: Export Profit Report**

**Bước:**
1. Tab "Lợi nhuận"
2. Export Excel/PDF/CSV

**Kiểm tra:**
- ✅ File có 2 sheets: "Tổng Quan Lợi Nhuận" và "Chi Tiết Theo Sản Phẩm"
- ✅ Sheet 2 có màu sắc: Lợi nhuận âm (đỏ), dương (xanh)

### **Test 5: Export Các Report Khác**

**Bước:**
1. Export Products, Promotions, Customers reports
2. Kiểm tra từng loại

**Kiểm tra:**
- ✅ Tất cả report types export được
- ✅ Data trong file khớp với màn hình
- ✅ Format đẹp, professional

### **Test 6: Error Handling**

**Bước:**
1. Tắt backend server
2. Click export button

**Kiểm tra:**
- ✅ Hiển thị error message màu đỏ
- ✅ Loading state được clear
- ✅ Button quay lại trạng thái bình thường

---

## 🎁 **TEST PROMOTION MANAGEMENT**

**Yêu cầu:** Đăng nhập với role Manager hoặc Admin

### **Test 1: Tạo Khuyến Mãi PERCENT**

**Bước:**
1. Vào "Quản lý Khuyến mãi"
2. Click "Thêm khuyến mãi"
3. Điền:
   - Mã: `TEST10`
   - Tên: "Test 10%"
   - Loại: **PERCENT**
   - Giá trị: `10`
   - Max giảm: `30000`
   - Active: ✅
4. Click "Lưu"

**Kiểm tra:**
- ✅ Khuyến mãi xuất hiện trong danh sách
- ✅ Summary cards cập nhật

### **Test 2: Tạo Khuyến Mãi AMOUNT**

**Bước:**
1. Click "Thêm khuyến mãi"
2. Điền:
   - Mã: `TEST20K`
   - Tên: "Test 20k"
   - Loại: **AMOUNT**
   - Giá trị: `20000`
   - Min subtotal: `100000`
3. Click "Lưu"

**Kiểm tra:**
- ✅ Khuyến mãi xuất hiện trong danh sách

### **Test 3: Validation**

**Bước:**
1. Tạo KM với giá trị = `-5` → ❌ Phải có lỗi
2. Tạo KM PERCENT với giá trị = `101` → ❌ Phải có lỗi
3. Tạo KM với mã trùng → ❌ Phải có lỗi "Mã đã tồn tại"

**Kiểm tra:**
- ✅ Validation hoạt động đúng
- ✅ Error messages rõ ràng

### **Test 4: Sửa Khuyến Mãi**

**Bước:**
1. Click icon "Sửa" (pencil)
2. Sửa tên thành "Tên mới"
3. Click "Lưu"

**Kiểm tra:**
- ✅ Cập nhật trong danh sách

### **Test 5: Xem Chi Tiết**

**Bước:**
1. Click icon "Xem" (eye)
2. Xem các tabs: "Thông tin", "Thống kê", "Lịch sử"

**Kiểm tra:**
- ✅ Hiển thị đầy đủ thông tin
- ✅ Thống kê chính xác
- ✅ Lịch sử đầy đủ

### **Test 6: Bật/Tắt Khuyến Mãi**

**Bước:**
1. Toggle switch của một KM Active → Inactive
2. Toggle lại → Active

**Kiểm tra:**
- ✅ Trạng thái cập nhật
- ✅ KM Inactive không thể dùng trong POS

### **Test 7: Xóa Khuyến Mãi**

**Bước:**
1. Click icon "Xóa" (trash)
2. Confirm

**Kiểm tra:**
- ✅ KM biến mất

### **Test 8: Áp Dụng Trong POS**

**Bước:**
1. Mở POS
2. Tạo đơn
3. Nhập mã khuyến mãi `TEST10`
4. Áp dụng

**Kiểm tra:**
- ✅ KM được áp dụng
- ✅ Số tiền giảm tính đúng
- ✅ Tổng tiền được tính lại

---

## 📦 **TEST INVENTORY MANAGEMENT**

**Yêu cầu:** Đăng nhập với role Manager hoặc Admin

### **Test 1: Xem Danh Sách Nguyên Liệu**

**Bước:**
1. Vào "Quản lý Kho"
2. Xem danh sách nguyên liệu

**Kiểm tra:**
- ✅ Hiển thị tất cả nguyên liệu
- ✅ Hiển thị: Tên, Đơn vị, Tồn kho, Giá
- ✅ Có thể tìm kiếm, lọc

### **Test 2: Thêm Nguyên Liệu**

**Bước:**
1. Click "Thêm nguyên liệu"
2. Điền đầy đủ thông tin
3. Click "Lưu"

**Kiểm tra:**
- ✅ Nguyên liệu xuất hiện trong danh sách

### **Test 3: Nhập Kho**

**Bước:**
1. Chọn nguyên liệu
2. Click "Nhập kho"
3. Nhập số lượng, giá, ngày hết hạn
4. Click "Xác nhận"

**Kiểm tra:**
- ✅ Tồn kho được cập nhật
- ✅ Lịch sử nhập kho được ghi lại
- ✅ Batch tracking hoạt động

### **Test 4: Xuất Kho**

**Bước:**
1. Chọn nguyên liệu
2. Click "Xuất kho"
3. Nhập số lượng, lý do
4. Click "Xác nhận"

**Kiểm tra:**
- ✅ Tồn kho được cập nhật
- ✅ Lịch sử xuất kho được ghi lại

### **Test 5: Cảnh Báo Hết Hàng**

**Bước:**
1. Kiểm tra nguyên liệu có tồn kho thấp
2. Xem cảnh báo

**Kiểm tra:**
- ✅ Hiển thị cảnh báo khi tồn kho thấp
- ✅ Có thể cấu hình ngưỡng cảnh báo

### **Test 6: Export Inventory Report**

**Bước:**
1. Click "Xuất báo cáo"
2. Chọn format (Excel/PDF/CSV)

**Kiểm tra:**
- ✅ File download
- ✅ Có đầy đủ thông tin

---

## 📅 **TEST RESERVATION SYSTEM**

**Yêu cầu:** Đăng nhập với role Manager, Admin hoặc Cashier

### **Test 1: Tạo Đặt Bàn**

**Bước:**
1. Vào "Quản lý Đặt bàn"
2. Click "Đặt bàn mới"
3. Điền:
   - Tên khách
   - Số điện thoại
   - Ngày giờ
   - Số người
   - Bàn
4. Click "Lưu"

**Kiểm tra:**
- ✅ Đặt bàn được tạo
- ✅ Hiển thị trong lịch
- ✅ Bàn được đánh dấu "Đã đặt"

### **Test 2: Xác Nhận Đặt Bàn**

**Bước:**
1. Chọn đặt bàn chờ xác nhận
2. Click "Xác nhận"

**Kiểm tra:**
- ✅ Trạng thái chuyển sang "Đã xác nhận"
- ✅ Khách được thông báo (nếu có)

### **Test 3: Check-in**

**Bước:**
1. Khách đến
2. Click "Check-in"

**Kiểm tra:**
- ✅ Trạng thái chuyển sang "Đã đến"
- ✅ Có thể tạo đơn cho bàn này

### **Test 4: Hủy Đặt Bàn**

**Bước:**
1. Chọn đặt bàn
2. Click "Hủy"
3. Nhập lý do
4. Xác nhận

**Kiểm tra:**
- ✅ Đặt bàn bị hủy
- ✅ Bàn trở về trạng thái trống

### **Test 5: Xem Lịch Đặt Bàn**

**Bước:**
1. Xem lịch theo ngày/tuần/tháng

**Kiểm tra:**
- ✅ Hiển thị tất cả đặt bàn
- ✅ Có thể lọc theo trạng thái
- ✅ Có thể xem chi tiết

---

## 👥 **TEST CUSTOMER PORTAL**

**Yêu cầu:** Truy cập từ browser (không cần đăng nhập)

### **Test 1: Xem Trang Chủ**

**Bước:**
1. Truy cập `/customer` hoặc `/`
2. Xem trang chủ

**Kiểm tra:**
- ✅ Hiển thị thông tin quán
- ✅ Có menu navigation
- ✅ Có banner/slider

### **Test 2: Xem Menu**

**Bước:**
1. Click "Thực đơn"
2. Xem danh sách sản phẩm

**Kiểm tra:**
- ✅ Hiển thị tất cả sản phẩm
- ✅ Có thể lọc theo danh mục
- ✅ Có thể xem chi tiết sản phẩm

### **Test 3: Đăng Ký/Đăng Nhập**

**Bước:**
1. Click "Đăng ký"
2. Điền thông tin
3. Click "Đăng ký"

**Kiểm tra:**
- ✅ Đăng ký thành công
- ✅ Có thể đăng nhập

### **Test 4: Đặt Hàng Online**

**Bước:**
1. Thêm sản phẩm vào giỏ hàng
2. Click "Thanh toán"
3. Điền thông tin giao hàng
4. Chọn phương thức thanh toán
5. Xác nhận đặt hàng

**Kiểm tra:**
- ✅ Đơn hàng được tạo
- ✅ Nhận được xác nhận
- ✅ Có thể theo dõi đơn hàng

### **Test 5: Xem Lịch Sử Đơn Hàng**

**Bước:**
1. Đăng nhập
2. Vào "Lịch sử đơn hàng"

**Kiểm tra:**
- ✅ Hiển thị tất cả đơn hàng
- ✅ Có thể xem chi tiết
- ✅ Có thể đặt lại

### **Test 6: Đặt Bàn Online**

**Bước:**
1. Click "Đặt bàn"
2. Chọn ngày giờ
3. Chọn số người
4. Điền thông tin
5. Xác nhận

**Kiểm tra:**
- ✅ Đặt bàn thành công
- ✅ Nhận được xác nhận

---

## 🔄 **TEST REAL-TIME UPDATES**

### **Test 1: SSE Connection**

**Bước:**
1. Mở DevTools (F12) → Network tab
2. Filter: "EventSource" hoặc "SSE"
3. Thực hiện action trong POS

**Kiểm tra:**
- ✅ Có connection SSE
- ✅ Nhận được events real-time

### **Test 2: Table Status Updates**

**Bước:**
1. Mở 2 browser:
   - Browser 1: POS (tạo đơn cho bàn 1)
   - Browser 2: POS (xem bàn 1)
2. Tạo đơn trong Browser 1

**Kiểm tra:**
- ✅ Browser 2 cập nhật ngay lập tức
- ✅ Bàn 1 chuyển sang "Có khách"
- ✅ Không cần refresh

### **Test 3: Kitchen Updates**

**Bước:**
1. Browser 1: POS (tạo đơn)
2. Browser 2: Kitchen Display
3. Tạo đơn trong Browser 1

**Kiểm tra:**
- ✅ Món xuất hiện ngay trong Kitchen Display
- ✅ Không cần refresh

### **Test 4: Order Status Updates**

**Bước:**
1. Browser 1: POS (tạo đơn)
2. Browser 2: Kitchen (hoàn thành món)
3. Hoàn thành món trong Browser 2

**Kiểm tra:**
- ✅ POS được thông báo món đã hoàn thành
- ✅ Trạng thái đơn cập nhật

---

## ✅ **CHECKLIST TỔNG HỢP**

### **🔐 Authentication & Authorization**
- [ ] Đăng nhập thành công
- [ ] Đăng xuất thành công
- [ ] Phân quyền đúng theo role
- [ ] Token expiry hoạt động

### **🍽️ Menu Management**
- [ ] CRUD danh mục
- [ ] CRUD sản phẩm
- [ ] CRUD size
- [ ] CRUD tùy chọn
- [ ] CRUD topping
- [ ] Tìm kiếm, lọc

### **🏠 Area & Table Management**
- [ ] CRUD khu vực
- [ ] CRUD bàn
- [ ] Lock/unlock bàn

### **💼 Shift Management**
- [ ] Mở ca
- [ ] Đóng ca
- [ ] Xem báo cáo ca
- [ ] In báo cáo

### **🛒 POS System**
- [ ] Tạo đơn tại bàn
- [ ] Thêm/sửa/xóa món
- [ ] Đổi bàn
- [ ] Áp dụng khuyến mãi
- [ ] Thanh toán
- [ ] Hủy đơn
- [ ] Tạo đơn mang đi

### **🥡 Takeaway Orders**
- [ ] Xem danh sách
- [ ] Tạo đơn mới
- [ ] Đánh dấu giao hàng

### **👨‍🍳 Kitchen Display System**
- [ ] Xem hàng đợi
- [ ] Bắt đầu làm món
- [ ] Hoàn thành món
- [ ] Hủy món
- [ ] Lọc theo khu vực/bàn
- [ ] Real-time updates

### **💳 Payments**
- [ ] Thanh toán tiền mặt
- [ ] Thanh toán online (PayOS)
- [ ] Thanh toán thẻ
- [ ] Multi-tender
- [ ] Hoàn tiền

### **🧾 Invoices**
- [ ] Xem hóa đơn
- [ ] In hóa đơn
- [ ] In lại hóa đơn

### **📊 Reports & Analytics**
- [ ] Revenue report
- [ ] Profit report
- [ ] Products report
- [ ] Promotions report
- [ ] Customers report

### **📥 Export Functionality**
- [ ] Export Revenue - Excel
- [ ] Export Revenue - PDF
- [ ] Export Revenue - CSV
- [ ] Export Profit - Excel/PDF/CSV
- [ ] Export các report khác
- [ ] Error handling

### **🎁 Promotion Management**
- [ ] Tạo khuyến mãi PERCENT
- [ ] Tạo khuyến mãi AMOUNT
- [ ] Validation
- [ ] Sửa khuyến mãi
- [ ] Xem chi tiết
- [ ] Bật/tắt
- [ ] Xóa
- [ ] Áp dụng trong POS

### **📦 Inventory Management**
- [ ] Xem danh sách
- [ ] Thêm nguyên liệu
- [ ] Nhập kho
- [ ] Xuất kho
- [ ] Cảnh báo hết hàng
- [ ] Export report

### **📅 Reservation System**
- [ ] Tạo đặt bàn
- [ ] Xác nhận đặt bàn
- [ ] Check-in
- [ ] Hủy đặt bàn
- [ ] Xem lịch

### **👥 Customer Portal**
- [ ] Xem trang chủ
- [ ] Xem menu
- [ ] Đăng ký/đăng nhập
- [ ] Đặt hàng online
- [ ] Xem lịch sử
- [ ] Đặt bàn online

### **🔄 Real-time Updates**
- [ ] SSE connection
- [ ] Table status updates
- [ ] Kitchen updates
- [ ] Order status updates

---

## 🐛 **TROUBLESHOOTING**

### **Lỗi Kết Nối Database**
- Kiểm tra PostgreSQL đang chạy
- Kiểm tra thông tin trong `.env`
- Kiểm tra network connection

### **Lỗi CORS**
- Kiểm tra backend CORS config
- Kiểm tra frontend proxy config

### **Lỗi JWT**
- Kiểm tra token trong localStorage
- Kiểm tra token expiry
- Đăng nhập lại

### **Lỗi Real-time Updates**
- Kiểm tra SSE connection trong Network tab
- Kiểm tra backend SSE endpoint
- Refresh trang

### **Lỗi Export**
- Kiểm tra backend server đang chạy
- Kiểm tra font file (cho PDF)
- Kiểm tra permissions

---

## 📝 **GHI CHÚ KẾT QUẢ**

Sau khi test xong, ghi lại:

### **✅ PASS:**
- Liệt kê các test cases đã pass

### **❌ FAIL:**
- Liệt kê các test cases fail
- Ghi lại error messages
- Chụp screenshot (nếu có)

### **⚠️ ISSUES:**
- Liệt kê các vấn đề nhỏ
- Đề xuất cải thiện

---

## 🎯 **KẾT LUẬN**

Sau khi hoàn thành tất cả test cases:

1. ✅ **Nếu tất cả PASS** → Hệ thống sẵn sàng sử dụng!
2. ⚠️ **Nếu có FAIL** → Fix lỗi và test lại
3. 📝 **Document** các issues phát hiện
4. 🚀 **Deploy** và test trên production

---

**Chúc bạn test thành công!** 🎉

**Cập nhật:** 2025-01-XX  
**Version:** 1.0

