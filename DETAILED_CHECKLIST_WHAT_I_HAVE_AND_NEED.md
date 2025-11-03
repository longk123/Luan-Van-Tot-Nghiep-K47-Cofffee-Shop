# 📋 CHECKLIST CHI TIẾT - ĐÃ CÓ VÀ CẦN LÀM

## 🎯 **MỤC ĐÍCH**

File này liệt kê **CHI TIẾT** tất cả những gì đã có và những gì cần làm, để tránh làm trùng.

---

## ✅ **PHẦN 1: EXPORT FUNCTIONALITY - ĐÃ CÓ HOÀN CHỈNH**

### **Backend:**

#### ✅ **1. Export Service**
- **File:** `backend/src/services/exportService.js`
- **Methods đã có:**
  - ✅ `exportRevenueToExcel(data, filters)` - Export doanh thu Excel
  - ✅ `exportProfitToExcel(data, filters)` - Export lợi nhuận Excel
  - ✅ `exportProductsToExcel(data, filters)` - Export sản phẩm Excel
  - ✅ `exportPromotionsToExcel(data, filters)` - Export khuyến mãi Excel
  - ✅ `exportCustomersToExcel(data, filters)` - Export khách hàng Excel
  - ✅ `createPDFReport(reportType, data, filters)` - Export PDF cho tất cả reports
  - ✅ `exportToCSV(data, columns)` - Export CSV

#### ✅ **2. Export Controller**
- **File:** `backend/src/controllers/exportController.js`
- **Endpoint đã có:**
  - ✅ `POST /api/v1/reports/export`
  - **Parameters:** `{ reportType, format, startDate, endDate }`
  - **Formats hỗ trợ:** `excel`, `pdf`, `csv`
  - **Report types hỗ trợ:** `revenue`, `profit`, `products`, `promotions`, `customers`
  - **Methods đã có:**
    - ✅ `exportReport()` - Main handler
    - ✅ `getRevenueData(filters)` - Lấy data doanh thu
    - ✅ `getProfitData(filters)` - Lấy data lợi nhuận
    - ✅ `getProductsData(filters)` - Lấy data sản phẩm
    - ✅ `getPromotionsData(filters)` - Lấy data khuyến mãi
    - ✅ `getCustomersData(filters)` - Lấy data khách hàng
    - ✅ `generateExcel(reportType, data, filters)` - Generate Excel
    - ✅ `generateCSV(reportType, data)` - Generate CSV

#### ✅ **3. Export Routes**
- **File:** `backend/src/routes/exports.js`
- **Route đã có:**
  - ✅ `POST /api/v1/reports/export`
- **Integrated trong:** `backend/index.js` (line 118-119)

#### ✅ **4. Dependencies**
- **File:** `backend/package.json`
- **Đã cài:**
  - ✅ `exceljs@^4.4.0`
  - ✅ `pdfkit@^0.17.2`

---

### **Frontend:**

#### ✅ **1. ExportButtons Component**
- **File:** `frontend/src/components/reports/ExportButtons.jsx`
- **Props:**
  - `reportType` - Loại report (revenue, profit, products, promotions, customers)
  - `data` - Data report
  - `filters` - Filters (startDate, endDate, ...)
  - `onExport` - Optional custom handler
  - `disabled` - Disable buttons
- **Features:**
  - ✅ 3 buttons: Excel (xanh lá), PDF (đỏ), CSV (xanh dương)
  - ✅ Loading states
  - ✅ Error handling
  - ✅ Auto download file

#### ✅ **2. Export Helpers**
- **File:** `frontend/src/utils/exportHelpers.js`
- **Functions đã có:**
  - ✅ `generateFilename(reportType, format)`
  - ✅ `formatCurrency(value)`
  - ✅ `formatDate(date)`
  - ✅ `exportToExcelClient(data, filename, sheetName)`
  - ✅ `exportToCSVClient(data, columns, filename)`
  - ✅ `exportFromBackend(reportType, format, filters)`
  - ✅ `downloadBlob(blob, filename)`
  - ✅ `prepareDataForExport(data, columns)`

#### ✅ **3. Integration**
- ✅ **ManagerDashboard.jsx** - Revenue tab có ExportButtons
- ✅ **ProfitReport.jsx** - Có ExportButtons

