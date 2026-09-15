import React from "react";
import ExcelJS from "exceljs";
import { pdf, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { formatName } from "@/lib/utils";

// -------------------------------------------------------------
// Common Date Helpers & Triggers
// -------------------------------------------------------------
const formatDateSafe = (d: any) => {
    if (!d) return "No definida";
    try {
        return format(new Date(d), "dd/MM/yyyy", { locale: es });
    } catch {
        return "No definida";
    }
};

const triggerExcelDownload = async (workbook: ExcelJS.Workbook, filename: string) => {
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

const triggerPdfDownload = async (docElement: any, filename: string) => {
    const blob = await pdf(docElement).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

// -------------------------------------------------------------
// PDF Shared Styles
// -------------------------------------------------------------
const pdfStyles = StyleSheet.create({
    page: {
        padding: 24,
        paddingBottom: 36,
        backgroundColor: "#ffffff",
        fontFamily: "Helvetica",
        fontSize: 8,
        color: "#1e293b",
    },
    headerBanner: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottomWidth: 2,
        borderBottomColor: "#4f46e5",
        paddingBottom: 8,
        marginBottom: 10,
    },
    headerTitleBlock: {
        flexDirection: "column",
        gap: 2,
    },
    brandTitle: {
        fontSize: 13,
        fontFamily: "Helvetica-Bold",
        color: "#1e1b4b",
        textTransform: "uppercase",
    },
    subTitle: {
        fontSize: 8,
        color: "#64748b",
    },
    badge: {
        backgroundColor: "#eef2ff",
        borderWidth: 1,
        borderColor: "#c7d2fe",
        borderRadius: 4,
        paddingHorizontal: 6,
        paddingVertical: 3,
    },
    badgeText: {
        fontSize: 7.5,
        fontFamily: "Helvetica-Bold",
        color: "#4338ca",
    },
    metaCard: {
        backgroundColor: "#f8fafc",
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderRadius: 5,
        padding: 8,
        marginBottom: 10,
    },
    metaGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    metaItem: {
        width: "48%",
        marginBottom: 4,
    },
    metaLabel: {
        fontSize: 7,
        fontFamily: "Helvetica-Bold",
        color: "#64748b",
        textTransform: "uppercase",
    },
    metaValue: {
        fontSize: 8,
        fontFamily: "Helvetica",
        color: "#0f172a",
        marginTop: 1,
    },
    kpiRow: {
        flexDirection: "row",
        gap: 6,
        marginBottom: 10,
    },
    kpiBox: {
        flex: 1,
        backgroundColor: "#f8fafc",
        borderWidth: 1,
        borderColor: "#cbd5e1",
        borderRadius: 4,
        padding: 6,
        alignItems: "center",
    },
    kpiNum: {
        fontSize: 12,
        fontFamily: "Helvetica-Bold",
        color: "#4338ca",
    },
    kpiLabel: {
        fontSize: 6.5,
        color: "#64748b",
        textTransform: "uppercase",
        marginTop: 2,
    },
    sectionTitle: {
        fontSize: 9.5,
        fontFamily: "Helvetica-Bold",
        color: "#1e1b4b",
        marginTop: 8,
        marginBottom: 5,
        textTransform: "uppercase",
    },
    table: {
        width: "100%",
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderRadius: 3,
        overflow: "hidden",
        marginBottom: 10,
    },
    tableHeaderRow: {
        flexDirection: "row",
        backgroundColor: "#4338ca",
        paddingVertical: 5,
        paddingHorizontal: 4,
    },
    tableHeaderCell: {
        fontFamily: "Helvetica-Bold",
        fontSize: 7.5,
        color: "#ffffff",
    },
    tableRow: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#f1f5f9",
        paddingVertical: 4.5,
        paddingHorizontal: 4,
    },
    tableRowEven: {
        backgroundColor: "#f8fafc",
    },
    tableCell: {
        fontSize: 7.5,
        color: "#1e293b",
    },
    footer: {
        position: "absolute",
        bottom: 15,
        left: 24,
        right: 24,
        flexDirection: "row",
        justifyContent: "space-between",
        borderTopWidth: 1,
        borderTopColor: "#e2e8f0",
        paddingTop: 5,
    },
    footerText: {
        fontSize: 6.5,
        color: "#94a3b8",
    },
});

// =============================================================
// 1. PESTAÑA: RESUMEN GENERAL
// =============================================================

export async function exportProgramOverviewExcel(program: any) {
    const wb = new ExcelJS.Workbook();
    wb.creator = "AcademiX";
    wb.created = new Date();

    const groups = program.groups || [];
    const periods = program.periods || [];
    const teachers = program.teachers || [];
    const gestores = program.gestores || [];
    const totalStudents = groups.reduce((acc: number, g: any) => acc + (g.students?.length || 0), 0);

    const lectivaCount = groups.filter((g: any) => (g.categoria || "LECTIVA") === "LECTIVA").length;
    const productivaCount = groups.filter((g: any) => g.categoria === "PRODUCTIVA").length;
    const egresadosCount = groups.filter((g: any) => g.categoria === "EGRESADOS").length;

    const sheet = wb.addWorksheet("Resumen General");

    // Title Row
    sheet.mergeCells("A1:F1");
    const titleCell = sheet.getCell("A1");
    titleCell.value = `ACADEMIX — PROGRAMA DE FORMACIÓN: ${program.name.toUpperCase()}`;
    titleCell.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF312E81" } };
    titleCell.alignment = { vertical: "middle", horizontal: "center" };
    sheet.getRow(1).height = 32;

    sheet.mergeCells("A2:F2");
    const subCell = sheet.getCell("A2");
    subCell.value = `Resumen Ejecutivo y Ficha Técnica Institucional | Generado el ${format(new Date(), "dd/MM/yyyy HH:mm")}`;
    subCell.font = { name: "Segoe UI", size: 10, italic: true, color: { argb: "FF334155" } };
    subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E7FF" } };
    subCell.alignment = { vertical: "middle", horizontal: "center" };
    sheet.getRow(2).height = 20;

    sheet.addRow([]);

    // Meta Section
    sheet.addRow(["PARÁMETROS GENERALES DEL PROGRAMA"]).font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FF1E1B4B" } };
    const metaRows = [
        ["Nombre Oficial", program.name, "Gestores Académicos", gestores.map((g: any) => g.name).join(", ") || "No asignados"],
        ["Descripción", program.description || "Sin descripción oficial", "Total Aprendices", `${totalStudents} matriculados`],
        ["Fichas de Formación", `${groups.length} fichas`, "Equipo de Instructores", `${teachers.length} instructores`],
        ["Periodos Curriculares", `${periods.length} periodos`, "Límite Horas Instructor", `${program.maxWeeklyHoursPerInstructor || 40} h/semana`],
        ["Fecha Inicio", formatDateSafe(program.startDate), "Fecha Fin", formatDateSafe(program.endDate)],
        ["Duración Lectiva", `${program.duracionLectiva || "No definida"} meses`, "Duración Productiva", `${program.duracionProductiva || "No definida"} meses`],
    ];

    metaRows.forEach(r => {
        const row = sheet.addRow(r);
        row.height = 19;
        row.getCell(1).font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF475569" } };
        row.getCell(2).font = { name: "Segoe UI", size: 9, color: { argb: "FF0F172A" } };
        row.getCell(3).font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF475569" } };
        row.getCell(4).font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF4338CA" } };
    });

    sheet.addRow([]);

    // Distribution by stage
    sheet.addRow(["DISTRIBUCIÓN DE FICHAS POR ETAPA DE FORMACIÓN"]).font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FF1E1B4B" } };
    const stageHeader = sheet.addRow(["Etapa", "Cantidad de Fichas", "Total Aprendices", "% Participación"]);
    stageHeader.height = 22;
    stageHeader.eachCell((cell: any) => {
        cell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4338CA" } };
        cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    const stageData = [
        { label: "Etapa Lectiva", fichas: lectivaCount, students: groups.filter((g: any) => (g.categoria || "LECTIVA") === "LECTIVA").reduce((a: number, b: any) => a + (b.students?.length || 0), 0) },
        { label: "Etapa Productiva", fichas: productivaCount, students: groups.filter((g: any) => g.categoria === "PRODUCTIVA").reduce((a: number, b: any) => a + (b.students?.length || 0), 0) },
        { label: "Egresados", fichas: egresadosCount, students: groups.filter((g: any) => g.categoria === "EGRESADOS").reduce((a: number, b: any) => a + (b.students?.length || 0), 0) },
    ];

    stageData.forEach((st, idx) => {
        const pct = totalStudents > 0 ? ((st.students / totalStudents) * 100).toFixed(1) : "0.0";
        const row = sheet.addRow([st.label, st.fichas, st.students, `${pct}%`]);
        row.height = 19;
        row.eachCell((cell: any) => {
            cell.font = { name: "Segoe UI", size: 9, color: { argb: "FF0F172A" } };
            cell.alignment = { vertical: "middle", horizontal: "center" };
            cell.border = {
                top: { style: "thin", color: { argb: "FFE2E8F0" } },
                bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
            };
        });
    });

    sheet.addRow([]);

    // Groups Table
    sheet.addRow(["CONSOLIDADO DE FICHAS DEL PROGRAMA"]).font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FF1E1B4B" } };
    const groupHeader = sheet.addRow(["N°", "Código Ficha", "Etapa", "Ambiente Asignado", "Total Aprendices", "Fecha Inicio", "Fecha Fin"]);
    groupHeader.height = 22;
    groupHeader.eachCell((cell: any) => {
        cell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF312E81" } };
        cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    groups.forEach((g: any, idx: number) => {
        const row = sheet.addRow([
            idx + 1,
            g.name,
            g.categoria || "LECTIVA",
            g.environment?.name || "No asignado",
            g.students?.length || 0,
            formatDateSafe(g.startDate),
            formatDateSafe(g.endDate)
        ]);
        row.height = 19;
        const bg = idx % 2 === 0 ? "FFFFFFFF" : "FFEEF2FF";
        row.eachCell((cell: any, cIdx: number) => {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
            cell.font = { name: "Segoe UI", size: 9, color: { argb: "FF0F172A" } };
            cell.alignment = { vertical: "middle", horizontal: cIdx === 2 ? "left" : "center" };
            cell.border = {
                top: { style: "thin", color: { argb: "FFE2E8F0" } },
                bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
            };
        });
    });

    sheet.getColumn(1).width = 24;
    sheet.getColumn(2).width = 30;
    sheet.getColumn(3).width = 24;
    sheet.getColumn(4).width = 24;
    sheet.getColumn(5).width = 18;
    sheet.getColumn(6).width = 18;

    await triggerExcelDownload(wb, `Resumen_General_${program.name.replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`);
}

export async function exportProgramOverviewPdf(program: any) {
    const groups = program.groups || [];
    const periods = program.periods || [];
    const teachers = program.teachers || [];
    const gestores = program.gestores || [];
    const totalStudents = groups.reduce((acc: number, g: any) => acc + (g.students?.length || 0), 0);

    const lectivaCount = groups.filter((g: any) => (g.categoria || "LECTIVA") === "LECTIVA").length;
    const productivaCount = groups.filter((g: any) => g.categoria === "PRODUCTIVA").length;
    const egresadosCount = groups.filter((g: any) => g.categoria === "EGRESADOS").length;

    const doc = (
        <Document title={`Resumen General - ${program.name}`}>
            <Page size="A4" style={pdfStyles.page}>
                {/* Header Banner */}
                <View style={pdfStyles.headerBanner}>
                    <View style={pdfStyles.headerTitleBlock}>
                        <Text style={pdfStyles.brandTitle}>ACADEMIX — {program.name}</Text>
                        <Text style={pdfStyles.subTitle}>Reporte Oficial de Resumen General y Ficha Técnica Institucional</Text>
                    </View>
                    <View style={pdfStyles.badge}>
                        <Text style={pdfStyles.badgeText}>Solo Lectura • Admin</Text>
                    </View>
                </View>

                {/* KPIs */}
                <View style={pdfStyles.kpiRow}>
                    <View style={pdfStyles.kpiBox}>
                        <Text style={pdfStyles.kpiNum}>{totalStudents}</Text>
                        <Text style={pdfStyles.kpiLabel}>Aprendices Totales</Text>
                    </View>
                    <View style={pdfStyles.kpiBox}>
                        <Text style={pdfStyles.kpiNum}>{groups.length}</Text>
                        <Text style={pdfStyles.kpiLabel}>Fichas de Formación</Text>
                    </View>
                    <View style={pdfStyles.kpiBox}>
                        <Text style={pdfStyles.kpiNum}>{periods.length}</Text>
                        <Text style={pdfStyles.kpiLabel}>Periodos Curriculares</Text>
                    </View>
                    <View style={pdfStyles.kpiBox}>
                        <Text style={pdfStyles.kpiNum}>{teachers.length}</Text>
                        <Text style={pdfStyles.kpiLabel}>Equipo de Instructores</Text>
                    </View>
                </View>

                {/* Meta Card */}
                <View style={pdfStyles.metaCard}>
                    <View style={pdfStyles.metaGrid}>
                        <View style={pdfStyles.metaItem}>
                            <Text style={pdfStyles.metaLabel}>Gestores Académicos:</Text>
                            <Text style={pdfStyles.metaValue}>{gestores.map((g: any) => g.name).join(", ") || "No asignados"}</Text>
                        </View>
                        <View style={pdfStyles.metaItem}>
                            <Text style={pdfStyles.metaLabel}>Límite Semanal de Horas Instructor:</Text>
                            <Text style={pdfStyles.metaValue}>{program.maxWeeklyHoursPerInstructor || 40} h/semana</Text>
                        </View>
                        <View style={pdfStyles.metaItem}>
                            <Text style={pdfStyles.metaLabel}>Vigencia del Programa:</Text>
                            <Text style={pdfStyles.metaValue}>{formatDateSafe(program.startDate)} — {formatDateSafe(program.endDate)}</Text>
                        </View>
                        <View style={pdfStyles.metaItem}>
                            <Text style={pdfStyles.metaLabel}>Duración Oficial:</Text>
                            <Text style={pdfStyles.metaValue}>Lectiva: {program.duracionLectiva || "-"} meses | Productiva: {program.duracionProductiva || "-"} meses</Text>
                        </View>
                    </View>
                </View>

                {/* Distribution */}
                <Text style={pdfStyles.sectionTitle}>Distribución por Etapa de Formación</Text>
                <View style={pdfStyles.table}>
                    <View style={pdfStyles.tableHeaderRow}>
                        <Text style={[pdfStyles.tableHeaderCell, { width: "40%" }]}>Etapa</Text>
                        <Text style={[pdfStyles.tableHeaderCell, { width: "30%", textAlign: "center" }]}>Fichas Asignadas</Text>
                        <Text style={[pdfStyles.tableHeaderCell, { width: "30%", textAlign: "center" }]}>Aprendices Matriculados</Text>
                    </View>
                    <View style={pdfStyles.tableRow}>
                        <Text style={[pdfStyles.tableCell, { width: "40%", fontFamily: "Helvetica-Bold" }]}>Etapa Lectiva</Text>
                        <Text style={[pdfStyles.tableCell, { width: "30%", textAlign: "center" }]}>{lectivaCount} fichas</Text>
                        <Text style={[pdfStyles.tableCell, { width: "30%", textAlign: "center" }]}>{groups.filter((g: any) => (g.categoria || "LECTIVA") === "LECTIVA").reduce((a: number, b: any) => a + (b.students?.length || 0), 0)} aprendices</Text>
                    </View>
                    <View style={[pdfStyles.tableRow, pdfStyles.tableRowEven]}>
                        <Text style={[pdfStyles.tableCell, { width: "40%", fontFamily: "Helvetica-Bold" }]}>Etapa Productiva</Text>
                        <Text style={[pdfStyles.tableCell, { width: "30%", textAlign: "center" }]}>{productivaCount} fichas</Text>
                        <Text style={[pdfStyles.tableCell, { width: "30%", textAlign: "center" }]}>{groups.filter((g: any) => g.categoria === "PRODUCTIVA").reduce((a: number, b: any) => a + (b.students?.length || 0), 0)} aprendices</Text>
                    </View>
                    <View style={pdfStyles.tableRow}>
                        <Text style={[pdfStyles.tableCell, { width: "40%", fontFamily: "Helvetica-Bold" }]}>Egresados</Text>
                        <Text style={[pdfStyles.tableCell, { width: "30%", textAlign: "center" }]}>{egresadosCount} fichas</Text>
                        <Text style={[pdfStyles.tableCell, { width: "30%", textAlign: "center" }]}>{groups.filter((g: any) => g.categoria === "EGRESADOS").reduce((a: number, b: any) => a + (b.students?.length || 0), 0)} aprendices</Text>
                    </View>
                </View>

                {/* Groups */}
                <Text style={pdfStyles.sectionTitle}>Fichas Activas ({groups.length})</Text>
                <View style={pdfStyles.table}>
                    <View style={pdfStyles.tableHeaderRow}>
                        <Text style={[pdfStyles.tableHeaderCell, { width: "8%", textAlign: "center" }]}>#</Text>
                        <Text style={[pdfStyles.tableHeaderCell, { width: "25%" }]}>Código Ficha</Text>
                        <Text style={[pdfStyles.tableHeaderCell, { width: "25%" }]}>Etapa</Text>
                        <Text style={[pdfStyles.tableHeaderCell, { width: "24%" }]}>Ambiente</Text>
                        <Text style={[pdfStyles.tableHeaderCell, { width: "18%", textAlign: "center" }]}>Aprendices</Text>
                    </View>
                    {groups.map((g: any, idx: number) => (
                        <View key={g.id} style={[pdfStyles.tableRow, idx % 2 === 1 ? pdfStyles.tableRowEven : {}]}>
                            <Text style={[pdfStyles.tableCell, { width: "8%", textAlign: "center" }]}>{idx + 1}</Text>
                            <Text style={[pdfStyles.tableCell, { width: "25%", fontFamily: "Helvetica-Bold" }]}>{g.name}</Text>
                            <Text style={[pdfStyles.tableCell, { width: "25%" }]}>{g.categoria || "LECTIVA"}</Text>
                            <Text style={[pdfStyles.tableCell, { width: "24%" }]}>{g.environment?.name || "Sin aula"}</Text>
                            <Text style={[pdfStyles.tableCell, { width: "18%", textAlign: "center", fontFamily: "Helvetica-Bold", color: "#4338ca" }]}>{g.students?.length || 0}</Text>
                        </View>
                    ))}
                </View>

                {/* Footer */}
                <View style={pdfStyles.footer}>
                    <Text style={pdfStyles.footerText}>AcademiX Platform • Sistema de Gestión Académica Institucional</Text>
                    <Text style={pdfStyles.footerText}>Generado el {format(new Date(), "dd/MM/yyyy HH:mm")}</Text>
                </View>
            </Page>
        </Document>
    );

    await triggerPdfDownload(doc, `Resumen_General_${program.name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`);
}

// =============================================================
// 2. PESTAÑA: MALLA CURRICULAR
// =============================================================

export async function exportProgramCurriculumExcel(program: any) {
    const wb = new ExcelJS.Workbook();
    wb.creator = "AcademiX";
    wb.created = new Date();

    const periods = program.periods || [];
    const sheet = wb.addWorksheet("Malla Curricular");

    // Title
    sheet.mergeCells("A1:F1");
    const titleCell = sheet.getCell("A1");
    titleCell.value = `ACADEMIX — MALLA CURRICULAR: ${program.name.toUpperCase()}`;
    titleCell.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4338CA" } };
    titleCell.alignment = { vertical: "middle", horizontal: "center" };
    sheet.getRow(1).height = 30;

    sheet.mergeCells("A2:F2");
    const subCell = sheet.getCell("A2");
    subCell.value = `Plan de Formación y Asignaturas por Periodos Académicos | Generado el ${format(new Date(), "dd/MM/yyyy HH:mm")}`;
    subCell.font = { name: "Segoe UI", size: 10, italic: true, color: { argb: "FF334155" } };
    subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF2FF" } };
    subCell.alignment = { vertical: "middle", horizontal: "center" };
    sheet.getRow(2).height = 20;

    sheet.addRow([]);

    const header = sheet.addRow(["N°", "Periodo Académico", "Tipo Periodo", "Asignatura / Competencia", "Horas Semanales", "Descripción"]);
    header.height = 22;
    header.eachCell((cell: any) => {
        cell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF312E81" } };
        cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    let counter = 1;
    let totalWeeklyHours = 0;

    periods.forEach((p: any) => {
        const pCourses = p.courses || [];
        if (pCourses.length === 0) {
            const row = sheet.addRow([counter++, p.name, p.esEspecial ? "Especial" : "Regular", "Sin asignaturas registradas", 0, "-"]);
            row.height = 19;
            row.eachCell((cell: any) => {
                cell.font = { name: "Segoe UI", size: 9, italic: true, color: { argb: "FF94A3B8" } };
                cell.alignment = { vertical: "middle", horizontal: "center" };
            });
        } else {
            pCourses.forEach((c: any) => {
                const hours = c.weeklyHours || 0;
                totalWeeklyHours += hours;
                const row = sheet.addRow([
                    counter++,
                    p.name,
                    p.esEspecial ? "Especial" : "Regular",
                    c.title,
                    `${hours} h/sem`,
                    c.description || "Sin descripción"
                ]);
                row.height = 19;
                const bg = counter % 2 === 0 ? "FFFFFFFF" : "FFEEF2FF";
                row.eachCell((cell: any, cIdx: number) => {
                    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
                    cell.font = { name: "Segoe UI", size: 9, color: { argb: "FF0F172A" } };
                    cell.alignment = { vertical: "middle", horizontal: cIdx === 4 || cIdx === 6 ? "left" : "center" };
                    if (cIdx === 4) cell.font = { name: "Segoe UI", size: 9, bold: true };
                    cell.border = {
                        top: { style: "thin", color: { argb: "FFE2E8F0" } },
                        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
                    };
                });
            });
        }
    });

    // Total row
    const totalRow = sheet.addRow(["", "TOTALES", "", `${counter - 1} Asignaturas`, `${totalWeeklyHours} h/sem`, ""]);
    totalRow.height = 24;
    totalRow.eachCell((cell: any) => {
        cell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FF312E81" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E7FF" } };
        cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    sheet.getColumn(1).width = 6;
    sheet.getColumn(2).width = 24;
    sheet.getColumn(3).width = 16;
    sheet.getColumn(4).width = 38;
    sheet.getColumn(5).width = 18;
    sheet.getColumn(6).width = 45;

    await triggerExcelDownload(wb, `Malla_Curricular_${program.name.replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`);
}

export async function exportProgramCurriculumPdf(program: any) {
    const periods = program.periods || [];
    let totalWeeklyHours = 0;
    let totalCourses = 0;

    periods.forEach((p: any) => {
        (p.courses || []).forEach((c: any) => {
            totalCourses++;
            totalWeeklyHours += c.weeklyHours || 0;
        });
    });

    const doc = (
        <Document title={`Malla Curricular - ${program.name}`}>
            <Page size="A4" style={pdfStyles.page}>
                <View style={pdfStyles.headerBanner}>
                    <View style={pdfStyles.headerTitleBlock}>
                        <Text style={pdfStyles.brandTitle}>ACADEMIX — MALLA CURRICULAR</Text>
                        <Text style={pdfStyles.subTitle}>Programa: {program.name} | Periodos y Asignaturas</Text>
                    </View>
                    <View style={pdfStyles.badge}>
                        <Text style={pdfStyles.badgeText}>{totalCourses} Asignaturas • {totalWeeklyHours}h/sem</Text>
                    </View>
                </View>

                <View style={pdfStyles.kpiRow}>
                    <View style={pdfStyles.kpiBox}>
                        <Text style={pdfStyles.kpiNum}>{periods.length}</Text>
                        <Text style={pdfStyles.kpiLabel}>Periodos Académicos</Text>
                    </View>
                    <View style={pdfStyles.kpiBox}>
                        <Text style={pdfStyles.kpiNum}>{totalCourses}</Text>
                        <Text style={pdfStyles.kpiLabel}>Total Asignaturas</Text>
                    </View>
                    <View style={pdfStyles.kpiBox}>
                        <Text style={pdfStyles.kpiNum}>{totalWeeklyHours}h</Text>
                        <Text style={pdfStyles.kpiLabel}>Carga Horaria Semanal</Text>
                    </View>
                </View>

                {periods.map((p: any) => {
                    const pCourses = p.courses || [];
                    const pHours = pCourses.reduce((acc: number, c: any) => acc + (c.weeklyHours || 0), 0);

                    return (
                        <View key={p.id} wrap={false} style={{ marginBottom: 12 }}>
                            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                                <Text style={[pdfStyles.sectionTitle, { marginTop: 0, marginBottom: 0 }]}>
                                    {p.name} {p.esEspecial ? "(Periodo Especial)" : ""}
                                </Text>
                                <Text style={{ fontSize: 7, color: "#4338ca", fontFamily: "Helvetica-Bold" }}>
                                    {pCourses.length} Asignaturas • {pHours}h semanales
                                </Text>
                            </View>

                            <View style={pdfStyles.table}>
                                <View style={pdfStyles.tableHeaderRow}>
                                    <Text style={[pdfStyles.tableHeaderCell, { width: "6%", textAlign: "center" }]}>#</Text>
                                    <Text style={[pdfStyles.tableHeaderCell, { width: "44%" }]}>Asignatura / Competencia</Text>
                                    <Text style={[pdfStyles.tableHeaderCell, { width: "16%", textAlign: "center" }]}>Horas/Sem</Text>
                                    <Text style={[pdfStyles.tableHeaderCell, { width: "34%" }]}>Descripción</Text>
                                </View>
                                {pCourses.length === 0 ? (
                                    <View style={pdfStyles.tableRow}>
                                        <Text style={[pdfStyles.tableCell, { width: "100%", textAlign: "center", fontStyle: "italic", color: "#94a3b8" }]}>
                                            Sin materias curriculares registradas en este periodo
                                        </Text>
                                    </View>
                                ) : (
                                    pCourses.map((c: any, cIdx: number) => (
                                        <View key={c.id} style={[pdfStyles.tableRow, cIdx % 2 === 1 ? pdfStyles.tableRowEven : {}]}>
                                            <Text style={[pdfStyles.tableCell, { width: "6%", textAlign: "center" }]}>{cIdx + 1}</Text>
                                            <Text style={[pdfStyles.tableCell, { width: "44%", fontFamily: "Helvetica-Bold" }]}>{c.title}</Text>
                                            <Text style={[pdfStyles.tableCell, { width: "16%", textAlign: "center", fontFamily: "Helvetica-Bold", color: "#4338ca" }]}>{c.weeklyHours || 0}h</Text>
                                            <Text style={[pdfStyles.tableCell, { width: "34%", color: "#64748b" }]}>{c.description || "Sin descripción"}</Text>
                                        </View>
                                    ))
                                )}
                            </View>
                        </View>
                    );
                })}

                <View style={pdfStyles.footer}>
                    <Text style={pdfStyles.footerText}>AcademiX Platform • Malla Curricular Institucional</Text>
                    <Text style={pdfStyles.footerText}>Generado el {format(new Date(), "dd/MM/yyyy HH:mm")}</Text>
                </View>
            </Page>
        </Document>
    );

    await triggerPdfDownload(doc, `Malla_Curricular_${program.name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`);
}

// =============================================================
// 3. PESTAÑA: EQUIPO DE INSTRUCTORES
// =============================================================

export async function exportProgramTeachersExcel(program: any) {
    const wb = new ExcelJS.Workbook();
    wb.creator = "AcademiX";
    wb.created = new Date();

    const teachers = program.teachers || [];
    const groups = program.groups || [];

    const sheet = wb.addWorksheet("Equipo de Instructores");

    sheet.mergeCells("A1:F1");
    const titleCell = sheet.getCell("A1");
    titleCell.value = `ACADEMIX — EQUIPO DE INSTRUCTORES: ${program.name.toUpperCase()}`;
    titleCell.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4338CA" } };
    titleCell.alignment = { vertical: "middle", horizontal: "center" };
    sheet.getRow(1).height = 30;

    sheet.mergeCells("A2:F2");
    const subCell = sheet.getCell("A2");
    subCell.value = `Directorio y Cargas de Instructores del Programa | Generado el ${format(new Date(), "dd/MM/yyyy HH:mm")}`;
    subCell.font = { name: "Segoe UI", size: 10, italic: true, color: { argb: "FF334155" } };
    subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF2FF" } };
    subCell.alignment = { vertical: "middle", horizontal: "center" };
    sheet.getRow(2).height = 20;

    sheet.addRow([]);

    const header = sheet.addRow(["N°", "Instructor", "Documento", "Correo Electrónico", "Horas Semanales", "Materias y Fichas Asignadas"]);
    header.height = 22;
    header.eachCell((cell: any) => {
        cell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF312E81" } };
        cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    teachers.forEach((t: any, idx: number) => {
        const assignedCourses: any[] = [];
        groups.forEach((g: any) => {
            (g.courses || []).forEach((c: any) => {
                if (c.teacherId === t.id) {
                    assignedCourses.push(`${c.title} (Ficha ${g.name})`);
                }
            });
        });

        const totalHours = groups.reduce((sum: number, g: any) => {
            return sum + (g.courses || []).filter((c: any) => c.teacherId === t.id).reduce((cSum: number, c: any) => cSum + (c.weeklyHours || 0), 0);
        }, 0);

        const row = sheet.addRow([
            idx + 1,
            formatName(t.name || "Instructor"),
            t.profile?.identificacion || "No registrado",
            t.email || "Sin correo",
            `${totalHours} h/sem`,
            assignedCourses.length > 0 ? assignedCourses.join(" | ") : "Sin materias asignadas actualmente"
        ]);
        row.height = 20;
        const bg = idx % 2 === 0 ? "FFFFFFFF" : "FFEEF2FF";
        row.eachCell((cell: any, cIdx: number) => {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
            cell.font = { name: "Segoe UI", size: 9, color: { argb: "FF0F172A" } };
            cell.alignment = { vertical: "middle", horizontal: cIdx === 2 || cIdx === 6 ? "left" : "center" };
            if (cIdx === 2) cell.font = { name: "Segoe UI", size: 9, bold: true };
            if (cIdx === 5) cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF4338CA" } };
            cell.border = {
                top: { style: "thin", color: { argb: "FFE2E8F0" } },
                bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
            };
        });
    });

    sheet.getColumn(1).width = 6;
    sheet.getColumn(2).width = 32;
    sheet.getColumn(3).width = 18;
    sheet.getColumn(4).width = 30;
    sheet.getColumn(5).width = 18;
    sheet.getColumn(6).width = 50;

    await triggerExcelDownload(wb, `Equipo_Instructores_${program.name.replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`);
}

export async function exportProgramTeachersPdf(program: any) {
    const teachers = program.teachers || [];
    const groups = program.groups || [];

    const doc = (
        <Document title={`Equipo de Instructores - ${program.name}`}>
            <Page size="A4" style={pdfStyles.page}>
                <View style={pdfStyles.headerBanner}>
                    <View style={pdfStyles.headerTitleBlock}>
                        <Text style={pdfStyles.brandTitle}>ACADEMIX — EQUIPO DE INSTRUCTORES</Text>
                        <Text style={pdfStyles.subTitle}>Instructores Vinculados • Programa: {program.name}</Text>
                    </View>
                    <View style={pdfStyles.badge}>
                        <Text style={pdfStyles.badgeText}>{teachers.length} Instructores</Text>
                    </View>
                </View>

                <View style={pdfStyles.table}>
                    <View style={pdfStyles.tableHeaderRow}>
                        <Text style={[pdfStyles.tableHeaderCell, { width: "6%", textAlign: "center" }]}>#</Text>
                        <Text style={[pdfStyles.tableHeaderCell, { width: "32%" }]}>Instructor</Text>
                        <Text style={[pdfStyles.tableHeaderCell, { width: "18%" }]}>Identificación</Text>
                        <Text style={[pdfStyles.tableHeaderCell, { width: "26%" }]}>Correo</Text>
                        <Text style={[pdfStyles.tableHeaderCell, { width: "18%", textAlign: "center" }]}>Horas Asignadas</Text>
                    </View>
                    {teachers.length === 0 ? (
                        <View style={pdfStyles.tableRow}>
                            <Text style={[pdfStyles.tableCell, { width: "100%", textAlign: "center", fontStyle: "italic", color: "#94a3b8" }]}>
                                No hay instructores asociados a este programa de formación
                            </Text>
                        </View>
                    ) : (
                        teachers.map((t: any, idx: number) => {
                            const totalHours = groups.reduce((sum: number, g: any) => {
                                return sum + (g.courses || []).filter((c: any) => c.teacherId === t.id).reduce((cSum: number, c: any) => cSum + (c.weeklyHours || 0), 0);
                            }, 0);

                            return (
                                <View key={t.id} style={[pdfStyles.tableRow, idx % 2 === 1 ? pdfStyles.tableRowEven : {}]}>
                                    <Text style={[pdfStyles.tableCell, { width: "6%", textAlign: "center" }]}>{idx + 1}</Text>
                                    <Text style={[pdfStyles.tableCell, { width: "32%", fontFamily: "Helvetica-Bold" }]}>{formatName(t.name || "Instructor")}</Text>
                                    <Text style={[pdfStyles.tableCell, { width: "18%" }]}>{t.profile?.identificacion || "S/I"}</Text>
                                    <Text style={[pdfStyles.tableCell, { width: "26%", color: "#64748b" }]}>{t.email}</Text>
                                    <Text style={[pdfStyles.tableCell, { width: "18%", textAlign: "center", fontFamily: "Helvetica-Bold", color: "#4338ca" }]}>{totalHours} h/sem</Text>
                                </View>
                            );
                        })
                    )}
                </View>

                <View style={pdfStyles.footer}>
                    <Text style={pdfStyles.footerText}>AcademiX Platform • Directorio de Instructores</Text>
                    <Text style={pdfStyles.footerText}>Generado el {format(new Date(), "dd/MM/yyyy HH:mm")}</Text>
                </View>
            </Page>
        </Document>
    );

    await triggerPdfDownload(doc, `Equipo_Instructores_${program.name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`);
}

// =============================================================
// 4. PESTAÑA: AMBIENTES DE APRENDIZAJE
// =============================================================

export async function exportProgramEnvironmentsExcel(program: any) {
    const wb = new ExcelJS.Workbook();
    wb.creator = "AcademiX";
    wb.created = new Date();

    const environments = program.environments || [];
    const groups = program.groups || [];

    // Map environments with group usage
    const envMap = new Map();
    environments.forEach((e: any) => {
        envMap.set(e.id, { ...e, usedByGroups: [] });
    });
    groups.forEach((g: any) => {
        if (g.environment?.id) {
            if (!envMap.has(g.environment.id)) {
                envMap.set(g.environment.id, { ...g.environment, usedByGroups: [] });
            }
            const existing = envMap.get(g.environment.id);
            if (!existing.usedByGroups.some((grp: any) => grp.id === g.id)) {
                existing.usedByGroups.push(g.name);
            }
        }
    });
    const envList = Array.from(envMap.values());

    const sheet = wb.addWorksheet("Ambientes");

    sheet.mergeCells("A1:E1");
    const titleCell = sheet.getCell("A1");
    titleCell.value = `ACADEMIX — AMBIENTES DE APRENDIZAJE: ${program.name.toUpperCase()}`;
    titleCell.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF047857" } };
    titleCell.alignment = { vertical: "middle", horizontal: "center" };
    sheet.getRow(1).height = 30;

    sheet.mergeCells("A2:E2");
    const subCell = sheet.getCell("A2");
    subCell.value = `Infraestructura Física y Tecnológica | Generado el ${format(new Date(), "dd/MM/yyyy HH:mm")}`;
    subCell.font = { name: "Segoe UI", size: 10, italic: true, color: { argb: "FF334155" } };
    subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } };
    subCell.alignment = { vertical: "middle", horizontal: "center" };
    sheet.getRow(2).height = 20;

    sheet.addRow([]);

    const header = sheet.addRow(["N°", "Ambiente / Espacio", "Ubicación Física", "Capacidad", "Fichas Vinculadas"]);
    header.height = 22;
    header.eachCell((cell: any) => {
        cell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF065F46" } };
        cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    envList.forEach((e: any, idx: number) => {
        const row = sheet.addRow([
            idx + 1,
            e.name,
            e.location || "No especificada",
            e.capacity ? `${e.capacity} personas` : "No definida",
            e.usedByGroups.length > 0 ? e.usedByGroups.join(", ") : "Sin fichas ocupando este ambiente"
        ]);
        row.height = 20;
        const bg = idx % 2 === 0 ? "FFFFFFFF" : "FFF0FDF4";
        row.eachCell((cell: any, cIdx: number) => {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
            cell.font = { name: "Segoe UI", size: 9, color: { argb: "FF0F172A" } };
            cell.alignment = { vertical: "middle", horizontal: cIdx === 2 ? "left" : "center" };
            if (cIdx === 2) cell.font = { name: "Segoe UI", size: 9, bold: true };
            cell.border = {
                top: { style: "thin", color: { argb: "FFE2E8F0" } },
                bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
            };
        });
    });

    sheet.getColumn(1).width = 6;
    sheet.getColumn(2).width = 30;
    sheet.getColumn(3).width = 25;
    sheet.getColumn(4).width = 18;
    sheet.getColumn(5).width = 40;

    await triggerExcelDownload(wb, `Ambientes_${program.name.replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`);
}

export async function exportProgramEnvironmentsPdf(program: any) {
    const environments = program.environments || [];
    const groups = program.groups || [];

    const envMap = new Map();
    environments.forEach((e: any) => {
        envMap.set(e.id, { ...e, usedByGroups: [] });
    });
    groups.forEach((g: any) => {
        if (g.environment?.id) {
            if (!envMap.has(g.environment.id)) {
                envMap.set(g.environment.id, { ...g.environment, usedByGroups: [] });
            }
            const existing = envMap.get(g.environment.id);
            if (!existing.usedByGroups.some((grp: any) => grp.id === g.id)) {
                existing.usedByGroups.push(g.name);
            }
        }
    });
    const envList = Array.from(envMap.values());

    const doc = (
        <Document title={`Ambientes - ${program.name}`}>
            <Page size="A4" style={pdfStyles.page}>
                <View style={pdfStyles.headerBanner}>
                    <View style={pdfStyles.headerTitleBlock}>
                        <Text style={pdfStyles.brandTitle}>ACADEMIX — AMBIENTES DE APRENDIZAJE</Text>
                        <Text style={pdfStyles.subTitle}>Espacios e Infraestructura • Programa: {program.name}</Text>
                    </View>
                    <View style={pdfStyles.badge}>
                        <Text style={pdfStyles.badgeText}>{envList.length} Ambientes</Text>
                    </View>
                </View>

                <View style={pdfStyles.table}>
                    <View style={[pdfStyles.tableHeaderRow, { backgroundColor: "#047857" }]}>
                        <Text style={[pdfStyles.tableHeaderCell, { width: "8%", textAlign: "center" }]}>#</Text>
                        <Text style={[pdfStyles.tableHeaderCell, { width: "32%" }]}>Ambiente / Espacio</Text>
                        <Text style={[pdfStyles.tableHeaderCell, { width: "25%" }]}>Ubicación</Text>
                        <Text style={[pdfStyles.tableHeaderCell, { width: "15%", textAlign: "center" }]}>Capacidad</Text>
                        <Text style={[pdfStyles.tableHeaderCell, { width: "20%" }]}>Fichas</Text>
                    </View>
                    {envList.length === 0 ? (
                        <View style={pdfStyles.tableRow}>
                            <Text style={[pdfStyles.tableCell, { width: "100%", textAlign: "center", fontStyle: "italic", color: "#94a3b8" }]}>
                                No hay ambientes de formación vinculados
                            </Text>
                        </View>
                    ) : (
                        envList.map((e: any, idx: number) => (
                            <View key={e.id} style={[pdfStyles.tableRow, idx % 2 === 1 ? pdfStyles.tableRowEven : {}]}>
                                <Text style={[pdfStyles.tableCell, { width: "8%", textAlign: "center" }]}>{idx + 1}</Text>
                                <Text style={[pdfStyles.tableCell, { width: "32%", fontFamily: "Helvetica-Bold" }]}>{e.name}</Text>
                                <Text style={[pdfStyles.tableCell, { width: "25%" }]}>{e.location || "No especificada"}</Text>
                                <Text style={[pdfStyles.tableCell, { width: "15%", textAlign: "center" }]}>{e.capacity ? `${e.capacity} p.` : "-"}</Text>
                                <Text style={[pdfStyles.tableCell, { width: "20%", color: "#047857", fontFamily: "Helvetica-Bold" }]}>
                                    {e.usedByGroups.length > 0 ? e.usedByGroups.join(", ") : "Sin fichas"}
                                </Text>
                            </View>
                        ))
                    )}
                </View>

                <View style={pdfStyles.footer}>
                    <Text style={pdfStyles.footerText}>AcademiX Platform • Infraestructura y Ambientes</Text>
                    <Text style={pdfStyles.footerText}>Generado el {format(new Date(), "dd/MM/yyyy HH:mm")}</Text>
                </View>
            </Page>
        </Document>
    );

    await triggerPdfDownload(doc, `Ambientes_${program.name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`);
}

// =============================================================
// 5. PESTAÑA: FICHAS Y APRENDICES (DETALLE DE FICHA)
// =============================================================

export async function exportGroupStudentsExcel(group: any, programName: string) {
    const wb = new ExcelJS.Workbook();
    wb.creator = "AcademiX";
    wb.created = new Date();

    const students = group.students || [];
    const courses = group.courses || [];

    // Sheet 1: Aprendices Matriculados
    const sheet = wb.addWorksheet("Aprendices Matriculados");

    sheet.mergeCells("A1:G1");
    const titleCell = sheet.getCell("A1");
    titleCell.value = `ACADEMIX — FICHA DE FORMACIÓN: ${group.name}`;
    titleCell.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF312E81" } };
    titleCell.alignment = { vertical: "middle", horizontal: "center" };
    sheet.getRow(1).height = 30;

    sheet.mergeCells("A2:G2");
    const subCell = sheet.getCell("A2");
    subCell.value = `Programa: ${programName} | Etapa: ${group.categoria || "LECTIVA"} | Ambiente: ${group.environment?.name || "Sin aula"} | Generado el ${format(new Date(), "dd/MM/yyyy HH:mm")}`;
    subCell.font = { name: "Segoe UI", size: 10, italic: true, color: { argb: "FF334155" } };
    subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E7FF" } };
    subCell.alignment = { vertical: "middle", horizontal: "center" };
    sheet.getRow(2).height = 20;

    sheet.addRow([]);

    const header = sheet.addRow(["N°", "Documento de Identidad", "Nombres y Apellidos", "Correo Institucional", "Teléfono", "Novedad Académica", "Estado"]);
    header.height = 22;
    header.eachCell((cell: any) => {
        cell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4338CA" } };
        cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    students.forEach((st: any, idx: number) => {
        const profile = st.profile;
        const fullName = st.name || `${profile?.nombres || ""} ${profile?.apellido || ""}`.trim();
        const row = sheet.addRow([
            idx + 1,
            profile?.identificacion || "S/I",
            formatName(fullName),
            st.email || "Sin correo",
            profile?.telefono || "Sin teléfono",
            profile?.novedad || "Sin novedad",
            st.banned ? "Inactivo" : "Activo"
        ]);
        row.height = 20;
        const bg = idx % 2 === 0 ? "FFFFFFFF" : "FFEEF2FF";
        row.eachCell((cell: any, cIdx: number) => {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
            cell.font = { name: "Segoe UI", size: 9, color: { argb: "FF0F172A" } };
            cell.alignment = { vertical: "middle", horizontal: cIdx === 3 || cIdx === 4 ? "left" : "center" };
            if (cIdx === 3) cell.font = { name: "Segoe UI", size: 9, bold: true };
            if (cIdx === 7) cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: st.banned ? "FFDC2626" : "FF16A34A" } };
            cell.border = {
                top: { style: "thin", color: { argb: "FFE2E8F0" } },
                bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
            };
        });
    });

    sheet.getColumn(1).width = 6;
    sheet.getColumn(2).width = 22;
    sheet.getColumn(3).width = 34;
    sheet.getColumn(4).width = 30;
    sheet.getColumn(5).width = 18;
    sheet.getColumn(6).width = 22;
    sheet.getColumn(7).width = 14;

    // Sheet 2: Materias de la Ficha
    if (courses.length > 0) {
        const cSheet = wb.addWorksheet("Materias y Horarios");
        cSheet.mergeCells("A1:D1");
        const cTitle = cSheet.getCell("A1");
        cTitle.value = `MATERIAS CURSADAS POR LA FICHA ${group.name}`;
        cTitle.font = { name: "Segoe UI", size: 12, bold: true, color: { argb: "FFFFFFFF" } };
        cTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF312E81" } };
        cTitle.alignment = { vertical: "middle", horizontal: "center" };
        cSheet.getRow(1).height = 26;

        cSheet.addRow([]);

        const cHeader = cSheet.addRow(["N°", "Asignatura / Competencia", "Instructor Asignado", "Horas Semanales"]);
        cHeader.height = 22;
        cHeader.eachCell((cell: any) => {
            cell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4338CA" } };
            cell.alignment = { vertical: "middle", horizontal: "center" };
        });

        courses.forEach((c: any, idx: number) => {
            const row = cSheet.addRow([
                idx + 1,
                c.title,
                c.teacher ? formatName(c.teacher.name || "Instructor") : "Sin instructor asignado",
                `${c.weeklyHours || 0} h/sem`
            ]);
            row.height = 20;
            const bg = idx % 2 === 0 ? "FFFFFFFF" : "FFEEF2FF";
            row.eachCell((cell: any, cIdx: number) => {
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
                cell.font = { name: "Segoe UI", size: 9, color: { argb: "FF0F172A" } };
                cell.alignment = { vertical: "middle", horizontal: cIdx === 2 || cIdx === 3 ? "left" : "center" };
                cell.border = {
                    top: { style: "thin", color: { argb: "FFE2E8F0" } },
                    bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
                };
            });
        });

        cSheet.getColumn(1).width = 6;
        cSheet.getColumn(2).width = 38;
        cSheet.getColumn(3).width = 32;
        cSheet.getColumn(4).width = 18;
    }

    await triggerExcelDownload(wb, `Ficha_${group.name.replace(/[^a-zA-Z0-9]/g, "_")}_Aprendices.xlsx`);
}

export async function exportGroupStudentsPdf(group: any, programName: string) {
    const students = group.students || [];
    const courses = group.courses || [];

    const doc = (
        <Document title={`Ficha ${group.name} - Aprendices`}>
            <Page size="A4" style={pdfStyles.page}>
                <View style={pdfStyles.headerBanner}>
                    <View style={pdfStyles.headerTitleBlock}>
                        <Text style={pdfStyles.brandTitle}>ACADEMIX — FICHA {group.name}</Text>
                        <Text style={pdfStyles.subTitle}>Programa: {programName} | {group.categoria || "LECTIVA"}</Text>
                    </View>
                    <View style={pdfStyles.badge}>
                        <Text style={pdfStyles.badgeText}>{students.length} Aprendices Matriculados</Text>
                    </View>
                </View>

                {/* Meta details */}
                <View style={pdfStyles.metaCard}>
                    <View style={pdfStyles.metaGrid}>
                        <View style={pdfStyles.metaItem}>
                            <Text style={pdfStyles.metaLabel}>Ambiente Asignado:</Text>
                            <Text style={pdfStyles.metaValue}>{group.environment?.name || "Sin ambiente asignado"}</Text>
                        </View>
                        <View style={pdfStyles.metaItem}>
                            <Text style={pdfStyles.metaLabel}>Vigencia de la Ficha:</Text>
                            <Text style={pdfStyles.metaValue}>{formatDateSafe(group.startDate)} — {formatDateSafe(group.endDate)}</Text>
                        </View>
                    </View>
                </View>

                {/* Table */}
                <Text style={pdfStyles.sectionTitle}>Listado Oficial de Aprendices ({students.length})</Text>
                <View style={pdfStyles.table}>
                    <View style={pdfStyles.tableHeaderRow}>
                        <Text style={[pdfStyles.tableHeaderCell, { width: "6%", textAlign: "center" }]}>#</Text>
                        <Text style={[pdfStyles.tableHeaderCell, { width: "20%" }]}>Documento</Text>
                        <Text style={[pdfStyles.tableHeaderCell, { width: "32%" }]}>Aprendiz</Text>
                        <Text style={[pdfStyles.tableHeaderCell, { width: "24%" }]}>Contacto</Text>
                        <Text style={[pdfStyles.tableHeaderCell, { width: "18%", textAlign: "center" }]}>Novedad</Text>
                    </View>
                    {students.length === 0 ? (
                        <View style={pdfStyles.tableRow}>
                            <Text style={[pdfStyles.tableCell, { width: "100%", textAlign: "center", fontStyle: "italic", color: "#94a3b8" }]}>
                                No hay aprendices matriculados en esta ficha
                            </Text>
                        </View>
                    ) : (
                        students.map((st: any, idx: number) => {
                            const profile = st.profile;
                            const fullName = st.name || `${profile?.nombres || ""} ${profile?.apellido || ""}`.trim();
                            return (
                                <View key={st.id} style={[pdfStyles.tableRow, idx % 2 === 1 ? pdfStyles.tableRowEven : {}]}>
                                    <Text style={[pdfStyles.tableCell, { width: "6%", textAlign: "center" }]}>{idx + 1}</Text>
                                    <Text style={[pdfStyles.tableCell, { width: "20%", fontFamily: "Helvetica-Bold" }]}>{profile?.identificacion || "S/I"}</Text>
                                    <Text style={[pdfStyles.tableCell, { width: "32%", fontFamily: "Helvetica-Bold" }]}>{formatName(fullName)}</Text>
                                    <Text style={[pdfStyles.tableCell, { width: "24%", color: "#64748b" }]}>{st.email}</Text>
                                    <Text style={[pdfStyles.tableCell, { width: "18%", textAlign: "center", color: profile?.novedad ? "#d97706" : "#64748b" }]}>
                                        {profile?.novedad || "Normal"}
                                    </Text>
                                </View>
                            );
                        })
                    )}
                </View>

                {courses.length > 0 && (
                    <View wrap={false}>
                        <Text style={pdfStyles.sectionTitle}>Materias de la Ficha ({courses.length})</Text>
                        <View style={pdfStyles.table}>
                            <View style={pdfStyles.tableHeaderRow}>
                                <Text style={[pdfStyles.tableHeaderCell, { width: "6%", textAlign: "center" }]}>#</Text>
                                <Text style={[pdfStyles.tableHeaderCell, { width: "44%" }]}>Asignatura / Competencia</Text>
                                <Text style={[pdfStyles.tableHeaderCell, { width: "32%" }]}>Instructor</Text>
                                <Text style={[pdfStyles.tableHeaderCell, { width: "18%", textAlign: "center" }]}>Horas Semanales</Text>
                            </View>
                            {courses.map((c: any, idx: number) => (
                                <View key={c.id} style={[pdfStyles.tableRow, idx % 2 === 1 ? pdfStyles.tableRowEven : {}]}>
                                    <Text style={[pdfStyles.tableCell, { width: "6%", textAlign: "center" }]}>{idx + 1}</Text>
                                    <Text style={[pdfStyles.tableCell, { width: "44%", fontFamily: "Helvetica-Bold" }]}>{c.title}</Text>
                                    <Text style={[pdfStyles.tableCell, { width: "32%" }]}>{c.teacher ? formatName(c.teacher.name || "Instructor") : "Sin instructor"}</Text>
                                    <Text style={[pdfStyles.tableCell, { width: "18%", textAlign: "center", fontFamily: "Helvetica-Bold", color: "#4338ca" }]}>{c.weeklyHours || 0} h/sem</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                <View style={pdfStyles.footer}>
                    <Text style={pdfStyles.footerText}>AcademiX Platform • Fichas de Formación</Text>
                    <Text style={pdfStyles.footerText}>Generado el {format(new Date(), "dd/MM/yyyy HH:mm")}</Text>
                </View>
            </Page>
        </Document>
    );

    await triggerPdfDownload(doc, `Ficha_${group.name.replace(/[^a-zA-Z0-9]/g, "_")}_Aprendices.pdf`);
}
