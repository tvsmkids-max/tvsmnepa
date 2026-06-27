"use strict";

const XLSX = require("xlsx");

/**
 * Convert DD/MM/YYYY string to Date object
 */
const parseIndianDate = (dateValue) => {
  if (!dateValue) return null;

  // If Excel date (number)
  if (typeof dateValue === "number") {
    const excelEpoch = new Date(1899, 11, 30);
    return new Date(excelEpoch.getTime() + dateValue * 86400000);
  }

  // If string
  const dateStr = String(dateValue).trim();
  if (!dateStr) return null;

  // Try DD/MM/YYYY format
  const ddmmyyyy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
  const match = dateStr.match(ddmmyyyy);

  if (match) {
    const [, day, month, year] = match;
    const date = new Date(
      parseInt(year, 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10),
    );
    if (isNaN(date.getTime())) return null;
    return date;
  }

  // Fallback: try Date constructor
  const fallback = new Date(dateStr);
  return isNaN(fallback.getTime()) ? null : fallback;
};

/**
 * Read Excel file and return rows as JSON
 */
const readExcel = (buffer) => {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Convert to JSON with headers
  const rows = XLSX.utils.sheet_to_json(sheet, {
    defval: "", // Empty cells become empty string
    raw: false, // Convert all to strings except dates
  });

  return rows;
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
      Description: "Unique permanent ID for student",
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
      Description: "Format: DD/MM/YYYY (e.g., 15/03/2010)",
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
      Description: "Format: DD/MM/YYYY",
    },
    {
      Field: "Roll Number",
      Required: "No",
      Description: "Auto-generated per class if blank",
    },
    {
      Field: "Mobile",
      Required: "No",
      Description: "10-digit number (or leave blank)",
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
      Description: "Optional 12-digit number",
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
  ];

  const workbook = XLSX.utils.book_new();

  // Sheet 1: Data with sample
  const dataSheet = XLSX.utils.json_to_sheet(sampleData, { header: headers });

  // Set column widths
  dataSheet["!cols"] = headers.map((h) => ({
    wch: Math.max(h.length + 2, 18),
  }));

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
};
