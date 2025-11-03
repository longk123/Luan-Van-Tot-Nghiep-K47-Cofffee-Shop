# 🚀 Các Chức Năng Cần Làm Tiếp Theo

## 📊 **TỔNG QUAN**

Dựa trên `ADVANCED_REPORTS_SPEC_DETAILED.md`, đây là danh sách các chức năng còn thiếu được sắp xếp theo **MỨC ĐỘ ƯU TIÊN**.

---

## 🎯 **PRIORITY 1 - QUAN TRỌNG NHẤT (Làm ngay)**

### **1. Revenue Reports Mở Rộng** ⚠️ **CẦN HOÀN THIỆN**

**Hiện tại:** ✅ Có Revenue Chart theo ngày trong ManagerDashboard

**Cần làm:**

#### 1.1. Revenue Theo Tuần/Tháng/Năm
- ❌ **Backend:** Extend `GET /api/v1/analytics/revenue-chart` với param `period=weekly|monthly|yearly`
  - Hoặc tạo endpoint mới: `GET /api/v1/analytics/revenue-chart/period?period=weekly&startDate=&endDate=`
- ❌ **Frontend:** Component `RevenuePeriodReports.jsx`
  - Tabs: Theo Tuần, Theo Tháng, Theo Năm
  - So sánh với kỳ trước (% thay đổi)
  - Export buttons

**Ước tính:** 2-3 ngày

---

#### 1.2. Revenue Theo Giờ Trong Ngày
- ❌ **Backend:** API mới `GET /api/v1/analytics/revenue-by-hour?date=YYYY-MM-DD`
  - Query: Group orders theo giờ (0-23h) trong ngày
  - Trả về: Doanh thu từng giờ, số đơn từng giờ
- ❌ **Frontend:** Component `RevenueByHourChart.jsx`
  - Bar chart 24 giờ (0h-23h)
  - Highlight giờ cao điểm

**Ước tính:** 1-2 ngày

---

#### 1.3. Revenue Theo Ngày Trong Tuần (Thứ 2 - CN)
- ❌ **Backend:** API mới `GET /api/v1/analytics/revenue-by-day-of-week?startDate=&endDate=`
  - Query: Group theo `EXTRACT(DOW FROM closed_at)`
  - Trả về: Doanh thu theo thứ (0=CN, 1=T2, ..., 6=T7)
- ❌ **Frontend:** Component `RevenueByDayOfWeekChart.jsx`
  - Bar chart 7 ngày
  - So sánh thứ nào bán tốt nhất

**Ước tính:** 1-2 ngày

---

#### 1.4. Revenue Theo Khu Vực (Area)
- ❌ **Backend:** API mới `GET /api/v1/analytics/revenue-by-area?startDate=&endDate=`
  - Query: JOIN `don_hang` với `ban` và `khu_vuc`
  - Group theo `khu_vuc`
  - Trả về: Doanh thu, số đơn, số bàn theo từng khu vực
- ❌ **Frontend:** Component `RevenueByAreaReports.jsx`
  - Table + Pie chart tỷ trọng
  - Export

**Ước tính:** 2 ngày

---

### **2. Customer Reports (VIP & Analysis)** ❌ **CHƯA CÓ**

#### 2.1. Top Khách Hàng VIP
- ❌ **Backend:** API mới `GET /api/v1/analytics/customers/vip?startDate=&endDate=&limit=10`
  - Query: 
    - JOIN `don_hang` với `ban` (hoặc `khach_hang` nếu có bảng này)
    - GROUP BY bàn/khách hàng
    - ORDER BY tổng chi tiêu DESC
  - Trả về: Tên, số đơn, tổng chi tiêu, đơn TB
- ❌ **Frontend:** Component `TopCustomersReports.jsx`
  - Table top 10-20 khách hàng
  - Bar chart
  - Export

**Ước tính:** 2 ngày

---

#### 2.2. Phân Tích Khách Hàng
- ❌ **Backend:** API mới `GET /api/v1/analytics/customers/analysis?startDate=&endDate=`
  - Phân loại khách hàng:
    - VIP (>X triệu/tháng)
    - Regular (X-Y triệu)
    - New customers (lần đầu đến)
    - Lost customers (không quay lại >30 ngày)
  - Trả về: Số lượng, tỷ trọng, doanh thu từng nhóm
- ❌ **Frontend:** Component `CustomerAnalysisReports.jsx`
  - Pie chart phân loại
  - Table chi tiết từng nhóm

**Ước tính:** 3 ngày

---

#### 2.3. Lịch Sử Giao Dịch Khách Hàng
- ❌ **Backend:** API mới `GET /api/v1/analytics/customers/:customerId/transactions?startDate=&endDate=`
  - Query: Lấy tất cả đơn hàng của 1 khách hàng/bàn
  - Trả về: Danh sách đơn hàng với ngày, tổng tiền, sản phẩm
