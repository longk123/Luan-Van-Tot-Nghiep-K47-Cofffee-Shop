# TOPPING COST CALCULATION - SUMMARY

## 🎯 MỤC TIÊU
Tính **topping vào cả doanh thu VÀ giá vốn** để báo cáo lợi nhuận chính xác.

## ✅ ĐÃ HOÀN THÀNH

### 1. **Thêm liên kết topping với nguyên liệu** 
**File:** `migrate-add-topping-cost.cjs`

- Thêm cột `nguyen_lieu_id` vào bảng `tuy_chon_mon`
- Tự động link topping với nguyên liệu có cùng tên/mã
- Kết quả: 2/2 topping đã được link

```sql
ALTER TABLE tuy_chon_mon
ADD COLUMN nguyen_lieu_id INTEGER REFERENCES nguyen_lieu(id);
```

### 2. **Tạo view tính giá vốn topping**
**View:** `v_line_topping_cost`

Tính tổng giá vốn topping cho mỗi dòng đơn hàng:

```sql
CREATE VIEW v_line_topping_cost AS
SELECT 
  dhct.id AS line_id,
  dhct.don_hang_id AS order_id,
  COALESCE(SUM(
    COALESCE(dhctto.so_luong, 1) * COALESCE(nl.gia_nhap_moi_nhat, 0)
  ), 0)::INTEGER AS tong_gia_von_topping
FROM don_hang_chi_tiet dhct
LEFT JOIN don_hang_chi_tiet_tuy_chon dhctto ON dhctto.line_id = dhct.id
LEFT JOIN tuy_chon_mon tc ON tc.id = dhctto.tuy_chon_id AND tc.loai = 'AMOUNT'
LEFT JOIN nguyen_lieu nl ON nl.id = tc.nguyen_lieu_id
GROUP BY dhct.id, dhct.don_hang_id;
```

### 3. **Tạo view báo cáo lợi nhuận hoàn chỉnh**
**View:** `v_profit_with_topping_cost`

Báo cáo chi tiết doanh thu, giá vốn (món + topping), lợi nhuận:

```sql
CREATE VIEW v_profit_with_topping_cost AS
SELECT 
  dh.id AS order_id,
  dh.trang_thai,
  dh.opened_at,
  dh.closed_at,
  COALESCE(omt.grand_total, 0) AS doanh_thu,
  COALESCE(SUM(dhct.gia_von_thuc_te * dhct.so_luong), 0)::INTEGER AS gia_von_mon,
  COALESCE(SUM(vtc.tong_gia_von_topping * dhct.so_luong), 0)::INTEGER AS gia_von_topping,
  (COALESCE(SUM(dhct.gia_von_thuc_te * dhct.so_luong), 0) + 
   COALESCE(SUM(vtc.tong_gia_von_topping * dhct.so_luong), 0))::INTEGER AS tong_gia_von,
  (COALESCE(omt.grand_total, 0) - 
   COALESCE(SUM(dhct.gia_von_thuc_te * dhct.so_luong), 0) -
   COALESCE(SUM(vtc.tong_gia_von_topping * dhct.so_luong), 0))::INTEGER AS loi_nhuan
FROM don_hang dh
LEFT JOIN don_hang_chi_tiet dhct ON dhct.don_hang_id = dh.id
LEFT JOIN v_line_topping_cost vtc ON vtc.line_id = dhct.id
LEFT JOIN v_order_money_totals omt ON omt.order_id = dh.id
WHERE dh.trang_thai = 'PAID'
GROUP BY dh.id, dh.trang_thai, dh.opened_at, dh.closed_at, omt.grand_total;
```

### 4. **Fix trigger tính giá vốn tự động**
**File:** `fix-auto-calc-gia-von.cjs`

**Vấn đề:** Cột `gia_von_thuc_te` = NULL cho tất cả đơn hàng cũ

**Giải pháp:**
- Tạo function `trigger_calc_gia_von()` - Tính giá vốn tự động theo công thức + % đường/đá
- Trigger `trg_calc_gia_von_insert` - Chạy khi INSERT đơn mới
- Trigger `trg_calc_gia_von_update` - Chạy khi UPDATE món/biến thể/số lượng
- Trigger `trg_topping_update_gia_von` - Tính lại khi thêm/xóa/sửa topping
- **Đã cập nhật giá vốn cho 377 đơn hàng cũ**

```sql
CREATE TRIGGER trg_calc_gia_von_insert
BEFORE INSERT ON don_hang_chi_tiet
FOR EACH ROW
EXECUTE FUNCTION trigger_calc_gia_von();
```

### 5. **Function tiện ích**
**Function:** `tinh_gia_von_voi_topping(p_line_id)`

Tính tổng giá vốn (món + topping) cho 1 dòng đơn hàng:

```sql
CREATE FUNCTION tinh_gia_von_voi_topping(p_line_id INTEGER)
RETURNS NUMERIC
```

## 📊 KẾT QUẢ TEST

