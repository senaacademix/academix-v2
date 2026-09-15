import ExcelJS from "exceljs";
import { SofiaReportData, CorporateExportOptions } from "../types/sofiaReportTypes";

function applyBordersToRange(
    ws: ExcelJS.Worksheet,
    startRow: number,
    startCol: number,
    endRow: number,
    endCol: number,
    border: Partial<ExcelJS.Borders>
) {
    for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
            ws.getCell(r, c).border = border;
        }
    }
}

export async function exportSofiaReportToCorporateExcel(
    data: SofiaReportData,
    options?: CorporateExportOptions
) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "AcademiX - Sistema de Gestión Académica";
    workbook.lastModifiedBy = "AcademiX";
    workbook.created = new Date();

    const ficha = options?.customHeader?.ficha || data.ficha || "Sin Ficha";
    const rawSheetName = `Ficha ${ficha}`.substring(0, 30);
    const sanitizedSheetName = rawSheetName.replace(/[:\\/?*\[\]]/g, "-");
    const worksheet = workbook.addWorksheet(sanitizedSheetName || "Juicios Sofia Plus");

    const reportDetails = data.reportDetails;
    const rows = options?.customRows && options.customRows.length > 0 ? options.customRows : data.rows;
    if (!rows || rows.length === 0) return;

    // Detect if grouped by periods
    const isGroupedHeader = rows[0] && rows[0][0]?.rowSpan === 2;
    const headerRowCount = isGroupedHeader ? 2 : 1;

    // Calculate exact total columns count
    let totalCols = 6;
    if (isGroupedHeader) {
        let count = 0;
        rows[0].forEach((c) => {
            count += c.colSpan || 1;
        });
        totalCols = Math.max(totalCols, count);
    } else {
        totalCols = Math.max(totalCols, rows[0].length);
    }

    // Freeze panes: pin first 6 columns (#, ID, Names, Surnames, State, %) and header rows
    worksheet.views = [
        { state: "frozen", xSplit: 6, ySplit: isGroupedHeader ? 4 : 3 },
    ];

    // ── 1. HEADER BANNER INSTITUCIONAL COMPACTO (Rows 1-2) ──
    const title = options?.customHeader?.title || "ACADEMIX • REPORTE DE JUICIOS EVALUATIVOS SOFIA PLUS";
    const programName = options?.customHeader?.programName ?? reportDetails?.programName ?? "Programa de Formación";
    const status = reportDetails?.status || "En Ejecución";
    const dateStr = options?.customHeader?.date ?? reportDetails?.date ?? new Date().toLocaleDateString("es-CO");
    const center = options?.customHeader?.center ?? reportDetails?.center ?? "Centro de Formación";
    const regional = options?.customHeader?.regional ?? reportDetails?.regional ?? "";
    const instructor = options?.customHeader?.instructor ?? "";

    // Row 1: Institución, Título del Reporte y Estado
    worksheet.mergeCells(1, 1, 1, totalCols);
    const r1 = worksheet.getCell(1, 1);
    const scopeTag = options?.scope === "filtered" ? " [VISTA FILTRADA]" : "";
    r1.value = `${title.toUpperCase()} — FICHA: ${ficha} • ESTADO: ${status.toUpperCase()}${scopeTag}`;
    r1.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FF1E293B" } };
    r1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } }; // Soft Slate 100
    r1.alignment = { vertical: "middle", indent: 1 };
    worksheet.getRow(1).height = 22;

    // Row 2: Metadatos Programa, Centro, Regional, Instructor y Fecha en una sola línea elegante
    worksheet.mergeCells(2, 1, 2, totalCols);
    const r2 = worksheet.getCell(2, 1);
    const metaParts = [
        `Programa: ${programName}`,
        reportDetails?.code ? `Código: ${reportDetails.code}` : null,
        reportDetails?.version ? `Versión: ${reportDetails.version}` : null,
        `Centro: ${center}`,
        regional ? `Regional: ${regional}` : null,
        instructor ? `Responsable: ${instructor}` : null,
        `Fecha: ${dateStr}`,
    ].filter(Boolean);
    r2.value = metaParts.join(" • ");
    r2.font = { name: "Segoe UI", size: 8, color: { argb: "FF475569" } };
    r2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } }; // Soft Slate 50
    r2.alignment = { vertical: "middle", indent: 1 };
    worksheet.getRow(2).height = 18;

    // ── 2. CONFIGURACIÓN DE ANCHOS DE COLUMNA ──
    const colWidths = [6, 16, 25, 25, 18, 9];
    for (let c = 1; c <= totalCols; c++) {
        const col = worksheet.getColumn(c);
        if (c <= 6) {
            col.width = colWidths[c - 1];
        } else {
            col.width = 9.5; // Sufficient width for RAP tags and values
        }
    }

    const borderThin: Partial<ExcelJS.Borders> = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
    };

    // ── 3. ENCABEZADOS DE TABLA (A partir de Row 3) ──
    let currentRowIdx = 3;

    if (isGroupedHeader) {
        const periodRow = rows[0]; // Row 3 in Excel
        const tagRow = rows[1];    // Row 4 in Excel

        // 3.1. Merge vertical de columnas fijas (1 a 6) entre Row 3 y Row 4
        const fixedHeaders = ["#", "IDENTIFICACIÓN", "NOMBRES", "APELLIDOS", "ESTADO", "%"];
        for (let c = 1; c <= 6; c++) {
            worksheet.mergeCells(3, c, 4, c);
            const cell = worksheet.getCell(3, c);
            cell.value = fixedHeaders[c - 1];
            cell.font = { name: "Segoe UI", size: 8.5, bold: true, color: { argb: "FF1E293B" } };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } }; // Soft Slate 100
            cell.alignment = {
                vertical: "middle",
                horizontal: c === 1 || c === 6 ? "center" : "left",
                wrapText: true,
            };
            applyBordersToRange(worksheet, 3, c, 4, c, borderThin);
        }

        // 3.2. Escribir Periodos agrupados en Row 3 (a partir de Col 7)
        let colCursor = 7;
        const tagPeriodMap: boolean[] = []; // true if even period, false if odd

        for (let i = 6; i < periodRow.length; i++) {
            const pCell = periodRow[i];
            const span = pCell.colSpan || 1;
            const colEnd = colCursor + span - 1;
            const pIdx = i - 6;
            const isEvenPeriod = pIdx % 2 === 0;

            for (let k = 0; k < span; k++) {
                tagPeriodMap.push(isEvenPeriod);
            }

            if (span > 1) {
                worksheet.mergeCells(3, colCursor, 3, colEnd);
            }
            const cell = worksheet.getCell(3, colCursor);
            cell.value = pCell.value;
            cell.font = {
                name: "Segoe UI",
                size: 8.5,
                bold: true,
                color: { argb: isEvenPeriod ? "FF0369A1" : "FF3730A3" }, // Sky 700 vs Indigo 700
            };
            cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: isEvenPeriod ? "FFE0F2FE" : "FFEEF2FF" }, // Sky 100 vs Indigo 100
            };
            cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };

            applyBordersToRange(worksheet, 3, colCursor, 3, colEnd, borderThin);
            colCursor += span;
        }

        // 3.3. Escribir Etiquetas de RA en Row 4 (a partir de Col 7)
        tagRow.forEach((tCell, idx) => {
            const colIdx = 7 + idx;
            const isEvenPeriod = tagPeriodMap[idx] ?? true;
            const cell = worksheet.getCell(4, colIdx);
            cell.value = tCell.value;
            cell.font = {
                name: "Segoe UI",
                size: 7.5,
                bold: true,
                color: { argb: isEvenPeriod ? "FF0C4A6E" : "FF312E81" }, // Sky 900 vs Indigo 900
            };
            cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: isEvenPeriod ? "FFF0F9FF" : "FFF5F3FF" }, // Sky 50 vs Indigo 50
            };
            cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
            cell.border = borderThin;
        });

        worksheet.getRow(3).height = 20;
        worksheet.getRow(4).height = 30; // Altura para visualización multilínea de etiquetas de RA
        currentRowIdx = 5;
    } else {
        // Encabezado simple (sin agrupación por periodos)
        const hRow = rows[0];
        const sheetRow = worksheet.getRow(3);
        hRow.forEach((cell, idx) => {
            const target = sheetRow.getCell(idx + 1);
            target.value = cell.value;
            target.font = { name: "Segoe UI", size: 8, bold: true, color: { argb: "FF1E293B" } };
            target.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
            target.alignment = {
                vertical: "middle",
                horizontal: idx < 5 ? "left" : "center",
                wrapText: true,
            };
            target.border = borderThin;
        });
        sheetRow.height = 22;
        currentRowIdx = 4;
    }

    // ── 4. FILAS DE APRENDICES (EXCLUYENDO PIE DE PÁGINA) ──
    const isFooterCell = (val: unknown) => {
        const str = String(val || "").toUpperCase();
        return str.includes("RESULTADOS DE APRENDIZAJE") || str.includes("COMPETENCIAS");
    };
    const isFooterRow = (r: typeof rows[0]) => r.some((c) => isFooterCell(c?.value));

    // Filtrar estrictamente solo aprendices
    const apprenticeRows = rows.slice(headerRowCount).filter((r) => !isFooterRow(r));
    const bottomResults = rows.find((r) =>
        r.some((c) => String(c?.value || "").toUpperCase().includes("RESULTADOS DE APRENDIZAJE"))
    );
    const bottomCompetencies = rows.find((r) =>
        r.some((c) => String(c?.value || "").toUpperCase().includes("COMPETENCIAS"))
    );

    const startApprenticeRowIdx = currentRowIdx;

    apprenticeRows.forEach((row, sIdx) => {
        const sheetRow = worksheet.getRow(currentRowIdx);
        const isEven = sIdx % 2 === 0;

        row.forEach((cell, cellIdx) => {
            const target = sheetRow.getCell(cellIdx + 1);
            const val = cell.value;

            if (cellIdx < 6) {
                // Columnas fijas (#, Identificación, Nombres, Apellidos, Estado, %)
                target.value = val;
                const strVal = String(val).toUpperCase();

                let bgArg = isEven ? "FFFFFFFF" : "FFF8FAFC";
                let fontColor = "FF0F172A";
                let isBold = cellIdx === 1 || cellIdx === 5;

                if (cellIdx === 4) {
                    // Columna Estado con colores institucionales suaves
                    if (strVal === "EN FORMACION") {
                        bgArg = "FFDCFCE7"; // Verde pastel suave
                        fontColor = "FF15803D";
                    } else if (strVal === "CONDICIONADO") {
                        bgArg = "FFFEF3C7"; // Ámbar pastel suave
                        fontColor = "FFB45309";
                    } else if (strVal.includes("CANCELAD")) {
                        bgArg = "FFFEE2E2"; // Rojo pastel suave
                        fontColor = "FFB91C1C";
                    } else {
                        bgArg = "FFF3E8FF"; // Púrpura pastel suave
                        fontColor = "FF6B21A8";
                    }
                    isBold = true;
                } else if (cellIdx === 5) {
                    // Columna Porcentaje
                    const pVal = parseFloat(String(val).replace("%", ""));
                    fontColor = pVal >= 70 ? "FF15803D" : pVal >= 40 ? "FFB45309" : "FFDC2626";
                }

                target.font = {
                    name: "Segoe UI",
                    size: 8.5,
                    bold: isBold,
                    color: { argb: fontColor },
                };
                target.alignment = {
                    vertical: "middle",
                    horizontal: cellIdx === 0 || cellIdx === 4 || cellIdx === 5 ? "center" : "left",
                };
                target.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: bgArg },
                };
            } else {
                // Celdas de Juicio Evaluativo con colores pasteles armonizados (no oscuros)
                let cellColor = "FFFFFFFF"; // Por evaluar (blanco limpio)
                let fontColor = "FF94A3B8";
                let displayVal = val || "—";

                if (val === "A") {
                    cellColor = "FFDCFCE7"; // Verde pastel suave (Emerald 100)
                    fontColor = "FF15803D"; // Verde oscuro nítido (Emerald 700)
                    displayVal = "A";
                } else if (val === "NA") {
                    cellColor = "FFFEE2E2"; // Rojo pastel suave (Rose 100)
                    fontColor = "FFB91C1C"; // Rojo oscuro nítido (Rose 700)
                    displayVal = "NA";
                } else if (cell.bg === "#fef3c7") {
                    cellColor = "FFFEF3C7"; // Ámbar suave para inactivos
                    fontColor = "FFB45309";
                }

                target.value = displayVal;
                target.alignment = { vertical: "middle", horizontal: "center" };
                target.fill = { type: "pattern", pattern: "solid", fgColor: { argb: cellColor } };
                target.font = { name: "Segoe UI", size: 8, bold: val === "A" || val === "NA", color: { argb: fontColor } };

                if (cell.note) {
                    target.note = cell.note;
                }
            }
            target.border = borderThin;
        });

        sheetRow.height = 18.5;
        currentRowIdx++;
    });

    const lastApprenticeRowIdx = currentRowIdx - 1;

    // ── 5. CONFIGURACIÓN DEL AUTOFILTRO (DELIMITADO ESTRICTAMENTE A APRENDICES) ──
    // Se asegura que los desplegables de filtro de Excel actúen SOLAMENTE sobre los aprendices,
    // dejando Resultados de Aprendizaje y Competencias totalmente fuera del rango filtrable y ordenable.
    const filterHeaderRow = isGroupedHeader ? 4 : 3;
    if (lastApprenticeRowIdx >= filterHeaderRow) {
        worksheet.autoFilter = {
            from: { row: filterHeaderRow, column: 1 },
            to: { row: lastApprenticeRowIdx, column: totalCols },
        };
    }

    // ── 6. FILA ESPACIADORA EN BLANCO ──
    // Rompe la contigüidad de celdas para que cualquier filtrado manual en Excel no abarque las filas inferiores
    const separatorRow = worksheet.getRow(currentRowIdx);
    separatorRow.height = 8;
    currentRowIdx++;

    // ── 7. FILAS DE RESUMEN INFERIOR (FUERA DEL FILTRO) ──
    if (bottomResults) {
        // Merge cols 1 a 6 para la etiqueta
        worksheet.mergeCells(currentRowIdx, 1, currentRowIdx, 6);
        const labelCell = worksheet.getCell(currentRowIdx, 1);
        labelCell.value = "RESULTADOS DE APRENDIZAJE";
        labelCell.font = { name: "Segoe UI", size: 8, bold: true, color: { argb: "FF1E293B" } };
        labelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } }; // Soft Slate 100
        labelCell.alignment = { vertical: "middle", horizontal: "center" };
        applyBordersToRange(worksheet, currentRowIdx, 1, currentRowIdx, 6, borderThin);

        // Escribir nombres completos de RA a partir de Col 7
        for (let c = 6; c < bottomResults.length; c++) {
            const cell = bottomResults[c];
            const colIdx = c + 1;
            const target = worksheet.getCell(currentRowIdx, colIdx);
            target.value = cell.value;
            target.font = { name: "Segoe UI", size: 7.5, color: { argb: "FF334155" } };
            target.alignment = { vertical: "middle", horizontal: "left", wrapText: false };
            target.border = borderThin;
            if (cell.value) {
                target.note = String(cell.value);
            }
        }
        worksheet.getRow(currentRowIdx).height = 20;
        currentRowIdx++;
    }

    if (bottomCompetencies) {
        // Merge cols 1 a 6 para la etiqueta
        worksheet.mergeCells(currentRowIdx, 1, currentRowIdx, 6);
        const labelCell = worksheet.getCell(currentRowIdx, 1);
        labelCell.value = "COMPETENCIAS";
        labelCell.font = { name: "Segoe UI", size: 8, bold: true, color: { argb: "FF1E293B" } };
        labelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } }; // Soft Slate 200
        labelCell.alignment = { vertical: "middle", horizontal: "center" };
        applyBordersToRange(worksheet, currentRowIdx, 1, currentRowIdx, 6, borderThin);

        // Escribir nombres completos de Competencias a partir de Col 7
        for (let c = 6; c < bottomCompetencies.length; c++) {
            const cell = bottomCompetencies[c];
            const colIdx = c + 1;
            const target = worksheet.getCell(currentRowIdx, colIdx);
            target.value = cell.value;
            target.font = { name: "Segoe UI", size: 7.5, color: { argb: "FF334155" } };
            target.alignment = { vertical: "middle", horizontal: "left", wrapText: false };
            target.border = borderThin;
            if (cell.value) {
                target.note = String(cell.value);
            }
        }
        worksheet.getRow(currentRowIdx).height = 20;
        currentRowIdx++;
    }

    // ── 6. DESCARGA DEL ARCHIVO EXCEL ──
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeFicha = String(ficha || "Sofia").replace(/[^a-zA-Z0-9]/g, "_");
    a.download = `Reporte_Juicios_SofiaPlus_Ficha_${safeFicha}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
