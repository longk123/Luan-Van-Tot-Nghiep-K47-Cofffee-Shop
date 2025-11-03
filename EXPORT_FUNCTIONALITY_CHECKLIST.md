# 📤 Export Functionality - Checklist Chi Tiết

## 🎯 Tổng Quan

Tài liệu này liệt kê **CHI TIẾT** những phần export đã có và chưa có trong dự án.

---

## ✅ **PHẦN ĐÃ CÓ**

### 1. **Libraries Đã Cài Đặt**

#### Backend:
- ✅ **ĐÃ CÓ** - `pdfkit` (v0.17.2)
  - File: `backend/package.json`
  - Đã dùng cho: Invoice PDF, Import Receipt PDF

#### Frontend:
- ✅ **ĐÃ CÓ** - `xlsx` (v0.18.5)
  - File: `frontend/package.json`
  - Đã dùng cho: Profit Report Excel export

---

### 2. **Export Đã Implement**

#### ✅ **Invoice PDF Export** (Backend)
- **File:** `backend/src/controllers/invoiceController.js`
- **Endpoint:** `GET /api/v1/hoa-don/:orderId/pdf`
- **Status:** ✅ **HOÀN CHỈNH**
- **Features:**
  - ✅ PDF generation với PDFKit
  - ✅ Font Roboto hỗ trợ tiếng Việt
  - ✅ Layout đẹp, format A5
  - ✅ Hiển thị đầy đủ: header, lines, promotions, payments, totals

#### ✅ **Import Receipt PDF Export** (Backend)
- **File:** `backend/src/controllers/importReceiptController.js`
- **Endpoint:** `GET /api/v1/phieu-nhap/:importId/pdf`
- **Status:** ✅ **HOÀN CHỈNH**
- **Features:**
  - ✅ PDF generation với PDFKit
  - ✅ Font Roboto hỗ trợ tiếng Việt
  - ✅ Layout đẹp

#### ✅ **Profit Report Excel Export** (Frontend - Client-side)
- **File:** `frontend/src/components/manager/ProfitReport.jsx`
- **Function:** `exportToExcel()`
- **Status:** ✅ **HOÀN CHỈNH**
- **Features:**
  - ✅ Export Excel với XLSX library
  - ✅ Multiple sheets (summary + details)
  - ✅ Column widths
  - ✅ Vietnamese content
  - ✅ Download trực tiếp từ browser

#### ✅ **Batch Inventory CSV Export** (Frontend - Client-side)
- **File:** `frontend/src/pages/InventoryManagement.jsx` (line 1204)
- **Status:** ✅ **HOÀN CHỈNH**
- **Features:**
  - ✅ Export CSV manually (tạo blob)
  - ✅ UTF-8 encoding với BOM
  - ✅ Download trực tiếp từ browser

---

## ❌ **PHẦN CHƯA CÓ** (Cần Implement)

### 1. **Backend Export APIs - TỔNG HỢP**

#### ❌ **Universal Export Endpoint** (PRIORITY 1)
- **Cần tạo:** `POST /api/v1/reports/export`
- **File cần tạo:** 
  - `backend/src/controllers/reportsController.js` (có skeleton nhưng chưa implement)
  - Hoặc tạo `exportController.js` mới
- **Features cần:**
  - ✅ Nhận params: `reportType`, `format` (excel/pdf/csv), `startDate`, `endDate`, `...otherParams`
  - ✅ Generate file theo format
  - ✅ Return file stream hoặc download URL
- **Status:** ❌ **CHƯA CÓ**

#### ❌ **Individual Export Endpoints** (Alternative approach)
Thay vì 1 endpoint chung, có thể tạo endpoints riêng:
- ❌ `GET /api/v1/analytics/revenue/export?format=excel&startDate=&endDate=`
- ❌ `GET /api/v1/analytics/profit/export?format=pdf&startDate=&endDate=`
- ❌ `GET /api/v1/analytics/products/export?format=csv&startDate=&endDate=`
- ❌ `GET /api/v1/analytics/promotions/export?format=excel&startDate=&endDate=`
- ❌ `GET /api/v1/analytics/customers/export?format=excel&startDate=&endDate=`
- ❌ ... (cho tất cả loại reports)

