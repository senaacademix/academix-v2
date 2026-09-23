"use client";

import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Award, Sparkles, Send } from "lucide-react";
import { toast } from "sonner";
import { postulateCandidateAction } from "../../actions/electionActions";

interface PostulationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    electionId: string;
    onSuccess: () => void;
}

export function PostulationDialog({
    open,
    onOpenChange,
    electionId,
    onSuccess,
}: PostulationDialogProps) {
    const [proposal, setProposal] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!proposal.trim()) {
            toast.error("Por favor ingresa una breve propuesta o mensaje para tus compañeros.");
            return;
        }

        try {
            setIsSubmitting(true);
            await postulateCandidateAction(electionId, proposal);
            toast.success("¡Te has postulado exitosamente como candidato a vocero!");
            setProposal("");
            onOpenChange(false);
            onSuccess();
        } catch (error: any) {
            toast.error(error.message || "Error al registrar la postulación.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md rounded-3xl p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <DialogHeader className="space-y-2">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/30">
                            <Award className="w-6 h-6" />
                        </div>
                        <DialogTitle className="text-lg font-black text-foreground tracking-tight">
                            Postularme como Vocero / Representante
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                            Como vocero serás el canal de comunicación entre tus compañeros de ficha, los instructores y la coordinación académica del SENA.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2">
                        <Label htmlFor="proposal" className="text-xs font-bold text-foreground">
                            Tus Propuestas y Motivación
                        </Label>
                        <Textarea
                            id="proposal"
                            value={proposal}
                            onChange={(e) => setProposal(e.target.value)}
                            placeholder="Describe brevemente tus propuestas, ideas de mejora para el grupo o por qué consideras que serías un buen vocero..."
                            rows={4}
                            className="rounded-xl text-xs resize-none"
                            maxLength={500}
                        />
                        <div className="flex justify-between items-center text-[11px] text-muted-foreground">
                            <span>Sé claro y propositivo con tus compañeros.</span>
                            <span>{proposal.length} / 500</span>
                        </div>
                    </div>

                    <DialogFooter className="mt-4 gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                            className="rounded-xl text-xs font-semibold"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting || !proposal.trim()}
                            className="rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90"
                        >
                            <Send className="w-3.5 h-3.5 mr-1.5" />
                            {isSubmitting ? "Registrando..." : "Confirmar Postulación"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
