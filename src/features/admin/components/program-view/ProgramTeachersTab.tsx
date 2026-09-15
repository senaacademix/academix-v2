"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
    UserCheck, 
    Search, 
    Mail, 
    Phone, 
    BookOpen, 
    Layers, 
    Award, 
    Clock, 
    Calendar,
    FileText,
    FileSpreadsheet,
    Users,
    Loader2
} from "lucide-react";
import { formatName } from "@/lib/utils";
import { toast } from "sonner";
import { exportProgramTeachersPdf, exportProgramTeachersExcel } from "../../utils/programExportUtils";

interface ProgramTeachersTabProps {
    program: any;
}

export function ProgramTeachersTab({ program }: ProgramTeachersTabProps) {
    const teachers = useMemo(() => program.teachers || [], [program.teachers]);
    const groups = useMemo(() => program.groups || [], [program.groups]);
    const periods = useMemo(() => program.periods || [], [program.periods]);

    const [searchQuery, setSearchQuery] = useState("");
    const [isExportingPdf, setIsExportingPdf] = useState(false);
    const [isExportingExcel, setIsExportingExcel] = useState(false);

    const handleExportPdf = async () => {
        setIsExportingPdf(true);
        toast.info("Generando PDF del equipo de instructores con @react-pdf/renderer...");
        try {
            await exportProgramTeachersPdf(program);
            toast.success("PDF del equipo de instructores descargado exitosamente");
        } catch (e) {
            console.error(e);
            toast.error("Error al exportar el equipo de instructores en PDF");
        } finally {
            setIsExportingPdf(false);
        }
    };

    const handleExportExcel = async () => {
        setIsExportingExcel(true);
        toast.info("Generando Excel del equipo de instructores con ExcelJS...");
        try {
            await exportProgramTeachersExcel(program);
            toast.success("Excel del equipo de instructores descargado exitosamente");
        } catch (e) {
            console.error(e);
            toast.error("Error al exportar el equipo de instructores en Excel");
        } finally {
            setIsExportingExcel(false);
        }
    };

    // Calculate teacher assignments within this program
    const teachersWithAssignments = useMemo(() => {
        return teachers.map((teacher: any) => {
            // Find all group courses where this teacher is assigned
            const assignedGroupCourses: any[] = [];
            groups.forEach((g: any) => {
                (g.courses || []).forEach((c: any) => {
                    if (c.teacherId === teacher.id || c.teacher?.id === teacher.id) {
                        assignedGroupCourses.push({
                            courseTitle: c.title,
                            groupName: g.name,
                            weeklyHours: c.weeklyHours || 0,
                            groupId: g.id
                        });
                    }
                });
            });

            // Calculate total hours taught in this program
            const totalProgramTeachingHours = assignedGroupCourses.reduce((sum, c) => sum + (c.weeklyHours || 0), 0);

            // Qualified courses for this teacher
            const qualifiedCourses = teacher.qualifiedCourses || [];

            return {
                ...teacher,
                assignedGroupCourses,
                totalProgramTeachingHours,
                qualifiedCourses
            };
        });
    }, [teachers, groups]);

    // Filter teachers by query
    const filteredTeachers = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return teachersWithAssignments;

        return teachersWithAssignments.filter((t: any) => {
            const name = (t.name || "").toLowerCase();
            const email = (t.email || "").toLowerCase();
            const doc = (t.profile?.identificacion || "").toLowerCase();
            return name.includes(query) || email.includes(query) || doc.includes(query);
        });
    }, [teachersWithAssignments, searchQuery]);

    return (
        <div className="space-y-6">
            {/* Header search bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border/80 shadow-xs">
                <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs font-bold px-3 py-1 bg-primary/10 text-primary border-primary/20">
                        {teachers.length} {teachers.length === 1 ? "Instructor Vinculado" : "Instructores Vinculados"}
                    </Badge>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative w-full sm:w-60 shrink-0">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar instructor por nombre o correo..."
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
                        title="Exportar equipo de instructores en PDF (@react-pdf/renderer)"
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
                        title="Exportar equipo de instructores en Excel estilizado (ExcelJS)"
                    >
                        {isExportingExcel ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />}
                        <span>Exportar Excel</span>
                    </Button>
                </div>
            </div>

            {/* Teachers Grid */}
            {filteredTeachers.length === 0 ? (
                <div className="p-12 text-center bg-card rounded-3xl border border-dashed border-border/70">
                    <UserCheck className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                    <h4 className="font-bold text-foreground text-sm">No se encontraron instructores</h4>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-1">
                        {searchQuery ? "Ningún instructor coincide con la búsqueda." : "No hay instructores vinculados a este programa de formación."}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredTeachers.map((teacher: any) => {
                        const profile = teacher.profile;
                        const doc = profile?.identificacion;
                        const phone = profile?.telefono;
                        const initials = (teacher.name || "D")
                            .split(" ")
                            .filter(Boolean)
                            .map((w: string) => w[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase();

                        return (
                            <Card key={teacher.id} className="border border-border/80 bg-card shadow-xs rounded-3xl overflow-hidden flex flex-col justify-between">
                                <CardHeader className="p-5 border-b border-border/60">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="h-11 w-11 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center font-black text-sm shrink-0">
                                                {initials}
                                            </div>
                                            <div className="space-y-0.5 min-w-0">
                                                <h4 className="text-sm font-extrabold text-foreground truncate">
                                                    {formatName(teacher.name || "Instructor")}
                                                </h4>
                                                <p className="text-xs text-muted-foreground truncate font-mono">
                                                    {teacher.email}
                                                </p>
                                                {doc && (
                                                    <p className="text-[10px] text-muted-foreground">
                                                        CC: <strong className="text-foreground">{doc}</strong>
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {teacher.totalProgramTeachingHours > 0 && (
                                            <Badge variant="outline" className="text-[11px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 shrink-0">
                                                {teacher.totalProgramTeachingHours}h asignadas
                                            </Badge>
                                        )}
                                    </div>
                                </CardHeader>

                                <CardContent className="p-5 space-y-4 flex-1">
                                    {/* Groups and Courses Taught */}
                                    <div>
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                                            Carga Académica en este Programa ({teacher.assignedGroupCourses.length})
                                        </span>
                                        {teacher.assignedGroupCourses.length > 0 ? (
                                            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                                {teacher.assignedGroupCourses.map((ac: any, idx: number) => (
                                                    <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-muted/30 border border-border/50 text-xs">
                                                        <div className="min-w-0 flex-1 pr-2">
                                                            <p className="font-semibold text-foreground truncate">{ac.courseTitle}</p>
                                                            <p className="text-[10px] text-muted-foreground truncate">Ficha: {ac.groupName}</p>
                                                        </div>
                                                        <Badge variant="secondary" className="text-[10px] font-bold shrink-0">
                                                            {ac.weeklyHours}h/sem
                                                        </Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-muted-foreground italic bg-muted/20 p-2.5 rounded-xl border border-dashed border-border/60 text-center">
                                                Sin fichas activas asignadas actualmente en este programa.
                                            </p>
                                        )}
                                    </div>

                                    {/* Qualified Courses list */}
                                    {teacher.qualifiedCourses && teacher.qualifiedCourses.length > 0 && (
                                        <div>
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                                                Competencias Habilitadas ({teacher.qualifiedCourses.length})
                                            </span>
                                            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                                                {teacher.qualifiedCourses.map((qc: any) => (
                                                    <Badge key={qc.id} variant="outline" className="text-[10px] font-medium bg-background border-border/70">
                                                        {qc.title}
                                                    </Badge>
                                                ))}
                                            </div>
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