---

## ✅ **PHẦN 2: ANALYTICS APIS - ĐÃ CÓ**

### **Backend:**

#### ✅ **1. Analytics Controller**
- **File:** `backend/src/controllers/analyticsController.js`
- **Endpoints đã có:**

1. ✅ `GET /api/v1/analytics/overview`
   - **Method:** `getOverviewKPIs(req, res)`
   - **Query:** `?date=YYYY-MM-DD` (optional)
   - **Returns:** KPI tổng quan (revenue, orders, tables, kitchen)

2. ✅ `GET /api/v1/analytics/revenue-chart`
   - **Method:** `getRevenueChart(req, res)`
   - **Query:** `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` hoặc `?days=7`
   - **Returns:** Revenue chart data (labels, datasets)

3. ✅ `GET /api/v1/analytics/invoices`
   - **Method:** `getAllInvoices(req, res)`
   - **Query:** `?page=1&limit=20&status=&order_type=&from_date=&to_date=&search=`
   - **Returns:** Danh sách hóa đơn với pagination

4. ✅ `GET /api/v1/analytics/top-menu-items`
   - **Method:** `getTopMenuItems(req, res)`
   - **Query:** `?days=7&limit=10`
   - **Returns:** Top món bán chạy

5. ✅ `GET /api/v1/analytics/shift-stats`
   - **Method:** `getShiftStats(req, res)`
   - **Query:** `?days=7`
   - **Returns:** Thống kê ca làm việc

6. ✅ `GET /api/v1/analytics/profit-report`
   - **Method:** `getProfitReport(req, res)`
   - **Query:** `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&includeTopping=true&orderType=`
   - **Returns:** Báo cáo lợi nhuận chi tiết

7. ✅ `GET /api/v1/analytics/profit-chart`
   - **Method:** `getProfitChart(req, res)`
   - **Query:** `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
   - **Returns:** Biểu đồ lợi nhuận theo ngày

8. ✅ `GET /api/v1/analytics/profit-by-item`
   - **Method:** `getProfitByItem(req, res)`
   - **Query:** `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&limit=20`
   - **Returns:** Phân tích lợi nhuận theo món

9. ✅ `GET /api/v1/analytics/profit-by-category`
   - **Method:** `getProfitByCategory(req, res)`
   - **Query:** `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
   - **Returns:** Phân tích lợi nhuận theo danh mục

10. ✅ `GET /api/v1/analytics/profit-comparison`
    - **Method:** `getProfitComparison(req, res)`
    - **Query:** `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&timeRange=custom`
    - **Returns:** So sánh lợi nhuận với kỳ trước

#### ✅ **2. Analytics Service**
- **File:** `backend/src/services/analyticsService.js`
- **Methods đã có:**
  - ✅ `getOverviewKPIs(date)`
  - ✅ `getRevenueChart(params)` - params: { startDate, endDate } hoặc { days }
  - ✅ `getAllInvoices(filters)`
  - ✅ `getTopMenuItems(days, limit)`
  - ✅ `getShiftStats(days)`
  - ✅ `getProfitReport({ startDate, endDate, includeTopping, orderType })`
  - ✅ `getProfitChart({ startDate, endDate })`
  - ✅ `getProfitByItem({ startDate, endDate, limit })`
  - ✅ `getProfitByCategory({ startDate, endDate })`
  - ✅ `getProfitComparison({ startDate, endDate, timeRange })`

#### ✅ **3. Analytics Repository**
- **File:** `backend/src/repositories/analyticsRepository.js`
- **Methods đã có:**
  - ✅ `getOverviewKPIs(date)`
  - ✅ `getRevenueChart(params)`
  - ✅ `getAllInvoices(filters)`
  - ✅ `getTopMenuItems(days, limit)`
  - ✅ `getShiftStats(days)`
  - ✅ `getProfitReport({ startDate, endDate, includeTopping, orderType })`
  - ✅ `getProfitChart({ startDate, endDate })`
  - ✅ `getProfitByItem({ startDate, endDate, limit })`
  - ✅ `getProfitByCategory({ startDate, endDate })`
  - ✅ `getProfitComparison({ startDate, endDate, timeRange })`

