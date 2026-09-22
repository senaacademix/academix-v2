"use client";

import React from "react";
import { ElectionTallyDTO, ElectionCandidateDTO } from "../../types";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Eye, Users, CheckCircle, Vote, BarChart3, HelpCircle } from "lucide-react";

interface ElectionTallyProps {
    tally: ElectionTallyDTO;
    candidates: ElectionCandidateDTO[];
    status: string;
}

export function ElectionTally({ tally, candidates, status }: ElectionTallyProps) {
    // Sort candidates by votesCount descending
    const sortedCandidates = [...candidates].sort((a, b) => b.votesCount - a.votesCount);

    return (
        <div className="flex flex-col gap-4 p-4 sm:p-6 bg-card rounded-2xl border border-border/70 shadow-2xs">
            {/* Header / Transparency notice */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3.5">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
                        <BarChart3 className="w-4 h-4" />
                    </div>
                    <div>
                        <h2 className="text-sm sm:text-base font-black text-foreground tracking-tight flex items-center gap-2">
                            Escrutinio y Conteo de Votos
                            {status === "VOTING" && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/25 animate-pulse">
                                    En Vivo
                                </span>
                            )}
                        </h2>
                        <p className="text-xs text-muted-foreground">
                            Resultados abiertos y auditables para todos los aprendices e instructores.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 self-start sm:self-auto">
                    <Badge variant="outline" className="text-[11px] font-semibold text-muted-foreground bg-muted/40 border-border/70 gap-1 px-2.5 py-1 rounded-xl">
                        <Eye className="w-3.5 h-3.5 text-primary" />
                        100% Transparente
                    </Badge>
                </div>
            </div>

            {/* Participation Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-muted/30 border border-border/50 flex flex-col gap-1">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Vote className="w-3.5 h-3.5 text-primary" />
                        Votos Emitidos
                    </span>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-black text-foreground tracking-tight">
                            {tally.totalVotes}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            de {tally.totalEligibleStudents} aprendices
                        </span>
                    </div>
                </div>

                <div className="p-3.5 rounded-xl bg-muted/30 border border-border/50 flex flex-col gap-1">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-primary" />
                        Participación
                    </span>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-black text-primary tracking-tight">
                            {tally.participationRate}%
                        </span>
                        <span className="text-xs text-muted-foreground">de la ficha</span>
                    </div>
                </div>

                <div className="p-3.5 rounded-xl bg-muted/30 border border-border/50 flex flex-col gap-1">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                        Voto en Blanco
                    </span>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-black text-foreground tracking-tight">
                            {tally.blankVotes}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            ({tally.blankVotesPercentage}%)
                        </span>
                    </div>
                </div>
            </div>

            {/* Participation Progress Bar */}
            <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs font-semibold">
                    <span className="text-muted-foreground">Progreso de votación del grupo</span>
                    <span className="text-foreground font-black">{tally.totalVotes} / {tally.totalEligibleStudents}</span>
                </div>
                <Progress value={tally.participationRate} className="h-2.5 rounded-full bg-muted" />
            </div>

            {/* Candidates Detailed Breakdown */}
            <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Desglose por Opción de Voto
                </h3>

                <div className="space-y-2.5">
                    {sortedCandidates.map((c, index) => {
                        const isLeading = index === 0 && c.votesCount > 0;
                        const isSecond = index === 1 && c.votesCount > 0;

                        return (
                            <div
                                key={c.id}
                                className="p-3 rounded-xl bg-card border border-border/60 flex flex-col gap-2 hover:border-border transition-colors"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-xs font-black text-muted-foreground w-4 text-center">
                                            #{index + 1}
                                        </span>
                                        <span className="text-xs sm:text-sm font-bold text-foreground truncate">
                                            {c.name}
                                        </span>
                                        {isLeading && (
                                            <Badge
                                                className={
                                                    status === "CLOSED"
                                                        ? "bg-amber-500 text-white dark:bg-amber-600 text-[10px] font-black px-2 py-0.5 rounded-full shadow-2xs"
                                                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-black px-2 py-0"
                                                }
                                            >
                                                {status === "CLOSED" ? "🥇 Vocero Principal" : "Liderando Vocería"}
                                            </Badge>
                                        )}
                                        {isSecond && (
                                            <Badge
                                                className={
                                                    status === "CLOSED"
                                                        ? "bg-sky-500 text-white dark:bg-sky-600 text-[10px] font-black px-2 py-0.5 rounded-full shadow-2xs"
                                                        : "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30 text-[10px] font-black px-2 py-0"
                                                }
                                            >
                                                {status === "CLOSED" ? "🥈 Vocero Suplente" : "Liderando Suplencia"}
                                            </Badge>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-sm font-black text-foreground">
                                            {c.votesCount} {c.votesCount === 1 ? "voto" : "votos"}
                                        </span>
                                        <span className="text-xs font-bold text-muted-foreground min-w-[40px] text-right">
                                            {c.percentage}%
                                        </span>
                                    </div>
                                </div>

                                <Progress
                                    value={c.percentage}
                                    className="h-2 rounded-full bg-muted"
                                />
                            </div>
                        );
                    })}

                    {/* Voto en blanco row */}
                    <div className="p-3 rounded-xl bg-card border border-dashed border-border/70 flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="text-xs font-black text-muted-foreground w-4 text-center">
                                    -
                                </span>
                                <span className="text-xs sm:text-sm font-bold text-foreground">
                                    Voto en Blanco
                                </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <span className="text-sm font-black text-foreground">
                                    {tally.blankVotes} {tally.blankVotes === 1 ? "voto" : "votos"}
                                </span>
                                <span className="text-xs font-bold text-muted-foreground min-w-[40px] text-right">
                                    {tally.blankVotesPercentage}%
                                </span>
                            </div>
                        </div>

                        <Progress
                            value={tally.blankVotesPercentage}
                            className="h-2 rounded-full bg-muted"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
