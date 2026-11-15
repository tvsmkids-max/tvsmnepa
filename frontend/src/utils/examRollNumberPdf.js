import { jsPDF } from "jspdf";
import { downloadPdf, printPdf } from "./pdfGenerator"; // also registers autotable

const SCHOOL_NAME =
  import.meta.env.VITE_SCHOOL_NAME || "Thakur Virendra Singh Memorial School";

/** groups: [{ label, records: [{rollNumber, studentName, scholarNumber}] }] */
export const buildRollNumberPdf = ({ exam, groups }) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  groups.forEach((g, i) => {
    if (i > 0) doc.addPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text(SCHOOL_NAME.toUpperCase(), W / 2, 16, { align: "center" });
    doc.setFontSize(12);
    doc.text(`${exam.name} — Roll Number List`, W / 2, 24, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Session: ${exam.session?.name || ""}     Class: ${g.label}`, W / 2, 31, {
      align: "center",
    });
    doc.autoTable({
      startY: 38,
      head: [["Roll No.", "Student name", "Scholar / Admission No."]],
      body: g.records.map((r) => [r.rollNumber, r.studentName, r.scholarNumber]),
      styles: { fontSize: 10, cellPadding: 2.5 },
      headStyles: { fillColor: [13, 27, 62] },
      columnStyles: { 0: { halign: "center", cellWidth: 25 } },
    });
  });
  return doc;
};

export const downloadRollNumberPdf = (args, filename) =>
  downloadPdf(buildRollNumberPdf(args), filename);
export const printRollNumberPdf = (args) => printPdf(buildRollNumberPdf(args));
