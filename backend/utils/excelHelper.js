"use strict";

const XLSX = require("xlsx");

/* ═══════════════════════════════════════════════════════════
   CORE PRINCIPLE:
   - Read Excel cells with rich type info (don't auto-convert)
   - Inspect each cell's actual type (s=string, n=number, d=date, b=bool)
   - Apply field-specific cleaners based on column intent
   - Return predictable, normalized strings
═══════════════════════════════════════════════════════════ */

// ─── EXCEL DATE CONSTANTS ─────────────────────────────────────
// Excel "epoch" is Dec 30, 1899 (due to Lotus 1-2-3 leap year bug compatibility)
const EXCEL_EPOCH_MS = new Date(1899, 11, 30).getTime();
const MS_PER_DAY = 86400 * 1000;

// ─── MONTH NAME MAP ───────────────────────────────────────────
const MONTH_MAP = Object.freeze({
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
});

// ═══════════════════════════════════════════════════════════
//  TYPE-SAFE VALUE EXTRACTION
// ═══════════════════════════════════════════════════════════

/**
 * Convert any Excel cell value to a clean string.
 * Handles: scientific notation, numbers, dates, booleans, null.
 */
function toCleanString(value) {
  if (value === null || value === undefined) return "";

  // Already a string
  if (typeof value === "string") return value.trim();

  // Boolean
  if (typeof value === "boolean") return value ? "true" : "false";

  // Date object
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return "";
    return formatDateToDMY(value);
  }

  // Number — handle scientific notation, decimals
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "";

    // Integer (mobile, aadhar, scholar number, roll number)
    if (Number.isInteger(value)) {
      return value.toString();
    }

    // Decimal — convert without scientific notation
    // Use toFixed(20) then strip trailing zeros
    let str = value.toFixed(20);
    str = str.replace(/\.?0+$/, "");
    return str;
  }

  // Object/Array — stringify safely
  try {
    return String(value).trim();
  } catch {
    return "";
  }
}

/**
 * Convert Excel serial number to JS Date.
 * Returns null if not a valid Excel date.
 */
function excelSerialToDate(serial) {
  if (typeof serial !== "number" || !Number.isFinite(serial)) return null;
  if (serial < 1 || serial > 100000) return null; // Sanity check

  const wholeDays = Math.floor(serial);
  const ms = (serial - wholeDays) * MS_PER_DAY;
  const date = new Date(EXCEL_EPOCH_MS + wholeDays * MS_PER_DAY + ms);

  return isNaN(date.getTime()) ? null : date;
}

/**
 * Format Date object to DD/MM/YYYY string.
 */
function formatDateToDMY(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// ═══════════════════════════════════════════════════════════
//  FIELD-SPECIFIC CLEANERS
// ═══════════════════════════════════════════════════════════

/**
 * Clean phone/mobile number to 10-digit format.
 * Removes: country codes, spaces, dashes, parentheses, leading zeros.
 */
function cleanMobile(value) {
  const str = toCleanString(value);
  if (!str) return "";

  // Strip all non-digits
  let digits = str.replace(/\D/g, "");
  if (!digits) return "";

  // Remove leading 91 if 12 digits (India country code)
  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  }

  // Remove leading 0 if 11 digits
  if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  return digits;
}

/**
 * Clean Aadhar number to 12-digit format.
 */
function cleanAadhar(value) {
  const str = toCleanString(value);
  if (!str) return "";
  return str.replace(/\D/g, "");
}

/**
 * Clean ID number (scholar, admission no, etc.)
 * Preserves alphanumeric + dashes + underscores.
 */
function cleanIdNumber(value) {
  const str = toCleanString(value);
  if (!str) return "";
  return str.toUpperCase().trim();
}

/**
 * Clean roll number (numeric or alphanumeric).
 */
function cleanRollNumber(value) {
  const str = toCleanString(value);
  if (!str) return "";
  return str.trim();
}

