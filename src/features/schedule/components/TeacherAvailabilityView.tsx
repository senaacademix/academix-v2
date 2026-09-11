"use client";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { authClient } from "@/lib/auth-client";
import { useState, useEffect, useMemo, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Trash2, Plus, Lock, CheckCircle2, AlertCircle, Edit2, X, Check, Cloud, Sun, Moon, User } from "lucide-react";
import { toast } from "sonner";
import { DayOfWeek } from "@/generated/prisma/client";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { 
    getTeacherAvailabilityAction, 
    saveTeacherAvailabilityAction, 
    publishTeacherAvailabilityAction,
    getTeacherAvailabilityForAdminAction,
    adminSaveTeacherAvailabilityAction,
    adminLockTeacherAvailabilityAction,
    unlockTeacherAvailabilityAction
} from "../actions/availabilityActions";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { cn } from "@/lib/utils";
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

const DAYS_OF_WEEK_ORDERED: { value: DayOfWeek; label: string }[] = [
    { value: "MONDAY", label: "Lunes" },
    { value: "TUESDAY", label: "Martes" },
    { value: "WEDNESDAY", label: "Miércoles" },
    { value: "THURSDAY", label: "Jueves" },
    { value: "FRIDAY", label: "Viernes" },
    { value: "SATURDAY", label: "Sábado" },
    { value: "SUNDAY", label: "Domingo" }
];

