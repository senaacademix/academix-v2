import React from "react";
import { pdf, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import ExcelJS from "exceljs";
import { format } from "date-fns";

// ============================================================================
// PDF STYLESHEET — Matching Administrator Schedule Manager Design Language
// ============================================================================
const pdfStyles = StyleSheet.create({
  page: {
    padding: 20,
    backgroundColor: "#ffffff",
    fontFamily: "Helvetica",
    fontSize: 8,
    color: "#1e293b",
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "#4f46e5",
    paddingBottom: 8,
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: "column",
    gap: 2,
  },
  mainTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#312e81",
    textTransform: "uppercase",
    lineHeight: 1.2,
  },
  subTitle: {
    fontSize: 8,
    color: "#64748b",
    lineHeight: 1.2,
  },
  badge: {
    backgroundColor: "#eef2ff",
    borderWidth: 1,
    borderColor: "#c7d2fe",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: "flex-end",
  },
  badgeText: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#4338ca",
  },
  metaCard: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    padding: 6,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metaItem: {
    flexDirection: "column",
    gap: 1,
  },
  metaLabel: {
    fontSize: 6.5,
    color: "#94a3b8",
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
  },
  metaValue: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
  },
  // Table Matrix
  gridTable: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 10,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#1e1b4b",
    borderBottomWidth: 1,
    borderBottomColor: "#4f46e5",
    minHeight: 20,
    alignItems: "center",
  },
  tableHeaderCell: {
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    padding: 3,
    textAlign: "center",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    minHeight: 16,
    alignItems: "center",
  },
  tableRowEven: {
    backgroundColor: "#f8fafc",
  },
  tableCell: {
    fontSize: 7,
    padding: 3,
    color: "#334155",
  },
  badgeStatus: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    borderRadius: 2,
    paddingVertical: 1,
    paddingHorizontal: 3,
    textAlign: "center",
  },
  statusPresent: {
    color: "#059669",
    backgroundColor: "#ecfdf5",
  },
  statusAbsent: {
    color: "#dc2626",
    backgroundColor: "#fef2f2",
  },
  statusLate: {
    color: "#d97706",
    backgroundColor: "#fffbeb",
  },
  statusLeave: {
    color: "#2563eb",
    backgroundColor: "#eff6ff",
  },
  statusExcused: {
    color: "#7c3aed",
    backgroundColor: "#f5f3ff",
  },
  footer: {
    position: "absolute",
    bottom: 12,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 6.5,
    color: "#94a3b8",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 4,
  },
});

// Helper for download
function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================================
// 1. PLANILLA DE ASISTENCIA (MATRIX) EXPORT
// ============================================================================

export interface MatrixExportData {
  groupName: string;
  courseTitle: string;
  teacherName?: string;
  dateStr: string;
  allDates: string[];
  students: {
    id: string;
    name: string;
    identification: string;
    records: Record<string, { status: string; justification?: string }>;
    absences: number;
    lates: number;
    leaves: number;
    excuses: number;
    attendancePercent: number;
  }[];
}

