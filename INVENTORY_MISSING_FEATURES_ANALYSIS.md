# 📦 PHÂN TÍCH: QUẢN LÝ KHO - CÒN THIẾU GÌ?

*Ngày phân tích: 2025-11-22*

---

## ✅ CÁC TÍNH NĂNG ĐÃ CÓ (HOÀN CHỈNH)

### 1. **Quản lý Tồn kho (Stock Management)**
- ✅ Xem danh sách nguyên liệu với tồn kho hiện tại
- ✅ Tìm kiếm theo tên/mã nguyên liệu
- ✅ Hiển thị giá nhập, giá trị tồn kho
- ✅ Xem chi tiết từng nguyên liệu

### 2. **Cảnh báo Tồn kho (Stock Warnings)**
- ✅ Dashboard cảnh báo với 4 cards thống kê
- ✅ Phân loại: HẾT HÀNG / SẮP HẾT / ĐỦ
- ✅ Ước tính số ly có thể làm được
- ✅ Sắp xếp theo mức độ ưu tiên

### 3. **Lịch sử Xuất kho (Export History)**
- ✅ Tự động xuất kho khi đơn hàng PAID
- ✅ Xem lịch sử xuất kho theo thời gian
- ✅ Lọc theo ngày, tìm kiếm theo nguyên liệu/đơn hàng
- ✅ Hiển thị số lượng, giá trị xuất

### 4. **Lịch sử Nhập kho (Import History)**
- ✅ Xem lịch sử nhập kho
- ✅ Form tạo phiếu nhập mới
- ✅ Hỗ trợ batch tracking (ngày sản xuất, hạn sử dụng)
- ✅ In phiếu nhập PDF
- ✅ Lọc theo ngày, tìm kiếm theo nguyên liệu/NCC

### 5. **Quản lý Lô hàng (Batch Inventory)**
- ✅ Tracking theo lô với mã lô tự động
- ✅ Quản lý hạn sử dụng (expiry dates)
- ✅ Cảnh báo sắp hết hạn
- ✅ FEFO (First Expired First Out) strategy
- ✅ Báo cáo batch inventory
- ✅ Block/unblock batch

### 6. **Tính toán Giá vốn**
- ✅ Tính giá vốn động theo size và topping
- ✅ Tự động cập nhật khi nhập kho
- ✅ View `v_gia_von_mon` trong database

### 7. **Kiểm tra Nguyên liệu**
- ✅ API kiểm tra đủ nguyên liệu trước khi làm món
- ✅ Tích hợp vào POS workflow

---

## ❌ CÁC TÍNH NĂNG CÒN THIẾU

### 🔴 **PRIORITY 1 - Quan trọng cho nghiệp vụ**

#### 1. **Điều chỉnh Tồn kho (Stock Adjustment)**
**Mô tả:** Cho phép sửa số lượng tồn kho thủ công khi có sai sót, mất mát, hoặc kiểm kê.

**Tại sao cần:**
- Khi kiểm kê phát hiện tồn kho thực tế khác với hệ thống
- Khi có mất mát, hư hỏng nguyên liệu
- Khi cần điều chỉnh do lỗi nhập liệu

**Cần implement:**
- [ ] API: `POST /api/v1/inventory/adjust`
- [ ] Form điều chỉnh trong UI (tab mới hoặc modal)
- [ ] Lý do điều chỉnh (ghi chú bắt buộc)
- [ ] Lịch sử điều chỉnh (audit trail)
- [ ] Phân quyền: Chỉ Manager/Admin

**Database:**
```sql
CREATE TABLE dieu_chinh_kho (
  id SERIAL PRIMARY KEY,
  nguyen_lieu_id INT REFERENCES nguyen_lieu(id),
  so_luong_cu DECIMAL(10,2),
  so_luong_moi DECIMAL(10,2),
  chenh_lech DECIMAL(10,2),
  ly_do TEXT NOT NULL,
  nguoi_dieu_chinh_id INT REFERENCES users(user_id),
  ngay_dieu_chinh TIMESTAMP DEFAULT NOW()
);
```

---

#### 2. **Kiểm kê Kho (Stocktake / Inventory Count)**
**Mô tả:** Đối chiếu tồn kho thực tế với tồn kho trong hệ thống.

**Tại sao cần:**
- Kiểm kê định kỳ (hàng tuần/tháng)
- Phát hiện sai sót, mất mát
- Đảm bảo tính chính xác của dữ liệu

**Cần implement:**
- [ ] Tạo phiếu kiểm kê mới
- [ ] Nhập số lượng thực tế cho từng nguyên liệu
- [ ] So sánh tự động: Thực tế vs Hệ thống
- [ ] Tạo điều chỉnh tự động nếu có chênh lệch
- [ ] Báo cáo kiểm kê (Excel/PDF)
- [ ] Lịch sử kiểm kê

