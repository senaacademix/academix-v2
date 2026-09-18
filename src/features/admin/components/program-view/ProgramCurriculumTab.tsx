"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
    BookOpen, 
    Calendar, 
    Clock, 
    Search, 
    Layers, 
    Sparkles, 
    Code, 
    Database, 
    Binary, 
    MessageSquare, 
    Terminal, 
    ShieldCheck, 
    Cloud, 
    Rocket, 
    NotebookTabs,
    CheckCircle2,
    FileText,
    FileSpreadsheet,
    Loader2
} from "lucide-react";
import { toast } from "sonner";
import { exportProgramCurriculumPdf, exportProgramCurriculumExcel } from "../../utils/programExportUtils";

interface ProgramCurriculumTabProps {
    program: any;
}

const getCourseIcon = (title: string) => {
    const t = (title || "").toLowerCase().trim();
    if (t.includes("programación") || t.includes("código") || t.includes("programacion")) {
        if (t.includes("introducción") || t.includes("introduccion")) return Terminal;
        return Code;
    }
    if (t.includes("datos") || t.includes("database") || t.includes("sql") || t.includes("nosql")) {
        return Database;
    }
    if (t.includes("matemática") || t.includes("matematica") || t.includes("cálculo") || t.includes("calculo") || t.includes("álgebra") || t.includes("algebra")) {
        return Binary;
    }
    if (t.includes("comunicación") || t.includes("comunicacion") || t.includes("ética") || t.includes("etica") || t.includes("inglés") || t.includes("ingles")) {
        if (t.includes("comunicación") || t.includes("comunicacion")) return MessageSquare;
        return BookOpen;
    }
    if (t.includes("arquitectura") || t.includes("ingeniería") || t.includes("ingenieria") || t.includes("diseño") || t.includes("metodología") || t.includes("metodologia") || t.includes("scrum")) {
        return Layers;
    }
    if (t.includes("pruebas") || t.includes("calidad") || t.includes("qa") || t.includes("seguridad") || t.includes("ciberseguridad")) {
        return ShieldCheck;
    }
    if (t.includes("despliegue") || t.includes("devops") || t.includes("nube") || t.includes("cloud") || t.includes("docker")) {
        return Cloud;
    }
    if (t.includes("proyecto") || t.includes("grado") || t.includes("tesis") || t.includes("innovación") || t.includes("innovacion")) {
        return Rocket;
    }
    return NotebookTabs;
};