---

### 2. **Backend Excel Export** ❌ **CHƯA CÓ**

#### Cần Cài:
- ❌ **Library:** `exceljs` hoặc `xlsx` cho Node.js
  ```bash
  npm install exceljs
  # hoặc
  npm install xlsx
  ```

#### Cần Implement:
- ❌ Service: `exportService.js` hoặc thêm vào `reportsService.js`
- ❌ Functions:
  - `exportRevenueToExcel(startDate, endDate, data)`
  - `exportProfitToExcel(startDate, endDate, data)`
  - `exportProductsToExcel(startDate, endDate, data)`
  - `exportPromotionsToExcel(startDate, endDate, data)`
  - `exportCustomersToExcel(startDate, endDate, data)`
  - ... (cho tất cả reports)

#### Features cần:
- ❌ Multiple sheets (Summary, Details, Charts data)
- ❌ Formatting (currency, date, number)
- ❌ Column widths auto-fit
- ❌ Headers styling (bold, background color)
- ❌ Charts embedded (optional - advanced)

---

### 3. **Backend PDF Export** ⚠️ **CÓ MỘT PHẦN**

#### Đã Có:
- ✅ `pdfkit` library
- ✅ Invoice PDF export
- ✅ Import Receipt PDF export

#### Chưa Có:
- ❌ **Report PDF Export** cho các loại reports:
  - ❌ Revenue Report PDF
  - ❌ Profit Report PDF
  - ❌ Product Report PDF
  - ❌ Promotion Report PDF
  - ❌ Customer Report PDF
  - ❌ Employee Report PDF
  - ❌ Area Report PDF
  - ❌ Time Analysis Report PDF
  - ❌ Dashboard Report PDF (tổng hợp)

#### Cần Implement:
- ❌ Service functions:
  - `exportRevenueToPDF(startDate, endDate, data)`
  - `exportProfitToPDF(startDate, endDate, data)`
  - `exportProductsToPDF(startDate, endDate, data)`
  - ... (cho tất cả reports)

#### Features cần:
- ❌ Professional layout (header, footer với logo)
- ❌ Charts as images (convert Recharts to image, embed in PDF)
- ❌ Multi-page support
- ❌ Table formatting
- ❌ Page numbers
- ❌ Generated date/time in footer

---

### 4. **Backend CSV Export** ❌ **CHƯA CÓ**

#### Cần Implement:
- ❌ Service functions:
  - `exportRevenueToCSV(startDate, endDate, data)`
  - `exportProfitToCSV(startDate, endDate, data)`
  - `exportProductsToCSV(startDate, endDate, data)`
  - ... (cho tất cả reports)

#### Features cần:
- ❌ UTF-8 encoding với BOM (để Excel hiển thị tiếng Việt đúng)
- ❌ CSV format đúng chuẩn
- ❌ Headers row
- ❌ Proper escaping cho commas, quotes

---

### 5. **Frontend Export Components** ⚠️ **CÓ MỘT PHẦN**

#### Đã Có:
- ✅ `ProfitReport.jsx` có export Excel button
- ✅ `InventoryManagement.jsx` có export CSV button

#### Chưa Có:
- ❌ **ExportButtons Component** chung
  - File cần: `frontend/src/components/reports/ExportButtons.jsx` (có thể đã có skeleton nhưng chưa hoàn chỉnh)
  - Features cần:
    - ✅ 3 buttons: Excel, PDF, CSV
    - ✅ Loading state
    - ✅ Error handling
    - ✅ Call backend API hoặc client-side export
    - ✅ Disable khi không có data

- ❌ Export buttons cho các reports khác:
  - ❌ Revenue Reports export
  - ❌ Product Reports export
  - ❌ Promotion Reports export
  - ❌ Customer Reports export
  - ❌ Employee Reports export
  - ❌ Area Reports export
  - ❌ Time Reports export
  - ❌ Dashboard export (tổng hợp)

