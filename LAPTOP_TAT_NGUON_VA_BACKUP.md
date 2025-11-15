# ⚠️ Laptop Tắt Nguồn Và Backup Tự Động

## ❓ **Câu Hỏi: Laptop Tắt Nguồn Có Chạy Được Backup Không?**

**Trả lời ngắn gọn:**
- ❌ **KHÔNG** - Nếu laptop **TẮT NGUỒN** (shutdown) → Task Scheduler **KHÔNG chạy được**
- ✅ **CÓ** - Nếu laptop **SLEEP** (ngủ) → Task Scheduler **CÓ THỂ wake up và chạy**

---

## 🔋 **Các Trạng Thái Laptop:**

### **1. TẮT NGUỒN (Shutdown)** ❌

**Trạng thái:**
- Laptop hoàn toàn tắt
- Không có điện
- Không có process nào chạy

**Task Scheduler:**
- ❌ **KHÔNG chạy được**
- ❌ Không thể wake up
- ❌ Backup sẽ bị bỏ lỡ

**Giải pháp:**
- ✅ Backup thủ công trước khi tắt máy
- ✅ Để laptop ở chế độ SLEEP thay vì SHUTDOWN

---

### **2. SLEEP (Ngủ)** ✅

**Trạng thái:**
- Laptop vẫn có điện (ít)
- RAM vẫn giữ dữ liệu
- Có thể wake up nhanh

**Task Scheduler:**
- ✅ **CÓ THỂ chạy được**
- ✅ Có thể wake up để chạy task
- ✅ Backup sẽ chạy đúng giờ

**Cấu hình:**
- Script đã được cấu hình `-WakeToRun`
- Task Scheduler sẽ tự động wake up laptop để chạy backup

---

### **3. HIBERNATE (Ngủ đông)** ⚠️

**Trạng thái:**
- Laptop tắt nhưng lưu trạng thái vào ổ cứng
- Không có điện
- Wake up chậm hơn sleep

**Task Scheduler:**
- ⚠️ **CÓ THỂ chạy được** (tùy cấu hình)
- ⚠️ Cần cấu hình wake up từ hibernate
- ⚠️ Có thể bỏ lỡ nếu không cấu hình đúng

**Giải pháp:**
- Cấu hình BIOS/UEFI để cho phép wake up từ hibernate
- Hoặc dùng SLEEP thay vì HIBERNATE

---

### **4. BẬT (Running)** ✅

**Trạng thái:**
- Laptop đang chạy bình thường
- Tất cả process đang hoạt động

**Task Scheduler:**
- ✅ **Chạy được 100%**
- ✅ Backup sẽ chạy đúng giờ
- ✅ Không có vấn đề gì

---

## 📊 **Bảng So Sánh:**

| Trạng thái | Task Scheduler chạy? | Wake up được? | Khuyến nghị |
|------------|---------------------|---------------|-------------|
| **TẮT NGUỒN** | ❌ Không | ❌ Không | Backup thủ công trước khi tắt |
| **SLEEP** | ✅ Có | ✅ Có | ✅ **KHUYẾN NGHỊ** |
| **HIBERNATE** | ⚠️ Có thể | ⚠️ Có thể | Cấu hình thêm |
| **BẬT** | ✅ Có | ✅ Có | ✅ **TỐT NHẤT** |

---

## ✅ **Giải Pháp:**

### **Giải Pháp 1: Để Laptop Ở Chế Độ SLEEP** ⭐ (KHUYẾN NGHỊ)

**Ưu điểm:**
- ✅ Task Scheduler có thể wake up và chạy backup
- ✅ Tiết kiệm điện hơn shutdown
- ✅ Wake up nhanh (vài giây)
- ✅ Backup tự động chạy đúng giờ

**Cách làm:**
1. Khi không dùng laptop, nhấn nút **SLEEP** thay vì **SHUTDOWN**
2. Hoặc đóng nắp laptop (nếu cấu hình đóng nắp = sleep)
3. Task Scheduler sẽ tự động wake up lúc 2:00 AM để backup