**Database:**
```sql
CREATE TABLE kiem_ke_kho (
  id SERIAL PRIMARY KEY,
  ngay_kiem_ke DATE NOT NULL,
  nguoi_kiem_ke_id INT REFERENCES users(user_id),
  trang_thai VARCHAR(20) DEFAULT 'DRAFT', -- DRAFT, IN_PROGRESS, COMPLETED
  ghi_chu TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE kiem_ke_chi_tiet (
  id SERIAL PRIMARY KEY,
  kiem_ke_id INT REFERENCES kiem_ke_kho(id),
  nguyen_lieu_id INT REFERENCES nguyen_lieu(id),
  so_luong_he_thong DECIMAL(10,2),
  so_luong_thuc_te DECIMAL(10,2),
  chenh_lech DECIMAL(10,2),
  ghi_chu TEXT
);
```

---

#### 3. **Sửa/Xóa Phiếu Nhập**
**Mô tả:** Cho phép chỉnh sửa hoặc hủy phiếu nhập kho đã tạo (nếu chưa có xuất kho từ lô đó).

**Tại sao cần:**
- Nhập sai thông tin (số lượng, giá)
- Hủy phiếu nhập do lỗi
- Điều chỉnh sau khi nhập

**Cần implement:**
- [ ] API: `PUT /api/v1/inventory/import/:id` - Sửa phiếu nhập
- [ ] API: `DELETE /api/v1/inventory/import/:id` - Xóa phiếu nhập
- [ ] Kiểm tra: Chỉ sửa/xóa được nếu chưa có xuất kho từ batch đó
- [ ] Nút "Sửa" và "Xóa" trong bảng lịch sử nhập
- [ ] Confirm dialog trước khi xóa
- [ ] Tự động điều chỉnh tồn kho khi sửa/xóa

---

#### 4. **Export Báo cáo Excel/PDF**
**Mô tả:** Xuất báo cáo tồn kho, xuất nhập tồn ra file Excel hoặc PDF.

**Tại sao cần:**
- Báo cáo cho chủ quán
- Lưu trữ, in ấn
- Đối chiếu với kế toán

**Cần implement:**
- [ ] Export "Tồn kho" → Excel/PDF
- [ ] Export "Xuất nhập tồn" → Excel/PDF
- [ ] Export "Báo cáo Batch" → Excel/PDF
- [ ] Export "Lịch sử nhập/xuất" → Excel/PDF
- [ ] Nút "📥 Xuất Excel" và "📄 Xuất PDF" trong mỗi tab

**Thư viện:**
- Excel: `xlsx` hoặc `exceljs`
- PDF: `pdfkit` (đã có sẵn trong project)

---

### 🟡 **PRIORITY 2 - Hữu ích nhưng không bắt buộc**

#### 5. **Quản lý Nhà cung cấp (Supplier Management)**
**Mô tả:** CRUD nhà cung cấp thay vì chỉ nhập text tự do.

**Tại sao cần:**
- Thống kê theo nhà cung cấp
- Lịch sử mua hàng
- Đánh giá nhà cung cấp

**Cần implement:**
- [ ] Bảng `nha_cung_cap` (id, ten, sdt, email, dia_chi, ghi_chu)
- [ ] CRUD API cho nhà cung cấp
- [ ] UI quản lý nhà cung cấp (tab mới hoặc page riêng)
- [ ] Dropdown chọn NCC khi nhập kho (thay vì text input)
- [ ] Báo cáo theo nhà cung cấp

---

#### 6. **Biểu đồ Xu hướng Tiêu thụ**
**Mô tả:** Biểu đồ line chart hiển thị xu hướng tiêu thụ nguyên liệu theo thời gian.

**Tại sao cần:**
- Dự đoán nhu cầu nhập kho
- Phân tích xu hướng
- Quyết định nhập kho hợp lý

**Cần implement:**
- [ ] API: `GET /api/v1/inventory/consumption-trend?ingredient_id=X&days=30`
- [ ] Line chart component (dùng `recharts` hoặc `chart.js`)
- [ ] Tab "📈 Xu hướng" trong Inventory Management
- [ ] Filter theo nguyên liệu, khoảng thời gian

---

#### 7. **Cảnh báo qua Email/SMS**
**Mô tả:** Tự động gửi email hoặc SMS khi nguyên liệu hết hàng/sắp hết.

**Tại sao cần:**
- Nhắc nhở tự động, không cần vào hệ thống
- Cảnh báo kịp thời

**Cần implement:**
- [ ] Cron job kiểm tra cảnh báo hàng ngày
- [ ] Tích hợp email service (SendGrid, Mailgun)
- [ ] Tích hợp SMS service (Twilio, Viettel)
- [ ] Cấu hình email/SMS của Manager trong settings
- [ ] Template email/SMS

