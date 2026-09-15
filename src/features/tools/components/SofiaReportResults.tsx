"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
    Maximize2,
    Minimize2,
    FileSpreadsheet,
    FileText,
    Search,
    Filter,
    Check,
    HelpCircle,
    Info,
    RotateCcw,
    Loader2,
    CalendarRange,
    ChevronLeft,
    ChevronRight,
    Layers,
    Clock,
    AlertCircle,
    CheckCircle2,
    ChevronDown,
    Target,
    X,
    ListFilter,
} from "lucide-react";

type EvaluationStatusFilter = "all" | "pending" | "failed" | "all_approved";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SofiaReportData, ReportCell, CorporateExportCustomHeader, ProcessedReportItem } from "../types/sofiaReportTypes";
import { exportSofiaReportToCorporateExcel } from "../utils/sofiaCorporateExcelExport";
import { generateAndDownloadSofiaPdf } from "../utils/sofiaCorporatePdfExport";
import { SofiaExportModal } from "./SofiaExportModal";

const FIXED_WIDTHS = [
    36,  // #
    100, // ID
    130, // Nombres (Flexible minWidth)
    130, // Apellidos (Flexible minWidth)
    105, // Estado
    50,  // %
];
const EVAL_COL_WIDTH = 76;

interface PeriodSlice {
    id: string;
    name: string;
    colSpan: number;
    rapStartIndex: number; // in tagRow (0-indexed)
    rapEndIndex: number;   // exclusive
    bodyColStartIndex: number; // in bodyRow (starts at 6)
    bodyColEndIndex: number;   // exclusive
    headerColIdx: number; // index in headerRows[0]
}

function formatFileSize(bytes: number) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

interface SofiaReportResultsProps {
    data: SofiaReportData;
    processedReports?: ProcessedReportItem[];
    activeReportId?: string;
    onSelectReport?: (id: string) => void;
}