#### ✅ **4. Analytics Routes**
- **File:** `backend/src/routes/analytics.js`
- **Routes đã có:**
  - ✅ `GET /api/v1/analytics/overview`
  - ✅ `GET /api/v1/analytics/revenue-chart`
  - ✅ `GET /api/v1/analytics/invoices`
  - ✅ `GET /api/v1/analytics/top-menu-items`
  - ✅ `GET /api/v1/analytics/shift-stats`
  - ✅ `GET /api/v1/analytics/profit-report`
  - ✅ `GET /api/v1/analytics/profit-chart`
  - ✅ `GET /api/v1/analytics/profit-by-item`
  - ✅ `GET /api/v1/analytics/profit-by-category`
  - ✅ `GET /api/v1/analytics/profit-comparison`

---

### **Frontend:**

#### ✅ **1. Manager Components**
- **File:** `frontend/src/components/manager/`
- **Components đã có:**
  - ✅ `RevenueChart.jsx` - Biểu đồ doanh thu
  - ✅ `ProfitReport.jsx` - Báo cáo lợi nhuận (có ExportButtons)
  - ✅ `TopMenuItems.jsx` - Top món bán chạy
  - ✅ `KPICards.jsx` - KPI cards
  - ✅ `ShiftStats.jsx` - Thống kê ca
  - ✅ `TimeRangeFilter.jsx` - Filter thời gian
  - ✅ `InvoicesList.jsx` - Danh sách hóa đơn

#### ✅ **2. Manager Dashboard**
- **File:** `frontend/src/pages/ManagerDashboard.jsx`
- **Features đã có:**
  - ✅ Overview tab với KPIs
  - ✅ Revenue tab với RevenueChart và ExportButtons
  - ✅ Profit tab với ProfitReport (có ExportButtons)
  - ✅ Invoices tab với InvoicesList
  - ✅ Time range filter
  - ✅ Custom date picker

---

## ✅ **PHẦN 3: PROMOTION MANAGEMENT - ĐÃ CÓ**

### **Backend:**

#### ✅ **1. Promotion Controller**
- **File:** `backend/src/controllers/promotionController.js`
- **Endpoints đã có:**
  - ✅ `GET /api/v1/promotions` - Lấy danh sách
  - ✅ `GET /api/v1/promotions/:id` - Lấy chi tiết
  - ✅ `GET /api/v1/promotions/:id/stats` - Thống kê khuyến mãi
  - ✅ `GET /api/v1/promotions/:id/usage-history` - Lịch sử sử dụng
  - ✅ `POST /api/v1/promotions` - Tạo mới
  - ✅ `PATCH /api/v1/promotions/:id` - Cập nhật
  - ✅ `DELETE /api/v1/promotions/:id` - Xóa
  - ✅ `POST /api/v1/promotions/:id/toggle` - Bật/tắt

#### ✅ **2. Promotion Service**
- **File:** `backend/src/services/promotionService.js`
- **Methods đã có:** (cần kiểm tra)

#### ✅ **3. Promotion Repository**
- **File:** `backend/src/repositories/promotionRepository.js`
- **Methods đã có:**
  - ✅ `getAll(filters)`
  - ✅ `getById(id)`
  - ✅ `getStats(id, filters)`
  - ✅ `getUsageHistory(id, page, limit)`

### **Frontend:**

#### ✅ **1. Promotion Management Page**
- **File:** `frontend/src/pages/PromotionManagement.jsx`
- **Features đã có:**
  - ✅ Danh sách khuyến mãi
  - ✅ Filter (status, type, search, date range)
  - ✅ CRUD operations
  - ✅ Summary cards

#### ✅ **2. Promotion Components**
- **File:** `frontend/src/components/manager/`
- **Components đã có:**
  - ✅ `PromotionFormModal.jsx` - Form tạo/sửa
  - ✅ `PromotionDetailModal.jsx` - Chi tiết (có tabs: Thông tin, Thống kê, Lịch sử)

---

## ❌ **PHẦN 4: CẦN LÀM - REVENUE REPORTS MỞ RỘNG**

### **Backend - Cần Tạo:**

