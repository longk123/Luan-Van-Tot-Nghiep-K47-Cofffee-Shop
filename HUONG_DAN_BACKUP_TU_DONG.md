# 🔄 Hướng Dẫn Setup Backup Tự Động

## ⚠️ **QUAN TRỌNG: Script KHÔNG tự động chạy khi database thay đổi!**

**Script hiện tại:**
- ❌ **KHÔNG** tự động chạy khi database thay đổi
- ❌ **KHÔNG** tự động chạy khi có dữ liệu mới
- ✅ Chỉ chạy khi bạn gọi thủ công: `node backup-to-both-clouds.cjs`

**→ Để tự động, bạn cần setup Task Scheduler (Windows) hoặc Cron (Linux/Mac)!**

---

## 🚀 **Cách 1: Setup Tự Động Với Task Scheduler (Windows)** ⭐ (KHUYẾN NGHỊ)

### **Bước 1: Chạy script setup tự động**

```powershell
cd D:\my-thesis\backend
.\setup-auto-backup.ps1
```

**Script sẽ:**
- ✅ Tạo Task Scheduler tự động backup mỗi ngày lúc 2:00 AM
- ✅ Backup lên cả Google Drive VÀ OneDrive
- ✅ Chạy ngay cả khi máy tính đang sleep (wake up để chạy)

### **Bước 2: Kiểm tra task đã được tạo**

```powershell
# Xem thông tin task
Get-ScheduledTask -TaskName "CoffeeShop-Database-Backup"

# Xem lịch sử chạy
Get-ScheduledTaskInfo -TaskName "CoffeeShop-Database-Backup"
```

### **Bước 3: Test chạy ngay (không cần đợi 2:00 AM)**

```powershell
# Chạy task ngay lập tức
Start-ScheduledTask -TaskName "CoffeeShop-Database-Backup"

# Xem kết quả
Get-ScheduledTaskInfo -TaskName "CoffeeShop-Database-Backup"
```

---

## 🎯 **Cách 2: Setup Thủ Công Với Task Scheduler**

### **Bước 1: Mở Task Scheduler**

1. Nhấn `Win + R`
2. Gõ: `taskschd.msc`
3. Nhấn Enter

### **Bước 2: Tạo Task Mới**

1. Click **"Create Basic Task"** (bên phải)
2. **Name:** `CoffeeShop-Database-Backup`
3. **Description:** `Tự động backup database coffee_shop lên Google Drive và OneDrive`
4. Click **Next**

### **Bước 3: Chọn Trigger (Khi nào chạy)**

1. Chọn **"Daily"** (mỗi ngày)
2. Click **Next**
3. **Start:** `2:00:00 AM` (hoặc thời gian bạn muốn)
4. **Recur every:** `1 days`
5. Click **Next**

### **Bước 4: Chọn Action (Làm gì)**

1. Chọn **"Start a program"**
2. Click **Next**
3. **Program/script:** `D:\my-thesis\backend\backup-db-daily.bat`
4. **Start in:** `D:\my-thesis\backend`
5. Click **Next**

### **Bước 5: Hoàn Tất**

1. Check **"Open the Properties dialog..."**
2. Click **Finish**
3. Trong Properties:
   - **General tab:** Check **"Run whether user is logged on or not"**
   - **Conditions tab:** 
     - Check **"Wake the computer to run this task"**
     - Uncheck **"Start the task only if the computer is on AC power"**
   - **Settings tab:**
     - Check **"Run task as soon as possible after a scheduled start is missed"**
4. Click **OK**

---

## ⏰ **Tùy Chọn: Backup Nhiều Lần Trong Ngày**

### **Backup mỗi 6 giờ:**

Tạo thêm trigger trong Task Scheduler:
1. Mở task **"CoffeeShop-Database-Backup"**
2. Tab **Triggers** → **New**
3. **Begin the task:** `On a schedule`
4. **Settings:** `Daily`
5. **Repeat task every:** `6 hours`
6. **Duration:** `Indefinitely`
7. Click **OK**

### **Backup mỗi giờ:**

Tương tự, nhưng **Repeat task every:** `1 hour`

**⚠️ Lưu ý:** Backup quá thường xuyên có thể tốn dung lượng cloud!

---

## 🔄 **Cách 3: Backup Ngay Sau Khi Thay Đổi Database (Real-time)**

**⚠️ Phức tạp hơn, cần setup trigger trong PostgreSQL**

### **Tạo trigger tự động backup:**

```sql
-- Tạo function backup (chạy pg_dump)
CREATE OR REPLACE FUNCTION auto_backup_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Gọi script backup (cần setup pg_cron hoặc external script)
    PERFORM pg_notify('backup_needed', 'database_changed');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tạo trigger trên các bảng quan trọng
CREATE TRIGGER backup_after_insert
AFTER INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION auto_backup_trigger();
```

