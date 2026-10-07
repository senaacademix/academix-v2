import ExcelJS from "exceljs";
import { DayOfWeek } from "@/generated/prisma/client";
import { ScheduleBuilderData } from "../actions/scheduleBuilderActions";
import { formatCalendarDate } from "@/lib/dateUtils";
import { sortGroupsMorningToNight } from "./shiftUtils";

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

const formatDate = (isoString: string | Date) => {
  if (!isoString) return "";
  return formatCalendarDate(isoString, "dd MMM yyyy");
};

const toMinutes = (t24: string) => {
  if (!t24) return 0;
  const [h, m] = t24.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

const getDurationHours = (startTime: string, endTime: string): number => {
  if (!startTime || !endTime) return 1;
  const startM = toMinutes(startTime);
  const endM = toMinutes(endTime);
  const diffHours = (endM - startM) / 60;
  return Math.max(0.5, Math.round(diffHours * 10) / 10);
};

// Pastel fills & headers for teachers in Excel (matching the user's Excel format)
const TEACHER_EXCEL_COLORS: Array<{ fill: string; headerFill: string }> = [
  { fill: "FFF0FDF4", headerFill: "FF22C55E" }, // Emerald / Green
  { fill: "FFFDF2F8", headerFill: "FFF43F5E" }, // Rose / Pink
  { fill: "FFFFFBEB", headerFill: "FFF59E0B" }, // Amber / Yellow
  { fill: "FFF0FDFA", headerFill: "FF06B6D4" }, // Cyan
  { fill: "FFF5F3FF", headerFill: "FFA855F7" }, // Purple
  { fill: "FFF7FEE7", headerFill: "FF84CC16" }, // Lime
  { fill: "FFEFF6FF", headerFill: "FF3B82F6" }, // Blue
  { fill: "FFFFF7ED", headerFill: "FFF97316" }, // Orange
  { fill: "FFF0FDFA", headerFill: "FF14B8A6" }, // Teal
  { fill: "FFEEF2FF", headerFill: "FF6366F1" }, // Indigo
];

function getTeacherExcelColor(name: string) {
  if (!name || name === "Sin instructor" || name === "Sin profesor") {
    return { fill: "FFF8FAFC", headerFill: "FF94A3B8" };
  }
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % TEACHER_EXCEL_COLORS.length;
  return TEACHER_EXCEL_COLORS[index];
}

// Accent fills for groups in leftmost column
const FICHA_EXCEL_FILLS = [
  "FFF7FEE7", // Lime
  "FFECFDF5", // Mint
  "FFF5F3FF", // Purple
  "FFECFEFF", // Cyan
  "FFFFFBEB", // Amber
  "FFFDF2F8", // Rose
  "FFEFF6FF", // Blue
  "FFEEF2FF", // Indigo
];

function getCurricularDescription(title: string, description?: string | null): string {
  if (description && description.trim().length > 0) {
    return description;
  }
  const shortCode = title
    .replace(
      /^(Desarrollo|Programación|Fundamentos|Bases de Datos|Análisis|Pruebas|Diseño|Gestión)\s+(de\s+|en\s+|con\s+)?/i,
      ""
    )
    .substring(0, 7)
    .toUpperCase()
    .replace(/\s+/g, "_");
  return `${shortCode || "COMP"}: Comp1: Desarrollar la solución de acuerdo con el diseño y metodologías de desarrollo.\nRA1.1: 01 Construir los componentes técnicos a partir del diseño curricular.`;
}

interface ExcelSubSlot {
  startTime: string;
  endTime: string;
  label: string;
}

function getGroupSubSlots(g: ScheduleBuilderData["groups"][0]): ExcelSubSlot[] {
  const slotSet = new Set<string>();

  (g.scheduledClasses || []).forEach((c) => {
    (c.schedules || []).forEach((s) => {
      slotSet.add(`${s.startTime}-${s.endTime}`);
    });
  });

  if (slotSet.size > 0) {
    const timestamps = new Set<string>();
    slotSet.forEach((key) => {
      const [st, et] = key.split("-");
      timestamps.add(st);
      timestamps.add(et);
    });

    (g.daySlotsConfig || []).forEach((ds) => {
      timestamps.add(ds.startTime);
      timestamps.add(ds.endTime);
    });

    const sortedTimes = Array.from(timestamps).sort((a, b) => toMinutes(a) - toMinutes(b));

    if (sortedTimes.length > 2) {
      const granular: ExcelSubSlot[] = [];
      for (let i = 0; i < sortedTimes.length - 1; i++) {
        const st = sortedTimes[i];
        const et = sortedTimes[i + 1];
        if (toMinutes(et) - toMinutes(st) >= 60) {
          granular.push({
            startTime: st,
            endTime: et,
            label: `${toFormat12h(st)} - ${toFormat12h(et)}`,
          });
        }
      }
      if (granular.length > 0) return granular;
    }

    const directSlots: ExcelSubSlot[] = Array.from(slotSet)
      .map((key) => {
        const [st, et] = key.split("-");
        return {
          startTime: st,
          endTime: et,
          label: `${toFormat12h(st)} - ${toFormat12h(et)}`,
        };
      })
      .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));

    return directSlots;
  }

  if (g.daySlotsConfig && g.daySlotsConfig.length > 0) {
    const ds = g.daySlotsConfig[0];
    return [
      {
        startTime: ds.startTime,
        endTime: ds.endTime,
        label: `${toFormat12h(ds.startTime)} - ${toFormat12h(ds.endTime)}`,
      },
    ];
  }

  return [
    {
      startTime: "06:00",
      endTime: "12:00",
      label: "6:00 a.m. - 12:00 p.m.",
    },
  ];
}

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FFCBD5E1" } },
  left: { style: "thin", color: { argb: "FFCBD5E1" } },
  bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
  right: { style: "thin", color: { argb: "FFCBD5E1" } },
};