#### ❌ **1. Revenue By Hour API**
- **File cần tạo:** Extend `analyticsController.js` và `analyticsService.js`
- **Endpoint mới:** `GET /api/v1/analytics/revenue-by-hour`
- **Query params:** `?date=YYYY-MM-DD`
- **Method mới:** `getRevenueByHour(req, res)`
- **Returns:** 
  ```json
  {
    "labels": ["0h", "1h", ..., "23h"],
    "datasets": [
      { "label": "Tổng doanh thu", "data": [...] },
      { "label": "Tại bàn", "data": [...] },
      { "label": "Mang đi", "data": [...] }
    ]
  }
  ```
- **Repository method cần:** `getRevenueByHour(date)`
  - Query: Group orders theo giờ trong ngày
  - `EXTRACT(HOUR FROM closed_at AT TIME ZONE 'Asia/Ho_Chi_Minh')`

---

#### ❌ **2. Revenue By Day Of Week API**
- **File cần tạo:** Extend `analyticsController.js` và `analyticsService.js`
- **Endpoint mới:** `GET /api/v1/analytics/revenue-by-day-of-week`
- **Query params:** `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
- **Method mới:** `getRevenueByDayOfWeek(req, res)`
- **Returns:**
  ```json
  {
    "labels": ["CN", "T2", "T3", "T4", "T5", "T6", "T7"],
    "datasets": [
      { "label": "Doanh thu", "data": [...] }
    ]
  }
  ```
- **Repository method cần:** `getRevenueByDayOfWeek(startDate, endDate)`
  - Query: `EXTRACT(DOW FROM closed_at AT TIME ZONE 'Asia/Ho_Chi_Minh')`
  - Group theo thứ trong tuần (0=CN, 1=T2, ..., 6=T7)

---

#### ❌ **3. Revenue By Area API**
- **File cần tạo:** Extend `analyticsController.js` và `analyticsService.js`
- **Endpoint mới:** `GET /api/v1/analytics/revenue-by-area`
- **Query params:** `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
- **Method mới:** `getRevenueByArea(req, res)`
- **Returns:**
  ```json
  {
    "areas": [
      {
        "area": "Tầng 1",
        "revenue": 50000000,
        "orders": 120,
        "tables": 15,
        "avgOrder": 416667
      },
      ...
    ]
  }
  ```
- **Repository method cần:** `getRevenueByArea(startDate, endDate)`
  - Query: JOIN `don_hang` với `ban` và `khu_vuc`
  - Group theo `khu_vuc`

---

