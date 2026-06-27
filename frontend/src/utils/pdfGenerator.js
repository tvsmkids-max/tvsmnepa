import jsPDF from "jspdf";
import "jspdf-autotable";

const SCHOOL_NAME =
  import.meta.env.VITE_SCHOOL_NAME || "Thakur Virendra Singh Memorial School";

const COLORS = {
  primary: [13, 27, 62], // #0D1B3E
  secondary: [30, 77, 152], // #1E4D98
  success: [46, 125, 50], // #2E7D32
  error: [198, 40, 40], // #C62828
  warning: [245, 127, 23], // #F57F17
  gray: [107, 123, 153], // #6B7B99
  lightGray: [248, 249, 252], // #F8F9FC
  white: [255, 255, 255],
  black: [26, 26, 46], // #1A1A2E
};

/**
 * Create base PDF document with school header
 */
const createPdf = (options = {}) => {
  const {
    orientation = "portrait",
    title = "Report",
    subtitle = "",
    schoolName,
    schoolAddress,
    schoolPhone,
    schoolEmail,
  } = options;

  const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  const name = schoolName || SCHOOL_NAME;
  const address = schoolAddress || "";
  const phone = schoolPhone || "";
  const email = schoolEmail || "";

  // ─── HEADER ────────────────────────────────────────
  // Blue header bar
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 28, "F");

  // School name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...COLORS.white);
  doc.text(name, pageWidth / 2, 12, { align: "center" });

  // Address line
  if (address || phone) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const addressLine = [address, phone, email].filter(Boolean).join(" | ");
    doc.text(addressLine, pageWidth / 2, 19, { align: "center" });
  }

  // Gold accent line
  doc.setDrawColor(245, 166, 35);
  doc.setLineWidth(1);
  doc.line(pageWidth / 2 - 30, 23, pageWidth / 2 + 30, 23);

  // ─── TITLE ─────────────────────────────────────────
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.primary);
  doc.text(title.toUpperCase(), pageWidth / 2, 36, { align: "center" });

  if (subtitle) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.gray);
    doc.text(subtitle, pageWidth / 2, 42, { align: "center" });
  }

  return { doc, startY: subtitle ? 48 : 42, pageWidth, pageHeight };
};

/**
 * Add footer to all pages
 */
const addFooter = (doc, generatedBy = "Admin") => {
  const pageCount = doc.internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  const now = new Date().toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Footer line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

    // Footer text
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.gray);
    doc.text(`Generated: ${now} | By: ${generatedBy}`, 14, pageHeight - 8);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, pageHeight - 8, {
      align: "right",
    });
  }
};

/**
 * Generate Daily Attendance Report PDF
 */
