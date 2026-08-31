import React from "react";
import { pdf, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { DayOfWeek } from "@/generated/prisma/client";

export interface GroupExportStudentRemark {
  date: string;
  type: string;
  courseTitle: string;
  teacherName: string;
  title: string;
  description: string;
}

export interface GroupExportStudentImprovementPlan {
  planNumber?: string;
  teacherName: string;
  status: string;
  startDate?: string;
  endDate?: string;
  observations?: string;
  planScore?: number;
  finalGrade?: number;
}

export interface GroupExportStudent {
  id?: string;
  name: string;
  identificacion: string;
  email: string;
  banned: boolean;
  gradesAvg: number;
  attendanceRate: number;
  remarksCount: number;
  integralScore?: number;
  absentCount?: number;
  absentHours?: number;
  lateCount?: number;
  lateHours?: number;
  leaveEarlyCount?: number;
  leaveEarlyHours?: number;
  attentionCalls?: number;
  commendations?: number;
  courseGrades?: Record<string, number>;
  courseAttendances?: Record<string, { present: number; absent: number; late: number; leaveEarly?: number; absentHours?: number; lateHours?: number; leaveEarlyHours?: number; totalClasses?: number }>;
  studentRemarks?: GroupExportStudentRemark[];
  studentPlans?: GroupExportStudentImprovementPlan[];
}

export interface GroupExportCourse {
  id?: string;
  title: string;
  teacherName: string;
  averageGrade?: number;
  totalGrades?: number;
  weeklyHours?: number;
}

export interface GroupExportScheduleSlot {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  courseTitle: string;
  teacherName: string;
  environmentName: string;
}

export interface GroupExportRemark {
  id: string;
  date: string;
  studentName: string;
  studentDoc: string;
  type: string;
  courseTitle: string;
  teacherName: string;
  title: string;
  description: string;
}

export interface GroupExportImprovementPlan {
  id: string;
  planNumber?: string;
  studentName: string;
  studentDoc: string;
  teacherName: string;
  status: string;
  startDate?: string;
  endDate?: string;
  observations?: string;
  planScore?: number;
  finalGrade?: number;
}

export interface GroupExportMissingAttendance {
  courseTitle: string;
  teacherName: string;
  missingDatesCount: number;
  missingDates: string[];
}

export interface GroupExportPayload {
  groupName: string;
  program: string;
  period: string;
  environment: string;
  startDate?: string;
  endDate?: string;
  startDateStr?: string;
  endDateStr?: string;
  startTime?: string;
  endTime?: string;
  totalStudents: number;
  activeStudents: number;
  bannedStudents: number;
  averageGrade: number;
  attendanceRate: number;
  overallIntegralScore?: number;
  totalClassesScheduled?: number;
  totalScheduledHours?: number;
  coursesList: GroupExportCourse[];
  scheduleSlots: GroupExportScheduleSlot[];
  studentsList: GroupExportStudent[];
  remarksList?: GroupExportRemark[];
  improvementPlans?: GroupExportImprovementPlan[];
  missingAttendanceList?: GroupExportMissingAttendance[];
}

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

const styles = StyleSheet.create({
  page: {
    padding: 20,
    paddingBottom: 35,
    backgroundColor: "#ffffff",
    fontFamily: "Helvetica",
    fontSize: 7.5,
    color: "#1e293b",
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "#4f46e5",
    paddingBottom: 6,
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: "column",
    gap: 2,
  },
  mainTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#1e1b4b",
    textTransform: "uppercase",
  },
  subTitle: {
    fontSize: 7.5,
    color: "#64748b",
  },
  badge: {
    backgroundColor: "#eef2ff",
    borderWidth: 1,
    borderColor: "#c7d2fe",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    alignItems: "flex-end",
  },
  badgeText: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#4338ca",
  },
  metaCard: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 5,
    padding: 6,
    marginBottom: 8,
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 6,
  },
  metaItem: {
    flexDirection: "column",
    gap: 1,
  },
  metaLabel: {
    fontSize: 6,
    color: "#64748b",
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
  },
  metaValue: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
  },
  kpiRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 5,
    marginBottom: 8,
  },
  kpiCard: {
    flex: 1,
    padding: 5,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
  },
  kpiTitle: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    color: "#64748b",
    textTransform: "uppercase",
    marginBottom: 1,
  },
  kpiValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
  },
  kpiSub: {
    fontSize: 5.5,
    color: "#94a3b8",
  },
  sectionTitle: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#1e1b4b",
    marginBottom: 4,
    marginTop: 4,
    textTransform: "uppercase",
  },
  gridContainer: {
    flexDirection: "column",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  gridHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#1e1b4b",
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
  },
  gridHeaderCell: {
    paddingVertical: 3,
    paddingHorizontal: 2,
    textAlign: "center",
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
  },
  gridDayColumn: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: "#e2e8f0",
    padding: 2,
    minHeight: 110,
    backgroundColor: "#ffffff",
  },
  classCard: {
    backgroundColor: "#eef2ff",
    borderWidth: 1,
    borderColor: "#c7d2fe",
    borderRadius: 3,
    padding: 3,
    marginBottom: 3,
  },
  classTitle: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: "#3730a3",
  },
  classTeacher: {
    fontSize: 5.5,
    color: "#475569",
    marginTop: 1,
  },
  classTime: {
    fontSize: 5.5,
    fontFamily: "Helvetica-Bold",
    color: "#059669",
    marginTop: 1,
  },
  classEnv: {
    fontSize: 5.5,
    color: "#64748b",
  },
  table: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#4f46e5",
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  tableHeaderCell: {
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
    fontSize: 6.5,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 3,
    paddingHorizontal: 4,
    alignItems: "center",
  },
  tableRowEven: {
    backgroundColor: "#f8fafc",
  },
  tableCell: {
    fontSize: 6.5,
    color: "#334155",
  },
  footer: {
    position: "absolute",
    bottom: 12,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 6,
    color: "#94a3b8",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 3,
  },
  studentHeaderBanner: {
    backgroundColor: "#312e81",
    padding: 8,
    borderRadius: 5,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  studentHeaderTitle: {
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    textTransform: "uppercase",
  },
  studentHeaderSub: {
    color: "#c7d2fe",
    fontSize: 7.5,
  },
});

