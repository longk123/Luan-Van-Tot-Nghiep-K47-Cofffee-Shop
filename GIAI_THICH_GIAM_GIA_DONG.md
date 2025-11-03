# 💰 Giải Thích "Giảm Giá Dòng" (Line Discount)

## 📋 **ĐỊNH NGHĨA**

**"Giảm giá dòng"** (Line Discount) = Giảm giá áp dụng cho **từng món hàng riêng lẻ** trong đơn hàng.

---

## 🗄️ **TRONG DATABASE**

Giảm giá dòng được lưu trong bảng `don_hang_chi_tiet`:
```sql
don_hang_chi_tiet (
  id,
  don_hang_id,
  mon_id,
  so_luong,
  don_gia,      -- Giá gốc của món
  giam_gia,     -- ✅ Đây là "giảm giá dòng" (số tiền giảm cho món này)
  ...
)
```

---

## 🔢 **CÔNG THỨC TÍNH**

### **Tính tiền cho 1 dòng (món hàng):**
```
Thành tiền dòng = (don_gia × so_luong) - giam_gia
```

### **Tổng giảm giá dòng của đơn:**
```
Tổng giảm giá dòng = SUM(giam_gia) từ tất cả các dòng trong đơn
```

---

## 📊 **SO SÁNH VỚI CÁC LOẠI GIẢM GIÁ KHÁC**

| Loại giảm giá | Lưu ở đâu | Áp dụng cho | Ví dụ |
|---------------|-----------|-------------|-------|
| **Giảm giá dòng** | `don_hang_chi_tiet.giam_gia` | Từng món riêng | Giảm 10.000 ₫ cho 1 ly cà phê |
| **Giảm giá khuyến mãi** | `don_hang_khuyen_mai.so_tien_giam` | Toàn đơn | Mã "GIAM50K" giảm 50.000 ₫ cho cả đơn |
| **Giảm giá thủ công** | `don_hang.giam_gia_thu_cong` | Toàn đơn | Thu ngân giảm 20.000 ₫ cho khách VIP |

---

## 🎯 **VÍ DỤ CỤ THỂ**

### **Đơn hàng:**
1. **Cà phê đen** - 30.000 ₫ × 2 = 60.000 ₫
   - Giảm giá dòng: **10.000 ₫** (ví dụ: khách quen)
   - Thành tiền: 60.000 - 10.000 = **50.000 ₫** ✅

2. **Bánh mì** - 25.000 ₫ × 1 = 25.000 ₫
   - Giảm giá dòng: **0 ₫**
   - Thành tiền: **25.000 ₫** ✅

3. **Nước ngọt** - 20.000 ₫ × 1 = 20.000 ₫
   - Giảm giá dòng: **5.000 ₫** (ví dụ: món bị lỗi nhẹ)
   - Thành tiền: 20.000 - 5.000 = **15.000 ₫** ✅

### **Tính tổng:**

**Subtotal trước giảm:**
```
60.000 + 25.000 + 20.000 = 105.000 ₫
```

**Tổng giảm giá dòng:**
```
10.000 + 0 + 5.000 = 15.000 ₫ ✅
```

**Subtotal sau giảm giá dòng (DOANH THU GỘP):**
```
105.000 - 15.000 = 90.000 ₫ ✅
```

**Giả sử có:**
- Khuyến mãi: -10.000 ₫
- Giảm thủ công: -5.000 ₫

**Tổng cuối (DOANH THU THUẦN):**
```
90.000 - 10.000 - 5.000 = 75.000 ₫ ✅
```

---

## 🔄 **TRONG HỆ THỐNG**

### **Khi nào dùng giảm giá dòng?**

1. ✅ Giảm giá cho từng món cụ thể
2. ✅ Khuyến mãi theo món (ví dụ: mua 2 tặng 1, nhưng tính bằng cách giảm giá dòng)
3. ✅ Sửa lỗi/đền bù cho món bị lỗi
4. ✅ Giảm giá cho khách VIP theo từng món

### **Khi nào KHÔNG dùng giảm giá dòng?**

- ❌ Giảm giá cho cả đơn → Dùng **khuyến mãi** hoặc **giảm thủ công**
- ❌ Giảm giá theo % toàn đơn → Dùng **khuyến mãi** hoặc **giảm thủ công**

---

## 💡 **CÁCH ÁP DỤNG (TRONG CODE)**

### **Backend:**
```javascript
// Khi thêm món vào đơn
await posRepository.addItemToOrder({
  orderId: 123,
  monId: 45,
  soLuong: 2,
  donGia: 30000,
  giamGia: 10000  // ✅ Giảm giá dòng cho món này
});
```

### **SQL:**
```sql
-- Tính tổng giảm giá dòng của đơn
SELECT 
  SUM(giam_gia) AS total_line_discounts
FROM don_hang_chi_tiet
WHERE don_hang_id = 123;

-- Tính tiền từng dòng
SELECT 
  mon_id,
  (don_gia * so_luong) AS before_discount,
  giam_gia AS line_discount,
  ((don_gia * so_luong) - giam_gia) AS after_discount
FROM don_hang_chi_tiet
WHERE don_hang_id = 123;
```

---

## 📝 **TÓM TẮT**

**"Giảm giá dòng"** là:
- ✅ Giảm giá áp dụng cho **từng món hàng riêng lẻ**
- ✅ Lưu trong cột `giam_gia` của bảng `don_hang_chi_tiet`
- ✅ Được trừ trước khi tính "Doanh thu gộp"
- ✅ Khác với giảm giá khuyến mãi (toàn đơn) và giảm giá thủ công (toàn đơn)

**Công thức:**
```
Subtotal sau line discounts = SUM((giá × số lượng) - giảm giá dòng)
```

---

**Ví dụ đơn giản:**
- Món: 100.000 ₫
- Giảm giá dòng: -10.000 ₫
- **Thành tiền dòng:** 90.000 ₫ ✅

