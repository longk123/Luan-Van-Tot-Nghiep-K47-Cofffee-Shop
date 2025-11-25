# ✅ CHECKLIST TEST TOÀN BỘ HỆ THỐNG - CoffeePOS

**Ngày test:** _______________  
**Người test:** _______________  
**Phiên bản:** 1.0

---

## 🔧 **CHUẨN BỊ**

- [ ] Backend server chạy tại `http://localhost:5000`
- [ ] Frontend server chạy tại `http://localhost:5173`
- [ ] Database kết nối thành công
- [ ] Không có lỗi trong console

---

## 🔐 **AUTHENTICATION & AUTHORIZATION**

- [ ] Đăng nhập thành công (Admin)
- [ ] Đăng nhập thành công (Manager)
- [ ] Đăng nhập thành công (Cashier)
- [ ] Đăng nhập thành công (Kitchen)
- [ ] Đăng xuất thành công
- [ ] Phân quyền Admin đúng
- [ ] Phân quyền Manager đúng
- [ ] Phân quyền Cashier đúng
- [ ] Phân quyền Kitchen đúng
- [ ] Token expiry hoạt động

---

## 🍽️ **MENU MANAGEMENT**

- [ ] Thêm danh mục
- [ ] Sửa danh mục
- [ ] Xóa danh mục
- [ ] Thêm sản phẩm
- [ ] Sửa sản phẩm
- [ ] Xóa sản phẩm
- [ ] Thêm size
- [ ] Gán giá cho size
- [ ] Thêm tùy chọn
- [ ] Thêm mức tùy chọn
- [ ] Thêm topping
- [ ] Đặt giá topping
- [ ] Tìm kiếm sản phẩm
- [ ] Lọc theo danh mục

---

## 🏠 **AREA & TABLE MANAGEMENT**

- [ ] Thêm khu vực
- [ ] Sửa khu vực
- [ ] Xóa khu vực
- [ ] Thêm bàn
- [ ] Sửa bàn
- [ ] Xóa bàn
- [ ] Lock bàn
- [ ] Unlock bàn

---

## 💼 **SHIFT MANAGEMENT**

- [ ] Mở ca thành công
- [ ] Nhập tiền đầu ca
- [ ] Không thể mở ca mới khi đang có ca
- [ ] Đóng ca thành công
- [ ] Xem báo cáo ca
- [ ] Báo cáo hiển thị đúng số liệu
- [ ] In báo cáo ca
- [ ] Xem lịch sử ca

---

## 🛒 **POS SYSTEM**

- [ ] Tạo đơn tại bàn
- [ ] Thêm món vào đơn
- [ ] Chọn size
- [ ] Chọn tùy chọn (đường, đá)
- [ ] Chọn topping
- [ ] Sửa số lượng món
- [ ] Sửa tùy chọn món
- [ ] Xóa món khỏi đơn
- [ ] Đổi bàn
- [ ] Áp dụng mã khuyến mãi
- [ ] Tính tổng tiền đúng
- [ ] Thanh toán tiền mặt
- [ ] Tính tiền thừa đúng
- [ ] Thanh toán online (PayOS)
- [ ] Thanh toán thẻ
- [ ] Multi-tender (nhiều phương thức)
- [ ] Hủy đơn
- [ ] Tạo đơn mang đi
- [ ] Bàn cập nhật trạng thái real-time

---

## 🥡 **TAKEAWAY ORDERS**

- [ ] Xem danh sách đơn mang đi
- [ ] Lọc theo trạng thái
- [ ] Tạo đơn mang đi mới
- [ ] Đánh dấu giao hàng
- [ ] Xem chi tiết đơn

---

## 👨‍🍳 **KITCHEN DISPLAY SYSTEM (KDS)**

- [ ] Xem hàng đợi (cột "Chờ làm")
- [ ] Hiển thị đầy đủ thông tin món
- [ ] Bắt đầu làm món
- [ ] Món chuyển sang "Đang làm"
- [ ] Timer hoạt động
- [ ] Hoàn thành món
- [ ] Món biến mất khỏi board
- [ ] Hủy món
- [ ] Lọc theo khu vực
- [ ] Lọc theo bàn
- [ ] Real-time updates (không cần refresh)

---

## 💳 **PAYMENTS**

- [ ] Thanh toán tiền mặt - tính đúng
- [ ] Thanh toán tiền mặt - tiền thừa đúng
- [ ] Thanh toán online - QR code hiển thị
- [ ] Thanh toán online - thanh toán thành công
- [ ] Thanh toán thẻ
- [ ] Multi-tender - tổng đúng
- [ ] Hoàn tiền
- [ ] Lịch sử thanh toán

---

## 🧾 **INVOICES**

- [ ] Hóa đơn hiển thị đầy đủ thông tin
- [ ] In hóa đơn
- [ ] In lại hóa đơn
- [ ] Tiếng Việt hiển thị đúng

---

## 📊 **REPORTS & ANALYTICS**

### **Revenue Report:**
- [ ] Hiển thị tổng doanh thu
- [ ] Hiển thị doanh thu tại bàn
- [ ] Hiển thị doanh thu mang đi
- [ ] Hiển thị số đơn hàng
- [ ] Hiển thị đơn trung bình
- [ ] Biểu đồ hiển thị đúng
- [ ] Chi tiết theo ngày

### **Profit Report:**
- [ ] Hiển thị tổng doanh thu
- [ ] Hiển thị tổng chi phí
- [ ] Hiển thị lợi nhuận gộp
- [ ] Hiển thị tỷ lệ lợi nhuận
- [ ] Chi tiết theo sản phẩm
- [ ] Màu sắc đúng (âm=đỏ, dương=xanh)

