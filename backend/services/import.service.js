"use strict";

const Student = require("../models/Student.model");
const Class = require("../models/Class.model");
const Settings = require("../models/Settings.model");
const { parseIndianDate, readExcel } = require("../utils/excelHelper");
const { createAuditLog } = require("../middlewares/audit.middleware");
const logger = require("../utils/logger");

const throwError = (message, statusCode = 400) => {
  throw Object.assign(new Error(message), { statusCode });
};

const VALID_GENDERS = ["Male", "Female", "Other"];
const VALID_BLOOD_GROUPS = [
  "A+",
  "A-",
  "B+",
  "B-",
  "O+",
  "O-",
  "AB+",
  "AB-",
  "",
];
const VALID_CATEGORIES = ["General", "OBC", "SC", "ST", "EWS", ""];

class ImportService {
  /**
   * Validate Excel file and return preview with errors
   */
  async validateStudents(fileBuffer, user) {
    const settings = await Settings.getSettings();
    const sessionId = settings?.activeSession?._id || settings?.activeSession;
    if (!sessionId)
      throwError("No active session. Please activate a session first.", 400);

    // Read Excel
    let rows;
    try {
      rows = readExcel(fileBuffer);
    } catch (err) {
      throwError("Invalid Excel file format", 400);
    }

    if (rows.length === 0) {
      throwError("Excel file is empty", 400);
    }

    if (rows.length > 1000) {
      throwError("Too many rows. Maximum 1000 students per import.", 400);
    }

    // Load all existing scholars for duplicate check
    const existingScholars = await Student.find({})
      .select("scholarNumber")
      .lean();
    const existingScholarSet = new Set(
      existingScholars.map((s) => String(s.scholarNumber).toUpperCase()),
    );

    // Load all classes for reference
    const allClasses = await Class.find({
      session: sessionId,
      isArchived: false,
    }).lean();

    const classMap = new Map();
    allClasses.forEach((c) => {
      const key = `${String(c.name).toUpperCase()}|${String(c.section).toUpperCase()}`;
      classMap.set(key, c);
    });

    // Track duplicates within Excel itself
    const excelScholars = new Set();
    const excelClassRolls = new Map(); // 'classId-roll' tracking

    // Process each row
    const valid = [];
    const duplicates = [];
    const errors = [];

    rows.forEach((row, idx) => {
      const rowNum = idx + 2; // +2 because Excel row 1 is header, idx 0 is row 2
      const rowErrors = [];

      // Extract fields (handle different header variations)
      const scholarNumber = String(
        row["Scholar Number*"] || row["Scholar Number"] || "",
      )
        .trim()
        .toUpperCase();

      const name = String(
        row["Student Name*"] || row["Student Name"] || "",
      ).trim();
      const fatherName = String(
        row["Father Name*"] || row["Father Name"] || "",
      ).trim();
      const motherName = String(
        row["Mother Name*"] || row["Mother Name"] || "",
      ).trim();

      const dobRaw =
        row["Date of Birth* (DD/MM/YYYY)"] ||
        row["Date of Birth*"] ||
        row["Date of Birth"] ||
        "";
      const gender = String(
        row["Gender* (Male/Female/Other)"] ||
          row["Gender*"] ||
          row["Gender"] ||
          "",
      ).trim();
      const address = String(row["Address*"] || row["Address"] || "").trim();
      const className = String(row["Class Name*"] || row["Class Name"] || "")
        .trim()
        .toUpperCase();
      const section = String(row["Section*"] || row["Section"] || "")
        .trim()
        .toUpperCase();
      const admissionRaw =
        row["Admission Date* (DD/MM/YYYY)"] ||
        row["Admission Date*"] ||
        row["Admission Date"] ||
        "";

      const rollNumberRaw = String(row["Roll Number"] || "").trim();
      const mobile = String(row["Mobile"] || "").trim();
      const alternateMobile = String(row["Alternate Mobile"] || "").trim();
      const bloodGroup = String(row["Blood Group"] || "").trim();
      const category = String(row["Category"] || "").trim();
      const religion = String(row["Religion"] || "").trim();
      const aadharNumber = String(row["Aadhar Number"] || "").trim();

      // ───── VALIDATIONS ─────

      // Required fields
      if (!scholarNumber) rowErrors.push("Scholar Number is required");
      if (!name) rowErrors.push("Student Name is required");
      if (!fatherName) rowErrors.push("Father's Name is required");
      if (!motherName) rowErrors.push("Mother's Name is required");
      if (!address) rowErrors.push("Address is required");
      if (!className) rowErrors.push("Class Name is required");
      if (!section) rowErrors.push("Section is required");

      // DOB validation
      const dob = parseIndianDate(dobRaw);
      if (!dobRaw) {
        rowErrors.push("Date of Birth is required");
      } else if (!dob) {
        rowErrors.push("Invalid Date of Birth format. Use DD/MM/YYYY");
      } else if (dob > new Date()) {
        rowErrors.push("Date of Birth cannot be in the future");
      }

      // Admission Date validation
      const admissionDate = parseIndianDate(admissionRaw);
      if (!admissionRaw) {
        rowErrors.push("Admission Date is required");
      } else if (!admissionDate) {
        rowErrors.push("Invalid Admission Date format. Use DD/MM/YYYY");
      }

      // Gender validation
      if (!gender) {
        rowErrors.push("Gender is required");
      } else if (!VALID_GENDERS.includes(gender)) {
        rowErrors.push(`Invalid Gender. Must be: ${VALID_GENDERS.join(", ")}`);
      }

      // Mobile validation (optional)
      if (mobile && !/^[6-9]\d{9}$/.test(mobile)) {
        rowErrors.push("Mobile must be 10 digits starting with 6-9");
      }

      // Blood Group validation
      if (bloodGroup && !VALID_BLOOD_GROUPS.includes(bloodGroup)) {
        rowErrors.push(
          `Invalid Blood Group. Must be: ${VALID_BLOOD_GROUPS.filter((b) => b).join(", ")}`,
        );
      }

      // Category validation
      if (category && !VALID_CATEGORIES.includes(category)) {
        rowErrors.push(
          `Invalid Category. Must be: ${VALID_CATEGORIES.filter((c) => c).join(", ")}`,
        );
      }

      // Class existence check
      let classRef = null;
      if (className && section) {
        const classKey = `${className}|${section}`;
        classRef = classMap.get(classKey);
        if (!classRef) {
          rowErrors.push(
            `Class "${className}-${section}" does not exist. Create it first.`,
          );
        }
      }

      // Duplicate scholar in DB
      let isDuplicate = false;
      if (scholarNumber && existingScholarSet.has(scholarNumber)) {
        isDuplicate = true;
      }

      // Duplicate scholar within Excel
      if (scholarNumber && excelScholars.has(scholarNumber)) {
        rowErrors.push(`Duplicate Scholar Number "${scholarNumber}" in Excel`);
      } else if (scholarNumber) {
        excelScholars.add(scholarNumber);
      }

      // Build result object
      const result = {
        rowNum,
        scholarNumber,
        name,
        fatherName,
        motherName,
        className,
        section,
        dob,
        admissionDate,
        gender,
        address,
        mobile,
        alternateMobile,
        bloodGroup,
        category,
        religion,
        aadharNumber,
        rollNumber: rollNumberRaw,
        classRef,
        errors: rowErrors,
      };

      // Classify row
      if (rowErrors.length > 0) {
        errors.push({
          rowNum,
          scholarNumber: scholarNumber || "(empty)",
          name: name || "(empty)",
          errors: rowErrors.join("; "),
        });
      } else if (isDuplicate) {
        duplicates.push({
          rowNum,
          scholarNumber,
          name,
          reason: "Scholar Number already exists",
        });
      } else {
        valid.push(result);
      }
    });

    return {
      total: rows.length,
      valid: valid.length,
      duplicates: duplicates.length,
      errors: errors.length,
      validRows: valid,
      duplicateRows: duplicates,
      errorRows: errors,
    };
  }

