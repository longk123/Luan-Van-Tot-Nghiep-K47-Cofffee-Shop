# 🔍 Giải Thích Chênh Lệch Tính Toán - Shift #8

## 📊 **VẤN ĐỀ**

Tab "Đơn hàng" hiển thị:
- Đơn #160: 75.000 ₫
- Đơn #159: 32.000 ₫
- **Tổng: 107.000 ₫**

Nhưng tab "Tổng quan" hiển thị:
- **Doanh thu gộp: 132.000 ₫**
- **Doanh thu thuần: 99.000 ₫**

---

## 🔎 **NGUYÊN NHÂN**

### **1. Logic Tính Toán Khác Nhau**

#### **Tab "Đơn hàng" (`getCurrentShiftOrders`):**
```sql
COALESCE(SUM(ct.so_luong * ct.don_gia - COALESCE(ct.giam_gia, 0)), 0) AS tong_tien
```
- Tính: **Subtotal sau khi trừ line discounts**
- CHƯA trừ: Promotion discount, Manual discount
- Lấy đơn: PAID, OPEN, CANCELLED (trong khoảng thời gian ca)

#### **Tab "Tổng quan" (`fn_aggregate_shift`):**
```sql
'gross_amount', COALESCE(SUM(settlement.subtotal_after_lines), 0)
'net_amount', COALESCE(SUM(settlement.grand_total), 0)
```
- `gross_amount`: **Subtotal sau line discounts**
- `net_amount`: **Grand total** (sau TẤT CẢ discounts)
- Lấy đơn: CHỈ đơn PAID thuộc ca (`ca_lam_id = shift_id`)

---

### **2. Các Trường Hợp Có Thể**

#### **Trường hợp 1: Có đơn khác không hiển thị**
- Có đơn PAID khác thuộc ca #8 nhưng không hiển thị trong tab "Đơn hàng"
- Có thể do filter logic khác nhau

#### **Trường hợp 2: Đơn được tính 2 lần**
- Đơn có thể được tính trong aggregate nhưng không hiển thị trong list

#### **Trường hợp 3: Timing Issue**
- `getCurrentShiftOrders` filter theo `closed_at` trong khoảng ca
- `fn_aggregate_shift` filter theo `ca_lam_id` và `trang_thai = 'PAID'`

---

## ✅ **GIẢI PHÁP**

### **Bước 1: Debug Chi Tiết**

Chạy script để xem chi tiết:

```powershell
cd backend
node debug-shift-8-calculations.cjs
```

Script này sẽ hiển thị:
1. ✅ Danh sách đơn từ `getCurrentShiftOrders`
2. ✅ Danh sách đơn từ aggregate (chỉ PAID)
3. ✅ So sánh từng đơn
4. ✅ Tổng cộng và chênh lệch

---

### **Bước 2: Fix Logic (Nếu Cần)**

Có 2 cách:

#### **Option A: Sửa Tab "Đơn hàng" để hiển thị `grand_total`**

Sửa `posRepository.getCurrentShiftOrders()` để dùng `v_order_settlement.grand_total`:

```javascript
// Thay đổi:
COALESCE(SUM(ct.so_luong * ct.don_gia - COALESCE(ct.giam_gia, 0)), 0) AS tong_tien

// Thành:
COALESCE(settlement.grand_total, 0) AS tong_tien
```

**Ưu điểm:** Tab "Đơn hàng" sẽ hiển thị số tiền cuối cùng (sau tất cả discounts)

**Nhược điểm:** Không thấy subtotal trước discount

---

#### **Option B: Sửa Function để chỉ tính đơn hiển thị**

Sửa `fn_aggregate_shift()` để filter giống `getCurrentShiftOrders()`:

```sql
-- Thay đổi filter:
WHERE dh.ca_lam_id = p_shift_id AND dh.trang_thai = 'PAID'

-- Thành:
WHERE (
  (dh.trang_thai = 'PAID' 
   AND dh.closed_at >= (SELECT started_at FROM ca_lam WHERE id = p_shift_id)
   AND dh.closed_at <= (SELECT COALESCE(ended_at, NOW()) FROM ca_lam WHERE id = p_shift_id))
)
```

**Nhược điểm:** Có thể không chính xác nếu đơn chuyển ca

---

#### **Option C: Hiển thị cả 2 giá trị**

Trong tab "Đơn hàng", hiển thị:
- `Tổng tiền` (subtotal)
- `Thành tiền` (grand_total)

---

## 🎯 **KHUYẾN NGHỊ**

**Nên chọn Option A** vì:
1. ✅ Tab "Đơn hàng" hiển thị số tiền thực tế khách trả (grand_total)
2. ✅ Khớp với "Doanh thu thuần" trong tab "Tổng quan"
3. ✅ Dễ hiểu hơn cho người dùng

---

## 📝 **LƯU Ý**

- "Doanh thu gộp" = Tổng subtotal (trước promotion/manual discount)
- "Doanh thu thuần" = Tổng grand_total (sau TẤT CẢ discounts)
- Tab "Đơn hàng" hiện tại = Subtotal (chưa trừ promotion/manual discount)

Để khớp, cần:
1. ✅ Sửa tab "Đơn hàng" hiển thị `grand_total`, HOẶC
2. ✅ Sửa "Doanh thu gộp" tính từ tab "Đơn hàng" hiện tại

---

**Chạy script debug trước để xác định chính xác vấn đề!** 🎯

