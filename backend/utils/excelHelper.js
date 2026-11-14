"use strict";

const ExcelJS = require("exceljs");

// ─── LIMITS FOR UNTRUSTED WORKBOOKS ───────────────────────────
// Uploads are capped at 10 MB by the route; these bound what a
// (possibly malicious) 10 MB ZIP may expand to / contain.
const XLSX_LIMITS = Object.freeze({
  MAX_ZIP_ENTRIES: 500,
  MAX_UNCOMPRESSED_BYTES: 50 * 1024 * 1024, // 50 MB expanded
  MAX_ROWS: 20000, // physical rows scanned in sheet 1
  MAX_COLUMNS: 100,
  MAX_CELL_TEXT: 5000, // chars kept per text cell
  MAX_REPORT_ROWS: 5000, // rows written to an error report
  EXCEL_CELL_MAX: 32767, // Excel's own per-cell limit
});

const OLE_MAGIC = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

function xlsxError(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

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

// ═══════════════════════════════════════════════════════════
//  XLSX FILE VALIDATION (is it really an .xlsx ZIP package?)
// ═══════════════════════════════════════════════════════════

/**
 * Verify a buffer is a genuine .xlsx (OOXML ZIP) package BEFORE parsing.
 * Pure structural check of the ZIP central directory — nothing is
 * decompressed or executed. Throws an Error with statusCode 400.
 *
 *  - legacy .xls / password-protected files (OLE2 container) → rejected
 *  - not a ZIP at all → rejected
 *  - ZIP without [Content_Types].xml + xl/workbook.xml → rejected
 *  - too many entries / too large when expanded (zip bomb) → rejected
 */
function assertXlsxBuffer(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw xlsxError("The uploaded file is empty.");
  }

  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(OLE_MAGIC)) {
    throw xlsxError(
      "Legacy .xls (or password-protected) workbooks are not supported. " +
        "Open the file in Excel and save it as .xlsx (Excel Workbook), then upload again.",
    );
  }

  const notXlsx = () =>
    xlsxError(
      "The uploaded file is not a valid .xlsx workbook. Please upload an Excel (.xlsx) file.",
    );

  if (buffer.length < 22 || buffer.readUInt32LE(0) !== 0x04034b50) {
    throw notXlsx();
  }

  // Find End Of Central Directory record (scan back over optional comment)
  let eocd = -1;
  const scanStart = buffer.length - 22;
  const scanEnd = Math.max(0, buffer.length - 22 - 0xffff);
  for (let i = scanStart; i >= scanEnd; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw notXlsx();

  const totalEntries = buffer.readUInt16LE(eocd + 10);
  const cdSize = buffer.readUInt32LE(eocd + 12);
  const cdOffset = buffer.readUInt32LE(eocd + 16);

  if (totalEntries === 0xffff || cdSize === 0xffffffff || cdOffset === 0xffffffff) {
    throw xlsxError("ZIP64 workbooks are not supported.");
  }
  if (totalEntries === 0 || totalEntries > XLSX_LIMITS.MAX_ZIP_ENTRIES) {
    throw xlsxError("The workbook structure is invalid or too complex.");
  }
  if (cdOffset + cdSize > buffer.length) throw notXlsx();

  const names = new Set();
  let totalUncompressed = 0;
  let pos = cdOffset;

  for (let i = 0; i < totalEntries; i++) {
    if (pos + 46 > buffer.length || buffer.readUInt32LE(pos) !== 0x02014b50) {
      throw notXlsx();
    }
    const flags = buffer.readUInt16LE(pos + 8);
    const compressedSize = buffer.readUInt32LE(pos + 20);
    const uncompressedSize = buffer.readUInt32LE(pos + 24);
    const nameLen = buffer.readUInt16LE(pos + 28);
    const extraLen = buffer.readUInt16LE(pos + 30);
    const commentLen = buffer.readUInt16LE(pos + 32);

    if (pos + 46 + nameLen > buffer.length) throw notXlsx();
    if (flags & 0x1) {
      throw xlsxError("Encrypted workbooks are not supported.");
    }
    if (compressedSize === 0xffffffff || uncompressedSize === 0xffffffff) {
      throw xlsxError("ZIP64 workbooks are not supported.");
    }

    const name = buffer.toString("utf8", pos + 46, pos + 46 + nameLen);
    if (name.startsWith("/") || name.split("/").includes("..")) {
      throw notXlsx();
    }
    names.add(name);

    totalUncompressed += uncompressedSize;
    if (totalUncompressed > XLSX_LIMITS.MAX_UNCOMPRESSED_BYTES) {
      throw xlsxError(
        "The workbook is too large when expanded and was rejected for safety.",
      );
    }

    pos += 46 + nameLen + extraLen + commentLen;
  }

  if (!names.has("[Content_Types].xml") || !names.has("xl/workbook.xml")) {
    throw notXlsx();
  }
}