#### ❌ **4. Revenue By Period (Weekly/Monthly/Yearly) API**
- **File cần tạo:** Extend `analyticsController.js` và `analyticsService.js`
- **Endpoint mới:** `GET /api/v1/analytics/revenue-by-period`
- **Query params:** `?period=weekly|monthly|yearly&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
- **Method mới:** `getRevenueByPeriod(req, res)`
- **Returns:**
  ```json
  {
    "labels": ["Tuần 1", "Tuần 2", ...],
    "datasets": [
      { "label": "Tổng doanh thu", "data": [...] },
      { "label": "Tại bàn", "data": [...] },
      { "label": "Mang đi", "data": [...] }
    ]
  }
  ```
- **Repository method cần:** `getRevenueByPeriod(period, startDate, endDate)`
  - Query: `DATE_TRUNC('week'|'month'|'year', closed_at)`

---

### **Frontend - Cần Tạo:**

#### ❌ **1. RevenueByHourChart Component**
- **File cần tạo:** `frontend/src/components/manager/RevenueByHourChart.jsx`
- **Props:** `{ date }`
- **Features:**
  - Bar chart 24 giờ (0h-23h)
  - Highlight giờ cao điểm
  - Export buttons
- **API call:** `api.get(`/analytics/revenue-by-hour?date=${date}`)`

---

#### ❌ **2. RevenueByDayOfWeekChart Component**
- **File cần tạo:** `frontend/src/components/manager/RevenueByDayOfWeekChart.jsx`
- **Props:** `{ startDate, endDate }`
- **Features:**
  - Bar chart 7 ngày (CN-T7)
  - So sánh thứ nào bán tốt nhất
  - Export buttons
- **API call:** `api.get(`/analytics/revenue-by-day-of-week?startDate=${startDate}&endDate=${endDate}`)`

---

#### ❌ **3. RevenueByAreaReports Component**
- **File cần tạo:** `frontend/src/components/manager/RevenueByAreaReports.jsx`
- **Props:** `{ startDate, endDate }`
- **Features:**
  - Table chi tiết theo khu vực
  - Pie chart tỷ trọng
  - Export buttons
- **API call:** `api.get(`/analytics/revenue-by-area?startDate=${startDate}&endDate=${endDate}`)`

---

#### ❌ **4. RevenuePeriodReports Component**
- **File cần tạo:** `frontend/src/components/manager/RevenuePeriodReports.jsx`
- **Props:** `{ period, startDate, endDate }`
- **Features:**
  - Tabs: Theo Tuần, Theo Tháng, Theo Năm
  - Line chart
  - So sánh với kỳ trước (% thay đổi)
  - Export buttons
- **API call:** `api.get(`/analytics/revenue-by-period?period=${period}&startDate=${startDate}&endDate=${endDate}`)`

---

#### ❌ **5. Extend Export Service**
- **File cần update:** `backend/src/services/exportService.js`
- **Methods cần thêm:**
  - ❌ `exportRevenueByHourToExcel(data, filters)`
  - ❌ `exportRevenueByDayOfWeekToExcel(data, filters)`
  - ❌ `exportRevenueByAreaToExcel(data, filters)`
  - ❌ `exportRevenueByPeriodToExcel(data, filters)`
- **PDF methods cần thêm:**
  - ❌ `addRevenueByHourPDFContent(doc, data)`
  - ❌ `addRevenueByDayOfWeekPDFContent(doc, data)`
  - ❌ `addRevenueByAreaPDFContent(doc, data)`
  - ❌ `addRevenueByPeriodPDFContent(doc, data)`

---

#### ❌ **6. Extend Export Controller**
- **File cần update:** `backend/src/controllers/exportController.js`
- **Methods cần thêm:**
  - ❌ `getRevenueByHourData(filters)`
  - ❌ `getRevenueByDayOfWeekData(filters)`
  - ❌ `getRevenueByAreaData(filters)`
  - ❌ `getRevenueByPeriodData(filters)`
- **Extend `exportReport()` để support:**
  - `reportType: "revenue-by-hour"`
  - `reportType: "revenue-by-day-of-week"`
  - `reportType: "revenue-by-area"`
  - `reportType: "revenue-by-period"`

---

## ❌ **PHẦN 5: CẦN LÀM - CUSTOMER REPORTS**

### **Backend - Cần Tạo:**

#### ❌ **1. Top Customers VIP API**
- **File cần tạo:** Extend `analyticsController.js` và `analyticsService.js`
- **Endpoint mới:** `GET /api/v1/analytics/customers/vip`
- **Query params:** `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&limit=10`
- **Method mới:** `getTopCustomers(req, res)`
- **Returns:**
  ```json
  {
    "customers": [
      {
        "name": "Bàn 1",
        "orderCount": 50,
        "totalSpent": 5000000,
        "avgOrder": 100000
      },
      ...
    ]
  }
  ```
- **Repository method cần:** `getTopCustomers(startDate, endDate, limit)`
  - Query: JOIN `don_hang` với `ban`
  - Group by `ban.ten` hoặc `khach_hang_id`
  - Order by `SUM(revenue)` DESC

---

#### ❌ **2. Customer Analysis API**
- **File cần tạo:** Extend `analyticsController.js` và `analyticsService.js`
- **Endpoint mới:** `GET /api/v1/analytics/customers/analysis`
- **Query params:** `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
- **Method mới:** `getCustomerAnalysis(req, res)`
- **Returns:**
  ```json
  {
    "vip": { "count": 10, "revenue": 50000000, "percent": 30 },
    "regular": { "count": 50, "revenue": 100000000, "percent": 60 },
    "new": { "count": 5, "revenue": 5000000, "percent": 10 },
    "lost": { "count": 2, "revenue": 0, "percent": 0 }
  }
  ```
- **Repository method cần:** `getCustomerAnalysis(startDate, endDate)`
  - Phân loại: VIP (>5 triệu/tháng), Regular (1-5 triệu), New (lần đầu), Lost (không quay lại >30 ngày)

