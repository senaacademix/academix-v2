import React from "react";
import { pdf, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { DayOfWeek } from "@/generated/prisma/client";
import { ScheduleBuilderData } from "../actions/scheduleBuilderActions";

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
    borderBottomColor: "#2563eb",
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
    color: "#1e3a8a",
    textTransform: "uppercase",
    lineHeight: 1.2,
  },
  subTitle: {
    fontSize: 8,
    color: "#64748b",
    lineHeight: 1.2,
  },
  badge: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: "flex-end",
  },
  badgeText: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#1d4ed8",
  },
  groupHeaderCard: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    padding: 6,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  groupMetaItem: {
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
    backgroundColor: "#1e293b",
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
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 4,
    padding: 4,
    marginBottom: 4,
    flexDirection: "column",
  },
  classTitle: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#166534",
    lineHeight: 1.2,
    marginBottom: 3,
  },
  classMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  classMetaLabel: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: "#15803d",
  },
  classMetaValue: {
    fontSize: 7,
    color: "#166534",
    fontFamily: "Helvetica",
  },
  classTeacherRow: {
    flexDirection: "column",
    marginTop: 1,
    borderTopWidth: 0.5,
    borderTopColor: "#dcfce7",
    paddingTop: 2,
  },
  classTeacherLabel: {
    fontSize: 6,
    color: "#64748b",
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
  },
  classTeacherValue: {
    fontSize: 7,
    color: "#334155",
    fontFamily: "Helvetica-Oblique",
    lineHeight: 1.2,
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
  colCourse: { flex: 4.5, fontSize: 7, lineHeight: 1.2 },
  colHours: { flex: 1.5, textAlign: "center", fontSize: 7, lineHeight: 1.2 },
  colTeacher: { flex: 4, fontSize: 7, lineHeight: 1.2 },
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

interface SchedulePdfDocumentProps {
  schedule: ScheduleBuilderData["schedule"];
  groups: ScheduleBuilderData["groups"];
}

export const SchedulePdfDocument: React.FC<SchedulePdfDocumentProps> = ({
  schedule,
  groups,
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
      {groups.map((group, pageIndex) => {
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

        group.scheduledClasses.forEach((c) => {
          c.schedules.forEach((s) => {
            if (dayClassesMap[s.dayOfWeek]) {
              dayClassesMap[s.dayOfWeek].push({
                title: c.title,
                startTime: s.startTime,
                endTime: s.endTime,
                teacherName: s.teacher?.name || c.teacher?.name || "Sin profesor asignado",
              });
            }
          });
        });

        // Sort classes by startTime for each day
        DAYS_ES.forEach((d) => {
          dayClassesMap[d.key].sort((a, b) => a.startTime.localeCompare(b.startTime));
        });

        return (
          <Page key={group.id} size="A4" orientation="landscape" style={styles.page}>
            {/* Header */}
            <View style={styles.headerContainer}>
              <View style={styles.headerLeft}>
                <Text style={styles.mainTitle}>{schedule.name}</Text>
                <Text style={styles.subTitle}>
                  Horario Académico Oficial • Período: {formatDate(schedule.startDate)} al{" "}
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

            {/* Group Meta Info */}
            <View style={styles.groupHeaderCard}>
              <View style={styles.groupMetaItem}>
                <Text style={styles.metaLabel}>Ficha / Grupo</Text>
                <Text style={styles.metaValue}>{group.name}</Text>
              </View>

              <View style={styles.groupMetaItem}>
                <Text style={styles.metaLabel}>Programa de Formación</Text>
                <Text style={styles.metaValue}>{group.program.name}</Text>
              </View>

              <View style={styles.groupMetaItem}>
                <Text style={styles.metaLabel}>Trimestre / Período</Text>
                <Text style={styles.metaValue}>
                  {group.period?.name || "Sin trimestre asignado"}
                </Text>
              </View>

              <View style={styles.groupMetaItem}>
                <Text style={styles.metaLabel}>Ambiente de Formación</Text>
                <Text style={styles.metaValue}>
                  {group.environment
                    ? `${group.environment.name} (${group.environment.location || "Sede"})`
                    : "No asignado"}
                </Text>
              </View>
            </View>

            {/* 7-Days Weekly Schedule Matrix */}
            <View style={styles.gridTable}>
              {/* Header Row */}
              <View style={styles.gridHeaderRow}>
                {DAYS_ES.map((d) => {
                  const dayConfig = group.daySlotsConfig.find((ds) => ds.dayOfWeek === d.key);
                  return (
                    <View key={d.key} style={{ flex: 1 }}>
                      <Text style={styles.gridHeaderCell}>
                        {d.label}
                        {dayConfig ? `\n(${dayConfig.startTime}-${dayConfig.endTime})` : ""}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* Day Columns */}
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
                          - Sin clase -
                        </Text>
                      ) : (
                        classes.map((item, idx) => (
                          <View key={idx} style={styles.classCard}>
                            <Text style={styles.classTitle}>{item.title}</Text>
                            
                            <View style={styles.classMetaRow}>
                              <Text style={styles.classMetaLabel}>Horario: </Text>
                              <Text style={styles.classMetaValue}>
                                {toFormat12h(item.startTime)} - {toFormat12h(item.endTime)}
                              </Text>
                            </View>

                            <View style={styles.classTeacherRow}>
                              <Text style={styles.classTeacherLabel}>Docente:</Text>
                              <Text style={styles.classTeacherValue}>{item.teacherName}</Text>
                            </View>
                          </View>
                        ))
                      )}
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Summary of Courses / Teachers */}
            <View style={styles.summarySection}>
              <Text style={styles.sectionTitle}>
                Distribución Curricular del Trimestre ({group.trimesterCourses.length} Asignaturas)
              </Text>
              <View style={styles.coursesTable}>
                <View style={[styles.coursesTableRow, styles.coursesTableHeader]}>
                  <Text style={[styles.colCourse, { fontFamily: "Helvetica-Bold" }]}>
                    Materia / Actividad
                  </Text>
                  <Text style={[styles.colHours, { fontFamily: "Helvetica-Bold" }]}>
                    Horas Semanales
                  </Text>
                  <Text style={[styles.colTeacher, { fontFamily: "Helvetica-Bold" }]}>
                    Docente(s) Asignado(s)
                  </Text>
                </View>
                {group.trimesterCourses.map((tc) => {
                  const scheduledMatch = group.scheduledClasses.filter(
                    (c) => c.title.toLowerCase() === tc.title.toLowerCase()
                  );
                  const teachersNames = Array.from(
                    new Set(
                      scheduledMatch
                        .map((c) => c.teacher?.name)
                        .filter(Boolean)
                    )
                  ).join(", ") || "Pendiente por asignar";

                  return (
                    <View key={tc.id} style={styles.coursesTableRow}>
                      <Text style={styles.colCourse}>{tc.title}</Text>
                      <Text style={styles.colHours}>
                        {tc.weeklyHours ? `${tc.weeklyHours}h / sem` : "0h"}
                      </Text>
                      <Text style={styles.colTeacher}>{teachersNames}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text>AcademiX — Sistema de Gestión y Programación Académica</Text>
              <Text>
                Página {pageIndex + 1} de {groups.length} • Generado el{" "}
                {new Date().toLocaleDateString("es-ES")}
              </Text>
            </View>
          </Page>
        );
      })}
    </Document>
  );
};

export async function generateAndDownloadSchedulePdf(
  schedule: ScheduleBuilderData["schedule"],
  groups: ScheduleBuilderData["groups"]
) {
  const blob = await pdf(
    <SchedulePdfDocument schedule={schedule} groups={groups} />
  ).toBlob();

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Horario_${schedule.name.replace(/[^a-zA-Z0-9]/g, "_")}_${
    groups.length === 1 ? groups[0].name.replace(/[^a-zA-Z0-9]/g, "_") : "Fichas"
  }.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
