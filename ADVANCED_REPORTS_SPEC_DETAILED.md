# 📊 Advanced Reports - Specification Chi Tiết

## 🎯 Mục Đích

Tài liệu này mô tả chi tiết chức năng Báo Cáo Nâng Cao với đánh dấu rõ ràng:
- ✅ **ĐÃ CÓ** - Backend/Frontend đã implement
- ❌ **CHƯA CÓ** - Cần implement mới
- ⚠️ **CẦN HOÀN THIỆN** - Có một phần, cần bổ sung

---

## 📋 **PHẦN 1: BÁO CÁO DOANH THU (Revenue Reports)**

### 1.1. Báo Cáo Doanh Thu Theo Ngày
**Status:** ⚠️ **CẦN HOÀN THIỆN**

#### Backend:
- ✅ **ĐÃ CÓ** - API: `GET /api/v1/analytics/revenue-chart`
  - File: `backend/src/controllers/analyticsController.js`
  - Service: `backend/src/services/analyticsService.js`
  - Repository: `backend/src/repositories/analyticsRepository.js`
  - Hỗ trợ: `?startDate=&endDate=` hoặc `?days=7`
  - ✅ Trả về: Doanh thu theo ngày trong khoảng thời gian

#### Frontend:
- ✅ **ĐÃ CÓ** - Component: `RevenueChart.jsx` trong `ManagerDashboard.jsx`
- ✅ **ĐÃ CÓ** - API call: `api.getRevenueChart(params)`
- ⚠️ **CẦN BỔ SUNG**: 
  - Biểu đồ doanh thu theo giờ trong ngày (chỉ có theo ngày)
  - Phương thức thanh toán breakdown (cần kiểm tra)

#### Cần Làm:
- ❌ Tạo page riêng `RevenueReports.jsx` nếu chưa có
- ❌ Thêm breakdown theo giờ (0h-23h)
- ❌ Thêm breakdown theo phương thức thanh toán (Tiền mặt, Thẻ, Chuyển khoản, Online)
- ❌ Export Excel/PDF

---

### 1.2. Báo Cáo Doanh Thu Theo Tuần
**Status:** ⚠️ **CẦN HOÀN THIỆN**

#### Backend:
- ✅ **ĐÃ CÓ** - API: `GET /api/v1/analytics/revenue-chart` với date range 7 ngày
- ⚠️ **CẦN BỔ SUNG**: 
  - Grouping theo tuần (hiện tại chỉ group theo ngày)
  - So sánh với tuần trước

#### Frontend:
- ⚠️ **CHƯA CÓ** - Component riêng cho weekly report

#### Cần Làm:
- ❌ Backend: Thêm logic group theo tuần (có thể dùng `DATE_TRUNC('week', date)`)
- ❌ Frontend: Component `RevenueWeeklyReports.jsx`
- ❌ Thêm so sánh với tuần trước

---

### 1.3. Báo Cáo Doanh Thu Theo Tháng
**Status:** ⚠️ **CẦN HOÀN THIỆN**

#### Backend:
- ✅ **ĐÃ CÓ** - API: `GET /api/v1/analytics/revenue-chart` với date range 30 ngày
- ⚠️ **CẦN BỔ SUNG**: 
  - Grouping theo tháng
  - So sánh với tháng trước

#### Frontend:
- ⚠️ **CHƯA CÓ** - Component riêng cho monthly report

#### Cần Làm:
- ❌ Backend: Thêm logic group theo tháng
- ❌ Frontend: Component `RevenueMonthlyReports.jsx`
- ❌ Thêm so sánh với tháng trước

---

### 1.4. Báo Cáo Doanh Thu Theo Năm
**Status:** ❌ **CHƯA CÓ**

#### Backend:
- ❌ **CHƯA CÓ** - API riêng cho yearly report

#### Frontend:
- ❌ **CHƯA CÓ** - Component cho yearly report

