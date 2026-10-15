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
    Search,
    ExternalLink,
    Eye,
    Edit2,
    Trash2,
    AlertCircle,
    CheckCircle2,
    FileText,
    Lock
} from "lucide-react";
import { CommitteeReportDTO } from "../../types";
import { formatSafeDate, checkProcessDiligenceWindow } from "../../utils/dateUtils";
import { ProcessReportDetailModal } from "../gestor/ProcessReportDetailModal";

interface TeacherReportsTableProps {
    reports: CommitteeReportDTO[];
    isLoading: boolean;
    onEditReport: (report: CommitteeReportDTO) => void;
    onDeleteReport: (reportId: string) => Promise<void>;
}

export function TeacherReportsTable({
    reports,
    isLoading,
    onEditReport,
    onDeleteReport
}: TeacherReportsTableProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedReport, setSelectedReport] = useState<CommitteeReportDTO | null>(null);

    // Helper to normalize accents and spaces for search
    const normalizeSearch = (str: string) =>
        (str || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();

    const filteredReports = useMemo(() => {
        if (!searchTerm.trim()) return reports;
        const term = normalizeSearch(searchTerm);
        return reports.filter(
            (r) =>
                normalizeSearch(r.studentName).includes(term) ||
                (r.studentDocument && normalizeSearch(r.studentDocument).includes(term)) ||
                (r.studentEmail && normalizeSearch(r.studentEmail).includes(term)) ||
                normalizeSearch(r.groupName).includes(term) ||
                normalizeSearch(r.processTitle).includes(term) ||
                normalizeSearch(r.reason).includes(term)
        );
    }, [reports, searchTerm]);

    return (
        <div className="space-y-3.5">
            {/* Filter / Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border/80 shadow-2xs">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                        placeholder="Buscar por aprendiz, ficha o causal..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 h-9 text-xs rounded-xl"
                    />
                </div>

                <div className="text-xs text-muted-foreground font-medium self-end sm:self-auto">
                    Has reportado <strong className="text-foreground">{filteredReports.length}</strong> {filteredReports.length === 1 ? "aprendiz" : "aprendices"}
                </div>
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="w-12 text-center text-xs font-bold">#</TableHead>
                            <TableHead className="text-xs font-bold">Aprendiz</TableHead>
                            <TableHead className="text-xs font-bold">Ficha / Grupo</TableHead>
                            <TableHead className="text-xs font-bold">Proceso de Comité</TableHead>
                            <TableHead className="text-xs font-bold">Causal</TableHead>
                            <TableHead className="text-xs font-bold text-center">Evidencias</TableHead>
                            <TableHead className="text-xs font-bold">Fecha</TableHead>
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
                                const faultBadge =
                                    report.faultType === "ACADEMICO"
                                        ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25"
                                        : report.faultType === "DISCIPLINARIO"
                                        ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25"
                                        : report.faultType === "INASISTENCIA"
                                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25"
                                        : "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/25";

                                const diligence = checkProcessDiligenceWindow({
                                    status: report.processStatus,
                                    startDate: report.processStartDate,
                                    endDate: report.processEndDate
                                });
                                const canEdit = diligence.canEdit;

                                return (
                                    <TableRow key={report.id} className="hover:bg-muted/40 transition-colors">
                                        <TableCell className="text-center font-mono text-xs text-muted-foreground">
                                            {idx + 1}
                                        </TableCell>

                                        {/* Learner */}
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

                                        {/* Ficha */}
                                        <TableCell>
                                            <span className="text-xs font-semibold text-foreground/90">
                                                {report.groupName}
                                            </span>
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

                                        {/* Fault Type */}
                                        <TableCell>
                                            <Badge variant="outline" className={`text-[10px] py-0 px-2 border font-medium ${faultBadge}`}>
                                                {report.faultType}
                                            </Badge>
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

                                        {/* Date */}
                                        <TableCell className="text-[11px] text-muted-foreground font-mono" suppressHydrationWarning>
                                            {formatSafeDate(report.createdAt)}
                                        </TableCell>

                                        {/* Actions (View, Edit, Delete) */}
                                        <TableCell className="text-right pr-4">
                                            <div className="flex items-center justify-end gap-1">
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

                                                {canEdit ? (
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
                                                            onClick={() => {
                                                                if (confirm(`¿Estás seguro de eliminar el reporte de ${report.studentName}?`)) {
                                                                    onDeleteReport(report.id);
                                                                }
                                                            }}
                                                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                                                            title="Eliminar reporte"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </>
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

            {/* Detail Modal */}
            <ProcessReportDetailModal
                report={selectedReport}
                isOpen={!!selectedReport}
                onClose={() => setSelectedReport(null)}
            />
        </div>
    );
}
