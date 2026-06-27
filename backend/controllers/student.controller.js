"use strict";

const studentService = require("../services/student.service");
const { sendResponse } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const {
  validateBody,
  validateQuery,
} = require("../middlewares/validate.middleware");
const {
  createStudentSchema,
  updateStudentSchema,
  updateStudentStatusSchema,
  queryStudentSchema,
} = require("../validators/student.validator");

const list = [
  validateQuery(queryStudentSchema),
  asyncHandler(async (req, res) => {
    const result = await studentService.list(req.query, req.user); // ← pass req.user
    return sendResponse(res).success({
      message: "Students fetched successfully",
      data: result.data,
      pagination: result.pagination,
    });
  }),
];

const getById = asyncHandler(async (req, res) => {
  const student = await studentService.getById(req.params.id);
  return sendResponse(res).success({
    message: "Student fetched successfully",
    data: student,
  });
});

const create = [
  validateBody(createStudentSchema),
  asyncHandler(async (req, res) => {
    const student = await studentService.create(req.body, req.user, req);
    return sendResponse(res).created({
      message: "Student added successfully",
      data: student,
    });
  }),
];

const update = [
  validateBody(updateStudentSchema),
  asyncHandler(async (req, res) => {
    const student = await studentService.update(
      req.params.id,
      req.body,
      req.user,
      req,
    );
    return sendResponse(res).success({
      message: "Student updated successfully",
      data: student,
    });
  }),
];

const updateStatus = [
  validateBody(updateStudentStatusSchema),
  asyncHandler(async (req, res) => {
    const student = await studentService.updateStatus(
      req.params.id,
      req.body,
      req.user,
      req,
    );
    return sendResponse(res).success({
      message: "Student status updated successfully",
      data: student,
    });
  }),
];

const remove = asyncHandler(async (req, res) => {
  await studentService.delete(req.params.id, req.user, req);
  return sendResponse(res).success({
    message: "Student deleted successfully",
  });
});

const search = asyncHandler(async (req, res) => {
  const { q, session } = req.query;
  const students = await studentService.search(q, session);
  return sendResponse(res).success({
    message: "Search results",
    data: students,
  });
});

module.exports = {
  list,
  getById,
  create,
  update,
  updateStatus,
  remove,
  search,
};