#### Cần Làm:
- ❌ Backend: API mới hoặc extend `revenue-chart` với `period=yearly`
- ❌ Frontend: Component `RevenueYearlyReports.jsx`
- ❌ Biểu đồ doanh thu theo 12 tháng

---

### 1.5. Doanh Thu Theo Giờ Trong Ngày
**Status:** ❌ **CHƯA CÓ**

#### Backend:
- ❌ **CHƯA CÓ** - API phân tích theo giờ

#### Frontend:
- ❌ **CHƯA CÓ** - Component hiển thị theo giờ

#### Cần Làm:
- ❌ Backend: API mới `GET /api/v1/analytics/revenue/by-hour?date=YYYY-MM-DD`
- ❌ Frontend: Line chart doanh thu theo 24 giờ
- ❌ Xác định giờ cao điểm/ thấp điểm

---

### 1.6. Doanh Thu Theo Ngày Trong Tuần
**Status:** ❌ **CHƯA CÓ**

#### Backend:
- ❌ **CHƯA CÓ** - API phân tích theo ngày trong tuần

#### Frontend:
- ❌ **CHƯA CÓ** - Component hiển thị theo ngày trong tuần

#### Cần Làm:
- ❌ Backend: API mới `GET /api/v1/analytics/revenue/by-day-of-week?startDate=&endDate=`
- ❌ Frontend: Bar chart doanh thu theo T2-T7, CN
- ❌ Xác định ngày bán chạy nhất

---

### 1.7. Doanh Thu Theo Khu Vực
**Status:** ❌ **CHƯA CÓ** (cần kiểm tra lại)

#### Backend:
- ⚠️ **CẦN KIỂM TRA** - Có thể có trong `areasRepository.js`

#### Frontend:
- ❌ **CHƯA CÓ** - Component riêng cho area revenue

#### Cần Làm:
- ❌ Backend: API `GET /api/v1/analytics/revenue/by-area?startDate=&endDate=`
- ❌ Frontend: Component hiển thị doanh thu từng khu vực
- ❌ Bar chart so sánh khu vực

---

---

## 💰 **PHẦN 2: BÁO CÁO LỢI NHUẬN (Profit Reports)**

### 2.1. Báo Cáo Lợi Nhuận Chi Tiết
**Status:** ✅ **ĐÃ CÓ**

#### Backend:
- ✅ **ĐÃ CÓ** - API: `GET /api/v1/analytics/profit-report`
  - File: `backend/src/controllers/analyticsController.js` (line 116)
  - Service: `backend/src/services/analyticsService.js`
  - Query params: `?startDate=&endDate=&includeTopping=true&orderType=`
  - ✅ Trả về: Summary (tổng doanh thu, giá vốn, lợi nhuận) + Details (chi tiết từng đơn)

#### Frontend:
- ✅ **ĐÃ CÓ** - Component: `ProfitReport.jsx`
  - File: `frontend/src/components/manager/ProfitReport.jsx`
  - ✅ Hiển thị summary cards
  - ✅ Bảng chi tiết với pagination

#### Cần Làm:
- ⚠️ Export Excel/PDF (có component nhưng backend chưa implement)
- ⚠️ So sánh với kỳ trước (có API `profit-comparison` nhưng chưa tích hợp vào UI)

---

### 2.2. Báo Cáo Lợi Nhuận Theo Món
**Status:** ✅ **ĐÃ CÓ**

#### Backend:
- ✅ **ĐÃ CÓ** - API: `GET /api/v1/analytics/profit-by-item`
  - File: `backend/src/controllers/analyticsController.js` (line 166)
  - Query params: `?startDate=&endDate=&limit=20`
  - ✅ Trả về: Top món với doanh thu, giá vốn, lợi nhuận

#### Frontend:
- ⚠️ **CẦN KIỂM TRA** - Có thể có trong `ProfitReport.jsx` hoặc chưa có component riêng

#### Cần Làm:
- ❌ Frontend: Component `ProfitByItemReports.jsx` (nếu chưa có)
- ❌ Bảng với columns: Tên món, Số lượng bán, Doanh thu, Giá vốn, Lợi nhuận, Tỷ lệ %
- ❌ Bar chart top 10 món lợi nhuận cao nhất