- ❌ **Frontend:** Component `CustomerTransactionHistory.jsx`
  - Table lịch sử
  - Line chart chi tiêu theo thời gian
  - Export

**Ước tính:** 2 ngày

---

### **3. Product Reports Mở Rộng** ⚠️ **CẦN HOÀN THIỆN**

#### 3.1. Món Ít Bán Được (Least Sold)
- ❌ **Backend:** API mới `GET /api/v1/analytics/products/least-sold?startDate=&endDate=&threshold=5`
  - Query: Món bán < threshold lần trong kỳ
  - Trả về: Tên món, số lần bán, doanh thu, cảnh báo
- ❌ **Frontend:** Component `LeastSoldProducts.jsx`
  - Table món ít bán
  - Cảnh báo màu đỏ cho món "chết"
  - Đề xuất: Xóa hoặc giảm giá
  - Export

**Ước tính:** 1-2 ngày

---

#### 3.2. Product Reports Theo Danh Mục
- ❌ **Frontend:** Component `ProductByCategoryReports.jsx`
  - Dùng API có sẵn: `GET /api/v1/analytics/profit-by-category`
  - Pie chart tỷ trọng doanh thu theo danh mục
  - Table so sánh danh mục
  - Export

**Ước tính:** 1 ngày

---

### **4. Promotion Reports Mở Rộng** ⚠️ **CẦN HOÀN THIỆN**

#### 4.1. Top Khuyến Mãi Được Sử Dụng
- ❌ **Backend:** API mới `GET /api/v1/analytics/promotions/top-used?startDate=&endDate=&limit=10`
  - Query: JOIN `don_hang_khuyen_mai` với `khuyen_mai`
  - GROUP BY `khuyen_mai_id`
  - ORDER BY `COUNT(*)` DESC
  - Trả về: Tên KM, số lần dùng, tổng giảm giá
- ❌ **Frontend:** Component `TopPromotionsReports.jsx`
  - Bar chart top 10
  - Table chi tiết
  - Export

**Ước tính:** 1-2 ngày

---

#### 4.2. Hiệu Quả Khuyến Mãi (Efficiency)
- ❌ **Backend:** API mới `GET /api/v1/analytics/promotions/efficiency?startDate=&endDate=`
  - Tính toán:
    - Incremental revenue (doanh thu thêm do KM)
    - Discount efficiency (tỷ lệ giảm giá / doanh thu)
    - ROI (return on investment)
  - So sánh: Doanh thu có KM vs không có KM
- ❌ **Frontend:** Component `PromotionEfficiencyReports.jsx`
  - Table so sánh các KM
  - Bar chart hiệu quả
  - Export

**Ước tính:** 3-4 ngày (phức tạp)

---

## 🎯 **PRIORITY 2 - QUAN TRỌNG (Làm sau Priority 1)**

### **5. Employee Reports Chi Tiết** ⚠️ **CẦN HOÀN THIỆN**

#### 5.1. Performance Chi Tiết
- ❌ **Backend:** API mới `GET /api/v1/analytics/employees/performance?startDate=&endDate=`
  - Tính: Doanh thu, số đơn, đơn TB, giờ làm việc
  - So sánh giữa các nhân viên
- ❌ **Frontend:** Component `EmployeePerformanceReports.jsx`
  - Table xếp hạng nhân viên
  - Bar chart so sánh
  - Export

**Ước tính:** 2 ngày

---

### **6. Area Reports (Table Occupancy)** ❌ **CHƯA CÓ**

#### 6.1. Tỷ Lệ Sử Dụng Bàn
- ❌ **Backend:** API mới `GET /api/v1/analytics/areas/occupancy?startDate=&endDate=`
  - Query:
    - Tính số giờ bàn được sử dụng / tổng số giờ
    - Group theo khu vực, theo bàn
  - Trả về: Khu vực, bàn, tỷ lệ sử dụng (%), số đơn
- ❌ **Frontend:** Component `TableOccupancyReports.jsx`
  - Heatmap hoặc bar chart
  - Table chi tiết
  - Export

**Ước tính:** 2-3 ngày

---

### **7. Period Comparison UI** ❌ **CHƯA CÓ**

#### 7.1. So Sánh Kỳ (Side-by-Side)
- ❌ **Frontend:** Component `PeriodComparisonReports.jsx`
  - So sánh 2 kỳ song song
  - % thay đổi với màu (xanh=tăng, đỏ=giảm)
  - Visual indicators (↑↓)
  - Export cả 2 kỳ

**Ước tính:** 2 ngày

---

## 🎯 **PRIORITY 3 - NÂNG CAO (Làm sau)**

### **8. Chart Export as Images** ❌ **CHƯA CÓ**

