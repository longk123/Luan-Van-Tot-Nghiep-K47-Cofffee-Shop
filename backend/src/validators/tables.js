// File path: D:\my-thesis\backend\src\validators/tables.js
import Joi from "joi";

export const createTableSchema = Joi.object({
  ten_ban: Joi.string().trim().min(1).max(100).required(),
  // khu_vuc có thể là INT (area ID) hoặc STRING (tên khu vực cũ)
  khu_vuc: Joi.alternatives().try(
    Joi.number().integer().positive(),
    Joi.string().trim().allow(null, "").max(100)
  ),
  suc_chua: Joi.number().integer().min(1).default(2),
  ghi_chu: Joi.string().allow(null, "").max(255),
});

export const updateTableSchema = Joi.object({
  ten_ban: Joi.string().trim().min(1).max(100),
  // khu_vuc có thể là INT (area ID) hoặc STRING (tên khu vực cũ)
  khu_vuc: Joi.alternatives().try(
    Joi.number().integer().positive(),
    Joi.string().trim().allow(null, "").max(100)
  ),
  suc_chua: Joi.number().integer().min(1),
  ghi_chu: Joi.string().allow(null, "").max(255),
}).min(1);

export const updateStatusSchema = Joi.object({
  trang_thai: Joi.string().valid("TRONG", "DANG_DUNG", "KHOA").required(),
});
