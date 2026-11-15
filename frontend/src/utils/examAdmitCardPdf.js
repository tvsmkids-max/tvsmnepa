import { jsPDF } from "jspdf";
import { downloadPdf, printPdf } from "./pdfGenerator"; // also registers autotable

// Simple admit card: 6 cards per landscape A4 page (2 columns x 3 rows), a new page for
// every class. No fee information is ever shown or used. No photo, no timetable.
const SCHOOL_LINE_1 = "TH. VIRENDRA SINGH MEMORIAL SCHOOL,";
const SCHOOL_LINE_2 = "NEPANAGAR";
const DEFAULT_NOTE =
  "Note: Students must carry this Hall Ticket every day. Reach the exam room 10 minutes before the scheduled time.";

const PAGE_W = 297;
const PAGE_H = 210;
const MARGIN = 8;
const GAP_X = 6;
const COLS = 2;
const ROWS = 3;
const CARD_W = (PAGE_W - MARGIN * 2 - GAP_X * (COLS - 1)) / COLS;
const CARD_H = 62;
const GAP_Y = (PAGE_H - MARGIN * 2 - CARD_H * ROWS) / (ROWS - 1);
const PER_PAGE = COLS * ROWS;

// Existing application assets in /public. A missing file never blocks a card.
// (A host's SPA fallback can answer 200 with HTML, so the type must be an image.)
const loadImage = async (url) => {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.type.startsWith("image/")) return null;
    const dataUrl = await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
    const size = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });
    return size ? { dataUrl, ...size } : null;
  } catch {
    return null;
  }
};
export const loadLogo = () => loadImage("/logo.png");
export const loadSignature = () => loadImage("/principal-signature.png");

