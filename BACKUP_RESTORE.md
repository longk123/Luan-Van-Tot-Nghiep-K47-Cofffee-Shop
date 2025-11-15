# Hướng dẫn Backup & Restore

## 📦 **Các phương pháp Backup có sẵn**

### **1. Git Tags & Branches** ⭐ (Khuyến nghị)

Phiên bản v1.0.0 đã được đánh dấu và có thể khôi phục bất cứ lúc nào.

#### Xem các phiên bản có sẵn:
```bash
# Xem tất cả tags
git tag -l

# Xem tất cả branches
git branch -a
```

#### Quay lại phiên bản v1.0.0:
```bash
# Cách 1: Checkout tag (chế độ detached HEAD - chỉ xem)
git checkout v1.0.0

# Cách 2: Tạo branch mới từ v1.0.0 để làm việc
git checkout -b working-from-v1.0.0 v1.0.0

# Cách 3: Reset về v1.0.0 (CẢNH BÁO: Mất code hiện tại)
git reset --hard v1.0.0

# Cách 4: Checkout branch backup
git checkout backup-v1.0.0-stable
```

#### Xem code của phiên bản cũ mà không checkout:
```bash
# Xem một file cụ thể
git show v1.0.0:frontend/src/components/OrderDrawer.jsx

# Xem toàn bộ thay đổi
git show v1.0.0

# So sánh với phiên bản hiện tại
git diff v1.0.0 HEAD
```

---

### **2. Git Bundle** (Portable backup)

File: `my-thesis-v1.0.0.bundle`
- Là bản backup HOÀN CHỈNH của Git repository
- Có thể copy đi bất cứ đâu (USB, cloud, email)
- Restore được trên máy khác

#### Restore từ bundle:
```bash
# Tạo repository mới từ bundle
git clone my-thesis-v1.0.0.bundle my-thesis-restored

# Hoặc fetch vào repository hiện tại
git fetch my-thesis-v1.0.0.bundle refs/*:refs/*
```

#### Verify bundle:
```bash
git bundle verify my-thesis-v1.0.0.bundle
```

---

### **3. Branch Backup** (Stable reference)

Branch: `backup-v1.0.0-stable`
- Branch cố định trỏ đến commit v1.0.0
- Không bao giờ thay đổi
- An toàn tuyệt đối

#### Sử dụng:
```bash
# Checkout branch backup
git checkout backup-v1.0.0-stable

# Tạo branch mới từ backup
git checkout -b new-feature backup-v1.0.0-stable

# Merge backup vào branch hiện tại
git merge backup-v1.0.0-stable
```

---

## 🔄 **Các kịch bản phục hồi thường gặp**

### **Kịch bản 1: Muốn xem lại code cũ**
```bash
# Chỉ xem, không thay đổi
git checkout v1.0.0
# ... xem code ...
git checkout master  # Quay lại
```

### **Kịch bản 2: Tạo tính năng mới từ v1.0.0**
```bash
git checkout -b feature/new-feature v1.0.0
# ... code tính năng mới ...
git add .
git commit -m "feat: New feature"
```

### **Kịch bản 3: Code mới bị lỗi, muốn quay về v1.0.0**
```bash
# Tạo backup branch hiện tại trước (phòng hờ)
git branch backup-before-reset

# Reset về v1.0.0
git reset --hard v1.0.0

# Nếu muốn quay lại
git reset --hard backup-before-reset
```

### **Kịch bản 4: Máy hỏng, restore từ bundle**
```bash
# Trên máy mới
git clone my-thesis-v1.0.0.bundle my-thesis
cd my-thesis
git checkout master
```

### **Kịch bản 5: Chỉ muốn restore 1 file**
```bash
# Restore file từ v1.0.0 vào working directory
git checkout v1.0.0 -- frontend/src/components/OrderDrawer.jsx

# Hoặc xem nội dung mà không restore
git show v1.0.0:frontend/src/components/OrderDrawer.jsx > OrderDrawer-v1.0.0.jsx
```

