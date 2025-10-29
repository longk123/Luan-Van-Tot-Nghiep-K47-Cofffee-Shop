// src/controllers/uploadController.js
import { uploadMenuImage, deleteMenuImage, extractFilePathFromUrl } from '../lib/supabaseClient.js';
import { BadRequest } from '../utils/httpErrors.js';

/**
 * POST /api/v1/upload/menu-image
 * Upload menu item image
 * Expects: multipart/form-data with 'image' field and optional 'folder' field
 */
export async function uploadImage(req, res, next) {
  try {
    // Check if file was uploaded
    if (!req.file) {
      throw new BadRequest('No image file provided');
    }

    const folder = req.body.folder || 'other'; // ca-phe, tra, da-xay, or other
    const file = req.file;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequest('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.');
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequest('File size exceeds 5MB limit');
    }

    // Upload to Supabase
    const result = await uploadMenuImage(file.buffer, file.originalname, folder);

    res.status(200).json({
      ok: true,
      data: {
        url: result.url,
        path: result.path,
        fileName: file.originalname,
        size: file.size,
        mimeType: file.mimetype
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/v1/upload/menu-image
 * Delete menu item image
 * Body: { url: "https://..." } or { path: "ca-phe/123-image.jpg" }
 */
export async function deleteImage(req, res, next) {
  try {
    const { url, path } = req.body;

    if (!url && !path) {
      throw new BadRequest('Either url or path is required');
    }

    // Extract path from URL if provided
    const filePath = path || extractFilePathFromUrl(url);

    if (!filePath) {
      throw new BadRequest('Invalid image URL or path');
    }

    await deleteMenuImage(filePath);

    res.status(200).json({
      ok: true,
      message: 'Image deleted successfully',
      path: filePath
    });
  } catch (error) {
    next(error);
  }
}

