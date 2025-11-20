# Debug Customer Portal - Trang Trắng

## Các bước debug:

1. **Mở Console (F12)** và kiểm tra:
   - Có lỗi JavaScript nào không?
   - Có lỗi network nào không?
   - Có lỗi import/export nào không?

2. **Kiểm tra Network tab:**
   - API calls có thành công không?
   - Có 404 hoặc 500 errors không?

3. **Kiểm tra React DevTools:**
   - Component tree có render không?
   - Có component nào bị crash không?

4. **Thử các URL:**
   - `/customer` - HomePage
   - `/customer/login` - Login page (không dùng layout)
   - `/customer/menu` - Menu page

5. **Tạm thời disable ToastProvider:**
   - Comment ToastProvider trong main.jsx
   - Xem có render được không

6. **Kiểm tra ErrorBoundary:**
   - Nếu có lỗi, ErrorBoundary sẽ hiển thị thông báo
   - Nếu vẫn trắng, có thể lỗi xảy ra trước khi ErrorBoundary được mount

## Các lỗi thường gặp:

1. **Import error:** Component không được export đúng
2. **API error:** Backend không chạy hoặc CORS issue
3. **localStorage error:** Browser chặn localStorage
4. **React Router error:** Route không match
5. **CSS error:** Tailwind không compile đúng

## Quick Fix:

Nếu vẫn không được, thử:
1. Clear browser cache
2. Restart dev server
3. Xóa node_modules và reinstall
4. Kiểm tra backend có chạy không

