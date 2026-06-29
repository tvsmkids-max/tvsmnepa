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

    let rows;
    try {
      rows = readExcel(fileBuffer);
    } catch (err) {
      throwError("Invalid Excel file format", 400);
    }

    console.log(`[Import] Read ${rows.length} rows from Excel`);

    if (rows.length === 0) {
      throwError("Excel file is empty", 400);
    }

    // ─── KEY FIX: Filter out completely empty rows ───
    const nonEmptyRows = rows.filter((row) => {
      // Check if row has ANY meaningful content
      const hasContent = Object.values(row).some(
        (val) => val !== null && val !== undefined && String(val).trim() !== "",
      );
      return hasContent;
    });

    console.log(`[Import] After filter: ${nonEmptyRows.length} non-empty rows`);

    if (nonEmptyRows.length === 0) {
      throwError(
        "Excel file has no data rows. Please add students to the template.",
        400,
      );
    }

    if (nonEmptyRows.length > 1000) {
      throwError("Too many rows. Maximum 1000 students per import.", 400);
    }

    const existingScholars = await Student.find({})
      .select("scholarNumber")
      .lean();
    const existingScholarSet = new Set(
      existingScholars.map((s) => String(s.scholarNumber).toUpperCase()),
    );

    const allClasses = await Class.find({
      session: sessionId,
      isArchived: false,
    }).lean();

    const classMap = new Map();
    allClasses.forEach((c) => {
      const key = `${String(c.name).toUpperCase().trim()}|${String(c.section).toUpperCase().trim()}`;
      classMap.set(key, c);
    });

    console.log(`[Import] Available classes:`, Array.from(classMap.keys()));

    const excelScholars = new Set();
    const valid = [];
    const duplicates = [];
    const errors = [];

    nonEmptyRows.forEach((row, idx) => {
      const rowNum = idx + 2;
      const rowErrors = [];

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

      // Required fields
      if (!scholarNumber) rowErrors.push("Scholar Number is required");
      if (!name) rowErrors.push("Student Name is required");
      if (!fatherName) rowErrors.push("Father's Name is required");
      if (!motherName) rowErrors.push("Mother's Name is required");
      if (!address) rowErrors.push("Address is required");
      if (!className) rowErrors.push("Class Name is required");
      if (!section) rowErrors.push("Section is required");

      // Try parsing dates safely
      let dob = null;
      try {
        dob = parseIndianDate(dobRaw);
      } catch (e) {
        // ignore, dob stays null
      }

      if (!dobRaw) {
        rowErrors.push("Date of Birth is required");
      } else if (!dob) {
        rowErrors.push("Invalid Date of Birth format. Use DD/MM/YYYY");
      } else if (dob > new Date()) {
        rowErrors.push("Date of Birth cannot be in the future");
      }

      let admissionDate = null;
      try {
        admissionDate = parseIndianDate(admissionRaw);
      } catch (e) {
        // ignore
      }

      if (!admissionRaw) {
        rowErrors.push("Admission Date is required");
      } else if (!admissionDate) {
        rowErrors.push("Invalid Admission Date format. Use DD/MM/YYYY");
      }

      if (!gender) {
        rowErrors.push("Gender is required");
      } else if (!VALID_GENDERS.includes(gender)) {
        rowErrors.push(`Invalid Gender. Must be: ${VALID_GENDERS.join(", ")}`);
      }

      if (mobile && !/^[6-9]\d{9}$/.test(mobile)) {
        rowErrors.push("Mobile must be 10 digits starting with 6-9");
      }

      if (bloodGroup && !VALID_BLOOD_GROUPS.includes(bloodGroup)) {
        rowErrors.push(
          `Invalid Blood Group. Must be: ${VALID_BLOOD_GROUPS.filter((b) => b).join(", ")}`,
        );
      }

      if (category && !VALID_CATEGORIES.includes(category)) {
        rowErrors.push(
          `Invalid Category. Must be: ${VALID_CATEGORIES.filter((c) => c).join(", ")}`,
        );
      }

      let classRef = null;
      if (className && section) {
        const classKey = `${className}|${section}`;
        classRef = classMap.get(classKey);
        if (!classRef) {
          rowErrors.push(
            `Class "${className}-${section}" does not exist. Available: ${Array.from(classMap.keys()).slice(0, 3).join(", ")}...`,
          );
        }
      }

      let isDuplicate = false;
      if (scholarNumber && existingScholarSet.has(scholarNumber)) {
        isDuplicate = true;
      }

      if (scholarNumber && excelScholars.has(scholarNumber)) {
        rowErrors.push(`Duplicate Scholar Number "${scholarNumber}" in Excel`);
      } else if (scholarNumber) {
        excelScholars.add(scholarNumber);
      }

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

    console.log(
      `[Import] Validation complete: ${valid.length} valid, ${duplicates.length} duplicates, ${errors.length} errors`,
    );

    // Log first 3 errors to help debug
    if (errors.length > 0) {
      console.log("[Import] Sample errors:");
      errors.slice(0, 3).forEach((e) => {
        console.log(`  Row ${e.rowNum}: ${e.errors}`);
      });
    }

    return {
      total: nonEmptyRows.length, // ← Use filtered count, not raw count
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
   * WITH DETAILED LOGGING for debugging
   */
  async executeImport(fileBuffer, user, req) {
    console.log("\n[Import] ═══════════════════════════════════");
    console.log("[Import] Starting executeImport...");

    const settings = await Settings.getSettings();
    const sessionId = settings?.activeSession?._id || settings?.activeSession;

    console.log("[Import] Active session ID:", sessionId?.toString() || "NONE");
    if (!sessionId) throwError("No active session", 400);

    // Re-validate to get fresh state
    const validation = await this.validateStudents(fileBuffer, user);

    console.log("[Import] Validation result:");
    console.log("  Total rows:", validation.total);
    console.log("  Valid rows:", validation.valid);
    console.log("  Duplicates:", validation.duplicates);
    console.log("  Errors:", validation.errors);

    if (validation.valid === 0) {
      console.log("[Import] ❌ No valid rows to import");
      console.log(
        "[Import] Sample errors:",
        JSON.stringify(validation.errorRows.slice(0, 3), null, 2),
      );
      console.log(
        "[Import] Sample duplicates:",
        JSON.stringify(validation.duplicateRows.slice(0, 3), null, 2),
      );
      throwError(
        `No valid rows to import. ${validation.errors} have errors, ${validation.duplicates} are duplicates.`,
        400,
      );
    }

    console.log("[Import] ✅ Have", validation.valid, "valid rows to insert");

    // Get next roll numbers per class
    const classIds = [
      ...new Set(validation.validRows.map((r) => r.classRef._id.toString())),
    ];

    console.log("[Import] Classes involved:", classIds.length);

    const rollMaxes = {};
    for (const cid of classIds) {
      const maxRoll = await Student.find({ class: cid })
        .select("rollNumber")
        .lean();

      const numericRolls = maxRoll
        .map((s) => parseInt(s.rollNumber, 10))
        .filter((n) => !isNaN(n));
      rollMaxes[cid] = numericRolls.length > 0 ? Math.max(...numericRolls) : 0;
    }

    const classRollCounter = { ...rollMaxes };
    const studentDocs = [];
    const usedRollsInClass = {};

    for (const row of validation.validRows) {
      const classId = row.classRef._id.toString();
      let rollNumber;

      if (row.rollNumber) {
        rollNumber = String(row.rollNumber).trim();
        if (!usedRollsInClass[classId]) usedRollsInClass[classId] = new Set();
        if (usedRollsInClass[classId].has(rollNumber)) {
          classRollCounter[classId]++;
          rollNumber = String(classRollCounter[classId]);
        }
        usedRollsInClass[classId].add(rollNumber);
      } else {
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

    console.log("[Import] Prepared", studentDocs.length, "student documents");
    console.log("[Import] Sample document (first 1):");
    console.log(JSON.stringify(studentDocs[0], null, 2));

    // ─── BULK INSERT WITH DETAILED ERROR HANDLING ───
    let imported = 0;
    let failed = 0;
    const insertErrors = [];

    try {
      console.log("[Import] Calling Student.insertMany()...");
      const result = await Student.insertMany(studentDocs, {
        ordered: false,
        rawResult: false,
      });

      imported = result.length;
      console.log("[Import] ✅ SUCCESS: Inserted", imported, "students");
    } catch (err) {
      console.log("[Import] ⚠️  insertMany threw error:");
      console.log("[Import] Error name:", err.name);
      console.log("[Import] Error code:", err.code);
      console.log("[Import] Error message:", err.message);
      console.log("[Import] Has insertedDocs?", !!err.insertedDocs);
      console.log(
        "[Import] insertedDocs length:",
        err.insertedDocs?.length || 0,
      );
      console.log("[Import] Has writeErrors?", !!err.writeErrors);
      console.log("[Import] writeErrors count:", err.writeErrors?.length || 0);

      if (err.insertedDocs) {
        imported = err.insertedDocs.length;
        failed = studentDocs.length - imported;
      } else if (err.result?.insertedCount !== undefined) {
        imported = err.result.insertedCount;
        failed = studentDocs.length - imported;
      } else {
        // Total failure
        imported = 0;
        failed = studentDocs.length;
      }

      if (err.writeErrors) {
        err.writeErrors.slice(0, 5).forEach((we) => {
          const idx = we.index;
          insertErrors.push({
            row: idx,
            scholarNumber: studentDocs[idx]?.scholarNumber || "?",
            name: studentDocs[idx]?.name || "?",
            error: we.errmsg || we.message || "Insert failed",
            code: we.code,
          });
        });
        console.log("[Import] First insert errors:");
        console.log(JSON.stringify(insertErrors, null, 2));
      }

      logger.error(`[Import] Some inserts failed: ${err.message}`);
    }

    console.log("[Import] ═══════════════════════════════════");
    console.log("[Import] FINAL RESULT:");
    console.log("  Imported:", imported);
    console.log("  Failed:", failed);
    console.log("  Errors count:", insertErrors.length);
    console.log("[Import] ═══════════════════════════════════\n");

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
