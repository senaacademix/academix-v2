import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import { DayOfWeek } from "@/generated/prisma/client";
import { ScheduleBuilderData } from "../actions/scheduleBuilderActions";
import { getCleanTeacherName } from "./teacherNameFormatter";

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

const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontSize: 9,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
    color: "#1e293b",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "#059669",
    paddingBottom: 10,
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: "column",
  },
  institutionTitle: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#059669",
    letterSpacing: 0.5,
  },
  scheduleSubtitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#334155",
    marginTop: 2,
  },
  scheduleDates: {
    fontSize: 8,
    color: "#64748b",
    marginTop: 2,
  },
  badgeContainer: {
    flexDirection: "column",
    alignItems: "flex-end",
  },
  badge: {
    backgroundColor: "#059669",
    color: "#ffffff",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
  },
  envCard: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    borderRadius: 6,
    padding: 8,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  envName: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#065f46",
  },
  envMeta: {
    fontSize: 8,
    color: "#047857",
    marginTop: 1,
  },
  envHours: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#065f46",
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 12,
  },
  dayCol: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: "#e2e8f0",
    flexDirection: "column",
  },
  dayColLast: {
    flex: 1,
    flexDirection: "column",
  },
  dayHeader: {
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    paddingVertical: 4,
    paddingHorizontal: 2,
    textAlign: "center",
  },
  dayHeaderText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#334155",
    textAlign: "center",
  },
  dayHeaderSub: {
    fontSize: 6.5,
    color: "#64748b",
    textAlign: "center",
    marginTop: 1,
  },
  dayBody: {
    padding: 3,
    minHeight: 150,
    backgroundColor: "#ffffff",
    flexDirection: "column",
    gap: 3,
  },
  classCard: {
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    borderRadius: 3,
    padding: 3,
    marginBottom: 3,
  },
  classGroupName: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#065f46",
  },
  classTitle: {
    fontSize: 7,
    color: "#1e293b",
    fontFamily: "Helvetica-Bold",
    marginTop: 1,
  },
  classTeacher: {
    fontSize: 6.5,
    color: "#047857",
    marginTop: 1,
  },
  classTime: {
    fontSize: 6.5,
    color: "#475569",
    marginTop: 1,
  },
  freeDayText: {
    fontSize: 7,
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 20,
    fontStyle: "italic",
  },
  table: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 10,
  },
  tableRowHeader: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingVertical: 3.5,
    paddingHorizontal: 6,
  },
  colGroup: { width: "18%", fontSize: 7.5 },
  colCourse: { width: "35%", fontSize: 7.5 },
  colTeacher: { width: "25%", fontSize: 7.5 },
  colDayTime: { width: "22%", fontSize: 7.5 },
  th: {
    fontFamily: "Helvetica-Bold",
    color: "#475569",
    fontSize: 7.5,
  },
  footer: {
    position: "absolute",
    bottom: 15,
    left: 24,
    right: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 5,
  },
  footerText: {
    fontSize: 7,
    color: "#94a3b8",
  },
});

export interface EnvironmentExportData {
  environment: ScheduleBuilderData["environments"][0];
  totalWeeklyHours: number;
  totalPeriodHours: number;
  totalWeeks: number;
  distinctGroups: string[];
  classesByDay: Record<
    DayOfWeek,
    Array<{
      groupName: string;
      courseTitle: string;
      teacherName: string;
      startTime: string;
      endTime: string;
      durationHours: number;
    }>
  >;
  allAssignments: Array<{
    groupName: string;
    courseTitle: string;
    teacherName: string;
    dayLabel: string;
    startTime: string;
    endTime: string;
    durationHours: number;
  }>;
}

