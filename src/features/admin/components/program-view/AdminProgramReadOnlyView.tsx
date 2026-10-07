"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
    GraduationCap, 
    ArrowLeft, 
    Layers, 
    BookOpen, 
    UserCheck, 
    Building2, 
    BarChart3, 
    Eye, 
    Edit, 
    ChevronRight,
    Users,
    Sparkles
} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ProgramOverviewTab } from "./ProgramOverviewTab";
import { ProgramGroupsTab } from "./ProgramGroupsTab";
import { ProgramCurriculumTab } from "./ProgramCurriculumTab";
import { ProgramTeachersTab } from "./ProgramTeachersTab";
import { ProgramEnvironmentsTab } from "./ProgramEnvironmentsTab";
import { ProgramScheduleTab } from "./ProgramScheduleTab";
import { CalendarClock } from "lucide-react";

interface AdminProgramReadOnlyViewProps {
    program: any;
    allPrograms?: any[];
    isObserver?: boolean;
    onBack: () => void;
    onSelectProgram?: (programId: string) => void;
    onEditProgram?: (program: any) => void;
}

export function AdminProgramReadOnlyView({
    program,
    allPrograms = [],
    isObserver = false,
    onBack,
    onSelectProgram,
    onEditProgram,
}: AdminProgramReadOnlyViewProps) {
    const [activeTab, setActiveTab] = useState<string>(isObserver ? "groups" : "overview");

    const groups = program.groups || [];
    const periods = program.periods || [];
    const teachers = program.teachers || [];
    const environments = program.environments || [];
    const gestores = program.gestores || [];
    const totalStudents = groups.reduce((acc: number, g: any) => acc + (g.students?.length || 0), 0);

    return (
        <div className="space-y-6">
            {/* Navigation and Program Header */}
            <div className="flex flex-col gap-4">
                {/* Back button and program switcher */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onBack}
                        className="gap-2 text-xs font-bold rounded-xl hover:bg-muted/60 self-start text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span>{isObserver ? "Volver a Programas" : "Volver a Lista de Áreas"}</span>
                    </Button>

                    {allPrograms.length > 1 && onSelectProgram && (
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                            <span className="text-xs text-muted-foreground font-semibold">
                                {isObserver ? "Programa:" : "Cambiar área:"}
                            </span>
                            <Select value={program.id} onValueChange={onSelectProgram}>
                                <SelectTrigger className="h-8 text-xs font-bold rounded-xl w-[220px]">
                                    <SelectValue placeholder={isObserver ? "Seleccionar programa..." : "Seleccionar área..."} />
                                </SelectTrigger>
                                <SelectContent>
                                    {allPrograms.map((p: any) => (
                                        <SelectItem key={p.id} value={p.id} className="text-xs font-medium">
                                            {p.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>

                {/* Sleek, Compact Program Header Card */}
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-card via-card to-primary/5 border border-border/80 shadow-xs relative overflow-hidden">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2.5 rounded-2xl bg-primary text-primary-foreground shadow-xs shrink-0">
                                <GraduationCap className="h-6 w-6" />
                            </div>
                            <div className="space-y-0.5 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="text-lg sm:text-xl font-black text-foreground tracking-tight truncate">
                                        {program.name}
                                    </h1>
                                    <Badge variant="outline" className={cn("text-[10px] font-bold px-2 py-0.5 gap-1 shrink-0", isObserver ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20")}>
                                        <Eye className="h-3 w-3" />
                                        {isObserver ? "Solo Lectura • Observador" : "Solo Lectura • Administrador"}
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground font-medium truncate max-w-2xl">
                                    {program.description || (isObserver ? "Programa de formación profesional institucional." : "Sin descripción oficial proporcionada para esta área de formación profesional.")}
                                </p>
                            </div>
                        </div>

                        {/* KPI Badges Strip */}
                        <div className="flex flex-wrap items-center gap-2 text-xs shrink-0">
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-muted/60 border border-border/60">
                                <Users className="h-3.5 w-3.5 text-blue-500" />
                                <span className="text-muted-foreground font-medium text-[11px]">Aprendices:</span>
                                <strong className="text-foreground font-bold">{totalStudents}</strong>
                            </div>
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-muted/60 border border-border/60">
                                <Layers className="h-3.5 w-3.5 text-emerald-500" />
                                <span className="text-muted-foreground font-medium text-[11px]">Fichas:</span>
                                <strong className="text-foreground font-bold">{groups.length}</strong>
                            </div>
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-muted/60 border border-border/60">
                                <BookOpen className="h-3.5 w-3.5 text-indigo-500" />
                                <span className="text-muted-foreground font-medium text-[11px]">Líneas de Tiempo:</span>
                                <strong className="text-foreground font-bold">{program.timelines?.length || 0}</strong>
                            </div>

                            {!isObserver && onEditProgram && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onEditProgram(program)}
                                    className="h-8 gap-1.5 text-xs font-bold rounded-xl border-border/80 hover:bg-muted ml-1"
                                >
                                    <Edit className="h-3.5 w-3.5" />
                                    <span>Editar Parámetros</span>
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            {isObserver ? (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
                    <div className="bg-card p-1.5 rounded-2xl border border-border/80 shadow-2xs">
                        <TabsList className="flex w-full bg-transparent p-0 justify-start overflow-x-auto scrollbar-none gap-1">
                            <TabsTrigger
                                value="groups"
                                className="rounded-xl flex-1 py-2 text-xs font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                            >
                                <Layers className="h-4 w-4" />
                                <span>Fichas y Aprendices ({groups.length})</span>
                            </TabsTrigger>

                            <TabsTrigger
                                value="curriculum"
                                className="rounded-xl flex-1 py-2 text-xs font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                            >
                                <BookOpen className="h-4 w-4" />
                                <span>Líneas de Tiempo Curriculares ({program.timelines?.length || 0})</span>
                            </TabsTrigger>

                            <TabsTrigger
                                value="schedules"
                                className="rounded-xl flex-1 py-2 text-xs font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                            >
                                <CalendarClock className="h-4 w-4" />
                                <span>Horario del Programa</span>
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="groups" className="mt-0 focus-visible:outline-none">
                        <ProgramGroupsTab
                            program={program}
                            allPrograms={allPrograms}
                            onSelectProgram={onSelectProgram}
                            isObserver={isObserver}
                        />
                    </TabsContent>

                    <TabsContent value="curriculum" className="mt-0 focus-visible:outline-none">
                        <ProgramCurriculumTab program={program} />
                    </TabsContent>

                    <TabsContent value="schedules" className="mt-0 focus-visible:outline-none">
                        <ProgramScheduleTab program={program} />
                    </TabsContent>
                </Tabs>
            ) : (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <div className="bg-card p-1.5 rounded-2xl border border-border/80 shadow-xs">
                        <TabsList className="flex w-full bg-transparent p-0 justify-start overflow-x-auto scrollbar-none gap-1">
                            <TabsTrigger
                                value="groups"
                                className="rounded-xl flex-1 py-2 text-xs font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                            >
                                <Layers className="h-4 w-4" />
                                <span>Fichas y Aprendices ({groups.length})</span>
                            </TabsTrigger>

                            <TabsTrigger
                                value="schedules"
                                className="rounded-xl flex-1 py-2 text-xs font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                            >
                                <CalendarClock className="h-4 w-4" />
                                <span>Horario del Programa</span>
                            </TabsTrigger>

                            <TabsTrigger
                                value="overview"
                                className="rounded-xl flex-1 py-2 text-xs font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                            >
                                <BarChart3 className="h-4 w-4" />
                                <span>Resumen General</span>
                            </TabsTrigger>

                            <TabsTrigger
                                value="curriculum"
                                className="rounded-xl flex-1 py-2 text-xs font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                            >
                                <BookOpen className="h-4 w-4" />
                                <span>Estructura Curricular ({periods.length})</span>
                            </TabsTrigger>

                            <TabsTrigger
                                value="teachers"
                                className="rounded-xl flex-1 py-2 text-xs font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                            >
                                <UserCheck className="h-4 w-4" />
                                <span>Instructores ({teachers.length})</span>
                            </TabsTrigger>

                            <TabsTrigger
                                value="environments"
                                className="rounded-xl flex-1 py-2 text-xs font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                            >
                                <Building2 className="h-4 w-4" />
                                <span>Ambientes</span>
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="groups" className="mt-0 focus-visible:outline-none">
                        <ProgramGroupsTab
                            program={program}
                            allPrograms={allPrograms}
                            onSelectProgram={onSelectProgram}
                            isObserver={isObserver}
                        />
                    </TabsContent>

                    <TabsContent value="schedules" className="mt-0 focus-visible:outline-none">
                        <ProgramScheduleTab program={program} />
                    </TabsContent>

                    <TabsContent value="overview" className="mt-0 focus-visible:outline-none">
                        <ProgramOverviewTab program={program} onNavigateTab={setActiveTab} />
                    </TabsContent>

                    <TabsContent value="curriculum" className="mt-0 focus-visible:outline-none">
                        <ProgramCurriculumTab program={program} />
                    </TabsContent>

                    <TabsContent value="teachers" className="mt-0 focus-visible:outline-none">
                        <ProgramTeachersTab program={program} />
                    </TabsContent>

                    <TabsContent value="environments" className="mt-0 focus-visible:outline-none">
                        <ProgramEnvironmentsTab program={program} />
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}