// 1.1 Matrix Excel Export (exceljs)
export async function generateAndDownloadAttendanceMatrixExcel(data: MatrixExportData) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "AcademiX";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Planilla Asistencia", {
    views: [{ showGridLines: true }],
  });

  const totalCols = Math.max(7 + data.allDates.length, 8);
  const lastColLetter = sheet.getColumn(totalCols).letter;

  // Title Banner
  sheet.mergeCells(`A1:${lastColLetter}1`);
  const titleCell = sheet.getCell("A1");
  titleCell.value = `${data.groupName.toUpperCase()} — PLANILLA DE ASISTENCIA (${data.courseTitle.toUpperCase()})`;
  titleCell.font = { name: "Segoe UI", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.alignment = { vertical: "middle", horizontal: "center" };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF312E81" } };
  sheet.getRow(1).height = 34;

  // Subtitle
  sheet.mergeCells(`A2:${lastColLetter}2`);
  const subtitleCell = sheet.getCell("A2");
  subtitleCell.value = `Grupo: ${data.groupName} | Materia: ${data.courseTitle} | Aprendices: ${data.students.length} | Sesiones: ${data.allDates.length} | Generado: ${new Date().toLocaleDateString("es-ES")}`;
  subtitleCell.font = { name: "Segoe UI", size: 9, italic: true, color: { argb: "FF334155" } };
  subtitleCell.alignment = { vertical: "middle", horizontal: "center" };
  subtitleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
  sheet.getRow(2).height = 22;

  // Headers
  const headerValues = [
    "N°",
    "Aprendiz",
    "Identificación",
    ...data.allDates.map(d => {
      const parts = d.split("-");
      return parts.length === 3 ? `${parts[2]}/${parts[1]}` : d;
    }),
    "Faltas (F)",
    "Tardes (T)",
    "Retiros (R)",
    "Excusas (E)",
    "% Asistencia",
  ];

  const headerRow = sheet.addRow(headerValues);
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E1B4B" } };
    cell.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "medium", color: { argb: "FF4F46E5" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } },
    };
  });

  // Data rows
  data.students.forEach((s, idx) => {
    const rowValues = [
      idx + 1,
      s.name,
      s.identification || "—",
      ...data.allDates.map(d => {
        const rec = s.records[d];
        if (!rec) return "•";
        if (rec.justification) return "E";
        if (rec.status === "ABSENT") return "F";
        if (rec.status === "LATE") return "T";
        if (rec.status === "LEAVE_EARLY") return "R";
        return "•";
      }),
      s.absences,
      s.lates,
      s.leaves,
      s.excuses,
      `${s.attendancePercent.toFixed(0)}%`,
    ];

    const row = sheet.addRow(rowValues);
    row.height = 20;
    const isEven = idx % 2 === 0;

    row.eachCell((cell, colNum) => {
      cell.font = { name: "Segoe UI", size: 9 };
      cell.alignment = {
        vertical: "middle",
        horizontal: colNum === 2 ? "left" : "center",
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };

      if (isEven) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
      }

      // Highlight statuses
      const val = String(cell.value);
      if (val === "F") {
        cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FFDC2626" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF2F2" } };
      } else if (val === "T") {
        cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FFD97706" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFBEB" } };
      } else if (val === "R") {
        cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF2563EB" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } };
      } else if (val === "E") {
        cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF7C3AED" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F3FF" } };
      }
    });
  });

  // Column Widths
  sheet.getColumn(1).width = 6;
  sheet.getColumn(2).width = 30;
  sheet.getColumn(3).width = 16;
  for (let i = 0; i < data.allDates.length; i++) {
    sheet.getColumn(4 + i).width = 9;
  }
  const summaryStart = 4 + data.allDates.length;
  sheet.getColumn(summaryStart).width = 12;
  sheet.getColumn(summaryStart + 1).width = 12;
  sheet.getColumn(summaryStart + 2).width = 12;
  sheet.getColumn(summaryStart + 3).width = 12;
  sheet.getColumn(summaryStart + 4).width = 14;

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  triggerBlobDownload(
    blob,
    `Planilla_Asistencia_${data.groupName.replace(/[^a-zA-Z0-9]/g, "_")}_${data.courseTitle.replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`
  );
}

