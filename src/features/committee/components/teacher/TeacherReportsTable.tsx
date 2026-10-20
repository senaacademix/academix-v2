"use client";

import React, { useState, useMemo } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
    Search,
    ExternalLink,
    Eye,
    Edit2,
    Trash2,
    AlertCircle,
    CheckCircle2,
    FileText,
    Lock,
    Clock,
    Ban,
    AlertTriangle,
    Scale,
    X,
    RefreshCw,
    GraduationCap,
    FileSpreadsheet
} from "lucide-react";
import { toast } from "sonner";
import { CommitteeReportDTO, TrainingAreaGroupDTO, FAULT_TYPE_CONFIG, formatFaultTypeLabel } from "../../types";
import { formatSafeDate, checkProcessDiligenceWindow } from "../../utils/dateUtils";
import { ProcessReportDetailModal } from "../gestor/ProcessReportDetailModal";
import { StudentAcademicRecordModal } from "../common/StudentAcademicRecordModal";
import {
    exportCommitteeReportsToExcel,
    generateAndDownloadCommitteePdf
} from "../../utils/committeeExportUtils";

interface TeacherReportsTableProps {
    reports: CommitteeReportDTO[];
    isLoading: boolean;
    onEditReport: (report: CommitteeReportDTO) => void;
    onDeleteReport: (reportId: string) => Promise<void>;
    groups?: TrainingAreaGroupDTO[];
}

