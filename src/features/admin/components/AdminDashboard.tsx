"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
    Users, 
    BookOpen, 
    Activity, 
    ShieldCheck, 
    UserCheck, 
    GraduationCap, 
    Settings,
    ArrowUpRight,
    TrendingUp,
    Clock,
    UserPlus,
    Sparkles,
    FolderKanban,
    Layers,
    CalendarClock,
    BarChart3,
    School,
    ArrowRight,
    RotateCcw,
    ChevronRight,
    AlertCircle,
    CheckCircle2,
    HelpCircle
} from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { AdminDashboardHelpModal, AdminDashboardTabKey } from "./AdminDashboardHelpModal";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { formatName } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface ManagedProgramItem {
    id: string;
    name: string;
    description?: string | null;
    studentsCount?: number;
    teachersCount?: number;
    coursesCount?: number;
    activeCoursesCount?: number;
    groupsCount?: number;
    periodsCount?: number;
    environmentsCount?: number;
    _count?: {
        groups: number;
        periods: number;
        environments?: number;
        teachers?: number;
    };
}

interface AdminDashboardProps {
    stats: {
        users: {
            admin: number;
            teacher: number;
            student: number;
            total: number;
        };
        courses: {
            total: number;
            active: number;
            archived: number;
        };
        groups?: {
            total: number;
        };
        programs?: {
            total: number;
        };
        managedProgramsList?: ManagedProgramItem[];
        activity: {
            submissions: number;
        };
        health: {
            connected: boolean;
        };
    };
    recentActivity: any[];
    isObserver?: boolean;
    currentUserRole?: string;
    userName?: string;
    announcements?: AnnouncementItem[];
}

import { useGestorProgram } from "@/features/gestor/context/GestorProgramContext";
import { AnnouncementFeedWidget } from "@/features/announcements/components/AnnouncementFeedWidget";
import { AnnouncementItem } from "@/features/announcements/types";

