"use strict";

const examService = require("../../services/exam/exam.service");
const examAccess = require("../../services/exam/examAccess.service");
const { sendResponse } = require("../../utils/apiResponse");
const asyncHandler = require("../../utils/asyncHandler");
const {
  validateBody,
  validateQuery,
} = require("../../middlewares/validate.middleware");
const {
  createExamSchema,
  updateExamSchema,
  queryExamSchema,
  changeStatusSchema,
  classConfigSchema,
  auditQuerySchema,
} = require("../../validators/exam/exam.validator");

const list = [
  validateQuery(queryExamSchema),
  asyncHandler(async (req, res) => {
    const result = await examService.list(req.query);
    return sendResponse(res).success({
      message: "Examinations fetched successfully",
      data: result.data,
      pagination: result.pagination,
    });
  }),
];

const getById = asyncHandler(async (req, res) => {
  const data = await examService.getById(req.params.id);
  return sendResponse(res).success({
    message: "Examination fetched successfully",
    data,
  });
});

const create = [
  validateBody(createExamSchema),
  asyncHandler(async (req, res) => {
    const data = await examService.create(req.body, req.user, req);
    return sendResponse(res).created({
      message: "Examination created successfully",
      data,
    });
  }),
];

const update = [
  validateBody(updateExamSchema),
  asyncHandler(async (req, res) => {
    const data = await examService.update(
      req.params.id,
      req.body,
      req.user,
      req,
    );
    return sendResponse(res).success({
      message: "Examination updated successfully",
      data,
    });
  }),
];

const changeStatus = [
  validateBody(changeStatusSchema),
  asyncHandler(async (req, res) => {
    const data = await examService.changeStatus(
      req.params.id,
      req.body,
      req.user,
      req,
    );
    return sendResponse(res).success({
      message: "Examination status updated",
      data,
    });
  }),
];

const remove = asyncHandler(async (req, res) => {
  await examService.remove(req.params.id, req.user, req);
  return sendResponse(res).success({ message: "Examination deleted" });
});

const listClassConfigs = asyncHandler(async (req, res) => {
  const data = await examService.listClassConfigs(req.params.id);
  return sendResponse(res).success({
    message: "Class configurations fetched",
    data,
  });
});

const upsertClassConfigs = [
  validateBody(classConfigSchema),
  asyncHandler(async (req, res) => {
    const data = await examService.upsertClassConfigs(
      req.params.id,
      req.body,
      req.user,
      req,
    );
    return sendResponse(res).success({
      message: `Configuration saved for ${data.length} class${data.length !== 1 ? "es" : ""}`,
      data,
    });
  }),
];

const removeClassConfig = asyncHandler(async (req, res) => {
  await examService.removeClassConfig(
    req.params.id,
    req.params.classId,
    req.user,
    req,
  );
  return sendResponse(res).success({ message: "Class removed from examination" });
});

const listAudit = [
  validateQuery(auditQuerySchema),
  asyncHandler(async (req, res) => {
    const result = await examService.listAudit(req.params.id, req.query);
    return sendResponse(res).success({
      message: "Audit history fetched",
      data: result.data,
      pagination: result.pagination,
    });
  }),
];

const listMine = asyncHandler(async (req, res) => {
  const data = await examAccess.listMine(req.user);
  return sendResponse(res).success({
    message: "Examinations fetched successfully",
    data,
  });
});

const getMine = asyncHandler(async (req, res) => {
  const data = await examAccess.getMine(req.user, req.params.id);
  return sendResponse(res).success({
    message: "Examination fetched successfully",
    data,
  });
});

module.exports = {
  listMine,
  getMine,
  list,
  getById,
  create,
  update,
  changeStatus,
  remove,
  listClassConfigs,
  upsertClassConfigs,
  removeClassConfig,
  listAudit,
};
