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

**Phiên bản v1.0.0 của bạn đã được bảo vệ an toàn! ✅**

