# API Requirements for Menu Management

**Date:** 2025-10-29  
**Feature:** Menu Management UI (Frontend completed)  
**Status:** Backend API endpoints needed

---

## ✅ Frontend Implementation Complete

A complete Menu Management interface has been created at `/menu-management` with the following features:

### 📋 Features Implemented (Frontend)
1. **Categories Management** - Manage food categories (Cà phê, Trà sữa, etc.)
2. **Items Management** - Manage menu items with prices, descriptions, images
3. **Variants Management** - Manage item variations (Size M, L, XL)
4. **Options Management** - View option groups (Sugar, Ice levels)
5. **Topping Pricing** - Configure topping prices per item/variant

### 🎨 UI Features
- Modern tabbed interface with golden theme (#d4a574, #c9975b)
- Responsive design
- Form modals for create/edit operations
- Search and filter functionality
- Role-based access (Manager/Admin only)
- Floating action button from Manager Dashboard

---

## ⚠️ Backend API Endpoints Required

The following endpoints need to be implemented in the backend:

### 1. Categories (loai_mon)

#### GET `/api/v1/menu/categories` ✅ Already exists
Returns list of all categories

#### POST `/api/v1/menu/categories` ❌ Need to create
**Request Body:**
```json
{
  "ten": "Sinh tố",
  "mo_ta": "Các loại sinh tố trái cây",
  "thu_tu": 5,
  "active": true
}
```
**Response:**
```json
{
  "ok": true,
  "data": {
    "id": 7,
    "ten": "Sinh tố",
    "mo_ta": "Các loại sinh tố trái cây",
    "thu_tu": 5,
    "active": true
  }
}
```

#### PUT `/api/v1/menu/categories/:id` ❌ Need to create
**Request Body:** Same as POST

#### DELETE `/api/v1/menu/categories/:id` ❌ Need to create
**Response:**
```json
{
  "ok": true,
  "message": "Category deleted successfully"
}
```

---

### 2. Menu Items (mon)

#### GET `/api/v1/menu/categories/0/items` ✅ Already exists
Returns all items

#### GET `/api/v1/menu/items/:id` ✅ Already exists
Returns single item with details

#### POST `/api/v1/menu/items` ❌ Need to create
**Request Body:**
```json
{
  "ten": "Cà phê sữa đá",
  "ma": "CF001",
  "loai_id": 1,
  "don_vi": "ly",
  "gia_mac_dinh": 25000,
  "active": true,
  "thu_tu": 1,
  "mo_ta": "Cà phê truyền thống Việt Nam",
  "hinh_anh": "https://example.com/image.jpg"
}
```

#### PUT `/api/v1/menu/items/:id` ❌ Need to create
**Request Body:** Same as POST

#### DELETE `/api/v1/menu/items/:id` ❌ Need to create

---

### 3. Variants (mon_bien_the)

#### GET `/api/v1/menu/items/:id/variants` ✅ Already exists

#### POST `/api/v1/menu/variants` ❌ Need to create
**Request Body:**
```json
{
  "mon_id": 5,
  "ten_bien_the": "Size L",
  "gia": 35000,
  "thu_tu": 2,
  "active": true
}
```

#### PUT `/api/v1/menu/variants/:id` ❌ Need to create

#### DELETE `/api/v1/menu/variants/:id` ❌ Need to create

---

### 4. Options (tuy_chon_mon)

#### GET `/api/v1/menu/options` ✅ Already exists

#### GET `/api/v1/menu/options/:id/levels` ✅ Already exists

#### POST `/api/v1/menu/options` ❌ Need to create
**Request Body:**
```json
{
  "ma": "TOPPING_JELLY",
  "ten": "Thạch rau câu",
  "loai": "AMOUNT",
  "don_vi": "phần",
  "gia_mac_dinh": 5000
}
```

#### PUT `/api/v1/menu/options/:id` ❌ Need to create

#### DELETE `/api/v1/menu/options/:id` ❌ Need to create

---

### 5. Topping Pricing (tuy_chon_gia)

#### GET `/api/v1/menu/topping-pricing` ❌ Need to create
Returns all topping pricing configurations

**Response:**
```json
{
  "ok": true,
  "data": [
    {
      "id": 1,
      "tuy_chon_id": 5,
      "tuy_chon_ten": "Bánh flan",
      "mon_id": 3,
      "mon_ten": "Trà sữa",
      "mon_bien_the_id": 7,
      "bien_the_ten": "Size L",
      "gia": 9000
    }
  ]
}
```

#### POST `/api/v1/menu/topping-pricing` ❌ Need to create
**Request Body:**
```json
{
  "tuy_chon_id": 5,
  "mon_id": 3,
  "mon_bien_the_id": 7,
  "gia": 9000
}
```

#### PUT `/api/v1/menu/topping-pricing/:id` ❌ Need to create

#### DELETE `/api/v1/menu/topping-pricing/:id` ❌ Need to create

---

## 🔧 Implementation Guide

### Step 1: Create Routes
Add routes in `backend/src/routes/menu.js`:

```javascript
import { authRequired } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';

// Categories
router.post('/categories', authRequired, authorize(['manager', 'admin']), menuController.createCategory);
router.put('/categories/:id', authRequired, authorize(['manager', 'admin']), menuController.updateCategory);
router.delete('/categories/:id', authRequired, authorize(['manager', 'admin']), menuController.deleteCategory);

// Items
router.post('/items', authRequired, authorize(['manager', 'admin']), menuController.createItem);
router.put('/items/:id', authRequired, authorize(['manager', 'admin']), menuController.updateItem);
router.delete('/items/:id', authRequired, authorize(['manager', 'admin']), menuController.deleteItem);

// Variants
router.post('/variants', authRequired, authorize(['manager', 'admin']), menuController.createVariant);
router.put('/variants/:id', authRequired, authorize(['manager', 'admin']), menuController.updateVariant);
router.delete('/variants/:id', authRequired, authorize(['manager', 'admin']), menuController.deleteVariant);

// Options
router.post('/options', authRequired, authorize(['manager', 'admin']), menuController.createOption);
router.put('/options/:id', authRequired, authorize(['manager', 'admin']), menuController.updateOption);
router.delete('/options/:id', authRequired, authorize(['manager', 'admin']), menuController.deleteOption);

// Topping Pricing
router.get('/topping-pricing', authRequired, authorize(['manager', 'admin']), menuController.getToppingPricing);
router.post('/topping-pricing', authRequired, authorize(['manager', 'admin']), menuController.createToppingPrice);
router.put('/topping-pricing/:id', authRequired, authorize(['manager', 'admin']), menuController.updateToppingPrice);
router.delete('/topping-pricing/:id', authRequired, authorize(['manager', 'admin']), menuController.deleteToppingPrice);
```

### Step 2: Create Controller Methods
Add methods in `backend/src/controllers/menuController.js`

### Step 3: Database Operations
Use existing database tables:
- `loai_mon` (categories)
- `mon` (items)
- `mon_bien_the` (variants)
- `tuy_chon_mon` (options)
- `tuy_chon_gia` (topping pricing)

### Step 4: Validation
Use Joi schema validation for request bodies

### Step 5: Error Handling
- Check for duplicate names/codes
- Validate foreign keys exist
- Handle cascade deletes properly
- Return appropriate error messages

---

## 📝 Notes

1. **Authorization**: All write operations require `manager` or `admin` role
2. **Soft Delete**: Consider using `active=false` instead of hard delete for items/categories
3. **Cascade**: When deleting category, decide whether to cascade delete items or prevent deletion
4. **Validation**: Ensure price values are non-negative integers
5. **Ordering**: Support `thu_tu` (order) field for custom sorting

---

## 🚀 Testing Checklist

Once backend is implemented:

- [ ] Create new category
- [ ] Update category
- [ ] Delete category
- [ ] Create new menu item
- [ ] Update menu item
- [ ] Delete menu item
- [ ] Create variant for item
- [ ] Update variant
- [ ] Delete variant
- [ ] View all options and levels
- [ ] Create new option
- [ ] Update option pricing
- [ ] Set topping price for specific item/variant

---

## 🎯 Priority

**High Priority:**
1. Categories CRUD
2. Items CRUD
3. Variants CRUD

**Medium Priority:**
4. Options CRUD
5. Topping Pricing CRUD

**Future Enhancements:**
- Bulk import/export menu
- Image upload handling
- Menu item availability scheduling
- Recipe/ingredient linking

