# 📊 Advanced Reports - Báo Cáo Nâng Cao

## 🎯 Tổng Quan

Module báo cáo nâng cao cho hệ thống Coffee Shop POS, cung cấp các báo cáo chi tiết về doanh thu, lợi nhuận, sản phẩm, khách hàng và khuyến mãi.

---

## 📋 Danh Sách Báo Cáo

### 1. 📈 **Báo Cáo Doanh Thu (Revenue Reports)**

#### 1.1. Báo Cáo Doanh Thu Theo Ngày
- **Mục đích:** Xem doanh thu chi tiết theo từng ngày
- **Thông tin hiển thị:**
  - Doanh thu tổng (gross revenue)
  - Tổng giảm giá (total discounts)
  - Doanh thu thuần (net revenue)
  - Số đơn hàng
  - Đơn hàng trung bình (average order value)
  - So sánh với ngày trước (% thay đổi)
  - Phương thức thanh toán: Tiền mặt, Thẻ, Chuyển khoản, Online
- **Bộ lọc:**
  - Chọn ngày cụ thể hoặc khoảng thời gian
  - Lọc theo loại đơn (DINE_IN, TAKEAWAY, DELIVERY)
  - Lọc theo khu vực (area)
  - Lọc theo thu ngân (cashier)
- **Visualization:**
  - Line chart: Doanh thu theo giờ trong ngày
  - Bar chart: Doanh thu theo phương thức thanh toán
  - Pie chart: Tỷ lệ loại đơn hàng
- **Export:** Excel, PDF

#### 1.2. Báo Cáo Doanh Thu Theo Tuần
- **Thông tin hiển thị:**
  - Doanh thu 7 ngày
  - So sánh với tuần trước
  - Biểu đồ doanh thu theo ngày trong tuần
  - Top 3 ngày có doanh thu cao nhất
- **Bộ lọc:**
  - Chọn tuần (dropdown: Tuần này, Tuần trước, Tuần tùy chọn)
  - Lọc theo loại đơn
  - Lọc theo khu vực

#### 1.3. Báo Cáo Doanh Thu Theo Tháng
- **Thông tin hiển thị:**
  - Doanh thu theo từng ngày trong tháng
  - Tổng doanh thu tháng
  - So sánh với tháng trước (% thay đổi)
  - Biểu đồ doanh thu theo ngày
  - Trung bình doanh thu/ngày
  - Số ngày làm việc
- **Bộ lọc:**
  - Chọn tháng/năm
  - Lọc theo loại đơn
  - Lọc theo khu vực

#### 1.4. Báo Cáo Doanh Thu Theo Năm
- **Thông tin hiển thị:**
  - Doanh thu theo từng tháng trong năm
  - Tổng doanh thu năm
  - So sánh với năm trước
  - Biểu đồ doanh thu theo tháng
  - Tháng có doanh thu cao nhất/thấp nhất
  - Growth rate (tỷ lệ tăng trưởng)
- **Bộ lọc:**
  - Chọn năm
  - Lọc theo loại đơn

---

### 2. 💰 **Báo Cáo Lợi Nhuận (Profit Reports)**

#### 2.1. Báo Cáo Lợi Nhuận Chi Tiết
- **Đã có:** `GET /api/v1/analytics/profit-report` ✅
- **Cần mở rộng:**
  - Báo cáo lợi nhuận theo ngày/tuần/tháng
  - So sánh lợi nhuận với kỳ trước
  - Tỷ lệ lợi nhuận (profit margin)
  - Chi phí nguyên liệu theo từng món
  - Top món có lợi nhuận cao nhất/thấp nhất
- **Thông tin hiển thị:**
  - Doanh thu thuần
  - Giá vốn hàng bán (COGS)
    - Chi phí nguyên liệu (ingredients)
    - Chi phí topping
  - Lợi nhuận gộp (gross profit)
  - Tỷ lệ lợi nhuận (%)
- **Bộ lọc:**
  - Khoảng thời gian
  - Lọc theo loại đơn
  - Lọc theo danh mục món
  - Có/không bao gồm topping
- **Visualization:**
  - Line chart: Lợi nhuận theo ngày
  - Bar chart: Top 10 món lợi nhuận cao nhất
  - Donut chart: Tỷ lệ doanh thu vs giá vốn

