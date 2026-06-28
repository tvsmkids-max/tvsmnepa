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
  bulkDeleteSchema,
} = require("../validators/student.validator");

const list = [
  validateQuery(queryStudentSchema),
  asyncHandler(async (req, res) => {
    const result = await studentService.list(req.query, req.user);
    return sendResponse(res).success({
      message: "Students fetched successfully",
      data: result.data,
      pagination: result.pagination,
    });
  }),
];

const getSections = asyncHandler(async (req, res) => {
  const sections = await studentService.getSections(req.user);
  return sendResponse(res).success({
    message: "Sections fetched",
    data: sections,
  });
});

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

const bulkDelete = [
  validateBody(bulkDeleteSchema),
  asyncHandler(async (req, res) => {
    const { ids, mode } = req.body;
    const result = await studentService.bulkDelete(ids, mode, req.user, req);
    return sendResponse(res).success({
      message:
        mode === "hard"
          ? `${result.deleted} students permanently deleted along with ${result.attendanceDeleted} attendance records`
          : `${result.deleted} students marked as inactive`,
      data: result,
    });
  }),
];

module.exports = {
  list,
  getSections,
  getById,
  create,
  update,
  updateStatus,
  remove,
  search,
  bulkDelete,
};