---

## 🌐 **Push lên Remote Repository** (Backup online)

### **GitHub:**
```bash
# Tạo repository trên GitHub trước, sau đó:
git remote add origin https://github.com/yourusername/my-thesis.git
git push -u origin master
git push --tags  # Push cả tags
git push origin backup-v1.0.0-stable  # Push branch backup
```

### **GitLab:**
```bash
git remote add origin https://gitlab.com/yourusername/my-thesis.git
git push -u origin master
git push --tags
git push origin backup-v1.0.0-stable
```

### **Bitbucket:**
```bash
git remote add origin https://bitbucket.org/yourusername/my-thesis.git
git push -u origin master
git push --tags
git push origin backup-v1.0.0-stable
```

---

## 💾 **Backup thêm (không dùng Git)**

### **Tạo ZIP archive:**
```bash
# Tạo ZIP (Windows PowerShell)
Compress-Archive -Path * -DestinationPath my-thesis-v1.0.0-backup.zip

# Hoặc dùng 7zip
7z a my-thesis-v1.0.0-backup.7z *
```

### **Backup chỉ source code (không có node_modules):**
```bash
git archive --format=zip --output=my-thesis-v1.0.0-source.zip v1.0.0
```

---

## 📋 **Checklist Backup**

✅ Git tag: `v1.0.0` - Có sẵn  
✅ Git branch: `backup-v1.0.0-stable` - Có sẵn  
✅ Git bundle: `my-thesis-v1.0.0.bundle` - Có sẵn  
⬜ Remote repository (GitHub/GitLab) - Chưa (nên làm)  
⬜ ZIP backup - Tùy chọn  
⬜ Cloud backup (Google Drive, OneDrive) - Tùy chọn  

---

## ⚠️ **Lưu ý quan trọng**

1. **Git bundle** là backup tốt nhất - chứa TOÀN BỘ lịch sử
2. **Remote repository** (GitHub/GitLab) là backup an toàn nhất - online, miễn phí
3. **Tags và branches** không thể mất trừ khi bạn xóa repository
4. Nên có **ít nhất 3 bản backup** ở 3 nơi khác nhau:
   - Git repository (máy local)
   - Git bundle (USB/external drive)
   - Remote repository (GitHub/GitLab)

---

## 🆘 **Khẩn cấp: Mất code**

Nếu mất toàn bộ code, khôi phục theo thứ tự:

1. **Restore từ Remote (GitHub/GitLab)**
   ```bash
   git clone https://github.com/yourusername/my-thesis.git
   ```

2. **Restore từ Git Bundle**
   ```bash
   git clone my-thesis-v1.0.0.bundle my-thesis
   ```

3. **Restore từ ZIP backup**
   ```bash
   # Giải nén và copy
   ```

---

## 📞 **Hỗ trợ**

Nếu gặp vấn đề, tham khảo:
- Git documentation: https://git-scm.com/doc
- GitHub guides: https://guides.github.com
- Stack Overflow: https://stackoverflow.com/questions/tagged/git

---

## 🗄️ **Backup Database PostgreSQL** ⭐ (QUAN TRỌNG)

**Code đã được backup, nhưng DỮ LIỆU trong database cũng cần được backup!**

### **⚠️ CẢNH BÁO QUAN TRỌNG: Backup chỉ trên laptop = MẤT KHI LAPTOP HỎNG!**

**Vấn đề:**
- Backup lưu trong `backend/backups/` trên laptop → **MẤT KHI LAPTOP HỎNG!**
- Code trên GitHub → ✅ An toàn
- Database backup chỉ trên laptop → ❌ **NGUY HIỂM!**

