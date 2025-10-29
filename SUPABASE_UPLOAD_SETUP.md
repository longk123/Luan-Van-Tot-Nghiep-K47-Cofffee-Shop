# ✅ Supabase Storage Upload - Setup Complete

**Date:** 2025-10-29  
**Feature:** Image Upload for Menu Items  
**Storage:** Supabase Storage

---

## 🎉 ĐÃ TRIỂN KHAI

### Backend (Node.js + Express)

#### 1. **Installed Packages**
```bash
npm install @supabase/supabase-js multer
```

#### 2. **Files Created**

**`backend/src/lib/supabaseClient.js`**
- Supabase client configuration
- `uploadMenuImage(file, fileName, folder)` - Upload image
- `deleteMenuImage(filePath)` - Delete image
- `extractFilePathFromUrl(url)` - Helper function

**`backend/src/controllers/uploadController.js`**
- `uploadImage()` - POST handler for uploading
- `deleteImage()` - DELETE handler for removing images
- File validation (type, size)

**`backend/src/routes/upload.js`**
- POST `/api/v1/upload/menu-image` - Upload image
- DELETE `/api/v1/upload/menu-image` - Delete image
- Multer middleware for file handling
- Role-based access (Manager/Admin only)

#### 3. **Updated Files**
- `backend/index.js` - Added upload router

---

### Frontend (React)

#### 1. **Updated Files**

**`frontend/src/pages/MenuManagement.jsx`**
- Added image upload UI
- Image preview before upload
- Automatic folder selection based on category:
  - `ca-phe` - Cà phê items
  - `tra` - Trà items
  - `da-xay` - Đá xay items
  - `other` - Other categories
- Loading state during upload
- Delete image functionality

---

## 🔧 CONFIGURATION

### Supabase Settings

**Project URL:** `https://ihmvdgqgfyjyeytkmpqc.supabase.co`

**Bucket:** `menu-images` (Public)

**Folders:**
- `ca-phe/` - Coffee items
- `tra/` - Tea items
- `da-xay/` - Smoothies
- `other/` - Other items

**File Naming:** `{folder}/{timestamp}-{originalname}`
Example: `ca-phe/1730000000000-espresso.jpg`

---

## 📋 FEATURES

### ✅ Implemented

1. **File Upload**
   - Drag & drop or click to select
   - File type validation (JPEG, PNG, WebP, GIF)
   - File size limit: 5MB
   - Auto folder selection based on category

2. **Image Preview**
   - Real-time preview before upload
   - Preview existing images when editing
   - Remove image button

3. **Upload Status**
   - Loading spinner during upload
   - Success/error feedback
   - Disabled form during upload

4. **Security**
   - Authentication required
   - Role-based access (Manager/Admin only)
   - File type whitelist
   - Size validation

---

## 🚀 USAGE

### Upload Image When Creating/Editing Menu Item

1. Navigate to Menu Management (`/menu-management`)
2. Click "Thêm món" or edit existing item
3. Select category (determines storage folder)
4. Click "Chọn ảnh" button
5. Select image file (JPG, PNG, WebP, GIF)
6. Preview appears automatically
7. Click "Lưu" - image uploads to Supabase
8. Image URL saved to database

### Delete Image

- Click X button on preview to remove image
- Or upload new image to replace

---

## 🔗 API Endpoints

### POST `/api/v1/upload/menu-image`
Upload menu item image

**Headers:**
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Body (FormData):**
```
image: [File]
folder: "ca-phe" | "tra" | "da-xay" | "other"
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "url": "https://ihmvdgqgfyjyeytkmpqc.supabase.co/storage/v1/object/public/menu-images/ca-phe/1730000000000-espresso.jpg",
    "path": "ca-phe/1730000000000-espresso.jpg",
    "fileName": "espresso.jpg",
    "size": 245678,
    "mimeType": "image/jpeg"
  }
}
```

### DELETE `/api/v1/upload/menu-image`
Delete menu item image

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "url": "https://ihmvdgqgfyjyeytkmpqc.supabase.co/storage/v1/object/public/menu-images/ca-phe/1730000000000-espresso.jpg"
}
```
Or:
```json
{
  "path": "ca-phe/1730000000000-espresso.jpg"
}
```

**Response:**
```json
{
  "ok": true,
  "message": "Image deleted successfully",
  "path": "ca-phe/1730000000000-espresso.jpg"
}
```

---

## 🎨 UI Components

### Image Upload Section
- Blue gradient button "Chọn ảnh"
- File input (hidden, triggered by button)
- Green badge when file selected
- Image preview with delete button
- Help text with file requirements

### Loading State
- Spinner animation
- "Đang tải ảnh..." text
- Disabled form buttons

---

## 📝 TODO (Optional Enhancements)

- [ ] Image compression before upload
- [ ] Drag & drop zone
- [ ] Multiple image upload
- [ ] Image cropping tool
- [ ] Generate thumbnails
- [ ] Progress bar for large files
- [ ] Bulk image upload for multiple items

---

## 🐛 TROUBLESHOOTING

### Upload fails with 401
- Check authentication token
- Verify user has manager/admin role

### Upload fails with 400 "Invalid file type"
- Only JPEG, PNG, WebP, GIF allowed
- Check file extension

### Upload fails with 400 "File size exceeds limit"
- Maximum file size is 5MB
- Compress image before uploading

### Image doesn't appear after upload
- Check Supabase bucket is set to Public
- Verify bucket policies allow public read access
- Check browser console for CORS errors

---

## 🎯 NEXT STEPS

1. **Implement Menu CRUD APIs** (still needed)
   - POST `/api/v1/menu/items`
   - PUT `/api/v1/menu/items/:id`
   - DELETE `/api/v1/menu/items/:id`

2. **Test Upload Flow**
   - Upload image for new item
   - Upload image for existing item
   - Replace existing image
   - Delete image

3. **Add Image to Menu Display**
   - Show images in menu list
   - Display in POS
   - Show in customer-facing menu

---

**Status:** ✅ Ready for Testing

