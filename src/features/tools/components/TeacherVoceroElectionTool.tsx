"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Award, ArrowLeft, Users, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TeacherElectionPanel } from "@/features/elections/components/teacher/TeacherElectionPanel";
import { getGroupElectionAction } from "@/features/elections/actions/electionActions";
import { GroupElectionDTO } from "@/features/elections/types";

interface TeacherVoceroElectionToolProps {
    groups?: any[];
    onBack: () => void;
}

export function TeacherVoceroElectionTool({ groups = [], onBack }: TeacherVoceroElectionToolProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const initialGroupId = searchParams.get("groupId");

    const [selectedGroupId, setSelectedGroupId] = useState<string>(
        initialGroupId && groups.some((g) => g.id === initialGroupId)
            ? initialGroupId
            : groups[0]?.id || ""
    );

    const [electionData, setElectionData] = useState<GroupElectionDTO | null>(null);
    const [isLoadingElection, setIsLoadingElection] = useState(false);

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

    // Fetch election for active group
    const loadElection = async (groupId: string) => {
        if (!groupId) return;
        try {
            setIsLoadingElection(true);
            const data = await getGroupElectionAction(groupId);
            setElectionData(data);
        } catch (err) {
            console.error("Error fetching group election:", err);
        } finally {
            setIsLoadingElection(false);
        }
    };

    useEffect(() => {
        if (activeGroup?.id) {
            loadElection(activeGroup.id);
        }
    }, [activeGroup?.id]);

    const studentCount = useMemo(() => {
        if (!activeGroup) return 0;
        const ids = new Set<string>();
        activeGroup.students?.forEach((s: any) => ids.add(s.id));
        activeGroup.groupEnrollments?.forEach((e: any) => ids.add(e.studentId));
        return ids.size;
    }, [activeGroup]);

    return (
        <div className="h-auto flex-1 flex flex-col min-h-0 gap-3.5 animate-in fade-in duration-300">
            {/* Compact Action Bar */}
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
                        <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/25 shrink-0">
                            <Award className="w-4 h-4" />
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                            <h1 className="text-xs sm:text-sm font-black text-foreground truncate tracking-tight">
                                Elección de <span className="text-primary">Vocero y Suplente</span>
                            </h1>
                            <Badge variant="outline" className="hidden md:inline-flex bg-primary/5 text-primary border-primary/20 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                                Instructor
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Right Side: Group Switcher */}
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
                    </div>
                )}
            </div>

            {/* Main Content Area */}
            {groups.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 bg-card rounded-3xl border border-dashed border-border text-center">
                    <AlertCircle className="w-10 h-10 text-muted-foreground/60 mb-2" />
                    <h3 className="text-sm font-bold text-foreground">No tienes fichas asignadas</h3>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                        Para habilitar una elección de vocero necesitas tener al menos un grupo o ficha asignada a tu usuario.
                    </p>
                </div>
            ) : isLoadingElection ? (
                <div className="flex items-center justify-center p-16 text-muted-foreground text-xs gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                    <span>Cargando datos electorales de la ficha...</span>
                </div>
            ) : (
                <div className="pb-8">
                    <TeacherElectionPanel
                        groupId={activeGroup.id}
                        groupName={activeGroup.name}
                        programName={activeGroup.program?.name}
                        totalStudents={studentCount}
                        initialElection={electionData}
                        onRefresh={() => loadElection(activeGroup.id)}
                    />
                </div>
            )}
        </div>
    );
}
