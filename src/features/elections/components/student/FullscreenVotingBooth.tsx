"use client";

import React, { useState } from "react";
import { ElectionCandidateDTO } from "../../types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
    Vote,
    AlertTriangle,
    CheckCircle2,
    X,
    Quote,
    HelpCircle,
    Sparkles,
    ShieldCheck,
    Users,
} from "lucide-react";

interface FullscreenVotingBoothProps {
    open: boolean;
    onClose: () => void;
    candidates: ElectionCandidateDTO[];
    groupName: string;
    programName?: string;
    onVoteSubmit: (candidateId?: string, isBlankVote?: boolean) => Promise<void>;
    isSubmitting: boolean;
}

export function FullscreenVotingBooth({
    open,
    onClose,
    candidates,
    groupName,
    programName,
    onVoteSubmit,
    isSubmitting,
}: FullscreenVotingBoothProps) {
    // Selected option for confirmation alert
    const [selectedCandidate, setSelectedCandidate] = useState<ElectionCandidateDTO | null>(null);
    const [selectedBlank, setSelectedBlank] = useState(false);
    const [confirmAlertOpen, setConfirmAlertOpen] = useState(false);

    if (!open) return null;

    const handleCandidateClick = (c: ElectionCandidateDTO) => {
        setSelectedCandidate(c);
        setSelectedBlank(false);
        setConfirmAlertOpen(true);
    };

    const handleBlankClick = () => {
        setSelectedCandidate(null);
        setSelectedBlank(true);
        setConfirmAlertOpen(true);
    };

    const handleConfirmVote = async () => {
        if (selectedBlank) {
            await onVoteSubmit(undefined, true);
        } else if (selectedCandidate) {
            await onVoteSubmit(selectedCandidate.id, false);
        }
        setConfirmAlertOpen(false);
    };

    const candidateName = selectedBlank
        ? "VOTO EN BLANCO"
        : selectedCandidate?.name || "Candidato";

    return (
        <div className="fixed inset-0 z-50 bg-background/98 backdrop-blur-2xl flex flex-col overflow-y-auto animate-in fade-in duration-200">
            {/* Top Bar Navigation */}
            <div className="sticky top-0 z-10 bg-card/90 backdrop-blur-md border-b border-border/80 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
                        <Vote className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-sm sm:text-base font-black text-foreground tracking-tight">
                                Cabina de Votación Virtual
                            </h2>
                            <Badge className="bg-emerald-500 text-white dark:bg-emerald-600 text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-2xs">
                                Urna Activa
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                            Ficha: <strong>{groupName}</strong> {programName ? `• ${programName}` : ""}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 border border-border/60 px-3 py-1.5 rounded-xl font-medium">
                        <ShieldCheck className="w-4 h-4 text-primary" />
                        <span>Voto único, personal e irreversible</span>
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted"
                    >
                        <X className="w-4 h-4 mr-1 sm:mr-1.5" />
                        <span className="hidden sm:inline">Ver escrutinio</span>
                    </Button>
                </div>
            </div>

            {/* Main Content Area: Centered Fullscreen Ballot */}
            <div className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-12 flex flex-col gap-8">
                {/* Heading and Instructions */}
                <div className="text-center max-w-2xl mx-auto space-y-2.5">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Elección de Vocero y Suplente</span>
                    </div>
                    <h1 className="text-2xl sm:text-4xl font-black text-foreground tracking-tight">
                        ¿Por quién deseas votar?
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        Selecciona a tu candidato de preferencia o la casilla de voto en blanco. Al hacer clic sobre cualquier opción, se te solicitará confirmación y <strong>no podrás cambiar tu elección</strong> una vez confirmada.
                    </p>
                </div>

                {/* Cards Grid: Large Candidates Cards + Blank Vote */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 items-stretch">
                    {candidates.map((c, index) => {
                        const initials = c.name
                            .split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase();

                        return (
                            <div
                                key={c.id}
                                onClick={() => handleCandidateClick(c)}
                                className="group relative rounded-3xl bg-card border-2 border-border/80 hover:border-primary hover:shadow-xl transition-all duration-200 p-6 flex flex-col justify-between cursor-pointer hover:-translate-y-1"
                            >
                                <div className="space-y-4">
                                    {/* Candidate Header & Tag */}
                                    <div className="flex items-center justify-between">
                                        <Badge variant="outline" className="text-xs font-black px-2.5 py-1 rounded-xl bg-muted/60 border-border/70 text-foreground">
                                            Candidato #{index + 1}
                                        </Badge>
                                        <span className="text-[11px] font-bold text-muted-foreground">
                                            Ficha {groupName}
                                        </span>
                                    </div>

                                    {/* Identity */}
                                    <div className="flex items-center gap-4">
                                        <Avatar className="w-16 h-16 rounded-2xl border-2 border-border/80 group-hover:border-primary shadow-xs transition-colors">
                                            <AvatarImage src={c.image || undefined} alt={c.name} />
                                            <AvatarFallback className="bg-primary/10 text-primary font-black text-lg rounded-2xl">
                                                {initials}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-base sm:text-lg font-black text-foreground truncate tracking-tight group-hover:text-primary transition-colors">
                                                {c.name}
                                            </h3>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {c.email}
                                            </p>
                                            {c.identificacion && (
                                                <p className="text-[11px] text-muted-foreground/80 font-mono mt-0.5">
                                                    Doc: {c.identificacion}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Proposal */}
                                    <div className="bg-muted/40 dark:bg-muted/20 rounded-2xl p-4 border border-border/60 text-xs text-foreground/90 relative min-h-[90px] flex flex-col justify-center">
                                        <Quote className="w-4 h-4 text-muted-foreground/30 absolute top-3 right-3" />
                                        <p className="line-clamp-4 italic text-muted-foreground font-normal pr-4 leading-relaxed">
                                            &ldquo;{c.proposal || "Propuestas en pro del bienestar y desarrollo académico de la ficha."}&rdquo;
                                        </p>
                                    </div>
                                </div>

                                {/* Big Action Button */}
                                <Button
                                    type="button"
                                    size="lg"
                                    className="w-full mt-6 rounded-2xl bg-primary text-primary-foreground text-xs sm:text-sm font-black shadow-md hover:bg-primary/90 h-12 gap-2"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleCandidateClick(c);
                                    }}
                                >
                                    <Vote className="w-4 h-4" />
                                    Votar por {c.name.split(" ")[0]}
                                </Button>
                            </div>
                        );
                    })}

                    {/* VOTO EN BLANCO: Big Card */}
                    <div
                        onClick={handleBlankClick}
                        className="group relative rounded-3xl bg-card border-2 border-dashed border-border/80 hover:border-primary hover:shadow-xl transition-all duration-200 p-6 flex flex-col justify-between cursor-pointer hover:-translate-y-1"
                    >
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Badge variant="outline" className="text-xs font-bold px-2.5 py-1 rounded-xl bg-muted/60 border-border/70 text-muted-foreground">
                                    Opción Democrática
                                </Badge>
                                <HelpCircle className="w-4 h-4 text-muted-foreground/60" />
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-muted/70 border-2 border-dashed border-border/80 flex items-center justify-center text-muted-foreground text-2xl font-black shrink-0">
                                    ⚪
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-base sm:text-lg font-black text-foreground tracking-tight group-hover:text-primary transition-colors">
                                        VOTO EN BLANCO
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        Opción constitucional y reglamentaria
                                    </p>
                                </div>
                            </div>

                            <div className="bg-muted/40 dark:bg-muted/20 rounded-2xl p-4 border border-border/60 text-xs text-muted-foreground min-h-[90px] flex items-center leading-relaxed">
                                Si consideras que ninguno de los compañeros postulados te representa para la vocería, puedes manifestar tu posición con el voto en blanco.
                            </div>
                        </div>

                        {/* Big Action Button */}
                        <Button
                            type="button"
                            variant="outline"
                            size="lg"
                            className="w-full mt-6 rounded-2xl border-2 border-border/80 hover:border-primary text-foreground text-xs sm:text-sm font-black h-12 gap-2 shadow-xs"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleBlankClick();
                            }}
                        >
                            <Vote className="w-4 h-4" />
                            Votar en Blanco
                        </Button>
                    </div>
                </div>
            </div>

            {/* Immediate Confirmation Alert Dialog */}
            <AlertDialog open={confirmAlertOpen} onOpenChange={setConfirmAlertOpen}>
                <AlertDialogContent className="max-w-md rounded-3xl p-6">
                    <AlertDialogHeader className="space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/30">
                            <AlertTriangle className="w-6 h-6" />
                        </div>

                        <AlertDialogTitle className="text-lg font-black text-foreground tracking-tight">
                            ¿Confirmas tu elección de voto?
                        </AlertDialogTitle>

                        <AlertDialogDescription className="text-xs sm:text-sm text-muted-foreground space-y-2.5">
                            <p>
                                Has seleccionado votar por:{" "}
                                <strong className="text-foreground font-black underline underline-offset-4">
                                    {candidateName}
                                </strong>
                                .
                            </p>
                            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs font-semibold flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                                <span>
                                    <strong>Atención:</strong> Una vez confirmado, tu voto es definitivo e irreversible. <strong>NO se puede cambiar la elección</strong> si decides votar por esta opción.
                                </span>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter className="mt-5 gap-2">
                        <AlertDialogCancel
                            disabled={isSubmitting}
                            className="rounded-xl text-xs font-semibold"
                        >
                            Cancelar / Volver a elegir
                        </AlertDialogCancel>
                        <AlertDialogAction
                            disabled={isSubmitting}
                            onClick={(e) => {
                                e.preventDefault();
                                handleConfirmVote();
                            }}
                            className="rounded-xl bg-primary text-primary-foreground text-xs font-black shadow-md hover:bg-primary/90 px-4"
                        >
                            {isSubmitting ? "Emitiendo voto..." : "Sí, confirmar voto"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
