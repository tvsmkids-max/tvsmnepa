import { jsPDF } from "jspdf";
import { downloadPdf, printPdf } from "./pdfGenerator"; // also registers autotable
import { loadLogo } from "./examAdmitCardPdf";

const imgType = (img) => (img.dataUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG");

const SCHOOL_NAME =
  import.meta.env.VITE_SCHOOL_NAME ||
  "Thakur Virendra Singh Memorial Higher Secondary School, Nepanagar";

const longDate = (key) =>
  new Date(`${key}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
const dayName = (key) =>
  new Date(`${key}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" });

const examHeading = (exam) => {
  const base = String(exam.name || "").trim();
  const title = /examination/i.test(base) ? `${base} Time Table` : `${base} Examination Time Table`;
  return `${title}${exam.session?.name ? ` (${exam.session.name})` : ""}`.toUpperCase();
};

const instructionLines = (text) =>
  String(text || "")
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:\d+[.)]|[-•*])\s*/, "").trim())
    .filter(Boolean);

/**
 * groups: [{ title, classRange, columns: [{id, label}], rows: [{date, cells: {id: "Subject"}}] }]
 * One page per level (Pre-Primary / Primary / Higher), laid out like the school's printed timetable.
 * `logo` ({dataUrl,w,h}) is optional.
 */
export const buildTimetablePdf = ({ exam, groups, logo }) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const lines = instructionLines(exam.instructions);

  groups.forEach((g, i) => {
    if (i > 0) doc.addPage();
    if (logo) {
      const lh = 20;
      doc.addImage(logo.dataUrl, imgType(logo), 12, 8, lh * (logo.w / logo.h), lh, undefined, "FAST");
    }
    doc.setFont("times", "bold");
    doc.setFontSize(18);
    doc.setTextColor(110);
    const nameLines = doc.splitTextToSize(SCHOOL_NAME.toUpperCase(), W - 60);
    doc.text(nameLines, W / 2, 16, { align: "center" });
    doc.setTextColor(0);
    let y = 16 + nameLines.length * 7 + 4;
    doc.setFontSize(12);
    doc.text(examHeading(exam), W / 2, y, { align: "center" });
    y += 8;
    doc.setFontSize(11);
    const clsText = `Classes: ${g.classRange}`;
    doc.text(clsText, W / 2, y, { align: "center" });
    const tw = doc.getTextWidth(clsText);
    doc.setLineWidth(0.3);
    doc.line(W / 2 - tw / 2, y + 1, W / 2 + tw / 2, y + 1);

    const many = g.columns.length > 5;
    doc.autoTable({
      startY: y + 6,
      margin: { left: 12, right: 12 },
      head: [["Date", "Day", ...g.columns.map((c) => c.label)]],
      body: g.rows.map((r) => [
        longDate(r.date),
        dayName(r.date),
        ...g.columns.map((c) => r.cells[c.id] || "—"),
      ]),
      styles: {
        font: "times",
        fontSize: many ? 9.5 : 10.5,
        cellPadding: 2.2,
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
        valign: "middle",
        textColor: 0,
      },
      headStyles: { fillColor: [235, 235, 235], textColor: 0, fontStyle: "bold", halign: "center" },
      columnStyles: { 0: { cellWidth: 38, halign: "left" } },
    });

    if (lines.length) {
      let iy = doc.lastAutoTable.finalY + 12;
      if (iy > 255) {
        doc.addPage();
        iy = 20;
      }
      doc.setFont("times", "bold");
      doc.setFontSize(12);
      doc.text("Instructions for Students and Parents", 12, iy);
      doc.setFont("times", "normal");
      doc.setFontSize(11);
      iy += 7;
      lines.forEach((l, n) => {
        const wrapped = doc.splitTextToSize(`${n + 1}.  ${l}`, W - 30);
        doc.text(wrapped, 16, iy);
        iy += wrapped.length * 5.4 + 1.5;
      });
    }
  });
  return doc;
};

export const downloadTimetablePdf = async (args, filename) =>
  downloadPdf(buildTimetablePdf({ ...args, logo: await loadLogo() }), filename);
export const printTimetablePdf = async (args) =>
  printPdf(buildTimetablePdf({ ...args, logo: await loadLogo() }));
