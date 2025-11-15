# Hướng Dẫn Backup Lên Google Drive (H:\)

## ✅ **Đã Cấu Hình:**

- **Đường dẫn Google Drive:** `H:\`
- **Thư mục backup:** `H:\database-backups` (sẽ được tạo tự động)

---

## 🚀 **Cách Sử Dụng:**

### **Cách 1: Chỉ định đường dẫn cụ thể** ⭐ (Khuyến nghị)

```bash
cd backend
node backup-to-cloud.cjs --cloud-dir="H:\database-backups"
```

### **Cách 2: Để script tự tìm** 

Script sẽ tự động tìm thư mục `H:\database-backups` hoặc `H:\backups`:

```bash
cd backend
node backup-to-cloud.cjs
```

---

## 📋 **Các Bước:**

1. **Tạo thư mục backup trong Google Drive** (nếu chưa có):
   ```powershell
   # Mở PowerShell và chạy:
   New-Item -ItemType Directory -Path "H:\database-backups" -Force
   ```

2. **Chạy script backup:**
   ```bash
   cd backend
   node backup-to-cloud.cjs --cloud-dir="H:\database-backups"
   ```

3. **Kiểm tra:**
   - File backup sẽ xuất hiện trong `H:\database-backups\`
   - Google Drive Desktop sẽ tự động sync lên cloud
   - Bạn có thể thấy file trên https://drive.google.com

---

## 🔍 **Kiểm Tra:**

### **Kiểm tra thư mục H:\ có sẵn:**
```powershell
Test-Path "H:\"
Get-ChildItem "H:\" | Select-Object Name
```

### **Kiểm tra thư mục backup:**
```powershell
Test-Path "H:\database-backups"
Get-ChildItem "H:\database-backups" | Select-Object Name, Length, LastWriteTime
```

---

## 💡 **Lưu Ý:**

1. **Thư mục `H:\database-backups`** sẽ được tạo tự động khi chạy script
2. **Google Drive Desktop** sẽ tự động sync file lên cloud
3. **File backup** sẽ có tên: `backup-coffee_shop-YYYY-MM-DD-timestamp.backup`
4. **Script tự động xóa** backup cũ (giữ lại 10 bản mới nhất)

---

## 🆘 **Nếu Gặp Lỗi:**

### **Lỗi: "Không thể tạo thư mục"**
- Kiểm tra quyền truy cập vào `H:\`
- Thử tạo thư mục thủ công: `New-Item -ItemType Directory -Path "H:\database-backups"`

### **Lỗi: "Không tìm thấy thư mục cloud"**
- Chỉ định đường dẫn cụ thể: `--cloud-dir="H:\database-backups"`
- Hoặc tạo thư mục trước: `New-Item -ItemType Directory -Path "H:\database-backups" -Force`

---

## ✅ **Sẵn Sàng!**

Bạn có thể chạy script backup ngay bây giờ:

```bash
cd backend
node backup-to-cloud.cjs --cloud-dir="H:\database-backups"
```

**File sẽ tự động upload lên Google Drive!** ☁️

