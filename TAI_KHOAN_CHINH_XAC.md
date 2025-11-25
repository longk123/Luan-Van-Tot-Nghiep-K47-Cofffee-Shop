# 🔑 TÀI KHOẢN TEST - THÔNG TIN CHÍNH XÁC

**Ngày cập nhật:** 2025-01-XX  
**Nguồn:** Kiểm tra từ codebase

---

## ✅ **TÀI KHOẢN CÓ SẴN SAU KHI CHẠY setup-db.js**

File `backend/setup-db.js` là file chính để setup database. Sau khi chạy, bạn sẽ có:

| Vai trò | Username | Password | Quyền |
|---------|----------|----------|-------|
| 👑 **Admin** | `admin` | `123456` | Tất cả quyền |
| 💳 **Cashier** | `cashier01` | `123456` | Chỉ thu ngân |

**Nguồn:** `backend/setup-db.js` dòng 664-665, 1092-1093

---

## ⚠️ **LƯU Ý QUAN TRỌNG**

### **1. Mật khẩu Admin có thể khác:**

Nếu bạn đã chạy `backend/seed-admin-data.cjs`, mật khẩu admin có thể đã bị đổi thành `admin123`.

**Giải pháp:** Thử cả 2 mật khẩu:
- `123456` (mặc định từ setup-db.js)
- `admin123` (nếu đã chạy seed-admin-data.cjs)

### **2. Manager và Kitchen không có sẵn:**

Các tài khoản `manager01` và `kitchen01` **KHÔNG** được tạo tự động trong `setup-db.js`.

**Giải pháp:** Chạy script để tạo:
```bash
cd backend
node create-test-accounts.cjs
```

Sau khi chạy script này, bạn sẽ có:
- `manager01` / `manager123`
- `kitchen01` / `kitchen123`

---

## 📋 **BẢNG TỔNG HỢP ĐẦY ĐỦ**

### **Tài khoản có sẵn (sau setup-db.js):**

| Username | Password | Role | Có sẵn? |
|----------|----------|------|---------|
| `admin` | `123456` hoặc `admin123` | Admin | ✅ Có |
| `cashier01` | `123456` | Cashier | ✅ Có |

### **Tài khoản cần tạo (chạy create-test-accounts.cjs):**

| Username | Password | Role | Có sẵn? |
|----------|----------|------|---------|
| `manager01` | `manager123` | Manager | ❌ Cần tạo |
| `kitchen01` | `kitchen123` | Kitchen | ❌ Cần tạo |
| `waiter01` | `waiter123` | Waiter | ❌ Cần tạo |

---

## 🚀 **CÁCH TẠO ĐẦY ĐỦ TẤT CẢ TÀI KHOẢN**

### **Bước 1: Chạy setup database (nếu chưa chạy)**
```bash
cd backend
node setup-db.js
```

**Kết quả:** Có 2 tài khoản:
- `admin` / `123456`
- `cashier01` / `123456`

### **Bước 2: Tạo thêm Manager và Kitchen**
```bash
cd backend
node create-test-accounts.cjs
```

**Kết quả:** Có thêm 3 tài khoản:
- `manager01` / `manager123`
- `kitchen01` / `kitchen123`
- `waiter01` / `waiter123`

**Lưu ý:** Script này cũng sẽ cập nhật lại mật khẩu cho `admin` và `cashier01` nếu cần.

---

## 🧪 **KIỂM TRA TÀI KHOẢN TRONG DATABASE**

Nếu bạn muốn kiểm tra tài khoản nào đã tồn tại:

```bash
cd backend
node check-user-roles.cjs
```

Script này sẽ:
- ✅ Liệt kê tất cả users
- ✅ Hiển thị roles của từng user
- ✅ Tạo user `kitchen01` nếu chưa có (nhưng password là dummy, không dùng được)

---

## 📝 **TÓM TẮT NHANH**

### **Để test ngay:**
1. Thử đăng nhập với:
   - `admin` / `123456` (hoặc `admin123`)
   - `cashier01` / `123456`

### **Để có đầy đủ tài khoản:**
1. Chạy: `node backend/create-test-accounts.cjs`
2. Sau đó có thể đăng nhập với tất cả 5 tài khoản

---

## 🔍 **TROUBLESHOOTING**

### **Không đăng nhập được với admin/123456:**
- ✅ Thử `admin123` (nếu đã chạy seed-admin-data.cjs)
- ✅ Kiểm tra database có user không: `SELECT * FROM users WHERE username='admin';`
- ✅ Chạy lại setup: `node backend/setup-db.js`

### **Không có tài khoản Manager/Kitchen:**
- ✅ Chạy: `node backend/create-test-accounts.cjs`
- ✅ Kiểm tra: `node backend/check-user-roles.cjs`

### **Quên mật khẩu:**
- ✅ Reset qua script: `node backend/create-test-accounts.cjs` (sẽ cập nhật lại mật khẩu)

---

**Chúc bạn test thành công!** 🎉

