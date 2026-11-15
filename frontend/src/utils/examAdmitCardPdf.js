import { jsPDF } from "jspdf";
import { downloadPdf, printPdf } from "./pdfGenerator"; // also registers autotable
import { examTypeLabel } from "../pages/exams/examConstants";

const SCHOOL_NAME =
  import.meta.env.VITE_SCHOOL_NAME || "Thakur Virendra Singh Memorial School";

const fmtDate = (key) => {
  const [y, m, d] = key.split("-");
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return `${d}-${m}-${y} (${names[new Date(Date.UTC(+y, +m - 1, +d)).getUTCDay()]})`;
};

// Existing application asset (public/logo.png). A missing logo never blocks a card.
export const loadLogo = async () => {
  try {
    const res = await fetch("/logo.png");
    if (!res.ok) return null;
    const blob = await res.blob();
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

/**
 * data = response of POST /exams/:id/admit-cards; cards = subset to print.
 * One admit card per A4 page. No fee information is ever shown or used.
 */
export const buildAdmitCardPdf = ({ data, cards, logo }) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const { exam } = data;

  cards.forEach((card, i) => {
    if (i > 0) doc.addPage();
    const cls = data.classes[card.classId];

    doc.setDrawColor(13, 27, 62);
    doc.setLineWidth(0.6);
    doc.rect(8, 8, W - 16, H - 16);

    if (logo) {
      const h = 24;
      const w = Math.min(34, (logo.w / logo.h) * h);
      try {
        doc.addImage(logo.dataUrl, "PNG", 14, 13, w, h);
      } catch {
        /* logo is optional */
      }
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(13, 27, 62);
    doc.text(SCHOOL_NAME.toUpperCase(), W / 2 + 6, 21, { align: "center" });
    doc.setFontSize(13);
    doc.text("ADMIT CARD", W / 2 + 6, 29, { align: "center" });
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(`${exam.name} (${examTypeLabel(exam.examType)})`, W / 2 + 6, 36, {
      align: "center",
    });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Academic Session: ${exam.session?.name || ""}`, W / 2 + 6, 42, {
      align: "center",
    });

    doc.autoTable({
      startY: 50,
      body: [
        ["Student Name", card.student.name, "Roll No.", card.rollNumber ?? "—"],
        ["Admission No.", card.student.scholarNumber || "—", "Class", cls.name],
        ["Section", cls.section, "Session", exam.session?.name || ""],
      ],
      theme: "grid",
      styles: { fontSize: 10, cellPadding: 2.5 },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 32, fillColor: [238, 241, 247] },
        2: { fontStyle: "bold", cellWidth: 28, fillColor: [238, 241, 247] },
      },
      margin: { left: 14, right: 14 },
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Examination Timetable", 14, doc.lastAutoTable.finalY + 9);
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 12,
      head: [["Date", "Subject", "Time"]],
      body: cls.timetable.length
        ? cls.timetable.map((t) => [
            fmtDate(t.date),
            t.subjectName,
            `${t.startTime} - ${t.endTime}`,
          ])
        : [["Timetable not yet available", "", ""]],
      styles: { fontSize: 10, cellPadding: 2.5 },
      headStyles: { fillColor: [13, 27, 62] },
      margin: { left: 14, right: 14 },
    });

    let y = doc.lastAutoTable.finalY + 10;
    if (exam.instructions) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Instructions", 14, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      const lines = doc.splitTextToSize(exam.instructions, W - 28);
      doc.text(lines, 14, y + 6);
      y += 6 + lines.length * 4.5;
    }

    // Authorized signature area, pinned near the bottom of the card.
    const sigY = Math.max(y + 18, H - 32);
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    doc.line(W - 70, sigY, W - 14, sigY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Authorized Signature", W - 42, sigY + 5, { align: "center" });
  });
  return doc;
};

export const downloadAdmitCardPdf = (args, filename) =>
  downloadPdf(buildAdmitCardPdf(args), filename);
export const printAdmitCardPdf = (args) => printPdf(buildAdmitCardPdf(args));
