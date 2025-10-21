// File path: D:\my-thesis\backend\src\controllers\tablesController.js
import * as svc from "../services/tablesService.js";
import { createTableSchema, updateTableSchema, updateStatusSchema } from "../validators/tables.js";

export const create = async (req, res, next) => {
  try {
    const value = await createTableSchema.validateAsync(req.body);
    const data = await svc.create(value);
    res.status(201).json(data);
  } catch (err) { next(err); }
};

export const list = async (req, res, next) => {
  try {
    const data = await svc.list({
      khu_vuc: req.query.khu_vuc,
      trang_thai: req.query.trang_thai,
      q: req.query.q,
    });
    res.json(data);
  } catch (err) { next(err); }
};

export const getOne = async (req, res, next) => {
  try {
    const data = await svc.getById(req.params.id);
    if (!data) return res.status(404).json({ message: "Không tìm thấy bàn" });
    res.json(data);
  } catch (err) { next(err); }
};

export const update = async (req, res, next) => {
  try {
    const value = await updateTableSchema.validateAsync(req.body);
    const data = await svc.update(req.params.id, value);
    if (!data) return res.status(404).json({ message: "Không tìm thấy bàn" });
    res.json(data);
  } catch (err) { next(err); }
};

export const updateStatus = async (req, res, next) => {
  try {
    const { trang_thai } = await updateStatusSchema.validateAsync(req.body);
    const data = await svc.setStatus(req.params.id, trang_thai);
    if (!data) return res.status(404).json({ message: "Không tìm thấy bàn" });
    res.json(data);
  } catch (err) { next(err); }
};

export const remove = async (req, res, next) => {
  try {
    const id = await svc.remove(req.params.id);
    if (!id) return res.status(404).json({ message: "Không tìm thấy bàn" });
    res.json({ id });
  } catch (err) { next(err); }
};
