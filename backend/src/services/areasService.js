// src/services/areasService.js
import { listAreas, createArea, updateArea, deleteAreaSoft, getAreaById, listTablesByArea } from '../repositories/areasRepository.js';

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
    const ok = await deleteAreaSoft(id);
    if (!ok) {
      const err = new Error('Không tìm thấy khu vực');
      err.status = 404;
      throw err;
    }
    return true;
  },

  tablesByArea: (id) => listTablesByArea(id),
};
