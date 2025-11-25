# ⚡ TEST NHANH 30 PHÚT - CoffeePOS

**Mục đích:** Test nhanh các chức năng quan trọng nhất của hệ thống  
**Thời gian:** 30 phút  
**Yêu cầu:** Backend và Frontend đang chạy

---

## 🚀 **BƯỚC 1: CHUẨN BỊ (2 phút)**

### **Khởi Động:**
```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### **Kiểm Tra:**
- [ ] Backend: `http://localhost:5000` ✅
- [ ] Frontend: `http://localhost:5173` ✅
- [ ] Không có lỗi trong console

---

## 🔐 **BƯỚC 2: AUTHENTICATION (3 phút)**

### **Test Đăng Nhập:**
1. Mở `http://localhost:5173`
2. Đăng nhập với:
   - Username: `manager`
   - Password: `manager123`
3. ✅ Kiểm tra: Đăng nhập thành công, redirect đến dashboard

### **Test Phân Quyền:**
- [ ] Có thể truy cập Manager Dashboard
- [ ] User info hiển thị đúng (tên, role)

---

## 🛒 **BƯỚC 3: POS SYSTEM - TẠO ĐƠN (5 phút)**

### **Tạo Đơn Tại Bàn:**
1. Vào Dashboard → Chọn chế độ "POS"
2. Chọn một bàn trống (ví dụ: Bàn 1)
3. Click "Tạo đơn"
4. Thêm món:
   - Chọn sản phẩm (ví dụ: "Cà phê đen")
   - Chọn size (nếu có)
   - Chọn tùy chọn (đường, đá)
   - Nhập số lượng: 2
   - Click "Thêm vào đơn"
5. ✅ Kiểm tra:
   - [ ] Món xuất hiện trong Order Drawer
   - [ ] Tổng tiền được tính đúng
   - [ ] Bàn chuyển sang "Có khách"

---

## 👨‍🍳 **BƯỚC 4: KITCHEN DISPLAY (3 phút)**

### **Kiểm Tra Kitchen:**
1. Mở tab mới: `http://localhost:5173/kitchen`
2. Đăng nhập với role Kitchen (hoặc dùng tài khoản manager)
3. ✅ Kiểm tra:
   - [ ] Món vừa tạo xuất hiện trong "Chờ làm"
   - [ ] Hiển thị đầy đủ thông tin: Tên món, Bàn, Số lượng
4. Click "Bắt đầu" → ✅ Món chuyển sang "Đang làm"
5. Click "Hoàn thành" → ✅ Món biến mất

---

## 💳 **BƯỚC 5: THANH TOÁN (3 phút)**

### **Thanh Toán Đơn:**
1. Quay lại POS
2. Click "Thanh toán"
3. Chọn "Tiền mặt"
4. Nhập số tiền khách đưa (ví dụ: 100000)
5. Click "Xác nhận thanh toán"
6. ✅ Kiểm tra:
   - [ ] Thanh toán thành công
   - [ ] Hóa đơn được tạo
   - [ ] Bàn trở về trạng thái trống

---

## 📊 **BƯỚC 6: REPORTS (5 phút)**

### **Xem Báo Cáo Doanh Thu:**
1. Vào Manager Dashboard
2. Tab "Doanh thu"
3. Chọn khoảng thời gian (ví dụ: Hôm nay)
4. ✅ Kiểm tra:
   - [ ] Hiển thị tổng doanh thu
   - [ ] Biểu đồ hiển thị
   - [ ] Có nút Export (Excel, PDF, CSV)

### **Test Export:**
1. Click nút "Excel"
2. ✅ Kiểm tra:
   - [ ] Button hiển thị "Đang xuất..."
   - [ ] File Excel download
   - [ ] File mở được và có data

---

## 🎁 **BƯỚC 7: PROMOTION (5 phút)**

### **Tạo Khuyến Mãi:**
1. Vào "Quản lý Khuyến mãi"
2. Click "Thêm khuyến mãi"
3. Điền:
   - Mã: `TEST10`
   - Tên: "Test 10%"
   - Loại: **PERCENT**
   - Giá trị: `10`
   - Max giảm: `30000`
   - Active: ✅
4. Click "Lưu"
5. ✅ Kiểm tra: Khuyến mãi xuất hiện trong danh sách

### **Áp Dụng Trong POS:**
1. Tạo đơn mới trong POS
2. Thêm món
3. Nhập mã khuyến mãi: `TEST10`
4. Click "Áp dụng"
5. ✅ Kiểm tra:
   - [ ] Khuyến mãi được áp dụng
   - [ ] Số tiền giảm hiển thị đúng
   - [ ] Tổng tiền được tính lại

---

## 💼 **BƯỚC 8: SHIFT MANAGEMENT (4 phút)**

### **Mở Ca:**
1. Vào Manager Dashboard
2. Tìm phần "Quản lý Ca"
3. Click "Mở ca"
4. Nhập tiền đầu ca: `1000000`
5. Click "Xác nhận"
6. ✅ Kiểm tra: Ca được mở thành công

### **Đóng Ca:**
1. Click "Đóng ca"
2. ✅ Kiểm tra:
   - [ ] Hiển thị báo cáo ca
   - [ ] Có tổng doanh thu
   - [ ] Có thể in báo cáo

---

## 🔄 **BƯỚC 9: REAL-TIME UPDATES (2 phút)**

### **Test Real-time:**
1. Mở 2 browser:
   - Browser 1: POS
   - Browser 2: POS (hoặc Kitchen)
2. Trong Browser 1: Tạo đơn cho bàn 2
3. ✅ Kiểm tra Browser 2:
   - [ ] Bàn 2 cập nhật ngay lập tức
   - [ ] Không cần refresh

---

## ✅ **BƯỚC 10: TỔNG KẾT (2 phút)**

### **Kiểm Tra Lại:**
- [ ] Tất cả chức năng chính hoạt động
- [ ] Không có lỗi nghiêm trọng trong console
- [ ] Real-time updates hoạt động
- [ ] Export hoạt động

### **Nếu Có Lỗi:**
1. Ghi lại lỗi
2. Chụp screenshot
3. Xem chi tiết trong file `HUONG_DAN_TEST_TOAN_BO_HE_THONG.md`

---

## 🎯 **KẾT QUẢ**

**Tổng thời gian:** _______ phút

**Kết quả:**
- ✅ **PASS** - Tất cả test đã pass
- ⚠️ **PASS với lỗi nhỏ** - Có lỗi nhỏ không ảnh hưởng
- ❌ **FAIL** - Có lỗi nghiêm trọng

**Ghi chú:**
_________________________________
_________________________________

---

## 📝 **CHECKLIST NHANH**

- [ ] Authentication hoạt động
- [ ] POS tạo đơn được
- [ ] Kitchen hiển thị món
- [ ] Thanh toán thành công
- [ ] Reports hiển thị đúng
- [ ] Export hoạt động
- [ ] Promotion hoạt động
- [ ] Shift management hoạt động
- [ ] Real-time updates hoạt động

---

**🎉 Nếu tất cả đều ✅ → Hệ thống hoạt động tốt!**

**📚 Để test chi tiết hơn, xem:** `HUONG_DAN_TEST_TOAN_BO_HE_THONG.md`

