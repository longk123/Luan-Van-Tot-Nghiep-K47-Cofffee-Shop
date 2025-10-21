# API Tùy chọn Per-Cup (Sugar/Ice Levels)

## Tổng quan

Bộ API này cho phép:
- ✅ Thêm món với tùy chọn riêng cho từng ly (đường 70%, đá 50%, ghi chú,...)
- ✅ Sửa/xóa từng ly trong đơn (chỉ khi ly còn QUEUED và đơn chưa PAID)
- ✅ Cập nhật trạng thái chế biến: QUEUED → MAKING → DONE/CANCELLED
- ✅ Đọc chi tiết line + options để render giỏ hàng
- ✅ Quản lý nhóm tùy chọn (SUGAR, ICE,...)

---

## 🔵 POS Items APIs

### 1. Thêm món vào đơn (Hỗ trợ per-cup options)

```http
POST /api/v1/pos/orders/:orderId/items
```

**Cách 1: Thêm N ly với số lượng (không options)**
```json
{
  "mon_id": 1,
  "bien_the_id": 3,
  "so_luong": 3,
  "don_gia": 35000,
  "giam_gia": 0
}
```
→ Tạo 3 line riêng biệt (mỗi line qty=1) để có thể chỉnh từng ly sau

**Cách 2: Thêm với options chi tiết cho từng ly**
```json
{
  "mon_id": 1,
  "bien_the_id": 3,
  "cups": [
    {
      "tuy_chon": { "SUGAR": 0.7, "ICE": 0.5 },
      "ghi_chu": "Ít đá nhé"
    },
    {
      "tuy_chon": { "SUGAR": 1.0, "ICE": 0.3 },
      "ghi_chu": "Ngọt full"
    }
  ],
  "don_gia": 35000,
  "giam_gia": 0
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "orderId": 123,
    "created_line_ids": [45, 46]
  }
}
```

---

### 2. Lấy chi tiết items kèm options

```http
GET /api/v1/pos/orders/:orderId/items-ext
```

**Response:**
```json
{
  "ok": true,
  "data": [
    {
      "line_id": 45,
      "order_id": 123,
      "mon_id": 1,
      "ten_mon": "Cà phê sữa đá",
      "bien_the_id": 3,
      "ten_bien_the": "Size M",
      "so_luong": 1,
      "don_gia": 35000,
      "giam_gia": 0,
      "line_total": 35000,
      "ghi_chu": "Ít đá nhé",
      "trang_thai_che_bien": "QUEUED",
      "options": [
        {
          "ma": "ICE",
          "ten": "Mức đá",
          "muc": "50%",
          "he_so": 0.5
        },
        {
          "ma": "SUGAR",
          "ten": "Độ ngọt",
          "muc": "70%",
          "he_so": 0.7
        }
      ]
    }
  ]
}
```

---

### 3. Cập nhật thông tin line

```http
PATCH /api/v1/pos/orders/:orderId/items/:lineId
```

**Body:**
```json
{
  "bien_the_id": 4,
  "so_luong": 1,
  "don_gia": 39000,
  "giam_gia": 5000,
  "ghi_chu": "Không đường"
}
```

⚠️ **Lưu ý:** Chỉ sửa được khi:
- Line còn ở trạng thái `QUEUED`
- Đơn chưa `PAID`

**Response:**
```json
{
  "ok": true,
  "data": {
    "updated": 45
  }
}
```

---

### 4. Cập nhật/Thêm options cho line

```http
PUT /api/v1/pos/orders/:orderId/items/:lineId/options
```

**Body:**
```json
{
  "SUGAR": 0.5,
  "ICE": 1.0
}
```

→ Ghi đè hoàn toàn options cho line này

**Response:**
```json
{
  "ok": true,
  "data": {
    "updated": 2
  }
}
```

---

### 5. Cập nhật trạng thái chế biến

```http
PATCH /api/v1/pos/orders/:orderId/items/:lineId/status
```

**Body:**
```json
{
  "trang_thai_che_bien": "MAKING",
  "maker_id": 5
}
```

**Các trạng thái:**
- `QUEUED` - Chờ làm (mặc định)
- `MAKING` - Đang làm (set `started_at`)
- `DONE` - Hoàn thành (set `finished_at`)
- `CANCELLED` - Hủy

**Response:**
```json
{
  "ok": true,
  "data": {
    "id": 45,
    "trang_thai_che_bien": "MAKING",
    "started_at": "2025-10-20T10:30:00.000Z",
    "finished_at": null,
    "maker_id": 5
  }
}
```

---

### 6. Xóa line

```http
DELETE /api/v1/pos/orders/:orderId/items/:lineId
```

⚠️ **Lưu ý:** Chỉ xóa được khi line còn `QUEUED` và đơn chưa `PAID`

**Response:**
```json
{
  "ok": true,
  "data": {
    "deleted": 45
  }
}
```

---

## 🟢 Menu Options APIs

### 1. Lấy danh sách nhóm tùy chọn

```http
GET /api/v1/menu/options
```

**Response:**
```json
{
  "ok": true,
  "data": [
    {
      "id": 1,
      "ma": "ICE",
      "ten": "Mức đá",
      "don_vi": "%",
      "loai": "PERCENT"
    },
    {
      "id": 2,
      "ma": "SUGAR",
      "ten": "Độ ngọt",
      "don_vi": "%",
      "loai": "PERCENT"
    }
  ]
}
```

---

### 2. Lấy các mức của nhóm tùy chọn

```http
GET /api/v1/menu/options/:optId/levels
```

**Ví dụ:** `GET /api/v1/menu/options/2/levels` (SUGAR)

