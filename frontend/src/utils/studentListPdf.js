import { jsPDF } from "jspdf";
import { downloadPdf } from "./pdfGenerator"; // also registers autotable
import { loadLogo } from "./examAdmitCardPdf";

const SCHOOL_NAME =
  import.meta.env.VITE_SCHOOL_NAME || "Thakur Virendra Singh Memorial School";
const UP = (v) => String(v || "").toUpperCase();
const imgType = (img) => (img.dataUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG");

const fmtDob = (d) => {
  if (!d) return "";
  const x = new Date(d);
  return Number.isNaN(x.getTime())
    ? ""
    : x.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
};

/**
 * Student list as a PDF: S.No, Scholar No., Name, Father's name, DOB, Mobile.
 * `title` e.g. "Class 4TH - A". Students are listed in the order given.
 */
export const buildStudentListPdf = ({ students, title, logo }) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  if (logo) {
    const lh = 16;
    doc.addImage(logo.dataUrl, imgType(logo), 12, 8, lh * (logo.w / logo.h), lh, undefined, "FAST");
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(SCHOOL_NAME.toUpperCase(), W / 2, 15, { align: "center" });
  doc.setFontSize(11);
  doc.text(`STUDENT LIST${title ? ` - ${title}` : ""}`, W / 2, 22, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    `Total students: ${students.length}     Date: ${new Date().toLocaleDateString("en-GB")}`,
    W / 2,
    27.5,
    { align: "center" },
  );

  doc.autoTable({
    startY: 32,
    margin: { left: 10, right: 10 },
    head: [["S.No", "Scholar No.", "Student Name", "Father's Name", "DOB", "Mobile"]],
    body: students.map((s, i) => [
      i + 1,
      UP(s.scholarNumber),
      UP(s.name),
      UP(s.fatherName),
      fmtDob(s.dob),
      s.mobile && s.mobile !== "0000000000" ? s.mobile : "—",
    ]),
    styles: { fontSize: 9, cellPadding: 2, lineColor: [120, 120, 120], lineWidth: 0.1, textColor: 20 },
    headStyles: { fillColor: [225, 225, 225], textColor: 0, fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 12, halign: "center" }, 1: { cellWidth: 24 }, 4: { cellWidth: 24 }, 5: { cellWidth: 26 } },
    didDrawPage: () => {
      doc.setFontSize(8);
      doc.text(`Page ${doc.internal.getNumberOfPages()}`, W - 10, 290, { align: "right" });
    },
  });
  return doc;
};

export const downloadStudentListPdf = async (args, filename) =>
  downloadPdf(buildStudentListPdf({ ...args, logo: await loadLogo() }), filename);