#### 2.2. Báo Cáo Lợi Nhuận Theo Món
- **Thông tin hiển thị:**
  - Danh sách tất cả món với:
    - Số lượng bán ra
    - Doanh thu từ món đó
    - Giá vốn (COGS)
    - Lợi nhuận
    - Tỷ lệ lợi nhuận (%)
    - Lợi nhuận/đơn vị
- **Bộ lọc:**
  - Khoảng thời gian
  - Lọc theo danh mục
  - Sắp xếp theo: Doanh thu, Lợi nhuận, Số lượng
- **Export:** Excel (chi tiết từng món)

---

### 3. 🍕 **Báo Cáo Sản Phẩm (Product Reports)**

#### 3.1. Top Món Bán Chạy
- **Đã có:** `GET /api/v1/analytics/top-menu-items` ✅
- **Cần mở rộng:**
  - Top món theo số lượng
  - Top món theo doanh thu
  - Top món theo lợi nhuận
  - Top món theo số đơn đã bán
- **Thông tin hiển thị:**
  - Tên món
  - Số lượng đã bán
  - Tổng doanh thu
  - Tổng lợi nhuận
  - Đơn giá trung bình
  - % so với tổng doanh thu
- **Bộ lọc:**
  - Khoảng thời gian
  - Top N (10, 20, 50, 100)
  - Lọc theo danh mục
  - Lọc theo loại đơn
- **Visualization:**
  - Bar chart: Top 10 món bán chạy
  - Table: Danh sách đầy đủ với pagination

#### 3.2. Món Ít Bán Được
- **Thông tin hiển thị:**
  - Danh sách món có số lượng bán < X trong kỳ
  - Cảnh báo món "chết" (không bán được)
  - Đề xuất: Có nên xóa/giảm giá món này?
- **Bộ lọc:**
  - Khoảng thời gian
  - Ngưỡng số lượng (ví dụ: < 5 đơn)

#### 3.3. Báo Cáo Theo Danh Mục
- **Thông tin hiển thị:**
  - Doanh thu theo từng danh mục (Cà phê, Trà sữa, etc.)
  - Số lượng món đã bán theo danh mục
  - Tỷ trọng % doanh thu mỗi danh mục
  - So sánh với kỳ trước
- **Visualization:**
  - Pie chart: Tỷ trọng doanh thu theo danh mục
  - Bar chart: So sánh doanh thu danh mục

---

### 4. 🎫 **Báo Cáo Khuyến Mãi (Promotion Reports)**

#### 4.1. Tổng Hợp Khuyến Mãi
- **Thông tin hiển thị:**
  - Tổng số khuyến mãi đã sử dụng
  - Tổng tiền giảm giá
  - Số đơn áp dụng khuyến mãi
  - % đơn có khuyến mãi
  - Trung bình giảm giá/đơn
- **Bộ lọc:**
  - Khoảng thời gian
  - Lọc theo loại khuyến mãi (PERCENT, AMOUNT)
  - Lọc theo mã khuyến mãi cụ thể

#### 4.2. Top Khuyến Mãi Được Sử Dụng
- **Thông tin hiển thị:**
  - Danh sách khuyến mãi theo:
    - Số lượt sử dụng
    - Tổng tiền giảm giá
    - Hiệu quả (ROI)
- **Visualization:**
  - Bar chart: Top 10 khuyến mãi được dùng nhiều nhất
  - Pie chart: Tỷ trọng giảm giá theo từng mã

#### 4.3. Hiệu Quả Khuyến Mãi
- **Thông tin hiển thị:**
  - So sánh doanh thu có/không có khuyến mãi
  - Tỷ lệ khách hàng sử dụng khuyến mãi
  - Khuyến mãi nào tăng doanh thu nhiều nhất
- **Metrics:**
  - Incremental revenue (doanh thu tăng thêm)
  - Discount efficiency (hiệu quả giảm giá)

---

### 5. 👥 **Báo Cáo Khách Hàng (Customer Reports)**

#### 5.1. Top Khách Hàng VIP
- **Thông tin hiển thị:**
  - Top khách hàng theo:
    - Tổng chi tiêu
    - Số lượt đến
    - Đơn hàng trung bình
  - Thông tin khách hàng:
    - Tên, SĐT, Email
    - Tổng chi tiêu
    - Số đơn đã đặt
    - Lần cuối đến
- **Bộ lọc:**
  - Top N (10, 20, 50)
  - Khoảng thời gian
