import { jsPDF } from "jspdf";
import { downloadPdf, printPdf } from "./pdfGenerator";

// Single-exam "Student Result Card" slips for Quarterly and Half Yearly exams:
// three slips per A4 landscape page (top-left, bottom-left, bottom-right, like
// the printed template). Annual uses the combined Progress Report Card instead.
// Rank is left blank on purpose so it can be written in by hand; only the
// separately approved Annual ranks are ever printed by the system.
const PAGE_W = 297;
const PAGE_H = 210;
const PM = 8; // page margin
const CW = (PAGE_W - 2 * PM) / 2; // card width
const CH = (PAGE_H - 2 * PM) / 2; // card height
const GAP = 3; // inner gap to the cut lines
const FONT = "helvetica";
const SCHOOL = "TH. VIRENDRA SINGH MEMORIAL SCHOOL, NEPANAGAR";
const EXAM_TITLE = { quarterly: "QUARTERLY EXAMINATION", half_yearly: "HALF YEARLY EXAMINATION" };
const INK = [15, 23, 42];
const BAND = [241, 245, 249];
const MAX_PER_ROW = 8;

const SLOTS = [
  [0, 0],
  [0, 1],
  [1, 1],
];

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
  doc.setLineWidth(0.5);
  doc.rect(cx, cy, w, h);

  // School band.
  doc.setFillColor(...INK);
  doc.rect(cx, cy, w, 8.5, "F");
  doc.setTextColor(255);
  doc.setFont(FONT, "bold");
  fitText(doc, SCHOOL, w - 6, 11);
  doc.text(SCHOOL, cx + w / 2, cy + 5.6, { align: "center" });

  // Exam band.
  doc.setTextColor(...INK);
  doc.setFillColor(...BAND);
  doc.rect(cx, cy + 8.5, w, 11.5, "F");
  doc.setLineWidth(0.3);
  doc.line(cx, cy + 20, cx + w, cy + 20);
  doc.setFont(FONT, "bold");
  doc.setFontSize(8.5);
  doc.text(`${EXAM_TITLE[type]}${sessionName ? ` ${sessionName}` : ""}`, cx + w / 2, cy + 13.2, { align: "center" });
  doc.setFontSize(9);
  const title = "STUDENT RESULT CARD";
  doc.text(title, cx + w / 2, cy + 18, { align: "center" });
  const tw = doc.getTextWidth(title);
  doc.setLineWidth(0.5);
  doc.line(cx + w / 2 - tw / 2, cy + 18.8, cx + w / 2 + tw / 2, cy + 18.8);

  // Student row.
  const ry = cy + 27;
  const clsW = 22;
  doc.setFont(FONT, "bold");
  doc.setFontSize(8);
  doc.text("STUDENT NAME", cx + 4, ry);
  const nameX = cx + 4 + doc.getTextWidth("STUDENT NAME") + 2;
  const nameEnd = cx + w - clsW - 24;
  doc.setLineWidth(0.3);
  doc.line(nameX, ry + 1, nameEnd, ry + 1);
  const name = (card.name || "").toUpperCase();
  fitText(doc, name, nameEnd - nameX - 2, 9, 6);
  doc.text(name, nameX + 1, ry - 0.2);
  doc.setFontSize(8);
  doc.text("CLASS", nameEnd + 4, ry);
  const clsX = nameEnd + 4 + doc.getTextWidth("CLASS") + 2;
  doc.line(clsX, ry + 1, cx + w - 4, ry + 1);
  const cls = `${data.class.name}${data.class.section ? ` - ${data.class.section}` : ""}`.toUpperCase();
  fitText(doc, cls, cx + w - 4 - clsX - 1, 9, 6);
  doc.text(cls, (clsX + cx + w - 4) / 2, ry - 0.2, { align: "center" });

  // Marks details band.
  const by = cy + 31;
  doc.setFillColor(...BAND);
  doc.rect(cx, by, w, 6, "F");
  doc.setLineWidth(0.3);
  doc.line(cx, by, cx + w, by);
  doc.line(cx, by + 6, cx + w, by + 6);
  doc.setFont(FONT, "bold");
  doc.setFontSize(8);
  doc.text("MARKS DETAILS", cx + w / 2, by + 4.2, { align: "center" });

  // Subject grid, wrapped into rows of at most MAX_PER_ROW columns.
  const rows = [];
  for (let i = 0; i < subjects.length; i += MAX_PER_ROW) rows.push(subjects.slice(i, i + MAX_PER_ROW));
  const headH = 6.5;
  const valH = rows.length > 1 ? 8 : 11;
  let ty = by + 6;
  rows.forEach((group) => {
    const colW = w / (rows.length > 1 ? Math.min(MAX_PER_ROW, subjects.length) : group.length);
    group.forEach((s, i) => {
      const gx = cx + i * colW;
      if (i > 0) {
        doc.setLineWidth(0.3);
        doc.line(gx, ty, gx, ty + headH + valH);
      }
      doc.setFillColor(...BAND);
      doc.rect(gx + (i > 0 ? 0.15 : 0), ty, colW - (i > 0 ? 0.15 : 0), headH, "F");
      doc.setFont(FONT, "bold");
      const label = s.name.toUpperCase();
      fitText(doc, label, colW - 2, 8, 5);
      doc.text(label, gx + colW / 2, ty + 4.3, { align: "center" });
      doc.setFontSize(11);
      const v = cellText(card.marks[s.key]?.[type], s.gradeOnly);
      doc.text(v, gx + colW / 2, ty + headH + valH / 2 + 1.6, { align: "center" });
    });
    doc.setLineWidth(0.3);
    doc.line(cx, ty + headH, cx + w, ty + headH);
    doc.line(cx, ty + headH + valH, cx + w, ty + headH + valH);
    ty += headH + valH;
  });

  // Summary row.
  const sy = ty + 8;
  const maxTxt = totals && totals.max !== null && totals.max !== undefined ? String(totals.max) : "";
  const blank = (lx, label, value, lineW, suffix) => {
    doc.setFont(FONT, "bold");
    doc.setFontSize(8);
    doc.text(label, lx, sy);
    const lw = doc.getTextWidth(label);
    doc.setLineWidth(0.3);
    doc.line(lx + lw + 2, sy + 1, lx + lw + 2 + lineW, sy + 1);
    doc.setFontSize(9.5);
    doc.text(value, lx + lw + 2 + lineW / 2, sy - 0.2, { align: "center" });
    doc.setFontSize(8);
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
  doc.setLineWidth(0.3);
  doc.line(cx + 6, gy, cx + 6 + 38, gy);
  doc.line(cx + w - 6 - 38, gy, cx + w - 6, gy);
  doc.setFont(FONT, "bold");
  doc.setFontSize(7.5);
  doc.text("Class Teacher Sign.", cx + 6 + 19, gy + 3.5, { align: "center" });
  doc.text("Principal Sign.", cx + w - 6 - 19, gy + 3.5, { align: "center" });
};

const cutLines = (doc) => {
  doc.setDrawColor(150);
  doc.setLineWidth(0.2);
  doc.setLineDashPattern([2, 1.5], 0);
  doc.line(PAGE_W / 2, PM - 3, PAGE_W / 2, PAGE_H - PM + 3);
  doc.line(PM - 3, PAGE_H / 2, PAGE_W - PM + 3, PAGE_H / 2);
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
    const slot = i % 3;
    if (i > 0 && slot === 0) doc.addPage();
    if (slot === 0) cutLines(doc);
    const [col, row] = SLOTS[slot];
    drawCard(doc, PM + col * CW, PM + row * CH, card, ctx);
  });
  return doc;
};

export const downloadResultCardPdf = (args, filename) => downloadPdf(buildResultCardPdf(args), filename);
export const printResultCardPdf = (args) => printPdf(buildResultCardPdf(args));