  /**
   * Execute bulk import — only inserts valid rows
   */
  async executeImport(fileBuffer, user, req) {
    const settings = await Settings.getSettings();
    const sessionId = settings?.activeSession?._id || settings?.activeSession;
    if (!sessionId) throwError("No active session", 400);

    // Re-validate to get fresh state
    const validation = await this.validateStudents(fileBuffer, user);

    if (validation.valid === 0) {
      throwError(
        "No valid rows to import. Please fix errors and try again.",
        400,
      );
    }

    // Get next roll numbers per class
    const classIds = [
      ...new Set(validation.validRows.map((r) => r.classRef._id.toString())),
    ];

    // Find max roll numbers per class
    const rollMaxes = {};
    for (const cid of classIds) {
      const maxRoll = await Student.find({ class: cid })
        .select("rollNumber")
        .lean();

      // Convert to numbers and find max
      const numericRolls = maxRoll
        .map((s) => parseInt(s.rollNumber, 10))
        .filter((n) => !isNaN(n));
      rollMaxes[cid] = numericRolls.length > 0 ? Math.max(...numericRolls) : 0;
    }

    // Track per-class roll counter for this import
    const classRollCounter = { ...rollMaxes };

    // Prepare student documents
    const studentDocs = [];
    const usedRollsInClass = {}; // Track explicit rolls in Excel

    for (const row of validation.validRows) {
      const classId = row.classRef._id.toString();
      let rollNumber;

      if (row.rollNumber) {
        // User-provided roll
        rollNumber = String(row.rollNumber).trim();

        // Check if conflicts with another in this batch
        if (!usedRollsInClass[classId]) usedRollsInClass[classId] = new Set();

        if (usedRollsInClass[classId].has(rollNumber)) {
          // Conflict in same import — auto-generate next
          classRollCounter[classId]++;
          rollNumber = String(classRollCounter[classId]);
        }
        usedRollsInClass[classId].add(rollNumber);
      } else {
        // Auto-generate
        classRollCounter[classId]++;
        rollNumber = String(classRollCounter[classId]);

        if (!usedRollsInClass[classId]) usedRollsInClass[classId] = new Set();
        usedRollsInClass[classId].add(rollNumber);
      }

      studentDocs.push({
        scholarNumber: row.scholarNumber,
        rollNumber,
        name: row.name,
        fatherName: row.fatherName,
        motherName: row.motherName,
        mobile: row.mobile || "0000000000",
        alternateMobile: row.alternateMobile || "",
        dob: row.dob,
        gender: row.gender,
        address: row.address,
        class: row.classRef._id,
        section: row.classRef.section,
        session: sessionId,
        admissionDate: row.admissionDate,
        status: "Active",
        bloodGroup: row.bloodGroup || "",
        category: row.category || "",
        religion: row.religion || "",
        aadharNumber: row.aadharNumber || "",
        isActive: true,
        createdBy: user._id,
      });
    }

    // Bulk insert
    let imported = 0;
    let failed = 0;
    const insertErrors = [];

    try {
      const result = await Student.insertMany(studentDocs, {
        ordered: false, // Continue on individual errors
      });
      imported = result.length;
    } catch (err) {
      if (err.insertedDocs) {
        imported = err.insertedDocs.length;
        failed = studentDocs.length - imported;
      }

      if (err.writeErrors) {
        err.writeErrors.forEach((we) => {
          insertErrors.push({
            scholarNumber: studentDocs[we.index]?.scholarNumber || "?",
            error: we.errmsg || "Insert failed",
          });
        });
      }

      logger.error(`[Import] Some inserts failed: ${err.message}`);
    }

    // Audit log
    await createAuditLog({
      user,
      action: "IMPORT",
      module: "Student",
      description: `Imported ${imported} students via Excel (${validation.duplicates} duplicates skipped, ${validation.errors} errors)`,
      req,
    });

    return {
      total: validation.total,
      imported,
      failed,
      duplicatesSkipped: validation.duplicates,
      errorsSkipped: validation.errors,
      insertErrors,
    };
  }
}

module.exports = new ImportService();
