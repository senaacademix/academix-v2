"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { RotateCcw, Calendar, FileText, AlertCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { formatCalendarDate } from "@/lib/dateUtils";
import { requestEvidenceResubmission } from "@/features/student/actions/improvementPlanActions";

interface RequestResubmissionModalProps {
    open: boolean;
    planId: string | null;
    planNumber?: string;
    studentName?: string;
    currentEndDate?: string | Date;
    currentEvidenceUrl?: string | null;
    onClose: () => void;
    onSuccess: () => void;
}

export function RequestResubmissionModal({
    open,
    planId,
    planNumber,
    studentName,
    currentEndDate,
    currentEvidenceUrl,
    onClose,
    onSuccess,
}: RequestResubmissionModalProps) {
    const [feedback, setFeedback] = useState("");
    const [newEndDate, setNewEndDate] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (open && currentEndDate) {
            // Suggest an extension date: currentEndDate + 3 days or today + 3 days
            const curDate = new Date(currentEndDate);
            const baseDate = isNaN(curDate.getTime()) ? new Date() : curDate;
            const extended = new Date(baseDate);
            extended.setDate(extended.getDate() + 3);

            const yyyy = extended.getFullYear();
            const mm = String(extended.getMonth() + 1).padStart(2, "0");
            const dd = String(extended.getDate()).padStart(2, "0");
            setNewEndDate(`${yyyy}-${mm}-${dd}`);
            setFeedback("");
        }
    }, [open, currentEndDate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!planId) return;

        if (!feedback.trim()) {
            toast.error("Por favor ingresa las observaciones o motivo de la reentrega.");
            return;
        }

        if (!newEndDate) {
            toast.error("Por favor selecciona la nueva fecha límite extendida.");
            return;
        }

        const parsedDate = new Date(`${newEndDate}T23:59:59`);
        if (isNaN(parsedDate.getTime())) {
            toast.error("Fecha de entrega no válida.");
            return;
        }

        setIsSubmitting(true);
        const toastId = toast.loading("Registrando solicitud de reentrega y extendiendo fecha...");

        try {
            const res = await requestEvidenceResubmission(planId, feedback.trim(), parsedDate);
            if (res.success) {
                toast.success("Solicitud de reentrega guardada con éxito. Se ha conservado el historial y extendido la fecha.", { id: toastId });
                onSuccess();
                onClose();
            } else {
                toast.error(res.error || "Error al solicitar reentrega", { id: toastId });
            }
        } catch (error: any) {
            toast.error(error.message || "Error al procesar la solicitud", { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    const minDateStr = (() => {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, "0");
        const dd = String(today.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    })();

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o && !isSubmitting) onClose(); }}>
            <DialogContent className="max-w-lg rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 font-bold text-base text-amber-600">
                        <RotateCcw className="w-5 h-5 text-amber-600" />
                        Solicitar Reentrega de Evidencia
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Solicita al aprendiz que corrija o complete su entrega de evidencias. Se conservará el historial de entregas anteriores y no se borrarán las firmas ya realizadas.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-1 text-left">
                    {/* Info Card */}
                    <div className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                            <span className="font-semibold text-foreground">Plan N° {planNumber || "---"}</span>
                            {currentEndDate && (
                                <span className="text-[11px] text-muted-foreground">
                                    Vencimiento actual: <strong>{formatCalendarDate(currentEndDate, "dd/MM/yyyy")}</strong>
                                </span>
                            )}
                        </div>
                        {studentName && (
                            <p className="text-muted-foreground">
                                Aprendiz: <strong className="text-foreground">{studentName}</strong>
                            </p>
                        )}
                        {currentEvidenceUrl && (
                            <div className="pt-1 flex items-center gap-1.5">
                                <ExternalLink className="w-3.5 h-3.5 text-primary shrink-0" />
                                <a
                                    href={currentEvidenceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline font-semibold truncate text-[11px]"
                                >
                                    Ver evidencia entregada actual
                                </a>
                            </div>
                        )}
                    </div>

                    {/* Feedback Textarea */}
                    <div className="space-y-1.5">
                        <Label htmlFor="resubmission-feedback" className="text-xs font-bold text-foreground flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5 text-primary" />
                            Observaciones / Correcciones Requeridas *
                        </Label>
                        <Textarea
                            id="resubmission-feedback"
                            placeholder="Detalla qué aspectos debe corregir el aprendiz en su evidencia (ej. faltaron los puntos 3 y 4, el enlace no tenía permisos públicos, etc.)..."
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            required
                            rows={4}
                            className="text-xs rounded-xl bg-background"
                        />
                        <p className="text-[11px] text-muted-foreground">
                            El aprendiz verá este comentario en su panel para saber con claridad qué debe corregir.
                        </p>
                    </div>

                    {/* Extended Due Date Input */}
                    <div className="space-y-1.5">
                        <Label htmlFor="resubmission-new-end-date" className="text-xs font-bold text-foreground flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-amber-600" />
                            Nueva Fecha Límite de Entrega (Extensión) *
                        </Label>
                        <Input
                            id="resubmission-new-end-date"
                            type="date"
                            min={minDateStr}
                            value={newEndDate}
                            onChange={(e) => setNewEndDate(e.target.value)}
                            required
                            className="h-10 text-xs rounded-xl bg-background"
                        />
                        <p className="text-[11px] text-muted-foreground">
                            Se extenderá la fecha de entrega del plan para darle el plazo necesario al aprendiz para cargar su corrección.
                        </p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-300/60 flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                        <span>
                            Al confirmar, el plan conservará las firmas de ambas partes y la entrega anterior quedará registrada en el historial de revisiones.
                        </span>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="font-bold bg-amber-600 hover:bg-amber-700 text-white border-amber-600 cursor-pointer"
                        >
                            Confirmar Solicitud de Reentrega
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
