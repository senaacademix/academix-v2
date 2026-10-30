"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAppRefresh } from "@/lib/app-refresh";
import {
    Scale,
    Plus,
    Users,
    FileText,
    Link as LinkIcon,
    AlertCircle,
    CheckCircle2,
    Calendar,
    RefreshCw,
    FolderKanban,
    School,
    Lock,
    Eye,
    ArrowLeft,
    ArrowRight,
    Clock,
    XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
    getProcessesAction,
    getTeacherTrainingAreaGroupsAction,
    getTeacherReportsAction,
    createReportAction,
    updateReportAction,
    deleteReportAction
} from "../../actions/committeeActions";
import {
    CommitteeProcessDTO,
    CommitteeReportDTO,
    TrainingAreaGroupDTO,
    CreateCommitteeReportInput,
    UpdateCommitteeReportInput
} from "../../types";
import {
    formatSafeDate,
    formatSafeShortDate,
    checkProcessDiligenceWindow,
    isProcessInDiligenceWindow
} from "../../utils/dateUtils";
import { ReportLearnerModal } from "./ReportLearnerModal";
import { TeacherReportsTable } from "./TeacherReportsTable";

interface TeacherCommitteeViewProps {
    initialGroups?: any[];
    selectedProcessId?: string | null;
    onSelectProcess?: (processId: string | null) => void;
}

