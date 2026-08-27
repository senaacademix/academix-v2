import ExcelJS from "exceljs";
import { DayOfWeek } from "@/generated/prisma/client";
import { ScheduleBuilderData } from "../actions/scheduleBuilderActions";
import { TeacherExportData } from "./teacherSchedulePdfExport";

const DAYS_ES: { key: DayOfWeek; label: string }[] = [
  { key: "MONDAY", label: "LUNES" },
  { key: "TUESDAY", label: "MARTES" },
  { key: "WEDNESDAY", label: "MIÉRCOLES" },
  { key: "THURSDAY", label: "JUEVES" },
  { key: "FRIDAY", label: "VIERNES" },
  { key: "SATURDAY", label: "SÁBADO" },
  { key: "SUNDAY", label: "DOMINGO" },
];

const toFormat12h = (t24: string) => {
  if (!t24) return "";
  const [h, m] = t24.split(":").map(Number);
  const ap = h >= 12 ? "p.m." : "a.m.";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ap}`;
};

const formatDate = (isoString: string) => {
  if (!isoString) return "";
  return new Date(isoString).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export async function generateAndDownloadTeacherScheduleExcel(
  schedule: ScheduleBuilderData["schedule"],
  teachersData: TeacherExportData[]
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "AcademiX";
  workbook.lastModifiedBy = "AcademiX";
  workbook.created = new Date();
  workbook.modified = new Date();

  // =========================================================================
  // 1. SHEET: CONSOLIDADO DE CARGA DOCENTE
  // =========================================================================
  const summarySheet = workbook.addWorksheet("Consolidado Docentes", {
    views: [{ showGridLines: true }],
  });

  // Banner
  summarySheet.mergeCells("A1:G1");
  const titleCell = summarySheet.getCell("A1");
  titleCell.value = `${schedule.name.toUpperCase()} — CONSOLIDADO DE CARGA HORARIA DOCENTE`;
  titleCell.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.alignment = { vertical: "middle", horizontal: "center" };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF312E81" } }; // Deep Indigo
  summarySheet.getRow(1).height = 36;

  // Subtitle info
  summarySheet.mergeCells("A2:G2");
  const subtitleCell = summarySheet.getCell("A2");
  subtitleCell.value = `Período: ${formatDate(schedule.startDate)} al ${formatDate(
    schedule.endDate
  )} | Total Docentes: ${teachersData.length} | Generado: ${new Date().toLocaleDateString("es-ES")}`;
  subtitleCell.font = { name: "Segoe UI", size: 10, italic: true, color: { argb: "FF334155" } };
  subtitleCell.alignment = { vertical: "middle", horizontal: "center" };
  subtitleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
  summarySheet.getRow(2).height = 24;

  const headers = [
    "Docente / Instructor",
    "Correo Electrónico",
    "Fichas Asignadas",
    "Materia / Actividad",
    "Día",
    "Horario",
    "Ambiente",
  ];

  const headerRow = summarySheet.addRow(headers);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E1B4B" } };
    cell.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "medium", color: { argb: "FF4F46E5" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } },
    };
  });

  let rowIdx = 3;
  teachersData.forEach((t) => {
    t.classes.forEach((c) => {
      rowIdx++;
      const dayLabel = DAYS_ES.find((d) => d.key === c.dayOfWeek)?.label || c.dayOfWeek;
      const row = summarySheet.addRow([
        t.name,
        t.email || "N/A",
        `${c.groupName} (${c.programName})`,
        c.courseTitle,
        dayLabel,
        `${toFormat12h(c.startTime)} a ${toFormat12h(c.endTime)} (${c.durationHours}h)`,
        c.environmentName || "Sin ambiente",
      ]);

      row.height = 22;
      const isEven = rowIdx % 2 === 0;
      row.eachCell((cell, colNum) => {
        cell.font = { name: "Segoe UI", size: 9 };
        cell.alignment = {
          vertical: "middle",
          horizontal: colNum === 5 || colNum === 6 ? "center" : "left",
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
      });
    });
  });

  summarySheet.columns = [
    { width: 28 },
    { width: 28 },
    { width: 30 },
    { width: 36 },
    { width: 16 },
    { width: 26 },
    { width: 24 },
  ];

  // =========================================================================
  // 2. INDIVIDUAL SHEETS PER TEACHER (Weekly Matrix)
  // =========================================================================
  teachersData.forEach((t) => {
    const sheetName = t.name.replace(/[\\/*?:[\]]/g, "_").slice(0, 31);
    const sheet = workbook.addWorksheet(sheetName, {
      views: [{ showGridLines: true }],
    });

    // Header Banner
    sheet.mergeCells("A1:G1");
    const tTitle = sheet.getCell("A1");
    tTitle.value = `HORARIO SEMANAL — ${t.name.toUpperCase()}`;
    tTitle.font = { name: "Segoe UI", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
    tTitle.alignment = { vertical: "middle", horizontal: "center" };
    tTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4338CA" } };
    sheet.getRow(1).height = 32;

    sheet.mergeCells("A2:G2");
    const tMeta = sheet.getCell("A2");
    const distinctGroups = Array.from(new Set(t.classes.map((c) => c.groupName))).join(", ");
    tMeta.value = `Correo: ${t.email || "N/A"} | Carga Semanal: ${t.totalWeeklyHours} horas/semana | Fichas: ${
      distinctGroups || "Ninguna"
    }`;
    tMeta.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF1E1B4B" } };
    tMeta.alignment = { vertical: "middle", horizontal: "center" };
    tMeta.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E7FF" } };
    sheet.getRow(2).height = 22;

    sheet.addRow([]);

    // Week Grid Headers (Lunes a Domingo)
    const dayHeaderRow = sheet.addRow(DAYS_ES.map((d) => d.label));
    dayHeaderRow.height = 26;
    dayHeaderRow.eachCell((cell) => {
      cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FFFFFFFF" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E1B4B" } };
      cell.border = {
        top: { style: "medium", color: { argb: "FF1E1B4B" } },
        left: { style: "thin", color: { argb: "FFCBD5E1" } },
        bottom: { style: "medium", color: { argb: "FF4F46E5" } },
        right: { style: "thin", color: { argb: "FFCBD5E1" } },
      };
    });

    // Content Columns
    const dayClasses: Record<DayOfWeek, string[]> = {
      MONDAY: [],
      TUESDAY: [],
      WEDNESDAY: [],
      THURSDAY: [],
      FRIDAY: [],
      SATURDAY: [],
      SUNDAY: [],
    };

    t.classes.forEach((c) => {
      dayClasses[c.dayOfWeek]?.push(
        `• Ficha ${c.groupName}\n  ${c.courseTitle}\n  🕒 ${toFormat12h(c.startTime)} - ${toFormat12h(
          c.endTime
        )}\n  📍 ${c.environmentName}`
      );
    });

    const maxClassesInADay = Math.max(
      ...DAYS_ES.map((d) => dayClasses[d.key].length),
      1
    );

    for (let i = 0; i < maxClassesInADay; i++) {
      const rowValues = DAYS_ES.map((d) => dayClasses[d.key][i] || "");
      const classRow = sheet.addRow(rowValues);
      classRow.height = 54;
      classRow.eachCell((cell) => {
        cell.font = { name: "Segoe UI", size: 8 };
        cell.alignment = { vertical: "top", horizontal: "left", wrapText: true };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
        if (cell.value) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF2FF" } }; // Soft Indigo
        }
      });
    }

    sheet.columns = [
      { width: 28 },
      { width: 28 },
      { width: 28 },
      { width: 28 },
      { width: 28 },
      { width: 28 },
      { width: 28 },
    ];
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Horario_Docentes_${schedule.name.replace(/[^a-zA-Z0-9]/g, "_")}_${
    teachersData.length === 1 ? teachersData[0].name.replace(/[^a-zA-Z0-9]/g, "_") : "Completo"
  }.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