export function extractEnvironmentsExportData(
  environments: ScheduleBuilderData["environments"],
  groups: ScheduleBuilderData["groups"],
  startDate?: string | Date,
  endDate?: string | Date
): EnvironmentExportData[] {
  const jsDayToEnum: Record<number, DayOfWeek> = {
    0: "SUNDAY",
    1: "MONDAY",
    2: "TUESDAY",
    3: "WEDNESDAY",
    4: "THURSDAY",
    5: "FRIDAY",
    6: "SATURDAY",
  };

  return environments.map((env) => {
    const classesByDay: Record<
      DayOfWeek,
      Array<{
        groupName: string;
        courseTitle: string;
        teacherName: string;
        startTime: string;
        endTime: string;
        durationHours: number;
      }>
    > = {
      MONDAY: [],
      TUESDAY: [],
      WEDNESDAY: [],
      THURSDAY: [],
      FRIDAY: [],
      SATURDAY: [],
      SUNDAY: [],
    };

    const distinctGroups = new Set<string>();
    const allAssignments: EnvironmentExportData["allAssignments"] = [];
    let weeklyHours = 0;

    groups.forEach((g) => {
      if (g.environment?.id === env.id) {
        g.scheduledClasses.forEach((c) => {
          c.schedules.forEach((s) => {
            const [sh, sm] = s.startTime.split(":").map(Number);
            const [eh, em] = s.endTime.split(":").map(Number);
            const dur = (eh * 60 + em - (sh * 60 + sm)) / 60;
            weeklyHours += dur;
            distinctGroups.add(g.name);

            const dayObj = DAYS_ES.find((d) => d.key === s.dayOfWeek);
            const tName = getCleanTeacherName(c.teacher?.name) || "Sin docente";

            classesByDay[s.dayOfWeek]?.push({
              groupName: g.name,
              courseTitle: c.title,
              teacherName: tName,
              startTime: s.startTime,
              endTime: s.endTime,
              durationHours: dur,
            });

            allAssignments.push({
              groupName: g.name,
              courseTitle: c.title,
              teacherName: tName,
              dayLabel: dayObj ? dayObj.label : s.dayOfWeek,
              startTime: s.startTime,
              endTime: s.endTime,
              durationHours: dur,
            });
          });
        });
      }
    });

    // Sort classes by startTime
    DAYS_ES.forEach((d) => {
      classesByDay[d.key].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });

    // Calculate total period hours
    let periodHours = 0;
    let weeks = 10;
    if (startDate && endDate) {
      const sDate = new Date(startDate);
      const eDate = new Date(endDate);
      if (!isNaN(sDate.getTime()) && !isNaN(eDate.getTime()) && sDate <= eDate) {
        const cur = new Date(sDate);
        let daysCount = 0;
        while (cur <= eDate) {
          daysCount++;
          const dayEnum = jsDayToEnum[cur.getUTCDay()];
          const daySum = (classesByDay[dayEnum] || []).reduce((acc, c) => acc + c.durationHours, 0);
          periodHours += daySum;
          cur.setUTCDate(cur.getUTCDate() + 1);
        }
        weeks = Math.max(Math.round((daysCount / 7) * 10) / 10, 1);
      }
    } else {
      periodHours = weeklyHours * 10;
    }

    return {
      environment: env,
      totalWeeklyHours: Math.round(weeklyHours * 10) / 10,
      totalPeriodHours: Math.round(periodHours * 10) / 10,
      totalWeeks: weeks,
      distinctGroups: Array.from(distinctGroups),
      classesByDay,
      allAssignments,
    };
  });
}

