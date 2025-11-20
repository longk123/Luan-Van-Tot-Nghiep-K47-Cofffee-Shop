# 📱 ĐẶC TẢ CHI TIẾT: CUSTOMER PORTAL (Trang Web Cho Khách Hàng)

**Ngày:** 2025-11-20  
**Tham khảo:** [Phúc Long Coffee & Tea](https://phuclong.com.vn/)  
**Trạng thái:** Cần phát triển  
**Độ ưu tiên:** CAO

---

## 🎯 1. TỔNG QUAN

### 1.1. Mục đích
Xây dựng **Customer Portal** - trang web công khai cho khách hàng để:
- Xem menu và sản phẩm
- Đặt bàn online
- Đặt hàng trước (pre-order) cho takeaway
- Thanh toán online
- Xem lịch sử đơn hàng và đặt bàn
- Tích điểm thân thiết (loyalty points) - tùy chọn

### 1.2. Đối tượng sử dụng
- **Khách hàng** (không cần đăng nhập để xem menu, cần đăng nhập để đặt hàng)
- **Khách vãng lai** (có thể đặt hàng không cần tài khoản)

### 1.3. Phân biệt với hệ thống hiện tại
- **Hệ thống hiện tại:** POS nội bộ cho nhân viên (cashier, manager, kitchen)
- **Customer Portal:** Trang web công khai cho khách hàng (không cần role, không cần JWT của nhân viên)

---

## 🏗️ 2. KIẾN TRÚC HỆ THỐNG

### 2.1. Cấu trúc Frontend

```
frontend/
├── src/
│   ├── pages/
│   │   ├── customer/              # NEW: Customer-facing pages
│   │   │   ├── HomePage.jsx       # Trang chủ
│   │   │   ├── MenuPage.jsx       # Xem menu
│   │   │   ├── ProductDetail.jsx  # Chi tiết sản phẩm
│   │   │   ├── ReservationPage.jsx # Đặt bàn
│   │   │   ├── CartPage.jsx       # Giỏ hàng
│   │   │   ├── CheckoutPage.jsx   # Thanh toán
│   │   │   ├── OrderHistory.jsx   # Lịch sử đơn hàng
│   │   │   ├── CustomerLogin.jsx  # Đăng nhập khách hàng
│   │   │   └── CustomerRegister.jsx # Đăng ký khách hàng
│   │   └── ... (existing pages)
│   ├── components/
│   │   ├── customer/              # NEW: Customer components
│   │   │   ├── Header.jsx         # Header với logo, menu, cart icon
│   │   │   ├── Footer.jsx         # Footer với thông tin liên hệ
│   │   │   ├── ProductCard.jsx    # Card hiển thị sản phẩm
│   │   │   ├── CategoryFilter.jsx  # Lọc theo danh mục
│   │   │   ├── CartDrawer.jsx     # Drawer giỏ hàng
│   │   │   ├── ReservationForm.jsx # Form đặt bàn
│   │   │   └── OrderStatus.jsx    # Trạng thái đơn hàng
│   │   └── ... (existing components)
│   └── layouts/
│       └── CustomerLayout.jsx     # NEW: Layout cho customer pages
```

### 2.2. Backend API mới cần tạo

```
backend/src/
├── routes/
│   └── customer.js                # NEW: Customer routes (public)
├── controllers/
│   └── customerController.js      # NEW: Customer controller
├── services/
│   └── customerService.js        # NEW: Customer service
└── repositories/
    └── customerRepository.js      # NEW: Customer repository
```

### 2.3. Database Schema

**Bảng mới cần thêm:**
- `customer_accounts` - Tài khoản khách hàng (tách biệt với `users` của nhân viên)
- `customer_orders` - Đơn hàng từ customer portal (có thể dùng lại `don_hang` với `order_source = 'ONLINE'`)
- `customer_cart` - Giỏ hàng tạm (session-based hoặc user-based)

**Bảng đã có (tái sử dụng):**
- `khach_hang` - Thông tin khách hàng
- `don_hang` - Đơn hàng (thêm field `order_source`)
- `dat_ban` - Đặt bàn (đã có)
- `mon`, `loai_mon` - Menu (đã có)

---

## 📋 3. CÁC TRANG VÀ CHỨC NĂNG CHI TIẾT

### 3.1. **Trang Chủ (HomePage.jsx)**

#### 3.1.1. Hero Section
- Banner lớn với hình ảnh quán
- Call-to-action: "Đặt bàn ngay", "Xem menu"
- Thông tin nổi bật: Giờ mở cửa, địa chỉ

#### 3.1.2. Featured Products
- Hiển thị 6-8 sản phẩm nổi bật
- Carousel/Slider
- Click vào → ProductDetail

#### 3.1.3. Categories Preview
- Grid các danh mục chính (Cà phê, Trà, Bánh ngọt...)
- Click vào → MenuPage với filter

#### 3.1.4. Store Information
- Địa chỉ, số điện thoại
- Bản đồ (Google Maps embed)
- Giờ mở cửa

#### 3.1.5. Promotions Banner
- Hiển thị các khuyến mãi đang active
- Link đến trang khuyến mãi

---

### 3.2. **Trang Menu (MenuPage.jsx)**

#### 3.2.1. Layout
- **Sidebar trái:** Filter theo danh mục
- **Main content:** Grid sản phẩm
- **Top bar:** Search, Sort (giá, tên, phổ biến)

#### 3.2.2. Product Grid
- **ProductCard** hiển thị:
  - Hình ảnh sản phẩm
  - Tên sản phẩm
  - Giá (giá thấp nhất nếu có nhiều size)
  - Badge "Phổ biến" nếu là bestseller
  - Button "Thêm vào giỏ" / "Xem chi tiết"

#### 3.2.3. Filter & Search
- **Danh mục:** Checkbox list
- **Tìm kiếm:** Search bar với autocomplete
- **Sort:** Dropdown (Giá tăng dần, Giá giảm dần, Tên A-Z, Phổ biến)

#### 3.2.4. Pagination
- 12-20 items per page
- Infinite scroll (optional)

---

### 3.3. **Chi Tiết Sản Phẩm (ProductDetail.jsx)**

#### 3.3.1. Product Info
- **Hình ảnh lớn:** Gallery (nếu có nhiều ảnh)
- **Tên sản phẩm**
- **Mô tả**
- **Giá:** Hiển thị theo size (S/M/L)
- **Danh mục:** Link về MenuPage

#### 3.3.2. Variants Selection
- **Size:** Radio buttons (S/M/L) với giá tương ứng
- **Tùy chọn:** (nếu có)
  - Đường: Ít/Vừa/Nhiều
  - Đá: Ít/Vừa/Nhiều
  - Topping: Checkbox với giá

#### 3.3.3. Add to Cart
- **Số lượng:** Stepper (+/-)
- **Button "Thêm vào giỏ"**
- **Button "Đặt ngay"** (thêm vào giỏ + mở CartDrawer)

#### 3.3.4. Related Products
- Hiển thị sản phẩm cùng danh mục

---

### 3.4. **Đặt Bàn (ReservationPage.jsx)**

#### 3.4.1. Form đặt bàn
- **Thông tin khách hàng:**
  - Họ tên (required)
  - Số điện thoại (required)
  - Email (optional)
  - Số người (required, min: 1, max: 20)

- **Thời gian:**
  - Ngày (date picker, min: hôm nay)
  - Giờ (time picker, theo slot 30 phút)
  - Thời lượng (60/90/120 phút)

- **Khu vực:** (optional)
  - Dropdown chọn khu vực ưa thích

- **Ghi chú:** (optional)
  - Textarea cho yêu cầu đặc biệt

#### 3.4.2. Validation
- Số điện thoại format VN
- Ngày không thể quá khứ
- Giờ không thể quá khứ (nếu chọn hôm nay)
- Số người hợp lý

#### 3.4.3. Submit
- **Nếu chưa đăng nhập:** Lưu thông tin vào session/localStorage
- **Nếu đã đăng nhập:** Tự động điền thông tin từ account
- **API:** `POST /api/v1/customer/reservations`
- **Success:** Hiển thị confirmation với mã đặt bàn

---

### 3.5. **Giỏ Hàng (CartPage.jsx / CartDrawer.jsx)**

#### 3.5.1. Cart Items
- **Danh sách items:**
  - Hình ảnh thumbnail
  - Tên sản phẩm + size
  - Tùy chọn (đường, đá, topping)
  - Giá đơn vị
  - Số lượng (stepper)
  - Tổng tiền item
  - Button xóa

#### 3.5.2. Cart Summary
- **Tổng tiền sản phẩm**
- **Phí ship** (nếu takeaway, có thể 0đ)
- **Giảm giá** (nếu có mã khuyến mãi)
- **Tổng cộng**

#### 3.5.3. Promo Code
- Input field + Button "Áp dụng"
- Hiển thị mã đã áp dụng
- Button "Xóa" mã

#### 3.5.4. Actions
- **Button "Tiếp tục mua sắm"** → Quay về MenuPage
- **Button "Thanh toán"** → Navigate to CheckoutPage

#### 3.5.5. Empty State
- Icon giỏ hàng trống
- Message: "Giỏ hàng của bạn đang trống"
- Button "Xem menu" → MenuPage

---

### 3.6. **Thanh Toán (CheckoutPage.jsx)**

#### 3.6.1. Order Type Selection
- **Radio buttons:**
  - "Mang đi" (TAKEAWAY)
  - "Tại quán" (DINE_IN) - yêu cầu chọn bàn hoặc đặt bàn

#### 3.6.2. Customer Information
- **Nếu chưa đăng nhập:**
  - Họ tên (required)
  - Số điện thoại (required)
  - Email (optional)
  - Checkbox "Lưu thông tin cho lần sau"

- **Nếu đã đăng nhập:**
  - Hiển thị thông tin từ account
  - Cho phép sửa

#### 3.6.3. Delivery/Pickup Info
- **Nếu TAKEAWAY:**
  - Thời gian nhận hàng (date + time picker)
  - Địa chỉ nhận hàng (nếu có delivery)
  - Ghi chú đặc biệt

- **Nếu DINE_IN:**
  - Chọn bàn (dropdown bàn trống) HOẶC
  - Link "Đặt bàn trước" → ReservationPage

#### 3.6.4. Payment Method
- **Radio buttons:**
  - Tiền mặt (khi nhận hàng)
  - Thanh toán online (PayOS/VietQR)
  - Thẻ tín dụng (nếu có)

#### 3.6.5. Order Summary
- Tóm tắt đơn hàng (giống CartPage)
- Mã khuyến mãi đã áp dụng

#### 3.6.6. Submit Order
- **Button "Đặt hàng"**
- **Validation:** Kiểm tra tất cả fields required
- **API:** `POST /api/v1/customer/orders`
- **Loading state:** Disable button, show spinner
- **Success:** 
  - Nếu thanh toán online → Redirect to PayOS
  - Nếu tiền mặt → Show confirmation page với mã đơn

---

### 3.7. **Lịch Sử Đơn Hàng (OrderHistory.jsx)**

#### 3.7.1. Requirements
- **Chỉ hiển thị khi đã đăng nhập**
- **Nếu chưa đăng nhập:** Redirect to CustomerLogin

#### 3.7.2. Order List
- **Table/Card view:**
  - Mã đơn hàng
  - Ngày đặt
  - Loại đơn (Mang đi/Tại quán)
  - Tổng tiền
  - Trạng thái (Đang chuẩn bị/Đã hoàn thành/Đã hủy)
  - Actions: "Xem chi tiết", "Đặt lại"

#### 3.7.3. Filter & Sort
- Filter theo trạng thái
- Filter theo loại đơn
- Sort theo ngày (mới nhất/cũ nhất)

#### 3.7.4. Order Detail Modal
- Chi tiết đơn hàng
- Danh sách sản phẩm
- Thông tin thanh toán
- Trạng thái real-time (nếu có SSE)

---

### 3.8. **Đăng Nhập/Đăng Ký Khách Hàng**

#### 3.8.1. CustomerLogin.jsx
- **Form:**
  - Số điện thoại hoặc Email
  - Mật khẩu
  - Checkbox "Ghi nhớ đăng nhập"
  - Link "Quên mật khẩu?"
  - Link "Chưa có tài khoản? Đăng ký"

#### 3.8.2. CustomerRegister.jsx
- **Form:**
  - Họ tên (required)
  - Số điện thoại (required, unique)
  - Email (optional, unique nếu có)
  - Mật khẩu (required, min 6 chars)
  - Xác nhận mật khẩu (required)
  - Checkbox "Đồng ý điều khoản"

#### 3.8.3. Authentication Flow
- **Backend:** Tách biệt với `users` (nhân viên)
- **JWT:** Token riêng cho customer (khác với staff token)
- **Session:** Có thể dùng session thay vì JWT (tùy chọn)

---

## 🔌 4. BACKEND API ENDPOINTS

### 4.1. Public APIs (Không cần auth)

```javascript
// Menu & Products
GET    /api/v1/customer/menu/categories          // Danh sách danh mục
GET    /api/v1/customer/menu/items?category_id=  // Danh sách sản phẩm
GET    /api/v1/customer/menu/items/:id           // Chi tiết sản phẩm
GET    /api/v1/customer/menu/search?keyword=      // Tìm kiếm sản phẩm

// Promotions
GET    /api/v1/customer/promotions?active=1      // Khuyến mãi đang active

// Store Info
GET    /api/v1/customer/store/info               // Thông tin cửa hàng
GET    /api/v1/customer/store/hours              // Giờ mở cửa
```

### 4.2. Customer Auth APIs

```javascript
// Authentication
POST   /api/v1/customer/auth/register            // Đăng ký
POST   /api/v1/customer/auth/login               // Đăng nhập
POST   /api/v1/customer/auth/logout             // Đăng xuất
GET    /api/v1/customer/auth/me                 // Thông tin tài khoản
POST   /api/v1/customer/auth/forgot-password   // Quên mật khẩu
POST   /api/v1/customer/auth/reset-password     // Đặt lại mật khẩu
```

### 4.3. Customer Order APIs (Cần auth)

```javascript
// Cart (có thể dùng session hoặc user-based)
GET    /api/v1/customer/cart                    // Lấy giỏ hàng
POST   /api/v1/customer/cart/items              // Thêm vào giỏ
PATCH  /api/v1/customer/cart/items/:id          // Cập nhật số lượng
DELETE /api/v1/customer/cart/items/:id         // Xóa khỏi giỏ
POST   /api/v1/customer/cart/apply-promo        // Áp dụng mã KM
DELETE /api/v1/customer/cart/promo              // Xóa mã KM

// Orders
POST   /api/v1/customer/orders                  // Tạo đơn hàng
GET    /api/v1/customer/orders                  // Lịch sử đơn hàng
GET    /api/v1/customer/orders/:id              // Chi tiết đơn hàng
PATCH  /api/v1/customer/orders/:id/cancel       // Hủy đơn (nếu chưa chuẩn bị)
```

### 4.4. Customer Reservation APIs (Cần auth)

```javascript
// Reservations
POST   /api/v1/customer/reservations             // Đặt bàn
GET    /api/v1/customer/reservations             // Lịch sử đặt bàn
GET    /api/v1/customer/reservations/:id         // Chi tiết đặt bàn
PATCH  /api/v1/customer/reservations/:id/cancel // Hủy đặt bàn
```

---

## 🗄️ 5. DATABASE SCHEMA MỚI

### 5.1. Bảng `customer_accounts`

```sql
CREATE TABLE customer_accounts (
  id SERIAL PRIMARY KEY,
  phone TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
  address TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  loyalty_points INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customer_accounts_phone ON customer_accounts(phone);
CREATE INDEX idx_customer_accounts_email ON customer_accounts(email);
```

### 5.2. Cập nhật bảng `don_hang`

```sql
-- Thêm cột order_source
ALTER TABLE don_hang 
ADD COLUMN IF NOT EXISTS order_source TEXT DEFAULT 'POS' 
CHECK (order_source IN ('POS', 'ONLINE', 'PHONE'));

-- Thêm cột customer_account_id (nếu đặt từ customer portal)
ALTER TABLE don_hang 
ADD COLUMN IF NOT EXISTS customer_account_id INT REFERENCES customer_accounts(id);

-- Thêm cột delivery_address (cho takeaway online)
ALTER TABLE don_hang 
ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE don_hang 
ADD COLUMN IF NOT EXISTS delivery_phone TEXT;
ALTER TABLE don_hang 
ADD COLUMN IF NOT EXISTS delivery_time TIMESTAMPTZ;
```

### 5.3. Bảng `customer_cart` (Session-based hoặc User-based)

```sql
CREATE TABLE customer_cart (
  id SERIAL PRIMARY KEY,
  customer_account_id INT REFERENCES customer_accounts(id),
  session_id TEXT, -- Nếu chưa đăng nhập
  items JSONB NOT NULL, -- [{item_id, variant_id, quantity, options, toppings}]
  promo_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

CREATE INDEX idx_customer_cart_account ON customer_cart(customer_account_id);
CREATE INDEX idx_customer_cart_session ON customer_cart(session_id);
```

---

## 🎨 6. UI/UX DESIGN

### 6.1. Design System

**Colors:**
- Primary: #c9975b (nâu) - đồng bộ với theme hiện tại
- Secondary: #d4a574 (cam nhạt)
- Accent: #8B4513 (nâu đậm)
- Background: #F5F5F5 (xám nhạt)
- Text: #333333 (đen nhạt)

**Typography:**
- Heading: Inter, sans-serif
- Body: Roboto, sans-serif
- Vietnamese: Đảm bảo font hỗ trợ tiếng Việt

**Components:**
- Buttons: Gradient nâu, hover invert
- Cards: Shadow nhẹ, border radius 12px
- Inputs: Border 1px, focus ring
- Icons: Lucide React (đồng bộ với hệ thống)

### 6.2. Responsive Design

- **Mobile First:** Tối ưu cho mobile (320px+)
- **Tablet:** 768px+
- **Desktop:** 1024px+
- **Breakpoints:** Tailwind default

### 6.3. Performance

- **Lazy loading:** Images, components
- **Code splitting:** Route-based
- **Caching:** API responses, menu data
- **Optimization:** Image compression, CDN (nếu có)

---

## 📱 7. TÍNH NĂNG NÂNG CAO (Tùy chọn)

### 7.1. Loyalty Program
- Tích điểm khi mua hàng
- Đổi điểm lấy voucher
- Xem lịch sử tích điểm

### 7.2. Real-time Order Tracking
- SSE cho trạng thái đơn hàng
- Notification khi đơn sẵn sàng

### 7.3. Social Login
- Đăng nhập bằng Google/Facebook
- OAuth integration

### 7.4. Reviews & Ratings
- Đánh giá sản phẩm
- Xem đánh giá của khách khác

### 7.5. Wishlist
- Lưu sản phẩm yêu thích
- Thông báo khi có khuyến mãi

---

## ✅ 8. CHECKLIST PHÁT TRIỂN

### Phase 1: Foundation (1-2 tuần)
- [ ] Database schema (customer_accounts, customer_cart)
- [ ] Backend: Customer auth APIs
- [ ] Backend: Public menu APIs
- [ ] Frontend: CustomerLayout, Header, Footer
- [ ] Frontend: HomePage
- [ ] Frontend: MenuPage, ProductDetail

### Phase 2: Ordering (1-2 tuần)
- [ ] Backend: Cart APIs
- [ ] Backend: Order APIs
- [ ] Frontend: CartPage/CartDrawer
- [ ] Frontend: CheckoutPage
- [ ] Integration: PayOS cho customer

### Phase 3: Reservations & History (1 tuần)
- [ ] Backend: Customer reservation APIs
- [ ] Frontend: ReservationPage
- [ ] Frontend: OrderHistory
- [ ] Frontend: Order detail modal

### Phase 4: Polish & Testing (1 tuần)
- [ ] Responsive design
- [ ] Error handling
- [ ] Loading states
- [ ] SEO optimization
- [ ] Performance testing
- [ ] Security audit

---

## 🔗 9. TÍCH HỢP VỚI HỆ THỐNG HIỆN TẠI

### 9.1. Tái sử dụng
- **Menu data:** Dùng lại `mon`, `loai_mon`, `bien_the_mon`
- **Promotions:** Dùng lại `khuyen_mai`
- **Orders:** Dùng lại `don_hang` (thêm `order_source = 'ONLINE'`)
- **Reservations:** Dùng lại `dat_ban`, `khach_hang`
- **Payments:** Dùng lại PayOS integration

### 9.2. Khác biệt
- **Authentication:** Tách biệt với staff auth
- **Permissions:** Không cần role-based (chỉ cần customer account)
- **UI/UX:** Design khác hoàn toàn (customer-friendly vs admin panel)

---

## 📚 10. TÀI LIỆU THAM KHẢO

- [Phúc Long Coffee & Tea](https://phuclong.com.vn/)
- Existing codebase:
  - `frontend/src/pages/POS.jsx` - Reference cho menu display
  - `frontend/src/components/MenuPanel.jsx` - Reference cho product cards
  - `backend/src/routes/pos.js` - Reference cho order APIs
  - `backend/src/routes/reservations.js` - Reference cho reservation APIs

---

**Ghi chú:**
- Customer Portal là một module độc lập, có thể deploy riêng hoặc cùng domain
- Có thể dùng subdomain: `customer.yourdomain.com` hoặc `/customer/*` routes
- Cần SEO-friendly cho Google indexing
- Cần mobile-first design (phần lớn khách dùng mobile)

