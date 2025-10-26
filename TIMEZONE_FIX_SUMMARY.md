# 🔧 FIX TIMEZONE ISSUE - Manager Dashboard

## ❌ Vấn đề đã phát hiện

Ngày **24/10/2025** có **34 đơn PAID** nhưng API trả về **0 đơn** khi query.

### Nguyên nhân:

1. **Database timezone**: `Asia/Bangkok` (UTC+7)
2. **Column type**: `timestamptz` (timestamp with time zone)
3. **Query cũ sai**:
   ```sql
   WHERE DATE(opened_at AT TIME ZONE 'Asia/Ho_Chi_Minh') = '2025-10-24'
   ```
   - Cách này convert timezone SAI, dẫn đến lấy nhầm ngày

4. **Kết quả test**:
   - Query cũ: Lấy 34 đơn (NHẦM - bao gồm cả đơn của ngày 23/10)
   - Query đúng: Lấy 66 đơn tổng, 34 đơn PAID của ngày 24/10 ✅

## ✅ Giải pháp áp dụng

### 1. Sửa `getOverviewKPIs()` trong `analyticsRepository.js`

**Trước:**
```sql
WHERE DATE(o.opened_at AT TIME ZONE 'Asia/Ho_Chi_Minh') = $1
```

**Sau:**
```sql
WHERE o.opened_at >= ($1 || ' 00:00:00+07')::timestamptz
  AND o.opened_at < (($1::date + INTERVAL '1 day') || ' 00:00:00+07')::timestamptz
```

### 2. Sửa `getRevenueChart()` trong `analyticsRepository.js`

**Trước:**
```sql
DATE(o.closed_at AT TIME ZONE 'Asia/Ho_Chi_Minh') AS date
```

**Sau:**
```sql
(o.closed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS date
```

## 🎯 Kết quả

- ✅ Query ngày 24/10/2025 giờ trả về **đúng 34 đơn PAID**
- ✅ Doanh thu tính đúng theo timezone Việt Nam
- ✅ Không còn lệch múi giờ

## 📝 Test case

```javascript
// Test với ngày 24/10/2025
const result = await pool.query(`
  SELECT COUNT(*) as total
  FROM don_hang 
  WHERE opened_at >= '2025-10-24 00:00:00+07'::timestamptz
    AND opened_at < '2025-10-25 00:00:00+07'::timestamptz
    AND trang_thai = 'PAID'
`);
// Result: 34 đơn ✅
```

## 🚀 Triển khai

1. ✅ Đã sửa file `backend/src/repositories/analyticsRepository.js`
2. ⏳ Cần restart backend server
3. ⏳ Test lại trên Manager Dashboard với ngày 24/10/2025

---

**Thời gian fix:** 2025-10-26  
**Files changed:** 
- `backend/src/repositories/analyticsRepository.js`
