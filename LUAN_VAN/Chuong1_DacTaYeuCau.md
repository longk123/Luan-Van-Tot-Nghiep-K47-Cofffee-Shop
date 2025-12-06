# CHƯƠNG 1: ĐẶC TẢ YÊU CẦU

## 1. Mô tả bài toán

Trong bối cảnh ngành dịch vụ ăn uống phát triển mạnh mẽ, các quán cà phê hiện đại đang đối mặt với nhiều thách thức trong việc quản lý hoạt động kinh doanh. Việc quản lý đơn hàng, theo dõi trạng thái pha chế, thanh toán và báo cáo doanh thu theo phương pháp truyền thống không còn đáp ứng được nhu cầu ngày càng cao của khách hàng và chủ doanh nghiệp.

**Các vấn đề thường gặp:**
- Quản lý đơn hàng thủ công dễ sai sót, nhầm lẫn
- Khó theo dõi trạng thái pha chế và thông báo khi món hoàn thành
- Thanh toán chậm, thiếu đa dạng phương thức
- Không có hệ thống đặt hàng trực tuyến cho khách hàng
- Quản lý kho nguyên liệu, theo dõi hạn sử dụng khó khăn
- Báo cáo doanh thu, lợi nhuận thiếu chính xác và kịp thời
- Quản lý ca làm việc và nhân viên phức tạp

**Giải pháp đề xuất:**
Xây dựng một hệ thống quản lý quán cà phê toàn diện (Coffee Shop POS) với các module:
- **Customer Portal**: Cho phép khách hàng đặt món online, đặt bàn, theo dõi đơn hàng
- **POS Dashboard**: Hỗ trợ thu ngân quản lý đơn hàng, thanh toán đa phương thức
- **Kitchen Display**: Màn hình hiển thị hàng đợi pha chế cho nhân viên bếp
- **Manager Dashboard**: Báo cáo, thống kê, quản lý nhân viên, menu, kho
- **Delivery Management**: Quản lý đơn giao hàng và ví shipper

---

## 2. Phân tích yêu cầu

### 2.1. Sơ đồ Use Case

#### 2.1.1. Sơ đồ Use Case tổng quát

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         HỆ THỐNG QUẢN LÝ QUÁN CÀ PHÊ                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────┐                                              ┌─────────┐       │
│  │ Khách   │──────► Đăng ký/Đăng nhập                     │ Admin   │       │
│  │ hàng    │──────► Xem menu                              └────┬────┘       │
│  │         │──────► Đặt hàng online                            │            │
│  │         │──────► Đặt bàn                                    ▼            │
│  │         │──────► Theo dõi đơn hàng              Cấu hình hệ thống        │
│  │         │──────► Xem khuyến mãi                 Quản lý tất cả           │
│  └─────────┘                                                                │
│                                                                             │
│  ┌─────────┐                                              ┌─────────┐       │
│  │ Thu     │──────► Mở/Đóng ca làm việc                   │ Quản lý │       │
│  │ ngân    │──────► Tạo đơn hàng                          └────┬────┘       │
│  │         │──────► Thanh toán                                 │            │
│  │         │──────► In hóa đơn                                 ▼            │
│  │         │──────► Quản lý bàn                    Xem báo cáo doanh thu    │
│  └─────────┘                                       Quản lý nhân viên        │
│                                                    Quản lý menu             │
│  ┌─────────┐                                       Quản lý kho              │
│  │ Pha chế │──────► Xem hàng đợi                   Quản lý khuyến mãi       │
│  │         │──────► Cập nhật trạng thái món                                 │
│  └─────────┘                                                                │
│                                                                             │
│  ┌─────────┐                                                                │
│  │ Shipper │──────► Nhận đơn giao hàng                                      │
│  │         │──────► Cập nhật trạng thái giao                                │
│  │         │──────► Quản lý ví                                              │
│  └─────────┘                                                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 2.1.2. Sơ đồ Use Case cho Khách hàng (Customer)

