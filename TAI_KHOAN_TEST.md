# 🔑 TÀI KHOẢN TEST - CoffeePOS

**Ngày cập nhật:** 2025-01-XX

---

## 📋 **TÀI KHOẢN MẶC ĐỊNH (Từ setup-db.js)**

Sau khi chạy `node backend/setup-db.js`, hệ thống sẽ tạo 2 tài khoản mặc định:

| Vai trò | Username | Password | Quyền | Ghi chú |
|---------|----------|----------|-------|---------|
| 👑 **Admin** | `admin` | `123456` | Tất cả quyền | Có thể quản lý mọi thứ |
| 💳 **Cashier** | `cashier01` | `123456` | Chỉ thu ngân | Có thể tạo đơn, thanh toán |

**⚠️ LƯU Ý QUAN TRỌNG:**
- Nếu bạn đã chạy `seed-admin-data.cjs`, mật khẩu admin có thể đã bị đổi thành `admin123`
- Nếu bạn không chắc, hãy thử cả 2 mật khẩu: `123456` hoặc `admin123`

---

## 🚀 **TẠO THÊM TÀI KHOẢN TEST**

Nếu bạn cần test với các role khác (Manager, Kitchen), bạn có thể:

### **Cách 1: Tạo Thủ Công Qua API**

Sau khi đăng nhập với tài khoản Admin, bạn có thể tạo user mới qua API:

```bash
POST http://localhost:5000/api/v1/auth/users
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "username": "manager01",
  "password": "manager123",
  "full_name": "Manager 01",
  "email": "manager01@coffee.com",
  "roles": ["manager"]
}
```

### **Cách 2: Chạy Script Tạo Tài Khoản (KHUYẾN NGHỊ)**

Đã có sẵn script để tạo đầy đủ các tài khoản test:

```bash
cd backend
node create-test-accounts.cjs
```

Script này sẽ:
- ✅ Tạo/cập nhật tài khoản Admin (admin / 123456)
- ✅ Tạo tài khoản Manager (manager01 / manager123)
- ✅ Tạo/cập nhật tài khoản Cashier (cashier01 / cashier123)
- ✅ Tạo tài khoản Kitchen (kitchen01 / kitchen123)
- ✅ Gán đúng roles cho từng tài khoản

---

## 📝 **DANH SÁCH TÀI KHOẢN ĐỀ XUẤT ĐỂ TEST**

### **Tài Khoản Staff (Nhân Viên):**

| Vai trò | Username | Password | Quyền |
|---------|----------|----------|-------|
| 👑 **Admin** | `admin` | `123456` | Tất cả quyền |
| 👔 **Manager** | `manager01` | `manager123` | Quản lý (xem reports, quản lý menu, bàn, ca) |
| 💳 **Cashier** | `cashier01` | `cashier123` | Thu ngân (tạo đơn, thanh toán) |
| 👨‍🍳 **Kitchen** | `kitchen01` | `kitchen123` | Bếp/Pha chế (xem Kitchen Display) |
| 🍽️ **Waiter** | `waiter01` | `waiter123` | Phục vụ (tạo đơn tại bàn, mang đi) |

### **Tài Khoản Khách Hàng (Customer Portal):**

| Số điện thoại | Password | Tên | Ghi chú |
|---------------|----------|-----|---------|
| `0987654321` | `customer123` | Nguyễn Văn A | Tài khoản mẫu |
| `0912345678` | `customer123` | Trần Thị B | Tài khoản mẫu |
| `0901234567` | `customer123` | Lê Văn C | Tài khoản mẫu |

---

## 🔧 **CÁCH TẠO TẤT CẢ TÀI KHOẢN TEST**

### **Bước 1: Chạy Script Tạo Tài Khoản**

Tôi sẽ tạo file script để bạn có thể tạo đầy đủ các tài khoản:

```bash
cd backend
node create-test-accounts.js
```

Script này sẽ tạo:
- ✅ Admin (nếu chưa có)
- ✅ Manager (manager01)
- ✅ Cashier (cashier01) - nếu chưa có
- ✅ Kitchen (kitchen01)

### **Bước 2: Kiểm Tra Tài Khoản**

Sau khi chạy script, bạn có thể kiểm tra:

```bash
cd backend
node check-user-roles.cjs
```

---

## 📊 **BẢNG TỔNG HỢP**

### **Staff Accounts:**

```
👑 Admin
   Username: admin
   Password: 123456
   Quyền: Tất cả

👔 Manager  
   Username: manager01
   Password: manager123
   Quyền: Quản lý (reports, menu, tables, shifts)

💳 Cashier
   Username: cashier01
   Password: cashier123 (hoặc 123456)
   Quyền: Thu ngân (POS, payments)

👨‍🍳 Kitchen
   Username: kitchen01
   Password: kitchen123
   Quyền: Bếp (Kitchen Display)

🍽️ Waiter
   Username: waiter01
   Password: waiter123
   Quyền: Phục vụ (tạo đơn tại bàn, mang đi)
```

### **Customer Accounts:**

```
📱 0987654321
   Password: customer123
   Tên: Nguyễn Văn A

📱 0912345678
   Password: customer123
   Tên: Trần Thị B

📱 0901234567
   Password: customer123
   Tên: Lê Văn C
```

---

## ⚠️ **LƯU Ý**

1. **Mật khẩu mặc định:** Tất cả mật khẩu test đều đơn giản, chỉ dùng cho môi trường development
2. **Production:** Trong môi trường production, bạn PHẢI đổi tất cả mật khẩu
3. **Bảo mật:** Không commit file này vào git nếu có mật khẩu thật

---

## 🧪 **TEST VỚI TỪNG ROLE**

### **Test với Admin:**
- ✅ Có thể truy cập tất cả pages
- ✅ Có thể quản lý users
- ✅ Có thể xem tất cả reports
- ✅ Có thể quản lý menu, bàn, ca

### **Test với Manager:**
- ✅ Có thể quản lý menu, bàn, ca
- ✅ Có thể xem reports
- ✅ Có thể quản lý khuyến mãi
- ❌ KHÔNG thể quản lý users (chỉ Admin)

### **Test với Cashier:**
- ✅ Có thể truy cập POS
- ✅ Có thể tạo đơn, thanh toán
- ✅ Có thể xem đơn hàng
- ❌ KHÔNG thể truy cập Manager Dashboard
- ❌ KHÔNG thể quản lý menu

### **Test với Kitchen:**
- ✅ Có thể truy cập Kitchen Display
- ✅ Có thể cập nhật trạng thái món
- ❌ KHÔNG thể truy cập POS
- ❌ KHÔNG thể truy cập Manager Dashboard

---

## 🔄 **RESET MẬT KHẨU**

Nếu bạn quên mật khẩu hoặc muốn reset:

### **Qua Database:**
```sql
-- Reset password cho admin (mật khẩu mới: 123456)
UPDATE users 
SET password_hash = '$2b$10$rQ8K8K8K8K8K8K8K8K8KuK8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K'
WHERE username = 'admin';
```

**Lưu ý:** Hash trên chỉ là ví dụ, bạn cần hash mật khẩu mới bằng bcrypt.

### **Qua API (nếu có):**
```bash
POST http://localhost:5000/api/v1/auth/reset-password
```

---

## 📞 **HỖ TRỢ**

Nếu bạn gặp vấn đề với tài khoản:
1. Kiểm tra database có user không: `SELECT * FROM users;`
2. Kiểm tra roles: `SELECT * FROM user_roles;`
3. Chạy lại script setup: `node backend/setup-db.js`
4. Tạo lại user qua API hoặc script

---

**Chúc bạn test thành công!** 🎉

