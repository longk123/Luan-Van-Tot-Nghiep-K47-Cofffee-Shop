// src/routes/upload.js
import { Router } from 'express';
import multer from 'multer';
import { authRequired } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import * as uploadController from '../controllers/uploadController.js';

const router = Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// POST /api/v1/upload/menu-image
// Upload menu item image (Manager/Admin only)
router.post(
  '/menu-image',
  authRequired,
  authorize(['manager', 'admin']),
  upload.single('image'),
  uploadController.uploadImage
);

// DELETE /api/v1/upload/menu-image
// Delete menu item image (Manager/Admin only)
router.delete(
  '/menu-image',
  authRequired,
  authorize(['manager', 'admin']),
  uploadController.deleteImage
);

export default router;

