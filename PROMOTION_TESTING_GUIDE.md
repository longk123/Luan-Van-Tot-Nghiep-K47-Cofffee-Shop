# 🧪 Hướng dẫn Test Chức năng Quản lý Khuyến mãi

**Ngày:** 2025-01-26  
**Mục đích:** Kiểm tra toàn diện các tính năng quản lý khuyến mãi đã được phát triển

---

## 📋 Checklist Test Tổng quan

### ✅ Phase 1: Kiểm tra Cơ bản
- [ ] Truy cập trang quản lý khuyến mãi
- [ ] Kiểm tra UI hiển thị đúng
- [ ] Kiểm tra các summary cards
- [ ] Kiểm tra bộ lọc hoạt động

### ✅ Phase 2: CRUD Operations
- [ ] Tạo khuyến mãi mới (PERCENT)
- [ ] Tạo khuyến mãi mới (AMOUNT)
- [ ] Sửa khuyến mãi
- [ ] Xóa khuyến mãi
- [ ] Bật/Tắt khuyến mãi

### ✅ Phase 3: Validation & Edge Cases
- [ ] Test validation các trường bắt buộc
- [ ] Test validation PERCENT (0-100)
- [ ] Test validation AMOUNT (>= 0)
- [ ] Test unique code
- [ ] Test date ranges

### ✅ Phase 4: Chi tiết & Thống kê
- [ ] Xem chi tiết khuyến mãi
- [ ] Kiểm tra tab Thống kê
- [ ] Kiểm tra tab Lịch sử

### ✅ Phase 5: Integration với POS
- [ ] Áp dụng khuyến mãi trong POS
- [ ] Test stackable vs non-stackable
- [ ] Test điều kiện áp dụng

---

## 🔍 Chi tiết Test Cases

### 1. Truy cập và UI

#### Test 1.1: Truy cập trang
**Bước:**
1. Đăng nhập với tài khoản manager hoặc admin
2. Vào Manager Dashboard
3. Click nút "Quản lý Khuyến mãi"

**Kết quả mong đợi:**
- ✅ URL chuyển sang `/promotion-management`
- ✅ Trang hiển thị đúng với header "Quản lý Khuyến mãi"
- ✅ Có 4 summary cards ở trên cùng
- ✅ Có bộ lọc (search, status, type, date range)
- ✅ Có bảng danh sách khuyến mãi
- ✅ Có nút "Thêm khuyến mãi"

**Nếu lỗi:**
- ❌ Kiểm tra route trong `main.jsx`
- ❌ Kiểm tra component `PromotionManagement.jsx` có tồn tại
- ❌ Kiểm tra authentication/authorization

---

#### Test 1.2: Summary Cards
**Bước:**
1. Xem 4 cards ở đầu trang

**Kết quả mong đợi:**
- ✅ Card 1: "Tổng số CTKM đang active" (số liệu đúng)
- ✅ Card 2: "Số CTKM đã dùng hôm nay" (số liệu đúng)
- ✅ Card 3: "Tổng tiền giảm hôm nay" (format VND)
- ✅ Card 4: "Số CTKM sắp hết hạn" (trong 7 ngày)

**Nếu lỗi:**
- ❌ Kiểm tra API `GET /api/v1/promotions/summary`
- ❌ Kiểm tra format currency

---

#### Test 1.3: Bộ lọc
**Bước:**
1. Test từng bộ lọc một:
   - Search: Nhập mã hoặc tên KM
   - Status: Chọn Active/Inactive/All
   - Type: Chọn PERCENT/AMOUNT/All
   - Date range: Chọn khoảng thời gian

**Kết quả mong đợi:**
- ✅ Bảng tự động cập nhật khi thay đổi filter
- ✅ Kết quả lọc đúng
- ✅ Reset filters hoạt động

**Nếu lỗi:**
- ❌ Kiểm tra logic filter trong frontend
- ❌ Kiểm tra API query parameters

---

### 2. Tạo Khuyến mãi

#### Test 2.1: Tạo PERCENT khuyến mãi cơ bản
**Bước:**
1. Click nút "Thêm khuyến mãi"
2. Điền form:
   - **Mã:** `TEST10` (hoặc để trống để auto-generate)
   - **Tên:** "Test giảm 10%"
   - **Mô tả:** "Chương trình test"
   - **Loại:** PERCENT
   - **Giá trị:** `10`
   - **Giới hạn tối đa:** `30000`
   - **Trạng thái:** Active (checked)
   - **Có thể cộng dồn:** Checked
3. Click "Lưu"

**Kết quả mong đợi:**
- ✅ Modal đóng lại
- ✅ Khuyến mãi xuất hiện trong danh sách
- ✅ Toast notification thành công
- ✅ Preview trong form hiển thị đúng: "Giảm 10% tối đa 30.000đ"

