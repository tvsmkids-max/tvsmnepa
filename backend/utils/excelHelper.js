"use strict";

const XLSX = require("xlsx");

/**
 * Convert Excel value to clean string
 * Handles: scientific notation (9.87654E+09), numbers, dates, null, undefined
 */
const toCleanString = (value) => {
  if (value === null || value === undefined) return "";

  // Already a string
  if (typeof value === "string") return value.trim();

  // Number (could be normal number, scientific notation, or Excel date)
  if (typeof value === "number") {
    // Convert to string without scientific notation
    // For very large numbers like aadhar, mobile in scientific form
    if (!Number.isFinite(value)) return "";

    // Check if it's a whole number (like mobile, aadhar)
    if (Number.isInteger(value)) {
      return value.toString();
    }

    // Convert to fixed notation to avoid scientific
    // toFixed(0) for integers, otherwise normal
    const fixed = value.toFixed(20).replace(/\.?0+$/, "");
    return fixed;
  }

  // Boolean
  if (typeof value === "boolean") return value.toString();

  // Date object
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return "";
    const day = String(value.getDate()).padStart(2, "0");
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const year = value.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // Fallback
  return String(value).trim();
};

/**
 * Smart date parser - handles ANY format
 * - "15/01/2020" (text DD/MM/YYYY)
 * - "15-01-2020" (text DD-MM-YYYY)
 * - "15.01.2020" (text DD.MM.YYYY)
 * - "2020-01-15" (ISO format)
 * - 43846 (Excel serial number)
 * - Date object
 * - "15-Jan-2020"
 */
const parseIndianDate = (dateValue) => {
  if (!dateValue && dateValue !== 0) return null;

  // Already a Date object
  if (dateValue instanceof Date) {
    return isNaN(dateValue.getTime()) ? null : dateValue;
  }

  // Excel serial number (number)
  if (typeof dateValue === "number") {
    // Excel epoch is Dec 30, 1899 (accounting for Excel's leap year bug)
    const excelEpoch = new Date(1899, 11, 30);
    const days = Math.floor(dateValue);
    const milliseconds = (dateValue - days) * 86400 * 1000;
    const result = new Date(
      excelEpoch.getTime() + days * 86400 * 1000 + milliseconds,
    );
    return isNaN(result.getTime()) ? null : result;
  }

  // String value
  const dateStr = String(dateValue).trim();
  if (!dateStr) return null;

  // Try ISO format first (2020-01-15)
  const isoMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const date = new Date(
      parseInt(year, 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10),
    );
    if (!isNaN(date.getTime())) return date;
  }

  // Try DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = dateStr.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (dmyMatch) {
    let [, day, month, year] = dmyMatch;
    day = parseInt(day, 10);
    month = parseInt(month, 10) - 1;
    year = parseInt(year, 10);

    // Handle 2-digit year (assume 2000s)
    if (year < 100) {
      year = year < 50 ? 2000 + year : 1900 + year;
    }

    // Validate
    if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 1900) {
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) return date;
    }
  }

  // Try natural date parsing (Jan 15, 2020 etc.)
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) return parsed;

  return null;
};

/**
 * Clean mobile/phone number
 * Handles: "9876543210", 9876543210, "9.87654E+09", "+91-9876543210", "9876 543 210"
 */
const cleanMobileNumber = (value) => {
  if (!value && value !== 0) return "";

  let str = toCleanString(value);
  if (!str) return "";

  // Remove all non-digit characters
  str = str.replace(/\D/g, "");

  // If starts with 91 (country code) and has 12 digits, remove it
  if (str.length === 12 && str.startsWith("91")) {
    str = str.substring(2);
  }

  // If starts with 0 and has 11 digits, remove the 0
  if (str.length === 11 && str.startsWith("0")) {
    str = str.substring(1);
  }

  return str;
};

/**
 * Clean Aadhar number
 * Handles: "123456789012", 123456789012, "1.23457E+11", "1234-5678-9012", "1234 5678 9012"
 */
const cleanAadharNumber = (value) => {
  if (!value && value !== 0) return "";

  let str = toCleanString(value);
  if (!str) return "";

  // Remove all non-digit characters
  str = str.replace(/\D/g, "");

  return str;
};

/**
 * Clean scholar/roll number - keeps alphanumeric, dashes, underscores
 */
const cleanIdNumber = (value) => {
  if (!value && value !== 0) return "";

  let str = toCleanString(value);
  if (!str) return "";

  // Trim and uppercase
  return str.trim().toUpperCase();
};

/**
 * Read Excel file and return rows as JSON
 * KEY: Uses raw: false to convert all values to strings (avoids scientific notation)
 */
