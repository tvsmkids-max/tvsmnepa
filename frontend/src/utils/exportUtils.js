import * as XLSX from "xlsx";

// ═══════════════════════════════════════════════════════════════════
//  GENERIC EXPORT HELPERS
// ═══════════════════════════════════════════════════════════════════

export const exportToExcel = (data, filename, sheetName = "Sheet1") => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

export const exportMultiSheet = (sheets, filename) => {
  const wb = XLSX.utils.book_new();
  sheets.forEach(({ name, data }) => {
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, name);
  });
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

// ═══════════════════════════════════════════════════════════════════
//  STUDENT LIST EXPORT
// ═══════════════════════════════════════════════════════════════════

export const exportStudentsToExcel = (students, filename = "students") => {
  const data = students.map((s, idx) => ({
    "S.No": idx + 1,
    "Scholar No": s.scholarNumber || "",
    Name: s.name || "",
    "Father's Name": s.fatherName || "",
    "Mother's Name": s.motherName || "",
    Gender: s.gender || "",
    "Date of Birth": s.dob ? new Date(s.dob).toLocaleDateString("en-IN") : "",
    Mobile: s.mobile === "0000000000" ? "—" : s.mobile || "",
    "Alternate Mobile": s.alternateMobile || "",
    Class: s.class?.name || "",
    Section: s.class?.section || s.section || "",
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

  const ws = XLSX.utils.json_to_sheet(data);

  ws["!cols"] = [
    { wch: 6 }, // S.No
    { wch: 14 }, // Scholar
    { wch: 25 }, // Name
    { wch: 25 }, // Father
    { wch: 25 }, // Mother
    { wch: 10 }, // Gender
    { wch: 14 }, // DOB
    { wch: 14 }, // Mobile
    { wch: 14 }, // Alt Mobile
    { wch: 12 }, // Class
    { wch: 10 }, // Section
    { wch: 40 }, // Address
    { wch: 12 }, // Blood
    { wch: 12 }, // Category
    { wch: 12 }, // Religion
    { wch: 16 }, // Aadhar
    { wch: 14 }, // Admission
    { wch: 12 }, // Status
  ];

  ws["!freeze"] = { xSplit: 0, ySplit: 1 };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Students");
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

// ═══════════════════════════════════════════════════════════════════
//  ATTENDANCE REGISTER EXPORT (Excel-style with merged headers)
// ═══════════════════════════════════════════════════════════════════

export const exportRegisterToExcel = (register, filename = "register") => {
  if (!register || !register.students?.length) {
    throw new Error("No data to export");
  }

  const { students, dates, monthGroups, class: classInfo, summary } = register;
  const rows = [];

  // Row 1: Title
  rows.push([
    `Attendance Register — Class ${classInfo.name}-${classInfo.section}`,
  ]);

  // Row 2: Date range info
  const fromStr = new Date(summary.dateFrom).toLocaleDateString("en-IN");
  const toStr = new Date(summary.dateTo).toLocaleDateString("en-IN");
  rows.push([
    `Period: ${fromStr} to ${toStr} | Students: ${summary.totalStudents} | Working Days: ${summary.workingDays} | Holidays: ${summary.holidays}`,
  ]);

  // Row 3: Empty spacer
  rows.push([]);

  // Row 4: Month groups header (skip first 4 cols: S.No, Scholar, Name, Father)
  const FIXED_COLS = 4;
  const monthHeaderRow = Array(FIXED_COLS).fill("");
  monthGroups.forEach((g) => {
    monthHeaderRow.push(g.label);
    for (let i = 1; i < g.count; i++) monthHeaderRow.push("");
  });
  monthHeaderRow.push("TOTALS", "", "");
  rows.push(monthHeaderRow);

  // Row 5: Day short names
  const dayNameRow = ["S.No", "Scholar No", "Name", "Father"];
  dates.forEach((d) => dayNameRow.push(d.dayShort));
  dayNameRow.push("P", "A", "%");
  rows.push(dayNameRow);

  // Row 6: Day numbers
  const dayNumRow = Array(FIXED_COLS).fill("");
  dates.forEach((d) => dayNumRow.push(d.day));
  dayNumRow.push("", "", "");
  rows.push(dayNumRow);

  // Body rows
  students.forEach((s, idx) => {
    const row = [idx + 1, s.scholarNumber, s.name, s.fatherName];
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

  // Build worksheet
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column widths
  const colWidths = [
    { wch: 5 }, // S.No
    { wch: 12 }, // Scholar
    { wch: 20 }, // Name
    { wch: 20 }, // Father
  ];
  dates.forEach(() => colWidths.push({ wch: 4 }));
  colWidths.push({ wch: 5 }, { wch: 5 }, { wch: 7 }); // P, A, %
  ws["!cols"] = colWidths;

  // Merge cells
  const totalCols = FIXED_COLS + dates.length + 3;
  ws["!merges"] = ws["!merges"] || [];

  // Merge title row
  ws["!merges"].push({
    s: { r: 0, c: 0 },
    e: { r: 0, c: totalCols - 1 },
  });

  // Merge info row
  ws["!merges"].push({
    s: { r: 1, c: 0 },
    e: { r: 1, c: totalCols - 1 },
  });

  // Merge month groups
  let monthCol = FIXED_COLS;
  monthGroups.forEach((g) => {
    if (g.count > 1) {
      ws["!merges"].push({
        s: { r: 3, c: monthCol },
        e: { r: 3, c: monthCol + g.count - 1 },
      });
    }
    monthCol += g.count;
  });

  // Merge "TOTALS" header
  ws["!merges"].push({
    s: { r: 3, c: totalCols - 3 },
    e: { r: 3, c: totalCols - 1 },
  });

  // Freeze first 4 cols + first 6 rows
  ws["!freeze"] = { xSplit: FIXED_COLS, ySplit: 6 };

  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Register");

  // Summary sheet
  const summaryData = [
    { Metric: "Class", Value: `${classInfo.name}-${classInfo.section}` },
    { Metric: "Class Teacher", Value: classInfo.classTeacher || "—" },
    { Metric: "Period From", Value: fromStr },
    { Metric: "Period To", Value: toStr },
    { Metric: "Total Days", Value: summary.totalDays },
    { Metric: "Working Days", Value: summary.workingDays },
    { Metric: "Holidays", Value: summary.holidays },
    { Metric: "Sundays", Value: summary.sundays },
    { Metric: "Total Students", Value: summary.totalStudents },
    { Metric: "", Value: "" },
    { Metric: "Legend", Value: "" },
    { Metric: "P", Value: "Present" },
    { Metric: "A", Value: "Absent" },
    { Metric: "H", Value: "Holiday" },
    { Metric: "(blank)", Value: "Sunday / Non-working / Not marked" },
  ];

  const summaryWs = XLSX.utils.json_to_sheet(summaryData);
  summaryWs["!cols"] = [{ wch: 20 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

  XLSX.writeFile(wb, `${filename}.xlsx`);
};

// ═══════════════════════════════════════════════════════════════════
//  MONTHLY CLASS ATTENDANCE EXPORT (Calendar-style)
// ═══════════════════════════════════════════════════════════════════

export const exportMonthlyClassToExcel = (
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

  // Title row
  rows.push([
    `Monthly Attendance — Class ${classInfo.name}-${classInfo.section} — ${monthName} ${year}`,
  ]);

  // Info row
  rows.push([
    `Teacher: ${classInfo.classTeacher || "—"} | Students: ${summary.totalStudents} | Working Days: ${workingDays} | Overall: ${summary.overallPercentage}%`,
  ]);

  rows.push([]); // spacer

  // Header row 1: day short names
  const dayNameRow = ["S.No", "Scholar", "Name", "Father"];
  dates.forEach((d) => dayNameRow.push(d.dayShort.charAt(0)));
  dayNameRow.push("P", "A", "%");
  rows.push(dayNameRow);

  // Header row 2: day numbers
  const dayNumRow = ["", "", "", ""];
  dates.forEach((d) => dayNumRow.push(d.day));
  dayNumRow.push("", "", "");
  rows.push(dayNumRow);

  // Data rows
  students.forEach((s, idx) => {
    const row = [
      idx + 1,
      s.scholarNumber || "",
      s.name || "",
      s.fatherName || "",
    ];
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

  // Build worksheet
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column widths
  const colWidths = [
    { wch: 5 }, // S.No
    { wch: 12 }, // Scholar
    { wch: 25 }, // Name
    { wch: 22 }, // Father
  ];
  dates.forEach(() => colWidths.push({ wch: 4 }));
  colWidths.push({ wch: 5 }, { wch: 5 }, { wch: 7 });
  ws["!cols"] = colWidths;

  // Merge title + info rows
  const totalCols = 4 + dates.length + 3;
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } },
  ];

  // Freeze first 4 cols + first 5 rows
  ws["!freeze"] = { xSplit: 4, ySplit: 5 };

  // Workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Attendance");

  // Summary sheet
  const summaryData = [
    { Metric: "Class", Value: `${classInfo.name}-${classInfo.section}` },
    { Metric: "Teacher", Value: classInfo.classTeacher || "—" },
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

  const summaryWs = XLSX.utils.json_to_sheet(summaryData);
  summaryWs["!cols"] = [{ wch: 22 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

  XLSX.writeFile(wb, `${filename}.xlsx`);
};
