"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Dices, ArrowLeft, Users, Sparkles, FolderOpen, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Roulette } from "@/features/teacher/components/Roulette";
import { cn } from "@/lib/utils";

interface TeacherRouletteToolProps {
    groups?: any[];
    onBack: () => void;
}

export function TeacherRouletteTool({ groups = [], onBack }: TeacherRouletteToolProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const initialGroupId = searchParams.get("groupId");

    // Selected Group state
    const [selectedGroupId, setSelectedGroupId] = useState<string>(
        initialGroupId && groups.some((g) => g.id === initialGroupId)
            ? initialGroupId
            : groups[0]?.id || ""
    );

    useEffect(() => {
        if (initialGroupId && groups.some((g) => g.id === initialGroupId)) {
            setSelectedGroupId(initialGroupId);
        } else if (!selectedGroupId && groups.length > 0) {
            setSelectedGroupId(groups[0].id);
        }
    }, [initialGroupId, groups, selectedGroupId]);

    const activeGroup = useMemo(() => {
        return groups.find((g) => g.id === selectedGroupId) || groups[0] || null;
    }, [groups, selectedGroupId]);

    const handleGroupChange = (groupId: string) => {
        setSelectedGroupId(groupId);
        const params = new URLSearchParams(searchParams.toString());
        params.set("groupId", groupId);
        router.replace(`${pathname}?${params.toString()}`);
    };

    const studentCandidates = useMemo(() => {
        if (!activeGroup?.students) return [];
        return activeGroup.students.map((s: any) => ({ user: s }));
    }, [activeGroup]);

    return (
        <div className="h-full flex-1 flex flex-col min-h-0 gap-2.5 animate-in fade-in duration-300 overflow-hidden">
            {/* Compact Institutional Action Bar */}
            <div className="flex items-center justify-between gap-3 bg-card px-3 sm:px-4 py-2 rounded-2xl border border-border/70 shadow-2xs shrink-0">
                {/* Left Side: Back + Icon + Title + Role Badge */}
                <div className="flex items-center gap-2.5 min-w-0">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onBack}
                        className="h-8 px-2.5 gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-xl"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Herramientas</span>
                        <span className="sm:hidden">Volver</span>
                    </Button>

                    <div className="h-4 w-px bg-border/80 hidden sm:block" />

                    <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
                            <Dices className="w-4 h-4" />
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                            <h1 className="text-xs sm:text-sm font-black text-foreground truncate tracking-tight">
                                Ruleta de <span className="text-primary">Participación y Notas</span>
                            </h1>
                            <Badge variant="outline" className="hidden md:inline-flex bg-primary/5 text-primary border-primary/20 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                                Instructor
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Right Side: Group Switcher & Active Count */}
                {groups.length > 0 && (
                    <div className="flex items-center gap-2 shrink-0">
                        <Select value={activeGroup?.id || ""} onValueChange={handleGroupChange}>
                            <SelectTrigger className="h-8 text-xs font-bold rounded-xl border-border/70 bg-background shadow-xs w-[170px] sm:w-[240px] px-2.5">
                                <Users className="w-3.5 h-3.5 text-primary shrink-0 mr-1" />
                                <SelectValue placeholder="Seleccionar grupo..." />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl">
                                {groups.map((group) => (
                                    <SelectItem key={group.id} value={group.id} className="text-xs font-semibold rounded-xl">
                                        {group.name} {group.code ? `(${group.code})` : ""}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Badge variant="secondary" className="hidden sm:inline-flex text-[11px] font-bold px-2.5 py-1 rounded-xl shrink-0">
                            {studentCandidates.length} aprendices
                        </Badge>
                    </div>
                )}
            </div>

            {/* Content Area - 100% full height */}
            {groups.length === 0 ? (
                <div className="flex-1 rounded-3xl border border-dashed border-border/80 p-12 text-center bg-card flex flex-col items-center justify-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground">
                        <FolderOpen className="w-7 h-7" />
                    </div>
                    <div className="space-y-1 max-w-md">
                        <h3 className="font-bold text-base text-foreground">No tienes fichas asignadas</h3>
                        <p className="text-xs text-muted-foreground">
                            Para utilizar la ruleta, debes tener al menos un grupo o ficha asignado con aprendices matriculados.
                        </p>
                    </div>
                </div>
            ) : studentCandidates.length === 0 ? (
                <div className="flex-1 rounded-3xl border border-dashed border-border/80 p-12 text-center bg-card flex flex-col items-center justify-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                        <AlertCircle className="w-7 h-7" />
                    </div>
                    <div className="space-y-1 max-w-md">
                        <h3 className="font-bold text-base text-foreground">Esta ficha no tiene aprendices</h3>
                        <p className="text-xs text-muted-foreground">
                            La ficha seleccionada ({activeGroup?.name}) no tiene aprendices activos matriculados para girar la ruleta.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="flex-1 min-h-0 w-full overflow-hidden">
                    <Roulette
                        students={studentCandidates}
                        courseId={activeGroup?.id || ""}
                        groupName={activeGroup?.name}
                        groupCode={activeGroup?.code}
                    />
                </div>
            )}
        </div>
    );
}