---

#### ❌ **3. Customer Transaction History API**
- **File cần tạo:** Extend `analyticsController.js` và `analyticsService.js`
- **Endpoint mới:** `GET /api/v1/analytics/customers/:customerId/transactions`
- **Query params:** `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
- **Method mới:** `getCustomerTransactions(req, res)`
- **Returns:**
  ```json
  {
    "transactions": [
      {
        "orderId": 123,
        "date": "2025-01-15",
        "total": 500000,
        "items": [...]
      },
      ...
    ]
  }
  ```
- **Repository method cần:** `getCustomerTransactions(customerId, startDate, endDate)`
  - Query: Lấy tất cả đơn hàng của 1 khách hàng/bàn

---

### **Frontend - Cần Tạo:**

#### ❌ **1. TopCustomersReports Component**
- **File cần tạo:** `frontend/src/components/manager/TopCustomersReports.jsx`
- **Props:** `{ startDate, endDate }`
- **Features:**
  - Table top 10-20 khách hàng
  - Bar chart
  - Export buttons
- **API call:** `api.get(`/analytics/customers/vip?startDate=${startDate}&endDate=${endDate}&limit=10`)`

---

#### ❌ **2. CustomerAnalysisReports Component**
- **File cần tạo:** `frontend/src/components/manager/CustomerAnalysisReports.jsx`
- **Props:** `{ startDate, endDate }`
- **Features:**
  - Pie chart phân loại khách hàng
  - Table chi tiết từng nhóm
  - Export buttons
- **API call:** `api.get(`/analytics/customers/analysis?startDate=${startDate}&endDate=${endDate}`)`

---

#### ❌ **3. CustomerTransactionHistory Component**
- **File cần tạo:** `frontend/src/components/manager/CustomerTransactionHistory.jsx`
- **Props:** `{ customerId, startDate, endDate }`
- **Features:**
  - Table lịch sử giao dịch
  - Line chart chi tiêu theo thời gian
  - Export buttons
- **API call:** `api.get(`/analytics/customers/${customerId}/transactions?startDate=${startDate}&endDate=${endDate}`)`

---

## ❌ **PHẦN 6: CẦN LÀM - PRODUCT REPORTS MỞ RỘNG**

### **Backend - Cần Tạo:**

#### ❌ **1. Least Sold Products API**
- **File cần tạo:** Extend `analyticsController.js` và `analyticsService.js`
- **Endpoint mới:** `GET /api/v1/analytics/products/least-sold`
- **Query params:** `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&threshold=5`
- **Method mới:** `getLeastSoldProducts(req, res)`
- **Returns:**
  ```json
  {
    "products": [
      {
        "name": "Món A",
        "quantity": 2,
        "revenue": 50000,
        "warning": "LOW" // LOW, CRITICAL, NONE
      },
      ...
    ]
  }
  ```
- **Repository method cần:** `getLeastSoldProducts(startDate, endDate, threshold)`
  - Query: Món bán < threshold lần trong kỳ

---

### **Frontend - Cần Tạo:**

#### ❌ **1. LeastSoldProducts Component**
- **File cần tạo:** `frontend/src/components/manager/LeastSoldProducts.jsx`
- **Props:** `{ startDate, endDate }`
- **Features:**
  - Table món ít bán
  - Cảnh báo màu đỏ cho món "chết"
  - Đề xuất: Xóa hoặc giảm giá
  - Export buttons
- **API call:** `api.get(`/analytics/products/least-sold?startDate=${startDate}&endDate=${endDate}&threshold=5`)`

---

#### ❌ **2. ProductByCategoryReports Component**
- **File cần tạo:** `frontend/src/components/manager/ProductByCategoryReports.jsx`
- **Props:** `{ startDate, endDate }`
- **Features:**
  - Dùng API có sẵn: `GET /api/v1/analytics/profit-by-category`
  - Pie chart tỷ trọng doanh thu theo danh mục
  - Table so sánh danh mục
  - Export buttons
- **API call:** `api.get(`/analytics/profit-by-category?startDate=${startDate}&endDate=${endDate}`)`

---

## ❌ **PHẦN 7: CẦN LÀM - PROMOTION REPORTS MỞ RỘNG**

### **Backend - Cần Tạo:**

#### ❌ **1. Top Promotions API**
- **File cần tạo:** Extend `analyticsController.js` và `analyticsService.js`
- **Endpoint mới:** `GET /api/v1/analytics/promotions/top-used`
- **Query params:** `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&limit=10`
- **Method mới:** `getTopPromotions(req, res)`
- **Returns:**
  ```json
  {
    "promotions": [
      {
        "name": "KM A",
        "type": "PERCENT",
        "usageCount": 50,
        "totalDiscount": 5000000
      },
      ...
    ]
  }
  ```
- **Repository method cần:** `getTopPromotions(startDate, endDate, limit)`
  - Query: JOIN `don_hang_khuyen_mai` với `khuyen_mai`
  - Group by `khuyen_mai_id`
  - Order by `COUNT(*)` DESC

---

#### ❌ **2. Promotion Efficiency API**
- **File cần tạo:** Extend `analyticsController.js` và `analyticsService.js`
- **Endpoint mới:** `GET /api/v1/analytics/promotions/efficiency`
- **Query params:** `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
- **Method mới:** `getPromotionEfficiency(req, res)`
- **Returns:**
  ```json
  {
    "promotions": [
      {
        "name": "KM A",
        "incrementalRevenue": 10000000,
        "totalDiscount": 2000000,
        "efficiency": 80, // %
        "roi": 400 // %
      },
      ...
    ]
  }
  ```
