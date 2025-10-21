// File path: D:\my-thesis\backend\src\services\tablesService.js
import * as repo from "../repositories/tablesRepository.js";

export const create   = (payload)        => repo.createTable(payload);
export const list     = (filters)        => repo.listTables(filters);
export const getById  = (id)             => repo.getTable(id);
export const update   = (id, payload)    => repo.updateTable(id, payload);
export const setStatus= (id, trang_thai) => repo.updateStatus(id, trang_thai);
export const remove   = (id)             => repo.removeTable(id);