// 1.2 Matrix PDF Export (@react-pdf/renderer)
const MatrixPdfDocument: React.FC<{ data: MatrixExportData }> = ({ data }) => {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={pdfStyles.page}>
        {/* Header */}
        <View style={pdfStyles.headerContainer}>
          <View style={pdfStyles.headerLeft}>
            <Text style={pdfStyles.mainTitle}>Planilla de Asistencia</Text>
            <Text style={pdfStyles.subTitle}>
              {data.groupName} • {data.courseTitle}
            </Text>
          </View>
          <View style={pdfStyles.badge}>
            <Text style={pdfStyles.badgeText}>CONSOLIDADO OFICIAL</Text>
          </View>
        </View>

        {/* Metadata Card */}
        <View style={pdfStyles.metaCard}>
          <View style={pdfStyles.metaItem}>
            <Text style={pdfStyles.metaLabel}>Grupo / Ficha</Text>
            <Text style={pdfStyles.metaValue}>{data.groupName}</Text>
          </View>
          <View style={pdfStyles.metaItem}>
            <Text style={pdfStyles.metaLabel}>Materia / Curso</Text>
            <Text style={pdfStyles.metaValue}>{data.courseTitle}</Text>
          </View>
          <View style={pdfStyles.metaItem}>
            <Text style={pdfStyles.metaLabel}>Total Aprendices</Text>
            <Text style={pdfStyles.metaValue}>{data.students.length}</Text>
          </View>
          <View style={pdfStyles.metaItem}>
            <Text style={pdfStyles.metaLabel}>Total Sesiones</Text>
            <Text style={pdfStyles.metaValue}>{data.allDates.length}</Text>
          </View>
          <View style={pdfStyles.metaItem}>
            <Text style={pdfStyles.metaLabel}>Convenciones</Text>
            <Text style={pdfStyles.metaValue}>•: Presente | F: Falta | T: Tarde | R: Retiro | E: Excusa</Text>
          </View>
        </View>

        {/* Table */}
        <View style={pdfStyles.gridTable}>
          <View style={pdfStyles.tableHeaderRow}>
            <Text style={[pdfStyles.tableHeaderCell, { width: "4%" }]}>N°</Text>
            <Text style={[pdfStyles.tableHeaderCell, { width: "24%", textAlign: "left" }]}>Aprendiz</Text>
            <Text style={[pdfStyles.tableHeaderCell, { width: "12%" }]}>Documento</Text>
            {data.allDates.map((d, i) => (
              <Text
                key={i}
                style={[
                  pdfStyles.tableHeaderCell,
                  { width: `${Math.max(4, 40 / Math.max(1, data.allDates.length))}%` },
                ]}
              >
                {d.split("-").slice(1).join("/")}
              </Text>
            ))}
            <Text style={[pdfStyles.tableHeaderCell, { width: "5%" }]}>F</Text>
            <Text style={[pdfStyles.tableHeaderCell, { width: "5%" }]}>T</Text>
            <Text style={[pdfStyles.tableHeaderCell, { width: "5%" }]}>R</Text>
            <Text style={[pdfStyles.tableHeaderCell, { width: "5%" }]}>%</Text>
          </View>

          {data.students.map((s, idx) => {
            const isEven = idx % 2 === 0;
            return (
              <View
                key={s.id}
                style={[pdfStyles.tableRow, isEven ? pdfStyles.tableRowEven : {}]}
              >
                <Text style={[pdfStyles.tableCell, { width: "4%", textAlign: "center" }]}>
                  {idx + 1}
                </Text>
                <Text style={[pdfStyles.tableCell, { width: "24%", fontFamily: "Helvetica-Bold" }]}>
                  {s.name}
                </Text>
                <Text style={[pdfStyles.tableCell, { width: "12%", textAlign: "center" }]}>
                  {s.identification || "—"}
                </Text>
                {data.allDates.map((d, i) => {
                  const rec = s.records[d];
                  let label = "•";
                  let styleClass = pdfStyles.statusPresent;
                  if (rec?.justification) {
                    label = "E";
                    styleClass = pdfStyles.statusExcused;
                  } else if (rec?.status === "ABSENT") {
                    label = "F";
                    styleClass = pdfStyles.statusAbsent;
                  } else if (rec?.status === "LATE") {
                    label = "T";
                    styleClass = pdfStyles.statusLate;
                  } else if (rec?.status === "LEAVE_EARLY") {
                    label = "R";
                    styleClass = pdfStyles.statusLeave;
                  }

                  return (
                    <Text
                      key={i}
                      style={[
                        pdfStyles.tableCell,
                        pdfStyles.badgeStatus,
                        styleClass,
                        { width: `${Math.max(4, 40 / Math.max(1, data.allDates.length))}%` },
                      ]}
                    >
                      {label}
                    </Text>
                  );
                })}
                <Text style={[pdfStyles.tableCell, { width: "5%", textAlign: "center", color: "#dc2626", fontFamily: "Helvetica-Bold" }]}>
                  {s.absences}
                </Text>
                <Text style={[pdfStyles.tableCell, { width: "5%", textAlign: "center", color: "#d97706", fontFamily: "Helvetica-Bold" }]}>
                  {s.lates}
                </Text>
                <Text style={[pdfStyles.tableCell, { width: "5%", textAlign: "center", color: "#2563eb", fontFamily: "Helvetica-Bold" }]}>
                  {s.leaves}
                </Text>
                <Text style={[pdfStyles.tableCell, { width: "5%", textAlign: "center", fontFamily: "Helvetica-Bold" }]}>
                  {s.attendancePercent.toFixed(0)}%
                </Text>
              </View>
            );
          })}
        </View>

        {/* Footer */}
        <View style={pdfStyles.footer}>
          <Text>AcademiX — Sistema de Gestión y Asistencia Académica</Text>
          <Text>Generado el {new Date().toLocaleDateString("es-ES")}</Text>
        </View>
      </Page>
    </Document>
  );
};