const imgType = (img) => (img.dataUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG");

const fitText = (doc, text, maxW, size, min = 6) => {
  let s = size;
  doc.setFontSize(s);
  while (doc.getTextWidth(text) > maxW && s > min) {
    s -= 0.5;
    doc.setFontSize(s);
  }
  return s;
};

// Shrinks first; only if the text still cannot fit at the smallest size is it cut.
const fitOrTrim = (doc, text, maxW, size, min) => {
  fitText(doc, text, maxW, size, min);
  let t = text;
  while (doc.getTextWidth(`${t}…`) > maxW && t.length > 1 && doc.getTextWidth(t) > maxW) {
    t = t.slice(0, -1);
  }
  return t === text ? text : `${t.trimEnd()}…`;
};

const drawCard = (doc, x, y, card, ctx) => {
  const { exam, cls, logo, signature } = ctx;
  const w = CARD_W;
  const rows = { header: 16.5, title: 7.5, student: 9.5, father: 9.5, klass: 9.5 };
  const yTitle = y + rows.header;
  const yStudent = yTitle + rows.title;
  const yFather = yStudent + rows.student;
  const yClass = yFather + rows.father;
  const yBottom = yClass + rows.klass;
  const labelW = 36;

  // Faint background logo (drawn first so text stays crisp on top).
  if (logo) {
    const h = 40;
    const lw = (logo.w / logo.h) * h;
    try {
      doc.setGState(new doc.GState({ opacity: 0.07 }));
      doc.addImage(logo.dataUrl, imgType(logo), x + (w - lw) / 2, y + (CARD_H - h) / 2 + 3, lw, h);
    } finally {
      doc.setGState(new doc.GState({ opacity: 1 }));
    }
  }

  doc.setDrawColor(0);
  doc.setTextColor(0);
  doc.setLineWidth(0.5);
  doc.rect(x, y, w, CARD_H);
  doc.setLineWidth(0.25);
  [yTitle, yStudent, yFather, yClass, yBottom].forEach((ly) => doc.line(x, ly, x + w, ly));
  doc.line(x + labelW, yStudent, x + labelW, yClass + rows.klass); // label | value

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12.5);
  doc.text(SCHOOL_LINE_1, x + w / 2, y + 7, { align: "center" });
  doc.text(SCHOOL_LINE_2, x + w / 2, y + 13.5, { align: "center" });

  // Title: ADMIT CARD - <EXAM> <SESSION>
  const session = String(exam.session?.name || "").replace(/\s*-\s*/g, " - ");
  const title = `ADMIT CARD - ${exam.name.toUpperCase()} ${session}`.trim();
  doc.setFont("helvetica", "normal");
  fitText(doc, title, w - 4, 8.5);
  doc.text(title, x + w / 2, yTitle + 5, { align: "center" });

  // Student rows
  const label = (text, ly) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(text, x + 2, ly + 6.2);
  };
  const value = (text, ly, maxW) => {
    doc.setFont("helvetica", "bold");
    doc.text(fitOrTrim(doc, text, maxW, 9.5, 5.5), x + labelW + 2, ly + 6.2);
  };
  label("STUDENT NAME:", yStudent);
  value(String(card.student.name || "").toUpperCase(), yStudent, w - labelW - 4);
  label("FATHER NAME:", yFather);
  value(String(card.student.fatherName || "").toUpperCase(), yFather, w - labelW - 4);

  // Class / section and roll number
  const rollLabelX = x + labelW + (w - labelW) * 0.48;
  label("CLASS / SECTION:", yClass);
  value(`${cls.name} / ${cls.section}`.toUpperCase(), yClass, rollLabelX - x - labelW - 3);
  doc.line(rollLabelX - 1, yClass, rollLabelX - 1, yClass + rows.klass);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("ROLL NO.:", rollLabelX + 1, yClass + 6.2);
  const rollBoxX = rollLabelX + 18;
  doc.line(rollBoxX, yClass, rollBoxX, yClass + rows.klass);
  if (card.rollNumber !== null && card.rollNumber !== undefined) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(String(card.rollNumber), rollBoxX + (x + w - rollBoxX) / 2, yClass + 6.4, {
      align: "center",
    });
  }

  // Note + principal signature
  const noteW = w * 0.6 - 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  let lines = doc.splitTextToSize(exam.instructions?.trim() || DEFAULT_NOTE, noteW);
  const maxLines = Math.max(1, Math.floor((CARD_H - (yBottom - y) - 1.5) / 2.6));
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/\s+\S*$/, "")}…`;
  }
  doc.text(lines, x + 2, yBottom + 3.6);

  const sigRight = x + w - 3;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const labelWidth = doc.getTextWidth("PRINCIPAL SIGN.:");
  if (signature) {
    // Kept inside the bottom strip, to the left of the label, so it never
    // covers the roll number box above.
    const sh = 9;
    const sw = Math.min(30, (signature.w / signature.h) * sh);
    try {
      doc.addImage(
        signature.dataUrl,
        imgType(signature),
        sigRight - labelWidth - 2 - sw,
        y + CARD_H - sh - 0.8,
        sw,
        sh,
      );
    } catch {
      /* signature is optional */
    }
  }
  doc.text("PRINCIPAL SIGN.:", sigRight, y + CARD_H - 2.4, { align: "right" });
};

/**
 * data = response of POST /exams/:id/admit-cards; cards = the cards to print
 * (already ordered by class). Six per page; a new page starts for each class.
 */
export const buildAdmitCardPdf = ({ data, cards, logo, signature }) => {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  let slot = PER_PAGE; // forces a first page
  let lastClass = null;
  let first = true;

  cards.forEach((card) => {
    if (slot >= PER_PAGE || card.classId !== lastClass) {
      if (!first) doc.addPage();
      first = false;
      slot = 0;
      lastClass = card.classId;
    }
    const col = slot % COLS;
    const row = Math.floor(slot / COLS);
    drawCard(
      doc,
      MARGIN + col * (CARD_W + GAP_X),
      MARGIN + row * (CARD_H + GAP_Y),
      card,
      { exam: data.exam, cls: data.classes[card.classId], logo, signature },
    );
    slot += 1;
  });
  return doc;
};

export const downloadAdmitCardPdf = (args, filename) =>
  downloadPdf(buildAdmitCardPdf(args), filename);
export const printAdmitCardPdf = (args) => printPdf(buildAdmitCardPdf(args));
