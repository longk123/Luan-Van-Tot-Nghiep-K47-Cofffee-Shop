# 📋 Hướng Dẫn Chi Tiết: Đổi Hard Delete Sang Soft Delete

## 🔴 TỔNG QUAN

Có **3 phần chính** cần đổi từ **hard delete** sang **soft delete**:

1. ✅ **Areas (Khu vực)** - Đang dùng hard delete
2. ✅ **Tables (Bàn)** - Đang dùng hard delete  
3. ✅ **Promotions (Khuyến mãi)** - Đang dùng hard delete

---

## 📝 CHI TIẾT TỪNG PHẦN

### 1️⃣ AREAS (Khu vực) - Priority: CAO

#### File: `backend/src/repositories/areasRepository.js`
**Function cần sửa:** `deleteAreaHard(id)` (dòng 77-108)

**Code hiện tại (HARD DELETE):**
```javascript
export async function deleteAreaHard(id) {
  // ... validation code ...
  
  const { rows } = await query(
    `DELETE FROM khu_vuc WHERE id=$1 RETURNING id`,
    [id]
  );
  return !!rows[0];
}
```

**Cách sửa:**
```javascript
export async function deleteAreaSoft(id) {
  // Kiểm tra khu vực có tồn tại không
  const area = await getAreaById(id);
  if (!area) {
    throw new Error('Không tìm thấy khu vực');
  }

  // Kiểm tra có bàn đang dùng không
  const { rows: tablesInUse } = await query(
    `SELECT id, ten_ban FROM ban WHERE khu_vuc_id = $1 AND trang_thai = 'DANG_DUNG'`,
    [id]
  );
  if (tablesInUse.length > 0) {
    const tableNames = tablesInUse.map(t => t.ten_ban).join(', ');
    throw new Error(`Không thể xóa khu vực có bàn đang dùng: ${tableNames}`);
  }

  // Soft delete: SET active = false
  const { rows } = await query(
    `UPDATE khu_vuc 
     SET active = false 
     WHERE id = $1 
     RETURNING id`,
    [id]
  );
  return !!rows[0];
}
```

**Hoặc nếu muốn dùng `deleted_at`:**
```javascript
export async function deleteAreaSoft(id) {
  // ... validation code giống trên ...
  
  const { rows } = await query(
    `UPDATE khu_vuc 
     SET active = false, deleted_at = NOW() 
     WHERE id = $1 
     RETURNING id`,
    [id]
  );
  return !!rows[0];
}
```

**Lưu ý:** 
- Bảng `khu_vuc` đã có column `active` (BOOLEAN)
- Nếu muốn dùng `deleted_at`, cần thêm migration: `ALTER TABLE khu_vuc ADD COLUMN deleted_at TIMESTAMP NULL;`

---

#### File: `backend/src/services/areasService.js`
**Function cần sửa:** `remove(id)` (dòng 16-24)

**Code hiện tại:**
```javascript
async remove(id) {
  const ok = await deleteAreaHard(id);  // ❌ Đang gọi hard delete
  if (!ok) {
    const err = new Error('Không tìm thấy khu vực');
    err.status = 404;
    throw err;
  }
  return true;
}
```

**Cách sửa:**
```javascript
async remove(id) {
  const ok = await deleteAreaSoft(id);  // ✅ Đổi sang soft delete
  if (!ok) {
    const err = new Error('Không tìm thấy khu vực');
    err.status = 404;
    throw err;
  }
  return true;
}
```

**Và cập nhật import:**
```javascript
// Đổi từ:
import { ..., deleteAreaHard, ... } from '../repositories/areasRepository.js';

// Thành:
import { ..., deleteAreaSoft, ... } from '../repositories/areasRepository.js';
```

---

#### File: `backend/src/repositories/areasRepository.js`
**Function cần sửa:** `listAreas()` (dòng 6-24)

**Cần thêm filter để loại bỏ deleted areas:**

**Code hiện tại:**
```javascript
export async function listAreas({ includeCounts = false }) {
  if (!includeCounts) {
    const { rows } = await query(
      `SELECT id, ten, mo_ta, thu_tu, active FROM khu_vuc ORDER BY thu_tu, ten`
    );
    return rows;
  }
  // ...
}
```

**Cách sửa:**
```javascript
export async function listAreas({ includeCounts = false }) {
  if (!includeCounts) {
    const { rows } = await query(
      `SELECT id, ten, mo_ta, thu_tu, active 
       FROM khu_vuc 
       WHERE active = true 
       ORDER BY thu_tu, ten`
    );
    return rows;
  }
  // Tương tự cho phần includeCounts
  const { rows } = await query(
    `SELECT kv.id, kv.ten, kv.mo_ta, kv.thu_tu, kv.active,
            COUNT(b.id)::int AS total_tables,
            COUNT(NULLIF(b.trang_thai <> 'TRONG', false))::int AS occupied_or_locked,
            COUNT(NULLIF(b.trang_thai = 'TRONG', false))::int AS free_tables
     FROM khu_vuc kv
     LEFT JOIN ban b ON b.khu_vuc_id = kv.id
     WHERE kv.active = true  -- ✅ Thêm filter này
     GROUP BY kv.id
     ORDER BY kv.thu_tu, kv.ten;`
  );
  return rows;
}
```