### Test 10 đơn hàng gần nhất:
- ✅ **Tổng doanh thu:** 553,000đ
- ✅ **Giá vốn món:** 147,450đ  
- ✅ **Giá vốn topping:** 0đ (chưa có đơn với topping)
- ✅ **Lợi nhuận:** 405,550đ
- ✅ **Margin:** 73.3%

### Trước khi fix:
- ❌ Giá vốn món: 0đ (100% lợi nhuận - SAI!)
- ❌ Không tính giá vốn topping

### Sau khi fix:
- ✅ Giá vốn món: Tự động tính theo công thức + % tùy chọn
- ✅ Giá vốn topping: Sẵn sàng tính khi có đơn với topping
- ✅ Margin hợp lý: 62% - 84%

## 🎯 CÁCH SỬ DỤNG

### 1. Query báo cáo lợi nhuận:
```sql
SELECT * FROM v_profit_with_topping_cost
WHERE opened_at >= '2024-10-01'
ORDER BY order_id DESC;
```

### 2. Query chi tiết giá vốn topping:
```sql
SELECT * FROM v_line_topping_cost
WHERE order_id = 231;
```

### 3. Tính giá vốn cho 1 line cụ thể:
```sql
SELECT tinh_gia_von_voi_topping(line_id);
```

## 📋 DATABASE OBJECTS ĐÃ TẠO

1. **Tables:**
   - `tuy_chon_mon.nguyen_lieu_id` (column mới)

2. **Views:**
   - `v_line_topping_cost` - Giá vốn topping theo line
   - `v_profit_with_topping_cost` - Báo cáo lợi nhuận đầy đủ

3. **Functions:**
   - `trigger_calc_gia_von()` - Trigger function tính giá vốn
   - `tinh_gia_von_voi_topping(p_line_id)` - Utility function
   - `trigger_update_gia_von_when_topping_changed()` - Trigger khi đổi topping

4. **Triggers:**
   - `trg_calc_gia_von_insert` - Auto calc khi INSERT
   - `trg_calc_gia_von_update` - Auto calc khi UPDATE
   - `trg_topping_update_gia_von` - Recalc khi thay đổi topping

## 🔄 LUỒNG HOẠT ĐỘNG

### Khi tạo đơn hàng mới:
1. INSERT vào `don_hang_chi_tiet`
2. Trigger `trg_calc_gia_von_insert` tự động chạy
3. Function `trigger_calc_gia_von()` tính:
   - Lấy % đường/đá từ `don_hang_chi_tiet_tuy_chon`
   - Tính giá vốn từ `cong_thuc_mon` × % custom
   - Set `gia_von_thuc_te`

### Khi thêm topping:
1. INSERT vào `don_hang_chi_tiet_tuy_chon`
2. Trigger `trg_topping_update_gia_von` chạy
3. UPDATE lại `don_hang_chi_tiet` để trigger recalc

### Khi thanh toán:
1. View `v_line_topping_cost` tính giá vốn topping
2. View `v_profit_with_topping_cost` tính tổng:
   - Doanh thu (từ `v_order_money_totals`)
   - Giá vốn món (từ `gia_von_thuc_te`)
   - Giá vốn topping (từ `v_line_topping_cost`)
   - Lợi nhuận = Doanh thu - Tổng giá vốn

## 💡 LƯU Ý

1. **Topping phải link với nguyên liệu:**
   ```sql
   UPDATE tuy_chon_mon
   SET nguyen_lieu_id = (SELECT id FROM nguyen_lieu WHERE ma = 'BANH-FLAN')
   WHERE ma = 'TOPPING_FLAN';
   ```

2. **Topping chưa link sẽ có giá vốn = 0**
   - Vẫn tính vào doanh thu
   - Nhưng không tính vào giá vốn

3. **View `v_profit_with_topping_cost` CHỈ lấy đơn PAID**
   - Đơn chưa thanh toán không xuất hiện
   - Để test với tất cả trạng thái, bỏ WHERE clause

## 🧪 FILES TEST

1. `test-cost-with-topping.cjs` - Test công thức món có tính topping không
2. `test-topping-cost-in-profit.cjs` - Test topping trong structure
3. `test-profit-view.cjs` - Test view báo cáo lợi nhuận
4. `test-order-with-topping.cjs` - Tạo đơn test với topping

## 🚀 MIGRATION FILES

1. `migrate-add-topping-cost.cjs` - Thêm cấu trúc topping cost
2. `fix-auto-calc-gia-von.cjs` - Fix trigger tính giá vốn tự động
3. `fix-profit-view-status.cjs` - Sửa view dùng status 'PAID'

## ✅ KẾT LUẬN

Hệ thống đã sẵn sàng tính **topping vào cả doanh thu VÀ giá vốn** một cách tự động:

- ✅ Giá vốn món: Tự động tính khi tạo/sửa đơn
- ✅ Giá vốn topping: Tự động tính khi có topping linked
- ✅ Báo cáo lợi nhuận: Chính xác với margin thực tế
- ✅ Trigger: Hoạt động tự động, không cần code thêm

**Margin thực tế: 73.3%** (đã trừ giá vốn món, sẵn sàng trừ topping)
