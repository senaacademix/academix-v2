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
    Mail
} from "lucide-react";
import { CommitteeReportDTO, CommitteeProcessDTO } from "../../types";
import { exportCommitteeReportsToExcel } from "../../utils/committeeExportUtils";
import { formatSafeDate } from "../../utils/dateUtils";
import { ProcessReportDetailModal } from "./ProcessReportDetailModal";
import { toast } from "sonner";

interface AllReportedLearnersTableProps {
    reports: CommitteeReportDTO[];
    processes: CommitteeProcessDTO[];
    isLoading: boolean;
    onRefresh: () => void;
    onDeleteReport?: (reportId: string) => Promise<void>;
    fixedProcessId?: string;
    hideProcessColumn?: boolean;
}

export function AllReportedLearnersTable({
    reports,
    processes,
    isLoading,
    onRefresh,
    onDeleteReport,
    fixedProcessId,
    hideProcessColumn = Boolean(fixedProcessId)
}: AllReportedLearnersTableProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedProcessId, setSelectedProcessId] = useState<string>(fixedProcessId || "all");
    const [selectedFaultType, setSelectedFaultType] = useState<string>("all");
    const [selectedReport, setSelectedReport] = useState<CommitteeReportDTO | null>(null);

    // Selection state for sending emails
    const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]);

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

    // Filter reports
    const filteredReports = useMemo(() => {
        return reports.filter((r) => {
            const matchesProcess = fixedProcessId ? r.processId === fixedProcessId : (selectedProcessId === "all" || r.processId === selectedProcessId);
            const matchesFault = selectedFaultType === "all" || r.faultType === selectedFaultType;

            const term = normalizeSearch(searchTerm);
            const matchesSearch =
                !term ||
                normalizeSearch(r.studentName).includes(term) ||
                (r.studentDocument && normalizeSearch(r.studentDocument).includes(term)) ||
                (r.studentEmail && normalizeSearch(r.studentEmail).includes(term)) ||
                normalizeSearch(r.groupName).includes(term) ||
                normalizeSearch(r.reportedByName).includes(term) ||
                normalizeSearch(r.reason).includes(term);

            return matchesProcess && matchesFault && matchesSearch;
        });
    }, [reports, fixedProcessId, selectedProcessId, selectedFaultType, searchTerm]);

    // Unique students count
    const uniqueStudentsCount = useMemo(() => {
        return new Set(filteredReports.map((r) => r.studentId)).size;
    }, [filteredReports]);

    // Selection helpers
    const allFilteredIds = useMemo(() => filteredReports.map((r) => r.id), [filteredReports]);
    const isAllSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedReportIds.includes(id));
    const isSomeSelected = selectedReportIds.length > 0 && !isAllSelected;

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

    // Open OS Email client (mailto:) for selected learners
    const handleSendBulkEmail = () => {
        if (selectedReportIds.length === 0) {
            toast.info("Selecciona uno o más aprendices en la tabla para enviarles correo.");
            return;
        }

        const selectedReports = reports.filter((r) => selectedReportIds.includes(r.id));
        const validEmails = Array.from(
            new Set(
                selectedReports
                    .map((r) => r.studentEmail?.trim())
                    .filter((email): email is string => Boolean(email && email.length > 0))
            )
        );

        if (validEmails.length === 0) {
            toast.error("Ninguno de los aprendices seleccionados tiene correo electrónico registrado.");
            return;
        }

        const missingCount = selectedReports.length - validEmails.length;
        if (missingCount > 0) {
            toast.warning(`${missingCount} aprendiz(ces) no tienen correo registrado y no se incluirán.`);
        }

        const currentProc = processes.find((p) => p.id === (fixedProcessId || selectedProcessId));
        const processTitle = currentProc ? currentProc.title : "Comité de Evaluación y Seguimiento";

        const subject = encodeURIComponent(`Citación a Comité de Evaluación y Seguimiento - ${processTitle}`);
        const body = encodeURIComponent(
            `Estimado(a) aprendiz,\n\n` +
            `Por medio de la presente comunicación oficial se le notifica que ha sido convocado(a) al proceso de Comité de Evaluación y Seguimiento:\n\n` +
            `• Convocatoria: ${processTitle}\n\n` +
            `Se le solicita estar atento(a) a las instrucciones del Gestor Académico e instructores sobre la fecha, hora y modalidad de la sesión de evaluación para la presentación de sus descargos y análisis del caso.\n\n` +
            `Atentamente,\n` +
            `Gestor Académico\n` +
            `SENA - Academix`
        );

        let mailtoUrl = "";
        if (validEmails.length === 1) {
            mailtoUrl = `mailto:${validEmails[0]}?subject=${subject}&body=${body}`;
        } else {
            // Se usa 'bcc' (copia oculta) para respetar la privacidad entre aprendices
            mailtoUrl = `mailto:?bcc=${validEmails.join(",")}&subject=${subject}&body=${body}`;
        }

        const anchor = document.createElement("a");
        anchor.href = mailtoUrl;
        anchor.click();

        toast.success(`Abriendo cliente de correo del sistema con ${validEmails.length} destinatario(s)...`);
    };

    // Send single email to a specific learner
    const handleSendDirectEmail = (report: CommitteeReportDTO) => {
        if (!report.studentEmail) {
            toast.error(`El aprendiz ${report.studentName} no tiene correo electrónico registrado.`);
            return;
        }

        const subject = encodeURIComponent(`Citación a Comité de Evaluación - ${report.processTitle}`);
        const body = encodeURIComponent(
            `Estimado(a) ${report.studentName},\n\n` +
            `Se le notifica que ha sido convocado(a) ante el Comité de Evaluación en el proceso «${report.processTitle}» con causal: ${report.faultType}.\n\n` +
            `Motivo registrado:\n"${report.reason}"\n\n` +
            `Por favor prepare sus descargos y evidencias correspondientes.\n\n` +
            `Atentamente,\n` +
            `Gestor Académico\n` +
            `SENA - Academix`
        );

        const mailtoUrl = `mailto:${report.studentEmail.trim()}?subject=${subject}&body=${body}`;
        const anchor = document.createElement("a");
        anchor.href = mailtoUrl;
        anchor.click();

        toast.success(`Abriendo cliente de correo para ${report.studentName}...`);
    };

    const handleExportExcel = async () => {
        if (filteredReports.length === 0) {
            toast.error("No hay aprendices reportados para exportar con los filtros actuales.");
            return;
        }
        try {
            const currentProc = processes.find((p) => p.id === (fixedProcessId || selectedProcessId));
            const fileName = currentProc
                ? `Reporte_${currentProc.title.replace(/[^a-zA-Z0-9_-]/g, "_")}`
                : "Reporte_General_Comite_Evaluacion";
            await exportCommitteeReportsToExcel(filteredReports, fileName);
            toast.success("Listado de aprendices reportados exportado a Excel.");
        } catch (err: any) {
            toast.error("Error al exportar a Excel.");
        }
    };

    return (
        <div className="space-y-4">
            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <div className="p-3 sm:p-3.5 rounded-2xl bg-card border border-border/70 shadow-2xs space-y-1">
                    <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block truncate">
                        Total Reportes
                    </span>
                    <div className="flex items-center gap-2">
                        <span className="text-lg sm:text-2xl font-black text-foreground">
                            {filteredReports.length}
                        </span>
                    </div>
                </div>

                <div className="p-3 sm:p-3.5 rounded-2xl bg-card border border-border/70 shadow-2xs space-y-1">
                    <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block truncate">
                        Aprendices Únicos
                    </span>
                    <div className="flex items-center gap-2">
                        <span className="text-lg sm:text-2xl font-black text-primary">
                            {uniqueStudentsCount}
                        </span>
                        <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                    </div>
                </div>

                <div className="p-3 sm:p-3.5 rounded-2xl bg-card border border-border/70 shadow-2xs space-y-1">
                    <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block truncate">
                        Faltas Académicas
                    </span>
                    <div className="flex items-center gap-2">
                        <span className="text-lg sm:text-2xl font-black text-blue-600 dark:text-blue-400">
                            {filteredReports.filter((r) => r.faultType === "ACADEMICO" || r.faultType === "MIXTO").length}
                        </span>
                    </div>
                </div>

                <div className="p-3 sm:p-3.5 rounded-2xl bg-card border border-border/70 shadow-2xs space-y-1">
                    <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block truncate">
                        Faltas Disciplinarias
                    </span>
                    <div className="flex items-center gap-2">
                        <span className="text-lg sm:text-2xl font-black text-rose-600 dark:text-rose-400">
                            {filteredReports.filter((r) => r.faultType === "DISCIPLINARIO" || r.faultType === "INASISTENCIA" || r.faultType === "MIXTO").length}
                        </span>
                    </div>
                </div>
            </div>

            {/* Controls & Filter Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-3.5 rounded-2xl border border-border/80 shadow-2xs">
                <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <Input
                            placeholder="Buscar por aprendiz, documento, ficha o instructor..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 h-9 text-xs rounded-xl"
                        />
                    </div>

                    {/* Filter by Process (only when not fixed) */}
                    {!fixedProcessId && (
                        <div className="w-full sm:w-56">
                            <Select value={selectedProcessId} onValueChange={setSelectedProcessId}>
                                <SelectTrigger className="h-9 text-xs rounded-xl">
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
                            <SelectTrigger className="h-9 text-xs rounded-xl">
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
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-start sm:justify-end shrink-0 pt-1 sm:pt-0">
                    {/* Send Email Button */}
                    <Button
                        type="button"
                        variant={selectedReportIds.length > 0 ? "default" : "outline"}
                        size="sm"
                        onClick={handleSendBulkEmail}
                        className={`h-9 px-3 text-xs rounded-xl gap-1.5 transition-all shadow-2xs flex-1 sm:flex-initial justify-center ${
                            selectedReportIds.length > 0
                                ? "bg-primary text-primary-foreground hover:bg-primary/90 font-semibold ring-2 ring-primary/20"
                                : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        }`}
                        title={
                            selectedReportIds.length > 0
                                ? `Abrir cliente de correo para ${selectedReportIds.length} aprendiz(ces) seleccionados`
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
                        className="h-9 px-3 text-xs rounded-xl gap-1.5 flex-initial"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                        <span className="hidden sm:inline">Refrescar</span>
                    </Button>

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleExportExcel}
                        className="h-9 px-3 text-xs rounded-xl gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 flex-1 sm:flex-initial justify-center"
                    >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Excel</span>
                    </Button>
                </div>
            </div>

            {/* Table Container */}
            <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs">
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
                            <TableHead className="text-xs font-bold">Aprendiz</TableHead>
                            <TableHead className="text-xs font-bold">Ficha / Grupo</TableHead>
                            {!hideProcessColumn && <TableHead className="text-xs font-bold">Proceso</TableHead>}
                            <TableHead className="text-xs font-bold">Causal</TableHead>
                            <TableHead className="text-xs font-bold">Reportado Por</TableHead>
                            <TableHead className="text-xs font-bold text-center">Evidencias</TableHead>
                            <TableHead className="text-xs font-bold">Fecha</TableHead>
                            <TableHead className="text-xs font-bold text-right pr-4">Acción</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={hideProcessColumn ? 9 : 10} className="h-40 text-center">
                                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
                                        <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                                        <span>Cargando aprendices reportados...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredReports.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={hideProcessColumn ? 9 : 10} className="h-40 text-center">
                                    <div className="flex flex-col items-center justify-center gap-1.5 text-muted-foreground text-xs">
                                        <AlertCircle className="w-6 h-6 text-muted-foreground/60" />
                                        <span className="font-semibold text-foreground">
                                            No hay aprendices reportados
                                        </span>
                                        <span className="text-[11px]">
                                            {searchTerm || (!fixedProcessId && selectedProcessId !== "all") || selectedFaultType !== "all"
                                                ? "No se encontraron reportes con los filtros aplicados."
                                                : "Aún no se han registrado reportes de aprendices en este proceso de comité."}
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

                                        {/* Ficha */}
                                        <TableCell>
                                            <span className="text-xs font-semibold text-foreground/90">
                                                {report.groupName}
                                            </span>
                                        </TableCell>

                                        {/* Process Title */}
                                        {!hideProcessColumn && (
                                            <TableCell>
                                                <p className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]" title={report.processTitle}>
                                                    {report.processTitle}
                                                </p>
                                            </TableCell>
                                        )}

                                        {/* Fault Type */}
                                        <TableCell>
                                            <Badge variant="outline" className={`text-[10px] py-0 px-2 border font-medium ${faultBadge}`}>
                                                {report.faultType}
                                            </Badge>
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

                                        {/* Date */}
                                        <TableCell className="text-[11px] text-muted-foreground font-mono" suppressHydrationWarning>
                                            {formatSafeDate(report.createdAt)}
                                        </TableCell>

                                        {/* Actions */}
                                        <TableCell className="text-right pr-4">
                                            <div className="flex items-center justify-end gap-1">
                                                {report.studentEmail && (
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleSendDirectEmail(report)}
                                                        className="h-7 w-7 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg"
                                                        title={`Enviar correo con app del sistema a ${report.studentEmail}`}
                                                    >
                                                        <Mail className="w-3.5 h-3.5" />
                                                    </Button>
                                                )}

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
                                                        onClick={() => {
                                                            if (confirm(`¿Eliminar el reporte del aprendiz ${report.studentName}?`)) {
                                                                onDeleteReport(report.id);
                                                            }
                                                        }}
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
