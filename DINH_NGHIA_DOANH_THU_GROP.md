# 📊 Định Nghĩa "Doanh Thu Gộp" Trong Tab "Tổng Quan"

## 💰 **DOANH THU GỘP (Gross Revenue)**

### **Định nghĩa:**
**Doanh thu gộp** = Tổng tiền của tất cả đơn hàng **SAU KHI trừ line discounts**, nhưng **CHƯA trừ promotion discount và manual discount**.

---

## 🔢 **CÔNG THỨC TÍNH**

### **Từ function `fn_aggregate_shift()`:**
```sql
'gross_amount' = COALESCE(SUM(settlement.subtotal_after_lines), 0)
```

### **`subtotal_after_lines` được tính từ `v_order_money_totals`:**
```sql
subtotal_after_lines = SUM((don_gia * so_luong) - COALESCE(giam_gia, 0))
                     + SUM(topping_total) -- Nếu có topping
```

---

## 📋 **CHI TIẾT CÁC THÀNH PHẦN**

### **1. Subtotal Before Lines** (Tổng trước line discounts)
```
= SUM(don_gia * so_luong) + SUM(topping_total)
```

### **2. Line Discounts** (Giảm giá từng món)
```
= SUM(giam_gia) từ don_hang_chi_tiet
```

### **3. Subtotal After Lines** (✅ ĐÂY LÀ "DOANH THU GỘP")
```
= Subtotal Before Lines - Line Discounts
= SUM((don_gia * so_luong) - giam_gia) + SUM(topping_total)
```

### **4. Promotion Discount** (Giảm giá khuyến mãi)
```
= SUM(so_tien_giam) từ don_hang_khuyen_mai
```

### **5. Manual Discount** (Giảm giá thủ công)
```
= giam_gia_thu_cong từ don_hang
```

### **6. Grand Total** (✅ ĐÂY LÀ "DOANH THU THUẦN")
```
= Subtotal After Lines - Promotion Discount - Manual Discount
```

---

## 📊 **VÍ DỤ CỤ THỂ**

### **Đơn hàng mẫu:**
- Món A: 50.000 ₫ (giá gốc), giảm giá dòng: 10.000 ₫
- Món B: 30.000 ₫ (giá gốc), giảm giá dòng: 0 ₫
- Topping: 5.000 ₫
- Áp dụng khuyến mãi: -15.000 ₫
- Giảm giá thủ công: -3.000 ₫

### **Tính toán:**

1. **Subtotal Before Lines:**
   ```
   50.000 + 30.000 + 5.000 = 85.000 ₫
   ```

2. **Line Discounts:**
   ```
   10.000 ₫
   ```

3. **Subtotal After Lines (DOANH THU GỘP):**
   ```
   85.000 - 10.000 = 75.000 ₫ ✅
   ```

4. **Promotion Discount:**
   ```
   15.000 ₫
   ```

5. **Manual Discount:**
   ```
   3.000 ₫
   ```

6. **Grand Total (DOANH THU THUẦN):**
   ```
   75.000 - 15.000 - 3.000 = 57.000 ₫ ✅
   ```

---

## 🔄 **SO SÁNH VỚI CÁC SỐ LIỆU KHÁC**

| Thuật ngữ | Giá trị | Công thức |
|-----------|---------|-----------|
| **Doanh thu gộp** | `gross_amount` | `SUM(subtotal_after_lines)` |
| **Giảm giá** | `discount_amount` | `SUM(promo_total + manual_discount)` |
| **Doanh thu thuần** | `net_amount` | `SUM(grand_total)` |

---

## ⚠️ **LƯU Ý QUAN TRỌNG**

1. ✅ **Doanh thu gộp** = Tổng sau line discounts, **CHƯA trừ** promotion/manual
2. ✅ **Doanh thu thuần** = Tổng **SAU TẤT CẢ** discounts
3. ✅ **Giảm giá** chỉ bao gồm promotion + manual discount, **KHÔNG bao gồm** line discounts
4. ✅ Chỉ tính đơn hàng **PAID** thuộc ca làm việc (`trang_thai = 'PAID'` và `ca_lam_id = shift_id`)

---

## 🎯 **TÓM TẮT**

**"Doanh thu gộp"** = Tổng tiền tạm tính sau khi trừ giảm giá từng món, nhưng **chưa trừ** các giảm giá toàn đơn (khuyến mãi + thủ công).

**"Doanh thu thuần"** = Số tiền **thực tế** khách hàng phải trả sau khi áp dụng **TẤT CẢ** các loại giảm giá.

---

**Công thức đơn giản:**
```
Doanh thu thuần = Doanh thu gộp - Giảm giá (promotion + manual)
```

