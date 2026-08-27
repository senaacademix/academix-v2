import ExcelJS from "exceljs";
import { DayOfWeek } from "@/generated/prisma/client";
import { ScheduleBuilderData } from "../actions/scheduleBuilderActions";

const DAYS_ES: { key: DayOfWeek; label: string; short: string }[] = [
  { key: "MONDAY", label: "LUNES", short: "LUN" },
  { key: "TUESDAY", label: "MARTES", short: "MAR" },
  { key: "WEDNESDAY", label: "MIÉRCOLES", short: "MIÉ" },
  { key: "THURSDAY", label: "JUEVES", short: "JUE" },
  { key: "FRIDAY", label: "VIERNES", short: "VIE" },
  { key: "SATURDAY", label: "SÁBADO", short: "SÁB" },
  { key: "SUNDAY", label: "DOMINGO", short: "DOM" },
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

export async function generateAndDownloadScheduleExcel(
  schedule: ScheduleBuilderData["schedule"],
  groups: ScheduleBuilderData["groups"]
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "AcademiX";
  workbook.lastModifiedBy = "AcademiX";
  workbook.created = new Date();
  workbook.modified = new Date();

  // =========================================================================
  // 1. SHEET: CONSOLIDADO GENERAL DE HORARIOS
  // =========================================================================
  const summarySheet = workbook.addWorksheet("Consolidado General", {
    views: [{ showGridLines: true }],
  });

  // Title Banner
  summarySheet.mergeCells("A1:H1");
  const titleCell = summarySheet.getCell("A1");
  titleCell.value = `${schedule.name.toUpperCase()} — CONSOLIDADO OFICIAL DE HORARIOS`;
  titleCell.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.alignment = { vertical: "middle", horizontal: "center" };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } }; // Navy Blue
  summarySheet.getRow(1).height = 36;

  // Subtitle info
  summarySheet.mergeCells("A2:H2");
  const subtitleCell = summarySheet.getCell("A2");
  subtitleCell.value = `Período: ${formatDate(schedule.startDate)} al ${formatDate(
    schedule.endDate
  )} | Estado: ${schedule.isActive ? "VIGENTE" : "FUERA DE VIGENCIA"} (${
    schedule.isPublished ? "PÚBLICO" : "BORRADOR"
  }) | Total Fichas: ${groups.length} | Generado: ${new Date().toLocaleDateString("es-ES")}`;
  subtitleCell.font = { name: "Segoe UI", size: 10, italic: true, color: { argb: "FF334155" } };
  subtitleCell.alignment = { vertical: "middle", horizontal: "center" };
  subtitleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
  summarySheet.getRow(2).height = 24;

  // Headers
  const summaryHeaders = [
    "Ficha / Grupo",
    "Programa de Formación",
    "Trimestre",
    "Ambiente",
    "Materia / Actividad",
    "Docente Asignado",
    "Día",
    "Horario de Clase",
  ];

  const headerRow = summarySheet.addRow(summaryHeaders);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
    cell.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "medium", color: { argb: "FF2563EB" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } },
    };
  });

  let rowIdx = 3;
  groups.forEach((g) => {
    let hasClasses = false;

    g.scheduledClasses.forEach((c) => {
      c.schedules.forEach((s) => {
        hasClasses = true;
        rowIdx++;
        const dayLabel = DAYS_ES.find((d) => d.key === s.dayOfWeek)?.label || s.dayOfWeek;
        const row = summarySheet.addRow([
          g.name,
          g.program.name,
          g.period?.name || "N/A",
          g.environment?.name || "Sin ambiente",
          c.title,
          s.teacher?.name || c.teacher?.name || "Sin profesor",
          dayLabel,
          `${toFormat12h(s.startTime)} a ${toFormat12h(s.endTime)}`,
        ]);

        row.height = 22;
        const isEven = rowIdx % 2 === 0;
        row.eachCell((cell, colNum) => {
          cell.font = { name: "Segoe UI", size: 9 };
          cell.alignment = {
            vertical: "middle",
            horizontal: colNum === 1 || colNum === 7 || colNum === 8 ? "center" : "left",
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

    if (!hasClasses) {
      rowIdx++;
      const row = summarySheet.addRow([
        g.name,
        g.program.name,
        g.period?.name || "N/A",
        g.environment?.name || "Sin ambiente",
        "- Sin clases programadas -",
        "-",
        "-",
        "-",
      ]);
      row.height = 20;
      row.eachCell((cell) => {
        cell.font = { name: "Segoe UI", size: 9, italic: true, color: { argb: "FF94A3B8" } };
        cell.alignment = { vertical: "middle", horizontal: "center" };
      });
    }
  });

  // Adjust column widths
  summarySheet.columns = [
    { width: 18 },
    { width: 34 },
    { width: 16 },
    { width: 22 },
    { width: 38 },
    { width: 28 },
    { width: 16 },
    { width: 24 },
  ];

  // =========================================================================
  // 2. INDIVIDUAL SHEETS PER GROUP / FICHA (Weekly Matrix)
  // =========================================================================
  groups.forEach((g) => {
    const sheetName = g.name.replace(/[\\/*?:[\]]/g, "_").slice(0, 31);
    const sheet = workbook.addWorksheet(sheetName, {
      views: [{ showGridLines: true }],
    });

    // Group Header Card
    sheet.mergeCells("A1:G1");
    const gTitle = sheet.getCell("A1");
    gTitle.value = `HORARIO SEMANAL — FICHA ${g.name}`;
    gTitle.font = { name: "Segoe UI", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
    gTitle.alignment = { vertical: "middle", horizontal: "center" };
    gTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } };
    sheet.getRow(1).height = 32;

    sheet.mergeCells("A2:G2");
    const gMeta = sheet.getCell("A2");
    gMeta.value = `Programa: ${g.program.name} | Trimestre: ${g.period?.name || "N/A"} | Ambiente: ${
      g.environment ? `${g.environment.name} (${g.environment.location || ""})` : "No asignado"
    }`;
    gMeta.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF1E293B" } };
    gMeta.alignment = { vertical: "middle", horizontal: "center" };
    gMeta.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDBEAFE" } };
    sheet.getRow(2).height = 22;

    // Blank row
    sheet.addRow([]);

    // Week Grid Headers (Lunes a Domingo)
    const dayHeaders = DAYS_ES.map((d) => {
      const slot = g.daySlotsConfig.find((ds) => ds.dayOfWeek === d.key);
      return slot ? `${d.label}\n(${slot.startTime}-${slot.endTime})` : d.label;
    });

    const dayHeaderRow = sheet.addRow(dayHeaders);
    dayHeaderRow.height = 30;
    dayHeaderRow.eachCell((cell) => {
      cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FFFFFFFF" } };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
      cell.border = {
        top: { style: "medium", color: { argb: "FF1E293B" } },
        left: { style: "thin", color: { argb: "FFCBD5E1" } },
        bottom: { style: "medium", color: { argb: "FF2563EB" } },
        right: { style: "thin", color: { argb: "FFCBD5E1" } },
      };
    });

    // Build content columns
    const dayClasses: Record<DayOfWeek, string[]> = {
      MONDAY: [],
      TUESDAY: [],
      WEDNESDAY: [],
      THURSDAY: [],
      FRIDAY: [],
      SATURDAY: [],
      SUNDAY: [],
    };

    g.scheduledClasses.forEach((c) => {
      c.schedules.forEach((s) => {
        const slotTeacherName = s.teacher?.name || c.teacher?.name || "Sin profesor";
        dayClasses[s.dayOfWeek]?.push(
          `• ${c.title}\n  🕒 ${toFormat12h(s.startTime)} - ${toFormat12h(s.endTime)}\n  👨‍🏫 ${slotTeacherName}`
        );
      });
    });

    const maxClassesInADay = Math.max(
      ...DAYS_ES.map((d) => dayClasses[d.key].length),
      1
    );

    for (let i = 0; i < maxClassesInADay; i++) {
      const rowValues = DAYS_ES.map((d) => dayClasses[d.key][i] || "");
      const classRow = sheet.addRow(rowValues);
      classRow.height = 54;
      classRow.eachCell((cell, colNum) => {
        cell.font = { name: "Segoe UI", size: 8 };
        cell.alignment = { vertical: "top", horizontal: "left", wrapText: true };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
        if (cell.value) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0FDF4" } }; // Soft green
        }
      });
    }

    // Blank row
    sheet.addRow([]);

    // Curricular summary section
    const summaryTitle = sheet.addRow(["DISTRIBUCIÓN DE MATERIAS DEL TRIMESTRE", "", ""]);
    sheet.mergeCells(`A${summaryTitle.number}:C${summaryTitle.number}`);
    summaryTitle.getCell(1).font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF1E3A8A" } };

    const cHeader = sheet.addRow(["Materia / Actividad", "Horas Requeridas", "Docente(s)"]);
    cHeader.height = 22;
    cHeader.eachCell((cell) => {
      cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } };
      cell.alignment = { vertical: "middle", horizontal: "left" };
    });

    g.trimesterCourses.forEach((tc) => {
      const matched = g.scheduledClasses.filter(
        (c) => c.title.toLowerCase() === tc.title.toLowerCase()
      );
      const allTeachersForSubject: string[] = [];
      matched.forEach((c) => {
        if (c.teacher?.name) allTeachersForSubject.push(c.teacher.name);
        c.schedules.forEach((s) => {
          if (s.teacher?.name) allTeachersForSubject.push(s.teacher.name);
        });
      });
      const teacherNames = Array.from(new Set(allTeachersForSubject.filter(Boolean))).join(", ") || "Sin asignar";

      const cRow = sheet.addRow([tc.title, `${tc.weeklyHours || 0} horas/semana`, teacherNames]);
      cRow.height = 20;
      cRow.eachCell((cell) => {
        cell.font = { name: "Segoe UI", size: 9 };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
      });
    });

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

  // Export buffer & download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Horario_${schedule.name.replace(/[^a-zA-Z0-9]/g, "_")}_${
    groups.length === 1 ? groups[0].name.replace(/[^a-zA-Z0-9]/g, "_") : "Completo"
  }.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
