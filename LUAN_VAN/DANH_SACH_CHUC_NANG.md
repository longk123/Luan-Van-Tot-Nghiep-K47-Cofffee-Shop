# 📋 DANH SÁCH CHỨC NĂNG HỆ THỐNG COFFEEPOS

*Tài liệu tổng hợp đầy đủ tất cả các chức năng của hệ thống*

---

## 📊 TỔNG QUAN

- **Tổng số chức năng chính**: **18 Use Cases**
- **Tổng số tính năng đã triển khai**: **14 nhóm chức năng hoàn chỉnh**
- **Số lượng API Endpoints**: **~107 endpoints**
- **Số lượng Frontend Pages**: **22+ pages** (12 Staff Portal + 10 Customer Portal)
- **Số lượng Database Tables**: **47 bảng**

---

## 🎯 PHÂN LOẠI THEO NHÓM CHỨC NĂNG

### 🔐 **1. XÁC THỰC & PHÂN QUYỀN (Authentication & Authorization)**

#### 1.1. Đăng nhập Staff (UC-01)
- ✅ Đăng nhập với username/password
- ✅ Xác thực JWT token
- ✅ Phân quyền theo role (Admin, Manager, Cashier, Kitchen, Waiter)
- ✅ Middleware bảo vệ routes
- ✅ Session management

#### 1.2. Đăng ký khách hàng (UC-17)
- ✅ Đăng ký với Email/SĐT/Password
- ✅ Kiểm tra trùng lặp tài khoản
- ✅ Tự động đăng nhập sau đăng ký
- ✅ Validation dữ liệu đầu vào

#### 1.3. Đăng nhập khách hàng (UC-18)
- ✅ Đăng nhập với Email/Password hoặc SĐT/Password
- ✅ JWT token cho Customer
- ✅ Quản lý session khách hàng
- ✅ Auto-logout khi hết hạn

---

### 💼 **2. QUẢN LÝ CA LÀM VIỆC (Shift Management)**

#### 2.1. Mở ca làm việc (UC-02)
- ✅ Nhập tiền đầu ca
- ✅ Tạo ca mới với trạng thái OPEN
- ✅ Ghi nhận nhân viên mở ca
- ✅ Validation: chỉ 1 ca OPEN tại 1 thời điểm

#### 2.2. Đóng ca làm việc (UC-03)
- ✅ Nhập tiền cuối ca
- ✅ Tính toán doanh thu ca
- ✅ Tạo báo cáo ca (PDF)
- ✅ Thống kê: số đơn, doanh thu, lợi nhuận
- ✅ Kitchen stats (số món đã làm, thời gian trung bình)
- ✅ Tracking đơn chuyển ca

---

### 🛒 **3. BÁN HÀNG - POS (Point of Sale)**

#### 3.1. Tạo đơn hàng tại bàn (UC-04)
- ✅ Chọn bàn từ danh sách
- ✅ Xem trạng thái bàn (trống, đang dùng, đã đặt)
- ✅ Thêm món vào đơn với tùy chọn:
  - Biến thể size (S/M/L)
  - Tùy chọn đường (0%, 30%, 50%, 70%, 100%)
  - Tùy chọn đá (Không đá, Ít đá, Bình thường, Nhiều đá)
  - Topping (thêm phí)
- ✅ Real-time cập nhật qua SSE
- ✅ Gửi đơn xuống bếp tự động

#### 3.2. Tạo đơn mang đi (UC-05)
- ✅ Tạo đơn loại TAKEAWAY
- ✅ Thêm thông tin khách hàng (tùy chọn)
- ✅ Gửi xuống bếp
- ✅ Theo dõi trạng thái đơn

#### 3.3. Quản lý đơn hàng
- ✅ Thêm món vào đơn
- ✅ Sửa số lượng món
- ✅ Xóa món khỏi đơn
- ✅ Áp dụng mã khuyến mãi
- ✅ Giảm giá thủ công (Manager)
- ✅ Đổi bàn (chuyển đơn sang bàn khác)
- ✅ Hủy đơn hàng
- ✅ Xem tổng tiền, thuế, giảm giá

