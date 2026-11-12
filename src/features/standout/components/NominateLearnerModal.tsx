"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Trophy,
    Link as LinkIcon,
    Loader2,
    Search,
    Check,
    ChevronDown,
    Sparkles
} from "lucide-react";
import { toast } from "sonner";
import {
    StandoutProcessDTO,
    StandoutNominationDTO,
    TrainingAreaGroupDTO,
    StandoutCategory,
    STANDOUT_CATEGORY_CONFIG,
    CreateStandoutNominationInput,
    UpdateStandoutNominationInput
} from "../types";

interface NominateLearnerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmitCreate: (data: CreateStandoutNominationInput) => Promise<void>;
    onSubmitUpdate?: (nominationId: string, data: UpdateStandoutNominationInput) => Promise<void>;
    processes: StandoutProcessDTO[];
    groups: TrainingAreaGroupDTO[];
    selectedGroupId?: string;
    selectedProcessId?: string;
    nominationToEdit?: StandoutNominationDTO | null;
}

export function NominateLearnerModal({
    isOpen,
    onClose,
    onSubmitCreate,
    onSubmitUpdate,
    groups,
    selectedGroupId,
    selectedProcessId,
    nominationToEdit
}: NominateLearnerModalProps) {
    const lectiveGroups = useMemo(() => {
        return groups.filter((g) => !g.categoria || g.categoria.toUpperCase() === "LECTIVA");
    }, [groups]);

    const [groupId, setGroupId] = useState("");
    const [groupSearch, setGroupSearch] = useState("");
    const [studentId, setStudentId] = useState("");
    const [category, setCategory] = useState<StandoutCategory>("EXCELENCIA_ACADEMICA");
    const [customCategory, setCustomCategory] = useState("");
    const [reason, setReason] = useState("");
    const [achievements, setAchievements] = useState("");
    const [evidenceUrl, setEvidenceUrl] = useState("");
    const [studentSearch, setStudentSearch] = useState("");
    const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const studentDropdownRef = useRef<HTMLDivElement>(null);

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
        if (nominationToEdit) {
            setGroupId(nominationToEdit.groupId);
            setStudentId(nominationToEdit.studentId);
            setCategory(nominationToEdit.category);
            setCustomCategory(nominationToEdit.customCategory || "");
            setReason(nominationToEdit.reason || "");
            setAchievements(nominationToEdit.achievements || "");
            setEvidenceUrl(nominationToEdit.evidenceUrl || "");
        } else {
            const defGroupId = selectedGroupId || lectiveGroups[0]?.id || "";
            setGroupId(defGroupId);
            setStudentId("");
            setCategory("EXCELENCIA_ACADEMICA");
            setCustomCategory("");
            setReason("");
            setAchievements("");
            setEvidenceUrl("");
            setStudentSearch("");
            setGroupSearch("");
            setIsStudentDropdownOpen(false);
        }
    }, [nominationToEdit, isOpen, selectedGroupId, lectiveGroups]);

    const currentGroup = useMemo(() => {
        return lectiveGroups.find((g) => g.id === groupId) || lectiveGroups[0] || null;
    }, [lectiveGroups, groupId]);

    const normalizeSearch = (str: string) =>
        (str || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();

    const filteredLectiveGroups = useMemo(() => {
        if (!groupSearch.trim()) return lectiveGroups;
        const term = normalizeSearch(groupSearch);
        return lectiveGroups.filter((g) => {
            const nameMatch = normalizeSearch(g.name).includes(term);
            const progMatch = g.programName ? normalizeSearch(g.programName).includes(term) : false;
            return nameMatch || progMatch;
        });
    }, [lectiveGroups, groupSearch]);

    const displayGroups = useMemo(() => {
        if (!groupId) return filteredLectiveGroups;
        if (filteredLectiveGroups.some((g) => g.id === groupId)) return filteredLectiveGroups;
        const current = lectiveGroups.find((g) => g.id === groupId);
        return current ? [current, ...filteredLectiveGroups] : filteredLectiveGroups;
    }, [filteredLectiveGroups, groupId, lectiveGroups]);

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

    const selectedStudent = useMemo(() => {
        return currentGroup?.students.find((s) => s.id === studentId) || null;
    }, [currentGroup, studentId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const effectiveProcessId = nominationToEdit ? nominationToEdit.processId : (selectedProcessId || "");

        if (!nominationToEdit && !effectiveProcessId) {
            toast.error("Selecciona un proceso de postulación.");
            return;
        }

        if (!nominationToEdit && (!groupId || !studentId)) {
            toast.error("Selecciona la ficha y el aprendiz a postular.");
            return;
        }

        if (category === "OTRO" && !customCategory.trim()) {
            toast.error("Por favor especifica la categoría o mérito del reconocimiento.");
            return;
        }

        if (evidenceUrl.trim()) {
            try {
                const urlObj = new URL(evidenceUrl.trim());
                if (urlObj.protocol !== "http:" && urlObj.protocol !== "https:") {
                    throw new Error();
                }
            } catch {
                toast.error("El enlace de portafolio o evidencia debe ser una URL válida (https://...).");
                return;
            }
        }

        try {
            setIsSubmitting(true);
            const cleanUrl = evidenceUrl.trim() || null;
            const finalCustomCat = category === "OTRO" ? customCategory.trim() : null;

            if (nominationToEdit && onSubmitUpdate) {
                await onSubmitUpdate(nominationToEdit.id, {
                    category,
                    customCategory: finalCustomCat,
                    reason: reason.trim(),
                    achievements: achievements.trim() || null,
                    evidenceUrl: cleanUrl
                });
            } else {
                await onSubmitCreate({
                    processId: effectiveProcessId,
                    studentId,
                    groupId,
                    category,
                    customCategory: finalCustomCat,
                    reason: reason.trim(),
                    achievements: achievements.trim() || null,
                    evidenceUrl: cleanUrl
                });
            }
            onClose();
        } catch (err: any) {
            toast.error(err.message || "Error al guardar la postulación.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent showCloseButton={false} className="w-[95vw] max-w-[95vw] sm:max-w-2xl md:max-w-3xl max-h-[92vh] flex flex-col p-0 overflow-hidden border-border/80 rounded-2xl sm:rounded-3xl shadow-2xl">
                <div className="bg-gradient-to-r from-teal-500/10 via-emerald-500/5 to-transparent border-b border-border/60 p-5 sm:p-6 pb-4 sm:pb-5">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
                                <Trophy className="w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                                <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                                    {nominationToEdit ? "Editar Postulación de Aprendiz Destacado" : "Postular Aprendiz Destacado"}
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground">
                                    Reconoce el mérito académico, liderazgo, innovación o compromiso sobresaliente de un aprendiz de tu área de formación.
                                </DialogDescription>
                            </div>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={onClose}
                            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground rounded-lg shrink-0"
                        >
                            Cerrar
                        </Button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
                    {!nominationToEdit ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">
                                    1. Ficha de Formación <span className="text-destructive">*</span>
                                </Label>
                                <Select
                                    value={groupId}
                                    onValueChange={(val) => {
                                        setGroupId(val);
                                        setStudentId("");
                                    }}
                                >
                                    <SelectTrigger className="h-10 text-xs font-medium rounded-xl">
                                        <SelectValue placeholder="Selecciona una ficha..." />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl max-h-64">
                                        <div className="p-1.5 sticky top-0 bg-popover z-10 border-b border-border/50">
                                            <div className="relative">
                                                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                                <Input
                                                    value={groupSearch}
                                                    onChange={(e) => setGroupSearch(e.target.value)}
                                                    placeholder="Buscar ficha..."
                                                    className="h-8 pl-8 text-xs rounded-lg"
                                                    onKeyDown={(e) => e.stopPropagation()}
                                                />
                                            </div>
                                        </div>
                                        {displayGroups.map((g) => (
                                            <SelectItem key={g.id} value={g.id} className="text-xs">
                                                Ficha {g.name} ({g.studentsCount} aprendices)
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5" ref={studentDropdownRef}>
                                <Label className="text-xs font-semibold">
                                    2. Aprendiz Destacado <span className="text-destructive">*</span>
                                </Label>
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setIsStudentDropdownOpen((prev) => !prev)}
                                        className="w-full h-10 px-3 rounded-xl border border-input bg-background text-xs flex items-center justify-between gap-2 hover:bg-muted/30 transition-colors"
                                    >
                                        {selectedStudent ? (
                                            <span className="font-semibold text-foreground truncate">
                                                {selectedStudent.name} {selectedStudent.identificacion ? `(${selectedStudent.identificacion})` : ""}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground">Seleccionar aprendiz de la ficha...</span>
                                        )}
                                        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                                    </button>

                                    {isStudentDropdownOpen && (
                                        <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-popover shadow-xl overflow-hidden">
                                            <div className="p-2 border-b border-border/60 bg-muted/30">
                                                <div className="relative">
                                                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                                    <Input
                                                        value={studentSearch}
                                                        onChange={(e) => setStudentSearch(e.target.value)}
                                                        placeholder="Buscar por nombre o documento..."
                                                        className="h-8 pl-8 text-xs rounded-lg bg-background"
                                                        autoFocus
                                                    />
                                                </div>
                                            </div>
                                            <div className="max-h-56 overflow-y-auto divide-y divide-border/40">
                                                {groupStudents.map((st) => {
                                                    const isSelected = st.id === studentId;
                                                    return (
                                                        <button
                                                            key={st.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setStudentId(st.id);
                                                                setIsStudentDropdownOpen(false);
                                                            }}
                                                            className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2 hover:bg-teal-500/10 transition-colors ${
                                                                isSelected ? "bg-teal-500/10" : ""
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                <Avatar className="w-7 h-7 border border-border/60 shrink-0">
                                                                    <AvatarImage src={st.image || undefined} />
                                                                    <AvatarFallback className="text-[10px] font-bold bg-teal-500/15 text-teal-700 dark:text-teal-300">
                                                                        {st.name.slice(0, 2).toUpperCase()}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <div className="min-w-0">
                                                                    <p className="text-xs font-semibold text-foreground truncate">{st.name}</p>
                                                                    <p className="text-[10px] text-muted-foreground font-mono truncate">
                                                                        Doc: {st.identificacion || "S/I"} • {st.email}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            {isSelected && <Check className="w-4 h-4 text-teal-600 shrink-0" />}
                                                        </button>
                                                    );
                                                })}
                                                {groupStudents.length === 0 && (
                                                    <div className="p-4 text-center text-xs text-muted-foreground">
                                                        No se encontraron aprendices en esta ficha.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-bold text-foreground">{nominationToEdit.studentName}</p>
                                <p className="text-[11px] text-muted-foreground font-mono">
                                    Doc: {nominationToEdit.studentDocument || "S/I"} • Ficha {nominationToEdit.groupName}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Categoría de Reconocimiento */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">
                            Categoría de Reconocimiento <span className="text-destructive">*</span>
                        </Label>
                        <Select value={category} onValueChange={(val: StandoutCategory) => setCategory(val)}>
                            <SelectTrigger className="h-10 text-xs font-medium rounded-xl">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                {(Object.keys(STANDOUT_CATEGORY_CONFIG) as StandoutCategory[]).map((catKey) => {
                                    const cfg = STANDOUT_CATEGORY_CONFIG[catKey];
                                    return (
                                        <SelectItem key={catKey} value={catKey} className="text-xs">
                                            {cfg.icon} {cfg.label} — <span className="text-muted-foreground">{cfg.description}</span>
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </div>

                    {category === "OTRO" && (
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">
                                Especifica la Categoría o Mérito <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                value={customCategory}
                                onChange={(e) => setCustomCategory(e.target.value)}
                                placeholder="Ej: Representación en WorldSkills / SENASoft, Emprendimiento..."
                                className="h-9 text-xs"
                                required
                            />
                        </div>
                    )}

                    {/* Motivo principal */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold flex items-center gap-1.5">
                            <span>Motivo de la Postulación y Cualidades Destacadas</span>
                            <span className="text-muted-foreground text-[11px] font-normal">(Opcional)</span>
                        </Label>
                        <Textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Describe por qué postulas a este aprendiz: su rendimiento académico, liderazgo en clase, compromiso, compañerismo o excelencia..."
                            rows={3}
                            className="text-xs resize-none"
                        />
                    </div>

                    <DialogFooter className="pt-4 border-t border-border/60 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
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
                            disabled={isSubmitting}
                            className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold h-9 gap-1.5 w-full sm:w-auto"
                        >
                            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            <span>{nominationToEdit ? "Guardar Cambios" : "Postular Aprendiz"}</span>
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