#### Cần Implement:
- ❌ Component `ExportButtons.jsx` (reusable)
  ```jsx
  <ExportButtons
    reportType="revenue"
    data={reportData}
    filters={filters}
    onExport={handleExport}
  />
  ```

- ❌ Hook `useExport.js` (optional)
  ```jsx
  const { exportToExcel, exportToPDF, exportToCSV, loading } = useExport();
  ```

---

### 6. **Frontend Export Functions** ⚠️ **CÓ MỘT PHẦN**

#### Đã Có:
- ✅ `exportToExcel()` trong `ProfitReport.jsx`

#### Chưa Có:
- ❌ Generic export functions:
  - ❌ `exportRevenueToExcel(data, filters)`
  - ❌ `exportProfitToPDF(data, filters)`
  - ❌ `exportProductsToCSV(data, filters)`
  - ... (cho tất cả reports)

- ❌ Helper utilities:
  - ❌ `utils/exportHelpers.js` - Common functions
  - ❌ Format data cho export
  - ❌ Generate filename
  - ❌ Download file helper

---

### 7. **Chart Export** ❌ **CHƯA CÓ**

#### Cần Implement:
- ❌ Export charts as images (PNG/JPEG)
  - ❌ Convert Recharts to image
  - ❌ Download chart as image
  - ❌ Embed charts trong PDF export

#### Libraries có thể dùng:
- ❌ `html2canvas` - Convert React components to canvas
- ❌ `react-to-image` - React specific
- ❌ `recharts-to-png` - Recharts specific

---

### 8. **Export Features Chi Tiết**

#### Excel Export Features Chưa Có:
- ❌ Multiple sheets cho complex reports
- ❌ Styling (colors, fonts, borders)
- ❌ Formulas (SUM, AVERAGE, etc.)
- ❌ Auto-filter
- ❌ Conditional formatting
- ❌ Charts embedded trong Excel
- ❌ Pivot table (advanced)

#### PDF Export Features Chưa Có:
- ❌ Company logo/branding
- ❌ Watermark
- ❌ Encryption (optional)
- ❌ Bookmarks/Table of contents (cho multi-page)
- ❌ Charts as images
- ❌ Summary page + Details pages

#### CSV Export Features Chưa Có:
- ❌ Multiple CSV files cho complex reports
- ❌ Metadata file (JSON) kèm theo CSV
- ❌ Compressed (ZIP) cho multiple files

---

## 📋 **CHECKLIST IMPLEMENTATION**

### Phase 1 - Backend Core Export (Priority 1)
- [ ] **Cài đặt libraries:**
  - [ ] `exceljs` hoặc `xlsx` cho Node.js
  - [ ] Kiểm tra `pdfkit` đã đủ chưa

- [ ] **Tạo Export Service:**
  - [ ] File: `backend/src/services/exportService.js`
  - [ ] Functions: `exportToExcel()`, `exportToPDF()`, `exportToCSV()`

- [ ] **Tạo Export Controller:**
  - [ ] File: `backend/src/controllers/exportController.js`
  - [ ] Hoặc extend `reportsController.js`
  - [ ] Endpoint: `POST /api/v1/reports/export`

- [ ] **Tạo Export Routes:**
  - [ ] File: `backend/src/routes/exports.js`
  - [ ] Hoặc thêm vào `reports.js`

### Phase 2 - Frontend Export Components (Priority 1)
- [ ] **Tạo ExportButtons Component:**
  - [ ] File: `frontend/src/components/reports/ExportButtons.jsx`
  - [ ] 3 buttons: Excel, PDF, CSV
  - [ ] Loading states
  - [ ] Error handling

- [ ] **Tạo Export Utilities:**
  - [ ] File: `frontend/src/utils/exportHelpers.js`
  - [ ] Helper functions