**Giải pháp BẮT BUỘC:**
1. ✅ Backup lên **Cloud** (Google Drive, OneDrive, Dropbox)
2. ✅ Backup lên **USB/External Drive** định kỳ
3. ✅ Backup lên **GitHub** (nếu file nhỏ) hoặc **Git LFS**
4. ✅ Backup tự động lên cloud mỗi ngày

**→ Xem phần "Backup Lên Cloud" bên dưới để setup ngay!**

### **⚠️ Yêu cầu trước khi backup:**

1. **PostgreSQL đã được cài đặt** và các công cụ (`pg_dump`, `pg_restore`, `psql`) có trong PATH
   - Kiểm tra: `pg_dump --version`
   - Nếu chưa có, cài đặt PostgreSQL từ: https://www.postgresql.org/download/

2. **File `.env` trong thư mục `backend/`** chứa thông tin kết nối database:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=coffee_shop
   DB_USER=postgres
   DB_PASSWORD=your_password
   ```

3. **User có quyền truy cập database** (quyền đọc cho backup, quyền ghi cho restore)

### **1. Backup Database (Khuyến nghị)**

#### **Cách 1: Sử dụng script tự động** ⭐ (Dễ nhất)

```bash
cd backend

# Backup với tên file tự động
node backup-db.cjs

# Backup với tên file tùy chỉnh
node backup-db.cjs --output=backup-2024-11-04.sql

# Backup format custom (nén tốt hơn, restore nhanh hơn)
node backup-db.cjs --format=custom

# Backup format tar
node backup-db.cjs --format=tar

# Backup format directory (cho database lớn)
node backup-db.cjs --format=directory
```

**Kết quả:**
- File backup sẽ được lưu trong `backend/backups/`
- Tự động tạo file metadata `.meta.json` chứa thông tin backup
- Hiển thị kích thước file và hướng dẫn restore

#### **Cách 2: Sử dụng pg_dump trực tiếp**

**Windows (PowerShell/CMD):**
```powershell
# Set password trước
$env:PGPASSWORD="your_password"

# Backup format SQL (plain text, dễ đọc)
pg_dump -h localhost -p 5432 -U postgres -d coffee_shop -f backup.sql

# Backup format custom (binary, nén tốt)
pg_dump -h localhost -p 5432 -U postgres -d coffee_shop -F c -f backup.backup

# Backup chỉ schema (không có data)
pg_dump -h localhost -p 5432 -U postgres -d coffee_shop --schema-only -f schema.sql

# Backup chỉ data (không có schema)
pg_dump -h localhost -p 5432 -U postgres -d coffee_shop --data-only -f data.sql
```

**Linux/Mac:**
```bash
# Backup format SQL (plain text, dễ đọc)
PGPASSWORD=your_password pg_dump -h localhost -p 5432 -U postgres -d coffee_shop -f backup.sql

# Backup format custom (binary, nén tốt)
PGPASSWORD=your_password pg_dump -h localhost -p 5432 -U postgres -d coffee_shop -F c -f backup.backup

# Backup chỉ schema (không có data)
PGPASSWORD=your_password pg_dump -h localhost -p 5432 -U postgres -d coffee_shop --schema-only -f schema.sql

# Backup chỉ data (không có schema)
PGPASSWORD=your_password pg_dump -h localhost -p 5432 -U postgres -d coffee_shop --data-only -f data.sql
```

#### **Cách 3: Backup từng bảng cụ thể**

**Windows:**
```powershell
$env:PGPASSWORD="your_password"
# Backup một bảng
pg_dump -h localhost -p 5432 -U postgres -d coffee_shop -t don_hang -f don_hang.sql

# Backup nhiều bảng
pg_dump -h localhost -p 5432 -U postgres -d coffee_shop -t don_hang -t users -f tables.sql
```

**Linux/Mac:**
```bash
# Backup một bảng
PGPASSWORD=your_password pg_dump -h localhost -p 5432 -U postgres -d coffee_shop -t don_hang -f don_hang.sql