export async function generateAndDownloadAttendanceMatrixPdf(data: MatrixExportData) {
  const blob = await pdf(<MatrixPdfDocument data={data} />).toBlob();
  triggerBlobDownload(
    blob,
    `Planilla_Asistencia_${data.groupName.replace(/[^a-zA-Z0-9]/g, "_")}_${data.courseTitle.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`
  );
}

// ============================================================================
// 2. HISTORIAL DE NOVEDADES (HISTORY) EXPORT
// ============================================================================

export interface HistoryExportRow {
  studentName: string;
  identification: string;
  date: string;
  type: string; // Falta, Llegada Tarde, Retiro Anticipado, Excusado
  time?: string;
  justification?: string;
}

// 2.1 History Excel Export (exceljs)
export async function generateAndDownloadAttendanceHistoryExcel(
  groupName: string,
  courseTitle: string,
  rows: HistoryExportRow[]
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "AcademiX";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Historial Novedades", {
    views: [{ showGridLines: true }],
  });

  // Title Banner
  sheet.mergeCells("A1:F1");
  const titleCell = sheet.getCell("A1");
  titleCell.value = `${groupName.toUpperCase()} — HISTORIAL DE NOVEDADES DE ASISTENCIA`;
  titleCell.font = { name: "Segoe UI", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.alignment = { vertical: "middle", horizontal: "center" };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF312E81" } };
  sheet.getRow(1).height = 34;

  // Subtitle
  sheet.mergeCells("A2:F2");
  const subtitleCell = sheet.getCell("A2");
  subtitleCell.value = `Materia: ${courseTitle} | Total Registros de Novedad: ${rows.length} | Generado: ${new Date().toLocaleDateString("es-ES")}`;
  subtitleCell.font = { name: "Segoe UI", size: 9, italic: true, color: { argb: "FF334155" } };
  subtitleCell.alignment = { vertical: "middle", horizontal: "center" };
  subtitleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
  sheet.getRow(2).height = 22;

  // Headers
  const headers = [
    "Aprendiz",
    "Identificación",
    "Fecha",
    "Tipo de Novedad",
    "Hora de Entrada / Salida",
    "Justificación / Observación",
  ];

  const headerRow = sheet.addRow(headers);
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E1B4B" } };
    cell.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "medium", color: { argb: "FF4F46E5" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } },
    };
  });

  rows.forEach((r, idx) => {
    const row = sheet.addRow([
      r.studentName,
      r.identification || "—",
      r.date,
      r.type,
      r.time || "—",
      r.justification || "Sin justificación",
    ]);
    row.height = 22;
    const isEven = idx % 2 === 0;

    row.eachCell((cell, colNum) => {
      cell.font = { name: "Segoe UI", size: 9 };
      cell.alignment = {
        vertical: "middle",
        horizontal: colNum === 1 || colNum === 6 ? "left" : "center",
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };

      if (isEven) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
      }

      if (colNum === 4) {
        const val = String(cell.value);
        if (val.includes("Falta")) {
          cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FFDC2626" } };
        } else if (val.includes("Tarde")) {
          cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FFD97706" } };
        } else if (val.includes("Retiro")) {
          cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF2563EB" } };
        }
      }
    });
  });

  sheet.columns = [
    { width: 30 },
    { width: 18 },
    { width: 16 },
    { width: 22 },
    { width: 24 },
    { width: 36 },
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  triggerBlobDownload(
    blob,
    `Historial_Novedades_${groupName.replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`
  );
}