---

### 2️⃣ TABLES (Bàn) - Priority: CAO

#### File: `backend/src/repositories/tablesRepository.js`
**Function cần sửa:** `removeTable(id)` (dòng 97-100)

**Code hiện tại (HARD DELETE):**
```javascript
export async function removeTable(id) {
  const { rows } = await pool.query("DELETE FROM ban WHERE id=$1 RETURNING id", [id]);
  return rows[0]?.id || null;
}
```

**Cách sửa - Option 1: Dùng `is_deleted` (nếu đã có column):**
```javascript
export async function removeTable(id) {
  // Kiểm tra bàn có đang dùng không
  const table = await getTable(id);
  if (!table) {
    return null;
  }
  
  if (table.trang_thai === 'DANG_DUNG') {
    throw new Error('Không thể xóa bàn đang được sử dụng');
  }

  const { rows } = await pool.query(
    "UPDATE ban SET is_deleted = true, deleted_at = NOW() WHERE id=$1 RETURNING id", 
    [id]
  );
  return rows[0]?.id || null;
}
```

**Cách sửa - Option 2: Thêm column mới (Migration cần thiết):**
```sql
-- Migration script cần chạy:
ALTER TABLE ban ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE ban ADD COLUMN deleted_at TIMESTAMP NULL;
CREATE INDEX idx_ban_is_deleted ON ban(is_deleted);
```

**Sau đó:**
```javascript
export async function removeTable(id) {
  // Validation...
  const table = await getTable(id);
  if (!table) {
    return null;
  }
  
  if (table.trang_thai === 'DANG_DUNG') {
    throw new Error('Không thể xóa bàn đang được sử dụng');
  }

  const { rows } = await pool.query(
    "UPDATE ban SET is_deleted = true, deleted_at = NOW() WHERE id=$1 RETURNING id", 
    [id]
  );
  return rows[0]?.id || null;
}
```

---

#### File: `backend/src/repositories/tablesRepository.js`
**Function cần sửa:** `listTables()` (dòng 22-53)

**Cần thêm filter để loại bỏ deleted tables:**

**Code hiện tại:**
```javascript
const sql = `
  SELECT
    b.*,
    kv.ten AS khu_vuc_ten,
    kv.id AS khu_vuc_id
  FROM ban b
  LEFT JOIN khu_vuc kv ON kv.id = b.khu_vuc_id
  ${where.length ? "WHERE " + where.join(" AND ") : ""}
  ORDER BY b.id ASC
`;
```

**Cách sửa:**
```javascript
// Thêm điều kiện filter deleted
const deletedFilter = "b.is_deleted = false";  // hoặc "b.is_deleted IS NULL" nếu chưa có data
if (where.length) {
  where.push(deletedFilter);
} else {
  where.push(deletedFilter);
}

const sql = `
  SELECT
    b.*,
    kv.ten AS khu_vuc_ten,
    kv.id AS khu_vuc_id
  FROM ban b
  LEFT JOIN khu_vuc kv ON kv.id = b.khu_vuc_id
  WHERE ${where.join(" AND ")}
  ORDER BY b.id ASC
`;
```

---

#### File: `backend/src/repositories/tablesRepository.js`
**Function cần sửa:** `getTable(id)` (dòng 55-58)

**Cần filter deleted:**
```javascript
export async function getTable(id) {
  const { rows } = await pool.query(
    "SELECT * FROM ban WHERE id=$1 AND is_deleted = false", 
    [id]
  );
  return rows[0] || null;
}
```

---

### 3️⃣ PROMOTIONS (Khuyến mãi) - Priority: TRUNG BÌNH

#### File: `backend/src/repositories/promotionRepository.js`
**Function cần sửa:** `delete(id)` (dòng 154-160)

**Code hiện tại (HARD DELETE):**
```javascript
async delete(id) {
  const { rows } = await pool.query(
    'DELETE FROM khuyen_mai WHERE id = $1 RETURNING id',
    [id]
  );
  return rows[0];
}
```

**Cách sửa:**
```javascript
async delete(id) {
  // Kiểm tra có đơn hàng nào đang dùng promotion này không
  // (Tùy chọn - có thể bỏ qua nếu muốn)
  
  // Soft delete: SET active = false
  const { rows } = await pool.query(
    'UPDATE khuyen_mai SET active = false WHERE id = $1 RETURNING id',
    [id]
  );
  return rows[0];
}
```

**Hoặc dùng `toggleActive` method đã có sẵn:**
```javascript
async delete(id) {
  // Dùng method toggleActive đã có sẵn
  return await this.toggleActive(id, false);
}
```

---

#### File: `backend/src/repositories/promotionRepository.js`
**Function cần kiểm tra:** `getAll()` hoặc `findAll()` (nếu có)

**Cần thêm filter để loại bỏ deleted promotions:**

Tìm function list/get promotions và thêm:
```sql
WHERE active = true
```

