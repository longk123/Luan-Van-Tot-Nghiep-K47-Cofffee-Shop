# CoffeePOS Backend - MVC Architecture

## 📁 Cấu trúc thư mục mới

```
backend/src/
├── controllers/           # Xử lý HTTP requests/responses
│   ├── staff/            # Controllers cho nhân viên
│   │   └── authController.js
│   └── customer/         # Controllers cho khách hàng
├── services/             # Business logic
│   ├── staff/            # Services cho nhân viên
│   │   └── authService.js
│   └── customer/         # Services cho khách hàng
├── repositories/         # Data access layer
│   └── userRepository.js
├── validators/           # Validation schemas
│   └── auth.js
├── middleware/           # Middleware functions
│   ├── auth.js          # Authentication middleware
│   ├── error.js         # Error handling
│   ├── rateLimit.js     # Rate limiting
│   └── requestId.js     # Request ID tracking
├── routes/              # Route definitions
│   └── staff/
│       └── auth.js
└── db.js               # Database connection
```

## 🔧 Các tính năng mới

### 1. **Error Handling** (`middleware/error.js`)
- Xử lý lỗi tập trung
- Phân loại lỗi (validation, JWT, database)
- Logging chi tiết
- Async error wrapper

### 2. **Rate Limiting** (`middleware/rateLimit.js`)
- Giới hạn 5 requests/15 phút cho auth routes
- Giới hạn 100 requests/15 phút cho general API
- Skip successful requests để chỉ đếm failed attempts

### 3. **Request ID** (`middleware/requestId.js`)
- Gắn unique ID cho mỗi request
- Tracking requests qua logs
- Debug dễ dàng hơn

### 4. **Validation** (`validators/auth.js`)
- Joi schemas cho login/register
- Validation middleware
- Error messages tiếng Việt

### 5. **Repository Pattern** (`repositories/userRepository.js`)
- Gom tất cả database queries
- Tách biệt data access khỏi business logic
- Dễ test và maintain

### 6. **Service Layer** (`services/staff/authService.js`)
- Business logic tách biệt
- JWT token management
- Password hashing
- User management

### 7. **Controller Layer** (`controllers/staff/authController.js`)
- Chỉ xử lý HTTP requests/responses
- Gọi services để xử lý business logic
- Async error handling

## 🚀 Cách sử dụng

### 1. **Chạy backend:**
```bash
cd backend
npm start
```

### 2. **API Endpoints:**
- `POST /api/v1/auth/staff/login` - Đăng nhập
- `POST /api/v1/auth/staff/register` - Đăng ký
- `GET /api/v1/auth/staff/me` - Lấy thông tin user
- `GET /api/v1/auth/staff/verify` - Verify token

### 3. **Request Headers:**
- `X-Request-Id` - Tự động được gắn
- `Authorization: Bearer <token>` - Cho protected routes

## 🔒 Security Features

- **Rate Limiting**: Chống brute force attacks
- **Input Validation**: Joi schemas validate tất cả inputs
- **JWT Tokens**: Secure authentication
- **Password Hashing**: bcrypt với salt rounds
- **Error Handling**: Không leak sensitive information

## 📊 Logging

Mỗi request sẽ có format:
```
[request-id] METHOD /path - IP
```

## 🧪 Testing

Có thể test với:
```bash
# Test login
curl -X POST http://localhost:5000/api/v1/auth/staff/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Test với request ID
curl -X GET http://localhost:5000/api/v1/auth/staff/me \
  -H "Authorization: Bearer <token>"
```

## 🔄 Migration từ code cũ

Code cũ trong `routes/staff/auth.js` đã được refactor thành:
- **Routes** → Chỉ định nghĩa endpoints và middleware
- **Business Logic** → Chuyển vào `services/`
- **Database Queries** → Chuyển vào `repositories/`
- **Validation** → Chuyển vào `validators/`
- **Error Handling** → Centralized trong `middleware/error.js`
