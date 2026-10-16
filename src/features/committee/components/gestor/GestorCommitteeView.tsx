"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
    Scale,
    Plus,
    Calendar,
    Users,
    FileText,
    Settings,
    Edit2,
    Trash2,
    CheckCircle2,
    XCircle,
    RefreshCw,
    AlertCircle,
    Layers,
    ArrowLeft,
    ArrowRight,
    School,
    Lock,
    Eye,
    User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
    getProcessesAction,
    createProcessAction,
    updateProcessAction,
    deleteProcessAction,
    getAllReportedStudentsAction,
    deleteReportAction
} from "../../actions/committeeActions";
import { getGestorProgramsAction } from "@/features/gestor/actions/gestorActions";
import { CommitteeProcessDTO, CommitteeReportDTO } from "../../types";
import { CommitteeProcessModal } from "./CommitteeProcessModal";
import { AllReportedLearnersTable } from "./AllReportedLearnersTable";
import {
    formatSafeDate,
    formatSafeShortDate,
    checkProcessDiligenceWindow
} from "../../utils/dateUtils";
import { useGestorProgram } from "@/features/gestor/context/GestorProgramContext";

interface GestorCommitteeViewProps {
    programId?: string;
    programName?: string;
    selectedProcessId?: string | null;
    onSelectProcess?: (processId: string | null) => void;
}