// ═══════════════════════════════════════════════════════════
//  DATE PARSING (THE CRITICAL PART)
// ═══════════════════════════════════════════════════════════

/**
 * Validate parsed date components didn't roll over.
 * E.g., Feb 31 → Mar 3 (invalid input)
 */
function isValidYMD(year, month, day) {
  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/**
 * Normalize 2-digit year to 4-digit.
 * 00-49 → 2000-2049
 * 50-99 → 1950-1999
 */
function normalizeYear(year) {
  if (year >= 100) return year;
  return year < 50 ? 2000 + year : 1900 + year;
}

/**
 * Parse date from various string formats.
 * Returns Date object or null.
 *
 * Supported formats:
 *   - DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, DD MM YYYY
 *   - YYYY-MM-DD (ISO)
 *   - DD-MMM-YYYY, DD/MMM/YYYY (15-Jan-2020)
 *   - MMM DD, YYYY (Jan 15, 2020)
 *   - Excel serial numbers
 *   - Date objects
 */
function parseIndianDate(value) {
  if (value === null || value === undefined || value === "") return null;

  // Already a Date
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  // Excel serial number
  if (typeof value === "number") {
    return excelSerialToDate(value);
  }

  // Coerce to string
  let str = String(value).trim();
  if (!str) return null;

  // Remove ordinal suffixes: "1st", "2nd", "3rd", "15th"
  str = str.replace(/(\d+)(st|nd|rd|th)\b/gi, "$1");

  // ─── Try: YYYY-MM-DD or YYYY/MM/DD (ISO) ───
  let m = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (m) {
    const year = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    const day = parseInt(m[3], 10);
    if (isValidYMD(year, month, day)) {
      return new Date(year, month - 1, day);
    }
  }

  // ─── Try: DD/MM/YYYY (Indian) - PRIMARY ───
  m = str.match(/^(\d{1,2})[-/.\s](\d{1,2})[-/.\s](\d{2,4})$/);
  if (m) {
    const first = parseInt(m[1], 10);
    const second = parseInt(m[2], 10);
    let year = parseInt(m[3], 10);
    year = normalizeYear(year);

    // Smart format detection:
    // - If first > 12: must be day (Indian DD/MM/YYYY)
    // - If second > 12: must be day (US MM/DD/YYYY) → swap
    // - If both ≤ 12: assume Indian (DD/MM/YYYY)

    let day, month;
    if (first > 12 && second <= 12) {
      // Indian format
      day = first;
      month = second;
    } else if (second > 12 && first <= 12) {
      // US format — swap
      day = second;
      month = first;
    } else {
      // Ambiguous → assume Indian
      day = first;
      month = second;
    }

    if (isValidYMD(year, month, day)) {
      return new Date(year, month - 1, day);
    }
  }

  // ─── Try: DD-MMM-YYYY (15-Jan-2020, 15/Jan/2020, 15 Jan 2020) ───
  m = str.match(/^(\d{1,2})[-/.\s]+([A-Za-z]{3,9})[-/.\s]+(\d{2,4})$/);
  if (m) {
    const day = parseInt(m[1], 10);
    const monthStr = m[2].toLowerCase();
    let year = parseInt(m[3], 10);
    year = normalizeYear(year);

    const month = MONTH_MAP[monthStr];
    if (month !== undefined && isValidYMD(year, month + 1, day)) {
      return new Date(year, month, day);
    }
  }

  // ─── Try: MMM DD, YYYY (Jan 15, 2020) ───
  m = str.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{2,4})$/);
  if (m) {
    const monthStr = m[1].toLowerCase();
    const day = parseInt(m[2], 10);
    let year = parseInt(m[3], 10);
    year = normalizeYear(year);

    const month = MONTH_MAP[monthStr];
    if (month !== undefined && isValidYMD(year, month + 1, day)) {
      return new Date(year, month, day);
    }
  }

  // ─── Try: YYYYMMDD (e.g., 20100315) ───
  m = str.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) {
    const year = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    const day = parseInt(m[3], 10);
    if (isValidYMD(year, month, day)) {
      return new Date(year, month - 1, day);
    }
  }

  // ─── Try: DDMMYYYY (e.g., 15032010) ───
  m = str.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (m) {
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    const year = parseInt(m[3], 10);
    if (isValidYMD(year, month, day)) {
      return new Date(year, month - 1, day);
    }
  }

  // Failed to parse — DO NOT fallback to new Date() (unreliable)
  return null;
}

