import ExcelJS from "exceljs";
import { CommitteeReportDTO, formatFaultTypeLabel } from "../types";
import { formatSafeDateTime } from "./dateUtils";
import { CommitteeExportOptions, generateAndDownloadCommitteePdf } from "./committeeCorporatePdfExport";

export type { CommitteeExportOptions };
export { generateAndDownloadCommitteePdf };

export async function exportCommitteeReportsToExcel(
    reports: CommitteeReportDTO[],
    titleOrOptions: string | CommitteeExportOptions = "Reporte_Comite_Evaluacion"
) {
    if (!reports || reports.length === 0) return;

    const options: CommitteeExportOptions =
        typeof titleOrOptions === "string"
            ? { title: titleOrOptions }
            : titleOrOptions;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "AcademiX - Comités de Evaluación";
    workbook.lastModifiedBy = "AcademiX";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("Aprendices Reportados", {
        views: [{ showGridLines: true }],
    });

    const totalCols = 13;
    const borderThin: Partial<ExcelJS.Borders> = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
    };

    const programName = options.programName || "General";
    const processTitle = options.processTitle || "Comité de Evaluación y Seguimiento";
    const groupBy = options.groupBy || "schedule";

    // Metrics
    const totalReportsCount = reports.length;
    const uniqueStudentsCount = new Set(reports.map((r) => r.studentId)).size;
    const uniqueSchedulesCount = new Set(reports.map((r) => r.groupSchedule || "Sin horario")).size;
    const academicFaultsCount = reports.filter(
        (r) => r.faultType === "ACADEMICO" || r.faultType === "MIXTO"
    ).length;
    const disciplinaryFaultsCount = reports.filter(
        (r) =>
            r.faultType === "DISCIPLINARIO" ||
            r.faultType === "INASISTENCIA" ||
            r.faultType === "MIXTO"
    ).length;

    // Row 1: Super Header
    worksheet.mergeCells(1, 1, 1, totalCols);
    const r1 = worksheet.getCell(1, 1);
    r1.value = "ACADEMIX • GESTIÓN DE APRENDICES REPORTADOS A COMITÉ DE EVALUACIÓN";
    r1.font = { name: "Segoe UI", size: 12, bold: true, color: { argb: "FFFFFFFF" } };
    r1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } }; // Slate 900
    r1.alignment = { vertical: "middle", indent: 1 };
    worksheet.getRow(1).height = 30;

    // Row 2: Subtitle with Process & Program
    worksheet.mergeCells(2, 1, 2, totalCols);
    const r2 = worksheet.getCell(2, 1);
    r2.value = `Proceso: ${processTitle} • Programa: ${programName}`;
    r2.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF15803D" } }; // Green 700
    r2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0FDF4" } }; // Green 50
    r2.alignment = { vertical: "middle", indent: 1 };
    worksheet.getRow(2).height = 22;

    // Row 3: Active View & Date Info
    worksheet.mergeCells(3, 1, 3, totalCols);
    const r3 = worksheet.getCell(3, 1);
    const dateStr = formatSafeDateTime(new Date());
    const viewName =
        groupBy === "schedule"
            ? "Por Horario de la Ficha"
            : groupBy === "group"
            ? "Por Ficha / Grupo"
            : "Lista Plana (Sin Agrupar)";
    r3.value = `Generado el: ${dateStr} • Vista activa: ${viewName} • Total reportes: ${totalReportsCount} • Aprendices únicos: ${uniqueStudentsCount}`;
    r3.font = { name: "Segoe UI", size: 8.5, color: { argb: "FF334155" } };
    r3.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
    r3.alignment = { vertical: "middle", indent: 1 };
    worksheet.getRow(3).height = 18;

    // Row 4: Active Filters
    worksheet.mergeCells(4, 1, 4, totalCols);
    const r4 = worksheet.getCell(4, 1);
    const filters = options.filters || {};
    const fParts: string[] = [];
    if (filters.fichaLabel) fParts.push(`Ficha: ${filters.fichaLabel}`);
    if (filters.faultTypeLabel) fParts.push(`Causal: ${filters.faultTypeLabel}`);
    if (filters.decisionLabel) fParts.push(`Solución: ${filters.decisionLabel}`);
    if (filters.searchTerm) fParts.push(`Búsqueda: "${filters.searchTerm}"`);
    r4.value = `Filtros aplicados: ${fParts.length > 0 ? fParts.join(" | ") : "Todos los registros (sin filtros adicionales)"}`;
    r4.font = { name: "Segoe UI", size: 8, italic: true, color: { argb: "FF64748B" } };
    r4.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
    r4.alignment = { vertical: "middle", indent: 1 };
    worksheet.getRow(4).height = 18;

    // Row 5: KPI Summary Cards in Excel
    worksheet.getRow(5).height = 8; // Spacer

    // Row 6 & 7: 5 KPI Metric boxes
    const kpis = [
        { label: "TOTAL REPORTES", value: totalReportsCount, colStart: 1, colEnd: 2, bg: "FFEFF6FF", color: "FF1D4ED8" },
        { label: "APRENDICES ÚNICOS", value: uniqueStudentsCount, colStart: 3, colEnd: 4, bg: "FFF0FDF4", color: "FF15803D" },
        { label: "HORARIOS DE FICHA", value: uniqueSchedulesCount, colStart: 5, colEnd: 7, bg: "FFFFFBEB", color: "FFB45309" },
        { label: "FALTAS ACADÉMICAS", value: academicFaultsCount, colStart: 8, colEnd: 10, bg: "FFF0F9FF", color: "FF0284C7" },
        { label: "DISCIPLINARIAS / INASIST.", value: disciplinaryFaultsCount, colStart: 11, colEnd: 13, bg: "FFFFF1F2", color: "FFE11D48" },
    ];

    kpis.forEach((k) => {
        worksheet.mergeCells(6, k.colStart, 6, k.colEnd);
        const lCell = worksheet.getCell(6, k.colStart);
        lCell.value = k.label;
        lCell.font = { name: "Segoe UI", size: 7.5, bold: true, color: { argb: "FF64748B" } };
        lCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: k.bg } };
        lCell.alignment = { vertical: "middle", horizontal: "center" };
        lCell.border = borderThin;

        worksheet.mergeCells(7, k.colStart, 7, k.colEnd);
        const vCell = worksheet.getCell(7, k.colStart);
        vCell.value = k.value;
        vCell.font = { name: "Segoe UI", size: 12, bold: true, color: { argb: k.color } };
        vCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: k.bg } };
        vCell.alignment = { vertical: "middle", horizontal: "center" };
        vCell.border = borderThin;
    });
    worksheet.getRow(6).height = 14;
    worksheet.getRow(7).height = 20;

    worksheet.getRow(8).height = 10; // Spacer

    const columnHeaders = [
        "N°",
        "Proceso de Comité",
        "Ficha / Grupo",
        "Horario de la Ficha",
        "Documento",
        "Nombre del Aprendiz",
        "Correo del Aprendiz",
        "Causal / Falta",
        "Días Inasistencia",
        "Observaciones / Motivo",
        "Solución del Comité",
        "Instructor Reportante",
        "Enlace de Evidencias (URL)"
    ];

    const writeTableHeader = (rowNum: number) => {
        const headerRow = worksheet.getRow(rowNum);
        columnHeaders.forEach((h, i) => {
            const cell = headerRow.getCell(i + 1);
            cell.value = h;
            cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FFFFFFFF" } };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } }; // Slate 800
            cell.alignment = { vertical: "middle", horizontal: i === 5 || i === 6 || i === 9 ? "left" : "center" };
            cell.border = borderThin;
        });
        headerRow.height = 24;
    };

    let currentRow = 9;

    const renderReportRow = (report: CommitteeReportDTO, idx: number, rowNum: number) => {
        const row = worksheet.getRow(rowNum);
        const isEven = idx % 2 === 0;
        const rowBg = isEven ? "FFFFFFFF" : "FFF8FAFC";

        row.getCell(1).value = idx + 1;
        row.getCell(2).value = report.processTitle;
        row.getCell(3).value = report.groupName;
        row.getCell(4).value = report.groupSchedule || "Sin horario asignado";
        row.getCell(5).value = report.studentDocument || "Sin doc.";
        row.getCell(6).value = report.studentName;
        row.getCell(7).value = report.studentEmail || "Sin correo";
        row.getCell(8).value = formatFaultTypeLabel(report.faultType, report.customFaultType);
        row.getCell(9).value = report.absenceDays ?? report.absenceHours ?? 0;
        row.getCell(10).value = report.observations || report.reason || "Sin observaciones";
        row.getCell(11).value = report.committeeDecision || "Pendiente";
        row.getCell(12).value = report.reportedByName;

        // Evidence hyperlink
        const evidenceCell = row.getCell(13);
        if (report.evidenceUrl) {
            evidenceCell.value = {
                text: "Ver Evidencias",
                hyperlink: report.evidenceUrl
            };
            evidenceCell.font = { name: "Segoe UI", size: 8.5, color: { argb: "FF2563EB" }, underline: true };
        } else {
            evidenceCell.value = "Sin evidencias";
            evidenceCell.font = { name: "Segoe UI", size: 8.5, color: { argb: "FF94A3B8" } };
        }

        for (let c = 1; c <= totalCols; c++) {
            const cell = row.getCell(c);
            cell.border = borderThin;
            if (c !== 13) {
                cell.font = { name: "Segoe UI", size: 8.5, color: { argb: "FF1E293B" } };
            }
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
            cell.alignment = {
                vertical: "middle",
                horizontal: c === 6 || c === 7 || c === 10 ? "left" : "center",
                wrapText: c === 10
            };
        }

        row.height = 24;
    };

    // Check if grouping is active
    const groups =
        (groupBy === "schedule" || groupBy === "group") && options.groupedReports && options.groupedReports.length > 0
            ? options.groupedReports
            : null;

    if (groups) {
        // Render each group with its banner header
        let globalIndex = 0;
        groups.forEach((group) => {
            // Group Banner
            worksheet.mergeCells(currentRow, 1, currentRow, totalCols);
            const gBanner = worksheet.getCell(currentRow, 1);
            const prefix = groupBy === "schedule" ? "🕒 HORARIO: " : "👥 FICHA: ";
            gBanner.value = `${prefix}${group.title.toUpperCase()}   •   ${group.reports.length} ${
                group.reports.length === 1 ? "reporte" : "reportes"
            }   •   ${group.uniqueStudentsCount} ${
                group.uniqueStudentsCount === 1 ? "aprendiz" : "aprendices"
            }${group.fichasCount !== undefined ? `   •   ${group.fichasCount} ficha(s)` : ""}`;
            gBanner.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FF0F172A" } };
            gBanner.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } }; // Slate 200
            gBanner.alignment = { vertical: "middle", indent: 1 };
            worksheet.getRow(currentRow).height = 22;
            currentRow++;

            // Table headers for this group
            writeTableHeader(currentRow);
            currentRow++;

            // Rows in this group
            group.reports.forEach((report, idxInGroup) => {
                renderReportRow(report, globalIndex, currentRow);
                globalIndex++;
                currentRow++;
            });

            // Spacer between groups
            worksheet.getRow(currentRow).height = 10;
            currentRow++;
        });
    } else {
        // Flat List
        writeTableHeader(currentRow);
        currentRow++;

        reports.forEach((report, index) => {
            renderReportRow(report, index, currentRow);
            currentRow++;
        });
    }

    // Auto-fit column widths
    worksheet.getColumn(1).width = 6;
    worksheet.getColumn(2).width = 28;
    worksheet.getColumn(3).width = 18;
    worksheet.getColumn(4).width = 28; // Horario de la Ficha
    worksheet.getColumn(5).width = 16;
    worksheet.getColumn(6).width = 28;
    worksheet.getColumn(7).width = 30;
    worksheet.getColumn(8).width = 18;
    worksheet.getColumn(9).width = 16;
    worksheet.getColumn(10).width = 46; // observaciones
    worksheet.getColumn(11).width = 24;
    worksheet.getColumn(12).width = 26;
    worksheet.getColumn(13).width = 20;

    // Buffer and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const rawTitle = options.title || options.processTitle || "Reporte_Comite_Evaluacion";
    const sanitizedTitle = rawTitle.replace(/[^a-zA-Z0-9_-]/g, "_");
    a.download = `${sanitizedTitle}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
