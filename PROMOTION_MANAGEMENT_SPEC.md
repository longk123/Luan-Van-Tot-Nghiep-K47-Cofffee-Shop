# 📋 Đặc tả chi tiết: Chức năng Quản lý Khuyến mãi

**Ngày:** 2025-01-26  
**Trạng thái:** Chưa có UI - Cần phát triển  
**Độ ưu tiên:** CAO

---

## 📊 1. Tổng quan

Chức năng **Quản lý Khuyến mãi** cho phép quản lý các chương trình khuyến mãi (CTKM) của quán cà phê, bao gồm tạo, sửa, xóa, kích hoạt/tắt và theo dõi hiệu quả của từng CTKM.

### 1.1. Mục đích
- Quản lý toàn bộ các chương trình khuyến mãi trong hệ thống
- Theo dõi hiệu quả sử dụng của từng CTKM
- Tối ưu hóa chiến lược marketing và khuyến khích khách hàng

### 1.2. Đối tượng sử dụng
- **Manager/Admin**: Tạo, sửa, xóa, quản lý CTKM
- **Cashier**: Áp dụng mã khuyến mãi khi thanh toán (đã có trong POS)

---

## 🗄️ 2. Cấu trúc Database

### 2.1. Bảng `khuyen_mai`

| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---------|--------------|-----------|-------|
| `id` | INTEGER | PRIMARY KEY, AUTO INCREMENT | ID khuyến mãi |
| `ma` | TEXT | UNIQUE, nullable | Mã khuyến mãi (VD: "GIAM10", "FREESHIP") |
| `ten` | TEXT | NOT NULL | Tên chương trình khuyến mãi |
| `mo_ta` | TEXT | nullable | Mô tả chi tiết |
| `loai` | TEXT | NOT NULL | Loại KM: "PERCENT" hoặc "AMOUNT" |
| `gia_tri` | NUMERIC | NOT NULL | Giá trị giảm (% hoặc số tiền) |
| `max_giam` | INTEGER | nullable | Giới hạn tối đa số tiền giảm (đối với PERCENT) |
| `dieu_kien` | JSONB | nullable | Điều kiện áp dụng (JSON) |
| `bat_dau` | TIMESTAMPTZ | nullable | Ngày bắt đầu hiệu lực |
| `ket_thuc` | TIMESTAMPTZ | nullable | Ngày kết thúc hiệu lực |
| `active` | BOOLEAN | nullable, DEFAULT true | Trạng thái kích hoạt |
| `stackable` | BOOLEAN | nullable, DEFAULT true | Có thể cộng dồn với KM khác |
| `usage_limit` | INTEGER | nullable | Giới hạn số lần sử dụng (null = không giới hạn) |
| `used_count` | INTEGER | nullable, DEFAULT 0 | Số lần đã sử dụng |

### 2.2. Bảng liên quan

**`don_hang_khuyen_mai`** (Bảng trung gian):
- `don_hang_id`: ID đơn hàng
- `khuyen_mai_id`: ID khuyến mãi
- `so_tien_giam`: Số tiền giảm thực tế
- `chi_tiet`: JSONB (thông tin chi tiết)
- `applied_by`: ID nhân viên áp dụng

**Views:**
- `v_order_promotions`: View hiển thị KM đang áp dụng cho đơn
- `v_invoice_promotions`: View cho hóa đơn

### 2.3. Functions
- `fn_calc_promo_amount(order_id, promo_id)`: Tính số tiền giảm theo điều kiện

---

## 🎯 3. Các tính năng cần phát triển

### 3.1. Danh sách Khuyến mãi (List View)

#### 3.1.1. Hiển thị
- **Bảng danh sách** với các cột:
  - Mã KM
  - Tên chương trình
  - Loại (PERCENT/AMOUNT)
  - Giá trị
  - Trạng thái (Active/Inactive)
  - Thời gian hiệu lực
  - Số lần sử dụng
  - Thao tác (Xem, Sửa, Xóa, Toggle Active)

- **Bộ lọc:**
  - Trạng thái: Tất cả / Active / Inactive
  - Loại: Tất cả / PERCENT / AMOUNT
  - Tìm kiếm theo mã, tên
  - Lọc theo thời gian hiệu lực (Đang diễn ra / Sắp diễn ra / Đã hết hạn)

- **Thống kê nhanh (Summary Cards):**
  - Tổng số CTKM đang active
  - Tổng số CTKM đã sử dụng hôm nay
  - Tổng tiền giảm giá hôm nay
  - Số CTKM sắp hết hạn (trong 7 ngày)

