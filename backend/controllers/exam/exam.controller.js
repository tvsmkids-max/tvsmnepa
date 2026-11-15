"use strict";

const examService = require("../../services/exam/exam.service");
const examAccess = require("../../services/exam/examAccess.service");
const examTimetable = require("../../services/exam/examTimetable.service");
const examRoll = require("../../services/exam/examRollNumber.service");
const examAdmit = require("../../services/exam/examAdmitCard.service");
const examMarks = require("../../services/exam/examMarks.service");
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
  saveTimetableSchema,
  updateRollNumberSchema,
  admitCardSchema,
  saveMarksSchema,
  reopenMarksSchema,
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

const getTimetable = asyncHandler(async (req, res) => {
  const data = await examTimetable.list(req.params.id, req.query.classId);
  return sendResponse(res).success({ message: "Timetable fetched", data });
});

const saveClassTimetable = [
  validateBody(saveTimetableSchema),
  asyncHandler(async (req, res) => {
    const data = await examTimetable.saveClass(
      req.params.id,
      req.params.classId,
      req.body.entries,
      req.user,
      req,
    );
    return sendResponse(res).success({
      message: data.warnings.length
        ? "Timetable saved with warnings"
        : "Timetable saved",
      data,
    });
  }),
];

const getRollNumbers = asyncHandler(async (req, res) => {
  const { classId } = req.query;
  if (!classId) {
    return sendResponse(res).badRequest({ message: "classId is required" });
  }
  const data = await examRoll.list(req.params.id, classId);
  return sendResponse(res).success({ message: "Roll numbers fetched", data });
});

const getMyRollNumbers = asyncHandler(async (req, res) => {
  const data = await examRoll.listForTeacher(req.user, req.params.id);
  return sendResponse(res).success({ message: "Roll numbers fetched", data });
});

const generateRollNumbers = asyncHandler(async (req, res) => {
  const data = await examRoll.generate(
    req.params.id,
    req.params.classId,
    req.user,
    req,
  );
  return sendResponse(res).success({ message: "Roll numbers assigned", data });
});

const updateRollNumber = [
  validateBody(updateRollNumberSchema),
  asyncHandler(async (req, res) => {
    const data = await examRoll.updateManual(
      req.params.id,
      req.params.classId,
      req.params.studentId,
      req.body,
      req.user,
      req,
    );
    return sendResponse(res).success({ message: "Roll number updated", data });
  }),
];

const buildAdmitCards = [
  validateBody(admitCardSchema),
  asyncHandler(async (req, res) => {
    const data = await examAdmit.build(req.params.id, req.body, req.user, req);
    return sendResponse(res).success({ message: "Admit card data ready", data });
  }),
];

const marksOverview = asyncHandler(async (req, res) => {
  const data = await examMarks.overview(req.user, req.params.id);
  return sendResponse(res).success({ message: "Marks overview fetched", data });
});

const marksSheet = asyncHandler(async (req, res) => {
  const data = await examMarks.sheet(req.user, req.params.id, req.params.subjectKey);
  return sendResponse(res).success({ message: "Marks sheet fetched", data });
});

const saveMarks = [
  validateBody(saveMarksSchema),
  asyncHandler(async (req, res) => {
    const data = await examMarks.save(
      req.user,
      req.params.id,
      req.params.subjectKey,
      req.body.entries,
      req,
    );
    return sendResponse(res).success({ message: "Marks saved as draft", data });
  }),
];

const submitMarks = asyncHandler(async (req, res) => {
  const data = await examMarks.submit(req.user, req.params.id, req);
  return sendResponse(res).success({ message: "Marks submitted to Admin", data });
});

const reopenMarks = [
  validateBody(reopenMarksSchema),
  asyncHandler(async (req, res) => {
    const data = await examMarks.reopen(
      req.params.id,
      req.params.classId,
      req.body,
      req.user,
      req,
    );
    return sendResponse(res).success({ message: "Marks entry reopened", data });
  }),
];

module.exports = {
  marksOverview,
  marksSheet,
  saveMarks,
  submitMarks,
  reopenMarks,
  buildAdmitCards,
  getRollNumbers,
  getMyRollNumbers,
  generateRollNumbers,
  updateRollNumber,
  getTimetable,
  saveClassTimetable,
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
