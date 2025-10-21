# 📅 Hệ Thống Đặt Bàn (Reservation System)

## 🎯 **Tổng Quan**

Hệ thống đặt bàn tích hợp hoàn chỉnh cho Coffee Shop POS, hỗ trợ:
- ✅ Đặt bàn trước (advance booking)
- ✅ Chống trùng lịch tự động
- ✅ Đặt nhiều bàn cho 1 nhóm lớn
- ✅ Check-in tự động tạo order
- ✅ Quản lý đặt cọc
- ✅ Tracking khách hàng

---

## 📊 **Database Schema**

### **1. Bảng `khach_hang` (Customers)**
```sql
id              SERIAL PRIMARY KEY
ten             TEXT NOT NULL
so_dien_thoai   TEXT UNIQUE
email           TEXT
ghi_chu         TEXT
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

**Mục đích:** Lưu thông tin khách hàng để tái sử dụng (khách quen)

---

### **2. Bảng `dat_ban` (Reservations Header)**
```sql
id                SERIAL PRIMARY KEY
khach_hang_id     INT → khach_hang(id)
ten_khach         TEXT (fallback nếu không tạo khách)
so_dien_thoai     TEXT
so_nguoi          INT CHECK (> 0)
khu_vuc_id        INT → areas(id)
start_at          TIMESTAMPTZ NOT NULL
end_at            TIMESTAMPTZ NOT NULL CHECK (> start_at)
trang_thai        TEXT NOT NULL DEFAULT 'PENDING'
nguon             TEXT DEFAULT 'PHONE'
ghi_chu           TEXT
dat_coc           INT DEFAULT 0
dat_coc_trang_thai TEXT DEFAULT 'NONE'
don_hang_id       INT → don_hang(id)
created_by        INT → users(user_id)
created_at        TIMESTAMPTZ
updated_at        TIMESTAMPTZ
```

**Trạng thái:**
- `PENDING` - Chờ xác nhận
- `CONFIRMED` - Đã xác nhận
- `SEATED` - Đã check-in
- `COMPLETED` - Hoàn thành
- `CANCELLED` - Đã hủy
- `NO_SHOW` - Khách không đến

**Trạng thái đặt cọc:**
- `NONE` - Không đặt cọc
- `HELD` - Đang giữ
- `PAID` - Đã thanh toán
- `REFUNDED` - Đã hoàn
- `FORFEIT` - Tịch thu

---

### **3. Bảng `dat_ban_ban` (Reservation-Table Links)**
```sql
dat_ban_id  INT → dat_ban(id) ON DELETE CASCADE
ban_id      INT → ban(id)
start_at    TIMESTAMPTZ
end_at      TIMESTAMPTZ
trang_thai  TEXT
PRIMARY KEY (dat_ban_id, ban_id)
```

**EXCLUSION CONSTRAINT:**
```sql
EXCLUDE USING gist (
  ban_id WITH =,
  tstzrange(start_at, end_at) WITH &&
)
WHERE (trang_thai IN ('PENDING','CONFIRMED','SEATED'))
```

**Ý nghĩa:** 
- Không cho 2 đặt bàn trùng thời gian trên CÙNG 1 bàn
- Tự động prevent double booking ở tầng database
- 1 đặt chỗ có thể chọn nhiều bàn

---

## 🔧 **Backend API**

### **Endpoints (12 APIs):**

#### **1. Tạo đặt bàn**
```http
POST /api/v1/reservations
Content-Type: application/json

{
  "ten_khach": "Nguyễn Văn A",
  "so_dien_thoai": "0901234567",
  "so_nguoi": 4,
  "khu_vuc_id": 1,
  "start_at": "2025-10-22T18:00:00+07:00",
  "end_at": "2025-10-22T19:30:00+07:00",
  "ghi_chu": "Gần cửa sổ",
  "dat_coc": 100000,
  "nguon": "PHONE",
  "table_ids": [1, 2]
}

Response: { success: true, data: { id: 123, ... } }
```

#### **2. Lấy danh sách theo ngày**
```http
GET /api/v1/reservations?date=2025-10-22&status=CONFIRMED

Response: { success: true, data: [...] }
```

#### **3. Chi tiết 1 đặt bàn**
```http
GET /api/v1/reservations/:id

Response: { 
  success: true, 
  data: { 
    id, khach, sdt, so_nguoi, start_at, end_at, trang_thai,
    tables: [{ ban_id, ten_ban, suc_chua }]
  } 
}
```

#### **4. Cập nhật thông tin**
```http
PATCH /api/v1/reservations/:id
{ "so_nguoi": 6, "ghi_chu": "Updated note" }
```

#### **5. Gán bàn**
```http
POST /api/v1/reservations/:id/tables
{ "table_ids": [3, 4] }
```

#### **6. Bỏ gán bàn**
```http
DELETE /api/v1/reservations/:id/tables/:tableId
```

#### **7. Xác nhận**
```http
POST /api/v1/reservations/:id/confirm
```

#### **8. Check-in (Tạo order)**
```http
POST /api/v1/reservations/:id/check-in
{ "primary_table_id": 1 }