#### 3.1.2. Chức năng
- **Sắp xếp:** Theo ngày tạo, số lần sử dụng, thời gian hết hạn
- **Phân trang:** 10/20/50 items per page
- **Export:** Xuất Excel danh sách KM

---

### 3.2. Tạo/Sửa Khuyến mãi (Form Modal)

#### 3.2.1. Form fields

**Thông tin cơ bản:**
- **Mã khuyến mãi** (`ma`):
  - Text input
  - Required (nhưng có thể để trống - auto generate)
  - Unique validation
  - Format: UPPERCASE, không có ký tự đặc biệt
  - Placeholder: "GIAM10", "FREESHIP", "VIP50"

- **Tên chương trình** (`ten`):
  - Text input, required
  - Placeholder: "Giảm 10% cho đơn từ 100k"

- **Mô tả** (`mo_ta`):
  - Textarea, optional
  - Placeholder: "Chi tiết về chương trình khuyến mãi..."

**Cấu hình giảm giá:**
- **Loại khuyến mãi** (`loai`):
  - Radio/Select: "PERCENT" (Phần trăm) / "AMOUNT" (Số tiền cố định)
  - Required

- **Giá trị** (`gia_tri`):
  - Number input, required
  - Nếu PERCENT: 0-100 (hiển thị %)
  - Nếu AMOUNT: số nguyên >= 0 (hiển thị VND)
  - Placeholder: "10" (% hoặc VND)

- **Giới hạn tối đa** (`max_giam`):
  - Number input, optional
  - Chỉ hiển thị khi `loai = "PERCENT"`
  - Ví dụ: Giảm 10% nhưng tối đa 30k
  - Placeholder: "30000"

**Điều kiện áp dụng** (`dieu_kien` - JSONB):
- **Tổng đơn tối thiểu** (`min_subtotal`):
  - Number input, optional
  - Placeholder: "100000"

- **Số món tối thiểu** (`min_items`):
  - Number input, optional

- **Danh mục áp dụng** (`categories`):
  - Multi-select, optional
  - Chọn danh mục được áp dụng KM

- **Món áp dụng** (`items`):
  - Multi-select, optional
  - Chọn món cụ thể được áp dụng KM

**Thời gian hiệu lực:**
- **Ngày bắt đầu** (`bat_dau`):
  - DateTime picker, optional
  - Nếu null = có hiệu lực ngay

- **Ngày kết thúc** (`ket_thuc`):
  - DateTime picker, optional
  - Nếu null = không hết hạn

**Cài đặt nâng cao:**
- **Kích hoạt** (`active`):
  - Switch/Toggle, default: true
  - Bật/tắt CTKM mà không cần xóa

- **Có thể cộng dồn** (`stackable`):
  - Switch/Toggle, default: true
  - Nếu false: không thể áp dụng cùng KM khác

- **Giới hạn số lần sử dụng** (`usage_limit`):
  - Number input, optional
  - Nếu null = không giới hạn
  - Khi đạt giới hạn, tự động tắt hoặc cảnh báo

#### 3.2.2. Validation
- Mã khuyến mãi phải unique (nếu có)
- Giá trị PERCENT: 0-100
- Giá trị AMOUNT: >= 0
- `max_giam` chỉ có khi PERCENT
- Ngày kết thúc >= ngày bắt đầu
- Nếu có `usage_limit`, phải > 0

#### 3.2.3. Preview
- Hiển thị ví dụ: "Giảm 10.000đ cho đơn từ 100.000đ"
- Tính toán số tiền giảm mẫu với subtotal mẫu

---

### 3.3. Chi tiết Khuyến mãi (Detail View)

#### 3.3.1. Tabs

**Tab 1: Thông tin chung**
- Hiển thị đầy đủ thông tin CTKM
- Trạng thái (Active/Inactive)
- Thời gian hiệu lực với countdown
- Số lần sử dụng / Giới hạn
- Nút "Sửa" và "Xóa"

**Tab 2: Thống kê sử dụng**
- Biểu đồ số lần sử dụng theo ngày/tuần/tháng
- Tổng tiền giảm giá đã áp dụng
- Top đơn hàng sử dụng KM (theo giá trị giảm)
- Trung bình số tiền giảm/đơn

**Tab 3: Lịch sử áp dụng**
- Bảng danh sách đơn hàng đã sử dụng KM
- Cột: Mã đơn, Ngày, Số tiền giảm, Nhân viên áp dụng
- Phân trang
- Export Excel

---

### 3.4. Xóa/Tắt Khuyến mãi

