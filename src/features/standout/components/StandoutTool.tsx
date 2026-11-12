"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAppRefresh } from "@/lib/app-refresh";
import {
    Trophy,
    ArrowLeft,
    ArrowRight,
    Plus,
    RefreshCw,
    School,
    User,
    Users,
    UserCheck,
    Edit2,
    Trash2,
    CheckCircle2,
    XCircle,
    Lock,
    Eye,
    Search,
    FileSpreadsheet,
    FileText,
    ExternalLink,
    GraduationCap,
    Sparkles,
    Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
    getStandoutProcessesAction,
    createStandoutProcessAction,
    updateStandoutProcessAction,
    deleteStandoutProcessAction,
    getAllStandoutNominationsAction,
    getTeacherStandoutAreaGroupsAction,
    getTeacherStandoutNominationsAction,
    createStandoutNominationAction,
    updateStandoutNominationAction,
    deleteStandoutNominationAction
} from "../actions/standoutActions";
import { getGestorProgramsAction } from "@/features/gestor/actions/gestorActions";
import { useGestorProgram } from "@/features/gestor/context/GestorProgramContext";
import {
    StandoutProcessDTO,
    StandoutNominationDTO,
    TrainingAreaGroupDTO,
    STANDOUT_CATEGORY_CONFIG,
    formatStandoutCategoryLabel,
    StandoutCategory,
    CreateStandoutNominationInput,
    UpdateStandoutNominationInput
} from "../types";
import { StandoutProcessModal } from "./StandoutProcessModal";
import { NominateLearnerModal } from "./NominateLearnerModal";
import {
    formatSafeShortDate,
    formatSafeDate,
    checkProcessDiligenceWindow
} from "@/features/committee/utils/dateUtils";
import { StudentAcademicRecordModal } from "@/features/committee/components/common/StudentAcademicRecordModal";
import {
    exportStandoutNominationsToExcel,
    exportStandoutNominationsToPdf
} from "../utils/standoutExportUtils";

interface StandoutToolProps {
    onBack: () => void;
    userRole?: string;
    initialGroups?: any[];
    programId?: string;
    programName?: string;
}