/**
 * Normalise one ExcelJS cell value into a primitive (string | number |
 * boolean | Date | null). Workbook content is untrusted:
 *   - formulas are NEVER evaluated — only the cached result stored in
 *     the file is read, and only if it is a plain value
 *   - error cells, unknown object shapes → null
 *   - text is length-capped
 */
function extractCellValue(value, depth = 0) {
  if (value === null || value === undefined) return null;

  if (typeof value === "string") {
    return value.length > XLSX_LIMITS.MAX_CELL_TEXT
      ? value.slice(0, XLSX_LIMITS.MAX_CELL_TEXT)
      : value;
  }

  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  if (typeof value === "boolean") return value;

  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    // ExcelJS returns dates as UTC. Rebuild as a local-time Date with the
    // same calendar fields so formatDateToDMY() (local getters) is correct
    // in any server timezone.
    return new Date(
      value.getUTCFullYear(),
      value.getUTCMonth(),
      value.getUTCDate(),
      value.getUTCHours(),
      value.getUTCMinutes(),
      value.getUTCSeconds(),
    );
  }

  if (typeof value === "object" && depth < 2) {
    if (value.error) return null; // {error: "#N/A"}

    if (Array.isArray(value.richText)) {
      return extractCellValue(
        value.richText
          .map((part) => (part && typeof part.text === "string" ? part.text : ""))
          .join(""),
        depth + 1,
      );
    }

    // Formula cell: use cached result only, never the formula itself
    if ("formula" in value || "sharedFormula" in value) {
      return extractCellValue(value.result, depth + 1);
    }

    // Hyperlink cell: {text, hyperlink} → visible text only
    if ("text" in value) return extractCellValue(value.text, depth + 1);
  }

  return null;
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
 * Read an .xlsx buffer and return cleaned rows.
 * Each row is an object with header → cleaned value mapping.
 * First worksheet only; first non-empty row is the header row.
 *
 * Async (ExcelJS). Throws Error(statusCode 400) for anything that is not
 * a valid .xlsx or that exceeds the workbook limits.
 */
