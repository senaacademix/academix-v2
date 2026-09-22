"use client";

import React from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Vote, AlertTriangle } from "lucide-react";

interface VoteConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    targetName: string;
    onConfirm: () => void;
    isSubmitting?: boolean;
}

export function VoteConfirmDialog({
    open,
    onOpenChange,
    targetName,
    onConfirm,
    isSubmitting = false,
}: VoteConfirmDialogProps) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="max-w-md rounded-3xl p-6">
                <AlertDialogHeader className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                        <Vote className="w-6 h-6" />
                    </div>

                    <AlertDialogTitle className="text-lg font-black text-foreground tracking-tight">
                        ¿Confirmar tu voto para la vocería?
                    </AlertDialogTitle>

                    <AlertDialogDescription className="text-xs sm:text-sm text-muted-foreground space-y-2">
                        <span>
                            Estás a punto de emitir tu voto a favor de:{" "}
                            <strong className="text-foreground font-black underline underline-offset-2">
                                {targetName}
                            </strong>
                            .
                        </span>
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-start gap-2 mt-2">
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                            <span>
                                <strong>Importante:</strong> Tu voto es completamente personal, definitivo y no podrá ser modificado ni cancelado una vez enviado.
                            </span>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter className="mt-4 gap-2">
                    <AlertDialogCancel
                        disabled={isSubmitting}
                        className="rounded-xl text-xs font-semibold"
                    >
                        Revisar opciones
                    </AlertDialogCancel>
                    <AlertDialogAction
                        disabled={isSubmitting}
                        onClick={(e) => {
                            e.preventDefault();
                            onConfirm();
                        }}
                        className="rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90"
                    >
                        {isSubmitting ? "Emitiendo voto..." : "Sí, confirmar mi voto"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
