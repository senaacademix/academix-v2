"use client";

import React from "react";
import { ElectionCandidateDTO } from "../../types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserCheck, Quote, CheckCircle2, Vote } from "lucide-react";
import { cn } from "@/lib/utils";

interface CandidateCardProps {
    candidate: ElectionCandidateDTO;
    isSelected?: boolean;
    isVoted?: boolean;
    onSelect?: () => void;
    selectable?: boolean;
    showVotes?: boolean;
    rankBadge?: string;
    isVocero?: boolean;
    isSuplente?: boolean;
}

export function CandidateCard({
    candidate,
    isSelected = false,
    isVoted = false,
    onSelect,
    selectable = false,
    showVotes = false,
    rankBadge,
    isVocero = false,
    isSuplente = false
}: CandidateCardProps) {
    const initials = candidate.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

    return (
        <div
            onClick={selectable ? onSelect : undefined}
            className={cn(
                "relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl border transition-all duration-200",
                selectable && "cursor-pointer hover:scale-[1.01] hover:shadow-md",
                isSelected
                    ? "bg-primary/5 border-primary shadow-sm ring-2 ring-primary/30"
                    : isVoted
                    ? "bg-emerald-500/5 border-emerald-500/40 shadow-xs"
                    : isVocero
                    ? "bg-amber-500/5 border-amber-500/40 shadow-xs"
                    : isSuplente
                    ? "bg-sky-500/5 border-sky-500/40 shadow-xs"
                    : "bg-card border-border/70 hover:border-border"
            )}
        >
            {/* Badges on top */}
            <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                    {rankBadge && (
                        <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 rounded-full border-primary/30 bg-primary/10 text-primary">
                            {rankBadge}
                        </Badge>
                    )}
                    {isVocero && (
                        <Badge className="bg-amber-500 text-white dark:bg-amber-600 text-[10px] font-black px-2 py-0.5 rounded-full shadow-2xs">
                            Vocero Principal Electo
                        </Badge>
                    )}
                    {isSuplente && (
                        <Badge className="bg-sky-500 text-white dark:bg-sky-600 text-[10px] font-black px-2 py-0.5 rounded-full shadow-2xs">
                            Vocero Suplente Electo
                        </Badge>
                    )}
                </div>

                {isVoted && (
                    <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Tu Voto
                    </Badge>
                )}
            </div>

            {/* Candidate Identity */}
            <div className="flex items-center gap-3.5 mb-3">
                <Avatar className="w-12 h-12 rounded-2xl border border-border/80 shadow-2xs">
                    <AvatarImage src={candidate.image || undefined} alt={candidate.name} />
                    <AvatarFallback className="bg-primary/10 text-primary font-black text-sm rounded-2xl">
                        {initials}
                    </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-foreground truncate tracking-tight">
                        {candidate.name}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate">
                        {candidate.email}
                    </p>
                    {candidate.identificacion && (
                        <p className="text-[11px] text-muted-foreground/80 font-mono">
                            Doc: {candidate.identificacion}
                        </p>
                    )}
                </div>
            </div>

            {/* Proposal / Slogan */}
            <div className="flex-1 bg-muted/30 dark:bg-muted/20 rounded-xl p-3 border border-border/50 mb-3.5 text-xs text-foreground/90 relative">
                <Quote className="w-3.5 h-3.5 text-muted-foreground/40 absolute top-2 right-2" />
                <p className="line-clamp-4 italic text-muted-foreground/90 font-normal pr-4">
                    {candidate.proposal || "Sin propuesta detallada registrada."}
                </p>
            </div>

            {/* Bottom Actions / Votes */}
            <div className="flex items-center justify-between pt-2 border-t border-border/40 gap-2">
                {showVotes ? (
                    <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-semibold text-muted-foreground">
                            Votos obtenidos:
                        </span>
                        <div className="flex items-center gap-1.5">
                            <span className="text-sm font-black text-foreground">
                                {candidate.votesCount}
                            </span>
                            <span className="text-xs text-muted-foreground font-medium">
                                ({candidate.percentage}%)
                            </span>
                        </div>
                    </div>
                ) : selectable ? (
                    <Button
                        type="button"
                        size="sm"
                        variant={isSelected ? "default" : "outline"}
                        className={cn(
                            "w-full rounded-xl text-xs font-bold transition-all",
                            isSelected
                                ? "bg-primary text-primary-foreground shadow-xs"
                                : "hover:border-primary/50 text-foreground"
                        )}
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelect?.();
                        }}
                    >
                        <Vote className="w-3.5 h-3.5 mr-1.5" />
                        {isSelected ? "Seleccionado para Votar" : "Seleccionar Candidato"}
                    </Button>
                ) : (
                    <div className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-primary" />
                        <span>Postulante activo</span>
                    </div>
                )}
            </div>
        </div>
    );
}
