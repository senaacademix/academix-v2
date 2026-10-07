"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { 
    Layers, 
    GraduationCap, 
    Search, 
    Download, 
    Calendar, 
    Building2, 
    BookOpen, 
    UserCheck, 
    Clock, 
    FileSpreadsheet, 
    Users,
    BarChart3,
    Eye,
    FileText,
    Loader2,
    CalendarClock,
    X,
    Sparkles,
    CheckCircle2
} from "lucide-react";
import { StudentNovedadBadge } from "@/components/StudentNovedadBadge";
import { formatName } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { StudentDetailView } from "./StudentDetailView";
import { GroupAnalyticsView } from "./GroupAnalyticsView";
import { exportGroupStudentsPdf, exportGroupStudentsExcel } from "../../utils/programExportUtils";

interface ProgramGroupsTabProps {
    program: any;
    allPrograms?: any[];
    onSelectProgram?: (programId: string) => void;
    isObserver?: boolean;
}

const normalizeCategory = (cat?: string | null): "LECTIVA" | "PRODUCTIVA" | "EGRESADOS" => {
    if (!cat) return "LECTIVA";
    const upper = String(cat).trim().toUpperCase();
    if (upper === "PRODUCTIVA" || upper.includes("PRODUC")) return "PRODUCTIVA";
    if (upper === "EGRESADOS" || upper.includes("EGRES")) return "EGRESADOS";
    return "LECTIVA";
};