**Response:**
```json
{
  "ok": true,
  "data": [
    { "id": 1, "ten": "0%", "gia_tri": 0.0, "thu_tu": 1 },
    { "id": 2, "ten": "30%", "gia_tri": 0.3, "thu_tu": 2 },
    { "id": 3, "ten": "50%", "gia_tri": 0.5, "thu_tu": 3 },
    { "id": 4, "ten": "70%", "gia_tri": 0.7, "thu_tu": 4 },
    { "id": 5, "ten": "100%", "gia_tri": 1.0, "thu_tu": 5 }
  ]
}
```

---

### 3. Lấy tùy chọn áp dụng cho món

```http
GET /api/v1/menu/items/:monId/options
```

**Response:**
```json
{
  "ok": true,
  "data": [
    {
      "id": 1,
      "ma": "ICE",
      "ten": "Mức đá",
      "don_vi": "%",
      "loai": "PERCENT"
    },
    {
      "id": 2,
      "ma": "SUGAR",
      "ten": "Độ ngọt",
      "don_vi": "%",
      "loai": "PERCENT"
    }
  ]
}
```

---

## 📋 Quy trình nghiệp vụ

### Flow 1: Đặt món với options

```
1. Frontend gọi GET /menu/items/:monId/options
   → Hiển thị UI chọn Sugar/Ice

2. User chọn: Sugar 70%, Ice 50%, ghi chú "Ít đá"

3. Frontend gọi POST /pos/orders/:orderId/items
   Body: {
     "mon_id": 1,
     "bien_the_id": 3,
     "cups": [
       {
         "tuy_chon": { "SUGAR": 0.7, "ICE": 0.5 },
         "ghi_chu": "Ít đá nhé"
       }
     ]
   }

4. Backend tạo line + lưu options vào don_hang_chi_tiet_tuy_chon
```

---

### Flow 2: Barista làm món

```
1. Màn hình bếp gọi GET /pos/orders/:orderId/items-ext
   → Hiển thị danh sách ly cần làm kèm options

2. Barista bắt đầu làm ly #45:
   PATCH /pos/orders/:orderId/items/45/status
   Body: { "trang_thai_che_bien": "MAKING", "maker_id": 5 }

3. Hoàn thành:
   PATCH /pos/orders/:orderId/items/45/status
   Body: { "trang_thai_che_bien": "DONE" }
```

---

### Flow 3: Sửa options trước khi làm

```
1. Cashier sửa options cho ly #45:
   PUT /pos/orders/:orderId/items/45/options
   Body: { "SUGAR": 0.3, "ICE": 0.7 }

2. Nếu ly đã MAKING hoặc DONE → DB trigger CHẶN
   Response: 400 "Không thể sửa/xóa: Món đã/đang được làm"
```

---

## 🛡️ Business Rules (DB Triggers)

1. **Chặn sửa/xóa line khi:**
   - Line không còn QUEUED (đã MAKING/DONE/CANCELLED)
   - Đơn đã PAID

2. **Chặn sửa/xóa options khi:**
   - Line không còn editable (theo rule 1)

3. **Timestamps tự động:**
   - `started_at` - Set khi chuyển sang MAKING
   - `finished_at` - Set khi chuyển sang DONE

---

## 🔧 Database Schema

### Bảng `tuy_chon_mon`
```sql
id | ma      | ten         | don_vi | loai
---+---------+-------------+--------+---------
1  | SUGAR   | Độ ngọt     | %      | PERCENT
2  | ICE     | Mức đá      | %      | PERCENT
```

### Bảng `tuy_chon_muc`
```sql
id | tuy_chon_id | ten  | gia_tri | thu_tu
---+-------------+------+---------+--------
1  | 1           | 0%   | 0.0     | 1
2  | 1           | 30%  | 0.3     | 2
3  | 1           | 50%  | 0.5     | 3
...
```

### Bảng `don_hang_chi_tiet` (mở rộng)
```sql
- ghi_chu TEXT
- trang_thai_che_bien TEXT DEFAULT 'QUEUED'
- started_at TIMESTAMPTZ
- finished_at TIMESTAMPTZ
- maker_id INT
```

### Bảng `don_hang_chi_tiet_tuy_chon`
```sql
id | line_id | tuy_chon_id | muc_id | he_so
---+---------+-------------+--------+-------
1  | 45      | 1           | 4      | 0.7
2  | 45      | 2           | 3      | 0.5
```

---

## 🚀 Testing

Chạy backend:
```bash
cd backend
npm run dev
```

Test thêm món với options:
```bash
curl -X POST http://localhost:5000/api/v1/pos/orders/1/items \
  -H "Content-Type: application/json" \
  -d '{
    "mon_id": 1,
    "bien_the_id": 3,
    "cups": [
      {
        "tuy_chon": {"SUGAR": 0.7, "ICE": 0.5},
        "ghi_chu": "Ít đá"
      }
    ]
  }'
```

Test lấy items với options:
```bash
curl http://localhost:5000/api/v1/pos/orders/1/items-ext
```

---

## 📝 Notes

- **Per-cup approach:** Mỗi ly là 1 line riêng (so_luong=1) để dễ quản lý options và trạng thái
- **Options format:** Dùng mã (SUGAR, ICE) thay vì ID để frontend dễ làm việc
- **Realtime events:** Mọi thay đổi đều emit event qua EventBus để frontend SSE nhận được
- **Error handling:** DB trigger là lớp bảo vệ cuối cùng, controller cũng check để trả lỗi thân thiện

---

✅ **Done!** Bộ API đã sẵn sàng sử dụng.

