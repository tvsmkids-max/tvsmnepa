// ═══════════════════════════════════════════════════════════════════
//  EXCEL EXPORT (ExcelJS)
//  ExcelJS is loaded on demand so it is not part of the main bundle.
//  All exports are ASYNC — callers must `await` them.
// ═══════════════════════════════════════════════════════════════════

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

let excelJsPromise = null;
const loadExcelJS = () => {
  if (!excelJsPromise) {
    excelJsPromise = import("exceljs")
      .then((mod) => mod.default || mod)
      .catch((err) => {
        excelJsPromise = null; // allow retry after a failed chunk load
        throw err;
      });
  }
  return excelJsPromise;
};

const newWorkbook = async () => {
  const ExcelJS = await loadExcelJS();
  return new ExcelJS.Workbook();
};

// Excel sheet names: max 31 chars, none of  \ / ? * [ ] :
const safeSheetName = (name) =>
  String(name || "Sheet1")
    .replace(/[\\/?*[\]:]/g, "-")
    .slice(0, 31) || "Sheet1";

// Cell values are written as plain values — text is NEVER treated as a formula
const toCellValue = (v) => {
  if (v === undefined || v === null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "boolean" || v instanceof Date) return v;
  return String(v).slice(0, 32767); // Excel's per-cell limit
};

// Equivalent of XLSX.utils.json_to_sheet: header = union of keys (first-seen order)
const addJsonSheet = (wb, name, data) => {
  const ws = wb.addWorksheet(safeSheetName(name));
  const keys = [];
  const seen = new Set();
  (data || []).forEach((obj) => {
    Object.keys(obj || {}).forEach((k) => {
      if (!seen.has(k)) {
        seen.add(k);
        keys.push(k);
      }
    });
  });
  if (keys.length > 0) {
    ws.addRow(keys);
    data.forEach((obj) => ws.addRow(keys.map((k) => toCellValue(obj?.[k]))));
  }
  return ws;
};

// Equivalent of XLSX.utils.aoa_to_sheet
const addArraySheet = (wb, name, rows) => {
  const ws = wb.addWorksheet(safeSheetName(name));
  rows.forEach((row) => ws.addRow(row.map(toCellValue)));
  return ws;
};

// Column widths in characters (same units as SheetJS `wch`)
const setColWidths = (ws, widths) => {
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });
};

// merge({ r, c }) are 0-based like SheetJS; ExcelJS is 1-based
const mergeRange = (ws, s, e) => ws.mergeCells(s.r + 1, s.c + 1, e.r + 1, e.c + 1);

const freezePanes = (ws, xSplit, ySplit) => {
  ws.views = [{ state: "frozen", xSplit, ySplit }];
};

const downloadWorkbook = async (wb, filename) => {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: XLSX_MIME });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};

// ═══════════════════════════════════════════════════════════════════
//  SMART CLASS SORT RANK (Nursery → 12th)
// ═══════════════════════════════════════════════════════════════════
const getClassRankUtil = (cls) => {
  if (!cls?.name) return 999;
  const name = cls.name.toString().trim().toUpperCase();
  if (/^PRE/.test(name) || name === "PLAYGROUP" || name === "PLAY") return 0;
  if (/^NUR/.test(name) || name === "NURSERY") return 1;
  if (/^L\.?K\.?G/.test(name) || name === "LKG" || name === "LOWER KG")
    return 2;
  if (/^U\.?K\.?G/.test(name) || name === "UKG" || name === "UPPER KG")
    return 3;
  const numMatch = name.match(/^(?:CLASS\s*)?(\d{1,2})(?:ST|ND|RD|TH)?/);
  if (numMatch) {
    const num = parseInt(numMatch[1], 10);
    if (num >= 1 && num <= 12) return 10 + num;
  }
  return 999;
};

const UP = (v) => (v ? String(v).toUpperCase() : "");

// ═══════════════════════════════════════════════════════════════════
//  GENERIC EXPORT HELPERS
// ═══════════════════════════════════════════════════════════════════

export const exportToExcel = async (data, filename, sheetName = "Sheet1") => {
  const wb = await newWorkbook();
  addJsonSheet(wb, sheetName, data);
  await downloadWorkbook(wb, filename);
};

export const exportMultiSheet = async (sheets, filename) => {
  const wb = await newWorkbook();
  sheets.forEach(({ name, data }) => {
    addJsonSheet(wb, name, data);
  });
  await downloadWorkbook(wb, filename);
};

// ═══════════════════════════════════════════════════════════════════
//  STUDENT LIST EXPORT (Sorted + UPPERCASE)
// ═══════════════════════════════════════════════════════════════════

