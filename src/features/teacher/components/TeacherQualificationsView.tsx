"use client";

import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useState, useEffect, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { BookOpen, CheckCircle2, AlertCircle, Lock, User } from "lucide-react";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
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
    unlockTeacherQualificationsAction
} from "../actions/qualificationActions";
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

export function TeacherQualificationsView({ teacherId, scheduleId, isAdminMode = false, programId, onAdminActionComplete }: TeacherQualificationsViewProps) {
    const { data: session } = authClient.useSession();
    const [locked, setLocked] = useState(false);
    const [qualPrograms, setQualPrograms] = useState<any[]>([]);
    const [selectedQualCourses, setSelectedQualCourses] = useState<string[]>([]);
    const [qualificationsCreatedBy, setQualificationsCreatedBy] = useState<Record<string, { id: string; name: string | null; role: string }>>({});
    const [schedules, setSchedules] = useState<{ id: string; name: string; isActive: boolean }[]>([]);
    const [selectedScheduleId, setSelectedScheduleId] = useState<string>(scheduleId || "");
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const [publishDialogOpen, setPublishDialogOpen] = useState(false);
    const [lastModifiedBy, setLastModifiedBy] = useState<{name: string, role: string} | null>(null);
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
    }, [targetTeacherId, selectedScheduleId]);

    const loadQualifications = async (schedId?: string) => {
        if (!targetTeacherId) return;
        setLoading(true);
        const targetSched = schedId !== undefined ? schedId : selectedScheduleId;
        try {
            const data = await getTeacherQualificationsAction(targetTeacherId, targetSched);
            if (data) {
                setQualPrograms((data as any).programs || []);
                setSelectedQualCourses(((data as any).qualifiedCourses || []).map((c: any) => c.id));
                setQualificationsCreatedBy((data as any).qualificationsCreatedBy || {});
                setLocked((data as any).locked || false);
                if ((data as any).schedules) {
                    const list = (data as any).schedules;
                    setSchedules(list);
                    if ((!selectedScheduleId || selectedScheduleId === "all") && list.length > 0) {
                        const active = list.find((s: any) => s.isActive)?.id || list[0].id;
                        setSelectedScheduleId(active);
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

    const handleSaveChanges = () => {
        if (!targetTeacherId) return;
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
                // First save the current state
                await updateTeacherQualificationsAction(targetTeacherId, selectedQualCourses);
                // Then publish/lock
                await publishTeacherQualificationsAction(targetTeacherId);
                toast.success("Materias publicadas y bloqueadas con éxito");
                setPublishDialogOpen(false);
                await loadQualifications();
            } catch (e: any) {
                toast.error(e.message || "Error al publicar las materias");
            }
        });
    };

    const handleAdminLock = () => {
        if (!targetTeacherId) return;
        startTransition(async () => {
            try {
                await adminLockTeacherQualificationsAction(targetTeacherId);
                toast.success("Materias aprobadas y bloqueadas con éxito");
                await loadQualifications();
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
                await unlockTeacherQualificationsAction(targetTeacherId);
                toast.success("Materias desbloqueadas con éxito");
                await loadQualifications();
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

    const filteredQualPrograms = (isAdminMode && programId) 
        ? qualPrograms.filter(p => p.id === programId) 
        : qualPrograms;

    // Calculate global stats (only normal periods and master courses without group)
    const allCourses = filteredQualPrograms.flatMap(p => 
        (p.periods || [])
            .filter((per: any) => !per.esEspecial)
            .flatMap((per: any) => (per.courses || []).filter((c: any) => !c.groupId))
    );
    const totalCoursesCount = allCourses.length;
    const selectedCoursesCount = allCourses.filter((c: any) => selectedQualCourses.includes(c.id)).length;
    const globalPercentage = totalCoursesCount > 0 ? Math.round((selectedCoursesCount / totalCoursesCount) * 100) : 0;

    return (
        <div className="space-y-6">
            {/* Academic Schedule Scope Selector (Only in standalone teacher mode) */}
            {!isAdminMode && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-card/80 backdrop-blur-md border border-border/80 rounded-2xl shadow-2xs">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
                            <BookOpen className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Materias Habilitadas por Horario / Trimestre</p>
                            <p className="text-xs text-foreground font-medium truncate">Selecciona el horario institucional para consultar y configurar las materias específicas del docente.</p>
                        </div>
                    </div>
                    <Select value={selectedScheduleId} onValueChange={(val) => { setSelectedScheduleId(val); loadQualifications(val); }}>
                        <SelectTrigger className="w-full sm:w-[260px] h-8.5 text-xs font-bold bg-background border-border/80 rounded-xl shrink-0">
                            <SelectValue placeholder="Seleccionar Horario..." />
                        </SelectTrigger>
                        <SelectContent>
                            {schedules.map((s) => (
                                <SelectItem key={s.id} value={s.id} className="text-xs font-bold">
                                    {s.isActive ? "🟢" : "⚪"} {s.name} {s.isActive ? "(VIGENTE)" : ""}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {/* Status alerts */}
            {locked ? (
                <div className="flex items-start gap-3 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="font-semibold text-sm">Materias Publicadas y Bloqueadas</p>
                        <p className="text-xs opacity-90 mt-0.5">
                            {isAdminMode 
                                ? "El profesor ha publicado sus materias y no puede editarlas." 
                                : "Las materias que dictas están registradas y bloqueadas para edición. Si necesitas realizar alguna modificación, por favor ponte en contacto con el administrador de la institución para que proceda a desbloquear tu perfil."}
                        </p>
                        {lastModifiedBy && (
                            <p className="text-[11px] mt-2 font-medium bg-emerald-600/10 border border-emerald-600/20 px-2 py-1 rounded-md inline-block">
                                Última modificación: <span className="font-bold">{lastModifiedBy.name}</span> ({lastModifiedBy.role === "admin" ? "Administrador" : "Profesor"}) 
                                {updatedAt && ` - ${updatedAt.toLocaleDateString()} ${updatedAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
                            </p>
                        )}
                    </div>
                    {isAdminMode && (
                        <Button 
                            size="sm" 
                            onClick={handleAdminUnlock} 
                            disabled={isPending}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
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
                            <p className="font-semibold text-sm">Materias en Modo Borrador</p>
                            <p className="text-xs opacity-90 mt-0.5 leading-relaxed">
                                {isAdminMode
                                    ? "El profesor aún puede editar sus materias."
                                    : "Puedes configurar qué materias de tu programa estás en capacidad de dictar. Recuerda hacer clic en **Publicar** para enviarla de forma oficial; esto bloqueará tus cambios para edición."}
                            </p>
                            {lastModifiedBy && (
                                <p className="text-[11px] mt-2 font-medium bg-amber-600/10 border border-amber-600/20 px-2 py-1 rounded-md inline-block">
                                    Última modificación: <span className="font-bold">{lastModifiedBy.name}</span> ({lastModifiedBy.role === "admin" ? "Administrador" : "Profesor"}) 
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
            )}

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
                                Selecciona de la lista a continuación las materias que estás en capacidad de ejecutar.
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
                                const normalPeriods = (program.periods || []).filter((p: any) => !p.esEspecial);
                                const programCourses = normalPeriods.flatMap((p: any) => (p.courses || []).filter((c: any) => !c.groupId));
                                const totalProgramCourses = programCourses.length;
                                const selectedProgramCourses = programCourses.filter((c: any) => selectedQualCourses.includes(c.id)).length;
                                const programPercentage = totalProgramCourses > 0 ? Math.round((selectedProgramCourses / totalProgramCourses) * 100) : 0;

                                return (
                                    <div key={program.id} className="space-y-4 p-4 bg-muted/5 rounded-xl border border-border/30">
                                        <div className="space-y-2 border-b border-border/30 pb-3">
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                                <h4 className="font-bold text-sm text-primary uppercase tracking-wider">{program.name}</h4>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-muted-foreground font-semibold">
                                                        {selectedProgramCourses} de {totalProgramCourses} materias
                                                    </span>
                                                    <Badge variant={programPercentage === 100 ? "success" : "secondary"} className="font-bold">
                                                        {programPercentage}%
                                                    </Badge>
                                                </div>
                                            </div>
                                            {totalProgramCourses > 0 && (
                                                <Progress value={programPercentage} className="h-1.5 bg-muted" />
                                            )}
                                        </div>
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
                                                                    const creator = qualificationsCreatedBy[course.id] || lastModifiedBy;
                                                                    const isProf = creator?.role === "teacher" || creator?.id === targetTeacherId;
                                                                    const authorRoleLabel = isProf ? "Profesor" : creator?.role === "admin" ? "Administrador" : "Gestor";
                                                                    const authorName = creator?.name || "Usuario registrado";

                                                                    return (
                                                                        <div 
                                                                            key={course.id} 
                                                                            className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
                                                                                isChecked 
                                                                                    ? "bg-primary/5 border-primary/20" 
                                                                                    : "bg-background border-border hover:bg-muted/30"
                                                                            }`}
                                                                        >
                                                                            <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                                                                                <Checkbox
                                                                                    id={`qual-course-${course.id}`}
                                                                                    checked={isChecked}
                                                                                    disabled={locked && !isAdminMode}
                                                                                    onCheckedChange={(checked) => {
                                                                                        if (checked) {
                                                                                            setSelectedQualCourses(prev => [...prev, course.id]);
                                                                                        } else {
                                                                                            setSelectedQualCourses(prev => prev.filter(id => id !== course.id));
                                                                                        }
                                                                                    }}
                                                                                    className="h-4 w-4 rounded-sm border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary shrink-0"
                                                                                />
                                                                                <Label 
                                                                                    htmlFor={`qual-course-${course.id}`} 
                                                                                    className={`text-xs font-semibold cursor-pointer select-none transition-colors truncate ${locked && !isAdminMode ? "opacity-70 cursor-not-allowed" : "hover:text-foreground"}`}
                                                                                >
                                                                                    {course.title}
                                                                                </Label>
                                                                            </div>

                                                                            {isChecked && (
                                                                                <Tooltip>
                                                                                    <TooltipTrigger asChild>
                                                                                        <Badge 
                                                                                            variant="outline" 
                                                                                            className={`ml-2 text-[9px] font-bold px-1.5 py-0 rounded shrink-0 cursor-help ${
                                                                                                isProf 
                                                                                                    ? "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300" 
                                                                                                    : "bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300"
                                                                                            }`}
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
