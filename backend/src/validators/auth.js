// backend/src/validators/auth.js
// Validation cho authentication

import Joi from 'joi';

// Schema cho đăng nhập
const loginSchema = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .required()
    .messages({
      'string.alphanum': 'Username chỉ được chứa chữ cái và số',
      'string.min': 'Username phải có ít nhất 3 ký tự',
      'string.max': 'Username không được quá 30 ký tự',
      'any.required': 'Username là bắt buộc'
    }),
  
  password: Joi.string()
    .min(6)
    .max(100)
    .required()
    .messages({
      'string.min': 'Mật khẩu phải có ít nhất 6 ký tự',
      'string.max': 'Mật khẩu không được quá 100 ký tự',
      'any.required': 'Mật khẩu là bắt buộc'
    })
});

// Schema cho đăng ký
const registerSchema = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .required()
    .messages({
      'string.alphanum': 'Username chỉ được chứa chữ cái và số',
      'string.min': 'Username phải có ít nhất 3 ký tự',
      'string.max': 'Username không được quá 30 ký tự',
      'any.required': 'Username là bắt buộc'
    }),
  
  password: Joi.string()
    .min(6)
    .max(100)
    .required()
    .messages({
      'string.min': 'Mật khẩu phải có ít nhất 6 ký tự',
      'string.max': 'Mật khẩu không được quá 100 ký tự',
      'any.required': 'Mật khẩu là bắt buộc'
    }),
  
  full_name: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Họ tên phải có ít nhất 2 ký tự',
      'string.max': 'Họ tên không được quá 100 ký tự',
      'any.required': 'Họ tên là bắt buộc'
    }),
  
  email: Joi.string()
    .email()
    .optional()
    .messages({
      'string.email': 'Email không hợp lệ'
    })
});

// Middleware validation
const validateLogin = (req, res, next) => {
  const { error } = loginSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: 'Dữ liệu không hợp lệ',
      details: error.details[0].message
    });
  }
  next();
};

const validateRegister = (req, res, next) => {
  const { error } = registerSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: 'Dữ liệu không hợp lệ',
      details: error.details[0].message
    });
  }
  next();
};

export {
  loginSchema,
  registerSchema,
  validateLogin,
  validateRegister
};
