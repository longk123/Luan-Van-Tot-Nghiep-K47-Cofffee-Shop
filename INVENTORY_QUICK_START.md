# 📦 Quản lý Kho - Quick Start

## 🚀 Truy cập nhanh

**URL:** `http://localhost:5173/inventory`

**Phân quyền:** Manager, Admin

**Nút điều hướng:** Từ Manager Dashboard → Click "📦 Quản lý Kho" (góc dưới trái)

---

## 📊 4 Chức năng chính

| Tab | Icon | Mục đích | Tính năng |
|-----|------|----------|-----------|
| **Tồn kho** | 📊 | Xem nguyên liệu hiện có | Tìm kiếm, tồn kho, giá trị |
| **Cảnh báo** | ⚠️ | Theo dõi hết hàng | Dashboard + 3 trạng thái |
| **Lịch sử xuất** | 📤 | Xem xuất kho tự động | Lọc theo ngày, đơn hàng |
| **Lịch sử nhập** | 📥 | Nhập kho mới | Form nhập + lịch sử |

---

## ✨ Tính năng nổi bật

✅ Tìm kiếm real-time  
✅ Lọc theo khoảng thời gian  
✅ Cảnh báo màu sắc (đỏ/vàng/xanh)  
✅ Form nhập kho đẹp với validation  
✅ Tự động cập nhật tồn kho  
✅ Responsive design  

---

## 🎯 Quy trình nhập kho (3 bước)

```
1. Click tab "📥 Lịch sử nhập"
2. Click nút "➕ Nhập kho"
3. Điền form và "✅ Xác nhận nhập"
```

**Trường bắt buộc:**
- Nguyên liệu (dropdown)
- Số lượng (số)
- Đơn giá (VNĐ)

**Trường tùy chọn:**
- Nhà cung cấp
- Ghi chú

---

## 📖 Tài liệu đầy đủ

📘 **User Guide:** `INVENTORY_MANAGEMENT_GUIDE.md` (Hướng dẫn chi tiết)  
🔧 **Technical:** `INVENTORY_IMPLEMENTATION_SUMMARY.md` (Tổng quan kỹ thuật)

---

## 🐛 Gặp lỗi?

### Không tải được dữ liệu
```bash
# Kiểm tra backend
cd backend
npm start
```

### Không có quyền truy cập
→ Đăng nhập với tài khoản **Manager** hoặc **Admin**

### Form nhập lỗi
→ Kiểm tra đã điền đủ trường bắt buộc (có dấu *)

---

## 📞 Hỗ trợ

**Hướng dẫn chi tiết:** Đọc `INVENTORY_MANAGEMENT_GUIDE.md`  
**Issue:** Liên hệ developer

---

**Version:** 1.0.0 | **Status:** ✅ Production Ready