---

#### 8. **Import nhiều dòng từ Excel**
**Mô tả:** Upload file Excel để nhập nhiều nguyên liệu cùng lúc.

**Tại sao cần:**
- Tiết kiệm thời gian khi nhập nhiều nguyên liệu
- Nhập từ file Excel của nhà cung cấp

**Cần implement:**
- [ ] Upload file Excel
- [ ] Parse Excel file (dùng `xlsx`)
- [ ] Validate từng dòng
- [ ] Preview trước khi import
- [ ] Import batch (transaction)
- [ ] Báo cáo kết quả (thành công/thất bại)

**Template Excel:**
```
| Mã nguyên liệu | Số lượng | Đơn giá | Nhà cung cấp | Ghi chú |
| NL_CA_PHE_DEN | 10       | 100000  | ABC Corp    | ...     |
```

---

### 🟢 **PRIORITY 3 - Nice to have**

#### 9. **Quét Mã vạch (Barcode Scanner)**
**Mô tả:** Quét mã vạch nguyên liệu để nhập kho nhanh.

**Cần implement:**
- [ ] Thêm field `barcode` vào bảng `nguyen_lieu`
- [ ] Camera scanner component
- [ ] Tự động điền form nhập kho khi quét

---

#### 10. **Chuyển kho (Transfer)**
**Mô tả:** Chuyển nguyên liệu giữa các kho (nếu có nhiều kho).

**Cần implement:**
- [ ] Bảng `kho` (nếu chưa có)
- [ ] API chuyển kho
- [ ] UI form chuyển kho

---

#### 11. **Dự báo Nhu cầu (Demand Forecasting)**
**Mô tả:** AI/ML dự đoán nhu cầu nhập kho dựa trên lịch sử.

**Cần implement:**
- [ ] Thuật toán dự đoán (linear regression, time series)
- [ ] API: `GET /api/v1/inventory/forecast?ingredient_id=X`
- [ ] UI hiển thị dự đoán

---

## 📊 TỔNG KẾT

### Độ hoàn thiện hiện tại: **~75%**

| Hạng mục | Trạng thái | Ghi chú |
|----------|-----------|---------|
| **Core Features** | ✅ 90% | Tồn kho, nhập/xuất, cảnh báo đã đầy đủ |
| **Batch Tracking** | ✅ 100% | Hoàn chỉnh với FEFO, expiry warnings |
| **Reporting** | ⚠️ 40% | Có báo cáo trên màn hình, thiếu export |
| **Adjustment** | ❌ 0% | Chưa có điều chỉnh tồn kho |
| **Stocktake** | ❌ 0% | Chưa có kiểm kê kho |
| **Supplier Management** | ⚠️ 20% | Chỉ có field text, chưa có CRUD |
| **Analytics** | ⚠️ 30% | Chưa có biểu đồ xu hướng |

---

## 🎯 ĐỀ XUẤT ƯU TIÊN

### **Nên làm ngay (cho luận văn):**

1. **✅ Export Excel/PDF** (1-2 ngày)
   - Dễ implement, impact cao
   - Thư viện đã có sẵn trong project

2. **✅ Điều chỉnh Tồn kho** (2-3 ngày)
   - Quan trọng cho nghiệp vụ
   - Không quá phức tạp

3. **✅ Sửa/Xóa Phiếu nhập** (1-2 ngày)
   - Bổ sung tính năng CRUD đầy đủ
   - Cải thiện UX

### **Có thể làm sau:**

4. **Kiểm kê Kho** (3-4 ngày)
   - Phức tạp hơn, cần nhiều logic

5. **Quản lý Nhà cung cấp** (2-3 ngày)
   - Hữu ích nhưng không bắt buộc

6. **Biểu đồ Xu hướng** (2-3 ngày)
   - Cần thêm thư viện chart

---

## 📝 KẾT LUẬN

Hệ thống quản lý kho hiện tại đã **khá hoàn chỉnh** với các tính năng core:
- ✅ Quản lý tồn kho
- ✅ Nhập/xuất kho
- ✅ Batch tracking với FEFO
- ✅ Cảnh báo tồn kho

**Còn thiếu chủ yếu:**
- ❌ Điều chỉnh tồn kho (quan trọng)
- ❌ Kiểm kê kho (quan trọng)
- ❌ Export báo cáo (hữu ích)
- ❌ Sửa/xóa phiếu nhập (UX)

**Đánh giá:** Phù hợp cho luận văn nếu bổ sung thêm 2-3 tính năng Priority 1.

---

**Created:** 2025-11-22  
**Status:** 📋 Analysis Complete

