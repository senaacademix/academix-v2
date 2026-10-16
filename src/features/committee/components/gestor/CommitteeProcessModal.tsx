"use client";

import React, { useState, useEffect } from "react";
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
import { toast } from "sonner";
import { Scale, Calendar, AlertCircle, Loader2, School } from "lucide-react";
import { CommitteeProcessDTO, CreateCommitteeProcessInput, UpdateCommitteeProcessInput } from "../../types";

import { toDateInputValue } from "../../utils/dateUtils";

interface CommitteeProcessModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: CreateCommitteeProcessInput | UpdateCommitteeProcessInput) => Promise<void>;
    processToEdit?: CommitteeProcessDTO | null;
    currentProgramId?: string;
    programName?: string;
}

export function CommitteeProcessModal({
    isOpen,
    onClose,
    onSubmit,
    processToEdit,
    currentProgramId,
    programName
}: CommitteeProcessModalProps) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState<"OPEN" | "CLOSED">("OPEN");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (processToEdit) {
            setTitle(processToEdit.title);
            setDescription(processToEdit.description || "");
            setStatus(processToEdit.status);
            setStartDate(toDateInputValue(processToEdit.startDate));
            setEndDate(toDateInputValue(processToEdit.endDate));
        } else {
            setTitle("");
            setDescription("");
            setStatus("OPEN");
            setStartDate("");
            setEndDate("");
        }
    }, [processToEdit, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            toast.error("El título del proceso es obligatorio.");
            return;
        }

        if (!processToEdit && !currentProgramId) {
            toast.error("Debes tener seleccionada un área de formación para crear el proceso.");
            return;
        }

        try {
            setIsSubmitting(true);
            if (processToEdit) {
                await onSubmit({
                    title: title.trim(),
                    description: description.trim() || undefined,
                    status,
                    startDate: startDate || undefined,
                    endDate: endDate || undefined
                });
            } else {
                await onSubmit({
                    title: title.trim(),
                    description: description.trim() || undefined,
                    programId: currentProgramId,
                    startDate: startDate || undefined,
                    endDate: endDate || undefined
                });
            }
            onClose();
        } catch (err: any) {
            toast.error(err.message || "Error al guardar el proceso.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-border/80 rounded-2xl shadow-2xl">
                {/* Header with visual accent */}
                <div className="relative bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-b border-border/60 p-6 pb-5">
                    <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                            <Scale className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                            <DialogTitle className="text-lg font-bold text-foreground">
                                {processToEdit ? "Editar Proceso de Comité" : "Nuevo Proceso de Comité"}
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">
                                {processToEdit
                                    ? "Actualiza la información, directrices o estado de este proceso evaluativo."
                                    : "Habilita una convocatoria formal para que los instructores reporten aprendices."}
                            </DialogDescription>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                    {/* Program badge if applicable */}
                    {programName && (
                        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary/10 border border-primary/20 text-xs text-foreground shadow-2xs">
                            <div className="w-5 h-5 rounded-md bg-primary/20 text-primary flex items-center justify-center shrink-0">
                                <School className="w-3 h-3" />
                            </div>
                            <span className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider">Área de Formación:</span>
                            <span className="font-bold text-primary">{programName}</span>
                        </div>
                    )}

                    {/* Title */}
                    <div className="space-y-1.5">
                        <Label htmlFor="process-title" className="text-xs font-semibold">
                            Título Identificativo <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="process-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ej: Reporte de aprendices para comité de evaluación - Trimestre 4 2026"
                            className="text-sm h-10"
                            required
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                        <Label htmlFor="process-desc" className="text-xs font-semibold">
                            Instrucciones o Descripción <span className="text-muted-foreground text-[11px]">(Opcional)</span>
                        </Label>
                        <Textarea
                            id="process-desc"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Indica observaciones a los instructores, plazo límite de reporte, o requisitos documentales..."
                            rows={3}
                            className="text-xs resize-none"
                        />
                    </div>

                    {/* Status (Only on edit or available) */}
                    {processToEdit && (
                        <div className="space-y-1.5">
                            <Label htmlFor="process-status" className="text-xs font-semibold">
                                Estado del Proceso
                            </Label>
                            <Select value={status} onValueChange={(val: "OPEN" | "CLOSED") => setStatus(val)}>
                                <SelectTrigger id="process-status" className="h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="OPEN" className="text-xs">
                                        🟢 Abierto (Habilitado para nuevos reportes de instructores)
                                    </SelectItem>
                                    <SelectItem value="CLOSED" className="text-xs">
                                        🔴 Cerrado (Solo lectura / Reportes finalizados)
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Date Limits */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div className="space-y-1.5">
                            <Label htmlFor="process-start" className="text-xs font-semibold flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>Fecha de Inicio</span>
                            </Label>
                            <Input
                                id="process-start"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="text-xs h-9"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="process-end" className="text-xs font-semibold flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>Fecha Límite</span>
                            </Label>
                            <Input
                                id="process-end"
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="text-xs h-9"
                            />
                        </div>
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
                            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold h-9 gap-1.5 w-full sm:w-auto"
                        >
                            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            <span>{processToEdit ? "Guardar Cambios" : "Crear Proceso"}</span>
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
