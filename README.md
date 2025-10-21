# CoffeePOS - Hệ thống quản lý quán cà phê

## 🚀 Hướng dẫn Setup

### 1. Cài đặt Dependencies

```bash
# Backend
cd backend
npm install

# Frontend  
cd frontend
npm install
```

### 2. Setup Database (PostgreSQL)

1. **Cài đặt PostgreSQL** (nếu chưa có)
2. **Tạo database:**
   ```sql
   CREATE DATABASE coffee_shop;
   ```
3. **Chạy script setup:**
   ```bash
   cd backend
   node setup-db.js
   ```

### 3. Cấu hình Environment Variables

Tạo file `.env` trong thư mục `backend/`:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=coffee_shop
DB_USER=postgres
DB_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES=7d

# Server Configuration
PORT=5000
NODE_ENV=development
```

### 4. Chạy ứng dụng

**Terminal 1 - Backend:**
```bash
cd backend
npm start
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 5. Truy cập ứng dụng

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000

## 🔑 Thông tin đăng nhập mẫu

| Vai trò | Username | Password | Quyền |
|---------|----------|----------|-------|
| Admin | admin | admin123 | Tất cả quyền |
| Thu ngân | cashier | cashier123 | Chỉ thu ngân |

## 📋 API Endpoints

### Authentication
- `POST /api/v1/auth/staff/login` - Đăng nhập
- `POST /api/v1/auth/staff/register` - Đăng ký
- `GET /api/v1/auth/staff/me` - Lấy thông tin user hiện tại

### Health Check
- `GET /api/v1/health` - Kiểm tra trạng thái server
- `GET /api/v1/test-db` - Kiểm tra kết nối database

## 🛠️ Công nghệ sử dụng

### Frontend
- React 18
- Vite
- Tailwind CSS
- React Router

### Backend
- Node.js
- Express.js
- PostgreSQL
- JWT Authentication
- bcrypt (password hashing)

## 📁 Cấu trúc project

```
my-thesis/
├── frontend/          # React frontend
│   ├── src/
│   │   ├── pages/
│   │   │   └── Login.jsx
│   │   ├── auth.js
│   │   └── ...
│   └── package.json
├── backend/           # Node.js backend
│   ├── src/
│   │   ├── routes/
│   │   │   └── staff/
│   │   │       └── auth.js
│   │   ├── middleware/
│   │   ├── db.js
│   │   └── ...
│   ├── setup-db.js   # Script setup database
│   └── package.json
└── README.md
```

## 🔧 Troubleshooting

### Lỗi kết nối database
- Kiểm tra PostgreSQL đang chạy
- Kiểm tra thông tin kết nối trong `.env`
- Chạy lại `node setup-db.js`

### Lỗi CORS
- Backend đã cấu hình CORS cho tất cả origins
- Frontend proxy đã được setup trong `vite.config.js`

### Lỗi JWT
- Kiểm tra `JWT_SECRET` trong `.env`
- Đảm bảo token được gửi đúng format: `Bearer <token>`