# Backup nhiều bảng
PGPASSWORD=your_password pg_dump -h localhost -p 5432 -U postgres -d coffee_shop -t don_hang -t users -f tables.sql
```

---

### **2. Restore Database**

#### **Cách 1: Sử dụng script tự động** ⭐ (Dễ nhất)

```bash
cd backend

# Restore từ file SQL
node restore-db.cjs --input=backup.sql

# Restore từ file custom
node restore-db.cjs --input=backup.backup --format=custom

# Restore và xóa database cũ trước (CẢNH BÁO!)
node restore-db.cjs --input=backup.sql --drop-existing

# Restore và tạo database mới
node restore-db.cjs --input=backup.sql --create-db
```

**Lưu ý:**
- Script sẽ hỏi xác nhận trước khi restore
- `--drop-existing`: Xóa database cũ trước khi restore (MẤT DỮ LIỆU!)
- `--create-db`: Tạo database mới nếu chưa có

#### **Cách 2: Sử dụng psql/pg_restore trực tiếp**

```bash
# Restore từ file SQL
# Windows: Cần set PGPASSWORD trước
set PGPASSWORD=your_password
psql -h localhost -p 5432 -U postgres -d coffee_shop -f backup.sql

# Linux/Mac: Có thể dùng PGPASSWORD hoặc nhập password khi hỏi
PGPASSWORD=your_password psql -h localhost -p 5432 -U postgres -d coffee_shop -f backup.sql

# Restore từ file custom
set PGPASSWORD=your_password  # Windows
pg_restore -h localhost -p 5432 -U postgres -d coffee_shop backup.backup

# Restore và tạo database mới
createdb -h localhost -p 5432 -U postgres coffee_shop
set PGPASSWORD=your_password  # Windows
psql -h localhost -p 5432 -U postgres -d coffee_shop -f backup.sql
```

---

### **3. Backup Tự Động Định Kỳ**

#### **Windows Task Scheduler:**

1. Tạo file batch `backup-db-daily.bat`:
```batch
@echo off
cd /d D:\my-thesis\backend
node backup-db.cjs --format=custom
```

2. Mở Task Scheduler, tạo task mới:
   - Trigger: Daily, 2:00 AM
   - Action: Chạy `backup-db-daily.bat`
   - Settings: Chạy ngay cả khi user không đăng nhập

#### **Linux Cron:**

Thêm vào crontab (`crontab -e`):
```bash
# Backup database mỗi ngày lúc 2:00 AM
0 2 * * * cd /path/to/my-thesis/backend && node backup-db.cjs --format=custom
```

#### **PowerShell Script (Windows):**

Tạo file `backup-db-scheduled.ps1`:
```powershell
$backupDir = "D:\my-thesis\backend\backups"
$maxBackups = 30  # Giữ tối đa 30 bản backup

# Chạy backup
cd D:\my-thesis\backend
node backup-db.cjs --format=custom

# Xóa backup cũ (giữ lại 30 bản mới nhất)
Get-ChildItem "$backupDir\*.backup" | 
    Sort-Object LastWriteTime -Descending | 
    Select-Object -Skip $maxBackups | 
    Remove-Item
```

---

### **4. Backup Lên Cloud (BẮT BUỘC - Để dùng khi laptop hỏng)** ⭐

#### **Cách 1: Sử dụng script tự động backup lên CẢ Google Drive VÀ OneDrive** ⭐⭐⭐ (KHUYẾN NGHỊ)

**Best Practice: Backup lên nhiều cloud để an toàn tối đa!**

```bash
cd backend

# Backup lên CẢ Google Drive VÀ OneDrive (KHUYẾN NGHỊ)
node backup-to-both-clouds.cjs

# Chỉ định đường dẫn cụ thể
node backup-to-both-clouds.cjs \
  --google-dir="H:\My Drive\database-backups" \
  --onedrive-dir="C:\Users\Long\OneDrive\database-backups"
