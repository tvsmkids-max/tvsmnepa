import { jsPDF } from "jspdf";
import { applyPlugin } from "jspdf-autotable";
import { exportToExcel } from "./exportUtils";
import { downloadPdf, printPdf } from "./pdfGenerator";
import { loadLogo } from "./examAdmitCardPdf";

applyPlugin(jsPDF);

const slug = (s) => String(s || "report").replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "");
const text = (v) => (v === null || v === undefined ? "" : String(v));

export const reportFileName = (report) => slug(`${report.title}_${report.subtitle}`).slice(0, 80);

export const exportReportExcel = async (report) => {
  const data = report.rows.map((r) =>
    Object.fromEntries(report.columns.map((c) => [c.label, r[c.key] ?? ""])),
  );
  await exportToExcel(data, reportFileName(report), "Report");
};

export const buildReportPdf = (report, logo) => {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const tx = logo ? 14 + 14 * (logo.w / logo.h) + 4 : 14;
  if (logo) doc.addImage(logo.dataUrl, logo.dataUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG", 14, 6, 14 * (logo.w / logo.h), 14, undefined, "FAST");
  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.text(report.title, tx, 13);
  doc.setFont("times", "normal");
  doc.setFontSize(10);
  doc.text(report.subtitle || "", tx, 19);
  doc.autoTable({
    startY: 25,
    head: [report.columns.map((c) => c.label)],
    body: report.rows.map((r) => report.columns.map((c) => text(r[c.key]))),
    styles: { font: "times", fontSize: 8, cellPadding: 1.6, lineColor: [120, 120, 120], lineWidth: 0.1 },
    headStyles: { fillColor: [225, 225, 225], textColor: 0, fontStyle: "bold" },
    columnStyles: Object.fromEntries(
      report.columns.map((c, i) => [i, { halign: c.align === "right" ? "right" : c.align === "center" ? "center" : "left" }]),
    ),
    margin: { left: 14, right: 14 },
  });
  const y = (doc.lastAutoTable?.finalY || 25) + 6;
  doc.setFontSize(9);
  doc.text((report.summary || []).map((s) => `${s.label}: ${s.value}`).join("   |   "), 14, y);
  return doc;
};

export const downloadReportPdf = async (report) =>
  downloadPdf(buildReportPdf(report, await loadLogo()), reportFileName(report));
export const printReportPdf = async (report) => printPdf(buildReportPdf(report, await loadLogo()));