#### 3.4. Thanh toán đơn hàng (UC-06)
- ✅ Thanh toán đa phương thức:
  - Tiền mặt (tính tiền thừa)
  - PayOS/VietQR (thanh toán online)
  - Thẻ
  - Kết hợp nhiều phương thức
- ✅ Multi-tender support
- ✅ In hóa đơn sau thanh toán
- ✅ Lưu lịch sử thanh toán
- ✅ Hoàn tiền (Refund)

---

### 👨‍🍳 **4. KITCHEN DISPLAY SYSTEM (KDS)**

#### 4.1. Xem Kitchen Display (UC-08)
- ✅ Hiển thị đơn hàng real-time qua SSE
- ✅ Kanban board 2 cột:
  - Chờ làm (QUEUED)
  - Đang làm (MAKING)
- ✅ Thông tin chi tiết:
  - Tên bàn/số đơn
  - Tên món, size, tùy chọn
  - Số lượng
  - Thời gian chờ
- ✅ Timer cho mỗi món
- ✅ Cảnh báo màu sắc (đỏ: chờ quá lâu)
- ✅ Filter theo khu vực/bàn

#### 4.2. Quản lý trạng thái món
- ✅ Bắt đầu làm món (QUEUED → MAKING)
- ✅ Hoàn thành món (MAKING → DONE)
- ✅ Hủy món (CANCEL)
- ✅ Xem lịch sử đã làm
- ✅ Thống kê hiệu suất bếp

---

### 🍽️ **5. QUẢN LÝ THỰC ĐƠN (Menu Management)**

#### 5.1. Quản lý thực đơn (UC-07)
- ✅ **Quản lý danh mục (Categories)**:
  - Thêm/Sửa/Xóa danh mục
  - Sắp xếp thứ tự hiển thị
  - Upload hình ảnh danh mục
  
- ✅ **Quản lý món (Menu Items)**:
  - Thêm/Sửa/Xóa món
  - Upload hình ảnh món
  - Thiết lập giá bán
  - Bật/tắt món (active/inactive)
  - Mô tả sản phẩm
  
- ✅ **Quản lý biến thể (Variants/Size)**:
  - Tạo biến thể (S/M/L)
  - Thiết lập giá cho từng size
  - Liên kết với món
  
- ✅ **Quản lý tùy chọn (Options)**:
  - Tùy chọn đường (Sugar levels)
  - Tùy chọn đá (Ice levels)
  - Topping (thêm phí)
  - Mức độ tùy chọn (100%, 70%, 50%, 30%, 0%)
  
- ✅ **Công thức món (Recipe)**:
  - Liên kết nguyên liệu với món
  - Tính giá vốn tự động
  - Hỗ trợ tính lợi nhuận

---

### 🏠 **6. QUẢN LÝ KHU VỰC & BÀN (Area & Table Management)**

#### 6.1. Quản lý khu vực
- ✅ Thêm/Sửa/Xóa khu vực
- ✅ Mô tả khu vực
- ✅ Sắp xếp thứ tự

#### 6.2. Quản lý bàn
- ✅ Thêm/Sửa/Xóa bàn
- ✅ Gán bàn vào khu vực
- ✅ Đặt tên bàn
- ✅ Trạng thái bàn:
  - Trống (AVAILABLE)
  - Đang dùng (OCCUPIED)
  - Đã đặt (RESERVED)
  - Khóa (LOCKED)
- ✅ Lock/Unlock bàn
- ✅ Real-time cập nhật trạng thái

---

### 📅 **7. HỆ THỐNG ĐẶT BÀN (Reservation System)**

#### 7.1. Quản lý đặt bàn (UC-10)
- ✅ **Tạo đặt bàn**:
  - Chọn ngày, giờ, số người
  - Nhập thông tin khách (tên, SĐT)
  - Chọn bàn (kiểm tra trùng lặp)
  - Nguồn đặt (PHONE, ONLINE, WALK_IN)
  
