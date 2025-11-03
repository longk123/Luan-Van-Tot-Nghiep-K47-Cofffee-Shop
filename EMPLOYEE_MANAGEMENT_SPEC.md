# 📋 CHỨC NĂNG QUẢN LÝ NHÂN VIÊN - TÀI LIỆU CHI TIẾT

## 🎯 TỔNG QUAN

**Trang Quản lý nhân viên** là một hệ thống CRUD đầy đủ để quản lý thông tin nhân viên, roles, và xem các thống kê liên quan đến hiệu suất làm việc của từng nhân viên.

---

## 📦 CÁC CHỨC NĂNG CHÍNH

### 1. **QUẢN LÝ THÔNG TIN NHÂN VIÊN (CRUD)**

#### 1.1. Danh sách nhân viên
- **Hiển thị:** Bảng danh sách tất cả nhân viên
- **Thông tin hiển thị:**
  - Mã nhân viên (user_id)
  - Tên đầy đủ (full_name)
  - Username
  - Email
  - Số điện thoại (phone)
  - Roles (badge hiển thị các roles: Cashier, Kitchen, Manager, Admin)
  - Trạng thái (Active/Inactive) với badge màu
  - Ngày tạo (created_at)
- **Tính năng:**
  - Tìm kiếm theo tên, username, email
  - Filter theo role (Cashier, Kitchen, Manager, Admin)
  - Filter theo trạng thái (Active/Inactive/All)
  - Sort theo tên, ngày tạo
  - Pagination (20 items/page)

#### 1.2. Tạo nhân viên mới
- **Form fields:**
  - Username (required, unique)
  - Password (required, min 6 chars)
  - Confirm Password (required, match password)
  - Tên đầy đủ (full_name) - required
  - Email (optional, validate format)
  - Số điện thoại (phone) - optional
  - Roles (multi-select): Cashier, Kitchen, Manager, Admin
- **Validation:**
  - Username không trùng
  - Password phải match
  - Email format hợp lệ
- **Actions:** Lưu, Hủy

#### 1.3. Sửa thông tin nhân viên
- **Form fields:** (giống Create, nhưng password là optional)
  - Username (read-only, không đổi được)
  - Password (optional - chỉ cập nhật nếu nhập)
  - Confirm Password (optional)
  - Tên đầy đủ
  - Email
  - Số điện thoại
  - Roles (multi-select)
  - Trạng thái (is_active): Active/Inactive
- **Actions:** Lưu, Hủy, Xóa (soft delete - set is_active = false)

#### 1.4. Xóa/Deactivate nhân viên
- **Soft Delete:** Set `is_active = false` thay vì xóa khỏi DB
- **Validation:** 
  - Không cho xóa nếu nhân viên đang có ca OPEN
  - Cảnh báo nếu nhân viên có nhiều ca/đơn hàng
- **Actions:** Xác nhận trước khi xóa

#### 1.5. Quản lý Roles
- **Gán roles:** Multi-select checkbox
- **Các roles có sẵn:**
  - `cashier` - Thu ngân
  - `kitchen`, `barista`, `chef`, `cook` - Pha chế/Bếp
  - `manager` - Quản lý
  - `admin` - Quản trị viên
- **Validation:** 
  - Mỗi nhân viên phải có ít nhất 1 role
  - Admin có thể gán bất kỳ role nào

---

### 2. **TAB: LỊCH SỬ CA LÀM VIỆC**

