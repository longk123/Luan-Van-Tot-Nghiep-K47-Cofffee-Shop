# 🚀 Hướng Dẫn Chạy Setup Backup Tự Động

## ⚠️ **QUAN TRỌNG: Cần Quyền Administrator!**

Script setup cần quyền Administrator để tạo Task Scheduler.

---

## ✅ **Cách 1: Chạy PowerShell Với Quyền Administrator** ⭐ (KHUYẾN NGHỊ)

### **Bước 1: Mở PowerShell với quyền Administrator**

1. Nhấn `Win + X`
2. Chọn **"Windows PowerShell (Admin)"** hoặc **"Terminal (Admin)"**
3. Hoặc tìm "PowerShell" trong Start Menu → Click chuột phải → **"Run as administrator"**

### **Bước 2: Chạy script setup**

```powershell
cd D:\my-thesis\backend
.\setup-auto-backup.ps1
```

**Kết quả:**
- ✅ Task Scheduler đã được tạo
- ✅ Backup sẽ tự động chạy mỗi ngày lúc 6:00 PM
- ✅ Backup khi mở máy nếu bị bỏ lỡ

---

## ✅ **Cách 2: Chạy Từ Command Prompt Với Quyền Administrator**

### **Bước 1: Mở CMD với quyền Administrator**

1. Nhấn `Win + X`
2. Chọn **"Command Prompt (Admin)"** hoặc **"Terminal (Admin)"**

### **Bước 2: Chạy script**

```cmd
cd D:\my-thesis\backend
powershell -ExecutionPolicy Bypass -File .\setup-auto-backup.ps1
```

---

## ✅ **Cách 3: Tạo Shortcut Chạy Với Quyền Administrator**

### **Bước 1: Tạo file batch**

Tạo file `setup-backup-admin.bat`:

```batch
@echo off
cd /d D:\my-thesis\backend
powershell -ExecutionPolicy Bypass -File .\setup-auto-backup.ps1
pause
```

### **Bước 2: Tạo shortcut**

1. Click chuột phải vào file `setup-backup-admin.bat`
2. Chọn **"Create shortcut"**
3. Click chuột phải vào shortcut → **"Properties"**
4. Tab **"Shortcut"** → Click **"Advanced"**
5. Check **"Run as administrator"**
6. Click **OK** → **OK**

### **Bước 3: Chạy shortcut**

Double-click vào shortcut → Tự động chạy với quyền Administrator!

---

## 🔍 **Kiểm Tra Task Đã Được Tạo Chưa:**

```powershell
# Xem thông tin task
Get-ScheduledTask -TaskName "CoffeeShop-Database-Backup"

# Xem lịch sử chạy
Get-ScheduledTaskInfo -TaskName "CoffeeShop-Database-Backup"

# Xem triggers (khi nào chạy)
(Get-ScheduledTask -TaskName "CoffeeShop-Database-Backup").Triggers
```

---

## 🧪 **Test Chạy Task Ngay:**

```powershell
# Chạy task ngay lập tức (không cần đợi 6:00 PM)
Start-ScheduledTask -TaskName "CoffeeShop-Database-Backup"

# Xem kết quả
Get-ScheduledTaskInfo -TaskName "CoffeeShop-Database-Backup"

# Xem log backup
Get-Content D:\my-thesis\backend\backup-log.txt -Tail 10
```

---

## 📋 **Sau Khi Setup Thành Công:**

### **✅ Backup sẽ tự động:**

1. **Mỗi ngày lúc 6:00 PM:**
   - Nếu máy đang bật/sleep → Backup ngay
   - Nếu máy tắt → Bỏ lỡ, sẽ backup khi mở máy

2. **Khi mở máy:**
   - Kiểm tra xem đã có backup hôm nay chưa
   - Nếu chưa có → Backup ngay
   - Nếu đã có → Bỏ qua

3. **Kiểm tra internet:**
   - Có internet → Backup và upload lên cloud
   - Không có internet → Chỉ backup local, upload sau

---

## 🛠️ **Quản Lý Task:**

### **Xem task:**

```powershell
Get-ScheduledTask -TaskName "CoffeeShop-Database-Backup"
```

### **Tạm dừng task:**

```powershell
Disable-ScheduledTask -TaskName "CoffeeShop-Database-Backup"
```

### **Kích hoạt lại task:**

```powershell
Enable-ScheduledTask -TaskName "CoffeeShop-Database-Backup"
```

### **Xóa task:**

```powershell
Unregister-ScheduledTask -TaskName "CoffeeShop-Database-Backup" -Confirm:$false
```

### **Chạy task ngay:**

```powershell
Start-ScheduledTask -TaskName "CoffeeShop-Database-Backup"
```

---

## ⚠️ **Lưu Ý:**

1. **Quyền Administrator:**
   - Cần để tạo Task Scheduler
   - Chỉ cần 1 lần khi setup
   - Sau đó task chạy tự động, không cần quyền Admin

2. **Execution Policy:**
   - Nếu gặp lỗi "execution policy", chạy với `-ExecutionPolicy Bypass`

3. **Kiểm tra task:**
   - Sau khi setup, nên kiểm tra task đã được tạo chưa
   - Test chạy task ngay để đảm bảo hoạt động

---

## ✅ **Kết Luận:**

**→ Chạy PowerShell với quyền Administrator → Chạy script setup → Xong!**

**→ Backup sẽ tự động mỗi ngày lúc 6:00 PM và khi mở máy!**

---

## 🎯 **Tóm Tắt Các Bước:**

1. ✅ Mở PowerShell với quyền Administrator
2. ✅ Chạy: `cd D:\my-thesis\backend`
3. ✅ Chạy: `.\setup-auto-backup.ps1`
4. ✅ Kiểm tra task đã được tạo
5. ✅ Test chạy task ngay
6. ✅ Xong! Backup sẽ tự động mỗi ngày