---

### 2.3. Báo Cáo Lợi Nhuận Theo Danh Mục
**Status:** ✅ **ĐÃ CÓ**

#### Backend:
- ✅ **ĐÃ CÓ** - API: `GET /api/v1/analytics/profit-by-category`
  - File: `backend/src/controllers/analyticsController.js` (line 185)
  - Query params: `?startDate=&endDate=`

#### Frontend:
- ⚠️ **CẦN KIỂM TRA** - Component có thể chưa có

#### Cần Làm:
- ❌ Frontend: Component `ProfitByCategoryReports.jsx`
- ❌ Pie chart tỷ trọng lợi nhuận theo danh mục
- ❌ Bảng chi tiết từng danh mục

---

### 2.4. So Sánh Lợi Nhuận
**Status:** ✅ **ĐÃ CÓ** (Backend), ⚠️ **CẦN HOÀN THIỆN** (Frontend)

#### Backend:
- ✅ **ĐÃ CÓ** - API: `GET /api/v1/analytics/profit-comparison`
  - File: `backend/src/controllers/analyticsController.js` (line 203)
  - Query params: `?startDate=&endDate=&timeRange=custom`

#### Frontend:
- ⚠️ **CHƯA CÓ** - Component riêng cho comparison

#### Cần Làm:
- ❌ Frontend: Component `ProfitComparisonReports.jsx`
- ❌ Side-by-side comparison với % thay đổi
- ❌ Visual indicators (↑↓) cho tăng/giảm

---

---

## 🍕 **PHẦN 3: BÁO CÁO SẢN PHẨM (Product Reports)**

### 3.1. Top Món Bán Chạy
**Status:** ✅ **ĐÃ CÓ**

#### Backend:
- ✅ **ĐÃ CÓ** - API: `GET /api/v1/analytics/top-menu-items`
  - File: `backend/src/controllers/analyticsController.js` (line 83)
  - Query params: `?days=7&limit=10`
  - ✅ Trả về: Top món theo số lượng bán

#### Frontend:
- ✅ **ĐÃ CÓ** - Component: `TopMenuItems.jsx`
  - File: `frontend/src/components/manager/TopMenuItems.jsx`
  - ✅ Hiển thị trong `ManagerDashboard.jsx`

#### Cần Làm:
- ⚠️ Mở rộng: Top theo doanh thu, Top theo lợi nhuận (chỉ có top theo số lượng)
- ❌ Filter theo danh mục
- ❌ Export Excel

---

### 3.2. Món Ít Bán Được
**Status:** ❌ **CHƯA CÓ**

#### Backend:
- ❌ **CHƯA CÓ** - API riêng cho least sold items

#### Frontend:
- ❌ **CHƯA CÓ** - Component

#### Cần Làm:
- ❌ Backend: API mới `GET /api/v1/analytics/products/least-sold?startDate=&endDate=&threshold=5`
- ❌ Frontend: Component `LeastSoldProducts.jsx`
- ❌ Cảnh báo món "chết" (không bán được)
- ❌ Đề xuất xóa/giảm giá

---

### 3.3. Báo Cáo Theo Danh Mục
**Status:** ⚠️ **CẦN HOÀN THIỆN**

#### Backend:
- ✅ **ĐÃ CÓ** - API: `GET /api/v1/analytics/profit-by-category` (có thể dùng)

#### Frontend:
- ⚠️ **CHƯA CÓ** - Component riêng

#### Cần Làm:
- ❌ Frontend: Component `ProductByCategoryReports.jsx`
- ❌ Pie chart tỷ trọng doanh thu theo danh mục
- ❌ So sánh giữa các danh mục

---

---

## 🎫 **PHẦN 4: BÁO CÁO KHUYẾN MÃI (Promotion Reports)**

### 4.1. Tổng Hợp Khuyến Mãi
**Status:** ✅ **ĐÃ CÓ** (Một phần)