// ═══════════════════════════════════════════════════════════
//  EXCEL READING (THE NEW APPROACH)
// ═══════════════════════════════════════════════════════════

/**
 * Get value from a cell with rich type information.
 * Uses raw cell object (preserves type), not just .v
 */
function extractCellValue(cell) {
  if (!cell) return null;

  // Cell type indicators:
  // s = string, n = number, d = date, b = boolean, e = error
  switch (cell.t) {
    case "s":
      // String — use raw value
      return cell.v != null ? String(cell.v) : "";

    case "n":
      // Number — could be date serial or actual number
      // Check if format suggests date (z = format code)
      if (cell.z && /[ymd]/i.test(cell.z) && !cell.z.includes("0")) {
        // Looks like a date format
        const date = excelSerialToDate(cell.v);
        return date || cell.v;
      }
      return cell.v;

    case "d":
      // Date — already parsed
      return cell.v instanceof Date ? cell.v : new Date(cell.v);

    case "b":
      // Boolean
      return Boolean(cell.v);

    case "e":
      // Error cell
      return null;

    default:
      // Use formatted value if available, else raw
      return cell.w !== undefined ? cell.w : cell.v;
  }
}

/**
 * Determine cleaner function based on column header.
 */
function getCleaner(header) {
  const h = String(header).toLowerCase();

  if (h.includes("mobile") || h.includes("phone") || h.includes("contact")) {
    return (val) => cleanMobile(val);
  }

  if (h.includes("aadhar") || h.includes("aadhaar")) {
    return (val) => cleanAadhar(val);
  }

  if (
    h.includes("scholar") ||
    h.includes("admission no") ||
    h.includes("student id")
  ) {
    return (val) => cleanIdNumber(val);
  }

  if (h.includes("roll")) {
    return (val) => cleanRollNumber(val);
  }

  if (h.includes("date") || h.includes("dob") || h.includes("birth")) {
    // Convert dates to DD/MM/YYYY string
    return (val) => {
      if (val === null || val === undefined || val === "") return "";

      // If it's a Date object, format directly
      if (val instanceof Date) {
        return formatDateToDMY(val);
      }

      // If it's a number (Excel serial), convert
      if (typeof val === "number") {
        const date = excelSerialToDate(val);
        return date ? formatDateToDMY(date) : "";
      }

      // String — return as-is, parser will handle
      return toCleanString(val);
    };
  }

  // Default cleaner
  return (val) => toCleanString(val);
}

/**
 * Read Excel buffer and return cleaned rows.
 * Each row is an object with header → cleaned value mapping.
 */
function readExcel(buffer) {
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: true, // Parse dates into Date objects
    cellNF: true, // Keep number format info (needed for date detection)
    raw: false, // Get formatted values where appropriate
  });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const sheet = workbook.Sheets[sheetName];
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");

  if (range.s.r === range.e.r) return []; // Only header row, no data

  // Read header row
  const headers = [];
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const cellRef = XLSX.utils.encode_cell({ r: range.s.r, c: C });
    const cell = sheet[cellRef];
    const headerValue = cell ? toCleanString(extractCellValue(cell)) : "";
    headers.push(headerValue);
  }

  // Build cleaners array (one per column)
  const cleaners = headers.map((h) => getCleaner(h));

  // Read data rows
  const rows = [];
  for (let R = range.s.r + 1; R <= range.e.r; ++R) {
    const row = {};
    let hasData = false;

    for (let C = range.s.c; C <= range.e.c; ++C) {
      const header = headers[C - range.s.c];
      if (!header) continue;

      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = sheet[cellRef];

      const rawValue = extractCellValue(cell);
      const cleanedValue = cleaners[C - range.s.c](rawValue);

      row[header] = cleanedValue;

      // Track if row has any data
      if (cleanedValue && String(cleanedValue).trim()) {
        hasData = true;
      }
    }

    // Skip empty rows
    if (hasData) {
      rows.push(row);
    }
  }

  return rows;
}