export const generateDailyAttendancePdf = (reportData, settings, userName) => {
  const dateStr = new Date(reportData.date).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const { doc, startY, pageWidth } = createPdf({
    title: "Daily Attendance Report",
    subtitle: dateStr,
    schoolName: settings?.schoolName,
    schoolAddress: settings?.address,
    schoolPhone: settings?.phone,
    schoolEmail: settings?.email,
  });

  let currentY = startY;

  // Summary box
  doc.setFillColor(...COLORS.lightGray);
  doc.roundedRect(14, currentY, pageWidth - 28, 14, 2, 2, "F");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.primary);

  const summaryItems = [
    `Classes: ${reportData.summary.totalClasses}`,
    `Students: ${reportData.summary.totalStudents}`,
    `Present: ${reportData.summary.totalPresent}`,
    `Absent: ${reportData.summary.totalAbsent}`,
    `Rate: ${reportData.summary.overallPercentage}%`,
  ];

  const spacing = (pageWidth - 28) / summaryItems.length;
  summaryItems.forEach((item, i) => {
    doc.text(item, 20 + i * spacing, currentY + 9);
  });

  currentY += 20;

  // Per class tables
  reportData.classes.forEach((cls) => {
    // Check page break
    if (currentY > doc.internal.pageSize.height - 50) {
      doc.addPage();
      currentY = 20;
    }

    // Class header
    doc.setFillColor(...COLORS.secondary);
    doc.roundedRect(14, currentY, pageWidth - 28, 8, 1, 1, "F");
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.white);
    doc.text(
      `Class ${cls.name} - Section ${cls.section}  |  Total: ${cls.total}  |  Present: ${cls.present}  |  Absent: ${cls.absent}  |  ${cls.percentage}%`,
      18,
      currentY + 5.5,
    );
    currentY += 12;

    // Student table
    if (cls.students && cls.students.length > 0) {
      const tableData = cls.students.map((s, idx) => [
        idx + 1,
        s.rollNumber || "—",
        s.scholarNumber || "—",
        s.name,
        s.status,
      ]);

      doc.autoTable({
        startY: currentY,
        head: [["#", "Roll", "Scholar", "Student Name", "Status"]],
        body: tableData,
        margin: { left: 14, right: 14 },
        styles: {
          fontSize: 8,
          cellPadding: 2,
          lineColor: [220, 220, 220],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: COLORS.primary,
          textColor: COLORS.white,
          fontStyle: "bold",
          fontSize: 8,
        },
        bodyStyles: {
          textColor: COLORS.black,
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250],
        },
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          1: { cellWidth: 18, halign: "center" },
          2: { cellWidth: 25 },
          3: { cellWidth: "auto" },
          4: {
            cellWidth: 22,
            halign: "center",
            fontStyle: "bold",
          },
        },
        didParseCell: (data) => {
          if (data.column.index === 4 && data.section === "body") {
            if (data.cell.raw === "Present") {
              data.cell.styles.textColor = COLORS.success;
            } else if (data.cell.raw === "Absent") {
              data.cell.styles.textColor = COLORS.error;
            } else {
              data.cell.styles.textColor = COLORS.gray;
            }
          }
        },
      });

      currentY = doc.lastAutoTable.finalY + 10;
    }
  });

  addFooter(doc, userName);

  return doc;
};

/**
 * Generate Monthly Attendance Report PDF
 */
export const generateMonthlyReportPdf = (reportData, settings, userName) => {
  const { doc, startY, pageWidth } = createPdf({
    title: "Monthly Attendance Summary",
    subtitle: `${reportData.monthName} ${reportData.year}`,
    schoolName: settings?.schoolName,
    schoolAddress: settings?.address,
    schoolPhone: settings?.phone,
    schoolEmail: settings?.email,
  });

  let currentY = startY;

  // Summary box
  doc.setFillColor(...COLORS.lightGray);
  doc.roundedRect(14, currentY, pageWidth - 28, 14, 2, 2, "F");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.primary);

  const summaryItems = [
    `Working Days: ${reportData.summary.workingDays}`,
    `Holidays: ${reportData.summary.holidays}`,
    `Students: ${reportData.summary.totalStudents}`,
    `Overall: ${reportData.summary.overallPercentage}%`,
  ];

  const spacing = (pageWidth - 28) / summaryItems.length;
  summaryItems.forEach((item, i) => {
    doc.text(item, 20 + i * spacing, currentY + 9);
  });

  currentY += 20;

  // Class-wise table
  const tableData = reportData.classes.map((cls) => [
    `${cls.name}-${cls.section}`,
    cls.totalStudents,
    cls.workingDays,
    cls.present,
    cls.absent,
    cls.totalMarks,
    `${cls.percentage}%`,
  ]);

  doc.autoTable({
    startY: currentY,
    head: [
      [
        "Class",
        "Students",
        "Working Days",
        "Present Marks",
        "Absent Marks",
        "Total Marks",
        "Attendance %",
      ],
    ],
    body: tableData,
    margin: { left: 14, right: 14 },
    styles: {
      fontSize: 9,
      cellPadding: 3,
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
    },
    bodyStyles: {
      textColor: COLORS.black,
      halign: "center",
    },
    columnStyles: {
      0: { halign: "left", fontStyle: "bold" },
      6: { fontStyle: "bold" },
    },
    didParseCell: (data) => {
      if (data.column.index === 6 && data.section === "body") {
        const val = parseInt(data.cell.raw);
        if (val >= 75) data.cell.styles.textColor = COLORS.success;
        else if (val >= 50) data.cell.styles.textColor = COLORS.warning;
        else data.cell.styles.textColor = COLORS.error;
      }
    },
  });

  currentY = doc.lastAutoTable.finalY + 10;

  // Holiday list
  if (reportData.holidays && reportData.holidays.length > 0) {
    if (currentY > doc.internal.pageSize.height - 60) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.primary);
    doc.text("Holidays in this Month", 14, currentY);
    currentY += 6;

    const holidayData = reportData.holidays.map((h) => [
      new Date(h.date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      }),
      h.name,
      h.type,
    ]);

    doc.autoTable({
      startY: currentY,
      head: [["Date", "Holiday", "Type"]],
      body: holidayData,
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: {
        fillColor: COLORS.warning,
        textColor: COLORS.white,
        fontStyle: "bold",
      },
    });
  }

  addFooter(doc, userName);

  return doc;
};

