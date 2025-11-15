# 🔄 Backup Ghi Đè Và Xóa File Cũ

## ❓ **Câu Hỏi: Backup Có Ghi Đè File Cũ Không?**

**Trả lời ngắn gọn:**
- ❌ **KHÔNG ghi đè** - Mỗi backup tạo file mới với tên khác nhau
- ✅ **Tự động xóa file cũ** - Giữ lại 10 bản mới nhất trên cloud
- ⚠️ **Local không xóa** - File backup local sẽ tích lũy theo thời gian

---

## 📊 **Cách Hoạt Động Hiện Tại:**

### **1. Tên File Backup:**

**Format tên file:**
```
backup-coffee_shop-YYYY-MM-DD-timestamp.backup
```

**Ví dụ:**
- `backup-coffee_shop-2025-11-14-1763144419244.sql.backup`
- `backup-coffee_shop-2025-11-15-1763230819244.sql.backup`
- `backup-coffee_shop-2025-11-16-1763317219244.sql.backup`

**→ Mỗi backup tạo file mới, KHÔNG ghi đè file cũ!**

---

### **2. Xóa File Cũ Trên Cloud:** ✅

**Script `backup-to-both-clouds.cjs`:**
- ✅ Tự động xóa file cũ trên **Google Drive**
- ✅ Tự động xóa file cũ trên **OneDrive**
- ✅ **Giữ lại 10 bản mới nhất** ở mỗi cloud

**Logic:**
```javascript
// Xóa file cũ (giữ lại 10 bản mới nhất)
if (cloudBackupFiles.length > 10) {
  const filesToDelete = cloudBackupFiles.slice(10);
  for (const file of filesToDelete) {
    await fs.unlink(file.path);
  }
}
```

**Kết quả:**
- Google Drive: Tối đa 10 file backup
- OneDrive: Tối đa 10 file backup
- **→ Không tốn dung lượng cloud!**

---

### **3. File Backup Local:** ⚠️

**Thư mục:** `backend/backups/`

**Hiện tại:**
- ❌ **KHÔNG tự động xóa** file cũ
- ⚠️ File backup sẽ tích lũy theo thời gian
- ⚠️ Có thể tốn dung lượng ổ cứng

**Ví dụ sau 30 ngày:**
- 30 file backup × 0.25 MB = **7.5 MB**
- Sau 1 năm: 365 file × 0.25 MB = **91.25 MB**

**→ Không quá nhiều, nhưng nên xóa file cũ!**

---

## 🔧 **Cải Thiện: Tự Động Xóa File Cũ Trên Local**

### **Tùy Chọn 1: Xóa File Cũ Trong Script Backup** ⭐ (KHUYẾN NGHỊ)

**Thêm vào `backup-db.cjs` hoặc `backup-db-daily-smart.bat`:**

```javascript
// Xóa file backup cũ trên local (giữ 30 bản mới nhất)
async function cleanupOldLocalBackups() {
  try {
    const backupDir = path.join(__dirname, 'backups');
    const files = await fs.readdir(backupDir);
    const backupFiles = files
      .filter(f => f.endsWith('.backup') || f.endsWith('.sql'))
      .map(f => ({
        name: f,
        path: path.join(backupDir, f),
        time: 0
      }));

    for (const file of backupFiles) {
      const stats = await fs.stat(file.path);
      file.time = stats.mtimeMs;
    }

    backupFiles.sort((a, b) => b.time - a.time);

    // Xóa file cũ (giữ lại 30 bản mới nhất)
    if (backupFiles.length > 30) {
      const filesToDelete = backupFiles.slice(30);
      for (const file of filesToDelete) {
        await fs.unlink(file.path);
        await fs.unlink(file.path + '.meta.json').catch(() => {});
        console.log(`🗑️  Đã xóa backup local cũ: ${file.name}`);
      }
    }
  } catch (error) {
    // Bỏ qua lỗi cleanup
  }
}
```

---

### **Tùy Chọn 2: Xóa File Cũ Theo Ngày**

**Xóa file backup cũ hơn 30 ngày:**

```javascript
// Xóa file backup cũ hơn 30 ngày
async function cleanupOldLocalBackups() {
  try {
    const backupDir = path.join(__dirname, 'backups');
    const files = await fs.readdir(backupDir);
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

    for (const file of files) {
      if (file.endsWith('.backup') || file.endsWith('.sql')) {
        const filePath = path.join(backupDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtimeMs < thirtyDaysAgo) {
          await fs.unlink(filePath);
          await fs.unlink(filePath + '.meta.json').catch(() => {});
          console.log(`🗑️  Đã xóa backup cũ: ${file}`);
        }
      }
    }
  } catch (error) {
    // Bỏ qua lỗi cleanup
  }
}
```

---

## 📋 **So Sánh:**

| Vị trí | Xóa file cũ? | Giữ lại | Dung lượng |
|--------|--------------|---------|------------|
| **Google Drive** | ✅ Có | 10 bản mới nhất | ~2.5 MB |
| **OneDrive** | ✅ Có | 10 bản mới nhất | ~2.5 MB |
| **Local (backups/)** | ❌ Chưa có | Tất cả | Tích lũy theo thời gian |

---

## 💡 **Khuyến Nghị:**

### **1. Trên Cloud (Đã có):** ✅

**Hiện tại:**
- ✅ Tự động xóa file cũ
- ✅ Giữ 10 bản mới nhất
- ✅ Không tốn dung lượng

**→ Không cần thay đổi!**

---

### **2. Trên Local (Nên thêm):** ⭐

**Khuyến nghị:**
- ✅ Tự động xóa file cũ
- ✅ Giữ 30 bản mới nhất (hoặc 30 ngày)
- ✅ Tiết kiệm dung lượng ổ cứng

**Lý do:**
- File backup local chỉ cần để restore nhanh
- File trên cloud đã đủ an toàn
- Giữ 30 bản = đủ cho 1 tháng backup

---

## 🎯 **Kết Luận:**

### **Câu Trả Lời:**

**→ Backup KHÔNG ghi đè file cũ, nhưng TỰ ĐỘNG XÓA file cũ trên cloud!**

**→ Trên cloud:**
- ✅ Tự động xóa file cũ
- ✅ Giữ 10 bản mới nhất
- ✅ Không tốn dung lượng

**→ Trên local:**
- ⚠️ Chưa tự động xóa
- 💡 Nên thêm logic xóa file cũ (giữ 30 bản hoặc 30 ngày)

**→ Tổng dung lượng:**
- Cloud: ~5 MB (10 bản × 2 cloud)
- Local: Tùy số lượng file (nên giữ ~30 bản = ~7.5 MB)

---

## ✅ **Tóm Tắt:**

| Câu hỏi | Trả lời |
|---------|---------|
| **Backup có ghi đè file cũ?** | ❌ Không - Mỗi backup tạo file mới |
| **Có tự động xóa file cũ?** | ✅ Có - Trên cloud (giữ 10 bản) |
| **Local có xóa file cũ?** | ❌ Chưa - Nên thêm (giữ 30 bản) |
| **Có tốn dung lượng?** | ✅ Không - Tự động xóa file cũ |

**→ Script đã được tối ưu để không tốn dung lượng!**

