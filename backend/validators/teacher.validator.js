"use strict";

const Joi = require("joi");

const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);

const createTeacherSchema = Joi.object({
  employeeId: Joi.string().trim().uppercase().min(1).max(30).required(),
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string().min(8).required(),
  mobile: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .required()
    .messages({
      "string.pattern.base":
        "Mobile must be a 10-digit number starting with 6-9",
    }),
  alternateMobile: Joi.string().allow(""),
  gender: Joi.string().valid("Male", "Female", "Other").required(),
  dob: Joi.date().less("now").allow(null),
  qualification: Joi.string().trim().max(200).allow(""),
  designation: Joi.string().trim().max(100).default("Teacher"),
  joinDate: Joi.date().required(),
  address: Joi.string().trim().max(500).allow(""),
  assignedClasses: Joi.array().items(objectId).default([]),
  session: objectId.required(),
});

const updateTeacherSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  email: Joi.string().email().lowercase().trim(),
  mobile: Joi.string().pattern(/^[6-9]\d{9}$/),
  alternateMobile: Joi.string().allow(""),
  gender: Joi.string().valid("Male", "Female", "Other"),
  dob: Joi.date().less("now").allow(null),
  qualification: Joi.string().trim().max(200).allow(""),
  designation: Joi.string().trim().max(100),
  joinDate: Joi.date(),
  address: Joi.string().trim().max(500).allow(""),
  isActive: Joi.boolean(),
}).min(1);

const assignClassesSchema = Joi.object({
  assignedClasses: Joi.array().items(objectId).required(),
});

const queryTeacherSchema = Joi.object({
  session: objectId,
  isActive: Joi.boolean(),
  search: Joi.string().trim().allow(""),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(2000).default(20),
  sort: Joi.string().default("-createdAt"),
});

module.exports = {
  createTeacherSchema,
  updateTeacherSchema,
  assignClassesSchema,
  queryTeacherSchema,
};
