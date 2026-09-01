import * as XLSX from "xlsx";

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
//  STUDENT LIST EXPORT (Sorted + UPPERCASE)
// ═══════════════════════════════════════════════════════════════════

export const exportStudentsToExcel = (students, filename = "students") => {
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

  const ws = XLSX.utils.json_to_sheet(data);

  ws["!cols"] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 25 },
    { wch: 25 },
    { wch: 25 },
    { wch: 10 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 10 },
    { wch: 40 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 16 },
    { wch: 14 },
    { wch: 12 },
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

  const ws = XLSX.utils.aoa_to_sheet(rows);

  const colWidths = [{ wch: 5 }, { wch: 12 }, { wch: 20 }, { wch: 20 }];
  dates.forEach(() => colWidths.push({ wch: 4 }));
  colWidths.push({ wch: 5 }, { wch: 5 }, { wch: 7 });
  ws["!cols"] = colWidths;

  const totalCols = FIXED_COLS + dates.length + 3;
  ws["!merges"] = ws["!merges"] || [];

  ws["!merges"].push({ s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } });
  ws["!merges"].push({ s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } });

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

  ws["!merges"].push({
    s: { r: 3, c: totalCols - 3 },
    e: { r: 3, c: totalCols - 1 },
  });

  ws["!freeze"] = { xSplit: FIXED_COLS, ySplit: 6 };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Register");

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

  const ws = XLSX.utils.aoa_to_sheet(rows);

  const colWidths = [{ wch: 5 }, { wch: 12 }, { wch: 25 }, { wch: 22 }];
  dates.forEach(() => colWidths.push({ wch: 4 }));
  colWidths.push({ wch: 5 }, { wch: 5 }, { wch: 7 });
  ws["!cols"] = colWidths;

  const totalCols = 4 + dates.length + 3;
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } },
  ];

  ws["!freeze"] = { xSplit: 4, ySplit: 5 };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Attendance");

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

  const summaryWs = XLSX.utils.json_to_sheet(summaryData);
  summaryWs["!cols"] = [{ wch: 22 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

  XLSX.writeFile(wb, `${filename}.xlsx`);
};
