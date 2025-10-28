# ✅ CHECKLIST TEST HỆ THỐNG QUẢN LÝ KHO

## 🎯 Mục tiêu
Test toàn bộ tính năng Quản lý Kho để đảm bảo hoạt động đúng trước khi đưa vào production.

---

## 📋 Checklist Test

### 1️⃣ Chuẩn bị môi trường

- [ ] Backend đang chạy (`cd backend && npm start`)
- [ ] Frontend đang chạy (`cd frontend && npm run dev`)
- [ ] Database có dữ liệu nguyên liệu (bảng `nguyen_lieu`)
- [ ] Có tài khoản Manager hoặc Admin để test

**Command kiểm tra:**
```bash
# Terminal 1: Backend
cd d:/my-thesis/backend
npm start
# → Should see: Server running on port 3000

# Terminal 2: Frontend
cd d:/my-thesis/frontend
npm run dev
# → Should see: Local: http://localhost:5173/
```

---

### 2️⃣ Test Navigation (Điều hướng)

- [ ] Đăng nhập với tài khoản Manager/Admin
- [ ] Vào trang Manager Dashboard (`/manager`)
- [ ] Thấy nút "📦 Quản lý Kho" ở góc dưới bên trái (màu tím)
- [ ] Click nút → Chuyển đến `/inventory`
- [ ] Trang load thành công, không có lỗi console

**Expected:**
- URL changes to: `http://localhost:5173/inventory`
- Page title: "📦 Quản lý Kho"
- 4 tabs hiển thị: Tồn kho | Cảnh báo | Lịch sử xuất | Lịch sử nhập

---

### 3️⃣ Test Tab "📊 Tồn kho"

#### A. Load dữ liệu
- [ ] Tab "📊 Tồn kho" active by default
- [ ] Loading spinner hiện ra
- [ ] Bảng hiển thị danh sách nguyên liệu
- [ ] Các cột: Mã | Tên | Tồn kho | Đơn vị | Giá nhập | Giá trị tồn

**Expected:**
- Ít nhất 1 dòng dữ liệu (nếu có trong database)
- Số liệu hiển thị đúng format (tiền tệ có dấu phẩy)

#### B. Search (Tìm kiếm)
- [ ] Gõ từ khóa vào ô "🔍 Tìm kiếm..."
- [ ] Kết quả lọc real-time (không cần nhấn Enter)
- [ ] Tìm theo tên nguyên liệu → OK
- [ ] Tìm theo mã nguyên liệu → OK
- [ ] Xóa từ khóa → Hiển thị lại toàn bộ

**Test cases:**
```
1. Search "cà phê" → Should show items containing "cà phê"
2. Search "NL_" → Should show items with code starting "NL_"
3. Search "xyz123" → Should show "Không có dữ liệu"
4. Clear search → Show all items again
```

#### C. Refresh
- [ ] Click nút "🔄 Làm mới"
- [ ] Loading spinner hiện ra
- [ ] Dữ liệu reload thành công

---

### 4️⃣ Test Tab "⚠️ Cảnh báo"

#### A. Load dashboard
- [ ] Click tab "⚠️ Cảnh báo"
- [ ] 4 cards thống kê hiển thị:
  - Tổng số (màu xám)
  - Hết hàng (màu đỏ)
  - Sắp hết (màu vàng)
  - Đủ hàng (màu xanh)
- [ ] Số liệu trong cards đúng

**Expected:**
- Tổng số = Hết hàng + Sắp hết + Đủ hàng

#### B. Bảng cảnh báo
- [ ] Bảng hiển thị danh sách nguyên liệu
- [ ] Cột "Trạng thái" có badge màu:
  - 🔴 HẾT HÀNG
  - ⚠️ SẮP HẾT
  - ✅ ĐỦ
- [ ] Sắp xếp: Hết hàng → Sắp hết → Đủ
- [ ] Cột "Làm được (ly)" hiển thị số ước tính

#### C. Refresh
- [ ] Click "🔄 Làm mới"
- [ ] Dashboard và bảng reload đúng

---

### 5️⃣ Test Tab "📤 Lịch sử xuất"

#### A. Load dữ liệu
- [ ] Click tab "📤 Lịch sử xuất"
- [ ] Bảng hiển thị lịch sử (nếu có)
- [ ] Các cột: Thời gian | Nguyên liệu | Số lượng | Đơn hàng | Giá trị | Ghi chú

**Expected:**
- Số lượng có dấu `-` và màu đỏ
- Đơn hàng hiển thị badge "ĐH #123"

#### B. Filter theo ngày
- [ ] Chọn "Từ ngày" (VD: 01/10/2025)
- [ ] Chọn "Đến ngày" (VD: 31/10/2025)
- [ ] Click nút "🔍 Lọc"
- [ ] Kết quả chỉ hiển thị trong khoảng đã chọn

