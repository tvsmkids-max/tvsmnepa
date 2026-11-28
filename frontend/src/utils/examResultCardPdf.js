import { jsPDF } from "jspdf";
import { downloadPdf, printPdf } from "./pdfGenerator";

// Single-exam "Student Result Card" slips for Quarterly and Half Yearly exams:
// six slips per A4 landscape page (2 columns x 3 rows). The subject columns
// come from the class's own exam setup, so every class gets its own format.
// Annual uses the combined Progress Report Card instead.
// Rank is left blank on purpose so it can be written in by hand; only the
// separately approved Annual ranks are ever printed by the system.
const PAGE_W = 297;
const PAGE_H = 210;
const PM = 8; // page margin
const CW = (PAGE_W - 2 * PM) / 2; // card width
const ROWS = 3;
const PER_PAGE = 2 * ROWS;
const CH = (PAGE_H - 2 * PM) / ROWS; // card height
const GAP = 2; // inner gap to the cut lines
const FONT = "helvetica";
const SCHOOL = "TH. VIRENDRA SINGH MEMORIAL SCHOOL, NEPANAGAR";
const EXAM_TITLE = { quarterly: "QUARTERLY EXAMINATION", half_yearly: "HALF YEARLY EXAMINATION" };
const INK = [15, 23, 42];
const BAND = [241, 245, 249];
const MAX_PER_ROW = 10;

const dash = "—";

const fitText = (doc, text, maxW, size, min = 6) => {
  let s = size;
  doc.setFontSize(s);
  while (doc.getTextWidth(text) > maxW && s > min) {
    s -= 0.5;
    doc.setFontSize(s);
  }
};

const cellText = (c, gradeOnly) => {
  if (!c) return dash;
  if (c.result === "absent") return "AB";
  if (gradeOnly) return c.grade || dash;
  return c.marks === null || c.marks === undefined ? dash : String(c.marks);
};

const fmtPct = (t) => (t && t.complete && t.percentage !== null && t.percentage !== undefined ? t.percentage.toFixed(1) : "");
const fmtTotal = (t) => (t && t.complete && t.obtained !== null && t.obtained !== undefined ? String(t.obtained) : "");