- ✅ **Xác nhận đặt bàn**:
  - Manager xác nhận
  - Gửi thông báo xác nhận
  
- ✅ **Check-in khách**:
  - Khách đến quán
  - Tự động tạo đơn hàng khi check-in
  
- ✅ **Quản lý trạng thái**:
  - PENDING (chờ xác nhận)
  - CONFIRMED (đã xác nhận)
  - CHECKED_IN (đã check-in)
  - CANCELLED (đã hủy)
  - NO_SHOW (khách không đến)
  
- ✅ **Timeline view**:
  - Xem lịch đặt bàn theo ngày
  - Filter theo trạng thái
  - Tìm kiếm bàn trống

#### 7.2. Đặt bàn trực tuyến (UC-14)
- ✅ Khách hàng đặt bàn qua Customer Portal
- ✅ Chọn ngày/giờ/số người
- ✅ Hệ thống tự động kiểm tra bàn trống
- ✅ Nhận thông báo xác nhận

---

### 📦 **8. QUẢN LÝ KHO (Inventory Management)**

#### 8.1. Quản lý kho (UC-09)
- ✅ **Quản lý nguyên liệu**:
  - Thêm/Sửa/Xóa nguyên liệu
  - Mã SKU, đơn vị tính
  - Giá nhập gần nhất
  - Tồn kho hiện tại
  - Ngưỡng cảnh báo tồn kho thấp
  
- ✅ **Nhập kho**:
  - Tạo phiếu nhập kho
  - Tạo lô hàng (batch) với:
    - Mã lô hàng
    - Số lượng nhập
    - Đơn giá nhập
    - Ngày nhập
    - Ngày hết hạn (HSD)
  - In phiếu nhập kho (PDF)
  - Lịch sử nhập kho
  
- ✅ **Xuất kho**:
  - Tự động xuất kho khi xác nhận đơn hàng
  - Xuất theo FIFO (First In First Out)
  - Xuất theo lô cũ trước
  - Tạo phiếu xuất kho
  - Lịch sử xuất kho
  
- ✅ **Cảnh báo**:
  - Cảnh báo tồn kho thấp
  - Cảnh báo sắp hết hạn (expiry warnings)
  - Cảnh báo hết hạn
  
- ✅ **Báo cáo tồn kho**:
  - Danh sách tồn kho
  - Báo cáo lô hàng
  - Báo cáo hết hạn

---

### 💳 **9. THANH TOÁN (Payments)**

#### 9.1. Phương thức thanh toán
- ✅ **Tiền mặt (Cash)**:
  - Nhập số tiền khách đưa
  - Tự động tính tiền thừa
  - In hóa đơn
  
- ✅ **PayOS/VietQR**:
  - Tích hợp PayOS API
  - Tạo QR Code thanh toán
  - Auto-polling trạng thái thanh toán
  - Webhook xử lý callback
  - Trang thành công/hủy thanh toán
  
- ✅ **Thẻ (Card)**:
  - Ghi nhận thanh toán bằng thẻ
  - Lưu lịch sử giao dịch
  
- ✅ **Kết hợp (Multi-tender)**:
  - Thanh toán bằng nhiều phương thức
  - Ví dụ: 50% tiền mặt + 50% PayOS

#### 9.2. Quản lý thanh toán
- ✅ Lịch sử thanh toán
- ✅ Hoàn tiền (Refund)
- ✅ Void payment
- ✅ Settlement tracking

---

### 🧾 **10. HÓA ĐƠN (Invoices)**

#### 10.1. Tạo và in hóa đơn
- ✅ **Hóa đơn tạm tính**:
  - In trước khi thanh toán
  - Hiển thị tổng tiền, giảm giá
  
- ✅ **Hóa đơn chính thức**:
  - In sau khi thanh toán
  - Thông tin đầy đủ:
    - Thông tin quán
    - Thông tin đơn hàng
    - Chi tiết món (tên, số lượng, giá, tùy chọn)
    - Tổng tiền, thuế, giảm giá
    - Phương thức thanh toán
    - Thời gian
  
