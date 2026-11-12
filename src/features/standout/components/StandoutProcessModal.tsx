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
import { Trophy, Loader2, School } from "lucide-react";
import { StandoutProcessDTO, CreateStandoutProcessInput, UpdateStandoutProcessInput } from "../types";

interface StandoutProcessModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: CreateStandoutProcessInput | UpdateStandoutProcessInput) => Promise<void>;
    processToEdit?: StandoutProcessDTO | null;
    currentProgramId?: string;
    programName?: string;
}

export function StandoutProcessModal({
    isOpen,
    onClose,
    onSubmit,
    processToEdit,
    currentProgramId,
    programName
}: StandoutProcessModalProps) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState<"OPEN" | "CLOSED">("OPEN");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (processToEdit) {
            setTitle(processToEdit.title);
            setDescription(processToEdit.description || "");
            setStatus(processToEdit.status);
        } else {
            setTitle("");
            setDescription("");
            setStatus("OPEN");
        }
    }, [processToEdit, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            toast.error("El título de la convocatoria es obligatorio.");
            return;
        }

        if (!processToEdit && !currentProgramId) {
            toast.error("Debes tener seleccionada un área de formación para crear la convocatoria.");
            return;
        }

        try {
            setIsSubmitting(true);
            if (processToEdit) {
                await onSubmit({
                    title: title.trim(),
                    description: description.trim() || undefined,
                    status
                });
            } else {
                await onSubmit({
                    title: title.trim(),
                    description: description.trim() || undefined,
                    programId: currentProgramId
                });
            }
            onClose();
        } catch (err: any) {
            toast.error(err.message || "Error al guardar la convocatoria.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent showCloseButton={false} className="sm:max-w-lg p-0 overflow-hidden border-border/80 rounded-2xl shadow-2xl">
                <div className="relative bg-gradient-to-r from-teal-500/10 via-emerald-500/5 to-transparent border-b border-border/60 p-5 sm:p-6 pb-4 sm:pb-5">
                    <div className="flex items-start justify-between gap-3.5">
                        <div className="flex items-start gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
                                <Trophy className="w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                                <DialogTitle className="text-lg font-bold text-foreground">
                                    {processToEdit ? "Editar Convocatoria de Destacados" : "Nueva Convocatoria de Aprendices Destacados"}
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground">
                                    {processToEdit
                                        ? "Actualiza la información, criterios o estado de este proceso de postulación."
                                        : "Habilita un proceso para que los instructores postulen aprendices sobresalientes de sus fichas."}
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

                <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                    {programName && (
                        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary/10 border border-primary/20 text-xs text-foreground shadow-2xs">
                            <div className="w-5 h-5 rounded-md bg-primary/20 text-primary flex items-center justify-center shrink-0">
                                <School className="w-3 h-3" />
                            </div>
                            <span className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider">Área de Formación:</span>
                            <span className="font-bold text-primary">{programName}</span>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <Label htmlFor="standout-process-title" className="text-xs font-semibold">
                            Título de la Convocatoria <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="standout-process-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ej: Postulación al Cuadro de Honor y Aprendices Destacados - Trimestre I 2026"
                            className="text-sm h-10"
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="standout-process-desc" className="text-xs font-semibold">
                            Criterios de Postulación o Instrucciones <span className="text-muted-foreground text-[11px]">(Opcional)</span>
                        </Label>
                        <Textarea
                            id="standout-process-desc"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Indica criterios de selección (promedio académico, asistencia ejemplar, liderazgo, proyectos innovadores), cantidad sugerida por ficha o fechas límite..."
                            rows={3}
                            className="text-xs resize-none"
                        />
                    </div>

                    {processToEdit && (
                        <div className="space-y-1.5">
                            <Label htmlFor="standout-process-status" className="text-xs font-semibold">
                                Estado del Proceso
                            </Label>
                            <Select value={status} onValueChange={(val: "OPEN" | "CLOSED") => setStatus(val)}>
                                <SelectTrigger id="standout-process-status" className="h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="OPEN" className="text-xs">
                                        🟢 Abierto (Habilitado para nuevas postulaciones de instructores)
                                    </SelectItem>
                                    <SelectItem value="CLOSED" className="text-xs">
                                        🔴 Cerrado (Solo lectura / Postulaciones finalizadas)
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

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
                            <span>{processToEdit ? "Guardar Cambios" : "Crear Convocatoria"}</span>
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

