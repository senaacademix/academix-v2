"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { 
    BarChart3, 
    Users, 
    CheckCircle2, 
    AlertTriangle, 
    Clock, 
    BookOpen, 
    Search, 
    Eye, 
    TrendingUp, 
    Award, 
    MessageSquare,
    Sparkles,
    Loader2
} from "lucide-react";
import { getTeacherComprehensiveGroupAnalyticsAction } from "@/features/teacher/actions/groupActions";
import { formatName } from "@/lib/utils";
import { toast } from "sonner";

interface GroupAnalyticsViewProps {
    groupId: string;
    groupName: string;
    onSelectStudent: (student: any) => void;
}

export function GroupAnalyticsView({
    groupId,
    groupName,
    onSelectStudent,
}: GroupAnalyticsViewProps) {
    const [loading, setLoading] = useState(true);
    const [analyticsData, setAnalyticsData] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        let isMounted = true;
        setLoading(true);

        getTeacherComprehensiveGroupAnalyticsAction(groupId)
            .then((data) => {
                if (isMounted) {
                    setAnalyticsData(data);
                }
            })
            .catch((err) => {
                console.error("Error loading group analytics:", err);
                toast.error("Error al cargar las analíticas generales de la ficha.");
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [groupId]);

    // Computed overall metrics
    const stats = useMemo(() => {
        if (!analyticsData) return null;

        const metrics = analyticsData.studentMetrics || [];
        const courses = analyticsData.coursesStats || [];

        let totalPresent = 0;
        let totalAbsent = 0;
        let totalLate = 0;
        let totalAttention = 0;
        let totalCommendation = 0;
        let sumGrades = 0;
        let studentsWithGrades = 0;

        metrics.forEach((m: any) => {
            totalPresent += m.present || 0;
            totalAbsent += m.absent || 0;
            totalLate += m.late || 0;
            totalAttention += m.attention || 0;
            totalCommendation += m.commendation || 0;

            if (m.gradesAvg > 0) {
                sumGrades += m.gradesAvg;
                studentsWithGrades++;
            }
        });

        const totalAttendanceSessions = totalPresent + totalAbsent + totalLate;
        const attendanceRate = totalAttendanceSessions > 0
            ? Math.round((totalPresent / totalAttendanceSessions) * 100)
            : 100;

        const groupAverageGrade = studentsWithGrades > 0
            ? Number((sumGrades / studentsWithGrades).toFixed(1))
            : 0;

        // Students with alerts (absent >= 3 or gradesAvg < 70 or attention > 0)
        const studentsAtRisk = metrics.filter(
            (m: any) => m.absent >= 3 || (m.gradesAvg > 0 && m.gradesAvg < 70) || m.attention > 0
        );

        // Top performers
        const topPerformers = [...metrics]
            .filter((m: any) => m.gradesAvg > 0)
            .sort((a, b) => b.gradesAvg - a.gradesAvg)
            .slice(0, 4);

        return {
            totalStudents: analyticsData.totalStudents || metrics.length,
            attendanceRate,
            groupAverageGrade,
            totalAbsent,
            totalLate,
            totalAttention,
            totalCommendation,
            courses,
            studentsAtRisk,
            topPerformers
        };
    }, [analyticsData]);

    // Filtered student metrics by search
    const filteredMetrics = useMemo(() => {
        if (!analyticsData) return [];
        const metrics = analyticsData.studentMetrics || [];
        const query = searchQuery.toLowerCase().trim();
        if (!query) return metrics;

        return metrics.filter((m: any) => {
            const name = (m.name || "").toLowerCase();
            const doc = (m.identificacion || "").toLowerCase();
            return name.includes(query) || doc.includes(query);
        });
    }, [analyticsData, searchQuery]);

    if (loading) {
        return (
            <div className="p-16 flex flex-col items-center justify-center space-y-3 bg-card rounded-3xl border border-border/80 shadow-xs">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <p className="text-xs font-semibold text-muted-foreground">
                    Cargando analíticas generales de la ficha {groupName}...
                </p>
            </div>
        );
    }

    if (!analyticsData || !stats) {
        return (
            <div className="p-12 text-center bg-card rounded-3xl border border-dashed border-border/70">
                <BarChart3 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <h4 className="font-bold text-foreground text-sm">No se encontraron datos analíticos</h4>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-1">
                    Esta ficha aún no registra asistencias o calificaciones en la plataforma.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Global Group KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border border-border/70 shadow-xs bg-card/60 backdrop-blur-xs rounded-2xl">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tasa de Asistencia</p>
                            <h3 className="text-2xl font-black tracking-tight text-foreground">
                                {stats.attendanceRate}%
                            </h3>
                            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                                {stats.totalAbsent} fallas • {stats.totalLate} retardos
                            </p>
                        </div>
                        <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                            <CheckCircle2 className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-border/70 shadow-xs bg-card/60 backdrop-blur-xs rounded-2xl">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Promedio del Grupo</p>
                            <h3 className="text-2xl font-black tracking-tight text-foreground">
                                {stats.groupAverageGrade > 0 ? `${stats.groupAverageGrade} / 100` : "Sin notas"}
                            </h3>
                            <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                                En {stats.courses.length} competencias
                            </p>
                        </div>
                        <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
                            <TrendingUp className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-border/70 shadow-xs bg-card/60 backdrop-blur-xs rounded-2xl">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Aprendices en Alerta</p>
                            <h3 className="text-2xl font-black tracking-tight text-amber-600 dark:text-amber-400">
                                {stats.studentsAtRisk.length}
                            </h3>
                            <p className="text-[11px] text-muted-foreground font-medium">
                                Por inasistencias o notas
                            </p>
                        </div>
                        <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                            <AlertTriangle className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-border/70 shadow-xs bg-card/60 backdrop-blur-xs rounded-2xl">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Anotaciones y Convivencia</p>
                            <h3 className="text-2xl font-black tracking-tight text-foreground">
                                {stats.totalAttention + stats.totalCommendation}
                            </h3>
                            <p className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">
                                {stats.totalCommendation} felicitaciones • {stats.totalAttention} llamados
                            </p>
                        </div>
                        <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shrink-0">
                            <MessageSquare className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Middle Section: Courses performance & Highlights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Courses performance */}
                <Card className="border border-border/80 bg-card shadow-xs rounded-3xl overflow-hidden">
                    <CardHeader className="p-5 border-b border-border/70">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-primary" />
                            Rendimiento por Materia / Competencia
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Promedios de calificación acumulados por cada asignatura cursada por la ficha.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-5 space-y-3">
                        {stats.courses.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic py-4 text-center">
                                Sin materias registradas con evaluaciones para esta ficha.
                            </p>
                        ) : (
                            stats.courses.map((c: any, idx: number) => {
                                const avg = c.averageGrade || 0;
                                const isPassing = avg >= 70;

                                return (
                                    <div key={idx} className="p-3 rounded-2xl bg-muted/30 border border-border/50 flex items-center justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold text-foreground truncate">{c.title}</p>
                                            <p className="text-[10px] text-muted-foreground">
                                                {c.totalGrades} {c.totalGrades === 1 ? "calificación registrada" : "calificaciones registradas"}
                                            </p>
                                        </div>
                                        <Badge 
                                            variant="outline"
                                            className={`text-xs font-bold px-2.5 py-0.5 rounded-xl ${
                                                isPassing 
                                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
                                                    : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                                            }`}
                                        >
                                            {avg > 0 ? `${avg} pts` : "Sin notas"}
                                        </Badge>
                                    </div>
                                );
                            })
                        )}
                    </CardContent>
                </Card>

                {/* Top Performers & Students with alerts */}
                <Card className="border border-border/80 bg-card shadow-xs rounded-3xl overflow-hidden">
                    <CardHeader className="p-5 border-b border-border/70">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-primary" />
                            Aprendices Destacados y de Mayor Rendimiento
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Estudiantes con mejor promedio acumulado en la ficha.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-5 space-y-2.5">
                        {stats.topPerformers.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic py-4 text-center">
                                Aún no hay calificaciones suficientes para destacar aprendices.
                            </p>
                        ) : (
                            stats.topPerformers.map((student: any, idx: number) => (
                                <div 
                                    key={student.id} 
                                    onClick={() => onSelectStudent(student)}
                                    className="p-3 rounded-2xl bg-primary/5 border border-primary/15 hover:border-primary/30 transition-all flex items-center justify-between gap-3 cursor-pointer group"
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="h-7 w-7 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                                            #{idx + 1}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                                                {formatName(student.name)}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground font-mono">
                                                CC: {student.identificacion}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs font-bold">
                                            {student.gradesAvg} pts
                                        </Badge>
                                        <Eye className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Individual Student Performance Table */}
            <Card className="border border-border/80 bg-card shadow-xs rounded-3xl overflow-hidden">
                <div className="p-5 border-b border-border/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                        <h4 className="text-sm font-bold text-foreground">
                            Detalle Analítico Individual de Aprendices ({filteredMetrics.length})
                        </h4>
                        <p className="text-xs text-muted-foreground">
                            Asistencia, promedio de calificaciones y registro disciplinario por estudiante.
                        </p>
                    </div>

                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Buscar en analíticas..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-8 text-xs rounded-xl"
                        />
                    </div>
                </div>

                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-muted/40">
                                <TableRow>
                                    <TableHead className="w-[50px] text-center font-bold text-xs">#</TableHead>
                                    <TableHead className="font-bold text-xs">Aprendiz</TableHead>
                                    <TableHead className="font-bold text-xs text-center">Promedio</TableHead>
                                    <TableHead className="font-bold text-xs text-center">Asistencias</TableHead>
                                    <TableHead className="font-bold text-xs text-center">Inasistencias</TableHead>
                                    <TableHead className="font-bold text-xs text-center">Retardos</TableHead>
                                    <TableHead className="font-bold text-xs text-center">Anotaciones</TableHead>
                                    <TableHead className="text-right font-bold text-xs w-[120px]">Expediente</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredMetrics.map((student: any, index: number) => {
                                    const avg = student.gradesAvg || 0;
                                    const hasAlert = student.absent >= 3 || (avg > 0 && avg < 70);

                                    return (
                                        <TableRow 
                                            key={student.id} 
                                            className="hover:bg-muted/20 transition-colors cursor-pointer"
                                            onClick={() => onSelectStudent(student)}
                                        >
                                            <TableCell className="text-center text-xs font-bold text-muted-foreground">
                                                {index + 1}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-foreground">
                                                        {formatName(student.name)}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground font-mono">
                                                        CC: {student.identificacion}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {avg > 0 ? (
                                                    <Badge 
                                                        variant="outline"
                                                        className={`text-xs font-bold ${
                                                            avg >= 70 
                                                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                                                : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                                                        }`}
                                                    >
                                                        {avg}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground italic">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                                {student.present || 0}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className={`text-xs font-bold ${student.absent >= 3 ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
                                                    {student.absent || 0}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-center text-xs text-amber-600 dark:text-amber-400 font-semibold">
                                                {student.late || 0}
                                            </TableCell>
                                            <TableCell className="text-center text-xs text-muted-foreground">
                                                {(student.attention || 0) + (student.commendation || 0) > 0 ? (
                                                    <Badge variant="outline" className="text-[10px] font-bold">
                                                        {student.commendation || 0} fel. / {student.attention || 0} aten.
                                                    </Badge>
                                                ) : (
                                                    <span>0</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => onSelectStudent(student)}
                                                    className="h-8 gap-1.5 text-xs font-bold rounded-xl text-primary hover:bg-primary/10"
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                    <span>Ver</span>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
