"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
    GraduationCap, 
    Layers, 
    BookOpen, 
    UserCheck, 
    Calendar, 
    Clock, 
    Building2, 
    Sparkles, 
    ShieldCheck, 
    Users, 
    Award,
    CheckCircle2,
    FileText,
    FileSpreadsheet,
    Loader2
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { exportProgramOverviewPdf, exportProgramOverviewExcel } from "../../utils/programExportUtils";

interface ProgramOverviewTabProps {
    program: any;
    onNavigateTab?: (tab: string) => void;
}

export function ProgramOverviewTab({ program, onNavigateTab }: ProgramOverviewTabProps) {
    const [isExportingPdf, setIsExportingPdf] = useState(false);
    const [isExportingExcel, setIsExportingExcel] = useState(false);

    const handleExportPdf = async () => {
        setIsExportingPdf(true);
        toast.info("Generando reporte PDF con @react-pdf/renderer...");
        try {
            await exportProgramOverviewPdf(program);
            toast.success("Reporte PDF descargado exitosamente");
        } catch (e) {
            console.error(e);
            toast.error("Error al exportar el reporte PDF");
        } finally {
            setIsExportingPdf(false);
        }
    };

    const handleExportExcel = async () => {
        setIsExportingExcel(true);
        toast.info("Generando reporte Excel con ExcelJS...");
        try {
            await exportProgramOverviewExcel(program);
            toast.success("Reporte Excel descargado exitosamente");
        } catch (e) {
            console.error(e);
            toast.error("Error al exportar el reporte Excel");
        } finally {
            setIsExportingExcel(false);
        }
    };

    const groups = program.groups || [];
    const periods = program.periods || [];
    const teachers = program.teachers || [];
    const gestores = program.gestores || [];
    const environments = program.environments || [];

    // Calculate students stats
    const totalStudents = groups.reduce((acc: number, g: any) => acc + (g.students?.length || 0), 0);
    const lectivaGroups = groups.filter((g: any) => g.categoria === "LECTIVA");
    const productivaGroups = groups.filter((g: any) => g.categoria === "PRODUCTIVA");
    const egresadosGroups = groups.filter((g: any) => g.categoria === "EGRESADOS");

    const lectivaStudents = lectivaGroups.reduce((acc: number, g: any) => acc + (g.students?.length || 0), 0);
    const productivaStudents = productivaGroups.reduce((acc: number, g: any) => acc + (g.students?.length || 0), 0);
    const egresadosStudents = egresadosGroups.reduce((acc: number, g: any) => acc + (g.students?.length || 0), 0);

    // Calculate courses and hours
    const normalPeriods = periods.filter((p: any) => !p.esEspecial);
    const specialPeriods = periods.filter((p: any) => p.esEspecial);

    let totalCoursesCount = 0;
    let totalWeeklyHours = 0;
    periods.forEach((p: any) => {
        (p.courses || []).forEach((c: any) => {
            totalCoursesCount++;
            totalWeeklyHours += c.weeklyHours || 0;
        });
    });

    // Dates formatting
    const formatDateSafe = (d: any) => {
        if (!d) return "No definida";
        try {
            return format(new Date(d), "dd 'de' MMMM, yyyy", { locale: es });
        } catch {
            return "No definida";
        }
    };

    return (
        <div className="space-y-6">
            {/* Top Action Bar with Export Buttons (Gestor Style) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border/80 shadow-xs">
                <div className="space-y-0.5">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <span>Resumen Ejecutivo del Programa</span>
                        <Badge variant="outline" className="text-[10px] font-bold bg-primary/5 text-primary border-primary/20">
                            Solo Lectura
                        </Badge>
                    </h3>
                    <p className="text-xs text-muted-foreground">
                        Indicadores consolidados, censo de aprendices y parámetros técnicos institucionales.
                    </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportPdf}
                        disabled={isExportingPdf}
                        className="h-8 gap-1.5 rounded-xl text-xs font-bold border-red-500/30 text-red-700 dark:text-red-300 bg-red-500/10 hover:bg-red-500/20 shadow-xs"
                        title="Exportar reporte en PDF (@react-pdf/renderer)"
                    >
                        {isExportingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />}
                        <span>Exportar PDF</span>
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportExcel}
                        disabled={isExportingExcel}
                        className="h-8 gap-1.5 rounded-xl text-xs font-bold border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 shadow-xs"
                        title="Exportar reporte en Excel estilizado (ExcelJS)"
                    >
                        {isExportingExcel ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />}
                        <span>Exportar Excel</span>
                    </Button>
                </div>
            </div>
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card 
                    className="border border-border/70 shadow-xs hover:border-blue-500/40 transition-all cursor-pointer bg-card/60 backdrop-blur-xs rounded-2xl"
                    onClick={() => onNavigateTab?.("groups")}
                >
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Aprendices Totales</p>
                            <h3 className="text-2xl font-black tracking-tight text-foreground">{totalStudents}</h3>
                            <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                                En {groups.length} {groups.length === 1 ? "ficha" : "fichas activas"}
                            </p>
                        </div>
                        <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
                            <GraduationCap className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>

                <Card 
                    className="border border-border/70 shadow-xs hover:border-emerald-500/40 transition-all cursor-pointer bg-card/60 backdrop-blur-xs rounded-2xl"
                    onClick={() => onNavigateTab?.("groups")}
                >
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Fichas / Grupos</p>
                            <h3 className="text-2xl font-black tracking-tight text-foreground">{groups.length}</h3>
                            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                                {lectivaGroups.length} Lectiva • {productivaGroups.length} Productiva
                            </p>
                        </div>
                        <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                            <Layers className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>

                <Card 
                    className="border border-border/70 shadow-xs hover:border-indigo-500/40 transition-all cursor-pointer bg-card/60 backdrop-blur-xs rounded-2xl"
                    onClick={() => onNavigateTab?.("curriculum")}
                >
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Materias Curriculares</p>
                            <h3 className="text-2xl font-black tracking-tight text-foreground">{totalCoursesCount}</h3>
                            <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                                {periods.length} {periods.length === 1 ? "periodo" : "periodos"} • {totalWeeklyHours}h semanales
                            </p>
                        </div>
                        <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0">
                            <BookOpen className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>

                <Card 
                    className="border border-border/70 shadow-xs hover:border-purple-500/40 transition-all cursor-pointer bg-card/60 backdrop-blur-xs rounded-2xl"
                    onClick={() => onNavigateTab?.("teachers")}
                >
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Equipo Docente</p>
                            <h3 className="text-2xl font-black tracking-tight text-foreground">{teachers.length}</h3>
                            <p className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">
                                Instructores habilitados
                            </p>
                        </div>
                        <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shrink-0">
                            <UserCheck className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Program Details & Categorization Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Distribution of students by stage */}
                <Card className="border border-border/80 bg-card shadow-xs rounded-3xl overflow-hidden lg:col-span-2">
                    <CardHeader className="p-5 border-b border-border/70">
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-primary" />
                            Distribución de Aprendices por Etapa de Formación
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Censo de aprendices matriculados en las diferentes etapas académicas del programa.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-foreground">Etapa Lectiva</span>
                                    <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[10px] font-bold">
                                        {lectivaGroups.length} Fichas
                                    </Badge>
                                </div>
                                <div className="text-2xl font-black text-slate-900 dark:text-white">
                                    {lectivaStudents}
                                </div>
                                <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                    <div 
                                        className="bg-blue-500 h-full rounded-full transition-all duration-500" 
                                        style={{ width: `${totalStudents > 0 ? (lectivaStudents / totalStudents) * 100 : 0}%` }}
                                    />
                                </div>
                                <p className="text-[11px] text-muted-foreground font-medium">
                                    {totalStudents > 0 ? Math.round((lectivaStudents / totalStudents) * 100) : 0}% del total de aprendices
                                </p>
                            </div>

                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-foreground">Etapa Productiva</span>
                                    <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px] font-bold">
                                        {productivaGroups.length} Fichas
                                    </Badge>
                                </div>
                                <div className="text-2xl font-black text-slate-900 dark:text-white">
                                    {productivaStudents}
                                </div>
                                <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                    <div 
                                        className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                                        style={{ width: `${totalStudents > 0 ? (productivaStudents / totalStudents) * 100 : 0}%` }}
                                    />
                                </div>
                                <p className="text-[11px] text-muted-foreground font-medium">
                                    {totalStudents > 0 ? Math.round((productivaStudents / totalStudents) * 100) : 0}% del total de aprendices
                                </p>
                            </div>

                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-foreground">Egresados / Graduados</span>
                                    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-bold">
                                        {egresadosGroups.length} Fichas
                                    </Badge>
                                </div>
                                <div className="text-2xl font-black text-slate-900 dark:text-white">
                                    {egresadosStudents}
                                </div>
                                <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                    <div 
                                        className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                                        style={{ width: `${totalStudents > 0 ? (egresadosStudents / totalStudents) * 100 : 0}%` }}
                                    />
                                </div>
                                <p className="text-[11px] text-muted-foreground font-medium">
                                    {totalStudents > 0 ? Math.round((egresadosStudents / totalStudents) * 100) : 0}% del total de aprendices
                                </p>
                            </div>
                        </div>

                        {/* Additional summary metrics */}
                        <div className="p-4 rounded-2xl bg-muted/30 border border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Building2 className="h-4 w-4 text-primary shrink-0" />
                                <span>Ambientes vinculados: <strong className="text-foreground">{environments.length} espacios</strong></span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Clock className="h-4 w-4 text-primary shrink-0" />
                                <span>Límite semanal docente: <strong className="text-foreground">{program.maxTeacherHours || 40} horas</strong></span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="h-4 w-4 text-primary shrink-0" />
                                <span>Periodos: <strong className="text-foreground">{normalPeriods.length} ordinarios, {specialPeriods.length} especiales</strong></span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Technical Information & Gestores Card */}
                <Card className="border border-border/80 bg-card shadow-xs rounded-3xl overflow-hidden flex flex-col">
                    <CardHeader className="p-5 border-b border-border/70">
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-primary" />
                            Ficha Técnica del Programa
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Parámetros y gestión institucional.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-5 space-y-4 flex-1">
                        <div className="space-y-3">
                            <div>
                                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Nombre Oficial</span>
                                <p className="text-sm font-bold text-foreground mt-0.5">{program.name}</p>
                            </div>

                            <div>
                                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Descripción Curricular</span>
                                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                    {program.description || "Sin descripción proporcionada para este programa de formación."}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60">
                                <div>
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Fecha de Inicio</span>
                                    <p className="text-xs font-semibold text-foreground mt-0.5">
                                        {formatDateSafe(program.startDate)}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Fecha de Finalización</span>
                                    <p className="text-xs font-semibold text-foreground mt-0.5">
                                        {formatDateSafe(program.endDate)}
                                    </p>
                                </div>
                            </div>

                            <div className="pt-3 border-t border-border/60">
                                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                                    Gestores Académicos Asignados
                                </span>
                                {gestores.length > 0 ? (
                                    <div className="space-y-2">
                                        {gestores.map((g: any) => (
                                            <div key={g.id} className="flex items-center gap-2.5 p-2 rounded-xl bg-muted/40 border border-border/60">
                                                <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                                                    {(g.name || "G").charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-bold text-foreground truncate">{g.name}</p>
                                                    <p className="text-[10px] text-muted-foreground truncate">{g.email}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground italic">
                                        Sin gestor académico asignado a este programa.
                                    </p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