const categoryBadges: Record<string, { label: string; bg: string }> = {
    LECTIVA: { label: "Etapa Lectiva", bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
    PRODUCTIVA: { label: "Etapa Productiva", bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
    EGRESADOS: { label: "Egresados", bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" }
};

const DAYS_CONFIG = [
    { key: "MONDAY", label: "Lunes", short: "Lun" },
    { key: "TUESDAY", label: "Martes", short: "Mar" },
    { key: "WEDNESDAY", label: "Miércoles", short: "Mié" },
    { key: "THURSDAY", label: "Jueves", short: "Jue" },
    { key: "FRIDAY", label: "Viernes", short: "Vie" },
    { key: "SATURDAY", label: "Sábado", short: "Sáb" },
];

export function ProgramGroupsTab({ 
    program,
    allPrograms = [],
    onSelectProgram,
    isObserver = false
}: ProgramGroupsTabProps) {
    const groups = useMemo(() => program.groups || [], [program.groups]);
    const timelines = useMemo(() => program.timelines || [], [program.timelines]);

    const [selectedTimelineId, setSelectedTimelineId] = useState<string>("ALL");
    const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
    const [groupSearchQuery, setGroupSearchQuery] = useState<string>("");
    const [selectedGroupId, setSelectedGroupId] = useState<string>(groups.length > 0 ? groups[0].id : "");
    const [studentSearchQuery, setStudentSearchQuery] = useState<string>("");
    const [groupViewMode, setGroupViewMode] = useState<"students" | "schedule" | "courses" | "analytics">("students");
    const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
    const [layoutMode, setLayoutMode] = useState<"top" | "split">("top");

    // Map which timelines belong to each group
    const groupTimelinesMap = useMemo(() => {
        const map = new Map<string, any[]>();
        groups.forEach((g: any) => {
            const matchedTimelineIds = new Set<string>();
            (g.courses || []).forEach((c: any) => {
                const tlId = c.period?.timelineId || c.period?.timeline?.id;
                if (tlId) matchedTimelineIds.add(tlId);
            });
            (g.scheduleSlots || []).forEach((s: any) => {
                const tlId = s.period?.timelineId || s.period?.timeline?.id;
                if (tlId) matchedTimelineIds.add(tlId);
            });
            if (matchedTimelineIds.size === 0 && timelines.length > 0) {
                const def = timelines.find((t: any) => t.isDefault) || timelines[0];
                if (def) matchedTimelineIds.add(def.id);
            }
            const matchedTls = timelines.filter((t: any) => matchedTimelineIds.has(t.id));
            map.set(g.id, matchedTls);
        });
        return map;
    }, [groups, timelines]);

    // Timeline count summary
    const timelineCounts = useMemo(() => {
        const counts: Record<string, number> = { ALL: groups.length };
        timelines.forEach((tl: any) => {
            counts[tl.id] = groups.filter((g: any) => {
                const gTls = groupTimelinesMap.get(g.id) || [];
                return gTls.some((t: any) => t.id === tl.id);
            }).length;
        });
        return counts;
    }, [groups, timelines, groupTimelinesMap]);

    // Filter groups by Timeline, Category and Search Query
    const filteredGroups = useMemo(() => {
        return groups.filter((g: any) => {
            // Timeline filter
            if (selectedTimelineId !== "ALL") {
                const gTls = groupTimelinesMap.get(g.id) || [];
                const matchesTl = gTls.some((t: any) => t.id === selectedTimelineId);
                if (!matchesTl) return false;
            }

            // Category filter
            const groupCat = normalizeCategory(g.categoria);
            const matchesCategory = selectedCategory === "ALL" || groupCat === selectedCategory;

            // Search filter
            const q = groupSearchQuery.trim().toLowerCase();
            const matchesSearch = !q || 
                g.name.toLowerCase().includes(q) ||
                (g.description && g.description.toLowerCase().includes(q));

            return matchesCategory && matchesSearch;
        });
    }, [groups, selectedTimelineId, groupTimelinesMap, selectedCategory, groupSearchQuery]);

    // Category counts within the current timeline selection
    const categoryCounts = useMemo(() => {
        const timelineScopedGroups = groups.filter((g: any) => {
            if (selectedTimelineId === "ALL") return true;
            const gTls = groupTimelinesMap.get(g.id) || [];
            return gTls.some((t: any) => t.id === selectedTimelineId);
        });

        let lectiva = 0;
        let productiva = 0;
        let egresados = 0;
        timelineScopedGroups.forEach((g: any) => {
            const c = normalizeCategory(g.categoria);
            if (c === "LECTIVA") lectiva++;
            else if (c === "PRODUCTIVA") productiva++;
            else if (c === "EGRESADOS") egresados++;
        });
        return { total: timelineScopedGroups.length, lectiva, productiva, egresados };
    }, [groups, selectedTimelineId, groupTimelinesMap]);

    // Active selected group - strictly constrained to filteredGroups
    const activeGroup = useMemo(() => {
        if (filteredGroups.length === 0) return null;
        return filteredGroups.find((g: any) => g.id === selectedGroupId) || filteredGroups[0];
    }, [filteredGroups, selectedGroupId]);

    // Filter students within the active group
    const filteredStudents = useMemo(() => {
        if (!activeGroup || !activeGroup.students) return [];
        const query = studentSearchQuery.toLowerCase().trim();
        if (!query) return activeGroup.students;

        return activeGroup.students.filter((s: any) => {
            const name = (s.name || "").toLowerCase();
            const doc = (s.profile?.identificacion || "").toLowerCase();
            const email = (s.email || "").toLowerCase();
            const novedad = (s.profile?.novedad || "").toLowerCase();
            return name.includes(query) || doc.includes(query) || email.includes(query) || novedad.includes(query);
        });
    }, [activeGroup, studentSearchQuery]);

    // Gather schedule sessions for active group
    const activeGroupScheduleSlots = useMemo(() => {
        if (!activeGroup) return [];
        const slots: Array<{
            id: string;
            dayOfWeek: string;
            startTime: string;
            endTime: string;
            title: string;
            teacherName: string;
            environmentName: string;
            weeklyHours?: number;
        }> = [];

        (activeGroup.courses || []).forEach((c: any) => {
            (c.schedules || []).forEach((sch: any) => {
                slots.push({
                    id: sch.id,
                    dayOfWeek: sch.dayOfWeek,
                    startTime: sch.startTime,
                    endTime: sch.endTime,
                    title: c.title,
                    teacherName: sch.teacher?.name || c.teacher?.name || "Sin instructor",
                    environmentName: sch.environment?.name || activeGroup.environment?.name || "Sin ambiente",
                    weeklyHours: c.weeklyHours,
                });
            });
        });

        (activeGroup.scheduleSlots || []).forEach((slot: any) => {
            if (!slots.some(s => s.id === slot.id)) {
                slots.push({
                    id: slot.id,
                    dayOfWeek: slot.dayOfWeek,
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    title: slot.course?.title || slot.period?.name || "Sesión programada",
                    teacherName: slot.teacher?.name || "Sin instructor",
                    environmentName: slot.environment?.name || activeGroup.environment?.name || "Sin ambiente",
                });
            }
        });

        return slots.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }, [activeGroup]);

    const formatDateSafe = (d: any) => {
        if (!d) return "No definida";
        try {
            return format(new Date(d), "dd/MM/yyyy", { locale: es });
        } catch {
            return "No definida";
        }
    };

    const [isExportingPdf, setIsExportingPdf] = useState(false);
    const [isExportingExcel, setIsExportingExcel] = useState(false);

    const handleExportPdf = async () => {
        if (!activeGroup) return;
        setIsExportingPdf(true);
        toast.info("Generando PDF de la ficha...");
        try {
            await exportGroupStudentsPdf(activeGroup, program.name);
            toast.success("PDF de la ficha descargado exitosamente");
        } catch (e) {
            console.error(e);
            toast.error("Error al exportar el PDF de la ficha");
        } finally {
            setIsExportingPdf(false);
        }
    };

    const handleExportExcel = async () => {
        if (!activeGroup) return;
        setIsExportingExcel(true);
        toast.info("Generando Excel de la ficha...");
        try {
            await exportGroupStudentsExcel(activeGroup, program.name);
            toast.success("Excel de la ficha descargado exitosamente");
        } catch (e) {
            console.error(e);
            toast.error("Error al exportar el Excel de la ficha");
        } finally {
            setIsExportingExcel(false);
        }
    };

    // If an individual student is selected, switch to full dedicated student view
    if (selectedStudent) {
        return (
            <StudentDetailView
                student={selectedStudent}
                group={activeGroup}
                program={program}
                onBack={() => setSelectedStudent(null)}
            />
        );
    }

    const renderFichaButton = (g: any, isCompact = false) => {
        const isSelected = activeGroup?.id === g.id;
        const cat = normalizeCategory(g.categoria);
        const studentCount = g.students?.length || 0;
        const dotColor = 
            cat === "LECTIVA" ? "bg-emerald-500" :
            cat === "PRODUCTIVA" ? "bg-amber-500" : "bg-blue-500";

        if (isCompact) {
            return (
                <button
                    key={g.id}
                    type="button"
                    onClick={() => {
                        setSelectedGroupId(g.id);
                        setStudentSearchQuery("");
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                        isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-xs ring-2 ring-primary/25"
                            : "bg-card text-foreground border-border/80 hover:border-primary/40 hover:bg-muted/50"
                    }`}
                >
                    <div className="flex items-center justify-between gap-1">
                        <span className="font-mono text-xs font-black tracking-tight">{g.name}</span>
                        <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-medium opacity-85">
                        <span>{studentCount} ap.</span>
                        <span className="truncate max-w-[65px]">{g.environment?.name || ""}</span>
                    </div>
                </button>
            );
        }

        return (
            <button
                key={g.id}
                type="button"
                onClick={() => {
                    setSelectedGroupId(g.id);
                    setStudentSearchQuery("");
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 border ${
                    isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-xs ring-2 ring-primary/25 scale-[1.02]"
                        : "bg-card text-foreground border-border/80 hover:border-primary/40 hover:bg-muted/60"
                }`}
            >
                <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                <span className="font-mono tracking-tight font-black">{g.name}</span>
                <span
                    className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
                        isSelected
                            ? "bg-primary-foreground/20 text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                    }`}
                >
                    {studentCount} ap.
                </span>
                {g.environment && (
                    <span className={`text-[10px] opacity-75 hidden md:inline truncate max-w-[80px] ${
                        isSelected ? "text-primary-foreground/90" : "text-muted-foreground"
                    }`}>
                        • {g.environment.name}
                    </span>
                )}
            </button>
        );
    };

    return (
        <div className="space-y-4">
            {/* Unified Fluid Filter Control Bar */}
            <div className="bg-card p-3 sm:p-4 rounded-2xl border border-border/80 shadow-2xs space-y-3">
                {/* Upper Filters: Program + Timeline */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Selector de Programa (si hay múltiples programas o como filtro visible) */}
                        {allPrograms.length > 0 && onSelectProgram && (
                            <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider hidden sm:inline">
                                    Programa:
                                </span>
                                <Select value={program.id} onValueChange={onSelectProgram}>
                                    <SelectTrigger className="h-8 text-xs font-bold rounded-xl w-[220px] bg-muted/30 border-border/70 shadow-2xs">
                                        <div className="flex items-center gap-1.5 truncate">
                                            <GraduationCap className="h-3.5 w-3.5 text-primary shrink-0" />
                                            <SelectValue placeholder="Seleccionar programa..." />
                                        </div>
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

                        {/* Filtro de Líneas de Tiempo */}
                        {timelines.length > 0 && (
                            <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider hidden sm:inline">
                                    Línea de Tiempo:
                                </span>
                                <Select 
                                    value={selectedTimelineId} 
                                    onValueChange={(val) => {
                                        setSelectedTimelineId(val);
                                        const matching = groups.find((g: any) => {
                                            if (val === "ALL") return true;
                                            const gTls = groupTimelinesMap.get(g.id) || [];
                                            return gTls.some((t: any) => t.id === val);
                                        });
                                        if (matching) setSelectedGroupId(matching.id);
                                    }}
                                >
                                    <SelectTrigger className="h-8 text-xs font-bold rounded-xl min-w-[200px] bg-muted/30 border-border/70 shadow-2xs">
                                        <div className="flex items-center gap-1.5 truncate">
                                            <Layers className="h-3.5 w-3.5 text-primary shrink-0" />
                                            <SelectValue placeholder="Línea de Tiempo..." />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL" className="text-xs font-semibold">
                                            Todas las Líneas de Tiempo ({groups.length})
                                        </SelectItem>
                                        {timelines.map((tl: any) => (
                                            <SelectItem key={tl.id} value={tl.id} className="text-xs font-medium">
                                                {tl.name} ({timelineCounts[tl.id] || 0} fichas)
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    {/* Buscador de Fichas */}
                    <div className="relative w-full sm:w-64 shrink-0">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Buscar ficha por código o nombre..."
                            value={groupSearchQuery}
                            onChange={(e) => setGroupSearchQuery(e.target.value)}
                            className="pl-8 pr-7 h-8 text-xs rounded-xl bg-muted/20"
                        />
                        {groupSearchQuery && (
                            <button
                                type="button"
                                onClick={() => setGroupSearchQuery("")}
                                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Lower Filters: Etapas Formativas Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none pt-1 border-t border-border/50">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider shrink-0 mr-1 hidden md:inline">
                        Etapa:
                    </span>
                    {[
                        { key: "ALL", label: "Todas las Fichas", count: categoryCounts.total },
                        { key: "LECTIVA", label: "Etapa Lectiva", count: categoryCounts.lectiva },
                        { key: "PRODUCTIVA", label: "Etapa Productiva", count: categoryCounts.productiva },
                        { key: "EGRESADOS", label: "Egresados", count: categoryCounts.egresados },
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => {
                                setSelectedCategory(tab.key);
                                const matching = filteredGroups.find((g: any) => 
                                    tab.key === "ALL" ? true : normalizeCategory(g.categoria) === tab.key
                                );
                                if (matching) {
                                    setSelectedGroupId(matching.id);
                                }
                                setStudentSearchQuery("");
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                                selectedCategory === tab.key
                                    ? "bg-primary text-primary-foreground shadow-xs"
                                    : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/70"
                            }`}
                        >
                            <span>{tab.label}</span>
                            <Badge 
                                variant={selectedCategory === tab.key ? "secondary" : "outline"} 
                                className="px-1.5 py-0 text-[10px] h-4 leading-none font-bold"
                            >
                                {tab.count}
                            </Badge>
                        </button>
                    ))}
                </div>

                {/* Botones de Fichas (Barra Rápida Superior) */}
                <div className="pt-2.5 border-t border-border/50 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                <Layers className="h-3.5 w-3.5 text-primary" />
                                Botones de Fichas ({filteredGroups.length}):
                            </span>
                            {activeGroup && (
                                <Badge variant="outline" className="text-[11px] font-bold bg-primary/10 text-primary border-primary/20">
                                    Ficha {activeGroup.name}
                                </Badge>
                            )}
                        </div>

                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mr-1 hidden sm:inline">
                                Disposición:
                            </span>
                            <Button
                                variant={layoutMode === "top" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setLayoutMode("top")}
                                className="h-7 px-2.5 text-xs font-bold rounded-xl gap-1.5"
                                title="Fichas arriba y espacio completo para el contenido"
                            >
                                Superior (Completo)
                            </Button>
                            <Button
                                variant={layoutMode === "split" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setLayoutMode("split")}
                                className="h-7 px-2.5 text-xs font-bold rounded-xl gap-1.5"
                                title="Fichas en panel lateral"
                            >
                                Lateral
                            </Button>
                        </div>
                    </div>

                    {filteredGroups.length === 0 ? (
                        <div className="p-3 text-center bg-muted/20 rounded-xl border border-dashed border-border/70 text-xs text-muted-foreground">
                            No se encontraron fichas con los filtros seleccionados
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1 py-0.5 scrollbar-thin">
                            {filteredGroups.map((g: any) => renderFichaButton(g, false))}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content: Full width or Split layout */}
            <div className={layoutMode === "split" ? "grid grid-cols-1 lg:grid-cols-12 gap-5 items-start" : "w-full"}>
                {layoutMode === "split" && (
                    <div className="lg:col-span-4 space-y-2">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                                Fichas ({filteredGroups.length})
                            </span>
                            {selectedTimelineId !== "ALL" && (
                                <Badge variant="outline" className="text-[9.5px] font-bold px-1.5 py-0 bg-primary/5 text-primary border-primary/20">
                                    🧭 {timelines.find((t: any) => t.id === selectedTimelineId)?.name || "Línea"}
                                </Badge>
                            )}
                        </div>

                        {filteredGroups.length === 0 ? (
                            <div className="p-8 text-center bg-card rounded-2xl border border-dashed border-border/70">
                                <Layers className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                                <p className="text-xs font-bold text-foreground">No se encontraron fichas</p>
                                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                                    {selectedTimelineId !== "ALL"
                                        ? "No hay fichas vinculadas a esta línea de tiempo en la etapa seleccionada."
                                        : "Intenta cambiar el criterio de búsqueda o la etapa formativa."}
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setSelectedTimelineId("ALL");
                                        setSelectedCategory("ALL");
                                        setGroupSearchQuery("");
                                    }}
                                    className="mt-3 text-xs h-7 rounded-xl"
                                >
                                    Limpiar Filtros
                                </Button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-2 max-h-[calc(100vh-260px)] overflow-y-auto pr-1 scrollbar-thin">
                                {filteredGroups.map((g: any) => renderFichaButton(g, true))}
                            </div>
                        )}
                    </div>
                )}

                {/* Selected Group Workspace */}
                <div className={layoutMode === "split" ? "lg:col-span-8 space-y-4" : "w-full space-y-4"}>
                    {activeGroup ? (
                        <>
                            {/* Group Card Header */}
                            <Card className="border border-border/80 bg-card shadow-xs rounded-2xl overflow-hidden">
                                <div className="p-4 sm:p-5 border-b border-border/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
                                    <div className="space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight">
                                                Ficha {activeGroup.name}
                                            </h3>
                                            <Badge className={`text-xs font-bold border ${categoryBadges[normalizeCategory(activeGroup.categoria)]?.bg}`}>
                                                {categoryBadges[normalizeCategory(activeGroup.categoria)]?.label}
                                            </Badge>
                                            {(groupTimelinesMap.get(activeGroup.id) || []).map((tl: any) => (
                                                <Badge key={tl.id} variant="outline" className="text-[10px] font-semibold bg-muted/40">
                                                    🧭 {tl.name}
                                                </Badge>
                                            ))}
                                        </div>
                                        <p className="text-xs text-muted-foreground font-medium">
                                            {activeGroup.description || "Ficha del programa de formación institucional."}
                                        </p>
                                    </div>

                                    {/* Action Export Buttons */}
                                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleExportPdf}
                                            disabled={isExportingPdf}
                                            className="h-8 gap-1.5 rounded-xl text-xs font-bold border-red-500/30 text-red-700 dark:text-red-300 bg-red-500/10 hover:bg-red-500/20 shadow-2xs shrink-0"
                                            title="Exportar ficha en PDF"
                                        >
                                            {isExportingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />}
                                            <span>Exportar PDF</span>
                                        </Button>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleExportExcel}
                                            disabled={isExportingExcel}
                                            className="h-8 gap-1.5 rounded-xl text-xs font-bold border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 shadow-2xs shrink-0"
                                            title="Exportar ficha en Excel"
                                        >
                                            {isExportingExcel ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />}
                                            <span>Exportar Excel</span>
                                        </Button>
                                    </div>
                                </div>

                                {/* Metadata Grid */}
                                <div className="px-4 py-3 bg-muted/20 border-b border-border/60 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                                    <div>
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Ambiente</span>
                                        <p className="font-semibold text-foreground mt-0.5 flex items-center gap-1 truncate">
                                            <Building2 className="h-3 w-3 text-primary shrink-0" />
                                            <span className="truncate">{activeGroup.environment?.name || "Sin ambiente"}</span>
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Fecha Inicio</span>
                                        <p className="font-semibold text-foreground mt-0.5">
                                            {formatDateSafe(activeGroup.startDate)}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Fecha Fin</span>
                                        <p className="font-semibold text-foreground mt-0.5">
                                            {formatDateSafe(activeGroup.endDate)}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Matriculados</span>
                                        <p className="font-bold text-primary mt-0.5">
                                            {activeGroup.students?.length || 0} aprendices
                                        </p>
                                    </div>
                                </div>

                                {/* Sub-navigation Segmented Bar */}
                                <div className="p-2.5 bg-card border-b border-border/60 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                                    <button
                                        type="button"
                                        onClick={() => setGroupViewMode("students")}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                                            groupViewMode === "students"
                                                ? "bg-primary text-primary-foreground shadow-2xs"
                                                : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted"
                                        }`}
                                    >
                                        <Users className="h-3.5 w-3.5" />
                                        <span>Aprendices ({activeGroup.students?.length || 0})</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setGroupViewMode("schedule")}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                                            groupViewMode === "schedule"
                                                ? "bg-primary text-primary-foreground shadow-2xs"
                                                : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted"
                                        }`}
                                    >
                                        <CalendarClock className="h-3.5 w-3.5" />
                                        <span>Horario de la Ficha ({activeGroupScheduleSlots.length})</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setGroupViewMode("courses")}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                                            groupViewMode === "courses"
                                                ? "bg-primary text-primary-foreground shadow-2xs"
                                                : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted"
                                        }`}
                                    >
                                        <BookOpen className="h-3.5 w-3.5" />
                                        <span>Materias ({activeGroup.courses?.length || 0})</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setGroupViewMode("analytics")}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                                            groupViewMode === "analytics"
                                                ? "bg-primary text-primary-foreground shadow-2xs"
                                                : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted"
                                        }`}
                                    >
                                        <BarChart3 className="h-3.5 w-3.5" />
                                        <span>Analíticas</span>
                                    </button>
                                </div>

                                {/* Tab 1: Students Section */}
                                {groupViewMode === "students" && (
                                    <CardContent className="p-4 sm:p-5 space-y-3.5">
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                            <div>
                                                <h4 className="text-sm font-bold text-foreground">
                                                    Aprendices Matriculados ({filteredStudents.length})
                                                </h4>
                                                <p className="text-[11px] text-muted-foreground font-medium">
                                                    Haz clic sobre cualquier aprendiz para inspeccionar su expediente integral.
                                                </p>
                                            </div>

                                            <div className="relative w-full sm:w-60">
                                                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                                <Input
                                                    placeholder="Filtrar por nombre o documento..."
                                                    value={studentSearchQuery}
                                                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                                                    className="pl-8 h-8 text-xs rounded-xl"
                                                />
                                            </div>
                                        </div>

                                        {filteredStudents.length === 0 ? (
                                            <div className="p-8 text-center bg-muted/10 rounded-2xl border border-dashed border-border/70">
                                                <GraduationCap className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                                                <p className="text-xs font-bold text-foreground">Sin aprendices para mostrar</p>
                                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                                    {studentSearchQuery ? "Ningún aprendiz coincide con el filtro de búsqueda." : "No hay aprendices registrados en esta ficha."}
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto rounded-xl border border-border/60">
                                                <Table>
                                                    <TableHeader className="bg-muted/40">
                                                        <TableRow>
                                                            <TableHead className="w-[45px] text-center font-bold text-xs">#</TableHead>
                                                            <TableHead className="font-bold text-xs">Documento</TableHead>
                                                            <TableHead className="font-bold text-xs">Aprendiz</TableHead>
                                                            <TableHead className="font-bold text-xs">Contacto</TableHead>
                                                            <TableHead className="font-bold text-xs text-center">Novedad</TableHead>
                                                            <TableHead className="text-right font-bold text-xs w-[130px]">Expediente</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {filteredStudents.map((student: any, index: number) => {
                                                            const profile = student.profile;
                                                            const doc = profile?.identificacion || "N/A";
                                                            const fullName = student.name || `${profile?.nombres || ""} ${profile?.apellido || ""}`.trim();
                                                            const phone = profile?.telefono;

                                                            return (
                                                                <TableRow 
                                                                    key={student.id} 
                                                                    className="hover:bg-muted/20 transition-colors cursor-pointer group"
                                                                    onClick={() => setSelectedStudent(student)}
                                                                >
                                                                    <TableCell className="text-center text-xs font-bold text-muted-foreground">
                                                                        {index + 1}
                                                                    </TableCell>
                                                                    <TableCell className="text-xs font-semibold text-foreground font-mono">
                                                                        {doc}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <div className="flex flex-col">
                                                                            <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                                                                                {formatName(fullName)}
                                                                            </span>
                                                                            <span className="text-[11px] text-muted-foreground font-mono">
                                                                                {student.email}
                                                                            </span>
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell className="text-xs text-muted-foreground">
                                                                        {phone ? phone : <span className="italic text-[11px]">Sin teléfono</span>}
                                                                    </TableCell>
                                                                    <TableCell className="text-center">
                                                                        <StudentNovedadBadge
                                                                            novedad={profile?.novedad}
                                                                            color={profile?.novedadColor}
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="ghost"
                                                                            onClick={() => setSelectedStudent(student)}
                                                                            className="h-7 gap-1.5 text-xs font-bold rounded-xl text-primary hover:bg-primary/10"
                                                                        >
                                                                            <Eye className="h-3.5 w-3.5" />
                                                                            <span>Ver Expediente</span>
                                                                        </Button>
                                                                    </TableCell>
                                                                </TableRow>
                                                            );
                                                        })}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        )}
                                    </CardContent>
                                )}

                                {/* Tab 2: Ficha Weekly Schedule Grid */}
                                {groupViewMode === "schedule" && (
                                    <CardContent className="p-4 sm:p-5 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                                                    <CalendarClock className="h-4 w-4 text-primary" />
                                                    Horario Semanal de la Ficha {activeGroup.name}
                                                </h4>
                                                <p className="text-[11px] text-muted-foreground">
                                                    Distribución de sesiones formativas programadas por día de la semana.
                                                </p>
                                            </div>
                                            <Badge variant="outline" className="text-xs font-bold">
                                                {activeGroupScheduleSlots.length} sesiones
                                            </Badge>
                                        </div>

                                        {activeGroupScheduleSlots.length === 0 ? (
                                            <div className="p-8 text-center bg-muted/10 rounded-2xl border border-dashed border-border/70">
                                                <Clock className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                                                <p className="text-xs font-bold text-foreground">Sin horarios programados</p>
                                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                                    Esta ficha no tiene franjas horarias registradas en la malla actual.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {DAYS_CONFIG.map(day => {
                                                    const daySlots = activeGroupScheduleSlots.filter(s => s.dayOfWeek === day.key);
                                                    return (
                                                        <div key={day.key} className="rounded-2xl border border-border/70 bg-card p-3 space-y-2">
                                                            <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
                                                                <span className="text-xs font-black text-foreground">
                                                                    {day.label}
                                                                </span>
                                                                <Badge variant="secondary" className="text-[9.5px] px-1.5 py-0 h-4 leading-none">
                                                                    {daySlots.length} {daySlots.length === 1 ? "clase" : "clases"}
                                                                </Badge>
                                                            </div>

                                                            {daySlots.length === 0 ? (
                                                                <p className="text-[11px] text-muted-foreground italic py-2 text-center">
                                                                    Sin clases programadas
                                                                </p>
                                                            ) : (
                                                                <div className="space-y-1.5">
                                                                    {daySlots.map(slot => (
                                                                        <div 
                                                                            key={slot.id} 
                                                                            className="p-2 rounded-xl bg-muted/30 border border-border/50 space-y-1"
                                                                        >
                                                                            <div className="flex items-center justify-between gap-1.5">
                                                                                <span className="text-xs font-bold text-foreground truncate">
                                                                                    {slot.title}
                                                                                </span>
                                                                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary shrink-0">
                                                                                    {slot.startTime} - {slot.endTime}
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex items-center justify-between text-[10.5px] text-muted-foreground gap-1">
                                                                                <span className="truncate flex items-center gap-1">
                                                                                    <UserCheck className="h-3 w-3 shrink-0" />
                                                                                    <span className="truncate">{formatName(slot.teacherName)}</span>
                                                                                </span>
                                                                                <span className="truncate flex items-center gap-1 text-[10px] shrink-0">
                                                                                    <Building2 className="h-3 w-3 shrink-0" />
                                                                                    <span className="truncate">{slot.environmentName}</span>
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </CardContent>
                                )}

                                {/* Tab 3: Courses Section */}
                                {groupViewMode === "courses" && (
                                    <CardContent className="p-4 sm:p-5 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                                                    <BookOpen className="h-4 w-4 text-primary" />
                                                    Materias Asignadas a la Ficha ({activeGroup.courses?.length || 0})
                                                </h4>
                                                <p className="text-[11px] text-muted-foreground">
                                                    Asignaturas y módulos formativos vinculados a este grupo.
                                                </p>
                                            </div>
                                        </div>

                                        {(!activeGroup.courses || activeGroup.courses.length === 0) ? (
                                            <div className="p-8 text-center bg-muted/10 rounded-2xl border border-dashed border-border/70">
                                                <BookOpen className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                                                <p className="text-xs font-bold text-foreground">Sin materias asignadas</p>
                                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                                    No se han configurado materias curriculares para esta ficha.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {activeGroup.courses.map((course: any) => (
                                                    <div key={course.id} className="p-3 rounded-2xl bg-muted/20 border border-border/60 space-y-2">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <span className="text-xs font-bold text-foreground line-clamp-1">
                                                                {course.title}
                                                            </span>
                                                            {course.weeklyHours && (
                                                                <Badge variant="outline" className="text-[10px] font-bold shrink-0 bg-background">
                                                                    {course.weeklyHours}h/sem
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                                            <UserCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                                                            <span className="truncate">
                                                                {course.teacher ? formatName(course.teacher.name || "Instructor") : "Sin instructor asignado"}
                                                            </span>
                                                        </div>

                                                        {course.schedules && course.schedules.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 pt-1 border-t border-border/40">
                                                                {course.schedules.map((sch: any) => {
                                                                    const dayName = ({
                                                                        MONDAY: "Lun",
                                                                        TUESDAY: "Mar",
                                                                        WEDNESDAY: "Mié",
                                                                        THURSDAY: "Jue",
                                                                        FRIDAY: "Vie",
                                                                        SATURDAY: "Sáb",
                                                                        SUNDAY: "Dom"
                                                                    } as Record<string, string>)[sch.dayOfWeek] || sch.dayOfWeek;

                                                                    return (
                                                                        <Badge
                                                                            key={sch.id}
                                                                            variant="outline"
                                                                            className="text-[9.5px] font-mono font-semibold bg-background/80 text-primary border-primary/20 gap-1 px-1.5 py-0"
                                                                        >
                                                                            <Clock className="h-2.5 w-2.5" />
                                                                            <span>{dayName} {sch.startTime}-{sch.endTime}</span>
                                                                        </Badge>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                )}

                                {/* Tab 4: Analytics Section */}
                                {groupViewMode === "analytics" && (
                                    <CardContent className="p-4 sm:p-5">
                                        <GroupAnalyticsView
                                            groupId={activeGroup.id}
                                            groupName={activeGroup.name}
                                            onSelectStudent={(st) => {
                                                const fullStudent = activeGroup.students?.find((s: any) => s.id === st.id) || st;
                                                setSelectedStudent(fullStudent);
                                            }}
                                        />
                                    </CardContent>
                                )}
                            </Card>
                        </>
                    ) : (
                        <div className="p-12 text-center bg-card rounded-2xl border border-dashed border-border/70 flex flex-col items-center justify-center min-h-[350px]">
                            <Layers className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                            <h4 className="font-bold text-foreground text-sm">
                                {filteredGroups.length === 0
                                    ? "No hay fichas disponibles con los filtros actuales"
                                    : "Selecciona una ficha"}
                            </h4>
                            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 leading-relaxed">
                                {filteredGroups.length === 0
                                    ? "Ajusta la línea de tiempo o la etapa formativa para ver las fichas correspondientes."
                                    : "Haz clic en alguna de las fichas del listado para inspeccionar sus aprendices, horario y expediente integral."}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
