# 🔍 So Sánh 2 Script Backup

## 📋 **Tóm Tắt Nhanh:**

| Script | Mục đích | Chạy khi nào | Làm gì |
|-------|----------|--------------|--------|
| **`setup-auto-backup.ps1`** | 🔧 **SETUP** (Cấu hình) | **1 lần duy nhất** | Tạo Task Scheduler để tự động chạy backup |
| **`backup-db-daily.bat`** | 💾 **BACKUP** (Thực hiện) | **Mỗi ngày tự động** | Thực hiện backup database lên cloud |

---

## 🔧 **1. `setup-auto-backup.ps1` - Script SETUP**

### **Mục đích:**
- **Cấu hình** Windows Task Scheduler để tự động chạy backup
- **Chạy 1 lần duy nhất** để setup, sau đó không cần chạy nữa

### **Làm gì:**
1. ✅ Tạo Task Scheduler tên `"CoffeeShop-Database-Backup"`
2. ✅ Cấu hình chạy **mỗi ngày lúc 2:00 AM**
3. ✅ Chỉ định script `backup-db-daily.bat` sẽ được chạy
4. ✅ Cấu hình các settings:
   - Chạy ngay cả khi máy tính đang dùng pin
   - Chạy khi có mạng
   - Wake up máy tính nếu đang sleep
   - Chạy với quyền cao nhất

### **Khi nào chạy:**
- **1 lần duy nhất** khi bạn muốn setup tự động backup
- **Sau khi chạy:** Task Scheduler sẽ tự động chạy `backup-db-daily.bat` mỗi ngày

### **Cách chạy:**
```powershell
cd D:\my-thesis\backend
.\setup-auto-backup.ps1
```

### **Kết quả:**
- ✅ Task Scheduler đã được tạo
- ✅ Backup sẽ tự động chạy mỗi ngày lúc 2:00 AM
- ✅ Không cần làm gì thêm!

---

## 💾 **2. `backup-db-daily.bat` - Script BACKUP**

### **Mục đích:**
- **Thực hiện** backup database thực tế
- **Chạy mỗi ngày** (tự động bởi Task Scheduler)

### **Làm gì:**
1. ✅ Chuyển vào thư mục `D:\my-thesis\backend`
2. ✅ Gọi script `backup-to-both-clouds.cjs` để:
   - Backup database
   - Upload lên Google Drive
   - Upload lên OneDrive
3. ✅ Ghi log kết quả vào `backup-log.txt`:
   - `[SUCCESS]` nếu thành công
   - `[ERROR]` nếu thất bại

### **Khi nào chạy:**
- **Tự động:** Mỗi ngày lúc 2:00 AM (bởi Task Scheduler)
- **Thủ công:** Bạn có thể chạy bất cứ lúc nào:
  ```cmd
  cd D:\my-thesis\backend
  backup-db-daily.bat
  ```

### **Cách chạy:**
- **Tự động:** Không cần làm gì, Task Scheduler sẽ chạy
- **Thủ công:** Double-click file hoặc chạy trong CMD

### **Kết quả:**
- ✅ Database đã được backup
- ✅ File backup đã được upload lên Google Drive
- ✅ File backup đã được upload lên OneDrive
- ✅ Log đã được ghi vào `backup-log.txt`

---

## 🔄 **Mối Quan Hệ Giữa 2 Script:**

```
┌─────────────────────────────────────┐
│  setup-auto-backup.ps1              │
│  (Chạy 1 lần để SETUP)              │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Windows Task Scheduler              │
│  (Tự động chạy mỗi ngày 2:00 AM)    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  backup-db-daily.bat                 │
│  (Chạy mỗi ngày để BACKUP)          │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  backup-to-both-clouds.cjs          │
│  (Thực hiện backup thực tế)          │
└─────────────────────────────────────┘
```

---

## 📊 **So Sánh Chi Tiết:**

