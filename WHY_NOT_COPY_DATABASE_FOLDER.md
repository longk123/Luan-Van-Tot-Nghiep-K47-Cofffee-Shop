# Tại sao KHÔNG nên copy trực tiếp thư mục database?

## ❌ **Vấn đề khi copy trực tiếp thư mục database:**

### **1. Database đang chạy** 🔴
- PostgreSQL **LUÔN chạy** trong background (service)
- File database đang được **sử dụng** bởi PostgreSQL
- **KHÔNG THỂ copy** file đang được sử dụng trên Windows
- Sẽ báo lỗi: "File is being used by another process"

### **2. Tính nhất quán dữ liệu** ⚠️
- Khi copy file đang chạy → **Dữ liệu không nhất quán**
- Có thể copy được một phần file này, một phần file kia
- Kết quả: **Database bị hỏng**, không restore được!

**Ví dụ:**
```
- File A được copy lúc 10:00:00
- File B được copy lúc 10:00:05 (đã thay đổi)
→ Database không khớp → HỎNG!
```

### **3. File Lock** 🔒
- PostgreSQL **lock file** để đảm bảo an toàn
- Copy trực tiếp sẽ **bỏ qua lock** → Nguy hiểm!
- Có thể làm hỏng database gốc

### **4. Cấu trúc phức tạp** 📁
- PostgreSQL data directory có **hàng trăm/thousands file**
- Nhiều file nhỏ, cấu trúc phức tạp
- Cần copy **chính xác 100%** → Rất khó

### **5. Không portable** 📦
- Database file phụ thuộc vào:
  - Version PostgreSQL
  - Platform (Windows/Linux)
  - Encoding, locale
- Copy từ máy này sang máy khác → **Có thể không chạy được**

---

## ✅ **Tại sao dùng pg_dump (script backup)?**

### **1. An toàn** 🛡️
- **Dừng transaction** → Đảm bảo tính nhất quán
- Tạo snapshot **chính xác** tại một thời điểm
- Database vẫn chạy bình thường (không cần dừng)

### **2. Portable** 📦
- File backup có thể restore trên:
  - Bất kỳ version PostgreSQL nào (tương thích)
  - Bất kỳ platform nào (Windows/Linux/Mac)
  - Bất kỳ máy nào

### **3. Nén tốt** 💾
- pg_dump nén dữ liệu → File nhỏ hơn
- Format custom: Nén tốt, restore nhanh
- Tiết kiệm dung lượng

### **4. Chọn lọc** 🎯
- Có thể backup:
  - Toàn bộ database
  - Chỉ một số bảng
  - Chỉ schema (không có data)
  - Chỉ data (không có schema)

### **5. Dễ restore** 🔄
- Restore đơn giản: `pg_restore` hoặc `psql`
- Không cần biết cấu trúc file database
- Tự động tạo lại cấu trúc

---

## 📊 **So sánh:**

| Tiêu chí | Copy thư mục | pg_dump |
|----------|--------------|---------|
| **Database đang chạy** | ❌ Không được | ✅ Được |
| **Tính nhất quán** | ❌ Không đảm bảo | ✅ Đảm bảo |
| **Portable** | ❌ Phụ thuộc platform | ✅ Portable |
| **File size** | ❌ Lớn (toàn bộ) | ✅ Nhỏ (nén) |
| **Dễ restore** | ❌ Phức tạp | ✅ Đơn giản |
| **An toàn** | ❌ Nguy hiểm | ✅ An toàn |

---

## 🔧 **Khi nào CÓ THỂ copy thư mục database?**

### **Chỉ khi:**
1. ✅ **Dừng PostgreSQL service** hoàn toàn
2. ✅ **Đảm bảo không có process nào** đang dùng file
3. ✅ **Copy toàn bộ thư mục** (không bỏ sót file nào)
4. ✅ **Giữ nguyên cấu trúc** (permissions, ownership)
5. ✅ **Cùng version PostgreSQL** trên máy restore

### **Cách làm (KHÔNG KHUYẾN NGHỊ):**
```powershell
# 1. Dừng PostgreSQL service
Stop-Service postgresql-x64-15  # Thay version của bạn

# 2. Copy toàn bộ thư mục data
# Thư mục data thường ở: C:\Program Files\PostgreSQL\15\data
Copy-Item "C:\Program Files\PostgreSQL\15\data" -Destination "D:\backup\postgres-data" -Recurse

# 3. Khởi động lại PostgreSQL
Start-Service postgresql-x64-15
```

**⚠️ CẢNH BÁO:**
- Phải dừng service → **Ứng dụng không chạy được**
- Rủi ro cao → **Có thể làm hỏng database**
- Không portable → **Chỉ dùng trên cùng máy/version**

---

## ✅ **Kết luận:**

### **KHÔNG nên copy thư mục database vì:**
1. ❌ Database đang chạy → File đang được sử dụng
2. ❌ Dữ liệu không nhất quán → Database hỏng
3. ❌ Không portable → Chỉ dùng trên cùng máy
4. ❌ Phức tạp → Dễ sai sót

### **NÊN dùng pg_dump vì:**
1. ✅ An toàn → Database vẫn chạy
2. ✅ Nhất quán → Snapshot chính xác
3. ✅ Portable → Dùng được mọi nơi
4. ✅ Đơn giản → Chỉ 1 lệnh

**→ Dùng script backup (`backup-db.cjs`) là cách ĐÚNG và AN TOÀN nhất!**

---

## 💡 **Ví dụ thực tế:**

### **Tình huống: Copy thư mục database**
```
1. Copy thư mục data (database đang chạy)
2. File A copy được, File B đang thay đổi → Copy không đầy đủ
3. Restore → Database hỏng, không mở được
4. Mất dữ liệu! 😱
```

### **Tình huống: Dùng pg_dump**
```
1. Chạy: pg_dump → Tạo snapshot nhất quán
2. File backup nhỏ, nén tốt
3. Restore trên máy mới → Hoạt động ngay
4. An toàn! ✅
```

---

## 🎯 **Khuyến nghị:**

**→ LUÔN dùng `pg_dump` (script backup) thay vì copy thư mục!**

**Script backup đã được tối ưu:**
- ✅ An toàn
- ✅ Nhất quán
- ✅ Portable
- ✅ Dễ dùng

**Chỉ cần chạy:**
```bash
cd backend
node backup-db.cjs --format=custom
```

**→ Xong! File backup sẵn sàng để upload lên Google Drive.**