- **Export:** Excel

#### 5.2. Phân Tích Khách Hàng
- **Thông tin hiển thị:**
  - Tổng số khách hàng
  - Khách hàng mới (first-time)
  - Khách hàng quay lại (repeat)
  - Tỷ lệ retention rate
  - Customer lifetime value (CLV)
- **Visualization:**
  - Line chart: Số khách hàng mới theo thời gian
  - Pie chart: Khách mới vs Khách cũ

#### 5.3. Lịch Sử Giao Dịch Khách Hàng
- **Thông tin hiển thị:**
  - Tất cả đơn hàng của khách hàng
  - Tổng chi tiêu
  - Món thường mua
  - Thời gian đến gần nhất
- **Tìm kiếm:** Theo tên, SĐT, Email

---

### 6. ⏰ **Báo Cáo Theo Thời Gian (Time-Based Reports)**

#### 6.1. Báo Cáo Theo Giờ Trong Ngày
- **Thông tin hiển thị:**
  - Doanh thu theo từng giờ (0h-23h)
  - Giờ cao điểm (peak hours)
  - Giờ thấp điểm (off-peak hours)
  - Đề xuất: Giờ nên tăng/giảm nhân viên
- **Visualization:**
  - Line chart: Doanh thu theo giờ
  - Heatmap: Doanh thu theo giờ + ngày trong tuần

#### 6.2. Báo Cáo Theo Ngày Trong Tuần
- **Thông tin hiển thị:**
  - Doanh thu theo thứ (T2, T3, ..., CN)
  - Ngày bán chạy nhất
  - Ngày bán ít nhất
- **Visualization:**
  - Bar chart: Doanh thu theo ngày trong tuần

#### 6.3. Báo Cáo Theo Ca Làm Việc
- **Thông tin hiển thị:**
  - Doanh thu theo ca (Ca sáng, Ca chiều, Ca tối)
  - So sánh hiệu suất giữa các ca
  - Top thu ngân theo ca
- **Bộ lọc:**
  - Chọn ca
  - Khoảng thời gian

---

### 7. 🏪 **Báo Cáo Theo Khu Vực (Area Reports)**

#### 7.1. Doanh Thu Theo Khu Vực
- **Thông tin hiển thị:**
  - Doanh thu từng khu vực (Tầng 1, Tầng 2, etc.)
  - Số đơn hàng theo khu vực
  - Đơn hàng trung bình theo khu vực
  - Bàn được sử dụng nhiều nhất
- **Visualization:**
  - Bar chart: So sánh doanh thu khu vực
  - Table: Chi tiết từng bàn

#### 7.2. Hiệu Quả Sử Dụng Bàn
- **Thông tin hiển thị:**
  - Tỷ lệ sử dụng bàn (occupancy rate)
  - Bàn có doanh thu cao nhất
  - Bàn ít được sử dụng
  - Thời gian trung bình một đơn tại bàn

---

### 8. 👨‍💼 **Báo Cáo Nhân Viên (Employee Reports)**

#### 8.1. Hiệu Suất Thu Ngân
- **Thông tin hiển thị:**
  - Doanh thu theo từng thu ngân
  - Số đơn đã xử lý
  - Trung bình doanh thu/ca
  - So sánh giữa các thu ngân
- **Bộ lọc:**
  - Khoảng thời gian
  - Chọn thu ngân cụ thể
- **Visualization:**
  - Bar chart: Top thu ngân theo doanh thu
  - Table: Chi tiết từng thu ngân

#### 8.2. Hiệu Suất Pha Chế
- **Thông tin hiển thị:**
  - Số món đã làm
  - Thời gian trung bình làm một món
  - Tỷ lệ hoàn thành đúng thời gian
  - So sánh giữa các pha chế

#### 8.3. Báo Cáo Ca Làm Việc
- **Thông tin hiển thị:**
  - Tổng số ca đã làm
  - Tổng doanh thu các ca
  - Ca có doanh thu cao nhất
  - Thống kê theo nhân viên

---

### 9. 📦 **Báo Cáo Kho Hàng (Inventory Reports)**

#### 9.1. Nguyên Liệu Sắp Hết
- **Thông tin hiển thị:**
  - Danh sách nguyên liệu có số lượng < ngưỡng
  - Cảnh báo sắp hết hàng
  - Đề xuất đặt hàng