- ✅ **PDF Generation**:
  - Tạo PDF với font tiếng Việt
  - Logo quán
  - Header/Footer tùy chỉnh
  
- ✅ **Reprint**:
  - In lại hóa đơn từ lịch sử
  - Log in hóa đơn

---

### 📊 **11. BÁO CÁO & THỐNG KÊ (Analytics & Reporting)**

#### 11.1. Xem báo cáo (UC-11)
- ✅ **Dashboard tổng quan**:
  - KPI cards:
    - Doanh thu hôm nay/tuần/tháng
    - Số đơn hàng
    - Số bàn phục vụ
    - % thay đổi so với kỳ trước
  - Biểu đồ doanh thu theo ngày
  - Top sản phẩm bán chạy
  
- ✅ **Báo cáo doanh thu**:
  - Doanh thu theo ngày/tuần/tháng/quý/năm
  - So sánh với kỳ trước
  - Biểu đồ xu hướng
  - Filter theo khoảng thời gian
  
- ✅ **Báo cáo lợi nhuận**:
  - Lợi nhuận theo đơn hàng
  - Lợi nhuận theo sản phẩm
  - Lợi nhuận theo danh mục
  - So sánh với kỳ trước
  - Tính giá vốn (bao gồm topping)
  - Export Excel
  
- ✅ **Báo cáo sản phẩm**:
  - Top sản phẩm bán chạy
  - Sản phẩm ít bán
  - Doanh thu theo danh mục
  
- ✅ **Báo cáo ca làm việc**:
  - Tổng kết ca
  - Doanh thu ca
  - Số đơn hàng
  - Kitchen stats
  
- ✅ **Export dữ liệu**:
  - Xuất Excel
  - Xuất PDF

---

### 🎁 **12. QUẢN LÝ KHUYẾN MÃI (Promotion Management)**

#### 12.1. Quản lý khuyến mãi (UC-16)
- ✅ **Tạo mã khuyến mãi**:
  - Mã giảm giá
  - Loại giảm giá (% hoặc số tiền)
  - Số tiền/Phần trăm giảm
  - Điều kiện áp dụng:
    - Giá trị đơn tối thiểu
    - Số lượng sử dụng tối đa
    - Thời gian hiệu lực
  - Trạng thái (active/inactive)
  
- ✅ **Áp dụng khuyến mãi**:
  - Nhập mã trong POS
  - Áp dụng cho đơn hàng
  - Tính toán giảm giá tự động
  - Xóa khuyến mãi khỏi đơn
  
- ✅ **Theo dõi sử dụng**:
  - Số lần đã sử dụng
  - Doanh thu từ khuyến mãi
  - Lịch sử áp dụng

---

### 👥 **13. QUẢN LÝ NHÂN VIÊN (Employee Management)**

#### 13.1. Quản lý nhân viên (UC-15)
- ✅ **CRUD nhân viên**:
  - Thêm/Sửa/Xóa tài khoản nhân viên
  - Thông tin: username, password, full_name, phone, email
  - Trạng thái (active/inactive)
  
- ✅ **Phân quyền**:
  - Gán roles (Manager, Cashier, Kitchen, Waiter)
  - Một user có thể có nhiều roles
  - Quản lý quyền truy cập
  
- ✅ **Lịch sử hoạt động**:
  - Xem log hoạt động của nhân viên
  - Lịch sử ca làm việc
  - Hiệu suất làm việc
  
- ✅ **Reset password**:
  - Admin reset mật khẩu nhân viên
  - Gửi mật khẩu mới

---

### 🛍️ **14. CỔNG KHÁCH HÀNG (Customer Portal)**

#### 14.1. Xem thực đơn (Guest & Customer)
- ✅ **Browse menu**:
  - Xem danh mục
  - Xem sản phẩm theo danh mục
  - Tìm kiếm sản phẩm
  - Xem hình ảnh, giá cả
  - Xem chi tiết sản phẩm
  
