import React from "react";
import { pdf, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { DayOfWeek } from "@/generated/prisma/client";
import { ScheduleBuilderData } from "../actions/scheduleBuilderActions";
import { getCleanTeacherName } from "./teacherNameFormatter";

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
    padding: 24,
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
    fontSize: 15,
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
  teacherHeaderCard: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    padding: 6,
    marginBottom: 8,
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
  gridHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#1e1b4b",
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
  },
  gridHeaderCell: {
    paddingVertical: 4,
    paddingHorizontal: 2,
    textAlign: "center",
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    lineHeight: 1.2,
  },
  gridDayColumn: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: "#e2e8f0",
    padding: 3,
    minHeight: 130,
    backgroundColor: "#ffffff",
  },
  classCard: {
    backgroundColor: "#eef2ff",
    borderWidth: 1,
    borderColor: "#c7d2fe",
    borderRadius: 4,
    padding: 4,
    marginBottom: 4,
    flexDirection: "column",
  },
  classTitle: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#3730a3",
    lineHeight: 1.2,
    marginBottom: 2,
  },
  classGroup: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#1e1b4b",
  },
  classTime: {
    fontSize: 6.5,
    color: "#4338ca",
    marginTop: 1,
  },
  classEnv: {
    fontSize: 6.5,
    color: "#64748b",
    fontFamily: "Helvetica-Oblique",
    marginTop: 1,
  },
  // Summary table
  summarySection: {
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#334155",
    marginBottom: 3,
    textTransform: "uppercase",
  },
  coursesTable: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
  },
  coursesTableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingVertical: 2.5,
    paddingHorizontal: 5,
  },
  coursesTableHeader: {
    backgroundColor: "#f8fafc",
    fontFamily: "Helvetica-Bold",
    color: "#475569",
  },
  colGroup: { flex: 2.5, fontSize: 7, lineHeight: 1.2 },
  colCourse: { flex: 4.5, fontSize: 7, lineHeight: 1.2 },
  colHours: { flex: 1.5, textAlign: "center", fontSize: 7, lineHeight: 1.2 },
  colEnv: { flex: 2.5, fontSize: 7, lineHeight: 1.2 },
  footer: {
    position: "absolute",
    bottom: 12,
    left: 24,
    right: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 4,
    fontSize: 6.5,
    color: "#94a3b8",
  },
});

export interface TeacherExportData {
  id: string;
  name: string;
  email: string | null;
  totalWeeklyHours: number;
  classes: Array<{
    groupName: string;
    programName: string;
    courseTitle: string;
    environmentName?: string;
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
    durationHours: number;
  }>;
}

export function extractTeachersExportData(
  teachers: ScheduleBuilderData["teachers"],
  groups: ScheduleBuilderData["groups"]
): TeacherExportData[] {
  const teacherMap = new Map<string, TeacherExportData>();

  // Initialize teachers with active classes
  teachers.forEach((t) => {
    teacherMap.set(t.id, {
      id: t.id,
      name: getCleanTeacherName(t.name),
      email: t.email,
      totalWeeklyHours: 0,
      classes: [],
    });
  });

  groups.forEach((g) => {
    g.scheduledClasses.forEach((c) => {
      c.schedules.forEach((s) => {
        const slotTeacher = s.teacher || c.teacher;
        if (slotTeacher) {
          const tData = teacherMap.get(slotTeacher.id);
          if (tData) {
            const [sh, sm] = s.startTime.split(":").map(Number);
            const [eh, em] = s.endTime.split(":").map(Number);
            const duration = (eh * 60 + em - (sh * 60 + sm)) / 60;

            tData.totalWeeklyHours += duration;
            tData.classes.push({
              groupName: g.name,
              programName: g.program.name,
              courseTitle: c.title,
              environmentName: g.environment ? `${g.environment.name}` : "No asignado",
              dayOfWeek: s.dayOfWeek,
              startTime: s.startTime,
              endTime: s.endTime,
              durationHours: duration,
            });
          }
        }
      });
    });
  });

  // Filter teachers that have at least 1 class scheduled
  return Array.from(teacherMap.values()).filter((t) => t.classes.length > 0);
}

interface TeacherSchedulePdfDocumentProps {
  schedule: ScheduleBuilderData["schedule"];
  teachers: TeacherExportData[];
}

