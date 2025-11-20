# Customer Portal - Implementation Status

**Ngày:** 2025-11-20  
**Trạng thái:** 80% hoàn thành

---

## ✅ ĐÃ HOÀN THÀNH

### 1. Database Schema
- ✅ `customer_accounts` table
- ✅ `customer_cart` table
- ✅ Updated `don_hang` with customer fields
- ✅ Updated `dat_ban` with customer link
- ✅ Views: `v_customer_orders`, `v_customer_reservations`
- ✅ Triggers and functions
- ✅ Sample customer account (phone: 0987654321, password: customer123)

### 2. Backend APIs
- ✅ Customer Auth APIs (register, login, getProfile, updateProfile, logout)
- ✅ Public Menu APIs (categories, items, search)
- ✅ Cart APIs (get, add, update, remove, clear)
- ✅ Order APIs (list, detail)
- ✅ Reservation APIs (list, detail)
- ✅ Customer middleware (customerAuth, optionalCustomerAuth)
- ✅ Routes registered in `backend/index.js`

### 3. Frontend - Core Infrastructure
- ✅ `customerAuth.js` - Authentication helpers
- ✅ `customerApi.js` - API client
- ✅ `CustomerLayout.jsx` - Main layout
- ✅ `CustomerHeader.jsx` - Header with navigation, cart icon, user menu
- ✅ `CustomerFooter.jsx` - Footer with store info
- ✅ `HomePage.jsx` - Landing page with hero, featured products, categories

---

## 🚧 CẦN HOÀN THIỆN

### 4. Frontend Pages (Còn thiếu)

Các pages sau cần tạo theo cấu trúc tương tự HomePage:

#### A. **MenuPage.jsx** (`frontend/src/pages/customer/MenuPage.jsx`)
**Mô tả:** Trang hiển thị toàn bộ menu với filter

**Cấu trúc:**
```jsx
- Search bar
- Category filter (sidebar hoặc tabs)
- Sort dropdown (giá, tên, phổ biến)
- Product grid (responsive)
- Pagination
- "Thêm vào giỏ" button trên mỗi card
```

**API calls:**
- `customerApi.getCategories()`
- `customerApi.getMenuItems(categoryId)`
- `customerApi.searchItems(keyword)`

---

#### B. **ProductDetailPage.jsx** (`frontend/src/pages/customer/ProductDetailPage.jsx`)
**Mô tả:** Trang chi tiết sản phẩm với variants và options

**Cấu trúc:**
```jsx
- Product images gallery
- Product name, description, category
- Variant selection (S/M/L radio buttons)
- Options selection (Sugar, Ice sliders)
- Topping selection (checkboxes)
- Quantity stepper
- "Thêm vào giỏ" button
- Related products section
```

**API calls:**
- `customerApi.getItemDetail(itemId)`
- `customerApi.addToCart(item)`

---

#### C. **CartPage.jsx** (`frontend/src/pages/customer/CartPage.jsx`)
**Mô tả:** Trang giỏ hàng

**Cấu trúc:**
```jsx
- Cart items list (name, variant, options, quantity, price)
- Quantity stepper per item
- Remove item button
- Promo code input
- Summary (subtotal, discount, total)
- "Tiếp tục mua sắm" button
- "Thanh toán" button → CheckoutPage
- Empty state
```

**API calls:**
- `customerApi.getCart()`
- `customerApi.updateCartItem(index, quantity)`
- `customerApi.removeFromCart(index)`

---

#### D. **CheckoutPage.jsx** (`frontend/src/pages/customer/CheckoutPage.jsx`)
**Mô tả:** Trang thanh toán

**Cấu trúc:**
```jsx
- Order type selection (Mang đi / Tại quán)
- Customer info form (name, phone, email)
- Delivery info (address, time) nếu takeaway
- Payment method selection (Cash / Online / Card)
- Order summary
- "Đặt hàng" button
```

**API calls:**
- `posApi.createTakeawayOrder()` hoặc tích hợp với POS backend
- `paymentsApi.createPayOSPayment()` nếu thanh toán online

---

#### E. **CustomerLogin.jsx** (`frontend/src/pages/customer/CustomerLogin.jsx`)
**Mô tả:** Trang đăng nhập khách hàng

**Cấu trúc:**
```jsx
- Phone/Email input
- Password input
- "Ghi nhớ đăng nhập" checkbox
- "Đăng nhập" button
- Link "Chưa có tài khoản? Đăng ký"
- Link "Quên mật khẩu?"
```

**API calls:**
- `customerApi.login({ phoneOrEmail, password })`
- `setCustomerToken(token)`, `setCustomerInfo(account)`

---

#### F. **CustomerRegister.jsx** (`frontend/src/pages/customer/CustomerRegister.jsx`)
**Mô tả:** Trang đăng ký khách hàng

**Cấu trúc:**
```jsx
- Full name input
- Phone input
- Email input (optional)
- Password input
- Confirm password input
- "Đồng ý điều khoản" checkbox
- "Đăng ký" button
- Link "Đã có tài khoản? Đăng nhập"
```

