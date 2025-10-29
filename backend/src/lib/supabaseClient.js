// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://ihmvdgqgfyjyeytkmpqc.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlobXZkZ3FnZnlqeWV5dGttcHFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2OTYyNjYsImV4cCI6MjA3NjI3MjI2Nn0.vgnxpLJuVfUqZy4EWfRrVTOHa2trRbeWGXqFPZFVBMc';

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Upload image to Supabase Storage
 * @param {Buffer|File} file - File to upload
 * @param {string} fileName - Name of the file
 * @param {string} folder - Folder name (ca-phe, tra, da-xay, etc.)
 * @returns {Promise<{url: string, path: string}>}
 */
export async function uploadMenuImage(file, fileName, folder = 'other') {
  try {
    const bucketName = 'menu-images';
    const filePath = `${folder}/${Date.now()}-${fileName}`;
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      throw error;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return {
      url: publicUrl,
      path: filePath
    };
  } catch (error) {
    console.error('Error uploading to Supabase:', error);
    throw new Error('Failed to upload image: ' + error.message);
  }
}

/**
 * Delete image from Supabase Storage
 * @param {string} filePath - Path of file to delete (e.g., "ca-phe/1234567890-image.jpg")
 * @returns {Promise<void>}
 */
export async function deleteMenuImage(filePath) {
  try {
    const bucketName = 'menu-images';
    
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting from Supabase:', error);
    throw new Error('Failed to delete image: ' + error.message);
  }
}

/**
 * Extract file path from Supabase public URL
 * @param {string} url - Supabase public URL
 * @returns {string|null} File path or null
 */
export function extractFilePathFromUrl(url) {
  if (!url) return null;
  
  try {
    // URL format: https://ihmvdgqgfyjyeytkmpqc.supabase.co/storage/v1/object/public/menu-images/ca-phe/1234567890-image.jpg
    const match = url.match(/\/menu-images\/(.+)$/);
    return match ? match[1] : null;
  } catch (error) {
    console.error('Error extracting file path:', error);
    return null;
  }
}

