"use client";

import React, { useState } from "react";
import { ArrowLeft, Scale, ShieldAlert, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GestorCommitteeView } from "./gestor/GestorCommitteeView";
import { TeacherCommitteeView } from "./teacher/TeacherCommitteeView";

interface CommitteeToolProps {
    onBack: () => void;
    userRole?: string;
    initialGroups?: any[];
    programId?: string;
    programName?: string;
}

export function CommitteeTool({
    onBack,
    userRole = "gestor",
    initialGroups = [],
    programId,
    programName
}: CommitteeToolProps) {
    const isGestorOrAdmin = userRole === "gestor" || userRole === "admin";
    const [viewMode, setViewMode] = useState<"gestor" | "teacher">(
        isGestorOrAdmin ? "gestor" : "teacher"
    );
    const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);

    const handleRoleSwitch = (mode: "gestor" | "teacher") => {
        setViewMode(mode);
        setSelectedProcessId(null);
    };

    return (
        <div className="w-full flex-1 flex flex-col space-y-4 animate-in fade-in duration-300">
            {/* Top Navigation Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border/80 shadow-2xs">
                {selectedProcessId ? (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedProcessId(null)}
                        className="h-9 px-3 text-xs font-semibold text-muted-foreground hover:text-foreground gap-1.5 rounded-xl"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Volver a Convocatorias de Comité</span>
                    </Button>
                ) : (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onBack}
                        className="h-9 px-3 text-xs font-semibold text-muted-foreground hover:text-foreground gap-1.5 rounded-xl"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Volver al Centro de Herramientas</span>
                    </Button>
                )}

                {/* Role Switcher if Gestor or Admin */}
                {isGestorOrAdmin && (
                    <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl border border-border/60 self-end sm:self-auto">
                        <Button
                            type="button"
                            size="sm"
                            variant={viewMode === "gestor" ? "default" : "ghost"}
                            onClick={() => handleRoleSwitch("gestor")}
                            className="h-7 text-xs font-semibold rounded-lg px-2.5 gap-1.5"
                        >
                            <Scale className="w-3.5 h-3.5" />
                            <span>Panel Gestor</span>
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant={viewMode === "teacher" ? "default" : "ghost"}
                            onClick={() => handleRoleSwitch("teacher")}
                            className="h-7 text-xs font-semibold rounded-lg px-2.5 gap-1.5"
                        >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Modo Reporte (Instructor)</span>
                        </Button>
                    </div>
                )}
            </div>

            {/* Main View Area */}
            {viewMode === "gestor" && isGestorOrAdmin ? (
                <GestorCommitteeView
                    programId={programId}
                    programName={programName}
                    selectedProcessId={selectedProcessId}
                    onSelectProcess={setSelectedProcessId}
                />
            ) : (
                <TeacherCommitteeView
                    initialGroups={initialGroups}
                    selectedProcessId={selectedProcessId}
                    onSelectProcess={setSelectedProcessId}
                />
            )}
        </div>
    );
}
