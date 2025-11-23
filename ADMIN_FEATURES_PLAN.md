# Kế hoạch: Chức năng Admin - Quản trị hệ thống

## 🔍 Phân tích hiện tại

### **Vấn đề:**
- Admin hiện tại có **cùng quyền với Manager**
- Không có chức năng đặc biệt nào chỉ dành cho Admin
- Middleware `adminOnly` đã được định nghĩa nhưng **không được sử dụng**

### **So sánh Admin vs Manager:**
| Chức năng | Manager | Admin |
|-----------|---------|-------|
| Quản lý menu | ✅ | ✅ |
| Quản lý kho | ✅ | ✅ |
| Quản lý nhân viên | ✅ | ✅ |
| Quản lý khu vực & bàn | ✅ | ✅ |
| Xem báo cáo | ✅ | ✅ |
| Hủy đơn | ✅ | ✅ |
| **Quản lý hệ thống** | ❌ | ❌ (chưa có) |
| **Backup/Restore DB** | ❌ | ❌ (chưa có) |
| **System Settings** | ❌ | ❌ (chưa có) |
| **Audit Logs** | ❌ | ❌ (chưa có) |
| **Xóa Manager** | ❌ | ❌ (chưa có) |

---

## 🎯 Chức năng cần thêm cho Admin

### **1. System Settings (Cấu hình hệ thống)**

#### **Backend:**
- `GET /api/v1/admin/settings` - Lấy cấu hình hệ thống
- `PUT /api/v1/admin/settings` - Cập nhật cấu hình
- Permission: `adminOnly`

#### **Frontend:**
- Trang `/admin/settings`
- Các cấu hình:
  - **General:**
    - Tên cửa hàng
    - Địa chỉ
    - Số điện thoại
    - Email
    - Logo
  - **Business:**
    - Giờ mở cửa/đóng cửa
    - Múi giờ
    - Đơn vị tiền tệ
    - Thuế VAT (%)
  - **POS:**
    - Cho phép hủy đơn (Yes/No)
    - Cho phép chỉnh sửa giá (Yes/No)
    - Tự động in hóa đơn (Yes/No)
  - **Notifications:**
    - Email notifications
    - SMS notifications
  - **Security:**
    - Session timeout (phút)
    - Password policy
    - 2FA (nếu có)

---

### **2. System Logs (Nhật ký hệ thống)**

#### **Backend:**
- `GET /api/v1/admin/logs` - Lấy logs hệ thống
- `GET /api/v1/admin/logs/:id` - Chi tiết log
- `DELETE /api/v1/admin/logs` - Xóa logs cũ
- Permission: `adminOnly`

#### **Frontend:**
- Trang `/admin/logs`
- Hiển thị:
  - Thời gian
  - Level (INFO, WARN, ERROR)
  - User (nếu có)
  - Action
  - Message
  - IP Address
- Filter:
  - Theo level
  - Theo user
  - Theo thời gian
  - Theo action
- Export logs (CSV/JSON)

---

### **3. Audit Trail (Lịch sử thay đổi)**

#### **Backend:**
- Tạo bảng `audit_logs`:
  ```sql
  CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    action VARCHAR(100), -- 'CREATE', 'UPDATE', 'DELETE'
    entity_type VARCHAR(50), -- 'USER', 'MENU', 'ORDER', etc.
    entity_id INTEGER,
    old_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT NOW()
  );
  ```
- `GET /api/v1/admin/audit` - Lấy audit logs
- Permission: `adminOnly`

#### **Frontend:**
- Trang `/admin/audit`
- Hiển thị:
  - Thời gian
  - User thực hiện
  - Action (CREATE/UPDATE/DELETE)
  - Entity (USER/MENU/ORDER/etc.)
  - Entity ID
  - Thay đổi (old → new)
  - IP Address
- Filter:
  - Theo user
  - Theo action
  - Theo entity type
  - Theo thời gian

---

### **4. Database Management (Quản lý Database)**

#### **Backend:**
- `POST /api/v1/admin/database/backup` - Tạo backup
- `GET /api/v1/admin/database/backups` - Danh sách backups
- `POST /api/v1/admin/database/restore` - Restore từ backup
- `DELETE /api/v1/admin/database/backups/:id` - Xóa backup
- Permission: `adminOnly`

