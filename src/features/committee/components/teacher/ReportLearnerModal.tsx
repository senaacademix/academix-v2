"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Scale,
    Link as LinkIcon,
    AlertCircle,
    User,
    Users,
    FileText,
    CheckCircle2,
    Loader2,
    Lock,
    Search,
    X,
    Check,
    ChevronDown,
    Timer,
    Calendar
} from "lucide-react";
import { toast } from "sonner";
import {
    isProcessInDiligenceWindow,
    checkProcessDiligenceWindow,
    formatSafeDate
} from "../../utils/dateUtils";
import {
    CommitteeProcessDTO,
    CommitteeReportDTO,
    TrainingAreaGroupDTO,
    CommitteeFaultType,
    CreateCommitteeReportInput,
    UpdateCommitteeReportInput,
    formatFaultTypeLabel
} from "../../types";

interface ReportLearnerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmitCreate: (data: CreateCommitteeReportInput) => Promise<void>;
    onSubmitUpdate?: (reportId: string, data: UpdateCommitteeReportInput) => Promise<void>;
    processes: CommitteeProcessDTO[];
    groups: TrainingAreaGroupDTO[];
    selectedGroupId?: string;
    selectedProcessId?: string;
    reportToEdit?: CommitteeReportDTO | null;
    programName?: string;
}

