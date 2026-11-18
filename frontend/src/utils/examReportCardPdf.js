import { jsPDF } from "jspdf";
import { downloadPdf, printPdf } from "./pdfGenerator"; // also registers autotable
import { loadLogo } from "./examAdmitCardPdf";

export { loadLogo };

// Progress report card: one A4 portrait page per student. Quarterly, Half
// Yearly and Annual are combined on one card; an unpublished exam prints "—".
const PAGE_W = 210;
const PAGE_H = 297;
const M = 6; // border inset
const L = 10; // content left
const W = PAGE_W - 2 * L;
const FONT = "times";
const EXAMS = [
  ["quarterly", "QUARTERLY EXAM"],
  ["half_yearly", "HALF YEARLY EXAM"],
  ["annual", "ANNUAL EXAM"],
];

const imgType = (img) => (img.dataUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG");
const dash = "—";
const num = (v) => (v === null || v === undefined ? dash : String(v));
const fmtDate = (d) => {
  if (!d) return "";
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${p(x.getUTCDate())}-${p(x.getUTCMonth() + 1)}-${x.getUTCFullYear()}`;
};
const pctText = (t) => (!t ? dash : t.complete && t.percentage !== null ? `${t.percentage.toFixed(2)} %` : "Incomplete");
const totalText = (t) => (!t ? dash : t.complete && t.obtained !== null ? `${t.obtained} / ${t.max}` : "Incomplete");

const centered = (doc, text, y, size, style = "bold", x = PAGE_W / 2) => {
  doc.setFont(FONT, style);
  doc.setFontSize(size);
  doc.text(text, x, y, { align: "center" });
};

// Shrinks text to fit a width (never cuts it unless it still cannot fit).
const fit = (doc, text, maxW, size, min = 6) => {
  let s = size;
  doc.setFontSize(s);
  while (doc.getTextWidth(text) > maxW && s > min) {
    s -= 0.5;
    doc.setFontSize(s);
  }
  return s;
};

const subjectHeaderLabels = (data, type) => {
  const first = data.subjects.find((s) => !s.gradeOnly);
  const m = first && data.maxima?.[type]?.[first.key];
  if (!m) return ["Written\nMarks", "Int. Ass.\nMarks", "Total\nMarks"];
  return m.internalMax > 0
    ? [`Written\nMarks (${m.written})`, `Int. Ass.\nMarks (${m.internalMax})`, `Total Marks\n(${m.max})`]
    : [dash, dash, `Total Marks\n(${m.max})`];
};

const drawCard = (doc, card, ctx) => {
  const { data, logo, sessionName } = ctx;
  const school = data.school;

  // Border + faint watermark first, so the tables sit on top of it.
  doc.setDrawColor(0);
  doc.setLineWidth(0.6);
  doc.rect(M, M, PAGE_W - 2 * M, PAGE_H - 2 * M);
  if (logo) {
    const size = 120;
    doc.setGState(new doc.GState({ opacity: 0.07 }));
    doc.addImage(logo.dataUrl, imgType(logo), (PAGE_W - size) / 2, 118, size, size * (logo.h / logo.w), undefined, "FAST");
    doc.setGState(new doc.GState({ opacity: 1 }));
  }

  // Header.
  if (logo) {
    const h = 26;
    const w = Math.min(30, h * (logo.w / logo.h));
    doc.addImage(logo.dataUrl, imgType(logo), L, M + 3, w, w * (logo.h / logo.w), undefined, "FAST");
  }
  doc.setTextColor(0);
  centered(doc, school.nameLines[0], 17, 17, "bold", PAGE_W / 2 + 12);
  centered(doc, school.nameLines[1], 25, 17, "bold", PAGE_W / 2 + 12);
  centered(doc, school.address, 32, 7.5, "normal", PAGE_W / 2 + 12);
  doc.setFont(FONT, "normal");
  doc.setFontSize(7.5);
  doc.text(school.recognition, L - 1, 37);
  doc.text(`DISE CODE: - ${school.diseCode}`, PAGE_W - L + 1, 37, { align: "right" });
  doc.setLineWidth(0.4);
  doc.line(M, 39.5, PAGE_W - M, 39.5);

  centered(doc, "PROGRESS REPORT CARD", 46, 13);
  centered(doc, `(ACADEMIC SESSION: ${sessionName})`, 50.5, 8);

  const base = {
    theme: "grid",
    margin: { left: L, right: L },
    tableWidth: W,
    styles: {
      font: FONT, fontSize: 9, textColor: 0, lineColor: 0, lineWidth: 0.3,
      cellPadding: { top: 1.6, bottom: 1.6, left: 2, right: 2 }, valign: "middle", fillColor: false,
    },
  };

  // Student profile.
  doc.autoTable({
    ...base,
    startY: 55,
    head: [[{ content: "STUDENT PROFILE", colSpan: 4, styles: { halign: "center", fontStyle: "bold", fontSize: 10, fillColor: [225, 225, 225] } }]],
    body: [
      ["STUDENT NAME:", card.name.toUpperCase(), "SCHOLAR NO.:", card.scholarNumber || ""],
      ["CLASS:", `${data.class.name}${data.class.section ? ` - ${data.class.section}` : ""}`, "ROLL NO:", String(card.rollNumber)],
      ["FATHER’S / GUARDIAN NAME:", (card.fatherName || "").toUpperCase(), "MOTHER’S NAME:", (card.motherName || "").toUpperCase()],
      ["DATE OF BIRTH:", fmtDate(card.dob), "RESULT:", card.result || dash],
    ],
    columnStyles: { 0: { cellWidth: 38 }, 1: { cellWidth: 57 }, 2: { cellWidth: 32 }, 3: { cellWidth: 63 } },
    headStyles: { textColor: 0, lineColor: 0 },
  });

  // Academic performance.
  const subjects = data.subjects;
  const rowH = subjects.length > 8 ? 6.4 : 7.4;
  const sub = EXAMS.flatMap(([t]) => subjectHeaderLabels(data, t));
  const body = subjects.map((s) => {
    const row = [{ content: s.name.toUpperCase(), styles: { fontStyle: "bold", fontSize: 8.5 } }];
    EXAMS.forEach(([t]) => {
      const c = card.marks[s.key]?.[t];
      if (s.gradeOnly) {
        row.push({ content: "GRADE", colSpan: 2, styles: { halign: "center", fontSize: 8, cellPadding: { top: 1.2, bottom: 1.2, left: 1, right: 1 } } });
        row.push({ content: !c ? dash : c.result === "absent" ? "AB" : c.grade || dash, styles: { halign: "center" } });
        return;
      }
      if (!c) {
        row.push({ content: dash, styles: { halign: "center" } }, { content: dash, styles: { halign: "center" } }, { content: dash, styles: { halign: "center" } });
      } else if (c.result === "absent") {
        row.push({ content: "ABSENT", colSpan: 3, styles: { halign: "center", fontSize: 8 } });
      } else {
        const hasParts = c.internalMarks !== null && c.writtenMarks !== null;
        row.push(
          { content: hasParts ? num(c.writtenMarks) : dash, styles: { halign: "center" } },
          { content: hasParts ? num(c.internalMarks) : dash, styles: { halign: "center" } },
          { content: num(c.marks), styles: { halign: "center", fontStyle: "bold" } },
        );
      }
    });
    return row;
  });
  const sh = { halign: "center", fontSize: 7, fontStyle: "normal", cellPadding: 0.9 };
  doc.autoTable({
    ...base,
    startY: doc.lastAutoTable.finalY + 6,
    head: [
      [{ content: "ACADEMIC PERFORMANCE", colSpan: 10, styles: { halign: "center", fontStyle: "bold", fontSize: 10, fillColor: [225, 225, 225] } }],
      [
        { content: "SUBJECTS", rowSpan: 2, styles: { halign: "center", fontStyle: "bold", fontSize: 9 } },
        ...EXAMS.map(([, label]) => ({ content: label, colSpan: 3, styles: { halign: "center", fontStyle: "bold", fontSize: 9.5 } })),
      ],
      sub.map((c) => ({ content: c, styles: sh })),
    ],
    body,
    headStyles: { textColor: 0, lineColor: 0, fillColor: [248, 248, 248] },
    styles: { ...base.styles, minCellHeight: rowH },
    columnStyles: { 0: { cellWidth: 28 } },
  });

  // Totals.
  doc.autoTable({
    ...base,
    startY: doc.lastAutoTable.finalY + 6,
    head: [["EXAMINATION", "TOTAL MARKS", "PERCENTAGE"]],
    body: EXAMS.map(([t, label]) => [
      { content: label, styles: { fontStyle: "bold" } },
      totalText(card.totals[t]),
      pctText(card.totals[t]),
    ]),
    headStyles: { textColor: 0, lineColor: 0, fillColor: [225, 225, 225], halign: "center", fontStyle: "bold" },
    columnStyles: { 0: { halign: "center", cellWidth: 62 }, 1: { halign: "center", cellWidth: 64 }, 2: { halign: "center", cellWidth: 64 } },
    styles: { ...base.styles, minCellHeight: 6.8 },
  });

  // Remark / rank / attendance.
  const y0 = doc.lastAutoTable.finalY + 6;
  const bh = 13;
  const box = (x, w, label, labelW, value, size = 9) => {
    doc.setLineWidth(0.3);
    doc.rect(x, y0, w, bh);
    doc.line(x + labelW, y0, x + labelW, y0 + bh);
    doc.setFillColor(225, 225, 225);
    doc.rect(x, y0, labelW, bh, "FD");
    doc.setFont(FONT, "bold");
    doc.setFontSize(9);
    doc.text(label, x + labelW / 2, y0 + bh / 2 + 1.2, { align: "center" });
    doc.setFont(FONT, "normal");
    const lines = doc.splitTextToSize(String(value), w - labelW - 4);
    fit(doc, lines[0] || "", w - labelW - 4, size, 6);
    doc.setFontSize(lines.length > 1 ? 8 : size);
    doc.text(lines.slice(0, 2), x + labelW + 2, y0 + (lines.length > 1 ? 5.2 : bh / 2 + 1.2));
  };
  box(L, 88, "REMARK:", 20, (card.remark || "").toUpperCase());
  box(L + 98, 38, "RANK:", 17, card.printRank ? String(card.printRank) : "-");
  box(L + 146, 44, "ATTENDANCE:", 26, card.attendance.total ? `${card.attendance.present} / ${card.attendance.total}` : dash, 9);

  const y1 = y0 + bh + 4;
  doc.setLineWidth(0.3);
  doc.setFillColor(225, 225, 225);
  doc.rect(L + 120, y1, 32, 7.5, "FD");
  doc.rect(L + 152, y1, 38, 7.5);
  doc.setFont(FONT, "bold");
  doc.setFontSize(8.5);
  doc.text("PROMOTED TO:", L + 136, y1 + 5, { align: "center" });
  fit(doc, (card.promotedTo || "").toUpperCase(), 35, 8.5, 6);
  doc.setFont(FONT, "bold");
  doc.text((card.promotedTo || "").toUpperCase(), L + 171, y1 + 5, { align: "center" });

  // Signatures.
  const ys = PAGE_H - 28;
  doc.setLineWidth(0.3);
  doc.line(L, ys, L + 48, ys);
  doc.line(L + 66, ys, L + 124, ys);
  doc.line(L + 140, ys, L + W, ys);
  doc.setFont(FONT, "bold");
  doc.setFontSize(9.5);
  doc.text("Class Teacher Sign.", L, ys + 6);
  doc.text("Principal’s Seal & Sign.", L + 66, ys + 6);
  doc.text("Parent’s / Guardian Sign.", L + W, ys + 6, { align: "right" });

  // Footer.
  doc.setLineWidth(0.4);
  doc.line(M, PAGE_H - M - 9, PAGE_W - M, PAGE_H - M - 9);
  doc.setFontSize(8);
  fit(doc, school.footer, PAGE_W - 2 * M - 6, 8, 6);
  doc.setFont(FONT, "bold");
  doc.text(school.footer, PAGE_W / 2, PAGE_H - M - 3.2, { align: "center" });
};

/** data = GET /exams/report-cards response; cards = the students to print. */
export const buildReportCardPdf = ({ data, cards, logo, sessionName }) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  cards.forEach((card, i) => {
    if (i > 0) doc.addPage();
    drawCard(doc, card, { data, logo, sessionName });
  });
  return doc;
};

export const downloadReportCardPdf = (args, filename) => downloadPdf(buildReportCardPdf(args), filename);
export const printReportCardPdf = (args) => printPdf(buildReportCardPdf(args));