export function GestorCommitteeView({
    programId,
    programName,
    selectedProcessId: controlledProcessId,
    onSelectProcess
}: GestorCommitteeViewProps) {
    const {
        selectedProgramId,
        selectedProgram,
        managedPrograms,
        setManagedPrograms,
        selectProgram
    } = useGestorProgram();

    // Auto-fetch managed programs if empty so context is populated for this gestor
    useEffect(() => {
        if (managedPrograms.length === 0) {
            getGestorProgramsAction()
                .then((progs) => {
                    if (progs && progs.length > 0) {
                        const mapped = progs.map((p) => ({
                            id: p.id,
                            name: p.name,
                            color: (p as any).color || "#3b82f6",
                            code: (p as any).code || ""
                        }));
                        setManagedPrograms(mapped as any);
                    }
                })
                .catch(console.error);
        }
    }, [managedPrograms.length, setManagedPrograms]);

    const effectiveProgramId =
        selectedProgramId || programId || (managedPrograms.length > 0 ? managedPrograms[0].id : undefined);
    const effectiveProgramName =
        selectedProgram?.name ||
        managedPrograms.find((p) => p.id === effectiveProgramId)?.name ||
        programName ||
        "Área de Formación";

    const handleProgramChange = (newProgId: string) => {
        const found = managedPrograms.find((p) => p.id === newProgId);
        selectProgram(newProgId, found);
        setSelectedProcessId(null);
        loadData(newProgId);
    };

    const [processes, setProcesses] = useState<CommitteeProcessDTO[]>([]);
    const [reports, setReports] = useState<CommitteeReportDTO[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Selected process ID when entering a process (like the teacher view)
    const [internalProcessId, setInternalProcessId] = useState<string | null>(null);
    const selectedProcessId = controlledProcessId !== undefined ? controlledProcessId : internalProcessId;
    const setSelectedProcessId = onSelectProcess || setInternalProcessId;

    // Modal state for creating / editing committee processes
    const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
    const [processToEdit, setProcessToEdit] = useState<CommitteeProcessDTO | null>(null);

    const loadData = async (targetProgId?: string) => {
        const progId = targetProgId || effectiveProgramId;
        if (!progId) {
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            const [fetchedProcesses, fetchedReports] = await Promise.all([
                getProcessesAction(progId),
                getAllReportedStudentsAction({ programId: progId })
            ]);
            setProcesses(fetchedProcesses);
            setReports(fetchedReports);
        } catch (err: any) {
            console.error("Error cargando comités:", err);
            toast.error(err.message || "Error al cargar la información de comités.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (effectiveProgramId) {
            loadData(effectiveProgramId);
            setSelectedProcessId(null);
        }
    }, [effectiveProgramId]);

    const activeProcess = useMemo(() => {
        if (!selectedProcessId) return null;
        return processes.find((p) => p.id === selectedProcessId) || null;
    }, [processes, selectedProcessId]);

    const activeProcessDiligence = useMemo(() => {
        if (!activeProcess) return null;
        return checkProcessDiligenceWindow(activeProcess);
    }, [activeProcess]);

    // Reports of the entered process
    const activeProcessReports = useMemo(() => {
        if (!selectedProcessId) return [];
        return reports.filter((r) => r.processId === selectedProcessId);
    }, [reports, selectedProcessId]);

    const handleCreateOrUpdateProcess = async (data: any) => {
        if (!effectiveProgramId) {
            toast.error("Debes tener seleccionada un área de formación.");
            return;
        }

        if (processToEdit) {
            await updateProcessAction(processToEdit.id, data);
            toast.success("Proceso de comité actualizado correctamente.");
        } else {
            await createProcessAction({
                ...data,
                programId: effectiveProgramId
            });
            toast.success("Nuevo proceso de comité creado exitosamente.");
        }
        await loadData(effectiveProgramId);
    };

    const handleDeleteProcess = async (process: CommitteeProcessDTO) => {
        if (
            !confirm(
                `¿Estás seguro de eliminar el proceso «${process.title}»? Esta acción eliminará permanentemente todos los reportes de aprendices asociados a esta convocatoria.`
            )
        ) {
            return;
        }

        try {
            await deleteProcessAction(process.id);
            toast.success("Proceso de comité eliminado.");
            if (selectedProcessId === process.id) {
                setSelectedProcessId(null);
            }
            await loadData(effectiveProgramId);
        } catch (err: any) {
            toast.error(err.message || "Error al eliminar el proceso.");
        }
    };

    const handleToggleStatus = async (process: CommitteeProcessDTO) => {
        const newStatus = process.status === "OPEN" ? "CLOSED" : "OPEN";
        try {
            await updateProcessAction(process.id, { status: newStatus });
            toast.success(
                newStatus === "OPEN"
                    ? "Proceso reabierto para reportes de instructores."
                    : "Proceso cerrado."
            );
            await loadData(effectiveProgramId);
        } catch (err: any) {
            toast.error("Error al actualizar el estado del proceso.");
        }
    };

    const handleDeleteReport = async (reportId: string) => {
        try {
            await deleteReportAction(reportId);
            toast.success("Reporte de aprendiz eliminado.");
            await loadData(effectiveProgramId);
        } catch (err: any) {
            toast.error(err.message || "Error al eliminar reporte.");
        }
    };

    // ─────────────────────────────────────────────────────────────
    // VISTA 1: LISTADO DE PROCESOS (AL ENTRAR A LA HERRAMIENTA)
    // ─────────────────────────────────────────────────────────────
    if (!activeProcess) {
        return (
            <div className="space-y-6 animate-in fade-in duration-300">
                {/* Hero Banner Header */}
                <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/25 p-5 sm:p-7 shadow-2xs">
                    <Scale className="absolute -right-3 -bottom-6 w-36 h-36 text-amber-500/10 pointer-events-none select-none" />

                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
                        <div className="space-y-2 max-w-2xl">
                            <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 flex items-center justify-center text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-2xs shrink-0">
                                    <Scale className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                                            Comités de <span className="text-amber-600 dark:text-amber-400">Evaluación</span>
                                        </h1>
                                        <Badge
                                            variant="outline"
                                            className="text-[10px] py-0.5 px-2 bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25 font-bold uppercase tracking-wider"
                                        >
                                            Gestor Académico
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-1.5 pt-1">
                                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-background/80 border border-border/70 text-xs shadow-2xs">
                                            <div className="w-4 h-4 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                                                <School className="w-2.5 h-2.5" />
                                            </div>
                                            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                                                Área:
                                            </span>
                                            {managedPrograms.length > 1 ? (
                                                <Select
                                                    value={effectiveProgramId || ""}
                                                    onValueChange={handleProgramChange}
                                                >
                                                    <SelectTrigger className="h-6 text-xs font-bold border-0 bg-transparent shadow-none p-0 focus:ring-0 gap-1 text-foreground">
                                                        <SelectValue placeholder="Seleccionar Área" />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl">
                                                        {managedPrograms.map((p) => (
                                                            <SelectItem key={p.id} value={p.id} className="text-xs font-medium">
                                                                {p.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <span className="font-bold text-foreground text-xs">
                                                    {effectiveProgramName}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                                Administra los procesos de citación a comités de evaluación para el área de{" "}
                                <strong>{effectiveProgramName}</strong>. Todos los procesos de comité convocados en esta área son visibles y compartidos para todos los gestores académicos asignados. Crea nuevas convocatorias con fechas de diligenciamiento e ingresa a cada una para supervisar y auditar los aprendices reportados por los instructores.
                            </p>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-start sm:justify-end shrink-0">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => loadData(effectiveProgramId)}
                                disabled={isLoading}
                                className="h-10 px-3 text-xs gap-1.5 text-muted-foreground rounded-xl flex-1 sm:flex-initial justify-center"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                                <span className="inline">Actualizar</span>
                            </Button>

                            <Button
                                type="button"
                                onClick={() => {
                                    setProcessToEdit(null);
                                    setIsProcessModalOpen(true);
                                }}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-10 px-4 rounded-xl shadow-xs gap-1.5 flex-1 sm:flex-initial justify-center"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Nuevo Proceso</span>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Grid de Procesos de Comité */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                            Procesos de Comité Convocados en {effectiveProgramName}
                        </h2>
                        <span className="text-xs text-muted-foreground">
                            {processes.length} {processes.length === 1 ? "proceso registrado" : "procesos registrados"}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {processes.map((process) => {
                            const isOpen = process.status === "OPEN";
                            const diligence = checkProcessDiligenceWindow(process);

                            return (
                                <Card
                                    key={process.id}
                                    className="p-5 rounded-2xl border border-border/80 bg-card hover:border-amber-500/40 transition-all flex flex-col justify-between shadow-2xs space-y-4 hover:shadow-md"
                                >
                                    <div className="space-y-3">
                                        {/* Status badge & creation date */}
                                        <div className="flex items-start justify-between gap-2">
                                            <Badge
                                                className={`text-[10px] font-semibold gap-1.5 rounded-full px-2.5 py-0.5 border ${
                                                    isOpen
                                                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                                                        : "bg-muted text-muted-foreground border-border/80"
                                                }`}
                                            >
                                                <span
                                                    className={`w-1.5 h-1.5 rounded-full ${
                                                        isOpen ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"
                                                    }`}
                                                />
                                                {isOpen ? "Abierto para Reportes" : "Cerrado / Concluido"}
                                            </Badge>

                                            <span className="text-[10px] text-muted-foreground font-mono" suppressHydrationWarning>
                                                {formatSafeShortDate(process.createdAt)}
                                            </span>
                                        </div>

                                        {/* Process title & description */}
                                        <div className="space-y-1">
                                            <h3 className="text-sm font-bold text-foreground leading-snug line-clamp-2">
                                                {process.title}
                                            </h3>
                                            {process.description ? (
                                                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                                    {process.description}
                                                </p>
                                            ) : (
                                                <p className="text-xs text-muted-foreground/60 italic">
                                                    Sin observaciones adicionales.
                                                </p>
                                            )}
                                        </div>

                                        {/* Creator Gestor Badge */}
                                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-lg border border-border/50">
                                            <User className="w-3.5 h-3.5 text-primary shrink-0" />
                                            <span className="text-muted-foreground font-medium">Convocado por:</span>
                                            <span className="font-semibold text-foreground truncate">
                                                {process.createdByName || "Gestor Académico"}
                                            </span>
                                        </div>

                                        {/* Diligence dates range */}
                                        <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-xs space-y-1">
                                            <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                                                <span className="flex items-center gap-1 font-semibold text-foreground/80">
                                                    <Calendar className="w-3.5 h-3.5 text-primary" /> Plazo Instructores:
                                                </span>
                                                <span className="font-mono font-bold text-foreground" suppressHydrationWarning>
                                                    {formatSafeDate(process.startDate)} - {formatSafeDate(process.endDate)}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground leading-snug">
                                                {diligence.message}
                                            </p>
                                        </div>

                                        {/* Counters */}
                                        <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                                            <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60">
                                                <span className="text-[10px] text-muted-foreground block">
                                                    Total Reportes
                                                </span>
                                                <span className="text-base font-black text-foreground">
                                                    {process.reportsCount}
                                                </span>
                                            </div>
                                            <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60">
                                                <span className="text-[10px] text-muted-foreground block">
                                                    Aprendices
                                                </span>
                                                <span className="text-base font-black text-amber-600 dark:text-amber-400">
                                                    {process.uniqueStudentsCount}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action buttons: Enter process + Quick controls */}
                                    <div className="space-y-2 pt-2 border-t border-border/60">
                                        <Button
                                            type="button"
                                            onClick={() => setSelectedProcessId(process.id)}
                                            className="w-full text-xs font-semibold h-9 rounded-xl gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xs"
                                        >
                                            <span>Ingresar al Proceso</span>
                                            <ArrowRight className="w-3.5 h-3.5" />
                                        </Button>

                                        <div className="flex items-center justify-between pt-1 text-xs">
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleToggleStatus(process)}
                                                className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground rounded-lg"
                                            >
                                                {isOpen ? "Cerrar Convocatoria" : "Reabrir Convocatoria"}
                                            </Button>

                                            <div className="flex items-center gap-1">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => {
                                                        setProcessToEdit(process);
                                                        setIsProcessModalOpen(true);
                                                    }}
                                                    className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground rounded-lg gap-1"
                                                    title="Editar proceso"
                                                >
                                                    <Edit2 className="w-3 h-3" />
                                                    <span className="hidden sm:inline">Editar</span>
                                                </Button>

                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleDeleteProcess(process)}
                                                    className="h-7 px-2 text-[11px] text-destructive hover:bg-destructive/10 rounded-lg"
                                                    title="Eliminar proceso"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}

                        {processes.length === 0 && !isLoading && (
                            <div className="col-span-full py-16 text-center space-y-4 rounded-2xl border border-dashed border-border/80 bg-card p-6">
                                <Scale className="w-12 h-12 text-muted-foreground/60 mx-auto" />
                                <div className="space-y-1.5 max-w-md mx-auto">
                                    <h4 className="text-base font-bold text-foreground">
                                        No hay procesos de comité creados
                                    </h4>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        Crea el primer proceso de comité de evaluación para el área de{" "}
                                        <strong>{effectiveProgramName}</strong> para que los instructores puedan reportar sus casos.
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    onClick={() => {
                                        setProcessToEdit(null);
                                        setIsProcessModalOpen(true);
                                    }}
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-9 px-4 rounded-xl shadow-xs gap-1.5"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>Crear Primer Proceso</span>
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Modal para Crear / Editar Convocatoria */}
                <CommitteeProcessModal
                    isOpen={isProcessModalOpen}
                    onClose={() => {
                        setIsProcessModalOpen(false);
                        setProcessToEdit(null);
                    }}
                    onSubmit={handleCreateOrUpdateProcess}
                    processToEdit={processToEdit}
                    currentProgramId={effectiveProgramId}
                    programName={effectiveProgramName}
                />
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────
    // VISTA 2: DENTRO DEL PROCESO SELECCIONADO (TODO SE GESTIONA AQUÍ)
    // ─────────────────────────────────────────────────────────────
    const isProcessOpen = activeProcess.status === "OPEN";

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Process Header Banner */}
            <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-card border border-border/80 shadow-2xs space-y-4">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-2 max-w-3xl">
                        <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                                className={`text-[10px] font-semibold gap-1.5 rounded-full px-2.5 py-0.5 border ${
                                    isProcessOpen
                                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                                        : "bg-muted text-muted-foreground border-border/80"
                                }`}
                            >
                                <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                        isProcessOpen ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"
                                    }`}
                                />
                                {isProcessOpen ? "Proceso Abierto" : "Proceso Cerrado"}
                            </Badge>

                            <span className="text-xs text-muted-foreground font-mono" suppressHydrationWarning>
                                Plazo Instructores: {formatSafeDate(activeProcess.startDate)} - {formatSafeDate(activeProcess.endDate)}
                            </span>
                        </div>

                        <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                            {activeProcess.title}
                        </h1>

                        {activeProcess.description ? (
                            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                                {activeProcess.description}
                            </p>
                        ) : (
                            <p className="text-xs text-muted-foreground/60 italic">
                                Sin descripción u observaciones adicionales para este proceso.
                            </p>
                        )}

                        <div className="flex items-center gap-2 flex-wrap pt-1 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/50 border border-border/60 text-[11px]">
                                <User className="w-3.5 h-3.5 text-primary" />
                                <span>Convocado por:</span>
                                <strong className="text-foreground">{activeProcess.createdByName}</strong>
                                {activeProcess.createdByEmail && (
                                    <span className="text-muted-foreground/70 font-mono text-[10px]">
                                        ({activeProcess.createdByEmail})
                                    </span>
                                )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                <span>Estado para instructores: </span>
                                <strong className="text-foreground">{activeProcessDiligence?.message}</strong>
                            </div>
                        </div>
                    </div>

                    {/* Gestor Actions for this Process */}
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-start sm:justify-end shrink-0 pt-2 sm:pt-0">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => loadData(effectiveProgramId)}
                            disabled={isLoading}
                            className="h-9 px-2.5 text-xs gap-1.5 text-muted-foreground rounded-xl"
                            title="Actualizar datos"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                            <span className="hidden sm:inline">Actualizar</span>
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setProcessToEdit(activeProcess);
                                setIsProcessModalOpen(true);
                            }}
                            className="h-9 px-3 text-xs rounded-xl gap-1.5"
                        >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Editar Convocatoria</span>
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleStatus(activeProcess)}
                            className="h-9 px-3 text-xs rounded-xl gap-1.5"
                        >
                            {isProcessOpen ? (
                                <>
                                    <XCircle className="w-3.5 h-3.5 text-amber-500" />
                                    <span>Cerrar Convocatoria</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                    <span>Reabrir Convocatoria</span>
                                </>
                            )}
                        </Button>

                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteProcess(activeProcess)}
                            className="h-9 px-2.5 text-xs text-destructive hover:bg-destructive/10 rounded-xl"
                            title="Eliminar proceso"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Tabla de Aprendices Reportados en Este Proceso Específico */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        <h2 className="text-sm font-bold text-foreground">
                            Aprendices Reportados ante este Comité
                        </h2>
                    </div>
                    <Badge variant="outline" className="text-xs font-mono">
                        {activeProcessReports.length} {activeProcessReports.length === 1 ? "reporte" : "reportes"}
                    </Badge>
                </div>

                <AllReportedLearnersTable
                    reports={activeProcessReports}
                    processes={processes}
                    fixedProcessId={activeProcess.id}
                    hideProcessColumn={true}
                    isLoading={isLoading}
                    onRefresh={() => loadData(effectiveProgramId)}
                    onDeleteReport={handleDeleteReport}
                />
            </div>

            {/* Modal para Editar el Proceso Activo */}
            <CommitteeProcessModal
                isOpen={isProcessModalOpen}
                onClose={() => {
                    setIsProcessModalOpen(false);
                    setProcessToEdit(null);
                }}
                onSubmit={handleCreateOrUpdateProcess}
                processToEdit={processToEdit}
                currentProgramId={effectiveProgramId}
                programName={effectiveProgramName}
            />
        </div>
    );
}