Response: { 
  success: true, 
  data: { reservation_id: 123, don_hang_id: 456 } 
}
```

#### **9. Hủy đặt bàn**
```http
POST /api/v1/reservations/:id/cancel
{ "reason": "Khách báo hủy" }
```

#### **10. Đánh dấu No-show**
```http
POST /api/v1/reservations/:id/no-show
```

#### **11. Hoàn thành**
```http
POST /api/v1/reservations/:id/complete
```

#### **12. Tìm bàn trống**
```http
GET /api/v1/tables/availability?start=2025-10-22T18:00:00Z&end=2025-10-22T19:30:00Z&area=1

Response: { 
  success: true, 
  data: [
    { ban_id: 5, ten_ban: "Bàn 5", suc_chua: 4 }
  ] 
}
```

#### **13. Đặt bàn sắp tới của 1 bàn**
```http
GET /api/v1/tables/:id/upcoming-reservation?within=60

Response: { 
  success: true, 
  data: { id, khach, start_at, so_nguoi, ... } 
}
```

---

## 🎨 **Frontend UI**

### **Components:**

#### **1. ReservationPanel** (Form tạo đặt bàn)
```jsx
<ReservationPanel
  open={showReservationPanel}
  onClose={() => setShowReservationPanel(false)}
  onSuccess={() => loadTables()}
  onShowToast={setToast}
  areas={areas}
/>
```

**Features:**
- 📝 2 bước: Thông tin → Chọn bàn
- 📅 Date/Time picker
- 👥 Số người (stepper)
- 🏢 Chọn khu vực
- ⏱️ Chọn thời lượng (60-180 phút)
- 💰 Đặt cọc
- 📱 Nguồn (Phone/Walkin/Online)
- 📋 Ghi chú
- 🔍 Tìm bàn trống tự động
- ☑️ Multi-select bàn

---

#### **2. ReservationsList** (Danh sách đặt bàn)
```jsx
<ReservationsList
  open={showReservationsList}
  onClose={() => setShowReservationsList(false)}
  onCheckIn={(reservation) => handleCheckIn(reservation)}
  onShowToast={setToast}
