# 🧪 Hướng Dẫn Test Export Functionality

## ✅ **Đã Hoàn Thành**

### **Backend:**
- ✅ Lấy dữ liệu THỰC từ database
- ✅ 5 loại reports: Revenue, Profit, Products, Promotions, Customers
- ✅ 3 formats: Excel, PDF, CSV
- ✅ Excel: Formatting đẹp, nhiều sheet, currency format
- ✅ PDF: Vietnamese font, professional layout
- ✅ CSV: UTF-8 BOM encoding

### **Frontend:**
- ✅ ExportButtons component tích hợp
- ✅ ManagerDashboard - Revenue tab
- ✅ ProfitReport component

---

## 🧪 **Test 1: Test Backend API với Postman/Thunder Client**

### **Chuẩn Bị:**
1. Mở Postman hoặc Thunder Client (VSCode extension)
2. Lấy token đăng nhập:
   - Đăng nhập vào ứng dụng
   - Mở DevTools (F12) → Console
   - Gõ: `localStorage.getItem('token')`
   - Copy token

### **Test Revenue Report:**

**Request:**
```
POST http://localhost:5000/api/v1/reports/export
Content-Type: application/json
Authorization: Bearer <YOUR_TOKEN>

Body:
{
  "reportType": "revenue",
  "format": "excel",
  "startDate": "2025-01-01",
  "endDate": "2025-01-31"
}
```

**Kết Quả Mong Đợi:**
- File `revenue_<timestamp>.xlsx` tự động download
- Mở file Excel:
  - **Sheet 1 "Tổng Quan":** Tổng doanh thu, doanh thu tại bàn/mang đi, số đơn, đơn TB
  - **Sheet 2 "Chi Tiết Theo Ngày":** Chi tiết từng ngày với revenue, dine-in, takeaway

### **Test Profit Report:**

**Request:**
```json
{
  "reportType": "profit",
  "format": "excel",
  "startDate": "2025-01-01",
  "endDate": "2025-01-31"
}
```

**Kết Quả:**
- **Sheet 1:** Tổng doanh thu, chi phí, lợi nhuận, tỷ lệ
- **Sheet 2:** Chi tiết theo sản phẩm với tỷ suất lợi nhuận

### **Test Products Report:**

**Request:**
```json
{
  "reportType": "products",
  "format": "excel",
  "startDate": "2025-01-01",
  "endDate": "2025-01-31"
}
```

**Kết Quả:**
- Danh sách sản phẩm bán chạy
- Có danh mục, số lượng, doanh thu, giá TB

### **Test Promotions Report:**

**Request:**
```json
{
  "reportType": "promotions",
  "format": "excel",
  "startDate": "2025-01-01",
  "endDate": "2025-01-31"
}
```

**Kết Quả:**
- Danh sách khuyến mãi đã sử dụng
- Số lần dùng, tổng giảm giá

### **Test Customers Report:**

**Request:**
```json
{
  "reportType": "customers",
  "format": "excel",
  "startDate": "2025-01-01",
  "endDate": "2025-01-31"
}
```

**Kết Quả:**
- Top khách hàng/bàn
- Số đơn, tổng chi tiêu, trung bình/đơn

---

## 🧪 **Test 2: Test PDF Export**

Thay `"format": "excel"` thành `"format": "pdf"` trong các request trên.

**Kết Quả Mong Đợi:**
- File PDF download tự động
- Mở PDF:
  - ✅ Header: "BÁO CÁO COFFEE SHOP" + tiêu đề report
  - ✅ Tiếng Việt hiển thị ĐÚNG (không bị lỗi font)
  - ✅ Tổng quan + chi tiết/top items
  - ✅ Footer: Generated date

---

## 🧪 **Test 3: Test CSV Export**

Thay `"format": "csv"` trong các request.

**Kết Quả:**
- File CSV download
- Mở bằng Excel:
  - ✅ Tiếng Việt hiển thị ĐÚNG
  - ✅ Headers row
  - ✅ Data rows

---

## 🧪 **Test 4: Test Frontend Integration**

### **Test Revenue Export:**
1. Mở trình duyệt: `http://localhost:5173` (hoặc port frontend của bạn)
2. Đăng nhập với tài khoản Manager
3. Vào **Manager Dashboard**
4. Chọn tab **"Doanh thu"** (Revenue)
5. Kiểm tra:
   - ✅ Có 3 nút export: Excel (xanh lá), PDF (đỏ), CSV (xanh dương)
   - ✅ Nếu không có data → nút disabled (mờ)
   - ✅ Click Excel → File download tự động
   - ✅ Click PDF → File download tự động
   - ✅ Click CSV → File download tự động

