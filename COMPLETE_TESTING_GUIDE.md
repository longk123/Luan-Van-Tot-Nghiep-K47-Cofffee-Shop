# 🧪 Hướng Dẫn Test Chi Tiết - Các Phần Mới

## 📋 **MỤC LỤC**

1. [Chuẩn Bị](#chuẩn-bị)
2. [Test Backend API](#test-backend-api)
3. [Test Frontend](#test-frontend)
4. [Test Export Functionality](#test-export-functionality)
5. [Test Cases Chi Tiết](#test-cases-chi-tiết)
6. [Troubleshooting](#troubleshooting)

---

## 🔧 **CHUẨN BỊ**

### **1. Kiểm Tra Server Đang Chạy**

#### **Backend:**
```bash
cd backend
npm start
# Hoặc
npm run dev
```

**Expected:** Server chạy tại `http://localhost:5000`
- ✅ Console hiển thị: "Server running on port 5000"
- ✅ Không có lỗi startup

#### **Frontend:**
```bash
cd frontend
npm run dev
```

**Expected:** Server chạy tại `http://localhost:5173`
- ✅ Browser tự động mở
- ✅ Không có lỗi compile

---

### **2. Lấy Authentication Token**

#### **Cách 1: Từ Browser (Dễ nhất)**
1. Mở trình duyệt: `http://localhost:5173`
2. Đăng nhập với tài khoản Manager
3. Mở **DevTools** (F12)
4. Chọn tab **Console**
5. Gõ lệnh:
   ```javascript
   localStorage.getItem('token')
   ```
6. Copy token (chuỗi dài bắt đầu bằng `eyJ...`)

#### **Cách 2: Từ Network Tab**
1. Mở **DevTools** (F12)
2. Tab **Network**
3. Refresh trang hoặc thực hiện action
4. Chọn một request bất kỳ
5. Tab **Headers** → **Request Headers**
6. Copy giá trị của `Authorization: Bearer ...`

---

### **3. Cài Đặt Tools (Nếu Chưa Có)**

#### **Postman:**
- Download: https://www.postman.com/downloads/
- Hoặc dùng **Thunder Client** (VSCode Extension)

#### **Thunder Client (VSCode):**
1. Mở VSCode
2. Extensions (Ctrl+Shift+X)
3. Tìm "Thunder Client"
4. Install

---

## 🧪 **TEST BACKEND API**

### **TEST 1: Export Revenue Report (Excel)**

#### **Setup:**
- **Tool:** Postman hoặc Thunder Client
- **Method:** `POST`
- **URL:** `http://localhost:5000/api/v1/reports/export`
- **Headers:**
  ```
  Content-Type: application/json
  Authorization: Bearer <YOUR_TOKEN>
  ```
- **Body (JSON):**
  ```json
  {
    "reportType": "revenue",
    "format": "excel",
    "startDate": "2025-01-01",
    "endDate": "2025-01-31"
  }
  ```

#### **Expected Result:**
- ✅ Status: `200 OK`
- ✅ Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- ✅ File tự động download hoặc hiển thị trong response
- ✅ Tên file: `revenue_<timestamp>.xlsx`

#### **Verify File Excel:**
1. Mở file Excel đã download
2. **Sheet 1 "Tổng Quan":**
   - ✅ Có 6 rows: Khoảng Thời Gian, Tổng Doanh Thu, Doanh Thu Tại Bàn, Doanh Thu Mang Đi, Tổng Đơn Hàng, Đơn Trung Bình
   - ✅ Currency format đúng (có ₫)
   - ✅ Headers có màu nền xám, chữ đậm
3. **Sheet 2 "Chi Tiết Theo Ngày":**
   - ✅ Có columns: Ngày, Doanh Thu, Tại Bàn, Mang Đi, Số Đơn, Trung Bình/Đơn
   - ✅ Currency format đúng
   - ✅ Có data (không phải tất cả đều 0)

---

### **TEST 2: Export Revenue Report (PDF)**

#### **Setup:**
- **Method:** `POST`
- **URL:** `http://localhost:5000/api/v1/reports/export`
- **Headers:** (giống Test 1)
- **Body:**
  ```json
  {
    "reportType": "revenue",
    "format": "pdf",
    "startDate": "2025-01-01",
    "endDate": "2025-01-31"
  }
  ```

#### **Expected Result:**
- ✅ Status: `200 OK`
- ✅ Content-Type: `application/pdf`
- ✅ File download: `revenue_<timestamp>.pdf`

#### **Verify File PDF:**
1. Mở file PDF
2. ✅ Header: "BÁO CÁO COFFEE SHOP" + "BÁO CÁO DOANH THU"
3. ✅ Tiếng Việt hiển thị ĐÚNG (không bị lỗi font, không phải ????)
4. ✅ Có section "TỔNG QUAN" với:
   - Tổng Doanh Thu
   - Doanh Thu Tại Bàn
   - Doanh Thu Mang Đi
   - Tổng Đơn Hàng
   - Đơn Trung Bình
5. ✅ Có section "CHI TIẾT THEO NGÀY" (nếu có data)
6. ✅ Footer: "Tạo lúc: <date>"

---

### **TEST 3: Export Revenue Report (CSV)**

#### **Setup:**
- **Method:** `POST`
- **URL:** `http://localhost:5000/api/v1/reports/export`
- **Body:**
  ```json
  {
    "reportType": "revenue",
    "format": "csv",
    "startDate": "2025-01-01",
    "endDate": "2025-01-31"
  }
  ```

#### **Expected Result:**
- ✅ Status: `200 OK`
- ✅ Content-Type: `text/csv; charset=utf-8`
- ✅ File download: `revenue_<timestamp>.csv`

#### **Verify File CSV:**
1. Mở bằng Excel (hoặc text editor)
2. ✅ Tiếng Việt hiển thị ĐÚNG
3. ✅ Có headers row
4. ✅ Có data rows
5. ✅ Format đúng (comma-separated)

---

### **TEST 4: Export Profit Report**

#### **Test Excel:**
```json
{
  "reportType": "profit",
  "format": "excel",
  "startDate": "2025-01-01",
  "endDate": "2025-01-31"
}
```

#### **Verify:**
- ✅ Sheet 1 "Tổng Quan Lợi Nhuận":
  - Tổng Doanh Thu, Tổng Chi Phí, Lợi Nhuận Gộp, Tỷ Lệ Lợi Nhuận
- ✅ Sheet 2 "Chi Tiết Theo Sản Phẩm":
  - Sản Phẩm, Số Lượng, Doanh Thu, Chi Phí, Lợi Nhuận, Tỷ Suất LN
  - Lợi nhuận âm (màu đỏ), dương (màu xanh lá)

---

### **TEST 5: Export Products Report**

```json
{
  "reportType": "products",
  "format": "excel",
  "startDate": "2025-01-01",
  "endDate": "2025-01-31"
}
```

#### **Verify:**
- ✅ Có title row merged
- ✅ Columns: Sản Phẩm, Danh Mục, Số Lượng Bán, Doanh Thu, Giá Trung Bình
- ✅ Currency format đúng

---

### **TEST 6: Export Promotions Report**

```json
{
  "reportType": "promotions",
  "format": "excel",
  "startDate": "2025-01-01",
  "endDate": "2025-01-31"
}
```

#### **Verify:**
- ✅ Columns: Tên Khuyến Mãi, Loại, Số Lần Dùng, Tổng Giảm Giá
- ✅ Currency format cho Tổng Giảm Giá

---

### **TEST 7: Export Customers Report**

```json
{
  "reportType": "customers",
  "format": "excel",
  "startDate": "2025-01-01",
  "endDate": "2025-01-31"
}
```

#### **Verify:**
- ✅ Columns: Khách Hàng/Bàn, Số Đơn, Tổng Chi Tiêu, Trung Bình/Đơn
- ✅ Currency format đúng

---

### **TEST 8: Error Cases**

#### **8.1. Missing Parameters:**
```json
{
  "format": "excel"
}
```
**Expected:** Status `400`, Error: "Missing reportType or format"

#### **8.2. Invalid Format:**
```json
{
  "reportType": "revenue",
  "format": "invalid"
}
```
**Expected:** Status `400`, Error: "Invalid format. Must be excel, pdf, or csv"

#### **8.3. Invalid Date Range:**
```json
{
  "reportType": "revenue",
  "format": "excel",
  "startDate": "2025-01-31",
  "endDate": "2025-01-01"
}
```
**Expected:** Status `400`, Error: "startDate must be before or equal to endDate"

#### **8.4. Unauthorized (No Token):**
- Gửi request không có header `Authorization`
- **Expected:** Status `401`, Error: "Missing token"

#### **8.5. Invalid Token:**
- Gửi request với token sai
- **Expected:** Status `401`, Error: "Invalid or expired token"

---

## 🌐 **TEST FRONTEND**

### **TEST 1: Manager Dashboard - Revenue Tab**

#### **Steps:**
1. Mở trình duyệt: `http://localhost:5173`
2. Đăng nhập với tài khoản Manager
3. Vào **Manager Dashboard**
4. Chọn tab **"Doanh thu"** (Revenue)

#### **Verify:**
1. ✅ Có 3 nút export: **Excel** (xanh lá), **PDF** (đỏ), **CSV** (xanh dương)
2. ✅ Nút export nằm bên phải header "Biểu đồ doanh thu..."
3. ✅ Nếu không có data → nút disabled (mờ)
4. ✅ Nếu có data → nút enabled (sáng)

#### **Test Export Buttons:**
1. Click nút **Excel**
   - ✅ Button hiển thị "Đang xuất..."
   - ✅ Các button khác disabled
   - ✅ File Excel download tự động
   - ✅ File mở được và có data đúng
2. Click nút **PDF**
   - ✅ Tương tự Excel
   - ✅ File PDF download
   - ✅ PDF hiển thị tiếng Việt đúng
3. Click nút **CSV**
   - ✅ File CSV download
   - ✅ Mở bằng Excel → tiếng Việt đúng

#### **Test Loading States:**
1. Click export button
2. ✅ Button text đổi thành "Đang xuất..."
3. ✅ Button color nhạt hơn
4. ✅ Tất cả buttons disabled
5. Sau khi download xong:
   - ✅ Button text quay lại "Excel"/"PDF"/"CSV"
   - ✅ Buttons enabled lại

#### **Test Error Handling:**
1. Tắt backend server
2. Click export button
3. ✅ Hiển thị error message: "Lỗi export EXCEL: ..."
4. ✅ Error message màu đỏ, nằm bên cạnh buttons
5. ✅ Loading state được clear

---

### **TEST 2: Profit Report Component**

#### **Steps:**
1. Vào Manager Dashboard
2. Chọn tab **"Lợi nhuận"** (Profit)

#### **Verify:**
1. ✅ Có ExportButtons component
2. ✅ Export buttons hoạt động
3. ✅ File download với data đúng
4. ✅ Data trong file khớp với data trên màn hình

---

### **TEST 3: Date Range Filter**

#### **Steps:**
1. Vào Revenue tab
2. Thay đổi date range filter

#### **Verify:**
1. ✅ Export buttons tự động lấy date range hiện tại
2. ✅ File export chứa data đúng với date range đã chọn

---

## 🎯 **TEST CASES CHI TIẾT**

### **Test Case 1: Export với Data Thực**

#### **Setup:**
- Chọn date range có data thực trong database

#### **Verify:**
- ✅ File Excel có data (không phải toàn 0)
- ✅ Số liệu khớp với dashboard
- ✅ Format đẹp, professional

---

### **Test Case 2: Export với No Data**

#### **Setup:**
- Chọn date range không có data

#### **Verify:**
- ✅ File vẫn được tạo
- ✅ Hiển thị 0 hoặc "Không có dữ liệu"
- ✅ Không bị crash

---

### **Test Case 3: Export với Date Range Dài**

#### **Setup:**
- Chọn date range 1 năm: `2024-01-01` đến `2024-12-31`

#### **Verify:**
- ✅ File vẫn được tạo
- ✅ Không bị timeout
- ✅ Data đầy đủ

---

### **Test Case 4: Multiple Exports Liên Tiếp**

#### **Steps:**
1. Click Excel → đợi download xong
2. Click PDF → đợi download xong
3. Click CSV → đợi download xong

#### **Verify:**
- ✅ Mỗi lần export hoạt động độc lập
- ✅ Không bị conflict
- ✅ Files được đặt tên khác nhau (timestamp khác)

---

### **Test Case 5: Export từ Nhiều Tabs**

#### **Steps:**
1. Export Revenue report
2. Chuyển sang Profit tab
3. Export Profit report

#### **Verify:**
- ✅ Mỗi tab export đúng report type
- ✅ Data khác nhau đúng

---

## 🐛 **TROUBLESHOOTING**

### **Lỗi 1: 401 Unauthorized**

#### **Triệu chứng:**
- Status 401
- Error: "Missing token" hoặc "Invalid or expired token"

#### **Nguyên nhân:**
- Token hết hạn
- Token không hợp lệ
- Header Authorization sai format

#### **Giải pháp:**
1. Đăng nhập lại
2. Lấy token mới từ `localStorage.getItem('token')`
3. Kiểm tra header format: `Authorization: Bearer <token>`

---

### **Lỗi 2: File Excel hiển thị số 0**

#### **Triệu chứng:**
- File Excel download được nhưng tất cả số liệu = 0

#### **Nguyên nhân:**
- Date range không có data trong database
- Query SQL không match data

#### **Giải pháp:**
1. Kiểm tra database có data trong date range không:
   ```sql
   SELECT COUNT(*) FROM don_hang 
   WHERE trang_thai = 'PAID' 
   AND closed_at >= '2025-01-01' 
   AND closed_at < '2025-02-01';
   ```
2. Chọn date range có data
3. Kiểm tra console log backend xem có lỗi query không

---

### **Lỗi 3: Font PDF bị lỗi (????)**

#### **Triệu chứng:**
- PDF hiển thị "????" thay vì tiếng Việt

#### **Nguyên nhân:**
- Font file không tồn tại
- Font path sai

#### **Giải pháp:**
1. Kiểm tra file font: `backend/src/fonts/Roboto-Regular.ttf`
2. Nếu thiếu, copy font file vào thư mục đó
3. Restart backend server

---

### **Lỗi 4: CSV tiếng Việt lỗi khi mở Excel**

#### **Triệu chứng:**
- CSV download được nhưng Excel hiển thị tiếng Việt sai

#### **Nguyên nhân:**
- Excel mở CSV không đúng encoding

#### **Giải pháp:**
1. Đã có UTF-8 BOM trong code → OK
2. Nếu vẫn lỗi:
   - Mở Excel
   - File → Open
   - Chọn file CSV
   - Chọn encoding: UTF-8

---

### **Lỗi 5: File không download**

#### **Triệu chứng:**
- Click export nhưng không có file download

#### **Nguyên nhân:**
- Browser block download
- Response headers sai
- JavaScript error

#### **Giải pháp:**
1. Kiểm tra Console (F12) có error không
2. Kiểm tra Network tab (F12):
   - Request có được gửi không?
   - Response status là gì?
   - Response headers có `Content-Disposition` không?
3. Kiểm tra browser settings:
   - Cho phép download tự động
   - Không block popup
4. Thử browser khác (Chrome, Firefox)

---

### **Lỗi 6: Backend Server Crash**

#### **Triệu chứng:**
- Backend server bị crash khi export
- Error trong terminal

#### **Nguyên nhân:**
- Font file không tồn tại → crash
- Query SQL lỗi
- Memory overflow với data lớn

#### **Giải pháp:**
1. Kiểm tra terminal backend:
   - Copy error message
   - Xem stack trace
2. Kiểm tra font file có tồn tại không
3. Kiểm tra database connection
4. Test với date range nhỏ hơn

---

## ✅ **CHECKLIST TEST**

### **Backend API:**
- [ ] Revenue Excel export - có data thực
- [ ] Revenue PDF export - tiếng Việt đúng
- [ ] Revenue CSV export - tiếng Việt đúng
- [ ] Profit Excel export - có data + màu sắc
- [ ] Profit PDF export - có data
- [ ] Products Excel export - có danh mục
- [ ] Products PDF export - có data
- [ ] Promotions Excel export - có data
- [ ] Promotions PDF export - có data
- [ ] Customers Excel export - có data
- [ ] Customers PDF export - có data
- [ ] Error cases (missing params, invalid format, invalid dates)
- [ ] Authentication (no token, invalid token)

### **Frontend:**
- [ ] Revenue tab - 3 nút export hoạt động
- [ ] Profit tab - 3 nút export hoạt động
- [ ] Loading states khi export
- [ ] Error handling khi fail
- [ ] Disabled state khi không có data
- [ ] File download tự động
- [ ] Date range filter sync với export

### **Data Accuracy:**
- [ ] Số liệu trong Excel khớp với dashboard
- [ ] PDF hiển thị đúng tiếng Việt
- [ ] CSV có thể mở bằng Excel
- [ ] Currency format đúng (có ₫)
- [ ] Date format đúng

---

## 🚀 **BƯỚC TIẾP THEO SAU KHI TEST XONG**

1. ✅ Nếu tất cả test cases PASS → Hoàn thành!
2. ⚠️ Nếu có lỗi:
   - Ghi lại lỗi (screenshot, error message)
   - Check troubleshooting section
   - Fix và test lại
3. 📝 Document các issues phát hiện
4. 🎉 Deploy và test trên production

---

**Chúc bạn test thành công!** 🎯

**Cập nhật:** 2025-01-XX  
**Version:** 1.0
