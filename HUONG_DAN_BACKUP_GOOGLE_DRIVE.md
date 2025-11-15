# Hướng dẫn Backup Database Lên Google Drive

## 🎯 **Cách 1: Dùng Google Drive Desktop (Dễ nhất)** ⭐

### **Bước 1: Cài đặt Google Drive Desktop**

1. Tải Google Drive Desktop:
   - Truy cập: https://www.google.com/drive/download/
   - Hoặc tìm "Google Drive for Desktop" trên Google

2. Cài đặt và đăng nhập:
   - Cài đặt như bình thường
   - Đăng nhập bằng tài khoản Google của bạn
   - Chọn thư mục đồng bộ (ví dụ: `D:\GoogleDrive`)

### **Bước 2: Tạo thư mục backup**

```powershell
# Tạo thư mục backup trong Google Drive
New-Item -ItemType Directory -Path "D:\GoogleDrive\database-backups" -Force
```

**Lưu ý:** Thay `D:\GoogleDrive` bằng đường dẫn thư mục Google Drive của bạn.

### **Bước 3: Chạy script backup**

```bash
cd backend

# Backup và copy lên Google Drive
node backup-to-cloud.cjs --cloud-dir="D:\GoogleDrive\database-backups"
```

**Hoặc nếu script tự tìm thấy thư mục Google Drive:**
```bash
node backup-to-cloud.cjs
```

### **Kết quả:**
- ✅ File backup được tạo trong `backend/backups/`
- ✅ File được copy vào `D:\GoogleDrive\database-backups\`
- ✅ Google Drive Desktop tự động upload lên cloud
- ✅ Bạn có thể truy cập từ bất kỳ đâu!

---

## 🔧 **Cách 2: Upload thủ công (Không cần cài gì)**

### **Bước 1: Backup database**

```bash
cd backend
node backup-db.cjs --format=custom
```

### **Bước 2: Upload lên Google Drive**

1. Mở trình duyệt, truy cập: https://drive.google.com
2. Tạo thư mục mới: "Database Backups"
3. Upload file từ `backend/backups/backup-*.backup`
4. Xong!

**Lưu ý:** Phải upload thủ công mỗi lần backup.

---

## 🚀 **Cách 3: Dùng Google Drive API (Tự động hoàn toàn)**

### **Yêu cầu:**
- Node.js đã cài
- Google Cloud Project (miễn phí)
- OAuth credentials

### **Bước 1: Tạo Google Cloud Project**

1. Truy cập: https://console.cloud.google.com/
2. Tạo project mới (hoặc chọn project có sẵn)
3. Bật Google Drive API:
   - Vào "APIs & Services" > "Library"
   - Tìm "Google Drive API"
   - Click "Enable"

### **Bước 2: Tạo OAuth Credentials**

1. Vào "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Chọn "Desktop app"
4. Tải file JSON credentials về
5. Đặt vào: `backend/google-drive-credentials.json`

### **Bước 3: Cài đặt package**

```bash
cd backend
npm install googleapis
```

### **Bước 4: Chạy script (sẽ tạo sau)**

---

## 📋 **So sánh các cách:**

| Cách | Độ khó | Tự động | Cần cài gì |
|------|--------|--------|------------|
| **Google Drive Desktop** | ⭐ Dễ | ✅ Có | Google Drive Desktop |
| **Upload thủ công** | ⭐⭐ Rất dễ | ❌ Không | Không |
| **Google Drive API** | ⭐⭐⭐⭐ Khó | ✅✅ Hoàn toàn | Node.js, Google Cloud |

---

## ✅ **Khuyến nghị:**

**→ Dùng Cách 1 (Google Drive Desktop)** vì:
- ✅ Dễ setup nhất
- ✅ Tự động sync
- ✅ Không cần code phức tạp
- ✅ Hoạt động ngay sau khi cài

---

## 🔍 **Kiểm tra Google Drive Desktop đã cài chưa:**

```powershell
# Kiểm tra thư mục Google Drive
Test-Path "$env:USERPROFILE\Google Drive"
Test-Path "D:\GoogleDrive"
Test-Path "C:\Users\$env:USERNAME\Google Drive"

# Nếu có thư mục nào trả về True → Đã cài!
```

---

## 💡 **Sau khi setup:**

**Setup tự động hàng ngày:**
1. Tạo file `backup-daily.bat`:
```batch
@echo off
cd /d D:\my-thesis\backend
node backup-to-cloud.cjs --cloud-dir="D:\GoogleDrive\database-backups"
```

2. Thêm vào Task Scheduler:
   - Trigger: Daily, 2:00 AM
   - Action: Chạy `backup-daily.bat`

**→ Backup tự động mỗi ngày và upload lên Google Drive!**