### **Test Profit Export:**
1. Chọn tab **"Lợi nhuận"** (Profit)
2. Kiểm tra tương tự
3. Dữ liệu trong file phải khớp với dữ liệu hiển thị trên màn hình

---

## 🧪 **Test 5: Test với Date Ranges Khác Nhau**

### **Test Ngày Hôm Nay:**
```json
{
  "reportType": "revenue",
  "format": "excel",
  "startDate": "2025-11-03",
  "endDate": "2025-11-03"
}
```

### **Test 7 Ngày Gần Nhất:**
```json
{
  "reportType": "revenue",
  "format": "excel",
  "startDate": "2025-10-27",
  "endDate": "2025-11-03"
}
```

### **Test Tháng 10:**
```json
{
  "reportType": "revenue",
  "format": "excel",
  "startDate": "2025-10-01",
  "endDate": "2025-10-31"
}
```

---

## 🐛 **Troubleshooting**

### **Lỗi 401 Unauthorized:**
- **Nguyên nhân:** Token hết hạn hoặc không hợp lệ
- **Giải pháp:** Đăng nhập lại và lấy token mới

### **File Excel hiển thị số 0:**
- **Đã fix!** Controller giờ lấy dữ liệu THỰC từ database
- Nếu vẫn 0 → Kiểm tra có data trong database không:
  ```sql
  SELECT COUNT(*) FROM don_hang WHERE trang_thai = 'PAID';
  ```

### **Font PDF bị lỗi (????):**
- **Nguyên nhân:** Thiếu font Roboto
- **Giải pháp:** Đảm bảo file `backend/src/fonts/Roboto-Regular.ttf` tồn tại

### **CSV tiếng Việt lỗi:**
- **Nguyên nhân:** Excel mở CSV không đúng encoding
- **Giải pháp:** 
  - Đã thêm UTF-8 BOM trong code
  - Hoặc Import CSV vào Excel thay vì mở trực tiếp

### **File không download:**
- **Kiểm tra Console log:** F12 → Console
- **Kiểm tra Network tab:** F12 → Network → XHR
- **Kiểm tra backend log:** Terminal chạy backend

---

## ✅ **Checklist Test**

### **Backend API:**
- [ ] Revenue Excel - có data thực
- [ ] Revenue PDF - có data thực
- [ ] Revenue CSV - có data thực
- [ ] Profit Excel - có data thực + tỷ suất LN
- [ ] Profit PDF - có data thực
- [ ] Products Excel - có danh mục + doanh thu
- [ ] Products PDF - có data thực
- [ ] Promotions Excel - có data thực (nếu có KM)
- [ ] Promotions PDF - có data thực
- [ ] Customers Excel - có data thực
- [ ] Customers PDF - có data thực

### **Frontend:**
- [ ] Revenue tab - 3 nút export hoạt động
- [ ] Profit tab - 3 nút export hoạt động
- [ ] Loading state khi đang export
- [ ] Error handling khi fail
- [ ] File download tự động

### **Data Accuracy:**
- [ ] Số liệu trong Excel khớp với dashboard
- [ ] PDF hiển thị đúng tiếng Việt
- [ ] CSV có thể mở bằng Excel
- [ ] Currency format đúng (có dấu ₫)
- [ ] Date format đúng

---

## 📊 **Expected Results**

### **Revenue Report:**
```
Tổng Quan:
- Tổng Doanh Thu: 50,000,000 ₫
- Doanh Thu Tại Bàn: 35,000,000 ₫
- Doanh Thu Mang Đi: 15,000,000 ₫
- Tổng Đơn Hàng: 120
- Đơn Trung Bình: 416,667 ₫

Chi Tiết Theo Ngày:
- 2025-01-01: 1,500,000 ₫ (10 đơn)
- 2025-01-02: 2,000,000 ₫ (15 đơn)
...
```

### **Profit Report:**
```
Tổng Quan:
- Tổng Doanh Thu: 50,000,000 ₫
- Tổng Chi Phí: 20,000,000 ₫
- Lợi Nhuận Gộp: 30,000,000 ₫
- Tỷ Lệ Lợi Nhuận: 60.00%

Chi Tiết:
1. Cà phê sữa: 5,000,000 ₫ (Tỷ suất: 70%)
2. Trà sữa: 3,000,000 ₫ (Tỷ suất: 65%)
...
```

---

## 🎉 **Kết Luận**

Nếu tất cả test cases đều PASS:
✅ Export system hoạt động hoàn hảo!
✅ Dữ liệu thực từ database
✅ Format đẹp, professional
✅ Sẵn sàng production

Nếu có lỗi:
❌ Chụp màn hình lỗi
❌ Copy error message từ console
❌ Gửi lại để support sửa

---

**🚀 Chúc bạn test thành công!**
