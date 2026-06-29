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

// ─── Constants ────────────────────────────────────────────────
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
const MAX_IMPORT_ROWS = 1000;

// ─── Header Mapping (handle multiple variations) ──────────────
const HEADER_MAP = {
  scholarNumber: [
    "Scholar Number*",
    "Scholar Number",
    "ScholarNumber",
    "Scholar No",
    "Scholar",
  ],
  name: ["Student Name*", "Student Name", "Name", "StudentName"],
  fatherName: ["Father Name*", "Father Name", "FatherName", "Father"],
  motherName: ["Mother Name*", "Mother Name", "MotherName", "Mother"],
  dob: [
    "Date of Birth* (DD/MM/YYYY)",
    "Date of Birth*",
    "Date of Birth",
    "DOB",
    "DateOfBirth",
  ],
  gender: ["Gender* (Male/Female/Other)", "Gender*", "Gender"],
  address: ["Address*", "Address"],
  className: ["Class Name*", "Class Name", "ClassName", "Class"],
  section: ["Section*", "Section"],
  admissionDate: [
    "Admission Date* (DD/MM/YYYY)",
    "Admission Date*",
    "Admission Date",
    "AdmissionDate",
  ],
  rollNumber: ["Roll Number", "RollNumber", "Roll No", "Roll"],
  mobile: ["Mobile", "Phone", "Contact", "MobileNumber"],
  alternateMobile: ["Alternate Mobile", "AlternateMobile", "Alt Mobile"],
  bloodGroup: ["Blood Group", "BloodGroup"],
  category: ["Category"],
  religion: ["Religion"],
  aadharNumber: ["Aadhar Number", "AadharNumber", "Aadhaar"],
};

/**
 * Extract field value from row using header variations
 */
function getFieldValue(row, fieldKey) {
  const variations = HEADER_MAP[fieldKey] || [];
  for (const headerName of variations) {
    if (
      row[headerName] !== undefined &&
      row[headerName] !== null &&
      row[headerName] !== ""
    ) {
      return String(row[headerName]).trim();
    }
  }
  return "";
}