| STT | Use Case | Mô tả |
|-----|----------|-------|
| UC01 | Đăng ký tài khoản | Khách hàng tạo tài khoản mới với email, mật khẩu, thông tin cá nhân |
| UC02 | Đăng nhập | Khách hàng đăng nhập vào hệ thống |
| UC03 | Xem menu | Xem danh sách món theo danh mục, tìm kiếm món |
| UC04 | Xem chi tiết món | Xem thông tin chi tiết, giá, tùy chọn của món |
| UC05 | Thêm vào giỏ hàng | Thêm món với các tùy chọn (size, đường, đá) vào giỏ |
| UC06 | Quản lý giỏ hàng | Xem, sửa, xóa món trong giỏ hàng |
| UC07 | Đặt hàng | Xác nhận đơn hàng (Mang đi/Giao hàng) |
| UC08 | Thanh toán online | Thanh toán qua PayOS (QR Code) |
| UC09 | Theo dõi đơn hàng | Xem trạng thái đơn hàng real-time |
| UC10 | Xem lịch sử đơn hàng | Xem danh sách các đơn hàng đã đặt |
| UC11 | Đặt bàn | Đặt bàn trước với ngày, giờ, số người |
| UC12 | Xem khuyến mãi | Xem danh sách khuyến mãi đang có |
| UC13 | Áp dụng mã giảm giá | Nhập mã khuyến mãi khi thanh toán |
| UC14 | Cập nhật thông tin | Cập nhật thông tin cá nhân, địa chỉ |

#### 2.1.3. Sơ đồ Use Case cho Thu ngân (Cashier)

| STT | Use Case | Mô tả |
|-----|----------|-------|
| UC15 | Mở ca làm việc | Bắt đầu ca với số tiền đầu ca |
| UC16 | Xem danh sách bàn | Xem trạng thái tất cả bàn theo khu vực |
| UC17 | Tạo đơn tại bàn | Tạo đơn hàng mới cho bàn |
| UC18 | Tạo đơn mang đi | Tạo đơn hàng mang đi (Takeaway) |
| UC19 | Tạo đơn giao hàng | Tạo đơn giao hàng (Delivery) |
| UC20 | Thêm/sửa/xóa món | Quản lý các món trong đơn hàng |
| UC21 | Áp dụng khuyến mãi | Áp dụng mã giảm giá cho đơn |
| UC22 | Thanh toán đơn | Thanh toán bằng tiền mặt hoặc QR |
| UC23 | Chuyển bàn | Di chuyển đơn hàng sang bàn khác |
| UC24 | Hủy đơn hàng | Hủy đơn với lý do |
| UC25 | In hóa đơn | In/xuất PDF hóa đơn |
| UC26 | Đóng ca làm việc | Kết thúc ca, đối chiếu tiền |
| UC27 | Xem báo cáo ca | Xem chi tiết doanh thu trong ca |

#### 2.1.4. Sơ đồ Use Case cho Pha chế (Kitchen)

| STT | Use Case | Mô tả |
|-----|----------|-------|
| UC28 | Xem hàng đợi pha chế | Xem danh sách món cần pha chế (FIFO) |
| UC29 | Bắt đầu pha chế | Chuyển trạng thái món từ QUEUED → MAKING |
| UC30 | Hoàn thành món | Chuyển trạng thái món từ MAKING → DONE |
| UC31 | Lọc theo loại đơn | Lọc hiển thị theo Dine-in/Takeaway/Delivery |
| UC32 | Lọc theo khu vực | Lọc theo khu vực phục vụ |

#### 2.1.5. Sơ đồ Use Case cho Phục vụ/Shipper (Waiter/Delivery)

| STT | Use Case | Mô tả |
|-----|----------|-------|
| UC33 | Xem đặt bàn | Xem danh sách đặt bàn |
| UC34 | Xác nhận đặt bàn | Xác nhận hoặc từ chối đặt bàn |
| UC35 | Check-in khách | Tạo đơn hàng cho khách đã đặt bàn |
| UC36 | Nhận đơn giao hàng | Shipper nhận đơn để giao |
| UC37 | Cập nhật trạng thái giao | Cập nhật: Đang giao → Đã giao/Thất bại |
| UC38 | Xem ví shipper | Xem số tiền COD đang giữ |
| UC39 | Nộp tiền COD | Nộp tiền COD về quỹ |

