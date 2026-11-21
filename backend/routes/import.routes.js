"use strict";

const express = require("express");
const router = express.Router();
const multer = require("multer");
const importController = require("../controllers/import.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { adminOnly } = require("../middlewares/rbac.middleware");
const asyncHandler = require("../utils/asyncHandler");
const { sendResponse } = require("../utils/apiResponse");
const { readExcel, assertXlsxBuffer } = require("../utils/excelHelper");
const Class = require("../models/Class.model");
const Settings = require("../models/Settings.model");
const Student = require("../models/Student.model");

// ─── Multer Setup ─────────────────────────────────────────────
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
  // .xlsx ONLY. Legacy .xls is rejected explicitly (not silently accepted).
  fileFilter: (req, file, cb) => {
    const name = String(file.originalname || "").toLowerCase();
    const ext = name.includes(".") ? name.substring(name.lastIndexOf(".")) : "";

    const reject = (message) => {
      const err = new Error(message);
      err.statusCode = 400;
      cb(err, false);
    };

    if (ext === ".xls") {
      return reject(
        "Legacy .xls files are no longer supported. Open the file in Excel, save it as .xlsx (Excel Workbook), and upload again.",
      );
    }
    if (ext !== ".xlsx") {
      return reject("Only Excel .xlsx files are allowed");
    }
    cb(null, true);
  },
});

// ─── Verify the upload really is an .xlsx ZIP package ─────────
// Extension/MIME are client-controlled, so check the file's actual bytes.
const verifyXlsxUpload = (req, res, next) => {
  if (!req.file) return next(); // controllers return "Excel file is required"
  try {
    assertXlsxBuffer(req.file.buffer);
    return next();
  } catch (err) {
    return sendResponse(res).badRequest({ message: err.message });
  }
};

const xlsxUpload = [upload.single("file"), verifyXlsxUpload];

// ─── Auth ─────────────────────────────────────────────────────
router.use(authenticate);
router.use(adminOnly);

// ─── Template Download ────────────────────────────────────────
router.get("/students/template", importController.downloadTemplate);

// ─── Validate Excel (Preview) ─────────────────────────────────
router.post(
  "/students/validate",
  ...xlsxUpload,
  importController.validateStudents,
);

// ─── Execute Import ───────────────────────────────────────────
router.post(
  "/students/execute",
  ...xlsxUpload,
  importController.executeImport,
);

// ─── Error Report Download ────────────────────────────────────
router.post("/students/error-report", importController.downloadErrorReport);

// ═══════════════════════════════════════════════════════════════
//  DEBUG ENDPOINT — Returns detailed info about uploaded file
//  Use this when troubleshooting import issues
//  USAGE: POST /api/v1/import/students/debug (with file)
// ═══════════════════════════════════════════════════════════════
router.post(
  "/students/debug",
  ...xlsxUpload,
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded",
      });
    }

    try {
      // Read Excel
      const rows = await readExcel(req.file.buffer);

      // Get system state
      const settings = await Settings.getSettings();
      const sessionId = settings?.activeSession?._id || settings?.activeSession;

      const allClasses = await Class.find({
        session: sessionId,
        isArchived: false,
      }).lean();

      const existingStudentCount = await Student.countDocuments({});
      const existingScholars = await Student.find({})
        .select("scholarNumber")
        .limit(5)
        .lean();

      // Analyze first 3 rows in detail
      const sampleRows = rows.slice(0, 3).map((row, idx) => ({
        rowNum: idx + 2,
        keys: Object.keys(row),
        values: row,
        types: Object.fromEntries(
          Object.entries(row).map(([k, v]) => [k, typeof v]),
        ),
      }));

      // Check expected headers
      const expectedHeaders = [
        "Scholar Number*",
        "Student Name*",
        "Father Name*",
        "Mother Name*",
        "Date of Birth* (DD/MM/YYYY)",
        "Gender* (Male/Female/Other)",
        "Address*",
        "Class Name*",
        "Section*",
        "Admission Date* (DD/MM/YYYY)",
      ];

      const firstRowKeys = rows[0] ? Object.keys(rows[0]) : [];
      const missingHeaders = expectedHeaders.filter(
        (h) => !firstRowKeys.includes(h),
      );
      const extraHeaders = firstRowKeys.filter(
        (h) => !expectedHeaders.includes(h) && h.includes("*"),
      );

      return res.json({
        success: true,
        file: {
          name: req.file.originalname,
          size: `${(req.file.size / 1024).toFixed(2)} KB`,
          mimeType: req.file.mimetype,
        },
        excel: {
          totalRows: rows.length,
          firstRowKeys,
          sampleRows,
          missingHeaders,
          extraHeaders,
        },
        system: {
          activeSessionId: sessionId?.toString() || null,
          activeSessionName:
            settings?.activeSession?.name ||
            (typeof settings?.activeSession === "object"
              ? settings.activeSession?.name
              : null),
          totalClasses: allClasses.length,
          classes: allClasses.map((c) => ({
            id: c._id.toString(),
            name: c.name,
            section: c.section,
            classKey: `${c.name.toUpperCase()}|${c.section.toUpperCase()}`,
          })),
          existingStudentCount,
          sampleExistingScholars: existingScholars.map((s) => s.scholarNumber),
        },
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: err.message,
        stack: err.stack?.split("\n").slice(0, 5),
      });
    }
  }),
);

module.exports = router;