// 2.2 History PDF Export (@react-pdf/renderer)
const HistoryPdfDocument: React.FC<{
  groupName: string;
  courseTitle: string;
  rows: HistoryExportRow[];
}> = ({ groupName, courseTitle, rows }) => {
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        {/* Header */}
        <View style={pdfStyles.headerContainer}>
          <View style={pdfStyles.headerLeft}>
            <Text style={pdfStyles.mainTitle}>Historial de Novedades</Text>
            <Text style={pdfStyles.subTitle}>
              {groupName} • {courseTitle}
            </Text>
          </View>
          <View style={pdfStyles.badge}>
            <Text style={pdfStyles.badgeText}>{rows.length} REGISTROS</Text>
          </View>
        </View>

        {/* Metadata Card */}
        <View style={pdfStyles.metaCard}>
          <View style={pdfStyles.metaItem}>
            <Text style={pdfStyles.metaLabel}>Grupo</Text>
            <Text style={pdfStyles.metaValue}>{groupName}</Text>
          </View>
          <View style={pdfStyles.metaItem}>
            <Text style={pdfStyles.metaLabel}>Materia</Text>
            <Text style={pdfStyles.metaValue}>{courseTitle}</Text>
          </View>
          <View style={pdfStyles.metaItem}>
            <Text style={pdfStyles.metaLabel}>Total Novedades</Text>
            <Text style={pdfStyles.metaValue}>{rows.length}</Text>
          </View>
          <View style={pdfStyles.metaItem}>
            <Text style={pdfStyles.metaLabel}>Generado</Text>
            <Text style={pdfStyles.metaValue}>{new Date().toLocaleDateString("es-ES")}</Text>
          </View>
        </View>

        {/* Table */}
        <View style={pdfStyles.gridTable}>
          <View style={pdfStyles.tableHeaderRow}>
            <Text style={[pdfStyles.tableHeaderCell, { width: "26%", textAlign: "left" }]}>Aprendiz</Text>
            <Text style={[pdfStyles.tableHeaderCell, { width: "14%" }]}>Documento</Text>
            <Text style={[pdfStyles.tableHeaderCell, { width: "12%" }]}>Fecha</Text>
            <Text style={[pdfStyles.tableHeaderCell, { width: "16%" }]}>Tipo Novedad</Text>
            <Text style={[pdfStyles.tableHeaderCell, { width: "12%" }]}>Hora</Text>
            <Text style={[pdfStyles.tableHeaderCell, { width: "20%", textAlign: "left" }]}>Justificación</Text>
          </View>

          {rows.map((r, idx) => {
            const isEven = idx % 2 === 0;
            let typeColor = "#334155";
            if (r.type.includes("Falta")) typeColor = "#dc2626";
            else if (r.type.includes("Tarde")) typeColor = "#d97706";
            else if (r.type.includes("Retiro")) typeColor = "#2563eb";

            return (
              <View
                key={idx}
                style={[pdfStyles.tableRow, isEven ? pdfStyles.tableRowEven : {}]}
              >
                <Text style={[pdfStyles.tableCell, { width: "26%", fontFamily: "Helvetica-Bold" }]}>
                  {r.studentName}
                </Text>
                <Text style={[pdfStyles.tableCell, { width: "14%", textAlign: "center" }]}>
                  {r.identification || "—"}
                </Text>
                <Text style={[pdfStyles.tableCell, { width: "12%", textAlign: "center" }]}>
                  {r.date}
                </Text>
                <Text style={[pdfStyles.tableCell, { width: "16%", textAlign: "center", color: typeColor, fontFamily: "Helvetica-Bold" }]}>
                  {r.type}
                </Text>
                <Text style={[pdfStyles.tableCell, { width: "12%", textAlign: "center" }]}>
                  {r.time || "—"}
                </Text>
                <Text style={[pdfStyles.tableCell, { width: "20%" }]}>
                  {r.justification || "Sin justificación"}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Footer */}
        <View style={pdfStyles.footer}>
          <Text>AcademiX — Sistema de Gestión y Asistencia Académica</Text>
          <Text>Generado el {new Date().toLocaleDateString("es-ES")}</Text>
        </View>
      </Page>
    </Document>
  );
};

export async function generateAndDownloadAttendanceHistoryPdf(
  groupName: string,
  courseTitle: string,
  rows: HistoryExportRow[]
) {
  const blob = await pdf(
    <HistoryPdfDocument groupName={groupName} courseTitle={courseTitle} rows={rows} />
  ).toBlob();
  triggerBlobDownload(blob, `Historial_Novedades_${groupName.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`);
}

// ============================================================================
// 3. MÉTRICAS Y ANÁLISIS (METRICS) EXPORT
// ============================================================================

export interface MetricsExportData {
  groupName: string;
  courseTitle: string;
  totalSessions: number;
  totalStudents: number;
  overallAttendanceRate: number;
  totalAbsences: number;
  totalLates: number;
  totalLeaves: number;
  riskStudents: {
    name: string;
    identification: string;
    absences: number;
    lates: number;
    leaves: number;
    attendancePercent: number;
  }[];
  allStudentsSummary: {
    name: string;
    identification: string;
    absences: number;
    lates: number;
    leaves: number;
    attendancePercent: number;
  }[];
}

// 3.1 Metrics Excel Export (exceljs)
export async function generateAndDownloadAttendanceMetricsExcel(data: MetricsExportData) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "AcademiX";
  workbook.created = new Date();

  // Sheet 1: KPIs y Resumen
  const sheet = workbook.addWorksheet("Métricas Generales", {
    views: [{ showGridLines: true }],
  });

  // Title Banner
  sheet.mergeCells("A1:F1");
  const titleCell = sheet.getCell("A1");
  titleCell.value = `${data.groupName.toUpperCase()} — REPORTE DE MÉTRICAS Y ASISTENCIA`;
  titleCell.font = { name: "Segoe UI", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.alignment = { vertical: "middle", horizontal: "center" };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF312E81" } };
  sheet.getRow(1).height = 34;

  // Subtitle
  sheet.mergeCells("A2:F2");
  const subtitleCell = sheet.getCell("A2");
  subtitleCell.value = `Materia: ${data.courseTitle} | Tasa Global: ${data.overallAttendanceRate.toFixed(1)}% | Generado: ${new Date().toLocaleDateString("es-ES")}`;
  subtitleCell.font = { name: "Segoe UI", size: 9, italic: true, color: { argb: "FF334155" } };
  subtitleCell.alignment = { vertical: "middle", horizontal: "center" };
  subtitleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
  sheet.getRow(2).height = 22;

  // KPI Table
  sheet.addRow([]);
  const kpiTitleRow = sheet.addRow(["INDICADOR CLAVE", "VALOR"]);
  kpiTitleRow.eachCell(cell => {
    cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E1B4B" } };
  });

  sheet.addRow(["Total Aprendices Matriculados", data.totalStudents]);
  sheet.addRow(["Sesiones de Clase Realizadas", data.totalSessions]);
  sheet.addRow(["Tasa Global de Asistencia", `${data.overallAttendanceRate.toFixed(1)}%`]);
  sheet.addRow(["Total Inasistencias (Faltas)", data.totalAbsences]);
  sheet.addRow(["Total Llegadas Tarde", data.totalLates]);
  sheet.addRow(["Total Retiros Anticipados", data.totalLeaves]);
  sheet.addRow(["Aprendices en Riesgo Académico (<80%)", data.riskStudents.length]);

  sheet.addRow([]);
  sheet.addRow([]);

  // Students Table
  const tableHeader = sheet.addRow([
    "Aprendiz",
    "Identificación",
    "Faltas",
    "Tardes",
    "Retiros",
    "% Asistencia",
  ]);
  tableHeader.height = 26;
  tableHeader.eachCell(cell => {
    cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E1B4B" } };
    cell.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "medium", color: { argb: "FF4F46E5" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } },
    };
  });

  data.allStudentsSummary.forEach((s, idx) => {
    const row = sheet.addRow([
      s.name,
      s.identification || "—",
      s.absences,
      s.lates,
      s.leaves,
      `${s.attendancePercent.toFixed(1)}%`,
    ]);
    row.height = 20;
    const isEven = idx % 2 === 0;

    row.eachCell((cell, colNum) => {
      cell.font = { name: "Segoe UI", size: 9 };
      cell.alignment = {
        vertical: "middle",
        horizontal: colNum === 1 ? "left" : "center",
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };

      if (isEven) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
      }

      if (colNum === 6 && s.attendancePercent < 80) {
        cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FFDC2626" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF2F2" } };
      }
    });
  });

  sheet.columns = [
    { width: 34 },
    { width: 20 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 18 },
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  triggerBlobDownload(
    blob,
    `Metricas_Asistencia_${data.groupName.replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`
  );
}

