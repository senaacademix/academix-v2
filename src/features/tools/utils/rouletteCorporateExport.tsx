import React from "react";
import ExcelJS from "exceljs";
import { pdf, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatName } from "@/lib/utils";

export interface RouletteStudent {
    id: string;
    name: string;
    email?: string | null;
    profile?: {
        nombres?: string;
        apellido?: string;
        identificacion?: string;
    } | null;
}

export interface RouletteHistoryItem {
    student: RouletteStudent;
    timestamp: string;
    grade?: number;
}

export interface RouletteExportOptions {
    groupName?: string;
    groupCode?: string;
    totalAvailable?: number;
}

// ─────────────────────────────────────────────────────────────
// 1. EXCEL CORPORATIVO CON EXCELJS
// ─────────────────────────────────────────────────────────────

export async function exportRouletteToCorporateExcel(
    history: RouletteHistoryItem[],
    options?: RouletteExportOptions
) {
    if (!history || history.length === 0) return;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "AcademiX - Sistema de Gestión Académica";
    workbook.lastModifiedBy = "AcademiX";
    workbook.created = new Date();

    const groupLabel = options?.groupCode || options?.groupName || "General";
    const rawSheetName = `Ruleta ${groupLabel}`.substring(0, 30);
    const sanitizedSheetName = rawSheetName.replace(/[:\\/?*\[\]]/g, "-");
    const worksheet = workbook.addWorksheet(sanitizedSheetName, {
        views: [{ showGridLines: true }],
    });

    const totalCols = 7;
    const borderThin: Partial<ExcelJS.Borders> = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
    };

    // Row 1: Institución y Título del Reporte
    worksheet.mergeCells(1, 1, 1, totalCols);
    const r1 = worksheet.getCell(1, 1);
    r1.value = "ACADEMIX • REPORTE DE PARTICIPACIÓN Y NOTAS (RULETA PEDAGÓGICA)";
    r1.font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    r1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } }; // Slate 900
    r1.alignment = { vertical: "middle", indent: 1 };
    worksheet.getRow(1).height = 28;

    // Row 2: Metadatos (Ficha, Grupo, Fecha)
    worksheet.mergeCells(2, 1, 2, totalCols);
    const r2 = worksheet.getCell(2, 1);
    const dateStr = new Date().toLocaleDateString("es-CO", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
    r2.value = `Ficha / Grupo: ${options?.groupName || "N/A"} ${options?.groupCode ? `(${options.groupCode})` : ""} • Fecha de Emisión: ${dateStr} • Participantes Seleccionados: ${history.length}`;
    r2.font = { name: "Segoe UI", size: 8.5, color: { argb: "FF334155" } };
    r2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } }; // Slate 100
    r2.alignment = { vertical: "middle", indent: 1 };
    worksheet.getRow(2).height = 20;

    // Row 3: Blank
    worksheet.getRow(3).height = 10;

    // Row 4: KPI Summary Row
    const gradedItems = history.filter((h) => h.grade !== undefined && h.grade !== null);
    const avgGrade =
        gradedItems.length > 0
            ? (gradedItems.reduce((acc, curr) => acc + (curr.grade || 0), 0) / gradedItems.length).toFixed(2)
            : "N/A";
    const approvedCount = gradedItems.filter((h) => (h.grade || 0) >= 3.0).length;
    const deficientCount = gradedItems.filter((h) => (h.grade || 0) < 3.0).length;

    worksheet.getCell(4, 1).value = "TOTAL SELECCIONADOS";
    worksheet.getCell(4, 2).value = history.length;
    worksheet.getCell(4, 3).value = "CALIFICADOS";
    worksheet.getCell(4, 4).value = gradedItems.length;
    worksheet.getCell(4, 5).value = "PROMEDIO NOTAS";
    worksheet.getCell(4, 6).value = avgGrade;
    worksheet.getCell(4, 7).value = `APROBADOS: ${approvedCount} | MEJORAR: ${deficientCount}`;

    for (let c = 1; c <= totalCols; c++) {
        const cell = worksheet.getCell(4, c);
        cell.font = { name: "Segoe UI", size: 8, bold: true, color: { argb: "FF1E293B" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = borderThin;
    }
    worksheet.getRow(4).height = 22;

    // Row 5: Blank
    worksheet.getRow(5).height = 10;

    // Row 6: Column Headers
    const headers = [
        "N° Turno",
        "Identificación",
        "Nombre Completo del Aprendiz",
        "Fecha",
        "Hora",
        "Calificación",
        "Estado Evaluativo",
    ];
    const headerRow = worksheet.getRow(6);
    headers.forEach((h, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.value = h;
        cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF15803D" } }; // Emerald 700
        cell.alignment = { vertical: "middle", horizontal: i === 2 ? "left" : "center" };
        cell.border = borderThin;
    });
    headerRow.height = 24;

    // Data Rows
    let currentRow = 7;
    history.forEach((item, index) => {
        const student = item.student;
        const fullName = formatName(student.name, student.profile);
        const doc = student.profile?.identificacion || "N/A";
        const d = new Date(item.timestamp);
        const dateFormatted = d.toLocaleDateString("es-CO");
        const timeFormatted = d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });

        const row = worksheet.getRow(currentRow);
        row.getCell(1).value = index + 1;
        row.getCell(2).value = doc;
        row.getCell(3).value = fullName;
        row.getCell(4).value = dateFormatted;
        row.getCell(5).value = timeFormatted;

        const gradeCell = row.getCell(6);
        const statusCell = row.getCell(7);

        if (item.grade !== undefined && item.grade !== null) {
            gradeCell.value = Number(item.grade.toFixed(1));
            if (item.grade >= 3.0) {
                statusCell.value = "Aprobado";
                statusCell.font = { name: "Segoe UI", size: 8.5, bold: true, color: { argb: "FF166534" } };
                statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCFCE7" } }; // Green 100
                gradeCell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF166534" } };
            } else {
                statusCell.value = "Por Mejorar";
                statusCell.font = { name: "Segoe UI", size: 8.5, bold: true, color: { argb: "FF991B1B" } };
                statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } }; // Red 100
                gradeCell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF991B1B" } };
            }
        } else {
            gradeCell.value = "Sin calificar";
            gradeCell.font = { name: "Segoe UI", size: 8.5, italic: true, color: { argb: "FF64748B" } };
            statusCell.value = "Participó";
            statusCell.font = { name: "Segoe UI", size: 8.5, color: { argb: "FF475569" } };
        }

        // Alignments & borders
        row.getCell(1).alignment = { vertical: "middle", horizontal: "center" };
        row.getCell(2).alignment = { vertical: "middle", horizontal: "center" };
        row.getCell(3).alignment = { vertical: "middle", horizontal: "left", indent: 1 };
        row.getCell(4).alignment = { vertical: "middle", horizontal: "center" };
        row.getCell(5).alignment = { vertical: "middle", horizontal: "center" };
        gradeCell.alignment = { vertical: "middle", horizontal: "center" };
        statusCell.alignment = { vertical: "middle", horizontal: "center" };

        for (let c = 1; c <= totalCols; c++) {
            const cell = row.getCell(c);
            cell.border = borderThin;
            if (currentRow % 2 === 0 && !cell.fill) {
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
            }
        }

        row.height = 20;
        currentRow++;
    });

    // Column Widths
    worksheet.getColumn(1).width = 10;
    worksheet.getColumn(2).width = 16;
    worksheet.getColumn(3).width = 38;
    worksheet.getColumn(4).width = 14;
    worksheet.getColumn(5).width = 12;
    worksheet.getColumn(6).width = 15;
    worksheet.getColumn(7).width = 18;

    // Buffer and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeCode = String(options?.groupCode || options?.groupName || "Ruleta").replace(/[^a-zA-Z0-9]/g, "_");
    a.download = `Ruleta_Participacion_${safeCode}_${new Date().toISOString().split("T")[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────
// 2. PDF CORPORATIVO CON @REACT-PDF/RENDERER
// ─────────────────────────────────────────────────────────────

const pdfStyles = StyleSheet.create({
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
    // KPI Bar
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
    // Table
    table: {
        borderWidth: 1,
        borderColor: "#cbd5e1",
        borderRadius: 4,
        overflow: "hidden",
        marginBottom: 10,
    },
    tableHeaderRow: {
        flexDirection: "row",
        backgroundColor: "#15803d",
        paddingVertical: 4.5,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: "#166534",
    },
    tableHeaderCell: {
        color: "#ffffff",
        fontFamily: "Helvetica-Bold",
        fontSize: 7,
        textTransform: "uppercase",
    },
    tableRow: {
        flexDirection: "row",
        borderBottomWidth: 0.5,
        borderBottomColor: "#e2e8f0",
        paddingVertical: 3.5,
        paddingHorizontal: 4,
        alignItems: "center",
    },
    rowEven: {
        backgroundColor: "#ffffff",
    },
    rowOdd: {
        backgroundColor: "#f8fafc",
    },
    colNum: { width: "6%", textAlign: "center" },
    colDoc: { width: "16%", textAlign: "center" },
    colName: { width: "36%", paddingLeft: 4 },
    colDate: { width: "16%", textAlign: "center" },
    colGrade: { width: "12%", textAlign: "center" },
    colStatus: { width: "14%", textAlign: "center" },

    cellText: {
        fontSize: 7,
        color: "#334155",
    },
    cellBold: {
        fontSize: 7,
        fontFamily: "Helvetica-Bold",
        color: "#0f172a",
    },
    badgePass: {
        backgroundColor: "#dcfce7",
        color: "#166534",
        fontSize: 6.5,
        fontFamily: "Helvetica-Bold",
        paddingVertical: 1,
        paddingHorizontal: 4,
        borderRadius: 3,
        textAlign: "center",
    },
    badgeFail: {
        backgroundColor: "#fee2e2",
        color: "#991b1b",
        fontSize: 6.5,
        fontFamily: "Helvetica-Bold",
        paddingVertical: 1,
        paddingHorizontal: 4,
        borderRadius: 3,
        textAlign: "center",
    },
    badgeNeutral: {
        backgroundColor: "#f1f5f9",
        color: "#475569",
        fontSize: 6.5,
        paddingVertical: 1,
        paddingHorizontal: 4,
        borderRadius: 3,
        textAlign: "center",
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

function RoulettePdfDocument({
    history,
    options,
}: {
    history: RouletteHistoryItem[];
    options?: RouletteExportOptions;
}) {
    const groupName = options?.groupName || "General";
    const groupCode = options?.groupCode ? `(${options.groupCode})` : "";
    const dateStr = new Date().toLocaleDateString("es-CO", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    const gradedItems = history.filter((h) => h.grade !== undefined && h.grade !== null);
    const avgGrade =
        gradedItems.length > 0
            ? (gradedItems.reduce((acc, curr) => acc + (curr.grade || 0), 0) / gradedItems.length).toFixed(2)
            : "N/A";
    const approvedCount = gradedItems.filter((h) => (h.grade || 0) >= 3.0).length;
    const deficientCount = gradedItems.filter((h) => (h.grade || 0) < 3.0).length;

    return (
        <Document
            title={`Ruleta_Participacion_${groupName}`}
            author="AcademiX"
            subject="Reporte de Participación y Notas"
        >
            <Page size="A4" orientation="portrait" style={pdfStyles.page}>
                {/* Header */}
                <View style={pdfStyles.headerContainer}>
                    <View style={pdfStyles.headerLeft}>
                        <Text style={pdfStyles.institutionTag}>AcademiX • Evaluación Pedagógica Dinámica</Text>
                        <Text style={pdfStyles.mainTitle}>Ruleta de Participación y Calificaciones</Text>
                        <Text style={pdfStyles.subTitle}>
                            Ficha / Grupo: {groupName} {groupCode} • Emisión: {dateStr}
                        </Text>
                    </View>
                    <View style={pdfStyles.badgeHeader}>
                        <Text style={pdfStyles.badgeHeaderText}>Reporte Oficial</Text>
                        <Text style={pdfStyles.badgeHeaderSub}>{history.length} seleccionados</Text>
                    </View>
                </View>

                {/* Stats Bar */}
                <View style={pdfStyles.statsBar}>
                    <View style={pdfStyles.statItem}>
                        <Text style={pdfStyles.statLabel}>Total Seleccionados</Text>
                        <Text style={pdfStyles.statValue}>{history.length}</Text>
                    </View>
                    <View style={pdfStyles.statItem}>
                        <Text style={pdfStyles.statLabel}>Calificados</Text>
                        <Text style={pdfStyles.statValue}>{gradedItems.length}</Text>
                    </View>
                    <View style={pdfStyles.statItem}>
                        <Text style={pdfStyles.statLabel}>Promedio Notas</Text>
                        <Text style={[pdfStyles.statValue, { color: Number(avgGrade) >= 3.0 ? "#16a34a" : "#dc2626" }]}>
                            {avgGrade}
                        </Text>
                    </View>
                    <View style={pdfStyles.statItem}>
                        <Text style={pdfStyles.statLabel}>Aprobados / Mejorar</Text>
                        <Text style={pdfStyles.statValue}>
                            {approvedCount} / {deficientCount}
                        </Text>
                    </View>
                </View>

                {/* Table */}
                <View style={pdfStyles.table}>
                    <View style={pdfStyles.tableHeaderRow}>
                        <Text style={[pdfStyles.tableHeaderCell, pdfStyles.colNum]}>#</Text>
                        <Text style={[pdfStyles.tableHeaderCell, pdfStyles.colDoc]}>Identificación</Text>
                        <Text style={[pdfStyles.tableHeaderCell, pdfStyles.colName]}>Aprendiz</Text>
                        <Text style={[pdfStyles.tableHeaderCell, pdfStyles.colDate]}>Fecha / Hora</Text>
                        <Text style={[pdfStyles.tableHeaderCell, pdfStyles.colGrade]}>Nota</Text>
                        <Text style={[pdfStyles.tableHeaderCell, pdfStyles.colStatus]}>Estado</Text>
                    </View>

                    {history.map((item, idx) => {
                        const isEven = idx % 2 === 0;
                        const fullName = formatName(item.student.name, item.student.profile);
                        const doc = item.student.profile?.identificacion || "—";
                        const d = new Date(item.timestamp);
                        const dateStrFormatted = `${d.toLocaleDateString("es-CO")} ${d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}`;

                        return (
                            <View
                                key={item.timestamp + idx}
                                style={[pdfStyles.tableRow, isEven ? pdfStyles.rowEven : pdfStyles.rowOdd]}
                            >
                                <Text style={[pdfStyles.cellText, pdfStyles.colNum]}>{idx + 1}</Text>
                                <Text style={[pdfStyles.cellText, pdfStyles.colDoc]}>{doc}</Text>
                                <Text style={[pdfStyles.cellBold, pdfStyles.colName]}>{fullName}</Text>
                                <Text style={[pdfStyles.cellText, pdfStyles.colDate]}>{dateStrFormatted}</Text>

                                <Text
                                    style={[
                                        pdfStyles.cellBold,
                                        pdfStyles.colGrade,
                                        {
                                            color:
                                                item.grade !== undefined
                                                    ? item.grade >= 3.0
                                                        ? "#15803d"
                                                        : "#b91c1c"
                                                    : "#64748b",
                                        },
                                    ]}
                                >
                                    {item.grade !== undefined ? item.grade.toFixed(1) : "—"}
                                </Text>

                                <View style={pdfStyles.colStatus}>
                                    {item.grade !== undefined ? (
                                        item.grade >= 3.0 ? (
                                            <Text style={pdfStyles.badgePass}>Aprobado</Text>
                                        ) : (
                                            <Text style={pdfStyles.badgeFail}>Por Mejorar</Text>
                                        )
                                    ) : (
                                        <Text style={pdfStyles.badgeNeutral}>Participó</Text>
                                    )}
                                </View>
                            </View>
                        );
                    })}
                </View>

                {/* Footer */}
                <View style={pdfStyles.footer} fixed>
                    <Text>AcademiX — Sistema de Gestión y Formación Institucional</Text>
                    <Text>Ficha: {groupName} {groupCode}</Text>
                    <Text
                        render={({ pageNumber, totalPages }) =>
                            `Página ${pageNumber} de ${totalPages} • Generado el ${dateStr}`
                        }
                    />
                </View>
            </Page>
        </Document>
    );
}

export async function exportRouletteToCorporatePdf(
    history: RouletteHistoryItem[],
    options?: RouletteExportOptions
) {
    const blob = await pdf(<RoulettePdfDocument history={history} options={options} />).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const safeCode = String(options?.groupCode || options?.groupName || "Ruleta").replace(/[^a-zA-Z0-9]/g, "_");
    link.download = `Ruleta_Participacion_${safeCode}_${new Date().toISOString().split("T")[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