export function ReportLearnerModal({
    isOpen,
    onClose,
    onSubmitCreate,
    onSubmitUpdate,
    processes,
    groups,
    selectedGroupId,
    selectedProcessId,
    reportToEdit,
    programName
}: ReportLearnerModalProps) {
    const activeProcesses = useMemo(() => processes.filter((p) => isProcessInDiligenceWindow(p)), [processes]);

    const lectiveGroups = useMemo(() => {
        return groups.filter(
            (g) => !g.categoria || g.categoria.toUpperCase() === "LECTIVA"
        );
    }, [groups]);

    const editDiligence = useMemo(() => {
        if (!reportToEdit) return null;
        return checkProcessDiligenceWindow({
            status: reportToEdit.processStatus,
            startDate: reportToEdit.processStartDate,
            endDate: reportToEdit.processEndDate
        });
    }, [reportToEdit]);

    const isDecisionLocked = useMemo(() => {
        if (!reportToEdit?.committeeDecision) return false;
        const dec = reportToEdit.committeeDecision.trim().toLowerCase();
        return dec !== "" && dec !== "pending" && dec !== "pendiente";
    }, [reportToEdit]);

    const isReadOnly = (editDiligence !== null && !editDiligence.canEdit) || isDecisionLocked;

    const [processId, setProcessId] = useState("");
    const [groupId, setGroupId] = useState("");
    const [groupSearch, setGroupSearch] = useState("");
    const [studentId, setStudentId] = useState("");
    const [faultType, setFaultType] = useState<CommitteeFaultType>("ACADEMICO");
    const [customFaultType, setCustomFaultType] = useState("");
    const [absenceDays, setAbsenceDays] = useState<number | string>(0);
    const [evidenceUrl, setEvidenceUrl] = useState("");
    const [observations, setObservations] = useState("");
    const [studentSearch, setStudentSearch] = useState("");
    const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const studentDropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (studentDropdownRef.current && !studentDropdownRef.current.contains(event.target as Node)) {
                setIsStudentDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (reportToEdit) {
            setProcessId(reportToEdit.processId);
            setGroupId(reportToEdit.groupId);
            setStudentId(reportToEdit.studentId);
            setFaultType(reportToEdit.faultType);
            setCustomFaultType(reportToEdit.customFaultType || "");
            setAbsenceDays(reportToEdit.absenceDays ?? reportToEdit.absenceHours ?? 0);
            setEvidenceUrl(reportToEdit.evidenceUrl || "");
            // Muestra observations si existe, si no usa reason como fallback
            setObservations(reportToEdit.observations || reportToEdit.reason || "");
        } else {
            const defaultProc = (selectedProcessId && activeProcesses.some(p => p.id === selectedProcessId))
                ? selectedProcessId
                : (activeProcesses[0]?.id || "");
            const defGroupId = selectedGroupId || lectiveGroups[0]?.id || "";
            setProcessId(defaultProc);
            setGroupId(defGroupId);
            setStudentId("");
            setFaultType("ACADEMICO");
            setCustomFaultType("");
            setAbsenceDays(0);
            setEvidenceUrl("");
            setObservations("");
            setStudentSearch("");
            setGroupSearch("");
            setIsStudentDropdownOpen(false);
        }
    }, [reportToEdit, isOpen, activeProcesses, selectedGroupId, selectedProcessId, lectiveGroups]);

    // Current group object
    const currentGroup = useMemo(() => {
        return lectiveGroups.find((g) => g.id === groupId) || lectiveGroups[0] || null;
    }, [lectiveGroups, groupId]);

    // Helper to normalize accents and spaces for search
    const normalizeSearch = (str: string) => {
        return (str || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
    };

    // Filtered lective groups based on groupSearch
    const filteredLectiveGroups = useMemo(() => {
        if (!groupSearch.trim()) return lectiveGroups;
        const term = normalizeSearch(groupSearch);
        return lectiveGroups.filter((g) => {
            const nameMatch = normalizeSearch(g.name).includes(term);
            const progMatch = g.programName ? normalizeSearch(g.programName).includes(term) : false;
            return nameMatch || progMatch;
        });
    }, [lectiveGroups, groupSearch]);

    // Ensure currently selected group is preserved in options for Select display
    const displayGroups = useMemo(() => {
        if (!groupId) return filteredLectiveGroups;
        if (filteredLectiveGroups.some((g) => g.id === groupId)) return filteredLectiveGroups;
        const current = lectiveGroups.find((g) => g.id === groupId);
        return current ? [current, ...filteredLectiveGroups] : filteredLectiveGroups;
    }, [filteredLectiveGroups, groupId, lectiveGroups]);

    // Filtered students for current group with accent-insensitive search
    const groupStudents = useMemo(() => {
        if (!currentGroup) return [];
        if (!studentSearch.trim()) return currentGroup.students;
        const term = normalizeSearch(studentSearch);
        return currentGroup.students.filter((s) => {
            const nameMatch = normalizeSearch(s.name).includes(term);
            const docMatch = s.identificacion ? normalizeSearch(s.identificacion).includes(term) : false;
            const emailMatch = s.email ? normalizeSearch(s.email).includes(term) : false;
            return nameMatch || docMatch || emailMatch;
        });
    }, [currentGroup, studentSearch]);

    // Selected student object
    const selectedStudent = useMemo(() => {
        return currentGroup?.students.find((s) => s.id === studentId) || null;
    }, [currentGroup, studentId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const effectiveProcessId = reportToEdit ? reportToEdit.processId : (selectedProcessId || processId);

        if (!reportToEdit && !effectiveProcessId) {
            toast.error("Selecciona un proceso de comité.");
            return;
        }

        if (!reportToEdit && (!groupId || !studentId)) {
            toast.error("Selecciona la ficha y el aprendiz a reportar.");
            return;
        }

        // Si se ingresó enlace de evidencias, validar formato URL
        if (evidenceUrl.trim()) {
            try {
                const urlObj = new URL(evidenceUrl.trim());
                if (urlObj.protocol !== "http:" && urlObj.protocol !== "https:") {
                    throw new Error();
                }
            } catch {
                toast.error("El enlace de evidencias debe ser una URL válida (ej: https://onedrive.live.com/... o https://drive.google.com/...)");
                return;
            }
        }

        if (faultType === "OTRO" && !customFaultType.trim()) {
            toast.error("Por favor especifica la causal o motivo del reporte.");
            return;
        }

        try {
            setIsSubmitting(true);
            const cleanUrl = evidenceUrl.trim() || undefined;
            const parsedAbsenceDays = Math.max(0, Number(absenceDays) || 0);
            const observationsText = observations.trim() || null;
            const fallbackReason = observations.trim() || (faultType === "OTRO" ? (customFaultType.trim() || "Reporte a comité") : formatFaultTypeLabel(faultType));
            const finalCustomFault = faultType === "OTRO" ? customFaultType.trim() : null;

            if (reportToEdit && onSubmitUpdate) {
                await onSubmitUpdate(reportToEdit.id, {
                    evidenceUrl: cleanUrl,
                    faultType,
                    customFaultType: finalCustomFault,
                    absenceDays: parsedAbsenceDays,
                    absenceHours: parsedAbsenceDays,
                    reason: fallbackReason,
                    observations: observationsText
                });
            } else {
                await onSubmitCreate({
                    processId: effectiveProcessId,
                    studentId,
                    groupId,
                    evidenceUrl: cleanUrl,
                    faultType,
                    customFaultType: finalCustomFault,
                    absenceDays: parsedAbsenceDays,
                    absenceHours: parsedAbsenceDays,
                    reason: fallbackReason,
                    observations: observationsText
                });
            }
            onClose();
        } catch (err: any) {
            toast.error(err.message || "Error al procesar el reporte.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent showCloseButton={false} className="w-[95vw] max-w-[95vw] sm:max-w-3xl md:max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden border-border/80 rounded-2xl sm:rounded-3xl shadow-2xl">
                {/* Header */}
                <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-b border-border/60 p-5 sm:p-6 pb-4 sm:pb-5">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                                <Scale className="w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                                <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                                    {reportToEdit ? "Editar Reporte a Comité" : "Reportar Aprendiz a Comité de Evaluación"}
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground">
                                    {reportToEdit
                                        ? "Modifica la causal, los hechos o el enlace de evidencias documentales."
                                        : "Registra el caso ante el comité de evaluación con la causal y hechos correspondientes."}
                                </DialogDescription>
                            </div>
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={onClose}
                            className="h-8 px-3 text-xs rounded-xl gap-1.5 hover:bg-muted font-medium shrink-0 cursor-pointer"
                        >
                            <X className="w-3.5 h-3.5" />
                            <span>Cerrar</span>
                        </Button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5 flex-1 overflow-y-auto">
                    {/* Read-only warning if decision is already made by committee */}
                    {isDecisionLocked && (
                        <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-900 dark:text-purple-200 text-xs flex items-start gap-2.5">
                            <Scale className="w-4 h-4 shrink-0 mt-0.5 text-purple-600 dark:text-purple-400" />
                            <div className="space-y-0.5">
                                <p className="font-bold">Decisión Oficial Emitida por el Comité: {reportToEdit?.committeeDecision}</p>
                                <p>Este reporte ya fue resuelto por el Comité de Evaluación. La causal, inasistencias y observaciones están bloqueadas para edición.</p>
                            </div>
                        </div>
                    )}

                    {/* Read-only warning if editing outside diligence window */}
                    {!isDecisionLocked && isReadOnly && (
                        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2.5">
                            <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                            <div className="space-y-0.5">
                                <p className="font-bold">Modo Solo Lectura - Diligenciamiento Cerrado</p>
                                <p>{editDiligence?.message || "El plazo de diligenciamiento para este proceso ha finalizado. Los campos están bloqueados."}</p>
                            </div>
                        </div>
                    )}

                    {/* 2-COLUMN GRID LAYOUT */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
                        {/* COLUMNA 1: DATOS DEL APRENDIZ Y CAUSALES */}
                        <div className="space-y-4">
                            {/* Process selector (only if creating and NO selectedProcessId was specified) */}
                            {!reportToEdit && !selectedProcessId && (
                                <div className="space-y-1.5">
                                    <Label htmlFor="process-select" className="text-xs font-semibold">
                                        Proceso de Comité Convocado <span className="text-destructive">*</span>
                                    </Label>
                                    {activeProcesses.length === 0 ? (
                                        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                            <div className="space-y-0.5">
                                                <p className="font-bold">No hay procesos en periodo de diligenciamiento</p>
                                                <p>Los procesos de comité para esta área están fuera de la fecha límite o cerrados por el Gestor Académico (Solo Lectura).</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <Select value={processId} onValueChange={setProcessId}>
                                            <SelectTrigger id="process-select" className="h-9 text-xs">
                                                <SelectValue placeholder="Selecciona un proceso abierto" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {activeProcesses.map((p) => (
                                                    <SelectItem key={p.id} value={p.id} className="text-xs">
                                                        {p.title} {p.endDate ? `(Hasta ${formatSafeDate(p.endDate)})` : ""}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>
                            )}

                            {/* Ficha / Group selector with Search on the left (if creating) */}
                            {!reportToEdit ? (
                                <div className="space-y-1.5">
                                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                                        {/* Búsqueda por ficha a la izquierda */}
                                        <div className="sm:col-span-5 space-y-1.5">
                                            <Label htmlFor="group-search-input" className="text-xs font-semibold flex items-center gap-1.5">
                                                <Search className="w-3.5 h-3.5 text-primary" />
                                                <span>Buscar Ficha</span>
                                            </Label>
                                            <div className="relative">
                                                <Input
                                                    id="group-search-input"
                                                    placeholder="N° ficha o nombre..."
                                                    value={groupSearch}
                                                    onChange={(e) => setGroupSearch(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter" && filteredLectiveGroups.length === 1) {
                                                            e.preventDefault();
                                                            setGroupId(filteredLectiveGroups[0].id);
                                                            setStudentId("");
                                                        }
                                                    }}
                                                    className="pr-7 h-9 text-xs rounded-xl"
                                                />
                                                {groupSearch && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setGroupSearch("")}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                                                        title="Limpiar búsqueda"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Campo Ficha o Grupo a la derecha */}
                                        <div className="sm:col-span-7 space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="group-select" className="text-xs font-semibold truncate">
                                                    Ficha o Grupo <span className="text-destructive">*</span>
                                                </Label>
                                                <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-semibold shrink-0">
                                                    {groupSearch.trim()
                                                        ? `${filteredLectiveGroups.length} de ${lectiveGroups.length}`
                                                        : `${lectiveGroups.length} Fichas`}
                                                </Badge>
                                            </div>
                                            <Select
                                                value={groupId}
                                                onValueChange={(val) => {
                                                    setGroupId(val);
                                                    setStudentId(""); // Reset student when ficha changes
                                                }}
                                            >
                                                <SelectTrigger id="group-select" className="h-9 text-xs font-medium">
                                                    <SelectValue placeholder="Selecciona la ficha lectiva" />
                                                </SelectTrigger>
                                                <SelectContent className="max-h-56">
                                                    {filteredLectiveGroups.length === 0 ? (
                                                        <div className="p-3 text-center text-xs text-muted-foreground">
                                                            No se encontraron fichas con "{groupSearch}"
                                                        </div>
                                                    ) : (
                                                        displayGroups.map((g) => (
                                                            <SelectItem key={g.id} value={g.id} className="text-xs">
                                                                {g.name} ({g.studentsCount} apr.) • {g.programName}
                                                            </SelectItem>
                                                        ))
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-xs flex items-center justify-between">
                                    <div>
                                        <span className="text-muted-foreground block text-[11px]">Aprendiz:</span>
                                        <span className="font-bold text-foreground">{reportToEdit.studentName}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-muted-foreground block text-[11px]">Ficha:</span>
                                        <span className="font-semibold text-foreground">{reportToEdit.groupName}</span>
                                    </div>
                                </div>
                            )}

                            {/* Student selector (if creating) */}
                            {!reportToEdit && currentGroup && (
                                <div className="space-y-1.5" ref={studentDropdownRef}>
                                    <Label htmlFor="student-search-input" className="text-xs font-semibold flex items-center justify-between">
                                        <span>
                                            Seleccionar Aprendiz <span className="text-destructive">*</span>
                                        </span>
                                        {selectedStudent && (
                                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                                                ✓ Aprendiz seleccionado
                                            </span>
                                        )}
                                    </Label>

                                    {/* If already selected and not actively searching */}
                                    {selectedStudent && !isStudentDropdownOpen ? (
                                        <div className="flex items-center justify-between p-2.5 rounded-xl border border-primary/30 bg-primary/5 text-xs shadow-2xs">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <Avatar className="w-8 h-8 border border-primary/20 shrink-0">
                                                    <AvatarImage src={selectedStudent.image || undefined} />
                                                    <AvatarFallback className="text-[10px] font-bold bg-primary/15 text-primary">
                                                        {selectedStudent.name.slice(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-foreground truncate">{selectedStudent.name}</p>
                                                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                                                        <span>Doc: {selectedStudent.identificacion || "Sin doc"}</span>
                                                        {selectedStudent.email && (
                                                            <span className="truncate text-primary/80 font-sans">• {selectedStudent.email}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setIsStudentDropdownOpen(true);
                                                }}
                                                className="h-7 px-2.5 text-xs rounded-lg gap-1 shrink-0"
                                            >
                                                <span>Cambiar</span>
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                                                <Input
                                                    id="student-search-input"
                                                    placeholder={
                                                        currentGroup.students.length > 0
                                                            ? `Buscar por nombre o cédula (${currentGroup.students.length} aprendices)...`
                                                            : "Esta ficha no tiene aprendices registrados"
                                                    }
                                                    value={studentSearch}
                                                    onChange={(e) => {
                                                        setStudentSearch(e.target.value);
                                                        setIsStudentDropdownOpen(true);
                                                    }}
                                                    onFocus={() => setIsStudentDropdownOpen(true)}
                                                    disabled={currentGroup.students.length === 0}
                                                    className="pl-9 pr-8 h-9 text-xs rounded-xl"
                                                    autoComplete="off"
                                                />
                                                {studentSearch ? (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setStudentSearch("");
                                                            setIsStudentDropdownOpen(true);
                                                        }}
                                                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                                        title="Limpiar búsqueda"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </Button>
                                                ) : (
                                                    <div
                                                        onClick={() => setIsStudentDropdownOpen(!isStudentDropdownOpen)}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground cursor-pointer p-1"
                                                    >
                                                        <ChevronDown className="w-4 h-4 opacity-60" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Autocomplete Dropdown List */}
                                            {isStudentDropdownOpen && currentGroup.students.length > 0 && (
                                                <div className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-56 overflow-y-auto rounded-xl border border-border/80 bg-popover shadow-xl p-1.5 space-y-0.5 animate-in fade-in-50 zoom-in-95">
                                                    {groupStudents.length === 0 ? (
                                                        <div className="p-3 text-center text-xs text-muted-foreground">
                                                            No se encontró ningún aprendiz con «<span className="font-semibold text-foreground">{studentSearch}</span>» en esta ficha.
                                                        </div>
                                                    ) : (
                                                        groupStudents.map((s) => {
                                                            const isSelected = studentId === s.id;
                                                            return (
                                                                <div
                                                                    key={s.id}
                                                                    onClick={() => {
                                                                        setStudentId(s.id);
                                                                        setStudentSearch("");
                                                                        setIsStudentDropdownOpen(false);
                                                                    }}
                                                                    className={`flex items-center gap-2.5 p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                                                                        isSelected
                                                                            ? "bg-primary/15 text-primary font-semibold"
                                                                            : "hover:bg-accent text-foreground"
                                                                    }`}
                                                                >
                                                                    <Avatar className="w-7 h-7 border border-border/60 shrink-0">
                                                                        <AvatarImage src={s.image || undefined} />
                                                                        <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                                                                            {s.name.slice(0, 2).toUpperCase()}
                                                                        </AvatarFallback>
                                                                    </Avatar>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="truncate font-medium">{s.name}</p>
                                                                        <p className="text-[10px] text-muted-foreground font-mono truncate">
                                                                            Doc: {s.identificacion || "Sin doc"} {s.email ? `• ${s.email}` : ""}
                                                                        </p>
                                                                    </div>
                                                                    {isSelected && (
                                                                        <Check className="w-4 h-4 text-primary shrink-0" />
                                                                    )}
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Fault Type */}
                            <div className="space-y-1.5">
                                <Label htmlFor="fault-type" className="text-xs font-semibold">
                                    Causal o Tipo de Falta <span className="text-destructive">*</span>
                                </Label>
                                <Select
                                    value={faultType}
                                    onValueChange={(val: CommitteeFaultType) => setFaultType(val)}
                                    disabled={isReadOnly}
                                >
                                    <SelectTrigger id="fault-type" className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ACADEMICO" className="text-xs">
                                            📘 Académico (Incumplimiento / bajo desempeño en RA)
                                        </SelectItem>
                                        <SelectItem value="DISCIPLINARIO" className="text-xs">
                                            📕 Disciplinario (Faltas al reglamento / conducta)
                                        </SelectItem>
                                        <SelectItem value="INASISTENCIA" className="text-xs">
                                            📙 Inasistencia (Inasistencias continuas o injustificadas)
                                        </SelectItem>
                                        <SelectItem value="MIXTO" className="text-xs">
                                            📓 Mixto (Académico y disciplinario/asistencia)
                                        </SelectItem>
                                        <SelectItem value="SOLICITUD_PLAN_MEJORAMIENTO" className="text-xs">
                                            📝 Solicitud Plan de Mejoramiento (Concertación de compromisos)
                                        </SelectItem>
                                        <SelectItem value="INCUMPLIMIENTO_PLAN_MEJORAMIENTO" className="text-xs">
                                            ⚠️ Incumplimiento Plan de Mejoramiento (Vencimiento de compromisos)
                                        </SelectItem>
                                        <SelectItem value="DESERCION" className="text-xs">
                                            🚶 Deserción (Inasistencia injustificada reiterada / abandono)
                                        </SelectItem>
                                        <SelectItem value="PLAGIO_FRAUDE" className="text-xs">
                                            🚫 Plagio o Fraude Académico (Copia no autorizada de evidencias)
                                        </SelectItem>
                                        <SelectItem value="ETAPA_PRODUCTIVA" className="text-xs">
                                            🏭 Incumplimiento en Etapa Productiva (Empresa / Práctica)
                                        </SelectItem>
                                        <SelectItem value="OTRO" className="text-xs">
                                            📋 Otro (Especificar causal personalizada)
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Especificar Causal si es OTRO */}
                            {faultType === "OTRO" && (
                                <div className="space-y-1.5 p-3 rounded-xl bg-primary/5 border border-primary/20 animate-in fade-in duration-200">
                                    <Label htmlFor="custom-fault" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                        <FileText className="w-3.5 h-3.5 text-primary" />
                                        Especificar Causal o Motivo <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="custom-fault"
                                        type="text"
                                        value={customFaultType}
                                        onChange={(e) => setCustomFaultType(e.target.value)}
                                        placeholder="Escribe la causal o motivo del reporte..."
                                        className="text-xs h-9 bg-card"
                                        disabled={isReadOnly}
                                    />
                                    <p className="text-[11px] text-muted-foreground leading-tight">
                                        Indica la causal o motivo por el cual se reporta al aprendiz.
                                    </p>
                                </div>
                            )}



                            {/* Cantidad de Días de Inasistencias */}
                            <div className={`space-y-1.5 p-3 rounded-xl border transition-colors ${
                                faultType === "INASISTENCIA" || faultType === "DESERCION" || Number(absenceDays) > 0
                                    ? "bg-amber-500/5 border-amber-500/30"
                                    : "bg-muted/30 border-border/70"
                            }`}>
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="absence-days" className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                                        <Calendar className="w-3.5 h-3.5 text-amber-500" />
                                        Días de Inasistencias
                                    </Label>
                                    {Number(absenceDays) > 0 ? (
                                        <Badge variant="outline" className="text-[10px] bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/40 font-mono font-semibold">
                                            {absenceDays} {Number(absenceDays) === 1 ? "día inasistencia" : "días inasistencias"}
                                        </Badge>
                                    ) : null}
                                </div>
                                <Input
                                    id="absence-days"
                                    type="number"
                                    min={0}
                                    step={1}
                                    value={absenceDays}
                                    onChange={(e) => setAbsenceDays(e.target.value)}
                                    placeholder="0"
                                    className="text-xs h-9 bg-card font-mono"
                                    disabled={isReadOnly}
                                />
                                <p className="text-[11px] text-muted-foreground leading-tight">
                                    Cantidad de días no asistidos por el aprendiz. Diligenciado libremente por el instructor.
                                </p>
                            </div>
                        </div>

                        {/* COLUMNA 2: EVIDENCIAS Y OBSERVACIONES */}
                        <div className="space-y-4 flex flex-col h-full">
                            {/* OPTIONAL EVIDENCE URL */}
                            <div className="space-y-1.5 p-3 rounded-xl bg-muted/40 border border-border/70">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="evidence-url" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                        <LinkIcon className="w-3.5 h-3.5 text-muted-foreground" />
                                        Enlace (URL) de Evidencias
                                    </Label>
                                    <Badge variant="outline" className="text-[10px] text-muted-foreground border-border/80">
                                        Opcional
                                    </Badge>
                                </div>
                                <Input
                                    id="evidence-url"
                                    type="url"
                                    value={evidenceUrl}
                                    onChange={(e) => setEvidenceUrl(e.target.value)}
                                    placeholder="https://drive.google.com/... o OneDrive (opcional)"
                                    className="text-xs h-9 bg-card font-mono"
                                    disabled={isReadOnly}
                                />
                                <p className="text-[11px] text-muted-foreground leading-normal">
                                    Enlace público opcional con pruebas documentales (actas, pantallazos, plan de mejoramiento).
                                </p>
                            </div>

                            {/* Observaciones / Hechos del Caso */}
                            <div className="space-y-1.5 flex-1 flex flex-col">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="report-observations" className="text-xs font-semibold">
                                        Observaciones
                                    </Label>
                                    <Badge variant="outline" className="text-[10px] text-muted-foreground border-border/80">
                                        Opcional
                                    </Badge>
                                </div>
                                <Textarea
                                    id="report-observations"
                                    value={observations}
                                    onChange={(e) => setObservations(e.target.value)}
                                    placeholder="Describe detalladamente los hechos, fechas, competencias o resultados de aprendizaje afectados (opcional)..."
                                    className="text-xs resize-none flex-1 min-h-[170px]"
                                    disabled={isReadOnly}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="pt-3 border-t border-border/60 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 w-full sm:w-auto">
                        {isReadOnly ? (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                className="text-xs h-9 w-full sm:w-auto"
                            >
                                Cerrar (Solo Lectura)
                            </Button>
                        ) : (
                            <>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={onClose}
                                    disabled={isSubmitting}
                                    className="text-xs h-9 w-full sm:w-auto"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting || (!reportToEdit && !selectedProcessId && activeProcesses.length === 0)}
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold h-9 gap-1.5 px-4 rounded-xl w-full sm:w-auto"
                                >
                                    {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    <span>{reportToEdit ? "Guardar Cambios" : "Confirmar Reporte"}</span>
                                </Button>
                            </>
                        )}
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
