"use server";

import * as XLSX from "xlsx";
import {
    ReportCell,
    TimelineConfig,
    SofiaReportResult,
    SofiaReportDetails,
} from "../types/sofiaReportTypes";

export async function extractLearningOutcomes(
    formData: FormData
): Promise<{ success: boolean; outcomes?: string[]; message?: string }> {
    const file = formData.get("file") as File;
    if (!file) return { success: false, message: "No se suministró ningún archivo." };

    try {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "buffer" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as unknown[][];

        let headerRowIndex = -1;
        let colIndex = -1;

        for (let i = 0; i < Math.min(rawData.length, 25); i++) {
            const row = rawData[i] as unknown[];
            if (!row) continue;
            const rowStr = row.map((c) => String(c).trim());
            const idx = rowStr.indexOf("Resultado de Aprendizaje");
            if (idx !== -1) {
                headerRowIndex = i;
                colIndex = idx;
                break;
            }
        }

        if (headerRowIndex === -1 || colIndex === -1) {
            return {
                success: false,
                message: "No se encontró la columna 'Resultado de Aprendizaje' en el archivo.",
            };
        }

        const dataRows = rawData.slice(headerRowIndex + 1);
        const uniqueOutcomes = new Set<string>();
        dataRows.forEach((row: any) => {
            const val = row[colIndex];
            if (val !== undefined && val !== null && val !== "") {
                uniqueOutcomes.add(String(val));
            }
        });

        return { success: true, outcomes: Array.from(uniqueOutcomes) };
    } catch (error: any) {
        return {
            success: false,
            message: "Error al leer el archivo Excel: " + (error?.message || "Formato no válido"),
        };
    }
}