// 3.2 Metrics PDF Export (@react-pdf/renderer)
const MetricsPdfDocument: React.FC<{ data: MetricsExportData }> = ({ data }) => {
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        {/* Header */}
        <View style={pdfStyles.headerContainer}>
          <View style={pdfStyles.headerLeft}>
            <Text style={pdfStyles.mainTitle}>Métricas de Asistencia y Rendimiento</Text>
            <Text style={pdfStyles.subTitle}>
              {data.groupName} • {data.courseTitle}
            </Text>
          </View>
          <View style={pdfStyles.badge}>
            <Text style={pdfStyles.badgeText}>{data.overallAttendanceRate.toFixed(1)}% ASISTENCIA GLOBAL</Text>
          </View>
        </View>

        {/* KPI Cards Row */}
        <View style={[pdfStyles.metaCard, { marginBottom: 12 }]}>
          <View style={pdfStyles.metaItem}>
            <Text style={pdfStyles.metaLabel}>Aprendices</Text>
            <Text style={pdfStyles.metaValue}>{data.totalStudents}</Text>
          </View>
          <View style={pdfStyles.metaItem}>
            <Text style={pdfStyles.metaLabel}>Sesiones</Text>
            <Text style={pdfStyles.metaValue}>{data.totalSessions}</Text>
          </View>
          <View style={pdfStyles.metaItem}>
            <Text style={pdfStyles.metaLabel}>Faltas Totales</Text>
            <Text style={[pdfStyles.metaValue, { color: "#dc2626" }]}>{data.totalAbsences}</Text>
          </View>
          <View style={pdfStyles.metaItem}>
            <Text style={pdfStyles.metaLabel}>Llegadas Tarde</Text>
            <Text style={[pdfStyles.metaValue, { color: "#d97706" }]}>{data.totalLates}</Text>
          </View>
          <View style={pdfStyles.metaItem}>
            <Text style={pdfStyles.metaLabel}>Retiros</Text>
            <Text style={[pdfStyles.metaValue, { color: "#2563eb" }]}>{data.totalLeaves}</Text>
          </View>
          <View style={pdfStyles.metaItem}>
            <Text style={pdfStyles.metaLabel}>En Riesgo (&lt;80%)</Text>
            <Text style={[pdfStyles.metaValue, { color: data.riskStudents.length > 0 ? "#dc2626" : "#059669" }]}>
              {data.riskStudents.length}
            </Text>
          </View>
        </View>

        {/* Breakdown Table */}
        <View style={pdfStyles.gridTable}>
          <View style={pdfStyles.tableHeaderRow}>
            <Text style={[pdfStyles.tableHeaderCell, { width: "36%", textAlign: "left" }]}>Aprendiz</Text>
            <Text style={[pdfStyles.tableHeaderCell, { width: "18%" }]}>Identificación</Text>
            <Text style={[pdfStyles.tableHeaderCell, { width: "11%" }]}>Faltas</Text>
            <Text style={[pdfStyles.tableHeaderCell, { width: "11%" }]}>Tardes</Text>
            <Text style={[pdfStyles.tableHeaderCell, { width: "11%" }]}>Retiros</Text>
            <Text style={[pdfStyles.tableHeaderCell, { width: "13%" }]}>% Asistencia</Text>
          </View>

          {data.allStudentsSummary.map((s, idx) => {
            const isEven = idx % 2 === 0;
            const isRisk = s.attendancePercent < 80;
            return (
              <View
                key={idx}
                style={[pdfStyles.tableRow, isEven ? pdfStyles.tableRowEven : {}]}
              >
                <Text style={[pdfStyles.tableCell, { width: "36%", fontFamily: "Helvetica-Bold" }]}>
                  {s.name}
                </Text>
                <Text style={[pdfStyles.tableCell, { width: "18%", textAlign: "center" }]}>
                  {s.identification || "—"}
                </Text>
                <Text style={[pdfStyles.tableCell, { width: "11%", textAlign: "center", color: "#dc2626", fontFamily: "Helvetica-Bold" }]}>
                  {s.absences}
                </Text>
                <Text style={[pdfStyles.tableCell, { width: "11%", textAlign: "center", color: "#d97706", fontFamily: "Helvetica-Bold" }]}>
                  {s.lates}
                </Text>
                <Text style={[pdfStyles.tableCell, { width: "11%", textAlign: "center", color: "#2563eb", fontFamily: "Helvetica-Bold" }]}>
                  {s.leaves}
                </Text>
                <Text
                  style={[
                    pdfStyles.tableCell,
                    {
                      width: "13%",
                      textAlign: "center",
                      fontFamily: "Helvetica-Bold",
                      color: isRisk ? "#dc2626" : "#059669",
                    },
                  ]}
                >
                  {s.attendancePercent.toFixed(1)}%
                </Text>
              </View>
            );
          })}
        </View>

        {/* Footer */}
        <View style={pdfStyles.footer}>
          <Text>AcademiX — Sistema de Gestión y Asistencia Académica</Text>
          <Text>Generado el {new Date().toLocaleDateString("es-ES")}</Text>
        </View>
      </Page>
    </Document>
  );
};

export async function generateAndDownloadAttendanceMetricsPdf(data: MetricsExportData) {
  const blob = await pdf(<MetricsPdfDocument data={data} />).toBlob();
  triggerBlobDownload(
    blob,
    `Metricas_Asistencia_${data.groupName.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`
  );
}