- [ ] **Tích hợp vào các Reports:**
  - [ ] RevenueReports.jsx
  - [ ] ProfitReports.jsx (đã có Excel, thêm PDF/CSV)
  - [ ] ProductReports.jsx
  - [ ] PromotionReports.jsx
  - [ ] CustomerReports.jsx
  - [ ] EmployeeReports.jsx
  - [ ] AreaReports.jsx
  - [ ] TimeReports.jsx
  - [ ] Dashboard (ManagerDashboard.jsx)

### Phase 3 - Export Types Implementation
- [ ] **Excel Export Implementation:**
  - [ ] Revenue Excel
  - [ ] Profit Excel (đã có client-side, cần backend)
  - [ ] Product Excel
  - [ ] Promotion Excel
  - [ ] Customer Excel
  - [ ] Employee Excel
  - [ ] Area Excel
  - [ ] Time Excel

- [ ] **PDF Export Implementation:**
  - [ ] Revenue PDF
  - [ ] Profit PDF
  - [ ] Product PDF
  - [ ] Promotion PDF
  - [ ] Customer PDF
  - [ ] Employee PDF
  - [ ] Area PDF
  - [ ] Dashboard PDF (tổng hợp)

- [ ] **CSV Export Implementation:**
  - [ ] Revenue CSV
  - [ ] Profit CSV
  - [ ] Product CSV
  - [ ] Promotion CSV
  - [ ] Customer CSV
  - [ ] Employee CSV
  - [ ] Area CSV
  - [ ] Time CSV

### Phase 4 - Advanced Features
- [ ] **Chart Export:**
  - [ ] Cài `html2canvas` hoặc tương đương
  - [ ] Export chart as PNG
  - [ ] Embed charts trong PDF

- [ ] **Excel Enhancements:**
  - [ ] Multiple sheets
  - [ ] Styling
  - [ ] Formulas
  - [ ] Auto-filter

- [ ] **PDF Enhancements:**
  - [ ] Logo/branding
  - [ ] Multi-page
  - [ ] Bookmarks
  - [ ] Charts embedded

---

## 🎯 **TÓM TẮT - PHẦN CHƯA CÓ**

### ❌ **CHƯA CÓ HOÀN TOÀN:**

1. **Backend Export API chung** - Cần implement endpoint `/reports/export`
2. **Backend Excel Export** - Cần cài library và implement functions
3. **Backend CSV Export** - Cần implement functions
4. **Backend PDF Export cho Reports** - Chỉ có cho Invoice và Import Receipt, chưa có cho Reports
5. **ExportButtons Component chung** - Chưa có reusable component
6. **Export functions cho tất cả reports** - Chỉ có cho Profit Report
7. **Chart export** - Chưa có export charts as images
8. **Export features nâng cao** - Styling, multiple sheets, etc.

### ⚠️ **CÓ MỘT PHẦN:**

1. **Frontend Excel Export** - Có trong ProfitReport, nhưng chưa có cho reports khác
2. **Frontend CSV Export** - Có trong InventoryManagement, nhưng chưa có cho reports khác
3. **Backend PDF Export** - Có cho Invoice và Import Receipt, nhưng chưa có cho Reports

---

## 💡 **ĐỀ XUẤT IMPLEMENTATION ORDER**

### **Step 1: Backend Core (Tuần 1)**
1. Cài `exceljs` library
2. Tạo `exportService.js`
3. Implement basic Excel export cho 1-2 reports (Revenue, Profit)
4. Implement CSV export
5. Implement PDF export cho 1-2 reports

### **Step 2: Backend API (Tuần 1)**
6. Tạo endpoint `POST /api/v1/reports/export`
7. Test với Postman

### **Step 3: Frontend Components (Tuần 2)**
8. Tạo `ExportButtons.jsx` component
9. Tích hợp vào ProfitReport (đã có Excel, thêm PDF/CSV)
10. Tích hợp vào RevenueReports

### **Step 4: Expand (Tuần 3)**
11. Thêm export cho tất cả reports còn lại
12. Chart export
13. Advanced features

---

**📝 Lưu ý:** Checklist này sẽ được cập nhật khi có implementation mới!

