"use client";

import React, { useState, useEffect, useMemo, useTransition } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    ClipboardList,
    AlertTriangle,
    Users,
    GraduationCap,
    BookOpen,
    Search,
    Download,
    RefreshCw,
    CheckCircle2,
    Calendar,
    Copy,
    Check,
    Mail,
    Phone,
    ChevronDown,
    ChevronUp,
    Clock,
    Filter
} from "lucide-react";
import { toast } from "sonner";
import { getPendingAttendancesSummaryAction } from "@/app/admin-actions";
import type {
    PendingAttendancesResult,
    PendingAttendanceItem
} from "@/features/admin/actions/pendingAttendanceActions";
import { UserAvatar } from "@/components/ui/user-avatar";

interface PendingAttendancesModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    programId?: string;
    initialGroupId?: string;
}

export function PendingAttendancesModal({
    open,
    onOpenChange,
    programId,
    initialGroupId
}: PendingAttendancesModalProps) {
    const [data, setData] = useState<PendingAttendancesResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [isPending, startTransition] = useTransition();

    // Filters state
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedGroup, setSelectedGroup] = useState<string>(initialGroupId || "all");
    const [selectedTeacher, setSelectedTeacher] = useState<string>("all");
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [expandedTeachers, setExpandedTeachers] = useState<Record<string, boolean>>({});
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    const loadData = () => {
        setLoading(true);
        startTransition(async () => {
            try {
                const res = await getPendingAttendancesSummaryAction({
                    programId: programId && programId !== "all" && programId !== "none" ? programId : undefined
                });
                if (res.success) {
                    setData(res);
                } else {
                    toast.error(res.error || "No se pudo cargar la información de inasistencias pendientes");
                }
            } catch (err: any) {
                toast.error(err.message || "Error al cargar inasistencias pendientes");
            } finally {
                setLoading(false);
            }
        });
    };

    useEffect(() => {
        if (open) {
            loadData();
        }
    }, [open, programId]);

    // Available groups and teachers for select dropdowns
    const groupOptions = useMemo(() => {
        if (!data?.items) return [];
        const map = new Map<string, string>();
        data.items.forEach(item => {
            map.set(item.groupId, item.groupName);
        });
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [data]);

    const teacherOptions = useMemo(() => {
        if (!data?.items) return [];
        const map = new Map<string, string>();
        data.items.forEach(item => {
            if (item.teacherId !== "unassigned") {
                map.set(item.teacherId, item.teacherName);
            }
        });
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [data]);

    // Filter items based on active search and dropdown filters
    const filteredItems = useMemo(() => {
        if (!data?.items) return [];
        const q = searchQuery.toLowerCase().trim();

        return data.items.filter(item => {
            if (selectedGroup !== "all" && item.groupId !== selectedGroup) return false;
            if (selectedTeacher !== "all" && item.teacherId !== selectedTeacher) return false;

            if (q) {
                const matchName = item.teacherName.toLowerCase().includes(q);
                const matchEmail = item.teacherEmail.toLowerCase().includes(q);
                const matchGroup = item.groupName.toLowerCase().includes(q);
                const matchCourse = item.courseTitle.toLowerCase().includes(q);
                const matchDate = item.dateFormatted.includes(q) || item.date.includes(q);
                if (!matchName && !matchEmail && !matchGroup && !matchCourse && !matchDate) return false;
            }

            return true;
        });
    }, [data, searchQuery, selectedGroup, selectedTeacher]);

    // Recalculate grouped structures based on filtered items
    const filteredTeachers = useMemo(() => {
        const teacherMap = new Map<string, {
            teacherId: string;
            teacherName: string;
            teacherEmail: string;
            teacherPhone: string;
            teacherImage?: string | null;
            totalPendingCount: number;
            groupsMap: Map<string, {
                groupId: string;
                groupName: string;
                programName: string;
                categoria: string;
                pendingCount: number;
                coursesMap: Map<string, {
                    courseId: string;
                    courseTitle: string;
                    missingDates: Array<{
                        date: string;
                        dateFormatted: string;
                        dayOfWeek: string;
                        timeRange: string;
                    }>;
                }>;
            }>;
        }>();

        filteredItems.forEach(item => {
            if (!teacherMap.has(item.teacherId)) {
                teacherMap.set(item.teacherId, {
                    teacherId: item.teacherId,
                    teacherName: item.teacherName,
                    teacherEmail: item.teacherEmail,
                    teacherPhone: item.teacherPhone,
                    teacherImage: item.teacherImage,
                    totalPendingCount: 0,
                    groupsMap: new Map()
                });
            }
            const t = teacherMap.get(item.teacherId)!;
            t.totalPendingCount++;

            if (!t.groupsMap.has(item.groupId)) {
                t.groupsMap.set(item.groupId, {
                    groupId: item.groupId,
                    groupName: item.groupName,
                    programName: item.programName,
                    categoria: item.categoria,
                    pendingCount: 0,
                    coursesMap: new Map()
                });
            }
            const g = t.groupsMap.get(item.groupId)!;
            g.pendingCount++;

            if (!g.coursesMap.has(item.courseId)) {
                g.coursesMap.set(item.courseId, {
                    courseId: item.courseId,
                    courseTitle: item.courseTitle,
                    missingDates: []
                });
            }
            g.coursesMap.get(item.courseId)!.missingDates.push({
                date: item.date,
                dateFormatted: item.dateFormatted,
                dayOfWeek: item.dayOfWeek,
                timeRange: item.timeRange
            });
        });

        return Array.from(teacherMap.values()).map(t => ({
            ...t,
            groups: Array.from(t.groupsMap.values()).map(g => ({
                ...g,
                courses: Array.from(g.coursesMap.values())
            }))
        })).sort((a, b) => b.totalPendingCount - a.totalPendingCount);
    }, [filteredItems]);

    const filteredGroups = useMemo(() => {
        const groupMap = new Map<string, {
            groupId: string;
            groupName: string;
            programName: string;
            categoria: string;
            totalPendingCount: number;
            teachersSet: Set<string>;
            coursesMap: Map<string, {
                courseId: string;
                courseTitle: string;
                teacherId: string;
                teacherName: string;
                teacherEmail: string;
                teacherPhone: string;
                missingDates: Array<{
                    date: string;
                    dateFormatted: string;
                    dayOfWeek: string;
                    timeRange: string;
                }>;
            }>;
        }>();

        filteredItems.forEach(item => {
            if (!groupMap.has(item.groupId)) {
                groupMap.set(item.groupId, {
                    groupId: item.groupId,
                    groupName: item.groupName,
                    programName: item.programName,
                    categoria: item.categoria,
                    totalPendingCount: 0,
                    teachersSet: new Set(),
                    coursesMap: new Map()
                });
            }
            const g = groupMap.get(item.groupId)!;
            g.totalPendingCount++;
            g.teachersSet.add(item.teacherId);

            if (!g.coursesMap.has(item.courseId)) {
                g.coursesMap.set(item.courseId, {
                    courseId: item.courseId,
                    courseTitle: item.courseTitle,
                    teacherId: item.teacherId,
                    teacherName: item.teacherName,
                    teacherEmail: item.teacherEmail,
                    teacherPhone: item.teacherPhone,
                    missingDates: []
                });
            }
            g.coursesMap.get(item.courseId)!.missingDates.push({
                date: item.date,
                dateFormatted: item.dateFormatted,
                dayOfWeek: item.dayOfWeek,
                timeRange: item.timeRange
            });
        });

        return Array.from(groupMap.values()).map(g => ({
            ...g,
            teachersCount: g.teachersSet.size,
            courses: Array.from(g.coursesMap.values())
        })).sort((a, b) => b.totalPendingCount - a.totalPendingCount);
    }, [filteredItems]);

    // Copy missing dates to clipboard
    const handleCopyDates = (label: string, dates: Array<{ dateFormatted: string; dayOfWeek: string; timeRange?: string }>, id: string) => {
        const text = `${label}:\n` + dates.map(d => `- ${d.dayOfWeek} ${d.dateFormatted} (${d.timeRange || "Horario habitual"})`).join("\n");
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        toast.success("Fechas copiadas al portapapeles");
        setTimeout(() => setCopiedId(null), 2500);
    };

    // Export to CSV
    const handleExportCSV = () => {
        if (!filteredItems.length) {
            toast.info("No hay datos para exportar");
            return;
        }

        const headers = [
            "Ficha / Grupo",
            "Programa",
            "Etapa",
            "Materia / Competencia",
            "Instructor",
            "Correo Instructor",
            "Teléfono",
            "Fecha Pendiente",
            "Día de la Semana",
            "Horario Programado"
        ];

        const rows = filteredItems.map(i => [
            `"${i.groupName}"`,
            `"${i.programName}"`,
            `"${i.categoria}"`,
            `"${i.courseTitle.replace(/"/g, '""')}"`,
            `"${i.teacherName.replace(/"/g, '""')}"`,
            `"${i.teacherEmail}"`,
            `"${i.teacherPhone}"`,
            `"${i.dateFormatted}"`,
            `"${i.dayOfWeek}"`,
            `"${i.timeRange}"`
        ]);

        const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `inasistencias_pendientes_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Archivo CSV generado exitosamente");
    };

    const toggleTeacherExpand = (id: string) => {
        setExpandedTeachers(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const toggleGroupExpand = (id: string) => {
        setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl sm:max-w-6xl w-[96vw] max-h-[92vh] h-[92vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl border-border bg-background shadow-2xl">
                {/* Header */}
                <div className="p-5 sm:p-6 border-b bg-muted/20 shrink-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                    <ClipboardList className="w-5 h-5" />
                                </div>
                                <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight">
                                    Control de Asistencias por Diligenciar
                                </DialogTitle>
                            </div>
                            <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                                Identifica instructores con sesiones de clase programadas que aún no cuentan con registro de asistencia en el horario vigente.
                            </DialogDescription>
                        </div>

                        {/* Schedule badge & action buttons */}
                        <div className="flex items-center gap-2 flex-wrap">
                            {data?.schedule && (
                                <Badge variant="outline" className="h-8 gap-1.5 px-3 bg-background border-border/80 text-xs font-medium">
                                    <Calendar className="w-3.5 h-3.5 text-primary" />
                                    <span>
                                        Vigente: {data.schedule.startDate} al {data.schedule.limitDate}
                                    </span>
                                </Badge>
                            )}

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={loadData}
                                disabled={loading}
                                className="h-8 gap-1.5 text-xs font-semibold"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                                <span className="hidden sm:inline">Actualizar</span>
                            </Button>

                            <Button
                                variant="default"
                                size="sm"
                                onClick={handleExportCSV}
                                disabled={loading || filteredItems.length === 0}
                                className="h-8 gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                <Download className="w-3.5 h-3.5" />
                                <span>Exportar Excel/CSV</span>
                            </Button>
                        </div>
                    </div>

                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                        <div className="p-3.5 rounded-xl border bg-background/80 shadow-2xs flex items-center justify-between">
                            <div className="space-y-0.5">
                                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                                    Clases Pendientes
                                </span>
                                <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                                    {loading ? "-" : filteredItems.length}
                                </div>
                            </div>
                            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                <AlertTriangle className="w-4 h-4" />
                            </div>
                        </div>

                        <div className="p-3.5 rounded-xl border bg-background/80 shadow-2xs flex items-center justify-between">
                            <div className="space-y-0.5">
                                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                                    Instructores
                                </span>
                                <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                                    {loading ? "-" : filteredTeachers.length}
                                </div>
                            </div>
                            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                <Users className="w-4 h-4" />
                            </div>
                        </div>

                        <div className="p-3.5 rounded-xl border bg-background/80 shadow-2xs flex items-center justify-between">
                            <div className="space-y-0.5">
                                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                                    Fichas Afectadas
                                </span>
                                <div className="text-2xl font-black text-violet-600 dark:text-violet-400">
                                    {loading ? "-" : filteredGroups.length}
                                </div>
                            </div>
                            <div className="p-2 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                                <GraduationCap className="w-4 h-4" />
                            </div>
                        </div>

                        <div className="p-3.5 rounded-xl border bg-background/80 shadow-2xs flex items-center justify-between">
                            <div className="space-y-0.5">
                                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                                    Materias
                                </span>
                                <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                                    {loading ? "-" : new Set(filteredItems.map(i => i.courseId)).size}
                                </div>
                            </div>
                            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                <BookOpen className="w-4 h-4" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters Bar */}
                <div className="p-3.5 sm:px-6 border-b bg-muted/10 shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por instructor, ficha o materia..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-9 text-xs sm:text-sm bg-background"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Group Filter */}
                        <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                            <SelectTrigger className="h-9 w-[150px] sm:w-[170px] text-xs bg-background">
                                <SelectValue placeholder="Ficha / Grupo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas las Fichas</SelectItem>
                                {groupOptions.map(g => (
                                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Teacher Filter */}
                        <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                            <SelectTrigger className="h-9 w-[150px] sm:w-[180px] text-xs bg-background">
                                <SelectValue placeholder="Instructor" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los Instructores</SelectItem>
                                {teacherOptions.map(t => (
                                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {(searchQuery || selectedGroup !== "all" || selectedTeacher !== "all") && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setSearchQuery("");
                                    setSelectedGroup("all");
                                    setSelectedTeacher("all");
                                }}
                                className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground"
                            >
                                Limpiar
                            </Button>
                        )}
                    </div>
                </div>

                {/* Body Content with Tabs */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-background">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground py-20">
                            <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                            <p className="text-sm font-medium">Analizando programación académica y registros de asistencia...</p>
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center gap-4 py-20 text-center">
                            <div className="p-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="w-12 h-12" />
                            </div>
                            <div className="space-y-1 max-w-md">
                                <h3 className="text-lg font-bold">¡Todo al día!</h3>
                                <p className="text-xs sm:text-sm text-muted-foreground">
                                    No se encontraron inasistencias o clases pendientes por diligenciar para los filtros aplicados en el período vigente.
                                </p>
                            </div>
                            {(searchQuery || selectedGroup !== "all" || selectedTeacher !== "all") && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setSearchQuery("");
                                        setSelectedGroup("all");
                                        setSelectedTeacher("all");
                                    }}
                                    className="text-xs"
                                >
                                    Restablecer filtros
                                </Button>
                            )}
                        </div>
                    ) : (
                        <Tabs defaultValue="teachers" className="w-full space-y-4">
                            <TabsList className="grid w-full sm:w-[420px] grid-cols-3">
                                <TabsTrigger value="teachers" className="text-xs font-semibold">
                                    Por Instructor ({filteredTeachers.length})
                                </TabsTrigger>
                                <TabsTrigger value="groups" className="text-xs font-semibold">
                                    Por Ficha ({filteredGroups.length})
                                </TabsTrigger>
                                <TabsTrigger value="table" className="text-xs font-semibold">
                                    Listado Detallado ({filteredItems.length})
                                </TabsTrigger>
                            </TabsList>

                            {/* TAB 1: POR INSTRUCTOR */}
                            <TabsContent value="teachers" className="space-y-3 mt-4">
                                {filteredTeachers.map(teacher => {
                                    const isExpanded = expandedTeachers[teacher.teacherId] !== false; // default open
                                    const allDatesForTeacher = teacher.groups.flatMap(g => g.courses.flatMap(c => c.missingDates));

                                    return (
                                        <div
                                            key={teacher.teacherId}
                                            className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xs transition-all hover:border-border"
                                        >
                                            {/* Teacher Header Bar */}
                                            <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20">
                                                <div className="flex items-center gap-3">
                                                    <UserAvatar
                                                        src={teacher.teacherImage}
                                                        alt={teacher.teacherName}
                                                        fallbackText={teacher.teacherName}
                                                        size="sm"
                                                        className="border border-border"
                                                    />
                                                    <div>
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <h4 className="font-bold text-sm sm:text-base text-foreground">
                                                                {teacher.teacherName}
                                                            </h4>
                                                            <Badge
                                                                variant="destructive"
                                                                className="h-5 px-2 text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                                                            >
                                                                {teacher.totalPendingCount} {teacher.totalPendingCount === 1 ? "clase pendiente" : "clases pendientes"}
                                                            </Badge>
                                                        </div>
                                                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                                            {teacher.teacherEmail && (
                                                                <span className="flex items-center gap-1">
                                                                    <Mail className="w-3 h-3" />
                                                                    {teacher.teacherEmail}
                                                                </span>
                                                            )}
                                                            {teacher.teacherPhone && (
                                                                <span className="flex items-center gap-1">
                                                                    <Phone className="w-3 h-3" />
                                                                    {teacher.teacherPhone}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 self-end sm:self-auto">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleCopyDates(
                                                            `Pendientes de asistencia - ${teacher.teacherName}`,
                                                            allDatesForTeacher,
                                                            teacher.teacherId
                                                        )}
                                                        className="h-8 gap-1.5 text-xs font-medium"
                                                        title="Copiar lista de fechas pendientes"
                                                    >
                                                        {copiedId === teacher.teacherId ? (
                                                            <>
                                                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                                                <span>Copiado</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Copy className="w-3.5 h-3.5" />
                                                                <span>Copiar Fechas</span>
                                                            </>
                                                        )}
                                                    </Button>

                                                    {teacher.teacherEmail && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            asChild
                                                            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                                                        >
                                                            <a
                                                                href={`mailto:${teacher.teacherEmail}?subject=Recordatorio: Diligenciamiento de asistencias pendientes - Academix`}
                                                                title="Enviar correo"
                                                            >
                                                                <Mail className="w-4 h-4" />
                                                            </a>
                                                        </Button>
                                                    )}

                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => toggleTeacherExpand(teacher.teacherId)}
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Groups & Courses for this teacher */}
                                            {isExpanded && (
                                                <div className="p-4 space-y-4 border-t divide-y divide-border/40">
                                                    {teacher.groups.map(group => (
                                                        <div key={group.groupId} className="pt-3 first:pt-0 space-y-2.5">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <Badge variant="secondary" className="font-bold text-xs">
                                                                        Ficha {group.groupName}
                                                                    </Badge>
                                                                    <span className="text-xs text-muted-foreground font-medium">
                                                                        {group.programName}
                                                                    </span>
                                                                </div>
                                                                <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
                                                                    {group.pendingCount} pendientes
                                                                </span>
                                                            </div>

                                                            <div className="space-y-2 pl-2">
                                                                {group.courses.map(course => (
                                                                    <div
                                                                        key={course.courseId}
                                                                        className="p-3 rounded-lg bg-muted/40 border border-border/40 space-y-2"
                                                                    >
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="text-xs font-bold text-foreground">
                                                                                {course.courseTitle}
                                                                            </span>
                                                                            <span className="text-[11px] text-muted-foreground">
                                                                                {course.missingDates.length} fechas sin registro
                                                                            </span>
                                                                        </div>

                                                                        {/* Date Chips */}
                                                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                                                            {course.missingDates.map((d, idx) => (
                                                                                <div
                                                                                    key={idx}
                                                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-background border border-amber-500/20 text-foreground text-xs shadow-2xs"
                                                                                >
                                                                                    <span className="font-semibold text-amber-700 dark:text-amber-400">
                                                                                        {d.dayOfWeek.slice(0, 3)}
                                                                                    </span>
                                                                                    <span className="text-xs font-mono">
                                                                                        {d.dateFormatted}
                                                                                    </span>
                                                                                    {d.timeRange && d.timeRange !== "Horario habitual" && (
                                                                                        <span className="text-[10px] text-muted-foreground border-l pl-1">
                                                                                            {d.timeRange}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </TabsContent>

                            {/* TAB 2: POR FICHA */}
                            <TabsContent value="groups" className="space-y-3 mt-4">
                                {filteredGroups.map(group => {
                                    const isExpanded = expandedGroups[group.groupId] !== false; // default open
                                    const allDatesForGroup = group.courses.flatMap(c => c.missingDates);

                                    return (
                                        <div
                                            key={group.groupId}
                                            className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xs transition-all hover:border-border"
                                        >
                                            <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <Badge variant="default" className="text-sm font-bold px-3 py-1 bg-purple-600 hover:bg-purple-700">
                                                            Ficha {group.groupName}
                                                        </Badge>
                                                        <Badge variant="outline" className="text-xs font-medium">
                                                            {group.categoria}
                                                        </Badge>
                                                        <Badge
                                                            variant="destructive"
                                                            className="h-5 px-2 text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                                                        >
                                                            {group.totalPendingCount} clases sin diligenciar
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground font-medium">
                                                        {group.programName} • {group.teachersCount} instructores con pendientes
                                                    </p>
                                                </div>

                                                <div className="flex items-center gap-2 self-end sm:self-auto">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleCopyDates(
                                                            `Pendientes de asistencia - Ficha ${group.groupName}`,
                                                            allDatesForGroup,
                                                            group.groupId
                                                        )}
                                                        className="h-8 gap-1.5 text-xs font-medium"
                                                        title="Copiar lista de fechas pendientes"
                                                    >
                                                        {copiedId === group.groupId ? (
                                                            <>
                                                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                                                <span>Copiado</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Copy className="w-3.5 h-3.5" />
                                                                <span>Copiar Fechas</span>
                                                            </>
                                                        )}
                                                    </Button>

                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => toggleGroupExpand(group.groupId)}
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                    </Button>
                                                </div>
                                            </div>

                                            {isExpanded && (
                                                <div className="p-4 space-y-3 border-t">
                                                    {group.courses.map(course => (
                                                        <div
                                                            key={course.courseId}
                                                            className="p-3.5 rounded-xl bg-muted/30 border border-border/50 space-y-2.5"
                                                        >
                                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                                                                <div>
                                                                    <div className="font-bold text-xs sm:text-sm text-foreground">
                                                                        {course.courseTitle}
                                                                    </div>
                                                                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                                                        <Users className="w-3 h-3 text-primary" />
                                                                        <span className="font-medium text-foreground">{course.teacherName}</span>
                                                                        {course.teacherEmail && (
                                                                            <span className="text-muted-foreground">({course.teacherEmail})</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <Badge variant="outline" className="text-xs font-semibold self-start sm:self-auto">
                                                                    {course.missingDates.length} fechas pendientes
                                                                </Badge>
                                                            </div>

                                                            <div className="flex flex-wrap gap-1.5 pt-1">
                                                                {course.missingDates.map((d, idx) => (
                                                                    <div
                                                                        key={idx}
                                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-background border border-amber-500/20 text-foreground text-xs shadow-2xs"
                                                                    >
                                                                        <span className="font-semibold text-amber-700 dark:text-amber-400">
                                                                            {d.dayOfWeek.slice(0, 3)}
                                                                        </span>
                                                                        <span className="text-xs font-mono">
                                                                            {d.dateFormatted}
                                                                        </span>
                                                                        {d.timeRange && d.timeRange !== "Horario habitual" && (
                                                                            <span className="text-[10px] text-muted-foreground border-l pl-1">
                                                                                {d.timeRange}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </TabsContent>

                            {/* TAB 3: TABLA DETALLADA */}
                            <TabsContent value="table" className="mt-4">
                                <div className="rounded-xl border border-border overflow-hidden bg-card">
                                    <Table>
                                        <TableHeader className="bg-muted/50">
                                            <TableRow>
                                                <TableHead className="text-xs font-bold w-[120px]">Ficha</TableHead>
                                                <TableHead className="text-xs font-bold min-w-[180px]">Materia / Competencia</TableHead>
                                                <TableHead className="text-xs font-bold min-w-[200px]">Instructor Responsable</TableHead>
                                                <TableHead className="text-xs font-bold w-[130px]">Fecha Pendiente</TableHead>
                                                <TableHead className="text-xs font-bold w-[110px]">Día</TableHead>
                                                <TableHead className="text-xs font-bold w-[130px]">Horario</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredItems.map(item => (
                                                <TableRow key={item.id} className="hover:bg-muted/30">
                                                    <TableCell className="font-bold text-xs">
                                                        <Badge variant="outline" className="font-mono font-bold">
                                                            {item.groupName}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-xs font-medium">
                                                        {item.courseTitle}
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        <div className="font-medium text-foreground">{item.teacherName}</div>
                                                        {item.teacherEmail && (
                                                            <div className="text-[11px] text-muted-foreground">{item.teacherEmail}</div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-xs font-mono font-semibold text-amber-700 dark:text-amber-400">
                                                        {item.dateFormatted}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground font-medium">
                                                        {item.dayOfWeek}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">
                                                        {item.timeRange}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </TabsContent>
                        </Tabs>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
