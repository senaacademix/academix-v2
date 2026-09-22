"use client";

import React, { useEffect, useState } from "react";
import { ElectionWinnersDTO, ElectionTallyDTO, ElectionCandidateDTO, GroupElectionDTO } from "../../types";
import confetti from "canvas-confetti";
import { Trophy, Award, AlertTriangle, Sparkles, CheckCircle2, HelpCircle, Users, BarChart3, ScrollText, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ElectionActaModal } from "./ElectionActaModal";

interface WinnerShowcaseProps {
    winners?: ElectionWinnersDTO;
    tally?: ElectionTallyDTO;
    candidates?: ElectionCandidateDTO[];
    totalVotes: number;
    election?: GroupElectionDTO;
    isTeacher?: boolean;
}

export function WinnerShowcase({ winners, tally, candidates = [], totalVotes, election, isTeacher = false }: WinnerShowcaseProps) {
    const [isActaOpen, setIsActaOpen] = useState(false);
    useEffect(() => {
        if (winners?.voceroPrincipal) {
            try {
                confetti({
                    particleCount: 90,
                    spread: 80,
                    origin: { y: 0.6 }
                });
            } catch (e) {
                // Ignore confetti errors if not supported
            }
        }
    }, [winners?.voceroPrincipal]);

    if (!winners) return null;

    if (winners.isBlankVoteWinner) {
        return (
            <div className="p-5 sm:p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="flex-1">
                    <h3 className="text-base font-black text-foreground tracking-tight">
                        Mayoría por Voto en Blanco
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                        El voto en blanco obtuvo la mayor cantidad de votos ({winners.summaryMessage}). De acuerdo con el reglamento democrático institucional, se recomienda convocar a una nueva postulación con nuevos candidatos.
                    </p>
                    {tally && (
                        <div className="mt-3 p-3 rounded-xl bg-card border border-border/70 flex items-center gap-4 text-xs">
                            <span className="font-semibold text-foreground">
                                Votos en Blanco: <strong>{tally.blankVotes}</strong> ({tally.blankVotesPercentage}%)
                            </span>
                            <span className="text-muted-foreground">
                                Total de votos: <strong>{totalVotes}</strong>
                            </span>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (winners.isTieForFirst) {
        return (
            <div className="p-5 sm:p-6 rounded-2xl bg-primary/10 border border-primary/30 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="flex-1">
                    <h3 className="text-base font-black text-foreground tracking-tight">
                        Empate en la Vocería Principal
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                        Los dos candidatos con mayor respaldo obtuvieron exactamente la misma cantidad de votos. El instructor puede dirimir o habilitar una segunda vuelta para definir la vocería principal.
                    </p>
                </div>
            </div>
        );
    }

    const { voceroPrincipal, voceroSuplente } = winners;

    return (
        <div className="p-5 sm:p-7 rounded-3xl bg-gradient-to-br from-amber-500/10 via-card to-sky-500/10 border border-border/80 shadow-md flex flex-col gap-6">
            {/* Header Title */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0 shadow-2xs">
                        <Trophy className="w-6 h-6" />
                    </div>
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            Escrutinio Definitivo
                        </span>
                        <h2 className="text-base sm:text-xl font-black text-foreground tracking-tight">
                            Conteo Oficial y Vocería Electa
                        </h2>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                    <Badge className="bg-emerald-500 text-white dark:bg-emerald-600 text-xs font-black px-3.5 py-1 rounded-full shadow-2xs">
                        Votación Concluida
                    </Badge>
                    {isTeacher && election && (
                        <Button
                            size="sm"
                            onClick={() => setIsActaOpen(true)}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold px-3.5 h-8 rounded-xl shadow-xs gap-1.5"
                        >
                            <ScrollText className="w-3.5 h-3.5" />
                            Acta Oficial
                        </Button>
                    )}
                </div>
            </div>

            {/* Official Tally Cards: Vocero Principal, Vocero Suplente, Voto en Blanco */}
            <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5 text-primary" />
                    Conteo Oficial de Votación
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    {/* Card 1: Vocero Principal */}
                    <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 flex flex-col justify-between gap-2.5">
                        <div className="flex items-center justify-between">
                            <Badge className="bg-amber-500 text-white dark:bg-amber-600 text-[10px] font-black px-2 py-0.5 rounded-full">
                                🥇 Vocero Principal
                            </Badge>
                            <span className="text-xs font-black text-amber-700 dark:text-amber-300">
                                Electo
                            </span>
                        </div>
                        <div>
                            <h4 className="text-sm sm:text-base font-black text-foreground truncate">
                                {voceroPrincipal?.name || "Sin definir"}
                            </h4>
                            <p className="text-[11px] text-muted-foreground truncate">
                                {voceroPrincipal?.email || ""}
                            </p>
                        </div>
                        <div className="pt-2 border-t border-amber-500/20 flex items-baseline justify-between">
                            <span className="text-xs font-semibold text-muted-foreground">Total votos:</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-lg font-black text-foreground">{voceroPrincipal?.votesCount ?? 0}</span>
                                <span className="text-xs font-bold text-muted-foreground">({voceroPrincipal?.percentage ?? 0}%)</span>
                            </div>
                        </div>
                    </div>

                    {/* Card 2: Vocero Suplente */}
                    <div className="p-4 rounded-2xl bg-sky-500/10 border-2 border-sky-500/40 flex flex-col justify-between gap-2.5">
                        <div className="flex items-center justify-between">
                            <Badge className="bg-sky-500 text-white dark:bg-sky-600 text-[10px] font-black px-2 py-0.5 rounded-full">
                                🥈 Vocero Suplente
                            </Badge>
                            <span className="text-xs font-black text-sky-700 dark:text-sky-300">
                                Electo
                            </span>
                        </div>
                        <div>
                            <h4 className="text-sm sm:text-base font-black text-foreground truncate">
                                {voceroSuplente?.name || "Sin definir"}
                            </h4>
                            <p className="text-[11px] text-muted-foreground truncate">
                                {voceroSuplente?.email || ""}
                            </p>
                        </div>
                        <div className="pt-2 border-t border-sky-500/20 flex items-baseline justify-between">
                            <span className="text-xs font-semibold text-muted-foreground">Total votos:</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-lg font-black text-foreground">{voceroSuplente?.votesCount ?? 0}</span>
                                <span className="text-xs font-bold text-muted-foreground">({voceroSuplente?.percentage ?? 0}%)</span>
                            </div>
                        </div>
                    </div>

                    {/* Card 3: Voto en Blanco */}
                    <div className="p-4 rounded-2xl bg-muted/40 border-2 border-dashed border-border/80 flex flex-col justify-between gap-2.5">
                        <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-[10px] font-bold text-muted-foreground bg-muted">
                                ⚪ Opción Democrática
                            </Badge>
                            <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        <div>
                            <h4 className="text-sm sm:text-base font-black text-foreground">
                                VOTO EN BLANCO
                            </h4>
                            <p className="text-[11px] text-muted-foreground">
                                Votos neutrales registrados
                            </p>
                        </div>
                        <div className="pt-2 border-t border-border/60 flex items-baseline justify-between">
                            <span className="text-xs font-semibold text-muted-foreground">Total votos:</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-lg font-black text-foreground">{tally?.blankVotes ?? 0}</span>
                                <span className="text-xs font-bold text-muted-foreground">({tally?.blankVotesPercentage ?? 0}%)</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Winner Profiles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Vocero Principal */}
                {voceroPrincipal && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-card border-2 border-amber-500/40 shadow-xs flex flex-col gap-3 relative overflow-hidden">
                        <div className="absolute -top-6 -right-6 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
                        <div className="flex items-center justify-between gap-2">
                            <Badge className="bg-amber-500 text-white dark:bg-amber-600 text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-2xs">
                                🥇 Vocero Principal
                            </Badge>
                            <span className="text-xs font-bold text-muted-foreground">
                                {voceroPrincipal.votesCount} votos ({voceroPrincipal.percentage}%)
                            </span>
                        </div>

                        <div className="flex items-center gap-3.5 pt-1">
                            <Avatar className="w-12 h-12 rounded-2xl border-2 border-amber-500/50 shadow-2xs">
                                <AvatarImage src={voceroPrincipal.image || undefined} />
                                <AvatarFallback className="bg-amber-500/20 text-amber-700 dark:text-amber-300 font-black">
                                    {voceroPrincipal.name.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                                <h4 className="text-sm sm:text-base font-black text-foreground truncate">
                                    {voceroPrincipal.name}
                                </h4>
                                <p className="text-xs text-muted-foreground truncate">
                                    {voceroPrincipal.email}
                                </p>
                            </div>
                        </div>

                        {voceroPrincipal.proposal && (
                            <p className="text-xs text-muted-foreground/90 italic bg-muted/40 p-2.5 rounded-xl border border-border/40 mt-1 line-clamp-2">
                                &ldquo;{voceroPrincipal.proposal}&rdquo;
                            </p>
                        )}
                    </div>
                )}

                {/* Vocero Suplente */}
                {voceroSuplente && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-card border-2 border-sky-500/40 shadow-xs flex flex-col gap-3 relative overflow-hidden">
                        <div className="absolute -top-6 -right-6 w-24 h-24 bg-sky-500/10 rounded-full blur-xl pointer-events-none" />
                        <div className="flex items-center justify-between gap-2">
                            <Badge className="bg-sky-500 text-white dark:bg-sky-600 text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-2xs">
                                🥈 Vocero Suplente
                            </Badge>
                            <span className="text-xs font-bold text-muted-foreground">
                                {voceroSuplente.votesCount} votos ({voceroSuplente.percentage}%)
                            </span>
                        </div>

                        <div className="flex items-center gap-3.5 pt-1">
                            <Avatar className="w-12 h-12 rounded-2xl border-2 border-sky-500/50 shadow-2xs">
                                <AvatarImage src={voceroSuplente.image || undefined} />
                                <AvatarFallback className="bg-sky-500/20 text-sky-700 dark:text-sky-300 font-black">
                                    {voceroSuplente.name.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                                <h4 className="text-sm sm:text-base font-black text-foreground truncate">
                                    {voceroSuplente.name}
                                </h4>
                                <p className="text-xs text-muted-foreground truncate">
                                    {voceroSuplente.email}
                                </p>
                            </div>
                        </div>

                        {voceroSuplente.proposal && (
                            <p className="text-xs text-muted-foreground/90 italic bg-muted/40 p-2.5 rounded-xl border border-border/40 mt-1 line-clamp-2">
                                &ldquo;{voceroSuplente.proposal}&rdquo;
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Official Election Minutes Banner (Solo para Docentes / Instructores) */}
            {isTeacher && election && (
                <div className="p-4 sm:p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/40 shadow-2xs">
                            <ScrollText className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="text-xs sm:text-sm font-black text-foreground">
                                Acta Oficial de Elección y Posesión Lista (Exclusivo Instructor)
                            </h4>
                            <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                Documento con fecha, métricas del censo, sufragio en blanco, certificación legal y responsabilidades del vocero y suplente.
                            </p>
                        </div>
                    </div>
                    <Button
                        size="sm"
                        onClick={() => setIsActaOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-xs gap-2 shrink-0 self-start sm:self-auto"
                    >
                        <FileText className="w-3.5 h-3.5" />
                        Ver y Descargar Acta en PDF
                    </Button>
                </div>
            )}

            {isTeacher && election && (
                <ElectionActaModal
                    election={election}
                    isOpen={isActaOpen}
                    onClose={() => setIsActaOpen(false)}
                />
            )}
        </div>
    );
}