- **Bộ lọc:**
  - Ngưỡng cảnh báo
  - Lọc theo nhà cung cấp

#### 9.2. Lịch Sử Xuất/Nhập Kho
- **Thông tin hiển thị:**
  - Tất cả giao dịch xuất/nhập
  - Số lượng, Giá, Ngày
  - Tổng giá trị xuất/nhập
- **Bộ lọc:**
  - Khoảng thời gian
  - Lọc theo nguyên liệu
  - Lọc theo loại (XUAT, NHAP)

#### 9.3. Tồn Kho Hiện Tại
- **Thông tin hiển thị:**
  - Tất cả nguyên liệu với số lượng tồn
  - Giá trị tồn kho
  - Nguyên liệu chưa sử dụng lâu

---

### 10. 🔍 **Báo Cáo Tùy Chỉnh (Custom Reports)**

#### 10.1. Báo Cáo Tổng Hợp (Dashboard Report)
- **Thông tin hiển thị:**
  - Tất cả KPI chính trong một trang:
    - Doanh thu hôm nay
    - Số đơn hôm nay
    - Lợi nhuận hôm nay
    - Top món bán chạy
    - Khuyến mãi được dùng nhiều nhất
    - Cảnh báo tồn kho
  - So sánh với kỳ trước
- **Visualization:**
  - Multiple charts trong một dashboard
  - Có thể export toàn bộ dashboard

#### 10.2. So Sánh Kỳ (Period Comparison)
- **Thông tin hiển thị:**
  - So sánh 2 kỳ bất kỳ:
    - Kỳ 1 vs Kỳ 2
    - % thay đổi
    - Tăng/giảm tuyệt đối
  - Các metrics:
    - Doanh thu
    - Số đơn
    - Lợi nhuận
    - Top món

---

## 🎨 UI/UX Design

### Layout Tổng Quan
```
┌─────────────────────────────────────────────────────────┐
│  📊 Báo Cáo Nâng Cao                           [Export] │
├─────────────────────────────────────────────────────────┤
│  [Tab 1] Doanh Thu  [Tab 2] Lợi Nhuận  [Tab 3] Sản phẩm│
│  [Tab 4] Khuyến mãi  [Tab 5] Khách hàng  [Tab 6] Thời gian│
│  [Tab 7] Khu vực     [Tab 8] Nhân viên   [Tab 9] Kho    │
│  [Tab 10] Tùy chỉnh                                       │
├─────────────────────────────────────────────────────────┤
│  📅 Bộ lọc: [Từ ngày] [Đến ngày] [Loại đơn] [Làm mới]  │
├─────────────────────────────────────────────────────────┤
│  📊 Summary Cards (4 thẻ)                               │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                   │
│  │ Tổng │ │ So   │ │ Top  │ │ Cảnh│                   │
│  │ DT   │ │ sánh │ │ món  │ │ báo │                   │
│  └──────┘ └──────┘ └──────┘ └──────┘                   │
├─────────────────────────────────────────────────────────┤
│  📈 Charts (Line, Bar, Pie, Donut)                     │
│  ┌─────────────────────────────────────┐                │
│  │        [Biểu đồ doanh thu]          │                │
│  └─────────────────────────────────────┘                │
├─────────────────────────────────────────────────────────┤
│  📋 Data Table (với pagination và sorting)              │
│  ┌─────────────────────────────────────┐                │
│  │ Món    │ SL │ Doanh thu │ Lợi nhuận │                │
│  ├─────────────────────────────────────┤                │
│  │ ...    │ ...│ ...       │ ...       │                │
│  └─────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────┘
```

### Tính Năng UI
- **Date Range Picker:** Calendar popup để chọn khoảng thời gian
- **Quick Filters:**
  - Hôm nay
  - Hôm qua
  - 7 ngày qua
  - 30 ngày qua
  - Tuần này
  - Tháng này
  - Tùy chọn
- **Export Buttons:**
  - Export Excel (chi tiết đầy đủ)
  - Export PDF (báo cáo định dạng đẹp)
  - Export CSV (raw data)
- **Visualizations:**
  - Sử dụng Chart.js hoặc Recharts
  - Responsive charts
  - Interactive tooltips
  - Download chart as image
- **Real-time Updates:**
  - Auto-refresh mỗi 30 giây (optional)
  - Manual refresh button

---

## 🔧 Backend APIs Cần Bổ Sung