```

**Script sẽ:**
1. ✅ Backup database một lần
2. ✅ Tự động tìm Google Drive
3. ✅ Tự động tìm OneDrive
4. ✅ Copy file lên CẢ 2 cloud
5. ✅ Tự động xóa backup cũ (giữ 10 bản mới nhất ở mỗi cloud)

**Lợi ích:**
- ✅ An toàn tối đa (nếu một cloud bị lỗi → còn cloud kia)
- ✅ Miễn phí (Google Drive 15GB + OneDrive 5GB = 20GB+)
- ✅ Tự động (không cần thao tác thủ công)
- ✅ Tuân thủ quy tắc 3-2-1 (Best Practice)

**→ Xem thêm:** `WHY_BACKUP_MULTIPLE_CLOUDS.md`

#### **Cách 2: Backup lên một cloud (Google Drive hoặc OneDrive)**

```bash
cd backend

# Backup lên Google Drive hoặc OneDrive (tự động tìm)
node backup-to-cloud.cjs

# Chỉ định đường dẫn cụ thể
node backup-to-cloud.cjs --cloud-dir="H:\My Drive\database-backups"
```

#### **Cách 3: Đồng bộ thư mục với Google Drive/OneDrive (Thủ công)** ⭐

**Windows:**
1. Cài đặt **Google Drive Desktop** hoặc **OneDrive**
2. Tạo thư mục đồng bộ: `D:\GoogleDrive\backups` hoặc `D:\OneDrive\backups`
3. Copy file backup vào thư mục này → Tự động upload lên cloud
4. Hoặc di chuyển thư mục `backend/backups/` vào thư mục đồng bộ

**Tự động hóa (PowerShell):**
```powershell
# Script copy backup lên Google Drive/OneDrive
$backupDir = "D:\my-thesis\backend\backups"
$cloudDir = "D:\GoogleDrive\backups"  # Hoặc D:\OneDrive\backups

# Copy file backup mới nhất
Get-ChildItem "$backupDir\*.backup" | 
    Sort-Object LastWriteTime -Descending | 
    Select-Object -First 1 | 
    Copy-Item -Destination $cloudDir -Force

Write-Host "✅ Đã copy backup lên cloud: $cloudDir"
```

#### **Cách 4: Upload thủ công lên Google Drive/OneDrive**

1. Backup database: `node backup-db.cjs --format=custom`
2. Mở Google Drive/OneDrive trên trình duyệt
3. Upload file từ `backend/backups/backup-*.backup`
4. Lưu vào thư mục "Database Backups"

#### **Cách 5: Sử dụng rclone (Tự động, nâng cao)**

**Cài đặt:**
```powershell
# Windows: Tải từ https://rclone.org/downloads/
# Hoặc dùng Chocolatey:
choco install rclone

# Cấu hình Google Drive
rclone config
# Chọn "Google Drive", làm theo hướng dẫn
```

**Backup tự động:**
```powershell
# Copy backup lên Google Drive
rclone copy D:\my-thesis\backend\backups\ gdrive:backups/ --progress

# Hoặc sync (xóa file trên cloud nếu xóa local)
rclone sync D:\my-thesis\backend\backups\ gdrive:backups/ --progress
```

**Tự động hóa với Task Scheduler:**
```batch
@echo off
cd /d D:\my-thesis\backend
node backup-db.cjs --format=custom
rclone copy backups\ gdrive:backups/ --progress
```

#### **Cách 6: Backup lên Dropbox**

1. Cài **Dropbox Desktop**
2. Copy file backup vào thư mục Dropbox
3. Tự động sync lên cloud

#### **Cách 7: Backup lên GitHub (Cho file nhỏ < 100MB)**

**⚠️ Lưu ý: GitHub có giới hạn 100MB/file**

```bash
# Nếu backup < 100MB, có thể commit vào Git
cd backend
git add backups/backup-2024-11-04.sql
git commit -m "backup: Add database backup"
git push

