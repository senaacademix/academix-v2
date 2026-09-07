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
    const [activeTab, setActiveTab] = useState<string>("overview");

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
                        <span>Volver a Lista de Programas</span>
                    </Button>

                    {allPrograms.length > 1 && onSelectProgram && (
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                            <span className="text-xs text-muted-foreground font-semibold">Cambiar programa:</span>
                            <Select value={program.id} onValueChange={onSelectProgram}>
                                <SelectTrigger className="h-8 text-xs font-bold rounded-xl w-[220px]">
                                    <SelectValue placeholder="Seleccionar programa..." />
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

                {/* Main Hero Card for Program */}
                <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-card via-card to-primary/5 border border-border/80 shadow-xs relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

                    <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                            <div className="p-3 rounded-2xl bg-primary text-primary-foreground shadow-sm shrink-0 mt-0.5">
                                <GraduationCap className="h-7 w-7" />
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                                        {program.name}
                                    </h1>
                                    <Badge variant="outline" className={cn("text-[10px] font-bold px-2 py-0.5 gap-1", isObserver ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20")}>
                                        <Eye className="h-3 w-3" />
                                        {isObserver ? "Solo Lectura • Observador" : "Solo Lectura • Administrador"}
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground font-medium max-w-2xl leading-relaxed">
                                    {program.description || "Sin descripción oficial proporcionada para este programa de formación profesional."}
                                </p>

                                {/* Gestores list */}
                                {gestores.length > 0 && (
                                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                        <span className="text-[11px] font-bold text-muted-foreground">Gestores:</span>
                                        {gestores.map((g: any) => (
                                            <Badge key={g.id} variant="outline" className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20">
                                                {g.name}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {!isObserver && onEditProgram && (
                            <div className="shrink-0 self-end md:self-center">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onEditProgram(program)}
                                    className="h-8 gap-1.5 text-xs font-bold rounded-xl border-border/80 hover:bg-muted"
                                >
                                    <Edit className="h-3.5 w-3.5" />
                                    <span>Editar Parámetros</span>
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Quick KPI Strip inside hero */}
                    <div className="mt-5 pt-4 border-t border-border/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-blue-500" />
                            <span className="text-muted-foreground font-medium">Aprendices:</span>
                            <strong className="text-foreground font-bold">{totalStudents}</strong>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-emerald-500" />
                            <span className="text-muted-foreground font-medium">Fichas:</span>
                            <strong className="text-foreground font-bold">{groups.length}</strong>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-indigo-500" />
                            <span className="text-muted-foreground font-medium">Periodos:</span>
                            <strong className="text-foreground font-bold">{periods.length}</strong>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-purple-500" />
                            <span className="text-muted-foreground font-medium">Instructores:</span>
                            <strong className="text-foreground font-bold">{teachers.length}</strong>
                        </div>
                    </div>
                </div>
            </div>

            {/* Read-Only Tabs Container */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <div className="bg-card p-1.5 rounded-2xl border border-border/80 shadow-xs">
                    <TabsList className="flex w-full bg-transparent p-0 justify-start overflow-x-auto scrollbar-none gap-1">
                        <TabsTrigger
                            value="overview"
                            className="rounded-xl flex-1 py-2 text-xs font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                        >
                            <BarChart3 className="h-4 w-4" />
                            <span>Resumen General</span>
                        </TabsTrigger>

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
                            <span>Malla Curricular ({periods.length})</span>
                        </TabsTrigger>

                        <TabsTrigger
                            value="teachers"
                            className="rounded-xl flex-1 py-2 text-xs font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                        >
                            <UserCheck className="h-4 w-4" />
                            <span>Equipo Docente ({teachers.length})</span>
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

                <TabsContent value="overview" className="mt-0 focus-visible:outline-none">
                    <ProgramOverviewTab program={program} onNavigateTab={setActiveTab} />
                </TabsContent>

                <TabsContent value="groups" className="mt-0 focus-visible:outline-none">
                    <ProgramGroupsTab program={program} />
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
        </div>
    );
}
