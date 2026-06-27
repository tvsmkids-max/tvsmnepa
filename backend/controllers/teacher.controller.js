"use strict";

const teacherService = require("../services/teacher.service");
const { sendResponse } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const {
  validateBody,
  validateQuery,
} = require("../middlewares/validate.middleware");
const {
  createTeacherSchema,
  updateTeacherSchema,
  assignClassesSchema,
  queryTeacherSchema,
} = require("../validators/teacher.validator");

const list = [
  validateQuery(queryTeacherSchema),
  asyncHandler(async (req, res) => {
    const result = await teacherService.list(req.query);
    return sendResponse(res).success({
      message: "Teachers fetched successfully",
      data: result.data,
      pagination: result.pagination,
    });
  }),
];

const getById = asyncHandler(async (req, res) => {
  const teacher = await teacherService.getById(req.params.id);
  return sendResponse(res).success({
    message: "Teacher fetched successfully",
    data: teacher,
  });
});

const create = [
  validateBody(createTeacherSchema),
  asyncHandler(async (req, res) => {
    const teacher = await teacherService.create(req.body, req.user, req);
    return sendResponse(res).created({
      message: "Teacher created successfully",
      data: teacher,
    });
  }),
];

const update = [
  validateBody(updateTeacherSchema),
  asyncHandler(async (req, res) => {
    const teacher = await teacherService.update(
      req.params.id,
      req.body,
      req.user,
      req,
    );
    return sendResponse(res).success({
      message: "Teacher updated successfully",
      data: teacher,
    });
  }),
];

const remove = asyncHandler(async (req, res) => {
  await teacherService.delete(req.params.id, req.user, req);
  return sendResponse(res).success({
    message: "Teacher deleted successfully",
  });
});

const assignClasses = [
  validateBody(assignClassesSchema),
  asyncHandler(async (req, res) => {
    const teacher = await teacherService.assignClasses(
      req.params.id,
      req.body.assignedClasses,
      req.user,
      req,
    );
    return sendResponse(res).success({
      message: "Classes assigned successfully",
      data: teacher,
    });
  }),
];

const resetPassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 8) {
    return sendResponse(res).badRequest({
      message: "Password must be at least 8 characters",
    });
  }

  const result = await teacherService.resetPassword(
    req.params.id,
    newPassword,
    req.user,
    req,
  );

  return sendResponse(res).success({
    message: result.message,
  });
});

const getMyProfile = asyncHandler(async (req, res) => {
  const teacher = await teacherService.getMyProfile(req.user._id);
  return sendResponse(res).success({
    message: "My profile fetched",
    data: teacher,
  });
});
module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  assignClasses,
  resetPassword,
  getMyProfile,
};
