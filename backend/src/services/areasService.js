// src/services/areasService.js
import { listAreas, createArea, updateArea, deleteAreaSoft, deleteAreaHard, getAreaById, listTablesByArea, toggleAreaActive } from '../repositories/areasRepository.js';

export default {
  list: (opts) => listAreas(opts),
  create: (payload) => createArea(payload),
  async update(id, payload) {
    const exist = await getAreaById(id);
    if (!exist) {
      const err = new Error('Không tìm thấy khu vực');
      err.status = 404;
      throw err;
    }
    return updateArea(id, payload);
  },
  async remove(id) {
    const ok = await deleteAreaSoft(id); // ✅ Đổi sang soft delete
    if (!ok) {
      const err = new Error('Không tìm thấy khu vực');
      err.status = 404;
      throw err;
    }
    return true;
  },

  async toggleActive(id) {
    return toggleAreaActive(id);
  },

  tablesByArea: (id) => listTablesByArea(id),
};