export async function processSofiaReport(
    formData: FormData,
    jsonConfigString?: string
): Promise<SofiaReportResult> {
    const file = formData.get("file") as File;

    if (!file) {
        return { success: false, message: "No se ha subido ningún archivo." };
    }

    try {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as unknown[][];

        if (rawData.length < 10) {
            return {
                success: false,
                message: "El formato del archivo no es válido o contiene muy pocas filas.",
            };
        }

        const excelDateToJSDate = (serial: number | string) => {
            if (!serial) return "";
            const num = Number(serial);
            if (isNaN(num)) return String(serial);
            const date = new Date(Math.round((num - 25569) * 86400 * 1000));
            const d = date.getUTCDate();
            const m = date.getUTCMonth() + 1;
            const y = date.getUTCFullYear();
            return `${d.toString().padStart(2, "0")}/${m.toString().padStart(2, "0")}/${y}`;
        };

        let ficha = "";
        const reportDetails: SofiaReportDetails = {
            date: "",
            id: "",
            code: "",
            version: "",
            programName: "",
            status: "",
            startDate: "",
            endDate: "",
            modality: "",
            regional: "",
            center: "",
        };

        // Scan first 25 rows for metadata
        for (let i = 0; i < Math.min(rawData.length, 25); i++) {
            const row = rawData[i] as unknown[];
            if (!row) continue;

            const labelRaw = String(row[0] || "").trim().toLowerCase();
            const valRaw = row[2] !== undefined ? row[2] : row[1];
            const val = valRaw !== undefined ? valRaw : "";
            const valStr = String(val).trim();

            if (labelRaw.includes("fecha del reporte")) {
                reportDetails.date = excelDateToJSDate(val as string | number);
            } else if (labelRaw.includes("estado de la ficha")) {
                reportDetails.status = valStr;
            } else if (labelRaw.includes("fecha inicio")) {
                reportDetails.startDate = excelDateToJSDate(val as string | number);
            } else if (labelRaw.includes("fecha fin")) {
                reportDetails.endDate = excelDateToJSDate(val as string | number);
            } else if (labelRaw.includes("caracterizac") && !labelRaw.includes("estado")) {
                reportDetails.id = valStr;
                ficha = valStr;
            } else if (
                labelRaw.startsWith("código") ||
                labelRaw.startsWith("codigo") ||
                labelRaw === "codigo:" ||
                labelRaw === "código:"
            ) {
                reportDetails.code = valStr;
            } else if (labelRaw.includes("versión") || labelRaw.includes("version")) {
                reportDetails.version = valStr;
            } else if (labelRaw.includes("denominación") || labelRaw.includes("denominacion")) {
                reportDetails.programName = valStr;
            } else if (labelRaw.includes("modalidad")) {
                reportDetails.modality = valStr;
            } else if (labelRaw.includes("regional")) {
                reportDetails.regional = valStr;
            } else if (labelRaw.includes("centro de for")) {
                reportDetails.center = valStr;
            }
        }

        if (!ficha) {
            ficha = "Sin Ficha";
        }

        let headerRowIndex = -1;
        let headerRow: unknown[] = [];
        const requiredCols = [
            "Número de Documento",
            "Nombre",
            "Apellidos",
            "Estado",
            "Resultado de Aprendizaje",
            "Juicio de Evaluación",
        ];

        for (let i = 0; i < Math.min(rawData.length, 25); i++) {
            const row = rawData[i] as unknown[];
            if (!row) continue;

            const rowStr = row.map((c) => String(c).trim());
            const matches = requiredCols.filter((col) => rowStr.includes(col));

            if (matches.length >= 4) {
                headerRowIndex = i;
                headerRow = row;
                break;
            }
        }

        if (headerRowIndex === -1) {
            return {
                success: false,
                message:
                    "No se pudo encontrar la fila de encabezados. Asegúrese de que el archivo contiene 'Número de Documento', 'Nombre', 'Apellidos', etc.",
            };
        }

        const colMap: Record<string, number> = {};
        headerRow.forEach((cell: unknown, index: number) => {
            if (typeof cell === "string") {
                const cleanName = cell.trim();
                colMap[cleanName] = index;
            }
        });

        const missingCols = requiredCols.filter((col) => colMap[col] === undefined);
        if (missingCols.length > 0) {
            return {
                success: false,
                message: `Faltan columnas requeridas en el archivo: ${missingCols.join(", ")}`,
            };
        }

        const dataRows = rawData.slice(headerRowIndex + 1) as unknown[][];

        const uniqueResultados = new Set<string>();
        const uniqueCompetenciasMap = new Map<string, string>();

        dataRows.forEach((row) => {
            const res = row[colMap["Resultado de Aprendizaje"]];
            const comp = row[colMap["Competencia"]];
            if (res !== undefined && res !== null && res !== "") {
                const resStr = String(res);
                uniqueResultados.add(resStr);
                if (comp) {
                    uniqueCompetenciasMap.set(resStr, String(comp).trim());
                }
            }
        });

        let resultadosList = Array.from(uniqueResultados);

        // Optional Timeline Configuration Sorting
        if (jsonConfigString) {
            try {
                const config = JSON.parse(jsonConfigString) as TimelineConfig;
                if (config.type === "sofia-timeline" && Array.isArray(config.periods)) {
                    const orderedOutcomes: string[] = [];
                    config.periods.forEach((period) => {
                        period.outcomes.forEach((outcome) => {
                            const outcomeId = typeof outcome === "string" ? outcome : outcome.id;
                            if (uniqueResultados.has(outcomeId)) {
                                orderedOutcomes.push(outcomeId);
                            }
                        });
                    });

                    resultadosList.forEach((r) => {
                        if (!orderedOutcomes.includes(r)) {
                            orderedOutcomes.push(r);
                        }
                    });

                    resultadosList = orderedOutcomes;
                }
            } catch {
                // Ignore invalid JSON config
            }
        }

        // Group by Apprentice
        const apprenticesMap = new Map<
            string,
            {
                docId: string;
                nombre: unknown;
                apellidos: unknown;
                estado: unknown;
                results: Record<string, { juicio: string; evaluador: string }>;
            }
        >();

        const apprenticeOrder: string[] = [];
        let lastDocId = "";

        dataRows.forEach((row) => {
            let docId = row[colMap["Número de Documento"]];
            const nameFromCol = row[colMap["Nombres"]];
            const hasLearningOutcome =
                row[colMap["Resultado de Aprendizaje"]] &&
                String(row[colMap["Resultado de Aprendizaje"]]).trim().length > 0;

            if (docId) {
                lastDocId = String(docId);
            } else if (nameFromCol && String(nameFromCol).trim().length > 0) {
                docId = "SIN_DOC_" + String(nameFromCol).trim();
                lastDocId = String(docId);
            } else if (lastDocId && hasLearningOutcome) {
                docId = lastDocId;
            } else {
                return;
            }

            const docIdStr = String(docId);

            if (!apprenticesMap.has(docIdStr)) {
                apprenticeOrder.push(docIdStr);
                apprenticesMap.set(docIdStr, {
                    docId: docIdStr,
                    nombre: row[colMap["Nombre"]],
                    apellidos: row[colMap["Apellidos"]],
                    estado: row[colMap["Estado"]],
                    results: {},
                });
            }

            const appData = apprenticesMap.get(docIdStr);
            if (appData) {
                const rawRes = row[colMap["Resultado de Aprendizaje"]];
                if (rawRes !== undefined && rawRes !== null && rawRes !== "") {
                    const resultName = String(rawRes);
                    const juicio = String(row[colMap["Juicio de Evaluación"]]).trim();
                    const evalId = String(
                        row[colMap["Funcionario que registro el juicio evaluativo"]] || ""
                    ).trim();

                    const evalNameIndex = colMap["Nombre Funcionario que registro el juicio evaluativo"];
                    const evalName =
                        evalNameIndex !== undefined ? String(row[evalNameIndex] || "").trim() : "";

                    const evaluador = evalName ? `${evalName} (${evalId})` : evalId;

                    appData.results[resultName] = {
                        juicio,
                        evaluador,
                    };
                }
            }
        });

        // Colores armonizados con el tema visual de AcademiX (tonos suaves y pasteles)
        const colors = {
            porEvaluar: "#f8fafc",
            noAprobado: "#fee2e2",
            aprobado: "#dcfce7",
            noFormacion: "#fef3c7",
            inactivo: "#f8fafc",
            resultado: "#f1f5f9",
            competencia: "#e2e8f0",
        };

        const headerRows: ReportCell[][] = [];

        let usedConfig: TimelineConfig | null = null;
        if (jsonConfigString) {
            try {
                const c = JSON.parse(jsonConfigString) as TimelineConfig;
                if (c.type === "sofia-timeline" && Array.isArray(c.periods)) {
                    usedConfig = c;
                }
            } catch {}
        }

        if (usedConfig) {
            const periodRow: ReportCell[] = [
                { value: "#", isHeader: true, rowSpan: 2 },
                { value: "IDENTIFICACIÓN", isHeader: true, rowSpan: 2 },
                { value: "NOMBRES", isHeader: true, rowSpan: 2 },
                { value: "APELLIDOS", isHeader: true, rowSpan: 2 },
                { value: "ESTADO", isHeader: true, rowSpan: 2 },
                { value: "%", isHeader: true, rowSpan: 2 },
            ];

            const tagRow: ReportCell[] = [];

            usedConfig.periods.forEach((period) => {
                const validItems = period.outcomes.filter((o) =>
                    uniqueResultados.has(typeof o === "string" ? o : o.id)
                );

                if (validItems.length > 0) {
                    periodRow.push({
                        value: period.name,
                        isHeader: true,
                        colSpan: validItems.length,
                        bg: "#f1f5f9",
                    });

                    validItems.forEach((item) => {
                        const label = typeof item === "string" ? "Sin etiqueta" : item.label || "Sin etiqueta";
                        tagRow.push({ value: label, isHeader: true, isLongText: false });
                    });
                }
            });

            const coveredOutcomesCount = tagRow.length;
            if (coveredOutcomesCount < resultadosList.length) {
                const diff = resultadosList.length - coveredOutcomesCount;
                periodRow.push({ value: "Otros", isHeader: true, colSpan: diff });
                for (let i = coveredOutcomesCount; i < resultadosList.length; i++) {
                    tagRow.push({ value: "N/A", isHeader: true });
                }
            }

            headerRows.push(periodRow);
            headerRows.push(tagRow);
        } else {
            headerRows.push([
                { value: "#", isHeader: true },
                { value: "IDENTIFICACIÓN", isHeader: true },
                { value: "NOMBRES", isHeader: true },
                { value: "APELLIDOS", isHeader: true },
                { value: "ESTADO", isHeader: true },
                { value: "%", isHeader: true },
                ...resultadosList.map((r) => ({ value: r, isHeader: true, resultName: r })),
            ]);
        }

        const apprenticeRows: ReportCell[][] = apprenticeOrder.map((docId, idx) => {
            const app = apprenticesMap.get(docId)!;
            let approvedCount = 0;

            const rowCells: ReportCell[] = [
                { value: idx + 1 },
                { value: String(app.docId) },
                { value: String(app.nombre) },
                { value: String(app.apellidos) },
                { value: String(app.estado) },
            ];

            const cells = resultadosList.map((resName) => {
                const entry = app.results[resName];
                let cellColor = colors.porEvaluar;
                let note = entry?.evaluador || "";
                let text = "";

                // Los juicios calificados por el instructor siempre prevalecen (sin importar si es condicionado o en formación)
                if (entry?.juicio === "APROBADO") {
                    cellColor = colors.aprobado;
                    text = "A";
                    approvedCount++;
                } else if (entry?.juicio === "NO APROBADO") {
                    cellColor = colors.noAprobado;
                    text = "NA";
                } else {
                    // Celdas pendientes por evaluar
                    if (app.estado === "EN FORMACION" || app.estado === "CONDICIONADO") {
                        cellColor = colors.porEvaluar;
                    } else {
                        cellColor = colors.inactivo;
                    }
                }

                return {
                    value: text,
                    bg: cellColor,
                    note: note,
                };
            });

            const percentage =
                resultadosList.length > 0
                    ? ((approvedCount / resultadosList.length) * 100).toFixed(1) + "%"
                    : "0%";

            rowCells.push({ value: percentage });
            return [...rowCells, ...cells];
        });

        const bottomResultsRow: ReportCell[] = [
            { value: "RESULTADOS DE APRENDIZAJE", colSpan: 6 },
            { value: "" },
            { value: "" },
            { value: "" },
            { value: "" },
            { value: "" },
            ...resultadosList.map((r) => ({ value: r, bg: colors.resultado, isLongText: true })),
        ];

        const bottomCompetenciesRow: ReportCell[] = [
            { value: "COMPETENCIAS", colSpan: 6 },
            { value: "" },
            { value: "" },
            { value: "" },
            { value: "" },
            { value: "" },
            ...resultadosList.map((r) => ({
                value: uniqueCompetenciasMap.get(r) || "",
                bg: colors.competencia,
                isLongText: true,
            })),
        ];

        const finalRows = [
            ...headerRows,
            ...apprenticeRows,
            bottomResultsRow,
            bottomCompetenciesRow,
        ];

        return {
            success: true,
            data: {
                ficha,
                reportDetails,
                rows: finalRows,
            },
        };
    } catch (error: any) {
        return {
            success: false,
            message: "Error al procesar el archivo Sofia Plus: " + (error?.message || "Formato no válido"),
        };
    }
}