- ✅ **Chi tiết sản phẩm**:
  - Thông tin đầy đủ
  - Chọn size (S/M/L)
  - Chọn tùy chọn (đường, đá)
  - Chọn topping
  - Xem giá theo size
  - Thêm vào giỏ hàng

#### 14.2. Giỏ hàng (Shopping Cart)
- ✅ **Quản lý giỏ hàng**:
  - Thêm món vào giỏ
  - Cập nhật số lượng
  - Xóa món khỏi giỏ
  - Xóa toàn bộ giỏ hàng
  - Áp dụng mã khuyến mãi
  - Xóa mã khuyến mãi
  - Tính tổng tiền tự động
  
- ✅ **Lưu trữ giỏ hàng**:
  - Session-based (cho Guest)
  - User-based (cho Customer đã đăng nhập)
  - Persist giỏ hàng giữa các session

#### 14.3. Đặt hàng Online (UC-12)
- ✅ **Checkout process**:
  - Chọn loại đơn:
    - Tại quán (Dine-in): chọn bàn
    - Mang đi (Takeaway)
    - Giao hàng (Delivery): nhập địa chỉ
  - Nhập thông tin khách hàng
  - Chọn phương thức thanh toán:
    - PayOS (thanh toán trước)
    - COD (thanh toán khi nhận)
  - Xem tổng kết đơn hàng
  - Xác nhận đặt hàng
  
- ✅ **Thanh toán PayOS**:
  - Tạo QR Code thanh toán
  - Chuyển hướng đến PayOS
  - Xử lý callback
  - Trang thành công/hủy
  
- ✅ **Theo dõi đơn hàng**:
  - Xem trạng thái đơn real-time
  - Lịch sử đơn hàng
  - Chi tiết đơn hàng

#### 14.4. Quản lý tài khoản khách hàng
- ✅ **Thông tin cá nhân**:
  - Xem thông tin
  - Cập nhật thông tin
  - Đổi mật khẩu
  
- ✅ **Lịch sử đơn hàng**:
  - Xem tất cả đơn hàng
  - Filter theo trạng thái
  - Xem chi tiết đơn hàng
  
- ✅ **Lịch sử đặt bàn**:
  - Xem các lần đặt bàn
  - Trạng thái đặt bàn
  - Hủy đặt bàn

---

### 🤖 **15. AI CHATBOT (Google Gemini Integration)**

#### 15.1. Chat với AI Chatbot (UC-13)
- ✅ **Tương tác với AI**:
  - Chat với Google Gemini AI
  - Hỏi về menu, giá cả
  - Hỏi về khuyến mãi
  - Tư vấn món phù hợp
  - Hỏi về thông tin quán
  
- ✅ **Lưu trữ hội thoại**:
  - Lưu conversation history
  - Lưu từng message
  - Xem lại lịch sử chat
  
- ✅ **Tích hợp thông minh**:
  - AI hiểu context menu
  - Gợi ý món dựa trên sở thích
  - Trả lời tự nhiên

---

### 🚚 **16. QUẢN LÝ GIAO HÀNG (Delivery Management)**

#### 16.1. Quản lý đơn giao hàng (Waiter)
- ✅ **Xem đơn cần giao**:
  - Danh sách đơn DELIVERY
  - Thông tin khách hàng
  - Địa chỉ giao hàng
  - Số tiền COD
  
- ✅ **Cập nhật trạng thái giao hàng**:
  - Đã lấy hàng
  - Đang giao
  - Đã giao
  - Giao thất bại
  
- ✅ **Quản lý ví Waiter**:
  - Thu tiền COD
  - Ghi nhận giao dịch
  - Quyết toán với quán
  - Lịch sử giao dịch ví

---

### 🔔 **17. THÔNG BÁO & REAL-TIME (Notifications & SSE)**

#### 17.1. Real-time Updates (SSE)
- ✅ **Server-Sent Events**:
  - Cập nhật trạng thái bàn real-time
  - Cập nhật đơn hàng real-time
  - Cập nhật Kitchen queue real-time
  - Thông báo đóng ca
  
