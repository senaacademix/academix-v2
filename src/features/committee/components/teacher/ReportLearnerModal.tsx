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
    ChevronDown
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
    UpdateCommitteeReportInput
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

    const editDiligence = useMemo(() => {
        if (!reportToEdit) return null;
        return checkProcessDiligenceWindow({
            status: reportToEdit.processStatus,
            startDate: reportToEdit.processStartDate,
            endDate: reportToEdit.processEndDate
        });
    }, [reportToEdit]);

    const isReadOnly = editDiligence !== null && !editDiligence.canEdit;

    const [processId, setProcessId] = useState("");
    const [groupId, setGroupId] = useState("");
    const [studentId, setStudentId] = useState("");
    const [faultType, setFaultType] = useState<CommitteeFaultType>("ACADEMICO");
    const [evidenceUrl, setEvidenceUrl] = useState("");
    const [reason, setReason] = useState("");
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
            setEvidenceUrl(reportToEdit.evidenceUrl || "");
            setReason(reportToEdit.reason);
            setObservations(reportToEdit.observations || "");
        } else {
            const defaultProc = (selectedProcessId && activeProcesses.some(p => p.id === selectedProcessId))
                ? selectedProcessId
                : (activeProcesses[0]?.id || "");
            setProcessId(defaultProc);
            setGroupId(selectedGroupId || groups[0]?.id || "");
            setStudentId("");
            setFaultType("ACADEMICO");
            setEvidenceUrl("");
            setReason("");
            setObservations("");
            setStudentSearch("");
            setIsStudentDropdownOpen(false);
        }
    }, [reportToEdit, isOpen, activeProcesses, selectedGroupId, selectedProcessId, groups]);

    // Current group object
    const currentGroup = useMemo(() => {
        return groups.find((g) => g.id === groupId) || groups[0] || null;
    }, [groups, groupId]);

    // Helper to normalize accents and spaces for search
    const normalizeSearch = (str: string) => {
        return (str || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
    };

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

        if (!reason.trim()) {
            toast.error("El motivo o causal del reporte es obligatorio.");
            return;
        }

        try {
            setIsSubmitting(true);
            const cleanUrl = evidenceUrl.trim() || undefined;
            if (reportToEdit && onSubmitUpdate) {
                await onSubmitUpdate(reportToEdit.id, {
                    evidenceUrl: cleanUrl,
                    faultType,
                    reason: reason.trim(),
                    observations: observations.trim() || undefined
                });
            } else {
                await onSubmitCreate({
                    processId: effectiveProcessId,
                    studentId,
                    groupId,
                    evidenceUrl: cleanUrl,
                    faultType,
                    reason: reason.trim(),
                    observations: observations.trim() || undefined
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
            <DialogContent className="sm:max-w-3xl md:max-w-4xl lg:max-w-5xl p-0 overflow-hidden border-border/80 rounded-2xl sm:rounded-3xl shadow-2xl">
                {/* Header */}
                <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-b border-border/60 p-5 sm:p-6 pb-4 sm:pb-5">
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
                </div>

                <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 max-h-[78vh] overflow-y-auto">
                    {/* Read-only warning if editing outside diligence window */}
                    {isReadOnly && (
                        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2.5">
                            <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                            <div className="space-y-0.5">
                                <p className="font-bold">Modo Solo Lectura - Diligenciamiento Cerrado</p>
                                <p>{editDiligence?.message || "El plazo de diligenciamiento para este proceso ha finalizado. Los campos están bloqueados."}</p>
                            </div>
                        </div>
                    )}

                    {/* 2-COLUMN GRID LAYOUT */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                        {/* COLUMNA 1: DATOS DEL APRENDIZ Y EVIDENCIAS */}
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

                            {/* Ficha / Group selector (if creating) */}
                            {!reportToEdit ? (
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="group-select" className="text-xs font-semibold">
                                            Ficha o Grupo del Área <span className="text-destructive">*</span>
                                        </Label>
                                        <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                                            {groups.length} Fichas
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
                                            <SelectValue placeholder="Selecciona la ficha" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-56">
                                            {groups.map((g) => (
                                                <SelectItem key={g.id} value={g.id} className="text-xs">
                                                    {g.name} ({g.studentsCount} apr.) • {g.programName}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
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
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* OPTIONAL EVIDENCE URL */}
                            <div className="space-y-1.5 p-3.5 rounded-xl bg-muted/40 border border-border/70">
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
                                    Enlace público opcional con las pruebas documentales (actas, pantallazos, plan de mejoramiento).
                                </p>
                            </div>
                        </div>

                        {/* COLUMNA 2: MOTIVOS Y OBSERVACIONES */}
                        <div className="space-y-4 flex flex-col h-full">
                            {/* Reason / Facts */}
                            <div className="space-y-1.5 flex-1">
                                <Label htmlFor="report-reason" className="text-xs font-semibold">
                                    Motivo o Hechos del Caso <span className="text-destructive">*</span>
                                </Label>
                                <Textarea
                                    id="report-reason"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="Describe detalladamente los hechos, fechas, competencias o resultados de aprendizaje afectados..."
                                    rows={6}
                                    className="text-xs resize-none h-36"
                                    disabled={isReadOnly}
                                    required
                                />
                            </div>

                            {/* Additional observations */}
                            <div className="space-y-1.5">
                                <Label htmlFor="report-obs" className="text-xs font-semibold">
                                    Observaciones Adicionales <span className="text-muted-foreground text-[11px]">(Opcional)</span>
                                </Label>
                                <Textarea
                                    id="report-obs"
                                    value={observations}
                                    onChange={(e) => setObservations(e.target.value)}
                                    placeholder="Descargos preliminares, acuerdos previos o anotaciones para el comité..."
                                    rows={4}
                                    className="text-xs resize-none"
                                    disabled={isReadOnly}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="pt-3 border-t border-border/60 flex items-center justify-end gap-2">
                        {isReadOnly ? (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                className="text-xs h-9"
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
                                    className="text-xs h-9"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting || (!reportToEdit && !selectedProcessId && activeProcesses.length === 0)}
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold h-9 gap-1.5 px-4 rounded-xl"
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
