"use strict";

const Joi = require("joi");

const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);

const createClassSchema = Joi.object({
  name: Joi.string().trim().min(1).max(50).required(),
  section: Joi.string().trim().min(1).max(20).required(),
  session: objectId.required().messages({
    "string.pattern.base": "Invalid session ID",
  }),
  displayOrder: Joi.number().integer().min(0).default(0),
  description: Joi.string().trim().max(500).allow(""),
  teacherLabel: Joi.string().trim().max(100).allow("").optional(),
});

const updateClassSchema = Joi.object({
  name: Joi.string().trim().min(1).max(50),
  section: Joi.string().trim().min(1).max(20),
  displayOrder: Joi.number().integer().min(0),
  description: Joi.string().trim().max(500).allow(""),
  isArchived: Joi.boolean(),
  teacherLabel: Joi.string().trim().max(100).allow("").optional(),
}).min(1);

const queryClassSchema = Joi.object({
  session: objectId,
  isArchived: Joi.boolean(),
  classTeacher: objectId,
  all: Joi.boolean(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(2000).default(50),
  sort: Joi.string().default("displayOrder name section"),
});

module.exports = {
  createClassSchema,
  updateClassSchema,
  queryClassSchema,
};