---

#### File: `backend/src/services/promotionService.js`
**Function cần sửa:** `deletePromotion(id)` (nếu có)

**Kiểm tra xem service có gọi repository.delete không, và đảm bảo nó dùng soft delete.**

---

## 🔍 CÁC FILE CẦN KIỂM TRA QUERIES

Sau khi đổi sang soft delete, cần kiểm tra **TẤT CẢ** các queries SELECT để đảm bảo filter deleted records:

### Areas:
- ✅ `listAreas()` - Đã nêu ở trên
- ✅ `getAreaById()` - Có thể cần filter
- ✅ `listTablesByArea()` - Có thể cần filter areas

### Tables:
- ✅ `listTables()` - Đã nêu ở trên
- ✅ `getTable()` - Đã nêu ở trên
- ✅ Tất cả queries khác dùng table

### Promotions:
- ✅ `getAllPromotions()` hoặc `listPromotions()`
- ✅ `getPromotionById()`
- ✅ Tất cả queries khác liên quan promotion

---

## 📊 MIGRATION SCRIPTS CẦN THIẾT

### Cho Tables (nếu chưa có columns):
```sql
-- Migration: Add soft delete columns to ban table
ALTER TABLE ban ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE ban ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;

-- Update existing records (nếu có)
UPDATE ban SET is_deleted = false WHERE is_deleted IS NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_ban_is_deleted ON ban(is_deleted);
```

### Cho Areas (nếu muốn thêm deleted_at):
```sql
-- Migration: Add deleted_at to khu_vuc table (optional)
ALTER TABLE khu_vuc ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;
CREATE INDEX IF NOT EXISTS idx_khu_vuc_deleted_at ON khu_vuc(deleted_at);
```

### Cho Promotions (nếu muốn thêm deleted_at):
```sql
-- Migration: Add deleted_at to khuyen_mai table (optional)
ALTER TABLE khuyen_mai ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;
CREATE INDEX IF NOT EXISTS idx_khuyen_mai_deleted_at ON khuyen_mai(deleted_at);
```

---

## ✅ CHECKLIST THỰC HIỆN

### Areas:
- [ ] Sửa `deleteAreaHard()` → `deleteAreaSoft()` trong `areasRepository.js`
- [ ] Cập nhật `remove()` trong `areasService.js` để gọi `deleteAreaSoft()`
- [ ] Cập nhật `listAreas()` để filter `active = true`
- [ ] Kiểm tra `getAreaById()` - có cần filter không?
- [ ] Test API DELETE `/api/v1/areas/:id`
- [ ] Test API GET `/api/v1/areas` - đảm bảo không hiện deleted areas

### Tables:
- [ ] Tạo migration script để thêm `is_deleted`, `deleted_at` columns
- [ ] Sửa `removeTable()` trong `tablesRepository.js`
- [ ] Cập nhật `listTables()` để filter `is_deleted = false`
- [ ] Cập nhật `getTable()` để filter `is_deleted = false`
- [ ] Kiểm tra tất cả queries khác dùng table
- [ ] Test API DELETE `/api/v1/tables/:id`
- [ ] Test API GET `/api/v1/tables` - đảm bảo không hiện deleted tables

### Promotions:
- [ ] Sửa `delete()` trong `promotionRepository.js`
- [ ] Cập nhật `getAllPromotions()` hoặc `listPromotions()` để filter `active = true`
- [ ] Kiểm tra `getPromotionById()` - có cần filter không?
- [ ] Test API DELETE `/api/v1/promotions/:id`
- [ ] Test API GET `/api/v1/promotions` - đảm bảo không hiện deleted promotions

### Tổng quát:
- [ ] Backup database trước khi chạy migration
- [ ] Test tất cả trên staging environment
- [ ] Cập nhật API documentation nếu có
- [ ] Thông báo cho team về thay đổi

---

## 🎯 TÓM TẮT NHANH

### 1. Areas:
- File: `backend/src/repositories/areasRepository.js`
- Đổi: `DELETE FROM khu_vuc` → `UPDATE khu_vuc SET active = false`
- Filter: `WHERE active = true` trong các queries SELECT

### 2. Tables:
- File: `backend/src/repositories/tablesRepository.js`
- Migration: Thêm `is_deleted`, `deleted_at` columns
- Đổi: `DELETE FROM ban` → `UPDATE ban SET is_deleted = true`
- Filter: `WHERE is_deleted = false` trong các queries SELECT

### 3. Promotions:
- File: `backend/src/repositories/promotionRepository.js`
- Đổi: `DELETE FROM khuyen_mai` → `UPDATE khuyen_mai SET active = false`
- Filter: `WHERE active = true` trong các queries SELECT

---

## 📞 LƯU Ý QUAN TRỌNG

1. **Backup database** trước khi chạy migration
2. **Test kỹ** trên staging trước khi deploy production
3. **Kiểm tra foreign keys** - đảm bảo không có constraint conflict
4. **Cập nhật frontend** nếu cần hiển thị "Đã xóa" hoặc filter deleted items
5. **Thông báo team** về thay đổi behavior của API

