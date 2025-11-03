# ✅ Fix: Đồng Bộ Tab "Đơn Hàng" và Tab "Tổng Quan"

## 🔧 **THAY ĐỔI ĐÃ THỰC HIỆN**

### **File: `backend/src/repositories/posRepository.js`**

**Trước đây:**
```sql
-- Tính trực tiếp từ don_hang_chi_tiet (KHÔNG có topping)
COALESCE(SUM(ct.so_luong * ct.don_gia - COALESCE(ct.giam_gia, 0)), 0) AS tong_tien

-- Filter theo thời gian (có thể lấy đơn không thuộc ca)
WHERE closed_at >= started_at AND closed_at <= ended_at
```

**Sau khi fix:**
```sql
-- Dùng v_order_settlement.grand_total (CÓ topping + discount)
COALESCE(settlement.grand_total, 0) AS tong_tien

-- Filter theo ca_lam_id (đồng bộ với tab "Tổng quan")
WHERE dh.ca_lam_id = $1
```

---

## 📊 **KẾT QUẢ**

### **Tab "Đơn hàng" giờ sẽ:**

1. ✅ **Hiển thị `grand_total`** (số tiền sau TẤT CẢ discounts):
   - Bao gồm topping
   - Đã trừ promotion discount
   - Đã trừ manual discount

2. ✅ **Filter theo `ca_lam_id`**:
   - Chỉ hiển thị đơn thuộc ca
   - Đồng bộ với tab "Tổng quan"

3. ✅ **Tổng cộng sẽ khớp**:
   - Tổng tab "Đơn hàng" = **"Doanh thu thuần"** (không phải "Doanh thu gộp")

---

## ⚠️ **LƯU Ý**

**Tab "Đơn hàng" giờ hiển thị `grand_total` (sau discounts), không phải `subtotal_after_lines` (trước discounts).**

**Nếu muốn hiển thị "Doanh thu gộp" trong tab "Đơn hàng":**
- Đổi `settlement.grand_total` → `settlement.subtotal_after_lines`
- Tổng sẽ = "Doanh thu gộp" (trước promotion/manual discount)

---

## 🎯 **SO SÁNH SAU KHI FIX**

| Thuật ngữ | Tab "Đơn hàng" | Tab "Tổng quan" |
|-----------|----------------|-----------------|
| **Giá trị hiển thị** | `grand_total` | `gross_amount` (gross) và `net_amount` (net) |
| **Filter** | `ca_lam_id = shift_id` | `ca_lam_id = shift_id` |
| **Bao gồm topping** | ✅ Có | ✅ Có |
| **Đồng bộ** | ✅ Cùng filter | ✅ Cùng filter |

**Tổng tab "Đơn hàng"** = **"Doanh thu thuần"** trong tab "Tổng quan" ✅

---

**Fix hoàn tất!** Refresh lại modal để xem kết quả. 🎯

