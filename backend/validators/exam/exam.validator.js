"use strict";

const Joi = require("joi");
const {
  EXAM_TYPE_LIST,
  EXAM_STATUS_LIST,
} = require("../../constants/examStatus");

const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);

const createExamSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  examType: Joi.string().valid(...EXAM_TYPE_LIST).required(),
  session: objectId.required().messages({
    "string.pattern.base": "Invalid session ID",
  }),
  startDate: Joi.date().iso().allow(null),
  endDate: Joi.date().iso().allow(null),
  instructions: Joi.string().trim().max(3000).allow(""),
  description: Joi.string().trim().max(500).allow(""),
});

const updateExamSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  examType: Joi.string().valid(...EXAM_TYPE_LIST),
  startDate: Joi.date().iso().allow(null),
  endDate: Joi.date().iso().allow(null),
  instructions: Joi.string().trim().max(3000).allow(""),
  description: Joi.string().trim().max(500).allow(""),
}).min(1);

const queryExamSchema = Joi.object({
  session: objectId,
  examType: Joi.string().valid(...EXAM_TYPE_LIST),
  status: Joi.string().valid(...EXAM_STATUS_LIST),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(200).default(50),
});

const changeStatusSchema = Joi.object({
  status: Joi.string().valid(...EXAM_STATUS_LIST).required(),
  reason: Joi.string().trim().max(500).allow(""),
});

const subjectSchema = Joi.object({
  name: Joi.string().trim().min(1).max(60).required(),
  maxMarks: Joi.number().min(1).max(1000).precision(2).required(),
  passingMarks: Joi.number().min(0).max(1000).precision(2).required(),
});

const classConfigSchema = Joi.object({
  classIds: Joi.array().items(objectId).min(1).max(100).unique().required(),
  subjects: Joi.array().items(subjectSchema).min(1).max(30).required(),
});

const auditQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(200).default(50),
});

const timetableEntrySchema = Joi.object({
  subjectName: Joi.string().trim().min(1).max(60).required(),
  date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required()
    .messages({ "string.pattern.base": "Date must be YYYY-MM-DD" }),
  startTime: Joi.string()
    .pattern(/^([01]\d|2[0-3]):[0-5]\d$/)
    .required()
    .messages({ "string.pattern.base": "Time must be HH:mm (24-hour)" }),
  endTime: Joi.string()
    .pattern(/^([01]\d|2[0-3]):[0-5]\d$/)
    .required()
    .messages({ "string.pattern.base": "Time must be HH:mm (24-hour)" }),
  remarks: Joi.string().trim().max(300).allow(""),
});

const saveTimetableSchema = Joi.object({
  entries: Joi.array().items(timetableEntrySchema).max(30).required(),
});

module.exports = {
  saveTimetableSchema,
  createExamSchema,
  updateExamSchema,
  queryExamSchema,
  changeStatusSchema,
  classConfigSchema,
  auditQuerySchema,
};