export function EnvironmentSchedulePdfDocument({
  schedule,
  environmentsData,
}: {
  schedule: ScheduleBuilderData["schedule"];
  environmentsData: EnvironmentExportData[];
}) {
  return (
    <Document title={`Matriz_Ambientes_${schedule.name}`} author="Academix">
      {environmentsData.map((data) => (
        <Page key={data.environment.id} size="A4" orientation="landscape" style={styles.page}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.institutionTitle}>ACADEMIX - GESTIÓN DE HORARIOS</Text>
              <Text style={styles.scheduleSubtitle}>{schedule.name} • MATRIZ DE OCUPACIÓN DE AMBIENTE</Text>
              <Text style={styles.scheduleDates}>
                Vigencia: {formatDate(schedule.startDate)} hasta {formatDate(schedule.endDate)}
              </Text>
            </View>
            <View style={styles.badgeContainer}>
              <Text style={styles.badge}>AMBIENTE DE APRENDIZAJE</Text>
            </View>
          </View>

          {/* Environment Card */}
          <View style={styles.envCard}>
            <View>
              <Text style={styles.envName}>{data.environment.name}</Text>
              <Text style={styles.envMeta}>
                Ubicación: {data.environment.location || "Sede Principal"} • Capacidad: {data.environment.capacity || "N/A"} aprendices • Fichas atendidas: {data.distinctGroups.length}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.envHours}>{data.totalWeeklyHours} Horas / Semana</Text>
              <Text style={{ fontSize: 8, color: "#065f46", marginTop: 1 }}>
                {data.totalPeriodHours}h Totales Período ({data.totalWeeks} sem)
              </Text>
            </View>
          </View>

          {/* Weekly Matrix Grid */}
          <Text style={styles.sectionTitle}>Distribución Semanal de Ocupación</Text>
          <View style={styles.grid}>
            {DAYS_ES.map((day, idx) => {
              const isLast = idx === DAYS_ES.length - 1;
              const dayClasses = data.classesByDay[day.key] || [];

              return (
                <View key={day.key} style={isLast ? styles.dayColLast : styles.dayCol}>
                  <View style={styles.dayHeader}>
                    <Text style={styles.dayHeaderText}>{day.label}</Text>
                    <Text style={styles.dayHeaderSub}>
                      {dayClasses.length} {dayClasses.length === 1 ? "sesión" : "sesiones"}
                    </Text>
                  </View>
                  <View style={styles.dayBody}>
                    {dayClasses.length === 0 ? (
                      <Text style={styles.freeDayText}>Disponible</Text>
                    ) : (
                      dayClasses.map((c, cIdx) => (
                        <View key={cIdx} style={styles.classCard}>
                          <Text style={styles.classGroupName}>Ficha {c.groupName}</Text>
                          <Text style={styles.classTitle}>{c.courseTitle}</Text>
                          <Text style={styles.classTeacher}>{c.teacherName}</Text>
                          <Text style={styles.classTime}>
                            {toFormat12h(c.startTime)} - {toFormat12h(c.endTime)} ({c.durationHours}h)
                          </Text>
                        </View>
                      ))
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Summary Table */}
          <Text style={styles.sectionTitle}>Detalle de Cursos y Sesiones Asignadas</Text>
          <View style={styles.table}>
            <View style={styles.tableRowHeader}>
              <Text style={[styles.colGroup, styles.th]}>Ficha</Text>
              <Text style={[styles.colCourse, styles.th]}>Asignatura / Competencia</Text>
              <Text style={[styles.colTeacher, styles.th]}>Docente Responsable</Text>
              <Text style={[styles.colDayTime, styles.th]}>Día y Horario</Text>
            </View>
            {data.allAssignments.length === 0 ? (
              <View style={styles.tableRow}>
                <Text style={{ fontSize: 7.5, color: "#94a3b8", fontStyle: "italic" }}>
                  No hay clases asignadas a este ambiente.
                </Text>
              </View>
            ) : (
              data.allAssignments.map((item, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={styles.colGroup}>Ficha {item.groupName}</Text>
                  <Text style={styles.colCourse}>{item.courseTitle}</Text>
                  <Text style={styles.colTeacher}>{item.teacherName}</Text>
                  <Text style={styles.colDayTime}>
                    {item.dayLabel} {toFormat12h(item.startTime)} - {toFormat12h(item.endTime)} ({item.durationHours}h)
                  </Text>
                </View>
              ))
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Generado automáticamente por Academix • {new Date().toLocaleDateString("es-CO")}
            </Text>
            <Text style={styles.footerText}>Documento Oficial de Ocupación de Ambientes</Text>
          </View>
        </Page>
      ))}
    </Document>
  );
}

export async function exportEnvironmentsToPdf(
  schedule: ScheduleBuilderData["schedule"],
  environmentsData: EnvironmentExportData[],
  filename = `Horarios_Ambientes_${schedule.name}.pdf`
) {
  const blob = await pdf(
    <EnvironmentSchedulePdfDocument schedule={schedule} environmentsData={environmentsData} />
  ).toBlob();

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
