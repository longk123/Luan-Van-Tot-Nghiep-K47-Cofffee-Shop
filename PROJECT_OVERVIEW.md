# CoffeePOS - Hệ thống quản lý quán cà phê - Tổng quan chi tiết

## 📋 Mục lục
1. [Tổng quan dự án](#tổng-quan-dự-án)
2. [Kiến trúc hệ thống](#kiến-trúc-hệ-thống)
3. [Database Schema](#database-schema)
4. [Backend APIs](#backend-apis)
5. [Frontend Components](#frontend-components)
6. [Business Logic](#business-logic)

---

## 1. Tổng quan dự án

### Mục đích
Hệ thống Point of Sale (POS) cho quán cà phê với đầy đủ tính năng quản lý bàn, đơn hàng, thực đơn, và ca làm việc.

### Tech Stack
**Backend:** Node.js + Express.js + PostgreSQL + JWT + SSE
**Frontend:** React 18 + Vite + Tailwind CSS + React Router

### Tính năng chính
- ✅ Quản lý xác thực (JWT, roles: admin/manager/cashier/kitchen)
- ✅ Quản lý khu vực và bàn
- ✅ Quản lý thực đơn với biến thể (size S/M/L)
- ✅ Quản lý ca làm việc (mở ca/đóng ca)
- ✅ POS: Tạo đơn tại bàn hoặc mang đi
- ✅ Thêm/sửa/xóa món trong đơn
- ✅ Đổi bàn
- ✅ Thanh toán với nhiều phương thức
- ✅ Real-time updates qua Server-Sent Events
- ✅ Dashboard với 2 chế độ (Dashboard/POS)

---

## 2. Kiến trúc hệ thống

### Backend (MVC Pattern)
```