export function AdminDashboard({ 
    stats, 
    recentActivity, 
    isObserver = false,
    currentUserRole = "admin",
    userName,
    announcements = []
}: AdminDashboardProps) {
    const isGestor = currentUserRole === "gestor";
    const managedPrograms = stats.managedProgramsList || [];
    const { selectProgram } = useGestorProgram();

    // Selected Program State for Gestor
    const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
    const [helpModalOpen, setHelpModalOpen] = useState(false);
    const [helpInitialTab, setHelpInitialTab] = useState<AdminDashboardTabKey>("overview");

    const currentProgram = selectedProgramId 
        ? managedPrograms.find((p) => p.id === selectedProgramId) || null 
        : null;

    // Filter activity by selected program if gestor has selected a program
    const filteredRecentActivity = isGestor && currentProgram
        ? recentActivity.filter((a) => !a.programId || a.programId === currentProgram.id)
        : recentActivity;

    // KPIs when coordinator/admin or when gestor has chosen a program
    const kpis = isGestor && currentProgram ? [
        {
            title: "Aprendices Matriculados",
            value: currentProgram.studentsCount ?? 0,
            description: `${currentProgram.studentsCount ?? 0} aprendices en este programa`,
            icon: GraduationCap,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
            link: `/dashboard/admin/users?programId=${currentProgram.id}`
        },
        {
            title: "Fichas / Grupos Activos",
            value: currentProgram.groupsCount ?? currentProgram._count?.groups ?? 0,
            description: "Fichas de formación vigentes",
            icon: Layers,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
            link: `/dashboard/admin/courses?programId=${currentProgram.id}`
        },
        {
            title: "Materias / Competencias",
            value: currentProgram.coursesCount ?? 0,
            description: `${currentProgram.activeCoursesCount ?? 0} materias activas`,
            icon: BookOpen,
            color: "text-indigo-500",
            bg: "bg-indigo-500/10",
            link: `/dashboard/admin/courses?programId=${currentProgram.id}`
        },
        {
            title: "Instructores Vinculados",
            value: currentProgram.teachersCount ?? currentProgram._count?.teachers ?? 0,
            description: "Instructores en el programa",
            icon: UserCheck,
            color: "text-purple-500",
            bg: "bg-purple-500/10",
            link: `/dashboard/admin/users?programId=${currentProgram.id}`
        }
    ] : [
        {
            title: "Aprendices Matriculados",
            value: stats.users.student,
            description: `${stats.users.student} aprendices en el centro`,
            icon: GraduationCap,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
            link: "/dashboard/admin/users"
        },
        {
            title: "Instructores Activos",
            value: stats.users.teacher,
            description: "Planta de instructores registrada",
            icon: UserCheck,
            color: "text-indigo-500",
            bg: "bg-indigo-500/10",
            link: "/dashboard/admin/users"
        },
        {
            title: "Fichas / Grupos Activos",
            value: (stats as any).groups?.total ?? 0,
            description: "Fichas de formación vigentes",
            icon: Layers,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
            link: "/dashboard/admin/courses"
        },
        {
            title: "Áreas de Formación",
            value: (stats as any).programs?.total ?? 0,
            description: "Áreas curriculares activas",
            icon: FolderKanban,
            color: "text-purple-500",
            bg: "bg-purple-500/10",
            link: "/dashboard/admin/courses"
        }
    ];

    const userDistribution = isGestor && currentProgram ? [
        { label: "Aprendices", value: currentProgram.studentsCount ?? 0, icon: GraduationCap, color: "bg-blue-500" },
        { label: "Instructores", value: currentProgram.teachersCount ?? 0, icon: UserCheck, color: "bg-indigo-500" },
    ] : [
        { label: "Aprendices", value: stats.users.student, icon: GraduationCap, color: "bg-blue-500" },
        { label: "Instructores", value: stats.users.teacher, icon: UserCheck, color: "bg-indigo-500" },
        { label: "Gestores", value: (stats.users as any).gestor || 0, icon: Users, color: "bg-emerald-500" },
        { label: "Administradores", value: stats.users.admin, icon: ShieldCheck, color: "bg-purple-500" },
    ];

    // Operational modules for the selected program or system-wide
    const operationalModules = isGestor && currentProgram ? [
        {
            title: "Gestión de Usuarios",
            description: "Administración de aprendices, instructores, fichas e importación masiva.",
            link: `/dashboard/admin/users?programId=${currentProgram.id}`,
            icon: Users,
            color: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20"
        },
        {
            title: "Estructura Curricular",
            description: "Administra el área de formación, trimestres, competencias y asignación de ambientes.",
            link: `/dashboard/admin/courses?programId=${currentProgram.id}`,
            icon: BookOpen,
            color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
        },
        {
            title: "Programación Horaria",
            description: "Gestión de franjas horarias, eventos institucionales y novedades por horario.",
            link: `/dashboard/admin/schedules?programId=${currentProgram.id}`,
            icon: CalendarClock,
            color: "text-teal-600 dark:text-teal-400 bg-teal-500/10 border-teal-500/20"
        },
        {
            title: "Reportes y Analítica",
            description: "Control de asistencia, seguimiento académico y novedades de los aprendices.",
            link: `/dashboard/admin/analytics?programId=${currentProgram.id}`,
            icon: BarChart3,
            color: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20"
        }
    ] : [
        {
            title: "Gestión de Usuarios",
            description: isObserver 
                ? "Consulta de aprendices, instructores, gestores y directivos del centro."
                : "Administración integral de aprendices, instructores, gestores, directivos y roles.",
            link: "/dashboard/admin/users",
            icon: Users,
            color: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20"
        },
        {
            title: "Estructura Curricular y Sedes",
            description: isObserver
                ? "Auditoría de áreas de formación, fichas, competencias, sedes y ambientes."
                : "Áreas de formación, fichas vigentes, competencias y parametrización de sedes y ambientes.",
            link: "/dashboard/admin/courses",
            icon: BookOpen,
            color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
        },
        {
            title: "Programación y Mallas Horarias",
            description: isObserver
                ? "Supervisión de mallas horarias, jornadas, eventos y disponibilidad docente."
                : "Diseño, publicación, control de cruces de mallas y bloqueo trimestral de disponibilidad.",
            link: "/dashboard/admin/schedules",
            icon: CalendarClock,
            color: "text-teal-600 dark:text-teal-400 bg-teal-500/10 border-teal-500/20"
        },
        {
            title: "Reportes y Analítica Global",
            description: "Analítica institucional, matrices de asistencia, juicios evaluativos y trazabilidad.",
            link: "/dashboard/admin/analytics",
            icon: BarChart3,
            color: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20"
        }
    ];

    // =========================================================================
    // VISTA 1: GESTOR ACADÉMICO - PANTALLA DE SELECCIÓN DE PROGRAMA DE FORMACIÓN
    // =========================================================================
    if (isGestor && !selectedProgramId) {
        return (
            <div className="space-y-8 animate-in fade-in duration-500 pb-12">
                {/* Hero Header para Selección de Programa */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="relative rounded-3xl bg-card border border-border/80 p-6 sm:p-8 backdrop-blur-2xl shadow-sm overflow-hidden transition-colors"
                >
                    <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/10 blur-[100px] rounded-full pointer-events-none" />

                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold shadow-2xs">
                                <Sparkles className="w-3.5 h-3.5 text-primary" />
                                <span>Panel del Gestor Académico</span>
                            </div>
                            <h1 className="text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight">
                                Selecciona tu{" "}
                                <span className="bg-gradient-to-r from-foreground via-foreground/80 to-primary bg-clip-text text-transparent">
                                    Área de Formación
                                </span>
                            </h1>
                            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed font-medium">
                                {userName ? `Hola ${userName}. ` : ""}
                                Selecciona una de las áreas de formación asignadas por la Coordinación Académica para ingresar y administrar sus fichas, aprendices, horarios y módulos operativos.
                            </p>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setHelpInitialTab("programs");
                                            setHelpModalOpen(true);
                                        }}
                                        className="gap-2 rounded-2xl h-11 px-4 text-xs font-bold border-border/80 text-foreground bg-background/80 hover:bg-primary/10 hover:border-primary/40 hover:text-primary shadow-2xs transition-all cursor-pointer"
                                    >
                                        <HelpCircle className="h-4 w-4 text-primary" />
                                        <span className="hidden sm:inline">¿Qué puedo hacer acá?</span>
                                        <span className="sm:hidden">Ayuda</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" align="end" className="bg-popover text-popover-foreground border border-border shadow-md text-xs font-semibold px-3 py-1.5 rounded-xl">
                                    Guía de áreas y funciones para el Gestor
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    </div>
                </motion.div>

                {/* Si no tiene programas asignados */}
                {managedPrograms.length === 0 ? (
                    <div className="p-8 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex flex-col items-center text-center gap-4">
                        <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                            <AlertCircle className="w-8 h-8" />
                        </div>
                        <div className="space-y-1 max-w-md">
                            <h3 className="text-base font-bold text-amber-900 dark:text-amber-200">
                                Sin áreas de formación asignadas
                            </h3>
                            <p className="text-xs text-amber-800/80 dark:text-amber-300/80 leading-relaxed">
                                Aún no tienes áreas vinculadas a tu perfil. Solicita a la Coordinación Académica que te asigne tus áreas de formación para poder ingresar.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-black text-foreground tracking-tight flex items-center gap-2">
                                    <School className="w-5 h-5 text-primary" />
                                    Tus Áreas Asignadas ({managedPrograms.length})
                                </h2>
                                <p className="text-xs text-muted-foreground font-medium">
                                    Haz clic en el área que deseas gestionar para abrir su panel de control.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {managedPrograms.map((prog) => (
                                <Card 
                                    key={prog.id} 
                                    className="group rounded-3xl border border-border/80 shadow-xs bg-card hover:border-primary/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 overflow-hidden flex flex-col justify-between"
                                >
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="p-3.5 rounded-2xl bg-primary/10 text-primary border border-primary/20 shrink-0 group-hover:scale-110 transition-transform">
                                                <School className="w-6 h-6" />
                                            </div>
                                            <Badge variant="outline" className="text-xs font-bold px-2.5 py-1 rounded-xl bg-muted/40 border-border/80">
                                                {prog.groupsCount ?? prog._count?.groups ?? 0} {(prog.groupsCount ?? prog._count?.groups ?? 0) === 1 ? "Ficha" : "Fichas"}
                                            </Badge>
                                        </div>

                                        <CardTitle className="text-lg font-bold text-foreground mt-4 leading-snug group-hover:text-primary transition-colors">
                                            {prog.name}
                                        </CardTitle>
                                        
                                        {prog.description && (
                                            <CardDescription className="text-xs line-clamp-2 mt-1">
                                                {prog.description}
                                            </CardDescription>
                                        )}
                                    </CardHeader>

                                    <CardContent className="pt-0 space-y-4">
                                        {/* Subcounts Grid */}
                                        <div className="grid grid-cols-3 gap-2 text-xs py-3 px-3 rounded-2xl bg-muted/40 border border-border/50 text-center">
                                            <div>
                                                <span className="text-muted-foreground block text-[10px] font-semibold uppercase">Aprendices</span>
                                                <span className="font-bold text-foreground text-sm">{prog.studentsCount ?? 0}</span>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground block text-[10px] font-semibold uppercase">Materias</span>
                                                <span className="font-bold text-foreground text-sm">{prog.coursesCount ?? 0}</span>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground block text-[10px] font-semibold uppercase">Instructores</span>
                                                <span className="font-bold text-foreground text-sm">{prog.teachersCount ?? 0}</span>
                                            </div>
                                        </div>

                                        <Button 
                                            onClick={() => selectProgram(prog.id, prog)}
                                            className="w-full rounded-2xl h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-md shadow-primary/20 gap-2 group/btn"
                                        >
                                            <span>Ingresar al Panel</span>
                                            <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* Modal de Ayuda del Dashboard de Administrador y Gestor */}
                <AdminDashboardHelpModal
                    open={helpModalOpen}
                    onOpenChange={setHelpModalOpen}
                    initialTab={helpInitialTab}
                />
            </div>
        );
    }

    // =========================================================================
    // VISTA 2: PANEL DE CONTROL COMPLETO (Similar al del Coordinador)
    // Para el Administrador/Coordinador Global O para el Gestor con Programa Seleccionado
    // =========================================================================
    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            {/* Header Hero Banner */}
            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="relative rounded-3xl bg-card border border-border/80 p-6 sm:p-8 backdrop-blur-2xl shadow-sm overflow-hidden transition-colors"
            >
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/10 blur-[100px] rounded-full pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold shadow-2xs">
                            <Sparkles className="w-3.5 h-3.5 text-primary" />
                            <span>
                                {isObserver 
                                    ? "Modo Observador Institucional" 
                                    : isGestor && currentProgram 
                                        ? `Gestión de Área: ${currentProgram.name}` 
                                        : "Panel de Administración Central"
                                }
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight">
                            {isObserver ? (
                                <>
                                    Panel de{" "}
                                    <span className="bg-gradient-to-r from-foreground via-foreground/80 to-primary bg-clip-text text-transparent">
                                        Supervisión y Auditoría
                                    </span>
                                </>
                            ) : isGestor && currentProgram ? (
                                <>
                                    Panel de{" "}
                                    <span className="bg-gradient-to-r from-foreground via-foreground/80 to-primary bg-clip-text text-transparent">
                                        Control Curricular
                                    </span>
                                </>
                            ) : (
                                <>
                                    Panel de{" "}
                                    <span className="bg-gradient-to-r from-foreground via-foreground/80 to-primary bg-clip-text text-transparent">
                                        Control Institucional
                                    </span>
                                </>
                            )}
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground max-w-xl leading-relaxed font-medium">
                            {isObserver
                                ? "Auditoría en tiempo real, consulta curricular, supervisión de mallas y métricas analíticas del centro."
                                : isGestor && currentProgram 
                                    ? `Métricas en tiempo real, gestión de usuarios, estructura curricular y programación horaria para ${currentProgram.name}.`
                                    : "Métricas consolidadas, estructura académica, programación horaria y gestión global de la plataforma AcademiX."
                            }
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setHelpInitialTab(isGestor ? "programs" : "overview");
                                        setHelpModalOpen(true);
                                    }}
                                    className="rounded-2xl h-11 px-4 border-border/80 bg-background/80 text-foreground hover:bg-primary/10 hover:border-primary/40 hover:text-primary text-xs font-bold shadow-2xs gap-2 cursor-pointer"
                                >
                                    <HelpCircle className="h-4 w-4 text-primary" />
                                    <span className="hidden sm:inline">¿Qué puedo hacer acá?</span>
                                    <span className="sm:hidden">Ayuda</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" align="end" className="bg-popover text-popover-foreground border border-border shadow-md text-xs font-semibold px-3 py-1.5 rounded-xl">
                                Guía de administración, monitoreo y gestión
                            </TooltipContent>
                        </Tooltip>

                        {isGestor ? (
                            <>
                                {/* Botón para cambiar de programa */}
                                <Button 
                                    variant="outline" 
                                    onClick={() => setSelectedProgramId(null)}
                                    className="rounded-2xl h-11 border-border/80 bg-background/80 text-foreground hover:bg-muted text-xs font-bold shadow-xs gap-2"
                                >
                                    <RotateCcw className="h-4 w-4 text-primary" />
                                    Cambiar Área
                                </Button>

                                <Button asChild className="rounded-2xl h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-md shadow-primary/20">
                                    <Link href={currentProgram ? `/dashboard/admin/users?programId=${currentProgram.id}` : "/dashboard/admin/users"}>
                                        <UserPlus className="h-4 w-4 mr-2" />
                                        Gestión de Usuarios
                                    </Link>
                                </Button>
                            </>
                        ) : isObserver ? (
                            <>
                                <Button variant="outline" asChild className="rounded-2xl h-11 border-border/80 bg-background/80 text-foreground hover:bg-muted text-xs font-bold shadow-xs">
                                    <Link href="/dashboard/admin/schedules">
                                        <CalendarClock className="h-4 w-4 mr-2 text-primary" />
                                        Mallas Horarias
                                    </Link>
                                </Button>
                                <Button asChild className="rounded-2xl h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-md shadow-primary/20">
                                    <Link href="/dashboard/admin/analytics">
                                        <BarChart3 className="h-4 w-4 mr-2" />
                                        Ver Analítica
                                    </Link>
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button variant="outline" asChild className="rounded-2xl h-11 border-border/80 bg-background/80 text-foreground hover:bg-muted text-xs font-bold shadow-xs">
                                    <Link href="/dashboard/admin/schedules">
                                        <CalendarClock className="h-4 w-4 mr-2 text-primary" />
                                        Mallas Horarias
                                    </Link>
                                </Button>
                                <Button variant="outline" asChild className="rounded-2xl h-11 border-border/80 bg-background/80 text-foreground hover:bg-muted text-xs font-bold shadow-xs">
                                    <Link href="/dashboard/admin/settings">
                                        <Settings className="h-4 w-4 mr-2" />
                                        Configuración
                                    </Link>
                                </Button>
                                <Button asChild className="rounded-2xl h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-md shadow-primary/20">
                                    <Link href="/dashboard/admin/users">
                                        <UserPlus className="h-4 w-4 mr-2" />
                                        Gestión de Usuarios
                                    </Link>
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* KPI Cards (Idénticas en estilo al Coordinador, con datos del programa si es gestor) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {kpis.map((kpi, idx) => (
                    <Link href={kpi.link} key={idx} className="block group">
                        <Card className="h-full border border-border/80 shadow-xs bg-card overflow-hidden hover:scale-[1.02] hover:border-primary/40 hover:shadow-md transition-all duration-300 relative rounded-3xl">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                                    {kpi.title}
                                </CardTitle>
                                <div className={`p-2.5 rounded-2xl ${kpi.bg} ${kpi.color}`}>
                                    <kpi.icon className="h-5 w-5" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black text-foreground">{kpi.value}</div>
                                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 font-medium">
                                    <span>{kpi.description}</span>
                                    <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-primary font-bold flex items-center gap-0.5">
                                        Gestionar <ArrowUpRight className="h-3 w-3" />
                                    </span>
                                </p>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>

            {/* Blog de Anuncios Institucionales */}
            <AnnouncementFeedWidget announcements={announcements} />

            {/* Módulos Operativos */}
            {operationalModules && (
                <div className="space-y-4">
                    <div>
                        <h2 className="text-lg font-black text-foreground tracking-tight flex items-center gap-2">
                            <Layers className="w-5 h-5 text-primary" />
                            {isGestor ? "Módulos de Gestión del Área" : "Módulos Operativos Institucionales"}
                        </h2>
                        <p className="text-xs text-muted-foreground font-medium">
                            {isGestor 
                                ? `Accesos rápidos directos para ${currentProgram?.name}.` 
                                : "Accesos directos a los centros de gestión, estructura y supervisión."
                            }
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {operationalModules.map((mod, i) => (
                            <Link href={mod.link} key={i} className="block group">
                                <Card className="h-full rounded-3xl border border-border/80 shadow-xs bg-card p-5 hover:border-primary/40 hover:scale-[1.02] transition-all flex flex-col justify-between">
                                    <div className="space-y-3">
                                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-xs ${mod.color}`}>
                                            <mod.icon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors flex items-center justify-between">
                                                {mod.title}
                                                <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </h3>
                                            <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                                                {mod.description}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t border-border/40 mt-4 text-[11px] font-bold text-primary flex items-center gap-1">
                                        Ingresar al módulo <ChevronRight className="w-3 h-3" />
                                    </div>
                                </Card>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Activity & User Distribution Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* User Distribution */}
                <Card className="lg:col-span-1 border border-border/80 shadow-xs bg-card rounded-3xl">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                            <TrendingUp className="h-5 w-5 text-primary" />
                            {isGestor ? "Comunidad del Área" : "Comunidad Institucional"}
                        </CardTitle>
                        <CardDescription className="text-muted-foreground text-xs">
                            {isGestor 
                                ? `Aprendices e instructores en ${currentProgram?.name}` 
                                : "Distribución de aprendices, docentes y gestión"
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            {userDistribution.map((dist, i) => {
                                const total = isGestor && currentProgram
                                    ? ((currentProgram.studentsCount ?? 0) + (currentProgram.teachersCount ?? 0)) || 1
                                    : (stats.users.student + stats.users.teacher + stats.users.admin + ((stats.users as any).gestor || 0)) || 1;
                                const percentage = ((dist.value / total) * 100).toFixed(1);
                                return (
                                    <div key={i} className="space-y-2">
                                        <div className="flex items-center justify-between text-sm font-medium text-foreground">
                                            <div className="flex items-center gap-2">
                                                <dist.icon className={`h-4 w-4 ${dist.color.replace('bg-', 'text-')}`} />
                                                <span>{dist.label}</span>
                                            </div>
                                            <span className="text-xs font-semibold text-muted-foreground">{dist.value} ({percentage}%)</span>
                                        </div>
                                        <div className="h-2.5 w-full bg-muted/60 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full ${dist.color} transition-all duration-1000`} 
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="pt-4 border-t border-border/60">
                            <div className="flex items-center justify-between text-sm font-bold text-foreground">
                                <span>Estado del Sistema</span>
                                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-xl px-3 py-1 font-bold">
                                    En Línea • Operativo
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card className="lg:col-span-2 border border-border/80 shadow-xs bg-card overflow-hidden rounded-3xl">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                                <Clock className="h-5 w-5 text-primary" />
                                {isGestor ? "Actividad Reciente del Área" : "Actividad Reciente del Sistema"}
                            </CardTitle>
                            <CardDescription className="text-muted-foreground text-xs">
                                {isGestor 
                                    ? `Últimas interacciones registradas en ${currentProgram?.name}` 
                                    : "Últimas interacciones y registros de administración"
                                }
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {(() => {
                                const displayActivities = !isGestor 
                                    ? filteredRecentActivity.filter(a => a.type !== "grade" && a.type !== "attendance" && a.type !== "remark")
                                    : filteredRecentActivity;

                                if (displayActivities.length === 0) {
                                    return (
                                        <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-2xl border-dashed border border-border/60 text-xs font-medium">
                                            {isGestor 
                                                ? "No se ha registrado actividad reciente en esta área."
                                                : "No se ha registrado actividad reciente de administración."
                                            }
                                        </div>
                                    );
                                }

                                return displayActivities.slice(0, 5).map((activity, idx) => (
                                    <div key={idx} className="group flex items-start gap-4 p-3.5 hover:bg-muted/40 rounded-2xl transition-all duration-200 border border-transparent hover:border-border/60">
                                        <div className="p-2 bg-primary/10 text-primary border border-primary/20 rounded-xl group-hover:scale-105 transition-transform shrink-0">
                                            <Activity className="h-4 w-4" />
                                        </div>
                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-bold text-sm text-foreground truncate">
                                                    {formatName(activity.user?.name, activity.user?.profile)}
                                                </span>
                                                <span className="text-[11px] font-semibold text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-full shrink-0">
                                                    {activity.timestamp ? formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true, locale: es }) : ""}
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                {activity.description || "Acción registrada en la plataforma"}
                                            </p>
                                        </div>
                                    </div>
                                ));
                            })()}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Modal de Ayuda del Dashboard de Administrador y Gestor */}
            <AdminDashboardHelpModal
                open={helpModalOpen}
                onOpenChange={setHelpModalOpen}
                initialTab={helpInitialTab}
            />
        </div>
    );
}
