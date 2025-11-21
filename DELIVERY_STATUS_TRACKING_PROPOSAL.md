# Đề xuất: Truy vết trạng thái đơn giao hàng

## 📊 Trạng thái đề xuất

### 1. **PENDING** (Chờ xử lý)
- Đơn vừa được tạo, chưa được xác nhận
- Thời gian: `opened_at`

### 2. **CONFIRMED** (Đã xác nhận)
- Thu ngân đã xác nhận đơn, bắt đầu chuẩn bị
- Thời gian: `confirmed_at`

### 3. **PREPARING** (Đang chuẩn bị)
- Bếp/pha chế đang làm món
- Thời gian: `preparing_at` (khi món đầu tiên bắt đầu làm)

### 4. **READY** (Sẵn sàng giao)
- Tất cả món đã hoàn tất, đóng gói xong
- Thời gian: `ready_at`

### 5. **OUT_FOR_DELIVERY** (Đang giao hàng)
- Shipper đã nhận hàng, đang trên đường giao
- Thời gian: `out_for_delivery_at`

### 6. **DELIVERED** (Đã giao hàng)
- Đã giao đến khách hàng
- Thời gian: `delivered_at` (actual_delivered_at)

### 7. **FAILED** (Giao hàng thất bại)
- Không giao được (khách không nhận, địa chỉ sai, v.v.)
- Thời gian: `failed_at`

## 🗄️ Cấu trúc Database

### Option 1: Thêm cột vào `don_hang_delivery_info`
```sql
ALTER TABLE don_hang_delivery_info
ADD COLUMN delivery_status VARCHAR(20) DEFAULT 'PENDING',
ADD COLUMN confirmed_at TIMESTAMPTZ,
ADD COLUMN preparing_at TIMESTAMPTZ,
ADD COLUMN ready_at TIMESTAMPTZ,
ADD COLUMN out_for_delivery_at TIMESTAMPTZ,
ADD COLUMN failed_at TIMESTAMPTZ,
ADD COLUMN failure_reason TEXT;

-- Constraint
ALTER TABLE don_hang_delivery_info
ADD CONSTRAINT delivery_status_check 
CHECK (delivery_status IN ('PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED'));
```

### Option 2: Bảng riêng `delivery_status_history` (Khuyến nghị)
```sql
CREATE TABLE delivery_status_history (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES don_hang(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  changed_by INT REFERENCES users(user_id),
  notes TEXT,
  metadata JSONB -- Lưu thông tin bổ sung (shipper_id, location, etc.)
);

CREATE INDEX idx_delivery_status_order ON delivery_status_history(order_id, changed_at DESC);
```

## 🎯 Workflow đề xuất

```
1. Khách đặt hàng → PENDING
2. Thu ngân xác nhận → CONFIRMED
3. Bếp bắt đầu làm → PREPARING
4. Tất cả món xong → READY
5. Shipper nhận hàng → OUT_FOR_DELIVERY
6. Giao thành công → DELIVERED
   hoặc
   Giao thất bại → FAILED
```

## 📱 UI/UX đề xuất

### Customer Portal:
- Progress bar hiển thị các bước
- Thời gian ước tính cho từng bước
- Thông báo real-time khi trạng thái thay đổi

### POS/Manager:
- Danh sách đơn theo trạng thái
- Filter và sort theo trạng thái
- Timeline view cho từng đơn

## ⚡ Implementation Priority

### Phase 1 (Cơ bản):
- Thêm cột `delivery_status` vào `don_hang_delivery_info`
- API update status
- Hiển thị status trong POS và Customer Portal

### Phase 2 (Nâng cao):
- Bảng `delivery_status_history` để lưu lịch sử
- Timeline view
- Thông báo real-time (SSE/WebSocket)
- Phân tích thời gian từng bước

### Phase 3 (Tối ưu):
- Tự động chuyển trạng thái (PREPARING khi món đầu tiên bắt đầu)
- Thông báo SMS/Email
- Tích hợp tracking GPS (nếu có shipper app)

## 🤔 Câu hỏi cần quyết định

1. **Có cần shipper app riêng không?**
   - Nếu có: Cần thêm trạng thái "ASSIGNED" (đã phân công shipper)
   - Nếu không: Có thể bỏ qua "OUT_FOR_DELIVERY" hoặc dùng manual update

2. **Tự động hay thủ công?**
   - Tự động: PREPARING khi món đầu tiên bắt đầu, READY khi tất cả món xong
   - Thủ công: Thu ngân/Manager click để chuyển trạng thái

3. **Có cần lưu lịch sử chi tiết không?**
   - Nếu có: Dùng Option 2 (bảng riêng)
   - Nếu không: Dùng Option 1 (cột trong delivery_info)

## 💡 Khuyến nghị

**Bắt đầu với Phase 1:**
- Đơn giản, dễ implement
- Đáp ứng nhu cầu cơ bản
- Có thể nâng cấp lên Phase 2 sau

**Trạng thái tối thiểu:**
- PENDING → CONFIRMED → READY → DELIVERED
- (4 trạng thái cơ bản, đủ để khách hàng theo dõi)

