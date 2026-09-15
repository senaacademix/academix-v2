import React from "react";
import { pdf, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { SofiaReportData, CorporateExportOptions } from "../types/sofiaReportTypes";
import { formatCalendarDate } from "@/lib/dateUtils";

const styles = StyleSheet.create({
    page: {
        paddingTop: 24,
        paddingBottom: 28,
        paddingHorizontal: 24,
        backgroundColor: "#ffffff",
        fontFamily: "Helvetica",
        fontSize: 8,
        color: "#1e293b",
    },
    // Header
    headerContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        borderBottomWidth: 2,
        borderBottomColor: "#15803d",
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
        color: "#15803d",
        letterSpacing: 0.8,
        textTransform: "uppercase",
    },
    mainTitle: {
        fontSize: 13,
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
        backgroundColor: "#f0fdf4",
        borderWidth: 1,
        borderColor: "#bbf7d0",
        borderRadius: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        alignItems: "flex-end",
    },
    badgeHeaderText: {
        fontSize: 7.5,
        fontFamily: "Helvetica-Bold",
        color: "#166534",
        textTransform: "uppercase",
    },
    badgeHeaderSub: {
        fontSize: 6.5,
        color: "#64748b",
        marginTop: 2,
    },
    // Summary KPI Bar
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
    // Section Header
    sectionTitleBox: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#f1f5f9",
        borderWidth: 1,
        borderColor: "#cbd5e1",
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 3,
        marginBottom: 6,
    },
    sectionTitle: {
        fontSize: 7.5,
        fontFamily: "Helvetica-Bold",
        color: "#1e293b",
        letterSpacing: 0.5,
        textTransform: "uppercase",
    },
    sectionSubtitle: {
        fontSize: 6.5,
        color: "#64748b",
    },
    // Table
    table: {
        borderWidth: 1,
        borderColor: "#cbd5e1",
        borderRadius: 3,
        overflow: "hidden",
        marginBottom: 10,
    },
    tableHeaderRow: {
        flexDirection: "row",
        backgroundColor: "#f8fafc",
        borderBottomWidth: 1,
        borderBottomColor: "#cbd5e1",
        paddingVertical: 4.5,
        paddingHorizontal: 6,
    },
    tableHeaderCell: {
        fontSize: 7,
        fontFamily: "Helvetica-Bold",
        color: "#334155",
        textTransform: "uppercase",
    },
    tableRow: {
        flexDirection: "row",
        borderBottomWidth: 0.5,
        borderBottomColor: "#e2e8f0",
        paddingVertical: 3.5,
        paddingHorizontal: 6,
        alignItems: "center",
    },
    tableRowEven: {
        backgroundColor: "#ffffff",
    },
    tableRowOdd: {
        backgroundColor: "#f8fafc",
    },
    // Columns
    colSeq: { width: "4%", textAlign: "center" },
    colDoc: { width: "13%" },
    colName: { width: "35%" },
    colStatus: { width: "16%" },
    colPercent: { width: "8%", textAlign: "center" },
    colCountA: { width: "8%", textAlign: "center" },
    colCountPE: { width: "8%", textAlign: "center" },
    colCountNA: { width: "8%", textAlign: "center" },
    // Text formats
    cellText: {
        fontSize: 7,
        color: "#334155",
    },
    cellBold: {
        fontSize: 7,
        fontFamily: "Helvetica-Bold",
        color: "#0f172a",
    },
    tagGreen: {
        fontSize: 6.5,
        fontFamily: "Helvetica-Bold",
        color: "#15803d",
        backgroundColor: "#dcfce7",
        paddingHorizontal: 4,
        paddingVertical: 1.5,
        borderRadius: 2,
    },
    tagAmber: {
        fontSize: 6.5,
        fontFamily: "Helvetica-Bold",
        color: "#b45309",
        backgroundColor: "#fef3c7",
        paddingHorizontal: 4,
        paddingVertical: 1.5,
        borderRadius: 2,
    },
    tagRed: {
        fontSize: 6.5,
        fontFamily: "Helvetica-Bold",
        color: "#b91c1c",
        backgroundColor: "#fee2e2",
        paddingHorizontal: 4,
        paddingVertical: 1.5,
        borderRadius: 2,
    },
    tagBlue: {
        fontSize: 6.5,
        fontFamily: "Helvetica-Bold",
        color: "#1d4ed8",
        backgroundColor: "#eff6ff",
        paddingHorizontal: 4,
        paddingVertical: 1.5,
        borderRadius: 2,
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

export const SofiaCorporatePdfDocument: React.FC<{
    data: SofiaReportData;
    options?: CorporateExportOptions;
}> = ({ data, options }) => {
    const reportDetails = data.reportDetails;
    const rows = options?.customRows && options.customRows.length > 0 ? options.customRows : data.rows || [];

    const isGroupedHeader = rows[0] && rows[0][0]?.rowSpan === 2;
    const headerRowCount = isGroupedHeader ? 2 : 1;

    // Separate student rows from header and footers
    const apprenticeRows = rows.filter((row, idx) => {
        if (idx < headerRowCount) return false;
        const val = String(row[0]?.value || "");
        return !val.includes("RESULTADOS DE APRENDIZAJE") && !val.includes("COMPETENCIAS");
    });

    // Outcomes row
    const bottomResultsRow = rows.find((r) =>
        String(r[0]?.value || "").includes("RESULTADOS DE APRENDIZAJE")
    );
    const outcomesList = bottomResultsRow ? bottomResultsRow.slice(6).map((c) => String(c.value)) : [];

    // Calculations
    const totalLearners = apprenticeRows.length;
    let totalApprovedCells = 0;
    let totalPendingCells = 0;
    let totalFailedCells = 0;
    let totalPossibleCells = 0;

    const learnersData = apprenticeRows.map((r, i) => {
        const seq = r[0]?.value || i + 1;
        const doc = String(r[1]?.value || "Sin documento");
        const nombre = String(r[2]?.value || "");
        const apellido = String(r[3]?.value || "");
        const fullName = `${nombre} ${apellido}`.trim() || "Aprendiz sin nombre";
        const estado = String(r[4]?.value || "EN FORMACION");
        const percent = String(r[5]?.value || "0%");

        const evals = r.slice(6);
        let countA = 0;
        let countNA = 0;
        let countPE = 0;

        evals.forEach((c) => {
            totalPossibleCells++;
            if (c.value === "A") {
                countA++;
                totalApprovedCells++;
            } else if (c.value === "NA") {
                countNA++;
                totalFailedCells++;
            } else {
                countPE++;
                totalPendingCells++;
            }
        });

        return {
            seq,
            doc,
            fullName,
            estado,
            percent,
            countA,
            countPE,
            countNA,
        };
    });

    const averageApproval =
        totalPossibleCells > 0
            ? ((totalApprovedCells / totalPossibleCells) * 100).toFixed(1) + "%"
            : "0%";

    const inFormationCount = learnersData.filter((l) => l.estado.toUpperCase() === "EN FORMACION").length;
    const learnersAtRisk = learnersData.filter(
        (l) => parseFloat(l.percent.replace("%", "")) < 60 && l.estado.toUpperCase() === "EN FORMACION"
    ).length;

    const ficha = options?.customHeader?.ficha || data.ficha || "Sin Ficha";
    const title = options?.customHeader?.title || "REPORTE CONSOLIDADO DE JUICIOS EVALUATIVOS (SOFIA PLUS)";
    const programName = options?.customHeader?.programName ?? reportDetails?.programName ?? "Programa de Formación";
    const center = options?.customHeader?.center ?? reportDetails?.center ?? "Centro de Formación";
    const regional = options?.customHeader?.regional ?? reportDetails?.regional ?? "";
    const instructor = options?.customHeader?.instructor ?? "";
    const currentDateStr = options?.customHeader?.date ?? formatCalendarDate(new Date(), "dd 'de' MMMM, yyyy");

    return (
        <Document>
            <Page size="A4" orientation="landscape" style={[styles.page, { paddingBottom: 32 }]}>
                {/* Header */}
                <View style={styles.headerContainer} fixed>
                    <View style={styles.headerLeft}>
                        <Text style={styles.institutionTag}>
                            AcademiX • Sistema Institucional de Gestión y Programación Académica{regional ? ` • ${regional}` : ""}
                        </Text>
                        <Text style={styles.mainTitle}>
                            {title.toUpperCase()} — FICHA: {ficha}
                        </Text>
                        <Text style={styles.subTitle}>
                            Programa: {programName} • Centro: {center}{instructor ? ` • Responsable: ${instructor}` : ""} • Estado Ficha: {reportDetails?.status || "En Ejecución"}
                        </Text>
                    </View>
                    <View style={styles.badgeHeader}>
                        <Text style={styles.badgeHeaderText}>SENA — Reporte Oficial</Text>
                        <Text style={styles.badgeHeaderSub}>Emisión: {currentDateStr}</Text>
                    </View>
                </View>

                {/* KPI Stats Bar (Solo al inicio del reporte) */}
                <View style={styles.statsBar}>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Total Aprendices</Text>
                        <Text style={styles.statValue}>{totalLearners} Aprendices</Text>
                        <Text style={styles.statSub}>{inFormationCount} en formación activa</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Resultados (RA)</Text>
                        <Text style={styles.statValue}>{outcomesList.length} RA</Text>
                        <Text style={styles.statSub}>Estructura evaluativa evaluada</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Aprobación Global</Text>
                        <Text style={styles.statValue}>{averageApproval}</Text>
                        <Text style={styles.statSub}>{totalApprovedCells} juicios aprobados</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Juicios Pendientes</Text>
                        <Text style={styles.statValue}>{totalPendingCells} Por Evaluar</Text>
                        <Text style={styles.statSub}>{totalFailedCells} No Aprobados</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Aprendices en Riesgo</Text>
                        <Text style={styles.statValue}>{learnersAtRisk} Aprendices</Text>
                        <Text style={styles.statSub}>Avance inferior al 60%</Text>
                    </View>
                </View>

                {/* Section Title */}
                <View style={styles.sectionTitleBox}>
                    <Text style={styles.sectionTitle}>
                        MATRIZ DE JUICIOS POR APRENDIZ
                    </Text>
                    <Text style={styles.sectionSubtitle}>
                        {learnersData.length} Aprendices registrados en el programa
                    </Text>
                </View>

                {/* Table */}
                <View style={styles.table}>
                    {/* Table Header (Se repite automáticamente en cada página) */}
                    <View style={styles.tableHeaderRow} fixed>
                        <Text style={[styles.tableHeaderCell, styles.colSeq]}>#</Text>
                        <Text style={[styles.tableHeaderCell, styles.colDoc]}>Documento</Text>
                        <Text style={[styles.tableHeaderCell, styles.colName]}>Nombres y Apellidos del Aprendiz</Text>
                        <Text style={[styles.tableHeaderCell, styles.colStatus]}>Estado</Text>
                        <Text style={[styles.tableHeaderCell, styles.colPercent]}>% Aprob.</Text>
                        <Text style={[styles.tableHeaderCell, styles.colCountA]}>Aprob. (A)</Text>
                        <Text style={[styles.tableHeaderCell, styles.colCountPE]}>Por Eval.</Text>
                        <Text style={[styles.tableHeaderCell, styles.colCountNA]}>No Aprob.</Text>
                    </View>

                    {/* Rows (Listado continuo de todos los aprendices) */}
                    {learnersData.length === 0 ? (
                        <View style={[styles.tableRow, styles.tableRowEven]}>
                            <Text style={[styles.cellText, { padding: 6 }]}>No hay aprendices disponibles.</Text>
                        </View>
                    ) : (
                        learnersData.map((item, idx) => {
                            const isEven = idx % 2 === 0;
                            const pVal = parseFloat(item.percent.replace("%", ""));
                            return (
                                <View
                                    key={`learner-${item.doc}-${idx}`}
                                    style={[styles.tableRow, isEven ? styles.tableRowEven : styles.tableRowOdd]}
                                    wrap={false}
                                >
                                    <Text style={[styles.cellText, styles.colSeq]}>{item.seq}</Text>
                                    <Text style={[styles.cellBold, styles.colDoc]}>{item.doc}</Text>
                                    <Text style={[styles.cellBold, styles.colName]}>{item.fullName}</Text>
                                    <View style={styles.colStatus}>
                                        <Text
                                            style={
                                                item.estado.toUpperCase() === "EN FORMACION"
                                                    ? styles.tagGreen
                                                    : item.estado.toUpperCase() === "CONDICIONADO"
                                                    ? styles.tagAmber
                                                    : styles.tagRed
                                            }
                                        >
                                            {item.estado}
                                        </Text>
                                    </View>
                                    <View style={styles.colPercent}>
                                        <Text
                                            style={
                                                pVal >= 70
                                                    ? styles.tagGreen
                                                    : pVal >= 40
                                                    ? styles.tagAmber
                                                    : styles.tagRed
                                            }
                                        >
                                            {item.percent}
                                        </Text>
                                    </View>
                                    <Text style={[styles.cellBold, styles.colCountA, { color: "#16a34a" }]}>
                                        {item.countA}
                                    </Text>
                                    <Text style={[styles.cellText, styles.colCountPE, { color: "#64748b" }]}>
                                        {item.countPE}
                                    </Text>
                                    <Text style={[styles.cellBold, styles.colCountNA, { color: "#dc2626" }]}>
                                        {item.countNA}
                                    </Text>
                                </View>
                            );
                        })
                    )}
                </View>

                {/* Footer */}
                <View style={styles.footer} fixed>
                    <Text>AcademiX — Sistema de Gestión y Programación Académica Institucional</Text>
                    <Text>Ficha: {ficha} • Programa: {programName}</Text>
                    <Text
                        render={({ pageNumber, totalPages }) =>
                            `Página ${pageNumber} de ${totalPages} • Generado el ${currentDateStr}`
                        }
                    />
                </View>
            </Page>
        </Document>
    );
};

export async function generateAndDownloadSofiaPdf(
    data: SofiaReportData,
    options?: CorporateExportOptions
) {
    const blob = await pdf(<SofiaCorporatePdfDocument data={data} options={options} />).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const ficha = options?.customHeader?.ficha || data.ficha || "Sofia";
    const safeFicha = String(ficha).replace(/[^a-zA-Z0-9]/g, "_");
    link.download = `Reporte_Juicios_SofiaPlus_Ficha_${safeFicha}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