#### 2.1. Khi chọn một nhân viên từ danh sách
- **Hiển thị:** Tất cả các ca làm việc của nhân viên đó
- **Thông tin ca:**
  - Mã ca (#ID)
  - Loại ca (Thu ngân/Pha chế) - badge màu
  - Trạng thái (Đang mở/Đã đóng)
  - Thời gian bắt đầu/kết thúc
  - Thống kê (tùy loại ca):
    - **Thu ngân:** Tổng đơn, Doanh thu, Chênh lệch tiền mặt
    - **Pha chế:** Tổng món đã làm, Thời gian trung bình/món
- **Filter:**
  - Theo loại ca (Thu ngân/Pha chế/Tất cả)
  - Theo trạng thái (OPEN/CLOSED/Tất cả)
  - Theo khoảng thời gian (date range picker)
- **Actions:**
  - Xem chi tiết ca (mở ShiftDetailModal)
  - In báo cáo ca

#### 2.2. Thống kê tổng hợp
- **Summary cards:**
  - Tổng số ca
  - Tổng doanh thu (nếu là thu ngân)
  - Tổng món đã làm (nếu là pha chế)
  - Ca đang mở (nếu có)
- **Biểu đồ:** Timeline ca làm việc (nếu có thời gian)

---

### 3. **TAB: HIỆU SUẤT NHÂN VIÊN**

#### 3.1. Thống kê tổng quan
- **Thời kỳ:** Filter theo thời gian (7 ngày, 30 ngày, 3 tháng, 6 tháng, 1 năm, Tùy chỉnh)
- **Summary cards:**
  - **Thu ngân:**
    - Tổng số ca
    - Tổng đơn hàng
    - Tổng doanh thu
    - Doanh thu trung bình/ca
    - Chênh lệch tiền mặt trung bình
    - Số đơn trung bình/ca
  - **Pha chế:**
    - Tổng số ca
    - Tổng món đã làm
    - Thời gian trung bình/món
    - Số món trung bình/ca
    - Tỷ lệ hoàn thành đúng hạn

#### 3.2. Bảng xếp hạng
- **So sánh với nhân viên khác:** (nếu có nhiều nhân viên cùng role)
  - Xếp hạng theo doanh thu (thu ngân)
  - Xếp hạng theo số món làm (pha chế)
  - Xếp hạng theo hiệu suất tổng thể

#### 3.3. Biểu đồ
- **Line chart:** Doanh thu theo ngày/tuần (thu ngân)
- **Bar chart:** Số món làm theo ngày (pha chế)
- **Pie chart:** Phân bố loại ca (Thu ngân vs Pha chế)

#### 3.4. Bảng chi tiết
- Danh sách từng ca với metrics:
  - Thời gian làm việc
  - Hiệu suất so với trung bình
  - Đánh giá (⭐ rating nếu có)

---

## 🏗️ CẤU TRÚC TRANG

### Layout
```
┌─────────────────────────────────────────────────┐
│  Header: "Quản lý nhân viên"                    │
│  Button: [+ Thêm nhân viên]                      │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│  Filters: Search, Role Filter, Status Filter   │
└─────────────────────────────────────────────────┘
┌──────────────────┬──────────────────────────────┐
│                  │                              │
│  DANH SÁCH       │  TABS (Khi chọn nhân viên)  │
│  NHÂN VIÊN       │  ┌────────────────────────┐ │
│                  │  │ • Thông tin            │ │
│  [Table/Bảng]    │  │ • Lịch sử ca           │ │
│                  │  │ • Hiệu suất             │ │
│                  │  └────────────────────────┘ │
│                  │                              │
│                  │  [Nội dung tab được chọn]   │
│                  │                              │
└──────────────────┴──────────────────────────────┘
```

### Tab Structure
1. **Tab mặc định:** Danh sách nhân viên (không có tab con)
2. **Khi chọn nhân viên:** Hiển thị tabs:
   - **Thông tin:** Form sửa thông tin nhân viên
   - **Lịch sử ca:** Danh sách ca + filter
   - **Hiệu suất:** Thống kê + biểu đồ

---

## 🔌 BACKEND API CẦN CÓ

### Đã có sẵn:
✅ `GET /api/v1/auth/users` - Lấy danh sách users với roles

### Cần thêm:

#### 1. CRUD Users
- `POST /api/v1/users` - Tạo nhân viên mới
  - Body: `{ username, password, full_name, email, phone, roles: [role_id] }`
- `GET /api/v1/users/:id` - Chi tiết nhân viên
  - Response: `{ user_id, username, full_name, email, phone, is_active, roles: [...] }`
- `PUT /api/v1/users/:id` - Cập nhật nhân viên
  - Body: `{ full_name?, email?, phone?, password?, roles?: [role_id], is_active? }`
- `DELETE /api/v1/users/:id` - Xóa/Deactivate nhân viên (soft delete)
  - Set `is_active = false`

#### 2. Roles Management
- `GET /api/v1/roles` - Lấy danh sách tất cả roles
  - Response: `[{ role_id, role_name, description }]`
- `PUT /api/v1/users/:id/roles` - Cập nhật roles cho nhân viên
  - Body: `{ roles: [role_id] }`

#### 3. Employee Statistics
- `GET /api/v1/users/:id/shifts` - Lịch sử ca của nhân viên
  - Query params: `?startDate=...&endDate=...&shiftType=CASHIER|KITCHEN|ALL&status=OPEN|CLOSED|ALL`
  - Response: `{ data: [...shifts], pagination: {...} }`
- `GET /api/v1/users/:id/stats` - Thống kê hiệu suất nhân viên
  - Query params: `?startDate=...&endDate=...&shiftType=...`
  - Response:
    ```json
    {
      "summary": {
        "total_shifts": 10,
        "total_orders": 150,
        "total_revenue": 5000000,
        "avg_revenue_per_shift": 500000,
        "avg_orders_per_shift": 15,
        "total_items_made": 300,
        "avg_prep_time": 120,
        "avg_items_per_shift": 30
      },
      "rankings": {
        "revenue_rank": 2,
        "total_employees": 5
      },
      "chart_data": {
        "daily_revenue": [...],
        "daily_items": [...]
      }
    }
    ```

#### 4. Validation APIs
- `GET /api/v1/users/check-username/:username` - Kiểm tra username đã tồn tại chưa
  - Response: `{ available: true/false }`

---

## 🎨 UI/UX CHI TIẾT

### 1. Danh sách nhân viên
- **Table design:** Giống ShiftManagement
- **Row actions:** 
  - Icon ✏️ Sửa (mở modal)
  - Icon 🗑️ Xóa (confirm dialog)
  - Icon 👁️ Xem (mở tab Thông tin)
- **Badge roles:** Màu sắc khác nhau cho từng role
  - Cashier: Blue
  - Kitchen: Orange
  - Manager: Purple
  - Admin: Red

### 2. Form Create/Edit
- **Modal dialog:** Giống AreaModal, MenuModal
- **Theme:** Đồng bộ với hệ thống (brown/orange)
- **Validation:** Real-time, hiển thị error dưới mỗi field

### 3. Tab Lịch sử ca
- **Table:** Giống ShiftManagement table
- **Filter bar:** Giống ShiftManagement filters
- **Actions:** Button "Xem chi tiết" → mở ShiftDetailModal

### 4. Tab Hiệu suất
- **Summary cards:** Giống InventoryManagement warning cards style
- **Charts:** Dùng Recharts (giống RevenueChart trong ManagerDashboard)
- **Color scheme:** Đồng bộ với theme nâu/cam

---

## 🔗 LÀ TIỀN ĐỀ CHO CÁC CHỨC NĂNG SAU

### 1. **Tính lương nhân viên (Payroll System)**
- **Cần có:**
  - Danh sách nhân viên (✅ từ Employee Management)
  - Lịch sử ca làm việc (✅ từ tab Lịch sử ca)
  - Thống kê giờ làm (✅ từ hiệu suất)
  - Cấu trúc lương (luong_co_ban, luong_theo_gio từ DB)
- **Sẽ làm:**
  - Tính lương theo ca
  - Bảng công (timesheet)
  - Lương tháng
  - Xuất bảng lương PDF

### 2. **Đánh giá hiệu suất nhân viên (Performance Review)**
- **Cần có:**
  - Thống kê hiệu suất (✅ từ tab Hiệu suất)
  - Lịch sử ca (✅ từ tab Lịch sử ca)
  - Ranking so sánh (✅ từ tab Hiệu suất)
- **Sẽ làm:**
  - Tạo đánh giá định kỳ (tháng/quý/năm)
  - Ghi nhận khen thưởng/kỷ luật
  - Mục tiêu KPI cho từng nhân viên
  - Dashboard nhân viên xem đánh giá của mình

### 3. **Phân công ca làm việc (Shift Scheduling)**
- **Cần có:**
  - Danh sách nhân viên (✅ từ Employee Management)
  - Roles của nhân viên (✅ từ quản lý roles)
- **Sẽ làm:**
  - Calendar view phân ca
  - Gán ca trước cho nhân viên
  - Đổi ca, xin nghỉ
  - Thông báo ca sắp đến (notification)

### 4. **Báo cáo nhân sự (HR Reports)**
- **Cần có:**
  - Tất cả dữ liệu từ Employee Management
- **Sẽ làm:**
  - Báo cáo tuyển dụng
  - Báo cáo turnover rate
  - Báo cáo hiệu suất theo bộ phận
  - Xuất Excel/PDF

### 5. **Quản lý đào tạo (Training Management)**
- **Cần có:**
  - Danh sách nhân viên
  - Roles (để biết cần đào tạo gì)
- **Sẽ làm:**
  - Lịch đào tạo
  - Theo dõi hoàn thành khóa học
  - Chứng chỉ

### 6. **Hệ thống thông báo cho nhân viên**
- **Cần có:**
  - Danh sách nhân viên
  - Roles
- **Sẽ làm:**
  - Gửi thông báo cá nhân
  - Thông báo chung
  - Thông báo ca làm việc

### 7. **Tích hợp chấm công (Time Tracking)**
- **Cần có:**
  - Danh sách nhân viên
  - Lịch sử ca (để so sánh)
- **Sẽ làm:**
  - Chấm công bằng QR code/biometric
  - Theo dõi giờ vào/ra thực tế
  - So sánh với ca được phân công

---

## 📊 DATABASE SCHEMA LIÊN QUAN

### Tables đã có:
- `users` - Thông tin nhân viên
- `roles` - Danh sách roles
- `user_roles` - Gán roles cho users
- `ca_lam` - Ca làm việc (có `nhan_vien_id`)
- `don_hang` - Đơn hàng (có `nhan_vien_id`, `ca_lam_id`)
- `don_hang_chi_tiet` - Chi tiết đơn (có `maker_id` cho kitchen)

### Cần thêm (cho các chức năng sau):
- `bang_cong` - Bảng công (đã có trong migration)
- `luong` - Bảng lương
- `danh_gia_nhan_vien` - Đánh giá nhân viên
- `phan_cong_ca` - Phân công ca trước
- `thong_bao` - Thông báo cho nhân viên

---

## ✅ CHECKLIST TRIỂN KHAI

### Phase 1: CRUD Cơ bản
- [ ] Backend API: POST/GET/PUT/DELETE users
- [ ] Backend API: GET/PUT roles
- [ ] Frontend: Trang EmployeeManagement
- [ ] Frontend: Form Create/Edit nhân viên
- [ ] Frontend: Table danh sách + Search/Filter
- [ ] Frontend: Delete/Deactivate với confirmation

### Phase 2: Tab Lịch sử ca
- [ ] Backend API: GET /users/:id/shifts
- [ ] Frontend: Tab "Lịch sử ca"
- [ ] Frontend: Table hiển thị ca + filters
- [ ] Frontend: Link đến ShiftDetailModal

### Phase 3: Tab Hiệu suất
- [ ] Backend API: GET /users/:id/stats
- [ ] Frontend: Tab "Hiệu suất"
- [ ] Frontend: Summary cards
- [ ] Frontend: Charts (Revenue/Items timeline)
- [ ] Frontend: Ranking comparison

### Phase 4: Polish & Testing
- [ ] Validation đầy đủ
- [ ] Error handling
- [ ] Loading states
- [ ] Responsive design
- [ ] Testing với dữ liệu thực

---

## 🎯 KẾT LUẬN

**Employee Management là nền tảng quan trọng** cho nhiều chức năng quản lý nhân sự sau này. Việc xây dựng đầy đủ và đúng ngay từ đầu sẽ giúp:
- Dễ dàng mở rộng các tính năng liên quan
- Dữ liệu nhất quán
- Trải nghiệm người dùng tốt
- Hỗ trợ tốt cho việc quản lý và ra quyết định

---

**Tác giả:** AI Assistant  
**Ngày:** 2025  
**Version:** 1.0