class ImportService {
  /**
   * Validate Excel file and return preview with errors
   */
  async validateStudents(fileBuffer, user) {
    logger.info("[Import] ════════════════════════════════════");
    logger.info(`[Import] Validation started by ${user.email}`);

    // ─── Check active session ───
    const settings = await Settings.getSettings();
    const sessionId = settings?.activeSession?._id || settings?.activeSession;

    if (!sessionId) {
      logger.error("[Import] ❌ No active session set");
      throwError("No active session. Please activate a session first.", 400);
    }

    logger.info(`[Import] Active session: ${sessionId.toString()}`);

    // ─── Read Excel ───
    let rows;
    try {
      rows = readExcel(fileBuffer);
      logger.info(`[Import] Excel read: ${rows.length} rows`);
    } catch (err) {
      logger.error(`[Import] ❌ Excel parsing failed: ${err.message}`);
      throwError(`Invalid Excel file format: ${err.message}`, 400);
    }

    if (rows.length === 0) {
      throwError("Excel file is empty or has no data rows", 400);
    }

    if (rows.length > MAX_IMPORT_ROWS) {
      throwError(
        `Too many rows (${rows.length}). Maximum ${MAX_IMPORT_ROWS} students per import.`,
        400,
      );
    }

    // ─── Log first row for debugging ───
    if (rows[0]) {
      logger.info(
        `[Import] First row keys: ${Object.keys(rows[0]).join(", ")}`,
      );
      logger.info(`[Import] First row sample:`);
      const sample = {};
      ["scholarNumber", "name", "dob", "className", "section"].forEach(
        (key) => {
          sample[key] = getFieldValue(rows[0], key);
        },
      );
      logger.info(JSON.stringify(sample));
    }

    // ─── Load existing scholars (for duplicate check) ───
    const existingScholars = await Student.find({})
      .select("scholarNumber")
      .lean();
    const existingScholarSet = new Set(
      existingScholars.map((s) => String(s.scholarNumber).toUpperCase()),
    );
    logger.info(`[Import] Existing scholars in DB: ${existingScholars.length}`);

    // ─── Load classes for lookup ───
    const allClasses = await Class.find({
      session: sessionId,
      isArchived: false,
    }).lean();

    const classMap = new Map();
    allClasses.forEach((c) => {
      const key = `${String(c.name).toUpperCase().trim()}|${String(c.section).toUpperCase().trim()}`;
      classMap.set(key, c);
    });

    logger.info(`[Import] Available classes: ${allClasses.length}`);
    if (allClasses.length > 0) {
      logger.info(
        `[Import] Class keys: ${Array.from(classMap.keys()).slice(0, 5).join(", ")}${classMap.size > 5 ? "..." : ""}`,
      );
    } else {
      logger.warn("[Import] ⚠️  No classes found for active session!");
    }

    // ─── Track duplicates within Excel ───
    const excelScholars = new Set();

    // ─── Process rows ───
    const valid = [];
    const duplicates = [];
    const errors = [];

    rows.forEach((row, idx) => {
      const rowNum = idx + 2; // +2: row 1 is header, idx starts at 0
      const rowErrors = [];

      // Extract all fields
      const scholarNumber = getFieldValue(row, "scholarNumber").toUpperCase();
      const name = getFieldValue(row, "name");
      const fatherName = getFieldValue(row, "fatherName");
      const motherName = getFieldValue(row, "motherName");
      const dobRaw = getFieldValue(row, "dob");
      const gender = getFieldValue(row, "gender");
      const address = getFieldValue(row, "address");
      const className = getFieldValue(row, "className").toUpperCase();
      const section = getFieldValue(row, "section").toUpperCase();
      const admissionRaw = getFieldValue(row, "admissionDate");
      const rollNumberRaw = getFieldValue(row, "rollNumber");
      const mobile = getFieldValue(row, "mobile");
      const alternateMobile = getFieldValue(row, "alternateMobile");
      const bloodGroup = getFieldValue(row, "bloodGroup");
      const category = getFieldValue(row, "category");
      const religion = getFieldValue(row, "religion");
      const aadharNumber = getFieldValue(row, "aadharNumber");

      // ─── Required field validation ───
      if (!scholarNumber) rowErrors.push("Scholar Number is required");
      if (!name) rowErrors.push("Student Name is required");
      if (!fatherName) rowErrors.push("Father's Name is required");
      if (!motherName) rowErrors.push("Mother's Name is required");
      if (!address) rowErrors.push("Address is required");
      if (!className) rowErrors.push("Class Name is required");
      if (!section) rowErrors.push("Section is required");

      // ─── DOB validation ───
      let dob = null;
      if (!dobRaw) {
        rowErrors.push("Date of Birth is required");
      } else {
        try {
          dob = parseIndianDate(dobRaw);
          if (!dob) {
            rowErrors.push(
              `Invalid Date of Birth: "${dobRaw}". Use DD/MM/YYYY (e.g., 15/03/2010)`,
            );
          } else if (dob > new Date()) {
            rowErrors.push(
              `Date of Birth "${dobRaw}" is in the future. Check the year.`,
            );
          }
        } catch (err) {
          rowErrors.push(`Date of Birth parsing error: ${err.message}`);
        }
      }

      // ─── Admission Date validation ───
      let admissionDate = null;
      if (!admissionRaw) {
        rowErrors.push("Admission Date is required");
      } else {
        try {
          admissionDate = parseIndianDate(admissionRaw);
          if (!admissionDate) {
            rowErrors.push(
              `Invalid Admission Date: "${admissionRaw}". Use DD/MM/YYYY (e.g., 01/04/2024)`,
            );
          }
        } catch (err) {
          rowErrors.push(`Admission Date parsing error: ${err.message}`);
        }
      }

      // ─── Gender validation ───
      if (!gender) {
        rowErrors.push("Gender is required");
      } else if (!VALID_GENDERS.includes(gender)) {
        rowErrors.push(
          `Invalid Gender "${gender}". Must be: ${VALID_GENDERS.join(", ")}`,
        );
      }

      // ─── Mobile validation (optional) ───
      if (mobile && !/^[6-9]\d{9}$/.test(mobile)) {
        rowErrors.push(
          `Invalid Mobile "${mobile}". Must be 10 digits starting with 6-9`,
        );
      }

      // ─── Blood Group validation ───
      if (bloodGroup && !VALID_BLOOD_GROUPS.includes(bloodGroup)) {
        rowErrors.push(
          `Invalid Blood Group "${bloodGroup}". Must be: ${VALID_BLOOD_GROUPS.filter((b) => b).join(", ")}`,
        );
      }

      // ─── Category validation ───
      if (category && !VALID_CATEGORIES.includes(category)) {
        rowErrors.push(
          `Invalid Category "${category}". Must be: ${VALID_CATEGORIES.filter((c) => c).join(", ")}`,
        );
      }

      // ─── Class existence check ───
      let classRef = null;
      if (className && section) {
        const classKey = `${className}|${section}`;
        classRef = classMap.get(classKey);
        if (!classRef) {
          const availableClasses = Array.from(classMap.keys())
            .slice(0, 5)
            .join(", ");
          rowErrors.push(
            `Class "${className}-${section}" not found. Available: ${availableClasses || "none"}`,
          );
        }
      }

      // ─── Duplicate scholar check (in DB) ───
      let isDuplicate = false;
      if (scholarNumber && existingScholarSet.has(scholarNumber)) {
        isDuplicate = true;
      }

      // ─── Duplicate within Excel ───
      if (scholarNumber && excelScholars.has(scholarNumber)) {
        rowErrors.push(
          `Duplicate Scholar Number "${scholarNumber}" in Excel file`,
        );
      } else if (scholarNumber) {
        excelScholars.add(scholarNumber);
      }

      // ─── Build result ───
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

      // ─── Classify row ───
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
          reason: "Scholar Number already exists in database",
        });
      } else {
        valid.push(result);
      }
    });

    // ─── Log summary ───
    logger.info(`[Import] Validation complete:`);
    logger.info(`[Import]   ✓ Valid: ${valid.length}`);
    logger.info(`[Import]   ⊘ Duplicates: ${duplicates.length}`);
    logger.info(`[Import]   ✗ Errors: ${errors.length}`);

    if (errors.length > 0) {
      logger.warn(`[Import] First 3 errors:`);
      errors.slice(0, 3).forEach((e) => {
        logger.warn(
          `[Import]   Row ${e.rowNum} (${e.scholarNumber}): ${e.errors}`,
        );
      });
    }

    logger.info("[Import] ════════════════════════════════════");

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
    logger.info("[Import] ════════════════════════════════════");
    logger.info(`[Import] Execute started by ${user.email}`);

    // Get session
    const settings = await Settings.getSettings();
    const sessionId = settings?.activeSession?._id || settings?.activeSession;
    if (!sessionId) throwError("No active session", 400);

    // Validate first
    const validation = await this.validateStudents(fileBuffer, user);

    logger.info(`[Import] Validation result:`);
    logger.info(`[Import]   Total: ${validation.total}`);
    logger.info(`[Import]   Valid: ${validation.valid}`);
    logger.info(`[Import]   Duplicates: ${validation.duplicates}`);
    logger.info(`[Import]   Errors: ${validation.errors}`);

    // ─── If nothing valid, throw with helpful message ───
    if (validation.valid === 0) {
      let message = "No valid rows to import. ";

      if (validation.errors > 0) {
        message += `${validation.errors} rows have errors. `;
      }
      if (validation.duplicates > 0) {
        message += `${validation.duplicates} are duplicates. `;
      }

      // Include first error for context
      if (validation.errorRows.length > 0) {
        const first = validation.errorRows[0];
        message += `First error (row ${first.rowNum}): ${first.errors}`;
      }

      logger.error(`[Import] ❌ ${message}`);
      throwError(message, 400);
    }

    // ─── Get next roll numbers per class ───
    const classIds = [
      ...new Set(validation.validRows.map((r) => r.classRef._id.toString())),
    ];

    const rollMaxes = {};
    for (const cid of classIds) {
      const existing = await Student.find({ class: cid })
        .select("rollNumber")
        .lean();

      const numericRolls = existing
        .map((s) => parseInt(s.rollNumber, 10))
        .filter((n) => !isNaN(n));
      rollMaxes[cid] = numericRolls.length > 0 ? Math.max(...numericRolls) : 0;
    }

    const classRollCounter = { ...rollMaxes };
    const usedRollsInClass = {};

    // ─── Prepare student documents ───
    const studentDocs = validation.validRows.map((row) => {
      const classId = row.classRef._id.toString();
      let rollNumber;

      if (row.rollNumber) {
        // User-provided roll
        rollNumber = String(row.rollNumber).trim();

        if (!usedRollsInClass[classId]) usedRollsInClass[classId] = new Set();

        // If duplicate in this import, auto-generate
        if (usedRollsInClass[classId].has(rollNumber)) {
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

      return {
        scholarNumber: row.scholarNumber,
        rollNumber,
        name: row.name,
        fatherName: row.fatherName,
        motherName: row.motherName,
        mobile: row.mobile || "", // ← Empty string if blank
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
      };
    });

    logger.info(`[Import] Prepared ${studentDocs.length} student documents`);

    // ─── Bulk insert ───
    let imported = 0;
    let failed = 0;
    const insertErrors = [];

    try {
      const result = await Student.insertMany(studentDocs, {
        ordered: false, // Continue on errors
      });
      imported = result.length;
      logger.info(`[Import] ✅ Inserted ${imported} students successfully`);
    } catch (err) {
      logger.error(`[Import] ⚠️  insertMany error: ${err.message}`);

      // Handle partial success
      if (err.insertedDocs) {
        imported = err.insertedDocs.length;
        failed = studentDocs.length - imported;
      } else if (err.result?.insertedCount !== undefined) {
        imported = err.result.insertedCount;
        failed = studentDocs.length - imported;
      } else {
        imported = 0;
        failed = studentDocs.length;
      }

      // Collect error details
      if (err.writeErrors && Array.isArray(err.writeErrors)) {
        err.writeErrors.slice(0, 10).forEach((we) => {
          const idx = we.index;
          insertErrors.push({
            row: idx + 2,
            scholarNumber: studentDocs[idx]?.scholarNumber || "?",
            name: studentDocs[idx]?.name || "?",
            error: we.errmsg || we.message || "Insert failed",
            code: we.code,
          });
        });
      }

      logger.warn(`[Import] Imported: ${imported}, Failed: ${failed}`);
    }

    // ─── Audit log ───
    await createAuditLog({
      user,
      action: "IMPORT",
      module: "Student",
      description: `Imported ${imported}/${validation.total} students via Excel (${validation.duplicates} duplicates, ${validation.errors} errors, ${failed} failed)`,
      req,
    });

    logger.info("[Import] ════════════════════════════════════");

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
