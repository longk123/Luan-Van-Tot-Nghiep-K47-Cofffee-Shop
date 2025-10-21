// src/services/menuService.js
import { getCategories, getItemsByCategory, getItemWithVariants, searchMenu, getItemVariants, searchItems } from '../repositories/menuRepository.js';

export default {
  categories: () => getCategories(),
  itemsByCategory: (id) => getItemsByCategory(id),
  async item(id) {
    const data = await getItemWithVariants(id);
    if (!data) {
      const err = new Error('Không tìm thấy món');
      err.status = 404;
      throw err;
    }
    return data;
  },
  search: (q) => searchMenu(q),
  // ✅ NEW: chỉ trả về variants
  variants: (id) => getItemVariants(id),
  // ✅ NEW: tìm kiếm món theo keyword
  searchItems: (keyword) => searchItems(keyword),
};
