# 🔍 Xác Nhận: Hệ Thống Có Chức Năng "Giảm Giá Dòng" Không?

## ❓ **CÂU HỎI**

Bạn nói: **"Trong hệ thống của tôi làm gì có giảm giá dòng?"**

Hãy cùng kiểm tra xem hệ thống có thực sự dùng giảm giá dòng hay không.

---

## 🔍 **KIỂM TRA**

### **1. Database có cột `giam_gia`:**
✅ **CÓ** - Bảng `don_hang_chi_tiet` có cột `giam_gia INT DEFAULT 0`

### **2. Frontend có UI để set giảm giá dòng:**
❌ **KHÔNG** - Không tìm thấy UI để nhập giảm giá cho từng món

### **3. Backend có API để update giảm giá dòng:**
❌ **KHÔNG** - Không tìm thấy API endpoint để set `giam_gia` cho từng dòng

### **4. Công thức tính toán:**
✅ **CÓ** - Công thức vẫn tính `line_discounts_total = SUM(giam_gia)` nhưng thường = 0

---

## 📊 **THỰC TẾ**

### **Trong code hiện tại:**

```sql
-- Công thức tính (từ v_order_money_totals)
line_discounts_total = SUM(COALESCE(d.giam_gia, 0))
subtotal_after_lines = SUM((don_gia * so_luong) - COALESCE(d.giam_gia, 0))
```

**Nhưng:**
- Khi thêm món vào đơn: `giamGia = 0` (mặc định)
- Không có UI để user nhập giảm giá dòng
- Không có API để update `giam_gia`

**→ Kết quả:** `line_discounts_total` luôn = **0** trong hầu hết trường hợp!

---

## 💡 **KẾT LUẬN**

### **Tình trạng hiện tại:**

1. ✅ **Database có cấu trúc** để lưu giảm giá dòng (`giam_gia` column)
2. ❌ **Không có chức năng** để user set giảm giá dòng
3. ✅ **Công thức vẫn tính** nhưng giá trị thường = 0
4. ✅ **Sẵn sàng** để implement trong tương lai nếu cần

### **Nghĩa là:**

**"Doanh thu gộp"** trong tab "Tổng quan" = `SUM((don_gia × so_luong) - giam_gia)`

**Nhưng vì `giam_gia` luôn = 0 nên:**
```
Doanh thu gộp = SUM(don_gia × so_luong)
              = Tổng giá gốc của tất cả món (chưa trừ gì cả)
```

**Và:**
```
Giảm giá = Promotion discount + Manual discount
        (KHÔNG bao gồm line discount vì = 0)

Doanh thu thuần = Doanh thu gộp - Giảm giá
```

---

## ✅ **VẬY CÔNG THỨC ĐÚNG LÀ:**

### **Thực tế trong hệ thống của bạn:**

1. **Doanh thu gộp** = Tổng giá gốc tất cả món (chưa trừ gì)
2. **Giảm giá** = Chỉ có Promotion + Manual discount
3. **Doanh thu thuần** = Doanh thu gộp - Giảm giá

**KHÔNG có "giảm giá dòng"** trong quy trình thực tế!

---

## 🎯 **ĐIỀU CHỈNH HIỂN THỊ**

Bạn có thể:

### **Option 1: Giữ nguyên (như hiện tại)**
- Công thức vẫn tính line discount nhưng = 0
- Không ảnh hưởng kết quả cuối

### **Option 2: Đơn giản hóa công thức**
- Bỏ phần tính `line_discounts_total` vì không dùng
- Đổi "Doanh thu gộp" thành "Tổng tiền hàng"

### **Option 3: Implement chức năng giảm giá dòng**
- Thêm UI để set giảm giá cho từng món
- Thêm API để update `giam_gia`

---

**Vậy câu trả lời:** Hệ thống của bạn **KHÔNG có chức năng giảm giá dòng**, chỉ có cấu trúc database sẵn sàng cho tương lai. Giảm giá dòng trong công thức tính toán luôn = 0! ✅

