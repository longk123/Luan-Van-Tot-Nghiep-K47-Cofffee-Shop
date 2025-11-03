# 🧪 Hướng Dẫn Test Phase 1: Revenue Reports Mở Rộng

## ✅ Đã Hoàn Thành

Tất cả các tính năng Phase 1 đã được tích hợp vào **ManagerDashboard**:
- ✅ Backend APIs (4 endpoints)
- ✅ Frontend Components (4 components)
- ✅ Tích hợp vào ManagerDashboard (4 tabs mới)

---

## 🚀 Bước 1: Khởi động ứng dụng

### **1.1. Khởi động Backend**
Mở terminal và chạy:
```powershell
cd d:\my-thesis\backend
node index.js
```

**Kiểm tra:** Backend phải chạy ở cổng `5000` và hiển thị:
```
Server running on port 5000
✅ Database connected
```

### **1.2. Khởi động Frontend**
Mở terminal mới và chạy:
```powershell
cd d:\my-thesis\frontend
npm start
```

**Kiểm tra:** Frontend phải tự động mở trình duyệt ở `http://localhost:3000`

---

## 📊 Bước 2: Test từng tính năng

### **2.1. Đăng nhập**
1. Truy cập `http://localhost:3000`
2. Đăng nhập với tài khoản **Manager** hoặc **Admin**
3. Chuyển đến trang **Manager Dashboard**

---

### **2.2. Test Tab "DT Theo Giờ" (Revenue By Hour)** 🕐

#### **Cách test:**
1. Chọn tab **"DT Theo Giờ"** (icon 🕐)
2. Chọn **Thời gian = "Ngày"** ở dropdown
3. Chọn ngày cụ thể có dữ liệu (ví dụ: 2025-11-03)

#### **Kỳ vọng:**
- ✅ Hiển thị **Bar Chart** với 24 cột (từ 0h đến 23h)
- ✅ Hiển thị **giờ cao điểm** (Peak Hour) với badge màu xanh
- ✅ Hiển thị 3 **Summary Cards**:
  - Tổng doanh thu
  - Số đơn hàng
  - Giá trị trung bình/đơn
- ✅ Có **ExportButtons** (Excel, PDF, CSV)

#### **Test cases:**
- [x] Chọn ngày có dữ liệu → Chart hiển thị đầy đủ
- [x] Chọn ngày không có dữ liệu → Chart hiển thị 0 cho tất cả giờ
- [x] Hover vào cột → Tooltip hiển thị chi tiết
- [x] Resize window → Chart responsive

---

### **2.3. Test Tab "DT Theo Thứ" (Revenue By Day Of Week)** 📅

#### **Cách test:**
1. Chọn tab **"DT Theo Thứ"** (icon 📅)
2. Chọn **Thời gian = "Tháng"** hoặc **"Tuần"**
3. Chọn tháng/tuần có dữ liệu

#### **Kỳ vọng:**
- ✅ Hiển thị **Bar Chart** với 7 cột (CN, T2, T3, T4, T5, T6, T7)
- ✅ Hiển thị **ngày bán tốt nhất** với badge màu xanh lá và dấu sao ⭐
- ✅ Hiển thị **Summary Table** chi tiết:
  - Doanh thu từng ngày
  - Số đơn hàng
  - Giá trị TB/đơn
- ✅ Ngày có doanh thu cao nhất được highlight
- ✅ Có **ExportButtons**

#### **Test cases:**
- [x] Chọn tháng có dữ liệu → Chart hiển thị tất cả các ngày
- [x] Chọn tuần có dữ liệu → Chart hiển thị đầy đủ
- [x] Kiểm tra tổng doanh thu = tổng của 7 ngày
- [x] Hover vào cột → Tooltip hiển thị chi tiết

---

### **2.4. Test Tab "DT Theo Khu" (Revenue By Area)** 📍

#### **Cách test:**
1. Chọn tab **"DT Theo Khu"** (icon 📍)
2. Chọn **Thời gian = "Tháng"** hoặc **"Quý"**
3. Chọn khoảng thời gian có dữ liệu

#### **Kỳ vọng:**
- ✅ Hiển thị **Pie Chart** với tỷ trọng doanh thu theo khu vực
- ✅ Hiển thị **4 Summary Cards** (grid 2x2):
  - Tổng doanh thu
  - Tổng số đơn
  - Giá trị TB/đơn
  - Số khu vực
- ✅ Hiển thị **Detailed Table** với:
  - Tên khu vực
  - Doanh thu
  - Số đơn hàng
  - Giá trị TB/đơn
  - % tỷ trọng
  - Dot màu sắc tương ứng với pie chart
- ✅ Có **ExportButtons**

#### **Test cases:**
- [x] Chọn khoảng thời gian có nhiều khu vực → Pie chart hiển thị đầy đủ màu sắc
- [x] Hover vào pie chart → Tooltip hiển thị % và số tiền
- [x] Kiểm tra tổng % trong table = 100%
- [x] Kiểm tra tổng doanh thu = tổng trong summary card

---

### **2.5. Test Tab "DT Theo Kỳ" (Revenue By Period)** 📊

#### **Cách test:**
1. Chọn tab **"DT Theo Kỳ"** (icon 📊)
2. Chọn **Thời gian = "Năm"** hoặc **"Quý"**
3. Thử cả 3 tabs con:
   - **Theo Tuần**
   - **Theo Tháng**
   - **Theo Năm**

#### **Kỳ vọng:**
- ✅ Hiển thị **Line Chart** với 3 datasets:
  - Tổng doanh thu (xanh dương)
  - Doanh thu Tại chỗ (xanh lá)
  - Doanh thu Mang đi (cam)