**Nếu lỗi:**
- ❌ Kiểm tra API `POST /api/v1/promotions`
- ❌ Kiểm tra validation backend
- ❌ Kiểm tra console errors

---

#### Test 2.2: Tạo AMOUNT khuyến mãi
**Bước:**
1. Click "Thêm khuyến mãi"
2. Điền form:
   - **Mã:** `TEST20K`
   - **Tên:** "Test giảm 20k"
   - **Loại:** AMOUNT
   - **Giá trị:** `20000`
   - **Tổng đơn tối thiểu:** `100000`
   - **Trạng thái:** Active
3. Click "Lưu"

**Kết quả mong đợi:**
- ✅ Tạo thành công
- ✅ Preview: "Giảm 20.000đ cho đơn từ 100.000đ"
- ✅ `max_giam` field bị ẩn (chỉ hiển thị với PERCENT)

---

#### Test 2.3: Tạo khuyến mãi với điều kiện
**Bước:**
1. Tạo KM với các điều kiện:
   - **Tổng đơn tối thiểu:** `150000`
   - **Số món tối thiểu:** `3`
   - **Ngày bắt đầu:** Hôm nay
   - **Ngày kết thúc:** 7 ngày sau
   - **Giới hạn sử dụng:** `100`

**Kết quả mong đợi:**
- ✅ Tạo thành công
- ✅ Trong detail modal, tab Thông tin hiển thị đúng điều kiện
- ✅ KM chỉ áp dụng được khi đơn >= 150k và có >= 3 món

---

### 3. Validation

#### Test 3.1: Validation trường bắt buộc
**Bước:**
1. Click "Thêm khuyến mãi"
2. Để trống **Tên**, **Loại**, **Giá trị**
3. Click "Lưu"

**Kết quả mong đợi:**
- ❌ Hiển thị lỗi: "Tên là bắt buộc"
- ❌ Hiển thị lỗi: "Loại là bắt buộc"
- ❌ Hiển thị lỗi: "Giá trị là bắt buộc"
- ❌ Không cho submit

---

#### Test 3.2: Validation PERCENT (0-100)
**Bước:**
1. Tạo KM PERCENT với:
   - Giá trị = `-5` → ❌ Lỗi: "Giá trị phải >= 0"
   - Giá trị = `101` → ❌ Lỗi: "Giá trị PERCENT phải <= 100"
   - Giá trị = `50` → ✅ OK

---

#### Test 3.3: Validation AMOUNT (>= 0)
**Bước:**
1. Tạo KM AMOUNT với:
   - Giá trị = `-1000` → ❌ Lỗi: "Giá trị phải >= 0"
   - Giá trị = `50000` → ✅ OK

---

#### Test 3.4: Validation Unique Code
**Bước:**
1. Tạo KM với mã `UNIQUE123`
2. Tạo KM khác với cùng mã `UNIQUE123`

**Kết quả mong đợi:**
- ❌ Lỗi: "Mã khuyến mãi đã tồn tại"
- ❌ Không cho tạo

---

#### Test 3.5: Validation Date Range
**Bước:**
1. Tạo KM với:
   - Ngày bắt đầu: 10/01/2025
   - Ngày kết thúc: 05/01/2025 (trước ngày bắt đầu)

**Kết quả mong đợi:**
- ❌ Lỗi: "Ngày kết thúc phải sau ngày bắt đầu"

---

### 4. Sửa Khuyến mãi

#### Test 4.1: Sửa thông tin cơ bản
**Bước:**
1. Trong danh sách, click icon "Sửa" (pencil) của một KM
2. Sửa **Tên**: "Tên mới"
3. Sửa **Giá trị**: `15` (từ 10)
4. Click "Lưu"

**Kết quả mong đợi:**
- ✅ Modal đóng
- ✅ Danh sách cập nhật với tên và giá trị mới
- ✅ Toast notification thành công

---

#### Test 4.2: Sửa và validation
**Bước:**
1. Sửa một KM
2. Đổi **Giá trị** thành giá trị không hợp lệ (VD: -10)
3. Click "Lưu"

**Kết quả mong đợi:**
- ❌ Validation error
- ❌ Không cho lưu

---

### 5. Xóa Khuyến mãi

#### Test 5.1: Xóa khuyến mãi
**Bước:**
1. Trong danh sách, click icon "Xóa" (trash) của một KM
2. Confirm trong dialog

**Kết quả mong đợi:**
- ✅ Dialog xác nhận hiển thị
- ✅ Sau khi confirm, KM biến mất khỏi danh sách
- ✅ Toast notification thành công

---

#### Test 5.2: Hủy xóa
**Bước:**
1. Click "Xóa"
2. Click "Hủy" trong dialog