#### **Frontend:**
- Trang `/admin/database`
- Chức năng:
  - **Backup:**
    - Tạo backup thủ công
    - Lên lịch backup tự động (daily/weekly)
    - Xem danh sách backups
    - Download backup
  - **Restore:**
    - Upload file backup
    - Chọn backup từ danh sách
    - Xác nhận restore (cảnh báo mất dữ liệu)
  - **Maintenance:**
    - Vacuum database
    - Analyze database
    - Reindex tables

---

### **5. Advanced User Management (Quản lý User nâng cao)**

#### **Backend:**
- `GET /api/v1/admin/users` - Lấy tất cả users (bao gồm Manager)
- `PUT /api/v1/admin/users/:id/roles` - Gán roles (bao gồm Manager/Admin)
- `DELETE /api/v1/admin/users/:id` - Xóa user (bao gồm Manager)
- `POST /api/v1/admin/users/:id/reset-password` - Reset password
- `PUT /api/v1/admin/users/:id/activate` - Activate/Deactivate user
- Permission: `adminOnly`

#### **Frontend:**
- Trang `/admin/users` (hoặc mở rộng `/employees`)
- Chức năng:
  - Xem tất cả users (bao gồm Manager)
  - Gán role Manager/Admin (chỉ Admin mới được)
  - Xóa Manager (cảnh báo)
  - Reset password cho bất kỳ user nào
  - Activate/Deactivate user
  - Xem login history

---

### **6. System Health & Monitoring (Giám sát hệ thống)**

#### **Backend:**
- `GET /api/v1/admin/health` - Health check
- `GET /api/v1/admin/stats` - Thống kê hệ thống
- Permission: `adminOnly`

#### **Frontend:**
- Trang `/admin/health`
- Hiển thị:
  - **System:**
    - CPU usage
    - Memory usage
    - Disk usage
    - Database size
  - **Performance:**
    - Response time
    - Active connections
    - Query performance
  - **Business:**
    - Total users
    - Total orders (today/week/month)
    - Total revenue (today/week/month)
    - Active shifts

---

### **7. Admin Dashboard (Trang Admin riêng)**

#### **Frontend:**
- Trang `/admin` (riêng biệt với `/manager`)
- Navigation:
  - 📊 Dashboard (overview)
  - ⚙️ System Settings
  - 📝 System Logs
  - 🔍 Audit Trail
  - 💾 Database Management
  - 👥 User Management
  - 🏥 System Health
  - 🔄 Quay lại Manager Dashboard

---

## 📋 Implementation Plan

### **Phase 1: Cơ bản (Ưu tiên cao)**
1. ✅ Tạo trang `/admin` riêng
2. ✅ System Settings (cấu hình cơ bản)
3. ✅ Advanced User Management (gán role Manager/Admin)

### **Phase 2: Monitoring (Ưu tiên trung bình)**
4. ✅ System Logs
5. ✅ System Health & Monitoring

### **Phase 3: Advanced (Ưu tiên thấp)**
6. ✅ Audit Trail
7. ✅ Database Management (backup/restore)

---

## 🔐 Phân quyền mới

### **Routes chỉ Admin:**
```javascript
// Backend
router.get('/admin/settings', authRequired, adminOnly, ...);
router.put('/admin/settings', authRequired, adminOnly, ...);
router.get('/admin/logs', authRequired, adminOnly, ...);
router.get('/admin/audit', authRequired, adminOnly, ...);
router.post('/admin/database/backup', authRequired, adminOnly, ...);
router.get('/admin/health', authRequired, adminOnly, ...);

// Frontend
{ path: '/admin', element: <RoleGuard allowedRoles={['admin']}><AdminDashboard /></RoleGuard> }
{ path: '/admin/settings', element: <RoleGuard allowedRoles={['admin']}><SystemSettings /></RoleGuard> }
{ path: '/admin/logs', element: <RoleGuard allowedRoles={['admin']}><SystemLogs /></RoleGuard> }
```

### **Chức năng Manager không thể làm:**
- ❌ Gán role Admin cho user khác
- ❌ Xóa user có role Admin
- ❌ Thay đổi system settings
- ❌ Xem system logs
- ❌ Backup/restore database
- ❌ Xem audit trail

---

## 🎯 Kết luận

**Cần thêm:**
1. Trang Admin Dashboard riêng (`/admin`)
2. System Settings
3. Advanced User Management (gán role Manager/Admin)
4. System Logs
5. System Health & Monitoring
6. Audit Trail
7. Database Management

**Ưu tiên:**
- **Cao:** System Settings, Advanced User Management
- **Trung bình:** System Logs, System Health
- **Thấp:** Audit Trail, Database Management