export async function generateAndDownloadScheduleExcel(
  schedule: ScheduleBuilderData["schedule"],
  groups: ScheduleBuilderData["groups"]
) {
  const sortedGroups = sortGroupsMorningToNight(groups);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "AcademiX";
  workbook.lastModifiedBy = "AcademiX";
  workbook.created = new Date();
  workbook.modified = new Date();

  // =========================================================================
  // 1. SHEET: VISTA TARJETAS (PESTAÑA 1: VISTA PANORÁMICA DE BLOQUES)
  // =========================================================================
  const cardsSheet = workbook.addWorksheet("Vista Tarjetas", {
    views: [{ showGridLines: true }],
  });

  // Title Banner
  cardsSheet.mergeCells("A1:H1");
  const cardsTitle = cardsSheet.getCell("A1");
  cardsTitle.value = `${schedule.name.toUpperCase()} — VISTA PANORÁMICA DE HORARIOS (BLOQUES)`;
  cardsTitle.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  cardsTitle.alignment = { vertical: "middle", horizontal: "center" };
  cardsTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
  cardsSheet.getRow(1).height = 36;

  // Subtitle info
  cardsSheet.mergeCells("A2:H2");
  const cardsSub = cardsSheet.getCell("A2");
  cardsSub.value = `Período: ${formatDate(schedule.startDate)} al ${formatDate(
    schedule.endDate
  )} | Fichas: ${sortedGroups.length} | Matriz General de Ocupación Semanal (Vista de Tarjetas)`;
  cardsSub.font = { name: "Segoe UI", size: 9.5, italic: true, color: { argb: "FF475569" } };
  cardsSub.alignment = { vertical: "middle", horizontal: "center" };
  cardsSub.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
  cardsSheet.getRow(2).height = 24;

  // Headers
  const cardsHeaders = [
    "Ficha / Grupo",
    "LUNES",
    "MARTES",
    "MIÉRCOLES",
    "JUEVES",
    "VIERNES",
    "SÁBADO",
    "DOMINGO",
  ];
  const cardsHeaderRow = cardsSheet.addRow(cardsHeaders);
  cardsHeaderRow.height = 28;
  cardsHeaderRow.eachCell((cell) => {
    cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
    cell.border = thinBorder;
  });

  // Render each group row in Cards Sheet
  sortedGroups.forEach((g) => {
    const scheduledHoursByCourseTitle = new Map<string, number>();
    g.scheduledClasses.forEach((c) => {
      let hours = 0;
      c.schedules.forEach((s) => {
        hours += getDurationHours(s.startTime, s.endTime);
      });
      scheduledHoursByCourseTitle.set(c.title.toLowerCase(), hours);
    });

    const totalRequiredHours = g.trimesterCourses.reduce((acc, c) => acc + c.weeklyHours, 0);
    const totalScheduledHours = Array.from(scheduledHoursByCourseTitle.values()).reduce(
      (acc, h) => acc + h,
      0
    );
    const progressPercent =
      totalRequiredHours > 0 ? Math.round((totalScheduledHours / totalRequiredHours) * 100) : 0;

    const groupMetaText = `FICHA ${g.name}\n${g.program?.name || "Sin programa"}\n${
      g.period?.name || ""
    }\n${g.environment ? `Amb: ${g.environment.name}` : ""}\nHoras: ${totalScheduledHours}/${totalRequiredHours}h (${progressPercent}%)`;

    // Group classes by day
    const dayClasses: Record<DayOfWeek, Array<any>> = {
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
        if (dayClasses[s.dayOfWeek]) {
          dayClasses[s.dayOfWeek].push({
            title: c.title,
            teacherName: s.teacher?.name || c.teacher?.name || "Sin instructor",
            environmentName: s.environment?.name || g.environment?.name || null,
            startTime: s.startTime,
            endTime: s.endTime,
            duration: getDurationHours(s.startTime, s.endTime),
          });
        }
      });
    });

    // Sort classes chronologically
    Object.keys(dayClasses).forEach((k) => {
      dayClasses[k as DayOfWeek].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });

    const rowCells: string[] = [groupMetaText];
    let maxContentLines = 4;

    DAYS_ES.forEach((d) => {
      const isDayDisabled =
        g.daySlotsConfig && g.daySlotsConfig.length > 0
          ? !g.daySlotsConfig.some((ds: any) => ds.dayOfWeek === d.key)
          : false;

      if (isDayDisabled) {
        rowCells.push("🔒 NO LECTIVO");
        return;
      }

      const classes = dayClasses[d.key];
      if (classes.length > 0) {
        const textBlocks = classes.map((c) => {
          return `📌 ${c.title} (${c.duration}h)\n👨‍🏫 ${c.teacherName}\n🏢 ${
            c.environmentName || "Ambiente asignado"
          }\n🕒 ${toFormat12h(c.startTime)} - ${toFormat12h(c.endTime)}`;
        });
        const fullDayText = textBlocks.join("\n──────────────\n");
        const lines = fullDayText.split("\n").length;
        if (lines > maxContentLines) maxContentLines = lines;
        rowCells.push(fullDayText);
      } else {
        const daySlot = (g.daySlotsConfig || []).find((ds: any) => ds.dayOfWeek === d.key);
        rowCells.push(
          daySlot
            ? `—\nLibre (${toFormat12h(daySlot.startTime)} - ${toFormat12h(daySlot.endTime)})`
            : "—"
        );
      }
    });

    const addedRow = cardsSheet.addRow(rowCells);
    addedRow.height = Math.min(180, Math.max(68, maxContentLines * 16));

    addedRow.eachCell((cell, colNum) => {
      cell.border = thinBorder;
      if (colNum === 1) {
        cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF0F172A" } };
        cell.alignment = { vertical: "top", horizontal: "left", wrapText: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
      } else {
        const val = String(cell.value || "");
        if (val.includes("NO LECTIVO")) {
          cell.font = { name: "Segoe UI", size: 9, italic: true, bold: true, color: { argb: "FF94A3B8" } };
          cell.alignment = { vertical: "middle", horizontal: "center" };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
        } else if (val.startsWith("📌")) {
          cell.font = { name: "Segoe UI", size: 8.5 };
          cell.alignment = { vertical: "top", horizontal: "left", wrapText: true };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0FDF4" } };
        } else {
          cell.font = { name: "Segoe UI", size: 8.5, italic: true, color: { argb: "FF94A3B8" } };
          cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } };
        }
      }
    });
  });

  cardsSheet.columns = [
    { width: 28 }, // Ficha
    { width: 26 }, // Lunes
    { width: 26 }, // Martes
    { width: 26 }, // Miércoles
    { width: 26 }, // Jueves
    { width: 26 }, // Viernes
    { width: 26 }, // Sábado
    { width: 26 }, // Domingo
  ];

  // =========================================================================
  // 2. SHEET: MATRIZ EXCEL (PESTAÑA 2: MATRIZ CURRICULAR ESTRUCTURADA SENA)
  // =========================================================================
  const matrixSheet = workbook.addWorksheet("Matriz Excel", {
    views: [{ showGridLines: true }],
  });

  // Title Banner
  matrixSheet.mergeCells("A1:I1");
  const matrixTitle = matrixSheet.getCell("A1");
  matrixTitle.value = `${schedule.name.toUpperCase()} — MATRIZ CURRICULAR DE HORARIOS (FORMATO EXCEL SENA)`;
  matrixTitle.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  matrixTitle.alignment = { vertical: "middle", horizontal: "center" };
  matrixTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF15803D" } }; // SENA Green
  matrixSheet.getRow(1).height = 36;

  // Subtitle
  matrixSheet.mergeCells("A2:I2");
  const matrixSub = matrixSheet.getCell("A2");
  matrixSub.value = `Período: ${formatDate(schedule.startDate)} al ${formatDate(
    schedule.endDate
  )} | Estructura Curricular con Competencias, Resultados de Aprendizaje e Instructores`;
  matrixSub.font = { name: "Segoe UI", size: 9.5, italic: true, color: { argb: "FF166534" } };
  matrixSub.alignment = { vertical: "middle", horizontal: "center" };
  matrixSub.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0FDF4" } };
  matrixSheet.getRow(2).height = 24;

  // Headers
  const matrixHeaders = [
    "Ficha / Grupo",
    "Franja Horaria",
    "LUNES",
    "MARTES",
    "MIÉRCOLES",
    "JUEVES",
    "VIERNES",
    "SÁBADO",
    "DOMINGO",
  ];
  const matrixHeaderRow = matrixSheet.addRow(matrixHeaders);
  matrixHeaderRow.height = 28;
  matrixHeaderRow.eachCell((cell) => {
    cell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
    cell.border = thinBorder;
  });

  let matrixCurrentRow = 4;

  sortedGroups.forEach((g, gIdx) => {
    // Classes by day
    const dayClassesMap: Record<DayOfWeek, Array<any>> = {
      MONDAY: [],
      TUESDAY: [],
      WEDNESDAY: [],
      THURSDAY: [],
      FRIDAY: [],
      SATURDAY: [],
      SUNDAY: [],
    };

    (g.scheduledClasses || []).forEach((c) => {
      (c.schedules || []).forEach((s) => {
        if (dayClassesMap[s.dayOfWeek]) {
          dayClassesMap[s.dayOfWeek].push({
            title: c.title,
            description: c.description || null,
            teacherName: s.teacher?.name || c.teacher?.name || "Sin instructor",
            environmentName: s.environment?.name || g.environment?.name || null,
            startTime: s.startTime,
            endTime: s.endTime,
          });
        }
      });
    });

    const subSlots = getGroupSubSlots(g);
    const numSlots = subSlots.length;
    const groupStartRow = matrixCurrentRow;
    const fichaFill = FICHA_EXCEL_FILLS[gIdx % FICHA_EXCEL_FILLS.length];

    subSlots.forEach((subSlot, slotIdx) => {
      const rowValues: any[] = [
        slotIdx === 0
          ? `${g.name}\n${g.program?.name || "T/go ADSO"}\n${g.period?.name || "N/A"}\nAmb: ${
              g.environment?.name || "Sin ambiente"
            }`
          : "",
        subSlot.label,
      ];

      // Temporary placeholders for 7 days
      for (let i = 0; i < 7; i++) rowValues.push("");

      const added = matrixSheet.addRow(rowValues);
      added.height = 80;

      // Col B: Franja cell styling
      const franjaCell = added.getCell(2);
      franjaCell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF1E293B" } };
      franjaCell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      franjaCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
      franjaCell.border = thinBorder;

      // Fill days (Col C to I => col numbers 3 to 9)
      DAYS_ES.forEach((d, dayIdx) => {
        const colNum = dayIdx + 3;
        const isDayDisabled =
          g.daySlotsConfig && g.daySlotsConfig.length > 0
            ? !g.daySlotsConfig.some((ds: any) => ds.dayOfWeek === d.key)
            : false;

        if (isDayDisabled) {
          if (slotIdx === 0) {
            const cell = added.getCell(colNum);
            cell.value = "🔒 No Lectivo";
            cell.font = { name: "Segoe UI", size: 9, italic: true, bold: true, color: { argb: "FF94A3B8" } };
            cell.alignment = { vertical: "middle", horizontal: "center" };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
            cell.border = thinBorder;
            if (numSlots > 1) {
              matrixSheet.mergeCells(groupStartRow, colNum, groupStartRow + numSlots - 1, colNum);
            }
          }
          return;
        }

        const classes = dayClassesMap[d.key] || [];
        const overlapping = classes.filter(
          (c) =>
            toMinutes(c.startTime) < toMinutes(subSlot.endTime) &&
            toMinutes(c.endTime) > toMinutes(subSlot.startTime)
        );

        if (overlapping.length === 0) {
          const cell = added.getCell(colNum);
          cell.value = "—";
          cell.font = { name: "Segoe UI", size: 9, color: { argb: "FFCBD5E1" } };
          cell.alignment = { vertical: "middle", horizontal: "center" };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } };
          cell.border = thinBorder;
          return;
        }

        const cls = overlapping[0];
        // If this class started in an earlier slot, it was already handled with mergeCells!
        if (toMinutes(cls.startTime) < toMinutes(subSlot.startTime)) {
          return;
        }

        // How many slots does this class span?
        let span = 1;
        for (let next = slotIdx + 1; next < numSlots; next++) {
          if (toMinutes(cls.endTime) >= toMinutes(subSlots[next].endTime)) {
            span++;
          }
        }

        const teacherColor = getTeacherExcelColor(cls.teacherName);
        const cell = added.getCell(colNum);
        cell.value = `${cls.title.toUpperCase()}\n[INSTRUCTOR: ${cls.teacherName.toUpperCase()}]\n${getCurricularDescription(
          cls.title,
          cls.description
        )}\n${cls.environmentName ? `Ambiente: ${cls.environmentName} | ` : ""}${toFormat12h(
          cls.startTime
        )} a ${toFormat12h(cls.endTime)}`;
        cell.font = { name: "Segoe UI", size: 8 };
        cell.alignment = { vertical: "top", horizontal: "left", wrapText: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: teacherColor.fill } };
        cell.border = thinBorder;

        if (span > 1) {
          matrixSheet.mergeCells(matrixCurrentRow, colNum, matrixCurrentRow + span - 1, colNum);
        }
      });

      matrixCurrentRow++;
    });

    // Merge Ficha column across all sub-slots for this group
    if (numSlots > 1) {
      matrixSheet.mergeCells(groupStartRow, 1, groupStartRow + numSlots - 1, 1);
    }
    const fichaCell = matrixSheet.getCell(groupStartRow, 1);
    fichaCell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF0F172A" } };
    fichaCell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    fichaCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fichaFill } };
    fichaCell.border = thinBorder;
  });

  matrixSheet.columns = [
    { width: 22 }, // Ficha / Grupo
    { width: 18 }, // Franja
    { width: 30 }, // LUNES
    { width: 30 }, // MARTES
    { width: 30 }, // MIÉRCOLES
    { width: 30 }, // JUEVES
    { width: 30 }, // VIERNES
    { width: 30 }, // SÁBADO
    { width: 30 }, // DOMINGO
  ];

  // =========================================================================
  // 3. SHEET: CONSOLIDADO GENERAL (ORIGINAL CONSERVADO)
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
    "Instructor Asignado",
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

    (g.scheduledClasses || []).forEach((c) => {
      (c.schedules || []).forEach((s) => {
        hasClasses = true;
        rowIdx++;
        const dayLabel = DAYS_ES.find((d) => d.key === s.dayOfWeek)?.label || s.dayOfWeek;
        const row = summarySheet.addRow([
          g.name,
          g.program?.name || "Sin programa",
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
  // 4. INDIVIDUAL SHEETS PER GROUP / FICHA (ORIGINALES CONSERVADOS)
  // =========================================================================
  const usedSheetNames = new Set<string>([
    "Vista Tarjetas",
    "Matriz Excel",
    "Consolidado General",
  ]);

  groups.forEach((g) => {
    let baseSheetName = (g.name || "Ficha").replace(/[\\/*?:[\]]/g, "_").slice(0, 27);
    let sheetName = baseSheetName;
    let count = 1;
    while (usedSheetNames.has(sheetName)) {
      sheetName = `${baseSheetName}_${count++}`.slice(0, 31);
    }
    usedSheetNames.add(sheetName);

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
    gMeta.value = `Programa: ${g.program?.name || "Sin programa"} | Trimestre: ${
      g.period?.name || "N/A"
    } | Ambiente: ${
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
      const slot = (g.daySlotsConfig || []).find((ds: any) => ds.dayOfWeek === d.key);
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
          `• ${c.title}\n  🕒 ${toFormat12h(s.startTime)} - ${toFormat12h(
            s.endTime
          )}\n  👨‍🏫 ${slotTeacherName}`
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
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0FDF4" } };
        }
      });
    }

    // Blank row
    sheet.addRow([]);

    // Curricular summary section
    const summaryTitle = sheet.addRow(["DISTRIBUCIÓN DE MATERIAS DEL TRIMESTRE", "", ""]);
    sheet.mergeCells(`A${summaryTitle.number}:C${summaryTitle.number}`);
    summaryTitle.getCell(1).font = {
      name: "Segoe UI",
      size: 10,
      bold: true,
      color: { argb: "FF1E3A8A" },
    };

    const cHeader = sheet.addRow(["Materia / Actividad", "Horas Requeridas", "Instructor(es)"]);
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
      const teacherNames =
        Array.from(new Set(allTeachersForSubject.filter(Boolean))).join(", ") || "Sin asignar";

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