# Hoặc dùng Git LFS cho file lớn
git lfs track "*.backup"
git add .gitattributes
git add backups/backup-2024-11-04.backup
git commit -m "backup: Add database backup (LFS)"
git push
```

#### **Cách 6: Backup lên USB/External Drive (Offline)**

**Windows PowerShell:**
```powershell
# Tìm ổ USB
$usbDrive = (Get-PSDrive -PSProvider FileSystem | Where-Object {$_.Used -gt 0 -and $_.Name -match '^[D-Z]$'})[0]

# Copy backup lên USB
$backupDir = "D:\my-thesis\backend\backups"
$usbBackupDir = "$($usbDrive.Name):\database-backups"

New-Item -ItemType Directory -Path $usbBackupDir -Force
Copy-Item "$backupDir\*.backup" -Destination $usbBackupDir -Force

Write-Host "✅ Đã copy backup lên USB: $usbBackupDir"
```

**Lưu ý:**
- Backup lên USB định kỳ (hàng tuần hoặc hàng tháng)
- Giữ USB ở nơi an toàn
- Có thể dùng nhiều USB để backup nhiều bản

---

### **5. Kiểm Tra Backup**

#### **Windows (PowerShell):**
```powershell
# Xem danh sách backup
Get-ChildItem backend\backups\ | Format-Table Name, Length, LastWriteTime

# Xem thông tin backup
Get-Content backend\backups\backup-*.meta.json

# Kiểm tra file backup có hợp lệ không
pg_restore --list backup.backup
```

#### **Linux/Mac:**
```bash
# Xem danh sách backup
ls -lh backend/backups/

# Xem thông tin backup
cat backend/backups/backup-*.meta.json

# Kiểm tra file backup có hợp lệ không
pg_restore --list backup.backup
```

---

### **5.5. Backup Tự Động Lên Cloud (Script)**

**Sử dụng script tự động:**
```bash
cd backend

# Backup và upload lên cloud tự động
node backup-to-cloud.cjs

# Chỉ định thư mục cloud cụ thể
node backup-to-cloud.cjs --cloud-dir="D:\GoogleDrive\backups"
```

**Script sẽ:**
1. ✅ Tự động backup database
2. ✅ Tìm thư mục Google Drive/OneDrive
3. ✅ Copy file backup lên cloud
4. ✅ Tự động xóa backup cũ (giữ 10 bản mới nhất)

**Setup tự động hàng ngày:**
- Thêm vào Task Scheduler (Windows) hoặc Cron (Linux)
- Chạy: `node backup-to-cloud.cjs` mỗi ngày

---

### **6. Kịch Bản Khôi Phục Khi Laptop Hỏng** 🆘

#### **Kịch bản: Laptop hỏng hoàn toàn, cần khôi phục trên máy mới**

**Bước 1: Khôi phục Code từ GitHub**
```bash
# Trên máy mới
git clone https://github.com/longk123/Luan-Van-Tot-Nghiep-K47-Cofffee-Shop.git
cd Luan-Van-Tot-Nghiep-K47-Cofffee-Shop
```

**Bước 2: Cài đặt môi trường**
```bash
# Cài Node.js, PostgreSQL
# Cài dependencies
cd backend && npm install
cd ../frontend && npm install
```

**Bước 3: Tạo file .env**
```bash
# Tạo file backend/.env với thông tin database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=coffee_shop
DB_USER=postgres
DB_PASSWORD=your_password
```

**Bước 4: Tải backup từ Cloud**
```bash
# Từ Google Drive/OneDrive, tải file backup về
# Đặt vào thư mục: backend/backups/
```

**Bước 5: Restore Database**
```bash
cd backend

# Restore từ backup
node restore-db.cjs --input=backups/backup-2024-11-04.backup --format=custom
```

**Bước 6: Kiểm tra**
```bash
# Chạy backend
npm start