/>
```

**Features:**
- 📅 Date picker
- 🔍 Filter theo trạng thái
- 📋 Timeline theo giờ
- ✅ Actions: Confirm, Check-in, Cancel, No-show
- 🔄 Auto-refresh
- 📱 Responsive design

---

#### **3. TableCard Enhancement** (Badge đặt bàn)
- 📅 Badge "ĐẶT" màu indigo khi có đặt bàn sắp tới
- 🕐 Tooltip hiển thị giờ đặt
- 📋 Card info với thời gian, số người, tên khách
- 🎨 Highlight màu indigo-50

---

## 🔄 **User Flow**

### **Flow 1: Đặt bàn qua điện thoại**

1. **Thu ngân nhận cuộc gọi**
   - Khách: "Em muốn đặt bàn 4 người lúc 6h tối nay"

2. **Click "📅 Đặt bàn"**
   - Mở ReservationPanel

3. **Nhập thông tin** (Bước 1)
   - Tên: "Nguyễn Văn A"
   - SĐT: "0901234567"
   - Ngày: 2025-10-22
   - Giờ: 18:00
   - Số người: 4
   - Thời lượng: 90 phút
   - Khu vực: "Tầng 1"
   - Click "Tìm bàn trống →"

4. **Chọn bàn** (Bước 2)
   - Hệ thống hiển thị các bàn trống
   - Chọn Bàn 5 (4 chỗ)
   - Click "✓ Xác nhận đặt bàn"

5. **Xác nhận thành công**
   - Toast: "Đặt bàn thành công!"
   - Đặt bàn #123 được tạo với trạng thái PENDING

---

### **Flow 2: Khách đến check-in**

1. **Xem danh sách đặt bàn**
   - Click "📋 Danh sách đặt bàn"
   - Chọn ngày hôm nay

2. **Tìm đặt bàn**
   - Thấy: "#123 • 18:00-19:30 • Nguyễn Văn A • Bàn 5"
   - Trạng thái: PENDING

3. **Xác nhận (nếu cần)**
   - Click nút "✓" → Chuyển sang CONFIRMED

4. **Check-in khi khách đến**
   - Click "Check-in"
   - Hệ thống tự động:
     - Tạo order mới cho Bàn 5
     - Chuyển trạng thái đặt bàn → SEATED
     - Mở OrderDrawer
   - Thu ngân bắt đầu nhận order như bình thường

---

### **Flow 3: Badge trên lưới bàn**

1. **Bàn trống** → Màu xanh lá
2. **Bàn có đặt sắp tới** → Badge "📅 ĐẶT" màu indigo
   - Hover: "Đặt lúc 18:00"
   - Click vào: Tạo đơn ngay (nếu trong thời gian)
3. **Bàn đang phục vụ** → Màu vàng/amber
4. **Bàn đã thanh toán** → Màu xanh dương

---

## 🛡️ **Bảo vệ chống trùng lịch**

### **Tầng Database (Cứng nhất):**
```sql
EXCLUDE USING gist (
  ban_id WITH =,
  tstzrange(start_at, end_at) WITH &&
)
```

**Nghĩa là:**
- Không thể đặt Bàn 5 vào 18:00-19:30 nếu đã có đặt 17:30-19:00
- PostgreSQL sẽ **tự động reject** với error `exclusion constraint violated`

### **Tầng Application:**
- Tìm bàn trống trước khi cho chọn
- Validate thời gian (không cho đặt quá khứ, min 15', max 4h)
- Check bàn có sẵn không

---

## 🎨 **UI Design**

### **Color Scheme:**

| Element | Color | Purpose |
|---------|-------|---------|
| Đặt bàn mới | Indigo (`bg-indigo-600`) | Primary action |
| Danh sách | Blue (`bg-blue-600`) | Secondary action |
| Badge đặt | Indigo-100 | Passive indicator |
| Xác nhận | Green | Positive action |
| Hủy | Red | Negative action |
| No-show | Orange | Warning |

### **Icons:**
- 📅 Đặt bàn
- 📋 Danh sách
- 🕐 Thời gian
- 👥 Số người
- 📞 Điện thoại
- 🏢 Khu vực

---

## 📱 **Tính năng nổi bật**

### **1. Smart Table Selection**
- Chỉ hiển thị bàn **thực sự trống** trong khung giờ
- Group theo khu vực
- Highlight bàn đã chọn
- Multi-select (Ctrl+Click)

### **2. Auto-fill Khách quen**
- Nhập SĐT → Tự động fill tên từ database
- Cập nhật thông tin nếu thay đổi

### **3. Validation Thông minh**
- Không cho đặt quá khứ
- Min: 15 phút, Max: 4 giờ
- Check số người vs sức chứa bàn
- Báo lỗi rõ ràng nếu trùng lịch

### **4. Check-in Seamless**
- 1 click Check-in → Tự động tạo order
- Mở ngay OrderDrawer
- Bắt đầu order như bình thường

### **5. Timeline View**
- Xem lịch theo ngày
- Sort theo giờ
- Filter: Pending/Confirmed/Seated

---

## 🚀 **Hướng dẫn sử dụng**

### **Chạy Migration (Lần đầu):**
```bash
cd backend
node migrate-add-reservations.cjs
```

**Output expected:**
```
✅ Migration hoàn tất!
📋 Đã tạo:
  - Bảng: khach_hang, dat_ban, dat_ban_ban
  - Function: fn_tables_available()
  - View: v_reservation_calendar
  - Trigger: sync thời gian & trạng thái
  - Constraint: chống trùng lịch đặt bàn
```

### **Khởi động Backend:**
```bash
cd backend
npm start
```

**Kiểm tra:**
```bash
curl http://localhost:5000/api/v1/health
# → { ok: true, ... }
```

### **Khởi động Frontend:**
```bash
cd frontend
npm run dev
```

**Truy cập:** http://localhost:5173

---

## 🧪 **Testing**

### **Test 1: Tạo đặt bàn**
```bash
curl -X POST http://localhost:5000/api/v1/reservations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "ten_khach": "Test User",
    "so_dien_thoai": "0901111111",
    "so_nguoi": 2,
    "start_at": "2025-10-22T18:00:00+07:00",
    "end_at": "2025-10-22T19:30:00+07:00",
    "table_ids": [1]
  }'
```

### **Test 2: Tìm bàn trống**
```bash
curl "http://localhost:5000/api/v1/tables/availability?start=2025-10-22T18:00:00Z&end=2025-10-22T19:30:00Z"
```

### **Test 3: Check-in**
```bash
curl -X POST http://localhost:5000/api/v1/reservations/123/check-in \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{ "primary_table_id": 1 }'
```

---

## ⚙️ **Cấu hình**

### **Thời gian mặc định:**
- **Duration**: 90 phút
- **Advance booking**: Tối thiểu +1 giờ từ hiện tại
- **Warning window**: 60 phút trước giờ đặt

### **Business Rules:**
- Minimum duration: 15 phút
- Maximum duration: 4 giờ
- Không cho đặt quá khứ
- Auto-update end_at khi đổi duration

---

## 📊 **Thống kê & Reports (Future)**

### **Có thể thêm:**
```sql
-- Top khách hàng đặt bàn nhiều nhất
SELECT k.ten, COUNT(*) AS lan_dat
FROM dat_ban r
JOIN khach_hang k ON k.id = r.khach_hang_id
WHERE r.trang_thai NOT IN ('CANCELLED', 'NO_SHOW')
GROUP BY k.id, k.ten
ORDER BY lan_dat DESC
LIMIT 10;