export const GroupSchedulePdfDocument: React.FC<{ payload: GroupExportPayload }> = ({ payload }) => {
  const dayClassesMap: Record<DayOfWeek, Array<GroupExportScheduleSlot>> = {
    MONDAY: [],
    TUESDAY: [],
    WEDNESDAY: [],
    THURSDAY: [],
    FRIDAY: [],
    SATURDAY: [],
    SUNDAY: [],
  };

  (payload.scheduleSlots || []).forEach((slot) => {
    if (dayClassesMap[slot.dayOfWeek]) {
      dayClassesMap[slot.dayOfWeek].push(slot);
    }
  });

  DAYS_ES.forEach((d) => {
    dayClassesMap[d.key].sort((a, b) => a.startTime.localeCompare(b.startTime));
  });

  const footerText = (pageNumber: number, totalPages: number) =>
    `AcademiX — Reporte Consolidado Ficha ${payload.groupName} • Página ${pageNumber} de ${totalPages}`;

  return (
    <Document>
      {/* SECCIÓN 1: FICHA, PERÍODOS Y HORARIO SEMANAL */}
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.headerContainer}>
          <View style={styles.headerLeft}>
            <Text style={styles.mainTitle}>ACADEMIX — FICHA {payload.groupName}</Text>
            <Text style={styles.subTitle}>
              Programa: {payload.program} | Período: {payload.period || "Actual"}
            </Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>REPORTE OFICIAL DE GRUPO</Text>
          </View>
        </View>

        {/* Group Meta Info - Complete Periods and Schedules */}
        <View style={styles.metaCard}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Ficha / Grupo</Text>
            <Text style={styles.metaValue}>{payload.groupName}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Programa de Formación</Text>
            <Text style={styles.metaValue}>{payload.program}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Período Lectivo</Text>
            <Text style={styles.metaValue}>{payload.period || "Actual"}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Fecha Inicio Lectiva</Text>
            <Text style={styles.metaValue}>{payload.startDateStr || "No definida"}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Fecha Fin Lectiva</Text>
            <Text style={styles.metaValue}>{payload.endDateStr || "No definida"}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Jornada / Horario Diario</Text>
            <Text style={styles.metaValue}>
              {payload.startTime || "--:--"} - {payload.endTime || "--:--"}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Aula / Ambiente Asignado</Text>
            <Text style={styles.metaValue}>{payload.environment || "No asignado"}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Total Aprendices</Text>
            <Text style={styles.metaValue}>{payload.totalStudents} matriculados</Text>
          </View>
        </View>

        {/* KPI Row */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiTitle}>Puntaje Integral Global</Text>
            <Text style={[styles.kpiValue, { color: "#4338ca" }]}>
              {payload.overallIntegralScore ?? 100} / 100
            </Text>
            <Text style={styles.kpiSub}>Desempeño general de la ficha</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiTitle}>Estudiantes Activos</Text>
            <Text style={[styles.kpiValue, { color: "#059669" }]}>
              {payload.activeStudents} / {payload.totalStudents}
            </Text>
            <Text style={styles.kpiSub}>Aprendices en estado activo</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiTitle}>Promedio Académico</Text>
            <Text style={[styles.kpiValue, { color: "#4f46e5" }]}>
              {payload.averageGrade > 0 ? payload.averageGrade.toFixed(2) : "N/A"}
            </Text>
            <Text style={styles.kpiSub}>Promedio de calificaciones</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiTitle}>Porcentaje de Asistencia</Text>
            <Text style={[styles.kpiValue, { color: "#0284c7" }]}>
              {Math.round(payload.attendanceRate)}%
            </Text>
            <Text style={styles.kpiSub}>Asistencia global a clases</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiTitle}>Cursos / Asignaturas</Text>
            <Text style={[styles.kpiValue, { color: "#7c3aed" }]}>
              {payload.coursesList?.length || 0} materias
            </Text>
            <Text style={styles.kpiSub}>Total en plan de estudio</Text>
          </View>
        </View>

        {/* 7-Days Weekly Schedule Matrix */}
        <Text style={styles.sectionTitle}>Horario Académico Semanal de la Ficha (Lunes a Domingo)</Text>
        <View style={styles.gridContainer}>
          <View style={styles.gridHeaderRow}>
            {DAYS_ES.map((d) => (
              <View key={d.key} style={{ flex: 1 }}>
                <Text style={styles.gridHeaderCell}>{d.label}</Text>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: "row" }}>
            {DAYS_ES.map((d) => {
              const classes = dayClassesMap[d.key];
              return (
                <View key={d.key} style={styles.gridDayColumn}>
                  {classes.length === 0 ? (
                    <Text
                      style={{
                        fontSize: 6,
                        color: "#94a3b8",
                        textAlign: "center",
                        marginTop: 20,
                        fontFamily: "Helvetica-Oblique",
                      }}
                    >
                      - Sin clase -
                    </Text>
                  ) : (
                    classes.map((item, idx) => (
                      <View key={idx} style={styles.classCard}>
                        <Text style={styles.classTitle}>{item.courseTitle}</Text>
                        <Text style={styles.classTeacher}>{item.teacherName}</Text>
                        <Text style={styles.classTime}>
                          {toFormat12h(item.startTime)} - {toFormat12h(item.endTime)}
                        </Text>
                        <Text style={styles.classEnv}>Aula: {item.environmentName}</Text>
                      </View>
                    ))
                  )}
                </View>
              );
            })}
          </View>
        </View>

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) => footerText(pageNumber, totalPages)}
          fixed
        />
      </Page>

      {/* SECCIÓN 2: PLAN DE ESTUDIOS (ASIGNATURAS Y DOCENTES) */}
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.headerContainer}>
          <View style={styles.headerLeft}>
            <Text style={styles.mainTitle}>PLAN DE ESTUDIOS Y ASIGNATURAS</Text>
            <Text style={styles.subTitle}>
              Ficha {payload.groupName} — Resumen de Materias e Instructores
            </Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>PLAN DE ESTUDIOS</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Materias Asignadas y Promedios por Asignatura</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: "6%" }]}>N°</Text>
            <Text style={[styles.tableHeaderCell, { width: "40%" }]}>Asignatura / Curso</Text>
            <Text style={[styles.tableHeaderCell, { width: "34%" }]}>Docente Instructor</Text>
            <Text style={[styles.tableHeaderCell, { width: "10%", textAlign: "center" }]}>Promedio</Text>
            <Text style={[styles.tableHeaderCell, { width: "10%", textAlign: "center" }]}>Evaluaciones</Text>
          </View>

          {payload.coursesList.length === 0 ? (
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: "100%", textAlign: "center", color: "#94a3b8" }]}>
                No hay asignaturas registradas para este grupo.
              </Text>
            </View>
          ) : (
            payload.coursesList.map((c, idx) => (
              <View key={idx} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowEven : {}]}>
                <Text style={[styles.tableCell, { width: "6%", color: "#64748b" }]}>{idx + 1}</Text>
                <Text style={[styles.tableCell, { width: "40%", fontFamily: "Helvetica-Bold", color: "#0f172a" }]}>
                  {c.title}
                </Text>
                <Text style={[styles.tableCell, { width: "34%" }]}>{c.teacherName}</Text>
                <Text style={[styles.tableCell, { width: "10%", textAlign: "center", fontFamily: "Helvetica-Bold", color: "#4f46e5" }]}>
                  {c.averageGrade && c.averageGrade > 0 ? c.averageGrade.toFixed(2) : "N/A"}
                </Text>
                <Text style={[styles.tableCell, { width: "10%", textAlign: "center" }]}>
                  {c.totalGrades || 0}
                </Text>
              </View>
            ))
          )}
        </View>

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) => footerText(pageNumber, totalPages)}
          fixed
        />
      </Page>

      {/* SECCIÓN 3: DIRECTORIO Y CONSOLIDADO DE APRENDICES */}
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.headerContainer}>
          <View style={styles.headerLeft}>
            <Text style={styles.mainTitle}>DIRECTORIO Y MATRÍCULA DE APRENDICES</Text>
            <Text style={styles.subTitle}>
              Ficha {payload.groupName} — Total de Aprendices: {payload.studentsList.length}
            </Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>DIRECTORIO Y RENDIMIENTO</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Consolidado General de Estudiantes</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: "4%" }]}>N°</Text>
            <Text style={[styles.tableHeaderCell, { width: "22%" }]}>Nombre Completo</Text>
            <Text style={[styles.tableHeaderCell, { width: "13%" }]}>Identificación</Text>
            <Text style={[styles.tableHeaderCell, { width: "20%" }]}>Correo Electrónico</Text>
            <Text style={[styles.tableHeaderCell, { width: "9%", textAlign: "center" }]}>Puntaje Int.</Text>
            <Text style={[styles.tableHeaderCell, { width: "7%", textAlign: "center" }]}>Promedio</Text>
            <Text style={[styles.tableHeaderCell, { width: "7%", textAlign: "center" }]}>Asistencia</Text>
            <Text style={[styles.tableHeaderCell, { width: "6%", textAlign: "center" }]}>Faltas</Text>
            <Text style={[styles.tableHeaderCell, { width: "6%", textAlign: "center" }]}>Obs.</Text>
            <Text style={[styles.tableHeaderCell, { width: "6%", textAlign: "center" }]}>Estado</Text>
          </View>

          {payload.studentsList.map((st, idx) => (
            <View
              key={st.identificacion || idx}
              style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowEven : {}]}
              wrap={false}
            >
              <Text style={[styles.tableCell, { width: "4%", color: "#64748b" }]}>{idx + 1}</Text>
              <Text style={[styles.tableCell, { width: "22%", fontFamily: "Helvetica-Bold", color: "#0f172a" }]}>
                {st.name}
              </Text>
              <Text style={[styles.tableCell, { width: "13%" }]}>{st.identificacion || "S/I"}</Text>
              <Text style={[styles.tableCell, { width: "20%", color: "#2563eb" }]}>{st.email || "Sin correo"}</Text>
              <Text style={[styles.tableCell, { width: "9%", textAlign: "center", fontFamily: "Helvetica-Bold", color: "#4338ca" }]}>
                {st.integralScore ?? "--"} pts
              </Text>
              <Text style={[styles.tableCell, { width: "7%", textAlign: "center", fontFamily: "Helvetica-Bold", color: "#4f46e5" }]}>
                {st.gradesAvg > 0 ? st.gradesAvg.toFixed(2) : "N/A"}
              </Text>
              <Text style={[styles.tableCell, { width: "7%", textAlign: "center", fontFamily: "Helvetica-Bold", color: "#059669" }]}>
                {Math.round(st.attendanceRate)}%
              </Text>
              <Text style={[styles.tableCell, { width: "6%", textAlign: "center", color: (st.absentCount || 0) > 0 ? "#dc2626" : "#64748b" }]}>
                {st.absentCount || 0} ({st.absentHours || 0}h)
              </Text>
              <Text style={[styles.tableCell, { width: "6%", textAlign: "center", color: "#d97706" }]}>
                {st.remarksCount || 0}
              </Text>
              <Text style={[styles.tableCell, { width: "6%", textAlign: "center", color: st.banned ? "#dc2626" : "#16a34a", fontFamily: "Helvetica-Bold" }]}>
                {st.banned ? "Inactivo" : "Activo"}
              </Text>
            </View>
          ))}
        </View>

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) => footerText(pageNumber, totalPages)}
          fixed
        />
      </Page>

      {/* SECCIÓN 4: MATRIZ DE RENDIMIENTO ACADÉMICO POR MATERIA */}
      {payload.coursesList.length > 0 && (
        <Page size="A4" orientation="landscape" style={styles.page}>
          <View style={styles.headerContainer}>
            <View style={styles.headerLeft}>
              <Text style={styles.mainTitle}>MATRIZ DE RENDIMIENTO ACADÉMICO POR MATERIA</Text>
              <Text style={styles.subTitle}>
                Ficha {payload.groupName} — Detalle de Promedios por Estudiante y Asignatura
              </Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>CALIFICACIONES POR CURSO</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Notas por Asignatura por Estudiante</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: "4%" }]}>N°</Text>
              <Text style={[styles.tableHeaderCell, { width: "24%" }]}>Nombre Completo</Text>
              {payload.coursesList.slice(0, 5).map((c, i) => (
                <Text key={i} style={[styles.tableHeaderCell, { flex: 1, textAlign: "center" }]}>
                  {c.title.length > 15 ? c.title.slice(0, 15) + "..." : c.title}
                </Text>
              ))}
              <Text style={[styles.tableHeaderCell, { width: "10%", textAlign: "center" }]}>Promedio Gen.</Text>
            </View>

            {payload.studentsList.map((st, idx) => (
              <View
                key={st.identificacion || idx}
                style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowEven : {}]}
                wrap={false}
              >
                <Text style={[styles.tableCell, { width: "4%", color: "#64748b" }]}>{idx + 1}</Text>
                <Text style={[styles.tableCell, { width: "24%", fontFamily: "Helvetica-Bold", color: "#0f172a" }]}>
                  {st.name}
                </Text>
                {payload.coursesList.slice(0, 5).map((c, i) => {
                  const grade = c.id && st.courseGrades?.[c.id] !== undefined ? st.courseGrades[c.id] : null;
                  return (
                    <Text key={i} style={[styles.tableCell, { flex: 1, textAlign: "center" }]}>
                      {grade !== null && grade > 0 ? grade.toFixed(1) : "N/A"}
                    </Text>
                  );
                })}
                <Text style={[styles.tableCell, { width: "10%", textAlign: "center", fontFamily: "Helvetica-Bold", color: "#4f46e5" }]}>
                  {st.gradesAvg > 0 ? st.gradesAvg.toFixed(2) : "N/A"}
                </Text>
              </View>
            ))}
          </View>

          <Text
            style={styles.footer}
            render={({ pageNumber, totalPages }) => footerText(pageNumber, totalPages)}
            fixed
          />
        </Page>
      )}

      {/* SECCIÓN 5: HISTORIAL DE OBSERVACIONES Y DISCIPLINA */}
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.headerContainer}>
          <View style={styles.headerLeft}>
            <Text style={styles.mainTitle}>HISTORIAL DE NOVEDADES Y DISCIPLINA</Text>
            <Text style={styles.subTitle}>
              Ficha {payload.groupName} — Observaciones, Llamados de Atención y Felicitaciones
            </Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>DISCIPLINA Y NOVEDADES</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Registro Disciplinario del Grupo</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: "12%" }]}>Fecha</Text>
            <Text style={[styles.tableHeaderCell, { width: "20%" }]}>Aprendiz</Text>
            <Text style={[styles.tableHeaderCell, { width: "14%" }]}>Tipo</Text>
            <Text style={[styles.tableHeaderCell, { width: "18%" }]}>Materia</Text>
            <Text style={[styles.tableHeaderCell, { width: "16%" }]}>Docente</Text>
            <Text style={[styles.tableHeaderCell, { width: "20%" }]}>Título / Observación</Text>
          </View>

          {!payload.remarksList || payload.remarksList.length === 0 ? (
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: "100%", textAlign: "center", color: "#94a3b8" }]}>
                No hay observaciones o novedades disciplinarias registradas para este grupo.
              </Text>
            </View>
          ) : (
            payload.remarksList.map((rem, idx) => (
              <View
                key={rem.id || idx}
                style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowEven : {}]}
                wrap={false}
              >
                <Text style={[styles.tableCell, { width: "12%", color: "#64748b" }]}>{rem.date}</Text>
                <Text style={[styles.tableCell, { width: "20%", fontFamily: "Helvetica-Bold", color: "#0f172a" }]}>
                  {rem.studentName}
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    {
                      width: "14%",
                      fontFamily: "Helvetica-Bold",
                      color: rem.type.includes("Atención") ? "#dc2626" : "#2563eb",
                    },
                  ]}
                >
                  {rem.type}
                </Text>
                <Text style={[styles.tableCell, { width: "18%" }]}>{rem.courseTitle}</Text>
                <Text style={[styles.tableCell, { width: "16%" }]}>{rem.teacherName}</Text>
                <Text style={[styles.tableCell, { width: "20%" }]}>{rem.title}</Text>
              </View>
            ))
          )}
        </View>

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) => footerText(pageNumber, totalPages)}
          fixed
        />
      </Page>

      {/* SECCIÓN 6: CONSOLIDADO DE PLANES DE MEJORAMIENTO */}
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.headerContainer}>
          <View style={styles.headerLeft}>
            <Text style={styles.mainTitle}>CONSOLIDADO DE PLANES DE MEJORAMIENTO</Text>
            <Text style={styles.subTitle}>
              Ficha {payload.groupName} — Planes de Recuperación y Compromiso Académico
            </Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>PLANES DE MEJORAMIENTO</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Planes Asignados a Aprendices del Grupo</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: "10%" }]}>Código</Text>
            <Text style={[styles.tableHeaderCell, { width: "22%" }]}>Aprendiz</Text>
            <Text style={[styles.tableHeaderCell, { width: "18%" }]}>Docente Responsable</Text>
            <Text style={[styles.tableHeaderCell, { width: "12%", textAlign: "center" }]}>Estado</Text>
            <Text style={[styles.tableHeaderCell, { width: "11%", textAlign: "center" }]}>Inicio</Text>
            <Text style={[styles.tableHeaderCell, { width: "11%", textAlign: "center" }]}>Límite</Text>
            <Text style={[styles.tableHeaderCell, { width: "16%" }]}>Observaciones</Text>
          </View>

          {!payload.improvementPlans || payload.improvementPlans.length === 0 ? (
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: "100%", textAlign: "center", color: "#94a3b8" }]}>
                No hay planes de mejoramiento registrados para los aprendices de este grupo.
              </Text>
            </View>
          ) : (
            payload.improvementPlans.map((plan, idx) => (
              <View
                key={plan.id || idx}
                style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowEven : {}]}
                wrap={false}
              >
                <Text style={[styles.tableCell, { width: "10%", fontFamily: "Helvetica-Bold", color: "#4338ca" }]}>
                  {plan.planNumber || `PLAN-${plan.id.slice(-4)}`}
                </Text>
                <Text style={[styles.tableCell, { width: "22%", fontFamily: "Helvetica-Bold", color: "#0f172a" }]}>
                  {plan.studentName}
                </Text>
                <Text style={[styles.tableCell, { width: "18%" }]}>{plan.teacherName}</Text>
                <Text
                  style={[
                    styles.tableCell,
                    {
                      width: "12%",
                      textAlign: "center",
                      fontFamily: "Helvetica-Bold",
                      color:
                        plan.status === "CUMPLIDO"
                          ? "#16a34a"
                          : plan.status === "EN_PROCESO"
                          ? "#d97706"
                          : "#dc2626",
                    },
                  ]}
                >
                  {plan.status}
                </Text>
                <Text style={[styles.tableCell, { width: "11%", textAlign: "center", color: "#64748b" }]}>
                  {plan.startDate || "--"}
                </Text>
                <Text style={[styles.tableCell, { width: "11%", textAlign: "center", color: "#64748b" }]}>
                  {plan.endDate || "--"}
                </Text>
                <Text style={[styles.tableCell, { width: "16%" }]}>{plan.observations || "Sin observaciones"}</Text>
              </View>
            ))
          )}
        </View>

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) => footerText(pageNumber, totalPages)}
          fixed
        />
      </Page>

      {/* SECCIÓN 7: CONTROL DE FECHAS DE ASISTENCIA PENDIENTES POR DOCENTE */}
      {payload.missingAttendanceList && payload.missingAttendanceList.length > 0 && (
        <Page size="A4" orientation="landscape" style={styles.page}>
          <View style={styles.headerContainer}>
            <View style={styles.headerLeft}>
              <Text style={styles.mainTitle}>CONTROL DE ASISTENCIAS PENDIENTES DE REGISTRO</Text>
              <Text style={styles.subTitle}>
                Ficha {payload.groupName} — Sesiones Programadas Sin Registro de Asistencia por Docente
              </Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>SEGUIMIENTO DOCENTE</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Fechas Faltantes por Registrar por Materia</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: "5%" }]}>N°</Text>
              <Text style={[styles.tableHeaderCell, { width: "30%" }]}>Asignatura / Curso</Text>
              <Text style={[styles.tableHeaderCell, { width: "25%" }]}>Docente Instructor</Text>
              <Text style={[styles.tableHeaderCell, { width: "15%", textAlign: "center" }]}>Sesiones Pendientes</Text>
              <Text style={[styles.tableHeaderCell, { width: "25%" }]}>Fechas Sin Registro</Text>
            </View>

            {payload.missingAttendanceList.map((item, idx) => (
              <View key={idx} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowEven : {}]}>
                <Text style={[styles.tableCell, { width: "5%", color: "#64748b" }]}>{idx + 1}</Text>
                <Text style={[styles.tableCell, { width: "30%", fontFamily: "Helvetica-Bold" }]}>{item.courseTitle}</Text>
                <Text style={[styles.tableCell, { width: "25%" }]}>{item.teacherName}</Text>
                <Text style={[styles.tableCell, { width: "15%", textAlign: "center", fontFamily: "Helvetica-Bold", color: "#dc2626" }]}>
                  {item.missingDatesCount} sesiones
                </Text>
                <Text style={[styles.tableCell, { width: "25%", color: "#475569" }]}>
                  {item.missingDates.slice(0, 6).join(", ")}{item.missingDates.length > 6 ? "..." : ""}
                </Text>
              </View>
            ))}
          </View>

          <Text
            style={styles.footer}
            render={({ pageNumber, totalPages }) => footerText(pageNumber, totalPages)}
            fixed
          />
        </Page>
      )}

      {/* SECCIÓN 8: FICHAS E INFORMES INDIVIDUALES DE CADA APRENDIZ */}
      {payload.studentsList.map((st, sIdx) => (
        <Page key={st.identificacion || sIdx} size="A4" orientation="landscape" style={styles.page}>
          <View style={styles.studentHeaderBanner}>
            <View>
              <Text style={styles.studentHeaderTitle}>
                FICHA INDIVIDUAL DE APRENDIZ N° {sIdx + 1} DE {payload.studentsList.length}
              </Text>
              <Text style={styles.studentHeaderSub}>
                Ficha {payload.groupName} — {payload.program} | Período: {payload.period || "Actual"}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ color: "#ffffff", fontFamily: "Helvetica-Bold", fontSize: 9 }}>
                PUNTAJE INTEGRAL: {st.integralScore ?? "--"} / 100 PTS
              </Text>
              <Text style={{ color: st.banned ? "#fca5a5" : "#86efac", fontSize: 7, fontFamily: "Helvetica-Bold" }}>
                ESTADO: {st.banned ? "INACTIVO" : "ACTIVO"}
              </Text>
            </View>
          </View>

          {/* Datos Personales e Indicadores */}
          <View style={styles.metaCard}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Nombre Completo</Text>
              <Text style={styles.metaValue}>{st.name}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Identificación</Text>
              <Text style={styles.metaValue}>{st.identificacion || "S/I"}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Correo Electrónico</Text>
              <Text style={[styles.metaValue, { color: "#2563eb" }]}>{st.email || "Sin correo"}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Promedio General</Text>
              <Text style={[styles.metaValue, { color: "#4f46e5" }]}>
                {st.gradesAvg > 0 ? st.gradesAvg.toFixed(2) : "N/A"} pts
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>% Asistencia</Text>
              <Text style={[styles.metaValue, { color: "#059669" }]}>{Math.round(st.attendanceRate)}%</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Inasistencias / Tardanzas</Text>
              <Text style={[styles.metaValue, { color: "#dc2626" }]}>
                {st.absentCount || 0} faltas ({st.absentHours || 0}h) | {st.lateCount || 0} tardes
              </Text>
            </View>
          </View>

          {/* Sub-tabla 1: Rendimiento por Materia del Aprendiz */}
          <Text style={styles.sectionTitle}>Rendimiento Académico Individual por Asignatura</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: "35%" }]}>Asignatura / Curso</Text>
              <Text style={[styles.tableHeaderCell, { width: "30%" }]}>Docente Instructor</Text>
              <Text style={[styles.tableHeaderCell, { width: "15%", textAlign: "center" }]}>Nota Aprendiz</Text>
              <Text style={[styles.tableHeaderCell, { width: "20%", textAlign: "center" }]}>Promedio Ficha</Text>
            </View>
            {payload.coursesList.length === 0 ? (
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { width: "100%", textAlign: "center", color: "#94a3b8" }]}>
                  Sin materias registradas.
                </Text>
              </View>
            ) : (
              payload.coursesList.map((c, cIdx) => {
                const grade = c.id && st.courseGrades?.[c.id] !== undefined ? st.courseGrades[c.id] : null;
                return (
                  <View key={cIdx} style={[styles.tableRow, cIdx % 2 === 1 ? styles.tableRowEven : {}]}>
                    <Text style={[styles.tableCell, { width: "35%", fontFamily: "Helvetica-Bold" }]}>{c.title}</Text>
                    <Text style={[styles.tableCell, { width: "30%" }]}>{c.teacherName}</Text>
                    <Text
                      style={[
                        styles.tableCell,
                        {
                          width: "15%",
                          textAlign: "center",
                          fontFamily: "Helvetica-Bold",
                          color: grade !== null && grade >= 3 ? "#059669" : grade !== null ? "#dc2626" : "#64748b",
                        },
                      ]}
                    >
                      {grade !== null && grade > 0 ? grade.toFixed(2) : "N/A"}
                    </Text>
                    <Text style={[styles.tableCell, { width: "20%", textAlign: "center", color: "#64748b" }]}>
                      {c.averageGrade && c.averageGrade > 0 ? c.averageGrade.toFixed(2) : "N/A"}
                    </Text>
                  </View>
                );
              })
            )}
          </View>

          {/* Sub-tabla 2: Observaciones Disciplinarias del Aprendiz */}
          <Text style={styles.sectionTitle}>Historial Disciplinario del Aprendiz</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: "15%" }]}>Fecha</Text>
              <Text style={[styles.tableHeaderCell, { width: "18%" }]}>Tipo</Text>
              <Text style={[styles.tableHeaderCell, { width: "22%" }]}>Materia</Text>
              <Text style={[styles.tableHeaderCell, { width: "20%" }]}>Docente</Text>
              <Text style={[styles.tableHeaderCell, { width: "25%" }]}>Título / Observación</Text>
            </View>
            {!st.studentRemarks || st.studentRemarks.length === 0 ? (
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { width: "100%", textAlign: "center", color: "#94a3b8" }]}>
                  El aprendiz no registra llamados de atención ni observaciones disciplinarias.
                </Text>
              </View>
            ) : (
              st.studentRemarks.map((rem, rIdx) => (
                <View key={rIdx} style={[styles.tableRow, rIdx % 2 === 1 ? styles.tableRowEven : {}]}>
                  <Text style={[styles.tableCell, { width: "15%", color: "#64748b" }]}>{rem.date}</Text>
                  <Text
                    style={[
                      styles.tableCell,
                      {
                        width: "18%",
                        fontFamily: "Helvetica-Bold",
                        color: rem.type.includes("Atención") ? "#dc2626" : "#2563eb",
                      },
                    ]}
                  >
                    {rem.type}
                  </Text>
                  <Text style={[styles.tableCell, { width: "22%" }]}>{rem.courseTitle}</Text>
                  <Text style={[styles.tableCell, { width: "20%" }]}>{rem.teacherName}</Text>
                  <Text style={[styles.tableCell, { width: "25%" }]}>{rem.title}</Text>
                </View>
              ))
            )}
          </View>

          {/* Sub-tabla 3: Planes de Mejoramiento Asignados */}
          {st.studentPlans && st.studentPlans.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Planes de Mejoramiento Asignados al Aprendiz</Text>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderCell, { width: "15%" }]}>Código Plan</Text>
                  <Text style={[styles.tableHeaderCell, { width: "25%" }]}>Docente Responsable</Text>
                  <Text style={[styles.tableHeaderCell, { width: "15%", textAlign: "center" }]}>Estado</Text>
                  <Text style={[styles.tableHeaderCell, { width: "15%", textAlign: "center" }]}>Fecha Límite</Text>
                  <Text style={[styles.tableHeaderCell, { width: "30%" }]}>Observaciones</Text>
                </View>
                {st.studentPlans.map((plan, pIdx) => (
                  <View key={pIdx} style={[styles.tableRow, pIdx % 2 === 1 ? styles.tableRowEven : {}]}>
                    <Text style={[styles.tableCell, { width: "15%", fontFamily: "Helvetica-Bold", color: "#4338ca" }]}>
                      {plan.planNumber}
                    </Text>
                    <Text style={[styles.tableCell, { width: "25%" }]}>{plan.teacherName}</Text>
                    <Text style={[styles.tableCell, { width: "15%", textAlign: "center", fontFamily: "Helvetica-Bold" }]}>
                      {plan.status}
                    </Text>
                    <Text style={[styles.tableCell, { width: "15%", textAlign: "center", color: "#64748b" }]}>
                      {plan.endDate || "--"}
                    </Text>
                    <Text style={[styles.tableCell, { width: "30%" }]}>{plan.observations || "Sin observaciones"}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          <Text
            style={styles.footer}
            render={({ pageNumber, totalPages }) => footerText(pageNumber, totalPages)}
            fixed
          />
        </Page>
      ))}
    </Document>
  );
};

export async function generateAndDownloadGroupPdf(
  payload: GroupExportPayload,
  filename = `Reporte_Grupo_${payload.groupName.replace(/\s+/g, "_")}.pdf`
) {
  const blob = await pdf(<GroupSchedulePdfDocument payload={payload} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
