import React from "react";
import { pdf, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { CommitteeReportDTO, formatFaultTypeLabel } from "../types";
import { formatSafeDateTime } from "./dateUtils";

export interface CommitteeExportOptions {
    title?: string;
    programName?: string | null;
    processTitle?: string | null;
    groupBy?: "schedule" | "group" | "none";
    filters?: {
        fichaLabel?: string;
        faultTypeLabel?: string;
        decisionLabel?: string;
        searchTerm?: string;
    };
    groupedReports?: Array<{
        key: string;
        title: string;
        reports: CommitteeReportDTO[];
        uniqueStudentsCount: number;
        fichasCount?: number;
    }>;
}

const styles = StyleSheet.create({
    page: {
        paddingTop: 22,
        paddingBottom: 28,
        paddingHorizontal: 22,
        backgroundColor: "#ffffff",
        fontFamily: "Helvetica",
        fontSize: 7.5,
        color: "#1e293b",
    },
    // Top Institutional Header
    headerContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        borderBottomWidth: 2,
        borderBottomColor: "#15803d",
        paddingBottom: 7,
        marginBottom: 8,
    },
    headerLeft: {
        flexDirection: "column",
        gap: 2,
        maxWidth: "75%",
    },
    institutionTag: {
        fontSize: 6.5,
        fontFamily: "Helvetica-Bold",
        color: "#15803d",
        letterSpacing: 0.8,
        textTransform: "uppercase",
    },
    mainTitle: {
        fontSize: 12,
        fontFamily: "Helvetica-Bold",
        color: "#0f172a",
        letterSpacing: -0.2,
    },
    subTitle: {
        fontSize: 7.5,
        color: "#334155",
        marginTop: 1,
    },
    filterSummaryText: {
        fontSize: 6.5,
        color: "#64748b",
        marginTop: 1.5,
    },
    badgeHeader: {
        backgroundColor: "#f0fdf4",
        borderWidth: 1,
        borderColor: "#bbf7d0",
        borderRadius: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        alignItems: "flex-end",
    },
    badgeHeaderText: {
        fontSize: 7,
        fontFamily: "Helvetica-Bold",
        color: "#166534",
        textTransform: "uppercase",
    },
    badgeHeaderSub: {
        fontSize: 6,
        color: "#64748b",
        marginTop: 1.5,
    },

    // KPI Summary Bar
    statsBar: {
        flexDirection: "row",
        backgroundColor: "#f8fafc",
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderRadius: 4,
        paddingVertical: 4,
        paddingHorizontal: 8,
        marginBottom: 8,
        justifyContent: "space-between",
    },
    statItem: {
        flexDirection: "column",
        gap: 1,
        flex: 1,
        borderRightWidth: 1,
        borderRightColor: "#e2e8f0",
        paddingRight: 6,
        marginRight: 6,
    },
    statItemLast: {
        flexDirection: "column",
        gap: 1,
        flex: 1,
    },
    statLabel: {
        fontSize: 5.5,
        fontFamily: "Helvetica-Bold",
        color: "#64748b",
        textTransform: "uppercase",
    },
    statValue: {
        fontSize: 8.5,
        fontFamily: "Helvetica-Bold",
        color: "#0f172a",
    },

    // Group Header Banner
    groupBanner: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#f1f5f9",
        borderWidth: 1,
        borderColor: "#cbd5e1",
        borderRadius: 3,
        paddingVertical: 3.5,
        paddingHorizontal: 6,
        marginTop: 6,
        marginBottom: 4,
    },
    groupBannerTitle: {
        fontSize: 7.5,
        fontFamily: "Helvetica-Bold",
        color: "#0f172a",
    },
    groupBannerPills: {
        flexDirection: "row",
        gap: 4,
    },
    groupPill: {
        backgroundColor: "#e2e8f0",
        borderRadius: 3,
        paddingHorizontal: 4,
        paddingVertical: 1,
        fontSize: 6,
        fontFamily: "Helvetica-Bold",
        color: "#334155",
    },

    // Table
    tableContainer: {
        borderWidth: 0.5,
        borderColor: "#cbd5e1",
        borderRadius: 3,
        overflow: "hidden",
        marginBottom: 6,
    },
    tableHeaderRow: {
        flexDirection: "row",
        backgroundColor: "#1e293b",
        paddingVertical: 3.5,
        paddingHorizontal: 4,
        alignItems: "center",
    },
    tableHeaderCell: {
        color: "#ffffff",
        fontFamily: "Helvetica-Bold",
        fontSize: 6,
        textTransform: "uppercase",
    },
    tableRow: {
        flexDirection: "row",
        borderBottomWidth: 0.5,
        borderBottomColor: "#e2e8f0",
        paddingVertical: 3,
        paddingHorizontal: 4,
        alignItems: "center",
    },
    rowEven: {
        backgroundColor: "#ffffff",
    },
    rowOdd: {
        backgroundColor: "#f8fafc",
    },

    // Column widths (Total = 100%)
    colNum: { width: "3%", textAlign: "center" },
    colLearner: { width: "18%", paddingLeft: 3 },
    colGroup: { width: "10%", paddingLeft: 2 },
    colSchedule: { width: "13%", paddingLeft: 2 },
    colFault: { width: "15%", paddingLeft: 2 },
    colAbsence: { width: "5%", textAlign: "center" },
    colDecision: { width: "13%", paddingLeft: 2 },
    colReporter: { width: "11%", paddingLeft: 2 },
    colObservations: { width: "12%", paddingLeft: 2 },

    // Cell content typography
    cellBold: {
        fontFamily: "Helvetica-Bold",
        color: "#0f172a",
        fontSize: 6.5,
    },
    cellSub: {
        color: "#64748b",
        fontSize: 5.5,
        marginTop: 0.5,
    },
    cellRegular: {
        color: "#1e293b",
        fontSize: 6.5,
    },

    // Badges / Tags inside table
    badgeFault: {
        paddingHorizontal: 3.5,
        paddingVertical: 1,
        borderRadius: 2.5,
        borderWidth: 0.5,
        fontSize: 5.8,
        fontFamily: "Helvetica-Bold",
        alignSelf: "flex-start",
    },
    badgeAcademic: {
        backgroundColor: "#eff6ff",
        borderColor: "#bfdbfe",
        color: "#1d4ed8",
    },
    badgeAttendance: {
        backgroundColor: "#fffbeb",
        borderColor: "#fde68a",
        color: "#b45309",
    },
    badgeDisciplinary: {
        backgroundColor: "#fff1f2",
        borderColor: "#fecdd3",
        color: "#be123c",
    },
    badgeMixed: {
        backgroundColor: "#faf5ff",
        borderColor: "#e9d5ff",
        color: "#7e22ce",
    },
    badgeImprovement: {
        backgroundColor: "#f0fdf4",
        borderColor: "#bbf7d0",
        color: "#15803d",
    },
    badgeDefault: {
        backgroundColor: "#f1f5f9",
        borderColor: "#cbd5e1",
        color: "#334155",
    },

    badgeDecision: {
        paddingHorizontal: 3.5,
        paddingVertical: 1,
        borderRadius: 2.5,
        borderWidth: 0.5,
        fontSize: 5.8,
        fontFamily: "Helvetica-Bold",
        alignSelf: "flex-start",
    },
    decisionPending: {
        backgroundColor: "#f8fafc",
        borderColor: "#cbd5e1",
        color: "#64748b",
    },
    decisionResolved: {
        backgroundColor: "#f0fdf4",
        borderColor: "#bbf7d0",
        color: "#166534",
    },

    // Footer
    footer: {
        position: "absolute",
        bottom: 12,
        left: 22,
        right: 22,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderTopWidth: 0.5,
        borderTopColor: "#cbd5e1",
        paddingTop: 4,
        fontSize: 6,
        color: "#64748b",
    },
});

