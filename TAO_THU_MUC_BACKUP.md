# Hướng Dẫn Tạo Thư Mục Backup Trong Google Drive (H:\)

## 📁 **Tạo Thư Mục Thủ Công:**

Vì `H:\` có thể có vấn đề với quyền, hãy tạo thư mục thủ công:

### **Cách 1: Dùng File Explorer** ⭐ (Dễ nhất)

1. Mở **File Explorer** (Windows + E)
2. Vào ổ đĩa **H:\**
3. Click chuột phải → **New** → **Folder**
4. Đặt tên: `database-backups`
5. Xong!

### **Cách 2: Dùng PowerShell**

Mở PowerShell và chạy:
```powershell
# Thử cách 1
mkdir "H:\database-backups"

# Nếu không được, thử cách 2
New-Item -ItemType Directory -Path "H:\database-backups"

# Hoặc cách 3 (với quyền admin)
Start-Process powershell -Verb RunAs -ArgumentList "-Command", "New-Item -ItemType Directory -Path 'H:\database-backups' -Force"
```

### **Cách 3: Dùng Command Prompt (CMD)**

Mở CMD (Run as Administrator) và chạy:
```cmd
mkdir "H:\database-backups"
```

---

## ✅ **Sau Khi Tạo Thư Mục:**

### **Kiểm tra:**
```powershell
Test-Path "H:\database-backups"
```

### **Chạy backup:**
```bash
cd backend
node backup-to-cloud.cjs --cloud-dir="H:\database-backups"
```

---

## 🔍 **Nếu Vẫn Không Được:**

### **Thử thư mục khác trong H:\:**

Có thể Google Drive của bạn có cấu trúc khác. Hãy kiểm tra:

```powershell
# Xem các thư mục trong H:\
Get-ChildItem "H:\" -Directory | Select-Object Name

# Tạo thư mục trong thư mục con (nếu có)
# Ví dụ: H:\My Drive\database-backups
```

### **Hoặc dùng đường dẫn đầy đủ:**

Nếu Google Drive có cấu trúc như `H:\My Drive\`, hãy dùng:

```bash
node backup-to-cloud.cjs --cloud-dir="H:\My Drive\database-backups"
```

---

## 💡 **Lưu Ý:**

- Thư mục `database-backups` sẽ chứa tất cả file backup
- Google Drive Desktop sẽ tự động sync lên cloud
- Script sẽ tự động xóa backup cũ (giữ 10 bản mới nhất)

---

## 🚀 **Sau Khi Tạo Xong:**

Chạy script backup:

```bash
cd backend
node backup-to-cloud.cjs --cloud-dir="H:\database-backups"
```

**File sẽ tự động upload lên Google Drive!** ☁️

