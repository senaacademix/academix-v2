"use client";

import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useState, useEffect, useMemo, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { BookOpen, CheckCircle2, AlertCircle, Lock, User, Calendar, GraduationCap, GitBranch, Layers, Check, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    getTeacherQualificationsAction,
    updateTeacherQualificationsAction,
    publishTeacherQualificationsAction,
    adminLockTeacherQualificationsAction,
    unlockTeacherQualificationsAction,
    assignTeacherTimelinesAction
} from "../actions/qualificationActions";
import { getScheduleCalendarYear } from "@/lib/dateUtils";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { authClient } from "@/lib/auth-client";

interface TeacherQualificationsViewProps {
    teacherId?: string;
    scheduleId?: string;
    isAdminMode?: boolean;
    programId?: string;
    onAdminActionComplete?: () => void;
}

const getAuthorRoleLabel = (
    user?: { id?: string | null; name?: string | null; role?: string | null } | null, 
    targetTeacherId?: string
): string => {
    if (!user) return "";
    if (user.id && targetTeacherId && user.id === targetTeacherId) {
        return "Instructor";
    }
    const r = (user.role || "").toLowerCase().trim();
    if (r === "gestor") return "Gestor";
    if (r === "admin" || r === "administrator") return "Administrador";
    if (r === "coordinador") return "Coordinador";
    if (r === "teacher" || r === "profesor" || r === "docente") return "Instructor";
    return "Gestor";
};

const getScheduleYear = (s: { name?: string; startDate?: string | Date | null }): string => {
    return getScheduleCalendarYear(s);
};