#### Backend:
- ✅ **ĐÃ CÓ** - API: `GET /api/v1/promotions/summary`
  - File: `backend/src/controllers/promotionController.js`
  - ✅ Trả về: `total_active`, `total_used_today`, `total_discount_today`, `expiring_soon`

#### Frontend:
- ✅ **ĐÃ CÓ** - Hiển thị trong `PromotionManagement.jsx`
  - Summary cards đã có

#### Cần Làm:
- ❌ Báo cáo tổng hợp theo khoảng thời gian (hiện tại chỉ có hôm nay)
- ❌ API mới: `GET /api/v1/analytics/promotions/summary?startDate=&endDate=`

---

### 4.2. Top Khuyến Mãi Được Sử Dụng
**Status:** ✅ **ĐÃ CÓ** (Một phần)

#### Backend:
- ✅ **ĐÃ CÓ** - API: `GET /api/v1/promotions/:id/stats`
  - File: `backend/src/controllers/promotionController.js`
  - ✅ Trả về stats cho từng promotion

#### Frontend:
- ✅ **ĐÃ CÓ** - Hiển thị trong `PromotionDetailModal.jsx` (tab Thống kê)

#### Cần Làm:
- ❌ API tổng hợp top khuyến mãi: `GET /api/v1/analytics/promotions/top-used?startDate=&endDate=&limit=10`
- ❌ Frontend: Component `TopPromotionsReports.jsx`
- ❌ Bar chart top 10 khuyến mãi được dùng nhiều nhất

---

### 4.3. Hiệu Quả Khuyến Mãi
**Status:** ❌ **CHƯA CÓ**

#### Backend:
- ❌ **CHƯA CÓ** - API tính hiệu quả khuyến mãi

#### Frontend:
- ❌ **CHƯA CÓ** - Component

#### Cần Làm:
- ❌ Backend: API `GET /api/v1/analytics/promotions/efficiency?startDate=&endDate=`
  - Tính: Incremental revenue, Discount efficiency, ROI
- ❌ Frontend: Component `PromotionEfficiencyReports.jsx`
- ❌ So sánh doanh thu có/không có khuyến mãi

---

---

## 👥 **PHẦN 5: BÁO CÁO KHÁCH HÀNG (Customer Reports)**

### 5.1. Top Khách Hàng VIP
**Status:** ❌ **CHƯA CÓ**

#### Backend:
- ❌ **CHƯA CÓ** - API cho customer reports
- ⚠️ Có bảng `khach_hang` nhưng chưa có API thống kê

#### Frontend:
- ❌ **CHƯA CÓ** - Component

#### Cần Làm:
- ❌ Backend: API mới `GET /api/v1/analytics/customers/vip?startDate=&endDate=&limit=20`
  - JOIN `khach_hang` với `don_hang` để tính tổng chi tiêu
- ❌ Repository: `customerRepository.js` hoặc mở rộng `analyticsRepository.js`
- ❌ Frontend: Component `CustomerVIPReports.jsx`
- ❌ Bảng top khách hàng với: Tên, SĐT, Tổng chi tiêu, Số đơn, Lần cuối đến

---

### 5.2. Phân Tích Khách Hàng
**Status:** ❌ **CHƯA CÓ**

#### Backend:
- ❌ **CHƯA CÓ** - API phân tích khách hàng

#### Frontend:
- ❌ **CHƯA CÓ** - Component

#### Cần Làm:
- ❌ Backend: API `GET /api/v1/analytics/customers/analysis?startDate=&endDate=`
  - Metrics: Total customers, New customers, Repeat customers, Retention rate, CLV
- ❌ Frontend: Component `CustomerAnalysisReports.jsx`
- ❌ Charts: Khách mới vs Khách cũ, Retention rate over time

---

### 5.3. Lịch Sử Giao Dịch Khách Hàng
**Status:** ❌ **CHƯA CÓ**

#### Backend:
- ❌ **CHƯA CÓ** - API transaction history cho customer

#### Frontend:
- ❌ **CHƯA CÓ** - Component