export function TeacherCommitteeView({
    initialGroups = [],
    selectedProcessId: controlledProcessId,
    onSelectProcess
}: TeacherCommitteeViewProps) {
    const [selectedProgramId, setSelectedProgramId] = useState<string>("");
    const [programs, setPrograms] = useState<{ id: string; name: string }[]>([]);
    const [processes, setProcesses] = useState<CommitteeProcessDTO[]>([]);
    const [trainingGroups, setTrainingGroups] = useState<TrainingAreaGroupDTO[]>([]);
    const [myReports, setMyReports] = useState<CommitteeReportDTO[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Selected process ID when the instructor enters a process
    const [internalProcessId, setInternalProcessId] = useState<string | null>(null);
    const selectedProcessId = controlledProcessId !== undefined ? controlledProcessId : internalProcessId;
    const setSelectedProcessId = onSelectProcess || setInternalProcessId;

    // Modal state for reporting / editing learners
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportToEdit, setReportToEdit] = useState<CommitteeReportDTO | null>(null);
    const [selectedGroupId, setSelectedGroupId] = useState<string>("");

    // Initial load of teacher programs
    useEffect(() => {
        let isMounted = true;
        const initPrograms = async () => {
            try {
                setIsLoading(true);
                const areaData = await getTeacherTrainingAreaGroupsAction();
                if (!isMounted) return;
                setPrograms(areaData.programs);
                if (areaData.programs.length > 0) {
                    setSelectedProgramId(areaData.programs[0].id);
                }
            } catch (err: any) {
                console.error("Error cargando programas del profesor:", err);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };
        initPrograms();
        return () => {
            isMounted = false;
        };
    }, []);

    // Load data specific to the selected program (Área de Formación)
    const loadProgramData = async (progId: string) => {
        if (!progId) return;
        try {
            setIsLoading(true);
            const [fetchedProcesses, areaData, fetchedReports] = await Promise.all([
                getProcessesAction(progId),
                getTeacherTrainingAreaGroupsAction(progId),
                getTeacherReportsAction({ programId: progId })
            ]);

            setProcesses(fetchedProcesses);
            setTrainingGroups(areaData.groups);
            setMyReports(fetchedReports);

            if (areaData.groups.length > 0) {
                setSelectedGroupId(areaData.groups[0].id);
            } else {
                setSelectedGroupId("");
            }
        } catch (err: any) {
            console.error("Error cargando datos de comités por área:", err);
            toast.error(err.message || "Error al cargar los datos del área.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (selectedProgramId) {
            loadProgramData(selectedProgramId);
            setSelectedProcessId(null);
        }
    }, [selectedProgramId]);

    useAppRefresh(async () => {
        if (selectedProgramId) {
            await loadProgramData(selectedProgramId);
        }
    });

    const currentProgram = useMemo(() => {
        return programs.find((p) => p.id === selectedProgramId) || programs[0] || null;
    }, [programs, selectedProgramId]);

    // Show only OPEN processes published by the Gestor
    const openProcesses = useMemo(() => {
        return processes.filter((p) => p.status === "OPEN");
    }, [processes]);

    // Currently entered process
    const activeProcess = useMemo(() => {
        if (!selectedProcessId) return null;
        return processes.find((p) => p.id === selectedProcessId) || null;
    }, [processes, selectedProcessId]);

    const activeProcessDiligence = useMemo(() => {
        if (!activeProcess) return null;
        return checkProcessDiligenceWindow(activeProcess);
    }, [activeProcess]);

    // Reports belonging to the entered process
    const activeProcessReports = useMemo(() => {
        if (!selectedProcessId) return [];
        return myReports.filter((r) => r.processId === selectedProcessId);
    }, [myReports, selectedProcessId]);

    const handleCreateReport = async (data: CreateCommitteeReportInput) => {
        await createReportAction(data);
        toast.success("Aprendiz reportado exitosamente a este comité.");
        if (selectedProgramId) {
            await loadProgramData(selectedProgramId);
        }
    };

    const handleUpdateReport = async (reportId: string, data: UpdateCommitteeReportInput) => {
        await updateReportAction(reportId, data);
        toast.success("Reporte actualizado correctamente.");
        if (selectedProgramId) {
            await loadProgramData(selectedProgramId);
        }
    };

    const handleDeleteReport = async (reportId: string) => {
        try {
            await deleteReportAction(reportId);
            toast.success("Reporte eliminado correctamente.");
            if (selectedProgramId) {
                await loadProgramData(selectedProgramId);
            }
        } catch (err: any) {
            toast.error(err.message || "Error al eliminar el reporte.");
        }
    };

    // ─────────────────────────────────────────────────────────────
    // VISTA 1: LISTADO DE PROCESOS ABIERTOS (AL ENTRAR A LA HERRAMIENTA)
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
                                            Instructor
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                                Selecciona un proceso de comité convocado por el Gestor Académico para ingresar y diligenciar los reportes de aprendices de tu área de formación.
                            </p>
                        </div>

                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto justify-start sm:justify-end shrink-0">
                            {programs.length > 1 && (
                                <div className="w-full sm:w-52">
                                    <Select value={selectedProgramId} onValueChange={(val) => setSelectedProgramId(val)}>
                                        <SelectTrigger className="h-9 text-xs font-semibold rounded-xl border-amber-500/30 bg-background/80 shadow-2xs">
                                            <SelectValue placeholder="Área..." />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            {programs.map((p) => (
                                                <SelectItem key={p.id} value={p.id} className="text-xs font-medium">
                                                    {p.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => selectedProgramId && loadProgramData(selectedProgramId)}
                                disabled={isLoading}
                                className="h-9 px-3 text-xs gap-1.5 text-muted-foreground rounded-xl flex-1 sm:flex-initial justify-center"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                                <span>Actualizar</span>
                            </Button>
                        </div>
                    </div>
                </div>


                {/* Grid de Procesos Abiertos para Ingresar */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                            Procesos de Comité Abiertos en {currentProgram?.name || "esta Área"}
                        </h2>
                        <span className="text-xs text-muted-foreground">
                            {openProcesses.length} {openProcesses.length === 1 ? "proceso disponible" : "procesos disponibles"}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {openProcesses.map((process) => {
                            const diligence = checkProcessDiligenceWindow(process);
                            const canEdit = diligence.canEdit;
                            const myReportsInProcess = myReports.filter((r) => r.processId === process.id).length;

                            return (
                                <Card
                                    key={process.id}
                                    onClick={() => setSelectedProcessId(process.id)}
                                    className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between shadow-2xs space-y-4 hover:shadow-md ${
                                        canEdit
                                            ? "border-emerald-500/35 hover:border-emerald-500 bg-card hover:bg-emerald-500/5"
                                            : "border-border/80 hover:border-amber-500/50 bg-card hover:bg-muted/30"
                                    }`}
                                >
                                    <div className="space-y-3">
                                        {/* Status badge & creation date */}
                                        <div className="flex items-start justify-between gap-2">
                                            {canEdit ? (
                                                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-semibold gap-1.5 rounded-full px-2.5 py-0.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                    <span>Habilitado para Reportar</span>
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 text-[10px] font-semibold gap-1.5 rounded-full px-2.5 py-0.5">
                                                    <Lock className="w-3 h-3" />
                                                    <span>Cerrado (Solo Lectura)</span>
                                                </Badge>
                                            )}

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

                                        {/* Status message */}
                                        <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 text-xs">
                                            <p className="text-[11px] text-muted-foreground leading-snug">
                                                {diligence.message}
                                            </p>
                                        </div>

                                        {/* Counter */}
                                        <div className="flex items-center justify-between text-xs pt-1 px-1">
                                            <span className="text-muted-foreground">Mis reportes:</span>
                                            <span className="font-bold text-foreground">
                                                {myReportsInProcess} {myReportsInProcess === 1 ? "aprendiz" : "aprendices"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action button to enter process */}
                                    <div className="pt-2 border-t border-border/60">
                                        <Button
                                            type="button"
                                            className={`w-full text-xs font-semibold h-9 rounded-xl gap-2 shadow-2xs ${
                                                canEdit
                                                    ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                                                    : "bg-muted hover:bg-muted/80 text-foreground"
                                            }`}
                                        >
                                            {canEdit ? (
                                                <>
                                                    <span>Ingresar y Diligenciar</span>
                                                    <ArrowRight className="w-3.5 h-3.5" />
                                                </>
                                            ) : (
                                                <>
                                                    <Eye className="w-3.5 h-3.5" />
                                                    <span>Ingresar (Solo Lectura)</span>
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </Card>
                            );
                        })}

                        {openProcesses.length === 0 && !isLoading && (
                            <div className="col-span-full py-16 text-center space-y-3 rounded-2xl border border-dashed border-border/80 bg-card">
                                <Scale className="w-10 h-10 text-muted-foreground/60 mx-auto" />
                                <div className="space-y-1">
                                    <h4 className="text-sm font-bold text-foreground">
                                        No hay procesos de comité abiertos
                                    </h4>
                                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                                        El Gestor Académico aún no ha publicado convocatorias de comité abiertas para el área de {currentProgram?.name || "esta formación"}.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────
    // VISTA 2: DENTRO DEL PROCESO SELECCIONADO (TODO SE GESTIONA AQUÍ)
    // ─────────────────────────────────────────────────────────────
    const canEditActiveProcess = activeProcessDiligence?.canEdit ?? false;

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Process Header Banner */}
            <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-card border border-border/80 shadow-2xs space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            {canEditActiveProcess ? (
                                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs font-semibold gap-1.5 rounded-full px-2.5 py-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span>Habilitado para Reportar</span>
                                </Badge>
                            ) : (
                                <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 text-xs font-semibold gap-1.5 rounded-full px-2.5 py-0.5">
                                    <Lock className="w-3.5 h-3.5" />
                                    <span>Modo Solo Lectura (Cerrado)</span>
                                </Badge>
                            )}
                        </div>

                        <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                            {activeProcess.title}
                        </h1>

                        {activeProcess.description && (
                            <p className="text-xs sm:text-sm text-muted-foreground max-w-3xl leading-relaxed">
                                {activeProcess.description}
                            </p>
                        )}
                    </div>

                    {/* Action buttons on the right */}
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-start sm:justify-end shrink-0 pt-1 sm:pt-0">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => selectedProgramId && loadProgramData(selectedProgramId)}
                            disabled={isLoading}
                            className="h-10 px-3 text-xs gap-1.5 text-muted-foreground rounded-xl flex-initial"
                            title="Actualizar datos"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                            <span className="inline">Actualizar</span>
                        </Button>

                        {canEditActiveProcess ? (
                            <Button
                                type="button"
                                onClick={() => {
                                    setReportToEdit(null);
                                    setIsReportModalOpen(true);
                                }}
                                disabled={trainingGroups.length === 0}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-10 px-4 rounded-xl shadow-xs gap-1.5 flex-1 sm:flex-initial justify-center"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Reportar Aprendiz</span>
                            </Button>
                        ) : (
                            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-medium w-full sm:w-auto">
                                <Lock className="w-4 h-4 shrink-0" />
                                <span>Plazo cerrado para nuevos reportes</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Read-only Alert if expired */}
                {!canEditActiveProcess && (
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                        <Lock className="w-4 h-4 shrink-0" />
                        <div>
                            <strong>Modo Solo Lectura:</strong> {activeProcessDiligence?.message} Solo puedes consultar los aprendices y evidencias ya registrados.
                        </div>
                    </div>
                )}
            </div>


            {/* Tabla de Aprendices Reportados en Este Proceso */}
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

                <TeacherReportsTable
                    reports={activeProcessReports}
                    isLoading={isLoading}
                    groups={trainingGroups}
                    onEditReport={(report) => {
                        setReportToEdit(report);
                        setIsReportModalOpen(true);
                    }}
                    onDeleteReport={handleDeleteReport}
                />
            </div>

            {/* Modal para reportar aprendiz a este proceso */}
            <ReportLearnerModal
                isOpen={isReportModalOpen}
                onClose={() => {
                    setIsReportModalOpen(false);
                    setReportToEdit(null);
                }}
                onSubmitCreate={handleCreateReport}
                onSubmitUpdate={handleUpdateReport}
                processes={processes}
                groups={trainingGroups}
                selectedGroupId={selectedGroupId}
                selectedProcessId={activeProcess.id}
                reportToEdit={reportToEdit}
                programName={currentProgram?.name}
            />
        </div>
    );
}