export function StandoutTool({
    onBack,
    userRole = "gestor",
    programId,
    programName
}: StandoutToolProps) {
    const isGestorOrAdmin = userRole === "gestor" || userRole === "admin";
    const [viewMode, setViewMode] = useState<"gestor" | "teacher">(
        isGestorOrAdmin ? "gestor" : "teacher"
    );
    const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);

    const handleRoleSwitch = (mode: "gestor" | "teacher") => {
        setViewMode(mode);
        setSelectedProcessId(null);
    };

    return (
        <div className="w-full flex-1 flex flex-col space-y-4 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border/80 shadow-2xs">
                {selectedProcessId ? (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedProcessId(null)}
                        className="h-9 px-3 text-xs font-semibold text-muted-foreground hover:text-foreground gap-1.5 rounded-xl w-full sm:w-auto justify-start"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Volver a Convocatorias de Destacados</span>
                    </Button>
                ) : (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onBack}
                        className="h-9 px-3 text-xs font-semibold text-muted-foreground hover:text-foreground gap-1.5 rounded-xl w-full sm:w-auto justify-start"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Volver al Centro de Herramientas</span>
                    </Button>
                )}

                {isGestorOrAdmin && (
                    <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl border border-border/60 w-full sm:w-auto justify-center sm:justify-start">
                        <Button
                            type="button"
                            size="sm"
                            variant={viewMode === "gestor" ? "default" : "ghost"}
                            onClick={() => handleRoleSwitch("gestor")}
                            className="flex-1 sm:flex-initial h-7 text-xs font-semibold rounded-lg px-2.5 gap-1.5 justify-center"
                        >
                            <Trophy className="w-3.5 h-3.5" />
                            <span>Panel Gestor</span>
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant={viewMode === "teacher" ? "default" : "ghost"}
                            onClick={() => handleRoleSwitch("teacher")}
                            className="flex-1 sm:flex-initial h-7 text-xs font-semibold rounded-lg px-2.5 gap-1.5 justify-center"
                        >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Modo Postulación (Instructor)</span>
                        </Button>
                    </div>
                )}
            </div>

            {viewMode === "gestor" && isGestorOrAdmin ? (
                <GestorStandoutView
                    programId={programId}
                    programName={programName}
                    selectedProcessId={selectedProcessId}
                    onSelectProcess={setSelectedProcessId}
                />
            ) : (
                <TeacherStandoutView
                    selectedProcessId={selectedProcessId}
                    onSelectProcess={setSelectedProcessId}
                />
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTE: VISTA DEL GESTOR ACADÉMICO
// ─────────────────────────────────────────────────────────────────────────────
function GestorStandoutView({
    programId,
    programName,
    selectedProcessId,
    onSelectProcess
}: {
    programId?: string;
    programName?: string;
    selectedProcessId: string | null;
    onSelectProcess: (id: string | null) => void;
}) {
    const {
        selectedProgramId,
        selectedProgram,
        managedPrograms,
        setManagedPrograms,
        selectProgram
    } = useGestorProgram();

    useEffect(() => {
        if (managedPrograms.length === 0) {
            getGestorProgramsAction()
                .then((progs) => {
                    if (progs && progs.length > 0) {
                        const mapped = progs.map((p) => ({
                            id: p.id,
                            name: p.name,
                            color: (p as any).color || "#0d9488",
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

    const [processes, setProcesses] = useState<StandoutProcessDTO[]>([]);
    const [nominations, setNominations] = useState<StandoutNominationDTO[]>([]);
    const [areaGroups, setAreaGroups] = useState<TrainingAreaGroupDTO[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
    const [processToEdit, setProcessToEdit] = useState<StandoutProcessDTO | null>(null);
    const [processToDelete, setProcessToDelete] = useState<StandoutProcessDTO | null>(null);
    const [isDeletingProcess, setIsDeletingProcess] = useState(false);

    const [isNominateModalOpen, setIsNominateModalOpen] = useState(false);
    const [nominationToEdit, setNominationToEdit] = useState<StandoutNominationDTO | null>(null);

    const loadData = async (targetProgId?: string) => {
        const progId = targetProgId || effectiveProgramId;
        if (!progId) {
            setIsLoading(false);
            return;
        }
        try {
            setIsLoading(true);
            const [fetchedProcesses, fetchedNominations, areaData] = await Promise.all([
                getStandoutProcessesAction(progId),
                getAllStandoutNominationsAction({ programId: progId }),
                getTeacherStandoutAreaGroupsAction(progId).catch(() => ({ groups: [] }))
            ]);
            setProcesses(fetchedProcesses);
            setNominations(fetchedNominations);
            setAreaGroups(areaData.groups || []);
        } catch (err: any) {
            toast.error(err.message || "Error al cargar las convocatorias de aprendices destacados.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (effectiveProgramId) {
            loadData(effectiveProgramId);
            onSelectProcess(null);
        }
    }, [effectiveProgramId]);

    useAppRefresh(async () => {
        if (effectiveProgramId) {
            await loadData(effectiveProgramId);
        }
    });

    const handleProgramChange = (newProgId: string) => {
        const found = managedPrograms.find((p) => p.id === newProgId);
        selectProgram(newProgId, found);
        onSelectProcess(null);
        loadData(newProgId);
    };

    const activeProcess = useMemo(() => {
        if (!selectedProcessId) return null;
        return processes.find((p) => p.id === selectedProcessId) || null;
    }, [processes, selectedProcessId]);

    const activeProcessNominations = useMemo(() => {
        if (!selectedProcessId) return [];
        return nominations.filter((n) => n.processId === selectedProcessId);
    }, [nominations, selectedProcessId]);

    const handleCreateOrUpdateProcess = async (data: any) => {
        if (!effectiveProgramId) {
            toast.error("Debes tener seleccionada un área de formación.");
            return;
        }
        if (processToEdit) {
            await updateStandoutProcessAction(processToEdit.id, data);
            toast.success("Convocatoria actualizada correctamente.");
        } else {
            await createStandoutProcessAction({
                ...data,
                programId: effectiveProgramId
            });
            toast.success("Nueva convocatoria de aprendices destacados creada.");
        }
        await loadData(effectiveProgramId);
    };

    const handleToggleStatus = async (process: StandoutProcessDTO) => {
        const newStatus = process.status === "OPEN" ? "CLOSED" : "OPEN";
        try {
            await updateStandoutProcessAction(process.id, { status: newStatus });
            toast.success(
                newStatus === "OPEN"
                    ? "Convocatoria reabierta para postulaciones."
                    : "Convocatoria cerrada."
            );
            await loadData(effectiveProgramId);
        } catch {
            toast.error("Error al actualizar el estado de la convocatoria.");
        }
    };

    if (!activeProcess) {
        return (
            <div className="space-y-6 animate-in fade-in duration-300">
                <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-teal-500/10 via-emerald-500/5 to-transparent border border-teal-500/25 p-5 sm:p-7 shadow-2xs">
                    <Trophy className="absolute -right-3 -bottom-6 w-36 h-36 text-teal-500/10 pointer-events-none select-none" />

                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
                        <div className="space-y-2 max-w-2xl">
                            <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-2xl bg-teal-500/15 flex items-center justify-center text-teal-600 dark:text-teal-400 border border-teal-500/30 shadow-2xs shrink-0">
                                    <Trophy className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                                            Aprendices <span className="text-teal-600 dark:text-teal-400">Destacados</span>
                                        </h1>
                                        <Badge
                                            variant="outline"
                                            className="text-[10px] py-0.5 px-2 bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/25 font-bold uppercase tracking-wider"
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
                                                <Select value={effectiveProgramId || ""} onValueChange={handleProgramChange}>
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
                                                <span className="font-bold text-foreground text-xs">{effectiveProgramName}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                                Crea convocatorias de postulación para el Cuadro de Honor y reconocimiento de aprendices sobresalientes en{" "}
                                <strong>{effectiveProgramName}</strong>. Los instructores podrán postular aprendices de sus fichas indicando sus logros, liderazgo y excelencia académica.
                            </p>
                        </div>

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
                                <span>Actualizar</span>
                            </Button>

                            <Button
                                type="button"
                                onClick={() => {
                                    setProcessToEdit(null);
                                    setIsProcessModalOpen(true);
                                }}
                                className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs h-10 px-4 rounded-xl shadow-xs gap-1.5 flex-1 sm:flex-initial justify-center"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Nueva Convocatoria</span>
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                            Convocatorias de Aprendices Destacados en {effectiveProgramName}
                        </h2>
                        <span className="text-xs text-muted-foreground">
                            {processes.length} {processes.length === 1 ? "convocatoria" : "convocatorias"}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {processes.map((process) => {
                            const isOpen = process.status === "OPEN";
                            return (
                                <Card
                                    key={process.id}
                                    className="p-5 rounded-2xl border border-border/80 bg-card hover:border-teal-500/40 transition-all flex flex-col justify-between shadow-2xs space-y-4 hover:shadow-md"
                                >
                                    <div className="space-y-3">
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
                                                {isOpen ? "Abierta para Postulaciones" : "Cerrada / Concluida"}
                                            </Badge>

                                            <span className="text-[10px] text-muted-foreground font-mono" suppressHydrationWarning>
                                                {formatSafeShortDate(process.createdAt)}
                                            </span>
                                        </div>

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
                                                    Sin instrucciones adicionales.
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-lg border border-border/50">
                                            <User className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                                            <span className="text-muted-foreground font-medium">Convocado por:</span>
                                            <span className="font-semibold text-foreground truncate">
                                                {process.createdByName || "Gestor Académico"}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                                            <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60">
                                                <span className="text-[10px] text-muted-foreground block">
                                                    Postulaciones
                                                </span>
                                                <span className="text-base font-black text-foreground">
                                                    {process.nominationsCount}
                                                </span>
                                            </div>
                                            <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60">
                                                <span className="text-[10px] text-muted-foreground block">
                                                    Aprendices
                                                </span>
                                                <span className="text-base font-black text-teal-600 dark:text-teal-400">
                                                    {process.uniqueStudentsCount}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2 pt-2 border-t border-border/60">
                                        <Button
                                            type="button"
                                            onClick={() => onSelectProcess(process.id)}
                                            className="w-full text-xs font-semibold h-9 rounded-xl gap-2 bg-teal-600 hover:bg-teal-700 text-white shadow-2xs"
                                        >
                                            <span>Ingresar a la Convocatoria</span>
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
                                                >
                                                    <Edit2 className="w-3 h-3" />
                                                    <span className="hidden sm:inline">Editar</span>
                                                </Button>

                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => setProcessToDelete(process)}
                                                    className="h-7 px-2 text-[11px] text-destructive hover:bg-destructive/10 rounded-lg"
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
                                <Trophy className="w-12 h-12 text-teal-600/60 mx-auto" />
                                <div className="space-y-1.5 max-w-md mx-auto">
                                    <h4 className="text-base font-bold text-foreground">
                                        No hay convocatorias de aprendices destacados
                                    </h4>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        Crea el primer proceso de postulación para el área de{" "}
                                        <strong>{effectiveProgramName}</strong> para que los instructores postulen a los aprendices más destacados de sus fichas.
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    onClick={() => {
                                        setProcessToEdit(null);
                                        setIsProcessModalOpen(true);
                                    }}
                                    className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs h-9 px-4 rounded-xl shadow-xs gap-1.5"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>Crear Primera Convocatoria</span>
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                <StandoutProcessModal
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

                <AlertDialog open={!!processToDelete} onOpenChange={(open) => !open && setProcessToDelete(null)}>
                    <AlertDialogContent className="max-w-md bg-card border-border/80">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-base font-bold text-foreground">
                                ¿Eliminar convocatoria de aprendices destacados?
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-xs text-muted-foreground">
                                Estás a punto de eliminar <strong className="text-foreground">«{processToDelete?.title}»</strong>. Se eliminarán todas las postulaciones registradas en esta convocatoria.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isDeletingProcess} className="h-9 text-xs">
                                Cancelar
                            </AlertDialogCancel>
                            <AlertDialogAction
                                disabled={isDeletingProcess}
                                onClick={async () => {
                                    if (!processToDelete) return;
                                    try {
                                        setIsDeletingProcess(true);
                                        await deleteStandoutProcessAction(processToDelete.id);
                                        toast.success("Convocatoria eliminada.");
                                        setProcessToDelete(null);
                                        await loadData(effectiveProgramId);
                                    } catch (err: any) {
                                        toast.error(err.message || "Error al eliminar la convocatoria.");
                                    } finally {
                                        setIsDeletingProcess(false);
                                    }
                                }}
                                className="h-9 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                {isDeletingProcess ? "Eliminando..." : "Eliminar"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        );
    }

    const isProcessOpen = activeProcess.status === "OPEN";

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
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
                                {isProcessOpen ? "Convocatoria Abierta" : "Convocatoria Cerrada"}
                            </Badge>
                        </div>

                        <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                            {activeProcess.title}
                        </h1>

                        {activeProcess.description && (
                            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                                {activeProcess.description}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-start sm:justify-end shrink-0">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => loadData(effectiveProgramId)}
                            disabled={isLoading}
                            className="h-9 px-2.5 text-xs gap-1.5 text-muted-foreground rounded-xl"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                            <span className="hidden sm:inline">Actualizar</span>
                        </Button>

                        {isProcessOpen && (
                            <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                    setNominationToEdit(null);
                                    setIsNominateModalOpen(true);
                                }}
                                className="h-9 px-3.5 text-xs rounded-xl gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Postular Aprendiz</span>
                            </Button>
                        )}

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
                            <span>Editar</span>
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
                                    <span>Cerrar</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                    <span>Reabrir</span>
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            <StandoutNominationsTable
                nominations={activeProcessNominations}
                processTitle={activeProcess.title}
                groups={areaGroups}
                isGestor={true}
                canModify={true}
                onRefresh={() => loadData(effectiveProgramId)}
                onEditNomination={(nom) => {
                    setNominationToEdit(nom);
                    setIsNominateModalOpen(true);
                }}
            />

            <StandoutProcessModal
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

            <NominateLearnerModal
                isOpen={isNominateModalOpen}
                onClose={() => {
                    setIsNominateModalOpen(false);
                    setNominationToEdit(null);
                }}
                onSubmitCreate={async (data) => {
                    await createStandoutNominationAction(data);
                    toast.success("Aprendiz postulado exitosamente.");
                    await loadData(effectiveProgramId);
                }}
                onSubmitUpdate={async (id, data) => {
                    await updateStandoutNominationAction(id, data);
                    toast.success("Postulación actualizada.");
                    await loadData(effectiveProgramId);
                }}
                processes={processes}
                groups={areaGroups}
                selectedProcessId={activeProcess.id}
                nominationToEdit={nominationToEdit}
            />
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTE: VISTA DEL INSTRUCTOR
// ─────────────────────────────────────────────────────────────────────────────
function TeacherStandoutView({
    selectedProcessId,
    onSelectProcess
}: {
    selectedProcessId: string | null;
    onSelectProcess: (id: string | null) => void;
}) {
    const [selectedProgramId, setSelectedProgramId] = useState<string>("");
    const [programs, setPrograms] = useState<{ id: string; name: string }[]>([]);
    const [processes, setProcesses] = useState<StandoutProcessDTO[]>([]);
    const [trainingGroups, setTrainingGroups] = useState<TrainingAreaGroupDTO[]>([]);
    const [myNominations, setMyNominations] = useState<StandoutNominationDTO[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isNominateModalOpen, setIsNominateModalOpen] = useState(false);
    const [nominationToEdit, setNominationToEdit] = useState<StandoutNominationDTO | null>(null);

    useEffect(() => {
        let isMounted = true;
        getTeacherStandoutAreaGroupsAction()
            .then((areaData) => {
                if (!isMounted) return;
                setPrograms(areaData.programs);
                if (areaData.programs.length > 0) {
                    setSelectedProgramId(areaData.programs[0].id);
                } else {
                    setIsLoading(false);
                }
            })
            .catch(() => {
                if (isMounted) setIsLoading(false);
            });
        return () => {
            isMounted = false;
        };
    }, []);

    const loadProgramData = async (progId: string) => {
        if (!progId) return;
        try {
            setIsLoading(true);
            const [fetchedProcesses, areaData, fetchedNominations] = await Promise.all([
                getStandoutProcessesAction(progId),
                getTeacherStandoutAreaGroupsAction(progId),
                getTeacherStandoutNominationsAction({ programId: progId })
            ]);
            setProcesses(fetchedProcesses);
            setTrainingGroups(areaData.groups);
            setMyNominations(fetchedNominations);
        } catch (err: any) {
            toast.error(err.message || "Error al cargar las convocatorias.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (selectedProgramId) {
            loadProgramData(selectedProgramId);
            onSelectProcess(null);
        }
    }, [selectedProgramId]);

    useAppRefresh(async () => {
        if (selectedProgramId) {
            await loadProgramData(selectedProgramId);
        }
    });

    const currentProgram = useMemo(
        () => programs.find((p) => p.id === selectedProgramId) || programs[0] || null,
        [programs, selectedProgramId]
    );

    const openProcesses = useMemo(
        () => processes.filter((p) => p.status === "OPEN"),
        [processes]
    );

    const activeProcess = useMemo(() => {
        if (!selectedProcessId) return null;
        return processes.find((p) => p.id === selectedProcessId) || null;
    }, [processes, selectedProcessId]);

    const activeProcessDiligence = useMemo(() => {
        if (!activeProcess) return null;
        return checkProcessDiligenceWindow(activeProcess);
    }, [activeProcess]);

    const activeProcessNominations = useMemo(() => {
        if (!selectedProcessId) return [];
        return myNominations.filter((n) => n.processId === selectedProcessId);
    }, [myNominations, selectedProcessId]);

    if (!activeProcess) {
        return (
            <div className="space-y-6 animate-in fade-in duration-300">
                <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-teal-500/10 via-emerald-500/5 to-transparent border border-teal-500/25 p-5 sm:p-7 shadow-2xs">
                    <Trophy className="absolute -right-3 -bottom-6 w-36 h-36 text-teal-500/10 pointer-events-none select-none" />

                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
                        <div className="space-y-2 max-w-2xl">
                            <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-2xl bg-teal-500/15 flex items-center justify-center text-teal-600 dark:text-teal-400 border border-teal-500/30 shadow-2xs shrink-0">
                                    <Trophy className="w-5 h-5" />
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                                        Postulación de <span className="text-teal-600 dark:text-teal-400">Aprendices Destacados</span>
                                    </h1>
                                    <Badge
                                        variant="outline"
                                        className="text-[10px] py-0.5 px-2 bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/25 font-bold uppercase tracking-wider"
                                    >
                                        Instructor
                                    </Badge>
                                </div>
                            </div>

                            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                                Selecciona una convocatoria abierta por el Gestor Académico para postular aprendices sobresalientes de tus fichas por excelencia académica, liderazgo, innovación o compromiso.
                            </p>
                        </div>

                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto justify-start sm:justify-end shrink-0">
                            {programs.length > 1 && (
                                <div className="w-full sm:w-52">
                                    <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
                                        <SelectTrigger className="h-9 text-xs font-semibold rounded-xl border-teal-500/30 bg-background/80 shadow-2xs">
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
                                className="h-9 px-3 text-xs gap-1.5 text-muted-foreground rounded-xl"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                                <span>Actualizar</span>
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                            Convocatorias Abiertas en {currentProgram?.name || "esta Área"}
                        </h2>
                        <span className="text-xs text-muted-foreground">
                            {openProcesses.length} {openProcesses.length === 1 ? "convocatoria disponible" : "convocatorias disponibles"}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {openProcesses.map((process) => {
                            const diligence = checkProcessDiligenceWindow(process);
                            const canEdit = diligence.canEdit;
                            const myCount = myNominations.filter((n) => n.processId === process.id).length;

                            return (
                                <Card
                                    key={process.id}
                                    onClick={() => onSelectProcess(process.id)}
                                    className="p-5 rounded-2xl border border-teal-500/35 hover:border-teal-500 bg-card hover:bg-teal-500/5 transition-all cursor-pointer flex flex-col justify-between shadow-2xs space-y-4 hover:shadow-md"
                                >
                                    <div className="space-y-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-semibold gap-1.5 rounded-full px-2.5 py-0.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                <span>Habilitada para Postular</span>
                                            </Badge>

                                            <span className="text-[10px] text-muted-foreground font-mono" suppressHydrationWarning>
                                                {formatSafeShortDate(process.createdAt)}
                                            </span>
                                        </div>

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
                                                    Sin instrucciones adicionales.
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between text-xs pt-1 px-1">
                                            <span className="text-muted-foreground">Mis postulaciones:</span>
                                            <span className="font-bold text-teal-600 dark:text-teal-400">
                                                {myCount} {myCount === 1 ? "aprendiz" : "aprendices"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="pt-2 border-t border-border/60">
                                        <Button
                                            type="button"
                                            className="w-full text-xs font-semibold h-9 rounded-xl gap-2 bg-teal-600 hover:bg-teal-700 text-white shadow-2xs"
                                        >
                                            {canEdit ? (
                                                <>
                                                    <span>Ingresar y Postular</span>
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
                                <Trophy className="w-10 h-10 text-muted-foreground/60 mx-auto" />
                                <div className="space-y-1">
                                    <h4 className="text-sm font-bold text-foreground">
                                        No hay convocatorias abiertas en este momento
                                    </h4>
                                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                                        El Gestor Académico aún no ha publicado convocatorias abiertas para postular aprendices destacados en {currentProgram?.name || "esta área"}.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    const canEditActiveProcess = activeProcessDiligence?.canEdit ?? false;

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-card border border-border/80 shadow-2xs space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            {canEditActiveProcess ? (
                                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs font-semibold gap-1.5 rounded-full px-2.5 py-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span>Habilitada para Postular</span>
                                </Badge>
                            ) : (
                                <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 text-xs font-semibold gap-1.5 rounded-full px-2.5 py-0.5">
                                    <Lock className="w-3.5 h-3.5" />
                                    <span>Cerrada (Solo Lectura)</span>
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

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-start sm:justify-end shrink-0">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => selectedProgramId && loadProgramData(selectedProgramId)}
                            disabled={isLoading}
                            className="h-10 px-3 text-xs gap-1.5 text-muted-foreground rounded-xl"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                            <span>Actualizar</span>
                        </Button>

                        {canEditActiveProcess && (
                            <Button
                                type="button"
                                onClick={() => {
                                    setNominationToEdit(null);
                                    setIsNominateModalOpen(true);
                                }}
                                disabled={trainingGroups.length === 0}
                                className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs h-10 px-4 rounded-xl shadow-xs gap-1.5"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Postular Aprendiz Destacado</span>
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <StandoutNominationsTable
                nominations={activeProcessNominations}
                processTitle={activeProcess.title}
                groups={trainingGroups}
                isGestor={false}
                canModify={canEditActiveProcess}
                onRefresh={() => selectedProgramId && loadProgramData(selectedProgramId)}
                onEditNomination={(nom) => {
                    setNominationToEdit(nom);
                    setIsNominateModalOpen(true);
                }}
            />

            <NominateLearnerModal
                isOpen={isNominateModalOpen}
                onClose={() => {
                    setIsNominateModalOpen(false);
                    setNominationToEdit(null);
                }}
                onSubmitCreate={async (data: CreateStandoutNominationInput) => {
                    await createStandoutNominationAction(data);
                    toast.success("Aprendiz postulado exitosamente.");
                    if (selectedProgramId) await loadProgramData(selectedProgramId);
                }}
                onSubmitUpdate={async (id: string, data: UpdateStandoutNominationInput) => {
                    await updateStandoutNominationAction(id, data);
                    toast.success("Postulación actualizada correctamente.");
                    if (selectedProgramId) await loadProgramData(selectedProgramId);
                }}
                processes={processes}
                groups={trainingGroups}
                selectedProcessId={activeProcess.id}
                nominationToEdit={nominationToEdit}
            />
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// TABLA COMPARTIDA DE APRENDICES POSTULADOS
// ─────────────────────────────────────────────────────────────────────────────
interface ConsolidatedStudentRow {
    key: string;
    primary: StandoutNominationDTO;
    nominations: StandoutNominationDTO[];
}

function StandoutNominationsTable({
    nominations,
    processTitle,
    groups,
    isGestor,
    canModify,
    onRefresh,
    onEditNomination
}: {
    nominations: StandoutNominationDTO[];
    processTitle: string;
    groups: TrainingAreaGroupDTO[];
    isGestor: boolean;
    canModify: boolean;
    onRefresh: () => void;
    onEditNomination: (nom: StandoutNominationDTO) => void;
}) {
    const [searchTerm, setSearchTerm] = useState("");
    const [groupFilter, setGroupFilter] = useState("all");
    const [categoryFilter, setCategoryFilter] = useState("all");

    const [detailRow, setDetailRow] = useState<ConsolidatedStudentRow | null>(null);
    const [academicRecordNomination, setAcademicRecordNomination] = useState<StandoutNominationDTO | null>(null);
    const [rowToDelete, setRowToDelete] = useState<ConsolidatedStudentRow | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const normalizeSearch = (str: string) =>
        (str || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();

    const availableFichas = useMemo(() => {
        const map = new Map<string, string>();
        groups.forEach((g) => {
            if (!g.categoria || g.categoria.toUpperCase() === "LECTIVA") {
                map.set(g.id, g.name);
            }
        });
        nominations.forEach((n) => {
            if (n.groupId && !map.has(n.groupId)) {
                map.set(n.groupId, n.groupName);
            }
        });
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [groups, nominations]);

    // En la vista del Gestor agrupamos por aprendiz (studentId) para mostrarlo una única vez
    const consolidatedRows = useMemo<ConsolidatedStudentRow[]>(() => {
        if (!isGestor) {
            return nominations.map((nom) => ({
                key: nom.id,
                primary: nom,
                nominations: [nom]
            }));
        }

        const studentMap = new Map<string, StandoutNominationDTO[]>();
        for (const nom of nominations) {
            const key = nom.studentId || nom.id;
            const list = studentMap.get(key) || [];
            list.push(nom);
            studentMap.set(key, list);
        }

        const allRows: ConsolidatedStudentRow[] = Array.from(studentMap.entries()).map(([studentId, list]) => {
            // Priorizar como primary alguna que tenga decisión de reconocimiento si existe
            const withDecision = list.find((n) => n.recognitionDecision);
            return {
                key: studentId,
                primary: withDecision || list[0],
                nominations: list
            };
        });

        return allRows.filter((row) => {
            const p = row.primary;
            const matchesGroup = groupFilter === "all" || p.groupId === groupFilter;
            const matchesCategory =
                categoryFilter === "all" || row.nominations.some((n) => n.category === categoryFilter);

            const term = normalizeSearch(searchTerm);
            const matchesSearch =
                !term ||
                normalizeSearch(p.studentName).includes(term) ||
                (p.studentDocument && normalizeSearch(p.studentDocument).includes(term)) ||
                normalizeSearch(p.groupName).includes(term) ||
                row.nominations.some(
                    (n) =>
                        normalizeSearch(n.nominatedByName).includes(term) ||
                        normalizeSearch(n.reason).includes(term) ||
                        (n.achievements && normalizeSearch(n.achievements).includes(term))
                );

            return matchesGroup && matchesCategory && matchesSearch;
        });
    }, [nominations, isGestor, groupFilter, categoryFilter, searchTerm]);

    // Lista plana de las postulaciones visibles para exportar a Excel / PDF
    const visibleNominationsForExport = useMemo(() => {
        return consolidatedRows.flatMap((r) => r.nominations);
    }, [consolidatedRows]);

    return (
        <div className="space-y-4">
            {/* Filters & Export Bar (Solo Gestor) */}
            {isGestor && (
                <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-3">
                    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
                            <div className="relative flex-1 min-w-[200px]">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Buscar por aprendiz, documento, ficha o instructor..."
                                    className="h-9 pl-9 text-xs rounded-xl"
                                />
                            </div>

                            <Select value={groupFilter} onValueChange={setGroupFilter}>
                                <SelectTrigger className="h-9 text-xs rounded-xl w-full sm:w-44">
                                    <SelectValue placeholder="Todas las fichas" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl max-h-60">
                                    <SelectItem value="all" className="text-xs">Todas las fichas</SelectItem>
                                    {availableFichas.map((f) => (
                                        <SelectItem key={f.id} value={f.id} className="text-xs">
                                            Ficha {f.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                <SelectTrigger className="h-9 text-xs rounded-xl w-full sm:w-48">
                                    <SelectValue placeholder="Todas las categorías" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="all" className="text-xs">Todas las categorías</SelectItem>
                                    {(Object.keys(STANDOUT_CATEGORY_CONFIG) as StandoutCategory[]).map((cat) => (
                                        <SelectItem key={cat} value={cat} className="text-xs">
                                            {STANDOUT_CATEGORY_CONFIG[cat].icon} {STANDOUT_CATEGORY_CONFIG[cat].label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={visibleNominationsForExport.length === 0}
                                onClick={() => exportStandoutNominationsToExcel(visibleNominationsForExport, processTitle)}
                                className="h-9 text-xs font-semibold rounded-xl gap-1.5 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
                            >
                                <FileSpreadsheet className="w-3.5 h-3.5" />
                                <span>Excel</span>
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={visibleNominationsForExport.length === 0}
                                onClick={() => exportStandoutNominationsToPdf(visibleNominationsForExport, processTitle)}
                                className="h-9 text-xs font-semibold rounded-xl gap-1.5 border-rose-500/40 text-rose-700 dark:text-rose-300 hover:bg-rose-500/10"
                            >
                                <FileText className="w-3.5 h-3.5" />
                                <span>PDF</span>
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/40">
                                <TableHead className="text-xs font-bold">Aprendiz Postulado</TableHead>
                                <TableHead className="text-xs font-bold">Ficha / Horario</TableHead>
                                <TableHead className="text-xs font-bold">Categoría de Mérito</TableHead>
                                <TableHead className="text-xs font-bold">Motivo de la Postulación</TableHead>
                                {isGestor && <TableHead className="text-xs font-bold">Postulado por</TableHead>}
                                <TableHead className="text-xs font-bold text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {consolidatedRows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={isGestor ? 6 : 5} className="py-12 text-center text-xs text-muted-foreground">
                                        {isGestor
                                            ? "No hay aprendices postulados que coincidan con los filtros seleccionados."
                                            : "Aún no has postulado aprendices en esta convocatoria."}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                consolidatedRows.map((row) => {
                                    const nom = row.primary;
                                    const allNoms = row.nominations;
                                    const isMultiple = allNoms.length > 1;

                                    // Categorías únicas
                                    const uniqueCategories = Array.from(
                                        new Map(
                                            allNoms.map((n) => [
                                                `${n.category}:${n.customCategory || ""}`,
                                                { category: n.category, customCategory: n.customCategory }
                                            ])
                                        ).values()
                                    );

                                    // Instructores que postularon al aprendiz
                                    const uniqueInstructors = Array.from(
                                        new Map(
                                            allNoms.map((n) => [
                                                n.nominatedById || n.nominatedByName,
                                                {
                                                    id: n.nominatedById,
                                                    name: n.nominatedByName,
                                                    createdAt: n.createdAt
                                                }
                                            ])
                                        ).values()
                                    );

                                    const firstEvidenceUrl = allNoms.find((n) => n.evidenceUrl)?.evidenceUrl || null;
                                    const nonEmptyReasons = allNoms.filter((n) => n.reason && n.reason.trim().length > 0);
                                    const nonEmptyAchievements = allNoms.filter(
                                        (n) => n.achievements && n.achievements.trim().length > 0
                                    );

                                    return (
                                        <TableRow key={row.key} className="hover:bg-muted/20">
                                            <TableCell>
                                                <div className="flex items-center gap-2.5">
                                                    <Avatar className="w-8 h-8 border border-border/80 shrink-0">
                                                        <AvatarImage src={nom.studentImage || undefined} />
                                                        <AvatarFallback className="text-[10px] font-bold bg-teal-500/15 text-teal-700 dark:text-teal-300">
                                                            {nom.studentName.slice(0, 2).toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="min-w-0 space-y-0.5">
                                                        <p className="text-xs font-bold text-foreground truncate">{nom.studentName}</p>
                                                        <p className="text-[10px] text-muted-foreground font-mono">
                                                            Doc: {nom.studentDocument || "S/I"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </TableCell>

                                            <TableCell>
                                                <div className="space-y-0.5">
                                                    <Badge variant="outline" className="text-[10px] font-bold">
                                                        Ficha {nom.groupName}
                                                    </Badge>
                                                    {nom.groupSchedule && (
                                                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                            <Clock className="w-2.5 h-2.5 shrink-0" />
                                                            <span className="truncate max-w-[160px]">{nom.groupSchedule}</span>
                                                        </p>
                                                    )}
                                                </div>
                                            </TableCell>

                                            <TableCell>
                                                <div className="flex flex-wrap gap-1 max-w-[210px]">
                                                    {uniqueCategories.map((c, idx) => {
                                                        const catInfo =
                                                            STANDOUT_CATEGORY_CONFIG[c.category] ||
                                                            STANDOUT_CATEGORY_CONFIG.EXCELENCIA_ACADEMICA;
                                                        const catLabel = formatStandoutCategoryLabel(c.category, c.customCategory);
                                                        return (
                                                            <Badge
                                                                key={idx}
                                                                variant="outline"
                                                                className={`text-[10px] font-semibold border ${catInfo.badgeClass}`}
                                                            >
                                                                {catInfo.icon} {catLabel}
                                                            </Badge>
                                                        );
                                                    })}
                                                </div>
                                            </TableCell>

                                            <TableCell className="max-w-[280px]">
                                                {nonEmptyReasons.length > 0 ? (
                                                    <div className="space-y-1">
                                                        {nonEmptyReasons.slice(0, 2).map((n) => (
                                                            <p key={n.id} className="text-xs text-foreground line-clamp-2 leading-snug">
                                                                {isMultiple && (
                                                                    <span className="font-semibold text-teal-700 dark:text-teal-300 mr-1">
                                                                        {n.nominatedByName.split(" ")[0]}:
                                                                    </span>
                                                                )}
                                                                {n.reason}
                                                            </p>
                                                        ))}
                                                        {nonEmptyReasons.length > 2 && (
                                                            <p className="text-[10px] text-muted-foreground font-medium">
                                                                +{nonEmptyReasons.length - 2} motivo(s) más...
                                                            </p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-muted-foreground italic">Sin motivo adicional</p>
                                                )}
                                                {nonEmptyAchievements.length > 0 && (
                                                    <p className="text-[10px] text-teal-600 dark:text-teal-400 line-clamp-1 mt-0.5 font-medium">
                                                        ✨ {nonEmptyAchievements[0].achievements}
                                                    </p>
                                                )}
                                            </TableCell>

                                            {isGestor && (
                                                <TableCell>
                                                    <div className="flex items-center gap-1.5">
                                                        <Badge
                                                            variant="outline"
                                                            className="text-xs font-semibold bg-muted/40 border-border/60 px-2.5 py-0.5"
                                                        >
                                                            {uniqueInstructors.length}{" "}
                                                            {uniqueInstructors.length === 1 ? "instructor" : "instructores"}
                                                        </Badge>

                                                        <TooltipProvider delayDuration={100}>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        type="button"
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        className="h-7 w-7 rounded-lg text-teal-600 dark:text-teal-400 hover:bg-teal-500/10"
                                                                    >
                                                                        <Users className="w-3.5 h-3.5" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent
                                                                    side="top"
                                                                    align="center"
                                                                    className="p-2.5 space-y-1.5 max-w-xs"
                                                                >
                                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60 pb-1">
                                                                        Instructores que postularon ({uniqueInstructors.length})
                                                                    </p>
                                                                    <div className="space-y-1">
                                                                        {uniqueInstructors.map((inst, idx) => (
                                                                            <div
                                                                                key={inst.id || idx}
                                                                                className="flex items-center justify-between gap-3 text-xs"
                                                                            >
                                                                                <span className="font-semibold text-foreground">
                                                                                    • {inst.name}
                                                                                </span>
                                                                                <span className="text-[10px] text-muted-foreground font-normal shrink-0">
                                                                                    {formatSafeShortDate(inst.createdAt)}
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    </div>
                                                </TableCell>
                                            )}

                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {firstEvidenceUrl && (
                                                        <Button
                                                            type="button"
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => window.open(firstEvidenceUrl, "_blank", "noopener,noreferrer")}
                                                            className="h-8 w-8 text-blue-600 dark:text-blue-400"
                                                            title="Ver portafolio / evidencia"
                                                        >
                                                            <ExternalLink className="w-3.5 h-3.5" />
                                                        </Button>
                                                    )}

                                                    <Button
                                                        type="button"
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={() => setAcademicRecordNomination(nom)}
                                                        className="h-8 w-8 text-primary"
                                                        title="Ver registro académico del aprendiz"
                                                    >
                                                        <GraduationCap className="w-4 h-4" />
                                                    </Button>

                                                    {!isGestor && (
                                                        <Button
                                                            type="button"
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => setDetailRow(row)}
                                                            className="h-8 w-8 text-teal-600 dark:text-teal-400"
                                                            title="Ver detalle completo de la postulación"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                    )}

                                                    {canModify && (
                                                        <>
                                                            {!isGestor && (
                                                                <Button
                                                                    type="button"
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    onClick={() => onEditNomination(nom)}
                                                                    className="h-8 w-8 text-amber-600"
                                                                    title="Editar postulación"
                                                                >
                                                                    <Edit2 className="w-3.5 h-3.5" />
                                                                </Button>
                                                            )}
                                                            <Button
                                                                type="button"
                                                                size="icon"
                                                                variant="ghost"
                                                                onClick={() => setRowToDelete(row)}
                                                                className="h-8 w-8 text-destructive"
                                                                title="Eliminar postulación"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </>
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
            </div>

            {/* Modal de Detalle de Postulación */}
            <Dialog open={!!detailRow} onOpenChange={(open) => !open && setDetailRow(null)}>
                <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border-border/80">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base font-bold">
                            <Trophy className="w-5 h-5 text-teal-600" />
                            <span>Detalle de Postulación — Aprendiz Destacado</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Ficha {detailRow?.primary.groupName} •{" "}
                            {detailRow && detailRow.nominations.length > 1
                                ? `${detailRow.nominations.length} instructores postularon a este aprendiz`
                                : `Postulado por ${detailRow?.primary.nominatedByName}`}
                        </DialogDescription>
                    </DialogHeader>

                    {detailRow && (
                        <div className="space-y-4 text-xs">
                            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-bold text-foreground">{detailRow.primary.studentName}</p>
                                    <p className="text-[11px] text-muted-foreground font-mono">
                                        Doc: {detailRow.primary.studentDocument || "S/I"} • {detailRow.primary.studentEmail}
                                    </p>
                                </div>
                                <Badge variant="outline" className="text-[10px] font-bold">
                                    Ficha {detailRow.primary.groupName}
                                </Badge>
                            </div>

                            <div className="space-y-3">
                                <span className="font-bold text-foreground block">
                                    {detailRow.nominations.length > 1
                                        ? `Postulaciones Registradas (${detailRow.nominations.length}):`
                                        : "Detalle de la Postulación:"}
                                </span>

                                {detailRow.nominations.map((item) => {
                                    const catInfo =
                                        STANDOUT_CATEGORY_CONFIG[item.category] ||
                                        STANDOUT_CATEGORY_CONFIG.EXCELENCIA_ACADEMICA;
                                    const catLabel = formatStandoutCategoryLabel(item.category, item.customCategory);

                                    return (
                                        <div
                                            key={item.id}
                                            className="p-3.5 rounded-xl bg-muted/25 border border-border/60 space-y-2.5"
                                        >
                                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                                <div>
                                                    <p className="text-xs font-bold text-foreground">
                                                        Instructor: {item.nominatedByName}
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground">
                                                        {formatSafeDate(item.createdAt)}
                                                    </p>
                                                </div>
                                                <Badge
                                                    variant="outline"
                                                    className={`text-[10px] font-semibold border ${catInfo.badgeClass}`}
                                                >
                                                    {catInfo.icon} {catLabel}
                                                </Badge>
                                            </div>

                                            <div className="space-y-1">
                                                <span className="text-[11px] font-semibold text-muted-foreground block">
                                                    Motivo:
                                                </span>
                                                <p className="p-2.5 rounded-lg bg-background/80 border border-border/40 text-foreground leading-relaxed whitespace-pre-wrap">
                                                    {item.reason || "Sin observaciones adicionales registradas."}
                                                </p>
                                            </div>

                                            {item.achievements && (
                                                <div className="space-y-1">
                                                    <span className="text-[11px] font-semibold text-teal-700 dark:text-teal-300 flex items-center gap-1">
                                                        <Sparkles className="w-3 h-3 text-teal-600" />
                                                        <span>Proyectos, Logros o Aportes Específicos:</span>
                                                    </span>
                                                    <p className="p-2.5 rounded-lg bg-teal-500/5 border border-teal-500/20 text-foreground leading-relaxed whitespace-pre-wrap">
                                                        {item.achievements}
                                                    </p>
                                                </div>
                                            )}

                                            {item.evidenceUrl && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        window.open(item.evidenceUrl!, "_blank", "noopener,noreferrer")
                                                    }
                                                    className="w-full h-8 text-xs gap-1.5 rounded-lg text-blue-600 border-blue-500/30"
                                                >
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                    <span>Abrir Portafolio / Evidencia Adjunta</span>
                                                </Button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" size="sm" onClick={() => setDetailRow(null)} className="text-xs h-9 rounded-xl">
                            Cerrar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Registro Académico del Aprendiz */}
            <StudentAcademicRecordModal
                isOpen={!!academicRecordNomination}
                onClose={() => setAcademicRecordNomination(null)}
                student={
                    academicRecordNomination
                        ? {
                              studentId: academicRecordNomination.studentId,
                              studentName: academicRecordNomination.studentName,
                              studentDocument: academicRecordNomination.studentDocument,
                              studentEmail: academicRecordNomination.studentEmail,
                              groupName: academicRecordNomination.groupName
                          }
                        : null
                }
            />

            {/* Confirmación para eliminar postulación */}
            <AlertDialog open={!!rowToDelete} onOpenChange={(open) => !open && setRowToDelete(null)}>
                <AlertDialogContent className="max-w-md bg-card border-border/80">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-base font-bold text-foreground">
                            ¿Retirar postulación de aprendiz destacado?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-xs text-muted-foreground">
                            Se eliminará la postulación de <strong className="text-foreground">{rowToDelete?.primary.studentName}</strong> de esta convocatoria.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting} className="h-9 text-xs">
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            disabled={isDeleting}
                            onClick={async () => {
                                if (!rowToDelete) return;
                                try {
                                    setIsDeleting(true);
                                    await Promise.all(
                                        rowToDelete.nominations.map((n) => deleteStandoutNominationAction(n.id))
                                    );
                                    toast.success("Postulación retirada.");
                                    setRowToDelete(null);
                                    onRefresh();
                                } catch (err: any) {
                                    toast.error(err.message || "Error al eliminar la postulación.");
                                } finally {
                                    setIsDeleting(false);
                                }
                            }}
                            className="h-9 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? "Eliminando..." : "Eliminar"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

