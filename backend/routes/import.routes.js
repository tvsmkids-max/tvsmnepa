"use strict";

const express = require("express");
const router = express.Router();
const multer = require("multer");
const importController = require("../controllers/import.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { adminOnly } = require("../middlewares/rbac.middleware");
const asyncHandler = require("../utils/asyncHandler");
const { readExcel } = require("../utils/excelHelper");
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
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
    ];

    const allowedExtensions = [".xlsx", ".xls"];
    const ext = file.originalname
      .toLowerCase()
      .substring(file.originalname.lastIndexOf("."));

    if (
      allowedMimes.includes(file.mimetype) ||
      allowedExtensions.includes(ext)
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only Excel files (.xlsx, .xls) are allowed"), false);
    }
  },
});

// ─── Auth ─────────────────────────────────────────────────────
router.use(authenticate);
router.use(adminOnly);

// ─── Template Download ────────────────────────────────────────
router.get("/students/template", importController.downloadTemplate);

// ─── Validate Excel (Preview) ─────────────────────────────────
router.post(
  "/students/validate",
  upload.single("file"),
  importController.validateStudents,
);

// ─── Execute Import ───────────────────────────────────────────
router.post(
  "/students/execute",
  upload.single("file"),
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
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded",
      });
    }

    try {
      // Read Excel
      const rows = readExcel(req.file.buffer);

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