- ✅ Hiển thị **Growth Indicator**:
  - Mũi tên lên màu xanh nếu tăng trưởng dương
  - Mũi tên xuống màu đỏ nếu giảm
  - % thay đổi so với kỳ trước
- ✅ Hiển thị **Summary Table** với:
  - Tên kỳ (Tuần/Tháng/Năm)
  - Doanh thu
  - % thay đổi so với kỳ trước
- ✅ Có **ExportButtons**

#### **Test cases:**
- [x] Tab "Theo Tuần" → Chart hiển thị theo tuần
- [x] Tab "Theo Tháng" → Chart hiển thị theo tháng (1-12)
- [x] Tab "Theo Năm" → Chart hiển thị theo năm
- [x] Hover vào điểm → Tooltip hiển thị chi tiết
- [x] Kiểm tra growth % calculation đúng

---

## 🧪 Test Cases Tổng Hợp

### **Test Navigation:**
- [x] Chuyển đổi giữa các tabs → Không bị lỗi
- [x] Chuyển thời gian (Ngày/Tuần/Tháng/Quý/Năm) → Data cập nhật đúng
- [x] Chọn Custom Date → Data load theo ngày tùy chỉnh

### **Test Responsive:**
- [x] Desktop (>1280px) → Layout 2 cột (RevenueByArea)
- [x] Tablet (768px-1280px) → Layout 1 cột
- [x] Mobile (<768px) → Charts và tables responsive

### **Test Loading & Error:**
- [x] Khi chưa có data → Hiển thị loading skeleton
- [x] Khi API lỗi → Hiển thị error message
- [x] Khi không có dữ liệu → Chart hiển thị 0

### **Test Export Buttons:**
⚠️ **LƯU Ý:** Export buttons hiện tại chưa hoạt động vì cần implement Phase 1.6 (extend exportService)

**Cách test (sau khi implement export):**
- [ ] Click **Export Excel** → Download file .xlsx
- [ ] Click **Export PDF** → Download file .pdf
- [ ] Click **Export CSV** → Download file .csv

---

## 🐛 Các Lỗi Có Thể Gặp

### **1. Lỗi: "Cannot read property 'data' of undefined"**
**Nguyên nhân:** Backend chưa chạy hoặc API endpoint không tồn tại

**Giải pháp:**
```powershell
# Kiểm tra backend có chạy không
curl http://localhost:5000/api/v1/analytics/revenue-by-hour?date=2025-11-03

# Nếu không chạy, restart backend
cd d:\my-thesis\backend
node index.js
```

### **2. Lỗi: Charts không hiển thị**
**Nguyên nhân:** Recharts chưa được cài đặt

**Giải pháp:**
```powershell
cd d:\my-thesis\frontend
npm install recharts
npm start
```

### **3. Lỗi: "Unexpected token '<'"**
**Nguyên nhân:** Frontend build bị lỗi

**Giải pháp:**
```powershell
cd d:\my-thesis\frontend
rm -rf node_modules package-lock.json
npm install
npm start
```

### **4. Lỗi: 401 Unauthorized**
**Nguyên nhân:** Token hết hạn hoặc không có quyền Manager

**Giải pháp:**
1. Đăng xuất
2. Đăng nhập lại với tài khoản Manager/Admin
3. Refresh trang

### **5. Lỗi: Không có dữ liệu hiển thị**
**Nguyên nhân:** Database không có dữ liệu trong khoảng thời gian đã chọn

**Giải pháp:**
1. Chọn ngày/tháng có dữ liệu (kiểm tra trong tab "Hóa đơn")
2. Hoặc tạo đơn hàng mẫu để test

---

## 📸 Screenshot Checklist

Khi test, chụp màn hình để verify:
- [ ] Tab "DT Theo Giờ" với bar chart 24 giờ
- [ ] Tab "DT Theo Thứ" với best day indicator
- [ ] Tab "DT Theo Khu" với pie chart + table
- [ ] Tab "DT Theo Kỳ" với line chart + growth indicator
- [ ] All tabs với data thực tế
- [ ] Loading states
- [ ] Error states (nếu có)

---

## 🎯 Kết Quả Mong Đợi

Sau khi test xong, bạn phải thấy:
✅ 4 tabs mới hoạt động bình thường
✅ Charts hiển thị đúng dữ liệu
✅ Loading states hoạt động
✅ Error handling hoạt động
✅ Responsive design hoạt động
✅ Export buttons hiển thị (chưa hoạt động - cần Phase 1.6)

---

## 📝 Báo Cáo Lỗi

Nếu gặp lỗi, vui lòng báo cáo theo format:

**Tiêu đề:** [Tab Name] - Mô tả lỗi ngắn gọn

**Mô tả chi tiết:**
- Bước tái hiện lỗi: 1, 2, 3...
- Kết quả mong đợi: ...
- Kết quả thực tế: ...
- Screenshot: (đính kèm)
- Console log: (copy error message)

**Ví dụ:**
```
[DT Theo Giờ] - Chart không hiển thị dữ liệu

Bước tái hiện:
1. Chọn tab "DT Theo Giờ"
2. Chọn ngày 2025-11-03
3. Chart hiển thị tất cả cột = 0

Kết quả mong đợi: Chart hiển thị doanh thu theo giờ
Kết quả thực tế: Tất cả cột = 0

Console log:
Error: Cannot read property 'data' of undefined
at RevenueByHourChart.jsx:42
```

---

**Ngày tạo:** 2025-11-03
**Version:** Phase 1 Complete
**Next:** Phase 1.6 (Export Integration) hoặc Phase 2 (Customer Reports)