### APIs Đã Có:
- ✅ `GET /api/v1/analytics/overview` - KPI tổng quan
- ✅ `GET /api/v1/analytics/top-menu-items` - Top món bán chạy
- ✅ `GET /api/v1/analytics/shift-stats` - Thống kê ca làm việc
- ✅ `GET /api/v1/analytics/profit-report` - Báo cáo lợi nhuận

### APIs Cần Thêm:

#### Revenue APIs
```javascript
GET /api/v1/analytics/revenue/daily
GET /api/v1/analytics/revenue/weekly
GET /api/v1/analytics/revenue/monthly
GET /api/v1/analytics/revenue/yearly
GET /api/v1/analytics/revenue/by-hour
GET /api/v1/analytics/revenue/by-day-of-week
GET /api/v1/analytics/revenue/by-area
```

#### Product APIs
```javascript
GET /api/v1/analytics/products/least-sold
GET /api/v1/analytics/products/by-category
GET /api/v1/analytics/products/profit-analysis
```

#### Promotion APIs
```javascript
GET /api/v1/analytics/promotions/summary
GET /api/v1/analytics/promotions/top-used
GET /api/v1/analytics/promotions/efficiency
```

#### Customer APIs
```javascript
GET /api/v1/analytics/customers/vip
GET /api/v1/analytics/customers/analysis
GET /api/v1/analytics/customers/transaction-history/:customerId
```

#### Time-based APIs
```javascript
GET /api/v1/analytics/time/by-hour
GET /api/v1/analytics/time/by-day-of-week
GET /api/v1/analytics/time/by-shift
```

#### Employee APIs
```javascript
GET /api/v1/analytics/employees/cashier-performance
GET /api/v1/analytics/employees/kitchen-performance
GET /api/v1/analytics/employees/shift-summary
```

#### Inventory APIs
```javascript
GET /api/v1/analytics/inventory/low-stock
GET /api/v1/analytics/inventory/transaction-history
GET /api/v1/analytics/inventory/current-stock
```

#### Custom APIs
```javascript
GET /api/v1/analytics/custom/dashboard
GET /api/v1/analytics/custom/period-comparison
```

---

## 📦 Export Features

### Excel Export
- **Format:** `.xlsx`
- **Features:**
  - Multiple sheets (Doanh thu, Lợi nhuận, Top món, etc.)
  - Formatted cells (currency, date, number)
  - Charts embedded in Excel
  - Auto-width columns
  - Header styling

### PDF Export
- **Format:** `.pdf`
- **Features:**
  - Professional layout
  - Charts as images
  - Company logo/branding
  - Footer: Generated date, page numbers
  - Print-ready format

### CSV Export
- **Format:** `.csv`
- **Features:**
  - Raw data only
  - UTF-8 encoding
  - Comma-separated values
  - Suitable for data analysis tools

---

## 🎯 Implementation Priority

### Phase 1 - Core Reports (Tuần 1-2)
1. ✅ Báo cáo doanh thu theo ngày/tuần/tháng
2. ✅ Top món bán chạy (đã có, mở rộng)
3. ✅ Báo cáo khuyến mãi tổng hợp
4. ✅ Báo cáo lợi nhuận chi tiết (đã có, mở rộng)

### Phase 2 - Advanced Reports (Tuần 3-4)
5. ✅ Báo cáo khách hàng VIP
6. ✅ Báo cáo theo thời gian (giờ, ngày trong tuần)
7. ✅ Báo cáo nhân viên
8. ✅ Báo cáo khu vực

### Phase 3 - Export & UI Polish (Tuần 5)
9. ✅ Export Excel/PDF/CSV
10. ✅ Dashboard tổng hợp
11. ✅ So sánh kỳ
12. ✅ UI/UX improvements

---

## 💡 Technical Notes

### Database Queries
- Sử dụng materialized views cho báo cáo phức tạp
- Index trên các cột thường query (date, status)
- Caching cho các báo cáo không thay đổi thường xuyên

### Performance
- Pagination cho bảng dữ liệu lớn
- Lazy loading cho charts
- Debounce cho date range picker

### Security
- Role-based access (Manager/Admin only)
- Audit log cho export reports

---

**🎉 Tổng kết:** Module Advanced Reports sẽ cung cấp 10+ loại báo cáo khác nhau, hỗ trợ export 3 định dạng, và giao diện trực quan với nhiều biểu đồ tương tác.

