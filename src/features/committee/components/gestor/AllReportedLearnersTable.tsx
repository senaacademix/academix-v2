"use client";

import React, { useState, useMemo, useEffect } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Search,
    ExternalLink,
    FileSpreadsheet,
    Eye,
    Filter,
    Users,
    AlertCircle,
    Trash2,
    Calendar,
    RefreshCw,
    Mail,
    FileText,
    Clock,
    Layers,
    ChevronDown,
    ChevronRight,
    ChevronsUpDown,
    CheckSquare,
    Square,
    MinusSquare,
    X,
    GraduationCap
} from "lucide-react";
import { CommitteeReportDTO, CommitteeProcessDTO, TrainingAreaGroupDTO, FAULT_TYPE_CONFIG, formatFaultTypeLabel, CommitteeFaultType } from "../../types";
import {
    exportCommitteeReportsToExcel,
    generateAndDownloadCommitteePdf,
    CommitteeExportOptions
} from "../../utils/committeeExportUtils";
import { formatSafeDate } from "../../utils/dateUtils";
import { ProcessReportDetailModal } from "./ProcessReportDetailModal";
import { StudentAcademicRecordModal } from "../common/StudentAcademicRecordModal";
import { CommitteeEmailComposerModal } from "./CommitteeEmailComposerModal";
import { CommitteeEmailTemplatesModal } from "./CommitteeEmailTemplatesModal";
import { CommitteeDecisionSelector } from "./CommitteeDecisionSelector";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface AllReportedLearnersTableProps {
    reports: CommitteeReportDTO[];
    processes: CommitteeProcessDTO[];
    isLoading: boolean;
    onRefresh: () => void;
    onDeleteReport?: (reportId: string) => Promise<void>;
    fixedProcessId?: string;
    hideProcessColumn?: boolean;
    programId?: string;
    programName?: string;
    groups?: TrainingAreaGroupDTO[];
}

