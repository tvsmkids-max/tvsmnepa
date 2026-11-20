import { jsPDF } from "jspdf";
import { downloadPdf, printPdf } from "./pdfGenerator"; // also registers autotable
import { loadLogo } from "./examAdmitCardPdf";

const imgType = (img) => (img.dataUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG");

const SCHOOL_NAME =
  import.meta.env.VITE_SCHOOL_NAME || "Thakur Virendra Singh Memorial School";

const fmtDate = (key) => {
  const [y, m, d] = key.split("-");
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dow = names[new Date(Date.UTC(+y, +m - 1, +d)).getUTCDay()];
  return `${d}-${m}-${y} (${dow})`;
};

/**
 * groups: [{ label: "10TH - A", entries: [{subjectName,date,startTime,endTime,remarks}] }]
 * One page section per class. `logo` ({dataUrl,w,h}) is optional.
 */
export const buildTimetablePdf = ({ exam, groups, logo }) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();

  groups.forEach((g, i) => {
    if (i > 0) doc.addPage();
    if (logo) {
      const lh = 20;
      doc.addImage(logo.dataUrl, imgType(logo), 14, 8, lh * (logo.w / logo.h), lh, undefined, "FAST");
    }
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
      head: [["Date", "Subject", "Time", "Remarks"]],
      body: g.entries.map((e) => [
        fmtDate(e.date),
        e.subjectName,
        `${e.startTime} - ${e.endTime}`,
        e.remarks || "",
      ]),
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [13, 27, 62] },
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

export const downloadTimetablePdf = async (args, filename) =>
  downloadPdf(buildTimetablePdf({ ...args, logo: await loadLogo() }), filename);
export const printTimetablePdf = async (args) =>
  printPdf(buildTimetablePdf({ ...args, logo: await loadLogo() }));
