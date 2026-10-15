import ExcelJS from "exceljs";
import { CommitteeReportDTO } from "../types";
import { formatSafeDate, formatSafeDateTime } from "./dateUtils";

export async function exportCommitteeReportsToExcel(
    reports: CommitteeReportDTO[],
    title: string = "Reporte_Comite_Evaluacion"
) {
    if (!reports || reports.length === 0) return;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "AcademiX - Comités de Evaluación";
    workbook.lastModifiedBy = "AcademiX";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("Aprendices Reportados", {
        views: [{ showGridLines: true }],
    });

    const totalCols = 11;
    const borderThin: Partial<ExcelJS.Borders> = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
    };

    // Header 1: Super Header
    worksheet.mergeCells(1, 1, 1, totalCols);
    const r1 = worksheet.getCell(1, 1);
    r1.value = "ACADEMIX • GESTIÓN DE APRENDICES REPORTADOS A COMITÉ DE EVALUACIÓN";
    r1.font = { name: "Segoe UI", size: 12, bold: true, color: { argb: "FFFFFFFF" } };
    r1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } }; // Dark Navy / Slate 900
    r1.alignment = { vertical: "middle", indent: 1 };
    worksheet.getRow(1).height = 30;

    // Header 2: Subtitle / Date
    worksheet.mergeCells(2, 1, 2, totalCols);
    const r2 = worksheet.getCell(2, 1);
    const dateStr = formatSafeDateTime(new Date());
    r2.value = `Total de reportes generados: ${reports.length} • Generado el: ${dateStr}`;
    r2.font = { name: "Segoe UI", size: 9, color: { argb: "FF334155" } };
    r2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    r2.alignment = { vertical: "middle", indent: 1 };
    worksheet.getRow(2).height = 20;

    worksheet.getRow(3).height = 10;

    // Header Row
    const headers = [
        "N°",
        "Proceso de Comité",
        "Ficha / Grupo",
        "Documento",
        "Nombre del Aprendiz",
        "Correo del Aprendiz",
        "Causal / Falta",
        "Motivo del Caso",
        "Instructor Reportante",
        "Enlace de Evidencias (URL)",
        "Fecha de Reporte"
    ];

    const headerRow = worksheet.getRow(4);
    headers.forEach((h, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.value = h;
        cell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } }; // Slate 800
        cell.alignment = { vertical: "middle", horizontal: i === 4 || i === 5 || i === 7 ? "left" : "center" };
        cell.border = borderThin;
    });
    headerRow.height = 24;

    let currentRow = 5;

    reports.forEach((report, index) => {
        const row = worksheet.getRow(currentRow);
        const isEven = index % 2 === 0;
        const rowBg = isEven ? "FFFFFFFF" : "FFF8FAFC";

        row.getCell(1).value = index + 1;
        row.getCell(2).value = report.processTitle;
        row.getCell(3).value = report.groupName;
        row.getCell(4).value = report.studentDocument || "Sin doc.";
        row.getCell(5).value = report.studentName;
        row.getCell(6).value = report.studentEmail || "Sin correo";
        row.getCell(7).value = report.faultType;
        row.getCell(8).value = report.reason;
        row.getCell(9).value = report.reportedByName;
        
        // Enlace de evidencia hipervínculo
        const evidenceCell = row.getCell(10);
        if (report.evidenceUrl) {
            evidenceCell.value = {
                text: "Ver Evidencias",
                hyperlink: report.evidenceUrl
            };
            evidenceCell.font = { name: "Segoe UI", size: 9, color: { argb: "FF2563EB" }, underline: true };
        } else {
            evidenceCell.value = "Sin evidencias";
            evidenceCell.font = { name: "Segoe UI", size: 9, color: { argb: "FF94A3B8" } };
        }

        const formattedDate = formatSafeDate(report.createdAt);
        row.getCell(11).value = formattedDate;

        for (let c = 1; c <= totalCols; c++) {
            const cell = row.getCell(c);
            cell.border = borderThin;
            if (c !== 10) {
                cell.font = { name: "Segoe UI", size: 9, color: { argb: "FF1E293B" } };
            }
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
            cell.alignment = {
                vertical: "middle",
                horizontal: c === 5 || c === 6 || c === 8 ? "left" : "center",
                wrapText: c === 8 // wrap text on reason column
            };
        }

        row.height = 26;
        currentRow++;
    });

    // Auto-fit column widths
    worksheet.getColumn(1).width = 6;
    worksheet.getColumn(2).width = 28;
    worksheet.getColumn(3).width = 20;
    worksheet.getColumn(4).width = 16;
    worksheet.getColumn(5).width = 30;
    worksheet.getColumn(6).width = 32; // email
    worksheet.getColumn(7).width = 16;
    worksheet.getColumn(8).width = 45;
    worksheet.getColumn(9).width = 26;
    worksheet.getColumn(10).width = 20;
    worksheet.getColumn(11).width = 16;

    // Buffer and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const sanitizedTitle = title.replace(/[^a-zA-Z0-9_-]/g, "_");
    a.download = `${sanitizedTitle}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
