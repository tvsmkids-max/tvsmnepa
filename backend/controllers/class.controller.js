"use strict";

const classService = require("../services/class.service");
const { sendResponse } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const {
  validateBody,
  validateQuery,
} = require("../middlewares/validate.middleware");
const {
  createClassSchema,
  updateClassSchema,
  queryClassSchema,
} = require("../validators/class.validator");

const list = [
  validateQuery(queryClassSchema),
  asyncHandler(async (req, res) => {
    const result = await classService.list(req.query, req.user); // ← pass req.user
    return sendResponse(res).success({
      message: "Classes fetched successfully",
      data: result.data,
      pagination: result.pagination,
    });
  }),
];

const getById = asyncHandler(async (req, res) => {
  const cls = await classService.getById(req.params.id);
  return sendResponse(res).success({
    message: "Class fetched successfully",
    data: cls,
  });
});

const create = [
  validateBody(createClassSchema),
  asyncHandler(async (req, res) => {
    const cls = await classService.create(req.body, req.user, req);
    return sendResponse(res).created({
      message: "Class created successfully",
      data: cls,
    });
  }),
];

const update = [
  validateBody(updateClassSchema),
  asyncHandler(async (req, res) => {
    const cls = await classService.update(
      req.params.id,
      req.body,
      req.user,
      req,
    );
    return sendResponse(res).success({
      message: "Class updated successfully",
      data: cls,
    });
  }),
];

const remove = asyncHandler(async (req, res) => {
  await classService.delete(req.params.id, req.user, req);
  return sendResponse(res).success({
    message: "Class deleted successfully",
  });
});

const archive = asyncHandler(async (req, res) => {
  const { isArchived = true } = req.body;
  const cls = await classService.archive(
    req.params.id,
    isArchived,
    req.user,
    req,
  );
  return sendResponse(res).success({
    message: `Class ${isArchived ? "archived" : "unarchived"} successfully`,
    data: cls,
  });
});

module.exports = { list, getById, create, update, remove, archive };