### **Products Report:**
- [ ] Hiển thị danh sách sản phẩm
- [ ] Hiển thị số lượng bán
- [ ] Hiển thị doanh thu
- [ ] Hiển thị giá trung bình
- [ ] Sắp xếp, lọc

### **Promotions Report:**
- [ ] Hiển thị danh sách khuyến mãi
- [ ] Hiển thị số lần dùng
- [ ] Hiển thị tổng giảm giá

### **Customers Report:**
- [ ] Hiển thị danh sách khách hàng/bàn
- [ ] Hiển thị số đơn
- [ ] Hiển thị tổng chi tiêu
- [ ] Hiển thị trung bình/đơn

---

## 📥 **EXPORT FUNCTIONALITY**

### **Revenue Export:**
- [ ] Export Excel - download được
- [ ] Export Excel - file mở được
- [ ] Export Excel - có 2 sheets
- [ ] Export Excel - data đúng
- [ ] Export Excel - tiếng Việt đúng
- [ ] Export PDF - download được
- [ ] Export PDF - tiếng Việt đúng
- [ ] Export CSV - download được
- [ ] Export CSV - mở Excel được
- [ ] Export CSV - tiếng Việt đúng

### **Profit Export:**
- [ ] Export Excel - có 2 sheets
- [ ] Export Excel - màu sắc đúng
- [ ] Export PDF
- [ ] Export CSV

### **Other Reports Export:**
- [ ] Products export
- [ ] Promotions export
- [ ] Customers export

### **Error Handling:**
- [ ] Error khi backend down
- [ ] Loading state
- [ ] Disabled state khi không có data

---

## 🎁 **PROMOTION MANAGEMENT**

- [ ] Tạo khuyến mãi PERCENT
- [ ] Tạo khuyến mãi AMOUNT
- [ ] Validation - giá trị âm
- [ ] Validation - PERCENT > 100
- [ ] Validation - mã trùng
- [ ] Sửa khuyến mãi
- [ ] Xem chi tiết khuyến mãi
- [ ] Tab "Thông tin"
- [ ] Tab "Thống kê"
- [ ] Tab "Lịch sử"
- [ ] Bật/tắt khuyến mãi
- [ ] Xóa khuyến mãi
- [ ] Áp dụng trong POS
- [ ] Tính giảm giá đúng

---

## 📦 **INVENTORY MANAGEMENT**

- [ ] Xem danh sách nguyên liệu
- [ ] Tìm kiếm nguyên liệu
- [ ] Thêm nguyên liệu
- [ ] Sửa nguyên liệu
- [ ] Nhập kho
- [ ] Tồn kho cập nhật
- [ ] Batch tracking
- [ ] Xuất kho
- [ ] Cảnh báo hết hàng
- [ ] Export inventory report

---

## 📅 **RESERVATION SYSTEM**

- [ ] Tạo đặt bàn
- [ ] Xác nhận đặt bàn
- [ ] Check-in khách
- [ ] Hủy đặt bàn
- [ ] Xem lịch đặt bàn
- [ ] Lọc theo ngày
- [ ] Lọc theo trạng thái
- [ ] Bàn được đánh dấu "Đã đặt"

---

## 👥 **CUSTOMER PORTAL**

- [ ] Xem trang chủ
- [ ] Xem menu
- [ ] Lọc sản phẩm theo danh mục
- [ ] Xem chi tiết sản phẩm
- [ ] Đăng ký tài khoản
- [ ] Đăng nhập
- [ ] Thêm sản phẩm vào giỏ hàng
- [ ] Xem giỏ hàng
- [ ] Cập nhật số lượng
- [ ] Xóa sản phẩm khỏi giỏ
- [ ] Thanh toán
- [ ] Đặt hàng thành công
- [ ] Xem lịch sử đơn hàng
- [ ] Xem chi tiết đơn hàng
- [ ] Đặt bàn online
- [ ] Xác nhận đặt bàn

---

## 🔄 **REAL-TIME UPDATES**

- [ ] SSE connection thành công
- [ ] Table status cập nhật real-time
- [ ] Kitchen cập nhật real-time
- [ ] Order status cập nhật real-time
- [ ] Không cần refresh trang

---

## 🐛 **BUGS & ISSUES**

### **Lỗi Nghiêm Trọng (Critical):**
1. _________________________________
2. _________________________________
3. _________________________________

### **Lỗi Quan Trọng (High):**
1. _________________________________
2. _________________________________
3. _________________________________

### **Lỗi Trung Bình (Medium):**
1. _________________________________
2. _________________________________
3. _________________________________

### **Lỗi Nhỏ (Low):**
1. _________________________________
2. _________________________________
3. _________________________________

### **Đề Xuất Cải Thiện:**
1. _________________________________
2. _________________________________
3. _________________________________

---

## 📊 **TỔNG KẾT**

**Tổng số test cases:** _______________  
**PASS:** _______________  
**FAIL:** _______________  
**SKIP:** _______________  

**Tỷ lệ PASS:** _______%

---

## ✅ **KẾT LUẬN**

- [ ] Tất cả test cases quan trọng đã PASS
- [ ] Không có lỗi nghiêm trọng
- [ ] Hệ thống sẵn sàng sử dụng

**Ghi chú thêm:**
_________________________________
_________________________________
_________________________________

---

**Người test:** _______________  
**Ngày hoàn thành:** _______________  
**Chữ ký:** _______________

