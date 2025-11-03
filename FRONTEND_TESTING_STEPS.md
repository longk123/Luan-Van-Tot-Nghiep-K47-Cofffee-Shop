# 🌐 Hướng Dẫn Test Frontend - Từng Bước

## 📋 **CHUẨN BỊ**

1. ✅ Backend server đang chạy: `http://localhost:5000`
2. ✅ Frontend server đang chạy: `http://localhost:5173`
3. ✅ Đã đăng nhập với tài khoản Manager

---

## 🧪 **TEST 1: Revenue Tab - Export Buttons**

### **Bước 1: Mở Manager Dashboard**
1. Mở trình duyệt: `http://localhost:5173`
2. Đăng nhập nếu chưa
3. Click vào **"Manager Dashboard"** (hoặc `/manager`)

### **Bước 2: Vào Revenue Tab**
1. Click tab **"Doanh thu"** (Revenue)
2. Chờ data load xong

### **Bước 3: Kiểm Tra Export Buttons**
**Nhìn vào header của biểu đồ doanh thu:**
- ✅ Bên phải có 3 nút:
  - **Excel** (màu xanh lá)
  - **PDF** (màu đỏ)
  - **CSV** (màu xanh dương)
- ✅ Nút có icon và text
- ✅ Nếu không có data → nút mờ (disabled)
- ✅ Nếu có data → nút sáng (enabled)

### **Bước 4: Test Export Excel**
1. Click nút **Excel**
2. **Kiểm tra:**
   - ✅ Button text đổi thành **"Đang xuất..."**
   - ✅ Button màu nhạt hơn (loading state)
   - ✅ Các button khác disabled (không click được)
   - ✅ File Excel tự động download trong thư mục Downloads
   - ✅ Sau 2-3 giây, button quay lại **"Excel"**
   - ✅ Buttons enabled lại

3. **Mở file Excel:**
   - Vào thư mục Downloads
   - Mở file `revenue_<timestamp>.xlsx`
   - **Kiểm tra:**
     - ✅ Sheet 1 "Tổng Quan": Có 6 rows với data
     - ✅ Sheet 2 "Chi Tiết Theo Ngày": Có data theo ngày
     - ✅ Currency format có ₫
     - ✅ Headers có màu nền xám, chữ đậm
     - ✅ Tiếng Việt hiển thị đúng

### **Bước 5: Test Export PDF**
1. Click nút **PDF**
2. **Kiểm tra:**
   - ✅ Loading state tương tự Excel
   - ✅ File PDF download: `revenue_<timestamp>.pdf`
   - ✅ Button quay lại trạng thái ban đầu

3. **Mở file PDF:**
   - **Kiểm tra:**
     - ✅ Header: "BÁO CÁO COFFEE SHOP"
     - ✅ Tiêu đề: "BÁO CÁO DOANH THU"
     - ✅ Tiếng Việt hiển thị ĐÚNG (không bị ????)
     - ✅ Có section "TỔNG QUAN" với các số liệu
     - ✅ Có section "CHI TIẾT THEO NGÀY" (nếu có data)
     - ✅ Footer: "Tạo lúc: <ngày giờ>"

### **Bước 6: Test Export CSV**
1. Click nút **CSV**
2. **Kiểm tra:**
   - ✅ Loading state
   - ✅ File CSV download: `revenue_<timestamp>.csv`

3. **Mở file CSV:**
   - Mở bằng Excel (double-click file)
   - **Kiểm tra:**
     - ✅ Tiếng Việt hiển thị ĐÚNG
     - ✅ Có headers row
     - ✅ Có data rows

---

## 🧪 **TEST 2: Profit Tab - Export Buttons**

### **Bước 1: Chuyển Tab**
1. Click tab **"Lợi nhuận"** (Profit)
2. Chờ data load

### **Bước 2: Tìm Export Buttons**
- Tìm xem có ExportButtons component không
- Có thể ở header của Profit Report

### **Bước 3: Test Export**
- Lặp lại các bước như Revenue tab
- **Kiểm tra thêm:**
  - ✅ File Excel có 2 sheets: "Tổng Quan Lợi Nhuận" và "Chi Tiết Theo Sản Phẩm"
  - ✅ Sheet 2 có màu sắc: Lợi nhuận âm (đỏ), dương (xanh lá)

---

## 🧪 **TEST 3: Error Handling**