export const exportStudentsToExcel = async (
  students,
  filename = "students",
) => {
  // ✅ FIX 5 & 10: Sort by Class Rank → Section → Name → UPPERCASE names
  const sorted = [...students].sort((a, b) => {
    const rA = getClassRankUtil(a.class);
    const rB = getClassRankUtil(b.class);
    if (rA !== rB) return rA - rB;

    const secA = (a.class?.section || a.section || "").toLowerCase();
    const secB = (b.class?.section || b.section || "").toLowerCase();
    if (secA !== secB) return secA.localeCompare(secB);

    return (a.name || "")
      .toLowerCase()
      .localeCompare((b.name || "").toLowerCase());
  });

  const data = sorted.map((s, idx) => ({
    "S.No": idx + 1,
    "Scholar No": UP(s.scholarNumber),
    Name: UP(s.name),
    "Father's Name": UP(s.fatherName),
    "Mother's Name": UP(s.motherName),
    Gender: s.gender || "",
    "Date of Birth": s.dob ? new Date(s.dob).toLocaleDateString("en-IN") : "",
    Mobile: s.mobile === "0000000000" ? "—" : s.mobile || "",
    "Alternate Mobile": s.alternateMobile || "",
    Class: UP(s.class?.name),
    Section: UP(s.class?.section || s.section),
    Address: s.address || "",
    "Blood Group": s.bloodGroup || "",
    Category: s.category || "",
    Religion: s.religion || "",
    "Aadhar Number": s.aadharNumber || "",
    "Admission Date": s.admissionDate
      ? new Date(s.admissionDate).toLocaleDateString("en-IN")
      : "",
    Status: s.status || "",
  }));

  const wb = await newWorkbook();
  const ws = addJsonSheet(wb, "Students", data);

  setColWidths(
    ws,
    [6, 14, 25, 25, 25, 10, 14, 14, 14, 12, 10, 40, 12, 12, 12, 16, 14, 12],
  );

  // Freeze the header row
  freezePanes(ws, 0, 1);

  await downloadWorkbook(wb, filename);
};

// ═══════════════════════════════════════════════════════════════════
//  ATTENDANCE REGISTER EXPORT (Excel-style with merged headers)
// ═══════════════════════════════════════════════════════════════════

export const exportRegisterToExcel = async (register, filename = "register") => {
  if (!register || !register.students?.length) {
    throw new Error("No data to export");
  }

  const { students, dates, monthGroups, class: classInfo, summary } = register;
  const rows = [];

  rows.push([
    `ATTENDANCE REGISTER — CLASS ${UP(classInfo.name)}-${UP(classInfo.section)}`,
  ]);

  const fromStr = new Date(summary.dateFrom).toLocaleDateString("en-IN");
  const toStr = new Date(summary.dateTo).toLocaleDateString("en-IN");
  rows.push([
    `Period: ${fromStr} to ${toStr} | Students: ${summary.totalStudents} | Working Days: ${summary.workingDays} | Holidays: ${summary.holidays}`,
  ]);

  rows.push([]);

  const FIXED_COLS = 4;
  const monthHeaderRow = Array(FIXED_COLS).fill("");
  monthGroups.forEach((g) => {
    monthHeaderRow.push(g.label);
    for (let i = 1; i < g.count; i++) monthHeaderRow.push("");
  });
  monthHeaderRow.push("TOTALS", "", "");
  rows.push(monthHeaderRow);

  const dayNameRow = ["S.No", "SCHOLAR NO", "NAME", "FATHER"];
  dates.forEach((d) => dayNameRow.push(d.dayShort));
  dayNameRow.push("P", "A", "%");
  rows.push(dayNameRow);

  const dayNumRow = Array(FIXED_COLS).fill("");
  dates.forEach((d) => dayNumRow.push(d.day));
  dayNumRow.push("", "", "");
  rows.push(dayNumRow);

  students.forEach((s, idx) => {
    // ✅ UPPERCASE names
    const row = [idx + 1, UP(s.scholarNumber), UP(s.name), UP(s.fatherName)];
    dates.forEach((d) => {
      const status = s.attendance[d.dateKey];
      if (status === "P") row.push("P");
      else if (status === "A") row.push("A");
      else if (status === "H") row.push("H");
      else row.push("");
    });
    row.push(s.totals.present, s.totals.absent, `${s.totals.percentage}%`);
    rows.push(row);
  });

  const wb = await newWorkbook();
  const ws = addArraySheet(wb, "Register", rows);

  const colWidths = [5, 12, 20, 20];
  dates.forEach(() => colWidths.push(4));
  colWidths.push(5, 5, 7);
  setColWidths(ws, colWidths);

  const totalCols = FIXED_COLS + dates.length + 3;

  mergeRange(ws, { r: 0, c: 0 }, { r: 0, c: totalCols - 1 });
  mergeRange(ws, { r: 1, c: 0 }, { r: 1, c: totalCols - 1 });

  let monthCol = FIXED_COLS;
  monthGroups.forEach((g) => {
    if (g.count > 1) {
      mergeRange(ws, { r: 3, c: monthCol }, { r: 3, c: monthCol + g.count - 1 });
    }
    monthCol += g.count;
  });

  mergeRange(ws, { r: 3, c: totalCols - 3 }, { r: 3, c: totalCols - 1 });

  freezePanes(ws, FIXED_COLS, 6);

  const summaryData = [
    { Metric: "Class", Value: UP(`${classInfo.name}-${classInfo.section}`) },
    { Metric: "Class Teacher", Value: UP(classInfo.classTeacher) || "—" },
    { Metric: "Period From", Value: fromStr },
    { Metric: "Period To", Value: toStr },
    { Metric: "Total Days", Value: summary.totalDays },
    { Metric: "Working Days", Value: summary.workingDays },
    { Metric: "Holidays", Value: summary.holidays },
    { Metric: "Sundays", Value: summary.sundays },
    { Metric: "Total Students", Value: summary.totalStudents },
    { Metric: "", Value: "" },
    { Metric: "LEGEND", Value: "" },
    { Metric: "P", Value: "Present" },
    { Metric: "A", Value: "Absent" },
    { Metric: "H", Value: "Holiday" },
    { Metric: "(blank)", Value: "Sunday / Non-working / Not marked" },
  ];

  const summaryWs = addJsonSheet(wb, "Summary", summaryData);
  setColWidths(summaryWs, [20, 40]);

  await downloadWorkbook(wb, filename);
};