export function TeacherReportsTable({
    reports,
    isLoading,
    onEditReport,
    onDeleteReport,
    groups = []
}: TeacherReportsTableProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedGroupFilter, setSelectedGroupFilter] = useState("all");
    const [selectedReport, setSelectedReport] = useState<CommitteeReportDTO | null>(null);
    const [academicRecordStudent, setAcademicRecordStudent] = useState<CommitteeReportDTO | null>(null);
    const [reportToDelete, setReportToDelete] = useState<CommitteeReportDTO | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isExportingExcel, setIsExportingExcel] = useState(false);
    const [isExportingPdf, setIsExportingPdf] = useState(false);

    // Helper to normalize accents and spaces for search
    const normalizeSearch = (str: string) =>
        (str || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();

    // Helper to check if a committee decision is still pending
    const isDecisionPending = (decision?: string | null) => {
        if (!decision) return true;
        const clean = decision.trim().toLowerCase();
        return clean === "" || clean === "pending" || clean === "pendiente";
    };

    // Fichas disponibles para el filtro (solo estado lectivo)
    const availableFichas = useMemo(() => {
        const map = new Map<string, { value: string; label: string }>();
        if (groups && groups.length > 0) {
            for (const g of groups) {
                if (!g.categoria || g.categoria.toUpperCase() === "LECTIVA") {
                    map.set(g.id, {
                        value: g.id,
                        label: `${g.name} (${g.studentsCount ?? 0} apr.)`
                    });
                }
            }
        }
        for (const r of reports) {
            if (r.groupId && !map.has(r.groupId)) {
                map.set(r.groupId, {
                    value: r.groupId,
                    label: r.groupName
                });
            } else if (!r.groupId && r.groupName && !map.has(r.groupName)) {
                map.set(r.groupName, {
                    value: r.groupName,
                    label: r.groupName
                });
            }
        }
        return Array.from(map.values());
    }, [reports, groups]);

    const filteredReports = useMemo(() => {
        let result = reports;
        if (selectedGroupFilter !== "all") {
            result = result.filter(
                (r) => r.groupId === selectedGroupFilter || r.groupName === selectedGroupFilter
            );
        }
        if (searchTerm.trim()) {
            const term = normalizeSearch(searchTerm);
            result = result.filter(
                (r) =>
                    normalizeSearch(r.studentName).includes(term) ||
                    (r.studentDocument && normalizeSearch(r.studentDocument).includes(term)) ||
                    (r.studentEmail && normalizeSearch(r.studentEmail).includes(term)) ||
                    normalizeSearch(r.groupName).includes(term) ||
                    normalizeSearch(r.processTitle).includes(term) ||
                    normalizeSearch(r.reason).includes(term)
            );
        }
        return result;
    }, [reports, searchTerm, selectedGroupFilter]);

    const renderMobileTeacherCard = (report: CommitteeReportDTO, idx: number) => {
        const faultInfo = FAULT_TYPE_CONFIG[report.faultType] || {
            label: report.faultType,
            badgeClass: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/25",
            icon: "📋"
        };
        const faultLabel = formatFaultTypeLabel(report.faultType, report.customFaultType);

        const diligence = checkProcessDiligenceWindow({
            status: report.processStatus,
            startDate: report.processStartDate,
            endDate: report.processEndDate
        });
        const canEdit = diligence.canEdit;
        const isPending = isDecisionPending(report.committeeDecision);
        const canTeacherModify = canEdit && isPending;

        return (
            <div key={report.id} className="p-3.5 space-y-3 bg-card hover:bg-muted/20 transition-colors">
                {/* Header: Avatar, Name, Doc, Causal */}
                <div className="flex items-start gap-2.5">
                    <Avatar className="w-9 h-9 border border-border/80 shrink-0">
                        <AvatarImage src={report.studentImage || undefined} />
                        <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                            {report.studentName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="text-xs font-bold text-foreground leading-snug">
                            {report.studentName}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                            Doc: {report.studentDocument || "Sin doc"}
                            {report.studentEmail && ` • ${report.studentEmail}`}
                        </p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] py-0 px-2 border font-medium shrink-0 ${faultInfo.badgeClass}`}>
                        {faultInfo.icon ? `${faultInfo.icon} ` : ""}{faultLabel}
                    </Badge>
                </div>

                {/* Details Grid: Ficha, Horario, Inasistencias, Diligenciamiento */}
                <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 text-xs space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground text-[11px] font-medium">Ficha:</span>
                        <span className="font-semibold text-foreground text-right text-xs truncate max-w-[200px]">
                            {report.groupName}
                        </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground text-[11px] font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3 text-primary/70 shrink-0" />
                            Horario Ficha:
                        </span>
                        {report.groupSchedule ? (
                            <span className="inline-flex items-center text-[10px] text-foreground font-mono bg-background px-1.5 py-0.5 rounded border border-border/40 truncate max-w-[200px]" title={report.groupSchedule}>
                                {report.groupSchedule}
                            </span>
                        ) : (
                            <span className="text-[10px] text-muted-foreground/60 italic">Sin horario</span>
                        )}
                    </div>

                    <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground text-[11px] font-medium">Diligenciamiento:</span>
                        {canEdit ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Abierto
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground font-medium" title={diligence.message}>
                                <Lock className="w-3 h-3 text-muted-foreground/70" />
                                Cerrado (Solo lectura)
                            </span>
                        )}
                    </div>

                    {(report.absenceDays ?? report.absenceHours ?? 0) > 0 && (
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground text-[11px] font-medium">Inasistencias:</span>
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 border bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 font-mono">
                                {report.absenceDays ?? report.absenceHours} {(report.absenceDays ?? report.absenceHours) === 1 ? "día inasist." : "días inasist."}
                            </Badge>
                        </div>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40 text-[11px]">
                        <span className="text-muted-foreground">Solución Comité:</span>
                        <div>{renderTeacherDecisionBadge(report.committeeDecision)}</div>
                    </div>
                </div>

                {/* Actions Bar */}
                <div className="flex items-center justify-between gap-2 pt-0.5">
                    {report.evidenceUrl ? (
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(report.evidenceUrl!, "_blank", "noopener,noreferrer")}
                            className="h-8 px-2 text-xs text-blue-600 dark:text-blue-400 gap-1 rounded-lg"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Evidencias</span>
                        </Button>
                    ) : (
                        <span className="text-[11px] text-muted-foreground/60 italic">Sin evidencias</span>
                    )}

                    <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setAcademicRecordStudent(report)}
                            className="h-8 px-2.5 text-xs rounded-lg gap-1 border-primary/30 text-primary hover:bg-primary/10"
                            title="Ver registro académico"
                        >
                            <GraduationCap className="w-3.5 h-3.5" />
                            <span>Académico</span>
                        </Button>

                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedReport(report)}
                            className="h-8 px-2.5 text-xs rounded-lg gap-1"
                        >
                            <Eye className="w-3.5 h-3.5 text-primary" />
                            <span>Detalle</span>
                        </Button>

                        {canTeacherModify ? (
                            <>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onEditReport(report)}
                                    className="h-8 px-2.5 text-xs rounded-lg gap-1 hover:border-amber-500/40"
                                >
                                    <Edit2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                    <span>Editar</span>
                                </Button>

                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setReportToDelete(report)}
                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                                    title="Eliminar reporte"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                            </>
                        ) : !isPending ? (
                            <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/25 gap-1 py-1" title="El caso ya fue resuelto por el Comité de Evaluación">
                                <Lock className="w-3 h-3" />
                                <span>Resuelto</span>
                            </Badge>
                        ) : null}
                    </div>
                </div>
            </div>
        );
    };

    const handleExportExcel = async () => {
        if (filteredReports.length === 0) {
            toast.error("No hay reportes para exportar con los filtros actuales.");
            return;
        }
        try {
            setIsExportingExcel(true);
            const fichaObj = availableFichas.find((f) => f.value === selectedGroupFilter);
            await exportCommitteeReportsToExcel(filteredReports, {
                title: "Reporte_Docente_Comite_Evaluacion",
                processTitle: filteredReports[0]?.processTitle || "Comité de Evaluación",
                groupBy: "none",
                filters: {
                    fichaLabel: fichaObj ? fichaObj.label : selectedGroupFilter === "all" ? "Todas las fichas" : selectedGroupFilter,
                    searchTerm: searchTerm.trim() || undefined
                }
            });
            toast.success("Reporte exportado a Excel.");
        } catch (err: any) {
            console.error(err);
            toast.error("Error al exportar a Excel.");
        } finally {
            setIsExportingExcel(false);
        }
    };

    const handleExportPdf = async () => {
        if (filteredReports.length === 0) {
            toast.error("No hay reportes para exportar con los filtros actuales.");
            return;
        }
        try {
            setIsExportingPdf(true);
            toast.info("Generando PDF corporativo...");
            const fichaObj = availableFichas.find((f) => f.value === selectedGroupFilter);
            await generateAndDownloadCommitteePdf(filteredReports, {
                title: "Reporte_Docente_Comite_Evaluacion",
                processTitle: filteredReports[0]?.processTitle || "Comité de Evaluación",
                groupBy: "none",
                filters: {
                    fichaLabel: fichaObj ? fichaObj.label : selectedGroupFilter === "all" ? "Todas las fichas" : selectedGroupFilter,
                    searchTerm: searchTerm.trim() || undefined
                }
            });
            toast.success("PDF corporativo generado con éxito.");
        } catch (err: any) {
            console.error(err);
            toast.error("Error al generar el PDF.");
        } finally {
            setIsExportingPdf(false);
        }
    };

    return (
        <div className="space-y-3.5">
            {/* Filter / Search Bar con Filtro de Ficha al frente */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border/80 shadow-2xs">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
                    {/* Filtro por Ficha al frente */}
                    <div className="w-full sm:w-56 shrink-0">
                        <Select value={selectedGroupFilter} onValueChange={setSelectedGroupFilter}>
                            <SelectTrigger className="h-9 text-xs rounded-xl bg-background border-border/80 font-medium">
                                <SelectValue placeholder="Todas las fichas" />
                            </SelectTrigger>
                            <SelectContent className="max-h-56">
                                <SelectItem value="all" className="text-xs">
                                    Todas las Fichas ({availableFichas.length})
                                </SelectItem>
                                {availableFichas.map((f) => (
                                    <SelectItem key={f.value} value={f.value} className="text-xs">
                                        {f.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Barra de Búsqueda */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <Input
                            placeholder="Buscar por aprendiz, cédula o motivo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-8 h-9 text-xs rounded-xl"
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground text-xs p-1 rounded-md"
                                title="Limpiar búsqueda"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 flex-wrap">
                    <span className="text-xs text-muted-foreground font-medium hidden md:inline">
                        Has reportado <strong className="text-foreground">{filteredReports.length}</strong> {filteredReports.length === 1 ? "aprendiz" : "aprendices"}
                    </span>

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleExportExcel}
                        disabled={isExportingExcel}
                        className="h-9 px-2.5 text-xs rounded-xl gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-medium"
                        title="Exportar reportes a Excel"
                    >
                        <FileSpreadsheet className={`w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 ${isExportingExcel ? "animate-spin" : ""}`} />
                        <span>{isExportingExcel ? "Excel..." : "Excel"}</span>
                    </Button>

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleExportPdf}
                        disabled={isExportingPdf}
                        className="h-9 px-2.5 text-xs rounded-xl gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30 font-medium"
                        title="Exportar reportes a PDF corporativo (@react-pdf/renderer)"
                    >
                        <FileText className={`w-3.5 h-3.5 text-rose-600 dark:text-rose-400 ${isExportingPdf ? "animate-spin" : ""}`} />
                        <span>{isExportingPdf ? "PDF..." : "PDF"}</span>
                    </Button>
                </div>
            </div>

            {/* Table & Mobile Cards */}
            <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs">
                {/* Desktop / Tablet Table */}
                <div className="hidden md:block overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="w-12 text-center text-xs font-bold">#</TableHead>
                                <TableHead className="text-xs font-bold">Aprendiz</TableHead>
                                <TableHead className="text-xs font-bold">Ficha / Horario</TableHead>
                                <TableHead className="text-xs font-bold">Proceso de Comité</TableHead>
                                <TableHead className="text-xs font-bold">Causal</TableHead>
                                <TableHead className="text-xs font-bold min-w-[140px]">Solución Comité</TableHead>
                                <TableHead className="text-xs font-bold text-center">Evidencias</TableHead>
                                <TableHead className="text-xs font-bold text-right pr-4">Gestión</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-32 text-center text-xs text-muted-foreground">
                                        Cargando reportes...
                                    </TableCell>
                                </TableRow>
                            ) : filteredReports.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-36 text-center">
                                        <div className="flex flex-col items-center justify-center gap-1.5 text-muted-foreground text-xs">
                                            <AlertCircle className="w-6 h-6 text-muted-foreground/60" />
                                            <span className="font-semibold text-foreground">
                                                No has reportado aprendices
                                            </span>
                                            <span className="text-[11px]">
                                                {searchTerm
                                                    ? "No se encontraron reportes con ese criterio de búsqueda."
                                                    : "Haz clic en «Reportar Aprendiz» para registrar un caso con sus evidencias."}
                                            </span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredReports.map((report, idx) => {
                                    const faultInfo = FAULT_TYPE_CONFIG[report.faultType] || {
                                        label: report.faultType,
                                        badgeClass: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/25",
                                        icon: "📋"
                                    };
                                    const faultLabel = formatFaultTypeLabel(report.faultType, report.customFaultType);

                                    const diligence = checkProcessDiligenceWindow({
                                        status: report.processStatus,
                                        startDate: report.processStartDate,
                                        endDate: report.processEndDate
                                    });
                                    const canEdit = diligence.canEdit;
                                    const isPending = isDecisionPending(report.committeeDecision);
                                    const canTeacherModify = canEdit && isPending;

                                    return (
                                        <TableRow key={report.id} className="hover:bg-muted/40 transition-colors">
                                            <TableCell className="text-center font-mono text-xs text-muted-foreground">
                                                {idx + 1}
                                            </TableCell>

                                            {/* Learner Info */}
                                            <TableCell>
                                                <div className="flex items-center gap-2.5">
                                                    <Avatar className="w-8 h-8 border border-border/80">
                                                        <AvatarImage src={report.studentImage || undefined} />
                                                        <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                                                            {report.studentName.slice(0, 2).toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="space-y-0.5">
                                                        <p className="text-xs font-bold text-foreground leading-snug">
                                                            {report.studentName}
                                                        </p>
                                                        <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-muted-foreground font-mono">
                                                            <span>Doc: {report.studentDocument || "Sin doc"}</span>
                                                            {report.studentEmail && (
                                                                <span className="text-primary/80 font-sans">
                                                                    • {report.studentEmail}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>

                                            {/* Ficha / Horario */}
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <span className="text-xs font-semibold text-foreground/90 block">
                                                        {report.groupName}
                                                    </span>
                                                    {report.groupSchedule ? (
                                                        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground font-mono bg-muted/60 px-1.5 py-0.5 rounded-md border border-border/40">
                                                            <Clock className="w-2.5 h-2.5 text-primary/70 shrink-0" />
                                                            <span className="truncate max-w-[200px]" title={report.groupSchedule}>
                                                                {report.groupSchedule}
                                                            </span>
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] text-muted-foreground/50 italic block">
                                                            Sin horario asignado
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>

                                            {/* Process with diligence indicator */}
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <p className="text-xs font-medium text-foreground line-clamp-1 max-w-[200px]" title={report.processTitle}>
                                                        {report.processTitle}
                                                    </p>
                                                    {canEdit ? (
                                                        <div className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                            <span>Diligenciamiento abierto</span>
                                                        </div>
                                                    ) : (
                                                        <div className="inline-flex items-center gap-1 text-[10px] text-muted-foreground font-medium" title={diligence.message}>
                                                            <Lock className="w-3 h-3 text-muted-foreground/70" />
                                                            <span>Solo lectura</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>

                                            {/* Fault Type & Absence */}
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1 flex-wrap">
                                                        <Badge variant="outline" className={`text-[10px] py-0 px-2 border font-medium ${faultInfo.badgeClass}`}>
                                                            {faultInfo.icon ? `${faultInfo.icon} ` : ""}{faultLabel}
                                                        </Badge>
                                                        {(report.absenceDays ?? report.absenceHours ?? 0) > 0 && (
                                                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 border bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 font-mono">
                                                                {report.absenceDays ?? report.absenceHours} {(report.absenceDays ?? report.absenceHours) === 1 ? "día inasist." : "días inasist."}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>

                                            {/* Solución Comité (Solo lectura para instructor) */}
                                            <TableCell>
                                                {renderTeacherDecisionBadge(report.committeeDecision)}
                                            </TableCell>

                                            {/* Evidence Link */}
                                            <TableCell className="text-center">
                                                {report.evidenceUrl ? (
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => window.open(report.evidenceUrl!, "_blank", "noopener,noreferrer")}
                                                        className="h-7 px-2 text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-500/10 gap-1 rounded-md"
                                                        title={report.evidenceUrl}
                                                    >
                                                        <ExternalLink className="w-3 h-3" />
                                                        <span>Ver</span>
                                                    </Button>
                                                ) : (
                                                    <span className="text-[11px] text-muted-foreground/50 italic">—</span>
                                                )}
                                            </TableCell>

                                            {/* Actions (View, Edit, Delete) */}
                                            <TableCell className="text-right pr-4">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => setAcademicRecordStudent(report)}
                                                        className="h-7 w-7 p-0 text-primary hover:text-primary/80 hover:bg-primary/10 rounded-lg"
                                                        title="Ver registro académico del aprendiz"
                                                    >
                                                        <GraduationCap className="w-4 h-4" />
                                                    </Button>

                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => setSelectedReport(report)}
                                                        className="h-7 w-7 p-0 text-muted-foreground hover:text-primary rounded-lg"
                                                        title="Ver detalles completos del reporte"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </Button>

                                                    {canTeacherModify ? (
                                                        <>
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => onEditReport(report)}
                                                                className="h-7 w-7 p-0 text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10 rounded-lg"
                                                                title="Editar reporte"
                                                            >
                                                                <Edit2 className="w-3.5 h-3.5" />
                                                            </Button>

                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => setReportToDelete(report)}
                                                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                                                                title="Eliminar reporte"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </>
                                                    ) : !isPending ? (
                                                        <span
                                                            className="inline-flex items-center justify-center h-7 px-2 text-[10px] text-purple-700 dark:text-purple-300 font-semibold rounded-lg bg-purple-500/10 border border-purple-500/25 gap-1 cursor-default select-none"
                                                            title={`Decisión oficial: ${report.committeeDecision}. El caso ya fue resuelto por el Comité de Evaluación y no puede ser modificado ni eliminado.`}
                                                        >
                                                            <Lock className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                                                            <span className="hidden xl:inline">Resuelto</span>
                                                        </span>
                                                    ) : (
                                                        <span
                                                            className="inline-flex items-center justify-center h-7 px-2 text-[10px] text-muted-foreground font-medium rounded-lg bg-muted/60 border border-border/60 gap-1 cursor-default select-none"
                                                            title={diligence.message}
                                                        >
                                                            <Lock className="w-3 h-3 text-muted-foreground/70" />
                                                            <span className="hidden xl:inline">Solo lectura</span>
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Mobile Cards View */}
                <div className="block md:hidden">
                    {isLoading ? (
                        <div className="p-8 text-center text-xs text-muted-foreground">
                            Cargando reportes...
                        </div>
                    ) : filteredReports.length === 0 ? (
                        <div className="p-8 text-center space-y-1.5">
                            <AlertCircle className="w-6 h-6 text-muted-foreground/60 mx-auto" />
                            <p className="text-xs font-semibold text-foreground">No has reportado aprendices</p>
                            <p className="text-[11px] text-muted-foreground">
                                {searchTerm
                                    ? "No se encontraron reportes con ese criterio."
                                    : "Usa «Reportar Aprendiz» para registrar un caso."}
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border/60">
                            {filteredReports.map((report, idx) => renderMobileTeacherCard(report, idx))}
                        </div>
                    )}
                </div>
            </div>

            {/* Detail Modal - Instructor can only view */}
            <ProcessReportDetailModal
                report={selectedReport}
                isOpen={!!selectedReport}
                onClose={() => setSelectedReport(null)}
                readOnlyDecision={true}
            />

            {/* Academic Record Modal */}
            <StudentAcademicRecordModal
                isOpen={!!academicRecordStudent}
                onClose={() => setAcademicRecordStudent(null)}
                student={academicRecordStudent}
            />

            {/* Modal de Confirmación Temático y Elegante para Eliminar */}
            <AlertDialog open={Boolean(reportToDelete)} onOpenChange={(open) => !open && setReportToDelete(null)}>
                <AlertDialogContent className="border-border/80 rounded-2xl sm:rounded-3xl shadow-2xl p-5 sm:p-6 max-w-md w-[95vw]">
                    <AlertDialogHeader className="space-y-2 text-left">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-destructive/15 text-destructive border border-destructive/25 flex items-center justify-center shrink-0">
                                <Trash2 className="w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                                <AlertDialogTitle className="text-base font-bold text-foreground">
                                    ¿Eliminar reporte de comité?
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-xs text-muted-foreground">
                                    Esta acción eliminará el reporte del proceso. Los hechos y evidencias registradas serán removidos.
                                </AlertDialogDescription>
                            </div>
                        </div>
                    </AlertDialogHeader>

                    {reportToDelete && (
                        <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 text-xs space-y-1.5 my-2">
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground text-[11px]">Aprendiz:</span>
                                <strong className="text-foreground text-xs">{reportToDelete.studentName}</strong>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground text-[11px]">Ficha:</span>
                                <span className="font-semibold text-foreground text-xs">{reportToDelete.groupName}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground text-[11px]">Causal:</span>
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-medium">
                                    {formatFaultTypeLabel(reportToDelete.faultType, reportToDelete.customFaultType)}
                                </Badge>
                            </div>
                        </div>
                    )}

                    <AlertDialogFooter className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
                        <AlertDialogCancel
                            disabled={isDeleting}
                            className="text-xs h-9 rounded-xl w-full sm:w-auto"
                        >
                            Cancelar
                        </AlertDialogCancel>
                        <Button
                            type="button"
                            variant="destructive"
                            disabled={isDeleting}
                            onClick={async () => {
                                if (!reportToDelete) return;
                                try {
                                    setIsDeleting(true);
                                    await onDeleteReport(reportToDelete.id);
                                    setReportToDelete(null);
                                    toast.success("Reporte eliminado correctamente.");
                                } catch (err: any) {
                                    toast.error(err.message || "Error al eliminar el reporte");
                                } finally {
                                    setIsDeleting(false);
                                }
                            }}
                            className="text-xs font-semibold h-9 rounded-xl gap-1.5 w-full sm:w-auto"
                        >
                            {isDeleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            <span>Eliminar Reporte</span>
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

function renderTeacherDecisionBadge(decision?: string | null) {
    if (!decision) {
        return (
            <span className="text-[11px] text-muted-foreground/60 italic inline-flex items-center gap-1">
                <Clock className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                Pendiente
            </span>
        );
    }

    const lower = decision.toLowerCase().trim();
    if (lower.startsWith("cancelado")) {
        return (
            <Badge variant="outline" className="text-[10px] py-0.5 px-2 bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 font-semibold inline-flex items-center gap-1 shadow-2xs">
                <Ban className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>{decision}</span>
            </Badge>
        );
    }
    if (lower.startsWith("condicionado")) {
        return (
            <Badge variant="outline" className="text-[10px] py-0.5 px-2 bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-semibold inline-flex items-center gap-1 shadow-2xs">
                <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>{decision}</span>
            </Badge>
        );
    }
    if (lower.startsWith("absuelto")) {
        return (
            <Badge variant="outline" className="text-[10px] py-0.5 px-2 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-semibold inline-flex items-center gap-1 shadow-2xs">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{decision}</span>
            </Badge>
        );
    }
    return (
        <Badge variant="outline" className="text-[10px] py-0.5 px-2 bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30 font-semibold inline-flex items-center gap-1 truncate max-w-[140px] shadow-2xs" title={decision}>
            <Scale className="w-3 h-3 text-purple-600 dark:text-purple-400 shrink-0" />
            <span>{decision}</span>
        </Badge>
    );
}
