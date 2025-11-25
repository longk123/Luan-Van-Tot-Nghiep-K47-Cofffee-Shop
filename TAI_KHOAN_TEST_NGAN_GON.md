# 🔑 TÀI KHOẢN TEST - TÓM TẮT

## 🚀 **TẠO TẤT CẢ TÀI KHOẢN**

```bash
cd backend
node create-test-accounts.cjs
```

---

## 📋 **DANH SÁCH TÀI KHOẢN**

### **👑 Admin** (Có sẵn sau setup-db.js)
- **Username:** `admin`
- **Password:** `123456` (hoặc `admin123` nếu đã chạy seed-admin-data.cjs)
- **Quyền:** Tất cả quyền

### **💳 Cashier** (Có sẵn sau setup-db.js)
- **Username:** `cashier01`
- **Password:** `123456`
- **Quyền:** Thu ngân (POS, payments)

### **👔 Manager** (Cần chạy create-test-accounts.cjs)
- **Username:** `manager01`
- **Password:** `manager123`
- **Quyền:** Quản lý (reports, menu, tables, shifts)

### **👨‍🍳 Kitchen** (Cần chạy create-test-accounts.cjs)
- **Username:** `kitchen01`
- **Password:** `kitchen123`
- **Quyền:** Bếp/Pha chế (Kitchen Display)

### **🍽️ Waiter (Phục vụ)** (Cần chạy create-test-accounts.cjs)
- **Username:** `waiter01`
- **Password:** `waiter123`
- **Quyền:** Phục vụ (tạo đơn tại bàn, mang đi)

---

## 📱 **TÀI KHOẢN KHÁCH HÀNG (Customer Portal)**

| Số điện thoại | Password | Tên |
|---------------|----------|-----|
| `0987654321` | `customer123` | Nguyễn Văn A |
| `0912345678` | `customer123` | Trần Thị B |
| `0901234567` | `customer123` | Lê Văn C |

---

**Chi tiết xem:** `TAI_KHOAN_TEST.md`

