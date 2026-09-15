"use client";

import React from "react";
import { FileSpreadsheet, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SofiaReportUploader } from "./SofiaReportUploader";
import { SofiaHelpGuideModal } from "./SofiaHelpGuideModal";

interface SofiaReportsToolProps {
    onBack?: () => void;
}

export function SofiaReportsTool({ onBack }: SofiaReportsToolProps) {
    return (
        <div className="space-y-6 pb-12 animate-in fade-in duration-300">
            {/* Top Title Banner */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-card p-5 rounded-2xl border border-border/70 shadow-xs">
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                        {onBack && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onBack}
                                className="h-9 px-3 gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground border-border/80 bg-muted/30 hover:bg-muted/60 rounded-xl mr-1"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                <span>Catálogo</span>
                            </Button>
                        )}
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 border border-emerald-500/20 shadow-2xs">
                            <FileSpreadsheet className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
                                    Reporte de Juicios Evaluativos
                                </h1>
                                <Badge
                                    variant="outline"
                                    className="text-[10px] py-0 px-2 border-emerald-500/30 text-emerald-600 bg-emerald-500/5 font-semibold"
                                >
                                    Autónoma
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Generador visual de juicios evaluativos, analítica de aprendices y organizador de RA por periodos.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <SofiaHelpGuideModal />
                </div>
            </div>

            {/* Main Tool Content */}
            <SofiaReportUploader />
        </div>
    );
}