/**
 * Generate Defaulter List PDF
 */
export const generateDefaulterPdf = (reportData, settings, userName) => {
  const { doc, startY, pageWidth } = createPdf({
    title: "Defaulter List — Below Attendance Threshold",
    subtitle: `Threshold: ${reportData.threshold}% | Total: ${reportData.total} student(s)`,
    schoolName: settings?.schoolName,
    schoolAddress: settings?.address,
    schoolPhone: settings?.phone,
    schoolEmail: settings?.email,
  });

  if (reportData.defaulters.length === 0) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.success);
    doc.text(
      "No students below the threshold. All students are in good standing.",
      pageWidth / 2,
      startY + 20,
      { align: "center" },
    );
    addFooter(doc, userName);
    return doc;
  }

  const tableData = reportData.defaulters.map((s, idx) => [
    idx + 1,
    s.scholarNumber,
    s.rollNumber,
    s.name,
    s.fatherName,
    s.class ? `${s.class.name}-${s.class.section}` : "—",
    s.mobile === "0000000000" ? "—" : s.mobile,
    s.present,
    s.absent,
    s.total,
    `${s.percentage}%`,
  ]);

  doc.autoTable({
    startY,
    head: [
      [
        "#",
        "Scholar",
        "Roll",
        "Student Name",
        "Father Name",
        "Class",
        "Mobile",
        "P",
        "A",
        "Total",
        "%",
      ],
    ],
    body: tableData,
    margin: { left: 10, right: 10 },
    styles: {
      fontSize: 7,
      cellPadding: 2,
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: COLORS.error,
      textColor: COLORS.white,
      fontStyle: "bold",
      fontSize: 7,
      halign: "center",
    },
    bodyStyles: {
      textColor: COLORS.black,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 18 },
      2: { cellWidth: 12, halign: "center" },
      3: { cellWidth: "auto" },
      4: { cellWidth: "auto" },
      5: { cellWidth: 18, halign: "center" },
      6: { cellWidth: 22 },
      7: { cellWidth: 10, halign: "center" },
      8: { cellWidth: 10, halign: "center" },
      9: { cellWidth: 12, halign: "center" },
      10: {
        cellWidth: 12,
        halign: "center",
        fontStyle: "bold",
      },
    },
    didParseCell: (data) => {
      if (data.column.index === 10 && data.section === "body") {
        data.cell.styles.textColor = COLORS.error;
      }
    },
  });

  addFooter(doc, userName);

  return doc;
};

/**
 * Generate Student Attendance Certificate PDF
 */