- ✅ **Event Types**:
  - `table.updated`: Bàn thay đổi trạng thái
  - `order.updated`: Đơn hàng thay đổi
  - `shift.closed`: Ca đã đóng

#### 17.2. Notifications (Hệ thống thông báo)
- ✅ **In-app notifications**:
  - Thông báo đặt bàn mới
  - Thông báo đơn hàng mới
  - Thông báo hết hàng
  - Thông báo sắp hết hạn
  
- ✅ **Notification center**:
  - Xem tất cả thông báo
  - Đánh dấu đã đọc
  - Xóa thông báo

---

### ⚙️ **18. CÀI ĐẶT HỆ THỐNG (System Settings)**

#### 18.1. Cài đặt hệ thống (Admin)
- ✅ **Thông tin quán**:
  - Tên quán
  - Địa chỉ
  - Số điện thoại
  - Email
  - Logo
  
- ✅ **Cấu hình thanh toán**:
  - PayOS API keys
  - Cấu hình thuế VAT
  - Phương thức thanh toán
  
- ✅ **Cấu hình in hóa đơn**:
  - Header/Footer
  - Logo hóa đơn
  - Thông tin quán
  
- ✅ **Cấu hình ca làm việc**:
  - Giờ mở cửa
  - Tiền đầu ca mặc định
  
- ✅ **Cấu hình Chatbot**:
  - Google Gemini API key
  - Prompt mặc định
  
- ✅ **Backup/Restore**:
  - Backup database
  - Restore database

---

## 📈 **PHÂN LOẠI THEO MỨC ĐỘ ƯU TIÊN**

### 🔴 **Mức độ Cao (13 Use Cases)**
1. UC-01: Đăng nhập
2. UC-02: Mở ca làm việc
3. UC-03: Đóng ca làm việc
4. UC-04: Tạo đơn hàng tại bàn
5. UC-05: Tạo đơn mang đi
6. UC-06: Thanh toán đơn hàng
7. UC-07: Quản lý thực đơn
8. UC-08: Xem Kitchen Display
9. UC-11: Xem báo cáo
10. UC-12: Đặt hàng Online
11. UC-13: Chat với AI Chatbot
12. UC-17: Đăng ký tài khoản khách hàng
13. UC-18: Đăng nhập khách hàng

### 🟡 **Mức độ Trung bình (5 Use Cases)**
1. UC-09: Quản lý kho
2. UC-10: Quản lý đặt bàn
3. UC-14: Đặt bàn trực tuyến
4. UC-15: Quản lý nhân viên
5. UC-16: Quản lý khuyến mãi

---

## 👥 **PHÂN LOẠI THEO VAI TRÒ**

### 👤 **Admin**
- ✅ Đăng nhập
- ✅ Quản lý nhân viên
- ✅ Quản lý phân quyền
- ✅ Xem log hệ thống
- ✅ Cài đặt hệ thống
- ✅ Truy cập tất cả chức năng

### 👨‍💼 **Manager**
- ✅ Đăng nhập
- ✅ Quản lý thực đơn
- ✅ Quản lý khu vực & bàn
- ✅ Quản lý kho
- ✅ Quản lý khuyến mãi
- ✅ Xem báo cáo & thống kê
- ✅ Quản lý ca làm việc
- ✅ Quản lý đặt bàn
- ✅ Truy cập POS, Kitchen

### 💰 **Cashier**
- ✅ Đăng nhập
- ✅ Mở/Đóng ca làm việc
- ✅ Tạo đơn hàng (tại bàn/mang đi)
- ✅ Thêm/Sửa/Xóa món trong đơn
- ✅ Thanh toán đơn hàng
- ✅ In hóa đơn
- ✅ Hủy đơn hàng
- ✅ Đổi bàn
- ✅ Áp dụng khuyến mãi
- ✅ Quản lý đặt bàn

