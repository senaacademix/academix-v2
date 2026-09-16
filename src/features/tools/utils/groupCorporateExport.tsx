import React from "react";
import ExcelJS from "exceljs";
import { pdf, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatName } from "@/lib/utils";

export interface GroupStudent {
    id: string;
    name: string;
    image?: string | null;
    profile?: {
        nombres?: string;
        apellido?: string;
        identificacion?: string;
    } | null;
}

export interface GroupItem {
    id: string;
    name: string;
    students: GroupStudent[];
}

export interface GroupExportOptions {
    groupName?: string;
    groupCode?: string;
}

// ─────────────────────────────────────────────────────────────
// 1. EXCEL CORPORATIVO CON EXCELJS
// ─────────────────────────────────────────────────────────────

export async function exportGroupsToCorporateExcel(
    groups: GroupItem[],
    ungrouped: GroupStudent[] = [],
    options?: GroupExportOptions
) {
    if ((!groups || groups.length === 0) && (!ungrouped || ungrouped.length === 0)) return;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "AcademiX - Sistema de Gestión Académica";
    workbook.lastModifiedBy = "AcademiX";
    workbook.created = new Date();

    const groupLabel = options?.groupCode || options?.groupName || "General";
    const sanitizedGroupLabel = groupLabel.replace(/[:\\/?*\[\]]/g, "-").substring(0, 20);

    const totalAssigned = groups.reduce((acc, g) => acc + g.students.length, 0);
    const totalStudents = totalAssigned + ungrouped.length;
    const avgPerGroup = groups.length > 0 ? (totalAssigned / groups.length).toFixed(1) : "0";

    const dateStr = new Date().toLocaleDateString("es-CO", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    const borderThin: Partial<ExcelJS.Borders> = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
    };

    // ─────────────────────────────────────────────
    // HOJA 1: DISTRIBUCIÓN POR EQUIPOS
    // ─────────────────────────────────────────────
    const wsTeams = workbook.addWorksheet(`Equipos ${sanitizedGroupLabel}`.substring(0, 31), {
        views: [{ showGridLines: true }],
    });

    const totalCols = 5;

    // Row 1: Banner Institucional
    wsTeams.mergeCells(1, 1, 1, totalCols);
    const r1 = wsTeams.getCell(1, 1);
    r1.value = "ACADEMIX • CONFORMACIÓN DE EQUIPOS DE TRABAJO";
    r1.font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    r1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } }; // Slate 900
    r1.alignment = { vertical: "middle", indent: 1 };
    wsTeams.getRow(1).height = 28;

    // Row 2: Metadatos
    wsTeams.mergeCells(2, 1, 2, totalCols);
    const r2 = wsTeams.getCell(2, 1);
    r2.value = `Ficha / Programa: ${options?.groupName || "General"} ${options?.groupCode ? `(${options.groupCode})` : ""} • Fecha de Emisión: ${dateStr} • Total Aprendices: ${totalStudents}`;
    r2.font = { name: "Segoe UI", size: 8.5, color: { argb: "FF334155" } };
    r2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    r2.alignment = { vertical: "middle", indent: 1 };
    wsTeams.getRow(2).height = 20;

    // Row 3: Blank
    wsTeams.getRow(3).height = 8;

    // Row 4: KPI Summary Bar
    wsTeams.getCell(4, 1).value = "TOTAL EQUIPOS";
    wsTeams.getCell(4, 2).value = groups.length;
    wsTeams.getCell(4, 3).value = "ASIGNADOS / DISPONIBLES";
    wsTeams.getCell(4, 4).value = `${totalAssigned} / ${totalStudents}`;
    wsTeams.getCell(4, 5).value = `PROMEDIO POR EQUIPO: ${avgPerGroup} ${ungrouped.length > 0 ? `(Sin Asignar: ${ungrouped.length})` : ""}`;

    for (let c = 1; c <= totalCols; c++) {
        const cell = wsTeams.getCell(4, c);
        cell.font = { name: "Segoe UI", size: 8, bold: true, color: { argb: "FF1E293B" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = borderThin;
    }
    wsTeams.getRow(4).height = 22;

    // Row 5: Blank
    wsTeams.getRow(5).height = 10;

    let currentRow = 6;

    // Render each Group
    groups.forEach((group, gIdx) => {
        // Group Header Banner
        wsTeams.mergeCells(currentRow, 1, currentRow, totalCols);
        const gHeader = wsTeams.getCell(currentRow, 1);
        gHeader.value = `EQUIPO ${gIdx + 1}: ${group.name.toUpperCase()} (${group.students.length} ${group.students.length === 1 ? "integrante" : "integrantes"})`;
        gHeader.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FF065F46" } }; // Emerald 800
        gHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } }; // Emerald 100
        gHeader.alignment = { vertical: "middle", indent: 1 };
        gHeader.border = borderThin;
        wsTeams.getRow(currentRow).height = 22;
        currentRow++;

        // Subheaders
        const subheaders = ["N°", "Documento", "Nombre Completo del Aprendiz", "Rol en el Equipo", "Observación / Firma"];
        const subRow = wsTeams.getRow(currentRow);
        subheaders.forEach((sh, i) => {
            const cell = subRow.getCell(i + 1);
            cell.value = sh;
            cell.font = { name: "Segoe UI", size: 8.5, bold: true, color: { argb: "FFFFFFFF" } };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF15803D" } }; // Emerald 700
            cell.alignment = { vertical: "middle", horizontal: i === 2 ? "left" : "center" };
            cell.border = borderThin;
        });
        subRow.height = 20;
        currentRow++;

        // Students Rows
        if (group.students.length === 0) {
            wsTeams.mergeCells(currentRow, 1, currentRow, totalCols);
            const emptyCell = wsTeams.getCell(currentRow, 1);
            emptyCell.value = "Sin aprendices asignados a este equipo";
            emptyCell.font = { name: "Segoe UI", size: 8, italic: true, color: { argb: "FF94A3B8" } };
            emptyCell.alignment = { vertical: "middle", horizontal: "center" };
            emptyCell.border = borderThin;
            wsTeams.getRow(currentRow).height = 18;
            currentRow++;
        } else {
            group.students.forEach((st, sIdx) => {
                const sRow = wsTeams.getRow(currentRow);
                const fullName = formatName(st.name, st.profile);
                const doc = st.profile?.identificacion || "N/A";

                sRow.getCell(1).value = sIdx + 1;
                sRow.getCell(2).value = doc;
                sRow.getCell(3).value = fullName;
                sRow.getCell(4).value = sIdx === 0 ? "Líder de Equipo" : "Integrante";
                sRow.getCell(5).value = "";

                sRow.getCell(1).alignment = { vertical: "middle", horizontal: "center" };
                sRow.getCell(2).alignment = { vertical: "middle", horizontal: "center" };
                sRow.getCell(3).alignment = { vertical: "middle", horizontal: "left", indent: 1 };
                sRow.getCell(4).alignment = { vertical: "middle", horizontal: "center" };
                sRow.getCell(5).alignment = { vertical: "middle", horizontal: "left" };

                sRow.getCell(3).font = { name: "Segoe UI", size: 8.5, bold: true, color: { argb: "FF0F172A" } };
                sRow.getCell(4).font = {
                    name: "Segoe UI",
                    size: 8,
                    bold: sIdx === 0,
                    color: { argb: sIdx === 0 ? "FF15803D" : "FF475569" },
                };

                for (let c = 1; c <= totalCols; c++) {
                    const cell = sRow.getCell(c);
                    cell.border = borderThin;
                    if (currentRow % 2 === 0) {
                        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
                    }
                }

                sRow.height = 19;
                currentRow++;
            });
        }

        // Space between groups
        wsTeams.getRow(currentRow).height = 10;
        currentRow++;
    });

    // Ungrouped section if any
    if (ungrouped.length > 0) {
        wsTeams.mergeCells(currentRow, 1, currentRow, totalCols);
        const uHeader = wsTeams.getCell(currentRow, 1);
        uHeader.value = `APRENDICES SIN EQUIPO ASIGNADO (${ungrouped.length} aprendices)`;
        uHeader.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF92400E" } }; // Amber 800
        uHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } }; // Amber 100
        uHeader.alignment = { vertical: "middle", indent: 1 };
        uHeader.border = borderThin;
        wsTeams.getRow(currentRow).height = 20;
        currentRow++;

        ungrouped.forEach((st, uIdx) => {
            const uRow = wsTeams.getRow(currentRow);
            uRow.getCell(1).value = uIdx + 1;
            uRow.getCell(2).value = st.profile?.identificacion || "N/A";
            uRow.getCell(3).value = formatName(st.name, st.profile);
            uRow.getCell(4).value = "Pendiente Asignación";
            uRow.getCell(5).value = "";

            uRow.getCell(1).alignment = { vertical: "middle", horizontal: "center" };
            uRow.getCell(2).alignment = { vertical: "middle", horizontal: "center" };
            uRow.getCell(3).alignment = { vertical: "middle", horizontal: "left", indent: 1 };
            uRow.getCell(4).alignment = { vertical: "middle", horizontal: "center" };

            uRow.getCell(4).font = { name: "Segoe UI", size: 8, italic: true, color: { argb: "FFB45309" } };

            for (let c = 1; c <= totalCols; c++) {
                uRow.getCell(c).border = borderThin;
            }
            uRow.height = 18;
            currentRow++;
        });
    }

    // Set Column Widths for Teams Sheet
    wsTeams.getColumn(1).width = 8;
    wsTeams.getColumn(2).width = 16;
    wsTeams.getColumn(3).width = 40;
    wsTeams.getColumn(4).width = 22;
    wsTeams.getColumn(5).width = 28;

    // ─────────────────────────────────────────────
    // HOJA 2: LISTADO CONSOLIDADO MAESTRO
    // ─────────────────────────────────────────────
    const wsMaster = workbook.addWorksheet("Listado Consolidado", {
        views: [{ showGridLines: true }],
    });

    const masterCols = 5;

    // Header 1
    wsMaster.mergeCells(1, 1, 1, masterCols);
    const mR1 = wsMaster.getCell(1, 1);
    mR1.value = "ACADEMIX • LISTADO CONSOLIDADO DE ASIGNACIÓN GRUPAL";
    mR1.font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    mR1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
    mR1.alignment = { vertical: "middle", indent: 1 };
    wsMaster.getRow(1).height = 26;

    // Header 2
    wsMaster.mergeCells(2, 1, 2, masterCols);
    const mR2 = wsMaster.getCell(2, 1);
    mR2.value = `Ficha / Programa: ${options?.groupName || "General"} ${options?.groupCode ? `(${options.groupCode})` : ""} • Fecha: ${dateStr}`;
    mR2.font = { name: "Segoe UI", size: 8.5, color: { argb: "FF334155" } };
    mR2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    mR2.alignment = { vertical: "middle", indent: 1 };
    wsMaster.getRow(2).height = 18;

    wsMaster.getRow(3).height = 8;

    // Master Column headers
    const mHeaders = ["N°", "Equipo Asignado", "Documento", "Nombre Completo del Aprendiz", "Rol Tentativo"];
    const mHeaderRow = wsMaster.getRow(4);
    mHeaders.forEach((h, i) => {
        const cell = mHeaderRow.getCell(i + 1);
        cell.value = h;
        cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } }; // Slate 800
        cell.alignment = { vertical: "middle", horizontal: i === 3 ? "left" : "center" };
        cell.border = borderThin;
    });
    mHeaderRow.height = 22;

    let mCurrentRow = 5;
    let masterIndex = 1;

    groups.forEach((g) => {
        g.students.forEach((st, sIdx) => {
            const row = wsMaster.getRow(mCurrentRow);
            row.getCell(1).value = masterIndex++;
            row.getCell(2).value = g.name;
            row.getCell(3).value = st.profile?.identificacion || "N/A";
            row.getCell(4).value = formatName(st.name, st.profile);
            row.getCell(5).value = sIdx === 0 ? "Líder" : "Integrante";

            row.getCell(1).alignment = { vertical: "middle", horizontal: "center" };
            row.getCell(2).alignment = { vertical: "middle", horizontal: "center" };
            row.getCell(3).alignment = { vertical: "middle", horizontal: "center" };
            row.getCell(4).alignment = { vertical: "middle", horizontal: "left", indent: 1 };
            row.getCell(5).alignment = { vertical: "middle", horizontal: "center" };

            row.getCell(2).font = { name: "Segoe UI", size: 8.5, bold: true, color: { argb: "FF15803D" } };
            row.getCell(4).font = { name: "Segoe UI", size: 8.5, bold: true, color: { argb: "FF0F172A" } };

            for (let c = 1; c <= masterCols; c++) {
                const cell = row.getCell(c);
                cell.border = borderThin;
                if (mCurrentRow % 2 === 0) {
                    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
                }
            }

            row.height = 19;
            mCurrentRow++;
        });
    });

    ungrouped.forEach((st) => {
        const row = wsMaster.getRow(mCurrentRow);
        row.getCell(1).value = masterIndex++;
        row.getCell(2).value = "Sin Asignar";
        row.getCell(3).value = st.profile?.identificacion || "N/A";
        row.getCell(4).value = formatName(st.name, st.profile);
        row.getCell(5).value = "Pendiente";

        row.getCell(1).alignment = { vertical: "middle", horizontal: "center" };
        row.getCell(2).alignment = { vertical: "middle", horizontal: "center" };
        row.getCell(3).alignment = { vertical: "middle", horizontal: "center" };
        row.getCell(4).alignment = { vertical: "middle", horizontal: "left", indent: 1 };
        row.getCell(5).alignment = { vertical: "middle", horizontal: "center" };

        row.getCell(2).font = { name: "Segoe UI", size: 8.5, italic: true, color: { argb: "FFB45309" } };
        row.getCell(5).font = { name: "Segoe UI", size: 8, italic: true, color: { argb: "FF64748B" } };

        for (let c = 1; c <= masterCols; c++) {
            row.getCell(c).border = borderThin;
        }

        row.height = 19;
        mCurrentRow++;
    });

    wsMaster.getColumn(1).width = 8;
    wsMaster.getColumn(2).width = 22;
    wsMaster.getColumn(3).width = 16;
    wsMaster.getColumn(4).width = 40;
    wsMaster.getColumn(5).width = 18;

    // Buffer and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeCode = String(options?.groupCode || options?.groupName || "Grupos").replace(/[^a-zA-Z0-9]/g, "_");
    a.download = `Equipos_Trabajo_${safeCode}_${new Date().toISOString().split("T")[0]}.xlsx`;
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
    // Stats Bar
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
    // Team Block
    groupCard: {
        borderWidth: 1,
        borderColor: "#cbd5e1",
        borderRadius: 4,
        overflow: "hidden",
        marginBottom: 8,
    },
    groupCardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#f1f5f9",
        paddingVertical: 4,
        paddingHorizontal: 6,
        borderBottomWidth: 1,
        borderBottomColor: "#cbd5e1",
    },
    groupNameText: {
        fontSize: 8.5,
        fontFamily: "Helvetica-Bold",
        color: "#0f172a",
    },
    groupCountBadge: {
        fontSize: 6.5,
        fontFamily: "Helvetica-Bold",
        color: "#15803d",
        backgroundColor: "#dcfce7",
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 3,
    },
    // Table inside Group
    tableHeaderRow: {
        flexDirection: "row",
        backgroundColor: "#15803d",
        paddingVertical: 3.5,
        paddingHorizontal: 4,
    },
    tableHeaderCell: {
        color: "#ffffff",
        fontFamily: "Helvetica-Bold",
        fontSize: 6.5,
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
    colNum: { width: "6%", textAlign: "center" },
    colDoc: { width: "18%", textAlign: "center" },
    colName: { width: "42%", paddingLeft: 4 },
    colRole: { width: "16%", textAlign: "center" },
    colNotes: { width: "18%", paddingLeft: 4 },

    cellText: {
        fontSize: 7,
        color: "#334155",
    },
    cellBold: {
        fontSize: 7,
        fontFamily: "Helvetica-Bold",
        color: "#0f172a",
    },
    roleLeaderBadge: {
        fontSize: 6,
        fontFamily: "Helvetica-Bold",
        color: "#166534",
        backgroundColor: "#dcfce7",
        paddingVertical: 1,
        paddingHorizontal: 4,
        borderRadius: 2,
        textAlign: "center",
    },
    roleMemberBadge: {
        fontSize: 6,
        color: "#475569",
        backgroundColor: "#f1f5f9",
        paddingVertical: 1,
        paddingHorizontal: 4,
        borderRadius: 2,
        textAlign: "center",
    },
    emptyGroupText: {
        fontSize: 7,
        fontStyle: "italic",
        color: "#94a3b8",
        paddingVertical: 6,
        textAlign: "center",
    },
    // Ungrouped Box
    ungroupedCard: {
        borderWidth: 1,
        borderColor: "#fde68a",
        borderRadius: 4,
        backgroundColor: "#fffbeb",
        padding: 6,
        marginBottom: 8,
    },
    ungroupedTitle: {
        fontSize: 7.5,
        fontFamily: "Helvetica-Bold",
        color: "#92400e",
        marginBottom: 4,
        textTransform: "uppercase",
    },
    ungroupedNames: {
        fontSize: 7,
        color: "#78350f",
        lineHeight: 1.4,
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

function GroupPdfDocument({
    groups,
    ungrouped = [],
    options,
}: {
    groups: GroupItem[];
    ungrouped?: GroupStudent[];
    options?: GroupExportOptions;
}) {
    const groupName = options?.groupName || "General";
    const groupCode = options?.groupCode ? `(${options.groupCode})` : "";
    const dateStr = new Date().toLocaleDateString("es-CO", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    const totalAssigned = groups.reduce((acc, g) => acc + g.students.length, 0);
    const totalStudents = totalAssigned + ungrouped.length;
    const avgPerGroup = groups.length > 0 ? (totalAssigned / groups.length).toFixed(1) : "0";

    return (
        <Document
            title={`Equipos_Trabajo_${groupName}`}
            author="AcademiX"
            subject="Conformación Oficial de Equipos de Trabajo"
        >
            <Page size="A4" orientation="portrait" style={pdfStyles.page}>
                {/* Header */}
                <View style={pdfStyles.headerContainer}>
                    <View style={pdfStyles.headerLeft}>
                        <Text style={pdfStyles.institutionTag}>AcademiX • Dinámicas y Trabajo Colaborativo</Text>
                        <Text style={pdfStyles.mainTitle}>Conformación de Equipos de Trabajo</Text>
                        <Text style={pdfStyles.subTitle}>
                            Ficha / Grupo: {groupName} {groupCode} • Emisión: {dateStr}
                        </Text>
                    </View>
                    <View style={pdfStyles.badgeHeader}>
                        <Text style={pdfStyles.badgeHeaderText}>Reporte Oficial</Text>
                        <Text style={pdfStyles.badgeHeaderSub}>
                            {groups.length} equipos • {totalStudents} aprendices
                        </Text>
                    </View>
                </View>

                {/* Stats Bar */}
                <View style={pdfStyles.statsBar}>
                    <View style={pdfStyles.statItem}>
                        <Text style={pdfStyles.statLabel}>Total Equipos</Text>
                        <Text style={pdfStyles.statValue}>{groups.length}</Text>
                    </View>
                    <View style={pdfStyles.statItem}>
                        <Text style={pdfStyles.statLabel}>Aprendices Asignados</Text>
                        <Text style={pdfStyles.statValue}>{totalAssigned}</Text>
                    </View>
                    <View style={pdfStyles.statItem}>
                        <Text style={pdfStyles.statLabel}>Promedio / Equipo</Text>
                        <Text style={pdfStyles.statValue}>{avgPerGroup}</Text>
                    </View>
                    <View style={pdfStyles.statItem}>
                        <Text style={pdfStyles.statLabel}>Sin Asignar</Text>
                        <Text style={[pdfStyles.statValue, { color: ungrouped.length > 0 ? "#d97706" : "#0f172a" }]}>
                            {ungrouped.length}
                        </Text>
                    </View>
                </View>

                {/* Groups List */}
                {groups.map((group, gIdx) => (
                    <View key={group.id || gIdx} style={pdfStyles.groupCard} wrap={false}>
                        <View style={pdfStyles.groupCardHeader}>
                            <Text style={pdfStyles.groupNameText}>
                                {gIdx + 1}. {group.name}
                            </Text>
                            <Text style={pdfStyles.groupCountBadge}>
                                {group.students.length} {group.students.length === 1 ? "aprendiz" : "aprendices"}
                            </Text>
                        </View>

                        <View style={pdfStyles.tableHeaderRow}>
                            <Text style={[pdfStyles.tableHeaderCell, pdfStyles.colNum]}>#</Text>
                            <Text style={[pdfStyles.tableHeaderCell, pdfStyles.colDoc]}>Identificación</Text>
                            <Text style={[pdfStyles.tableHeaderCell, pdfStyles.colName]}>Aprendiz</Text>
                            <Text style={[pdfStyles.tableHeaderCell, pdfStyles.colRole]}>Rol Asignado</Text>
                            <Text style={[pdfStyles.tableHeaderCell, pdfStyles.colNotes]}>Firma / Observación</Text>
                        </View>

                        {group.students.length === 0 ? (
                            <Text style={pdfStyles.emptyGroupText}>Sin aprendices asignados a este equipo</Text>
                        ) : (
                            group.students.map((student, sIdx) => {
                                const isEven = sIdx % 2 === 0;
                                const fullName = formatName(student.name, student.profile);
                                const doc = student.profile?.identificacion || "—";
                                const isLeader = sIdx === 0;

                                return (
                                    <View
                                        key={student.id || sIdx}
                                        style={[pdfStyles.tableRow, isEven ? pdfStyles.rowEven : pdfStyles.rowOdd]}
                                    >
                                        <Text style={[pdfStyles.cellText, pdfStyles.colNum]}>{sIdx + 1}</Text>
                                        <Text style={[pdfStyles.cellText, pdfStyles.colDoc]}>{doc}</Text>
                                        <Text style={[pdfStyles.cellBold, pdfStyles.colName]}>{fullName}</Text>
                                        <View style={pdfStyles.colRole}>
                                            <Text style={isLeader ? pdfStyles.roleLeaderBadge : pdfStyles.roleMemberBadge}>
                                                {isLeader ? "Líder" : "Integrante"}
                                            </Text>
                                        </View>
                                        <Text style={[pdfStyles.cellText, pdfStyles.colNotes]}>—</Text>
                                    </View>
                                );
                            })
                        )}
                    </View>
                ))}

                {/* Ungrouped section if any */}
                {ungrouped.length > 0 && (
                    <View style={pdfStyles.ungroupedCard} wrap={false}>
                        <Text style={pdfStyles.ungroupedTitle}>
                            Aprendices Disponibles Sin Grupo Asignado ({ungrouped.length})
                        </Text>
                        <Text style={pdfStyles.ungroupedNames}>
                            {ungrouped.map((s) => `${formatName(s.name, s.profile)} (${s.profile?.identificacion || "S/D"})`).join(" • ")}
                        </Text>
                    </View>
                )}

                {/* Fixed Footer */}
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

export async function exportGroupsToCorporatePdf(
    groups: GroupItem[],
    ungrouped: GroupStudent[] = [],
    options?: GroupExportOptions
) {
    const blob = await pdf(
        <GroupPdfDocument groups={groups} ungrouped={ungrouped} options={options} />
    ).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const safeCode = String(options?.groupCode || options?.groupName || "Grupos").replace(/[^a-zA-Z0-9]/g, "_");
    link.download = `Equipos_Trabajo_${safeCode}_${new Date().toISOString().split("T")[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
