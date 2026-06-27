"use strict";

const Joi = require("joi");

const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);

const markAttendanceSchema = Joi.object({
  class: objectId.required(),
  date: Joi.date().required(),
  records: Joi.array()
    .items(
      Joi.object({
        student: objectId.required(),
        status: Joi.string().valid("Present", "Absent").required(),
      }),
    )
    .min(1)
    .required(),
});

const editAttendanceSchema = Joi.object({
  status: Joi.string().valid("Present", "Absent").required(),
  editReason: Joi.string().trim().max(500).allow(""),
});

const bulkEditSchema = Joi.object({
  class: objectId.required(),
  date: Joi.date().required(),
  records: Joi.array()
    .items(
      Joi.object({
        student: objectId.required(),
        status: Joi.string().valid("Present", "Absent").required(),
      }),
    )
    .min(1)
    .required(),
  editReason: Joi.string().trim().max(500).allow(""),
});

const lockUnlockSchema = Joi.object({
  class: objectId.required(),
  date: Joi.date().required(),
});

const queryAttendanceSchema = Joi.object({
  class: objectId,
  student: objectId,
  date: Joi.date(),
  dateFrom: Joi.date(),
  dateTo: Joi.date(),
  session: objectId,
  status: Joi.string().valid("Present", "Absent"),
});

module.exports = {
  markAttendanceSchema,
  editAttendanceSchema,
  bulkEditSchema,
  lockUnlockSchema,
  queryAttendanceSchema,
};