**Test cases:**
```
1. Select last 7 days → Show recent exports
2. Select future dates → Show empty or no data
3. Select very old dates → Show old exports (if any)
```

#### C. Search
- [ ] Gõ tên nguyên liệu → Lọc đúng
- [ ] Gõ số đơn hàng (VD: "156") → Lọc đúng
- [ ] Kết hợp filter ngày + search → OK

---

### 6️⃣ Test Tab "📥 Lịch sử nhập"

#### A. Load dữ liệu
- [ ] Click tab "📥 Lịch sử nhập"
- [ ] Bảng hiển thị lịch sử nhập (nếu có)
- [ ] Các cột: Thời gian | Nguyên liệu | Số lượng | Đơn giá | Thành tiền | NCC | Ghi chú

**Expected:**
- Số lượng có dấu `+` và màu xanh

#### B. Filter theo ngày
- [ ] Chọn "Từ ngày" và "Đến ngày"
- [ ] Click "🔍 Lọc"
- [ ] Kết quả đúng theo khoảng thời gian

#### C. Search
- [ ] Tìm theo tên nguyên liệu → OK
- [ ] Tìm theo nhà cung cấp → OK

---

### 7️⃣ Test Form Nhập Kho ⭐ (QUAN TRỌNG)

#### A. Mở form
- [ ] Ở tab "📥 Lịch sử nhập"
- [ ] Click nút "➕ Nhập kho" (màu xanh, góc phải)
- [ ] Modal popup hiện ra với title "📥 Nhập kho mới"
- [ ] Form có 5 fields:
  1. Nguyên liệu (dropdown) *
  2. Số lượng *
  3. Đơn giá (VNĐ) *
  4. Nhà cung cấp
  5. Ghi chú

**Expected:**
- Dropdown "Nguyên liệu" load danh sách (từ tab Tồn kho)
- Required fields có dấu `*`

#### B. Validation
- [ ] Submit form rỗng → Browser validation hiện lỗi
- [ ] Chỉ chọn nguyên liệu, không điền số lượng → Lỗi
- [ ] Điền số lượng âm → Lỗi (HTML input validation)
- [ ] Điền đơn giá = 0 → Lỗi

**Test cases:**
```
❌ Empty form → "Please fill out this field"
❌ Ingredient only → "Please fill out this field" (quantity)
❌ Quantity = -10 → Browser validation error
❌ Price = 0 → Should not allow (step="1" validation)
```

#### C. Submit thành công
- [ ] Chọn nguyên liệu: "Cà phê đen"
- [ ] Số lượng: `10`
- [ ] Đơn giá: `100000`
- [ ] Nhà cung cấp: `Công ty ABC`
- [ ] Ghi chú: `Test nhập kho`
- [ ] Click "✅ Xác nhận nhập"
- [ ] Alert hiện ra: "✅ Nhập kho thành công!"
- [ ] Form tự động đóng
- [ ] Bảng lịch sử nhập reload và có bản ghi mới

**Expected backend behavior:**
1. POST `/api/v1/inventory/import` with payload
2. Database: INSERT vào `nhap_kho`
3. Database: UPDATE `nguyen_lieu` SET `ton_kho` += 10
4. Response: { ok: true, data: {...} }

#### D. Verify cập nhật
- [ ] Quay lại tab "📊 Tồn kho"
- [ ] Tìm nguyên liệu vừa nhập
- [ ] Tồn kho tăng đúng số lượng (cũ + 10)

**Example:**
```
Before: Cà phê đen - Tồn kho: 5 kg
After:  Cà phê đen - Tồn kho: 15 kg (✅ Tăng 10 kg)
```

#### E. Kiểm tra database (Optional)
```sql
-- Check nhap_kho table
SELECT * FROM nhap_kho ORDER BY ngay_nhap DESC LIMIT 1;

-- Check nguyen_lieu stock updated
SELECT ma, ten, ton_kho FROM nguyen_lieu WHERE ten LIKE '%Cà phê đen%';
```

---

### 8️⃣ Test Responsive Design

#### A. Desktop (>1024px)
- [ ] Layout đầy đủ, không scroll ngang
- [ ] Tabs nằm ngang
- [ ] Bảng hiển thị full width
- [ ] Form modal ở giữa màn hình

#### B. Tablet (768px - 1024px)
- [ ] Tabs có thể xuống dòng
- [ ] Bảng có scroll ngang nếu cần
- [ ] Form modal vẫn ở giữa

#### C. Mobile (<768px)
- [ ] Header responsive
- [ ] Tabs stack vertically hoặc scroll
- [ ] Bảng scroll ngang
- [ ] Form modal chiếm full screen
- [ ] Nút "← Quay lại Dashboard" vẫn visible

**Test với Chrome DevTools:**
```
1. F12 → Toggle device toolbar
2. Test iPhone SE (375px)
3. Test iPad (768px)
4. Test Desktop (1920px)
```

---

### 9️⃣ Test Error Handling

