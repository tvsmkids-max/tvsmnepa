"use strict";

const Joi = require("joi");

// ✅ RELAXED: Service handles the strict role checks (Admin 8+ chars, Class 5-digits)
const loginSchema = Joi.object({
  userId: Joi.string().required().messages({
    "any.required": "User ID is required",
  }),

  password: Joi.string().min(1).required().messages({
    "any.required": "Credential is required",
    "string.empty": "Credential cannot be empty",
  }),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    "any.required": "Current credential is required",
  }),

  // Optional: You could make this conditional based on role,
  // but it's cleaner to let the service enforce exact rules.
  newPassword: Joi.string().required().messages({
    "any.required": "New credential is required",
  }),

  confirmPassword: Joi.string()
    .valid(Joi.ref("newPassword"))
    .required()
    .messages({
      "any.only": "Credentials do not match",
      "any.required": "Please confirm your new credential",
    }),
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    "any.required": "Refresh token is required",
  }),
});

module.exports = { loginSchema, changePasswordSchema, refreshTokenSchema };