export function ProgramCurriculumTab({ program }: ProgramCurriculumTabProps) {
    const periods = useMemo(() => program.periods || [], [program.periods]);
    const timelines = useMemo(() => program.timelines || [], [program.timelines]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTimelineFilter, setSelectedTimelineFilter] = useState<string>("ALL");

    const [isExportingPdf, setIsExportingPdf] = useState(false);
    const [isExportingExcel, setIsExportingExcel] = useState(false);

    const handleExportPdf = async () => {
        setIsExportingPdf(true);
        toast.info("Generando PDF del programa de formación con @react-pdf/renderer...");
        try {
            await exportProgramCurriculumPdf(program);
            toast.success("PDF del programa de formación descargado exitosamente");
        } catch (e) {
            console.error(e);
            toast.error("Error al exportar el programa de formación en PDF");
        } finally {
            setIsExportingPdf(false);
        }
    };

    const handleExportExcel = async () => {
        setIsExportingExcel(true);
        toast.info("Generando Excel del programa de formación con ExcelJS...");
        try {
            await exportProgramCurriculumExcel(program);
            toast.success("Excel del programa de formación descargado exitosamente");
        } catch (e) {
            console.error(e);
            toast.error("Error al exportar el programa de formación en Excel");
        } finally {
            setIsExportingExcel(false);
        }
    };

    // Filter periods & courses based on search and timeline
    const filteredPeriods = useMemo(() => {
        return periods
            .filter((p: any) => {
                if (selectedTimelineFilter === "ALL") return true;
                return p.timelineId ? p.timelineId === selectedTimelineFilter : false;
            })
            .map((p: any) => {
                const query = searchQuery.toLowerCase().trim();
                const matchedCourses = (p.courses || []).filter((c: any) => {
                    if (!query) return true;
                    return (
                        c.title.toLowerCase().includes(query) ||
                        (c.description && c.description.toLowerCase().includes(query)) ||
                        (c.badge && c.badge.toLowerCase().includes(query))
                    );
                });

                return {
                    ...p,
                    filteredCourses: matchedCourses
                };
            })
            .filter((p: any) => {
                // If there's a search query, only keep periods with matched courses or matched period name
                if (!searchQuery.trim()) return true;
                const matchesPeriodName = p.name.toLowerCase().includes(searchQuery.toLowerCase());
                return matchesPeriodName || p.filteredCourses.length > 0;
            });
    }, [periods, searchQuery, selectedTimelineFilter]);

    // Total stats
    const totalPeriods = periods.length;
    const totalCourses = periods.reduce((acc: number, p: any) => acc + (p.courses?.length || 0), 0);
    const totalHours = periods.reduce((acc: number, p: any) => {
        return acc + (p.courses || []).reduce((cAcc: number, c: any) => cAcc + (c.weeklyHours || 0), 0);
    }, 0);

    const filterOptions = useMemo(() => {
        if (timelines.length > 0) {
            return [
                { key: "ALL", label: "Todos los Programas", count: totalPeriods },
                ...timelines.map((tl: any) => ({
                    key: tl.id,
                    label: tl.name,
                    count: periods.filter((p: any) => p.timelineId ? p.timelineId === tl.id : tl.isDefault).length,
                }))
            ];
        }
        return [
            { key: "ALL", label: "Todos los Periodos", count: totalPeriods },
        ];
    }, [timelines, periods, totalPeriods]);

    return (
        <div className="space-y-6">
            {/* Top filter bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border/80 shadow-xs">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full sm:max-w-[55%] scrollbar-thin">
                    {filterOptions.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setSelectedTimelineFilter(tab.key)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                                selectedTimelineFilter === tab.key
                                    ? "bg-primary text-primary-foreground shadow-xs"
                                    : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
                            }`}
                        >
                            <span className="truncate max-w-[180px]">{tab.label}</span>
                            <Badge variant="secondary" className="px-1.5 py-0 text-[10px] h-4 leading-none">
                                {tab.count}
                            </Badge>
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative w-full sm:w-60 shrink-0">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar materia o competencia..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-9 text-xs rounded-xl"
                        />
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportPdf}
                        disabled={isExportingPdf}
                        className="h-9 gap-1.5 rounded-xl text-xs font-bold border-red-500/30 text-red-700 dark:text-red-300 bg-red-500/10 hover:bg-red-500/20 shadow-xs shrink-0"
                        title="Exportar programa de formación en PDF (@react-pdf/renderer)"
                    >
                        {isExportingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />}
                        <span>Exportar PDF</span>
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportExcel}
                        disabled={isExportingExcel}
                        className="h-9 gap-1.5 rounded-xl text-xs font-bold border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 shadow-xs shrink-0"
                        title="Exportar programa de formación en Excel estilizado (ExcelJS)"
                    >
                        {isExportingExcel ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />}
                        <span>Exportar Excel</span>
                    </Button>
                </div>
            </div>

            {/* Curriculum statistics banner */}
            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                        <BookOpen className="h-5 w-5" />
                    </div>
                    <div>
                        <h4 className="font-bold text-foreground">Estructura Curricular del Programa</h4>
                        <p className="text-muted-foreground text-[11px]">
                            Distribución de competencias formativas organizadas por trimestres o fases de aprendizaje.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4 text-xs">
                    <span className="font-semibold text-foreground">
                        <strong className="text-primary font-black">{totalPeriods}</strong> Periodos
                    </span>
                    <span className="text-muted-foreground">•</span>
                    <span className="font-semibold text-foreground">
                        <strong className="text-primary font-black">{totalCourses}</strong> Materias
                    </span>
                    <span className="text-muted-foreground">•</span>
                    <span className="font-semibold text-foreground">
                        <strong className="text-primary font-black">{totalHours}h</strong> Semanales Curriculares
                    </span>
                </div>
            </div>

            {/* Periods and Courses List */}
            {filteredPeriods.length === 0 ? (
                <div className="p-12 text-center bg-card rounded-3xl border border-dashed border-border/70">
                    <BookOpen className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                    <h4 className="font-bold text-foreground text-sm">No se encontraron periodos o materias</h4>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-1">
                        Verifica el filtro o prueba con otro término de búsqueda.
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {filteredPeriods.map((period: any, pIndex: number) => {
                        const courses = period.filteredCourses || [];
                        const periodWeeklyHours = courses.reduce((sum: number, c: any) => sum + (c.weeklyHours || 0), 0);

                        return (
                            <Card key={period.id} className="border border-border/80 bg-card shadow-xs rounded-3xl overflow-hidden">
                                <div className="p-4 sm:p-5 bg-muted/20 border-b border-border/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xs shrink-0">
                                            {pIndex + 1}
                                        </div>
                                        <div>
                                            <div className="flex items-center flex-wrap gap-2">
                                                <h3 className="text-base font-extrabold text-foreground">{period.name}</h3>
                                                {period.timeline?.name && (
                                                    <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 text-primary border-primary/30">
                                                        {period.timeline.name}
                                                    </Badge>
                                                )}
                                            </div>
                                            {period.description && (
                                                <p className="text-xs text-muted-foreground mt-0.5">{period.description}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 shrink-0 text-xs font-semibold text-muted-foreground">
                                        <Badge variant="secondary" className="text-xs font-bold px-2.5 py-0.5">
                                            {courses.length} {courses.length === 1 ? "Materia" : "Materias"}
                                        </Badge>
                                        <span className="flex items-center gap-1 text-primary font-bold">
                                            <Clock className="h-3.5 w-3.5" />
                                            {periodWeeklyHours}h / semana
                                        </span>
                                    </div>
                                </div>

                                <CardContent className="p-5">
                                    {courses.length === 0 ? (
                                        <p className="text-xs text-muted-foreground italic py-3 text-center">
                                            Sin materias registradas en este periodo.
                                        </p>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                            {courses.map((course: any) => {
                                                const CourseIcon = getCourseIcon(course.title);

                                                return (
                                                    <div 
                                                        key={course.id}
                                                        className="p-4 rounded-2xl bg-card border border-border/70 hover:border-border hover:shadow-xs transition-all flex flex-col justify-between gap-3"
                                                    >
                                                        <div className="space-y-2">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                                                                    <CourseIcon className="h-4 w-4" />
                                                                </div>
                                                                {course.weeklyHours ? (
                                                                    <Badge variant="outline" className="text-[10px] font-bold bg-muted/50">
                                                                        {course.weeklyHours}h / sem
                                                                    </Badge>
                                                                ) : null}
                                                            </div>

                                                            <div>
                                                                <h4 className="text-xs font-black text-foreground line-clamp-2">
                                                                    {course.title}
                                                                </h4>
                                                                <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                                                                    {course.description || "Sin descripción detallada de competencia."}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {course.badge && (
                                                            <div className="pt-2 border-t border-border/40">
                                                                <span className="text-[10px] font-semibold text-primary px-2 py-0.5 rounded-md bg-primary/10">
                                                                    {course.badge}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