#### A. Backend offline
- [ ] Stop backend server
- [ ] Reload trang Inventory
- [ ] Thấy error message trong console
- [ ] UI không crash, hiển thị empty state

**Expected:**
- Console: "Failed to fetch" or similar
- Table: "Không có dữ liệu" hoặc error message

#### B. Invalid API response
- [ ] (Advanced) Mock API trả về lỗi 500
- [ ] UI hiển thị error gracefully
- [ ] Không crash toàn bộ app

#### C. Network timeout
- [ ] (Advanced) Simulate slow network
- [ ] Loading spinner hiển thị lâu hơn
- [ ] Eventually loads or shows error

---

### 🔟 Test Permissions

#### A. Manager/Admin access
- [ ] Login as Manager → ✅ Truy cập được `/inventory`
- [ ] Login as Admin → ✅ Truy cập được `/inventory`

#### B. Unauthorized access
- [ ] Login as Cashier → 🚫 Không thấy nút "Quản lý Kho"
- [ ] Truy cập trực tiếp `/inventory` → 🚫 Redirect hoặc 403

**Test:**
```
1. Logout
2. Login as cashier (if exists)
3. Try to access http://localhost:5173/inventory
4. Should be blocked by RoleGuard
```

---

### 1️⃣1️⃣ Test Performance

#### A. Load time
- [ ] First load < 2 seconds
- [ ] Tab switch < 500ms
- [ ] Search typing no lag

#### B. Large dataset
- [ ] (If possible) Test với 100+ nguyên liệu
- [ ] Pagination or virtual scrolling works
- [ ] Search still fast

#### C. Memory usage
- [ ] Open Chrome Task Manager
- [ ] Memory usage reasonable (<100MB)
- [ ] No memory leaks after multiple tab switches

---

### 1️⃣2️⃣ Test Integration với hệ thống hiện có

#### A. Sau khi order PAID
- [ ] Tạo đơn hàng mới ở POS
- [ ] Thêm món vào đơn
- [ ] Checkout và thanh toán (chuyển PAID)
- [ ] Quay lại Inventory → Tab "📤 Lịch sử xuất"
- [ ] Thấy bản ghi xuất kho tự động với `don_hang_id`

**Expected:**
- Export record với:
  - Nguyên liệu được xuất
  - Số lượng đúng theo recipe
  - Đơn hàng ID đúng
  - Thời gian = thời gian PAID

#### B. Manager Dashboard integration
- [ ] Từ Inventory, click "← Quay lại Dashboard"
- [ ] Về Manager Dashboard đúng
- [ ] Click lại "📦 Quản lý Kho" → Vào Inventory đúng

---

### 1️⃣3️⃣ Test Edge Cases

#### A. Empty database
- [ ] Database không có nguyên liệu
- [ ] Tab Tồn kho: "Không có dữ liệu"
- [ ] Form nhập: Dropdown rỗng hoặc message

#### B. Very long text
- [ ] Nguyên liệu có tên dài > 50 ký tự
- [ ] Table cell không vỡ layout
- [ ] Text truncate hoặc wrap đúng

#### C. Special characters
- [ ] Nhà cung cấp: "Công ty ABC & XYZ (Việt Nam)"
- [ ] Ghi chú: "Test với @#$%^&*()"
- [ ] Submit thành công, không lỗi SQL injection

#### D. Very large numbers
- [ ] Số lượng: 999999999
- [ ] Đơn giá: 999999999
- [ ] Thành tiền tính đúng, format đẹp

---

## 📊 Test Summary Report

Sau khi test xong, điền kết quả:

```
Total tests: ____ / 100+
Passed: ____
Failed: ____
Blocked: ____

Critical issues: ____
Minor issues: ____
```

---

## 🐛 Bug Report Template

Nếu tìm thấy lỗi, ghi lại theo format:

```markdown
### Bug #X: [Tiêu đề ngắn gọn]

**Severity:** Critical / Major / Minor
**Component:** Frontend / Backend / Database
**Steps to reproduce:**
1. ...
2. ...
3. ...

**Expected:** ...
**Actual:** ...
**Screenshot:** [Attach if possible]
**Console logs:** [Copy error messages]

**Environment:**
- OS: Windows / Mac / Linux
- Browser: Chrome / Firefox / Safari
- Screen size: Desktop / Mobile
```

---

## ✅ Sign-off

Sau khi test xong và không có lỗi critical:

- [ ] All critical features work
- [ ] No blocking bugs
- [ ] Documentation is clear
- [ ] Performance is acceptable

**Tested by:** ______________
**Date:** ______________
**Status:** ✅ Approved / ❌ Need fixes

---

## 🚀 Ready for Production

Nếu tất cả tests pass:

```bash
# Deploy to production
git add .
git commit -m "feat: Add Inventory Management System"
git push origin master

# Tag version
git tag v1.1.0-inventory
git push origin v1.1.0-inventory
```

---

**Happy Testing! 🎉**