export function TeacherQualificationsView({ teacherId, scheduleId, isAdminMode = false, programId, onAdminActionComplete }: TeacherQualificationsViewProps) {
    const { data: session } = authClient.useSession();
    const [locked, setLocked] = useState(false);
    const [qualPrograms, setQualPrograms] = useState<any[]>([]);
    const [selectedProgramId, setSelectedProgramId] = useState<string>(programId || "");
    const [selectedQualCourses, setSelectedQualCourses] = useState<string[]>([]);
    const [assignedTimelineIds, setAssignedTimelineIds] = useState<string[]>([]);
    const [selectedTimelineFilter, setSelectedTimelineFilter] = useState<string>("ALL");
    const [qualificationsCreatedBy, setQualificationsCreatedBy] = useState<Record<string, { id: string; name: string | null; role: string }>>({});
    const [schedules, setSchedules] = useState<{ id: string; name: string; isActive: boolean; startDate?: string | Date; endDate?: string | Date }[]>([]);
    const [selectedScheduleId, setSelectedScheduleId] = useState<string>(scheduleId || "");
    const currentYearStr = new Date().getFullYear().toString();
    const [selectedYear, setSelectedYear] = useState<string>(currentYearStr);

    const availableYears = useMemo(() => {
        const yearsSet = new Set<string>();
        const currentYear = new Date().getFullYear().toString();
        yearsSet.add(currentYear);
        schedules.forEach(s => {
            yearsSet.add(getScheduleYear(s));
        });
        return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
    }, [schedules]);

    const filteredSchedules = useMemo(() => {
        if (selectedYear === "ALL") return schedules;
        return schedules.filter(s => getScheduleYear(s) === selectedYear);
    }, [schedules, selectedYear]);

    const handleYearChange = (year: string) => {
        setSelectedYear(year);
        const filtered = year === "ALL" ? schedules : schedules.filter(s => getScheduleYear(s) === year);
        if (filtered.length > 0) {
            const active = filtered.find(s => s.isActive)?.id || filtered[0].id;
            setSelectedScheduleId(active);
            loadQualifications(active);
        }
    };
    const [loading, setLoading] = useState(true);
    const [loadedTeacherName, setLoadedTeacherName] = useState<string>("");
    const [isPending, startTransition] = useTransition();
    const [publishDialogOpen, setPublishDialogOpen] = useState(false);
    const [lastModifiedBy, setLastModifiedBy] = useState<{ id?: string; name: string; role?: string } | null>(null);
    const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

    const targetTeacherId = isAdminMode ? teacherId : session?.user?.id;

    useEffect(() => {
        if (scheduleId) {
            setSelectedScheduleId(scheduleId);
        }
    }, [scheduleId]);

    useEffect(() => {
        if (targetTeacherId) {
            loadQualifications(selectedScheduleId);
        }
    }, [targetTeacherId, selectedScheduleId, programId]);

    const loadQualifications = async (schedId?: string) => {
        if (!targetTeacherId) return;
        setLoading(true);
        const targetSched = schedId !== undefined ? schedId : selectedScheduleId;
        try {
            const data = await getTeacherQualificationsAction(targetTeacherId, targetSched, programId);
            if (data) {
                if ((data as any).teacherName) {
                    setLoadedTeacherName((data as any).teacherName);
                }
                const progs = (data as any).programs || [];
                setQualPrograms(progs);
                if (progs.length > 0) {
                    setSelectedProgramId(prev => (prev && progs.some((p: any) => p.id === prev)) ? prev : progs[0].id);
                }
                setSelectedQualCourses(((data as any).qualifiedCourses || []).map((c: any) => c.id));
                setAssignedTimelineIds((data as any).assignedTimelineIds || []);
                setQualificationsCreatedBy((data as any).qualificationsCreatedBy || {});
                setLocked((data as any).locked || false);
                if ((data as any).schedules) {
                    const list = (data as any).schedules;
                    setSchedules(list);
                    if ((!selectedScheduleId || selectedScheduleId === "all") && list.length > 0) {
                        const currentYear = new Date().getFullYear().toString();
                        const yearSchedules = list.filter((s: any) => getScheduleYear(s) === currentYear);
                        const candidateList = yearSchedules.length > 0 ? yearSchedules : list;
                        const active = candidateList.find((s: any) => s.isActive)?.id || candidateList[0].id;
                        setSelectedScheduleId(active);
                        if (yearSchedules.length === 0 && candidateList.length > 0) {
                            setSelectedYear(getScheduleYear(candidateList[0]));
                        }
                    }
                }
                setLastModifiedBy((data as any).lastModifiedBy || null);
                setUpdatedAt((data as any).updatedAt ? new Date((data as any).updatedAt) : null);
            }
        } catch (e: any) {
            toast.error(e.message || "Error al cargar asignaturas");
        } finally {
            setLoading(false);
        }
    };

    const handleToggleTimelineAssignment = (progId: string, tlId: string) => {
        if (!targetTeacherId) return;
        if (locked) {
            toast.error("Las materias están bloqueadas para este horario. Desbloquea para modificar las líneas de tiempo asignadas.");
            return;
        }
        const prog = qualPrograms.find(p => p.id === progId);
        const progTlIds = (prog?.timelines || []).map((t: any) => t.id);
        const isCurrentlyAssigned = assignedTimelineIds.includes(tlId);
        
        const newAssignedInProg = isCurrentlyAssigned
            ? assignedTimelineIds.filter(id => id !== tlId && progTlIds.includes(id))
            : [...assignedTimelineIds.filter(id => progTlIds.includes(id)), tlId];

        const prevAssigned = [...assignedTimelineIds];
        const nextAssigned = isCurrentlyAssigned
            ? assignedTimelineIds.filter(id => id !== tlId)
            : [...assignedTimelineIds, tlId];

        setAssignedTimelineIds(nextAssigned);

        startTransition(async () => {
            try {
                await assignTeacherTimelinesAction(targetTeacherId, progId, newAssignedInProg);
                toast.success(isCurrentlyAssigned ? "Línea de formación desasignada" : "Línea de formación asignada al instructor");
            } catch (e: any) {
                setAssignedTimelineIds(prevAssigned);
                toast.error(e.message || "Error al actualizar asignación de línea de tiempo");
            }
        });
    };

    const handleAssignAllTimelines = (progId: string, assignAll: boolean) => {
        if (!targetTeacherId) return;
        if (locked) {
            toast.error("Las materias están bloqueadas para este horario. Desbloquea para modificar las líneas de tiempo asignadas.");
            return;
        }
        const prog = qualPrograms.find(p => p.id === progId);
        if (!prog) return;
        const progTlIds = (prog.timelines || []).map((t: any) => t.id);

        const newAssignedInProg = assignAll ? progTlIds : [];
        const otherProgTlIds = assignedTimelineIds.filter(id => !progTlIds.includes(id));
        const prevAssigned = [...assignedTimelineIds];
        const nextAssigned = [...otherProgTlIds, ...newAssignedInProg];

        setAssignedTimelineIds(nextAssigned);

        startTransition(async () => {
            try {
                await assignTeacherTimelinesAction(targetTeacherId, progId, newAssignedInProg);
                toast.success(assignAll ? "Todas las líneas de formación fueron asignadas" : "Líneas de formación desasignadas");
            } catch (e: any) {
                setAssignedTimelineIds(prevAssigned);
                toast.error(e.message || "Error al actualizar asignación de líneas de formación");
            }
        });
    };

    const handleSaveChanges = () => {
        if (!targetTeacherId) return;
        if (locked) {
            toast.error("Las materias están bloqueadas para este horario. Desbloquea para poder realizar cambios.");
            return;
        }
        startTransition(async () => {
            try {
                await updateTeacherQualificationsAction(targetTeacherId, selectedQualCourses, selectedScheduleId);
                toast.success("Borrador de materias guardado exitosamente");
                await loadQualifications(selectedScheduleId);
            } catch (e: any) {
                toast.error(e.message || "Error al guardar los cambios");
            }
        });
    };

    const handlePublish = () => {
        if (!targetTeacherId) return;
        startTransition(async () => {
            try {
                await updateTeacherQualificationsAction(targetTeacherId, selectedQualCourses, selectedScheduleId);
                await publishTeacherQualificationsAction(targetTeacherId, selectedScheduleId);
                toast.success("Materias publicadas y bloqueadas con éxito");
                setPublishDialogOpen(false);
                await loadQualifications(selectedScheduleId);
            } catch (e: any) {
                toast.error(e.message || "Error al publicar las materias");
            }
        });
    };

    const handleAdminLock = () => {
        if (!targetTeacherId) return;
        startTransition(async () => {
            try {
                await adminLockTeacherQualificationsAction(targetTeacherId, selectedScheduleId);
                toast.success("Materias aprobadas y bloqueadas con éxito");
                await loadQualifications(selectedScheduleId);
                if (onAdminActionComplete) onAdminActionComplete();
            } catch (e: any) {
                toast.error(e.message || "Error al bloquear materias");
            }
        });
    };

    const handleAdminUnlock = () => {
        if (!targetTeacherId) return;
        startTransition(async () => {
            try {
                await unlockTeacherQualificationsAction(targetTeacherId, selectedScheduleId);
                toast.success("Materias desbloqueadas con éxito");
                await loadQualifications(selectedScheduleId);
                if (onAdminActionComplete) onAdminActionComplete();
            } catch (e: any) {
                toast.error(e.message || "Error al desbloquear materias");
            }
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <LoadingSpinner />
            </div>
        );
    }

    const effectiveProgramId = (programId && programId !== "all" && programId !== "ALL") 
        ? programId 
        : (selectedProgramId || (qualPrograms.length > 0 ? qualPrograms[0].id : ""));

    const filteredQualPrograms = (effectiveProgramId && effectiveProgramId !== "all" && effectiveProgramId !== "ALL") 
        ? qualPrograms.filter(p => p.id === effectiveProgramId) 
        : (qualPrograms.length > 0 ? [qualPrograms[0]] : []);

    // Calculate global stats (filtered to normal periods and master courses belonging to assigned timelines)
    const allCourses = filteredQualPrograms.flatMap(p => {
        const progTimelines = p.timelines || [];
        const normalPeriods = (p.periods || []).filter((per: any) => !per.esEspecial);
        
        if (progTimelines.length === 0) {
            return normalPeriods.flatMap((per: any) => (per.courses || []).filter((c: any) => !c.groupId));
        }

        const assignedIds = progTimelines
            .map((t: any) => t.id)
            .filter((id: string) => assignedTimelineIds.includes(id));

        return normalPeriods
            .filter((per: any) => {
                if (per.timelineId) {
                    return assignedIds.includes(per.timelineId);
                }
                const defaultTl = progTimelines.find((t: any) => t.isDefault);
                return defaultTl ? assignedIds.includes(defaultTl.id) : false;
            })
            .flatMap((per: any) => (per.courses || []).filter((c: any) => !c.groupId));
    });
    const totalCoursesCount = allCourses.length;
    const selectedCoursesCount = allCourses.filter((c: any) => selectedQualCourses.includes(c.id)).length;
    const globalPercentage = totalCoursesCount > 0 ? Math.round((selectedCoursesCount / totalCoursesCount) * 100) : 0;

    return (
        <div className="space-y-6">
            {/* Academic Schedule & Area Scope Selector */}
            {(!isAdminMode || qualPrograms.length > 1) && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-card/80 backdrop-blur-md border border-border/80 rounded-2xl shadow-2xs">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
                            <BookOpen className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Materias Habilitadas por Horario / Trimestre</p>
                                {qualPrograms.length === 1 && (
                                    <Badge variant="outline" className="text-[10px] font-extrabold bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400 py-0 px-2 h-4.5 shrink-0">
                                        {qualPrograms[0].name}
                                    </Badge>
                                )}
                            </div>
                            <p className="text-xs text-foreground font-medium truncate">Selecciona el horario institucional para consultar y configurar las materias específicas del instructor.</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto shrink-0">
                        {/* Selector de Programa de Formación (si el instructor tiene más de 1 programa asignado) */}
                        {qualPrograms.length > 1 && (
                            <Select value={effectiveProgramId} onValueChange={(val) => { setSelectedProgramId(val); }}>
                                <SelectTrigger className="w-full sm:w-[180px] h-8.5 text-xs font-bold bg-background border-border/80 rounded-xl shrink-0">
                                    <GraduationCap className="w-3.5 h-3.5 text-primary mr-1 shrink-0" />
                                    <SelectValue placeholder="Programa..." />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl text-xs">
                                    {qualPrograms.map((p) => (
                                        <SelectItem key={p.id} value={p.id} className="text-xs font-bold">
                                            {p.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        {/* Filtro por Año (por defecto año actual) */}
                        <Select value={selectedYear} onValueChange={handleYearChange}>
                            <SelectTrigger className="w-[145px] h-8.5 text-xs font-bold bg-background border-border/80 rounded-xl shrink-0 px-2.5 gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-primary mr-1 shrink-0" />
                                <SelectValue placeholder="Año" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl text-xs">
                                <SelectItem value="ALL" className="text-xs font-bold">
                                    Todos los años
                                </SelectItem>
                                {availableYears.map((yr) => (
                                    <SelectItem key={yr} value={yr} className="text-xs font-bold">
                                        Año {yr}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Selector de Horario */}
                        <Select value={selectedScheduleId} onValueChange={(val) => { setSelectedScheduleId(val); loadQualifications(val); }}>
                            <SelectTrigger className="w-full sm:w-[250px] h-8.5 text-xs font-bold bg-background border-border/80 rounded-xl shrink-0">
                                <SelectValue placeholder="Seleccionar Horario..." />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl text-xs">
                                {filteredSchedules.length === 0 ? (
                                    <div className="px-3 py-2 text-xs text-muted-foreground italic">
                                        Sin horarios para {selectedYear}
                                    </div>
                                ) : (
                                    filteredSchedules.map((s) => (
                                        <SelectItem key={s.id} value={s.id} className="text-xs font-bold">
                                            {s.isActive ? "🟢" : "⚪"} {s.name} {s.isActive ? "(VIGENTE)" : ""}
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )}

            {/* Status alerts */}
            {(() => {
                const activeScheduleName = schedules.find(s => s.id === selectedScheduleId)?.name;
                return locked ? (
                    <div className="flex items-start gap-3 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">
                        <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="font-semibold text-sm flex items-center gap-1.5 flex-wrap">
                                <span>Materias Publicadas y Bloqueadas</span>
                                {activeScheduleName && (
                                    <span className="font-mono text-[11px] font-bold text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30">
                                        Horario: {activeScheduleName}
                                    </span>
                                )}
                            </p>
                            <p className="text-xs opacity-90 mt-0.5">
                                {isAdminMode 
                                    ? (lastModifiedBy && getAuthorRoleLabel(lastModifiedBy, targetTeacherId) !== "Instructor"
                                        ? `Las materias fueron guardadas y bloqueadas por el ${getAuthorRoleLabel(lastModifiedBy, targetTeacherId).toLowerCase()} para este horario. Desbloquea para permitir o realizar cambios.`
                                        : "El instructor ha publicado sus materias para este horario y no puede editarlas.")
                                    : "Las materias que dictas están registradas y bloqueadas para este horario institucional. Si necesitas realizar alguna modificación, por favor ponte en contacto con el administrador de la institución para que proceda a desbloquear tu perfil."}
                            </p>
                            {lastModifiedBy && (
                                <p className="text-[11px] mt-2 font-medium bg-emerald-600/10 border border-emerald-600/20 px-2 py-1 rounded-md inline-block">
                                    Última modificación: <span className="font-bold">{lastModifiedBy.name}</span> ({getAuthorRoleLabel(lastModifiedBy, targetTeacherId)}) 
                                    {updatedAt && ` - ${updatedAt.toLocaleDateString()} ${updatedAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
                                </p>
                            )}
                        </div>
                        {isAdminMode && (
                            <Button 
                                size="sm" 
                                onClick={handleAdminUnlock} 
                                disabled={isPending}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 cursor-pointer"
                            >
                                Desbloquear
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full p-4 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-800 dark:text-amber-300">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold text-sm flex items-center gap-1.5 flex-wrap">
                                    <span>Materias en Modo Borrador</span>
                                    {activeScheduleName && (
                                        <span className="font-mono text-[11px] font-bold text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30">
                                            Horario: {activeScheduleName}
                                        </span>
                                    )}
                                </p>
                                <p className="text-xs opacity-90 mt-0.5 leading-relaxed">
                                    {isAdminMode
                                        ? (lastModifiedBy && getAuthorRoleLabel(lastModifiedBy, targetTeacherId) !== "Instructor"
                                            ? `Las materias fueron editadas por el ${getAuthorRoleLabel(lastModifiedBy, targetTeacherId).toLowerCase()} y permanecen en modo borrador para este horario.`
                                            : "El instructor aún puede editar sus materias para este horario.")
                                        : "Puedes configurar qué materias de tu programa estás en capacidad de dictar para este horario. Recuerda hacer clic en **Publicar** para enviarla de forma oficial; esto bloqueará tus cambios para edición."}
                                </p>
                                {lastModifiedBy && (
                                    <p className="text-[11px] mt-2 font-medium bg-amber-600/10 border border-amber-600/20 px-2 py-1 rounded-md inline-block">
                                        Última modificación: <span className="font-bold">{lastModifiedBy.name}</span> ({getAuthorRoleLabel(lastModifiedBy, targetTeacherId)}) 
                                        {updatedAt && ` - ${updatedAt.toLocaleDateString()} ${updatedAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto justify-end pt-1 sm:pt-0">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={handleSaveChanges} 
                                disabled={isPending}
                                className="bg-background text-foreground hover:bg-muted font-bold text-xs"
                            >
                                {isPending ? "Guardando..." : "Guardar Cambios"}
                            </Button>
                            {isAdminMode ? (
                                <Button 
                                    size="sm" 
                                    onClick={handleAdminLock} 
                                    disabled={isPending}
                                    className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs"
                                >
                                    {isPending ? "Aprobando..." : "Aprobar y Bloquear"}
                                </Button>
                            ) : (
                                <AlertDialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
                                    <AlertDialogTrigger asChild>
                                        <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs">
                                            Publicar y Bloquear
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="max-w-[90vw] sm:max-w-lg rounded-2xl">
                                        <AlertDialogHeader>
                                            <AlertDialogTitle className="flex items-center gap-2">
                                                <Lock className="w-5 h-5 text-amber-600" />
                                                ¿Confirmas publicar tus materias?
                                            </AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Una vez publicadas, tus materias habilitadas quedarán **bloqueadas** y no podrás realizar más cambios. Solo un administrador podrá desbloquearlas.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction 
                                                onClick={handlePublish}
                                                className="bg-amber-600 hover:bg-amber-700 text-white"
                                            >
                                                Confirmar y Bloquear
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                        </div>
                    </div>
                );
            })()}

            {/* Qualifications Selection Card */}
            <Card className="border-none shadow-sm bg-background">
                <CardHeader className="bg-muted/10 pb-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <BookOpen className="h-5 w-5 text-primary" />
                                Asignaturas Disponibles en tus Programas
                            </CardTitle>
                            <CardDescription>
                                {isAdminMode 
                                    ? "Asigna las líneas de tiempo correspondientes y selecciona las materias que este instructor está en capacidad de ejecutar."
                                    : "Selecciona de la lista a continuación las materias que estás en capacidad de ejecutar en tus líneas asignadas."}
                            </CardDescription>
                        </div>
                        {totalCoursesCount > 0 && (
                            <div className="flex flex-col items-end gap-1.5 shrink-0 bg-background/50 backdrop-blur-sm p-3 rounded-xl border border-border/40 min-w-[220px]">
                                <div className="flex items-center justify-between w-full text-xs font-semibold">
                                    <span className="text-muted-foreground">Progreso de Selección:</span>
                                    <span className="text-primary font-bold">{selectedCoursesCount} de {totalCoursesCount} ({globalPercentage}%)</span>
                                </div>
                                <Progress value={globalPercentage} className="h-2 w-full bg-muted" />
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                    {filteredQualPrograms.length === 0 ? (
                        <div className="py-8 text-center text-sm text-muted-foreground italic border border-dashed rounded-lg">
                            No tienes programas de formación asociados en tu perfil (o no pertenecen al programa seleccionado).
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {filteredQualPrograms.map(program => {
                                const progTimelines = program.timelines || [];
                                const hasTimelines = progTimelines.length > 0;
                                const assignedInProg = progTimelines.filter((tl: any) => assignedTimelineIds.includes(tl.id));
                                const normalPeriods = (program.periods || []).filter((p: any) => !p.esEspecial);

                                return (
                                    <div key={program.id} className="space-y-5 p-4 sm:p-5 bg-muted/5 rounded-2xl border border-border/40">
                                        {/* Program Header */}
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/30 pb-3">
                                            <div>
                                                <h4 className="font-black text-sm text-primary uppercase tracking-wider">{program.name}</h4>
                                                <p className="text-[11px] text-muted-foreground">
                                                    {hasTimelines 
                                                        ? (isAdminMode 
                                                            ? `${progTimelines.length} líneas de formación registradas` 
                                                            : `${assignedInProg.length} ${assignedInProg.length === 1 ? "línea de formación asignada" : "líneas de formación asignadas"}`)
                                                        : `${normalPeriods.length} trimestres registrados`}
                                                </p>
                                            </div>
                                            {hasTimelines && (
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="text-xs font-bold bg-background">
                                                        {isAdminMode
                                                            ? `${assignedInProg.length} de ${progTimelines.length} líneas asignadas`
                                                            : `${assignedInProg.length} ${assignedInProg.length === 1 ? "línea asignada" : "líneas asignadas"}`}
                                                    </Badge>
                                                </div>
                                            )}
                                        </div>

                                        {/* Section: Timeline Assignment (Gestores can assign/unassign; Instructor only views assigned) */}
                                        {hasTimelines && (isAdminMode || assignedInProg.length > 0) && (
                                            <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-primary/15">
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                                                            <GitBranch className="w-4 h-4" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-xs font-black uppercase tracking-wider text-foreground">
                                                                    {isAdminMode ? "Líneas de Tiempo de Formación Asignadas" : "Líneas de Tiempo Asignadas"}
                                                                </span>
                                                                <Badge 
                                                                    variant={assignedInProg.length > 0 ? "default" : "destructive"} 
                                                                    className="text-[10px] font-extrabold h-4.5 px-2 py-0"
                                                                >
                                                                    {isAdminMode
                                                                        ? `${assignedInProg.length} de ${progTimelines.length} asignadas`
                                                                        : `${assignedInProg.length} ${assignedInProg.length === 1 ? "línea asignada" : "líneas asignadas"}`}
                                                                </Badge>
                                                            </div>
                                                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                                                {isAdminMode
                                                                    ? "Elige en cuáles líneas de tiempo gestiona materias este instructor."
                                                                    : "Líneas de tiempo asignadas a tu perfil por el gestor académico."}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {isAdminMode && progTimelines.length > 1 && (
                                                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                disabled={locked || isPending || assignedInProg.length === progTimelines.length}
                                                                onClick={() => handleAssignAllTimelines(program.id, true)}
                                                                className="h-7 text-[11px] font-bold text-primary hover:bg-primary/10 cursor-pointer"
                                                            >
                                                                <CheckCheck className="w-3.5 h-3.5 mr-1" />
                                                                Asignar Todas
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                disabled={locked || isPending || assignedInProg.length === 0}
                                                                onClick={() => handleAssignAllTimelines(program.id, false)}
                                                                className="h-7 text-[11px] font-bold text-muted-foreground hover:bg-muted cursor-pointer"
                                                            >
                                                                Desasignar Todas
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Timeline items: In instructor mode (!isAdminMode), show ONLY the timelines assigned by gestor */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                                    {(isAdminMode ? progTimelines : assignedInProg).map((tl: any) => {
                                                            const isAssigned = assignedTimelineIds.includes(tl.id);
                                                            const tlPeriods = normalPeriods.filter((p: any) => 
                                                                p.timelineId === tl.id || (!p.timelineId && tl.isDefault)
                                                            );
                                                            const tlCourses = tlPeriods.flatMap((p: any) => (p.courses || []).filter((c: any) => !c.groupId));
                                                            const tlSelectedCount = tlCourses.filter((c: any) => selectedQualCourses.includes(c.id)).length;
                                                            const tlPct = tlCourses.length > 0 ? Math.round((tlSelectedCount / tlCourses.length) * 100) : 0;

                                                            return (
                                                                <div
                                                                    key={tl.id}
                                                                    onClick={() => {
                                                                        if (!isAdminMode || locked || isPending) return;
                                                                        handleToggleTimelineAssignment(program.id, tl.id);
                                                                    }}
                                                                    className={cn(
                                                                        "group relative flex items-start gap-3 p-3 rounded-xl border transition-all text-left",
                                                                        isAdminMode && !locked ? "cursor-pointer hover:shadow-xs" : "cursor-default",
                                                                        isAssigned
                                                                            ? "bg-card border-primary/40 shadow-xs ring-1 ring-primary/20"
                                                                            : "bg-card/40 border-border/70 opacity-60 hover:opacity-100"
                                                                    )}
                                                                >
                                                                    {isAdminMode ? (
                                                                        <Checkbox
                                                                            id={`assign-tl-${tl.id}`}
                                                                            checked={isAssigned}
                                                                            disabled={locked || isPending}
                                                                            onCheckedChange={() => handleToggleTimelineAssignment(program.id, tl.id)}
                                                                            className="mt-0.5 shrink-0 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                                                        />
                                                                    ) : (
                                                                        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-primary/10 text-primary border border-primary/30">
                                                                            <Check className="w-3 h-3 stroke-[2.5]" />
                                                                        </div>
                                                                    )}

                                                                    <div className="min-w-0 flex-1 space-y-1">
                                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                                            <Label 
                                                                                htmlFor={`assign-tl-${tl.id}`}
                                                                                className={cn(
                                                                                    "text-xs font-bold truncate",
                                                                                    isAdminMode && !locked ? "cursor-pointer" : "cursor-default",
                                                                                    isAssigned ? "text-foreground" : "text-muted-foreground"
                                                                                )}
                                                                            >
                                                                                {tl.name}
                                                                            </Label>
                                                                            {tl.isDefault && (
                                                                                <Badge variant="outline" className="text-[9px] font-black uppercase px-1.5 py-0 h-4 bg-primary/10 border-primary/20 text-primary">
                                                                                    Principal
                                                                                </Badge>
                                                                            )}
                                                                        </div>

                                                                        {tl.description && (
                                                                            <p className="text-[10px] text-muted-foreground/80 line-clamp-1">
                                                                                {tl.description}
                                                                            </p>
                                                                        )}

                                                                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium pt-0.5">
                                                                            <span>{tlPeriods.length} trimestres</span>
                                                                            <span>•</span>
                                                                            <span>{tlCourses.length} materias</span>
                                                                            {isAssigned && tlCourses.length > 0 && (
                                                                                <>
                                                                                    <span>•</span>
                                                                                    <span className="font-bold text-primary">
                                                                                        {tlSelectedCount} ({tlPct}%)
                                                                                    </span>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                            </div>
                                        )}

                                        {/* Display Periods and Courses */}
                                        {hasTimelines ? (
                                            assignedInProg.length === 0 ? (
                                                <div className="py-10 px-4 text-center rounded-xl border-2 border-dashed border-border bg-card/40 space-y-3">
                                                    <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
                                                        <GitBranch className="w-6 h-6" />
                                                    </div>
                                                    <div className="max-w-md mx-auto space-y-1">
                                                        <h5 className="text-sm font-bold text-foreground">Sin líneas de tiempo asignadas</h5>
                                                        <p className="text-xs text-muted-foreground">
                                                            {isAdminMode
                                                                ? "Este instructor aún no tiene líneas de tiempo asignadas en este programa. Marca una o más líneas arriba para habilitar la visualización y selección de sus asignaturas."
                                                                : "Tu gestor académico aún no te ha asignado ninguna línea de tiempo en este programa. Comunícate con tu gestor para que active tu malla curricular."}
                                                        </p>
                                                    </div>
                                                    {isAdminMode && !locked && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => {
                                                                const defaultTl = progTimelines.find((t: any) => t.isDefault) || progTimelines[0];
                                                                if (defaultTl) {
                                                                    handleToggleTimelineAssignment(program.id, defaultTl.id);
                                                                }
                                                            }}
                                                            className="font-bold text-xs"
                                                        >
                                                            <Check className="w-3.5 h-3.5 mr-1.5" />
                                                            Asignar Línea Principal ({progTimelines.find((t: any) => t.isDefault)?.name || progTimelines[0]?.name})
                                                        </Button>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="space-y-6">
                                                    {/* Filter tab selector when more than 1 timeline is assigned */}
                                                    {assignedInProg.length > 1 && (
                                                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                                                            <Button
                                                                type="button"
                                                                variant={selectedTimelineFilter === "ALL" ? "default" : "outline"}
                                                                size="sm"
                                                                onClick={() => setSelectedTimelineFilter("ALL")}
                                                                className="h-7 text-xs font-bold rounded-lg px-2.5"
                                                            >
                                                                Todas las Líneas ({assignedInProg.length})
                                                            </Button>
                                                            {assignedInProg.map((tl: any) => (
                                                                <Button
                                                                    key={tl.id}
                                                                    type="button"
                                                                    variant={selectedTimelineFilter === tl.id ? "default" : "outline"}
                                                                    size="sm"
                                                                    onClick={() => setSelectedTimelineFilter(tl.id)}
                                                                    className="h-7 text-xs font-bold rounded-lg px-2.5 truncate max-w-[220px]"
                                                                >
                                                                    {tl.name}
                                                                </Button>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {assignedInProg
                                                        .filter((tl: any) => selectedTimelineFilter === "ALL" || selectedTimelineFilter === tl.id)
                                                        .map((tl: any) => {
                                                            const tlPeriods = normalPeriods.filter((p: any) => 
                                                                p.timelineId === tl.id || (!p.timelineId && tl.isDefault)
                                                            );
                                                            const tlCourses = tlPeriods.flatMap((p: any) => (p.courses || []).filter((c: any) => !c.groupId));
                                                            const tlSelectedCount = tlCourses.filter((c: any) => selectedQualCourses.includes(c.id)).length;
                                                            const tlPercentage = tlCourses.length > 0 ? Math.round((tlSelectedCount / tlCourses.length) * 100) : 0;

                                                            return (
                                                                <div key={tl.id} className="space-y-4 p-4 rounded-xl border border-border/60 bg-card/60 backdrop-blur-xs">
                                                                    {/* Timeline Header */}
                                                                    <div className="space-y-2 border-b border-border/40 pb-3">
                                                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                                                            <div className="flex items-center gap-2">
                                                                                <Layers className="w-4 h-4 text-primary shrink-0" />
                                                                                <h5 className="font-bold text-sm text-foreground uppercase tracking-wider">
                                                                                    {tl.name}
                                                                                </h5>
                                                                                {tl.isDefault && (
                                                                                    <Badge variant="outline" className="text-[9px] font-black uppercase text-primary border-primary/20 bg-primary/10">
                                                                                        Principal
                                                                                    </Badge>
                                                                                )}
                                                                                {tl.code && (
                                                                                    <span className="text-[10px] font-mono text-muted-foreground font-semibold">
                                                                                        ({tl.code})
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-xs text-muted-foreground font-semibold">
                                                                                    {tlSelectedCount} de {tlCourses.length} materias
                                                                                </span>
                                                                                <Badge variant={tlPercentage === 100 ? "success" : "secondary"} className="font-bold">
                                                                                    {tlPercentage}%
                                                                                </Badge>
                                                                            </div>
                                                                        </div>
                                                                        {tlCourses.length > 0 && (
                                                                            <Progress value={tlPercentage} className="h-1.5 bg-muted" />
                                                                        )}
                                                                    </div>

                                                                    {/* Periods inside this timeline */}
                                                                    <div className="space-y-4">
                                                                        {tlPeriods.length === 0 ? (
                                                                            <div className="text-xs text-muted-foreground italic py-2">
                                                                                No hay trimestres configurados en esta línea de tiempo.
                                                                            </div>
                                                                        ) : (
                                                                            tlPeriods.map((period: any) => {
                                                                                const periodCourses = (period.courses || []).filter((c: any) => !c.groupId);
                                                                                return (
                                                                                    <div key={period.id} className="space-y-2">
                                                                                        <div className="flex items-center justify-between bg-muted/40 px-2.5 py-1.5 rounded-lg border border-border/30">
                                                                                            <span className="text-xs font-black text-muted-foreground uppercase tracking-wider">
                                                                                                {period.name}
                                                                                            </span>
                                                                                            <span className="text-[10px] text-muted-foreground font-semibold">
                                                                                                {periodCourses.filter((c: any) => selectedQualCourses.includes(c.id)).length} de {periodCourses.length}
                                                                                            </span>
                                                                                        </div>
                                                                                        {periodCourses.length === 0 ? (
                                                                                            <div className="text-[10px] text-muted-foreground/60 italic pl-2">
                                                                                                No hay materias registradas en este trimestre.
                                                                                            </div>
                                                                                        ) : (
                                                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-1">
                                                                                                {periodCourses.map((course: any) => {
                                                                                                    const isChecked = selectedQualCourses.includes(course.id);
                                                                                                    const creator = qualificationsCreatedBy[course.id] || (targetTeacherId ? { id: targetTeacherId, name: loadedTeacherName || "Instructor", role: "teacher" } : null);
                                                                                                    const authorRoleLabel = getAuthorRoleLabel(creator, targetTeacherId);
                                                                                                    const isProf = authorRoleLabel === "Instructor";
                                                                                                    const authorName = creator?.name || "Usuario registrado";

                                                                                                    return (
                                                                                                        <div 
                                                                                                            key={course.id} 
                                                                                                            className={cn(
                                                                                                                "flex items-center justify-between p-2.5 rounded-lg border transition-colors",
                                                                                                                isChecked 
                                                                                                                    ? "bg-primary/5 border-primary/30" 
                                                                                                                    : "bg-background border-border hover:bg-muted/30"
                                                                                                            )}
                                                                                                        >
                                                                                                            <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                                                                                                                <Checkbox
                                                                                                                    id={`qual-course-${course.id}`}
                                                                                                                    checked={isChecked}
                                                                                                                    disabled={locked}
                                                                                                                    onCheckedChange={(checked) => {
                                                                                                                        if (locked) return;
                                                                                                                        if (checked) {
                                                                                                                            setSelectedQualCourses(prev => [...prev, course.id]);
                                                                                                                            const currentRole = session?.user?.role || (isAdminMode ? "gestor" : "teacher");
                                                                                                                            const currentName = session?.user?.name || (isAdminMode ? "Gestor" : (loadedTeacherName || "Instructor"));
                                                                                                                            setQualificationsCreatedBy(prev => ({
                                                                                                                                ...prev,
                                                                                                                                [course.id]: {
                                                                                                                                    id: session?.user?.id || targetTeacherId || "",
                                                                                                                                    name: currentName,
                                                                                                                                    role: currentRole
                                                                                                                                }
                                                                                                                            }));
                                                                                                                        } else {
                                                                                                                            setSelectedQualCourses(prev => prev.filter(id => id !== course.id));
                                                                                                                        }
                                                                                                                    }}
                                                                                                                    className="h-4 w-4 rounded-sm border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary shrink-0"
                                                                                                                />
                                                                                                                <Label 
                                                                                                                    htmlFor={`qual-course-${course.id}`} 
                                                                                                                    className={cn(
                                                                                                                        "text-xs font-semibold select-none transition-colors truncate",
                                                                                                                        locked ? "opacity-70 cursor-not-allowed" : "cursor-pointer hover:text-foreground"
                                                                                                                    )}
                                                                                                                >
                                                                                                                    {course.title}
                                                                                                                </Label>
                                                                                                            </div>

                                                                                                            {isChecked && (
                                                                                                                <Tooltip>
                                                                                                                    <TooltipTrigger asChild>
                                                                                                                        <Badge 
                                                                                                                            variant="outline" 
                                                                                                                            className={cn(
                                                                                                                                "ml-2 text-[9px] font-bold px-1.5 py-0 rounded shrink-0 cursor-help",
                                                                                                                                isProf 
                                                                                                                                    ? "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300" 
                                                                                                                                    : authorRoleLabel === "Gestor"
                                                                                                                                    ? "bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300"
                                                                                                                                    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                                                                                                                            )}
                                                                                                                        >
                                                                                                                            <User className="w-2.5 h-2.5 mr-0.5 inline" />
                                                                                                                            {authorRoleLabel}
                                                                                                                        </Badge>
                                                                                                                    </TooltipTrigger>
                                                                                                                    <TooltipContent className="text-xs font-semibold">
                                                                                                                        <p>Habilitado por: <strong>{authorName}</strong> ({authorRoleLabel})</p>
                                                                                                                    </TooltipContent>
                                                                                                                </Tooltip>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    );
                                                                                                })}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                );
                                                                            })
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                </div>
                                            )
                                        ) : (
                                            /* Fallback for programs without explicit timelines */
                                            <div className="space-y-4">
                                                {normalPeriods.map((period: any) => {
                                                    const periodCourses = (period.courses || []).filter((c: any) => !c.groupId);
                                                    return (
                                                        <div key={period.id} className="space-y-2">
                                                            <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-widest bg-muted/50 p-1.5 rounded">{period.name}</h5>
                                                            {periodCourses.length === 0 ? (
                                                                <div className="text-[10px] text-muted-foreground/60 italic pl-2">No hay materias registradas en este periodo.</div>
                                                            ) : (
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-2">
                                                                    {periodCourses.map((course: any) => {
                                                                        const isChecked = selectedQualCourses.includes(course.id);
                                                                        const creator = qualificationsCreatedBy[course.id] || (targetTeacherId ? { id: targetTeacherId, name: loadedTeacherName || "Instructor", role: "teacher" } : null);
                                                                        const authorRoleLabel = getAuthorRoleLabel(creator, targetTeacherId);
                                                                        const isProf = authorRoleLabel === "Instructor";
                                                                        const authorName = creator?.name || "Usuario registrado";

                                                                        return (
                                                                            <div 
                                                                                key={course.id} 
                                                                                className={cn(
                                                                                    "flex items-center justify-between p-2.5 rounded-lg border transition-colors",
                                                                                    isChecked 
                                                                                        ? "bg-primary/5 border-primary/20" 
                                                                                        : "bg-background border-border hover:bg-muted/30"
                                                                                )}
                                                                            >
                                                                                <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                                                                                    <Checkbox
                                                                                        id={`qual-course-${course.id}`}
                                                                                        checked={isChecked}
                                                                                        disabled={locked}
                                                                                        onCheckedChange={(checked) => {
                                                                                            if (locked) return;
                                                                                            if (checked) {
                                                                                                setSelectedQualCourses(prev => [...prev, course.id]);
                                                                                                const currentRole = session?.user?.role || (isAdminMode ? "gestor" : "teacher");
                                                                                                const currentName = session?.user?.name || (isAdminMode ? "Gestor" : (loadedTeacherName || "Instructor"));
                                                                                                setQualificationsCreatedBy(prev => ({
                                                                                                    ...prev,
                                                                                                    [course.id]: {
                                                                                                        id: session?.user?.id || targetTeacherId || "",
                                                                                                        name: currentName,
                                                                                                        role: currentRole
                                                                                                    }
                                                                                                }));
                                                                                            } else {
                                                                                                setSelectedQualCourses(prev => prev.filter(id => id !== course.id));
                                                                                            }
                                                                                        }}
                                                                                        className="h-4 w-4 rounded-sm border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary shrink-0"
                                                                                    />
                                                                                    <Label 
                                                                                        htmlFor={`qual-course-${course.id}`} 
                                                                                        className={cn(
                                                                                            "text-xs font-semibold select-none transition-colors truncate",
                                                                                            locked ? "opacity-70 cursor-not-allowed" : "cursor-pointer hover:text-foreground"
                                                                                        )}
                                                                                    >
                                                                                        {course.title}
                                                                                    </Label>
                                                                                </div>

                                                                                {isChecked && (
                                                                                    <Tooltip>
                                                                                        <TooltipTrigger asChild>
                                                                                            <Badge 
                                                                                                variant="outline" 
                                                                                                className={cn(
                                                                                                    "ml-2 text-[9px] font-bold px-1.5 py-0 rounded shrink-0 cursor-help",
                                                                                                    isProf 
                                                                                                        ? "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300" 
                                                                                                        : authorRoleLabel === "Gestor"
                                                                                                        ? "bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300"
                                                                                                        : "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                                                                                                )}
                                                                                            >
                                                                                                <User className="w-2.5 h-2.5 mr-0.5 inline" />
                                                                                                {authorRoleLabel}
                                                                                            </Badge>
                                                                                        </TooltipTrigger>
                                                                                        <TooltipContent className="text-xs font-semibold">
                                                                                            <p>Habilitado por: <strong>{authorName}</strong> ({authorRoleLabel})</p>
                                                                                        </TooltipContent>
                                                                                    </Tooltip>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
