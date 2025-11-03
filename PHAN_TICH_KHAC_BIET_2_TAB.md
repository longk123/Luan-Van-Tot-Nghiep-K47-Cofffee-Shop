# 🔍 Phân Tích Sự Khác Biệt Giữa Tab "Đơn Hàng" và "Tổng Quan"

## 📊 **2 QUERY KHÁC NHAU**

### **Tab "Đơn hàng" (`getCurrentShiftOrders`):**

**Filter:**
- Theo **thời gian** (`closed_at` trong khoảng ca)
- Lấy: PAID, OPEN, CANCELLED trong khoảng thời gian

**Tính toán:**
```sql
tong_tien = SUM(ct.so_luong * ct.don_gia - COALESCE(ct.giam_gia, 0))
```
- Tính **trực tiếp** từ `don_hang_chi_tiet`
- **KHÔNG** tính topping
- **KHÔNG** dùng view `v_order_settlement`

---

### **Tab "Tổng quan" (`fn_aggregate_shift`):**

**Filter:**
- Theo **`ca_lam_id`** (đơn thuộc ca)
- Chỉ lấy: PAID (đã thanh toán)

**Tính toán:**
```sql
gross_amount = SUM(settlement.subtotal_after_lines)
net_amount = SUM(settlement.grand_total)
```
- Dùng view **`v_order_settlement`**
- **CÓ** tính topping (nếu có)
- **CÓ** tính promotion và manual discount

---

## ⚠️ **VẤN ĐỀ CÓ THỂ XẢY RA**

### **1. Filter khác nhau:**
- Tab "Đơn hàng": Filter theo thời gian → Có thể lấy đơn không thuộc ca (`ca_lam_id` khác)
- Tab "Tổng quan": Filter theo `ca_lam_id` → Chỉ lấy đơn thuộc ca

### **2. Cách tính khác nhau:**
- Tab "Đơn hàng": Tính từ `don_hang_chi_tiet` trực tiếp (không có topping)
- Tab "Tổng quan": Dùng `v_order_settlement` (có topping)

### **3. Đơn bị tính 2 lần hoặc bỏ sót:**
- Đơn có `ca_lam_id = 8` nhưng `closed_at` ngoài khoảng thời gian ca
- Đơn không có `ca_lam_id` nhưng `closed_at` trong khoảng thời gian ca

---

## 🔧 **GIẢI PHÁP**

### **Option 1: Đồng bộ 2 query (Khuyến nghị)**

Sửa tab "Đơn hàng" để dùng cùng logic với tab "Tổng quan":

```javascript
// Thay vì:
COALESCE(SUM(ct.so_luong * ct.don_gia - COALESCE(ct.giam_gia, 0)), 0) AS tong_tien

// Dùng:
COALESCE(settlement.grand_total, 0) AS tong_tien
```

**Và filter:**
```sql
WHERE dh.ca_lam_id = $1 AND dh.trang_thai = 'PAID'
```

---

### **Option 2: Giữ nguyên nhưng hiển thị rõ**

- Tab "Đơn hàng": Hiển thị "Tổng tiền hàng" (chưa trừ promotion/manual)
- Tab "Tổng quan": Hiển thị "Doanh thu thuần" (sau tất cả discounts)

---

### **Option 3: Chạy script debug để xác định vấn đề**

Chạy:
```powershell
cd backend
node debug-shift-8-detail.cjs
```

Script sẽ hiển thị:
- ✅ Đơn nào có trong tab "Đơn hàng"
- ✅ Đơn nào có trong tab "Tổng quan"
- ✅ Chi tiết settlement của từng đơn
- ✅ Chênh lệch và nguyên nhân

---

## 📝 **KẾT LUẬN**

**Nguyên nhân chính:**
1. ✅ **Filter khác nhau:** Thời gian vs `ca_lam_id`
2. ✅ **Tính toán khác nhau:** Trực tiếp vs View `v_order_settlement`
3. ✅ **Có thể thiếu topping** trong tab "Đơn hàng"

**Giải pháp:** Đồng bộ 2 query để cùng dùng `v_order_settlement` và cùng filter theo `ca_lam_id`.