# Chạy frontend (terminal khác)
cd frontend
npm run dev
```

**✅ Hoàn tất! Hệ thống đã được khôi phục hoàn toàn.**

---

### **7. Kịch Bản Khôi Phục**

#### **Kịch bản 1: Mất một vài bản ghi**
```bash
# Restore từ backup gần nhất
node restore-db.cjs --input=backup-2024-11-04.sql
```

#### **Kịch bản 2: Database bị hỏng hoàn toàn**
```bash
# Xóa database cũ và restore
node restore-db.cjs --input=backup-2024-11-04.sql --drop-existing
```

#### **Kịch bản 3: Chỉ restore một bảng**
```bash
# Windows:
set PGPASSWORD=your_password
psql -h localhost -p 5432 -U postgres -d coffee_shop -f don_hang.sql

# Linux/Mac:
PGPASSWORD=your_password psql -h localhost -p 5432 -U postgres -d coffee_shop -f don_hang.sql
```

#### **Kịch bản 4: Restore trên máy mới**
```bash
# 1. Cài đặt PostgreSQL (nếu chưa có)
#    Windows: Tải từ https://www.postgresql.org/download/windows/
#    Linux: sudo apt-get install postgresql (Ubuntu/Debian)
#    Mac: brew install postgresql

# 2. Kiểm tra PostgreSQL đã cài đặt
pg_dump --version
psql --version

# 3. Tạo database mới
createdb -h localhost -p 5432 -U postgres coffee_shop
# Hoặc dùng psql:
# psql -h localhost -p 5432 -U postgres -c "CREATE DATABASE coffee_shop;"