#### 2.1.6. Sơ đồ Use Case cho Quản lý (Manager)

| STT | Use Case | Mô tả |
|-----|----------|-------|
| UC40 | Xem tổng quan KPI | Xem doanh thu, số đơn, lợi nhuận |
| UC41 | Xem báo cáo doanh thu | Báo cáo theo ngày/tuần/tháng/năm |
| UC42 | Xem báo cáo lợi nhuận | Phân tích lợi nhuận theo món/danh mục |
| UC43 | Quản lý danh mục | CRUD danh mục món |
| UC44 | Quản lý món | CRUD món ăn, biến thể, tùy chọn |
| UC45 | Quản lý khu vực | CRUD khu vực quán |
| UC46 | Quản lý bàn | CRUD bàn trong khu vực |
| UC47 | Quản lý nhân viên | CRUD tài khoản nhân viên |
| UC48 | Quản lý khuyến mãi | CRUD chương trình khuyến mãi |
| UC49 | Quản lý kho | Xem tồn kho, nhập kho |
| UC50 | Quản lý lô hàng | Theo dõi hạn sử dụng, hủy lô hết hạn |
| UC51 | Xuất báo cáo | Xuất báo cáo Excel/PDF |
| UC52 | Quản lý ca làm | Xem lịch sử ca làm việc |

#### 2.1.7. Sơ đồ Use Case cho Admin

| STT | Use Case | Mô tả |
|-----|----------|-------|
| UC53 | Cấu hình hệ thống | Cài đặt tên quán, địa chỉ, thuế... |
| UC54 | Xem System Health | Kiểm tra trạng thái hệ thống |
| UC55 | Tất cả quyền Manager | Admin có đầy đủ quyền của Manager |

---

### 2.2. Chi tiết các trường hợp sử dụng

#### 2.2.1. UC01 - Đăng ký tài khoản (Khách hàng)

| Thuộc tính | Mô tả |
|------------|-------|
| **Tên UC** | Đăng ký tài khoản |
| **Tác nhân** | Khách hàng |
| **Mô tả** | Khách hàng tạo tài khoản mới để sử dụng các chức năng đặt hàng online |
| **Điều kiện tiên quyết** | Khách hàng chưa có tài khoản |
| **Luồng chính** | 1. Khách hàng truy cập trang đăng ký<br>2. Nhập email, mật khẩu, họ tên, số điện thoại<br>3. Hệ thống validate thông tin<br>4. Hệ thống tạo tài khoản<br>5. Hiển thị thông báo thành công |
| **Luồng thay thế** | 3a. Email đã tồn tại → Hiển thị lỗi<br>3b. Mật khẩu không đủ mạnh → Hiển thị lỗi |
| **Điều kiện sau** | Tài khoản được tạo, khách hàng có thể đăng nhập |

#### 2.2.2. UC02 - Đăng nhập

| Thuộc tính | Mô tả |
|------------|-------|
| **Tên UC** | Đăng nhập |
| **Tác nhân** | Khách hàng, Nhân viên |
| **Mô tả** | Người dùng đăng nhập vào hệ thống |
| **Điều kiện tiên quyết** | Có tài khoản hợp lệ |
| **Luồng chính** | 1. Người dùng nhập email/username và mật khẩu<br>2. Hệ thống xác thực thông tin<br>3. Tạo JWT token<br>4. Chuyển hướng đến trang tương ứng với role |
| **Luồng thay thế** | 2a. Sai thông tin → Hiển thị lỗi<br>2b. Tài khoản bị khóa → Thông báo liên hệ admin |
| **Điều kiện sau** | Người dùng được xác thực và có quyền truy cập |

#### 2.2.3. UC07 - Đặt hàng online