**Cấu hình Windows:**
```
Settings → System → Power & sleep
→ Khi đóng nắp laptop: Sleep
→ Khi nhấn nút nguồn: Sleep
```

---

### **Giải Pháp 2: Backup Thủ Công Trước Khi Tắt Máy**

**Khi nào:**
- Trước khi tắt laptop
- Trước khi đi xa
- Trước khi cập nhật lớn

**Cách làm:**
```bash
cd D:\my-thesis\backend
node backup-to-both-clouds.cjs
```

**Ưu điểm:**
- ✅ Đảm bảo backup mới nhất
- ✅ Không phụ thuộc Task Scheduler
- ✅ Có thể backup bất cứ lúc nào

---

### **Giải Pháp 3: Backup Khi Mở Laptop**

**Tạo script tự động backup khi login:**

Tạo file `backup-on-startup.bat`:
```batch
@echo off
cd /d D:\my-thesis\backend

REM Kiểm tra xem đã backup hôm nay chưa
forfiles /p backups /m *.backup /d -1 >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Chưa có backup hôm nay, đang backup...
    node backup-to-both-clouds.cjs
) else (
    echo Đã có backup hôm nay, bỏ qua.
)
```

**Thêm vào Startup:**
1. Nhấn `Win + R`
2. Gõ: `shell:startup`
3. Copy `backup-on-startup.bat` vào thư mục này
4. Mỗi khi mở laptop, script sẽ kiểm tra và backup nếu cần

---

### **Giải Pháp 4: Backup Nhiều Lần Trong Ngày**

**Nếu laptop thường xuyên tắt:**
- Backup mỗi 6 giờ thay vì mỗi ngày
- Tăng cơ hội backup thành công

**Cách setup:**
1. Mở Task Scheduler
2. Tìm task `CoffeeShop-Database-Backup`
3. Tab **Triggers** → **New**
4. **Repeat task every:** `6 hours`
5. **Duration:** `Indefinitely`

**→ Backup sẽ chạy mỗi 6 giờ khi laptop bật**

---

## 🔍 **Kiểm Tra Backup Có Chạy Không:**

### **Xem lịch sử chạy:**

```powershell
# Xem thông tin task
Get-ScheduledTask -TaskName "CoffeeShop-Database-Backup"

# Xem lịch sử chạy
Get-ScheduledTaskInfo -TaskName "CoffeeShop-Database-Backup"

# Xem log backup
Get-Content D:\my-thesis\backend\backup-log.txt -Tail 10
```

### **Kiểm tra file backup:**

```powershell
# Xem backup trên Google Drive
Get-ChildItem "H:\My Drive\database-backups" | 
    Sort-Object LastWriteTime -Descending | 
    Select-Object -First 5

# Xem backup trên OneDrive
Get-ChildItem "C:\Users\Long\OneDrive\database-backups" | 
    Sort-Object LastWriteTime -Descending | 
    Select-Object -First 5
```

**Nếu không có backup mới:**
- ⚠️ Có thể laptop đã tắt nguồn vào lúc 2:00 AM
- 💡 Chạy backup thủ công ngay

---

## 💡 **Khuyến Nghị:**

### **Cho Người Dùng Thường Xuyên Tắt Laptop:**

1. **Backup thủ công trước khi tắt:**
   ```bash
   cd backend
   node backup-to-both-clouds.cjs
   ```

2. **Backup khi mở laptop:**
   - Setup script `backup-on-startup.bat` (xem Giải Pháp 3)

3. **Backup nhiều lần trong ngày:**
   - Backup mỗi 6 giờ thay vì mỗi ngày

### **Cho Người Dùng Để Laptop Sleep:**

1. **Để laptop ở chế độ SLEEP:**
   - Task Scheduler sẽ tự động wake up và backup
   - Không cần làm gì thêm