-- Tỷ lệ no-show
SELECT 
  COUNT(*) FILTER (WHERE trang_thai='NO_SHOW') * 100.0 / COUNT(*) AS no_show_rate
FROM dat_ban
WHERE created_at > now() - interval '30 days';

-- Khung giờ đặt bàn phổ biến
SELECT 
  EXTRACT(HOUR FROM start_at) AS gio,
  COUNT(*) AS so_lan
FROM dat_ban
WHERE trang_thai IN ('CONFIRMED', 'SEATED', 'COMPLETED')
GROUP BY gio
ORDER BY gio;
```

---

## 🐛 **Troubleshooting**

### **Lỗi: "exclusion constraint violated"**
**Nguyên nhân:** Đặt trùng lịch

**Giải pháp:**
- Kiểm tra lại thời gian
- Chọn bàn khác
- Dời giờ đặt

### **Lỗi: "Không tìm thấy bàn trống"**
**Nguyên nhân:** 
- Tất cả bàn đã được đặt
- Bàn đang có khách

**Giải pháp:**
- Đổi khung giờ
- Đổi khu vực
- Tăng số bàn trong hệ thống

### **Lỗi: "Không thể check-in"**
**Nguyên nhân:**
- Bàn đang có đơn khác
- Chưa đến giờ đặt

**Giải pháp:**
- Kiểm tra trạng thái bàn
- Đợi đến giờ đặt

---

## 📁 **File Structure**

```
my-thesis/
├── backend/
│   ├── migrate-add-reservations.cjs        # Migration SQL
│   ├── src/
│   │   ├── controllers/
│   │   │   └── reservationsController.js   # Controller
│   │   ├── services/
│   │   │   └── reservationsService.js      # Business logic
│   │   ├── repositories/
│   │   │   └── reservationsRepository.js   # Database access
│   │   └── routes/
│   │       └── reservations.js             # API routes
│   └── index.js                             # ✅ Đã register routes
│
└── frontend/
    ├── src/
    │   ├── api.js                          # ✅ 15 methods mới
    │   ├── components/
    │   │   ├── ReservationPanel.jsx        # Form tạo đặt bàn
    │   │   ├── ReservationsList.jsx        # Danh sách & quản lý
    │   │   └── TableCard.jsx               # ✅ Thêm badge
    │   └── pages/
    │       └── Dashboard.jsx                # ✅ Thêm nút & logic
```

---

## 🎯 **Next Steps (Optional)**

### **1. SMS/Email Notification:**
- Gửi SMS xác nhận khi đặt bàn
- Nhắc nhở trước giờ đặt 1 tiếng

### **2. Customer Portal:**
- Web/App cho khách tự đặt online
- Xem lịch sử đặt bàn

### **3. Analytics Dashboard:**
- Biểu đồ đặt bàn theo giờ/ngày
- Tỷ lệ no-show
- Top khách hàng

### **4. Waitlist:**
- Danh sách chờ khi hết bàn
- Auto-notify khi có bàn trống

### **5. Recurring Reservations:**
- Đặt bàn định kỳ (hàng tuần/tháng)
- VIP customers

---

## ✅ **Checklist Hoàn Thành**

### **Backend:**
- ✅ Migration SQL chạy thành công
- ✅ Repository layer (15 methods)
- ✅ Service layer với validation
- ✅ Controller layer (12 endpoints)
- ✅ Routes đã register
- ✅ Exclusion constraint
- ✅ Triggers & Functions
- ✅ View calendar

### **Frontend:**
- ✅ API client (15 methods)
- ✅ ReservationPanel component
- ✅ ReservationsList component
- ✅ TableCard enhancement
- ✅ Dashboard integration
- ✅ Toast notifications
- ✅ Error handling

### **Documentation:**
- ✅ RESERVATION_SYSTEM.md (file này)
- ✅ API endpoints documented
- ✅ Usage examples

---

## 🎉 **Kết Luận**

Hệ thống đặt bàn đã **HOÀN THÀNH** với:
- 🛡️ **Database-level protection** chống trùng lịch
- 🎨 **Beautiful UI** khớp với design hiện tại
- ⚡ **Seamless integration** với flow POS
- 📱 **Responsive** và user-friendly
- 🚀 **Production-ready**

**Bắt đầu sử dụng ngay!** 🎊