| Thuộc tính | Mô tả |
|------------|-------|
| **Tên UC** | Đặt hàng online |
| **Tác nhân** | Khách hàng đã đăng nhập |
| **Mô tả** | Khách hàng đặt đơn hàng mang đi hoặc giao hàng |
| **Điều kiện tiên quyết** | Đã đăng nhập, có món trong giỏ hàng |
| **Luồng chính** | 1. Khách hàng xem giỏ hàng<br>2. Chọn loại đơn (Mang đi/Giao hàng)<br>3. Nếu giao hàng: Nhập địa chỉ, chọn phường/xã<br>4. Áp dụng mã giảm giá (nếu có)<br>5. Chọn phương thức thanh toán<br>6. Xác nhận đơn hàng<br>7. Hệ thống tạo đơn và gửi về bếp |
| **Luồng thay thế** | 3a. Địa chỉ ngoài phạm vi giao → Thông báo lỗi<br>5a. Thanh toán PayOS thất bại → Cho phép thử lại |
| **Điều kiện sau** | Đơn hàng được tạo, bếp nhận được thông báo |

#### 2.2.4. UC15 - Mở ca làm việc

| Thuộc tính | Mô tả |
|------------|-------|
| **Tên UC** | Mở ca làm việc |
| **Tác nhân** | Thu ngân |
| **Mô tả** | Thu ngân bắt đầu ca làm việc mới |
| **Điều kiện tiên quyết** | Thu ngân đã đăng nhập, chưa có ca mở |
| **Luồng chính** | 1. Thu ngân chọn "Mở ca"<br>2. Nhập số tiền đầu ca<br>3. Hệ thống tạo ca làm việc mới<br>4. Ghi nhận thời gian bắt đầu |
| **Luồng thay thế** | 1a. Đã có ca đang mở → Hiển thị thông tin ca hiện tại |
| **Điều kiện sau** | Ca làm việc được tạo, sẵn sàng nhận đơn |

#### 2.2.5. UC22 - Thanh toán đơn hàng

| Thuộc tính | Mô tả |
|------------|-------|
| **Tên UC** | Thanh toán đơn hàng |
| **Tác nhân** | Thu ngân |
| **Mô tả** | Thu ngân thực hiện thanh toán cho đơn hàng |
| **Điều kiện tiên quyết** | Đơn hàng đã có món, chưa thanh toán |
| **Luồng chính** | 1. Thu ngân xem tổng tiền đơn<br>2. Chọn phương thức thanh toán (Tiền mặt/PayOS)<br>3a. Tiền mặt: Nhập số tiền khách đưa, tính tiền thừa<br>3b. PayOS: Tạo QR, chờ khách quét<br>4. Xác nhận thanh toán<br>5. Cập nhật trạng thái đơn → PAID<br>6. In/xuất hóa đơn |
| **Luồng thay thế** | 3b. Thanh toán PayOS timeout → Cho phép thử lại hoặc đổi sang tiền mặt |
| **Điều kiện sau** | Đơn hàng được thanh toán, doanh thu được ghi nhận |

#### 2.2.6. UC28 - Xem hàng đợi pha chế

| Thuộc tính | Mô tả |
|------------|-------|
| **Tên UC** | Xem hàng đợi pha chế |
| **Tác nhân** | Nhân viên pha chế |
| **Mô tả** | Xem danh sách món đang chờ pha chế theo thứ tự FIFO |
| **Điều kiện tiên quyết** | Nhân viên đã đăng nhập với role Kitchen |
| **Luồng chính** | 1. Hệ thống hiển thị danh sách món (QUEUED, MAKING)<br>2. Sắp xếp theo thời gian tạo (cũ nhất trước)<br>3. Real-time cập nhật khi có đơn mới<br>4. Hiển thị thông tin: tên món, tùy chọn, ghi chú |
| **Luồng thay thế** | - Không có món → Hiển thị "Không có món đang chờ" |
| **Điều kiện sau** | Nhân viên thấy được danh sách món cần pha chế |

#### 2.2.7. UC36 - Nhận đơn giao hàng

