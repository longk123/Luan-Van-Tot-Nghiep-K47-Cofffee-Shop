# Khuyến nghị: Vai trò Shipper với cơ cấu nhân sự hiện tại

## 📋 Tình hình hiện tại

**Nhân viên hiện có:**
- ✅ **Quản lý (Manager)**: Quản lý quán, không thể đi giao
- ✅ **Thu ngân (Cashier)**: Thu tiền tại quán, đi giao sẽ ảnh hưởng
- ✅ **Pha chế (Barista/Kitchen)**: Làm đồ uống, không thể đi giao

**Vấn đề:**
- ❌ Không có nhân viên phục vụ (waiter/server)
- ❌ Không có ai chuyên đi giao hàng
- ❌ Thu ngân đi giao → ảnh hưởng đến việc thu tiền tại quán

---

## 🎯 Phân tích các phương án

### **Phương án 1: Thu ngân đi giao hàng**

#### ❌ Nhược điểm lớn:
1. **Ảnh hưởng nghiêm trọng đến dịch vụ**
   - Thu ngân đi giao → Không ai thu tiền tại quán
   - Khách hàng phải đợi lâu
   - Mất doanh thu từ khách tại quán

2. **Không khả thi**
   - Thu ngân cần ở quán để thu tiền
   - Đi giao 1 đơn mất 15-30 phút
   - Trong thời gian đó, quán không có người thu tiền

#### ✅ Chỉ khả thi khi:
- Số đơn giao hàng rất ít (< 5 đơn/ngày)
- Có thể đóng quán tạm thời khi đi giao
- Hoặc có 2 thu ngân (1 người đi giao, 1 người ở lại)

---

### **Phương án 2: Pha chế đi giao hàng** ❌

#### ❌ Hoàn toàn không khả thi:
- Pha chế cần ở quán để làm đồ uống
- Đi giao → Không ai làm đồ uống
- Ảnh hưởng đến tất cả đơn hàng (tại quán + giao hàng)

---

### **Phương án 3: Quản lý đi giao hàng** ❌

#### ❌ Không phù hợp:
- Quản lý cần quản lý quán
- Không nên làm công việc vận chuyển
- Mất thời gian quản lý

---

### **Phương án 4: Thêm vai trò Shipper** ✅ **KHUYẾN NGHỊ**

#### ✅ Ưu điểm:
1. **Không ảnh hưởng nhân viên hiện tại**
   - Thu ngân: Ở quán thu tiền
   - Pha chế: Ở quán làm đồ uống
   - Quản lý: Quản lý quán

2. **Chuyên nghiệp**
   - Shipper chuyên giao hàng
   - Có thể tracking
   - Quản lý hiệu suất

3. **Linh hoạt**
   - Có thể thuê shipper part-time
   - Có thể thuê theo giờ cao điểm
   - Có thể dùng dịch vụ giao hàng bên thứ 3

4. **Mở rộng được**
   - Dễ thêm nhiều shipper
   - Dễ mở rộng bán kính

#### ⚠️ Nhược điểm:
- Cần thêm chi phí thuê shipper
- Cần quản lý thêm

---

## 💡 Khuyến nghị cụ thể

### **Giai đoạn 1: Shipper Part-time (Khuyến nghị)**

**Cách làm:**
1. Thuê 1-2 shipper part-time
2. Làm việc theo giờ cao điểm (11h-14h, 17h-20h)
3. Trả lương theo giờ hoặc theo đơn

**Chi phí ước tính:**
- Shipper part-time: 30,000-50,000đ/giờ
- 4 giờ/ngày × 30,000đ = 120,000đ/ngày
- ~3,600,000đ/tháng (nếu làm 30 ngày)

**Lợi ích:**
- Không ảnh hưởng nhân viên hiện tại
- Linh hoạt, chỉ trả khi có đơn
- Dễ quản lý

---

### **Giai đoạn 2: Shipper Full-time (Khi đơn nhiều)**

**Khi nào:**
- Số đơn giao hàng > 50 đơn/ngày
- Cần shipper cả ngày
- Có ngân sách

**Cách làm:**
1. Thuê 1-2 shipper full-time
2. Làm việc 8 giờ/ngày
3. Trả lương cố định + thưởng theo đơn

---

### **Giai đoạn 3: Dịch vụ giao hàng bên thứ 3 (Khi mở rộng)**

**Khi nào:**
- Mở rộng bán kính > 5km
- Số đơn rất nhiều
- Muốn giảm chi phí quản lý

**Cách làm:**
- Tích hợp với Grab, Gojek, Baemin
- Hoặc thuê công ty giao hàng chuyên nghiệp

---

## 🛠️ Implementation đề xuất

### **Phase 1: Thêm vai trò SHIPPER (Cần thiết)**

```sql
-- Thêm role SHIPPER
INSERT INTO roles (role_name) VALUES ('SHIPPER') ON CONFLICT DO NOTHING;

-- Tạo user cho shipper
INSERT INTO users (username, password_hash, full_name, is_active)
VALUES ('shipper1', '$2b$10$...', 'Nguyễn Văn Shipper', TRUE);

-- Gán role
INSERT INTO user_roles (user_id, role_id)
SELECT u.user_id, r.role_id
FROM users u, roles r
WHERE u.username = 'shipper1' AND r.role_name = 'SHIPPER';
```

### **Phase 2: Thêm trạng thái giao hàng**

```sql
-- Thêm cột shipper_id vào don_hang_delivery_info
ALTER TABLE don_hang_delivery_info
ADD COLUMN shipper_id INT REFERENCES users(user_id);

-- Thêm cột delivery_status
ALTER TABLE don_hang_delivery_info
ADD COLUMN delivery_status VARCHAR(20) DEFAULT 'PENDING'
CHECK (delivery_status IN ('PENDING', 'ASSIGNED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED'));
```

### **Phase 3: UI phân công đơn**

1. **Manager Dashboard:**
   - Xem danh sách đơn DELIVERY chưa giao
   - Phân công đơn cho shipper
   - Xem trạng thái giao hàng

2. **Shipper App/Interface:**
   - Xem đơn được phân công
   - Update trạng thái: "Đang giao" → "Đã giao"
   - Xem lịch sử giao hàng

---

## 📊 So sánh chi phí

### **Thuê Shipper Part-time:**
- 120,000đ/ngày (4 giờ)
- 3,600,000đ/tháng
- Linh hoạt, chỉ trả khi cần

### **Thuê Shipper Full-time:**
- 6,000,000-8,000,000đ/tháng
- Ổn định, có người giao cả ngày

### **Dịch vụ bên thứ 3:**
- 15,000-25,000đ/đơn
- Không cần quản lý nhân sự
- Phù hợp khi đơn nhiều

---

## 🎯 Kết luận

**Với cơ cấu nhân sự hiện tại (chỉ có Manager, Cashier, Barista), KHÔNG THỂ dùng nhân viên hiện có để giao hàng.**

**Khuyến nghị:**
1. ✅ **Thêm vai trò SHIPPER** vào hệ thống
2. ✅ **Thuê shipper part-time** ban đầu
3. ✅ **Nâng cấp lên full-time** khi đơn nhiều
4. ✅ **Tích hợp dịch vụ bên thứ 3** khi mở rộng

**Lý do:**
- Không ảnh hưởng nhân viên hiện tại
- Chuyên nghiệp, dễ quản lý
- Linh hoạt, dễ mở rộng
- Chi phí hợp lý (part-time)