#### 3.4.1. Tắt khuyến mãi (Toggle Active)
- **Quick action:** Toggle switch trong danh sách
- **Confirmation:** "Bạn có chắc muốn tắt CTKM này?"
- **Effect:** 
  - KM không còn hiển thị trong POS
  - KM đã áp dụng trong đơn mở vẫn giữ nguyên
  - KM mới không thể áp dụng

#### 3.4.2. Xóa khuyến mãi
- **Confirmation:** "Xóa CTKM này sẽ không thể khôi phục. Bạn có chắc chắn?"
- **Validation:**
  - Kiểm tra có đơn hàng đã sử dụng không
  - Nếu có: Cảnh báo nhưng vẫn cho phép xóa (soft delete hoặc hard delete tùy yêu cầu)
- **Effect:**
  - Xóa vĩnh viễn hoặc đánh dấu deleted
  - Xóa các liên kết trong `don_hang_khuyen_mai` (cascade hoặc giữ lại lịch sử)

---

### 3.5. Quản lý hàng loạt (Bulk Actions)

- **Chọn nhiều:** Checkbox cho mỗi hàng
- **Actions:**
  - Tắt/Kích hoạt hàng loạt
  - Xóa hàng loạt (với confirmation)
  - Export Excel

---

## 🔌 4. Backend API cần phát triển

### 4.1. API hiện có (đã có sẵn)

```javascript
GET    /api/v1/pos/promotions?active=1        // List active promotions
GET    /api/v1/pos/orders/:orderId/promotions // Get order promotions
POST   /api/v1/pos/orders/:orderId/apply-promo // Apply promo code
DELETE /api/v1/pos/orders/:orderId/promotions/:promoId // Remove promo
```

### 4.2. API cần tạo mới

#### 4.2.1. CRUD Promotions

```javascript
// List all promotions (with filters)
GET /api/v1/promotions?status=active&type=PERCENT&search=GIAM

// Get promotion detail
GET /api/v1/promotions/:id

// Create promotion
POST /api/v1/promotions
Body: {
  ma, ten, mo_ta,
  loai, gia_tri, max_giam,
  dieu_kien: { min_subtotal, min_items, categories, items },
  bat_dau, ket_thuc,
  active, stackable, usage_limit
}

// Update promotion
PUT /api/v1/promotions/:id
Body: (same as POST)

// Delete promotion
DELETE /api/v1/promotions/:id

// Toggle active
PATCH /api/v1/promotions/:id/toggle-active
Body: { active: true/false }
```

#### 4.2.2. Statistics

```javascript
// Get promotion statistics
GET /api/v1/promotions/:id/stats?startDate=...&endDate=...

Response: {
  total_uses: 150,
  total_discount_amount: 1500000,
  avg_discount_per_order: 10000,
  usage_by_date: [...],
  top_orders: [...]
}

// Get promotion usage history
GET /api/v1/promotions/:id/usage?page=1&limit=20
```

#### 4.2.3. Summary

```javascript
// Get promotions summary (for dashboard cards)
GET /api/v1/promotions/summary?date=2025-01-26

Response: {
  total_active: 10,
  total_used_today: 25,
  total_discount_today: 250000,
  expiring_soon: 2  // within 7 days
}
```

---

## 🎨 5. UI/UX Design

### 5.1. Trang chính: `/promotion-management`

**Layout:**
- **Header:**
  - Title: "Quản lý Khuyến mãi"
  - Button: "➕ Thêm khuyến mãi" (gradient nâu, invert hover)
  - Summary cards (4 cards: Active, Used Today, Discount Today, Expiring Soon)

- **Filters bar:**
  - Search input (mã, tên)
  - Dropdown: Trạng thái (All/Active/Inactive)
  - Dropdown: Loại (All/PERCENT/AMOUNT)
  - Date range picker: Thời gian hiệu lực

- **Table:**
  - Responsive table với hover effects
  - Badge màu cho trạng thái (Active: xanh, Inactive: xám)
  - Badge màu cho loại (PERCENT: tím, AMOUNT: cam)
  - Action buttons: Eye (Xem), Edit (Sửa), Trash (Xóa), Toggle (Active/Inactive)
  - Style đồng bộ với EmployeeManagement

### 5.2. Form Modal: Tạo/Sửa

**Design:**
- Modal full-screen trên mobile, centered trên desktop
- Tabbed form (Thông tin cơ bản / Điều kiện / Cài đặt)
- Preview box bên phải (desktop)
- Validation messages hiển thị inline
- Buttons: "Hủy" (outline), "Lưu" (gradient nâu, invert hover)

### 5.3. Detail Modal