const drawCard = (doc, x, y, card, ctx) => {
  const { data, type, sessionName, subjects } = ctx;
  const w = CW - GAP * 2;
  const h = CH - GAP * 2;
  const cx = x + GAP;
  const cy = y + GAP;
  const totals = card.totals[type];

  doc.setDrawColor(...INK);
  doc.setLineWidth(0.4);
  doc.rect(cx, cy, w, h);

  // School band.
  doc.setFillColor(...INK);
  doc.rect(cx, cy, w, 6.5, "F");
  doc.setTextColor(255);
  doc.setFont(FONT, "bold");
  fitText(doc, SCHOOL, w - 6, 9.5);
  doc.text(SCHOOL, cx + w / 2, cy + 4.5, { align: "center" });

  // Exam band.
  doc.setTextColor(...INK);
  doc.setFillColor(...BAND);
  doc.rect(cx, cy + 6.5, w, 9.5, "F");
  doc.setLineWidth(0.25);
  doc.line(cx, cy + 16, cx + w, cy + 16);
  doc.setFont(FONT, "bold");
  doc.setFontSize(7.5);
  doc.text(`${EXAM_TITLE[type]}${sessionName ? ` ${sessionName}` : ""}`, cx + w / 2, cy + 10.4, { align: "center" });
  doc.setFontSize(8);
  const title = "STUDENT RESULT CARD";
  doc.text(title, cx + w / 2, cy + 14.2, { align: "center" });
  const tw = doc.getTextWidth(title);
  doc.setLineWidth(0.4);
  doc.line(cx + w / 2 - tw / 2, cy + 14.9, cx + w / 2 + tw / 2, cy + 14.9);

  // Student row.
  const ry = cy + 22;
  const clsW = 22;
  doc.setFont(FONT, "bold");
  doc.setFontSize(7.5);
  doc.text("STUDENT NAME", cx + 4, ry);
  const nameX = cx + 4 + doc.getTextWidth("STUDENT NAME") + 2;
  const nameEnd = cx + w - clsW - 22;
  doc.setLineWidth(0.25);
  doc.line(nameX, ry + 1, nameEnd, ry + 1);
  const name = (card.name || "").toUpperCase();
  fitText(doc, name, nameEnd - nameX - 2, 8.5, 6);
  doc.text(name, nameX + 1, ry - 0.2);
  doc.setFontSize(7.5);
  doc.text("CLASS", nameEnd + 4, ry);
  const clsX = nameEnd + 4 + doc.getTextWidth("CLASS") + 2;
  doc.line(clsX, ry + 1, cx + w - 4, ry + 1);
  const cls = `${data.class.name}${data.class.section ? ` - ${data.class.section}` : ""}`.toUpperCase();
  fitText(doc, cls, cx + w - 4 - clsX - 1, 8.5, 6);
  doc.text(cls, (clsX + cx + w - 4) / 2, ry - 0.2, { align: "center" });

  // Subject grid, wrapped into rows of at most MAX_PER_ROW columns.
  // More than MAX_PER_ROW subjects: split evenly over two rows.
  const perRow = Math.max(1, subjects.length > MAX_PER_ROW ? Math.ceil(subjects.length / 2) : subjects.length);
  const rows = [];
  for (let i = 0; i < subjects.length; i += perRow) rows.push(subjects.slice(i, i + perRow));
  const headH = rows.length > 1 ? 4.6 : 5.5;
  const valH = rows.length > 1 ? 5.8 : 8.5;
  let ty = cy + 26;
  doc.setLineWidth(0.25);
  doc.line(cx, ty, cx + w, ty);
  rows.forEach((group) => {
    const colW = w / perRow;
    const gw = colW * group.length;
    group.forEach((s, i) => {
      const gx = cx + i * colW;
      doc.setFillColor(...BAND);
      doc.rect(gx, ty, colW, headH, "F");
      if (i > 0) doc.line(gx, ty, gx, ty + headH + valH);
      doc.setFont(FONT, "bold");
      const label = s.name.toUpperCase();
      fitText(doc, label, colW - 1.5, 7, 4.5);
      doc.text(label, gx + colW / 2, ty + headH - 1.6, { align: "center" });
      doc.setFontSize(10);
      doc.text(cellText(card.marks[s.key]?.[type], s.gradeOnly), gx + colW / 2, ty + headH + valH / 2 + 1.3, { align: "center" });
    });
    doc.line(cx, ty + headH, cx + gw, ty + headH);
    doc.line(cx, ty + headH + valH, cx + gw, ty + headH + valH);
    ty += headH + valH;
  });

  // Summary row.
  const sy = ty + (rows.length > 1 ? 5 : 6);
  const maxTxt = totals && totals.max !== null && totals.max !== undefined ? String(totals.max) : "";
  const blank = (lx, label, value, lineW, suffix) => {
    doc.setFont(FONT, "bold");
    doc.setFontSize(7.5);
    doc.text(label, lx, sy);
    const lw = doc.getTextWidth(label);
    doc.setLineWidth(0.25);
    doc.line(lx + lw + 2, sy + 1, lx + lw + 2 + lineW, sy + 1);
    doc.setFontSize(9);
    doc.text(value, lx + lw + 2 + lineW / 2, sy - 0.2, { align: "center" });
    doc.setFontSize(7.5);
    let end = lx + lw + 2 + lineW;
    if (suffix) {
      doc.text(suffix, end + 1.5, sy);
      end += 1.5 + doc.getTextWidth(suffix);
    }
    return end;
  };
  let lx = cx + 4;
  lx = blank(lx, "TOTAL OBTAINED", fmtTotal(totals), 14, maxTxt ? `/ ${maxTxt}` : "") + 7;
  lx = blank(lx, "PERCENTAGE", fmtPct(totals), 16, "%") + 7;
  blank(lx, "RANK", "", 14, "");

  // Signatures.
  const gy = cy + h - 6;
  doc.setLineWidth(0.25);
  doc.line(cx + 6, gy, cx + 6 + 36, gy);
  doc.line(cx + w - 6 - 36, gy, cx + w - 6, gy);
  doc.setFont(FONT, "bold");
  doc.setFontSize(7);
  doc.text("Class Teacher Sign.", cx + 6 + 18, gy + 3.2, { align: "center" });
  doc.text("Principal Sign.", cx + w - 6 - 18, gy + 3.2, { align: "center" });
};

const cutLines = (doc) => {
  doc.setDrawColor(150);
  doc.setLineWidth(0.2);
  doc.setLineDashPattern([2, 1.5], 0);
  doc.line(PAGE_W / 2, PM - 3, PAGE_W / 2, PAGE_H - PM + 3);
  for (let r = 1; r < ROWS; r += 1) doc.line(PM - 3, PM + r * CH, PAGE_W - PM + 3, PM + r * CH);
  doc.setLineDashPattern([], 0);
  doc.setDrawColor(0);
};

/** Result cards of the students who have a published result for `type`. */
export const resultCardStudents = (data, type) => (data?.students || []).filter((s) => !!s.totals?.[type]);

/** data = GET /exams/report-cards response; type = "quarterly" | "half_yearly". */
export const buildResultCardPdf = ({ data, type, cards, sessionName }) => {
  if (!EXAM_TITLE[type]) throw new Error("Result cards are available for Quarterly and Half Yearly exams only");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const subjects = data.subjects.filter((s) => data.maxima?.[type]?.[s.key]);
  const ctx = { data, type, sessionName, subjects };
  cards.forEach((card, i) => {
    const slot = i % PER_PAGE;
    if (i > 0 && slot === 0) doc.addPage();
    if (slot === 0) cutLines(doc);
    drawCard(doc, PM + (slot % 2) * CW, PM + Math.floor(slot / 2) * CH, card, ctx);
  });
  return doc;
};

export const downloadResultCardPdf = (args, filename) => downloadPdf(buildResultCardPdf(args), filename);
export const printResultCardPdf = (args) => printPdf(buildResultCardPdf(args));
