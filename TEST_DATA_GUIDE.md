# 📋 Hướng dẫn Test với Dữ liệu Mẫu

## 🔐 Thông tin đăng nhập

### **Khách hàng (Customer Portal)**
| SĐT | Email | Mật khẩu | Tên |
|-----|-------|----------|-----|
| 0987654321 | customer1@test.com | customer123 | Nguyễn Văn A |
| 0912345678 | customer2@test.com | customer123 | Trần Thị B |
| 0901234567 | customer3@test.com | customer123 | Lê Văn C |

### **Nhân viên phục vụ (POS)**
| Username | Mật khẩu | Tên |
|----------|----------|-----|
| waiter01 | waiter123 | Nguyễn Văn Phục Vụ 1 |
| waiter02 | waiter123 | Trần Thị Phục Vụ 2 |

---

## 📊 Dữ liệu mẫu đã tạo

### **1. Menu & Sản phẩm**
- ✅ **6 danh mục**: Cà Phê, Trà, Nước Ép, Sinh Tố, Bánh Ngọt, Đồ Ăn Nhẹ
- ✅ **21 món ăn** với đầy đủ thông tin
- ✅ **18 biến thể (Size)**: S, M, L cho các món cà phê và trà sữa
- ✅ **Tùy chọn**: Đường (5 mức), Đá (5 mức) - áp dụng cho 7 món
- ✅ **Topping**: Bánh flan (8,000đ/viên), Thạch dừa (3,000đ/vá)

### **2. Khuyến mãi**
- ✅ `FIRST20`: Giảm 20% cho đơn đầu tiên
- ✅ `DISCOUNT50K`: Giảm 50,000đ cho đơn trên 200,000đ
- ✅ `BUY2GET1`: Mua 2 tặng 1 - Trà sữa

### **3. Đơn hàng mẫu**
- ✅ **Đơn TAKEAWAY #255** (PAID) - Đã thanh toán, món đã xong
- ✅ **Đơn DELIVERY #256** (OPEN, PENDING) - Chờ phân công
- ✅ **Đơn DELIVERY #257** (PAID, ASSIGNED) - Đã phân công cho waiter01
- ✅ **Đơn DELIVERY #258** (PAID, OUT_FOR_DELIVERY) - Đang giao bởi waiter02

### **4. Đặt bàn**
- ✅ Đặt bàn ngày mai 18:00, 4 người

---

## 🧪 Kịch bản Test

### **Test 1: Customer Portal - Đặt hàng**

1. **Đăng nhập Customer Portal**
   - URL: `/customer`
   - SĐT: `0987654321` | Mật khẩu: `customer123`

2. **Xem menu**
   - Vào `/customer/menu`
   - Xem các danh mục và món ăn
   - Click vào món để xem chi tiết (variants, options, toppings)

3. **Thêm vào giỏ hàng**
   - Chọn món, size, options (đường, đá), toppings
   - Thêm vào giỏ hàng
   - Xem giỏ hàng tại `/customer/cart`

4. **Đặt hàng DELIVERY**
   - Vào `/customer/checkout`
   - Chọn "Giao hàng"
   - Chọn địa chỉ trên bản đồ (trong bán kính 2km)
   - Nhập SĐT nhận hàng
   - Áp dụng mã khuyến mãi: `FIRST20`
   - Đặt hàng

5. **Xem lịch sử đơn hàng**
   - Vào `/customer/orders`
   - Xem các đơn đã đặt

---

### **Test 2: POS - Phân công đơn giao hàng**

1. **Đăng nhập POS (Manager/Thu ngân)**
   - URL: `/dashboard`
   - Username: (tài khoản Manager hoặc Cashier)

2. **Xem đơn giao hàng**
   - Vào `/takeaway`
   - Chọn tab "Giao hàng"
   - Xem danh sách đơn DELIVERY

3. **Phân công đơn**
   - Tìm đơn DELIVERY #256 (PENDING)
   - Click "Phân công giao hàng"
   - Chọn nhân viên phục vụ (waiter01 hoặc waiter02)
   - Xác nhận phân công