// ═══════════════════════════════════════════════════════════════════
//  MONTHLY CLASS ATTENDANCE EXPORT (Calendar-style)
// ═══════════════════════════════════════════════════════════════════

export const exportMonthlyClassToExcel = async (
  detail,
  filename = "monthly-class",
) => {
  if (!detail || !detail.students?.length) {
    throw new Error("No data to export");
  }

  const {
    students,
    dates,
    class: classInfo,
    monthName,
    year,
    workingDays,
    summary,
  } = detail;

  const rows = [];

  rows.push([
    `MONTHLY ATTENDANCE — CLASS ${UP(classInfo.name)}-${UP(classInfo.section)} — ${UP(monthName)} ${year}`,
  ]);

  rows.push([
    `Teacher: ${UP(classInfo.classTeacher) || "—"} | Students: ${summary.totalStudents} | Working Days: ${workingDays} | Overall: ${summary.overallPercentage}%`,
  ]);

  rows.push([]);

  const dayNameRow = ["S.No", "SCHOLAR", "NAME", "FATHER"];
  dates.forEach((d) => dayNameRow.push(d.dayShort.charAt(0)));
  dayNameRow.push("P", "A", "%");
  rows.push(dayNameRow);

  const dayNumRow = ["", "", "", ""];
  dates.forEach((d) => dayNumRow.push(d.day));
  dayNumRow.push("", "", "");
  rows.push(dayNumRow);

  students.forEach((s, idx) => {
    // ✅ UPPERCASE
    const row = [idx + 1, UP(s.scholarNumber), UP(s.name), UP(s.fatherName)];
    dates.forEach((d) => {
      const status = s.dailyAttendance[d.dateKey];
      if (status === "P") row.push("P");
      else if (status === "A") row.push("A");
      else if (status === "H") row.push("H");
      else row.push("");
    });
    row.push(s.present, s.absent, `${s.percentage}%`);
    rows.push(row);
  });

  const wb = await newWorkbook();
  const ws = addArraySheet(wb, "Attendance", rows);

  const colWidths = [5, 12, 25, 22];
  dates.forEach(() => colWidths.push(4));
  colWidths.push(5, 5, 7);
  setColWidths(ws, colWidths);

  const totalCols = 4 + dates.length + 3;
  mergeRange(ws, { r: 0, c: 0 }, { r: 0, c: totalCols - 1 });
  mergeRange(ws, { r: 1, c: 0 }, { r: 1, c: totalCols - 1 });

  freezePanes(ws, 4, 5);

  const summaryData = [
    { Metric: "Class", Value: UP(`${classInfo.name}-${classInfo.section}`) },
    { Metric: "Teacher", Value: UP(classInfo.classTeacher) || "—" },
    { Metric: "Month", Value: `${monthName} ${year}` },
    { Metric: "Total Students", Value: summary.totalStudents },
    { Metric: "Working Days", Value: workingDays },
    { Metric: "Total Present", Value: summary.totalPresent },
    { Metric: "Total Absent", Value: summary.totalAbsent },
    { Metric: "Overall %", Value: `${summary.overallPercentage}%` },
    {
      Metric: "Perfect Attendance",
      Value: summary.perfectAttendanceStudents || 0,
    },
    { Metric: "Below 75%", Value: summary.lowAttendanceStudents || 0 },
    { Metric: "", Value: "" },
    { Metric: "LEGEND", Value: "" },
    { Metric: "P", Value: "Present" },
    { Metric: "A", Value: "Absent" },
    { Metric: "H", Value: "Holiday" },
    { Metric: "(blank)", Value: "Sunday / Non-working / Not marked" },
  ];

  const summaryWs = addJsonSheet(wb, "Summary", summaryData);
  setColWidths(summaryWs, [22, 40]);

  await downloadWorkbook(wb, filename);
};
