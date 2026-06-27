"use strict";

const Joi = require("joi");
const { HOLIDAY_TYPE_LIST } = require("../constants/holidayTypes");

const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);

const createHolidaySchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).required(),
  date: Joi.date().required(),
  endDate: Joi.date().min(Joi.ref("date")).allow(null),
  type: Joi.string()
    .valid(...HOLIDAY_TYPE_LIST)
    .required(),
  session: objectId.required(),
  description: Joi.string().trim().max(500).allow(""),
  allowAttendance: Joi.boolean().default(false),
});

const updateHolidaySchema = Joi.object({
  name: Joi.string().trim().min(1).max(200),
  date: Joi.date(),
  endDate: Joi.date().allow(null),
  type: Joi.string().valid(...HOLIDAY_TYPE_LIST),
  description: Joi.string().trim().max(500).allow(""),
  allowAttendance: Joi.boolean(),
}).min(1);

const queryHolidaySchema = Joi.object({
  session: objectId,
  type: Joi.string().valid(...HOLIDAY_TYPE_LIST),
  month: Joi.number().integer().min(1).max(12),
  year: Joi.number().integer().min(2020).max(2100),
});

module.exports = {
  createHolidaySchema,
  updateHolidaySchema,
  queryHolidaySchema,
};