2. **Kiểm tra định kỳ:**
   - Xem log backup mỗi tuần
   - Đảm bảo backup chạy đúng

---

## ⚠️ **Lưu Ý Quan Trọng:**

1. **Wake up từ sleep:**
   - Script đã được cấu hình `-WakeToRun`
   - Windows sẽ tự động wake up laptop từ sleep để chạy backup
   - Không cần cấu hình thêm (trừ khi BIOS/UEFI chặn wake up)

2. **Wake up từ shutdown (RTC Alarm):**
   - Cần cấu hình BIOS/UEFI để bật RTC Alarm
   - Không phải laptop nào cũng hỗ trợ
   - Phức tạp hơn, không khuyến nghị

3. **Pin laptop:**
   - Wake up từ sleep tốn một ít pin
   - Đảm bảo pin đủ để wake up và chạy backup

4. **Internet:**
   - Cần internet để upload lên cloud
   - Task đã được cấu hình `-RunOnlyIfNetworkAvailable`

5. **Thời gian:**
   - Nếu laptop tắt vào lúc 2:00 AM → Backup sẽ bị bỏ lỡ
   - Task sẽ chạy ngay khi laptop bật lại (nếu cấu hình `-StartWhenAvailable`)

---

## ✅ **Tóm Tắt:**

| Tình huống | Backup tự động? | Giải pháp |
|------------|----------------|-----------|
| **Laptop tắt nguồn** | ❌ Không | Backup thủ công trước khi tắt |
| **Laptop sleep** | ✅ Có | Để laptop sleep, Task Scheduler sẽ wake up |
| **Laptop bật** | ✅ Có | Backup chạy đúng giờ |

**→ Khuyến nghị: Để laptop ở chế độ SLEEP thay vì SHUTDOWN!**

---

## 🎯 **Kết Luận:**

**Câu trả lời:**
- ❌ **KHÔNG** - Laptop tắt nguồn → Backup **KHÔNG chạy được**
- ✅ **CÓ** - Laptop sleep → Backup **CÓ THỂ chạy được** (wake up)

**Giải pháp tốt nhất:**
- ✅ Để laptop ở chế độ **SLEEP** thay vì **SHUTDOWN**
- ✅ Hoặc backup **thủ công** trước khi tắt máy
- ✅ Hoặc backup **khi mở laptop** (script startup)

**→ Script đã được cấu hình để wake up từ sleep, nhưng KHÔNG thể wake up từ shutdown!**

---

## 🔧 **Nâng Cao: Wake Up Từ Shutdown (RTC Alarm)**

**⚠️ Phức tạp, chỉ dành cho người dùng nâng cao!**

Nếu bạn muốn laptop tự động bật nguồn từ shutdown để chạy backup:

### **Bước 1: Cấu hình BIOS/UEFI**

1. Khởi động lại laptop
2. Nhấn phím vào BIOS/UEFI (thường là F2, F10, Del, hoặc Esc)
3. Tìm phần **"Power Management"** hoặc **"Advanced"**
4. Tìm tùy chọn:
   - **"RTC Alarm"**
   - **"Wake Up Event"**
   - **"Resume by Alarm"**
   - **"Power On by RTC"**
5. Bật tính năng này
6. Lưu và thoát

**⚠️ Lưu ý:** Không phải laptop nào cũng hỗ trợ RTC Alarm!

### **Bước 2: Cấu hình Windows**

Task Scheduler đã được cấu hình sẵn, nhưng cần đảm bảo:
- Task chạy ngay khi laptop bật
- Có cấu hình `-StartWhenAvailable`

### **Bước 3: Test**

1. Tắt laptop hoàn toàn
2. Đợi đến giờ backup (2:00 AM)
3. Kiểm tra xem laptop có tự động bật không

**→ Không khuyến nghị vì phức tạp và không phải laptop nào cũng hỗ trợ!**

**→ Khuyến nghị: Dùng SLEEP thay vì SHUTDOWN!**

