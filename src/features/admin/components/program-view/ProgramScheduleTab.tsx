"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { 
    CalendarClock, 
    Clock, 
    BookOpen, 
    UserCheck, 
    Building2, 
    Layers, 
    Calendar, 
    Search, 
    Filter, 
    Maximize2, 
    ExternalLink,
    AlertCircle,
    Eye,
    LayoutGrid,
    ListFilter
} from "lucide-react";
import Link from "next/link";
import { getSchedulesAction } from "@/features/schedule-manager/actions/scheduleManagerActions";
import { AcademicScheduleItem } from "@/features/schedule-manager/types";
import { formatName } from "@/lib/utils";

interface ProgramScheduleTabProps {
    program: any;
}

const DAY_LABELS: Record<string, string> = {
    MONDAY: "Lunes",
    TUESDAY: "Martes",
    WEDNESDAY: "Miércoles",
    THURSDAY: "Jueves",
    FRIDAY: "Viernes",
    SATURDAY: "Sábado",
    SUNDAY: "Domingo"
};

const ORDERED_DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

export function ProgramScheduleTab({ program }: ProgramScheduleTabProps) {
    const [academicSchedules, setAcademicSchedules] = useState<AcademicScheduleItem[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [selectedFichaFilter, setSelectedFichaFilter] = useState<string>("ALL");
    const [selectedDayFilter, setSelectedDayFilter] = useState<string>("ALL");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [viewLayout, setViewLayout] = useState<"grid" | "agenda">("grid");

    const groups = useMemo(() => program.groups || [], [program.groups]);

    useEffect(() => {
        let isMounted = true;
        setIsLoading(true);
        getSchedulesAction(program.id)
            .then((data) => {
                if (isMounted) {
                    setAcademicSchedules(data || []);
                }
            })
            .catch((err) => {
                console.error("Error al cargar horarios académicos del programa:", err);
            })
            .finally(() => {
                if (isMounted) setIsLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [program.id]);

    // Consolidar únicamente las materias programadas (CourseSchedule de las fichas del programa)
    const allScheduleEntries = useMemo(() => {
        const entries: Array<{
            id: string;
            dayOfWeek: string;
            startTime: string;
            endTime: string;
            title: string;
            groupName: string;
            groupCode?: string;
            groupId: string;
            teacherName?: string;
            environmentName?: string;
            source: "course";
        }> = [];

        const seenKeys = new Set<string>();

        // Solo materias con sesiones de clase programadas (CourseSchedule)
        groups.forEach((group: any) => {
            const courses = group.courses || [];
            courses.forEach((course: any) => {
                const schedules = course.schedules || [];
                schedules.forEach((sch: any) => {
                    const uniqueKey = sch.id || `${course.id}-${sch.dayOfWeek}-${sch.startTime}-${sch.endTime}`;
                    if (seenKeys.has(uniqueKey)) return;
                    seenKeys.add(uniqueKey);

                    const resolvedTeacherName = sch.teacher?.name || course.teacher?.name;
                    const resolvedEnvName = sch.environment?.name || group.environment?.name;

                    entries.push({
                        id: `course-slot-${uniqueKey}`,
                        dayOfWeek: sch.dayOfWeek || "MONDAY",
                        startTime: sch.startTime || "07:00",
                        endTime: sch.endTime || "10:00",
                        title: course.title || "Asignatura",
                        groupName: group.name || "Ficha",
                        groupCode: group.code,
                        groupId: group.id,
                        teacherName: resolvedTeacherName ? formatName(resolvedTeacherName) : undefined,
                        environmentName: resolvedEnvName || undefined,
                        source: "course"
                    });
                });
            });
        });

        return entries;
    }, [groups]);

    // Filter schedule entries by ficha, day and search query
    const filteredEntries = useMemo(() => {
        return allScheduleEntries.filter((item) => {
            const matchesFicha = selectedFichaFilter === "ALL" || item.groupId === selectedFichaFilter;
            const matchesDay = selectedDayFilter === "ALL" || item.dayOfWeek === selectedDayFilter;
            const q = searchQuery.toLowerCase().trim();
            const matchesSearch = !q || 
                item.title.toLowerCase().includes(q) ||
                item.groupName.toLowerCase().includes(q) ||
                (item.groupCode && item.groupCode.toLowerCase().includes(q)) ||
                (item.teacherName && item.teacherName.toLowerCase().includes(q)) ||
                (item.environmentName && item.environmentName.toLowerCase().includes(q));

            return matchesFicha && matchesDay && matchesSearch;
        });
    }, [allScheduleEntries, selectedFichaFilter, selectedDayFilter, searchQuery]);

    // Group entries by day of week
    const entriesByDay = useMemo(() => {
        const map: Record<string, typeof filteredEntries> = {};
        ORDERED_DAYS.forEach(d => { map[d] = []; });

        filteredEntries.forEach(entry => {
            if (map[entry.dayOfWeek]) {
                map[entry.dayOfWeek].push(entry);
            } else {
                map[entry.dayOfWeek] = [entry];
            }
        });

        // Sort by start time
        ORDERED_DAYS.forEach(d => {
            map[d].sort((a, b) => a.startTime.localeCompare(b.startTime));
        });

        return map;
    }, [filteredEntries]);

    // Stats
    const totalWeeklyHours = useMemo(() => {
        let totalMinutes = 0;
        filteredEntries.forEach(e => {
            try {
                const [h1, m1] = e.startTime.split(":").map(Number);
                const [h2, m2] = e.endTime.split(":").map(Number);
                const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
                if (diff > 0) totalMinutes += diff;
            } catch {
                // ignore
            }
        });
        return Math.round((totalMinutes / 60) * 10) / 10;
    }, [filteredEntries]);

    const distinctInstructors = useMemo(() => {
        const set = new Set<string>();
        filteredEntries.forEach(e => {
            if (e.teacherName) set.add(e.teacherName);
        });
        return set.size;
    }, [filteredEntries]);

    return (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
            {/* Header info & Filter toolbar */}
            <div className="bg-card p-5 rounded-3xl border border-border/80 shadow-xs space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <CalendarClock className="h-5 w-5 text-primary" />
                            <h3 className="text-base font-black text-foreground tracking-tight">
                                Programación Horaria General del Área
                            </h3>
                            <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
                                Modo Solo Lectura
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Visualiza la malla semanal de clases, asignaciones horarias, instructores y ambientes de todas las fichas del programa.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {academicSchedules.length > 0 && (
                            <Link href={`/dashboard/admin/schedules/${academicSchedules[0].id}`}>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 gap-1.5 text-xs font-bold rounded-xl border-border/80 hover:bg-muted"
                                >
                                    <Maximize2 className="h-3.5 w-3.5 text-primary" />
                                    <span>Visor Panorámico</span>
                                </Button>
                            </Link>
                        )}
                        <div className="inline-flex rounded-xl border border-border/80 p-0.5 bg-muted/40">
                            <button
                                type="button"
                                onClick={() => setViewLayout("grid")}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                    viewLayout === "grid"
                                        ? "bg-card text-foreground shadow-2xs"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                <LayoutGrid className="h-3.5 w-3.5" />
                                <span>Semana</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewLayout("agenda")}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                    viewLayout === "agenda"
                                        ? "bg-card text-foreground shadow-2xs"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                <ListFilter className="h-3.5 w-3.5" />
                                <span>Agenda</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* KPI mini-cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-border/60">
                    <div className="p-2.5 rounded-2xl bg-muted/30 border border-border/50">
                        <span className="text-[10.5px] text-muted-foreground font-semibold block">Clases Programadas</span>
                        <span className="text-lg font-black text-foreground">{filteredEntries.length}</span>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-muted/30 border border-border/50">
                        <span className="text-[10.5px] text-muted-foreground font-semibold block">Horas Semanales</span>
                        <span className="text-lg font-black text-foreground">{totalWeeklyHours} h</span>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-muted/30 border border-border/50">
                        <span className="text-[10.5px] text-muted-foreground font-semibold block">Instructores Activos</span>
                        <span className="text-lg font-black text-foreground">{distinctInstructors}</span>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-muted/30 border border-border/50">
                        <span className="text-[10.5px] text-muted-foreground font-semibold block">Fichas en Horario</span>
                        <span className="text-lg font-black text-foreground">{new Set(allScheduleEntries.map(e => e.groupId)).size}</span>
                    </div>
                </div>

                {/* Filters row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                    {/* Ficha filter */}
                    <div className="space-y-1">
                        <label className="text-[11px] font-bold text-muted-foreground">Filtrar por Ficha:</label>
                        <Select value={selectedFichaFilter} onValueChange={setSelectedFichaFilter}>
                            <SelectTrigger className="h-8 text-xs font-bold rounded-xl w-full">
                                <SelectValue placeholder="Todas las fichas" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL" className="text-xs font-medium">
                                    Todas las Fichas ({groups.length})
                                </SelectItem>
                                {groups.map((g: any) => (
                                    <SelectItem key={g.id} value={g.id} className="text-xs font-medium">
                                        Ficha {g.code ? `${g.code} - ` : ""}{g.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Day filter */}
                    <div className="space-y-1">
                        <label className="text-[11px] font-bold text-muted-foreground">Filtrar por Día:</label>
                        <Select value={selectedDayFilter} onValueChange={setSelectedDayFilter}>
                            <SelectTrigger className="h-8 text-xs font-bold rounded-xl w-full">
                                <SelectValue placeholder="Todos los días" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL" className="text-xs font-medium">Toda la Semana</SelectItem>
                                {ORDERED_DAYS.map(d => (
                                    <SelectItem key={d} value={d} className="text-xs font-medium">
                                        {DAY_LABELS[d]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Search query */}
                    <div className="space-y-1">
                        <label className="text-[11px] font-bold text-muted-foreground">Búsqueda rápida:</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                placeholder="Materia, instructor o ambiente..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 h-8 text-xs rounded-xl"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Content view */}
            {isLoading ? (
                <div className="p-12 text-center bg-card rounded-3xl border border-border/70 space-y-3">
                    <CalendarClock className="h-8 w-8 text-primary animate-pulse mx-auto" />
                    <p className="text-xs font-bold text-foreground">Cargando horario del programa...</p>
                </div>
            ) : filteredEntries.length === 0 ? (
                <div className="p-12 text-center bg-card rounded-3xl border border-dashed border-border/70 space-y-3">
                    <Calendar className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                    <h4 className="font-bold text-foreground text-sm">Sin clases programadas para los filtros seleccionados</h4>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        {searchQuery || selectedFichaFilter !== "ALL" || selectedDayFilter !== "ALL"
                            ? "No se encontraron franjas horarias con los criterios de búsqueda actuales. Prueba limpiando los filtros."
                            : "Este programa de formación no cuenta aún con horarios de clase registrados en el sistema."}
                    </p>
                    {(selectedFichaFilter !== "ALL" || selectedDayFilter !== "ALL" || searchQuery) && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setSelectedFichaFilter("ALL");
                                setSelectedDayFilter("ALL");
                                setSearchQuery("");
                            }}
                            className="h-8 text-xs font-bold rounded-xl"
                        >
                            Limpiar Filtros
                        </Button>
                    )}
                </div>
            ) : viewLayout === "grid" ? (
                /* Weekly Grid View */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                    {ORDERED_DAYS.filter(d => selectedDayFilter === "ALL" || selectedDayFilter === d).map((dayKey) => {
                        const dayEntries = entriesByDay[dayKey] || [];
                        const isDayEmpty = dayEntries.length === 0;

                        return (
                            <div
                                key={dayKey}
                                className="flex flex-col rounded-3xl border border-border/80 bg-card overflow-hidden shadow-2xs"
                            >
                                <div className="p-3 bg-muted/40 border-b border-border/70 flex items-center justify-between">
                                    <span className="font-black text-xs text-foreground tracking-tight">
                                        {DAY_LABELS[dayKey]}
                                    </span>
                                    <Badge
                                        variant="outline"
                                        className={`text-[9.5px] font-bold px-1.5 py-0 ${
                                            dayEntries.length > 0
                                                ? "bg-primary/10 text-primary border-primary/20"
                                                : "text-muted-foreground"
                                        }`}
                                    >
                                        {dayEntries.length} {dayEntries.length === 1 ? "clase" : "clases"}
                                    </Badge>
                                </div>

                                <div className="p-2 space-y-2 flex-1 min-h-[140px] bg-background/40">
                                    {isDayEmpty ? (
                                        <div className="h-full flex items-center justify-center p-4 text-center">
                                            <span className="text-[11px] text-muted-foreground/60 italic">
                                                Sin actividades
                                            </span>
                                        </div>
                                    ) : (
                                        dayEntries.map((entry) => (
                                            <div
                                                key={entry.id}
                                                className="p-2.5 rounded-2xl bg-card border border-border/70 hover:border-primary/40 hover:shadow-xs transition-all space-y-1.5"
                                            >
                                                {/* Time & Ficha badge */}
                                                <div className="flex items-center justify-between gap-1">
                                                    <span className="text-[10px] font-mono font-bold text-primary flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {entry.startTime} - {entry.endTime}
                                                    </span>
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[9px] font-bold font-mono bg-muted/50 truncate max-w-[85px]"
                                                        title={entry.groupName}
                                                    >
                                                        {entry.groupCode ? `F.${entry.groupCode}` : entry.groupName}
                                                    </Badge>
                                                </div>

                                                {/* Class Title */}
                                                <p className="text-xs font-bold text-foreground leading-snug line-clamp-2" title={entry.title}>
                                                    {entry.title}
                                                </p>

                                                {/* Teacher & Environment */}
                                                <div className="pt-1 border-t border-border/40 space-y-0.5 text-[10px] text-muted-foreground">
                                                    {entry.teacherName && (
                                                        <div className="flex items-center gap-1 truncate" title={entry.teacherName}>
                                                            <UserCheck className="h-3 w-3 text-primary shrink-0" />
                                                            <span className="truncate">{entry.teacherName}</span>
                                                        </div>
                                                    )}
                                                    {entry.environmentName && (
                                                        <div className="flex items-center gap-1 truncate" title={entry.environmentName}>
                                                            <Building2 className="h-3 w-3 text-amber-500 shrink-0" />
                                                            <span className="truncate">{entry.environmentName}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* Agenda List View */
                <div className="space-y-4">
                    {ORDERED_DAYS.filter(d => selectedDayFilter === "ALL" || selectedDayFilter === d).map((dayKey) => {
                        const dayEntries = entriesByDay[dayKey] || [];
                        if (dayEntries.length === 0) return null;

                        return (
                            <Card key={dayKey} className="rounded-3xl border border-border/80 shadow-xs overflow-hidden">
                                <CardHeader className="p-4 bg-muted/30 border-b border-border/70 flex flex-row items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-primary" />
                                        <CardTitle className="text-sm font-black">{DAY_LABELS[dayKey]}</CardTitle>
                                    </div>
                                    <Badge variant="outline" className="text-xs font-bold">
                                        {dayEntries.length} clase{dayEntries.length === 1 ? "" : "s"}
                                    </Badge>
                                </CardHeader>
                                <CardContent className="p-4 divide-y divide-border/60">
                                    {dayEntries.map((entry) => (
                                        <div
                                            key={entry.id}
                                            className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                                        >
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-foreground">{entry.title}</span>
                                                    <Badge variant="secondary" className="text-[10px] font-bold">
                                                        Ficha: {entry.groupCode ? `Ficha ${entry.groupCode} • ` : ""}{entry.groupName}
                                                    </Badge>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                                    {entry.teacherName && (
                                                        <span className="flex items-center gap-1">
                                                            <UserCheck className="h-3.5 w-3.5 text-primary" />
                                                            {entry.teacherName}
                                                        </span>
                                                    )}
                                                    {entry.environmentName && (
                                                        <span className="flex items-center gap-1">
                                                            <Building2 className="h-3.5 w-3.5 text-amber-500" />
                                                            {entry.environmentName}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 self-start sm:self-auto">
                                                <Badge variant="outline" className="text-xs font-mono font-bold bg-primary/5 text-primary border-primary/20">
                                                    <Clock className="h-3 w-3 mr-1" />
                                                    {entry.startTime} - {entry.endTime}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