#### 8.1. Export Charts
- ❌ **Frontend:** 
  - Cài `html2canvas` hoặc `react-to-image`
  - Export chart components as PNG/JPEG
  - Embed charts vào PDF export
- ❌ **Backend:** Embed charts vào PDF

**Ước tính:** 2-3 ngày

---

### **9. Custom Reports Builder** ❌ **CHƯA CÓ**

#### 9.1. Tạo Báo Cáo Tùy Chỉnh
- ❌ **Frontend:** Component `CustomReportsBuilder.jsx`
  - Drag & drop columns
  - Chọn filters
  - Preview
  - Save template
- ❌ **Backend:** API lưu template, generate report từ template

**Ước tính:** 5-7 ngày (phức tạp)

---

### **10. Scheduled Reports** ❌ **CHƯA CÓ**

#### 10.1. Báo Cáo Tự Động
- ❌ **Backend:** 
  - Cron job gửi email báo cáo hàng ngày/tuần/tháng
  - Lưu lịch sử báo cáo
- ❌ **Frontend:** UI quản lý scheduled reports

**Ước tính:** 5-7 ngày

---

## 📋 **TỔNG HỢP THEO THỜI GIAN**

### **Phase 1 - Priority 1 (2-3 tuần)**
1. ✅ Export Functionality - **ĐÃ HOÀN THÀNH**
2. Revenue Reports mở rộng (tuần, tháng, năm, giờ, khu vực) - **~7-10 ngày**
3. Customer Reports (VIP, analysis) - **~7 ngày**
4. Product Reports mở rộng - **~3 ngày**
5. Promotion Reports mở rộng - **~4-5 ngày**

**Tổng: ~21-25 ngày (3.5-4 tuần)**

---

### **Phase 2 - Priority 2 (1-2 tuần)**
6. Employee Reports chi tiết - **~2 ngày**
7. Area Reports (table occupancy) - **~3 ngày**
8. Period Comparison UI - **~2 ngày**

**Tổng: ~7 ngày (1 tuần)**

---

### **Phase 3 - Priority 3 (Tùy chọn)**
9. Chart export as images - **~2-3 ngày**
10. Custom Reports Builder - **~5-7 ngày**
11. Scheduled Reports - **~5-7 ngày**

**Tổng: ~12-17 ngày**

---

## 🎯 **ĐỀ XUẤT - BẮT ĐẦU TỪ ĐÂU?**

### **Option 1: Revenue Reports Mở Rộng (Recommended)**
**Lý do:**
- Quan trọng nhất cho quản lý
- Nhiều insights hữu ích
- Tương đối đơn giản (extend API có sẵn)
- Nhiều tính năng có thể reuse code

**Bắt đầu với:**
1. Revenue theo tuần/tháng/năm (2-3 ngày)
2. Revenue theo giờ trong ngày (1-2 ngày)
3. Revenue theo khu vực (2 ngày)

**Total: ~5-7 ngày**

---

### **Option 2: Customer Reports**
**Lý do:**
- Giúp phân tích khách hàng tốt hơn
- Tăng khả năng marketing
- Quan trọng cho business growth

**Bắt đầu với:**
1. Top Khách Hàng VIP (2 ngày)
2. Phân Tích Khách Hàng (3 ngày)

**Total: ~5 ngày**

---

### **Option 3: Product Reports + Promotion Reports**
**Lý do:**
- Quan trọng cho inventory management
- Giúp optimize menu
- Đánh giá hiệu quả khuyến mãi

**Bắt đầu với:**
1. Least Sold Products (1-2 ngày)
2. Top Promotions (1-2 ngày)

**Total: ~2-4 ngày**

---

## 💡 **KHUYẾN NGHỊ**

### **Nên làm theo thứ tự:**
1. **Revenue Reports mở rộng** (Priority cao, dễ làm)
2. **Top Khách Hàng VIP** (Quan trọng, dễ làm)
3. **Least Sold Products** (Quan trọng cho menu, dễ làm)
4. **Top Promotions** (Quan trọng, dễ làm)
5. **Customer Analysis** (Nâng cao hơn)
6. **Promotion Efficiency** (Phức tạp, để sau)
7. Các phần khác...

---

## 📝 **GHI CHÚ**

- Export functionality đã hoàn thành ✅
- Các reports còn lại chủ yếu là:
  - Tạo API mới hoặc extend API có sẵn
  - Tạo Frontend component
  - Tích hợp Export buttons (đã có sẵn)
  
- Ưu tiên làm các reports đơn giản trước, phức tạp sau
- Reuse code từ các reports đã có (ProfitReport, RevenueChart)

---

**Cập nhật:** 2025-01-XX  
**Status:** Export functionality ✅ HOÀN THÀNH, tiếp theo làm Revenue/Customer/Product reports
