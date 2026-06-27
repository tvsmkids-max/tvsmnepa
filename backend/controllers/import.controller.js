"use strict";

const importService = require("../services/import.service");
const { sendResponse } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const {
  generateStudentTemplate,
  generateErrorReport,
} = require("../utils/excelHelper");

/**
 * Download Excel template for student import
 */
const downloadTemplate = asyncHandler(async (req, res) => {
  const buffer = generateStudentTemplate();

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="student-import-template.xlsx"',
  );

  return res.send(buffer);
});

/**
 * Validate uploaded Excel and return preview
 */
const validateStudents = asyncHandler(async (req, res) => {
  if (!req.file) {
    return sendResponse(res).badRequest({
      message: "Excel file is required",
    });
  }

  const result = await importService.validateStudents(
    req.file.buffer,
    req.user,
  );

  return sendResponse(res).success({
    message: "Validation complete",
    data: result,
  });
});

/**
 * Execute the actual import
 */
const executeImport = asyncHandler(async (req, res) => {
  if (!req.file) {
    return sendResponse(res).badRequest({
      message: "Excel file is required",
    });
  }

  const result = await importService.executeImport(
    req.file.buffer,
    req.user,
    req,
  );

  return sendResponse(res).success({
    message: `Imported ${result.imported} student${result.imported !== 1 ? "s" : ""} successfully`,
    data: result,
  });
});

/**
 * Download error report from last validation
 */
const downloadErrorReport = asyncHandler(async (req, res) => {
  const { errors } = req.body;

  if (!Array.isArray(errors) || errors.length === 0) {
    return sendResponse(res).badRequest({
      message: "No errors to download",
    });
  }

  const buffer = generateErrorReport(errors);

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="import-errors.xlsx"',
  );

  return res.send(buffer);
});

module.exports = {
  downloadTemplate,
  validateStudents,
  executeImport,
  downloadErrorReport,
};