export const TeacherSchedulePdfDocument: React.FC<TeacherSchedulePdfDocumentProps> = ({
  schedule,
  teachers,
}) => {
  const formatDate = (d: string) => {
    if (!d) return "";
    return new Date(d).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Document>
      {teachers.map((teacher, pageIndex) => {
        // Group classes by day
        const dayClassesMap: Record<DayOfWeek, Array<any>> = {
          MONDAY: [],
          TUESDAY: [],
          WEDNESDAY: [],
          THURSDAY: [],
          FRIDAY: [],
          SATURDAY: [],
          SUNDAY: [],
        };

        teacher.classes.forEach((c) => {
          dayClassesMap[c.dayOfWeek]?.push(c);
        });

        DAYS_ES.forEach((d) => {
          dayClassesMap[d.key].sort((a, b) => a.startTime.localeCompare(b.startTime));
        });

        const distinctGroups = Array.from(new Set(teacher.classes.map((c) => c.groupName))).join(", ");

        return (
          <Page key={teacher.id} size="A4" orientation="landscape" style={styles.page}>
            {/* Header */}
            <View style={styles.headerContainer}>
              <View style={styles.headerLeft}>
                <Text style={styles.mainTitle}>{schedule.name} — HORARIO DOCENTE</Text>
                <Text style={styles.subTitle}>
                  Planilla Oficial de Carga Académica Semanal • Período: {formatDate(schedule.startDate)} al{" "}
                  {formatDate(schedule.endDate)}
                </Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {schedule.isActive ? "VIGENTE" : "FUERA DE VIGENCIA"} •{" "}
                  {schedule.isPublished ? "PÚBLICO" : "BORRADOR"}
                </Text>
              </View>
            </View>

            {/* Teacher Meta Info Card */}
            <View style={styles.teacherHeaderCard}>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Docente / Instructor</Text>
                <Text style={styles.metaValue}>{teacher.name}</Text>
              </View>

              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Correo Electrónico</Text>
                <Text style={styles.metaValue}>{teacher.email || "No registrado"}</Text>
              </View>

              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Carga Horaria Semanal</Text>
                <Text style={styles.metaValue}>{teacher.totalWeeklyHours} horas / semana</Text>
              </View>

              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Fichas Asignadas</Text>
                <Text style={styles.metaValue}>{distinctGroups || "Ninguna"}</Text>
              </View>
            </View>

            {/* 7-Days Weekly Schedule Matrix */}
            <View style={styles.gridTable}>
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
                            fontSize: 7,
                            color: "#94a3b8",
                            textAlign: "center",
                            marginTop: 30,
                            fontFamily: "Helvetica-Oblique",
                          }}
                        >
                          - Libre -
                        </Text>
                      ) : (
                        classes.map((item, idx) => (
                          <View key={idx} style={styles.classCard}>
                            <Text style={styles.classGroup}>Ficha {item.groupName}</Text>
                            <Text style={styles.classTitle}>{item.courseTitle}</Text>
                            <Text style={styles.classTime}>
                              Horario: {toFormat12h(item.startTime)} - {toFormat12h(item.endTime)}
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

            {/* Curricular Table */}
            <View style={styles.summarySection}>
              <Text style={styles.sectionTitle}>
                Detalle de Carga Académica ({teacher.classes.length} Bloques de Clase)
              </Text>
              <View style={styles.coursesTable}>
                <View style={[styles.coursesTableRow, styles.coursesTableHeader]}>
                  <Text style={[styles.colGroup, { fontFamily: "Helvetica-Bold" }]}>Ficha / Grupo</Text>
                  <Text style={[styles.colCourse, { fontFamily: "Helvetica-Bold" }]}>Materia / Actividad</Text>
                  <Text style={[styles.colHours, { fontFamily: "Helvetica-Bold" }]}>Horas / Sesión</Text>
                  <Text style={[styles.colEnv, { fontFamily: "Helvetica-Bold" }]}>Ambiente Asignado</Text>
                </View>
                {teacher.classes.map((c, idx) => (
                  <View key={idx} style={styles.coursesTableRow}>
                    <Text style={styles.colGroup}>
                      {c.groupName} ({c.programName})
                    </Text>
                    <Text style={styles.colCourse}>{c.courseTitle}</Text>
                    <Text style={styles.colHours}>
                      {c.durationHours}h ({toFormat12h(c.startTime)}-{toFormat12h(c.endTime)})
                    </Text>
                    <Text style={styles.colEnv}>{c.environmentName}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text>AcademiX — Planilla Oficial de Carga Docente</Text>
              <Text>
                Página {pageIndex + 1} de {teachers.length} • Generado el{" "}
                {new Date().toLocaleDateString("es-ES")}
              </Text>
            </View>
          </Page>
        );
      })}
    </Document>
  );
};

export async function generateAndDownloadTeacherSchedulePdf(
  schedule: ScheduleBuilderData["schedule"],
  teachersData: TeacherExportData[]
) {
  const blob = await pdf(
    <TeacherSchedulePdfDocument schedule={schedule} teachers={teachersData} />
  ).toBlob();

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Horario_Docentes_${schedule.name.replace(/[^a-zA-Z0-9]/g, "_")}_${
    teachersData.length === 1 ? teachersData[0].name.replace(/[^a-zA-Z0-9]/g, "_") : "Completo"
  }.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
