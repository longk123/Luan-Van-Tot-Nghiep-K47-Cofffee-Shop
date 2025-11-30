# Giải thích lỗi hóa đơn và doanh thu

## ❌ Vấn đề 1: Thu ngân hiển thị sai trên hóa đơn

### Hiện trạng:
- Hóa đơn #286: Người tạo đơn = Phục vụ 01, Thu ngân = Phục vụ 01
- **Thực tế:** Waiter tạo đơn, nhưng Cashier thanh toán
- **Kết quả:** In hóa đơn lại hiển thị Waiter là thu ngân

### Nguyên nhân:
```javascript
// Backend: paymentsController.js line 209
created_by ?? null  // Nếu frontend không truyền created_by → lưu NULL

// View: v_invoice_header
thu_ngan = COALESCE(u_payer.full_name, u_creator.full_name)
// Nếu created_by = NULL → thu_ngan = người tạo đơn
```

### Dữ liệu trong database:
```sql
-- Đơn #286
don_hang.nhan_vien_id = 6 (Phục vụ 01)  ✅ Đúng
order_payment.created_by = NULL          ❌ SAI - phải là ID của cashier
```

### Giải pháp:

**Option 1: Frontend truyền created_by (KHUYẾN NGHỊ)**
```javascript
// Frontend khi thanh toán
const response = await api.post(`/api/v1/pos/orders/${orderId}/payments`, {
  method_code: 'CASH',
  amount: total,
  created_by: user.user_id,  // ← Thêm dòng này
  ca_lam_id: shiftId
});
```

**Option 2: Backend tự động lấy từ req.user**
```javascript
// Backend: paymentsController.js
const ins = await client.query(
  `INSERT INTO order_payment(..., created_by, ...)
   VALUES (..., $7, ...)`,
  [
    // ...
    created_by ?? req.user.user_id,  // ← Dùng req.user.user_id nếu không có
    // ...
  ]
);
```

---

## ❌ Vấn đề 2: Doanh thu ca #55 bị sai

### Hiện trạng:
- Doanh thu hiển thị: 1.126.000đ
- Doanh thu thực tế: 866.000đ
- Chênh lệch: +260.000đ (COD bị cộng thừa)

### Phân tích:
```
Doanh thu từ đơn:        866.000đ  ✅ (từ don_hang_chi_tiet)
COD shipper nộp:         252.000đ  ❌ (từ wallet_transactions)
─────────────────────────────────
fn_aggregate_shift:    1.118.000đ  ❌ Sai vì cộng COD
Thực tế hiển thị:      1.126.000đ  ❌ (có sai số nhỏ ~8.000đ)
```

### Nguyên nhân:
```sql
-- fn_aggregate_shift hiện tại
CREATE OR REPLACE FUNCTION fn_aggregate_shift(p_shift_id INT)
RETURNS JSON AS $$
DECLARE
  result JSON;
  cod_total INT;
BEGIN
  -- Tính COD từ wallet_transactions
  SELECT COALESCE(SUM(wt.amount), 0)::INT INTO cod_total
  FROM wallet_transactions wt
  WHERE wt.shift_id = p_shift_id
    AND wt.type = 'SETTLE';
  
  -- Tính doanh thu từ đơn hàng
  SELECT json_build_object(
    'net_amount', COALESCE(SUM(...), 0) + cod_total  -- ← ĐÂY LÀ VẤN ĐỀ!
    -- ...
  ) INTO result
  FROM don_hang dh
  WHERE dh.ca_lam_id = p_shift_id AND dh.trang_thai = 'PAID';
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;
```

### COD không phải là doanh thu:
- **Doanh thu:** Tiền bán hàng (từ đơn hàng)
- **COD:** Tiền shipper thu hộ và nộp lại (chỉ là dòng tiền mặt)

**Ví dụ:**
```
Đơn giao hàng #123:
- Tổng tiền đơn: 100.000đ → Doanh thu = 100.000đ ✅
- Khách trả tiền mặt cho shipper: 100.000đ (COD)
- Shipper nộp lại quán: 100.000đ (SETTLE)

Nếu cộng COD vào doanh thu → 100.000 + 100.000 = 200.000đ ❌ Tính 2 lần!
```

### Giải pháp:

**Sửa fn_aggregate_shift:**
```sql
-- COD chỉ tính vào cash_amount, KHÔNG tính vào net_amount
'cash_amount', COALESCE(cash_from_orders, 0) + cod_total,  -- ✅ Đúng
'net_amount', COALESCE(revenue_from_orders, 0)              -- ✅ Không cộng COD
```

---

## 🔍 Kiểm tra lại

### Sau khi sửa lỗi 1 (created_by):
```sql
SELECT 
  order_id,
  nguoi_tao_don,      -- Phục vụ 01
  thu_ngan            -- Cashier 01 (người thanh toán)
FROM v_invoice_header 
WHERE order_id = 286;
```

### Sau khi sửa lỗi 2 (doanh thu):
```sql
SELECT fn_aggregate_shift(55)->'net_amount' as doanh_thu;
-- Kết quả: 866.000đ (không bao gồm COD)
```

---

## 📝 Tóm tắt

| Vấn đề | Nguyên nhân | Giải pháp |
|--------|------------|-----------|
| Thu ngân hiển thị sai | `order_payment.created_by = NULL` | Frontend truyền `created_by` hoặc Backend tự lấy từ `req.user` |
| Doanh thu bị sai | `fn_aggregate_shift` cộng COD vào `net_amount` | COD chỉ tính vào `cash_amount`, không tính vào `net_amount` |

---

**Lưu ý:** COD là tiền mặt thu hộ, không phải doanh thu. Chỉ tính vào tiền mặt thực tế trong ca.
