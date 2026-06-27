"use strict";

const express = require("express");
const router = express.Router();
const multer = require("multer");
const importController = require("../controllers/import.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { adminOnly } = require("../middlewares/rbac.middleware");

// Use memory storage (don't save file to disk)
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

router.use(authenticate);
router.use(adminOnly);

// Download Excel template
router.get("/students/template", importController.downloadTemplate);

// Validate Excel file (preview)
router.post(
  "/students/validate",
  upload.single("file"),
  importController.validateStudents,
);

// Execute the actual import
router.post(
  "/students/execute",
  upload.single("file"),
  importController.executeImport,
);

// Download error report
router.post("/students/error-report", importController.downloadErrorReport);

module.exports = router;