**Kết quả mong đợi:**
- ✅ Dialog đóng
- ✅ KM vẫn còn trong danh sách

---

### 6. Bật/Tắt Khuyến mãi

#### Test 6.1: Tắt khuyến mãi
**Bước:**
1. Trong danh sách, tìm một KM đang Active
2. Click switch/toggle để tắt
3. Confirm (nếu có)

**Kết quả mong đợi:**
- ✅ Status chuyển sang Inactive
- ✅ Badge trong bảng chuyển màu (xám)
- ✅ KM không còn hiển thị trong POS (khi test tích hợp)

---

#### Test 6.2: Bật lại khuyến mãi
**Bước:**
1. Tìm KM đang Inactive
2. Click switch để bật lại

**Kết quả mong đợi:**
- ✅ Status chuyển sang Active
- ✅ Badge chuyển màu xanh
- ✅ KM có thể áp dụng trong POS

---

### 7. Chi tiết Khuyến mãi

#### Test 7.1: Tab Thông tin
**Bước:**
1. Click icon "Xem" (eye) của một KM
2. Xem tab "Thông tin"

**Kết quả mong đợi:**
- ✅ Modal hiển thị với 3 tabs
- ✅ Tab "Thông tin" hiển thị đầy đủ:
  - Mã, Tên, Mô tả
  - Loại, Giá trị, Max giảm
  - Điều kiện
  - Thời gian hiệu lực
  - Trạng thái, Stackable, Usage limit
- ✅ Có nút "Sửa" và "Xóa"

---

#### Test 7.2: Tab Thống kê
**Bước:**
1. Vào detail modal
2. Click tab "Thống kê"

**Kết quả mong đợi:**
- ✅ Hiển thị summary cards:
  - Tổng số lần sử dụng
  - Tổng tiền giảm
  - Trung bình giảm/đơn
- ✅ Có biểu đồ (nếu có dữ liệu)
- ✅ Có top orders sử dụng KM

**Nếu lỗi:**
- ❌ Kiểm tra API `GET /api/v1/promotions/:id/stats`
- ❌ Kiểm tra component `PromotionStats` hoặc tương tự

---

#### Test 7.3: Tab Lịch sử
**Bước:**
1. Vào detail modal
2. Click tab "Lịch sử"

**Kết quả mong đợi:**
- ✅ Hiển thị bảng lịch sử:
  - Mã đơn
  - Ngày giờ
  - Số tiền giảm
  - Nhân viên áp dụng
- ✅ Có pagination (nếu nhiều records)
- ✅ Click vào đơn có thể xem chi tiết (nếu có)

---

### 8. Tích hợp với POS

#### Test 8.1: Áp dụng khuyến mãi trong POS
**Bước:**
1. Mở POS (Dashboard cashier)
2. Tạo đơn mới hoặc mở đơn đang có
3. Thêm món vào đơn
4. Trong phần thanh toán, tìm input "Mã khuyến mãi" hoặc nút áp dụng KM
5. Nhập mã KM đã tạo (VD: `TEST10`)
6. Áp dụng

**Kết quả mong đợi:**
- ✅ KM được áp dụng thành công
- ✅ Số tiền giảm được tính đúng
- ✅ Tổng tiền cuối cùng được cập nhật
- ✅ KM hiển thị trong danh sách KM đã áp dụng

---

#### Test 8.2: Test stackable
**Bước:**
1. Tạo 2 KM:
   - KM1: `STACK1` - stackable = true
   - KM2: `STACK2` - stackable = true
2. Trong POS, áp dụng cả 2 KM cho cùng 1 đơn

**Kết quả mong đợi:**
- ✅ Cả 2 KM đều áp dụng được
- ✅ Tổng tiền giảm = tổng của 2 KM

---

#### Test 8.3: Test non-stackable
**Bước:**
1. Tạo 2 KM:
   - KM1: `NOSTACK1` - stackable = false
   - KM2: `NOSTACK2` - stackable = false
2. Trong POS, áp dụng KM1
3. Cố gắng áp dụng KM2

**Kết quả mong đợi:**
- ❌ Lỗi: "Đơn đã có khuyến mãi không cộng dồn; không thể áp thêm"
- ❌ KM2 không được áp dụng

---

#### Test 8.4: Test điều kiện (min_subtotal)
**Bước:**
1. Tạo KM với min_subtotal = 100000
2. Trong POS, tạo đơn với tổng = 50000
3. Cố gắng áp dụng KM

**Kết quả mong đợi:**
- ❌ Lỗi: "Điều kiện không đạt — khuyến mãi không áp dụng được"
- ❌ Hoặc message rõ ràng hơn: "Đơn hàng phải >= 100.000đ"

---