export function SofiaReportResults({
    data,
    processedReports,
    activeReportId,
    onSelectReport,
}: SofiaReportResultsProps) {
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [exportModalOpen, setExportModalOpen] = useState(false);
    const [exportModalFormat, setExportModalFormat] = useState<"excel" | "pdf">("excel");
    const [isExporting, setIsExporting] = useState(false);

    const initialHeaderRow = data.rows[0];
    const isGroupedHeader = initialHeaderRow && initialHeaderRow[0]?.rowSpan === 2;
    const headerRowCount = isGroupedHeader ? 2 : 1;

    const FILTERABLE_COLS: Record<string, number> = {
        "IDENTIFICACIÓN": 1,
        "NOMBRES": 2,
        "APELLIDOS": 3,
        "ESTADO": 4,
    };

    const [activeFilters, setActiveFilters] = useState<Record<number, string[]>>({});

    const allRows = data.rows;
    if (allRows.length < headerRowCount + 2) {
        return (
            <div className="p-8 text-center text-xs text-muted-foreground">
                Datos insuficientes para renderizar la matriz de resultados.
            </div>
        );
    }

    const headerRows: ReportCell[][] = [];
    const bodyRowsRaw: ReportCell[][] = [];
    const footerRows: ReportCell[][] = [];

    allRows.forEach((row, index) => {
        if (index < headerRowCount) {
            headerRows.push(row);
            return;
        }

        const isFooter = row.some((c) => {
            const val = String(c?.value || "").toUpperCase();
            return (
                val.includes("RESULTADOS DE APRENDIZAJE") ||
                val.includes("COMPETENCIAS")
            );
        });
        if (isFooter) {
            footerRows.push(row);
            return;
        }

        bodyRowsRaw.push(row);
    });

    // ── Calculate Period Slices to prevent horizontal scroll ──
    const periods: PeriodSlice[] = useMemo(() => {
        if (!isGroupedHeader || !headerRows[0]) {
            const totalRaps = (headerRows[0]?.length || 6) - 6;
            if (totalRaps <= 8) return [];

            const slices: PeriodSlice[] = [];
            const CHUNK = 6;
            let count = 0;
            for (let i = 0; i < totalRaps; i += CHUNK) {
                count++;
                const span = Math.min(CHUNK, totalRaps - i);
                slices.push({
                    id: `block-${count}`,
                    name: `Bloque ${count}`,
                    colSpan: span,
                    rapStartIndex: i,
                    rapEndIndex: i + span,
                    bodyColStartIndex: 6 + i,
                    bodyColEndIndex: 6 + i + span,
                    headerColIdx: 6 + count - 1,
                });
            }
            return slices;
        }

        const slices: PeriodSlice[] = [];
        let rapOffset = 0;
        let bodyColOffset = 6;

        for (let i = 6; i < headerRows[0].length; i++) {
            const pCell = headerRows[0][i];
            const span = pCell.colSpan || 1;
            const pName = String(pCell.value || `Periodo ${i - 5}`);

            slices.push({
                id: `period-${i - 6}`,
                name: pName,
                colSpan: span,
                rapStartIndex: rapOffset,
                rapEndIndex: rapOffset + span,
                bodyColStartIndex: bodyColOffset,
                bodyColEndIndex: bodyColOffset + span,
                headerColIdx: i,
            });

            rapOffset += span;
            bodyColOffset += span;
        }

        return slices;
    }, [isGroupedHeader, headerRows]);

    // Active Period State (defaults to first period if available)
    const [selectedPeriodId, setSelectedPeriodId] = useState<string>(() => {
        return periods.length > 0 ? periods[0].id : "all";
    });

    // Global Evaluation and Learning Outcome (RAP) Filters
    const [evaluationFilter, setEvaluationFilter] = useState<EvaluationStatusFilter>("all");
    const [selectedOutcome, setSelectedOutcome] = useState<string | number>("all");
    const [outcomeOpen, setOutcomeOpen] = useState(false);

    // Reset to first period when a new report/ficha is uploaded
    const [lastFicha, setLastFicha] = useState(data.ficha);
    if (data.ficha !== lastFicha) {
        setLastFicha(data.ficha);
        if (periods.length > 0) {
            setSelectedPeriodId(periods[0].id);
        }
        setEvaluationFilter("all");
        setSelectedOutcome("all");
    }

    const activePeriod = useMemo(() => {
        if (selectedPeriodId === "all") return null;
        return periods.find((p) => p.id === selectedPeriodId) || periods[0] || null;
    }, [selectedPeriodId, periods]);

    const currentPeriodIndex = useMemo(() => {
        if (!activePeriod) return -1;
        return periods.findIndex((p) => p.id === activePeriod.id);
    }, [activePeriod, periods]);

    interface OutcomeOption {
        colIdx: number;
        rapIdx: number;
        label: string;
        codeOrDesc: string;
        periodName: string;
        stats: {
            approved: number;
            failed: number;
            pending: number;
        };
    }

    // Extract all unique learning outcomes (RA) with period and real-time statistics
    const availableOutcomes = useMemo<OutcomeOption[]>(() => {
        const totalRaps = isGroupedHeader && headerRows[1]
            ? headerRows[1].length
            : (headerRows[0]?.length || 6) - 6;

        if (totalRaps <= 0) return [];

        const bottomResultsRow = footerRows.find((r) =>
            r.some((c) => String(c?.value || "").toUpperCase().includes("RESULTADOS DE APRENDIZAJE"))
        );

        const list: OutcomeOption[] = [];

        for (let i = 0; i < totalRaps; i++) {
            const colIdx = 6 + i;
            const label = isGroupedHeader && headerRows[1]?.[i]
                ? String(headerRows[1][i].value || `RA ${i + 1}`)
                : String(headerRows[0]?.[colIdx]?.value || `RA ${i + 1}`);

            const codeOrDesc = String(bottomResultsRow?.[colIdx]?.value || "");

            // Find period name
            let periodName = "General";
            for (const p of periods) {
                if (colIdx >= p.bodyColStartIndex && colIdx < p.bodyColEndIndex) {
                    periodName = p.name;
                    break;
                }
            }

            let approved = 0;
            let failed = 0;
            let pending = 0;

            bodyRowsRaw.forEach((row) => {
                const cellVal = row[colIdx]?.value;
                if (cellVal === "A") approved++;
                else if (cellVal === "NA") failed++;
                else pending++;
            });

            list.push({
                colIdx,
                rapIdx: i,
                label,
                codeOrDesc,
                periodName,
                stats: { approved, failed, pending },
            });
        }

        return list;
    }, [isGroupedHeader, headerRows, footerRows, periods, bodyRowsRaw]);

    const selectedOutcomeItem = useMemo(() => {
        if (selectedOutcome === "all") return null;
        return availableOutcomes.find((o) => o.colIdx === Number(selectedOutcome)) || null;
    }, [selectedOutcome, availableOutcomes]);

    // Real-time counter of apprentices under current search/column/outcome filters
    const filterStats = useMemo(() => {
        let total = 0;
        let pending = 0;
        let failed = 0;
        let allApproved = 0;

        bodyRowsRaw.forEach((row) => {
            // Text search
            if (searchTerm.trim()) {
                const query = searchTerm.toLowerCase();
                const doc = String(row[1]?.value || "").toLowerCase();
                const name = String(row[2]?.value || "").toLowerCase();
                const surname = String(row[3]?.value || "").toLowerCase();
                const fullName = `${name} ${surname}`;
                if (!doc.includes(query) && !fullName.includes(query)) return;
            }

            // Column filters
            for (const [colIdxStr, selectedValues] of Object.entries(activeFilters)) {
                const colIdx = Number(colIdxStr);
                if (selectedValues.length > 0) {
                    const cellVal = String(row[colIdx]?.value || "").trim();
                    if (!selectedValues.includes(cellVal)) return;
                }
            }

            // Scope of evaluation cells:
            // When a specific RAP is chosen, evaluate strictly that outcome column!
            const evalCells = selectedOutcome !== "all"
                ? [row[Number(selectedOutcome)]].filter(Boolean)
                : activePeriod
                ? row.slice(activePeriod.bodyColStartIndex, activePeriod.bodyColEndIndex)
                : row.slice(6);

            total++;
            if (evalCells.some((c) => !c.value || c.value === "—")) pending++;
            if (evalCells.some((c) => c.value === "NA")) failed++;
            if (evalCells.length > 0 && evalCells.every((c) => c.value === "A")) allApproved++;
        });

        return { total, pending, failed, allApproved };
    }, [bodyRowsRaw, searchTerm, activeFilters, activePeriod, selectedOutcome]);

    // Extract unique values for each filterable column
    const columnUniqueValues = useMemo(() => {
        const values: Record<number, string[]> = {};
        Object.values(FILTERABLE_COLS).forEach((colIdx) => {
            const set = new Set<string>();
            bodyRowsRaw.forEach((row) => {
                const cellVal = String(row[colIdx]?.value || "").trim();
                if (cellVal) set.add(cellVal);
            });
            values[colIdx] = Array.from(set).sort();
        });
        return values;
    }, [bodyRowsRaw]);

    // Filter body rows (combines Text Search, Column Filters, Outcome Filter, and Evaluation Status Filter)
    const filteredBodyRows = useMemo(() => {
        return bodyRowsRaw.filter((row) => {
            // 1. Text search
            if (searchTerm.trim()) {
                const query = searchTerm.toLowerCase();
                const doc = String(row[1]?.value || "").toLowerCase();
                const name = String(row[2]?.value || "").toLowerCase();
                const surname = String(row[3]?.value || "").toLowerCase();
                const fullName = `${name} ${surname}`;
                if (!doc.includes(query) && !fullName.includes(query)) {
                    return false;
                }
            }

            // 2. Column filters
            for (const [colIdxStr, selectedValues] of Object.entries(activeFilters)) {
                const colIdx = Number(colIdxStr);
                if (selectedValues.length > 0) {
                    const cellVal = String(row[colIdx]?.value || "").trim();
                    if (!selectedValues.includes(cellVal)) {
                        return false;
                    }
                }
            }

            // Scope of evaluation cells
            const evalCells = selectedOutcome !== "all"
                ? [row[Number(selectedOutcome)]].filter(Boolean)
                : activePeriod
                ? row.slice(activePeriod.bodyColStartIndex, activePeriod.bodyColEndIndex)
                : row.slice(6);

            // 3. Global Evaluation Status filter
            if (evaluationFilter === "pending") {
                const hasPending = evalCells.some((c) => !c.value || c.value === "—");
                if (!hasPending) return false;
            } else if (evaluationFilter === "failed") {
                const hasFailed = evalCells.some((c) => c.value === "NA");
                if (!hasFailed) return false;
            } else if (evaluationFilter === "all_approved") {
                const isAllA = evalCells.length > 0 && evalCells.every((c) => c.value === "A");
                if (!isAllA) return false;
            }

            return true;
        });
    }, [bodyRowsRaw, searchTerm, activeFilters, activePeriod, selectedOutcome, evaluationFilter]);

    // ── Slice Display Rows for Focused Period or Specific Outcome View ──
    const displayHeaderRows = useMemo(() => {
        if (selectedOutcome !== "all") {
            const row0Fixed = headerRows[0].slice(0, 6);
            const targetOutcome = availableOutcomes.find((o) => o.colIdx === Number(selectedOutcome));
            const periodHeaderCell: ReportCell = {
                value: targetOutcome?.periodName || "Resultado",
                colSpan: 1,
                isHeader: true,
            };
            const row0 = [...row0Fixed, periodHeaderCell];

            if (isGroupedHeader && headerRows[1]) {
                const rapTagCell = headerRows[1][targetOutcome?.rapIdx ?? (Number(selectedOutcome) - 6)] || {
                    value: targetOutcome?.label || "Resultado",
                    isHeader: true,
                };
                return [row0, [rapTagCell]];
            }
            return [row0];
        }

        if (!activePeriod || !isGroupedHeader) {
            return headerRows;
        }

        // Row 0: 6 fixed cells + single active period header
        const row0Fixed = headerRows[0].slice(0, 6);
        const periodCell = headerRows[0][activePeriod.headerColIdx] || {
            value: activePeriod.name,
            colSpan: activePeriod.colSpan,
            isHeader: true,
        };
        const row0 = [...row0Fixed, periodCell];

        // Row 1 (tagRow): only RA for this period
        const row1 = (headerRows[1] || []).slice(
            activePeriod.rapStartIndex,
            activePeriod.rapEndIndex
        );

        return [row0, row1];
    }, [activePeriod, isGroupedHeader, headerRows, selectedOutcome, availableOutcomes]);

    const displayBodyRows = useMemo(() => {
        return filteredBodyRows.map((row) => {
            const fixedCols = row.slice(0, 6);
            if (selectedOutcome !== "all") {
                const targetCell = row[Number(selectedOutcome)] || { value: "—" };
                return [...fixedCols, targetCell];
            }
            if (!activePeriod) {
                return row;
            }

            const evalCols = row.slice(
                activePeriod.bodyColStartIndex,
                activePeriod.bodyColEndIndex
            );
            return [...fixedCols, ...evalCols];
        });
    }, [activePeriod, filteredBodyRows, selectedOutcome]);

    const displayFooterRows = useMemo(() => {
        return footerRows.map((fRow) => {
            const titleCell = fRow[0] || { value: "" };
            const emptySpacers = fRow.slice(1, 6);
            if (selectedOutcome !== "all") {
                const targetCell = fRow[Number(selectedOutcome)] || { value: "" };
                return [titleCell, ...emptySpacers, targetCell];
            }
            if (!activePeriod) {
                return fRow;
            }

            const contentCols = fRow.slice(
                activePeriod.bodyColStartIndex,
                activePeriod.bodyColEndIndex
            );
            return [titleCell, ...emptySpacers, ...contentCols];
        });
    }, [activePeriod, footerRows, selectedOutcome]);

    const evalColCount = useMemo(() => {
        if (displayBodyRows.length > 0) {
            return Math.max(0, displayBodyRows[0].length - 6);
        }
        if (selectedOutcome !== "all") return 1;
        if (activePeriod) return activePeriod.colSpan;
        if (displayHeaderRows.length > 1) return displayHeaderRows[1].length;
        if (displayHeaderRows.length > 0) return Math.max(0, displayHeaderRows[0].length - 6);
        return 0;
    }, [displayBodyRows, selectedOutcome, activePeriod, displayHeaderRows]);

    const totalTableMinWidth = useMemo(() => {
        const fixedSum = FIXED_WIDTHS.reduce((sum, w) => sum + w, 0);
        return fixedSum + evalColCount * EVAL_COL_WIDTH;
    }, [evalColCount]);

    // Metadata for each evaluation column to support alternating period background colors
    const evalColMeta = useMemo(() => {
        if (selectedOutcome !== "all") {
            const targetOutcome = availableOutcomes.find((o) => o.colIdx === Number(selectedOutcome));
            const pIdx = targetOutcome
                ? periods.findIndex(
                      (p) =>
                          targetOutcome.colIdx >= p.bodyColStartIndex &&
                          targetOutcome.colIdx < p.bodyColEndIndex
                  )
                : 0;
            return [
                {
                    periodIndex: pIdx >= 0 ? pIdx : 0,
                    isLastInPeriod: true,
                    isFirstInPeriod: true,
                },
            ];
        }

        if (activePeriod) {
            const pIdx = periods.findIndex((p) => p.id === activePeriod.id);
            const effectiveIdx = pIdx >= 0 ? pIdx : 0;
            return Array.from({ length: activePeriod.colSpan }).map((_, idx) => ({
                periodIndex: effectiveIdx,
                isLastInPeriod: idx === activePeriod.colSpan - 1,
                isFirstInPeriod: idx === 0,
            }));
        }

        // Panoramic / Todos los Periodos view
        const meta: { periodIndex: number; isLastInPeriod: boolean; isFirstInPeriod: boolean }[] = [];
        periods.forEach((p, pIdx) => {
            for (let k = 0; k < p.colSpan; k++) {
                meta.push({
                    periodIndex: pIdx,
                    isLastInPeriod: k === p.colSpan - 1,
                    isFirstInPeriod: k === 0,
                });
            }
        });
        return meta;
    }, [selectedOutcome, activePeriod, periods, availableOutcomes]);

    const handleFilterChange = (colIdx: number, value: string) => {
        setActiveFilters((prev) => {
            const current = prev[colIdx] || [];
            const next = current.includes(value)
                ? current.filter((v) => v !== value)
                : [...current, value];

            if (next.length === 0) {
                const copy = { ...prev };
                delete copy[colIdx];
                return copy;
            }
            return { ...prev, [colIdx]: next };
        });
    };

    const clearAllFilters = () => {
        setActiveFilters({});
        setSearchTerm("");
        setSelectedOutcome("all");
        setEvaluationFilter("all");
    };

    // Label for the active period/outcome slice
    const currentPeriodLabel = useMemo(() => {
        if (selectedOutcome !== "all") {
            const targetOutcome = availableOutcomes.find((o) => o.colIdx === Number(selectedOutcome));
            return targetOutcome ? `${targetOutcome.label} (${targetOutcome.periodName})` : "Resultado seleccionado";
        }
        if (activePeriod) {
            return activePeriod.name;
        }
        return "Todos los Períodos / RA";
    }, [selectedOutcome, availableOutcomes, activePeriod]);

    // Unified Modal Export Handler
    const handleModalExport = async (opts: {
        format: "excel" | "pdf";
        scope: "all" | "filtered";
        customHeader: CorporateExportCustomHeader;
    }) => {
        setIsExporting(true);
        const isExcel = opts.format === "excel";
        const toastId = toast.loading(
            isExcel ? "Generando archivo Excel corporativo..." : "Generando archivo PDF corporativo..."
        );
        try {
            const customRows =
                opts.scope === "filtered"
                    ? [...displayHeaderRows, ...displayBodyRows, ...displayFooterRows]
                    : undefined;

            const exportOptions = {
                scope: opts.scope,
                customHeader: opts.customHeader,
                customRows,
            };

            if (isExcel) {
                await exportSofiaReportToCorporateExcel(data, exportOptions);
                toast.success("Excel corporativo descargado con éxito", { id: toastId });
            } else {
                await generateAndDownloadSofiaPdf(data, exportOptions);
                toast.success("PDF corporativo descargado con éxito", { id: toastId });
            }
            setExportModalOpen(false);
        } catch (err: any) {
            console.error(err);
            toast.error(`Error al exportar ${opts.format.toUpperCase()}: ${err.message || "Error"}`, {
                id: toastId,
            });
        } finally {
            setIsExporting(false);
        }
    };

    const hasActiveFilters =
        Object.keys(activeFilters).length > 0 ||
        searchTerm.trim().length > 0 ||
        selectedOutcome !== "all" ||
        evaluationFilter !== "all";

    const currentReportItem = useMemo(() => {
        if (!processedReports || processedReports.length === 0) return null;
        return processedReports.find((r) => r.id === activeReportId) || processedReports[0];
    }, [processedReports, activeReportId]);

    return (
        <TooltipProvider>
            <div
                className={cn(
                    "flex flex-col gap-2 transition-all duration-300",
                    isFullScreen
                        ? "fixed inset-0 z-50 bg-background p-3 overflow-hidden"
                        : "relative w-full"
                )}
            >
                {/* Compact Header & Global Filters Toolbar */}
                <Card className="border border-border/70 shadow-2xs">
                    {/* Unified Top Header: Fichas Switcher / Title + Actions */}
                    <div className="py-1.5 px-3 border-b border-border/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                            {/* If multiple processed reports exist, show the interactive switcher */}
                            {processedReports && processedReports.length > 1 ? (
                                <div className="flex items-center gap-1 flex-wrap">
                                    {processedReports.map((item) => {
                                        const isSelected = item.id === (activeReportId || item.id);
                                        return (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => onSelectReport?.(item.id)}
                                                className={cn(
                                                    "px-2.5 py-0.5 rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer border select-none h-6.5",
                                                    isSelected
                                                        ? "bg-primary text-primary-foreground border-primary font-bold shadow-2xs"
                                                        : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60"
                                                )}
                                                title={`${item.fileName} • ${item.programName || "Programa Sofia"}`}
                                            >
                                                <span className="font-mono font-bold">Ficha {item.ficha}</span>
                                                {item.totalApprentices > 0 && (
                                                    <span
                                                        className={cn(
                                                            "text-[10px] px-1 py-0.2 rounded font-mono",
                                                            isSelected
                                                                ? "bg-primary-foreground/20 text-primary-foreground"
                                                                : "bg-muted text-muted-foreground"
                                                        )}
                                                    >
                                                        {item.totalApprentices} apr.
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <h2 className="text-xs sm:text-sm font-bold text-foreground tracking-tight">
                                    Matriz de Juicios — Ficha {data.ficha}
                                </h2>
                            )}

                            {/* State Badge */}
                            {data.reportDetails?.status && (
                                <Badge variant="outline" className="text-[9.5px] py-0 px-1 font-mono h-5">
                                    {data.reportDetails.status}
                                </Badge>
                            )}

                            {/* Program Name & Apprentice Counts */}
                            <span className="text-[11px] text-muted-foreground truncate max-w-[280px] lg:max-w-[380px]" title={data.reportDetails?.programName}>
                                {data.reportDetails?.programName ? `• ${data.reportDetails.programName} • ` : "• "}
                                <span className="font-semibold text-foreground">
                                    {filteredBodyRows.length}
                                </span>{" "}
                                de {bodyRowsRaw.length} aprendices
                            </span>
                        </div>

                        {/* Export & Actions Buttons */}
                        <div className="flex items-center gap-1.5 shrink-0 self-end md:self-auto">
                            {hasActiveFilters && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearAllFilters}
                                    className="h-6.5 text-xs text-muted-foreground hover:text-foreground gap-1 px-2"
                                >
                                    <RotateCcw className="h-3 w-3" />
                                    <span>Limpiar</span>
                                </Button>
                            )}

                            {/* Exportar Excel */}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setExportModalFormat("excel");
                                    setExportModalOpen(true);
                                }}
                                disabled={isExporting}
                                className="h-6.5 text-xs font-semibold gap-1 rounded-lg border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-400 px-2 shadow-2xs cursor-pointer"
                            >
                                <FileSpreadsheet className="h-3 w-3" />
                                <span>Excel</span>
                            </Button>

                            {/* Exportar PDF */}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setExportModalFormat("pdf");
                                    setExportModalOpen(true);
                                }}
                                disabled={isExporting}
                                className="h-6.5 text-xs font-semibold gap-1 rounded-lg border-rose-500/30 text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 dark:text-rose-400 px-2 shadow-2xs cursor-pointer"
                            >
                                <FileText className="h-3 w-3" />
                                <span>PDF</span>
                            </Button>

                            {/* Pantalla Completa */}
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setIsFullScreen(!isFullScreen)}
                                className="h-6.5 w-6.5 rounded-lg cursor-pointer"
                                title={isFullScreen ? "Salir de pantalla completa" : "Pantalla completa"}
                            >
                                {isFullScreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
                            </Button>
                        </div>
                    </div>

                    {/* Bottom Row: Global Filters Toolbar */}
                    <div className="px-3 py-1 flex flex-col md:flex-row items-start md:items-center justify-between gap-1.5 bg-muted/20">
                        {/* Search & Instructor */}
                        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
                            <div className="relative w-full sm:w-52">
                                <Search className="w-3 h-3 absolute left-2.5 top-2 text-muted-foreground pointer-events-none" />
                                <Input
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Buscar documento o nombre..."
                                    className="h-6.5 text-xs pl-7 pr-6 rounded-md"
                                />
                                {searchTerm && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchTerm("")}
                                        className="absolute right-1.5 top-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
                                        title="Limpiar búsqueda"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>

                            {availableOutcomes.length > 0 && (
                                <Popover open={outcomeOpen} onOpenChange={setOutcomeOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className={cn(
                                                "h-6.5 text-xs gap-1.5 rounded-md border-border/60 max-w-[240px] sm:max-w-[280px] justify-between cursor-pointer px-2",
                                                selectedOutcome !== "all" && "border-primary/50 bg-primary/10 font-semibold text-primary"
                                            )}
                                            title={
                                                selectedOutcomeItem
                                                    ? `Resultado de Aprendizaje: ${selectedOutcomeItem.label} (${selectedOutcomeItem.periodName})`
                                                    : "Filtrar por Resultado de Aprendizaje"
                                            }
                                        >
                                            <div className="flex items-center gap-1.5 truncate">
                                                <Target className="w-3.5 h-3.5 text-primary shrink-0" />
                                                <span className="truncate text-[11px]">
                                                    {selectedOutcomeItem
                                                        ? `${selectedOutcomeItem.periodName}: ${selectedOutcomeItem.label}`
                                                        : `Todos los Resultados (${availableOutcomes.length})`}
                                                </span>
                                            </div>
                                            {selectedOutcome !== "all" ? (
                                                <span
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedOutcome("all");
                                                    }}
                                                    className="hover:bg-primary/20 rounded p-0.5 ml-1 text-primary cursor-pointer shrink-0"
                                                    title="Quitar filtro de Resultado de Aprendizaje"
                                                >
                                                    <X className="w-3 h-3" />
                                                </span>
                                            ) : (
                                                <ChevronDown className="w-3 h-3 opacity-50 shrink-0 ml-1" />
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80 sm:w-96 p-1.5" align="start">
                                        <Command>
                                            <CommandInput
                                                placeholder="Buscar por código, nombre o periodo..."
                                                className="h-7 text-xs"
                                            />
                                            <CommandList className="max-h-60 overflow-y-auto mt-1">
                                                <CommandEmpty className="p-2 text-xs text-muted-foreground">
                                                    No se encontró ningún resultado de aprendizaje.
                                                </CommandEmpty>
                                                <CommandGroup>
                                                    <CommandItem
                                                        onSelect={() => {
                                                            setSelectedOutcome("all");
                                                            setOutcomeOpen(false);
                                                        }}
                                                        className="text-xs flex items-center justify-between cursor-pointer py-1.5"
                                                    >
                                                        <div className="flex items-center gap-1.5 font-semibold">
                                                            <Target className="w-3.5 h-3.5 text-primary" />
                                                            <span>Todos los Resultados ({availableOutcomes.length})</span>
                                                        </div>
                                                        {selectedOutcome === "all" && (
                                                            <Check className="h-3.5 w-3.5 text-primary" />
                                                        )}
                                                    </CommandItem>
                                                </CommandGroup>
                                                <CommandSeparator />
                                                {periods.length > 0 ? (
                                                    periods.map((p) => {
                                                        const periodOutcomes = availableOutcomes.filter(
                                                            (o) => o.periodName === p.name
                                                        );
                                                        if (periodOutcomes.length === 0) return null;
                                                        return (
                                                            <CommandGroup key={p.id} heading={p.name}>
                                                                {periodOutcomes.map((outcome) => {
                                                                    const isSelected = Number(selectedOutcome) === outcome.colIdx;
                                                                    return (
                                                                        <CommandItem
                                                                            key={outcome.colIdx}
                                                                            value={`${outcome.label} ${outcome.codeOrDesc} ${outcome.periodName}`}
                                                                            onSelect={() => {
                                                                                setSelectedOutcome(outcome.colIdx);
                                                                                setOutcomeOpen(false);
                                                                            }}
                                                                            className="text-xs flex items-center justify-between cursor-pointer py-1.5"
                                                                        >
                                                                            <div className="flex flex-col min-w-0 pr-2">
                                                                                <span className="font-semibold text-foreground truncate">
                                                                                    {outcome.label}
                                                                                </span>
                                                                                {outcome.codeOrDesc && (
                                                                                    <span className="text-[10px] text-muted-foreground truncate" title={outcome.codeOrDesc}>
                                                                                        {outcome.codeOrDesc}
                                                                                    </span>
                                                                                )}
                                                                                <div className="flex items-center gap-2 text-[9.5px] font-mono mt-0.5">
                                                                                    <span className="text-emerald-600 dark:text-emerald-400">
                                                                                        ✓ {outcome.stats.approved} A
                                                                                    </span>
                                                                                    <span className="text-rose-600 dark:text-rose-400">
                                                                                        ✗ {outcome.stats.failed} NA
                                                                                    </span>
                                                                                    <span className="text-muted-foreground">
                                                                                        ⏳ {outcome.stats.pending} pendientes
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                            {isSelected && (
                                                                                <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-1" />
                                                                            )}
                                                                        </CommandItem>
                                                                    );
                                                                })}
                                                            </CommandGroup>
                                                        );
                                                    })
                                                ) : (
                                                    <CommandGroup>
                                                        {availableOutcomes.map((outcome) => {
                                                            const isSelected = Number(selectedOutcome) === outcome.colIdx;
                                                            return (
                                                                <CommandItem
                                                                    key={outcome.colIdx}
                                                                    value={`${outcome.label} ${outcome.codeOrDesc} ${outcome.periodName}`}
                                                                    onSelect={() => {
                                                                        setSelectedOutcome(outcome.colIdx);
                                                                        setOutcomeOpen(false);
                                                                    }}
                                                                    className="text-xs flex items-center justify-between cursor-pointer py-1.5"
                                                                >
                                                                    <div className="flex flex-col min-w-0 pr-2">
                                                                        <span className="font-semibold text-foreground truncate">
                                                                            {outcome.label}
                                                                        </span>
                                                                        {outcome.codeOrDesc && (
                                                                            <span className="text-[10px] text-muted-foreground truncate" title={outcome.codeOrDesc}>
                                                                                {outcome.codeOrDesc}
                                                                            </span>
                                                                        )}
                                                                        <div className="flex items-center gap-2 text-[9.5px] font-mono mt-0.5">
                                                                            <span className="text-emerald-600 dark:text-emerald-400">
                                                                                ✓ {outcome.stats.approved} A
                                                                            </span>
                                                                            <span className="text-rose-600 dark:text-rose-400">
                                                                                ✗ {outcome.stats.failed} NA
                                                                            </span>
                                                                            <span className="text-muted-foreground">
                                                                                ⏳ {outcome.stats.pending} pendientes
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    {isSelected && (
                                                                        <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-1" />
                                                                    )}
                                                                </CommandItem>
                                                            );
                                                        })}
                                                    </CommandGroup>
                                                )}
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            )}
                        </div>

                        {/* Status Pills */}
                        <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-[10px] font-medium text-muted-foreground mr-0.5">
                                Juicios:
                            </span>

                            {/* Todos */}
                            <button
                                type="button"
                                onClick={() => setEvaluationFilter("all")}
                                className={cn(
                                    "px-2 py-0.5 rounded-md text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer border select-none h-6",
                                    evaluationFilter === "all"
                                        ? "bg-foreground text-background border-foreground font-semibold shadow-2xs"
                                        : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground border-border/50"
                                )}
                            >
                                <span>Todos</span>
                                <span className="text-[9.5px] opacity-75 font-mono">({filterStats.total})</span>
                            </button>

                            {/* Por Evaluar */}
                            <button
                                type="button"
                                onClick={() => setEvaluationFilter(evaluationFilter === "pending" ? "all" : "pending")}
                                className={cn(
                                    "px-2 py-0.5 rounded-md text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer border select-none h-6",
                                    evaluationFilter === "pending"
                                        ? "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/50 font-semibold shadow-2xs"
                                        : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground border-border/40"
                                )}
                                title="Filtrar aprendices con resultados por evaluar (pendientes)"
                            >
                                <Clock className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                                <span>Por Evaluar</span>
                                <span className="text-[9.5px] font-mono px-1 rounded bg-amber-500/10">
                                    {filterStats.pending}
                                </span>
                            </button>

                            {/* No Aprobados */}
                            <button
                                type="button"
                                onClick={() => setEvaluationFilter(evaluationFilter === "failed" ? "all" : "failed")}
                                className={cn(
                                    "px-2 py-0.5 rounded-md text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer border select-none h-6",
                                    evaluationFilter === "failed"
                                        ? "bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/50 font-semibold shadow-2xs"
                                        : "bg-rose-500/5 hover:bg-rose-500/10 text-rose-700/80 dark:text-rose-400 border-rose-500/20"
                                )}
                                title="Filtrar aprendices con al menos un resultado no aprobado (NA)"
                            >
                                <AlertCircle className="w-2.5 h-2.5 text-rose-600 dark:text-rose-400" />
                                <span>No Aprobados</span>
                                <span className="text-[9.5px] font-mono px-1 rounded bg-rose-500/15">
                                    {filterStats.failed}
                                </span>
                            </button>

                            {/* Aprobados */}
                            <button
                                type="button"
                                onClick={() => setEvaluationFilter(evaluationFilter === "all_approved" ? "all" : "all_approved")}
                                className={cn(
                                    "px-2 py-0.5 rounded-md text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer border select-none h-6",
                                    evaluationFilter === "all_approved"
                                        ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/50 font-semibold shadow-2xs"
                                        : "bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-700/80 dark:text-emerald-400 border-emerald-500/20"
                                )}
                                title="Filtrar aprendices con todos sus resultados aprobados (A)"
                            >
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                                <span>Aprobados</span>
                                <span className="text-[9.5px] font-mono px-1 rounded bg-emerald-500/15">
                                    {filterStats.allApproved}
                                </span>
                            </button>
                        </div>
                    </div>
                </Card>

                {/* Period Selector Toolbar to prevent horizontal scroll */}
                {periods.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-1.5 px-1 py-0.5">
                        <div className="flex items-center gap-1 flex-wrap">
                            <div className="flex items-center gap-1 text-[11px] font-semibold text-foreground mr-0.5">
                                <CalendarRange className="w-3.5 h-3.5 text-primary" />
                                <span>Periodo:</span>
                            </div>
                            <div className="flex items-center gap-1 flex-wrap p-0.5 bg-muted/50 dark:bg-muted/30 rounded-lg border border-border/60">
                                {periods.map((p, pIdx) => {
                                    const isSelected = selectedPeriodId === p.id;
                                    const isEven = pIdx % 2 === 0;
                                    return (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => setSelectedPeriodId(p.id)}
                                            className={cn(
                                                "px-2 py-0.5 rounded-md text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer select-none h-6",
                                                isSelected
                                                    ? isEven
                                                        ? "bg-sky-600 text-white shadow-xs font-semibold"
                                                        : "bg-indigo-600 text-white shadow-xs font-semibold"
                                                    : isEven
                                                        ? "text-sky-950 dark:text-sky-200 hover:bg-sky-500/15"
                                                        : "text-indigo-950 dark:text-indigo-200 hover:bg-indigo-500/15"
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    "w-1.5 h-1.5 rounded-full shrink-0",
                                                    isSelected
                                                        ? "bg-white"
                                                        : isEven
                                                            ? "bg-sky-500"
                                                            : "bg-indigo-500"
                                                )}
                                            />
                                            <span>{p.name}</span>
                                            <span
                                                className={cn(
                                                    "text-[9px] px-1 py-0.2 rounded-full font-mono",
                                                    isSelected
                                                        ? "bg-white/20 text-white"
                                                        : isEven
                                                            ? "bg-sky-500/15 text-sky-700 dark:text-sky-300"
                                                            : "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300"
                                                )}
                                            >
                                                {p.colSpan} RA
                                            </span>
                                        </button>
                                    );
                                })}

                                <button
                                    type="button"
                                    onClick={() => setSelectedPeriodId("all")}
                                    className={cn(
                                        "px-2 py-0.5 rounded-md text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer select-none border-l border-border/50 ml-0.5 pl-2 h-6",
                                        selectedPeriodId === "all"
                                            ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                                            : "text-muted-foreground hover:text-foreground hover:bg-background/80"
                                    )}
                                >
                                    <Layers className="w-3 h-3" />
                                    <span>Todos</span>
                                </button>
                            </div>
                        </div>

                        {/* Fast Prev / Next Navigation */}
                        {selectedPeriodId !== "all" && (
                            <div className="flex items-center gap-1 text-xs">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6.5 text-[11px] gap-1 rounded-md px-2"
                                    onClick={() => {
                                        if (currentPeriodIndex > 0) {
                                            setSelectedPeriodId(periods[currentPeriodIndex - 1].id);
                                        }
                                    }}
                                    disabled={currentPeriodIndex <= 0}
                                >
                                    <ChevronLeft className="w-3 h-3" />
                                    <span>Ant</span>
                                </Button>
                                <span className="text-muted-foreground text-[11px] px-1 font-mono">
                                    {currentPeriodIndex + 1}/{periods.length}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6.5 text-[11px] gap-1 rounded-md px-2"
                                    onClick={() => {
                                        if (currentPeriodIndex < periods.length - 1) {
                                            setSelectedPeriodId(periods[currentPeriodIndex + 1].id);
                                        }
                                    }}
                                    disabled={currentPeriodIndex === -1 || currentPeriodIndex >= periods.length - 1}
                                >
                                    <span>Sig</span>
                                    <ChevronRight className="w-3 h-3" />
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {/* Main Table Matrix */}
                <Card className="border border-border/70 shadow-xs flex-1 overflow-hidden flex flex-col">
                    <CardContent className="p-0 flex-1 overflow-auto max-h-[calc(100vh-210px)]">
                        <table
                            style={{
                                minWidth: totalTableMinWidth > 0 ? `${totalTableMinWidth}px` : "100%",
                            }}
                            className="w-full table-fixed text-left border-collapse text-xs"
                        >
                            <colgroup>
                                {FIXED_WIDTHS.map((w, idx) => {
                                    const isFlexible = idx === 2 || idx === 3;
                                    return (
                                        <col
                                            key={`col-fixed-${idx}`}
                                            style={
                                                isFlexible
                                                    ? { minWidth: `${w}px` }
                                                    : { width: `${w}px`, minWidth: `${w}px`, maxWidth: `${w}px` }
                                            }
                                        />
                                    );
                                })}
                                {Array.from({ length: evalColCount }).map((_, idx) => (
                                    <col
                                        key={`col-eval-${idx}`}
                                        style={{
                                            width: `${EVAL_COL_WIDTH}px`,
                                            minWidth: `${EVAL_COL_WIDTH}px`,
                                            maxWidth: `${EVAL_COL_WIDTH}px`,
                                        }}
                                    />
                                ))}
                            </colgroup>

                            {/* Sticky Table Header */}
                            <thead className="sticky top-0 z-20 bg-card border-b border-border/80 shadow-2xs">
                                {displayHeaderRows.map((hRow, rIdx) => (
                                    <tr key={`header-row-${rIdx}`} className="border-b border-border/60">
                                        {hRow.map((cell, cIdx) => {
                                            const cellValue = String(cell.value);
                                            const isFilterable = FILTERABLE_COLS[cellValue] !== undefined;
                                            const filterColIdx = FILTERABLE_COLS[cellValue];
                                            const isFiltered =
                                                filterColIdx !== undefined &&
                                                (activeFilters[filterColIdx] || []).length > 0;

                                             // Determine width: row 0 cols 0..5 are fixed info cols.
                                            const isFixedInfoCol = rIdx === 0 && cIdx < 6;
                                            const isRapCol = rIdx === 1 || (rIdx === 0 && cIdx >= 6 && !isGroupedHeader);
                                            const isFlexible = isFixedInfoCol && (cIdx === 2 || cIdx === 3);

                                            const colStyle = isFlexible
                                                ? { minWidth: FIXED_WIDTHS[cIdx] }
                                                : isFixedInfoCol
                                                ? { width: FIXED_WIDTHS[cIdx], minWidth: FIXED_WIDTHS[cIdx], maxWidth: FIXED_WIDTHS[cIdx] }
                                                : isRapCol
                                                ? { width: EVAL_COL_WIDTH, minWidth: EVAL_COL_WIDTH, maxWidth: EVAL_COL_WIDTH }
                                                : undefined;

                                            // Period index determination for row 0
                                            const pIndex =
                                                selectedOutcome !== "all"
                                                    ? (availableOutcomes.find((o) => o.colIdx === Number(selectedOutcome))
                                                          ? periods.findIndex((p) => {
                                                                const o = availableOutcomes.find((oc) => oc.colIdx === Number(selectedOutcome));
                                                                return o && o.colIdx >= p.bodyColStartIndex && o.colIdx < p.bodyColEndIndex;
                                                            })
                                                          : 0)
                                                    : activePeriod
                                                    ? currentPeriodIndex
                                                    : cIdx - 6;
                                            const isPeriodEven = (pIndex >= 0 ? pIndex : 0) % 2 === 0;

                                            // Column metadata for row 1 (RA tags)
                                            const colMeta = rIdx === 1 ? evalColMeta[cIdx] : undefined;
                                            const isColEven = (colMeta?.periodIndex ?? 0) % 2 === 0;
                                            const isLastInPeriod = colMeta?.isLastInPeriod ?? false;

                                            return (
                                                <th
                                                    key={`th-${rIdx}-${cIdx}`}
                                                    colSpan={cell.colSpan || 1}
                                                    rowSpan={cell.rowSpan || 1}
                                                    style={colStyle}
                                                    className={cn(
                                                        "py-1 px-1 text-[10.5px] select-none align-middle transition-colors",
                                                        rIdx === 0 && cIdx < 6 && "bg-muted/40 font-bold text-foreground border-r border-border/50",
                                                        rIdx === 0 && cIdx >= 6 && (
                                                            isPeriodEven
                                                                ? "bg-sky-100/90 dark:bg-sky-950/70 text-sky-950 dark:text-sky-100 font-bold text-center py-1.5 border-b border-sky-300/80 dark:border-sky-800/80 border-r-2 border-sky-400/80 dark:border-sky-700/80"
                                                                : "bg-indigo-100/90 dark:bg-indigo-950/70 text-indigo-950 dark:text-indigo-100 font-bold text-center py-1.5 border-b border-indigo-300/80 dark:border-indigo-800/80 border-r-2 border-indigo-400/80 dark:border-indigo-700/80"
                                                        ),
                                                        rIdx === 1 && (
                                                            isColEven
                                                                ? "bg-sky-50/90 dark:bg-sky-950/40 text-sky-950 dark:text-sky-200 font-medium text-center"
                                                                : "bg-indigo-50/90 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 font-medium text-center"
                                                        ),
                                                        rIdx === 1 && (
                                                            isLastInPeriod
                                                                ? "border-r-2 border-slate-300 dark:border-slate-600"
                                                                : "border-r border-border/50"
                                                        ),
                                                        (!isFixedInfoCol || cIdx >= 6) && "text-center"
                                                    )}
                                                >
                                                    {isRapCol ? (
                                                        <div
                                                            className="w-full flex items-center justify-center text-center px-0.5"
                                                            title={cellValue}
                                                        >
                                                            <span className="whitespace-normal break-words leading-tight text-[9px] font-medium text-foreground/90 select-none">
                                                                {cellValue}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-between gap-1">
                                                            <span className="truncate">{cellValue}</span>
                                                            {isFilterable && (
                                                                <Popover>
                                                                    <PopoverTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className={cn(
                                                                                "h-4 w-4 p-0 hover:bg-muted/70 rounded",
                                                                                isFiltered && "text-primary font-bold"
                                                                            )}
                                                                        >
                                                                            <Filter className="h-2.5 w-2.5" />
                                                                        </Button>
                                                                    </PopoverTrigger>
                                                                    <PopoverContent className="w-56 p-2" align="start">
                                                                        <Command>
                                                                            <CommandInput
                                                                                placeholder={`Filtrar ${cellValue}...`}
                                                                                className="h-7 text-xs"
                                                                            />
                                                                            <CommandList className="max-h-48 overflow-y-auto mt-1">
                                                                                <CommandEmpty className="p-2 text-xs text-muted-foreground">
                                                                                    Sin resultados.
                                                                                </CommandEmpty>
                                                                                <CommandGroup>
                                                                                    {(columnUniqueValues[filterColIdx] || []).map(
                                                                                        (val) => {
                                                                                            const checked = (
                                                                                                activeFilters[filterColIdx] || []
                                                                                            ).includes(val);
                                                                                            return (
                                                                                                <CommandItem
                                                                                                    key={val}
                                                                                                    onSelect={() =>
                                                                                                        handleFilterChange(
                                                                                                            filterColIdx,
                                                                                                            val
                                                                                                        )
                                                                                                    }
                                                                                                    className="text-xs flex items-center justify-between"
                                                                                                >
                                                                                                    <span className="truncate">{val}</span>
                                                                                                    {checked && (
                                                                                                        <Check className="h-3.5 w-3.5 text-primary" />
                                                                                                    )}
                                                                                                </CommandItem>
                                                                                            );
                                                                                        }
                                                                                    )}
                                                                                </CommandGroup>
                                                                            </CommandList>
                                                                        </Command>
                                                                    </PopoverContent>
                                                                </Popover>
                                                            )}
                                                        </div>
                                                    )}
                                                </th>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </thead>

                            {/* Table Body (Apprentice Rows) */}
                            <tbody className="divide-y divide-border/60">
                                {displayBodyRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={30} className="p-6 text-center text-xs text-muted-foreground">
                                            No se encontraron aprendices con los filtros seleccionados.
                                        </td>
                                    </tr>
                                ) : (
                                    displayBodyRows.map((row, rIdx) => {
                                        return (
                                            <tr
                                                key={`body-row-${rIdx}`}
                                                className="hover:bg-muted/40 transition-colors"
                                            >
                                                {row.map((cell, cIdx) => {
                                                    const cellVal = cell.value;
                                                    const isEvaluationCell = cIdx >= 6;

                                                    if (isEvaluationCell) {
                                                        const isA = cellVal === "A";
                                                        const isNA = cellVal === "NA";
                                                        const evalIdx = cIdx - 6;
                                                        const meta = evalColMeta[evalIdx];
                                                        const isColEven = (meta?.periodIndex ?? 0) % 2 === 0;
                                                        const isLastInPeriod = meta?.isLastInPeriod ?? false;

                                                        return (
                                                            <td
                                                                key={`td-eval-${rIdx}-${cIdx}`}
                                                                style={{ width: EVAL_COL_WIDTH, minWidth: EVAL_COL_WIDTH, maxWidth: EVAL_COL_WIDTH }}
                                                                className={cn(
                                                                    "p-0.5 text-center transition-colors",
                                                                    isColEven
                                                                        ? "bg-sky-500/[0.035] dark:bg-sky-400/[0.05]"
                                                                        : "bg-indigo-500/[0.035] dark:bg-indigo-400/[0.05]",
                                                                    isLastInPeriod
                                                                        ? "border-r-2 border-slate-300/80 dark:border-slate-600/80"
                                                                        : "border-r border-border/40"
                                                                )}
                                                            >
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <div
                                                                            className={cn(
                                                                                "w-6 h-5 mx-auto rounded flex items-center justify-center font-bold text-[9.5px] cursor-pointer select-none transition-all hover:scale-110",
                                                                                isA && "text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25",
                                                                                isNA && "text-rose-700 dark:text-rose-300 bg-rose-500/15 border border-rose-500/30 hover:bg-rose-500/25",
                                                                                !isA && !isNA && "text-muted-foreground/60 bg-muted/30 border border-border/40 hover:bg-muted/50"
                                                                            )}
                                                                        >
                                                                            {cellVal || "—"}
                                                                        </div>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent className="max-w-xs p-2 text-xs">
                                                                        <div className="space-y-1">
                                                                            <span className="font-bold block text-foreground">
                                                                                Juicio: {isA ? "Aprobado" : isNA ? "No Aprobado" : "Por Evaluar"}
                                                                            </span>
                                                                            {cell.note && (
                                                                                <span className="text-muted-foreground block text-[11px]">
                                                                                    Instructor: {cell.note}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </td>
                                                        );
                                                    }

                                                    // Standard Info Columns (Cols 0-5)
                                                    const isFlexible = cIdx === 2 || cIdx === 3;
                                                    return (
                                                        <td
                                                            key={`td-info-${rIdx}-${cIdx}`}
                                                            style={
                                                                cIdx < 6
                                                                    ? isFlexible
                                                                        ? { minWidth: FIXED_WIDTHS[cIdx] }
                                                                        : { width: FIXED_WIDTHS[cIdx], minWidth: FIXED_WIDTHS[cIdx], maxWidth: FIXED_WIDTHS[cIdx] }
                                                                    : undefined
                                                            }
                                                            className={cn(
                                                                "py-1 px-2 text-[10.5px] border-r border-border/40 text-foreground",
                                                                cIdx === 0 && "text-center text-muted-foreground font-semibold",
                                                                cIdx === 1 && "font-mono font-bold",
                                                                cIdx === 5 && (
                                                                    parseFloat(String(cellVal).replace("%", "")) >= 70
                                                                        ? "text-center font-bold text-emerald-600 dark:text-emerald-400"
                                                                        : parseFloat(String(cellVal).replace("%", "")) >= 40
                                                                        ? "text-center font-bold text-amber-600 dark:text-amber-400"
                                                                        : "text-center font-bold text-rose-600 dark:text-rose-400"
                                                                )
                                                            )}
                                                        >
                                                            {cIdx === 4 ? (
                                                                <Badge
                                                                    variant="outline"
                                                                    className={cn(
                                                                        "text-[9px] py-0 px-1 font-semibold",
                                                                        String(cellVal).toUpperCase() === "EN FORMACION"
                                                                            ? "text-emerald-700 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                                                                            : String(cellVal).toUpperCase() === "CONDICIONADO"
                                                                            ? "text-amber-700 dark:text-amber-400 border-amber-500/30 bg-amber-500/10"
                                                                            : String(cellVal).toUpperCase().includes("CANCELAD")
                                                                            ? "text-rose-700 dark:text-rose-400 border-rose-500/30 bg-rose-500/10"
                                                                            : "text-purple-700 dark:text-purple-400 border-purple-500/30 bg-purple-500/10"
                                                                    )}
                                                                >
                                                                    {String(cellVal)}
                                                                </Badge>
                                                            ) : (
                                                                String(cellVal)
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>

                            {/* Footers (Resultados de Aprendizaje y Competencias) */}
                            {displayFooterRows.length > 0 && (
                                <tfoot className="bg-muted/40 border-t-2 border-border/80 text-[11px]">
                                    {displayFooterRows.map((fRow, fIdx) => (
                                        <tr key={`footer-row-${fIdx}`} className="border-b border-border/50">
                                            {fRow.map((cell, cIdx) => {
                                                if (cIdx === 0) {
                                                    return (
                                                        <td
                                                            key={`td-foot-title-${fIdx}-${cIdx}`}
                                                            colSpan={cell.colSpan || 6}
                                                            className="p-2 font-bold text-foreground bg-muted/60 border-r border-border/60 text-center"
                                                        >
                                                            {String(cell.value)}
                                                        </td>
                                                    );
                                                }
                                                if (cIdx < 6) return null; // Handled by colSpan

                                                const evalIdx = cIdx - 6;
                                                const meta = evalColMeta[evalIdx];
                                                const isColEven = (meta?.periodIndex ?? 0) % 2 === 0;
                                                const isLastInPeriod = meta?.isLastInPeriod ?? false;

                                                return (
                                                    <td
                                                        key={`td-foot-${fIdx}-${cIdx}`}
                                                        style={{ width: EVAL_COL_WIDTH, minWidth: EVAL_COL_WIDTH, maxWidth: EVAL_COL_WIDTH }}
                                                        className={cn(
                                                            "p-1 text-[8px] leading-tight align-top overflow-hidden text-center transition-colors",
                                                            isColEven
                                                                ? "bg-sky-50/60 dark:bg-sky-950/30 text-sky-900/90 dark:text-sky-300/90"
                                                                : "bg-indigo-50/60 dark:bg-indigo-950/30 text-indigo-900/90 dark:text-indigo-300/90",
                                                            isLastInPeriod
                                                                ? "border-r-2 border-slate-300/80 dark:border-slate-600/80"
                                                                : "border-r border-border/40"
                                                        )}
                                                    >
                                                        <span className="line-clamp-4 block whitespace-normal break-words" title={String(cell.value)}>
                                                            {String(cell.value)}
                                                        </span>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tfoot>
                            )}
                        </table>
                    </CardContent>
                </Card>

                <SofiaExportModal
                    open={exportModalOpen}
                    onOpenChange={setExportModalOpen}
                    format={exportModalFormat}
                    onFormatChange={setExportModalFormat}
                    data={data}
                    totalApprentices={bodyRowsRaw.length}
                    filteredApprentices={filteredBodyRows.length}
                    hasActiveFilters={hasActiveFilters}
                    periodLabel={currentPeriodLabel}
                    onExport={handleModalExport}
                    isExporting={isExporting}
                />
            </div>
        </TooltipProvider>
    );
}
