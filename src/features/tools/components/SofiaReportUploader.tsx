"use client";

import React, { useState, useRef, useMemo } from "react";
import {
    Upload,
    Loader2,
    CalendarClock,
    FileSpreadsheet,
    FileJson,
    BarChart3,
    TableProperties,
    ArrowRight,
    Sparkles,
    CheckCircle2,
    RefreshCw,
    X,
    UploadCloud,
    FileCheck,
    Info,
    Layers,
    ListFilter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { SofiaReportResult, TimelineConfig, ProcessedReportItem } from "../types/sofiaReportTypes";
import { processSofiaReport, extractLearningOutcomes } from "../utils/sofiaParserActions";
import { SofiaReportResults } from "./SofiaReportResults";
import { SofiaTimelineBuilder } from "./SofiaTimelineBuilder";
import { SofiaReportAnalytics } from "./SofiaReportAnalytics";
import { SofiaToolInfoBanner } from "./SofiaToolInfoBanner";
import { cn } from "@/lib/utils";

function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function SofiaReportUploader() {
    const [activeTab, setActiveTab] = useState<string>("generator");
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [currentProcessingIndex, setCurrentProcessingIndex] = useState<number>(0);

    // Multi-File Generator State
    const [processedReports, setProcessedReports] = useState<ProcessedReportItem[]>([]);
    const [selectedReportId, setSelectedReportId] = useState<string>("");
    const [excelFiles, setExcelFiles] = useState<File[]>([]);
    const [configFile, setConfigFile] = useState<File | null>(null);
    const [isDraggingExcel, setIsDraggingExcel] = useState<boolean>(false);
    const [isDraggingConfig, setIsDraggingConfig] = useState<boolean>(false);

    const excelInputRef = useRef<HTMLInputElement>(null);
    const configInputRef = useRef<HTMLInputElement>(null);

    // Timeline Builder State
    const [outcomes, setOutcomes] = useState<string[]>([]);
    const [showBuilder, setShowBuilder] = useState<boolean>(false);
    const [importedConfig, setImportedConfig] = useState<TimelineConfig | undefined>(undefined);
    const [extractFile, setExtractFile] = useState<File | null>(null);
    const [isDraggingExtract, setIsDraggingExtract] = useState<boolean>(false);
    const extractInputRef = useRef<HTMLInputElement>(null);

    // Currently active report from the processed collection
    const activeReport = useMemo(() => {
        if (processedReports.length === 0) return null;
        return processedReports.find((r) => r.id === selectedReportId) || processedReports[0] || null;
    }, [processedReports, selectedReportId]);

    // ── Generator Submit Handler (Processes ALL selected Excel files with the same JSON) ──
    async function handleGenerateSubmit(event?: React.FormEvent) {
        if (event) event.preventDefault();

        if (excelFiles.length === 0) {
            toast.error("Por favor selecciona al menos un archivo Excel de Sofia Plus");
            return;
        }

        setIsLoading(true);
        setCurrentProcessingIndex(0);
        const newProcessed: ProcessedReportItem[] = [];
        const errors: string[] = [];

        let jsonConfigString: string | undefined = undefined;

        try {
            if (configFile) {
                jsonConfigString = await configFile.text();
            }

            for (let i = 0; i < excelFiles.length; i++) {
                const file = excelFiles[i];
                setCurrentProcessingIndex(i + 1);

                const formData = new FormData();
                formData.append("file", file);

                try {
                    const response = await processSofiaReport(formData, jsonConfigString);

                    if (response.success && response.data) {
                        const allRows = response.data.rows || [];
                        const isGrouped = allRows[0] && allRows[0][0]?.rowSpan === 2;
                        const hCount = isGrouped ? 2 : 1;
                        const apprenticesCount = allRows.slice(hCount).filter((r) => {
                            return !r.some((c) => {
                                const val = String(c?.value || "").toUpperCase();
                                return (
                                    val.includes("RESULTADOS DE APRENDIZAJE") ||
                                    val.includes("COMPETENCIAS")
                                );
                            });
                        }).length;

                        newProcessed.push({
                            id: `rep-${i}-${Date.now()}`,
                            fileName: file.name,
                            fileSize: file.size,
                            ficha: response.data.ficha || `Ficha ${i + 1}`,
                            programName: response.data.reportDetails?.programName,
                            status: response.data.reportDetails?.status,
                            totalApprentices: apprenticesCount,
                            result: response,
                        });
                    } else {
                        errors.push(`${file.name}: ${response.message || "Error al procesar"}`);
                    }
                } catch (err: any) {
                    errors.push(`${file.name}: ${err?.message || "Error inesperado"}`);
                }
            }

            if (newProcessed.length > 0) {
                setProcessedReports(newProcessed);
                setSelectedReportId(newProcessed[0].id);

                if (errors.length > 0) {
                    toast.warning(
                        `Se procesaron ${newProcessed.length} archivo(s), pero fallaron ${errors.length}: ${errors.join(", ")}`
                    );
                } else {
                    toast.success(
                        newProcessed.length === 1
                            ? "Reporte Sofia Plus procesado con éxito"
                            : `Se procesaron con éxito los ${newProcessed.length} reportes de Sofia Plus`
                    );
                }
            } else {
                toast.error(`No se pudo procesar ningún archivo. ${errors.join("; ")}`);
            }
        } catch (error: any) {
            toast.error("Error al procesar: " + (error?.message || "Error inesperado"));
        } finally {
            setIsLoading(false);
            setCurrentProcessingIndex(0);
        }
    }

    // ── Extract Outcomes from Excel Handler (Organizer) ──
    async function handleExtractSubmit(event?: React.FormEvent) {
        if (event) event.preventDefault();

        if (!extractFile) {
            toast.error("Por favor selecciona un archivo Excel de Sofia Plus");
            return;
        }

        setIsLoading(true);
        setShowBuilder(false);
        setOutcomes([]);
        setImportedConfig(undefined);

        const formData = new FormData();
        formData.append("file", extractFile);

        try {
            const response = await extractLearningOutcomes(formData);
            if (response.success && response.outcomes) {
                setOutcomes(response.outcomes);
                setShowBuilder(true);
                toast.success(`Se extrajeron ${response.outcomes.length} RA para organizar`);
            } else {
                toast.error(response.message || "Error al extraer los resultados");
            }
        } catch (error: any) {
            toast.error("Error al leer el archivo: " + (error?.message || "Error"));
        } finally {
            setIsLoading(false);
        }
    }

    // ── Import JSON Template Handler (Organizer) ──
    const handleImportConfig = (file: File) => {
        setIsLoading(true);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                const config: TimelineConfig = JSON.parse(text);

                if (!config.periods || !Array.isArray(config.periods)) {
                    toast.error("El archivo JSON no tiene un formato válido de periodos");
                    setIsLoading(false);
                    return;
                }

                setImportedConfig(config);
                const allImportedOutcomes: string[] = [];
                config.periods.forEach((p) => {
                    p.outcomes.forEach((o) => {
                        allImportedOutcomes.push(typeof o === "string" ? o : o.id);
                    });
                });

                setOutcomes(allImportedOutcomes);
                setShowBuilder(true);
                toast.success("Plantilla JSON de periodos cargada correctamente");
            } catch (err) {
                toast.error("Error al leer el archivo JSON de configuración");
            } finally {
                setIsLoading(false);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="space-y-6">
            {/* Informative Objective & How-to-use Banner (Visible when no result is active) */}
            {!activeReport && <SofiaToolInfoBanner />}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-border/70 pb-3 mb-5 gap-3">
                    <TabsList className="bg-muted/50 p-1 rounded-xl h-10 border border-border/50">
                        <TabsTrigger
                            value="generator"
                            className="text-xs font-semibold gap-2 data-[state=active]:bg-card rounded-lg h-8"
                        >
                            <TableProperties className="w-3.5 h-3.5 text-primary" />
                            <span>Generador de Reportes</span>
                            {processedReports.length > 0 && (
                                <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4 font-mono">
                                    {processedReports.length}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger
                            value="organizer"
                            className="text-xs font-semibold gap-2 data-[state=active]:bg-card rounded-lg h-8"
                        >
                            <CalendarClock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            <span>Organizador de Línea de Tiempo</span>
                        </TabsTrigger>
                        {activeReport && (
                            <TabsTrigger
                                value="analytics"
                                className="text-xs font-semibold gap-2 data-[state=active]:bg-card rounded-lg h-8"
                            >
                                <BarChart3 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                                <span>Analítica de Juicios</span>
                            </TabsTrigger>
                        )}
                    </TabsList>

                    {activeReport && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setProcessedReports([]);
                                setSelectedReportId("");
                                setExcelFiles([]);
                                setActiveTab("generator");
                            }}
                            className="h-9 text-xs gap-1.5 text-muted-foreground hover:text-foreground border-border/70 shadow-2xs rounded-xl cursor-pointer"
                        >
                            <RefreshCw className="h-3.5 w-3.5 text-primary" />
                            <span>Cargar Nuevos Archivos</span>
                        </Button>
                    )}
                </div>

                {/* ── TAB 1: GENERADOR DE REPORTES ── */}
                <TabsContent value="generator" className="space-y-4 mt-0">
                    {!activeReport ? (
                        <div className="w-full space-y-6">
                            <Card className="w-full border border-border/80 bg-card shadow-xs rounded-2xl overflow-hidden">
                                <CardHeader className="text-center pb-5 pt-7 border-b border-border/60 bg-muted/20">
                                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto mb-3 border border-emerald-500/20 shadow-xs">
                                        <FileSpreadsheet className="w-7 h-7" />
                                    </div>
                                    <CardTitle className="text-xl font-black text-foreground tracking-tight">
                                        Cargar Juicios Evaluativos de Sofia Plus
                                    </CardTitle>
                                    <CardDescription className="text-xs text-muted-foreground max-w-xl mx-auto mt-1">
                                        Arrastra uno o varios archivos Excel exportados de Sofia Plus y opcionalmente la plantilla JSON con la distribución de trimestres para procesarlos todos en lote.
                                    </CardDescription>
                                </CardHeader>

                                <CardContent className="p-6 md:p-8 space-y-6">
                                    <form onSubmit={handleGenerateSubmit} className="space-y-6">
                                        {/* ── 2-Column Symmetric Grid ── */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                                            {/* Column 1: Sofia Excel Files (Multiple Supported) */}
                                            <div className="flex flex-col justify-between p-5 rounded-2xl bg-muted/20 border border-border/70 space-y-3">
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                                                            <span>Archivos Excel de Sofia Plus</span>
                                                            <span className="text-rose-500 font-bold">*</span>
                                                        </label>
                                                        <Badge
                                                            variant="outline"
                                                            className="text-[10px] py-0 px-2 border-emerald-500/30 text-emerald-600 bg-emerald-500/5 font-semibold"
                                                        >
                                                            {excelFiles.length > 0
                                                                ? `${excelFiles.length} archivo(s)`
                                                                : "Requerido"}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-[11px] text-muted-foreground">
                                                        Reportes oficiales (.xlsx, .xls). Puedes seleccionar varios archivos para procesarlos juntos.
                                                    </p>
                                                </div>

                                                {/* Hidden multiple input */}
                                                <input
                                                    ref={excelInputRef}
                                                    type="file"
                                                    multiple
                                                    accept=".xlsx, .xls"
                                                    disabled={isLoading}
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        if (e.target.files && e.target.files.length > 0) {
                                                            const newFiles = Array.from(e.target.files);
                                                            setExcelFiles((prev) => {
                                                                const combined = [...prev];
                                                                newFiles.forEach((nf) => {
                                                                    if (
                                                                        !combined.some(
                                                                            (cf) =>
                                                                                cf.name === nf.name &&
                                                                                cf.size === nf.size
                                                                        )
                                                                    ) {
                                                                        combined.push(nf);
                                                                    }
                                                                });
                                                                return combined;
                                                            });
                                                        }
                                                        if (excelInputRef.current) excelInputRef.current.value = "";
                                                    }}
                                                />

                                                {excelFiles.length === 0 ? (
                                                    <div
                                                        onDragOver={(e) => {
                                                            e.preventDefault();
                                                            setIsDraggingExcel(true);
                                                        }}
                                                        onDragLeave={() => setIsDraggingExcel(false)}
                                                        onDrop={(e) => {
                                                            e.preventDefault();
                                                            setIsDraggingExcel(false);
                                                            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                                                                const dropped = Array.from(e.dataTransfer.files).filter(
                                                                    (f) =>
                                                                        f.name.endsWith(".xlsx") ||
                                                                        f.name.endsWith(".xls")
                                                                );
                                                                if (dropped.length > 0) {
                                                                    setExcelFiles((prev) => {
                                                                        const combined = [...prev];
                                                                        dropped.forEach((nf) => {
                                                                            if (
                                                                                !combined.some(
                                                                                    (cf) =>
                                                                                        cf.name === nf.name &&
                                                                                        cf.size === nf.size
                                                                                )
                                                                            ) {
                                                                                combined.push(nf);
                                                                            }
                                                                        });
                                                                        return combined;
                                                                    });
                                                                } else {
                                                                    toast.error(
                                                                        "Por favor arrastra archivos Excel con formato .xlsx o .xls"
                                                                    );
                                                                }
                                                            }
                                                        }}
                                                        onClick={() => excelInputRef.current?.click()}
                                                        className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-200 flex-1 flex flex-col items-center justify-center min-h-[160px] ${
                                                            isDraggingExcel
                                                                ? "border-emerald-500 bg-emerald-500/10 scale-[1.01]"
                                                                : "border-border/80 hover:border-emerald-500/50 hover:bg-muted/30"
                                                        }`}
                                                    >
                                                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto mb-2 border border-emerald-500/20">
                                                            <UploadCloud className="w-6 h-6" />
                                                        </div>
                                                        <p className="text-xs sm:text-sm font-bold text-foreground">
                                                            Arrastra tus archivos Excel aquí o{" "}
                                                            <span className="text-emerald-600 dark:text-emerald-400 underline decoration-dashed underline-offset-4">
                                                                examinar
                                                            </span>
                                                        </p>
                                                        <p className="text-[11px] text-muted-foreground mt-1">
                                                            Soporta múltiples archivos .xlsx y .xls de Sofia Plus
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col p-3 rounded-xl border border-emerald-500/40 bg-emerald-500/5 shadow-2xs min-h-[160px] space-y-2">
                                                        <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
                                                            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                                                <FileCheck className="w-4 h-4 text-emerald-600" />
                                                                <span>{excelFiles.length} archivo(s) listo(s)</span>
                                                            </span>
                                                            <div className="flex items-center gap-1">
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => excelInputRef.current?.click()}
                                                                    className="h-6.5 text-[11px] text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/15 px-2 font-medium"
                                                                >
                                                                    + Agregar más
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => setExcelFiles([])}
                                                                    className="h-6.5 text-[11px] text-muted-foreground hover:text-destructive px-2"
                                                                >
                                                                    Quitar todos
                                                                </Button>
                                                            </div>
                                                        </div>

                                                        {/* Scrollable file list */}
                                                        <div className="overflow-y-auto max-h-40 space-y-1.5 pr-1">
                                                            {excelFiles.map((file, idx) => (
                                                                <div
                                                                    key={`${file.name}-${idx}`}
                                                                    className="flex items-center justify-between p-2 rounded-lg bg-background/80 border border-border/50 text-xs"
                                                                >
                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                        <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                                                                        <span
                                                                            className="truncate font-medium text-foreground text-[11.5px]"
                                                                            title={file.name}
                                                                        >
                                                                            {file.name}
                                                                        </span>
                                                                        <span className="text-[10px] text-muted-foreground shrink-0">
                                                                            ({formatFileSize(file.size)})
                                                                        </span>
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setExcelFiles((prev) =>
                                                                                prev.filter((_, i) => i !== idx)
                                                                            )
                                                                        }
                                                                        className="text-muted-foreground hover:text-destructive p-0.5 ml-1 shrink-0 cursor-pointer"
                                                                        title="Quitar archivo"
                                                                    >
                                                                        <X className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Column 2: JSON Config File (Optional, applies to all) */}
                                            <div className="flex flex-col justify-between p-5 rounded-2xl bg-muted/20 border border-border/70 space-y-3">
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                                            <FileJson className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                                            <span>Configuración de Periodos (JSON)</span>
                                                        </label>
                                                        <Badge
                                                            variant="secondary"
                                                            className="text-[10px] py-0 px-2 bg-muted text-muted-foreground font-normal"
                                                        >
                                                            Opcional
                                                        </Badge>
                                                    </div>
                                                    <p className="text-[11px] text-muted-foreground">
                                                        Esta misma plantilla JSON se aplicará a todos los archivos Excel que proceses para estructurar los trimestres.
                                                    </p>
                                                </div>

                                                {/* Hidden config input */}
                                                <input
                                                    ref={configInputRef}
                                                    type="file"
                                                    accept=".json"
                                                    disabled={isLoading}
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const f = e.target.files?.[0];
                                                        if (f) setConfigFile(f);
                                                    }}
                                                />

                                                {!configFile ? (
                                                    <div
                                                        onDragOver={(e) => {
                                                            e.preventDefault();
                                                            setIsDraggingConfig(true);
                                                        }}
                                                        onDragLeave={() => setIsDraggingConfig(false)}
                                                        onDrop={(e) => {
                                                            e.preventDefault();
                                                            setIsDraggingConfig(false);
                                                            const f = e.dataTransfer.files?.[0];
                                                            if (f) setConfigFile(f);
                                                        }}
                                                        onClick={() => configInputRef.current?.click()}
                                                        className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-200 flex-1 flex flex-col items-center justify-center min-h-[160px] ${
                                                            isDraggingConfig
                                                                ? "border-blue-500 bg-blue-500/10 scale-[1.01]"
                                                                : "border-border/80 hover:border-blue-500/50 hover:bg-muted/30"
                                                        }`}
                                                    >
                                                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center mx-auto mb-2 border border-blue-500/20">
                                                            <FileJson className="w-6 h-6" />
                                                        </div>
                                                        <p className="text-xs sm:text-sm font-bold text-foreground">
                                                            Arrastra la plantilla .json aquí o{" "}
                                                            <span className="text-blue-600 dark:text-blue-400 underline decoration-dashed underline-offset-4">
                                                                examinar
                                                            </span>
                                                        </p>
                                                        <p className="text-[11px] text-muted-foreground mt-1">
                                                            Distribución compartida de RA para todas las fichas
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-between p-4 rounded-xl border border-blue-500/40 bg-blue-500/5 shadow-2xs min-h-[160px]">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0">
                                                                <FileJson className="w-6 h-6" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-xs font-bold text-foreground truncate">
                                                                    {configFile.name}
                                                                </p>
                                                                <p className="text-[11px] text-muted-foreground mt-1">
                                                                    {formatFileSize(configFile.size)} • Plantilla vinculada para todos los archivos
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setConfigFile(null);
                                                                if (configInputRef.current) configInputRef.current.value = "";
                                                            }}
                                                            className="h-8 text-xs text-muted-foreground hover:text-destructive gap-1 shrink-0"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                            <span>Quitar</span>
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* ── Submit Button ── */}
                                        <Button
                                            type="submit"
                                            disabled={isLoading || excelFiles.length === 0}
                                            className="w-full h-12 text-sm font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                                        >
                                            {isLoading ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    <span>
                                                        Procesando archivo {currentProcessingIndex} de {excelFiles.length}...
                                                    </span>
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="w-4 h-4" />
                                                    <span>
                                                        Generar Matriz de Juicios Evaluativos (
                                                        {excelFiles.length} archivo{excelFiles.length === 1 ? "" : "s"}
                                                        )
                                                    </span>
                                                </>
                                            )}
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>
                        </div>
                    ) : (
                        <SofiaReportResults
                            key={activeReport.id}
                            data={activeReport.result.data!}
                            processedReports={processedReports}
                            activeReportId={activeReport.id}
                            onSelectReport={setSelectedReportId}
                        />
                    )}
                </TabsContent>

                {/* ── TAB 2: ORGANIZADOR DE LÍNEA DE TIEMPO ── */}
                <TabsContent value="organizer" className="space-y-6 mt-0">
                    {!showBuilder ? (
                        <div className="w-full space-y-6">
                            {/* Organizer Explanation Banner */}
                            <div className="w-full p-5 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-2 shadow-2xs">
                                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-wider">
                                    <CalendarClock className="w-4 h-4" />
                                    <span>¿Para qué sirve el Organizador de Línea de Tiempo?</span>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    En Sofia Plus, los Resultados de Aprendizaje (RA) suelen descargarse en orden de código o alfabético. Esta utilidad te permite agruparlos en <strong>Trimestres formativos (T1, T2, T3...)</strong> mediante una interfaz visual de arrastrar y soltar. Una vez organizada la distribución, puedes descargar una plantilla <code>.json</code> reutilizable para todas las fichas del mismo programa.
                                </p>
                            </div>

                            <Card className="w-full border border-border/80 bg-card shadow-xs rounded-2xl overflow-hidden">
                                <CardHeader className="text-center pb-5 pt-7 border-b border-border/60 bg-muted/20">
                                    <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 mx-auto mb-3 border border-blue-500/20 shadow-xs">
                                        <CalendarClock className="w-7 h-7" />
                                    </div>
                                    <CardTitle className="text-xl font-black text-foreground tracking-tight">
                                        Organizador de RA por Periodos
                                    </CardTitle>
                                    <CardDescription className="text-xs text-muted-foreground max-w-xl mx-auto mt-1">
                                        Selecciona cómo deseas comenzar a organizar los trimestres de formación.
                                    </CardDescription>
                                </CardHeader>

                                <CardContent className="p-6 md:p-8">
                                    {/* Symmetric 2-Column Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                                        {/* Option A: Extract from Excel */}
                                        <div className="flex flex-col justify-between p-6 rounded-2xl bg-muted/20 border border-border/70 space-y-4">
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <h5 className="font-bold text-sm text-foreground flex items-center gap-2">
                                                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                                                        <span>Opción 1: Extraer desde Excel</span>
                                                    </h5>
                                                    <Badge variant="outline" className="text-[10px] py-0 px-2 border-emerald-500/30 text-emerald-600">
                                                        Recomendada
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground leading-relaxed">
                                                    Extraerá automáticamente todos los RA únicos presentes en el reporte de la ficha para organizarlos visualmente.
                                                </p>
                                            </div>

                                            <input
                                                ref={extractInputRef}
                                                type="file"
                                                accept=".xlsx, .xls"
                                                disabled={isLoading}
                                                className="hidden"
                                                onChange={(e) => {
                                                    const f = e.target.files?.[0];
                                                    if (f) setExtractFile(f);
                                                }}
                                            />

                                            {!extractFile ? (
                                                <div
                                                    onDragOver={(e) => {
                                                        e.preventDefault();
                                                        setIsDraggingExtract(true);
                                                    }}
                                                    onDragLeave={() => setIsDraggingExtract(false)}
                                                    onDrop={(e) => {
                                                        e.preventDefault();
                                                        setIsDraggingExtract(false);
                                                        const f = e.dataTransfer.files?.[0];
                                                        if (f) setExtractFile(f);
                                                    }}
                                                    onClick={() => extractInputRef.current?.click()}
                                                    className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 flex-1 flex flex-col items-center justify-center min-h-[140px] ${
                                                        isDraggingExtract
                                                            ? "border-emerald-500 bg-emerald-500/10"
                                                            : "border-border/70 hover:border-emerald-500/50 hover:bg-muted/30"
                                                    }`}
                                                >
                                                    <UploadCloud className="w-8 h-8 text-emerald-600 mb-2" />
                                                    <p className="text-xs sm:text-sm font-semibold text-foreground">
                                                        Arrastra el Excel de Sofia Plus o{" "}
                                                        <span className="text-emerald-600 dark:text-emerald-400 underline decoration-dashed underline-offset-4">
                                                            examinar
                                                        </span>
                                                    </p>
                                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                                        Archivo .xlsx o .xls
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/5 min-h-[140px]">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                                            <FileSpreadsheet className="w-5 h-5" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-bold text-foreground truncate">
                                                                {extractFile.name}
                                                            </p>
                                                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                                                {formatFileSize(extractFile.size)} • Listo para extraer
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setExtractFile(null)}
                                                        className="h-8 text-xs text-muted-foreground hover:text-destructive"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            )}

                                            <Button
                                                type="button"
                                                onClick={() => handleExtractSubmit()}
                                                disabled={isLoading || !extractFile}
                                                className="w-full h-10 text-xs font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                                            >
                                                {isLoading ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <ArrowRight className="w-4 h-4" />
                                                )}
                                                <span>Extraer Resultados de Aprendizaje</span>
                                            </Button>
                                        </div>

                                        {/* Option B: Import JSON */}
                                        <div className="flex flex-col justify-between p-6 rounded-2xl bg-muted/20 border border-border/70 space-y-4">
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <h5 className="font-bold text-sm text-foreground flex items-center gap-2">
                                                        <FileJson className="w-4 h-4 text-blue-600" />
                                                        <span>Opción 2: Cargar Plantilla JSON</span>
                                                    </h5>
                                                    <Badge variant="outline" className="text-[10px] py-0 px-2 border-blue-500/30 text-blue-600">
                                                        Carga Rápida
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground leading-relaxed">
                                                    Abre y edita una distribución de periodos previamente guardada en formato <code>.json</code> para ajustarla.
                                                </p>
                                            </div>

                                            <label className="border-2 border-dashed border-border/70 rounded-2xl p-6 text-center cursor-pointer flex-1 flex flex-col items-center justify-center min-h-[140px] hover:border-blue-500/50 hover:bg-muted/30 transition-all">
                                                <input
                                                    type="file"
                                                    accept=".json"
                                                    onChange={(e) => {
                                                        const f = e.target.files?.[0];
                                                        if (f) handleImportConfig(f);
                                                    }}
                                                    disabled={isLoading}
                                                    className="hidden"
                                                />
                                                <FileJson className="w-8 h-8 text-blue-600 mb-2" />
                                                <p className="text-xs sm:text-sm font-semibold text-foreground">
                                                    Seleccionar o arrastrar plantilla{" "}
                                                    <span className="text-blue-600 dark:text-blue-400 underline decoration-dashed underline-offset-4">
                                                        .json
                                                    </span>
                                                </p>
                                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                                    Carga inmediata del organizador visual
                                                </p>
                                            </label>

                                            <div className="p-2.5 rounded-xl bg-muted/50 border border-border/50 text-[11px] text-muted-foreground text-center">
                                                Carga automáticamente todos los trimestres configurados
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    ) : (
                        <div className="w-full space-y-4">
                            <div className="flex items-center justify-between">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowBuilder(false)}
                                    className="h-8 text-xs text-muted-foreground hover:text-foreground rounded-lg"
                                >
                                    ← Volver a opciones de carga
                                </Button>
                                <Badge variant="secondary" className="text-xs font-semibold">
                                    {outcomes.length} RA en el organizador
                                </Badge>
                            </div>
                            <SofiaTimelineBuilder
                                initialOutcomes={outcomes}
                                importedConfig={importedConfig}
                            />
                        </div>
                    )}
                </TabsContent>

                {/* ── TAB 3: ANALÍTICA DE JUICIOS ── */}
                {activeReport?.result?.data && (
                    <TabsContent value="analytics" className="space-y-4 mt-0">
                        {processedReports.length > 1 && (
                            <div className="w-full bg-card border border-border/80 rounded-2xl p-3 shadow-xs flex items-center justify-between gap-3 flex-wrap">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                        <BarChart3 className="w-4 h-4 text-primary" />
                                        <span>Analítica de la Ficha:</span>
                                    </span>
                                    <div className="flex items-center gap-1 flex-wrap">
                                        {processedReports.map((item) => {
                                            const isSelected = item.id === activeReport.id;
                                            return (
                                                <button
                                                    key={`ana-${item.id}`}
                                                    type="button"
                                                    onClick={() => setSelectedReportId(item.id)}
                                                    className={cn(
                                                        "px-2.5 py-1 rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer border",
                                                        isSelected
                                                            ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                                                            : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60"
                                                    )}
                                                >
                                                    <span className="font-mono font-bold">Ficha {item.ficha}</span>
                                                    <span className="text-[10px] opacity-80 font-mono">
                                                        ({item.totalApprentices} apr.)
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                <Badge variant="outline" className="text-[11px] font-mono">
                                    {activeReport.fileName}
                                </Badge>
                            </div>
                        )}
                        <SofiaReportAnalytics key={`analytics-${activeReport.id}`} data={activeReport.result.data!} />
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
}
