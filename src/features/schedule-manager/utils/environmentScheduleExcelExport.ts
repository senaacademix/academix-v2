import ExcelJS from "exceljs";
import { DayOfWeek } from "@/generated/prisma/client";
import { ScheduleBuilderData } from "../actions/scheduleBuilderActions";
import { EnvironmentExportData } from "./environmentSchedulePdfExport";

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

const formatDate = (d: Date | string) => {
  if (!d) return "";
  const date = new Date(d);
  return date.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
};

export async function exportEnvironmentsToExcel(
  schedule: ScheduleBuilderData["schedule"],
  environmentsData: EnvironmentExportData[],
  exportMode: "single" | "all" | "chart" = "single",
  filename = `Horarios_Ambientes_${schedule.name}.xlsx`
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Academix";
  workbook.created = new Date();

  // 1. CONSOLIDATED SUMMARY SHEET (Only for all or chart mode)
  if (exportMode !== "single") {
    const summarySheet = workbook.addWorksheet(
      exportMode === "chart" ? "Reporte Ocupación" : "Matriz General Ambientes",
      { views: [{ showGridLines: true }] }
    );

  // Title
  summarySheet.mergeCells("A1:G1");
  const titleCell = summarySheet.getCell("A1");
  titleCell.value = "ACADEMIX - CONSOLIDADO DE AMBIENTES DE APRENDIZAJE";
  titleCell.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF059669" } };
  titleCell.alignment = { vertical: "middle", horizontal: "center" };
  summarySheet.getRow(1).height = 30;

  // Subtitle
  summarySheet.mergeCells("A2:G2");
  const subCell = summarySheet.getCell("A2");
  subCell.value = `Horario: ${schedule.name} | Vigencia: ${formatDate(schedule.startDate)} - ${formatDate(schedule.endDate)}`;
  subCell.font = { name: "Segoe UI", size: 10, italic: true, color: { argb: "FF334155" } };
  subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0FDF4" } };
  subCell.alignment = { vertical: "middle", horizontal: "center" };
  summarySheet.getRow(2).height = 20;

  summarySheet.addRow([]);

  // Headers
  const summaryHeaders = [
    "Ambiente de Aprendizaje",
    "Ubicación / Sede",
    "Capacidad Puestos",
    "Aprendices a Atender",
    "Aforo Físico (%)",
    "Fichas Atendidas",
    "Horas / Semana",
    "Horas Totales del Periodo",
    "Estado Aforo",
  ];
  const headerRow = summarySheet.addRow(summaryHeaders);
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF047857" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "medium", color: { argb: "FF065F46" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } },
    };
  });

  // Data rows
  environmentsData.forEach((env, idx) => {
    const statusText = env.isStudentOverCapacity
      ? `SOBRECUPO (+${env.studentExcess})`
      : "Aforo Óptimo";

    const row = summarySheet.addRow([
      env.environment.name,
      env.environment.location || "Sede Principal",
      env.environment.capacity ? `${env.environment.capacity} puestos` : "N/A",
      `${env.totalStudents} aprendices`,
      `${env.capacityRatio}%`,
      env.distinctGroups.length,
      env.totalWeeklyHours,
      env.totalPeriodHours,
      statusText,
    ]);
    row.height = 20;

    const bgArgb = idx % 2 === 0 ? "FFFFFFFF" : "FFF8FAFC";
    row.eachCell((cell, colNum) => {
      cell.font = { name: "Segoe UI", size: 9 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgArgb } };
      cell.alignment = {
        vertical: "middle",
        horizontal: colNum <= 2 ? "left" : "center",
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
      if (colNum === 5 || colNum === 7) {
        cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF065F46" } };
      }
    });
  });

  // Total Summary Row
  const totalWeekly = environmentsData.reduce((acc, e) => acc + e.totalWeeklyHours, 0);
  const totalPeriod = environmentsData.reduce((acc, e) => acc + e.totalPeriodHours, 0);
  const totalRow = summarySheet.addRow([
    "TOTAL AMBIENTES",
    "-",
    "-",
    "-",
    totalWeekly,
    "-",
    totalPeriod,
  ]);
  totalRow.height = 24;
  totalRow.eachCell((cell) => {
    cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF065F46" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "medium", color: { argb: "FF059669" } },
      bottom: { style: "medium", color: { argb: "FF059669" } },
    };
  });

  summarySheet.columns = [
    { width: 28 },
    { width: 22 },
    { width: 16 },
    { width: 18 },
    { width: 16 },
    { width: 12 },
    { width: 26 },
  ];
  }

  // 2. INDIVIDUAL SHEETS PER ENVIRONMENT
  environmentsData.forEach((envData) => {
    const rawSheetName = envData.environment.name.replace(/[*?:\\/[\]]/g, "_").slice(0, 30);
    const sheet = workbook.addWorksheet(rawSheetName, {
      views: [{ showGridLines: true }],
    });

    // Title
    sheet.mergeCells("A1:G1");
    const h1 = sheet.getCell("A1");
    h1.value = `ACADEMIX - AMBIENTE: ${envData.environment.name.toUpperCase()}`;
    h1.font = { name: "Segoe UI", size: 12, bold: true, color: { argb: "FFFFFFFF" } };
    h1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF059669" } };
    h1.alignment = { vertical: "middle", horizontal: "center" };
    sheet.getRow(1).height = 26;

    // Subtitle Info
    sheet.mergeCells("A2:G2");
    const h2 = sheet.getCell("A2");
    h2.value = `Ubicación: ${envData.environment.location || "Sede Principal"} | Capacidad: ${envData.environment.capacity || "N/A"} | Carga: ${envData.totalWeeklyHours}h/sem | Total Período: ${envData.totalPeriodHours}h (${envData.totalWeeks} semanas)`;
    h2.font = { name: "Segoe UI", size: 9, italic: true, color: { argb: "FF334155" } };
    h2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0FDF4" } };
    h2.alignment = { vertical: "middle", horizontal: "center" };
    sheet.getRow(2).height = 20;

    sheet.addRow([]);

    // Weekly Calendar Section Header
    sheet.mergeCells("A4:G4");
    const sec1 = sheet.getCell("A4");
    sec1.value = "MATRIZ SEMANAL DE OCUPACIÓN";
    sec1.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF065F46" } };
    sec1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } };
    sec1.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    sheet.getRow(4).height = 20;

    // Day Columns Header
    const dayHeaders = DAYS_ES.map((d) => d.label);
    const dayHeaderRow = sheet.addRow(dayHeaders);
    dayHeaderRow.height = 22;
    dayHeaderRow.eachCell((cell) => {
      cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF047857" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "thin", color: { argb: "FFCBD5E1" } },
        bottom: { style: "medium", color: { argb: "FF065F46" } },
        left: { style: "thin", color: { argb: "FFCBD5E1" } },
        right: { style: "thin", color: { argb: "FFCBD5E1" } },
      };
    });

    // Fill days content
    const maxDayClasses = Math.max(
      ...DAYS_ES.map((d) => (envData.classesByDay[d.key] || []).length),
      1
    );

    for (let i = 0; i < maxDayClasses; i++) {
      const rowValues = DAYS_ES.map((d) => {
        const cls = (envData.classesByDay[d.key] || [])[i];
        if (!cls) return "";
        return `Ficha ${cls.groupName}\n${cls.courseTitle}\n${cls.teacherName}\n${toFormat12h(cls.startTime)} - ${toFormat12h(cls.endTime)} (${cls.durationHours}h)`;
      });

      const dataRow = sheet.addRow(rowValues);
      dataRow.height = 55;
      dataRow.eachCell((cell, colNum) => {
        cell.font = { name: "Segoe UI", size: 8 };
        cell.alignment = { vertical: "top", horizontal: "left", wrapText: true };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
        if (cell.value) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFECFDF5" } };
        } else {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } };
        }
      });
    }

    sheet.addRow([]);

    // Detailed Table Section
    const tableHeaderRowIndex = sheet.rowCount + 1;
    sheet.mergeCells(`A${tableHeaderRowIndex}:E${tableHeaderRowIndex}`);
    const sec2 = sheet.getCell(`A${tableHeaderRowIndex}`);
    sec2.value = "DETALLE DE CLASES ASIGNADAS";
    sec2.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF065F46" } };
    sec2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } };
    sec2.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    sheet.getRow(tableHeaderRowIndex).height = 20;

    const detailHeaders = ["Ficha / Grupo", "Asignatura / Competencia", "Instructor Responsable", "Día", "Horario (Duración)"];
    const detailHeaderRow = sheet.addRow(detailHeaders);
    detailHeaderRow.height = 22;
    detailHeaderRow.eachCell((cell) => {
      cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF047857" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "thin", color: { argb: "FFCBD5E1" } },
        bottom: { style: "medium", color: { argb: "FF065F46" } },
      };
    });

    if (envData.allAssignments.length === 0) {
      const emptyRow = sheet.addRow(["No hay clases asignadas", "-", "-", "-", "-"]);
      emptyRow.height = 20;
    } else {
      envData.allAssignments.forEach((asg, aIdx) => {
        const dRow = sheet.addRow([
          `Ficha ${asg.groupName}`,
          asg.courseTitle,
          asg.teacherName,
          asg.dayLabel,
          `${toFormat12h(asg.startTime)} - ${toFormat12h(asg.endTime)} (${asg.durationHours}h)`,
        ]);
        dRow.height = 20;
        const bgArgb = aIdx % 2 === 0 ? "FFFFFFFF" : "FFF8FAFC";
        dRow.eachCell((cell, colNum) => {
          cell.font = { name: "Segoe UI", size: 8.5 };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgArgb } };
          cell.alignment = {
            vertical: "middle",
            horizontal: colNum <= 3 ? "left" : "center",
          };
          cell.border = {
            top: { style: "thin", color: { argb: "FFE2E8F0" } },
            bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
            left: { style: "thin", color: { argb: "FFE2E8F0" } },
            right: { style: "thin", color: { argb: "FFE2E8F0" } },
          };
        });
      });
    }

    sheet.columns = [
      { width: 22 },
      { width: 34 },
      { width: 26 },
      { width: 16 },
      { width: 24 },
      { width: 14 },
      { width: 14 },
    ];
  });

  // Write and trigger download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
