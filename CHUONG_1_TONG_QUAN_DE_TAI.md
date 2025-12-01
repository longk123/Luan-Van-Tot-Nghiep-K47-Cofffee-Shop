# ĐẠI HỌC CẦN THƠ
## TRƯỜNG CÔNG NGHỆ THÔNG TIN & TRUYỀN THÔNG
### KHOA CÔNG NGHỆ PHẦN MỀM

---

# LUẬN VĂN TỐT NGHIỆP ĐẠI HỌC
## NGÀNH KỸ THUẬT PHẦN MỀM

### Đề tài:
# PHÁT TRIỂN HỆ THỐNG QUẢN LÝ QUÁN CÀ PHÊ SỬ DỤNG REACTJS VÀ NODEJS

**(Developing a Coffee Shop Management System using ReactJS and NodeJS)**

---

**Sinh viên thực hiện:** [Họ tên sinh viên]  
**MSSV:** [Mã số sinh viên]  
**Khóa:** K47

**Người hướng dẫn:** [Họ tên giảng viên]

---

**Cần Thơ, 12/2025**

---

# MỤC LỤC

- [PHẦN GIỚI THIỆU](#phần-giới-thiệu)
  - [1. Đặt vấn đề](#1-đặt-vấn-đề)
  - [2. Mục tiêu](#2-mục-tiêu)
  - [3. Đối tượng và phạm vi nghiên cứu](#3-đối-tượng-và-phạm-vi-nghiên-cứu)
  - [4. Nội dung nghiên cứu](#4-nội-dung-nghiên-cứu)
  - [5. Những đóng góp chính của đề tài](#5-những-đóng-góp-chính-của-đề-tài)
  - [6. Bố cục luận văn](#6-bố-cục-luận-văn)

---

# PHẦN GIỚI THIỆU

Đề tài này tập trung vào việc thiết kế và phát triển một hệ thống quản lý quán cà phê toàn diện (Coffee Shop POS - Point of Sale), nhằm số hóa và tối ưu hóa toàn bộ quy trình vận hành từ bán hàng, quản lý kho, đến phân tích doanh thu. Hệ thống không chỉ cung cấp các chức năng POS cơ bản mà còn tích hợp nhiều module chuyên biệt như quản lý ca làm việc, hệ thống bếp (KDS), đặt bàn trước, giao hàng và cổng khách hàng trực tuyến, giúp chủ quán cà phê vận hành hiệu quả và nâng cao trải nghiệm khách hàng.

---

## 1. Đặt vấn đề

### 1.1 Bối cảnh thực tiễn

Trong bối cảnh nền kinh tế số hóa mạnh mẽ, ngành dịch vụ ăn uống (F&B) tại Việt Nam đang trải qua giai đoạn chuyển đổi số quan trọng. Theo thống kê của Bộ Công Thương năm 2024, thị trường F&B Việt Nam đạt giá trị hơn 700 nghìn tỷ đồng, trong đó phân khúc cà phê chiếm tỷ trọng đáng kể với hơn 500.000 quán cà phê trên cả nước. Tuy nhiên, phần lớn các quán cà phê vừa và nhỏ vẫn đang vận hành theo phương thức truyền thống, sử dụng sổ sách thủ công hoặc các công cụ đơn giản như Excel để quản lý.

### 1.2 Những hạn chế của phương thức quản lý truyền thống

Việc quản lý quán cà phê theo phương thức truyền thống đối mặt với nhiều thách thức:

**Về mặt bán hàng:**
- Ghi nhận đơn hàng thủ công dẫn đến sai sót, nhầm lẫn món
- Khó khăn trong việc tính toán hóa đơn với nhiều tùy chọn (topping, size, đá, đường)
- Không thể theo dõi trạng thái đơn hàng theo thời gian thực
- Mất thời gian trong việc xử lý thanh toán đa phương thức

**Về mặt quản lý kho:**
- Không kiểm soát được lượng nguyên liệu tồn kho chính xác
- Khó phát hiện nguyên liệu sắp hết hạn sử dụng
- Không có cảnh báo tự động khi nguyên liệu xuống thấp
- Việc trừ nguyên liệu theo công thức món hoàn toàn thủ công

**Về mặt nhân sự và ca làm việc:**
- Khó kiểm soát việc mở/đóng ca của nhân viên
- Không có hệ thống chấm công và tính lương tự động
- Thiếu công cụ theo dõi hiệu suất làm việc

**Về mặt báo cáo và phân tích:**
- Mất nhiều thời gian tổng hợp doanh thu cuối ngày/tháng
- Không có dữ liệu phân tích xu hướng kinh doanh
- Khó xác định sản phẩm bán chạy, giờ cao điểm

### 1.3 Nhu cầu thực tế

Xuất phát từ thực trạng trên, việc phát triển một hệ thống quản lý quán cà phê hiện đại, tích hợp đầy đủ các chức năng cần thiết là yêu cầu cấp bách. Hệ thống cần đáp ứng các tiêu chí:

- **Toàn diện:** Quản lý từ bán hàng, kho bãi, nhân sự đến báo cáo
- **Thời gian thực:** Cập nhật trạng thái đơn hàng, tồn kho tức thì
- **Đa nền tảng:** Hoạt động trên web, có thể truy cập từ nhiều thiết bị
- **Phân quyền rõ ràng:** Mỗi vai trò có chức năng phù hợp
- **Mở rộng được:** Có thể thêm chức năng mới trong tương lai

### 1.4 Lý do chọn đề tài

Với những thách thức và nhu cầu thực tế nêu trên, em quyết định chọn đề tài **"Phát triển hệ thống quản lý quán cà phê sử dụng ReactJS và NodeJS"** nhằm xây dựng một giải pháp công nghệ toàn diện, giúp các chủ quán cà phê:

1. Số hóa toàn bộ quy trình vận hành
2. Tiết kiệm thời gian và giảm thiểu sai sót
3. Ra quyết định kinh doanh dựa trên dữ liệu
4. Nâng cao trải nghiệm khách hàng
5. Tăng hiệu quả quản lý nhân sự

---

## 2. Mục tiêu

### 2.1 Mục tiêu tổng quát

Phát triển một hệ thống quản lý quán cà phê (Coffee Shop POS) hoàn chỉnh, đáp ứng đầy đủ các nhu cầu vận hành thực tế của một quán cà phê hiện đại, từ quy mô nhỏ đến vừa.

### 2.2 Mục tiêu cụ thể

#### 2.2.1 Module Bán hàng (POS)
- Xây dựng giao diện POS trực quan, dễ sử dụng cho nhân viên thu ngân
- Hỗ trợ đa dạng loại đơn hàng: tại chỗ (dine-in), mang đi (takeaway), giao hàng (delivery)
- Quản lý sơ đồ bàn theo khu vực với trạng thái thời gian thực
- Xử lý thanh toán đa phương thức: tiền mặt, chuyển khoản, ví điện tử (VNPay, PayOS)
- Hỗ trợ chia/gộp hóa đơn, áp dụng khuyến mãi tự động

#### 2.2.2 Module Quản lý thực đơn
- Quản lý danh mục món (categories) và các món trong danh mục
- Hỗ trợ biến thể món (size S/M/L với giá khác nhau)
- Quản lý tùy chọn món (topping, mức đá, mức đường)
- Thiết lập công thức nguyên liệu cho từng món
- Upload và quản lý hình ảnh món

#### 2.2.3 Module Quản lý kho
- Quản lý danh sách nguyên liệu với đơn vị tính
- Theo dõi tồn kho theo lô (batch) với ngày sản xuất và hạn sử dụng
- Nhập kho với thông tin chi tiết (nhà cung cấp, giá nhập, lô)
- Xuất kho thủ công và tự động (khi hoàn thành đơn hàng)
- Cảnh báo tồn kho thấp và nguyên liệu sắp hết hạn
- Áp dụng nguyên tắc FEFO (First Expired First Out)

#### 2.2.4 Module Hệ thống bếp (KDS - Kitchen Display System)
- Hiển thị đơn hàng cần chế biến theo thời gian thực
- Cập nhật trạng thái món: Chờ xử lý → Đang làm → Hoàn thành
- Thông báo cho nhân viên phục vụ khi món sẵn sàng
- Hỗ trợ nhiều màn hình bếp đồng thời

#### 2.2.5 Module Quản lý ca làm việc
- Mở/đóng ca với số tiền quỹ đầu ca
- Kiểm tra chênh lệch tiền cuối ca
- Chuyển đơn hàng giữa các ca
- Tính toán thống kê doanh thu theo ca
- Hỗ trợ chấm công nhân viên

#### 2.2.6 Module Đặt bàn trước
- Cho phép khách hàng đặt bàn trực tuyến
- Quản lý lịch đặt bàn với bộ lọc ngày/giờ
- Xác nhận, check-in và xử lý no-show
- Tích hợp với hệ thống quản lý bàn

#### 2.2.7 Module Giao hàng
- Quản lý đơn hàng giao hàng với thông tin địa chỉ
- Phân công shipper cho đơn hàng
- Theo dõi trạng thái giao hàng
- Quản lý ví shipper và thanh toán COD
- Tích hợp bản đồ để xác định địa chỉ

#### 2.2.8 Module Khuyến mãi
- Tạo và quản lý các chương trình khuyến mãi
- Hỗ trợ nhiều loại: giảm phần trăm, giảm số tiền cố định
- Thiết lập điều kiện áp dụng (giá trị tối thiểu, thời gian)
- Áp dụng tự động hoặc thủ công vào đơn hàng

#### 2.2.9 Module Báo cáo và thống kê
- Báo cáo doanh thu theo ngày/tuần/tháng/năm
- Phân tích lợi nhuận với giá vốn
- Thống kê sản phẩm bán chạy
- Báo cáo theo nhân viên, theo ca
- Biểu đồ trực quan với khả năng xuất file

#### 2.2.10 Module Cổng khách hàng
- Giao diện đặt hàng trực tuyến cho khách
- Đăng ký/đăng nhập tài khoản khách hàng
- Xem thực đơn, thêm giỏ hàng, đặt hàng
- Theo dõi trạng thái đơn hàng
- Xem lịch sử đơn hàng

#### 2.2.11 Module Chatbot AI
- Tích hợp trí tuệ nhân tạo hỗ trợ khách hàng
- Tự động trả lời các câu hỏi thường gặp về menu, giá cả
- Hỗ trợ đặt hàng qua giao diện chat
- Lưu trữ lịch sử hội thoại để phân tích
- Cải thiện trải nghiệm khách hàng 24/7

#### 2.2.12 Module Quản trị hệ thống
- Quản lý người dùng và phân quyền (7 vai trò)
- Cấu hình thông tin cửa hàng
- Theo dõi log hệ thống
- Giám sát trạng thái hoạt động

---

## 3. Đối tượng và phạm vi nghiên cứu

### 3.1 Đối tượng nghiên cứu

Đề tài tập trung vào việc thiết kế và xây dựng một hệ thống quản lý quán cà phê trực tuyến dựa trên nền tảng web, hướng tới việc hỗ trợ toàn diện các hoạt động vận hành của quán. Hệ thống được nghiên cứu và phát triển dựa trên các thành phần công nghệ chính sau:

#### 3.1.1 Kiến trúc MVC (Model-View-Controller)
Ứng dụng mô hình kiến trúc phân tách rõ ràng giữa:
- **Model:** Xử lý logic nghiệp vụ và tương tác với cơ sở dữ liệu
- **View:** Giao diện người dùng với ReactJS
- **Controller:** Điều phối luồng dữ liệu giữa Model và View

#### 3.1.2 ReactJS với Vite
- Phát triển giao diện người dùng (frontend) hiện đại, động
- Sử dụng Vite làm build tool cho hiệu suất phát triển tối ưu
- Áp dụng React Router cho điều hướng SPA (Single Page Application)
- Tích hợp TailwindCSS cho thiết kế responsive
- Sử dụng Recharts cho biểu đồ trực quan

#### 3.1.3 Node.js với Express.js
- Xây dựng RESTful API phía server
- Xử lý logic nghiệp vụ phức tạp
- Quản lý xác thực và phân quyền với JWT
- Triển khai Server-Sent Events (SSE) cho cập nhật thời gian thực

#### 3.1.4 PostgreSQL
- Cơ sở dữ liệu quan hệ với 42 bảng
- Sử dụng triggers và functions cho logic tự động
- Áp dụng constraints và indexes cho toàn vẹn dữ liệu
- Hỗ trợ exclusion constraints cho tránh xung đột đặt bàn/ca làm

#### 3.1.5 Tích hợp bên thứ ba
- **Supabase:** Lưu trữ và quản lý hình ảnh
- **PayOS/VNPay:** Cổng thanh toán trực tuyến
- **Leaflet Maps:** Hiển thị bản đồ và xác định địa chỉ giao hàng

### 3.2 Phạm vi nghiên cứu

Phạm vi nghiên cứu tập trung vào việc xây dựng và triển khai một hệ thống quản lý quán cà phê có khả năng đáp ứng nhu cầu vận hành thực tế, với các đặc điểm chính:

#### 3.2.1 Tầng giao diện (Frontend / Presentation Layer)
Sử dụng ReactJS với Vite để phát triển:
- **Dashboard quản lý:** Giao diện cho manager với báo cáo, thống kê
- **Màn hình POS:** Giao diện bán hàng cho thu ngân
- **Màn hình bếp (KDS):** Hiển thị đơn cần chế biến
- **Cổng khách hàng:** Giao diện đặt hàng trực tuyến
- **Trang Admin:** Quản lý cấu hình hệ thống

#### 3.2.2 Tầng xử lý nghiệp vụ (Business Logic Layer)
Sử dụng Node.js và Express.js để:
- Xử lý các yêu cầu từ frontend thông qua RESTful API
- Thực thi logic nghiệp vụ (tính toán hóa đơn, trừ kho, ...)
- Quản lý xác thực JWT và phân quyền RBAC
- Phát sự kiện real-time qua SSE

#### 3.2.3 Tầng dữ liệu (Data Access Layer)
Sử dụng PostgreSQL để:
- Lưu trữ dữ liệu có cấu trúc với quan hệ phức tạp
- Đảm bảo toàn vẹn dữ liệu với constraints và triggers
- Tự động hóa các quy trình (trừ kho, tính giá vốn)
- Hỗ trợ soft delete để bảo toàn dữ liệu lịch sử

#### 3.2.4 Phân quyền người dùng
Hệ thống hỗ trợ 7 vai trò với chức năng riêng biệt:

| Vai trò | Mô tả | Chức năng chính |
|---------|-------|-----------------|
| **Admin** | Quản trị viên hệ thống | Toàn quyền, cấu hình hệ thống, quản lý users |
| **Manager** | Quản lý quán | Báo cáo, quản lý kho, nhân viên, menu |
| **Cashier** | Thu ngân | POS, thanh toán, mở/đóng ca |
| **Waiter** | Phục vụ | Tạo đơn, phục vụ bàn |
| **Kitchen** | Nhân viên bếp | Xem và cập nhật trạng thái đơn (KDS) |
| **Shipper** | Nhân viên giao hàng | Nhận đơn, cập nhật giao hàng, ví tiền |
| **Customer** | Khách hàng | Đặt hàng online, xem lịch sử |

#### 3.2.5 Các chức năng chính của hệ thống

**Nhóm chức năng bán hàng:**
- Quản lý sơ đồ bàn (theo khu vực, trạng thái)
- Tạo và xử lý đơn hàng (dine-in, takeaway, delivery)
- Quản lý món với biến thể và tùy chọn
- Thanh toán đa phương thức
- In hóa đơn và in bếp

**Nhóm chức năng kho:**
- Quản lý nguyên liệu và đơn vị
- Nhập/xuất kho với tracking lô hàng
- Cảnh báo tồn kho và hết hạn
- Tự động trừ kho theo công thức

**Nhóm chức năng nhân sự:**
- Quản lý nhân viên và vai trò
- Mở/đóng ca làm việc
- Chấm công và tính lương

**Nhóm chức năng phân tích:**
- Báo cáo doanh thu đa chiều
- Phân tích lợi nhuận
- Thống kê sản phẩm, khách hàng
- Xuất báo cáo Excel/PDF

**Nhóm chức năng Chatbot AI:**
- Chatbot hỗ trợ khách hàng tự động
- Trả lời câu hỏi về menu, giá, khuyến mãi
- Lưu trữ và quản lý lịch sử hội thoại
- Phân tích hành vi khách hàng qua chat

---

## 4. Nội dung nghiên cứu

### 4.1 Quy trình nghiên cứu

Quá trình nghiên cứu và phát triển hệ thống quản lý quán cà phê được thực hiện theo các bước sau:

#### 4.1.1 Nghiên cứu cơ sở lý thuyết và tài liệu chuyên ngành
- Tìm hiểu các mô hình quản lý nhà hàng/quán cà phê hiện đại
- Nghiên cứu các hệ thống POS phổ biến trên thị trường
- Tham khảo quy trình vận hành thực tế của các quán cà phê
- Tìm hiểu các công nghệ web hiện đại: React, Node.js, PostgreSQL
- Nghiên cứu các giải pháp thanh toán điện tử tại Việt Nam

#### 4.1.2 Phân tích yêu cầu hệ thống
- Khảo sát nhu cầu thực tế từ các chủ quán cà phê
- Xác định các actor và use case chính
- Phân tích yêu cầu chức năng và phi chức năng
- Định nghĩa luồng nghiệp vụ chi tiết
- Thiết kế wireframe và prototype giao diện

#### 4.1.3 Thiết kế kiến trúc hệ thống
- Áp dụng mô hình MVC (Model-View-Controller)
- Thiết kế RESTful API với chuẩn naming convention
- Phân tách frontend và backend độc lập
- Thiết kế hệ thống xác thực và phân quyền RBAC
- Lên kế hoạch tích hợp các dịch vụ bên thứ ba

#### 4.1.4 Thiết kế cơ sở dữ liệu
- Thiết kế mô hình ERD với 42 bảng
- Định nghĩa các mối quan hệ và constraints
- Thiết kế triggers cho tự động hóa
- Tối ưu indexes cho hiệu suất truy vấn
- Triển khai soft delete cho dữ liệu lịch sử

#### 4.1.5 Thiết kế giao diện người dùng (UI/UX)
- Xây dựng design system với TailwindCSS
- Thiết kế giao diện responsive cho nhiều thiết bị
- Tối ưu trải nghiệm người dùng với loading states
- Thiết kế riêng biệt cho từng vai trò người dùng

#### 4.1.6 Lập trình và triển khai
- Phát triển frontend với React + Vite
- Xây dựng backend API với Node.js + Express
- Tích hợp cơ sở dữ liệu PostgreSQL
- Triển khai real-time với Server-Sent Events
- Tích hợp thanh toán PayOS/VNPay

#### 4.1.7 Kiểm thử và tối ưu hóa
- Kiểm thử unit test cho các module quan trọng
- Kiểm thử integration test cho API
- Kiểm thử end-to-end cho luồng nghiệp vụ
- Tối ưu hiệu suất và trải nghiệm người dùng

### 4.2 Công nghệ sử dụng

Trong quá trình phát triển hệ thống, các công nghệ sau được áp dụng:

#### 4.2.1 Frontend Technologies

| Công nghệ | Phiên bản | Mục đích |
|-----------|-----------|----------|
| React | 18.x | Thư viện UI component-based |
| Vite | 5.x | Build tool hiệu suất cao |
| React Router | 6.x | Điều hướng SPA |
| TailwindCSS | 3.x | Framework CSS utility-first |
| Recharts | 2.x | Thư viện biểu đồ |
| Leaflet | 1.x | Tích hợp bản đồ |
| Axios | 1.x | HTTP client |

#### 4.2.2 Backend Technologies

| Công nghệ | Phiên bản | Mục đích |
|-----------|-----------|----------|
| Node.js | 20.x | Runtime JavaScript server-side |
| Express.js | 4.x | Web framework |
| PostgreSQL | 15.x | Cơ sở dữ liệu quan hệ |
| JWT | - | Xác thực token-based |
| Bcrypt | - | Mã hóa mật khẩu |
| Multer | - | Upload file |

#### 4.2.3 Third-party Services

| Dịch vụ | Mục đích |
|---------|----------|
| Supabase Storage | Lưu trữ hình ảnh sản phẩm |
| PayOS | Cổng thanh toán QR code |
| VNPay | Cổng thanh toán trực tuyến |
| Leaflet + OpenStreetMap | Bản đồ và geocoding |

### 4.3 Công cụ hỗ trợ phát triển

| Công cụ | Mục đích |
|---------|----------|
| Visual Studio Code | IDE phát triển |
| pgAdmin / DBeaver | Quản lý PostgreSQL |
| Git + GitHub | Quản lý mã nguồn |
| Postman | Testing API |
| Draw.io | Thiết kế sơ đồ |
| Figma | Thiết kế giao diện |
| Chrome DevTools | Debug frontend |

### 4.4 Kế hoạch thực hiện

| Giai đoạn | Thời gian | Nội dung |
|-----------|-----------|----------|
| Xác định đề tài | Tháng 1 | Nghiên cứu, chọn đề tài |
| Phân tích yêu cầu | Tháng 2 | Khảo sát, phân tích use case |
| Thiết kế hệ thống | Tháng 3 | Kiến trúc, CSDL, giao diện |
| Phát triển Core | Tháng 4-5 | Module bán hàng, kho, menu |
| Phát triển Advanced | Tháng 6-7 | KDS, đặt bàn, giao hàng |
| Tích hợp & Testing | Tháng 8-9 | Thanh toán, kiểm thử |
| Hoàn thiện | Tháng 10-11 | Báo cáo, tài liệu |
| Bảo vệ | Tháng 12 | Trình bày luận văn |

---

## 5. Những đóng góp chính của đề tài

Đề tài đã xây dựng và hoàn thiện một hệ thống quản lý quán cà phê toàn diện với nhiều đóng góp quan trọng:

### 5.1 Về mặt kỹ thuật

#### 5.1.1 Kiến trúc hệ thống hiện đại
- Áp dụng mô hình MVC với phân tách rõ ràng frontend/backend
- Triển khai RESTful API chuẩn với hơn 100 endpoints
- Thiết kế cơ sở dữ liệu với 42 bảng, triggers và constraints
- Hệ thống real-time với Server-Sent Events

#### 5.1.2 Hệ thống phân quyền RBAC hoàn chỉnh
- 7 vai trò với quyền hạn riêng biệt
- JWT authentication với refresh token
- Middleware bảo vệ routes theo vai trò
- Audit log cho các thao tác quan trọng

#### 5.1.3 Quản lý kho thông minh
- Theo dõi nguyên liệu theo lô với hạn sử dụng
- Tự động trừ kho theo công thức khi hoàn thành đơn
- Áp dụng FEFO (First Expired First Out)
- Cảnh báo tồn kho thấp và sắp hết hạn

#### 5.1.4 Tích hợp thanh toán đa dạng
- Hỗ trợ tiền mặt, chuyển khoản
- Tích hợp PayOS với QR code
- Hỗ trợ chia hóa đơn, thanh toán nhiều lần

### 5.2 Về mặt nghiệp vụ

#### 5.2.1 Quy trình bán hàng tối ưu
- Giao diện POS trực quan, thao tác nhanh
- Hỗ trợ 3 loại đơn: tại chỗ, mang đi, giao hàng
- Quản lý bàn theo khu vực với sơ đồ trực quan
- Áp dụng khuyến mãi tự động

#### 5.2.2 Hệ thống bếp (KDS) chuyên nghiệp
- Hiển thị đơn theo thời gian thực
- Theo dõi thời gian chế biến
- Thông báo khi món hoàn thành

#### 5.2.3 Quản lý ca làm việc chặt chẽ
- Kiểm soát mở/đóng ca với số tiền quỹ
- Đối chiếu chênh lệch cuối ca
- Thống kê doanh thu theo ca/nhân viên

#### 5.2.4 Báo cáo phân tích đa chiều
- Doanh thu theo nhiều góc nhìn (ngày/tuần/tháng/năm)
- Phân tích lợi nhuận với giá vốn
- Thống kê sản phẩm bán chạy
- Xuất báo cáo Excel/PDF

### 5.3 Về mặt trải nghiệm người dùng

- Giao diện hiện đại với TailwindCSS
- Responsive trên nhiều thiết bị
- Cổng đặt hàng trực tuyến cho khách
- Thông báo real-time cho các sự kiện quan trọng

### 5.4 Ưu điểm so với giải pháp truyền thống

| Tiêu chí | Phương pháp truyền thống | Hệ thống POS |
|----------|--------------------------|--------------|
| Ghi nhận đơn | Thủ công, sai sót nhiều | Tự động, chính xác |
| Quản lý kho | Excel, không real-time | Tự động trừ, cảnh báo |
| Báo cáo | Tổng hợp thủ công | Tự động, đa chiều |
| Thanh toán | Tiền mặt đơn giản | Đa phương thức |
| Đặt hàng online | Không hỗ trợ | Cổng khách hàng |

---

## 6. Bố cục luận văn

Luận văn được bố trí với các phần chính như sau:

### Phần mở đầu
- Bối cảnh và lý do chọn đề tài
- Mục tiêu, đối tượng và phạm vi nghiên cứu
- Nội dung nghiên cứu
- Những đóng góp chính
- Cấu trúc tổng thể của luận văn

### Phần nội dung

#### Chương 1 – Đặc tả yêu cầu
Phân tích thực trạng các hệ thống POS hiện có, đánh giá nhu cầu của quán cà phê, xác định hạn chế và yêu cầu hệ thống. Trình bày các use case chính với sơ đồ và mô tả chi tiết. Định nghĩa yêu cầu chức năng và phi chức năng.

#### Chương 2 – Cơ sở lý thuyết
Trình bày các công nghệ và lý thuyết áp dụng:
- Kiến trúc MVC và RESTful API
- React.js và component-based architecture
- Node.js và Express.js
- PostgreSQL và thiết kế cơ sở dữ liệu quan hệ
- JWT authentication và RBAC authorization
- Server-Sent Events cho real-time communication

#### Chương 3 – Thiết kế và cài đặt giải pháp
Mô tả kiến trúc tổng thể, thiết kế cơ sở dữ liệu với 42 bảng, giao diện các module chính. Trình bày chi tiết từng chức năng với sơ đồ luồng và giao diện minh họa:
- Module bán hàng (POS)
- Module quản lý thực đơn
- Module quản lý kho
- Module KDS (Kitchen Display System)
- Module ca làm việc
- Module đặt bàn
- Module giao hàng
- Module khuyến mãi
- Module báo cáo
- Module cổng khách hàng
- Module Chatbot AI
- Module quản trị hệ thống

#### Chương 4 – Kiểm thử và đánh giá
Kế hoạch kiểm thử, các trường hợp kiểm thử cho từng module, kết quả và đánh giá hiệu quả vận hành. Phân tích điểm mạnh, điểm yếu và hướng cải thiện.

### Phần kết luận
- Tổng kết kết quả đạt được
- Những hạn chế còn tồn tại
- Định hướng phát triển và khả năng mở rộng
- Ứng dụng thực tiễn của hệ thống

### Tài liệu tham khảo và phụ lục
- Danh mục nguồn tài liệu đã sử dụng
- Phụ lục: Sơ đồ ERD đầy đủ, danh sách API, hướng dẫn cài đặt

---

# TÓM TẮT

**Bối cảnh:** Trong bối cảnh chuyển đổi số mạnh mẽ của ngành F&B, các quán cà phê vừa và nhỏ đang gặp nhiều khó khăn trong việc quản lý vận hành theo phương thức truyền thống. Việc ghi nhận đơn hàng thủ công, quản lý kho bằng Excel, tổng hợp doanh thu cuối ngày tốn nhiều thời gian và dễ sai sót. Từ thực tế đó, em xây dựng một hệ thống quản lý quán cà phê (POS) toàn diện, hỗ trợ đầy đủ các nghiệp vụ từ bán hàng, quản lý kho, nhân sự đến báo cáo phân tích.

**Mục tiêu:** Phát triển một hệ thống POS hoàn chỉnh cho quán cà phê sử dụng ReactJS và NodeJS, bao gồm các module: bán hàng với sơ đồ bàn, quản lý thực đơn với biến thể và tùy chọn, quản lý kho với tracking lô hàng, hệ thống bếp (KDS), quản lý ca làm việc, đặt bàn trước, giao hàng, khuyến mãi, báo cáo đa chiều và cổng đặt hàng trực tuyến cho khách.

**Phương pháp:** Hệ thống được xây dựng theo mô hình MVC với ReactJS + Vite cho frontend, Node.js + Express cho backend và PostgreSQL cho cơ sở dữ liệu. Áp dụng JWT cho xác thực, RBAC cho phân quyền (7 vai trò), Server-Sent Events cho real-time updates, và tích hợp PayOS/VNPay cho thanh toán trực tuyến.

**Kết quả:** Hệ thống với 42 bảng dữ liệu, hơn 100 API endpoints, hỗ trợ 7 vai trò người dùng. Các tính năng nổi bật: tự động trừ kho theo công thức khi hoàn thành đơn, cảnh báo nguyên liệu sắp hết hạn (FEFO), theo dõi đơn hàng real-time trên màn hình bếp, thanh toán đa phương thức, báo cáo lợi nhuận với giá vốn.

**Kết luận:** Hệ thống quản lý quán cà phê đã chứng minh khả năng đáp ứng đầy đủ các yêu cầu thực tế, giúp chủ quán số hóa quy trình vận hành, tiết kiệm thời gian, giảm sai sót và ra quyết định dựa trên dữ liệu. Đặc biệt, tính năng Chatbot AI giúp nâng cao trải nghiệm khách hàng với khả năng hỗ trợ tự động 24/7, trả lời câu hỏi về menu và hỗ trợ đặt hàng. Hệ thống có khả năng mở rộng để thêm các tính năng mới như loyalty program, tích hợp AI nâng cao trong tương lai.

---

# ABSTRACT

**Background:** In the context of strong digital transformation in the F&B industry, small and medium-sized coffee shops face many difficulties in managing operations using traditional methods. Manual order recording, inventory management with Excel, and end-of-day revenue compilation are time-consuming and error-prone. From this reality, I developed a comprehensive coffee shop management system (POS), supporting all operations from sales, inventory management, personnel to analytical reporting.

**Objectives:** Develop a complete POS system for coffee shops using ReactJS and NodeJS, including modules: sales with table layout, menu management with variants and options, inventory management with batch tracking, Kitchen Display System (KDS), shift management, table reservations, delivery, promotions, multi-dimensional reports, and online ordering portal for customers.

**Methodology:** The system is built following the MVC model with ReactJS + Vite for frontend, Node.js + Express for backend, and PostgreSQL for database. Applying JWT for authentication, RBAC for authorization (7 roles), Server-Sent Events for real-time updates, and integrating PayOS/VNPay for online payment.

**Results:** System with 42 database tables, over 100 API endpoints, supporting 7 user roles. Notable features: automatic inventory deduction based on recipes when orders are completed, expiring ingredient alerts (FEFO), real-time order tracking on kitchen display, multi-method payment, profit reports with cost analysis.

**Conclusion:** The coffee shop management system has proven its ability to fully meet practical requirements, helping shop owners digitize operational processes, save time, reduce errors, and make data-driven decisions. The system is extensible to add new features such as AI chatbot integration and loyalty programs in the future.

---

# DANH MỤC CÁC TỪ VIẾT TẮT

| STT | Từ viết tắt | Chú giải |
|-----|-------------|----------|
| 1 | API | Application Programming Interface - Giao diện lập trình ứng dụng |
| 2 | CSDL | Cơ sở dữ liệu |
| 3 | ERD | Entity Relationship Diagram - Sơ đồ thực thể quan hệ |
| 4 | F&B | Food and Beverage - Thực phẩm và đồ uống |
| 5 | FEFO | First Expired First Out - Hết hạn trước xuất trước |
| 6 | JWT | JSON Web Token - Token xác thực dạng JSON |
| 7 | KDS | Kitchen Display System - Hệ thống hiển thị bếp |
| 8 | MVC | Model-View-Controller - Mô hình kiến trúc phần mềm |
| 9 | POS | Point of Sale - Điểm bán hàng |
| 10 | RBAC | Role-Based Access Control - Kiểm soát truy cập theo vai trò |
| 11 | REST | Representational State Transfer - Kiến trúc API |
| 12 | SPA | Single Page Application - Ứng dụng trang đơn |
| 13 | SSE | Server-Sent Events - Sự kiện từ server |
| 14 | UI/UX | User Interface/User Experience - Giao diện/Trải nghiệm người dùng |
| 15 | COD | Cash On Delivery - Thanh toán khi nhận hàng |
| 16 | AI | Artificial Intelligence - Trí tuệ nhân tạo |
| 17 | NLP | Natural Language Processing - Xử lý ngôn ngữ tự nhiên |

---

*Tài liệu được tạo tự động dựa trên phân tích mã nguồn hệ thống Coffee Shop POS*