#### Cần Làm:
- ❌ Backend: API `GET /api/v1/analytics/customers/:customerId/transaction-history?startDate=&endDate=`
- ❌ Frontend: Component `CustomerTransactionHistory.jsx`
- ❌ Bảng tất cả đơn hàng của khách hàng
- ❌ Tìm kiếm theo tên, SĐT, Email

---

---

## ⏰ **PHẦN 6: BÁO CÁO THỜI GIAN (Time-Based Reports)**

### 6.1. Báo Cáo Theo Giờ Trong Ngày
**Status:** ❌ **CHƯA CÓ** (trùng với 1.5)

#### Cần Làm:
- Xem phần 1.5 (Doanh Thu Theo Giờ)

---

### 6.2. Báo Cáo Theo Ngày Trong Tuần
**Status:** ❌ **CHƯA CÓ** (trùng với 1.6)

#### Cần Làm:
- Xem phần 1.6 (Doanh Thu Theo Ngày Trong Tuần)

---

### 6.3. Báo Cáo Theo Ca Làm Việc
**Status:** ✅ **ĐÃ CÓ**

#### Backend:
- ✅ **ĐÃ CÓ** - API: `GET /api/v1/analytics/shift-stats`
  - File: `backend/src/controllers/analyticsController.js` (line 101)
  - Query params: `?days=7`
  - ✅ Trả về: Thống kê các ca làm việc

#### Frontend:
- ✅ **ĐÃ CÓ** - Component: `ShiftStats.jsx`
  - File: `frontend/src/components/manager/ShiftStats.jsx`
  - ✅ Hiển thị trong `ManagerDashboard.jsx`

#### Cần Làm:
- ⚠️ Export functionality
- ⚠️ So sánh hiệu suất giữa các ca

---

---

## 🏪 **PHẦN 7: BÁO CÁO KHU VỰC (Area Reports)**

### 7.1. Doanh Thu Theo Khu Vực
**Status:** ❌ **CHƯA CÓ** (trùng với 1.7)

#### Cần Làm:
- Xem phần 1.7

---

### 7.2. Hiệu Quả Sử Dụng Bàn
**Status:** ❌ **CHƯA CÓ**

#### Backend:
- ❌ **CHƯA CÓ** - API tính occupancy rate

#### Frontend:
- ❌ **CHƯA CÓ** - Component

#### Cần Làm:
- ❌ Backend: API `GET /api/v1/analytics/areas/table-occupancy?startDate=&endDate=`
- ❌ Frontend: Component `TableOccupancyReports.jsx`
- ❌ Metrics: Occupancy rate, Bàn có doanh thu cao nhất, Thời gian trung bình/đơn

---

---

## 👨‍💼 **PHẦN 8: BÁO CÁO NHÂN VIÊN (Employee Reports)**

### 8.1. Hiệu Suất Thu Ngân
**Status:** ⚠️ **CẦN KIỂM TRA**

#### Backend:
- ⚠️ Có thể có trong `userRepository.getUserStats()` hoặc `shiftsRepository`

#### Frontend:
- ⚠️ Có thể có trong `EmployeePerformance.jsx` hoặc `ShiftStats.jsx`

#### Cần Làm:
- ❌ Kiểm tra và bổ sung API nếu thiếu
- ❌ Component riêng `CashierPerformanceReports.jsx` nếu chưa có

---

### 8.2. Hiệu Suất Pha Chế
**Status:** ✅ **ĐÃ CÓ** (Một phần)

#### Backend:
- ✅ **ĐÃ CÓ** - Trong `shift-stats` có kitchen stats
  - `total_items_made`, `avg_prep_time_seconds`

#### Frontend:
- ⚠️ **CẦN KIỂM TRA** - Có thể có trong `ShiftDetailModal.jsx`

#### Cần Làm:
- ❌ Component riêng `KitchenPerformanceReports.jsx`
- ❌ So sánh hiệu suất giữa các pha chế

---

