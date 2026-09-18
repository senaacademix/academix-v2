"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
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
    Search,
    X,
    Briefcase,
    Compass,
    Building2,
    Wrench
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatName } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { GestorDashboardStats, GestorActivityItem } from "../types/gestorTypes";
import { useGestorProgram } from "../context/GestorProgramContext";

interface GestorDashboardViewProps {
    stats: GestorDashboardStats;
    recentActivity: GestorActivityItem[];
    userName?: string;
}

export function GestorDashboardView({ 
    stats, 
    recentActivity, 
    userName
}: GestorDashboardViewProps) {
    const managedPrograms = stats.managedProgramsList || [];
    const isSingleProgram = managedPrograms.length === 1;
    const hasMultiplePrograms = managedPrograms.length > 1;

    const [searchQuery, setSearchQuery] = useState("");

    const { 
        selectedProgramId, 
        selectProgram, 
        clearProgram, 
        setManagedPrograms 
    } = useGestorProgram();

    // Auto-select if there is only 1 program assigned
    useEffect(() => {
        if (isSingleProgram && selectedProgramId !== managedPrograms[0].id) {
            selectProgram(managedPrograms[0].id, managedPrograms[0]);
        }
    }, [isSingleProgram, managedPrograms, selectedProgramId, selectProgram]);

    // Sync managed programs to context
    useEffect(() => {
        if (managedPrograms.length > 0) {
            setManagedPrograms(managedPrograms);
        }
    }, [managedPrograms, setManagedPrograms]);

    const activeProgramId = selectedProgramId || (managedPrograms.length > 0 ? managedPrograms[0].id : null);

    const currentProgram = activeProgramId 
        ? managedPrograms.find((p) => p.id === activeProgramId) || (managedPrograms.length > 0 ? managedPrograms[0] : null)
        : null;



    // Filter activity by selected program
    const filteredRecentActivity = currentProgram
        ? recentActivity.filter((a) => !a.programId || a.programId === currentProgram.id)
        : recentActivity;

    // KPIs for the selected program
    const kpis = currentProgram ? [
        {
            title: "Aprendices Matriculados",
            value: currentProgram.studentsCount ?? 0,
            description: `${currentProgram.studentsCount ?? 0} estudiantes en este programa`,
            icon: GraduationCap,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
            link: `/dashboard/gestor/users?programId=${currentProgram.id}`
        },
        {
            title: "Fichas / Grupos Activos",
            value: currentProgram.groupsCount ?? currentProgram._count?.groups ?? 0,
            description: "Fichas de formación vigentes",
            icon: Layers,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
            link: `/dashboard/gestor/courses?programId=${currentProgram.id}`
        },
        {
            title: "Materias / Competencias",
            value: currentProgram.coursesCount ?? 0,
            description: `${currentProgram.activeCoursesCount ?? 0} materias activas`,
            icon: BookOpen,
            color: "text-indigo-500",
            bg: "bg-indigo-500/10",
            link: `/dashboard/gestor/courses?programId=${currentProgram.id}`
        },
        {
            title: "Instructores Vinculados",
            value: currentProgram.teachersCount ?? currentProgram._count?.teachers ?? 0,
            description: "Instructores en el programa",
            icon: UserCheck,
            color: "text-indigo-500",
            bg: "bg-indigo-500/10",
            link: `/dashboard/gestor/users?programId=${currentProgram.id}`
        }
    ] : [];

    const userDistribution = currentProgram ? [
        { label: "Aprendices", value: currentProgram.studentsCount ?? 0, icon: GraduationCap, color: "bg-blue-500" },
        { label: "Instructores", value: currentProgram.teachersCount ?? 0, icon: UserCheck, color: "bg-indigo-500" },
    ] : [];

    // Operational modules for the selected program
    const operationalModules = currentProgram ? [
        {
            title: "Gestión de Usuarios",
            description: "Administración de aprendices, instructores, fichas e importación masiva.",
            link: `/dashboard/gestor/users?programId=${currentProgram.id}`,
            icon: Users,
            color: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20"
        },
        {
            title: "Estructura Curricular",
            description: "Administra el área de formación, trimestres, competencias y asignación de ambientes.",
            link: `/dashboard/gestor/courses?programId=${currentProgram.id}`,
            icon: BookOpen,
            color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
        },
        {
            title: "Programación Horaria",
            description: "Gestión de franjas horarias, eventos institucionales y novedades por horario.",
            link: `/dashboard/gestor/schedules?programId=${currentProgram.id}`,
            icon: CalendarClock,
            color: "text-teal-600 dark:text-teal-400 bg-teal-500/10 border-teal-500/20"
        },
        {
            title: "Herramientas y Analítica",
            description: "Analítica de juicios Sofia Plus, reportes institucionales y seguimiento pedagógico.",
            link: `/dashboard/gestor/tools?programId=${currentProgram.id}`,
            icon: Wrench,
            color: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20"
        }
    ] : [];

    if (!currentProgram) {
        return (
            <div className="p-10 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex flex-col items-center text-center gap-4 my-8">
                <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner">
                    <AlertCircle className="w-8 h-8" />
                </div>
                <div className="space-y-1.5 max-w-md">
                    <h3 className="text-lg font-bold text-amber-900 dark:text-amber-200">
                        Sin áreas de formación asignadas
                    </h3>
                    <p className="text-xs sm:text-sm text-amber-800/80 dark:text-amber-300/80 leading-relaxed">
                        Aún no tienes áreas vinculadas a tu perfil. Solicita a la Administración que te asigne tus áreas de formación para poder ingresar a gestionar.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            {/* Header Hero Banner */}
            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="relative rounded-3xl bg-gradient-to-br from-card via-card/95 to-primary/5 border border-border/80 p-6 sm:p-8 backdrop-blur-2xl shadow-sm overflow-hidden transition-colors"
            >
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/10 blur-[100px] rounded-full pointer-events-none" />

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold shadow-2xs">
                            <Sparkles className="w-3.5 h-3.5 text-primary" />
                            <span>Gestión de Área: {currentProgram?.name}</span>
                        </div>
                        <h1 className="text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight">
                            Panel de{" "}
                            <span className="bg-gradient-to-r from-foreground via-foreground/80 to-primary bg-clip-text text-transparent">
                                Control Curricular
                            </span>
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground max-w-xl leading-relaxed font-medium">
                            Métricas en tiempo real, gestión de usuarios, estructura curricular y programación horaria para {currentProgram?.name}.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
                        <Button variant="outline" asChild className="rounded-2xl h-11 border-border/80 bg-background/80 hover:bg-muted text-foreground font-bold text-xs shadow-2xs">
                            <Link href={`/dashboard/gestor/schedules?programId=${currentProgram?.id}`}>
                                <CalendarClock className="h-4 w-4 mr-2 text-primary" />
                                Programación Horaria
                            </Link>
                        </Button>
                        <Button variant="outline" asChild className="rounded-2xl h-11 border-border/80 bg-background/80 hover:bg-muted text-foreground font-bold text-xs shadow-2xs">
                            <Link href={`/dashboard/gestor/tools?programId=${currentProgram?.id}`}>
                                <Wrench className="h-4 w-4 mr-2 text-primary" />
                                Herramientas
                            </Link>
                        </Button>
                        <Button asChild className="rounded-2xl h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-md shadow-primary/20">
                            <Link href={`/dashboard/gestor/users?programId=${currentProgram?.id}`}>
                                <UserPlus className="h-4 w-4 mr-2" />
                                Gestión de Usuarios
                            </Link>
                        </Button>
                    </div>
                </div>
            </motion.div>

            {/* 4 KPI Cards (Compactas) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map((kpi, idx) => (
                    <Link href={kpi.link} key={idx} className="block group">
                        <Card className="h-full border border-border/80 shadow-2xs bg-card hover:border-primary/40 hover:shadow-xs transition-all duration-300 relative rounded-2xl p-3.5 flex flex-col justify-between gap-1">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                    {kpi.title}
                                </span>
                                <div className={`p-1.5 rounded-xl ${kpi.bg} ${kpi.color}`}>
                                    <kpi.icon className="h-4 w-4" />
                                </div>
                            </div>
                            <div className="flex items-baseline gap-2 mt-1">
                                <span className="text-2xl font-black text-foreground tracking-tight">{kpi.value}</span>
                                <span className="text-[11px] text-muted-foreground font-medium truncate">
                                    {kpi.description}
                                </span>
                            </div>
                        </Card>
                    </Link>
                ))}
            </div>

            {/* Módulos Operativos para el Gestor */}
            {operationalModules && (
                <div className="space-y-4">
                    <div>
                        <h2 className="text-lg font-black text-foreground tracking-tight flex items-center gap-2">
                            <Layers className="w-5 h-5 text-primary" />
                            Módulos de Gestión del Área
                        </h2>
                        <p className="text-xs text-muted-foreground font-medium">
                            Accesos rápidos directos para {currentProgram?.name}.
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
                            Comunidad del Área
                        </CardTitle>
                        <CardDescription className="text-muted-foreground text-xs">
                            Aprendices e instructores en {currentProgram?.name}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            {userDistribution.map((dist, i) => {
                                const total = ((currentProgram?.studentsCount ?? 0) + (currentProgram?.teachersCount ?? 0)) || 1;
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
                        <div className="pt-4 border-t border-border/60 space-y-2.5">
                            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                                <span>Edición Asistencia</span>
                                <Badge variant="outline" className={`rounded-lg px-2 py-0.5 text-[10px] font-bold ${
                                    currentProgram?.allowPastAttendanceEdit 
                                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30" 
                                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                }`}>
                                    {currentProgram?.allowPastAttendanceEdit ? "Extemporánea Habilitada" : "Cierre Semanal Activo"}
                                </Badge>
                            </div>
                            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                                <span>Ambientes Asignados</span>
                                <span className="font-bold text-foreground">
                                    {currentProgram?.environmentsCount ?? currentProgram?._count?.environments ?? 0} aulas / espacios
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-sm font-bold text-foreground pt-1">
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
                                Actividad Reciente del Área
                            </CardTitle>
                            <CardDescription className="text-muted-foreground text-xs">
                                Últimas calificaciones, observaciones y asistencias en {currentProgram?.name}
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {filteredRecentActivity.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-2xl border-dashed border border-border/60 text-xs font-medium">
                                    No se ha registrado actividad reciente en esta área.
                                </div>
                            ) : (
                                filteredRecentActivity.slice(0, 5).map((activity, idx) => (
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
                                                {activity.type === "grade" ? (
                                                    <>Actualizó calificación en <span className="font-bold text-primary">{activity.details?.activity}</span> ({activity.details?.course})</>
                                                ) : activity.type === "remark" ? (
                                                    <>Registró una observación: <span className="font-bold text-primary">{activity.details?.activity}</span></>
                                                ) : (
                                                    <>Novedad de asistencia: <span className="font-bold text-primary">{activity.details?.activity}</span> en {activity.details?.course}</>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
