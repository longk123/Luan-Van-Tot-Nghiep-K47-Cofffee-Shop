# ✅ Checklist Kiểm Tra Script Backup

## 🔍 **Đã kiểm tra và sửa:**

### **1. backup-db.cjs** ✅
- ✅ Xử lý đường dẫn có khoảng trắng (escape path)
- ✅ Xử lý lỗi khi pg_dump fail
- ✅ Kiểm tra file backup đã được tạo
- ✅ Xử lý warning từ pg_dump
- ✅ Tạo metadata file
- ✅ Hỗ trợ nhiều format (plain, custom, tar, directory)

### **2. backup-to-cloud.cjs** ✅
- ✅ Xử lý lỗi khi backup-db.cjs fail
- ✅ Kiểm tra file backup tồn tại và hợp lệ
- ✅ Đợi file được ghi xong trước khi copy
- ✅ Kiểm tra kích thước file > 0
- ✅ Copy metadata file
- ✅ Tự động xóa backup cũ (giữ 10 bản)
- ✅ Tìm thư mục cloud tự động

### **3. restore-db.cjs** ✅
- ✅ Xử lý đường dẫn có khoảng trắng
- ✅ Tìm file backup trong nhiều vị trí
- ✅ Xác nhận trước khi restore
- ✅ Xử lý lỗi khi drop/create database
- ✅ Xử lý warning từ psql/pg_restore
- ✅ Hỗ trợ nhiều format

---

## 🧪 **Test Cases Đã Kiểm Tra:**

### **backup-db.cjs:**
- ✅ Backup với format mặc định (plain SQL)
- ✅ Backup với format custom
- ✅ Backup với format tar
- ✅ Backup với format directory
- ✅ Xử lý lỗi khi pg_dump không tìm thấy
- ✅ Xử lý lỗi khi database không tồn tại
- ✅ Xử lý lỗi khi password sai
- ✅ Xử lý đường dẫn có khoảng trắng

### **backup-to-cloud.cjs:**
- ✅ Backup và copy lên cloud thành công
- ✅ Xử lý khi backup-db.cjs fail
- ✅ Xử lý khi không tìm thấy thư mục cloud
- ✅ Xử lý khi file backup không tồn tại
- ✅ Xử lý khi file backup rỗng
- ✅ Tự động xóa backup cũ

### **restore-db.cjs:**
- ✅ Restore từ file SQL
- ✅ Restore từ file custom
- ✅ Xử lý khi file không tồn tại
- ✅ Xác nhận trước khi restore
- ✅ Xử lý khi database đã tồn tại
- ✅ Xử lý khi drop database fail

---

## ⚠️ **Lưu ý:**

1. **Cần file `.env`** trong thư mục `backend/` với:
   ```
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=coffee_shop
   DB_USER=postgres
   DB_PASSWORD=your_password
   ```

2. **PostgreSQL phải được cài đặt** và `pg_dump`, `pg_restore`, `psql` có trong PATH

3. **User phải có quyền** truy cập database

4. **Thư mục `backend/backups/`** sẽ được tạo tự động

---

## 🚀 **Sẵn sàng sử dụng!**

Tất cả script đã được kiểm tra kỹ và sẵn sàng để sử dụng.

**Cách dùng:**
```bash
cd backend

# Backup database
node backup-db.cjs --format=custom

# Backup và upload lên cloud
node backup-to-cloud.cjs --cloud-dir="D:\GoogleDrive\backups"

# Restore database
node restore-db.cjs --input=backups/backup-2024-11-04.backup
```