- **Repository method cần:** `getPromotionEfficiency(startDate, endDate)`
  - Tính: Incremental revenue, Discount efficiency, ROI
  - So sánh: Doanh thu có KM vs không có KM

---

### **Frontend - Cần Tạo:**

#### ❌ **1. TopPromotionsReports Component**
- **File cần tạo:** `frontend/src/components/manager/TopPromotionsReports.jsx`
- **Props:** `{ startDate, endDate }`
- **Features:**
  - Bar chart top 10
  - Table chi tiết
  - Export buttons
- **API call:** `api.get(`/analytics/promotions/top-used?startDate=${startDate}&endDate=${endDate}&limit=10`)`

---

#### ❌ **2. PromotionEfficiencyReports Component**
- **File cần tạo:** `frontend/src/components/manager/PromotionEfficiencyReports.jsx`
- **Props:** `{ startDate, endDate }`
- **Features:**
  - Table so sánh các KM
  - Bar chart hiệu quả
  - Export buttons
- **API call:** `api.get(`/analytics/promotions/efficiency?startDate=${startDate}&endDate=${endDate}`)`

---

## ❌ **PHẦN 8: CẦN LÀM - EMPLOYEE REPORTS**

### **Backend - Cần Tạo:**

#### ❌ **1. Employee Performance API**
- **File cần tạo:** Extend `analyticsController.js` và `analyticsService.js`
- **Endpoint mới:** `GET /api/v1/analytics/employees/performance`
- **Query params:** `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
- **Method mới:** `getEmployeePerformance(req, res)`
- **Returns:**
  ```json
  {
    "employees": [
      {
        "userId": 1,
        "name": "Nguyễn Văn A",
        "revenue": 50000000,
        "orders": 120,
        "avgOrder": 416667,
        "hoursWorked": 160
      },
      ...
    ]
  }
  ```
- **Repository method cần:** `getEmployeePerformance(startDate, endDate)`
  - Query: JOIN `don_hang` với `users` (nhan_vien_id)
  - Tính: Doanh thu, số đơn, đơn TB, giờ làm việc

---

### **Frontend - Cần Tạo:**

#### ❌ **1. EmployeePerformanceReports Component**
- **File cần tạo:** `frontend/src/components/manager/EmployeePerformanceReports.jsx`
- **Props:** `{ startDate, endDate }`
- **Features:**
  - Table xếp hạng nhân viên
  - Bar chart so sánh
  - Export buttons
- **API call:** `api.get(`/analytics/employees/performance?startDate=${startDate}&endDate=${endDate}`)`

---

## ❌ **PHẦN 9: CẦN LÀM - AREA REPORTS**

### **Backend - Cần Tạo:**

#### ❌ **1. Table Occupancy API**
- **File cần tạo:** Extend `analyticsController.js` và `analyticsService.js`
- **Endpoint mới:** `GET /api/v1/analytics/areas/occupancy`
- **Query params:** `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
- **Method mới:** `getTableOccupancy(req, res)`
- **Returns:**
  ```json
  {
    "areas": [
      {
        "area": "Tầng 1",
        "tables": [
          {
            "tableId": 1,
            "tableName": "Bàn 1",
            "occupancyPercent": 75,
            "orders": 50,
            "hoursUsed": 120
          },
          ...
        ]
      },
      ...
    ]
  }
  ```
