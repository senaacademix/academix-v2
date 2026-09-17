import React from "react";
import { pdf, Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { formatCalendarDate } from "@/lib/dateUtils";

export interface CurriculumPdfCourse {
  id: string;
  title: string;
  description?: string | null;
  weeklyHours?: number | null;
  badge?: string | null;
  badgeColor?: string | null;
}

export interface CurriculumPdfTimeline {
  id: string;
  name: string;
  description?: string | null;
  isDefault?: boolean;
}

export interface CurriculumPdfPeriod {
  id: string;
  name: string;
  description?: string | null;
  esEspecial?: boolean;
  timelineId?: string | null;
  timeline?: { id: string; name: string } | null;
  courses: CurriculumPdfCourse[];
}

export interface CurriculumPdfProgram {
  id: string;
  name: string;
  description?: string | null;
  timelines?: CurriculumPdfTimeline[];
  periods: CurriculumPdfPeriod[];
  groups?: Array<{ id: string; name: string }>;
  environments?: Array<{ id: string; name: string }>;
}

export interface CurriculumExportOptions {
  institutionTag?: string;
  mainTitle?: string;
  programName?: string;
  programDescription?: string;
  badgeText?: string;
  issueDate?: string;
  includeDetailedCatalogue?: boolean;
  logoUrl?: string;
  centerLogo?: boolean;
  selectedTimelineIds?: string[];
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 22,
    paddingBottom: 28,
    paddingHorizontal: 24,
    backgroundColor: "#ffffff",
    fontFamily: "Helvetica",
    fontSize: 8,
    color: "#1e293b",
  },
  // Header Logo Styles
  logoHeaderCentered: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  headerLogoCentered: {
    height: 42,
    maxWidth: 180,
    objectFit: "contain",
  },
  headerLeftWithLogo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    maxWidth: "75%",
  },
  headerLogoInline: {
    height: 38,
    maxWidth: 130,
    objectFit: "contain",
  },
  headerTitles: {
    flexDirection: "column",
    gap: 2,
  },
  // Centered Header Container Styles
  headerContainerCentered: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 2,
    borderBottomColor: "#1e40af",
    paddingBottom: 8,
    marginBottom: 8,
    width: "100%",
  },
  headerTitlesCentered: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    gap: 2,
    marginBottom: 3,
  },
  institutionTagCentered: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#2563eb",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    textAlign: "center",
  },
  mainTitleCentered: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    letterSpacing: -0.2,
    textAlign: "center",
  },
  subTitleCentered: {
    fontSize: 8,
    color: "#475569",
    marginTop: 1,
    textAlign: "center",
  },
  badgeHeaderCenteredRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 3,
  },
  // Header
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: "#1e40af",
    paddingBottom: 8,
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: "column",
    gap: 2,
    maxWidth: "75%",
  },
  institutionTag: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#2563eb",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  mainTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    letterSpacing: -0.2,
  },
  subTitle: {
    fontSize: 8,
    color: "#475569",
    marginTop: 1,
  },
  badgeHeader: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: "flex-end",
  },
  badgeHeaderText: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#1d4ed8",
    textTransform: "uppercase",
  },
  badgeHeaderSub: {
    fontSize: 6.5,
    color: "#64748b",
    marginTop: 2,
  },
  // Summary Stats Bar
  statsBar: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 5,
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginBottom: 10,
    justifyContent: "space-between",
  },
  statItem: {
    flexDirection: "column",
    gap: 1,
    flex: 1,
  },
  statLabel: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    color: "#64748b",
    textTransform: "uppercase",
  },
  statValue: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
  },
  statSub: {
    fontSize: 6.5,
    color: "#94a3b8",
  },
  // Section Titles
  sectionTitleBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1e3a8a",
    paddingVertical: 3.5,
    paddingHorizontal: 8,
    borderRadius: 3,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: 7,
    color: "#bfdbfe",
  },
  // Period Columns Grid
  periodsGrid: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 8,
  },
  periodColumn: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 4,
    overflow: "hidden",
  },
  periodColumnHeader: {
    backgroundColor: "#f1f5f9",
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    paddingVertical: 4,
    paddingHorizontal: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  periodColumnTitle: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
  },
  periodSpecialTag: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    color: "#b45309",
    backgroundColor: "#fef3c7",
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    borderRadius: 2,
  },
  periodCoursesList: {
    padding: 4,
    gap: 3.5,
    minHeight: 180,
  },
  courseCard: {
    backgroundColor: "#f8fafc",
    borderWidth: 0.75,
    borderColor: "#e2e8f0",
    borderRadius: 3,
    padding: 4,
    flexDirection: "column",
    gap: 2,
  },
  courseCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 2,
  },
  courseCardTitle: {
    fontSize: 7.2,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
    flex: 1,
    lineHeight: 1.15,
  },
  courseHoursChip: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: "#1e40af",
    backgroundColor: "#eff6ff",
    borderWidth: 0.5,
    borderColor: "#bfdbfe",
    borderRadius: 2.5,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  badgePillDefault: {
    fontSize: 5.5,
    fontFamily: "Helvetica-Bold",
    paddingHorizontal: 3.5,
    paddingVertical: 1,
    borderRadius: 2,
    alignSelf: "flex-start",
    backgroundColor: "#f1f5f9",
    color: "#475569",
    borderWidth: 0.5,
    borderColor: "#cbd5e1",
  },
  badgePillTecnica: {
    fontSize: 5.5,
    fontFamily: "Helvetica-Bold",
    paddingHorizontal: 3.5,
    paddingVertical: 1,
    borderRadius: 2,
    alignSelf: "flex-start",
    backgroundColor: "#f0fdf4",
    color: "#15803d",
    borderWidth: 0.5,
    borderColor: "#bbf7d0",
  },
  badgePillTransversal: {
    fontSize: 5.5,
    fontFamily: "Helvetica-Bold",
    paddingHorizontal: 3.5,
    paddingVertical: 1,
    borderRadius: 2,
    alignSelf: "flex-start",
    backgroundColor: "#faf5ff",
    color: "#7e22ce",
    borderWidth: 0.5,
    borderColor: "#e9d5ff",
  },
  periodColumnFooter: {
    backgroundColor: "#f8fafc",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingVertical: 3.5,
    paddingHorizontal: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  periodFooterText: {
    fontSize: 6.5,
    color: "#64748b",
  },
  periodFooterHours: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
  },
  // Table for Detail Page
  detailTable: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 10,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#1e3a8a",
    paddingVertical: 4.5,
    paddingHorizontal: 6,
  },
  tableHeaderCell: {
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    fontSize: 7,
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    borderTopColor: "#e2e8f0",
    paddingVertical: 4.5,
    paddingHorizontal: 6,
  },
  tableRowEven: {
    backgroundColor: "#ffffff",
  },
  tableRowOdd: {
    backgroundColor: "#f8fafc",
  },
  colPeriod: {
    width: "14%",
  },
  colTitle: {
    width: "24%",
  },
  colType: {
    width: "13%",
  },
  colHours: {
    width: "9%",
    textAlign: "center",
  },
  colDesc: {
    width: "40%",
  },
  cellText: {
    fontSize: 7,
    color: "#1e293b",
    lineHeight: 1.25,
  },
  cellBold: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    lineHeight: 1.25,
  },
  cellMuted: {
    fontSize: 6.5,
    color: "#64748b",
    fontStyle: "italic",
    lineHeight: 1.25,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 12,
    left: 24,
    right: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 0.5,
    borderTopColor: "#cbd5e1",
    paddingTop: 4,
    fontSize: 6.5,
    color: "#94a3b8",
  },
});

