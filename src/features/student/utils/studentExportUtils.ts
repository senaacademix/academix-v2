import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export interface StudentExportData {
  student: {
    id: string;
    name: string;
    email: string;
    identificacion: string;
    currentGroup: string;
  };
  groupHistory: Array<{
    groupId: string;
    groupName: string;
    programName: string;
    status: string;
    isCurrent: boolean;
    joinedAt: string;
    leftAt?: string | null;
    notes?: string | null;
    averageGrade?: number;
    attendanceRate?: number;
    remarksCount?: number;
    improvementPlansCount?: number;
  }>;
  attendances: any[];
  remarks: any[];
  courses: any[];
  improvementPlans: any[];
}

export async function exportStudentRecordExcel(data: StudentExportData) {
  const workbook = new ExcelJS.Workbook();
  const studentName = data.student.name || "Aprendiz";

  // ── Sheet 1: Resumen y Trayectoria de Fichas ─────────────────────────────
  const wsHistory = workbook.addWorksheet("Trayectoria de Fichas");

  wsHistory.addRow(["EXPEDIENTE Y REGISTRO ACADÉMICO INTEGRAL"]);
  wsHistory.addRow([`Aprendiz: ${studentName}`]);
  wsHistory.addRow([`Identificación: ${data.student.identificacion} | Email: ${data.student.email}`]);
  wsHistory.addRow([`Ficha Activa Actual: ${data.student.currentGroup}`]);
  wsHistory.addRow([`Fecha de Generación: ${format(new Date(), "d 'de' MMMM, yyyy", { locale: es })}`]);
  wsHistory.addRow([]);

  const historyHeaders = [
    "Ficha / Grupo",
    "Programa de Formación",
    "Estado en la Ficha",
    "Fecha de Ingreso",
    "Fecha de Salida",
    "Promedio Académico",
    "% Asistencia Efectiva",
    "Llamados de Atención",
    "Planes de Mejoramiento",
    "Observaciones / Motivo"
  ];

  const headerRow = wsHistory.addRow(historyHeaders);
  headerRow.font = { bold: true, color: { argb: "FFFFFF" } };
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "4F46E5" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });

  data.groupHistory.forEach((g) => {
    wsHistory.addRow([
      g.groupName,
      g.programName,
      g.isCurrent ? "FICHA ACTIVA ACTUAL" : "TRASLADADO / HISTÓRICO",
      g.joinedAt ? format(new Date(g.joinedAt), "dd/MM/yyyy") : "S/I",
      g.leftAt ? format(new Date(g.leftAt), "dd/MM/yyyy") : "Presente",
      g.averageGrade ? g.averageGrade.toFixed(2) : "N/A",
      g.attendanceRate !== undefined ? `${g.attendanceRate.toFixed(1)}%` : "100%",
      g.remarksCount || 0,
      g.improvementPlansCount || 0,
      g.notes || "-"
    ]);
  });

  wsHistory.columns.forEach((col) => {
    col.width = 24;
  });

  // ── Sheet 2: Asistencias e Inasistencias ──────────────────────────────
  const wsAtt = workbook.addWorksheet("Asistencias e Inasistencias");
  const attHeaders = ["Ficha / Grupo", "Fecha", "Materia / Curso", "Estado", "Justificado", "Motivo / Justificación"];
  const rAttHeader = wsAtt.addRow(attHeaders);
  rAttHeader.font = { bold: true, color: { argb: "FFFFFF" } };
  rAttHeader.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "0284C7" } };
  });

  data.attendances.forEach((att) => {
    wsAtt.addRow([
      att.course?.group?.name || att.course?.groupId || "General",
      att.date ? format(new Date(att.date), "dd/MM/yyyy") : "S/I",
      att.course?.title || "Materia no especificada",
      att.status === "ABSENT" ? "INASISTENCIA" : att.status === "LATE" ? "LLEGADA TARDE" : att.status,
      att.justification ? "SÍ" : "NO",
      att.justification || "-"
    ]);
  });

  wsAtt.columns.forEach((col) => { col.width = 24; });

  // ── Sheet 3: Calificaciones ──────────────────────────────────────────
  const wsGrades = workbook.addWorksheet("Calificaciones por Ficha");
  const gradeHeaders = ["Ficha / Grupo", "Materia / Asignatura", "Instructor", "Actividades Evaluadas", "Promedio Final"];
  const rGradesHeader = wsGrades.addRow(gradeHeaders);
  rGradesHeader.font = { bold: true, color: { argb: "FFFFFF" } };
  rGradesHeader.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "059669" } };
  });

  data.courses.forEach((c) => {
    let totalScore = 0;
    let totalWeight = 0;
    c.activities?.forEach((act: any) => {
      const g = act.grades?.[0];
      if (g && g.score > 0) {
        totalScore += g.score * (act.weight / 100);
        totalWeight += act.weight;
      }
    });
    const finalScore = totalWeight > 0 ? (totalScore / (totalWeight / 100)).toFixed(2) : "0.00";

    wsGrades.addRow([
      c.group?.name || c.groupId || "General",
      c.title,
      c.teacher?.name || "Instructor no asignado",
      c.activities?.length || 0,
      finalScore
    ]);
  });

  wsGrades.columns.forEach((col) => { col.width = 25; });

  // ── Sheet 4: Observaciones Disciplinarias ─────────────────────────────
  const wsRemarks = workbook.addWorksheet("Observaciones");
  const remarkHeaders = ["Ficha / Grupo", "Fecha", "Tipo", "Instructor", "Materia / Curso", "Observación / Detalle"];
  const rRemHeader = wsRemarks.addRow(remarkHeaders);
  rRemHeader.font = { bold: true, color: { argb: "FFFFFF" } };
  rRemHeader.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "DC2626" } };
  });

  data.remarks.forEach((r) => {
    wsRemarks.addRow([
      r.course?.group?.name || r.course?.groupId || "General",
      r.date ? format(new Date(r.date), "dd/MM/yyyy") : "S/I",
      r.type === "ATTENTION" ? "Llamado de Atención" : r.type,
      r.teacher?.name || "Instructor",
      r.course?.title || "Materia",
      r.content || "-"
    ]);
  });

  wsRemarks.columns.forEach((col) => { col.width = 24; });

  // ── Sheet 5: Planes de Mejoramiento ──────────────────────────────────
  const wsPlans = workbook.addWorksheet("Planes de Mejoramiento");
  const planHeaders = ["Ficha / Grupo", "N° Plan", "Instructor", "Fecha Inicio", "Fecha Fin", "Calificación Final"];
  const rPlanHeader = wsPlans.addRow(planHeaders);
  rPlanHeader.font = { bold: true, color: { argb: "FFFFFF" } };
  rPlanHeader.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "D97706" } };
  });

  data.improvementPlans.forEach((p) => {
    wsPlans.addRow([
      p.group?.name || "General",
      p.planNumber,
      p.teacher?.name || "Instructor",
      p.startDate ? format(new Date(p.startDate), "dd/MM/yyyy") : "S/I",
      p.endDate ? format(new Date(p.endDate), "dd/MM/yyyy") : "S/I",
      p.finalGrade !== undefined && p.finalGrade !== null ? p.finalGrade.toFixed(1) : "Sin calificar"
    ]);
  });

  wsPlans.columns.forEach((col) => { col.width = 22; });

  // Generate buffer and trigger download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Expediente_Academico_${studentName.replace(/\s+/g, "_")}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportStudentRecordPDF(data: StudentExportData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const studentName = data.student.name || "Aprendiz";

  // Title & Institution Header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("EXPEDIENTE Y REGISTRO ACADÉMICO INTEGRAL", 14, 18);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(79, 70, 229);
  doc.text(`Aprendiz: ${studentName}`, 14, 25);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(`Identificación: ${data.student.identificacion} | Email: ${data.student.email}`, 14, 30);
  doc.text(`Ficha Activa Actual: ${data.student.currentGroup}`, 14, 35);
  doc.text(`Fecha de Emisión: ${format(new Date(), "d 'de' MMMM, yyyy", { locale: es })}`, 14, 40);

  let currentY = 46;

  // ── Section 1: Trayectoria Histórica de Fichas ─────────────────────────
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("1. Trayectoria e Historial de Fichas de Formación", 14, currentY);

  const historyRows = data.groupHistory.map((g) => [
    g.groupName,
    g.programName,
    g.isCurrent ? "ACTIVA" : "TRASLADADO",
    g.joinedAt ? format(new Date(g.joinedAt), "dd/MM/yyyy") : "S/I",
    g.leftAt ? format(new Date(g.leftAt), "dd/MM/yyyy") : "Presente",
    g.averageGrade ? g.averageGrade.toFixed(2) : "N/A",
    g.attendanceRate !== undefined ? `${g.attendanceRate.toFixed(1)}%` : "100%"
  ]);

  autoTable(doc, {
    startY: currentY + 3,
    head: [["Ficha / Grupo", "Programa", "Estado", "Ingreso", "Salida", "Promedio", "% Asistencia"]],
    body: historyRows.length > 0 ? historyRows : [["-", "Sin historial registrado", "-", "-", "-", "-", "-"]],
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // ── Section 2: Resumen de Calificaciones por Ficha ──────────────────────
  if (currentY > 240) { doc.addPage(); currentY = 20; }
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("2. Calificaciones Académicas por Ficha de Formación", 14, currentY);

  const gradeRows = data.courses.map((c) => {
    let totalScore = 0;
    let totalWeight = 0;
    c.activities?.forEach((act: any) => {
      const g = act.grades?.[0];
      if (g && g.score > 0) {
        totalScore += g.score * (act.weight / 100);
        totalWeight += act.weight;
      }
    });
    const finalScore = totalWeight > 0 ? (totalScore / (totalWeight / 100)).toFixed(2) : "0.00";
    return [
      c.group?.name || c.groupId || "General",
      c.title,
      c.teacher?.name || "Instructor no asignado",
      c.activities?.length || 0,
      finalScore
    ];
  });

  autoTable(doc, {
    startY: currentY + 3,
    head: [["Ficha / Grupo", "Materia / Asignatura", "Instructor", "Actividades", "Promedio Final"]],
    body: gradeRows.length > 0 ? gradeRows : [["-", "Sin materias registradas", "-", "-", "-"]],
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [240, 253, 244] },
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // ── Section 3: Observaciones y Llamados de Atención ─────────────────────
  if (currentY > 240) { doc.addPage(); currentY = 20; }
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("3. Registro de Observaciones Disciplinarias y Académicas", 14, currentY);

  const remarkRows = data.remarks.map((r) => [
    r.course?.group?.name || r.course?.groupId || "General",
    r.date ? format(new Date(r.date), "dd/MM/yyyy") : "S/I",
    r.type === "ATTENTION" ? "Llamado de Atención" : r.type,
    r.teacher?.name || "Instructor",
    r.content || "-"
  ]);

  autoTable(doc, {
    startY: currentY + 3,
    head: [["Ficha / Grupo", "Fecha", "Tipo", "Instructor", "Observación / Detalle"]],
    body: remarkRows.length > 0 ? remarkRows : [["-", "-", "-", "-", "Sin observaciones registradas"]],
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [220, 38, 38], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [254, 242, 242] },
  });

  doc.save(`Expediente_Academico_${studentName.replace(/\s+/g, "_")}.pdf`);
}