const toFormat12h = (t24: string) => {
    if (!t24) return "";
    const [h, m] = t24.split(":").map(Number);
    const ap = h >= 12 ? "p.m." : "a.m.";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ap}`;
};

const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
};

const getSchedulePeriodStyles = (startTimeStr: string) => {
    const start = toMin(startTimeStr);
    if (start < 720) {
        return {
            gradient: "from-sky-500/10 via-sky-500/5 to-transparent dark:from-sky-500/15 dark:to-transparent border-sky-500/20 dark:border-sky-500/30",
            text: "text-sky-700 dark:text-sky-300",
            icon: Cloud,
            label: "Mañana"
        };
    } else if (start < 1080) {
        return {
            gradient: "from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-500/15 dark:to-transparent border-amber-500/20 dark:border-amber-500/30",
            text: "text-amber-700 dark:text-amber-300",
            icon: Sun,
            label: "Tarde"
        };
    } else {
        return {
            gradient: "from-indigo-500/10 via-indigo-500/5 to-transparent dark:from-indigo-500/15 dark:to-transparent border-indigo-500/20 dark:border-indigo-500/30",
            text: "text-indigo-700 dark:text-indigo-300",
            icon: Moon,
            label: "Noche"
        };
    }
};

// 24-hour format options in 1-hour intervals (00:00 to 23:00)
const TIME_OPTIONS_24H_1H: string[] = (() => {
    const list: string[] = [];
    for (let h = 0; h < 24; h++) {
        const hh = String(h).padStart(2, "0");
        list.push(`${hh}:00`);
    }
    return list;
})();

function getTimeOptions(currentVal?: string, isEndTime?: boolean): string[] {
    const base = [...TIME_OPTIONS_24H_1H];
    if (isEndTime && !base.includes("23:59")) {
        base.push("23:59");
    }
    if (currentVal && !base.includes(currentVal)) {
        base.push(currentVal);
        base.sort();
    }
    return base;
}

function formatDuration(startTime: string, endTime: string): string {
    if (!startTime || !endTime) return "";
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    const diffMins = endMins - startMins;
    if (diffMins <= 0) return "Inválido";
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
}

const getAuthorRoleLabel = (
    user?: { id?: string | null; name?: string | null; role?: string | null } | null, 
    targetTeacherId?: string
): string => {
    if (!user) return "";
    if (user.id && targetTeacherId && user.id === targetTeacherId) {
        return "Profesor";
    }
    const r = (user.role || "").toLowerCase().trim();
    if (r === "gestor") return "Gestor";
    if (r === "admin" || r === "administrator") return "Administrador";
    if (r === "coordinador") return "Coordinador";
    if (r === "teacher" || r === "profesor" || r === "docente") return "Profesor";
    return "Gestor";
};

const getScheduleYear = (s: { name?: string; startDate?: string | Date | null }): string => {
    return getScheduleCalendarYear(s);
};

interface TimeSlot {
    id?: string;
    dayOfWeek: DayOfWeek;
    startTime: string; // "HH:mm"
    endTime: string; // "HH:mm"
    createdBy?: {
        id?: string | null;
        name?: string | null;
        role?: string | null;
    } | null;
}

export function TeacherAvailabilityView({ 
    teacherId, 
    scheduleId,
    isAdminMode, 
    onAdminActionComplete 
}: { 
    teacherId?: string, 
    scheduleId?: string,
    isAdminMode?: boolean, 
    onAdminActionComplete?: () => void 
}) {
    const { data: session } = authClient.useSession();
    const [locked, setLocked] = useState(false);
    const [slots, setSlots] = useState<TimeSlot[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentTeacherName, setCurrentTeacherName] = useState<string>("");
    const [currentTeacherId, setCurrentTeacherId] = useState<string>(teacherId || "");
    const [lastModifiedBy, setLastModifiedBy] = useState<{ id?: string; name: string; role?: string } | null>(null);
    const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
    const [isPending, startTransition] = useTransition();

    // Form inputs per day
    const [inputStartTimes, setInputStartTimes] = useState<Record<string, string>>({});
    const [inputEndTimes, setInputEndTimes] = useState<Record<string, string>>({});

    const [publishDialogOpen, setPublishDialogOpen] = useState(false);

    // Edit slot states
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editStartTime, setEditStartTime] = useState("");
    const [editEndTime, setEditEndTime] = useState("");

    const [schedules, setSchedules] = useState<{ id: string; name: string; isActive: boolean; startDate?: string | Date; endDate?: string | Date }[]>([]);
    const [teacherPrograms, setTeacherPrograms] = useState<{ id: string; name: string }[]>([]);
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
            loadAvailability(active);
        }
    };

    useEffect(() => {
        if (scheduleId) {
            setSelectedScheduleId(scheduleId);
        }
    }, [scheduleId]);

    useEffect(() => {
        loadAvailability(selectedScheduleId);
    }, [selectedScheduleId]);

    const loadAvailability = async (schedId?: string) => {
        setLoading(true);
        const targetSched = schedId !== undefined ? schedId : selectedScheduleId;
        try {
            const data = isAdminMode && teacherId 
                ? await getTeacherAvailabilityForAdminAction(teacherId, targetSched)
                : await getTeacherAvailabilityAction(targetSched);
            setLocked(data.locked);
            setSlots(data.slots);
            if ((data as any).teacherName) {
                setCurrentTeacherName((data as any).teacherName);
            }
            if ((data as any).teacherId) {
                setCurrentTeacherId((data as any).teacherId);
            }
            if ((data as any).programs) {
                setTeacherPrograms((data as any).programs);
            }
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
        } catch (e: any) {
            toast.error(e.message || "Error al cargar la disponibilidad");
        } finally {
            setLoading(false);
        }
    };

    const handleAddSlot = (day: DayOfWeek) => {
        const start = inputStartTimes[day] || "06:00";
        const end = inputEndTimes[day] || "12:00";

        if (!start || !end) {
            toast.error("Debes especificar la hora de inicio y fin");
            return;
        }

        if (start >= end) {
            toast.error("La hora de inicio debe ser anterior a la hora de fin");
            return;
        }

        // Check duplicate or overlap
        const isDuplicate = slots.some(
            (s) => s.dayOfWeek === day && s.startTime === start && s.endTime === end
        );
        if (isDuplicate) {
            toast.error("Esta ranura horaria ya está registrada");
            return;
        }

        const isOverlap = slots.some(
            (s) => 
                s.dayOfWeek === day && 
                ((start >= s.startTime && start < s.endTime) || 
                 (end > s.startTime && end <= s.endTime) || 
                 (start <= s.startTime && end >= s.endTime))
        );
        if (isOverlap) {
            toast.error("Esta ranura horaria se traslapa con otra registrada para este día");
            return;
        }

        const currentUserRole = session?.user?.role || (isAdminMode ? "gestor" : "teacher");
        const currentUserName = session?.user?.name || (isAdminMode ? "Gestor" : (currentTeacherName || "Profesor"));
        const newSlot: TimeSlot = { 
            dayOfWeek: day, 
            startTime: start, 
            endTime: end,
            createdBy: {
                id: session?.user?.id || "",
                name: currentUserName,
                role: currentUserRole
            }
        };
        setSlots((prev) => [...prev, newSlot].sort((a, b) => a.startTime.localeCompare(b.startTime)));
        
        // Reset inputs to default
        setInputStartTimes(prev => ({ ...prev, [day]: "06:00" }));
        setInputEndTimes(prev => ({ ...prev, [day]: "12:00" }));
        toast.success("Hora añadida a la lista temporal");
    };

    const handleRemoveSlot = (indexToRemove: number) => {
        setEditingIndex(null);
        setSlots((prev) => prev.filter((_, idx) => idx !== indexToRemove));
        toast.success("Hora removida de la lista temporal");
    };

    const handleStartEdit = (index: number, slot: TimeSlot) => {
        setEditingIndex(index);
        setEditStartTime(slot.startTime);
        setEditEndTime(slot.endTime);
    };

    const handleCancelEdit = () => {
        setEditingIndex(null);
        setEditStartTime("");
        setEditEndTime("");
    };

    const handleSaveEdit = (indexToUpdate: number) => {
        if (!editStartTime || !editEndTime) {
            toast.error("Debes especificar la hora de inicio y fin");
            return;
        }

        if (editStartTime >= editEndTime) {
            toast.error("La hora de inicio debe ser anterior a la hora de fin");
            return;
        }

        const targetDay = slots[indexToUpdate].dayOfWeek;

        // Check duplicate
        const isDuplicate = slots.some(
            (s, idx) => idx !== indexToUpdate && s.dayOfWeek === targetDay && s.startTime === editStartTime && s.endTime === editEndTime
        );
        if (isDuplicate) {
            toast.error("Esta ranura horaria ya está registrada");
            return;
        }

        // Check overlap
        const isOverlap = slots.some(
            (s, idx) => 
                idx !== indexToUpdate &&
                s.dayOfWeek === targetDay && 
                ((editStartTime >= s.startTime && editStartTime < s.endTime) || 
                 (editEndTime > s.startTime && editEndTime <= s.endTime) || 
                 (editStartTime <= s.startTime && editEndTime >= s.endTime))
        );
        if (isOverlap) {
            toast.error("Esta ranura horaria se traslapa con otra registrada para este día");
            return;
        }

        const currentUserRole = session?.user?.role || (isAdminMode ? "gestor" : "teacher");
        const currentUserName = session?.user?.name || (isAdminMode ? "Gestor" : (currentTeacherName || "Profesor"));
        const updatedSlots = slots.map((s, idx) => {
            if (idx === indexToUpdate) {
                return { 
                    ...s, 
                    startTime: editStartTime, 
                    endTime: editEndTime,
                    createdBy: {
                        id: session?.user?.id || s.createdBy?.id || "",
                        name: currentUserName,
                        role: currentUserRole
                    }
                };
            }
            return s;
        }).sort((a, b) => a.startTime.localeCompare(b.startTime));

        setSlots(updatedSlots);
        setEditingIndex(null);
        setEditStartTime("");
        setEditEndTime("");

        // Guardar inmediatamente en la base de datos como el botón de guardar general
        startTransition(async () => {
            try {
                if (isAdminMode && teacherId) {
                    await adminSaveTeacherAvailabilityAction(teacherId, updatedSlots, selectedScheduleId);
                } else {
                    await saveTeacherAvailabilityAction(updatedSlots, selectedScheduleId);
                }
                toast.success("Disponibilidad guardada exitosamente");
                await loadAvailability(selectedScheduleId);
                if (onAdminActionComplete) onAdminActionComplete();
            } catch (e: any) {
                toast.error(e.message || "Error al guardar los cambios");
            }
        });
    };

    const handleSaveChanges = () => {
        startTransition(async () => {
            try {
                if (isAdminMode && teacherId) {
                    await adminSaveTeacherAvailabilityAction(teacherId, slots, selectedScheduleId);
                } else {
                    await saveTeacherAvailabilityAction(slots, selectedScheduleId);
                }
                toast.success("Borrador de disponibilidad guardado exitosamente");
                await loadAvailability(selectedScheduleId);
                if (onAdminActionComplete) onAdminActionComplete();
            } catch (e: any) {
                toast.error(e.message || "Error al guardar los cambios");
            }
        });
    };

    const handlePublish = () => {
        startTransition(async () => {
            try {
                // First save the current slots state to ensure DB matches exactly the UI
                if (isAdminMode && teacherId) {
                    await adminSaveTeacherAvailabilityAction(teacherId, slots, selectedScheduleId);
                    await adminLockTeacherAvailabilityAction(teacherId);
                } else {
                    await saveTeacherAvailabilityAction(slots, selectedScheduleId);
                    await publishTeacherAvailabilityAction();
                }
                toast.success("Disponibilidad publicada y bloqueada con éxito");
                setPublishDialogOpen(false);
                await loadAvailability(selectedScheduleId);
                if (onAdminActionComplete) onAdminActionComplete();
            } catch (e: any) {
                toast.error(e.message || "Error al publicar la disponibilidad");
            }
        });
    };

    const handleUnlock = () => {
        if (!isAdminMode || !teacherId) return;
        startTransition(async () => {
            try {
                await unlockTeacherAvailabilityAction(teacherId);
                toast.success("Disponibilidad desbloqueada con éxito");
                await loadAvailability();
                if (onAdminActionComplete) onAdminActionComplete();
            } catch (e: any) {
                toast.error(e.message || "Error al desbloquear la disponibilidad");
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

    return (
        <div className="space-y-6">
            {/* Academic Schedule Scope Selector (Only in standalone teacher mode) */}
            {!isAdminMode && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-card/80 backdrop-blur-md border border-border/80 rounded-2xl shadow-2xs">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                            <Calendar className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Disponibilidad por Horario / Trimestre</p>
                                {teacherPrograms.length > 0 && (
                                    <Badge variant="outline" className="text-[10px] font-extrabold bg-primary/10 border-primary/20 text-primary py-0 px-2 h-4.5 shrink-0">
                                        {teacherPrograms.map(p => p.name).join(", ")}
                                    </Badge>
                                )}
                            </div>
                            <p className="text-xs text-foreground font-medium truncate">Selecciona el horario institucional para consultar y configurar la disponibilidad específica del docente.</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto shrink-0">
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
                        <Select value={selectedScheduleId} onValueChange={(val) => { setSelectedScheduleId(val); loadAvailability(val); }}>
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
            {locked ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">
                    <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold text-sm">Disponibilidad Publicada y Bloqueada</p>
                            <p className="text-xs opacity-90 mt-0.5">
                                {isAdminMode 
                                    ? (lastModifiedBy && getAuthorRoleLabel(lastModifiedBy, teacherId) !== "Profesor"
                                        ? `La disponibilidad fue guardada y bloqueada por el ${getAuthorRoleLabel(lastModifiedBy, teacherId).toLowerCase()}. Desbloquea para permitir o realizar cambios.`
                                        : "El profesor completó su registro y no puede editarlo. Desbloquea para permitir o realizar cambios.")
                                    : "Tu disponibilidad horaria semanal está registrada y bloqueada para edición. Si necesitas realizar alguna modificación, por favor ponte en contacto con el administrador de la institución para que proceda a desbloquear tu perfil."}
                            </p>
                            {lastModifiedBy && (
                                <p className="text-[11px] mt-2 font-medium bg-emerald-600/10 border border-emerald-600/20 px-2 py-1 rounded-md inline-block">
                                    Última modificación: <span className="font-bold">{lastModifiedBy.name}</span> ({getAuthorRoleLabel(lastModifiedBy, teacherId)}) 
                                    {updatedAt && ` - ${updatedAt.toLocaleDateString()} ${updatedAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
                                </p>
                            )}
                        </div>
                    </div>
                    {isAdminMode && (
                        <Button 
                            size="sm" 
                            onClick={handleUnlock} 
                            disabled={isPending}
                            className="h-8 text-xs font-semibold shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            {isPending ? "Desbloqueando..." : "Desbloquear"}
                        </Button>
                    )}
                </div>
            ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full p-4 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-800 dark:text-amber-300">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                            <p className="font-semibold text-sm">Disponibilidad en Modo Borrador</p>
                            <p className="text-xs opacity-90 mt-0.5 leading-relaxed">
                                {isAdminMode 
                                    ? (lastModifiedBy && getAuthorRoleLabel(lastModifiedBy, teacherId) !== "Profesor"
                                        ? `La disponibilidad fue editada por el ${getAuthorRoleLabel(lastModifiedBy, teacherId).toLowerCase()} y permanece en modo borrador.`
                                        : "El profesor aún puede editar su disponibilidad.")
                                    : "Puedes configurar y modificar tus horas de disponibilidad de lunes a domingo. Recuerda hacer clic en **Publicar** para enviarla de forma oficial; esto bloqueará tus cambios para edición."}
                            </p>
                            {lastModifiedBy && (
                                <p className="text-[11px] mt-2 font-medium bg-amber-600/10 border border-amber-600/20 px-2 py-1 rounded-md inline-block">
                                    Última modificación: <span className="font-bold">{lastModifiedBy.name}</span> ({getAuthorRoleLabel(lastModifiedBy, teacherId)}) 
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
                                onClick={handlePublish}
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
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="flex items-center gap-2">
                                            <Lock className="w-5 h-5 text-amber-600" />
                                            ¿Confirmas publicar tu disponibilidad?
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Una vez publicada, tu disponibilidad horaria quedará **bloqueada** y no podrás realizar más cambios. Solo un administrador podrá desbloquearla para que puedas editarla nuevamente.
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

            {/* Availability Days Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {DAYS_OF_WEEK_ORDERED.map(({ value: day, label: dayName }) => {
                    const daySlots = slots.filter(s => s.dayOfWeek === day);

                    return (
                        <Card key={day} className="border-none shadow-sm flex flex-col justify-between overflow-hidden bg-background">
                            <CardHeader className="bg-muted/10 pb-3">
                                <CardTitle className="text-sm font-bold flex items-center justify-between">
                                    <span>{dayName}</span>
                                    <Badge variant="outline" className="text-[10px] font-normal py-0">
                                        {daySlots.length} {daySlots.length === 1 ? "ranura" : "ranuras"}
                                    </Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 flex-1 flex flex-col justify-between gap-4">
                                {/* Slots list */}
                                <div className="space-y-2 flex-1">
                                    {daySlots.length === 0 ? (
                                        <p className="text-[11px] text-muted-foreground italic text-center py-6">Sin disponibilidad registrada.</p>
                                    ) : (
                                        <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                                            {slots.map((slot, index) => {
                                                if (slot.dayOfWeek !== day) return null;
                                                
                                                const isEditing = editingIndex === index;
                                                
                                                if (isEditing) {
                                                    return (
                                                        <div 
                                                            key={index} 
                                                            className="flex flex-col gap-2 p-2.5 rounded-xl bg-primary/5 border border-primary/20 text-xs font-medium"
                                                        >
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div className="space-y-1">
                                                                    <span className="text-[9px] text-muted-foreground font-bold uppercase flex items-center gap-1">
                                                                        <Clock className="w-3 h-3 text-primary" /> Inicio
                                                                    </span>
                                                                    <div className="flex items-center bg-background px-2 py-1 rounded-lg border border-input h-7">
                                                                        <select 
                                                                            className="bg-transparent font-mono text-xs font-semibold text-foreground focus:outline-none w-full cursor-pointer"
                                                                            value={editStartTime}
                                                                            onChange={(e) => setEditStartTime(e.target.value)}
                                                                        >
                                                                            {getTimeOptions(editStartTime, false).map((t) => (
                                                                                <option key={t} value={t} className="bg-background text-foreground font-mono">
                                                                                    {t}
                                                                                </option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <span className="text-[9px] text-muted-foreground font-bold uppercase flex items-center gap-1">
                                                                        <Clock className="w-3 h-3 text-primary" /> Fin
                                                                    </span>
                                                                    <div className="flex items-center bg-background px-2 py-1 rounded-lg border border-input h-7">
                                                                        <select 
                                                                            className="bg-transparent font-mono text-xs font-semibold text-foreground focus:outline-none w-full cursor-pointer"
                                                                            value={editEndTime}
                                                                            onChange={(e) => setEditEndTime(e.target.value)}
                                                                        >
                                                                            {getTimeOptions(editEndTime, true).map((t) => (
                                                                                <option key={t} value={t} className="bg-background text-foreground font-mono">
                                                                                    {t}
                                                                                </option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex justify-end gap-1.5 border-t border-muted/20 pt-1.5 mt-0.5">
                                                                <Button 
                                                                    size="sm" 
                                                                    variant="ghost" 
                                                                    className="h-6 px-2 text-[10px] text-muted-foreground hover:bg-muted"
                                                                    onClick={handleCancelEdit}
                                                                >
                                                                    <X className="w-3 h-3 mr-1" /> Cancelar
                                                                </Button>
                                                                <Button 
                                                                    size="sm" 
                                                                    disabled={isPending}
                                                                    className="h-6 px-2 text-[10px] bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                                                                    onClick={() => handleSaveEdit(index)}
                                                                >
                                                                    {isPending ? (
                                                                        <>
                                                                            <div className="w-3 h-3 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-1" /> Guardando...
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Check className="w-3 h-3 mr-1" /> Guardar
                                                                        </>
                                                                    )}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    );
                                                }

                                                const styles = getSchedulePeriodStyles(slot.startTime);
                                                const IconComp = styles.icon;
                                                const effectiveTargetTeacherId = currentTeacherId || teacherId;
                                                const slotAuthor = slot.createdBy || (effectiveTargetTeacherId ? { id: effectiveTargetTeacherId, name: currentTeacherName || "Profesor", role: "teacher" } : null);
                                                const authorRoleLabel = getAuthorRoleLabel(slotAuthor, effectiveTargetTeacherId);
                                                const isProf = authorRoleLabel === "Profesor";
                                                const authorName = slotAuthor?.name || "Usuario registrado";

                                                return (
                                                    <div 
                                                        key={index} 
                                                        className={`bg-gradient-to-br flex items-center justify-between p-2 rounded-lg border text-xs font-medium group transition-all duration-200 ${styles.gradient}`}
                                                    >
                                                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                                            <span className={`flex items-center gap-1.5 ${styles.text} truncate`}>
                                                                <IconComp className="w-3.5 h-3.5 shrink-0" /> 
                                                                <span className="font-mono font-bold tracking-tight">{slot.startTime} – {slot.endTime}</span>
                                                                <span className="text-[10px] opacity-75 font-normal">({formatDuration(slot.startTime, slot.endTime)})</span>
                                                                <span className="text-[10px] opacity-60">· {styles.label}</span>
                                                            </span>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Badge 
                                                                        variant="outline" 
                                                                        className={`text-[9px] font-bold px-1.5 py-0 rounded shrink-0 cursor-help ${
                                                                            isProf 
                                                                                ? "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300" 
                                                                                : authorRoleLabel === "Gestor"
                                                                                ? "bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300"
                                                                                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                                                                        }`}
                                                                    >
                                                                        <User className="w-2.5 h-2.5 mr-0.5 inline" />
                                                                        {authorRoleLabel}
                                                                    </Badge>
                                                                </TooltipTrigger>
                                                                <TooltipContent className="text-xs font-semibold">
                                                                    <p>Configurado por: <strong>{authorName}</strong> ({authorRoleLabel})</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </div>

                                                        {(!locked || isAdminMode) && (
                                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                                <Tooltip><TooltipTrigger asChild><Button 
                                                                                                    variant="ghost" size="icon"
                                                                                                    onClick={() => handleStartEdit(index, slot)}
                                                                                                    className={`h-6 w-6 hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors ${styles.text}`}
                                                                                                >
                                                                                                    <Edit2 className="w-3 h-3" />
                                                                                                </Button></TooltipTrigger><TooltipContent><p>Editar ranura</p></TooltipContent></Tooltip>
                                                                <Tooltip><TooltipTrigger asChild><Button 
                                                                                                    variant="ghost" size="icon"
                                                                                                    onClick={() => handleRemoveSlot(index)}
                                                                                                    className="h-6 w-6 text-destructive hover:bg-destructive/10 hover:text-destructive rounded transition-colors"
                                                                                                >
                                                                                                    <Trash2 className="w-3 h-3" />
                                                                                                </Button></TooltipTrigger><TooltipContent><p>Eliminar ranura</p></TooltipContent></Tooltip>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Form to add slots */}
                                {(!locked || isAdminMode) && (
                                    <div className="border-t border-muted/40 pt-3 space-y-2 mt-2">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <Label htmlFor={`start-${day}`} className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                                                    <Clock className="w-3 h-3 text-primary" /> Inicio
                                                </Label>
                                                <div className="flex items-center bg-background px-2.5 py-1.5 rounded-lg border border-input shadow-2xs hover:border-primary/50 transition-colors">
                                                    <select 
                                                        id={`start-${day}`}
                                                        className="bg-transparent font-mono text-xs font-bold text-foreground focus:outline-none w-full cursor-pointer"
                                                        value={inputStartTimes[day] || "06:00"}
                                                        onChange={(e) => setInputStartTimes(prev => ({ ...prev, [day]: e.target.value }))}
                                                    >
                                                        {getTimeOptions(inputStartTimes[day] || "06:00", false).map((t) => (
                                                            <option key={t} value={t} className="bg-background text-foreground font-mono">
                                                                {t}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <Label htmlFor={`end-${day}`} className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                                                    <Clock className="w-3 h-3 text-primary" /> Fin
                                                </Label>
                                                <div className="flex items-center bg-background px-2.5 py-1.5 rounded-lg border border-input shadow-2xs hover:border-primary/50 transition-colors">
                                                    <select 
                                                        id={`end-${day}`}
                                                        className="bg-transparent font-mono text-xs font-bold text-foreground focus:outline-none w-full cursor-pointer"
                                                        value={inputEndTimes[day] || "12:00"}
                                                        onChange={(e) => setInputEndTimes(prev => ({ ...prev, [day]: e.target.value }))}
                                                    >
                                                        {getTimeOptions(inputEndTimes[day] || "12:00", true).map((t) => (
                                                            <option key={t} value={t} className="bg-background text-foreground font-mono">
                                                                {t}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                        <Button 
                                            size="sm"
                                            variant="outline" 
                                            className="w-full h-8 text-[11px] font-semibold border-dashed border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/50"
                                            onClick={() => handleAddSlot(day)}
                                        >
                                            <Plus className="w-3.5 h-3.5 mr-1" /> Añadir Horario
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
