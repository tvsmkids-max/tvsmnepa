import { jsPDF } from "jspdf";
import { downloadPdf, printPdf } from "./pdfGenerator"; // also registers autotable

const SCHOOL_NAME =
  import.meta.env.VITE_SCHOOL_NAME || "Thakur Virendra Singh Memorial School";

const fmtDate = (key) => {
  const [y, m, d] = key.split("-");
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dow = names[new Date(Date.UTC(+y, +m - 1, +d)).getUTCDay()];
  return `${d}-${m}-${y} (${dow})`;
};

/**
 * groups: [{ label: "10TH - A", entries: [{subjectName,date}] }]
 * One page section per class. No logo yet (supplied later).
 */
export const buildTimetablePdf = ({ exam, groups }) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();

  groups.forEach((g, i) => {
    if (i > 0) doc.addPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text(SCHOOL_NAME.toUpperCase(), W / 2, 16, { align: "center" });
    doc.setFontSize(12);
    doc.text(`${exam.name} — Examination Timetable`, W / 2, 24, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(
      `Session: ${exam.session?.name || ""}     Class: ${g.label}`,
      W / 2,
      31,
      { align: "center" },
    );

    doc.autoTable({
      startY: 38,
      head: [["Date", "Day", "Subject"]],
      body: g.entries.map((e) => [
        fmtDate(e.date),
        new Date(`${e.date}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "long", timeZone: "UTC" }),
        e.subjectName,
      ]),
      styles: { fontSize: 11, cellPadding: 3.2, lineColor: [120, 120, 120], lineWidth: 0.1 },
      headStyles: { fillColor: [225, 225, 225], textColor: 0, fontStyle: "bold" },
    });

    const y = doc.lastAutoTable.finalY + 8;
    if (exam.instructions) {
      doc.setFont("helvetica", "bold");
      doc.text("Instructions", 14, y);
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(exam.instructions, W - 28);
      doc.text(lines, 14, y + 6);
    }
  });
  return doc;
};

export const downloadTimetablePdf = (args, filename) =>
  downloadPdf(buildTimetablePdf(args), filename);
export const printTimetablePdf = (args) => printPdf(buildTimetablePdf(args));