export const generateStudentCertificatePdf = (
  student,
  stats,
  records,
  dateRange,
  settings,
  userName,
) => {
  const { doc, startY, pageWidth, pageHeight } = createPdf({
    title: "Student Attendance Report",
    subtitle: `For the period: ${dateRange.from} to ${dateRange.to}`,
    schoolName: settings?.schoolName,
    schoolAddress: settings?.address,
    schoolPhone: settings?.phone,
    schoolEmail: settings?.email,
  });

  let currentY = startY + 5;

  // Student info box
  doc.setFillColor(...COLORS.lightGray);
  doc.roundedRect(14, currentY, pageWidth - 28, 34, 2, 2, "F");

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.primary);
  doc.text("Student Details", 20, currentY + 8);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.black);

  const halfWidth = (pageWidth - 28) / 2;

  const leftInfo = [
    `Name: ${student.name}`,
    `Scholar Number: ${student.scholarNumber}`,
    `Roll Number: ${student.rollNumber}`,
  ];

  const rightInfo = [
    `Father: ${student.fatherName}`,
    `Class: ${student.class?.name || "—"} - ${student.class?.section || "—"}`,
    `Mobile: ${student.mobile === "0000000000" ? "—" : student.mobile}`,
  ];

  leftInfo.forEach((text, i) => {
    doc.text(text, 20, currentY + 15 + i * 6);
  });

  rightInfo.forEach((text, i) => {
    doc.text(text, 20 + halfWidth, currentY + 15 + i * 6);
  });

  currentY += 42;

  // Attendance summary
  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(14, currentY, pageWidth - 28, 10, 1, 1, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.white);
  doc.text("Attendance Summary", 18, currentY + 7);
  currentY += 14;

  // Stats boxes
  const boxWidth = (pageWidth - 28 - 15) / 4;

  const statsData = [
    { label: "Total Days", value: stats.total, color: COLORS.primary },
    {
      label: "Present",
      value: stats.present || stats.Present,
      color: COLORS.success,
    },
    {
      label: "Absent",
      value: stats.absent || stats.Absent,
      color: COLORS.error,
    },
    {
      label: "Percentage",
      value: `${stats.percentage}%`,
      color: stats.percentage >= 75 ? COLORS.success : COLORS.error,
    },
  ];

  statsData.forEach((stat, i) => {
    const x = 14 + i * (boxWidth + 5);
    doc.setFillColor(...COLORS.lightGray);
    doc.roundedRect(x, currentY, boxWidth, 20, 2, 2, "F");

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...stat.color);
    doc.text(String(stat.value), x + boxWidth / 2, currentY + 10, {
      align: "center",
    });

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.gray);
    doc.text(stat.label.toUpperCase(), x + boxWidth / 2, currentY + 17, {
      align: "center",
    });
  });

  currentY += 28;

  // Records table
  if (records && records.length > 0) {
    const tableData = records.map((r) => [
      new Date(r.date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      new Date(r.date).toLocaleDateString("en-IN", { weekday: "long" }),
      r.status,
      r.markedBy?.name || "—",
    ]);

    doc.autoTable({
      startY: currentY,
      head: [["Date", "Day", "Status", "Marked By"]],
      body: tableData,
      margin: { left: 14, right: 14 },
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
        lineColor: [220, 220, 220],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: COLORS.primary,
        textColor: COLORS.white,
        fontStyle: "bold",
        fontSize: 8,
      },
      bodyStyles: {
        textColor: COLORS.black,
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250],
      },
      columnStyles: {
        2: {
          halign: "center",
          fontStyle: "bold",
        },
      },
      didParseCell: (data) => {
        if (data.column.index === 2 && data.section === "body") {
          if (data.cell.raw === "Present") {
            data.cell.styles.textColor = COLORS.success;
          } else {
            data.cell.styles.textColor = COLORS.error;
          }
        }
      },
    });
  }

  addFooter(doc, userName);

  return doc;
};

/**
 * Helper: Download the PDF
 */
export const downloadPdf = (doc, filename) => {
  doc.save(`${filename}.pdf`);
};

/**
 * Helper: Open PDF in new tab for printing
 */
export const printPdf = (doc) => {
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
};