4. **Kiểm tra trạng thái**
   - Đơn sẽ chuyển sang trạng thái "ASSIGNED"
   - Hiển thị tên nhân viên được phân công

---

### **Test 3: Nhân viên phục vụ - Giao hàng**

1. **Đăng nhập nhân viên phục vụ**
   - URL: `/dashboard`
   - Username: `waiter01` | Mật khẩu: `waiter123`

2. **Xem đơn được phân công**
   - Click vào UserBadge (góc trên bên phải)
   - Chọn "Đơn giao hàng của tôi"
   - Hoặc truy cập trực tiếp: `/waiter/delivery`

3. **Xem danh sách đơn**
   - Đơn #257: Trạng thái "Đã phân công" (ASSIGNED)
   - Đơn #258: Trạng thái "Đang giao hàng" (OUT_FOR_DELIVERY)

4. **Cập nhật trạng thái**
   - Đơn #257: Click "Bắt đầu giao hàng" → Trạng thái: OUT_FOR_DELIVERY
   - Đơn #258: Click "✓ Đã giao hàng" → Trạng thái: DELIVERED

5. **Filter đơn**
   - Test các tab: "Tất cả", "Đã phân công", "Đang giao"

---

### **Test 4: Manager Dashboard - Xem tổng quan**

1. **Đăng nhập Manager**
   - URL: `/manager`
   - Xem dashboard với các đơn hàng

2. **Kiểm tra đơn DELIVERY**
   - Xem trong tab "Tổng quan"
   - Kiểm tra thông tin khách hàng, địa chỉ, shipper

---

## ✅ Checklist Test

### **Customer Portal**
- [ ] Đăng nhập/Đăng ký
- [ ] Xem menu và danh mục
- [ ] Xem chi tiết món (variants, options, toppings)
- [ ] Thêm vào giỏ hàng
- [ ] Đặt hàng TAKEAWAY
- [ ] Đặt hàng DELIVERY (chọn địa chỉ trên bản đồ)
- [ ] Áp dụng mã khuyến mãi
- [ ] Xem lịch sử đơn hàng
- [ ] Đặt bàn

### **POS/Manager**
- [ ] Xem đơn DELIVERY trong tab "Giao hàng"
- [ ] Phân công đơn cho nhân viên phục vụ
- [ ] Xem trạng thái giao hàng
- [ ] Xem thông tin khách hàng và địa chỉ

### **Nhân viên phục vụ**
- [ ] Đăng nhập với role WAITER
- [ ] Xem đơn được phân công
- [ ] Cập nhật trạng thái: ASSIGNED → OUT_FOR_DELIVERY
- [ ] Cập nhật trạng thái: OUT_FOR_DELIVERY → DELIVERED
- [ ] Filter đơn theo trạng thái
- [ ] Xem thông tin khách hàng và địa chỉ

---

## 🔄 Chạy lại script seeding

Nếu muốn reset dữ liệu và tạo lại:

```bash
cd backend
node seed-customer-portal-test-data.cjs
```

**Lưu ý:** Script sử dụng `ON CONFLICT` nên có thể chạy lại nhiều lần mà không bị trùng lặp.

---

## 🐛 Troubleshooting

### **Không thấy đơn DELIVERY**
- Kiểm tra xem có ca làm việc (shift) đang mở không
- Đảm bảo đơn có `ca_lam_id` được gán

### **Không phân công được đơn**
- Kiểm tra xem có nhân viên phục vụ (WAITER role) không
- Kiểm tra API `/api/v1/pos/waiters` có trả về danh sách không

### **Nhân viên phục vụ không thấy đơn**
- Kiểm tra đơn đã được phân công (`shipper_id` không null)
- Kiểm tra role WAITER đã được gán cho user

---

## 📝 Ghi chú

- Tất cả mật khẩu mẫu: `customer123` (khách hàng) và `waiter123` (nhân viên phục vụ)
- Đơn DELIVERY mẫu có địa chỉ trong bán kính 2km từ quán
- Có thể tạo thêm đơn mới từ Customer Portal để test đầy đủ workflow

