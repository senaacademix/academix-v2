"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
    ShieldAlert, 
    CheckCircle2, 
    Clock, 
    FileSpreadsheet, 
    Users,
    BarChart3,
    Eye,
    FileText,
    Loader2
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
}

export function ProgramGroupsTab({ program }: ProgramGroupsTabProps) {
    const groups = useMemo(() => program.groups || [], [program.groups]);

    const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
    const [groupSearchQuery, setGroupSearchQuery] = useState<string>("");
    const [selectedGroupId, setSelectedGroupId] = useState<string>(groups.length > 0 ? groups[0].id : "");
    const [studentSearchQuery, setStudentSearchQuery] = useState<string>("");
    const [groupViewMode, setGroupViewMode] = useState<"students" | "analytics">("students");
    const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

    // Filter groups by category and search
    const filteredGroups = useMemo(() => {
        return groups.filter((g: any) => {
            const matchesCategory = selectedCategory === "ALL" || (g.categoria || "LECTIVA") === selectedCategory;
            const matchesSearch = !groupSearchQuery.trim() || 
                g.name.toLowerCase().includes(groupSearchQuery.toLowerCase()) ||
                (g.description && g.description.toLowerCase().includes(groupSearchQuery.toLowerCase()));
            return matchesCategory && matchesSearch;
        });
    }, [groups, selectedCategory, groupSearchQuery]);

    // Active selected group
    const activeGroup = useMemo(() => {
        return groups.find((g: any) => g.id === selectedGroupId) || (filteredGroups.length > 0 ? filteredGroups[0] : null);
    }, [groups, selectedGroupId, filteredGroups]);

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

    const categoryBadges: Record<string, { label: string; bg: string }> = {
        LECTIVA: { label: "Etapa Lectiva", bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
        PRODUCTIVA: { label: "Etapa Productiva", bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
        EGRESADOS: { label: "Egresados", bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" }
    };

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
        toast.info("Generando PDF de la ficha con @react-pdf/renderer...");
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
        toast.info("Generando Excel de la ficha con ExcelJS...");
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

    return (
        <div className="space-y-6">
            {/* Header filter controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border/80 shadow-xs">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                    {[
                        { key: "ALL", label: "Todas las Fichas", count: groups.length },
                        { key: "LECTIVA", label: "Etapa Lectiva", count: groups.filter((g: any) => (g.categoria || "LECTIVA") === "LECTIVA").length },
                        { key: "PRODUCTIVA", label: "Etapa Productiva", count: groups.filter((g: any) => g.categoria === "PRODUCTIVA").length },
                        { key: "EGRESADOS", label: "Egresados", count: groups.filter((g: any) => g.categoria === "EGRESADOS").length },
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setSelectedCategory(tab.key)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                                selectedCategory === tab.key
                                    ? "bg-primary text-primary-foreground shadow-xs"
                                    : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
                            }`}
                        >
                            <span>{tab.label}</span>
                            <Badge variant="secondary" className="px-1.5 py-0 text-[10px] h-4 leading-none">
                                {tab.count}
                            </Badge>
                        </button>
                    ))}
                </div>

                <div className="relative w-full sm:w-72 shrink-0">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar ficha por código o nombre..."
                        value={groupSearchQuery}
                        onChange={(e) => setGroupSearchQuery(e.target.value)}
                        className="pl-9 h-9 text-xs rounded-xl"
                    />
                </div>
            </div>

            {/* Split layout: Group list and Group detail */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Groups selection list */}
                <div className="lg:col-span-4 space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            Fichas de Formación ({filteredGroups.length})
                        </span>
                    </div>

                    {filteredGroups.length === 0 ? (
                        <div className="p-8 text-center bg-card rounded-2xl border border-dashed border-border/70">
                            <Layers className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                            <p className="text-xs font-bold text-foreground">No se encontraron fichas</p>
                            <p className="text-[11px] text-muted-foreground mt-1">
                                Intenta cambiar la categoría o el término de búsqueda.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
                            {filteredGroups.map((g: any) => {
                                const isSelected = activeGroup?.id === g.id;
                                const badgeInfo = categoryBadges[g.categoria || "LECTIVA"] || categoryBadges.LECTIVA;
                                const studentCount = g.students?.length || 0;

                                return (
                                    <div
                                        key={g.id}
                                        onClick={() => {
                                            setSelectedGroupId(g.id);
                                            setStudentSearchQuery("");
                                        }}
                                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-left ${
                                            isSelected
                                                ? "bg-primary/5 border-primary/40 shadow-xs ring-1 ring-primary/20"
                                                : "bg-card border-border/70 hover:border-border hover:bg-muted/30"
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="space-y-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-black text-foreground truncate">
                                                        {g.name}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-muted-foreground line-clamp-1">
                                                    {g.description || "Sin descripción de ficha"}
                                                </p>
                                            </div>
                                            <Badge className={`text-[10px] font-bold shrink-0 border ${badgeInfo.bg}`}>
                                                {badgeInfo.label}
                                            </Badge>
                                        </div>

                                        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border/50 text-[11px] text-muted-foreground font-medium">
                                            <span className="flex items-center gap-1.5">
                                                <Users className="h-3.5 w-3.5 text-primary" />
                                                <strong>{studentCount}</strong> aprendices
                                            </span>
                                            {g.environment && (
                                                <span className="flex items-center gap-1 text-[10px] truncate max-w-[140px]">
                                                    <Building2 className="h-3 w-3 shrink-0" />
                                                    <span className="truncate">{g.environment.name}</span>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Selected group detail view */}
                <div className="lg:col-span-8 space-y-6">
                    {activeGroup ? (
                        <>
                            {/* Group Card Header */}
                            <Card className="border border-border/80 bg-card shadow-xs rounded-3xl overflow-hidden">
                                <div className="p-5 sm:p-6 border-b border-border/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="text-xl font-extrabold text-foreground tracking-tight">
                                                Ficha {activeGroup.name}
                                            </h3>
                                            <Badge className={`text-xs font-bold border ${categoryBadges[activeGroup.categoria || "LECTIVA"]?.bg}`}>
                                                {categoryBadges[activeGroup.categoria || "LECTIVA"]?.label}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground font-medium">
                                            {activeGroup.description || "Ficha del área de formación institucional."}
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <div className="flex p-1 rounded-2xl bg-muted/50 border border-border/60">
                                            <button
                                                type="button"
                                                onClick={() => setGroupViewMode("students")}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                                    groupViewMode === "students"
                                                        ? "bg-background text-foreground shadow-xs"
                                                        : "text-muted-foreground hover:text-foreground"
                                                }`}
                                            >
                                                <Users className="h-3.5 w-3.5" />
                                                <span>Aprendices ({activeGroup.students?.length || 0})</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setGroupViewMode("analytics")}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                                    groupViewMode === "analytics"
                                                        ? "bg-primary text-primary-foreground shadow-xs"
                                                        : "text-muted-foreground hover:text-foreground"
                                                }`}
                                            >
                                                <BarChart3 className="h-3.5 w-3.5" />
                                                <span>Analíticas del Grupo</span>
                                            </button>
                                        </div>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleExportPdf}
                                            disabled={isExportingPdf}
                                            className="h-8 gap-1.5 rounded-xl text-xs font-bold border-red-500/30 text-red-700 dark:text-red-300 bg-red-500/10 hover:bg-red-500/20 shadow-xs shrink-0"
                                            title="Exportar ficha en PDF (@react-pdf/renderer)"
                                        >
                                            {isExportingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />}
                                            <span>Exportar PDF</span>
                                        </Button>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleExportExcel}
                                            disabled={isExportingExcel}
                                            className="h-8 gap-1.5 rounded-xl text-xs font-bold border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 shadow-xs shrink-0"
                                            title="Exportar ficha en Excel estilizado (ExcelJS)"
                                        >
                                            {isExportingExcel ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />}
                                            <span>Exportar Excel</span>
                                        </Button>
                                    </div>
                                </div>

                                <div className="p-4 bg-muted/20 border-b border-border/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                    <div>
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Ambiente Asignado</span>
                                        <p className="font-semibold text-foreground mt-0.5 flex items-center gap-1.5">
                                            <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
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
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Aprendices</span>
                                        <p className="font-bold text-primary mt-0.5">
                                            {activeGroup.students?.length || 0} matriculados
                                        </p>
                                    </div>
                                </div>

                                {groupViewMode === "analytics" ? (
                                    <CardContent className="p-5">
                                        <GroupAnalyticsView
                                            groupId={activeGroup.id}
                                            groupName={activeGroup.name}
                                            onSelectStudent={(st) => {
                                                const fullStudent = activeGroup.students?.find((s: any) => s.id === st.id) || st;
                                                setSelectedStudent(fullStudent);
                                            }}
                                        />
                                    </CardContent>
                                ) : (
                                    /* Students Section */
                                    <CardContent className="p-5 space-y-4">
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                            <div>
                                                <h4 className="text-sm font-bold text-foreground">
                                                    Listado de Aprendices Matriculados ({filteredStudents.length})
                                                </h4>
                                                <p className="text-[11px] text-muted-foreground font-medium">
                                                    Haz clic sobre cualquier aprendiz para inspeccionar su expediente integral completo.
                                                </p>
                                            </div>

                                            <div className="relative w-full sm:w-64">
                                                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                                <Input
                                                    placeholder="Filtrar por nombre o documento..."
                                                    value={studentSearchQuery}
                                                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                                                    className="pl-9 h-8 text-xs rounded-xl"
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
                                            <div className="overflow-x-auto rounded-2xl border border-border/60">
                                                <Table>
                                                    <TableHeader className="bg-muted/40">
                                                        <TableRow>
                                                            <TableHead className="w-[50px] text-center font-bold text-xs">#</TableHead>
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
                                                                    onClick={() => {
                                                                        setSelectedStudent(student);
                                                                    }}
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
                                                                            onClick={() => {
                                                                                setSelectedStudent(student);
                                                                            }}
                                                                            className="h-8 gap-1.5 text-xs font-bold rounded-xl text-primary hover:bg-primary/10"
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
                            </Card>

                            {/* Group Associated Courses & Schedule */}
                            {activeGroup.courses && activeGroup.courses.length > 0 && (
                                <Card className="border border-border/80 bg-card shadow-xs rounded-3xl overflow-hidden">
                                    <CardHeader className="p-5 border-b border-border/70">
                                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                                            <BookOpen className="h-4 w-4 text-primary" />
                                            Materias y Horarios Cursados por la Ficha ({activeGroup.courses.length})
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            Asignaturas asignadas a este grupo con sus respectivos instructores y cargas horarias.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-5">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {activeGroup.courses.map((course: any) => (
                                                <div key={course.id} className="p-3 rounded-2xl bg-muted/30 border border-border/60 space-y-2">
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
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </>
                    ) : (
                        <div className="p-12 text-center bg-card rounded-3xl border border-dashed border-border/70">
                            <Layers className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                            <h4 className="font-bold text-foreground text-sm">Selecciona una ficha</h4>
                            <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-1">
                                Haz clic en alguna de las fichas de la lista para inspeccionar sus aprendices y detalles académicos.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