export function AllReportedLearnersTable({
    reports,
    processes,
    isLoading,
    onRefresh,
    onDeleteReport,
    fixedProcessId,
    hideProcessColumn = Boolean(fixedProcessId),
    programId,
    programName,
    groups
}: AllReportedLearnersTableProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>("all");
    const [selectedProcessId, setSelectedProcessId] = useState<string>(fixedProcessId || "all");
    const [selectedFaultType, setSelectedFaultType] = useState<string>("all");
    const [selectedDecisionFilter, setSelectedDecisionFilter] = useState<string>("all");
    const [selectedReport, setSelectedReport] = useState<CommitteeReportDTO | null>(null);
    const [academicRecordStudent, setAcademicRecordStudent] = useState<CommitteeReportDTO | null>(null);
    const [reportToDelete, setReportToDelete] = useState<CommitteeReportDTO | null>(null);
    const [isDeletingReport, setIsDeletingReport] = useState(false);
    const [isExportingExcel, setIsExportingExcel] = useState(false);
    const [isExportingPdf, setIsExportingPdf] = useState(false);

    // Grouping by schedule (default), by ficha, or none (flat list)
    const [groupBy, setGroupBy] = useState<"schedule" | "group" | "none">("schedule");
    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

    // Selection state for sending emails
    const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]);

    // Modals for Email Composer and Template Manager
    const [isComposerOpen, setIsComposerOpen] = useState(false);
    const [composerReports, setComposerReports] = useState<CommitteeReportDTO[]>([]);
    const [isTemplatesManagerOpen, setIsTemplatesManagerOpen] = useState(false);

    // Sync with fixedProcessId if provided
    useEffect(() => {
        if (fixedProcessId) {
            setSelectedProcessId(fixedProcessId);
        }
    }, [fixedProcessId]);

    // Helper to normalize accents and spaces for search
    const normalizeSearch = (str: string) =>
        (str || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();

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
            const key = r.groupId || r.groupName;
            if (key && !map.has(key)) {
                map.set(key, {
                    value: key,
                    label: r.groupName
                });
            }
        }
        return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
    }, [reports, groups]);

    // Filter reports
    const filteredReports = useMemo(() => {
        return reports.filter((r) => {
            const matchesProcess = fixedProcessId ? r.processId === fixedProcessId : (selectedProcessId === "all" || r.processId === selectedProcessId);
            const matchesFault = selectedFaultType === "all" || r.faultType === selectedFaultType;

            const matchesGroup =
                selectedGroupFilter === "all" ||
                r.groupId === selectedGroupFilter ||
                r.groupName === selectedGroupFilter;

            const matchesDecision =
                selectedDecisionFilter === "all" ||
                (selectedDecisionFilter === "PENDING" && !r.committeeDecision) ||
                (selectedDecisionFilter === "Cancelado" && r.committeeDecision === "Cancelado") ||
                (selectedDecisionFilter === "Condicionado" && r.committeeDecision === "Condicionado") ||
                (selectedDecisionFilter === "Absuelto" && r.committeeDecision === "Absuelto") ||
                (selectedDecisionFilter === "OTRO" && !!r.committeeDecision && !["Cancelado", "Condicionado", "Absuelto"].includes(r.committeeDecision));

            const term = normalizeSearch(searchTerm);
            const matchesSearch =
                !term ||
                normalizeSearch(r.studentName).includes(term) ||
                (r.studentDocument && normalizeSearch(r.studentDocument).includes(term)) ||
                (r.studentEmail && normalizeSearch(r.studentEmail).includes(term)) ||
                normalizeSearch(r.groupName).includes(term) ||
                (r.groupSchedule && normalizeSearch(r.groupSchedule).includes(term)) ||
                (r.committeeDecision && normalizeSearch(r.committeeDecision).includes(term)) ||
                normalizeSearch(r.reportedByName).includes(term) ||
                normalizeSearch(r.reason).includes(term);

            return matchesProcess && matchesFault && matchesGroup && matchesDecision && matchesSearch;
        });
    }, [reports, fixedProcessId, selectedProcessId, selectedGroupFilter, selectedFaultType, selectedDecisionFilter, searchTerm]);

    // Group reports by latest group schedule or ficha
    const groupedReports = useMemo(() => {
        if (groupBy === "none") return [];

        const map = new Map<string, {
            key: string;
            title: string;
            scheduleInfo?: string;
            reports: CommitteeReportDTO[];
            uniqueStudentsCount: number;
            fichas: Set<string>;
        }>();

        for (const report of filteredReports) {
            let key = "";
            let title = "";
            const scheduleInfo = report.groupSchedule || "";

            if (groupBy === "schedule") {
                key = (report.groupSchedule && report.groupSchedule.trim())
                    ? report.groupSchedule.trim()
                    : "Sin horario asignado";
                title = key;
            } else if (groupBy === "group") {
                key = report.groupId;
                title = report.groupName;
            }

            if (!map.has(key)) {
                map.set(key, {
                    key,
                    title,
                    scheduleInfo,
                    reports: [],
                    uniqueStudentsCount: 0,
                    fichas: new Set()
                });
            }

            const item = map.get(key)!;
            item.reports.push(report);
            item.fichas.add(report.groupName);
        }

        const groupsArr = Array.from(map.values()).map((g) => ({
            ...g,
            uniqueStudentsCount: new Set(g.reports.map((r) => r.studentId)).size,
            fichasCount: g.fichas.size
        }));

        if (groupBy === "schedule") {
            groupsArr.sort((a, b) => {
                if (a.key === "Sin horario asignado") return 1;
                if (b.key === "Sin horario asignado") return -1;
                return a.title.localeCompare(b.title, "es", { sensitivity: "base" });
            });
        } else {
            groupsArr.sort((a, b) => a.title.localeCompare(b.title, "es", { sensitivity: "base" }));
        }

        return groupsArr;
    }, [filteredReports, groupBy]);

    // Unique students count
    const uniqueStudentsCount = useMemo(() => {
        return new Set(filteredReports.map((r) => r.studentId)).size;
    }, [filteredReports]);

    // Collapse / Expand helpers
    const toggleGroupCollapse = (key: string) => {
        setCollapsedGroups((prev) => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const handleCollapseAll = () => {
        const next: Record<string, boolean> = {};
        for (const g of groupedReports) {
            next[g.key] = true;
        }
        setCollapsedGroups(next);
    };

    const handleExpandAll = () => {
        setCollapsedGroups({});
    };

    // Selection helpers
    const allFilteredIds = useMemo(() => filteredReports.map((r) => r.id), [filteredReports]);
    const isAllSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedReportIds.includes(id));

    const handleToggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedReportIds([]);
        } else {
            setSelectedReportIds(allFilteredIds);
        }
    };

    const handleToggleSelectRow = (reportId: string) => {
        setSelectedReportIds((prev) =>
            prev.includes(reportId) ? prev.filter((id) => id !== reportId) : [...prev, reportId]
        );
    };

    const handleToggleSelectGroup = (groupReportIds: string[]) => {
        const allSelected = groupReportIds.every((id) => selectedReportIds.includes(id));
        if (allSelected) {
            setSelectedReportIds((prev) => prev.filter((id) => !groupReportIds.includes(id)));
        } else {
            setSelectedReportIds((prev) => Array.from(new Set([...prev, ...groupReportIds])));
        }
    };

    // Open email composer modal for selected learners
    const handleOpenBulkEmailModal = () => {
        if (selectedReportIds.length === 0) {
            toast.info("Selecciona uno o más aprendices en la tabla para enviarles correo.");
            return;
        }

        const selected = reports.filter((r) => selectedReportIds.includes(r.id));
        setComposerReports(selected);
        setIsComposerOpen(true);
    };

    // Open email composer modal for a specific learner
    const handleOpenDirectEmailModal = (report: CommitteeReportDTO) => {
        setComposerReports([report]);
        setIsComposerOpen(true);
    };

    // Helper to extract active view and filters for export
    const getExportOptions = (): CommitteeExportOptions => {
        const currentProc = processes.find((p) => p.id === (fixedProcessId || selectedProcessId));
        const fichaObj = availableFichas.find((f) => f.value === selectedGroupFilter);
        const faultLabel =
            selectedFaultType === "all"
                ? "Todas las causales"
                : FAULT_TYPE_CONFIG[selectedFaultType as CommitteeFaultType]?.label || selectedFaultType;
        const decisionLabel =
            selectedDecisionFilter === "all"
                ? "Todas las soluciones"
                : selectedDecisionFilter === "pending"
                ? "Pendientes de solución"
                : selectedDecisionFilter === "resolved"
                ? "Resueltos por comité"
                : selectedDecisionFilter;

        return {
            title: currentProc
                ? `Reporte_${currentProc.title.replace(/[^a-zA-Z0-9_-]/g, "_")}`
                : "Reporte_General_Comite_Evaluacion",
            programName: programName || filteredReports[0]?.programName || null,
            processTitle: currentProc ? currentProc.title : "Todos los procesos de comité",
            groupBy,
            filters: {
                fichaLabel: fichaObj ? fichaObj.label : selectedGroupFilter === "all" ? "Todas las fichas" : selectedGroupFilter,
                faultTypeLabel: faultLabel,
                decisionLabel: decisionLabel,
                searchTerm: searchTerm.trim() || undefined,
            },
            groupedReports: groupBy !== "none" ? groupedReports : undefined,
        };
    };

    const handleExportExcel = async () => {
        if (filteredReports.length === 0) {
            toast.error("No hay aprendices reportados para exportar con los filtros actuales.");
            return;
        }
        try {
            setIsExportingExcel(true);
            const exportOpts = getExportOptions();
            await exportCommitteeReportsToExcel(filteredReports, exportOpts);
            toast.success("Reporte Excel generado de acuerdo a la vista y filtros actuales.");
        } catch (err: any) {
            console.error(err);
            toast.error("Error al exportar a Excel.");
        } finally {
            setIsExportingExcel(false);
        }
    };

    const handleExportPdf = async () => {
        if (filteredReports.length === 0) {
            toast.error("No hay aprendices reportados para exportar con los filtros actuales.");
            return;
        }
        try {
            setIsExportingPdf(true);
            toast.info("Generando PDF corporativo con @react-pdf/renderer...");
            const exportOpts = getExportOptions();
            await generateAndDownloadCommitteePdf(filteredReports, exportOpts);
            toast.success("PDF corporativo generado con éxito.");
        } catch (err: any) {
            console.error(err);
            toast.error("Error al generar el PDF corporativo.");
        } finally {
            setIsExportingPdf(false);
        }
    };

    // Render individual report row
    const renderReportRow = (report: CommitteeReportDTO, idx: number) => {
        const faultInfo = FAULT_TYPE_CONFIG[report.faultType] || {
            label: report.faultType,
            badgeClass: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/25",
            icon: "📋"
        };
        const faultLabel = formatFaultTypeLabel(report.faultType, report.customFaultType);

        return (
            <TableRow key={report.id} className="hover:bg-muted/40 transition-colors">
                {/* Checkbox */}
                <TableCell className="text-center px-2">
                    <Checkbox
                        checked={selectedReportIds.includes(report.id)}
                        onCheckedChange={() => handleToggleSelectRow(report.id)}
                        aria-label={`Seleccionar ${report.studentName}`}
                    />
                </TableCell>

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
                                {report.studentEmail ? (
                                    <a
                                        href={`mailto:${report.studentEmail}`}
                                        className="text-primary hover:underline font-sans flex items-center gap-0.5"
                                        title={`Enviar correo a ${report.studentEmail}`}
                                    >
                                        ✉ {report.studentEmail}
                                    </a>
                                ) : (
                                    <span className="text-muted-foreground/60 italic font-sans">
                                        Sin correo
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
                                <span className="truncate max-w-[220px]" title={report.groupSchedule}>
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

                {/* Process Title */}
                {!hideProcessColumn && (
                    <TableCell>
                        <p className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]" title={report.processTitle}>
                            {report.processTitle}
                        </p>
                    </TableCell>
                )}

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

                {/* Solución Comité */}
                <TableCell>
                    <CommitteeDecisionSelector
                        reportId={report.id}
                        currentDecision={report.committeeDecision || null}
                        onUpdated={(newVal) => {
                            report.committeeDecision = newVal;
                        }}
                    />
                </TableCell>

                {/* Reporter */}
                <TableCell>
                    <span className="text-xs text-foreground/80 font-medium">
                        {report.reportedByName}
                    </span>
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

                {/* Actions */}
                <TableCell className="text-right pr-4">
                    <div className="flex items-center justify-end gap-1">
                        {report.studentEmail && (
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenDirectEmailModal(report)}
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg"
                                title={`Redactar y enviar correo a ${report.studentEmail}`}
                            >
                                <Mail className="w-3.5 h-3.5" />
                            </Button>
                        )}

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
                            variant="outline"
                            onClick={() => setSelectedReport(report)}
                            className="h-7 px-2.5 text-xs rounded-lg gap-1"
                        >
                            <Eye className="w-3.5 h-3.5 text-primary" />
                            <span>Detalle</span>
                        </Button>

                        {onDeleteReport && (
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
                        )}
                    </div>
                </TableCell>
            </TableRow>
        );
    };

    const renderMobileReportCard = (report: CommitteeReportDTO, idx: number) => {
        const faultInfo = FAULT_TYPE_CONFIG[report.faultType] || {
            label: report.faultType,
            badgeClass: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/25",
            icon: "📋"
        };
        const faultLabel = formatFaultTypeLabel(report.faultType, report.customFaultType);

        const isSelected = selectedReportIds.includes(report.id);

        return (
            <div
                key={report.id}
                className={`p-3.5 space-y-3 transition-colors ${
                    isSelected ? "bg-primary/5" : "bg-card hover:bg-muted/20"
                }`}
            >
                {/* Header: Checkbox + Avatar + Learner Info + Causal Badge */}
                <div className="flex items-start gap-2.5">
                    <div className="pt-0.5">
                        <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggleSelectRow(report.id)}
                            aria-label={`Seleccionar ${report.studentName}`}
                        />
                    </div>
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
                        <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-muted-foreground font-mono">
                            <span>Doc: {report.studentDocument || "Sin doc"}</span>
                            {report.studentEmail && (
                                <a
                                    href={`mailto:${report.studentEmail}`}
                                    className="text-primary hover:underline font-sans inline-flex items-center gap-0.5"
                                    title={`Enviar correo a ${report.studentEmail}`}
                                >
                                    ✉ Correo
                                </a>
                            )}
                        </div>
                    </div>
                    <Badge variant="outline" className={`text-[10px] py-0 px-2 border font-medium shrink-0 ${faultInfo.badgeClass}`}>
                        {faultInfo.icon ? `${faultInfo.icon} ` : ""}{faultLabel}
                    </Badge>
                </div>

                {/* Details Grid: Ficha, Horario, Inasistencia, Reporter */}
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

                    {!hideProcessColumn && report.processTitle && (
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground text-[11px] font-medium">Proceso:</span>
                            <span className="text-foreground text-right text-[11px] truncate max-w-[200px]">
                                {report.processTitle}
                            </span>
                        </div>
                    )}

                    {(report.absenceDays ?? report.absenceHours ?? 0) > 0 && (
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground text-[11px] font-medium">Inasistencias:</span>
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 border bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 font-mono">
                                {report.absenceDays ?? report.absenceHours} {(report.absenceDays ?? report.absenceHours) === 1 ? "día inasist." : "días inasist."}
                            </Badge>
                        </div>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40 text-[11px]">
                        <span className="text-muted-foreground">Reportado por:</span>
                        <span className="font-medium text-foreground truncate max-w-[180px]">{report.reportedByName}</span>
                    </div>
                </div>

                {/* Decision & Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                    {/* Committee Decision Selector */}
                    <div className="flex-1 min-w-[160px]">
                        <CommitteeDecisionSelector
                            reportId={report.id}
                            currentDecision={report.committeeDecision || null}
                            onUpdated={(newVal) => {
                                report.committeeDecision = newVal;
                            }}
                        />
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        {report.evidenceUrl && (
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => window.open(report.evidenceUrl!, "_blank", "noopener,noreferrer")}
                                className="h-8 px-2 text-xs text-blue-600 dark:text-blue-400 gap-1 rounded-lg"
                                title="Ver evidencia"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span className="hidden xs:inline">Evidencia</span>
                            </Button>
                        )}

                        {report.studentEmail && (
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenDirectEmailModal(report)}
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-primary rounded-lg"
                                title={`Enviar correo a ${report.studentEmail}`}
                            >
                                <Mail className="w-3.5 h-3.5" />
                            </Button>
                        )}

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

                        {onDeleteReport && (
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
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-4">
            {/* Quick Metrics Bar (5 columnas perfectamente balanceadas y simétricas) */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
                <div className="p-3 sm:p-3.5 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-1">
                    <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block truncate">
                        Total Reportes
                    </span>
                    <div className="flex items-center justify-between">
                        <span className="text-lg sm:text-2xl font-black text-foreground">
                            {filteredReports.length}
                        </span>
                        <div className="p-1.5 rounded-lg bg-muted text-muted-foreground">
                            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </div>
                    </div>
                </div>

                <div className="p-3 sm:p-3.5 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-1">
                    <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block truncate">
                        Aprendices Únicos
                    </span>
                    <div className="flex items-center justify-between">
                        <span className="text-lg sm:text-2xl font-black text-primary">
                            {uniqueStudentsCount}
                        </span>
                        <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </div>
                    </div>
                </div>

                <div className="p-3 sm:p-3.5 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-1">
                    <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block truncate">
                        Horarios de Ficha
                    </span>
                    <div className="flex items-center justify-between">
                        <span className="text-lg sm:text-2xl font-black text-amber-600 dark:text-amber-400">
                            {new Set(filteredReports.map((r) => r.groupSchedule || "Sin horario asignado")).size}
                        </span>
                        <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </div>
                    </div>
                </div>

                <div className="p-3 sm:p-3.5 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-1">
                    <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block truncate">
                        Faltas Académicas
                    </span>
                    <div className="flex items-center justify-between">
                        <span className="text-lg sm:text-2xl font-black text-blue-600 dark:text-blue-400">
                            {filteredReports.filter((r) => r.faultType === "ACADEMICO" || r.faultType === "MIXTO").length}
                        </span>
                        <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </div>
                    </div>
                </div>

                <div className="p-3 sm:p-3.5 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-1 col-span-2 md:col-span-1 lg:col-span-1">
                    <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block truncate">
                        Disciplinarias / Inasist.
                    </span>
                    <div className="flex items-center justify-between">
                        <span className="text-lg sm:text-2xl font-black text-rose-600 dark:text-rose-400">
                            {filteredReports.filter((r) => r.faultType === "DISCIPLINARIO" || r.faultType === "INASISTENCIA" || r.faultType === "MIXTO").length}
                        </span>
                        <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                            <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls & Filter Bar (Organizado en 2 filas limpias, equilibradas y simétricas) */}
            <div className="bg-card rounded-2xl border border-border/80 shadow-2xs p-3.5 space-y-3">
                {/* Fila 1: Filtro de Ficha al frente + Búsqueda prominente + Botones de Acción */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
                        {/* Filtro por Ficha al frente (Solo fichas lectivas) */}
                        <div className="w-full sm:w-60 shrink-0">
                            <Select value={selectedGroupFilter} onValueChange={setSelectedGroupFilter}>
                                <SelectTrigger className="h-9 text-xs rounded-xl bg-background border-border/80">
                                    <SelectValue placeholder="Todas las fichas" />
                                </SelectTrigger>
                                <SelectContent className="max-h-56">
                                    <SelectItem value="all" className="text-xs">
                                        Todas las fichas ({availableFichas.length})
                                    </SelectItem>
                                    {availableFichas.map((f) => (
                                        <SelectItem key={f.value} value={f.value} className="text-xs">
                                            {f.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Búsqueda */}
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                            <Input
                                placeholder="Buscar por aprendiz, documento, ficha, horario o instructor..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-8 h-9 text-xs rounded-xl bg-background border-border/80 focus-visible:ring-primary/20"
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

                    {/* Botones de Acción principales (Grid 2x2 en móvil, flex en desktop) */}
                    <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full md:w-auto shrink-0 justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsTemplatesManagerOpen(true)}
                            className="h-9 px-3 text-xs rounded-xl gap-1.5 hover:border-primary/40 transition-colors w-full sm:w-auto justify-center"
                            title="Gestionar plantillas de citación"
                        >
                            <FileText className="w-3.5 h-3.5 text-primary" />
                            <span>Plantillas</span>
                        </Button>

                        <Button
                            type="button"
                            variant={selectedReportIds.length > 0 ? "default" : "outline"}
                            size="sm"
                            onClick={handleOpenBulkEmailModal}
                            className={`h-9 px-3 text-xs rounded-xl gap-1.5 transition-all shadow-2xs font-medium w-full sm:w-auto justify-center ${
                                selectedReportIds.length > 0
                                    ? "bg-primary text-primary-foreground hover:bg-primary/90 font-semibold ring-2 ring-primary/20"
                                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                            }`}
                            title={
                                selectedReportIds.length > 0
                                    ? `Redactar citación por correo para ${selectedReportIds.length} aprendiz(ces) seleccionados`
                                    : "Selecciona aprendices de la tabla para enviarles citación por correo"
                            }
                        >
                            <Mail className="w-3.5 h-3.5" />
                            <span>
                                {selectedReportIds.length > 0
                                    ? `Correo (${selectedReportIds.length})`
                                    : "Enviar Correo"}
                            </span>
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={onRefresh}
                            disabled={isLoading}
                            className="h-9 px-3 text-xs rounded-xl gap-1.5 w-full sm:w-auto justify-center"
                            title="Refrescar datos"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                            <span>Refrescar</span>
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleExportExcel}
                            disabled={isExportingExcel}
                            className="h-9 px-3 text-xs rounded-xl gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-medium w-full sm:w-auto justify-center"
                            title="Exportar aprendices reportados a Excel (según vista y filtros actuales)"
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
                            className="h-9 px-3 text-xs rounded-xl gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30 font-medium w-full sm:w-auto justify-center"
                            title="Exportar reporte en PDF corporativo (@react-pdf/renderer)"
                        >
                            <FileText className={`w-3.5 h-3.5 text-rose-600 dark:text-rose-400 ${isExportingPdf ? "animate-spin" : ""}`} />
                            <span>{isExportingPdf ? "PDF..." : "PDF"}</span>
                        </Button>
                    </div>
                </div>

                {/* Línea divisoria elegante */}
                <div className="h-px bg-border/60 w-full" />

                {/* Fila 2: Filtros temáticos a la izquierda y Agrupación / Vistas a la derecha */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                    {/* Filtros a la izquierda */}
                    <div className="flex items-center gap-2 flex-wrap flex-1">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 shrink-0 mr-1">
                            <Filter className="w-3 h-3 text-muted-foreground/70" />
                            Filtros:
                        </span>

                        {/* Filter by Process (solo si no es fijo) */}
                        {!fixedProcessId && (
                            <div className="w-full sm:w-48">
                                <Select value={selectedProcessId} onValueChange={setSelectedProcessId}>
                                    <SelectTrigger className="h-9 text-xs rounded-xl bg-background border-border/80">
                                        <SelectValue placeholder="Proceso de comité" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all" className="text-xs">
                                            Todos los procesos ({processes.length})
                                        </SelectItem>
                                        {processes.map((p) => (
                                             <SelectItem key={p.id} value={p.id} className="text-xs">
                                                {p.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Filter by Fault */}
                        <div className="w-full sm:w-44">
                            <Select value={selectedFaultType} onValueChange={setSelectedFaultType}>
                                <SelectTrigger className="h-9 text-xs rounded-xl bg-background border-border/80">
                                    <SelectValue placeholder="Causal / Falta" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all" className="text-xs">
                                        Todas las causales
                                    </SelectItem>
                                    <SelectItem value="ACADEMICO" className="text-xs">
                                        📘 Académico
                                    </SelectItem>
                                    <SelectItem value="DISCIPLINARIO" className="text-xs">
                                        📕 Disciplinario
                                    </SelectItem>
                                    <SelectItem value="INASISTENCIA" className="text-xs">
                                        📙 Inasistencia
                                    </SelectItem>
                                    <SelectItem value="MIXTO" className="text-xs">
                                        📓 Mixto
                                    </SelectItem>
                                    <SelectItem value="SOLICITUD_PLAN_MEJORAMIENTO" className="text-xs">
                                        📝 Solicitud Plan Mejoramiento
                                    </SelectItem>
                                    <SelectItem value="INCUMPLIMIENTO_PLAN_MEJORAMIENTO" className="text-xs">
                                        ⚠️ Incumplimiento Plan Mejoramiento
                                    </SelectItem>
                                    <SelectItem value="DESERCION" className="text-xs">
                                        🚶 Deserción
                                    </SelectItem>
                                    <SelectItem value="PLAGIO_FRAUDE" className="text-xs">
                                        🚫 Plagio o Fraude
                                    </SelectItem>
                                    <SelectItem value="ETAPA_PRODUCTIVA" className="text-xs">
                                        🏭 Etapa Productiva
                                    </SelectItem>
                                    <SelectItem value="OTRO" className="text-xs">
                                        📋 Otra causal
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Filter by Committee Decision */}
                        <div className="w-full sm:w-48">
                            <Select value={selectedDecisionFilter} onValueChange={setSelectedDecisionFilter}>
                                <SelectTrigger className="h-9 text-xs rounded-xl bg-background border-border/80">
                                    <SelectValue placeholder="Solución Comité" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all" className="text-xs">
                                        Todas las soluciones
                                    </SelectItem>
                                    <SelectItem value="Cancelado" className="text-xs font-medium text-rose-600 dark:text-rose-400">
                                        🚫 Cancelado
                                    </SelectItem>
                                    <SelectItem value="Condicionado" className="text-xs font-medium text-amber-600 dark:text-amber-400">
                                        ⚠️ Condicionado
                                    </SelectItem>
                                    <SelectItem value="Absuelto" className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                        🛡️ Absuelto
                                    </SelectItem>
                                    <SelectItem value="OTRO" className="text-xs font-medium text-purple-600 dark:text-purple-400">
                                        ✏️ Otra Solución
                                    </SelectItem>
                                    <SelectItem value="PENDING" className="text-xs text-muted-foreground">
                                        ⏳ Pendiente (Sin definir)
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Botón Limpiar filtros cuando hay filtros aplicados */}
                        {(selectedFaultType !== "all" || selectedDecisionFilter !== "all" || (!fixedProcessId && selectedProcessId !== "all") || selectedGroupFilter !== "all" || searchTerm) && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setSearchTerm("");
                                    setSelectedFaultType("all");
                                    setSelectedDecisionFilter("all");
                                    setSelectedGroupFilter("all");
                                    if (!fixedProcessId) setSelectedProcessId("all");
                                }}
                                className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1 rounded-xl"
                                title="Limpiar todos los filtros"
                            >
                                <X className="w-3.5 h-3.5" />
                                <span>Limpiar</span>
                            </Button>
                        )}
                    </div>

                    {/* Agrupación y Controles de Vista a la derecha */}
                    <div className="flex items-center gap-2 justify-end shrink-0 pt-1 md:pt-0">
                        {/* Expandir / Colapsar (Junto al selector de agrupación con altura h-9 simétrica) */}
                        {groupBy !== "none" && groupedReports.length > 0 && (
                            <div className="flex items-center h-9 border border-border/80 rounded-xl px-1 bg-background shadow-2xs">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleExpandAll}
                                    className="h-7 px-2.5 text-[11px] text-muted-foreground hover:text-foreground font-medium rounded-lg"
                                    title="Expandir todas las franjas horarias"
                                >
                                    Expandir
                                </Button>
                                <div className="h-4 w-px bg-border/80 mx-0.5" />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleCollapseAll}
                                    className="h-7 px-2.5 text-[11px] text-muted-foreground hover:text-foreground font-medium rounded-lg"
                                    title="Colapsar todas las franjas horarias"
                                >
                                    Colapsar
                                </Button>
                            </div>
                        )}

                        {/* Agrupar por: Selector con ancho generoso para no truncar nunca */}
                        <div className="w-full sm:w-[240px] shrink-0">
                            <Select value={groupBy} onValueChange={(val: any) => setGroupBy(val)}>
                                <SelectTrigger className="h-9 text-xs rounded-xl border-primary/30 bg-background font-medium shadow-2xs">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <Layers className="w-3.5 h-3.5 text-primary shrink-0" />
                                        <span className="text-muted-foreground text-[11px] shrink-0">Agrupar:</span>
                                        <span className="font-semibold text-foreground truncate">
                                            {groupBy === "schedule"
                                                ? "Horario de la Ficha"
                                                : groupBy === "group"
                                                ? "Por Ficha / Grupo"
                                                : "Sin agrupar (Plana)"}
                                        </span>
                                    </div>
                                </SelectTrigger>
                                <SelectContent align="end">
                                    <SelectItem value="schedule" className="text-xs font-semibold text-primary">
                                        🕒 Por Horario de la Ficha
                                    </SelectItem>
                                    <SelectItem value="group" className="text-xs">
                                        👥 Por Ficha / Grupo
                                    </SelectItem>
                                    <SelectItem value="none" className="text-xs">
                                        📋 Sin agrupar (Lista plana)
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Banner de Selección Activa (Symmetric & Intuitive) */}
            {selectedReportIds.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 px-4 rounded-2xl bg-primary/10 border border-primary/25 shadow-2xs animate-in fade-in slide-in-from-top-1">
                    <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-black">
                            {selectedReportIds.length}
                        </div>
                        <div className="space-y-0.5">
                            <span className="text-xs font-bold text-foreground">
                                {selectedReportIds.length === 1
                                    ? "1 aprendiz seleccionado"
                                    : `${selectedReportIds.length} aprendices seleccionados`}
                            </span>
                            <p className="text-[11px] text-muted-foreground">
                                Listos para recibir citación por correo electrónico con su respectivo horario de ficha.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            size="sm"
                            onClick={handleOpenBulkEmailModal}
                            className="h-8 px-3 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl gap-1.5 shadow-2xs"
                        >
                            <Mail className="w-3.5 h-3.5" />
                            <span>Redactar Citación ({selectedReportIds.length})</span>
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedReportIds([])}
                            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground rounded-xl"
                        >
                            Deseleccionar
                        </Button>
                    </div>
                </div>
            )}

            {/* Content Display: Grouped Accordions or Unified Table */}
            {isLoading ? (
                <div className="rounded-2xl border border-border/80 bg-card p-12 text-center shadow-2xs">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
                        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                        <span className="font-medium text-foreground">Cargando aprendices reportados...</span>
                        <span className="text-[11px] text-muted-foreground">Consultando fichas y sus últimos horarios asignados.</span>
                    </div>
                </div>
            ) : filteredReports.length === 0 ? (
                <div className="rounded-2xl border border-border/80 bg-card p-12 text-center shadow-2xs">
                    <div className="flex flex-col items-center justify-center gap-1.5 text-muted-foreground text-xs">
                        <AlertCircle className="w-7 h-7 text-muted-foreground/60" />
                        <span className="font-semibold text-foreground text-sm">
                            No hay aprendices reportados
                        </span>
                        <span className="text-[11px] max-w-md">
                            {searchTerm || (!fixedProcessId && selectedProcessId !== "all") || selectedFaultType !== "all"
                                ? "No se encontraron reportes con los filtros aplicados."
                                : "Aún no se han registrado reportes de aprendices en este proceso de comité."}
                        </span>
                    </div>
                </div>
            ) : groupBy !== "none" ? (
                /* Grouped Accordions by Schedule or Ficha */
                <div className="space-y-4">
                    {groupedReports.map((groupItem) => {
                        const isCollapsed = Boolean(collapsedGroups[groupItem.key]);
                        const groupReportIds = groupItem.reports.map((r) => r.id);
                        const isGroupAllSelected =
                            groupReportIds.length > 0 && groupReportIds.every((id) => selectedReportIds.includes(id));
                        const isGroupSomeSelected =
                            groupReportIds.some((id) => selectedReportIds.includes(id)) && !isGroupAllSelected;

                        return (
                            <div
                                key={groupItem.key}
                                className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs transition-all"
                            >
                                {/* Header of the Group / Schedule */}
                                <div
                                    onClick={() => toggleGroupCollapse(groupItem.key)}
                                    className="flex flex-wrap items-center justify-between gap-3 p-3 sm:px-4 bg-muted/40 hover:bg-muted/60 cursor-pointer border-b border-border/60 select-none transition-colors"
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 w-7 p-0 text-muted-foreground shrink-0 rounded-lg"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleGroupCollapse(groupItem.key);
                                            }}
                                        >
                                            {isCollapsed ? (
                                                <ChevronRight className="w-4 h-4" />
                                            ) : (
                                                <ChevronDown className="w-4 h-4" />
                                            )}
                                        </Button>

                                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                                            <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary shrink-0">
                                                {groupBy === "schedule" ? (
                                                    <Clock className="w-4 h-4" />
                                                ) : (
                                                    <Users className="w-4 h-4" />
                                                )}
                                            </div>
                                            <div className="space-y-0.5 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="text-xs sm:text-sm font-bold text-foreground">
                                                        {groupBy === "schedule"
                                                            ? groupItem.key === "Sin horario asignado"
                                                                ? "Sin Horario Asignado"
                                                                : `Horario: ${groupItem.title}`
                                                            : `Ficha: ${groupItem.title}`}
                                                    </h3>
                                                    <Badge variant="outline" className="text-[10px] py-0 px-2 font-mono bg-background border-border/80">
                                                        {groupItem.reports.length} {groupItem.reports.length === 1 ? "reporte" : "reportes"}
                                                    </Badge>
                                                    <Badge variant="outline" className="text-[10px] py-0 px-2 font-mono bg-primary/5 text-primary border-primary/20">
                                                        {groupItem.uniqueStudentsCount} {groupItem.uniqueStudentsCount === 1 ? "aprendiz" : "aprendices"}
                                                    </Badge>
                                                    {groupBy === "schedule" && groupItem.fichasCount > 0 && (
                                                        <Badge variant="outline" className="text-[10px] py-0 px-2 font-mono text-muted-foreground bg-muted/40 border-border/60">
                                                            {groupItem.fichasCount} {groupItem.fichasCount === 1 ? "ficha" : "fichas"}
                                                        </Badge>
                                                    )}
                                                </div>
                                                {groupBy === "group" && groupItem.scheduleInfo && (
                                                    <p className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                                                        <Clock className="w-3 h-3 text-primary/70" />
                                                        <span>{groupItem.scheduleInfo}</span>
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Select All in this group button */}
                                    <div
                                        className="flex items-center gap-2 shrink-0 ml-auto"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleToggleSelectGroup(groupReportIds)}
                                            className={`h-7 px-2.5 text-[11px] rounded-lg gap-1.5 transition-all ${
                                                isGroupAllSelected
                                                    ? "bg-primary text-primary-foreground border-primary font-semibold"
                                                    : "text-muted-foreground hover:text-foreground"
                                            }`}
                                            title="Seleccionar o deseleccionar todos los aprendices de este grupo"
                                        >
                                            {isGroupAllSelected ? (
                                                <CheckSquare className="w-3.5 h-3.5" />
                                            ) : isGroupSomeSelected ? (
                                                <MinusSquare className="w-3.5 h-3.5 text-primary" />
                                            ) : (
                                                <Square className="w-3.5 h-3.5 text-muted-foreground" />
                                            )}
                                            <span>
                                                {isGroupAllSelected
                                                    ? groupBy === "schedule"
                                                        ? "Deseleccionar horario"
                                                        : "Deseleccionar ficha"
                                                    : groupBy === "schedule"
                                                    ? "Seleccionar horario"
                                                    : "Seleccionar ficha"}
                                            </span>
                                        </Button>
                                    </div>
                                </div>

                                {/* Table for this group (if not collapsed) */}
                                {!isCollapsed && (
                                    <>
                                        {/* Vista de Tabla para Pantallas Medianas y Grandes */}
                                        <div className="hidden md:block overflow-x-auto">
                                            <Table>
                                                <TableHeader className="bg-muted/30">
                                                    <TableRow>
                                                        <TableHead className="w-10 text-center px-2">
                                                            <Checkbox
                                                                checked={isGroupAllSelected}
                                                                onCheckedChange={() => handleToggleSelectGroup(groupReportIds)}
                                                                aria-label="Seleccionar grupo"
                                                            />
                                                        </TableHead>
                                                        <TableHead className="w-12 text-center text-xs font-bold">#</TableHead>
                                                        <TableHead className="min-w-[190px] text-xs font-bold">Aprendiz</TableHead>
                                                        <TableHead className="min-w-[170px] text-xs font-bold">Ficha / Horario</TableHead>
                                                        {!hideProcessColumn && <TableHead className="min-w-[150px] text-xs font-bold">Proceso</TableHead>}
                                                        <TableHead className="min-w-[160px] text-xs font-bold">Causal / Materia</TableHead>
                                                        <TableHead className="min-w-[160px] text-xs font-bold">Solución Comité</TableHead>
                                                        <TableHead className="min-w-[140px] text-xs font-bold">Reportado Por</TableHead>
                                                        <TableHead className="w-24 text-xs font-bold text-center">Evidencias</TableHead>
                                                        <TableHead className="w-28 text-xs font-bold text-right pr-4">Acción</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {groupItem.reports.map((report, idx) => renderReportRow(report, idx))}
                                                </TableBody>
                                            </Table>
                                        </div>

                                        {/* Vista de Tarjetas Táctiles para Móviles */}
                                        <div className="block md:hidden divide-y divide-border/60">
                                            {groupItem.reports.map((report, idx) => renderMobileReportCard(report, idx))}
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* Flat Unified Table */
                <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs">
                    {/* Vista de Tabla para Pantallas Medianas y Grandes */}
                    <div className="hidden md:block overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="w-10 text-center px-2">
                                        <Checkbox
                                            checked={isAllSelected}
                                            onCheckedChange={handleToggleSelectAll}
                                            aria-label="Seleccionar todos"
                                        />
                                    </TableHead>
                                    <TableHead className="w-12 text-center text-xs font-bold">#</TableHead>
                                    <TableHead className="min-w-[190px] text-xs font-bold">Aprendiz</TableHead>
                                    <TableHead className="min-w-[170px] text-xs font-bold">Ficha / Horario</TableHead>
                                    {!hideProcessColumn && <TableHead className="min-w-[150px] text-xs font-bold">Proceso</TableHead>}
                                    <TableHead className="min-w-[160px] text-xs font-bold">Causal / Materia</TableHead>
                                    <TableHead className="min-w-[160px] text-xs font-bold">Solución Comité</TableHead>
                                    <TableHead className="min-w-[140px] text-xs font-bold">Reportado Por</TableHead>
                                    <TableHead className="w-24 text-xs font-bold text-center">Evidencias</TableHead>
                                    <TableHead className="w-28 text-xs font-bold text-right pr-4">Acción</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredReports.map((report, idx) => renderReportRow(report, idx))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Vista de Tarjetas Táctiles para Móviles */}
                    <div className="block md:hidden divide-y divide-border/60">
                        {filteredReports.map((report, idx) => renderMobileReportCard(report, idx))}
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            <ProcessReportDetailModal
                report={selectedReport}
                isOpen={!!selectedReport}
                onClose={() => setSelectedReport(null)}
            />

            {/* Academic Record Modal */}
            <StudentAcademicRecordModal
                isOpen={!!academicRecordStudent}
                onClose={() => setAcademicRecordStudent(null)}
                student={academicRecordStudent}
            />

            {/* Email Composer Modal with Template System */}
            <CommitteeEmailComposerModal
                isOpen={isComposerOpen}
                onClose={() => setIsComposerOpen(false)}
                reports={composerReports}
                programId={programId}
                defaultProcessTitle={
                    processes.find((p) => p.id === (fixedProcessId || selectedProcessId))?.title
                }
            />

            {/* Templates Manager Modal */}
            <CommitteeEmailTemplatesModal
                isOpen={isTemplatesManagerOpen}
                onClose={() => setIsTemplatesManagerOpen(false)}
                programId={programId}
            />

            {/* Modal de confirmación para eliminar reporte (Tema oscuro consistente) */}
            <AlertDialog open={!!reportToDelete} onOpenChange={(open) => !open && setReportToDelete(null)}>
                <AlertDialogContent className="max-w-md bg-card border-border/80">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-base font-bold text-foreground">
                            ¿Eliminar reporte de aprendiz?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-xs text-muted-foreground">
                            Estás a punto de eliminar el reporte de <strong className="text-foreground">{reportToDelete?.studentName}</strong> (Ficha {reportToDelete?.groupName}). Esta acción es permanente y retirará al aprendiz de la convocatoria de este comité.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
                        <AlertDialogCancel disabled={isDeletingReport} className="h-9 text-xs">
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            disabled={isDeletingReport}
                            onClick={async () => {
                                if (reportToDelete && onDeleteReport) {
                                    try {
                                        setIsDeletingReport(true);
                                        await onDeleteReport(reportToDelete.id);
                                        toast.success("Reporte eliminado correctamente.");
                                        setReportToDelete(null);
                                    } catch (err: any) {
                                        toast.error(err.message || "Error al eliminar el reporte.");
                                    } finally {
                                        setIsDeletingReport(false);
                                    }
                                }
                            }}
                            className="h-9 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeletingReport ? "Eliminando..." : "Eliminar Reporte"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