### 8.3. Báo Cáo Ca Làm Việc
**Status:** ✅ **ĐÃ CÓ**

#### Backend:
- ✅ **ĐÃ CÓ** - API `GET /api/v1/analytics/shift-stats`

#### Frontend:
- ✅ **ĐÃ CÓ** - Component `ShiftStats.jsx`

#### Cần Làm:
- ⚠️ Export functionality
- ⚠️ So sánh giữa các ca

---

---

## 📦 **PHẦN 9: BÁO CÁO KHO HÀNG (Inventory Reports)**

### 9.1. Nguyên Liệu Sắp Hết
**Status:** ✅ **ĐÃ CÓ**

#### Backend:
- ✅ **ĐÃ CÓ** - API: `GET /api/v1/inventory/warnings`
  - File: `backend/src/controllers/inventoryController.js`

#### Frontend:
- ✅ **ĐÃ CÓ** - Hiển thị trong `InventoryManagement.jsx`
- ✅ **ĐÃ CÓ** - Component `BatchExpiryNotification.jsx`

#### Cần Làm:
- ⚠️ Export Excel
- ⚠️ Cảnh báo tự động (notification)

---

### 9.2. Lịch Sử Xuất/Nhập Kho
**Status:** ✅ **ĐÃ CÓ**

#### Backend:
- ✅ **ĐÃ CÓ** - APIs:
  - `GET /api/v1/inventory/export-history`
  - `GET /api/v1/inventory/import-history`

#### Frontend:
- ✅ **ĐÃ CÓ** - Hiển thị trong `InventoryManagement.jsx` (tabs Export/Import)

#### Cần Làm:
- ⚠️ Export Excel/PDF

---

### 9.3. Tồn Kho Hiện Tại
**Status:** ✅ **ĐÃ CÓ**

#### Backend:
- ✅ **ĐÃ CÓ** - API: `GET /api/v1/inventory/ingredients`

#### Frontend:
- ✅ **ĐÃ CÓ** - Hiển thị trong `InventoryManagement.jsx` (Stock tab)

#### Cần Làm:
- ⚠️ Export Excel

---

---

## 🔍 **PHẦN 10: BÁO CÁO TÙY CHỈNH (Custom Reports)**

### 10.1. Dashboard Tổng Hợp
**Status:** ✅ **ĐÃ CÓ**

#### Backend:
- ✅ **ĐÃ CÓ** - API: `GET /api/v1/analytics/overview`
  - File: `backend/src/controllers/analyticsController.js` (line 9)

#### Frontend:
- ✅ **ĐÃ CÓ** - Component: `ManagerDashboard.jsx`
  - ✅ KPI cards
  - ✅ Revenue chart
  - ✅ Top menu items
  - ✅ Shift stats

#### Cần Làm:
- ⚠️ Export toàn bộ dashboard (PDF)
- ⚠️ Thêm chart: Profit chart, Promotion usage

---

### 10.2. So Sánh Kỳ
**Status:** ⚠️ **CẦN HOÀN THIỆN**

#### Backend:
- ✅ **ĐÃ CÓ** - API: `GET /api/v1/analytics/profit-comparison`
- ⚠️ Cần thêm: Revenue comparison API riêng

#### Frontend:
- ⚠️ **CHƯA CÓ** - Component riêng cho comparison

#### Cần Làm:
- ❌ Backend: API `GET /api/v1/analytics/revenue-comparison?currentStart=&currentEnd=&previousStart=&previousEnd=`
- ❌ Frontend: Component `PeriodComparisonReports.jsx`
- ❌ Side-by-side comparison với % thay đổi

---

---

## 🎨 **PHẦN 11: UI/UX FEATURES**

### 11.1. Date Range Picker
**Status:** ✅ **ĐÃ CÓ** (Một phần)

#### Frontend:
- ✅ **ĐÃ CÓ** - Component: `TimeRangeFilter.jsx`
  - File: `frontend/src/components/manager/TimeRangeFilter.jsx`