function getBadgeStyle(badge?: string | null) {
  if (!badge) return styles.badgePillDefault;
  const b = badge.toLowerCase();
  if (b.includes("téc") || b.includes("tec")) return styles.badgePillTecnica;
  if (b.includes("trans")) return styles.badgePillTransversal;
  return styles.badgePillDefault;
}

export const CurriculumPdfDocument: React.FC<{
  program: CurriculumPdfProgram;
  options?: CurriculumExportOptions;
}> = ({ program, options }) => {
  const selectedTimelineIds = options?.selectedTimelineIds;

  const defaultTimeline = program.timelines?.find((t) => t.isDefault) || program.timelines?.[0];

  const rawPeriods = program.periods || [];

  // Filter periods by selected timeline(s)
  const timelineFilteredPeriods = (selectedTimelineIds && selectedTimelineIds.length > 0)
    ? rawPeriods.filter((p) => {
        const pTimelineId = p.timelineId || p.timeline?.id || defaultTimeline?.id;
        return pTimelineId ? selectedTimelineIds.includes(pTimelineId) : true;
      })
    : rawPeriods;

  // Sort periods by timeline order, then by native order
  const timelineOrderMap = new Map<string, number>();
  (program.timelines || []).forEach((tl, idx) => {
    timelineOrderMap.set(tl.id, idx);
  });

  const periods = [...timelineFilteredPeriods].sort((a, b) => {
    const tlA = a.timelineId || a.timeline?.id || defaultTimeline?.id || "";
    const tlB = b.timelineId || b.timeline?.id || defaultTimeline?.id || "";
    const orderA = timelineOrderMap.get(tlA) ?? 999;
    const orderB = timelineOrderMap.get(tlB) ?? 999;
    if (orderA !== orderB) return orderA - orderB;
    return 0;
  });

  const selectedTimelinesList = (program.timelines || []).filter((t) =>
    selectedTimelineIds && selectedTimelineIds.length > 0 ? selectedTimelineIds.includes(t.id) : true
  );

  const allCourses = periods.flatMap((p) =>
    (p.courses || []).map((c) => ({
      ...c,
      periodName: p.name,
      timelineName: p.timeline?.name || program.timelines?.find((t) => t.id === p.timelineId)?.name || null,
    }))
  );

  const totalWeeklyHours = allCourses.reduce((sum, c) => sum + (c.weeklyHours || 0), 0);
  const technicalHours = allCourses
    .filter((c) => {
      const b = (c.badge || "").toLowerCase();
      return b.includes("téc") || b.includes("tec");
    })
    .reduce((sum, c) => sum + (c.weeklyHours || 0), 0);
  const transversalHours = allCourses
    .filter((c) => (c.badge || "").toLowerCase().includes("trans"))
    .reduce((sum, c) => sum + (c.weeklyHours || 0), 0);

  // Group periods into chunks of 4 per visual page
  const CHUNK_SIZE = 4;
  const periodChunks: CurriculumPdfPeriod[][] = [];
  if (periods.length === 0) {
    periodChunks.push([]);
  } else {
    for (let i = 0; i < periods.length; i += CHUNK_SIZE) {
      periodChunks.push(periods.slice(i, i + CHUNK_SIZE));
    }
  }

  const institutionTag =
    options?.institutionTag?.trim() || "AcademiX • Sistema Institucional de Gestión y Programación Académica";
  const progName = options?.programName?.trim() || program.name;
  const mainTitle =
    options?.mainTitle?.trim() || `MALLA CURRICULAR Y PLAN DE FORMACIÓN: ${progName.toUpperCase()}`;
  const progDesc =
    options?.programDescription !== undefined
      ? options.programDescription
      : program.description || "Plan de estudios y estructura formativa académica por periodos y competencias.";
  const badgeText = options?.badgeText?.trim() || "Plan de Estudios Oficial";
  const currentDateStr = options?.issueDate?.trim() || formatCalendarDate(new Date(), "dd 'de' MMMM, yyyy");
  const includeDetailed = options?.includeDetailedCatalogue ?? true;
  const rawLogoUrl = options?.logoUrl?.trim() || "";
  const hasLogo = rawLogoUrl.length > 0;
  const centerLogo = options?.centerLogo ?? false;

  return (
    <Document>
      {/* ─── PÁGINA(S) DE MALLA SINTÉTICA (COLUMNAS DE PERIODOS) ─── */}
      {periodChunks.map((chunk, chunkIdx) => (
        <Page key={`grid-page-${chunkIdx}`} size="A4" orientation="landscape" style={styles.page}>
          {/* Header */}
          {hasLogo && centerLogo && (
            <View style={styles.logoHeaderCentered}>
              <Image src={rawLogoUrl} style={styles.headerLogoCentered} />
            </View>
          )}
          <View style={centerLogo ? styles.headerContainerCentered : styles.headerContainer}>
            <View style={centerLogo ? styles.headerTitlesCentered : (hasLogo ? styles.headerLeftWithLogo : styles.headerLeft)}>
              {hasLogo && !centerLogo && (
                <Image src={rawLogoUrl} style={styles.headerLogoInline} />
              )}
              <View style={styles.headerTitles}>
                <Text style={centerLogo ? styles.institutionTagCentered : styles.institutionTag}>
                  {institutionTag}
                </Text>
                <Text style={centerLogo ? styles.mainTitleCentered : styles.mainTitle}>
                  {mainTitle}
                </Text>
                {progDesc ? (
                  <Text style={centerLogo ? styles.subTitleCentered : styles.subTitle}>
                    {progDesc}
                  </Text>
                ) : null}
              </View>
            </View>
            <View style={centerLogo ? styles.badgeHeaderCenteredRow : styles.badgeHeader}>
              <Text style={styles.badgeHeaderText}>{badgeText}</Text>
              <Text style={styles.badgeHeaderSub}>Emisión: {currentDateStr}</Text>
            </View>
          </View>

          {/* Resumen de Métricas (Solo en la primera página) */}
          {chunkIdx === 0 && (
            <View style={styles.statsBar}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Periodos y Líneas</Text>
                <Text style={styles.statValue}>
                  {periods.length} {periods.length === 1 ? "Periodo" : "Periodos"}
                </Text>
                <Text style={styles.statSub}>
                  {selectedTimelinesList.length > 0
                    ? `${selectedTimelinesList.length} ${selectedTimelinesList.length === 1 ? "Línea Seleccionada" : "Líneas Seleccionadas"}`
                    : "Todas las líneas"}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Materias Curriculares</Text>
                <Text style={styles.statValue}>{allCourses.length} Asignaturas</Text>
                <Text style={styles.statSub}>Estructura considerada</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Carga Horaria Semanal</Text>
                <Text style={styles.statValue}>{totalWeeklyHours} h / sem</Text>
                <Text style={styles.statSub}>Total acumulado de materias</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Componentes Formativos</Text>
                <Text style={styles.statValue}>
                  {technicalHours}h Técnica • {transversalHours}h Transv.
                </Text>
                <Text style={styles.statSub}>Distribución técnica / transversal</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Fichas y Ambientes</Text>
                <Text style={styles.statValue}>
                  {(program.groups || []).length} Fichas • {(program.environments || []).length} Ambientes
                </Text>
                <Text style={styles.statSub}>Recursos asignados al programa</Text>
              </View>
            </View>
          )}

          {/* Título de Sección */}
          <View style={styles.sectionTitleBox}>
            <Text style={styles.sectionTitle}>
              ESTRUCTURA DE PERIODOS Y ASIGNATURAS{" "}
              {periodChunks.length > 1
                ? `(BLOQUE ${chunkIdx + 1} DE ${periodChunks.length})`
                : ""}
            </Text>
            <Text style={styles.sectionSubtitle}>
              {chunk.length} Periodos • {chunk.reduce((s, p) => s + (p.courses?.length || 0), 0)} Materias
            </Text>
          </View>

          {/* Grid de Columnas por Periodo */}
          <View style={styles.periodsGrid}>
            {chunk.map((p) => {
              const pCourses = p.courses || [];
              const pTotalHours = pCourses.reduce((sum, c) => sum + (c.weeklyHours || 0), 0);

              return (
                <View key={p.id} style={styles.periodColumn}>
                  {/* Period Header */}
                  <View style={styles.periodColumnHeader}>
                    <View style={{ flexDirection: "column", gap: 1, maxWidth: "90%" }}>
                      <Text style={styles.periodColumnTitle}>{p.name}</Text>
                      {(() => {
                        const tName = p.timeline?.name || program.timelines?.find((t) => t.id === p.timelineId)?.name;
                        if (!tName) return null;
                        return (
                          <Text style={{ fontSize: 6, color: "#1d4ed8", fontFamily: "Helvetica-Bold" }}>
                            {tName}
                          </Text>
                        );
                      })()}
                    </View>
                  </View>

                  {/* Courses inside this Period */}
                  <View style={styles.periodCoursesList}>
                    {pCourses.length === 0 ? (
                      <Text style={styles.cellMuted}>Sin materias asignadas aún.</Text>
                    ) : (
                      pCourses.map((c) => (
                        <View key={c.id} style={styles.courseCard}>
                          <View style={styles.courseCardHeader}>
                            <Text style={styles.courseCardTitle}>{c.title}</Text>
                            {(c.weeklyHours || 0) > 0 && (
                              <Text style={styles.courseHoursChip}>{c.weeklyHours}h</Text>
                            )}
                          </View>
                          {c.badge && (
                            <Text style={getBadgeStyle(c.badge)}>{c.badge.toUpperCase()}</Text>
                          )}
                        </View>
                      ))
                    )}
                  </View>

                  {/* Period Footer */}
                  <View style={styles.periodColumnFooter}>
                    <Text style={styles.periodFooterText}>{pCourses.length} materias</Text>
                    <Text style={styles.periodFooterHours}>{pTotalHours} h/sem</Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Footer Corporativo */}
          <View style={styles.footer} fixed>
            <Text>AcademiX — Sistema de Gestión y Programación Académica Institucional</Text>
            <Text>Programa: {progName}</Text>
            <Text
              render={({ pageNumber, totalPages }) =>
                `Página ${pageNumber} de ${totalPages} • Generado el ${currentDateStr}`
              }
            />
          </View>
        </Page>
      ))}

      {/* ─── PÁGINA(S) DE DETALLE: COMPETENCIAS Y RESULTADOS DE APRENDIZAJE (RAP) ─── */}
      {includeDetailed && (
        <Page size="A4" orientation="landscape" style={styles.page}>
          {/* Header */}
          {hasLogo && centerLogo && (
            <View style={styles.logoHeaderCentered}>
              <Image src={rawLogoUrl} style={styles.headerLogoCentered} />
            </View>
          )}
          <View style={centerLogo ? styles.headerContainerCentered : styles.headerContainer}>
            <View style={centerLogo ? styles.headerTitlesCentered : (hasLogo ? styles.headerLeftWithLogo : styles.headerLeft)}>
              {hasLogo && !centerLogo && (
                <Image src={rawLogoUrl} style={styles.headerLogoInline} />
              )}
              <View style={styles.headerTitles}>
                <Text style={centerLogo ? styles.institutionTagCentered : styles.institutionTag}>
                  {institutionTag}
                </Text>
                <Text style={centerLogo ? styles.mainTitleCentered : styles.mainTitle}>
                  DESGLOSE DE COMPETENCIAS Y RESULTADOS DE APRENDIZAJE (RAP)
                </Text>
                <Text style={centerLogo ? styles.subTitleCentered : styles.subTitle}>
                  Programa: {progName} • Total de asignaturas: {allCourses.length}
                </Text>
              </View>
            </View>
            <View style={centerLogo ? styles.badgeHeaderCenteredRow : styles.badgeHeader}>
              <Text style={styles.badgeHeaderText}>{badgeText}</Text>
              <Text style={styles.badgeHeaderSub}>{currentDateStr}</Text>
            </View>
          </View>

          {/* Tabla Detallada */}
          <View style={styles.detailTable}>
            {/* Encabezado de la tabla */}
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderCell, styles.colPeriod]}>Periodo</Text>
              <Text style={[styles.tableHeaderCell, styles.colTitle]}>Asignatura / Materia</Text>
              <Text style={[styles.tableHeaderCell, styles.colType]}>Carácter / Tipo</Text>
              <Text style={[styles.tableHeaderCell, styles.colHours]}>Horas</Text>
              <Text style={[styles.tableHeaderCell, styles.colDesc]}>
                Descripción, Competencias y RAP
              </Text>
            </View>

            {/* Filas */}
            {allCourses.length === 0 ? (
              <View style={[styles.tableRow, styles.tableRowEven]}>
                <Text style={[styles.cellMuted, { width: "100%", padding: 6 }]}>
                  No hay materias registradas en este programa.
                </Text>
              </View>
            ) : (
              allCourses.map((c, idx) => {
                const isEven = idx % 2 === 0;
                return (
                  <View
                    key={c.id}
                    style={[styles.tableRow, isEven ? styles.tableRowEven : styles.tableRowOdd]}
                    wrap={false}
                  >
                    <View style={styles.colPeriod}>
                      <Text style={styles.cellBold}>{c.periodName}</Text>
                      {c.timelineName && (
                        <Text style={{ fontSize: 5.5, color: "#1d4ed8", fontFamily: "Helvetica-Bold" }}>
                          {c.timelineName}
                        </Text>
                      )}
                    </View>
                    <View style={styles.colTitle}>
                      <Text style={styles.cellBold}>{c.title}</Text>
                    </View>
                    <View style={styles.colType}>
                      <Text style={getBadgeStyle(c.badge)}>{(c.badge || "General").toUpperCase()}</Text>
                    </View>
                    <View style={styles.colHours}>
                      <Text style={styles.cellBold}>{c.weeklyHours || 0} h</Text>
                    </View>
                    <View style={styles.colDesc}>
                      {c.description && c.description.trim() ? (
                        <Text style={styles.cellText}>{c.description.trim()}</Text>
                      ) : (
                        <Text style={styles.cellMuted}>
                          Sin descripción, competencias o RAP registrados todavía.
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {/* Footer Corporativo */}
          <View style={styles.footer} fixed>
            <Text>AcademiX — Sistema de Gestión y Programación Académica Institucional</Text>
            <Text>Programa: {progName}</Text>
            <Text
              render={({ pageNumber, totalPages }) =>
                `Página ${pageNumber} de ${totalPages} • Generado el ${currentDateStr}`
              }
            />
          </View>
        </Page>
      )}
    </Document>
  );
};

/**
 * Converts any image format (especially SVG, SVG data URI, WebP) to a high-resolution PNG Data URL.
 * This is necessary because @react-pdf/renderer's <Image /> component only supports PNG and JPEG formats.
 */
export async function rasterizeImageToPng(src: string): Promise<string> {
  if (!src || typeof src !== "string" || !src.trim()) return "";
  let trimmed = src.trim();

  // If already PNG or JPEG data URI, React-PDF supports it directly
  if (
    trimmed.startsWith("data:image/png") ||
    trimmed.startsWith("data:image/jpeg") ||
    trimmed.startsWith("data:image/jpg")
  ) {
    return trimmed;
  }

  // If raw SVG xml, turn into a valid data URI first
  if (trimmed.startsWith("<svg")) {
    trimmed = `data:image/svg+xml;utf8,${encodeURIComponent(trimmed)}`;
  }

  if (typeof window === "undefined") {
    return trimmed;
  }

  return new Promise<string>((resolve) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";

    const timer = setTimeout(() => {
      console.warn("Timeout converting image to PNG for PDF export, falling back to original");
      resolve(trimmed);
    }, 4000);

    img.onload = () => {
      clearTimeout(timer);
      try {
        const canvas = document.createElement("canvas");
        const naturalW = img.naturalWidth || img.width || 300;
        const naturalH = img.naturalHeight || img.height || 100;
        const scale = 2;
        canvas.width = Math.max(naturalW, 100) * scale;
        canvas.height = Math.max(naturalH, 40) * scale;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const pngUrl = canvas.toDataURL("image/png");
          resolve(pngUrl);
          return;
        }
      } catch (err) {
        console.warn("Canvas export to PNG failed:", err);
      }
      resolve(trimmed);
    };

    img.onerror = (err) => {
      clearTimeout(timer);
      console.warn("Image load error during PNG conversion:", err);
      resolve(trimmed);
    };

    img.src = trimmed;
  });
}

export async function generateAndDownloadCurriculumPdf(
  program: CurriculumPdfProgram,
  options?: CurriculumExportOptions
) {
  let resolvedOptions: CurriculumExportOptions | undefined = options ? { ...options } : undefined;
  if (resolvedOptions?.logoUrl?.trim()) {
    try {
      const pngLogo = await rasterizeImageToPng(resolvedOptions.logoUrl.trim());
      resolvedOptions.logoUrl = pngLogo;
    } catch (e) {
      console.warn("Could not rasterize logo to PNG:", e);
    }
  }

  const blob = await pdf(<CurriculumPdfDocument program={program} options={resolvedOptions} />).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const safeProgramName = (resolvedOptions?.programName || program.name || "Programa").replace(/[^a-zA-Z0-9]/g, "_");
  link.download = `Malla_Curricular_${safeProgramName}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
