"use strict";

const Joi = require("joi");
const { STUDENT_STATUS_LIST } = require("../constants/studentStatus");

const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);

const createStudentSchema = Joi.object({
  scholarNumber: Joi.string().trim().uppercase().min(1).max(30).required(),
  rollNumber: Joi.string().trim().min(1).max(20).required(),
  name: Joi.string().trim().min(2).max(100).required(),
  fatherName: Joi.string().trim().min(2).max(100).required(),
  motherName: Joi.string().trim().min(2).max(100).required(),
  mobile: Joi.string()
    .trim()
    .allow("")
    .optional()
    .pattern(/^[6-9]\d{9}$/)
    .messages({
      "string.pattern.base": "Mobile must be 10 digits starting with 6-9",
    }),
  alternateMobile: Joi.string().allow(""),
  dob: Joi.date().less("now").required(),
  gender: Joi.string().valid("Male", "Female", "Other").required(),
  address: Joi.string().trim().min(5).max(500).required(),
  class: objectId.required(),
  section: Joi.string().trim().required(),
  session: objectId.required(),
  admissionDate: Joi.date().required(),
  bloodGroup: Joi.string()
    .valid("A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-", "")
    .allow(""),
  category: Joi.string()
    .valid("General", "OBC", "SC", "ST", "EWS", "")
    .allow(""),
  religion: Joi.string().trim().allow(""),
  aadharNumber: Joi.string().trim().allow(""),
});

const updateStudentSchema = Joi.object({
  rollNumber: Joi.string().trim().min(1).max(20),
  name: Joi.string().trim().min(2).max(100),
  fatherName: Joi.string().trim().min(2).max(100),
  motherName: Joi.string().trim().min(2).max(100),
  mobile: Joi.string().pattern(/^[6-9]\d{9}$/),
  alternateMobile: Joi.string().allow(""),
  dob: Joi.date().less("now"),
  gender: Joi.string().valid("Male", "Female", "Other"),
  address: Joi.string().trim().min(5).max(500),
  class: objectId,
  section: Joi.string().trim(),
  bloodGroup: Joi.string()
    .valid("A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-", "")
    .allow(""),
  category: Joi.string()
    .valid("General", "OBC", "SC", "ST", "EWS", "")
    .allow(""),
  religion: Joi.string().trim().allow(""),
  aadharNumber: Joi.string().trim().allow(""),
}).min(1);

const updateStudentStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...STUDENT_STATUS_LIST)
    .required(),
  statusRemark: Joi.string()
    .trim()
    .max(500)
    .when("status", {
      is: "Inactive",
      then: Joi.required().messages({
        "any.required": "Remark is required when marking student as Inactive",
      }),
      otherwise: Joi.optional().allow(""),
    }),
  statusDate: Joi.date().default(() => new Date()),
});

const queryStudentSchema = Joi.object({
  session: objectId,
  class: objectId,
  section: Joi.string().trim(),
  status: Joi.string().valid(...STUDENT_STATUS_LIST),
  search: Joi.string().trim().allow(""),
  gender: Joi.string().valid("Male", "Female", "Other"),
  category: Joi.string().valid("General", "OBC", "SC", "ST", "EWS"),
  bloodGroup: Joi.string().valid(
    "A+",
    "A-",
    "B+",
    "B-",
    "O+",
    "O-",
    "AB+",
    "AB-",
  ),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(2000).default(24),
  sort: Joi.string().default("rollNumber"),
});

const bulkDeleteSchema = Joi.object({
  ids: Joi.array().items(objectId).min(1).max(100).required().messages({
    "array.min": "At least 1 student must be selected",
    "array.max": "Cannot delete more than 100 students at once",
    "any.required": "Student IDs are required",
  }),
  mode: Joi.string().valid("soft", "hard").required().messages({
    "any.only": "Mode must be either 'soft' or 'hard'",
    "any.required": "Delete mode is required",
  }),
});

module.exports = {
  createStudentSchema,
  updateStudentSchema,
  updateStudentStatusSchema,
  queryStudentSchema,
  bulkDeleteSchema,
};