**→ Không khuyến nghị vì phức tạp và có thể ảnh hưởng hiệu suất!**

**→ Thay vào đó, backup định kỳ (mỗi ngày hoặc mỗi 6 giờ) là đủ!**

---

## 📊 **So Sánh Các Phương Pháp:**

| Phương pháp | Tần suất | Độ phức tạp | Khuyến nghị |
|-------------|----------|-------------|-------------|
| **Thủ công** | Khi cần | ⭐ Dễ | ❌ Dễ quên |
| **Task Scheduler (mỗi ngày)** | 1 lần/ngày | ⭐⭐ Trung bình | ✅ **KHUYẾN NGHỊ** |
| **Task Scheduler (mỗi 6 giờ)** | 4 lần/ngày | ⭐⭐ Trung bình | ✅ Tốt |
| **Real-time trigger** | Mỗi thay đổi | ⭐⭐⭐⭐⭐ Rất phức tạp | ❌ Không khuyến nghị |

---

## ✅ **Khuyến Nghị:**

### **Setup Backup Mỗi Ngày (2:00 AM):**

```powershell
cd D:\my-thesis\backend
.\setup-auto-backup.ps1
```

**Lý do:**
- ✅ Đơn giản, dễ setup
- ✅ Đủ an toàn (mất tối đa 1 ngày dữ liệu)
- ✅ Không ảnh hưởng hiệu suất
- ✅ Tự động, không cần nhớ

### **Nếu Cần Backup Thường Xuyên Hơn:**

- **Mỗi 6 giờ:** Thêm trigger trong Task Scheduler
- **Mỗi giờ:** Thêm trigger trong Task Scheduler
- **Sau mỗi thay đổi lớn:** Chạy thủ công: `node backup-to-both-clouds.cjs`

---

## 🔍 **Kiểm Tra Backup Tự Động:**

### **Xem lịch sử chạy:**

```powershell
# Xem thông tin task
Get-ScheduledTask -TaskName "CoffeeShop-Database-Backup" | Format-List

# Xem lịch sử chạy
Get-ScheduledTaskInfo -TaskName "CoffeeShop-Database-Backup"

# Xem log backup
Get-Content D:\my-thesis\backend\backup-log.txt -Tail 10
```

### **Kiểm tra file backup:**

```powershell
# Xem backup trên Google Drive
Get-ChildItem "H:\My Drive\database-backups" | Sort-Object LastWriteTime -Descending | Select-Object -First 5

# Xem backup trên OneDrive
Get-ChildItem "C:\Users\Long\OneDrive\database-backups" | Sort-Object LastWriteTime -Descending | Select-Object -First 5
```

---

## 🛠️ **Quản Lý Task:**

### **Xóa task:**

```powershell
Unregister-ScheduledTask -TaskName "CoffeeShop-Database-Backup" -Confirm:$false
```

### **Tạm dừng task:**

```powershell
Disable-ScheduledTask -TaskName "CoffeeShop-Database-Backup"
```

### **Kích hoạt lại task:**

```powershell
Enable-ScheduledTask -TaskName "CoffeeShop-Database-Backup"
```

### **Chạy task ngay:**

```powershell
Start-ScheduledTask -TaskName "CoffeeShop-Database-Backup"
```

---

## ⚠️ **Lưu Ý Quan Trọng:**

1. **Máy tính phải bật:** Task Scheduler chỉ chạy khi máy tính bật
   - **Giải pháp:** Check **"Wake the computer to run this task"** trong Task Scheduler

2. **Kết nối internet:** Cần internet để sync lên cloud
   - **Giải pháp:** Check **"Run only if network is available"** trong Task Scheduler

3. **Quyền truy cập:** Task cần quyền truy cập database
   - **Giải pháp:** Chạy script setup với quyền Administrator

4. **Dung lượng cloud:** Script tự động xóa backup cũ (giữ 10 bản mới nhất)
   - **Không lo tốn dung lượng!**

---

## ✅ **Kết Luận:**

**→ Script KHÔNG tự động chạy khi database thay đổi!**

**→ Để tự động, bạn CẦN setup Task Scheduler:**

```powershell
cd D:\my-thesis\backend
.\setup-auto-backup.ps1
```

**→ Sau khi setup, backup sẽ tự động chạy mỗi ngày lúc 2:00 AM!**

**→ Nếu cần backup ngay, chạy thủ công:**

```bash
cd backend
node backup-to-both-clouds.cjs
```

---

**💡 Tóm tắt:**
- ❌ **KHÔNG** tự động khi database thay đổi
- ✅ **CẦN** setup Task Scheduler để tự động
- ✅ **KHUYẾN NGHỊ:** Backup mỗi ngày lúc 2:00 AM
- ✅ **CÓ THỂ** backup thủ công bất cứ lúc nào

