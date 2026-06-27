"use strict";

const holidayService = require("../services/holiday.service");
const { sendResponse } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { validateBody } = require("../middlewares/validate.middleware");
const {
  createHolidaySchema,
  updateHolidaySchema,
} = require("../validators/holiday.validator");

const list = asyncHandler(async (req, res) => {
  const data = await holidayService.list(req.query);
  return sendResponse(res).success({
    message: "Holidays fetched",
    data,
  });
});

const getById = asyncHandler(async (req, res) => {
  const data = await holidayService.getById(req.params.id);
  return sendResponse(res).success({
    message: "Holiday fetched",
    data,
  });
});

const create = [
  validateBody(createHolidaySchema),
  asyncHandler(async (req, res) => {
    const data = await holidayService.create(req.body, req.user, req);
    return sendResponse(res).created({
      message: "Holiday created",
      data,
    });
  }),
];

const update = [
  validateBody(updateHolidaySchema),
  asyncHandler(async (req, res) => {
    const data = await holidayService.update(
      req.params.id,
      req.body,
      req.user,
      req,
    );
    return sendResponse(res).success({
      message: "Holiday updated",
      data,
    });
  }),
];

const remove = asyncHandler(async (req, res) => {
  await holidayService.delete(req.params.id, req.user, req);
  return sendResponse(res).success({
    message: "Holiday deleted",
  });
});

const checkDate = asyncHandler(async (req, res) => {
  const data = await holidayService.checkDate(
    req.params.date,
    req.query.session,
  );
  return sendResponse(res).success({
    message: "Date checked",
    data,
  });
});

module.exports = { list, getById, create, update, remove, checkDate };
