# Topping & Options Migration Summary

**Date:** 2025-10-20  
**Migration File:** `migrate-add-topping-options.cjs`

## ✅ What Was Already in Database (Skipped)

These features were already implemented in `setup-db.js`:

1. **Per-cup status columns** in `don_hang_chi_tiet`:
   - `ghi_chu` (notes)
   - `trang_thai_che_bien` (QUEUED/MAKING/DONE/CANCELLED)
   - `started_at`, `finished_at`, `maker_id`

2. **Options tables**:
   - `tuy_chon_mon` - option groups (SUGAR, ICE)
   - `tuy_chon_muc` - option levels (0%, 30%, 50%, 70%, 100%)
   - `mon_tuy_chon_ap_dung` - which options apply to which items
   - `don_hang_chi_tiet_tuy_chon` - per-line option selections

3. **Protection functions & triggers**:
   - `fn_assert_editable_line()` - prevents editing paid/making orders
   - Triggers on INSERT/UPDATE/DELETE for lines and options

4. **Basic views**:
   - `v_open_order_per_table`
   - `v_open_order_items_detail`
   - `v_order_line_options`
   - `v_order_prep_overview`
   - `v_open_order_items_detail_ext`

5. **PERCENT options already seeded**:
   - SUGAR (Độ ngọt): 0%, 30%, 50%, 70%, 100%
   - ICE (Mức đá): 0%, 30%, 50%, 70%, 100%

---

## 🆕 What Was Added (New)

### 1. **Column: `gia_mac_dinh` in `tuy_chon_mon`**
   - Default price per unit for AMOUNT-type options
   - Used when no specific pricing is set in `tuy_chon_gia`

### 2. **Column: `so_luong` in `don_hang_chi_tiet_tuy_chon`**
   - Quantity for AMOUNT options (e.g., 2 viên flan, 1.5 vá thạch)
   - Type: NUMERIC(8,3) DEFAULT 1

### 3. **Constraint: `chk_tcm_amount_unit_hint`**
   - Ensures AMOUNT-type options must have a `don_vi` (unit)

### 4. **Table: `tuy_chon_gia`** (Topping Pricing)
   ```sql
   - tuy_chon_id    → which option
   - mon_id         → optional: price for specific item
   - mon_bien_the_id → optional: price for specific variation
   - gia            → price per unit
   ```
   - Allows custom pricing like: "Flan costs 9,000đ for Size L, but 8,000đ for others"

### 5. **View: `v_line_option_amount_pricing`**
   - Calculates topping prices for AMOUNT options
   - Priority: variation price > item price > default price
   - Returns: `so_luong_don_vi`, `gia_moi_don_vi`, `tien_topping_line`

### 6. **View: `v_open_order_items_with_addons`**
   - Enhanced version of order items view
   - Includes:
     - `base_line_total` (item price × quantity - discount)
     - `topping_total` (sum of all AMOUNT option costs)
     - `line_total_with_addons` (final total)
     - `options` (jsonb with all selected options)

### 7. **DELETE Trigger for Options**
   - Re-added `t_dhctopt_before_del` trigger
   - Prevents deleting options for orders that are PAID or MAKING/DONE

### 8. **AMOUNT Options Seeded**:
   - **TOPPING_FLAN** (Bánh flan): 8,000đ/viên
   - **TOPPING_THACH** (Thạch dừa): 3,000đ/vá

---

## 📊 Data Structure Example

### Adding topping to an order line:

```sql
-- Line already exists: Cà phê sữa đá Size M (line_id=1)

-- Add 2 viên bánh flan
INSERT INTO don_hang_chi_tiet_tuy_chon 
  (line_id, tuy_chon_id, muc_id, he_so, so_luong)
VALUES 
  (1, (SELECT id FROM tuy_chon_mon WHERE ma='TOPPING_FLAN'), NULL, NULL, 2);

-- Result: Will charge 2 × 8,000đ = 16,000đ extra
```

### Viewing order with toppings:

```sql
SELECT 
  order_id, line_id, ten_mon, ten_bien_the,
  base_line_total,      -- e.g., 70,000đ (2 × 35,000)
  topping_total,        -- e.g., 16,000đ (2 flan)
  line_total_with_addons, -- e.g., 86,000đ
  options              -- jsonb with all options
FROM v_open_order_items_with_addons
WHERE order_id = 1;
```

---

## 🎯 Key Differences: PERCENT vs AMOUNT

| Feature | PERCENT (SUGAR/ICE) | AMOUNT (TOPPINGS) |
|---------|---------------------|-------------------|
| **Type** | `loai='PERCENT'` | `loai='AMOUNT'` |
| **Unit** | `don_vi='%'` (display only) | `don_vi='viên','vá'` (required) |
| **Levels** | Has `tuy_chon_muc` records | No levels needed |
| **Quantity** | Uses `he_so` (0.0-1.0) | Uses `so_luong` (1, 2, 1.5, etc.) |
| **Pricing** | Free (no charge) | Priced via `tuy_chon_gia` or `gia_mac_dinh` |
| **Selection** | Pick one level | Specify quantity |

---

## 🔧 Usage in Application

### Frontend: Add topping to order
```javascript
// When user adds "2 viên flan" to a line
await api.post('/api/pos/items/:lineId/options', {
  optionCode: 'TOPPING_FLAN',
  quantity: 2  // AMOUNT options use quantity
});
```

### Backend: Calculate total
```sql
-- Use the new view
SELECT line_total_with_addons 
FROM v_open_order_items_with_addons 
WHERE line_id = ?;
```

---

## ✅ Migration Status

**Status:** ✅ **COMPLETED SUCCESSFULLY**

All new features have been added to the database without conflicts.
You can now:
- Add AMOUNT-type topping options
- Set custom pricing per item/variation
- Calculate order totals including toppings
- Track topping quantities per line

---

## 📝 Next Steps (Optional)

If you want to add custom pricing for specific items:

```sql
-- Example: Flan costs 9,000đ for Size L of "Cà phê sữa đá"
INSERT INTO tuy_chon_gia (tuy_chon_id, mon_id, mon_bien_the_id, gia)
SELECT 
  tc.id,
  m.id,
  mbt.id,
  9000
FROM tuy_chon_mon tc
JOIN mon m ON m.ma = 'CF-SUA-DA'
JOIN mon_bien_the mbt ON mbt.mon_id = m.id AND mbt.ten_bien_the = 'Size L'
WHERE tc.ma = 'TOPPING_FLAN';
```