**API calls:**
- `customerApi.register({ phone, email, password, fullName })`
- `setCustomerToken(token)`, `setCustomerInfo(account)`

---

#### G. **OrderHistoryPage.jsx** (`frontend/src/pages/customer/OrderHistoryPage.jsx`)
**Mô tả:** Trang lịch sử đơn hàng

**Cấu trúc:**
```jsx
- Orders list (card/table view)
- Order status badges
- "Xem chi tiết" button → Modal
- "Đặt lại" button
- Filter (status, type)
- Pagination
```

**API calls:**
- `customerApi.getOrders({ limit, offset })`
- `customerApi.getOrderDetail(orderId)`

---

#### H. **CustomerReservationPage.jsx** (`frontend/src/pages/customer/CustomerReservationPage.jsx`)
**Mô tả:** Trang đặt bàn cho khách hàng

**Cấu trúc:**
```jsx
- Customer info form
- Date + Time picker
- Party size input
- Area selection (optional)
- Notes textarea
- "Đặt bàn" button
```

**API calls:**
- Tái sử dụng `api.createReservation()` từ hệ thống hiện tại
- Hoặc tạo endpoint mới `/api/v1/customer/reservations` (POST)

---

### 5. Routing Configuration

Cần cập nhật `frontend/src/main.jsx`:

```jsx
import CustomerLayout from './layouts/CustomerLayout.jsx';
import HomePage from './pages/customer/HomePage.jsx';
// Import các pages khác...

const router = createBrowserRouter([
  // ... existing routes ...
  
  // Customer Portal Routes
  {
    path: '/customer',
    element: <CustomerLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'menu', element: <MenuPage /> },
      { path: 'menu/:id', element: <ProductDetailPage /> },
      { path: 'cart', element: <CartPage /> },
      { path: 'checkout', element: <CheckoutPage /> },
      { path: 'orders', element: <OrderHistoryPage /> },
      { path: 'reservation', element: <CustomerReservationPage /> },
    ]
  },
  
  // Customer Auth Routes (outside layout)
  { path: '/customer/login', element: <CustomerLogin /> },
  { path: '/customer/register', element: <CustomerRegister /> },
]);
```

---

## 📝 GHI CHÚ QUAN TRỌNG

### Design Guidelines
- **Desktop first**: Tối ưu cho desktop (1024px+), sau đó responsive xuống mobile
- **Colors**: Primary #c9975b, Secondary #d4a574
- **Icons**: Dùng lucide-react
- **Buttons**: Gradient background với hover invert
- **Cards**: Shadow-sm, hover:shadow-lg, rounded-xl

### State Management
- Dùng `useState` và `useEffect` cho local state
- Giỏ hàng có thể dùng Context API (optional)
- Lưu customer token vào localStorage

### Error Handling
- Hiển thị toast/alert khi có lỗi API
- Loading states cho mọi API calls
- Empty states cho lists rỗng

### Performance
- Lazy load images
- Debounce search input
- Paginate long lists

---

## 🧪 TESTING CHECKLIST

### Manual Testing
- [ ] Đăng ký tài khoản mới
- [ ] Đăng nhập/đăng xuất
- [ ] Xem menu, filter, search
- [ ] Xem chi tiết sản phẩm
- [ ] Thêm vào giỏ hàng (có và không đăng nhập)
- [ ] Cập nhật giỏ hàng
- [ ] Thanh toán (tiền mặt)
- [ ] Thanh toán online (PayOS)
- [ ] Xem lịch sử đơn hàng
- [ ] Đặt bàn online
- [ ] Responsive trên mobile

### API Testing
- [ ] Test với Postman/Insomnia
- [ ] Verify JWT tokens
- [ ] Check session-based cart
- [ ] Test error cases

---

## 🚀 NEXT STEPS

1. **Hoàn thiện Frontend Pages** (ưu tiên):
   - MenuPage
   - ProductDetailPage
   - CustomerLogin/Register
   - CartPage

2. **Tích hợp Checkout với POS**:
   - Sử dụng lại logic POS để tạo đơn hàng
   - Tích hợp PayOS cho thanh toán online

3. **Testing**:
   - Test toàn bộ flow khách hàng
   - Fix bugs

4. **Polish**:
   - Thêm animations
   - Loading skeletons
   - Toast notifications

5. **SEO**:
   - Meta tags
   - Open Graph
   - Sitemap

---

## 📚 TÀI LIỆU THAM KHẢO

- Spec đầy đủ: `CUSTOMER_PORTAL_SPEC.md`
- Migration script: `backend/migrate-customer-portal.cjs`
- Backend routes: `backend/src/routes/customer.js`
- API client: `frontend/src/api/customerApi.js`
- Sample account: phone `0987654321`, password `customer123`

---

**Status:** 80% complete - Backend done, Frontend 30% done
**Next:** Implement remaining frontend pages