#### Cần Làm:
- ⚠️ Cải thiện UI (có thể dùng date picker library tốt hơn)
- ⚠️ Quick filters: Hôm nay, Hôm qua, 7 ngày qua, 30 ngày qua, Tuần này, Tháng này

---

### 11.2. Export Functionality
**Status:** ❌ **CHƯA CÓ** (Quan trọng!)

#### Backend:
- ❌ **CHƯA CÓ** - Endpoint export
  - Cần: `POST /api/v1/analytics/export` hoặc `/reports/export`
  - Formats: Excel (.xlsx), PDF (.pdf), CSV (.csv)

#### Frontend:
- ❌ **CHƯA CÓ** - Component export buttons hoàn chỉnh

#### Cần Làm:
- ❌ **Priority 1**: Implement export backend
  - Use libraries: `xlsx` (Excel), `pdfkit` hoặc `pdfmake` (PDF)
- ❌ **Priority 1**: Frontend export buttons
  - Component `ExportButtons.jsx` (có thể đã có skeleton)
  - Connect với backend API

---

### 11.3. Charts & Visualizations
**Status:** ✅ **ĐÃ CÓ** (Một phần)

#### Frontend:
- ✅ **ĐÃ CÓ** - Sử dụng Recharts
  - Component: `RevenueChart.jsx`
  - LineChart, BarChart đã có

#### Cần Làm:
- ⚠️ Bổ sung: PieChart, DonutChart
- ⚠️ Interactive tooltips
- ⚠️ Download chart as image

---

### 11.4. Summary Cards
**Status:** ✅ **ĐÃ CÓ**

#### Frontend:
- ✅ **ĐÃ CÓ** - Component: `KPICards.jsx`
  - File: `frontend/src/components/manager/KPICards.jsx`

#### Cần Làm:
- ⚠️ Đảm bảo styling nhất quán với theme

---

---

## 📊 **TỔNG KẾT & PRIORITY**

### ✅ **ĐÃ HOÀN THÀNH (~60%)**
1. Profit Reports (chi tiết, theo món, theo danh mục, comparison)
2. Top Menu Items
3. Shift Stats
4. Overview KPIs
5. Revenue Chart (theo ngày)
6. Inventory Reports (warnings, history, current stock)

### ⚠️ **CẦN HOÀN THIỆN (~20%)**
1. Revenue Reports (tuần, tháng, năm, theo giờ, theo ngày trong tuần, theo khu vực)
2. Promotion Reports (top used, efficiency)
3. Customer Reports (VIP, analysis, transaction history)
4. Employee Reports (performance details)
5. Area Reports (table occupancy)
6. Export Functionality (QUAN TRỌNG!)

### ❌ **CHƯA CÓ (~20%)**
1. Revenue yearly report
2. Revenue by hour analysis
3. Revenue by day of week
4. Revenue by area
5. Customer VIP reports
6. Customer analysis
7. Customer transaction history
8. Promotion efficiency
9. Table occupancy
10. Least sold products
11. Export Excel/PDF/CSV
12. Period comparison UI

---

## 🎯 **KẾ HOẠCH IMPLEMENTATION**

### **Phase 1 - Core Missing Features (Tuần 1-2)**
1. ❌ **Export Functionality** (Excel/PDF/CSV) - **PRIORITY 1**
2. ❌ Revenue Reports mở rộng (tuần, tháng, năm)
3. ❌ Revenue by hour, day of week, area
4. ❌ Customer Reports (VIP, analysis)

### **Phase 2 - Advanced Features (Tuần 3-4)**
5. ❌ Promotion efficiency
6. ❌ Employee performance details
7. ❌ Table occupancy
8. ❌ Least sold products
9. ❌ Period comparison UI

### **Phase 3 - Polish (Tuần 5)**
10. ⚠️ UI/UX improvements
11. ⚠️ Chart enhancements
12. ⚠️ Export improvements

---

**📝 Lưu ý:** File này sẽ được cập nhật khi có thay đổi trong implementation. Kiểm tra status trước khi bắt đầu làm phần mới!