# 4. Restore từ backup
cd backend
node restore-db.cjs --input=backup.sql
# Hoặc nếu file trong thư mục backups:
node restore-db.cjs --input=backups/backup-2024-11-04.sql
```

---

### **8. Checklist Backup Database**

✅ **Backup thủ công trước khi thay đổi lớn**
- Trước khi chạy migration
- Trước khi xóa dữ liệu lớn
- Trước khi cập nhật production

✅ **Backup tự động định kỳ**
- Hàng ngày (khuyến nghị: 2:00 AM)
- Hoặc hàng tuần (nếu dữ liệu ít thay đổi)

✅ **Backup lên cloud**
- Google Drive / OneDrive
- Hoặc server backup riêng

✅ **Giữ nhiều bản backup**
- Giữ ít nhất 7 bản backup gần nhất
- Giữ backup hàng tuần trong 1 tháng
- Giữ backup hàng tháng trong 1 năm

✅ **Test restore định kỳ**
- Test restore trên database test
- Đảm bảo backup không bị hỏng

---

### **9. Lưu ý Quan Trọng**

⚠️ **CẢNH BÁO:**
1. **Backup database QUAN TRỌNG HƠN backup code!**
   - Code có thể viết lại
   - Dữ liệu mất là mất vĩnh viễn!

2. **Luôn test restore trước khi cần:**
   - Backup không có nghĩa là restore được
   - Test trên database test trước

3. **Backup trước khi:**
   - Chạy migration
   - Xóa dữ liệu lớn
   - Cập nhật production
   - Thử nghiệm tính năng mới

4. **Giữ backup ở nhiều nơi:**
   - Local (máy tính)
   - External drive (USB)
   - Cloud (Google Drive/OneDrive)
   - Server backup riêng (nếu có)

5. **Format backup:**
   - `plain` (SQL): Dễ đọc, dễ chỉnh sửa, nhưng file lớn (khuyến nghị cho backup nhỏ)
   - `custom`: Nén tốt, restore nhanh, nhưng không đọc được (khuyến nghị cho backup lớn)
   - `tar`: Tương tự custom, nhưng ít dùng
   - `directory`: Cho database rất lớn, có thể restore song song

6. **Lưu ý về PATH (Windows):**
   - Sau khi cài PostgreSQL, cần thêm vào PATH:
     `C:\Program Files\PostgreSQL\<version>\bin`
   - Hoặc sử dụng full path:
     `"C:\Program Files\PostgreSQL\15\bin\pg_dump.exe" ...`

---

### **10. Troubleshooting (Xử lý lỗi)**

#### **Lỗi: "pg_dump: command not found" hoặc "pg_dump is not recognized"**
- **Nguyên nhân:** PostgreSQL chưa được cài đặt hoặc không có trong PATH
- **Giải pháp:**
  1. Kiểm tra PostgreSQL đã cài: `pg_dump --version`
  2. Nếu chưa cài, cài đặt từ: https://www.postgresql.org/download/
  3. Thêm vào PATH (Windows):
     - Mở System Properties > Environment Variables
     - Thêm: `C:\Program Files\PostgreSQL\<version>\bin`
     - Hoặc dùng full path trong script

#### **Lỗi: "password authentication failed"**
- **Nguyên nhân:** Password trong `.env` sai hoặc user không có quyền
- **Giải pháp:**
  1. Kiểm tra password trong `backend/.env`
  2. Test kết nối: `psql -h localhost -U postgres -d coffee_shop`
  3. Kiểm tra user có quyền truy cập database

#### **Lỗi: "could not connect to server"**
- **Nguyên nhân:** PostgreSQL service chưa chạy hoặc thông tin kết nối sai
- **Giải pháp:**
  1. Kiểm tra PostgreSQL service đang chạy (Windows Services)
  2. Kiểm tra `DB_HOST`, `DB_PORT` trong `.env`
  3. Test kết nối: `psql -h localhost -p 5432 -U postgres`

#### **Lỗi: "permission denied" khi restore**
- **Nguyên nhân:** User không có quyền ghi vào database
- **Giải pháp:**
  1. Đảm bảo user là superuser hoặc owner của database
  2. Hoặc dùng `--no-owner --no-acl` trong pg_restore (đã có trong script)

#### **Lỗi: "file not found" khi restore**
- **Nguyên nhân:** Đường dẫn file backup sai
- **Giải pháp:**
  1. Kiểm tra file tồn tại: `Get-ChildItem backend\backups\` (Windows)
  2. Dùng đường dẫn đầy đủ hoặc tên file trong thư mục `backups/`
  3. Ví dụ: `--input=backups/backup-2024-11-04.sql`

#### **Lỗi: "database already exists" khi restore với --create-db**
- **Nguyên nhân:** Database đã tồn tại
- **Giải pháp:**
  1. Dùng `--drop-existing` để xóa database cũ trước
  2. Hoặc xóa thủ công: `DROP DATABASE coffee_shop;`

---

### **11. Tần Suất Backup Khuyến Nghị**

| Loại dữ liệu | Tần suất backup | Giữ lại |
|-------------|----------------|---------|
| Production (quan trọng) | Hàng ngày | 30 ngày |
| Development | Hàng tuần | 7 ngày |
| Trước migration | Ngay trước khi chạy | Vĩnh viễn |
| Trước xóa dữ liệu | Ngay trước khi xóa | Vĩnh viễn |

---

## 📋 **Checklist Backup Tổng Hợp**

### **Code:**
✅ Git repository (local)  
✅ Git remote (GitHub/GitLab)  
✅ Git bundle  
✅ Git tags  

### **Database:**
⬜ Backup thủ công gần nhất  
⬜ Backup tự động đã setup  
✅ **Backup lên cloud (BẮT BUỘC - để dùng khi laptop hỏng)**  
⬜ Backup lên USB/External Drive  
⬜ Test restore đã thực hiện  
⬜ Đã test restore trên máy mới (quan trọng!)  

---

**Phiên bản v1.0.0 của bạn đã được bảo vệ an toàn! ✅**

**NHỚ BACKUP DATABASE ĐỊNH KỲ! 🗄️**