| Thuộc tính | Mô tả |
|------------|-------|
| **Tên UC** | Nhận đơn giao hàng |
| **Tác nhân** | Shipper |
| **Mô tả** | Shipper nhận đơn hàng để giao cho khách |
| **Điều kiện tiên quyết** | Đơn hàng ở trạng thái READY, chưa có người nhận |
| **Luồng chính** | 1. Shipper xem danh sách đơn chờ giao<br>2. Chọn đơn cần nhận<br>3. Xác nhận nhận đơn<br>4. Hệ thống cập nhật: assigned_shipper, trạng thái → PICKED_UP |
| **Luồng thay thế** | 2a. Đơn đã được nhận bởi shipper khác → Thông báo lỗi |
| **Điều kiện sau** | Đơn được gán cho shipper, tiền COD được ghi nhận vào ví |

#### 2.2.8. UC40 - Xem tổng quan KPI

| Thuộc tính | Mô tả |
|------------|-------|
| **Tên UC** | Xem tổng quan KPI |
| **Tác nhân** | Manager, Admin |
| **Mô tả** | Xem các chỉ số kinh doanh quan trọng |
| **Điều kiện tiên quyết** | Đã đăng nhập với role Manager/Admin |
| **Luồng chính** | 1. Chọn khoảng thời gian (Ngày/Tuần/Tháng/Năm)<br>2. Hệ thống tính toán và hiển thị:<br>- Tổng doanh thu<br>- Số đơn hàng<br>- Số bàn đã phục vụ<br>- Trung bình món/đơn<br>3. Hiển thị biểu đồ doanh thu<br>4. Hiển thị top món bán chạy |
| **Luồng thay thế** | - Không có dữ liệu → Hiển thị "Chưa có dữ liệu" |
| **Điều kiện sau** | Manager có cái nhìn tổng quan về kinh doanh |

#### 2.2.9. UC49 - Quản lý kho

| Thuộc tính | Mô tả |
|------------|-------|
| **Tên UC** | Quản lý kho |
| **Tác nhân** | Manager |
| **Mô tả** | Quản lý nguyên liệu, nhập kho, theo dõi tồn kho |
| **Điều kiện tiên quyết** | Đã đăng nhập với role Manager |
| **Luồng chính** | 1. Xem danh sách nguyên liệu với số lượng tồn<br>2. Nhập kho mới: chọn nguyên liệu, số lượng, giá, HSD<br>3. Hệ thống tạo lô hàng (batch) mới<br>4. Cập nhật số lượng tồn kho<br>5. Xem cảnh báo hết hàng/sắp hết hạn |
| **Luồng thay thế** | 5a. Có lô sắp hết hạn → Hiển thị cảnh báo, cho phép hủy lô |
| **Điều kiện sau** | Kho được cập nhật, có thể theo dõi FEFO |

#### 2.2.10. UC50 - Quản lý lô hàng (Batch)

| Thuộc tính | Mô tả |
|------------|-------|
| **Tên UC** | Quản lý lô hàng |
| **Tác nhân** | Manager |
| **Mô tả** | Theo dõi hạn sử dụng và hủy lô hàng hết hạn |
| **Điều kiện tiên quyết** | Đã đăng nhập với role Manager |
| **Luồng chính** | 1. Xem danh sách lô hàng sắp/đã hết hạn<br>2. Chọn lô cần hủy<br>3. Xác nhận hủy với lý do<br>4. Hệ thống ghi nhận xuất kho (loại HỦY)<br>5. Cập nhật tồn kho |
| **Luồng thay thế** | 1a. Hủy hàng loạt → Chọn nhiều lô và hủy cùng lúc |
| **Điều kiện sau** | Lô hàng được đánh dấu DEPLETED, tồn kho cập nhật |

---

## 3. Yêu cầu phi chức năng

### 3.1. Hiệu năng (Performance)
- Thời gian phản hồi API < 500ms cho 95% request
- Hỗ trợ đồng thời 100 người dùng
- Thời gian tải trang < 3 giây
- Real-time updates với độ trễ < 1 giây (SSE)