async function readExcel(buffer) {
  assertXlsxBuffer(buffer);

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer);
  } catch (err) {
    throw xlsxError(`Could not read the workbook: ${err.message}`);
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  if (sheet.rowCount > XLSX_LIMITS.MAX_ROWS) {
    throw xlsxError(
      `The worksheet has too many rows (${sheet.rowCount}). Maximum ${XLSX_LIMITS.MAX_ROWS} rows allowed.`,
    );
  }
  if (sheet.columnCount > XLSX_LIMITS.MAX_COLUMNS) {
    throw xlsxError(
      `The worksheet has too many columns (${sheet.columnCount}). Maximum ${XLSX_LIMITS.MAX_COLUMNS} columns allowed.`,
    );
  }

  const lastRow = sheet.rowCount;
  const lastCol = sheet.columnCount;

  const isBlank = (v) => v === null || v === undefined || v === "";

  // First row that has any value = header row
  let headerRowNum = 0;
  for (let r = 1; r <= lastRow && !headerRowNum; r++) {
    const row = sheet.getRow(r);
    for (let c = 1; c <= lastCol; c++) {
      if (!isBlank(extractCellValue(row.getCell(c).value))) {
        headerRowNum = r;
        break;
      }
    }
  }

  if (!headerRowNum || headerRowNum >= lastRow) return []; // no data rows

  // Read header row
  // Header text comes from an untrusted file and becomes an object key
  const UNSAFE_KEYS = new Set(["__proto__"]);
  const headerRow = sheet.getRow(headerRowNum);
  const headers = [];
  for (let c = 1; c <= lastCol; c++) {
    const h = toCleanString(extractCellValue(headerRow.getCell(c).value));
    headers.push(UNSAFE_KEYS.has(h) ? "" : h);
  }

  // Build cleaners array (one per column)
  const cleaners = headers.map((h) => getCleaner(h));

  // Read data rows
  const rows = [];
  for (let r = headerRowNum + 1; r <= lastRow; r++) {
    const excelRow = sheet.getRow(r);
    const row = {};
    let hasData = false;

    for (let c = 1; c <= lastCol; c++) {
      const header = headers[c - 1];
      if (!header) continue;

      const rawValue = extractCellValue(excelRow.getCell(c).value);
      const cleanedValue = cleaners[c - 1](rawValue);

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
async function generateStudentTemplate() {
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

  const workbook = new ExcelJS.Workbook();

  // ─── Sheet 1: Data with sample ───
  const dataSheet = workbook.addWorksheet("Students");

  // Header row + sample rows (json_to_sheet equivalent: empty string stays a text cell)
  dataSheet.addRow(headers);
  sampleData.forEach((sample) => {
    dataSheet.addRow(headers.map((h) => (sample[h] === undefined ? "" : sample[h])));
  });

  // Column widths
  headers.forEach((h, i) => {
    dataSheet.getColumn(i + 1).width = Math.max(h.length + 2, 18);
  });

  // ─── CRITICAL: Force ALL data cells to TEXT format ───
  // (scholar numbers, mobile, Aadhar must never become numbers/dates)
  for (let r = 2; r <= dataSheet.rowCount; r++) {
    const row = dataSheet.getRow(r);
    for (let c = 1; c <= headers.length; c++) {
      row.getCell(c).numFmt = "@";
    }
  }

  // ─── Sheet 2: Instructions ───
  const instructionsSheet = workbook.addWorksheet("Instructions");
  instructionsSheet.addRow(["Field", "Required", "Description"]);
  instructions.forEach((item) => {
    instructionsSheet.addRow([item.Field, item.Required, item.Description]);
  });
  [35, 12, 70].forEach((w, i) => {
    instructionsSheet.getColumn(i + 1).width = w;
  });

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

/**
 * Generate error report Excel.
 */
async function generateErrorReport(errors) {
  if (!Array.isArray(errors) || errors.length === 0) {
    errors = [
      { rowNum: "-", scholarNumber: "-", name: "-", errors: "No errors" },
    ];
  }

  // Bound the output (input comes from the request body)
  const items = errors
    .slice(0, XLSX_LIMITS.MAX_REPORT_ROWS)
    .filter((e) => e && typeof e === "object" && !Array.isArray(e));

  // Header = union of keys in order of first appearance (json_to_sheet behaviour)
  const keys = [];
  const seen = new Set();
  items.forEach((item) => {
    Object.keys(item).forEach((k) => {
      if (!seen.has(k) && k !== "__proto__") {
        seen.add(k);
        keys.push(k);
      }
    });
  });

  // Strings are written as plain text cells — never as formulas
  const toCell = (v) => {
    if (v === null || v === undefined) return null;
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    if (typeof v === "boolean") return v;
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
    return String(v).slice(0, XLSX_LIMITS.EXCEL_CELL_MAX);
  };

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Import Errors");
  sheet.addRow(keys);
  items.forEach((item) => {
    sheet.addRow(keys.map((k) => toCell(item[k])));
  });

  [8, 18, 25, 60].forEach((w, i) => {
    sheet.getColumn(i + 1).width = w;
  });

  return Buffer.from(await workbook.xlsx.writeBuffer());
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
  assertXlsxBuffer,
  XLSX_LIMITS,

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
