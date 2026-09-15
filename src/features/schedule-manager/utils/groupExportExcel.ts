import ExcelJS from "exceljs";
import { GroupExportPayload } from "./groupExportPdf";
import { DayOfWeek } from "@/generated/prisma/client";

const DAYS_ES: { key: DayOfWeek; label: string }[] = [
  { key: "MONDAY", label: "Lunes" },
  { key: "TUESDAY", label: "Martes" },
  { key: "WEDNESDAY", label: "Miércoles" },
  { key: "THURSDAY", label: "Jueves" },
  { key: "FRIDAY", label: "Viernes" },
  { key: "SATURDAY", label: "Sábado" },
  { key: "SUNDAY", label: "Domingo" },
];

const toFormat12h = (t24: string) => {
  if (!t24) return "";
  const [h, m] = t24.split(":").map(Number);
  const ap = h >= 12 ? "p.m." : "a.m.";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ap}`;
};

export async function generateAndDownloadGroupExcel(
  payload: GroupExportPayload,
  filename = `Reporte_Grupo_${payload.groupName.replace(/\s+/g, "_")}.xlsx`
) {
  const wb = new ExcelJS.Workbook();

  // -------------------------------------------------------------
  // HOJA 1: RESUMEN Y HORARIO SEMANAL DE LA FICHA
  // -------------------------------------------------------------
  const schedSheet = wb.addWorksheet("Horario y Ficha");

  schedSheet.mergeCells("A1:G1");
  const mainTitleCell = schedSheet.getCell("A1");
  mainTitleCell.value = `ACADEMIX — FICHA Y HORARIO: ${payload.groupName}`;
  mainTitleCell.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  mainTitleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF312E81" } };
  mainTitleCell.alignment = { vertical: "middle", horizontal: "center" };
  schedSheet.getRow(1).height = 30;

  schedSheet.mergeCells("A2:G2");
  const subTitleCell = schedSheet.getCell("A2");
  subTitleCell.value = `Programa: ${payload.program} | Período: ${payload.period || "Actual"} | Ambiente: ${payload.environment || "Sin aula"}`;
  subTitleCell.font = { name: "Segoe UI", size: 10, italic: true, color: { argb: "FF334155" } };
  subTitleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E7FF" } };
  subTitleCell.alignment = { vertical: "middle", horizontal: "center" };
  schedSheet.getRow(2).height = 20;

  schedSheet.addRow([]);

  schedSheet.addRow(["INFORMACIÓN GENERAL, PERÍODOS Y MÉTRICAS DE LA FICHA"]).font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FF1E1B4B" } };
  
  const metaRows = [
    ["Nombre de Ficha", payload.groupName, "Total Aprendices", `${payload.totalStudents} aprendices`],
    ["Programa de Formación", payload.program, "Aprendices Activos", `${payload.activeStudents} activos`],
    ["Período Académico", payload.period || "Actual", "Promedio Académico", payload.averageGrade > 0 ? `${payload.averageGrade.toFixed(2)} pts` : "N/A"],
    ["Fecha Inicio Lectiva", payload.startDateStr || "No definida", "Fecha Fin Lectiva", payload.endDateStr || "No definida"],
    ["Jornada / Horario Diario", `${payload.startTime || "--:--"} - ${payload.endTime || "--:--"}`, "Aula / Ambiente Principal", payload.environment || "No asignado"],
    ["% Asistencia General", `${Math.round(payload.attendanceRate)}%`, "Puntaje Integral Global", `${payload.overallIntegralScore ?? 100} / 100 pts`],
  ];

  metaRows.forEach((r) => {
    const row = schedSheet.addRow(r);
    row.height = 18;
    row.getCell(1).font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF475569" } };
    row.getCell(2).font = { name: "Segoe UI", size: 9, color: { argb: "FF0F172A" } };
    row.getCell(3).font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF475569" } };
    row.getCell(4).font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF4338CA" } };
  });

  schedSheet.addRow([]);

  schedSheet.addRow(["HORARIO ACADÉMICO SEMANAL DE LA FICHA (LUNES A DOMINGO)"]).font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FF1E1B4B" } };
  
  const daysHeaders = DAYS_ES.map((d) => d.label);
  const headerRow = schedSheet.addRow(daysHeaders);
  headerRow.height = 24;
  headerRow.eachCell((cell: any) => {
    cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4338CA" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  const dayMap: Record<DayOfWeek, GroupExportPayload["scheduleSlots"]> = {
    MONDAY: [],
    TUESDAY: [],
    WEDNESDAY: [],
    THURSDAY: [],
    FRIDAY: [],
    SATURDAY: [],
    SUNDAY: [],
  };

  (payload.scheduleSlots || []).forEach((s) => {
    if (dayMap[s.dayOfWeek]) dayMap[s.dayOfWeek].push(s);
  });

  DAYS_ES.forEach((d) => {
    dayMap[d.key].sort((a, b) => a.startTime.localeCompare(b.startTime));
  });

  const maxClassesInDay = Math.max(1, ...DAYS_ES.map((d) => dayMap[d.key].length));

  for (let i = 0; i < maxClassesInDay; i++) {
    const rowCells = DAYS_ES.map((d) => {
      const cls = dayMap[d.key][i];
      if (!cls) return "- Libre -";
      return `${cls.courseTitle}\nProf. ${cls.teacherName}\n${toFormat12h(cls.startTime)} - ${toFormat12h(cls.endTime)}\nAula: ${cls.environmentName}`;
    });

    const row = schedSheet.addRow(rowCells);
    row.height = 55;
    row.eachCell((cell: any) => {
      const isLibre = cell.value === "- Libre -";
      cell.font = {
        name: "Segoe UI",
        size: 8.5,
        italic: isLibre,
        color: { argb: isLibre ? "FF94A3B8" : "FF1E1B4B" },
      };
      cell.alignment = { vertical: "top", horizontal: "center", wrapText: true };
      if (!isLibre) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF2FF" } };
      }
      cell.border = {
        top: { style: "thin", color: { argb: "FFCBD5E1" } },
        bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
        left: { style: "thin", color: { argb: "FFCBD5E1" } },
        right: { style: "thin", color: { argb: "FFCBD5E1" } },
      };
    });
  }

  for (let c = 1; c <= 7; c++) {
    schedSheet.getColumn(c).width = 22;
  }

  // -------------------------------------------------------------
  // HOJA 2: PLAN DE ESTUDIOS (ASIGNATURAS)
  // -------------------------------------------------------------
  const courseSheet = wb.addWorksheet("Plan de Estudios");

  courseSheet.mergeCells("A1:E1");
  const courseTitleCell = courseSheet.getCell("A1");
  courseTitleCell.value = `PLAN DE ESTUDIOS Y ASIGNATURAS — FICHA ${payload.groupName}`;
  courseTitleCell.font = { name: "Segoe UI", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
  courseTitleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4338CA" } };
  courseTitleCell.alignment = { vertical: "middle", horizontal: "center" };
  courseSheet.getRow(1).height = 28;

  courseSheet.addRow([]);

  const courseHeaders = ["N°", "Asignatura / Curso", "Instructor", "Promedio Grupo", "Total Evaluaciones"];
  const cHeaderRow = courseSheet.addRow(courseHeaders);
  cHeaderRow.height = 22;
  cHeaderRow.eachCell((cell: any) => {
    cell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF312E81" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  (payload.coursesList || []).forEach((c, idx) => {
    const row = courseSheet.addRow([
      idx + 1,
      c.title,
      c.teacherName,
      c.averageGrade && c.averageGrade > 0 ? c.averageGrade.toFixed(2) : "N/A",
      c.totalGrades || 0,
    ]);

    row.height = 20;
    const bgArgb = idx % 2 === 0 ? "FFFFFFFF" : "FFEEF2FF";

    row.eachCell((cell: any, colIndex: number) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgArgb } };
      cell.font = { name: "Segoe UI", size: 9, color: { argb: "FF0F172A" } };
      cell.alignment = {
        vertical: "middle",
        horizontal: colIndex === 1 || colIndex >= 4 ? "center" : "left",
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
    });
  });

  courseSheet.getColumn(1).width = 6;
  courseSheet.getColumn(2).width = 38;
  courseSheet.getColumn(3).width = 30;
  courseSheet.getColumn(4).width = 18;
  courseSheet.getColumn(5).width = 20;

  // -------------------------------------------------------------
  // HOJA 3: DIRECTORIO COMPLETO Y CONSOLIDADO DE APRENDICES
  // -------------------------------------------------------------
  const studSheet = wb.addWorksheet("Consolidado Aprendices");

  studSheet.mergeCells("A1:N1");
  const studTitleCell = studSheet.getCell("A1");
  studTitleCell.value = `DIRECTORIO Y MATRÍCULA DE APRENDICES — FICHA ${payload.groupName}`;
  studTitleCell.font = { name: "Segoe UI", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
  studTitleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF047857" } };
  studTitleCell.alignment = { vertical: "middle", horizontal: "center" };
  studSheet.getRow(1).height = 28;

  studSheet.addRow([]);

  const studHeaders = [
    "N°",
    "Nombre Completo del Aprendiz",
    "Documento Identificación",
    "Correo Electrónico",
    "Estado",
    "Puntaje Integral",
    "Promedio Notas",
    "Asistencia (%)",
    "Días Faltados",
    "Horas Inasistencia",
    "Tardanzas",
    "Retiros Anticipados",
    "Llamados Atención",
    "Felicitaciones",
  ];

  const stHeaderRow = studSheet.addRow(studHeaders);
  stHeaderRow.height = 24;
  stHeaderRow.eachCell((cell: any) => {
    cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF065F46" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  });

  payload.studentsList.forEach((st, idx) => {
    const row = studSheet.addRow([
      idx + 1,
      st.name,
      st.identificacion || "S/I",
      st.email || "Sin correo",
      st.banned ? "Inactivo" : "Activo",
      st.integralScore ?? "--",
      st.gradesAvg > 0 ? st.gradesAvg.toFixed(2) : "N/A",
      `${Math.round(st.attendanceRate)}%`,
      st.absentCount || 0,
      st.absentHours || 0,
      st.lateCount || 0,
      st.leaveEarlyCount || 0,
      st.attentionCalls || 0,
      st.commendations || 0,
    ]);

    row.height = 20;
    const bgArgb = idx % 2 === 0 ? "FFFFFFFF" : "FFF0FDF4";

    row.eachCell((cell: any, colIndex: number) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgArgb } };
      cell.font = { name: "Segoe UI", size: 9, color: { argb: "FF0F172A" } };
      cell.alignment = {
        vertical: "middle",
        horizontal: colIndex === 2 || colIndex === 4 ? "left" : "center",
      };
      if (colIndex === 2) {
        cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF0F172A" } };
      }
      if (colIndex === 5) {
        cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: st.banned ? "FFDC2626" : "FF16A34A" } };
      }
      if (colIndex === 6) {
        cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF4338CA" } };
      }
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
    });
  });

  studSheet.getColumn(1).width = 5;
  studSheet.getColumn(2).width = 32;
  studSheet.getColumn(3).width = 20;
  studSheet.getColumn(4).width = 28;
  studSheet.getColumn(5).width = 12;
  studSheet.getColumn(6).width = 15;
  studSheet.getColumn(7).width = 15;
  studSheet.getColumn(8).width = 14;
  studSheet.getColumn(9).width = 14;
  studSheet.getColumn(10).width = 16;
  studSheet.getColumn(11).width = 12;
  studSheet.getColumn(12).width = 16;
  studSheet.getColumn(13).width = 16;
  studSheet.getColumn(14).width = 14;

  // -------------------------------------------------------------
  // HOJA 4: FICHAS INDIVIDUALES POR APRENDIZ (DETALLE INDIVIDUAL)
  // -------------------------------------------------------------
  const indSheet = wb.addWorksheet("Fichas Individuales");

  indSheet.mergeCells("A1:F1");
  const indTitleCell = indSheet.getCell("A1");
  indTitleCell.value = `FICHAS INDIVIDUALES DE ANÁLISIS DETALLADO — FICHA ${payload.groupName}`;
  indTitleCell.font = { name: "Segoe UI", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
  indTitleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF312E81" } };
  indTitleCell.alignment = { vertical: "middle", horizontal: "center" };
  indSheet.getRow(1).height = 28;

  payload.studentsList.forEach((st, idx) => {
    indSheet.addRow([]); // Blank line

    const headerRowIdx = indSheet.lastRow ? indSheet.lastRow.number + 1 : 3;
    indSheet.mergeCells(`A${headerRowIdx}:F${headerRowIdx}`);
    const stHeaderCell = indSheet.getCell(`A${headerRowIdx}`);
    stHeaderCell.value = `APRENDIZ N° ${idx + 1}: ${st.name.toUpperCase()} (Doc: ${st.identificacion}) | Estado: ${st.banned ? 'INACTIVO' : 'ACTIVO'}`;
    stHeaderCell.font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    stHeaderCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: st.banned ? "FF991B1B" : "FF4338CA" } };
    stHeaderCell.alignment = { vertical: "middle", horizontal: "left" };
    indSheet.getRow(headerRowIdx).height = 24;

    const r1 = indSheet.addRow([
      "Puntaje Integral:", `${st.integralScore ?? "--"} / 100 pts`,
      "Promedio Académico:", st.gradesAvg > 0 ? `${st.gradesAvg.toFixed(2)} pts` : "N/A",
      "% Asistencia:", `${Math.round(st.attendanceRate)}%`
    ]);
    r1.height = 18;
    r1.getCell(1).font = { name: "Segoe UI", size: 9, bold: true };
    r1.getCell(2).font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF4338CA" } };
    r1.getCell(3).font = { name: "Segoe UI", size: 9, bold: true };
    r1.getCell(4).font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF4F46E5" } };
    r1.getCell(5).font = { name: "Segoe UI", size: 9, bold: true };
    r1.getCell(6).font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF059669" } };

    const r2 = indSheet.addRow([
      "Faltas / Horas:", `${st.absentCount || 0} faltas (${st.absentHours || 0}h)`,
      "Tardanzas / Retiros:", `${st.lateCount || 0} T / ${st.leaveEarlyCount || 0} R`,
      "Observaciones:", `${st.attentionCalls || 0} LL / ${st.commendations || 0} Fel`
    ]);
    r2.height = 18;
    r2.getCell(1).font = { name: "Segoe UI", size: 9, bold: true };
    r2.getCell(2).font = { name: "Segoe UI", size: 9, color: { argb: "FFDC2626" } };
    r2.getCell(3).font = { name: "Segoe UI", size: 9, bold: true };
    r2.getCell(4).font = { name: "Segoe UI", size: 9, color: { argb: "FFD97706" } };
    r2.getCell(5).font = { name: "Segoe UI", size: 9, bold: true };
    r2.getCell(6).font = { name: "Segoe UI", size: 9, color: { argb: "FF2563EB" } };

    const gSubHeader = indSheet.addRow(["Asignatura / Materia", "Instructor", "Nota Aprendiz", "Promedio Grupo", "Estado"]);
    gSubHeader.height = 20;
    gSubHeader.eachCell((cell: any) => {
      cell.font = { name: "Segoe UI", size: 8.5, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3730A3" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    payload.coursesList.forEach((c) => {
      const grade = c.id && st.courseGrades?.[c.id] !== undefined ? st.courseGrades[c.id] : null;
      const row = indSheet.addRow([
        c.title,
        c.teacherName,
        grade !== null && grade > 0 ? Number(grade.toFixed(2)) : "N/A",
        c.averageGrade && c.averageGrade > 0 ? Number(c.averageGrade.toFixed(2)) : "N/A",
        grade !== null ? (grade >= 3 ? "Aprobado" : "En riesgo") : "Sin nota",
      ]);
      row.height = 18;
      row.eachCell((cell: any, cIdx: number) => {
        cell.font = { name: "Segoe UI", size: 8.5, color: { argb: "FF0F172A" } };
        cell.alignment = { vertical: "middle", horizontal: cIdx >= 3 ? "center" : "left" };
        if (cIdx === 3 && grade !== null) {
          cell.font = { name: "Segoe UI", size: 8.5, bold: true, color: { argb: grade >= 3 ? "FF16A34A" : "FFDC2626" } };
        }
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
      });
    });

    if (st.studentRemarks && st.studentRemarks.length > 0) {
      indSheet.addRow(["Observaciones Disciplinarias del Aprendiz:"]).font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF991B1B" } };
      st.studentRemarks.forEach((rem) => {
        const rRow = indSheet.addRow([rem.date, rem.type, rem.courseTitle, rem.teacherName, rem.title, rem.description]);
        rRow.height = 18;
        rRow.eachCell((cell: any) => {
          cell.font = { name: "Segoe UI", size: 8, color: { argb: "FF334155" } };
          cell.border = {
            top: { style: "thin", color: { argb: "FFE2E8F0" } },
            bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
            left: { style: "thin", color: { argb: "FFE2E8F0" } },
            right: { style: "thin", color: { argb: "FFE2E8F0" } },
          };
        });
      });
    }
  });

  indSheet.getColumn(1).width = 30;
  indSheet.getColumn(2).width = 25;
  indSheet.getColumn(3).width = 16;
  indSheet.getColumn(4).width = 16;
  indSheet.getColumn(5).width = 16;
  indSheet.getColumn(6).width = 30;

  // -------------------------------------------------------------
  // HOJA 5: MATRIZ DE NOTAS POR MATERIA
  // -------------------------------------------------------------
  if (payload.coursesList.length > 0) {
    const gradesSheet = wb.addWorksheet("Notas por Materia");

    const totalCols = 3 + payload.coursesList.length + 1;
    gradesSheet.mergeCells(1, 1, 1, totalCols);
    const gTitleCell = gradesSheet.getCell(1, 1);
    gTitleCell.value = `MATRIZ DE CALIFICACIONES POR MATERIA — FICHA ${payload.groupName}`;
    gTitleCell.font = { name: "Segoe UI", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
    gTitleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
    gTitleCell.alignment = { vertical: "middle", horizontal: "center" };
    gradesSheet.getRow(1).height = 28;

    gradesSheet.addRow([]);

    const gHeaders = ["N°", "Nombre Completo", "Identificación", ...payload.coursesList.map((c) => c.title), "Promedio General"];
    const gHeaderRow = gradesSheet.addRow(gHeaders);
    gHeaderRow.height = 24;
    gHeaderRow.eachCell((cell: any) => {
      cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3730A3" } };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    });

    payload.studentsList.forEach((st, idx) => {
      const courseGradesRow = payload.coursesList.map((c) => {
        if (c.id && st.courseGrades?.[c.id] !== undefined) {
          return st.courseGrades[c.id] > 0 ? Number(st.courseGrades[c.id].toFixed(2)) : "N/A";
        }
        return "N/A";
      });

      const row = gradesSheet.addRow([
        idx + 1,
        st.name,
        st.identificacion || "S/I",
        ...courseGradesRow,
        st.gradesAvg > 0 ? Number(st.gradesAvg.toFixed(2)) : "N/A",
      ]);

      row.height = 20;
      const bgArgb = idx % 2 === 0 ? "FFFFFFFF" : "FFEEF2FF";

      row.eachCell((cell: any, colIndex: number) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgArgb } };
        cell.font = { name: "Segoe UI", size: 9, color: { argb: "FF0F172A" } };
        cell.alignment = {
          vertical: "middle",
          horizontal: colIndex === 2 ? "left" : "center",
        };
        if (colIndex === 2) {
          cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF0F172A" } };
        }
        if (colIndex === totalCols) {
          cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF4338CA" } };
        }
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
      });
    });

    gradesSheet.getColumn(1).width = 5;
    gradesSheet.getColumn(2).width = 32;
    gradesSheet.getColumn(3).width = 18;
    payload.coursesList.forEach((_, i) => {
      gradesSheet.getColumn(4 + i).width = 22;
    });
    gradesSheet.getColumn(totalCols).width = 18;
  }

  // -------------------------------------------------------------
  // HOJA 6: HISTORIAL DISCIPLINARIO
  // -------------------------------------------------------------
  const remSheet = wb.addWorksheet("Registro Disciplinario");

  remSheet.mergeCells("A1:G1");
  const remTitleCell = remSheet.getCell("A1");
  remTitleCell.value = `HISTORIAL DE NOVEDADES Y REGISTRO DISCIPLINARIO — FICHA ${payload.groupName}`;
  remTitleCell.font = { name: "Segoe UI", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
  remTitleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFB91C1C" } };
  remTitleCell.alignment = { vertical: "middle", horizontal: "center" };
  remSheet.getRow(1).height = 28;

  remSheet.addRow([]);

  const remHeaders = ["N°", "Fecha y Hora", "Aprendiz", "Tipo Observación", "Materia / Asignatura", "Instructor", "Título y Descripción"];
  const rHeaderRow = remSheet.addRow(remHeaders);
  rHeaderRow.height = 22;
  rHeaderRow.eachCell((cell: any) => {
    cell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF991B1B" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  if (!payload.remarksList || payload.remarksList.length === 0) {
    const emptyRow = remSheet.addRow([1, "-", "No hay observaciones o novedades registradas", "-", "-", "-", "-"]);
    emptyRow.height = 20;
  } else {
    payload.remarksList.forEach((rem, idx) => {
      const row = remSheet.addRow([
        idx + 1,
        rem.date,
        `${rem.studentName} (${rem.studentDoc})`,
        rem.type,
        rem.courseTitle,
        rem.teacherName,
        `${rem.title}: ${rem.description}`,
      ]);

      row.height = 22;
      const bgArgb = idx % 2 === 0 ? "FFFFFFFF" : "FFFEE2E2";

      row.eachCell((cell: any, colIndex: number) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgArgb } };
        cell.font = { name: "Segoe UI", size: 9, color: { argb: "FF0F172A" } };
        cell.alignment = {
          vertical: "middle",
          horizontal: colIndex === 1 || colIndex === 2 || colIndex === 4 ? "center" : "left",
        };
        if (colIndex === 4) {
          cell.font = {
            name: "Segoe UI",
            size: 9,
            bold: true,
            color: { argb: rem.type.includes("Atención") ? "FFDC2626" : "FF2563EB" },
          };
        }
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
      });
    });
  }

  remSheet.getColumn(1).width = 5;
  remSheet.getColumn(2).width = 18;
  remSheet.getColumn(3).width = 30;
  remSheet.getColumn(4).width = 20;
  remSheet.getColumn(5).width = 24;
  remSheet.getColumn(6).width = 24;
  remSheet.getColumn(7).width = 45;

  // -------------------------------------------------------------
  // HOJA 7: PLANES DE MEJORAMIENTO
  // -------------------------------------------------------------
  const planSheet = wb.addWorksheet("Planes de Mejoramiento");

  planSheet.mergeCells("A1:H1");
  const planTitleCell = planSheet.getCell("A1");
  planTitleCell.value = `CONSOLIDADO DE PLANES DE MEJORAMIENTO — FICHA ${payload.groupName}`;
  planTitleCell.font = { name: "Segoe UI", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
  planTitleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD97706" } };
  planTitleCell.alignment = { vertical: "middle", horizontal: "center" };
  planSheet.getRow(1).height = 28;

  planSheet.addRow([]);

  const planHeaders = ["N°", "Código Plan", "Aprendiz", "Instructor Responsable", "Estado", "Fecha Inicio", "Fecha Límite", "Observaciones / Motivo"];
  const pHeaderRow = planSheet.addRow(planHeaders);
  pHeaderRow.height = 22;
  pHeaderRow.eachCell((cell: any) => {
    cell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFB45309" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  if (!payload.improvementPlans || payload.improvementPlans.length === 0) {
    const emptyRow = planSheet.addRow([1, "-", "No hay planes de mejoramiento registrados", "-", "-", "-", "-", "-"]);
    emptyRow.height = 20;
  } else {
    payload.improvementPlans.forEach((plan, idx) => {
      const row = planSheet.addRow([
        idx + 1,
        plan.planNumber || `PLAN-${plan.id.slice(-4)}`,
        `${plan.studentName} (${plan.studentDoc})`,
        plan.teacherName,
        plan.status,
        plan.startDate || "--",
        plan.endDate || "--",
        plan.observations || "Sin observaciones",
      ]);

      row.height = 22;
      const bgArgb = idx % 2 === 0 ? "FFFFFFFF" : "FFFDFAEA";

      row.eachCell((cell: any, colIndex: number) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgArgb } };
        cell.font = { name: "Segoe UI", size: 9, color: { argb: "FF0F172A" } };
        cell.alignment = {
          vertical: "middle",
          horizontal: colIndex === 1 || colIndex === 2 || colIndex >= 5 ? "center" : "left",
        };
        if (colIndex === 5) {
          cell.font = {
            name: "Segoe UI",
            size: 9,
            bold: true,
            color: {
              argb: plan.status === "CUMPLIDO" ? "FF16A34A" : plan.status === "EN_PROCESO" ? "FFD97706" : "FFDC2626",
            },
          };
        }
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
      });
    });
  }

  planSheet.getColumn(1).width = 5;
  planSheet.getColumn(2).width = 16;
  planSheet.getColumn(3).width = 30;
  planSheet.getColumn(4).width = 26;
  planSheet.getColumn(5).width = 16;
  planSheet.getColumn(6).width = 15;
  planSheet.getColumn(7).width = 15;
  planSheet.getColumn(8).width = 40;

  // -------------------------------------------------------------
  // HOJA 8: CONTROL DE ASISTENCIAS PENDIENTES
  // -------------------------------------------------------------
  if (payload.missingAttendanceList && payload.missingAttendanceList.length > 0) {
    const missSheet = wb.addWorksheet("Asistencias Pendientes");

    missSheet.mergeCells("A1:E1");
    const mTitleCell = missSheet.getCell("A1");
    mTitleCell.value = `CONTROL DE ASISTENCIAS PENDIENTES DE REGISTRO — FICHA ${payload.groupName}`;
    mTitleCell.font = { name: "Segoe UI", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
    mTitleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDC2626" } };
    mTitleCell.alignment = { vertical: "middle", horizontal: "center" };
    missSheet.getRow(1).height = 28;

    missSheet.addRow([]);

    const mHeaders = ["N°", "Asignatura / Curso", "Instructor", "Sesiones Faltantes", "Fechas Sin Registro"];
    const mHeaderRow = missSheet.addRow(mHeaders);
    mHeaderRow.height = 22;
    mHeaderRow.eachCell((cell: any) => {
      cell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFB91C1C" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    payload.missingAttendanceList.forEach((item, idx) => {
      const row = missSheet.addRow([
        idx + 1,
        item.courseTitle,
        item.teacherName,
        `${item.missingDatesCount} sesiones`,
        item.missingDates.join(", "),
      ]);
      row.height = 20;
      row.eachCell((cell: any, cIdx: number) => {
        cell.font = { name: "Segoe UI", size: 9, color: { argb: "FF0F172A" } };
        cell.alignment = { vertical: "middle", horizontal: cIdx === 1 || cIdx === 4 ? "center" : "left" };
        if (cIdx === 4) {
          cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FFDC2626" } };
        }
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
      });
    });

    missSheet.getColumn(1).width = 5;
    missSheet.getColumn(2).width = 34;
    missSheet.getColumn(3).width = 28;
    missSheet.getColumn(4).width = 18;
    missSheet.getColumn(5).width = 45;
  }

  // -------------------------------------------------------------
  // Write and trigger download
  // -------------------------------------------------------------
  const buffer = await wb.xlsx.writeBuffer();
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