### 3.2. Bảo mật (Security)
- Xác thực bằng JWT với thời hạn 7 ngày
- Mã hóa mật khẩu bằng bcrypt
- Phân quyền theo role (RBAC)
- HTTPS cho production
- Validate và sanitize input data
- Bảo vệ chống SQL Injection, XSS

### 3.3. Khả năng mở rộng (Scalability)
- Kiến trúc RESTful API
- Tách biệt Frontend và Backend
- Database PostgreSQL hỗ trợ horizontal scaling
- Stateless authentication

### 3.4. Tính ổn định và sẵn sàng (Reliability & Availability)
- Uptime > 99%
- Xử lý lỗi graceful với thông báo rõ ràng
- Backup dữ liệu định kỳ
- Transaction rollback khi có lỗi

### 3.5. Khả năng bảo trì (Maintainability)
- Code được tổ chức theo mô hình MVC/Three-Layer
- Sử dụng ESLint, Prettier để đảm bảo code style
- Comment và documentation đầy đủ
- Version control với Git

### 3.6. Tính thân thiện với người dùng (Usability)
- Giao diện responsive trên mobile, tablet, desktop
- UI/UX hiện đại với TailwindCSS
- Thông báo real-time (Toast, Alert)
- Hỗ trợ tiếng Việt

### 3.7. Tương thích (Compatibility)
- Hỗ trợ các trình duyệt: Chrome, Firefox, Safari, Edge
- Responsive design cho các kích thước màn hình
- Tích hợp cổng thanh toán PayOS

---

## 4. Môi trường vận hành

### 4.1. Môi trường phát triển
- **Hệ điều hành**: Windows 10/11, macOS, Linux
- **IDE**: Visual Studio Code
- **Node.js**: v18.x trở lên
- **PostgreSQL**: v14.x trở lên
- **Git**: v2.x

### 4.2. Môi trường triển khai
- **Frontend**: Vercel, Netlify hoặc Static hosting
- **Backend**: VPS, Heroku, hoặc Cloud (AWS, GCP)
- **Database**: PostgreSQL managed service
- **Domain**: HTTPS với SSL certificate

---

## 5. Các ràng buộc thực thi và thiết kế

### 5.1. Ràng buộc công nghệ
- Frontend: ReactJS 18.x, Vite, TailwindCSS
- Backend: Node.js, Express.js
- Database: PostgreSQL với pg driver
- Real-time: Server-Sent Events (SSE)
- Payment: PayOS API

### 5.2. Ràng buộc thiết kế
- RESTful API design
- JWT-based authentication
- Role-based access control (RBAC)
- Responsive web design
- Mobile-first approach

### 5.3. Ràng buộc nghiệp vụ
- Hỗ trợ đa ca làm việc
- Quản lý kho theo phương pháp FEFO (First Expired First Out)
- Tích hợp thanh toán online
- Hỗ trợ cả đơn tại chỗ, mang đi và giao hàng

---

## 6. Các giả định và phụ thuộc

### 6.1. Giả định
- Người dùng có kết nối Internet ổn định
- Quán cà phê có máy tính/tablet để vận hành hệ thống
- Nhân viên được đào tạo sử dụng hệ thống
- Có tài khoản PayOS để tích hợp thanh toán

### 6.2. Phụ thuộc
- PayOS API cho thanh toán online
- Google Maps API cho chọn địa chỉ giao hàng (optional)
- SMTP server để gửi email (optional)

---

## 7. Các yêu cầu khác

### 7.1. Yêu cầu về dữ liệu
- Dữ liệu demo cho testing
- Khả năng import/export dữ liệu
- Backup và restore database

### 7.2. Yêu cầu về báo cáo
- Xuất báo cáo Excel, PDF
- Biểu đồ trực quan
- Báo cáo theo khoảng thời gian tùy chỉnh

### 7.3. Yêu cầu về tích hợp
- RESTful API cho tích hợp bên thứ ba
- Webhook cho real-time notifications
- SSE cho cập nhật trạng thái đơn hàng
