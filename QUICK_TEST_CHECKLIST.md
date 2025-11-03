# ⚡ Quick Test Checklist - Quản lý Khuyến mãi

## 🚀 Test Nhanh (15 phút)

### 1. Truy cập trang (2 phút)
- [ ] Đăng nhập manager/admin
- [ ] Vào Manager Dashboard
- [ ] Click "Quản lý Khuyến mãi"
- [ ] Kiểm tra URL: `/promotion-management`
- [ ] Kiểm tra 4 summary cards hiển thị số liệu

### 2. Tạo khuyến mãi PERCENT (3 phút)
- [ ] Click "Thêm khuyến mãi"
- [ ] Điền:
  - Mã: `TEST10`
  - Tên: "Test 10%"
  - Loại: **PERCENT**
  - Giá trị: `10`
  - Max giảm: `30000`
  - Active: ✅
- [ ] Click "Lưu"
- [ ] ✅ Kiểm tra xuất hiện trong danh sách

### 3. Tạo khuyến mãi AMOUNT (2 phút)
- [ ] Click "Thêm khuyến mãi"
- [ ] Điền:
  - Mã: `TEST20K`
  - Tên: "Test 20k"
  - Loại: **AMOUNT**
  - Giá trị: `20000`
  - Min subtotal: `100000`
- [ ] Click "Lưu"
- [ ] ✅ Kiểm tra xuất hiện trong danh sách

### 4. Test Validation (2 phút)
- [ ] Tạo KM với giá trị = `-5` → ❌ Phải có lỗi
- [ ] Tạo KM PERCENT với giá trị = `101` → ❌ Phải có lỗi
- [ ] Tạo KM với mã trùng → ❌ Phải có lỗi "Mã đã tồn tại"

### 5. Sửa khuyến mãi (1 phút)
- [ ] Click icon "Sửa" (pencil)
- [ ] Sửa tên thành "Tên mới"
- [ ] Click "Lưu"
- [ ] ✅ Kiểm tra cập nhật trong danh sách

### 6. Xem chi tiết (2 phút)
- [ ] Click icon "Xem" (eye)
- [ ] ✅ Tab "Thông tin" hiển thị đầy đủ
- [ ] Click tab "Thống kê" → ✅ Hiển thị stats
- [ ] Click tab "Lịch sử" → ✅ Hiển thị bảng

### 7. Bật/Tắt (1 phút)
- [ ] Toggle switch của một KM Active → ✅ Chuyển Inactive
- [ ] Toggle lại → ✅ Chuyển Active

### 8. Xóa (1 phút)
- [ ] Click icon "Xóa" (trash)
- [ ] Confirm
- [ ] ✅ KM biến mất

### 9. Test POS Integration (2 phút) ⭐ QUAN TRỌNG
- [ ] Mở Dashboard Cashier
- [ ] Tạo đơn mới
- [ ] Thêm món vào đơn
- [ ] Tìm input/nút áp dụng mã KM
- [ ] Nhập mã `TEST10`
- [ ] ✅ Kiểm tra KM được áp dụng
- [ ] ✅ Kiểm tra số tiền giảm tính đúng

---

## ❌ Nếu có lỗi - Kiểm tra ngay:

### Backend
```bash
# Terminal backend
npm start
# Kiểm tra console có lỗi không
```

### Frontend
```bash
# Terminal frontend  
npm run dev
# Mở browser F12 → Console
# Kiểm tra có lỗi JavaScript không
# F12 → Network → Xem API calls
```

### API Test thủ công
```bash
# Test API trực tiếp (dùng Postman hoặc curl)
GET http://localhost:5000/api/v1/promotions
Headers: Authorization: Bearer [your_token]
```

### Database
```sql
-- Kiểm tra dữ liệu
SELECT * FROM khuyen_mai ORDER BY id DESC LIMIT 5;
```

---

## ✅ Checklist hoàn thành

Sau khi test xong, đánh dấu:
- [ ] Tất cả test đã pass
- [ ] Không có lỗi console
- [ ] API calls thành công (200 OK)
- [ ] UI hiển thị đúng
- [ ] POS integration hoạt động
- [ ] Responsive OK (test trên mobile)

---

**🎉 Nếu tất cả đều pass → Chức năng đã sẵn sàng sử dụng!**

**🐛 Nếu có lỗi → Ghi lại lỗi và fix theo hướng dẫn trong `PROMOTION_TESTING_GUIDE.md`**

