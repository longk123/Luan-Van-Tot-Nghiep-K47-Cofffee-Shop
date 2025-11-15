# ✅ Hướng Dẫn Backup Lên Google Drive (H:\My Drive\)

## 🎯 **Đã Phát Hiện:**

Google Drive Desktop của bạn có cấu trúc:
- **H:\My Drive\** ← Thư mục chính để lưu file
- **H:\Other computers\**
- **H:\.shortcut-targets-by-id\**

**→ Thư mục backup nên đặt trong: `H:\My Drive\database-backups`**

---

## 🚀 **Cách Sử Dụng:**

### **Cách 1: Để script tự tìm** ⭐ (Khuyến nghị)

Script sẽ tự động tìm `H:\My Drive\database-backups`:

```bash
cd backend
node backup-to-cloud.cjs
```

### **Cách 2: Chỉ định đường dẫn cụ thể**

```bash
cd backend
node backup-to-cloud.cjs --cloud-dir="H:\My Drive\database-backups"
```

---

## 📋 **Các Bước:**

### **Bước 1: Tạo thư mục backup (nếu chưa có)**

Script sẽ tự động tạo, nhưng nếu gặp lỗi, tạo thủ công:

**Cách 1: File Explorer** (Dễ nhất)
1. Mở File Explorer
2. Vào `H:\My Drive\`
3. Tạo thư mục mới: `database-backups`

**Cách 2: PowerShell**
```powershell
New-Item -ItemType Directory -Path "H:\My Drive\database-backups" -Force
```

### **Bước 2: Chạy script backup**

```bash
cd backend
node backup-to-cloud.cjs
```

### **Bước 3: Kiểm tra**

- File backup sẽ xuất hiện trong `H:\My Drive\database-backups\`
- Google Drive Desktop sẽ tự động sync lên cloud
- Truy cập: https://drive.google.com → Tìm thư mục "database-backups"

---

## ✅ **Script Đã Được Cập Nhật:**

Script `backup-to-cloud.cjs` đã được cập nhật để:
- ✅ Tự động tìm `H:\My Drive\database-backups`
- ✅ Tự động tạo thư mục nếu chưa có
- ✅ Xử lý lỗi nếu không thể tạo thư mục
- ✅ Hướng dẫn tạo thủ công nếu cần

---

## 🔍 **Kiểm Tra:**

### **Kiểm tra thư mục:**
```powershell
Test-Path "H:\My Drive\database-backups"
Get-ChildItem "H:\My Drive\database-backups" | Select-Object Name, Length, LastWriteTime
```

### **Kiểm tra Google Drive sync:**
- Mở https://drive.google.com
- Tìm thư mục "database-backups"
- File backup sẽ có ở đó!

---

## 💡 **Lưu Ý:**

1. **Thư mục `H:\My Drive\database-backups`** sẽ được tạo tự động
2. **Google Drive Desktop** sẽ tự động sync file lên cloud
3. **File backup** sẽ có tên: `backup-coffee_shop-YYYY-MM-DD-timestamp.backup`
4. **Script tự động xóa** backup cũ (giữ lại 10 bản mới nhất)
5. **File metadata** (`.meta.json`) cũng được copy lên cloud

---

## 🆘 **Nếu Gặp Lỗi:**

### **Lỗi: "Không thể tạo thư mục"**
- Tạo thủ công: `New-Item -ItemType Directory -Path "H:\My Drive\database-backups" -Force`
- Hoặc dùng File Explorer

### **Lỗi: "Không tìm thấy thư mục cloud"**
- Chỉ định đường dẫn cụ thể: `--cloud-dir="H:\My Drive\database-backups"`
- Kiểm tra: `Test-Path "H:\My Drive"`

---

## ✅ **Sẵn Sàng!**

Bạn có thể chạy script backup ngay:

```bash
cd backend
node backup-to-cloud.cjs
```

**Script sẽ:**
1. ✅ Backup database
2. ✅ Tìm thư mục `H:\My Drive\database-backups`
3. ✅ Copy file lên đó
4. ✅ Google Drive tự động sync lên cloud

**→ File sẽ có trên Google Drive trong vài giây!** ☁️