| Tiêu chí | `setup-auto-backup.ps1` | `backup-db-daily.bat` |
|----------|------------------------|----------------------|
| **Ngôn ngữ** | PowerShell (.ps1) | Batch (.bat) |
| **Mục đích** | Setup/Cấu hình | Thực hiện backup |
| **Tần suất chạy** | 1 lần duy nhất | Mỗi ngày (tự động) |
| **Ai chạy** | Bạn (thủ công) | Task Scheduler (tự động) |
| **Kết quả** | Task Scheduler được tạo | Database được backup |
| **Có thể chạy thủ công?** | ✅ Có (nhưng chỉ cần 1 lần) | ✅ Có (bất cứ lúc nào) |
| **Phụ thuộc** | Không phụ thuộc gì | Phụ thuộc Task Scheduler (nếu muốn tự động) |

---

## 🎯 **Ví Dụ Thực Tế:**

### **Kịch bản 1: Setup lần đầu**

```powershell
# Bước 1: Chạy script setup (1 lần duy nhất)
cd D:\my-thesis\backend
.\setup-auto-backup.ps1

# Kết quả:
# ✅ Task Scheduler đã được tạo
# ✅ Backup sẽ tự động chạy mỗi ngày lúc 2:00 AM
```

**Sau đó:**
- Mỗi ngày lúc 2:00 AM, Windows sẽ tự động chạy `backup-db-daily.bat`
- `backup-db-daily.bat` sẽ gọi `backup-to-both-clouds.cjs` để backup
- Bạn không cần làm gì thêm!

### **Kịch bản 2: Backup ngay bây giờ (không đợi 2:00 AM)**

```cmd
# Chạy script backup thủ công
cd D:\my-thesis\backend
backup-db-daily.bat

# Hoặc chạy trực tiếp script Node.js
node backup-to-both-clouds.cjs
```

**Kết quả:**
- Database được backup ngay lập tức
- Upload lên Google Drive và OneDrive
- Ghi log vào `backup-log.txt`

### **Kịch bản 3: Kiểm tra xem backup có chạy không**

```powershell
# Xem thông tin Task Scheduler
Get-ScheduledTask -TaskName "CoffeeShop-Database-Backup"

# Xem lịch sử chạy
Get-ScheduledTaskInfo -TaskName "CoffeeShop-Database-Backup"

# Xem log backup
Get-Content D:\my-thesis\backend\backup-log.txt -Tail 10
```

---

## ✅ **Tóm Tắt:**

### **`setup-auto-backup.ps1`:**
- 🔧 **Script SETUP** (cấu hình)
- ⏰ **Chạy 1 lần duy nhất**
- 🎯 **Mục đích:** Tạo Task Scheduler để tự động chạy backup
- 📝 **Kết quả:** Task Scheduler đã được tạo

### **`backup-db-daily.bat`:**
- 💾 **Script BACKUP** (thực hiện)
- ⏰ **Chạy mỗi ngày** (tự động bởi Task Scheduler)
- 🎯 **Mục đích:** Thực hiện backup database lên cloud
- 📝 **Kết quả:** Database đã được backup và upload lên cloud

---

## 💡 **Lưu Ý:**

1. **Chạy `setup-auto-backup.ps1` trước:**
   - Chỉ cần chạy 1 lần để setup
   - Sau đó Task Scheduler sẽ tự động chạy `backup-db-daily.bat`

2. **`backup-db-daily.bat` có thể chạy thủ công:**
   - Bất cứ lúc nào bạn muốn backup ngay
   - Không cần đợi đến 2:00 AM

3. **Nếu không muốn tự động:**
   - Không cần chạy `setup-auto-backup.ps1`
   - Chỉ cần chạy `backup-db-daily.bat` hoặc `backup-to-both-clouds.cjs` khi cần

---

## 🎯 **Kết Luận:**

**→ `setup-auto-backup.ps1` = Cấu hình (1 lần)**  
**→ `backup-db-daily.bat` = Thực hiện (mỗi ngày)**

**→ Chạy `setup-auto-backup.ps1` 1 lần → Backup sẽ tự động mỗi ngày!**

