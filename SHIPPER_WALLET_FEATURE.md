# Tính năng Ví Giao Hàng (Shipper Wallet)

## Tổng quan
Tính năng **Shipper Wallet** (Ví Giao Hàng) giúp quản lý tiền thu hộ (COD) từ các đơn giao hàng. Waiter/Shipper sẽ thu tiền mặt từ khách, và hệ thống sẽ tự động ghi nhận vào ví. Cuối ca, thu ngân xác nhận nhận tiền từ shipper.

## Workflow

### 1. Tạo đơn giao hàng
- Cashier/Waiter tạo đơn với `order_type = DELIVERY`
- Chọn phương thức thanh toán COD

### 2. Waiter nhận đơn
- Waiter nhấn "Nhận đơn giao hàng" trên Dashboard
- Đơn được gán `shipper_id = waiter.user_id`
- Trạng thái: `delivery_status = DELIVERING`

### 3. Giao hàng thành công
- Waiter cập nhật trạng thái thành `DELIVERED`
- **Hệ thống TỰ ĐỘNG ghi nhận tiền vào ví** (nếu thanh toán COD)
- Ví cập nhật số dư hiện tại

### 4. Đối soát cuối ca
- Thu ngân mở "Tiền thu hộ" để xem danh sách shipper có số dư
- Shipper nộp tiền mặt cho thu ngân
- Thu ngân nhấn "Xác nhận nộp" để ghi nhận

## Database Schema

### Bảng `shipper_wallet`
```sql
- id: SERIAL PRIMARY KEY
- user_id: INTEGER FK → users.id (UNIQUE)
- current_balance: DECIMAL(12,2) DEFAULT 0
- total_collected: DECIMAL(12,2) DEFAULT 0  -- Tổng đã thu
- total_settled: DECIMAL(12,2) DEFAULT 0    -- Tổng đã nộp
- last_settlement_at: TIMESTAMP
- collection_limit: DECIMAL(12,2) DEFAULT 10000000
- status: VARCHAR DEFAULT 'ACTIVE'
```

### Bảng `wallet_transactions`
```sql
- id: SERIAL PRIMARY KEY
- wallet_id: INTEGER FK → shipper_wallet.id
- type: VARCHAR -- 'COLLECTION' | 'SETTLEMENT' | 'ADJUSTMENT'
- amount: DECIMAL(12,2)
- balance_after: DECIMAL(12,2)
- order_id: INTEGER FK → don_hang.id
- shift_id: INTEGER FK → ca_lam_viec.id
- processed_by: INTEGER FK → users.id
- note: TEXT
- created_at: TIMESTAMP
```

### View `v_shipper_wallet_summary`
```sql
Tổng hợp thông tin ví với tên shipper:
- wallet_id, user_id, username, display_name
- current_balance, total_collected, total_settled
- pending_count (số giao dịch chưa nộp)
- last_collection_at, last_settlement_at
```

## API Endpoints

### Cho Waiter (Shipper)
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/v1/wallet/me` | Lấy thông tin ví của tôi |
| GET | `/api/v1/wallet/transactions` | Lịch sử giao dịch của tôi |
| GET | `/api/v1/wallet/check-limit` | Kiểm tra hạn mức ví |
| GET | `/api/v1/wallet/unrecorded` | Đơn chưa ghi nhận vào ví |
| POST | `/api/v1/wallet/sync` | Đồng bộ đơn chưa ghi nhận |

### Cho Cashier/Manager
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/v1/wallet/all` | Danh sách tất cả ví |
| GET | `/api/v1/wallet/pending-summary` | Tổng quan tiền chưa nộp |
| GET | `/api/v1/wallet/user/:userId` | Xem ví của một user |
| GET | `/api/v1/wallet/user/:userId/transactions` | Lịch sử của user |
| POST | `/api/v1/wallet/settle` | Xác nhận nộp tiền (một phần) |
| POST | `/api/v1/wallet/settle-all` | Nộp tất cả tiền |
| GET | `/api/v1/wallet/shift-stats/:shiftId` | Thống kê theo ca |

### Cho Admin
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/v1/wallet/adjust` | Điều chỉnh số dư thủ công |
| PUT | `/api/v1/wallet/user/:userId/limit` | Cập nhật hạn mức |

## Frontend Components

### 1. ShipperWalletPanel (Waiter)
- Hiển thị số dư ví hiện tại
- Danh sách giao dịch gần đây
- Thống kê: số đơn, tổng thu, tổng nộp
- Nút "Đồng bộ" để sync đơn chưa ghi nhận

### 2. WalletSettlementPanel (Cashier/Manager)
- Danh sách shipper có số dư > 0
- Chọn shipper để xem chi tiết
- Form nhập số tiền nộp
- Nút "Nộp tất cả" hoặc "Nộp một phần"

### 3. Dashboard Integration
- Waiter: Nút "Ví giao hàng" hiển thị số dư
- Cashier: Nút "Tiền thu hộ" để mở panel đối soát

## Cách sử dụng

### Waiter
1. Đăng nhập với role `waiter`
2. Nhận đơn giao hàng từ tab "Mang đi/Giao hàng"
3. Sau khi giao thành công, cập nhật trạng thái "Đã giao"
4. Tiền tự động được ghi vào ví
5. Xem số dư bằng nút "Ví giao hàng"
6. Cuối ca, nộp tiền cho thu ngân

### Cashier
1. Đăng nhập với role `cashier`
2. Nhấn nút "Tiền thu hộ"
3. Xem danh sách shipper có số dư
4. Chọn shipper cần đối soát
5. Nhập số tiền và nhấn "Xác nhận nộp"
6. Ghi nhận tiền mặt vào két

## Bảo mật
- Chỉ waiter có role `waiter` mới có ví
- Chỉ `cashier`, `manager`, `admin` mới xác nhận nộp tiền
- Chỉ `admin` mới điều chỉnh số dư thủ công
- Mỗi giao dịch đều ghi nhận `processed_by`

## Files liên quan

### Backend
- `migrate-add-shipper-wallet.cjs` - Migration script
- `src/repositories/walletRepository.js` - Database operations
- `src/services/walletService.js` - Business logic
- `src/controllers/walletController.js` - API handlers
- `src/routes/wallet.js` - Route definitions
- `src/services/posService.js` - Auto-record on DELIVERED

### Frontend
- `src/api.js` - Wallet API methods
- `src/components/ShipperWalletPanel.jsx` - Waiter view
- `src/components/WalletSettlementPanel.jsx` - Cashier view
- `src/pages/Dashboard.jsx` - Integration

## Changelog
- **v1.3.0** (2024): Thêm tính năng Shipper Wallet
