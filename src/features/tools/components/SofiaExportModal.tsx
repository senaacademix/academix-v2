"use client";

import React, { useState, useEffect } from "react";
import {
    FileSpreadsheet,
    FileText,
    Globe,
    Filter,
    RotateCcw,
    Loader2,
    SlidersHorizontal,
    Building2,
    GraduationCap,
    Hash,
    User,
    Calendar,
    MapPin,
    Sparkles,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SofiaReportData, CorporateExportCustomHeader } from "../types/sofiaReportTypes";
import { formatCalendarDate } from "@/lib/dateUtils";

interface SofiaExportModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    format: "excel" | "pdf";
    onFormatChange: (format: "excel" | "pdf") => void;
    data: SofiaReportData;
    totalApprentices: number;
    filteredApprentices: number;
    hasActiveFilters: boolean;
    periodLabel: string;
    onExport: (options: {
        format: "excel" | "pdf";
        scope: "all" | "filtered";
        customHeader: CorporateExportCustomHeader;
    }) => Promise<void>;
    isExporting: boolean;
}

export const SofiaExportModal: React.FC<SofiaExportModalProps> = ({
    open,
    onOpenChange,
    format,
    onFormatChange,
    data,
    totalApprentices,
    filteredApprentices,
    hasActiveFilters,
    periodLabel,
    onExport,
    isExporting,
}) => {
    // Determine default scope: if filters or period slice active, default to "filtered", else "all"
    const [scope, setScope] = useState<"all" | "filtered">("all");

    // Header customization fields
    const defaultTitle = format === "excel"
        ? "ACADEMIX • REPORTE DE JUICIOS EVALUATIVOS SOFIA PLUS"
        : "REPORTE CONSOLIDADO DE JUICIOS EVALUATIVOS (SOFIA PLUS)";
    const defaultFicha = data.ficha || "";
    const defaultProgram = data.reportDetails?.programName || "";
    const defaultCenter = data.reportDetails?.center || "";
    const defaultRegional = data.reportDetails?.regional || "";
    const defaultDate = formatCalendarDate(new Date(), "dd 'de' MMMM, yyyy");

    const [title, setTitle] = useState(defaultTitle);
    const [ficha, setFicha] = useState(defaultFicha);
    const [programName, setProgramName] = useState(defaultProgram);
    const [center, setCenter] = useState(defaultCenter);
    const [regional, setRegional] = useState(defaultRegional);
    const [instructor, setInstructor] = useState("");
    const [dateStr, setDateStr] = useState(defaultDate);

    // Sync state when modal opens
    useEffect(() => {
        if (open) {
            setScope(hasActiveFilters ? "filtered" : "all");
            setTitle(
                format === "excel"
                    ? "ACADEMIX • REPORTE DE JUICIOS EVALUATIVOS SOFIA PLUS"
                    : "REPORTE CONSOLIDADO DE JUICIOS EVALUATIVOS (SOFIA PLUS)"
            );
            setFicha(data.ficha || "");
            setProgramName(data.reportDetails?.programName || "");
            setCenter(data.reportDetails?.center || "");
            setRegional(data.reportDetails?.regional || "");
            setDateStr(formatCalendarDate(new Date(), "dd 'de' MMMM, yyyy"));
        }
    }, [open, format, hasActiveFilters, data]);

    const handleResetDefaults = () => {
        setTitle(
            format === "excel"
                ? "ACADEMIX • REPORTE DE JUICIOS EVALUATIVOS SOFIA PLUS"
                : "REPORTE CONSOLIDADO DE JUICIOS EVALUATIVOS (SOFIA PLUS)"
        );
        setFicha(data.ficha || "");
        setProgramName(data.reportDetails?.programName || "");
        setCenter(data.reportDetails?.center || "");
        setRegional(data.reportDetails?.regional || "");
        setInstructor("");
        setDateStr(formatCalendarDate(new Date(), "dd 'de' MMMM, yyyy"));
    };

    const handleConfirmExport = async () => {
        await onExport({
            format,
            scope,
            customHeader: {
                title: title.trim() || defaultTitle,
                ficha: ficha.trim() || defaultFicha,
                programName: programName.trim() || defaultProgram,
                center: center.trim() || defaultCenter,
                regional: regional.trim() || defaultRegional,
                instructor: instructor.trim(),
                date: dateStr.trim() || defaultDate,
            },
        });
    };

    const isExcel = format === "excel";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden rounded-2xl border border-border/80 shadow-2xl">
                {/* Header with Format Switcher */}
                <DialogHeader className="p-5 pb-4 border-b border-border/60 bg-muted/20">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div
                                className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-xs transition-colors",
                                    isExcel
                                        ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                                        : "bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400"
                                )}
                            >
                                {isExcel ? (
                                    <FileSpreadsheet className="w-5 h-5" />
                                ) : (
                                    <FileText className="w-5 h-5" />
                                )}
                            </div>
                            <div>
                                <DialogTitle className="text-base font-bold text-foreground">
                                    Exportar Reporte ({isExcel ? "Excel Corporativo" : "PDF Institucional"})
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                    Personaliza el encabezado institucional y elige el alcance de los datos.
                                </DialogDescription>
                            </div>
                        </div>

                        {/* Format Switch Pills */}
                        <div className="flex items-center p-1 bg-muted/60 dark:bg-muted/40 rounded-xl border border-border/60 self-stretch sm:self-auto justify-center">
                            <button
                                type="button"
                                onClick={() => onFormatChange("excel")}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                                    isExcel
                                        ? "bg-emerald-600 text-white shadow-xs"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <FileSpreadsheet className="w-3.5 h-3.5" />
                                <span>Excel</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => onFormatChange("pdf")}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                                    !isExcel
                                        ? "bg-rose-600 text-white shadow-xs"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <FileText className="w-3.5 h-3.5" />
                                <span>PDF</span>
                            </button>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
                    {/* ── SECCIÓN 1: ALCANCE DE LA EXPORTACIÓN ── */}
                    <div className="space-y-2.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-primary" />
                            <span>1. Alcance de los Datos</span>
                        </Label>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Opción 1: Toda la información */}
                            <div
                                onClick={() => setScope("all")}
                                className={cn(
                                    "p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-2 text-left relative",
                                    scope === "all"
                                        ? isExcel
                                            ? "border-emerald-600 bg-emerald-500/5 dark:bg-emerald-950/20 shadow-xs"
                                            : "border-rose-600 bg-rose-500/5 dark:bg-rose-950/20 shadow-xs"
                                        : "border-border/60 hover:border-border bg-card"
                                )}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className={cn(
                                                "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                                                scope === "all"
                                                    ? isExcel
                                                        ? "bg-emerald-500/20 text-emerald-600"
                                                        : "bg-rose-500/20 text-rose-600"
                                                    : "bg-muted text-muted-foreground"
                                            )}
                                        >
                                            <Globe className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-foreground">
                                                Toda la Información
                                            </p>
                                            <p className="text-[10.5px] text-muted-foreground">
                                                Matriz completa sin filtros
                                            </p>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="text-[9.5px] font-mono shrink-0">
                                        {totalApprentices} aprendices
                                    </Badge>
                                </div>
                                <p className="text-[11px] text-muted-foreground leading-snug">
                                    Exporta todos los aprendices y todos los trimestres/RA de la ficha formativa.
                                </p>
                            </div>

                            {/* Opción 2: Filtro actual */}
                            <div
                                onClick={() => setScope("filtered")}
                                className={cn(
                                    "p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-2 text-left relative",
                                    scope === "filtered"
                                        ? isExcel
                                            ? "border-emerald-600 bg-emerald-500/5 dark:bg-emerald-950/20 shadow-xs"
                                            : "border-rose-600 bg-rose-500/5 dark:bg-rose-950/20 shadow-xs"
                                        : "border-border/60 hover:border-border bg-card"
                                )}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className={cn(
                                                "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                                                scope === "filtered"
                                                    ? isExcel
                                                        ? "bg-emerald-500/20 text-emerald-600"
                                                        : "bg-rose-500/20 text-rose-600"
                                                    : "bg-muted text-muted-foreground"
                                            )}
                                        >
                                            <Filter className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-foreground">
                                                Filtro Actual
                                            </p>
                                            <p className="text-[10.5px] text-muted-foreground truncate max-w-[130px]">
                                                {periodLabel}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                            "text-[9.5px] font-mono shrink-0",
                                            hasActiveFilters
                                                ? isExcel
                                                    ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/10"
                                                    : "border-rose-500/40 text-rose-600 bg-rose-500/10"
                                                : ""
                                        )}
                                    >
                                        {filteredApprentices} aprendices
                                    </Badge>
                                </div>
                                <p className="text-[11px] text-muted-foreground leading-snug">
                                    Exporta únicamente los aprendices filtrados y el periodo/RA visible actualmente.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ── SECCIÓN 2: PERSONALIZACIÓN DEL ENCABEZADO ── */}
                    <div className="space-y-3 pt-2 border-t border-border/50">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
                                <span>2. Personalizar Encabezado (Membrete)</span>
                            </Label>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleResetDefaults}
                                className="h-6 text-[11px] text-muted-foreground hover:text-foreground gap-1 px-2"
                                title="Restablecer metadatos originales de Sofia Plus"
                            >
                                <RotateCcw className="w-3 h-3" />
                                <span>Restablecer</span>
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            {/* Título del Reporte */}
                            <div className="sm:col-span-2 space-y-1">
                                <Label htmlFor="exp-title" className="text-xs font-medium text-foreground flex items-center gap-1">
                                    <span>Título del Reporte</span>
                                </Label>
                                <Input
                                    id="exp-title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="h-8 text-xs rounded-lg"
                                    placeholder="Título principal del documento..."
                                />
                            </div>

                            {/* Ficha */}
                            <div className="space-y-1">
                                <Label htmlFor="exp-ficha" className="text-xs font-medium text-foreground flex items-center gap-1">
                                    <Hash className="w-3 h-3 text-muted-foreground" />
                                    <span>Ficha de Formación</span>
                                </Label>
                                <Input
                                    id="exp-ficha"
                                    value={ficha}
                                    onChange={(e) => setFicha(e.target.value)}
                                    className="h-8 text-xs rounded-lg font-mono"
                                    placeholder="Ej: 2670123"
                                />
                            </div>

                            {/* Fecha de Emisión */}
                            <div className="space-y-1">
                                <Label htmlFor="exp-date" className="text-xs font-medium text-foreground flex items-center gap-1">
                                    <Calendar className="w-3 h-3 text-muted-foreground" />
                                    <span>Fecha de Emisión</span>
                                </Label>
                                <Input
                                    id="exp-date"
                                    value={dateStr}
                                    onChange={(e) => setDateStr(e.target.value)}
                                    className="h-8 text-xs rounded-lg"
                                    placeholder="Fecha del reporte..."
                                />
                            </div>

                            {/* Programa de Formación */}
                            <div className="sm:col-span-2 space-y-1">
                                <Label htmlFor="exp-program" className="text-xs font-medium text-foreground flex items-center gap-1">
                                    <GraduationCap className="w-3 h-3 text-muted-foreground" />
                                    <span>Programa de Formación</span>
                                </Label>
                                <Input
                                    id="exp-program"
                                    value={programName}
                                    onChange={(e) => setProgramName(e.target.value)}
                                    className="h-8 text-xs rounded-lg"
                                    placeholder="Nombre oficial del programa formativo..."
                                />
                            </div>

                            {/* Centro de Formación */}
                            <div className="space-y-1">
                                <Label htmlFor="exp-center" className="text-xs font-medium text-foreground flex items-center gap-1">
                                    <Building2 className="w-3 h-3 text-muted-foreground" />
                                    <span>Centro de Formación</span>
                                </Label>
                                <Input
                                    id="exp-center"
                                    value={center}
                                    onChange={(e) => setCenter(e.target.value)}
                                    className="h-8 text-xs rounded-lg"
                                    placeholder="Centro formativo SENA..."
                                />
                            </div>

                            {/* Regional */}
                            <div className="space-y-1">
                                <Label htmlFor="exp-regional" className="text-xs font-medium text-foreground flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-muted-foreground" />
                                    <span>Regional</span>
                                </Label>
                                <Input
                                    id="exp-regional"
                                    value={regional}
                                    onChange={(e) => setRegional(e.target.value)}
                                    className="h-8 text-xs rounded-lg"
                                    placeholder="Ej: Regional Antioquia"
                                />
                            </div>

                            {/* Instructor / Responsable */}
                            <div className="sm:col-span-2 space-y-1">
                                <Label htmlFor="exp-instructor" className="text-xs font-medium text-foreground flex items-center gap-1">
                                    <User className="w-3 h-3 text-muted-foreground" />
                                    <span>Instructor / Coordinador / Responsable (Opcional)</span>
                                </Label>
                                <Input
                                    id="exp-instructor"
                                    value={instructor}
                                    onChange={(e) => setInstructor(e.target.value)}
                                    className="h-8 text-xs rounded-lg"
                                    placeholder="Ej: Ing. Juan Pérez • Instructor Técnico"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <DialogFooter className="p-4 border-t border-border/60 bg-muted/20 flex flex-row items-center justify-between sm:justify-between">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenChange(false)}
                        disabled={isExporting}
                        className="h-8 text-xs rounded-xl"
                    >
                        Cancelar
                    </Button>

                    <Button
                        type="button"
                        onClick={handleConfirmExport}
                        disabled={isExporting}
                        className={cn(
                            "h-9 px-4 text-xs font-bold gap-2 text-white rounded-xl shadow-xs transition-all cursor-pointer",
                            isExcel
                                ? "bg-emerald-600 hover:bg-emerald-700"
                                : "bg-rose-600 hover:bg-rose-700"
                        )}
                    >
                        {isExporting ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Generando {isExcel ? "Excel..." : "PDF..."}</span>
                            </>
                        ) : (
                            <>
                                {isExcel ? (
                                    <FileSpreadsheet className="w-3.5 h-3.5" />
                                ) : (
                                    <FileText className="w-3.5 h-3.5" />
                                )}
                                <span>
                                    Descargar {isExcel ? "Excel (.xlsx)" : "PDF (.pdf)"}
                                    {scope === "filtered" ? " (Filtrado)" : " (Completo)"}
                                </span>
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