### **Bước 1: Tắt Backend Server**
1. Vào terminal chạy backend
2. Nhấn `Ctrl+C` để dừng server

### **Bước 2: Test Export với Backend Down**
1. Quay lại browser (Revenue tab)
2. Click nút **Excel** hoặc **PDF**
3. **Kiểm tra:**
   - ✅ Button loading một lúc
   - ✅ Sau đó hiển thị **error message** màu đỏ
   - ✅ Error message: "Lỗi export EXCEL: ..." (hoặc tương tự)
   - ✅ Error message nằm bên cạnh buttons
   - ✅ Button quay lại trạng thái bình thường (không còn loading)

### **Bước 3: Bật Lại Backend**
1. Bật lại backend server
2. Refresh trang hoặc click export lại
3. **Kiểm tra:**
   - ✅ Export hoạt động bình thường

---

## 🧪 **TEST 4: Date Range Filter**

### **Bước 1: Thay Đổi Date Range**
1. Ở Revenue tab, tìm date range filter
2. Chọn khoảng thời gian khác (ví dụ: 7 ngày gần nhất)

### **Bước 2: Export với Date Range Mới**
1. Click export button
2. **Kiểm tra:**
   - ✅ File export chứa data đúng với date range đã chọn
   - ✅ Trong file Excel, "Khoảng Thời Gian" hiển thị đúng dates

---

## 🧪 **TEST 5: Multiple Exports Liên Tiếp**

### **Bước 1: Export Nhiều Lần**
1. Click **Excel** → đợi download xong
2. Click **PDF** → đợi download xong
3. Click **CSV** → đợi download xong

### **Bước 2: Kiểm Tra**
- ✅ Mỗi lần export hoạt động độc lập
- ✅ Files có tên khác nhau (timestamp khác)
- ✅ Không bị conflict

---

## 🧪 **TEST 6: Disabled State**

### **Bước 1: Chọn Date Range Không Có Data**
1. Chọn date range rất xa (ví dụ: năm 2020)
2. Hoặc chọn ngày mai (chưa có data)

### **Bước 2: Kiểm Tra Buttons**
- ✅ Buttons disabled (mờ, không click được)
- ✅ Hoặc có tooltip: "Không có dữ liệu để export"

---

## ✅ **CHECKLIST TEST FRONTEND**

Đánh dấu sau khi test:

### **Revenue Tab:**
- [ ] Có 3 nút export (Excel, PDF, CSV)
- [ ] Buttons ở vị trí đúng (bên phải header)
- [ ] Loading state hoạt động
- [ ] Excel export → File download + mở được
- [ ] PDF export → File download + tiếng Việt đúng
- [ ] CSV export → File download + mở Excel được
- [ ] Error handling khi backend down
- [ ] Disabled state khi không có data

### **Profit Tab:**
- [ ] Có ExportButtons
- [ ] Export hoạt động
- [ ] Data trong file khớp với màn hình

### **Chung:**
- [ ] Date range filter sync với export
- [ ] Multiple exports không conflict
- [ ] File names unique (timestamp)

---

## 📸 **GỢI Ý CHỤP SCREENSHOT**

Chụp screenshot các phần sau để verify:
1. Export buttons ở Revenue tab
2. Loading state khi đang export
3. Error message khi backend down
4. File Excel mở ra (Sheet 1 và Sheet 2)
5. File PDF mở ra
6. Disabled state khi không có data

---

## 🐛 **NẾU GẶP LỖI**

### **Buttons không hiển thị:**
- Kiểm tra Console (F12) có error không
- Kiểm tra Import ExportButtons đúng chưa
- Kiểm tra props truyền vào đúng chưa

### **Click không download:**
- Kiểm tra Console (F12) → Network tab
- Xem request có được gửi không
- Xem response status là gì
- Kiểm tra browser settings (cho phép download)

### **Loading state không hiện:**
- Kiểm tra state `loading` có update không
- Kiểm tra conditional rendering trong component

### **Error message không hiện:**
- Kiểm tra error state
- Kiểm tra error display trong component

---

## 📝 **GHI CHÚ KẾT QUẢ**

Sau khi test xong, ghi lại:
- ✅ Những phần PASS
- ❌ Những phần FAIL
- ⚠️ Những phần có vấn đề nhỏ
- 📸 Screenshots các lỗi (nếu có)

---

**Chúc bạn test thành công!** 🎯
