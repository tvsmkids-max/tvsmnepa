import * as XLSX from "xlsx";

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

/**
 * Export students with proper formatting & column widths
 */
export const exportStudentsToExcel = (students, filename = "students") => {
  const data = students.map((s, idx) => ({
    "S.No": idx + 1,
    "Scholar No": s.scholarNumber || "",
    "Roll No": s.rollNumber || "",
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
    { wch: 6 },
    { wch: 14 },
    { wch: 10 },
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

/**
 * Export attendance register (Excel-style with merged headers + colors)
 */
export const exportRegisterToExcel = (register, filename = "register") => {
  if (!register || !register.students?.length) {
    throw new Error("No data to export");
  }

  const { students, dates, monthGroups, class: classInfo, summary } = register;

  // ─── Build aoa (array of arrays) ───
  const rows = [];

  // ─── Row 1: Title ───
  const titleRow = [
    `Attendance Register — Class ${classInfo.name}-${classInfo.section}`,
  ];
  rows.push(titleRow);

  // ─── Row 2: Date range info ───
  const fromStr = new Date(summary.dateFrom).toLocaleDateString("en-IN");
  const toStr = new Date(summary.dateTo).toLocaleDateString("en-IN");
  rows.push([
    `Period: ${fromStr} to ${toStr} | Students: ${summary.totalStudents} | Working Days: ${summary.workingDays} | Holidays: ${summary.holidays}`,
  ]);

  // ─── Row 3: Empty ───
  rows.push([]);

  // ─── Row 4: Month groups header ───
  const monthHeaderRow = ["", "", "", "", ""]; // Skip first 5 cols (S.No, Scholar, Roll, Name, Father)
  monthGroups.forEach((g) => {
    monthHeaderRow.push(g.label);
    for (let i = 1; i < g.count; i++) monthHeaderRow.push("");
  });
  monthHeaderRow.push("TOTALS", "", "");
  rows.push(monthHeaderRow);

  // ─── Row 5: Day names ───
  const dayNameRow = ["S.No", "Scholar No", "Roll", "Name", "Father"];
  dates.forEach((d) => dayNameRow.push(d.dayShort));
  dayNameRow.push("P", "A", "%");
  rows.push(dayNameRow);

  // ─── Row 6: Day numbers ───
  const dayNumRow = ["", "", "", "", ""];
  dates.forEach((d) => dayNumRow.push(d.day));
  dayNumRow.push("", "", "");
  rows.push(dayNumRow);

  // ─── Body rows ───
  const bodyStartRow = rows.length; // 0-indexed
  students.forEach((s, idx) => {
    const row = [idx + 1, s.scholarNumber, s.rollNumber, s.name, s.fatherName];
    dates.forEach((d) => {
      const status = s.attendance[d.dateKey];
      // Convert internal status to display label
      if (status === "P") row.push("P");
      else if (status === "A") row.push("A");
      else if (status === "H") row.push("H");
      else if (status === "-") row.push("");
      else row.push("");
    });
    row.push(s.totals.present, s.totals.absent, `${s.totals.percentage}%`);
    rows.push(row);
  });

  // ─── Build worksheet ───
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // ─── Column widths ───
  const colWidths = [
    { wch: 5 }, // S.No
    { wch: 12 }, // Scholar
    { wch: 6 }, // Roll
    { wch: 20 }, // Name
    { wch: 20 }, // Father
  ];
  dates.forEach(() => colWidths.push({ wch: 4 })); // Date columns
  colWidths.push({ wch: 5 }, { wch: 5 }, { wch: 7 }); // P, A, %
  ws["!cols"] = colWidths;

  // ─── Merge cells for title ───
  const totalCols = 5 + dates.length + 3;
  ws["!merges"] = ws["!merges"] || [];

  // Merge title row (Row 1: index 0)
  ws["!merges"].push({
    s: { r: 0, c: 0 },
    e: { r: 0, c: totalCols - 1 },
  });

  // Merge info row (Row 2: index 1)
  ws["!merges"].push({
    s: { r: 1, c: 0 },
    e: { r: 1, c: totalCols - 1 },
  });

  // Merge month groups (Row 4: index 3)
  let monthCol = 5;
  monthGroups.forEach((g) => {
    if (g.count > 1) {
      ws["!merges"].push({
        s: { r: 3, c: monthCol },
        e: { r: 3, c: monthCol + g.count - 1 },
      });
    }
    monthCol += g.count;
  });

  // Merge "TOTALS" header (Row 4)
  ws["!merges"].push({
    s: { r: 3, c: totalCols - 3 },
    e: { r: 3, c: totalCols - 1 },
  });

  // ─── Freeze first 5 cols + first 6 rows ───
  ws["!freeze"] = { xSplit: 5, ySplit: 6 };

  // ─── Cell styles (basic XLSX doesn't support full styling; use SheetJS pro for colors) ───
  // We add basic widths + merges. For colored cells, user can apply conditional formatting in Excel.

  // ─── Apply alignment to data cells (centered) ───
  // Note: SheetJS community edition has limited styling. The structure is correct.

  // ─── Create workbook ───
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Register");

  // ─── Add a second sheet with summary ───
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

  // ─── Write file ───
  XLSX.writeFile(wb, `${filename}.xlsx`);
};