#### Test 8.5: Test hết hạn
**Bước:**
1. Tạo KM với `ket_thuc` = hôm qua
2. Trong POS, cố gắng áp dụng

**Kết quả mong đợi:**
- ❌ Lỗi: "Mã khuyến mãi không hợp lệ hoặc đã hết hạn"

---

#### Test 8.6: Test đạt usage_limit
**Bước:**
1. Tạo KM với `usage_limit` = 5
2. Áp dụng KM này 5 lần trong các đơn khác nhau
3. Cố gắng áp dụng lần thứ 6

**Kết quả mong đợi:**
- ❌ Lỗi hoặc tự động tắt KM khi đạt giới hạn
- ❌ Hoặc message: "Khuyến mãi đã đạt giới hạn sử dụng"

---

### 9. Edge Cases & Performance

#### Test 9.1: Pagination
**Bước:**
1. Tạo nhiều KM (> 20)
2. Xem danh sách

**Kết quả mong đợi:**
- ✅ Phân trang hoạt động
- ✅ Có thể chuyển trang
- ✅ Hiển thị đúng số lượng per page

---

#### Test 9.2: Search với nhiều kết quả
**Bước:**
1. Nhập keyword vào search
2. Xem kết quả

**Kết quả mong đợi:**
- ✅ Kết quả filter đúng
- ✅ Không bị lag

---

#### Test 9.3: Date range filter
**Bước:**
1. Chọn date range filter
2. Xem danh sách

**Kết quả mong đợi:**
- ✅ Chỉ hiển thị KM trong khoảng thời gian đó
- ✅ Format date đúng

---

### 10. Security & Authorization

#### Test 10.1: Test với Cashier
**Bước:**
1. Đăng nhập với tài khoản cashier
2. Cố gắng truy cập `/promotion-management`

**Kết quả mong đợi:**
- ❌ Redirect hoặc 403 Forbidden
- ❌ Hoặc không thấy nút "Quản lý Khuyến mãi" trong Dashboard

---

#### Test 10.2: Test với Manager
**Bước:**
1. Đăng nhập với manager
2. Truy cập trang

**Kết quả mong đợi:**
- ✅ Có thể truy cập
- ✅ Có thể CRUD

---

## 🐛 Debug Checklist

Nếu gặp lỗi, kiểm tra theo thứ tự:

### Backend
1. ✅ Server đang chạy (`npm start` trong backend)
2. ✅ Database connection OK
3. ✅ Check console errors trong terminal backend
4. ✅ Test API trực tiếp bằng Postman/Thunder Client:
   ```bash
   GET http://localhost:5000/api/v1/promotions
   ```
5. ✅ Kiểm tra authentication token
6. ✅ Kiểm tra authorization (role)

### Frontend
1. ✅ Server đang chạy (`npm run dev` trong frontend)
2. ✅ Check browser console (F12)
3. ✅ Check Network tab (F12 → Network):
   - API calls có thành công? (status 200)
   - Response có đúng format?
4. ✅ Kiểm tra React DevTools:
   - State có đúng không?
   - Props có đúng không?

### Database
1. ✅ Kiểm tra bảng `khuyen_mai` có dữ liệu không:
   ```sql
   SELECT * FROM khuyen_mai LIMIT 10;
   ```
2. ✅ Kiểm tra `don_hang_khuyen_mai`:
   ```sql
   SELECT * FROM don_hang_khuyen_mai LIMIT 10;
   ```

---

## 📝 Test Report Template

Sau khi test, điền báo cáo:

```
=== TEST REPORT: Promotion Management ===
Date: [ngày test]
Tester: [tên bạn]
Environment: Development/Production

✅ PASSED:
- [List các test đã pass]

❌ FAILED:
- [List các test failed với mô tả lỗi]

⚠️ ISSUES FOUND:
- [List các vấn đề cần fix]

📝 NOTES:
- [Ghi chú thêm]
```

---

## 🎯 Test Priority

**Must Test (Ưu tiên cao):**
1. ✅ Tạo PERCENT khuyến mãi
2. ✅ Tạo AMOUNT khuyến mãi
3. ✅ Validation cơ bản
4. ✅ Áp dụng KM trong POS
5. ✅ Sửa/Xóa KM

**Should Test (Ưu tiên trung bình):**
1. ✅ Chi tiết & Thống kê
2. ✅ Bật/Tắt KM
3. ✅ Stackable logic

**Nice to Test (Ưu tiên thấp):**
1. ✅ Pagination
2. ✅ Export Excel
3. ✅ Advanced filters

---

**Lưu ý:** 
- Test từng phần một cách có hệ thống
- Ghi lại mọi lỗi để fix
- Test cả trên desktop và mobile (responsive)
- Test với nhiều trình duyệt khác nhau (Chrome, Firefox, Edge)