const readExcel = (buffer) => {
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: false, // Don't convert dates - keep raw
    cellNF: false, // Don't keep number formats
    cellText: false, // Don't generate text formatting
  });

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // ─── KEY FIX: Get raw rows first ───
  const rawRows = XLSX.utils.sheet_to_json(sheet, {
    defval: "",
    blankrows: false,
    raw: false, // Convert numbers to strings
  });

  // ─── Clean each row's values ───
  const cleanedRows = rawRows.map((row) => {
    const cleanRow = {};

    Object.keys(row).forEach((key) => {
      const lowerKey = key.toLowerCase();
      const value = row[key];

      // Special handling for specific fields
      if (lowerKey.includes("mobile") || lowerKey.includes("phone")) {
        cleanRow[key] = cleanMobileNumber(value);
      } else if (lowerKey.includes("aadhar") || lowerKey.includes("aadhaar")) {
        cleanRow[key] = cleanAadharNumber(value);
      } else if (
        lowerKey.includes("scholar") ||
        lowerKey.includes("admission no")
      ) {
        cleanRow[key] = cleanIdNumber(value);
      } else if (lowerKey.includes("roll")) {
        // Roll number - keep as string, no special chars
        cleanRow[key] = toCleanString(value);
      } else if (lowerKey.includes("date") || lowerKey.includes("dob")) {
        // Date fields - convert to DD/MM/YYYY string
        if (typeof value === "number") {
          // Excel serial number
          const parsed = parseIndianDate(value);
          if (parsed) {
            const day = String(parsed.getDate()).padStart(2, "0");
            const month = String(parsed.getMonth() + 1).padStart(2, "0");
            const year = parsed.getFullYear();
            cleanRow[key] = `${day}/${month}/${year}`;
          } else {
            cleanRow[key] = "";
          }
        } else if (value instanceof Date) {
          const day = String(value.getDate()).padStart(2, "0");
          const month = String(value.getMonth() + 1).padStart(2, "0");
          const year = value.getFullYear();
          cleanRow[key] = `${day}/${month}/${year}`;
        } else {
          cleanRow[key] = toCleanString(value);
        }
      } else {
        // All other fields - clean string
        cleanRow[key] = toCleanString(value);
      }
    });

    return cleanRow;
  });

  return cleanedRows;
};

/**
 * Generate Excel template for student import
 */
const generateStudentTemplate = () => {
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

  // Sample data row
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

  // Add instructions sheet
  const instructions = [
    {
      Field: "Scholar Number*",
      Required: "YES",
      Description: "Unique permanent ID for student (any format)",
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
      Description:
        "Any format: 15/03/2010, 15-03-2010, 2010-03-15, or Excel date",
    },
    {
      Field: "Gender*",
      Required: "YES",
      Description: "Male, Female, or Other",
    },
    {
      Field: "Address*",
      Required: "YES",
      Description: "Complete residential address",
    },
    {
      Field: "Class Name*",
      Required: "YES",
      Description: 'Must exist in system (e.g., "10TH", "Nursery")',
    },
    {
      Field: "Section*",
      Required: "YES",
      Description: 'Section in class (e.g., "A", "B")',
    },
    {
      Field: "Admission Date*",
      Required: "YES",
      Description: "Any format: 15/03/2010, 15-03-2010, etc.",
    },
    {
      Field: "Roll Number",
      Required: "No",
      Description: "Auto-generated per class if blank",
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
      Description: "12-digit number (auto-cleans formatting)",
    },
    { Field: "", Required: "", Description: "" },
    { Field: "NOTES:", Required: "", Description: "" },
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
      Field: "6. Mobile/Aadhar auto-clean from spaces, dashes, +91 prefix",
      Required: "",
      Description: "",
    },
    {
      Field: "7. Dates accept any format - just be consistent",
      Required: "",
      Description: "",
    },
  ];

  const workbook = XLSX.utils.book_new();

  // Sheet 1: Data with sample
  const dataSheet = XLSX.utils.json_to_sheet(sampleData, { header: headers });

  // Set column widths
  dataSheet["!cols"] = headers.map((h) => ({
    wch: Math.max(h.length + 2, 18),
  }));

  // ─── KEY: Force all data cells to TEXT format ───
  // This prevents Excel from converting to scientific notation or date numbers
  const range = XLSX.utils.decode_range(dataSheet["!ref"]);
  for (let R = range.s.r + 1; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (dataSheet[cellRef]) {
        dataSheet[cellRef].t = "s"; // Force string type
        dataSheet[cellRef].z = "@"; // Text format
      }
    }
  }

  XLSX.utils.book_append_sheet(workbook, dataSheet, "Students");

  // Sheet 2: Instructions
  const instructionsSheet = XLSX.utils.json_to_sheet(instructions);
  instructionsSheet["!cols"] = [{ wch: 30 }, { wch: 12 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, "Instructions");

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
};

/**
 * Generate error report Excel
 */
const generateErrorReport = (errors) => {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(errors);

  // Set column widths
  sheet["!cols"] = [{ wch: 8 }, { wch: 15 }, { wch: 20 }, { wch: 50 }];

  XLSX.utils.book_append_sheet(workbook, sheet, "Import Errors");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
};

module.exports = {
  parseIndianDate,
  readExcel,
  generateStudentTemplate,
  generateErrorReport,
  // Export helpers for testing/use elsewhere
  toCleanString,
  cleanMobileNumber,
  cleanAadharNumber,
  cleanIdNumber,
};