### 👨‍🍳 **Kitchen**
- ✅ Đăng nhập
- ✅ Xem Kitchen Display
- ✅ Bắt đầu làm món
- ✅ Hoàn thành món
- ✅ Xem lịch sử đã làm

### 🍽️ **Waiter**
- ✅ Đăng nhập
- ✅ Tạo đơn hàng (không thanh toán)
- ✅ Thêm/Sửa/Xóa món trong đơn
- ✅ Gửi đơn xuống bếp
- ✅ Giao món cho khách
- ✅ Xem đơn cần giao (Delivery)
- ✅ Cập nhật trạng thái giao hàng
- ✅ Quản lý ví tiền (COD)
- ❌ **KHÔNG có quyền thanh toán**

### 👥 **Customer**
- ✅ Đăng nhập
- ✅ Đăng xuất
- ✅ Xem thực đơn
- ✅ Thêm món vào giỏ hàng
- ✅ Quản lý giỏ hàng
- ✅ Áp dụng mã khuyến mãi
- ✅ Đặt hàng (Checkout)
- ✅ Thanh toán online (PayOS)
- ✅ Đặt bàn trước
- ✅ Xem lịch sử đơn hàng
- ✅ Xem lịch sử đặt bàn
- ✅ Quản lý thông tin cá nhân
- ✅ Chat với AI Chatbot

### 🚶 **Guest**
- ✅ Xem thực đơn
- ✅ Xem chi tiết sản phẩm
- ✅ Chat với AI Chatbot
- ✅ Đăng ký tài khoản

---

## 📊 **THỐNG KÊ TỔNG QUAN**

| Hạng mục | Số lượng |
|----------|----------|
| **Use Cases** | 18 |
| **Nhóm chức năng chính** | 18 |
| **API Endpoints** | ~107 |
| **Frontend Pages** | 22+ |
| **Database Tables** | 47 |
| **Vai trò người dùng** | 7 (Admin, Manager, Cashier, Kitchen, Waiter, Customer, Guest) |
| **Phương thức thanh toán** | 3 (Cash, PayOS, Card) |
| **Loại đơn hàng** | 3 (DINE_IN, TAKEAWAY, DELIVERY) |

---

## ✅ **TRẠNG THÁI TRIỂN KHAI**

### ✅ **Đã hoàn thành 100%**
1. ✅ Xác thực & Phân quyền
2. ✅ Quản lý ca làm việc
3. ✅ POS System
4. ✅ Kitchen Display System
5. ✅ Quản lý thực đơn
6. ✅ Quản lý khu vực & bàn
7. ✅ Hệ thống đặt bàn
8. ✅ Quản lý kho
9. ✅ Thanh toán
10. ✅ Hóa đơn
11. ✅ Báo cáo & Thống kê
12. ✅ Real-time Updates (SSE)
13. ✅ Upload Files
14. ✅ Customer Portal (Backend + Frontend)

### ⚠️ **Đã có Backend, thiếu Frontend**
1. ⚠️ Quản lý khuyến mãi (có API, chưa tích hợp UI vào POS)
2. ⚠️ Quản lý nhân viên (có bảng, chưa có CRUD API đầy đủ)

### ❌ **Chưa có**
1. ❌ Báo cáo Chi phí (Expense Tracking) - có bảng nhưng chưa có API/UI
2. ❌ Notification System - có bảng nhưng chưa có API/UI
3. ❌ Settings Page - chưa có UI

---

## 🎯 **KẾT LUẬN**

Hệ thống **CoffeePOS** có tổng cộng **18 Use Cases** và **18 nhóm chức năng chính**, được triển khai với:
- **~107 API endpoints**
- **22+ Frontend pages**
- **47 database tables**
- **7 vai trò người dùng**

Hệ thống đã hoàn thiện **~90%** các chức năng core, đủ để sử dụng trong môi trường thực tế cho quán cà phê.

---

*Tài liệu này được tạo từ luận văn "Phát triển hệ thống quản lý quán cà phê dùng ReactJS và NodeJS có tích hợp AI Chatbot hỗ trợ khách hàng"*

