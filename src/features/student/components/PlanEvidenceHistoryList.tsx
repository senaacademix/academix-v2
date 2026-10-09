"use client";

import React, { useState } from "react";
import { formatColombianDateTime, formatCalendarDate } from "@/lib/dateUtils";
import { EvidenceHistoryItem, ResubmissionState } from "../utils/improvementPlanHistory";
import { ExternalLink, History, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Clock, MessageSquareQuote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PlanEvidenceHistoryListProps {
    history: EvidenceHistoryItem[];
    resubmission?: ResubmissionState | null;
    defaultExpanded?: boolean;
    className?: string;
}

export function PlanEvidenceHistoryList({
    history,
    resubmission,
    defaultExpanded = false,
    className = "",
}: PlanEvidenceHistoryListProps) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    if (!history || history.length === 0) {
        return null;
    }

    const totalSubmissions = history.length;
    const hasResubmission = !!resubmission?.requested;

    return (
        <div className={`rounded-xl border border-border/70 bg-card/60 overflow-hidden text-left ${className}`}>
            {/* Header toggle */}
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-muted/40 hover:bg-muted/60 transition-colors">
                <div className="flex items-center gap-2">
                    <History className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-bold text-foreground">
                        Historial de Entregas ({totalSubmissions} {totalSubmissions === 1 ? "entrega" : "entregas"})
                    </span>
                    {hasResubmission && (
                        <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-300">
                            Reentrega Pendiente
                        </Badge>
                    )}
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="h-6 px-2 text-[11px] font-semibold gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                    {isExpanded ? (
                        <>
                            <span>Ocultar</span>
                            <ChevronUp className="w-3.5 h-3.5" />
                        </>
                    ) : (
                        <>
                            <span>Ver historial</span>
                            <ChevronDown className="w-3.5 h-3.5" />
                        </>
                    )}
                </Button>
            </div>

            {/* List */}
            {isExpanded && (
                <div className="p-3.5 space-y-3 divide-y divide-border/40">
                    {[...history].reverse().map((item, idx) => {
                        const isLatest = idx === 0;
                        const isResubmission = item.status === "resubmission_requested";
                        const isEvaluated = item.status === "evaluated";

                        return (
                            <div key={item.id || idx} className={`${idx > 0 ? "pt-3" : ""} space-y-2`}>
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <div className="flex items-center gap-2">
                                        <Badge
                                            variant="secondary"
                                            className={`text-[11px] font-bold ${
                                                isLatest
                                                    ? "bg-primary/15 text-primary border-primary/20"
                                                    : "bg-muted text-muted-foreground"
                                            }`}
                                        >
                                            Entrega #{item.version} {isLatest && "(Actual)"}
                                        </Badge>

                                        <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                                            <Clock className="w-3 h-3" />
                                            {formatColombianDateTime(item.submittedAt)}
                                        </span>
                                    </div>

                                    {/* Status Badge */}
                                    {isEvaluated ? (
                                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-300 gap-1">
                                            <CheckCircle2 className="w-3 h-3" /> Evaluada
                                        </Badge>
                                    ) : isResubmission ? (
                                        <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-300 gap-1">
                                            <AlertCircle className="w-3 h-3" /> Reentrega Solicitada
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-300 gap-1">
                                            <Clock className="w-3 h-3" /> Pendiente Revisión
                                        </Badge>
                                    )}
                                </div>

                                {/* Link to evidence */}
                                {item.evidenceUrl && (
                                    <div className="flex items-center gap-1.5 pl-1">
                                        <ExternalLink className="w-3.5 h-3.5 text-primary shrink-0" />
                                        <a
                                            href={item.evidenceUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-primary hover:underline font-semibold truncate"
                                        >
                                            Ver documento o enlace de evidencia entregada
                                        </a>
                                    </div>
                                )}

                                {/* Teacher feedback if reentrega requested */}
                                {item.feedback && (
                                    <div className="mt-2 p-2.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 text-xs space-y-1">
                                        <div className="flex items-center justify-between text-[11px] font-bold text-amber-800 dark:text-amber-300">
                                            <span className="flex items-center gap-1">
                                                <MessageSquareQuote className="w-3.5 h-3.5 shrink-0" />
                                                Retroalimentación del Instructor {item.teacherName ? `(${item.teacherName})` : ""}:
                                            </span>
                                            {item.requestedAt && (
                                                <span className="text-[10px] font-normal text-amber-700/80 dark:text-amber-400">
                                                    {formatColombianDateTime(item.requestedAt)}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-amber-900 dark:text-amber-200 text-xs italic pl-1 leading-relaxed">
                                            &ldquo;{item.feedback}&rdquo;
                                        </p>
                                        {item.extendedEndDate && (
                                            <div className="text-[11px] text-amber-800 dark:text-amber-300 font-semibold pt-1 border-t border-amber-200/50">
                                                Fecha límite extendida al: <span className="font-bold underline">{formatCalendarDate(item.extendedEndDate)}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