**Tabs:**
1. **Thông tin:** Form readonly + action buttons
2. **Thống kê:** Charts (Chart.js hoặc Recharts)
3. **Lịch sử:** Table với pagination

---

## 📱 6. Integration với POS

### 6.1. Hiện tại (đã có)
- Cashier có thể nhập mã KM trong OrderDrawer
- Hệ thống tự động tính toán số tiền giảm
- Hiển thị KM đã áp dụng trong order summary

### 6.2. Cần cải thiện
- **Suggestions:** Gợi ý KM phù hợp dựa trên giá trị đơn
- **Auto-apply:** Tự động áp dụng KM nếu đáp ứng điều kiện
- **Validation message:** Hiển thị rõ lý do không thể áp dụng KM

---

## ✅ 7. Checklist phát triển

### Backend
- [ ] Repository: `promotionRepository.js`
- [ ] Service: `promotionService.js`
- [ ] Controller: `promotionController.js`
- [ ] Routes: `/api/v1/promotions`
- [ ] Validators: `promotionValidator.js`
- [ ] Unit tests

### Frontend
- [ ] Page: `PromotionManagement.jsx`
- [ ] Components:
  - [ ] `PromotionFormModal.jsx`
  - [ ] `PromotionDetailModal.jsx`
  - [ ] `PromotionStats.jsx`
  - [ ] `PromotionUsageHistory.jsx`
- [ ] API integration: `api.js` methods
- [ ] Route: `/promotion-management` (Manager/Admin only)
- [ ] Navigation: Thêm link trong ManagerDashboard

### Testing
- [ ] Test tạo/sửa/xóa KM
- [ ] Test validation
- [ ] Test áp dụng KM trong POS
- [ ] Test statistics
- [ ] Test edge cases (hết hạn, đạt giới hạn, stackable)

---

## 📝 8. Ví dụ dữ liệu

### 8.1. PERCENT khuyến mãi
```json
{
  "ma": "GIAM10",
  "ten": "Giảm 10% cho đơn từ 100k",
  "mo_ta": "Áp dụng cho tất cả món, tối đa giảm 30k",
  "loai": "PERCENT",
  "gia_tri": 10,
  "max_giam": 30000,
  "dieu_kien": {
    "min_subtotal": 100000
  },
  "bat_dau": "2025-01-01T00:00:00Z",
  "ket_thuc": "2025-12-31T23:59:59Z",
  "active": true,
  "stackable": true,
  "usage_limit": null
}
```

### 8.2. AMOUNT khuyến mãi
```json
{
  "ma": "FREESHIP",
  "ten": "Miễn phí ship",
  "mo_ta": "Giảm 20k phí ship cho đơn từ 150k",
  "loai": "AMOUNT",
  "gia_tri": 20000,
  "max_giam": null,
  "dieu_kien": {
    "min_subtotal": 150000,
    "order_type": "TAKEAWAY"
  },
  "bat_dau": null,
  "ket_thuc": null,
  "active": true,
  "stackable": false,
  "usage_limit": 1000
}
```

### 8.3. Khuyến mãi theo danh mục
```json
{
  "ma": "CAPHE50",
  "ten": "Giảm 50% cà phê",
  "mo_ta": "Giảm 50% cho tất cả món cà phê",
  "loai": "PERCENT",
  "gia_tri": 50,
  "max_giam": null,
  "dieu_kien": {
    "categories": [1]  // ID danh mục "Cà phê"
  },
  "active": true,
  "stackable": true
}
```

---

## 🚀 9. Ưu tiên phát triển

### Phase 1: CRUD cơ bản (1-2 ngày)
1. List promotions
2. Create/Edit form
3. Delete/Toggle active
4. Basic validation

### Phase 2: Chi tiết & Thống kê (1 ngày)
1. Detail modal với tabs
2. Statistics charts
3. Usage history

### Phase 3: Nâng cao (1 ngày)
1. Bulk actions
2. Export Excel
3. Advanced filters
4. Auto-suggestions trong POS

---

## 📚 10. Tài liệu tham khảo

- Database schema: `backend/setup-db.js` (nếu có)
- API endpoints: `backend/src/routes/pos.js` (promotions section)
- Controller: `backend/src/controllers/posPromotionsController.js`
- POS integration: `frontend/src/components/OrderDrawer.jsx`

---

**Ghi chú:** 
- Tất cả UI phải đồng bộ với theme hiện tại (màu nâu #c9975b, #d4a574)
- Sử dụng cùng style với EmployeeManagement, MenuManagement
- Icons: SVG (không dùng emoji)
- Hover effects: Invert colors cho buttons

