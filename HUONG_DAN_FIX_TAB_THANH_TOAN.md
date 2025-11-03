# 🔧 Hướng Dẫn Fix Tab "Thanh toán" Hiển Thị 0 ₫

## 🐛 **VẤN ĐỀ**

Tab "Thanh toán" trong modal "Báo cáo ca làm việc" hiển thị tất cả các phương thức thanh toán (Tiền mặt, Thẻ, Online) là **0 ₫**, trong khi có đơn hàng đã thanh toán.

---

## 🔍 **NGUYÊN NHÂN**

Function `fn_aggregate_shift()` trong database có thể:
1. ✅ Đã sử dụng đúng column name `payment_method_code`
2. ❌ Nhưng logic tính toán có vấn đề
3. ❌ Hoặc payment data chưa được lưu vào `payment_transaction` table

---

## ✅ **GIẢI PHÁP**

### **Bước 1: Fix Function fn_aggregate_shift()**

Chạy script để cập nhật function với logic đúng:

```powershell
cd backend
node fix-shift-payment-aggregation.cjs
```

Script này sẽ:
- ✅ Drop và recreate function `fn_aggregate_shift()`
- ✅ Sử dụng đúng column `payment_method_code`
- ✅ Hỗ trợ tất cả payment methods: CASH, CARD, TRANSFER, ONLINE, PAYOS, QR_BANK, MOMO, ZALOPAY, etc.

---

### **Bước 2: Recalculate Payment Amounts cho Shift #47**

Sau khi fix function, tính lại payment amounts cho shift cụ thể:

```powershell
cd backend
node recalculate-shift-payments.cjs 47
```

Hoặc để tính lại nhiều shifts:

```powershell
node recalculate-shift-payments.cjs 47
node recalculate-shift-payments.cjs 48
node recalculate-shift-payments.cjs 49
```

---

## 🔍 **KIỂM TRA**

### **1. Kiểm tra Payment Transactions:**

```sql
SELECT 
  pt.order_id,
  pt.payment_method_code,
  pt.amount,
  pt.status,
  dh.ca_lam_id,
  dh.trang_thai
FROM payment_transaction pt
JOIN don_hang dh ON dh.id = pt.order_id
WHERE dh.ca_lam_id = 47
  AND pt.status = 'PAID';
```

### **2. Kiểm tra Function:**

```sql
SELECT fn_aggregate_shift(47);
```

Kết quả phải có:
- `cash_amount` > 0 (nếu có thanh toán tiền mặt)
- `card_amount` > 0 (nếu có thanh toán thẻ)
- `online_amount` > 0 (nếu có thanh toán online)

### **3. Kiểm tra Shift Data:**

```sql
SELECT 
  id,
  cash_amount,
  card_amount,
  online_amount,
  total_orders
FROM ca_lam
WHERE id = 47;
```

---

## ⚠️ **TRƯỜNG HỢP ĐẶC BIỆT**

### **Nếu Payment Data không có trong `payment_transaction`:**

Có thể hệ thống đang lưu payment ở bảng khác (ví dụ: `hoa_don`, `order_payment`). Trong trường hợp này, cần:

1. **Kiểm tra bảng lưu payment:**
   ```sql
   -- Kiểm tra hoa_don
   SELECT * FROM hoa_don WHERE don_hang_id IN (
     SELECT id FROM don_hang WHERE ca_lam_id = 47
   );
   
   -- Kiểm tra order_payment
   SELECT * FROM order_payment WHERE order_id IN (
     SELECT id FROM don_hang WHERE ca_lam_id = 47
   );
   ```

2. **Update function để dùng bảng đúng:**
   - Nếu dùng `hoa_don`: sửa function để JOIN với `hoa_don` và lấy `phuong_thuc_thanh_toan`
   - Nếu dùng `order_payment`: sửa function để JOIN với `order_payment` và lấy `method_code`

---

## 🎯 **SAU KHI FIX**

1. ✅ Refresh lại modal "Báo cáo ca làm việc"
2. ✅ Tab "Thanh toán" sẽ hiển thị đúng số tiền theo từng phương thức
3. ✅ Nếu vẫn 0 ₫, kiểm tra lại payment data trong database

---

## 📝 **LƯU Ý**

- Function `fn_aggregate_shift()` chỉ tính **đơn đã PAID** (`trang_thai = 'PAID'`)
- Function chỉ tính payment có `status = 'PAID'` trong `payment_transaction`
- Nếu đơn hàng chưa có payment transaction, sẽ không được tính

---

**Chúc bạn fix thành công!** 🎯