function getFaultBadgeStyle(faultType: string) {
    switch (faultType) {
        case "ACADEMICO":
            return styles.badgeAcademic;
        case "INASISTENCIA":
            return styles.badgeAttendance;
        case "DISCIPLINARIO":
            return styles.badgeDisciplinary;
        case "MIXTO":
            return styles.badgeMixed;
        case "SOLICITUD_PLAN_MEJORAMIENTO":
        case "INCUMPLIMIENTO_PLAN_MEJORAMIENTO":
            return styles.badgeImprovement;
        default:
            return styles.badgeDefault;
    }
}

function getDecisionBadgeStyle(decision?: string | null) {
    if (!decision) return styles.decisionPending;
    const lower = decision.toLowerCase().trim();
    if (lower === "" || lower === "pending" || lower === "pendiente" || lower === "sin definir") {
        return styles.decisionPending;
    }
    return styles.decisionResolved;
}

export const CommitteeCorporatePdfDocument: React.FC<{
    reports: CommitteeReportDTO[];
    options?: CommitteeExportOptions;
}> = ({ reports, options }) => {
    const currentDateStr = formatSafeDateTime(new Date());
    const programName = options?.programName || "General";
    const processTitle = options?.processTitle || "Comité de Evaluación y Seguimiento";
    const groupBy = options?.groupBy || "schedule";

    // Metrics calculation
    const totalReports = reports.length;
    const uniqueStudents = new Set(reports.map((r) => r.studentId)).size;
    const uniqueSchedules = new Set(reports.map((r) => r.groupSchedule || "Sin horario")).size;
    const academicFaults = reports.filter(
        (r) => r.faultType === "ACADEMICO" || r.faultType === "MIXTO"
    ).length;
    const disciplinaryFaults = reports.filter(
        (r) =>
            r.faultType === "DISCIPLINARIO" ||
            r.faultType === "INASISTENCIA" ||
            r.faultType === "MIXTO"
    ).length;

    // Filters summary text
    const filterParts: string[] = [];
    if (options?.filters?.fichaLabel) filterParts.push(`Ficha: ${options.filters.fichaLabel}`);
    if (options?.filters?.faultTypeLabel) filterParts.push(`Causal: ${options.filters.faultTypeLabel}`);
    if (options?.filters?.decisionLabel) filterParts.push(`Solución: ${options.filters.decisionLabel}`);
    if (options?.filters?.searchTerm) filterParts.push(`Búsqueda: "${options.filters.searchTerm}"`);
    filterParts.push(
        `Vista: ${
            groupBy === "schedule"
                ? "Por Horario de la Ficha"
                : groupBy === "group"
                ? "Por Ficha"
                : "Lista Plana"
        }`
    );
    const filterSummaryString = filterParts.join(" • ");

    // Determine groups to render
    const groupsToRender =
        (groupBy === "schedule" || groupBy === "group") && options?.groupedReports && options.groupedReports.length > 0
            ? options.groupedReports
            : null;

    const renderTableHeaders = () => (
        <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderCell, styles.colNum]}>#</Text>
            <Text style={[styles.tableHeaderCell, styles.colLearner]}>Aprendiz / Doc</Text>
            <Text style={[styles.tableHeaderCell, styles.colGroup]}>Ficha</Text>
            <Text style={[styles.tableHeaderCell, styles.colSchedule]}>Horario de la Ficha</Text>
            <Text style={[styles.tableHeaderCell, styles.colFault]}>Causal / Falta</Text>
            <Text style={[styles.tableHeaderCell, styles.colAbsence]}>Inasist.</Text>
            <Text style={[styles.tableHeaderCell, styles.colDecision]}>Solución Comité</Text>
            <Text style={[styles.tableHeaderCell, styles.colReporter]}>Reportado Por</Text>
            <Text style={[styles.tableHeaderCell, styles.colObservations]}>Observaciones</Text>
        </View>
    );

    const renderReportRow = (report: CommitteeReportDTO, idx: number) => {
        const isEven = idx % 2 === 0;
        const faultLabel = formatFaultTypeLabel(report.faultType, report.customFaultType);
        const faultBadgeStyle = getFaultBadgeStyle(report.faultType);
        const decisionBadgeStyle = getDecisionBadgeStyle(report.committeeDecision);
        const decisionText = report.committeeDecision?.trim() || "Pendiente";
        const absences = report.absenceDays ?? report.absenceHours ?? 0;

        return (
            <View key={report.id} style={[styles.tableRow, isEven ? styles.rowEven : styles.rowOdd]} wrap={false}>
                <Text style={[styles.cellSub, styles.colNum]}>{idx + 1}</Text>

                <View style={styles.colLearner}>
                    <Text style={styles.cellBold}>{report.studentName}</Text>
                    <Text style={styles.cellSub}>
                        Doc: {report.studentDocument || "Sin doc"}
                        {report.studentEmail ? ` • ${report.studentEmail}` : ""}
                    </Text>
                </View>

                <View style={styles.colGroup}>
                    <Text style={styles.cellBold}>{report.groupName}</Text>
                </View>

                <View style={styles.colSchedule}>
                    <Text style={styles.cellRegular}>
                        {report.groupSchedule || "Sin horario asignado"}
                    </Text>
                </View>

                <View style={styles.colFault}>
                    <Text style={[styles.badgeFault, faultBadgeStyle]}>
                        {faultLabel}
                    </Text>
                </View>

                <Text style={[styles.cellBold, styles.colAbsence, absences > 0 ? { color: "#b45309" } : { color: "#94a3b8" }]}>
                    {absences > 0 ? `${absences} d.` : "—"}
                </Text>

                <View style={styles.colDecision}>
                    <Text style={[styles.badgeDecision, decisionBadgeStyle]}>
                        {decisionText}
                    </Text>
                </View>

                <View style={styles.colReporter}>
                    <Text style={styles.cellRegular}>{report.reportedByName}</Text>
                </View>

                <View style={styles.colObservations}>
                    <Text style={styles.cellSub}>
                        {(report.observations || report.reason || "Sin observaciones").slice(0, 80)}
                        {(report.observations || report.reason || "").length > 80 ? "..." : ""}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <Document
            title={`Reporte Comité de Evaluación - ${processTitle}`}
            author="AcademiX - SENA"
            subject="Reporte oficial de aprendices citados a Comité de Evaluación y Seguimiento"
            keywords="SENA, AcademiX, Comité, Reporte, Evaluación"
        >
            <Page size="A4" orientation="landscape" style={styles.page}>
                {/* Header */}
                <View style={styles.headerContainer} fixed>
                    <View style={styles.headerLeft}>
                        <Text style={styles.institutionTag}>
                            SENA • SISTEMA DE GESTIÓN ACADÉMICA ACADEMIX
                        </Text>
                        <Text style={styles.mainTitle}>
                            REPORTE DE APRENDICES ANTE COMITÉ DE EVALUACIÓN
                        </Text>
                        <Text style={styles.subTitle}>
                            Proceso: {processTitle} • Programa: {programName}
                        </Text>
                        <Text style={styles.filterSummaryText}>
                            {filterSummaryString}
                        </Text>
                    </View>

                    <View style={styles.badgeHeader}>
                        <Text style={styles.badgeHeaderText}>Documento Oficial</Text>
                        <Text style={styles.badgeHeaderSub}>Generado: {currentDateStr}</Text>
                        <Text style={styles.badgeHeaderSub}>{totalReports} caso(s) en reporte</Text>
                    </View>
                </View>

                {/* KPI Metrics Summary Bar */}
                <View style={styles.statsBar}>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Total Reportes</Text>
                        <Text style={styles.statValue}>{totalReports}</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Aprendices Únicos</Text>
                        <Text style={[styles.statValue, { color: "#2563eb" }]}>{uniqueStudents}</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Horarios de Ficha</Text>
                        <Text style={[styles.statValue, { color: "#d97706" }]}>{uniqueSchedules}</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Faltas Académicas</Text>
                        <Text style={[styles.statValue, { color: "#0284c7" }]}>{academicFaults}</Text>
                    </View>
                    <View style={styles.statItemLast}>
                        <Text style={styles.statLabel}>Disciplinarias / Inasist.</Text>
                        <Text style={[styles.statValue, { color: "#e11d48" }]}>{disciplinaryFaults}</Text>
                    </View>
                </View>

                {/* Content: Grouped or Flat */}
                {groupsToRender ? (
                    groupsToRender.map((group, gIdx) => (
                        <View key={group.key || gIdx} style={{ marginBottom: 6 }}>
                            {/* Group Banner */}
                            <View style={styles.groupBanner} wrap={false}>
                                <Text style={styles.groupBannerTitle}>
                                    {groupBy === "schedule" ? "🕒 Horario: " : "👥 Ficha: "}
                                    {group.title}
                                </Text>
                                <View style={styles.groupBannerPills}>
                                    <Text style={styles.groupPill}>
                                        {group.reports.length} {group.reports.length === 1 ? "reporte" : "reportes"}
                                    </Text>
                                    <Text style={styles.groupPill}>
                                        {group.uniqueStudentsCount} {group.uniqueStudentsCount === 1 ? "aprendiz" : "aprendices"}
                                    </Text>
                                    {group.fichasCount !== undefined && (
                                        <Text style={styles.groupPill}>
                                            {group.fichasCount} {group.fichasCount === 1 ? "ficha" : "fichas"}
                                        </Text>
                                    )}
                                </View>
                            </View>

                            {/* Table */}
                            <View style={styles.tableContainer}>
                                {renderTableHeaders()}
                                {group.reports.map((report, rIdx) => renderReportRow(report, rIdx))}
                            </View>
                        </View>
                    ))
                ) : (
                    <View style={styles.tableContainer}>
                        {renderTableHeaders()}
                        {reports.map((report, idx) => renderReportRow(report, idx))}
                    </View>
                )}

                {/* Fixed Footer */}
                <View style={styles.footer} fixed>
                    <Text>AcademiX • Sistema de Gestión y Programación Académica Institucional</Text>
                    <Text>Uso oficial en sesiones de Comité de Evaluación y Seguimiento</Text>
                    <Text
                        render={({ pageNumber, totalPages }) =>
                            `Página ${pageNumber} de ${totalPages} • ${currentDateStr}`
                        }
                    />
                </View>
            </Page>
        </Document>
    );
};

export async function generateAndDownloadCommitteePdf(
    reports: CommitteeReportDTO[],
    options?: CommitteeExportOptions
) {
    if (!reports || reports.length === 0) return;

    const doc = <CommitteeCorporatePdfDocument reports={reports} options={options} />;
    const blob = await pdf(doc).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;

    const rawTitle = options?.title || options?.processTitle || "Reporte_Comite_Evaluacion";
    const sanitizedTitle = rawTitle.replace(/[^a-zA-Z0-9_-]/g, "_");
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.download = `${sanitizedTitle}_${dateStamp}.pdf`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
