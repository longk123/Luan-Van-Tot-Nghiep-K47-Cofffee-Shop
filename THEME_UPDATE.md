# 🎨 Theme Color Update - IMAPOS Style

## Đã Áp Dụng Theme Màu Mới

Dựa trên phong cách thiết kế IMAPOS từ hình ảnh reference, tôi đã cập nhật toàn bộ theme màu sắc cho dự án.

### 🎨 Bảng Màu Chính

#### 1. **Primary Brown** (Màu Nâu Cà Phê)
- Main: `#9B7653` - Màu nâu ấm áp, sang trọng
- Light: `#A0826D` 
- Dark: `#7A5E3A`
- Hover: `#8B6F47`
- **Sử dụng cho**: Buttons chính, borders, highlights

#### 2. **Accent Orange** (Màu Cam/Vàng)
- Main: `#F97316` - Màu cam tươi sáng
- Light: `#FB923C`
- Dark: `#EA580C`
- Hover: `#F59E0B`
- **Sử dụng cho**: Warnings, notifications, active states

#### 3. **Success Green** (Màu Xanh Lá)
- Main: `#10B981` - Màu xanh lá tươi
- Light: `#34D399`
- Dark: `#059669`
- Hover: `#047857`
- **Sử dụng cho**: Success messages, revenue, positive actions

#### 4. **Dark/Info** (Màu Xanh Đen)
- Main: `#374151` - Màu tối chuyên nghiệp
- Light: `#4B5563`
- Dark: `#1F2937`
- **Sử dụng cho**: Info messages, secondary actions, text

#### 5. **Cream/Warm** (Màu Nền Ấm)
- Light: `#FFFBF5`
- Main: `#FEF7ED`
- Medium: `#FAF5EF`
- Dark: `#F5EFE7`
- **Sử dụng cho**: Backgrounds, cards, subtle highlights

#### 6. **Error Red** (Màu Đỏ)
- Main: `#EF4444`
- Light: `#F87171`
- Dark: `#DC2626`
- Hover: `#B91C1C`
- **Sử dụng cho**: Error messages, delete actions, cancellations

---

## 📝 Files Đã Cập Nhật

### 1. **Core Configuration**
- ✅ `frontend/tailwind.config.js` - Thêm custom colors vào Tailwind
- ✅ `frontend/src/index.css` - Cập nhật CSS variables
- ✅ `frontend/src/constants/colors.js` - Tạo file constants cho colors

### 2. **Pages**
- ✅ `frontend/src/pages/Login.jsx` - Theme nâu ấm áp
- ✅ `frontend/src/pages/Dashboard.jsx` - Buttons và highlights
- ✅ `frontend/src/pages/ManagerDashboard.jsx` - Charts và KPIs
- ✅ `frontend/src/pages/InventoryManagement.jsx` - Tabs và buttons

### 3. **Components** (Cần cập nhật thêm)
- ⏳ Toast notifications
- ⏳ Modal dialogs
- ⏳ Table components
- ⏳ Form inputs
- ⏳ Status badges

---

## 🎯 Mapping Màu Cũ → Màu Mới

| Màu Cũ | Màu Mới | Mục Đích |
|--------|---------|----------|
| `blue-600` (#3b82f6) | `primary-500` (#9B7653) | Primary actions |
| `indigo-600` | `primary-500` (#9B7653) | Primary variations |
| `emerald-600` (#059669) | `success-600` (#059669) | Success states |
| `amber-600` | `accent-500` (#F97316) | Warnings/highlights |
| Background `#faf7f2` | `cream-100` (#FEF7ED) | Warm backgrounds |

---

## 🚀 Cách Sử Dụng

### Trong Tailwind CSS:
```jsx
// Primary actions
<button className="bg-primary-500 hover:bg-primary-600 text-white">
  Đăng nhập
</button>

// Accent/Warning
<button className="bg-accent-500 hover:bg-accent-600 text-white">
  Cảnh báo
</button>

// Success
<button className="bg-success-600 hover:bg-success-700 text-white">
  Xác nhận
</button>

// Backgrounds
<div className="bg-cream-100">
  Content
</div>
```

### Trong Inline Styles:
```jsx
import { COLORS } from '../constants/colors';

<button style={{ backgroundColor: COLORS.primary.main }}>
  Click me
</button>
```

---

## 🎨 Design System Principles

1. **Nhất quán**: Tất cả buttons chính dùng primary brown
2. **Ấm áp**: Nền cream tạo cảm giác thân thiện, gần gũi
3. **Tương phản tốt**: Màu text đủ tối để dễ đọc
4. **Phân cấp rõ ràng**: Primary > Accent > Dark > Success
5. **Phù hợp quán cà phê**: Tone màu nâu gỗ, ấm áp, sang trọng

---

## ✨ Next Steps

Để hoàn thiện theme, cần cập nhật thêm:

1. **Components chưa update**:
   - [ ] Toast.jsx
   - [ ] ConfirmDialog.jsx
   - [ ] CustomSelect.jsx
   - [ ] ReservationsList.jsx
   - [ ] CurrentShiftOrders.jsx
   - [ ] LineItemWithOptions.jsx

2. **Status Colors**:
   - [ ] Order status badges
   - [ ] Payment status
   - [ ] Table status indicators

3. **Charts & Visualizations**:
   - [x] Revenue charts (Done)
   - [ ] Other analytics components

4. **Forms & Inputs**:
   - [x] Login form (Done)
   - [ ] Other form components

---

## 📸 Reference

Theme dựa trên IMAPOS Coffee Shop POS design với:
- Màu nâu chủ đạo (#9B7653) - Sang trọng, ấm áp
- Màu cam nhấn (#F97316) - Năng động, nổi bật
- Màu xanh lá (#10B981) - Tươi mới, thành công
- Nền kem (#FEF7ED) - Nhẹ nhàng, dễ chịu

---

**Updated**: October 27, 2025
**Status**: ✅ Core theme applied, components migration in progress