- **Repository method cần:** `getTableOccupancy(startDate, endDate)`
  - Tính: Số giờ bàn được sử dụng / tổng số giờ
  - Group theo khu vực, theo bàn

---

### **Frontend - Cần Tạo:**

#### ❌ **1. TableOccupancyReports Component**
- **File cần tạo:** `frontend/src/components/manager/TableOccupancyReports.jsx`
- **Props:** `{ startDate, endDate }`
- **Features:**
  - Heatmap hoặc bar chart
  - Table chi tiết
  - Export buttons
- **API call:** `api.get(`/analytics/areas/occupancy?startDate=${startDate}&endDate=${endDate}`)`

---

## ❌ **PHẦN 10: CẦN LÀM - PERIOD COMPARISON UI**

### **Frontend - Cần Tạo:**

#### ❌ **1. PeriodComparisonReports Component**
- **File cần tạo:** `frontend/src/components/manager/PeriodComparisonReports.jsx`
- **Props:** `{ currentPeriod, previousPeriod }`
- **Features:**
  - So sánh 2 kỳ song song
  - % thay đổi với màu (xanh=tăng, đỏ=giảm)
  - Visual indicators (↑↓)
  - Export cả 2 kỳ

---

## 📋 **TỔNG HỢP CHECKLIST**

### ✅ **ĐÃ CÓ (KHÔNG CẦN LÀM LẠI):**
1. Export functionality (backend + frontend) - ✅ HOÀN CHỈNH
2. Analytics APIs cơ bản (revenue-chart, profit-report, etc.) - ✅ HOÀN CHỈNH
3. ProfitReport component - ✅ HOÀN CHỈNH
4. RevenueChart component - ✅ HOÀN CHỈNH
5. TopMenuItems component - ✅ HOÀN CHỈNH
6. Promotion Management - ✅ HOÀN CHỈNH

### ❌ **CẦN LÀM (THEO THỨ TỰ ƯU TIÊN):**

#### **Phase 1: Revenue Reports Mở Rộng**
1. ❌ Revenue By Hour API + Component
2. ❌ Revenue By Day Of Week API + Component
3. ❌ Revenue By Area API + Component
4. ❌ Revenue By Period (Weekly/Monthly/Yearly) API + Component
5. ❌ Extend Export Service/Controller cho các revenue reports mới

#### **Phase 2: Customer Reports**
6. ❌ Top Customers VIP API + Component
7. ❌ Customer Analysis API + Component
8. ❌ Customer Transaction History API + Component

#### **Phase 3: Product Reports Mở Rộng**
9. ❌ Least Sold Products API + Component
10. ❌ Product By Category Reports Component (dùng API có sẵn)

#### **Phase 4: Promotion Reports Mở Rộng**
11. ❌ Top Promotions API + Component
12. ❌ Promotion Efficiency API + Component

#### **Phase 5: Employee & Area Reports**
13. ❌ Employee Performance API + Component
14. ❌ Table Occupancy API + Component

#### **Phase 6: UI Features**
15. ❌ Period Comparison Component

---

## 🎯 **QUY TẮC ĐỂ KHÔNG LÀM TRÙNG:**

1. **Luôn kiểm tra file này** trước khi bắt đầu làm phần mới
2. **Đánh dấu ✅** vào phần đã hoàn thành
3. **Không tạo file mới** nếu đã có trong checklist "ĐÃ CÓ"
4. **Follow pattern** từ các file đã có (ProfitReport, RevenueChart)
5. **Reuse code** từ ExportButtons, ExportHelpers đã có
6. **Test API** trước khi làm frontend component

---

**Cập nhật lần cuối:** 2025-01-XX  
**Version:** 1.0