// ═══════════════════════════════════════════════════════════
//  TEMPLATE GENERATION
// ═══════════════════════════════════════════════════════════

/**
 * Generate Excel template with proper text formatting on cells.
 */
function generateStudentTemplate() {
  const headers = [
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
    "Roll Number",
    "Mobile",
    "Alternate Mobile",
    "Blood Group",
    "Category",
    "Religion",
    "Aadhar Number",
  ];

  const sampleData = [
    {
      "Scholar Number*": "SCH001",
      "Student Name*": "Rahul Kumar",
      "Father Name*": "Rajesh Kumar",
      "Mother Name*": "Priya Kumar",
      "Date of Birth* (DD/MM/YYYY)": "15/03/2010",
      "Gender* (Male/Female/Other)": "Male",
      "Address*": "123 Main Street, City",
      "Class Name*": "10TH",
      "Section*": "A",
      "Admission Date* (DD/MM/YYYY)": "01/04/2024",
      "Roll Number": "1",
      Mobile: "9876543210",
      "Alternate Mobile": "",
      "Blood Group": "O+",
      Category: "General",
      Religion: "Hindu",
      "Aadhar Number": "",
    },
    {
      "Scholar Number*": "SCH002",
      "Student Name*": "Priya Sharma",
      "Father Name*": "Manoj Sharma",
      "Mother Name*": "Sunita Sharma",
      "Date of Birth* (DD/MM/YYYY)": "22/08/2011",
      "Gender* (Male/Female/Other)": "Female",
      "Address*": "456 Park Avenue, City",
      "Class Name*": "9TH",
      "Section*": "B",
      "Admission Date* (DD/MM/YYYY)": "01/04/2024",
      "Roll Number": "",
      Mobile: "",
      "Alternate Mobile": "",
      "Blood Group": "A+",
      Category: "",
      Religion: "",
      "Aadhar Number": "",
    },
  ];

  const instructions = [
    {
      Field: "Scholar Number*",
      Required: "YES",
      Description: "Unique permanent ID (e.g., SCH001, NEW-2026-001)",
    },
    {
      Field: "Student Name*",
      Required: "YES",
      Description: "Full name of student",
    },
    {
      Field: "Father Name*",
      Required: "YES",
      Description: "Father's full name",
    },
    {
      Field: "Mother Name*",
      Required: "YES",
      Description: "Mother's full name",
    },
    {
      Field: "Date of Birth*",
      Required: "YES",
      Description: "Format: DD/MM/YYYY (also accepts DD-MM-YYYY, DD-Mmm-YYYY)",
    },
    {
      Field: "Gender*",
      Required: "YES",
      Description: "Male, Female, or Other (exact spelling)",
    },
    {
      Field: "Address*",
      Required: "YES",
      Description: "Complete residential address",
    },
    {
      Field: "Class Name*",
      Required: "YES",
      Description: 'Must EXACTLY match existing class (e.g., "LKG", "10TH")',
    },
    {
      Field: "Section*",
      Required: "YES",
      Description: 'Must EXACTLY match section (e.g., "A", "NEW")',
    },
    {
      Field: "Admission Date*",
      Required: "YES",
      Description: "Format: DD/MM/YYYY",
    },
    {
      Field: "Roll Number",
      Required: "No",
      Description: "Auto-generated if blank",
    },
    {
      Field: "Mobile",
      Required: "No",
      Description: "10-digit number (auto-cleans formatting)",
    },
    {
      Field: "Alternate Mobile",
      Required: "No",
      Description: "Optional secondary contact",
    },
    {
      Field: "Blood Group",
      Required: "No",
      Description: "A+, A-, B+, B-, O+, O-, AB+, AB-",
    },
    {
      Field: "Category",
      Required: "No",
      Description: "General, OBC, SC, ST, EWS",
    },
    { Field: "Religion", Required: "No", Description: "Optional" },
    {
      Field: "Aadhar Number",
      Required: "No",
      Description: "12-digit number (auto-cleans)",
    },
    { Field: "", Required: "", Description: "" },
    { Field: "═══ IMPORTANT NOTES ═══", Required: "", Description: "" },
    { Field: "1. Fields marked * are required", Required: "", Description: "" },
    {
      Field: "2. Delete sample rows before importing",
      Required: "",
      Description: "",
    },
    {
      Field: "3. Class & Section must already exist in system",
      Required: "",
      Description: "",
    },
    {
      Field: "4. Duplicate Scholar Numbers will be skipped",
      Required: "",
      Description: "",
    },
    {
      Field: "5. Roll numbers auto-generated per class if blank",
      Required: "",
      Description: "",
    },
    {
      Field:
        "6. Mobile/Aadhar accept any format (spaces, dashes, +91 prefix all OK)",
      Required: "",
      Description: "",
    },
    {
      Field: "7. Dates accept: DD/MM/YYYY, DD-MM-YYYY, DD-Mmm-YYYY, YYYY-MM-DD",
      Required: "",
      Description: "",
    },
    {
      Field: "8. Empty rows automatically skipped",
      Required: "",
      Description: "",
    },
  ];

  const workbook = XLSX.utils.book_new();

  // ─── Sheet 1: Data with sample ───
  const dataSheet = XLSX.utils.json_to_sheet(sampleData, { header: headers });

  // Column widths
  dataSheet["!cols"] = headers.map((h) => ({
    wch: Math.max(h.length + 2, 18),
  }));

  // ─── CRITICAL: Force ALL data cells to TEXT format ───
  const range = XLSX.utils.decode_range(dataSheet["!ref"]);
  for (let R = range.s.r + 1; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (dataSheet[cellRef]) {
        dataSheet[cellRef].t = "s"; // String type
        dataSheet[cellRef].z = "@"; // Text format
      }
    }
  }

  XLSX.utils.book_append_sheet(workbook, dataSheet, "Students");

  // ─── Sheet 2: Instructions ───
  const instructionsSheet = XLSX.utils.json_to_sheet(instructions);
  instructionsSheet["!cols"] = [{ wch: 35 }, { wch: 12 }, { wch: 70 }];
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, "Instructions");

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

/**
 * Generate error report Excel.
 */
function generateErrorReport(errors) {
  if (!Array.isArray(errors) || errors.length === 0) {
    errors = [
      { rowNum: "-", scholarNumber: "-", name: "-", errors: "No errors" },
    ];
  }

  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(errors);

  sheet["!cols"] = [{ wch: 8 }, { wch: 18 }, { wch: 25 }, { wch: 60 }];

  XLSX.utils.book_append_sheet(workbook, sheet, "Import Errors");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

// ═══════════════════════════════════════════════════════════
//  EXPORTS
// ═══════════════════════════════════════════════════════════

module.exports = {
  // Main APIs
  readExcel,
  generateStudentTemplate,
  generateErrorReport,
  parseIndianDate,

  // Helpers (exported for testing & reuse)
  toCleanString,
  cleanMobile,
  cleanAadhar,
  cleanIdNumber,
  cleanRollNumber,
  formatDateToDMY,
  excelSerialToDate,
  isValidYMD,
  normalizeYear,
};
