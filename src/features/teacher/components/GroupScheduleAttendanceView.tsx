"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
    Calendar, 
    CalendarDays, 
    Clock, 
    Users, 
    BookOpen, 
    UserCheck, 
    UserX, 
    AlertCircle, 
    CheckCircle2, 
    Download, 
    RefreshCw, 
    Search, 
    FileSpreadsheet, 
    Layers, 
    History, 
    Sparkles, 
    Filter, 
    ChevronLeft, 
    ChevronRight, 
    Info, 
    GraduationCap,
    HelpCircle,
    Building,
    Check,
    X,
    Clock3,
    CalendarRange,
    Maximize2,
    Minimize2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatName, cn } from "@/lib/utils";
import { toCalendarYMD, getTodayColombianDate, formatCalendarDate } from "@/lib/dateUtils";
import { getGroupScheduleAttendanceAction, type GroupScheduleAttendanceData } from "../actions/groupScheduleAttendanceActions";
import { toast } from "sonner";
import ExcelJS from "exceljs";

interface GroupScheduleAttendanceViewProps {
    selectedGroupId: string;
    groups: Array<{ id: string; name: string }>;
    onSelectGroup: (groupId: string) => void;
    isActiveTab: boolean;
    teacherName?: string;
}

// Mapeo de días en español
const DAY_LABELS: Record<string, { short: string; full: string; order: number }> = {
    MONDAY: { short: "Lun", full: "Lunes", order: 1 },
    TUESDAY: { short: "Mar", full: "Martes", order: 2 },
    WEDNESDAY: { short: "Mié", full: "Miércoles", order: 3 },
    THURSDAY: { short: "Jue", full: "Jueves", order: 4 },
    FRIDAY: { short: "Vie", full: "Viernes", order: 5 },
    SATURDAY: { short: "Sáb", full: "Sábado", order: 6 },
    SUNDAY: { short: "Dom", full: "Domingo", order: 7 },
};

const MONTH_NAMES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

interface DayClassSession {
    courseId: string;
    courseTitle: string;
    teacherName: string;
    startTime: string;
    endTime: string;
    environmentName: string | null;
    dateStr: string;
    dayOfWeekKey: string;
    dayMeta: {
        dayName: string;
        shortDay: string;
        formattedDate: string;
        dateStr: string;
        weekNum?: number;
    };
}

export function GroupScheduleAttendanceView({
    selectedGroupId,
    groups,
    onSelectGroup,
    isActiveTab,
    teacherName
}: GroupScheduleAttendanceViewProps) {
    // Cache de datos por ID de grupo para evitar peticiones redundantes
    const [cache, setCache] = useState<Record<string, GroupScheduleAttendanceData>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Modo de vista: "week" (Semana) o "month" (Mes)
    const [viewMode, setViewMode] = useState<"week" | "month">("week");

    // Estado del horario seleccionado: "current" o el ID específico del horario
    const [selectedScheduleMode, setSelectedScheduleMode] = useState<"current" | "past">("current");
    const [selectedPastScheduleId, setSelectedPastScheduleId] = useState<string>("");

    // Estado de semana seleccionada (índice 0-based dentro de las semanas del horario)
    const [selectedWeekIndex, setSelectedWeekIndex] = useState<number>(0);

    // Estado de mes seleccionado (formato "YYYY-MM")
    const [selectedMonthKey, setSelectedMonthKey] = useState<string>("");

    // Filtros de búsqueda
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<"ALL" | "WITH_ABSENCES" | "WITH_LATES" | "PERFECT">("ALL");

    // Encabezado compacto (solo días abreviados con tooltip de shadcn)
    const [compactHeaders, setCompactHeaders] = useState<boolean>(() => {
        if (typeof window !== "undefined") {
            try {
                return localStorage.getItem("attendance_compact_headers") === "true";
            } catch {
                return false;
            }
        }
        return false;
    });

    // Pantalla completa
    const [isFullscreen, setIsFullscreen] = useState(false);
    const fullscreenContainerRef = React.useRef<HTMLDivElement>(null);

    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            if (fullscreenContainerRef.current?.requestFullscreen) {
                fullscreenContainerRef.current.requestFullscreen().catch(() => {
                    setIsFullscreen(true);
                });
            } else {
                setIsFullscreen(true);
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen().catch(() => {});
            }
            setIsFullscreen(false);
        }
    }, []);

    useEffect(() => {
        const handleFsChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener("fullscreenchange", handleFsChange);
        return () => document.removeEventListener("fullscreenchange", handleFsChange);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isFullscreen) {
                if (document.fullscreenElement) {
                    document.exitFullscreen().catch(() => {});
                }
                setIsFullscreen(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isFullscreen]);

    // =========================================================================
    // 1. PETICIÓN A LA BASE DE DATOS (SOLO AL ABRIR ESTA PESTAÑA)
    // =========================================================================
    const loadGroupData = useCallback(async (groupId: string, forceRefresh = false) => {
        if (!groupId) return;
        if (!forceRefresh && cache[groupId]) {
            return; // Ya cargado en memoria, no repite llamada a la BD
        }

        setIsLoading(true);
        setError(null);

        try {
            const res = await getGroupScheduleAttendanceAction(groupId);
            if (res.success && res.data) {
                setCache(prev => ({
                    ...prev,
                    [groupId]: res.data!
                }));

                // Inicializar horario anterior si no hay actual o si se cambia de grupo
                if (res.data.pastSchedules.length > 0 && !selectedPastScheduleId) {
                    setSelectedPastScheduleId(res.data.pastSchedules[0].id);
                }
            } else {
                setError(res.error || "No se pudo cargar la asistencia del grupo.");
            }
        } catch (err: any) {
            console.error("Error al cargar la asistencia por horario:", err);
            setError(err.message || "Error al conectar con la base de datos.");
        } finally {
            setIsLoading(false);
        }
    }, [cache, selectedPastScheduleId]);

    // Efecto estricto: Solo cuando isActiveTab es TRUE y no hay cache para el grupo activo
    useEffect(() => {
        if (isActiveTab && selectedGroupId) {
            if (!cache[selectedGroupId]) {
                loadGroupData(selectedGroupId);
            }
        }
    }, [isActiveTab, selectedGroupId, cache, loadGroupData]);

    const handleRefresh = async () => {
        const toastId = toast.loading("Actualizando datos desde la base de datos...");
        await loadGroupData(selectedGroupId, true);
        toast.success("Asistencia actualizada correctamente", { id: toastId });
    };

    // Datos activos del grupo seleccionado
    const groupData = cache[selectedGroupId] || null;

    // =========================================================================
    // 2. IDENTIFICAR EL HORARIO EN USO (ACTUAL VS ANTERIORES)
    // =========================================================================
    const activeSchedule = useMemo(() => {
        if (!groupData) return null;

        if (selectedScheduleMode === "current") {
            return groupData.currentSchedule || groupData.allSchedules[0] || null;
        } else {
            return (
                groupData.pastSchedules.find(s => s.id === selectedPastScheduleId) ||
                groupData.pastSchedules[0] ||
                null
            );
        }
    }, [groupData, selectedScheduleMode, selectedPastScheduleId]);

    // =========================================================================
    // 3. GENERACIÓN DE MESES DEL HORARIO SELECCIONADO
    // =========================================================================
    interface MonthOption {
        key: string;       // "2026-10"
        label: string;     // "Octubre 2026"
        shortLabel: string;// "Oct 2026"
        year: number;
        month: number;     // 0-based
        isCurrentMonth: boolean;
    }

    const months = useMemo<MonthOption[]>(() => {
        if (!activeSchedule?.startDate || !activeSchedule?.endDate) return [];
        const start = new Date(activeSchedule.startDate);
        const end = new Date(activeSchedule.endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];

        const todayYMD = getTodayColombianDate();
        const [curY, curM] = todayYMD.split("-").map(Number);
        const currentMonthKey = `${curY}-${String(curM).padStart(2, "0")}`;

        const startYear = start.getUTCFullYear();
        const startMonth = start.getUTCMonth();
        const endYear = end.getUTCFullYear();
        const endMonth = end.getUTCMonth();

        const monthList: MonthOption[] = [];
        let y = startYear;
        let m = startMonth;

        while (y < endYear || (y === endYear && m <= endMonth)) {
            const key = `${y}-${String(m + 1).padStart(2, "0")}`;
            monthList.push({
                key,
                label: `${MONTH_NAMES[m]} ${y}`,
                shortLabel: `${MONTH_NAMES[m].slice(0, 3)} ${y}`,
                year: y,
                month: m,
                isCurrentMonth: key === currentMonthKey
            });

            m++;
            if (m > 11) {
                m = 0;
                y++;
            }
        }

        return monthList;
    }, [activeSchedule]);

    // Sincronizar mes seleccionado
    useEffect(() => {
        if (months.length === 0) return;
        const currentMonth = months.find(m => m.isCurrentMonth);
        if (currentMonth) {
            setSelectedMonthKey(currentMonth.key);
        } else if (!months.some(m => m.key === selectedMonthKey)) {
            setSelectedMonthKey(months[0].key);
        }
    }, [months, selectedMonthKey]);

    const selectedMonth = useMemo(() => {
        return months.find(m => m.key === selectedMonthKey) || months[0] || null;
    }, [months, selectedMonthKey]);

    // =========================================================================
    // 4. GENERACIÓN DE SEMANAS DEL HORARIO SELECCIONADO
    // =========================================================================
    interface WeekItem {
        weekNumber: number;
        startDateStr: string; // YYYY-MM-DD
        endDateStr: string;   // YYYY-MM-DD
        isCurrentWeek: boolean;
        days: Array<{
            dayOfWeekKey: string; // "MONDAY", "TUESDAY", ...
            dateStr: string;      // YYYY-MM-DD
            dayName: string;      // "Lunes"
            shortDay: string;     // "Lun"
            formattedDate: string;// "05 Oct"
        }>;
    }

    const weeks = useMemo<WeekItem[]>(() => {
        if (!activeSchedule?.startDate || !activeSchedule?.endDate) return [];

        const start = new Date(activeSchedule.startDate);
        const end = new Date(activeSchedule.endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];

        const todayYMD = getTodayColombianDate();
        const resultWeeks: WeekItem[] = [];

        // Asegurar que el lunes sea el primer día de la semana
        const curDate = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
        const dayOfWeek = curDate.getUTCDay(); // 0 is Sunday, 1 is Monday
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        curDate.setUTCDate(curDate.getUTCDate() + diffToMonday);

        const endDateLimit = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
        endDateLimit.setUTCDate(endDateLimit.getUTCDate() + 6); // Colchón de fin de semana

        let weekIndex = 1;

        while (curDate <= endDateLimit && weekIndex <= 30) {
            const weekMonday = new Date(curDate);
            const weekDays: WeekItem["days"] = [];
            const dayKeys = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

            for (let i = 0; i < 6; i++) {
                const dayDate = new Date(weekMonday);
                dayDate.setUTCDate(dayDate.getUTCDate() + i);
                const dateStr = toCalendarYMD(dayDate);
                const dayKey = dayKeys[i];
                const meta = DAY_LABELS[dayKey] || { full: dayKey, short: dayKey };

                // Formato corto tipo "05 Oct"
                const formattedDate = formatCalendarDate(dayDate, "d MMM");

                weekDays.push({
                    dayOfWeekKey: dayKey,
                    dateStr,
                    dayName: meta.full,
                    shortDay: meta.short,
                    formattedDate
                });
            }

            const weekStartStr = weekDays[0].dateStr;
            const weekEndStr = weekDays[5].dateStr;
            const isCurrentWeek = todayYMD >= weekStartStr && todayYMD <= weekEndStr;

            resultWeeks.push({
                weekNumber: weekIndex,
                startDateStr: weekStartStr,
                endDateStr: weekEndStr,
                isCurrentWeek,
                days: weekDays
            });

            curDate.setUTCDate(curDate.getUTCDate() + 7);
            weekIndex++;
        }

        return resultWeeks;
    }, [activeSchedule]);

    // Posicionar por defecto en la semana en curso (o la última si ya terminó)
    useEffect(() => {
        if (weeks.length === 0) return;
        const currentIdx = weeks.findIndex(w => w.isCurrentWeek);
        if (currentIdx !== -1) {
            setSelectedWeekIndex(currentIdx);
        } else {
            // Si el horario ya terminó, seleccionar la última semana; si aún no empieza, la primera
            const todayYMD = getTodayColombianDate();
            if (activeSchedule?.endDate && todayYMD > toCalendarYMD(activeSchedule.endDate)) {
                setSelectedWeekIndex(Math.max(0, weeks.length - 1));
            } else {
                setSelectedWeekIndex(0);
            }
        }
    }, [weeks, activeSchedule]);

    const currentWeek = weeks[selectedWeekIndex] || weeks[0] || null;

    // =========================================================================
    // 5. SESIONES SEMANALES DE TODOS LOS INSTRUCTORES
    // =========================================================================
    const weekClassesByDay = useMemo(() => {
        if (!groupData || !currentWeek) return new Map<string, DayClassSession[]>();

        const map = new Map<string, DayClassSession[]>();

        // Inicializar los 6 días de la semana
        currentWeek.days.forEach(d => {
            map.set(d.dayOfWeekKey, []);
        });

        // Filtrar cursos que aplican al horario activo (si tienen academicScheduleId coincidente o sin ID)
        const relevantCourses = groupData.courses.filter(c => {
            if (!activeSchedule) return true;
            if (!c.academicScheduleId) return true;
            return c.academicScheduleId === activeSchedule.id;
        });

        // Buscar sesiones programadas por horario semanal
        relevantCourses.forEach(course => {
            course.schedules.forEach(sched => {
                const dayList = map.get(sched.dayOfWeek);
                if (dayList) {
                    const correspondingDay = currentWeek.days.find(d => d.dayOfWeekKey === sched.dayOfWeek);
                    dayList.push({
                        courseId: course.id,
                        courseTitle: course.title,
                        teacherName: sched.teacherName || course.teacherName,
                        startTime: sched.startTime,
                        endTime: sched.endTime,
                        environmentName: sched.environmentName,
                        dateStr: correspondingDay ? correspondingDay.dateStr : "",
                        dayOfWeekKey: sched.dayOfWeek,
                        dayMeta: correspondingDay || {
                            dayName: sched.dayOfWeek,
                            shortDay: sched.dayOfWeek.slice(0, 3),
                            formattedDate: "",
                            dateStr: ""
                        }
                    });
                }
            });
        });

        // Complementar con asistencias reales tomadas en esas fechas si no tenían horario fijo
        const weekDates = new Set(currentWeek.days.map(d => d.dateStr));
        const attendancesInWeek = groupData.attendances.filter(a => weekDates.has(a.date));

        attendancesInWeek.forEach(att => {
            const course = groupData.courses.find(c => c.id === att.courseId);
            if (!course) return;

            const dayObj = currentWeek.days.find(d => d.dateStr === att.date);
            if (!dayObj) return;

            const dayList = map.get(dayObj.dayOfWeekKey);
            if (dayList && !dayList.some(s => s.courseId === course.id)) {
                dayList.push({
                    courseId: course.id,
                    courseTitle: course.title,
                    teacherName: course.teacherName,
                    startTime: "Sesión",
                    endTime: "Registrada",
                    environmentName: null,
                    dateStr: att.date,
                    dayOfWeekKey: dayObj.dayOfWeekKey,
                    dayMeta: dayObj
                });
            }
        });

        // Ordenar cada día por hora de inicio
        map.forEach((sessions) => {
            sessions.sort((a, b) => a.startTime.localeCompare(b.startTime));
        });

        return map;
    }, [groupData, currentWeek, activeSchedule]);

    // Todas las sesiones de la semana agrupadas en columnas
    const allWeekSessions = useMemo<DayClassSession[]>(() => {
        if (!currentWeek) return [];
        const sessions: DayClassSession[] = [];

        currentWeek.days.forEach(day => {
            const daySessions = weekClassesByDay.get(day.dayOfWeekKey) || [];
            if (daySessions.length > 0) {
                daySessions.forEach(s => {
                    sessions.push(s);
                });
            } else {
                // Día sin clases programadas
                sessions.push({
                    courseId: `empty-${day.dateStr}`,
                    courseTitle: "Sin clases",
                    teacherName: "-",
                    startTime: "-",
                    endTime: "-",
                    environmentName: null,
                    dateStr: day.dateStr,
                    dayOfWeekKey: day.dayOfWeekKey,
                    dayMeta: day
                });
            }
        });

        return sessions;
    }, [currentWeek, weekClassesByDay]);

    // =========================================================================
    // 6. SESIONES MENSUALES DE TODOS LOS INSTRUCTORES
    // =========================================================================
    const allMonthSessions = useMemo<DayClassSession[]>(() => {
        if (!selectedMonth || !groupData || !activeSchedule) return [];

        const startLimitYMD = toCalendarYMD(activeSchedule.startDate);
        const endLimitYMD = toCalendarYMD(activeSchedule.endDate);

        const year = selectedMonth.year;
        const month = selectedMonth.month; // 0-based

        // Días totales del mes
        const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
        const sessions: DayClassSession[] = [];

        // Cursos relevantes
        const relevantCourses = groupData.courses.filter(c => {
            if (!activeSchedule) return true;
            if (!c.academicScheduleId) return true;
            return c.academicScheduleId === activeSchedule.id;
        });

        const dayKeys = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

            // Restringir estrictamente a los límites del período del horario
            if (dateStr < startLimitYMD || dateStr > endLimitYMD) continue;

            const dateObj = new Date(Date.UTC(year, month, day, 12, 0, 0));
            const dayOfWeekIdx = dateObj.getUTCDay();
            const dayKey = dayKeys[dayOfWeekIdx];

            if (dayKey === "SUNDAY") continue; // Excluir domingo por defecto si no es formativo

            const meta = DAY_LABELS[dayKey] || { full: dayKey, short: dayKey };
            const formattedDate = formatCalendarDate(dateObj, "d MMM");

            // Buscar clases programadas en ese día de la semana
            const dayClasses: DayClassSession[] = [];

            relevantCourses.forEach(course => {
                course.schedules.forEach(sched => {
                    if (sched.dayOfWeek === dayKey) {
                        dayClasses.push({
                            courseId: course.id,
                            courseTitle: course.title,
                            teacherName: sched.teacherName || course.teacherName,
                            startTime: sched.startTime,
                            endTime: sched.endTime,
                            environmentName: sched.environmentName,
                            dateStr,
                            dayOfWeekKey: dayKey,
                            dayMeta: {
                                dayName: meta.full,
                                shortDay: meta.short,
                                formattedDate,
                                dateStr
                            }
                        });
                    }
                });
            });

            // Complementar con asistencias reales registradas en esa fecha
            const attsInDate = groupData.attendances.filter(a => a.date === dateStr);
            attsInDate.forEach(att => {
                const course = groupData.courses.find(c => c.id === att.courseId);
                if (!course) return;
                if (!dayClasses.some(dc => dc.courseId === course.id)) {
                    dayClasses.push({
                        courseId: course.id,
                        courseTitle: course.title,
                        teacherName: course.teacherName,
                        startTime: "Sesión",
                        endTime: "Registrada",
                        environmentName: null,
                        dateStr,
                        dayOfWeekKey: dayKey,
                        dayMeta: {
                            dayName: meta.full,
                            shortDay: meta.short,
                            formattedDate,
                            dateStr
                        }
                    });
                }
            });

            dayClasses.sort((a, b) => a.startTime.localeCompare(b.startTime));

            dayClasses.forEach(s => {
                sessions.push(s);
            });
        }

        return sessions;
    }, [selectedMonth, groupData, activeSchedule]);

    // Diccionario rápido de asistencias por [userId_courseId_date]
    const attendanceMap = useMemo(() => {
        const map = new Map<string, GroupScheduleAttendanceData["attendances"][0]>();
        if (!groupData) return map;

        groupData.attendances.forEach(att => {
            const key = `${att.userId}_${att.courseId}_${att.date}`;
            map.set(key, att);
        });

        return map;
    }, [groupData]);

    // =========================================================================
    // 7. SESIONES ACTIVAS (SEMANA VS MES) Y ESTADÍSTICAS
    // =========================================================================
    const activeSessions = useMemo(() => {
        return viewMode === "week" ? allWeekSessions : allMonthSessions;
    }, [viewMode, allWeekSessions, allMonthSessions]);

    const studentsWithStats = useMemo(() => {
        if (!groupData) return [];

        const validSessions = activeSessions.filter(s => !s.courseId.startsWith("empty-"));

        return groupData.students.map(student => {
            let presentCount = 0;
            let absentCount = 0;
            let lateCount = 0;
            let leaveEarlyCount = 0;
            let totalChecked = 0;

            validSessions.forEach(session => {
                const key = `${student.id}_${session.courseId}_${session.dateStr}`;
                const record = attendanceMap.get(key);

                if (record) {
                    totalChecked++;
                    if (record.status === "PRESENT") presentCount++;
                    else if (record.status === "ABSENT") absentCount++;
                    else if (record.status === "LATE") lateCount++;
                    else if (record.status === "LEAVE_EARLY") leaveEarlyCount++;
                }
            });

            const effectiveTotal = validSessions.length;
            const attendancePct = effectiveTotal > 0 
                ? Math.round(((presentCount + (lateCount * 0.5)) / effectiveTotal) * 100) 
                : 100;

            return {
                ...student,
                stats: {
                    presentCount,
                    absentCount,
                    lateCount,
                    leaveEarlyCount,
                    totalChecked,
                    effectiveTotal,
                    attendancePct
                }
            };
        });
    }, [groupData, activeSessions, attendanceMap]);

    // Filtrar por término de búsqueda y estado
    const filteredStudents = useMemo(() => {
        return studentsWithStats.filter(st => {
            // Filtro por texto
            if (searchTerm.trim().length > 0) {
                const q = searchTerm.toLowerCase();
                const nameMatch = st.name.toLowerCase().includes(q);
                const docMatch = st.profile?.identificacion?.toLowerCase().includes(q);
                const emailMatch = st.email.toLowerCase().includes(q);
                if (!nameMatch && !docMatch && !emailMatch) return false;
            }

            // Filtro por estado
            if (statusFilter === "WITH_ABSENCES") {
                return st.stats.absentCount > 0;
            }
            if (statusFilter === "WITH_LATES") {
                return st.stats.lateCount > 0;
            }
            if (statusFilter === "PERFECT") {
                return st.stats.absentCount === 0 && st.stats.lateCount === 0;
            }

            return true;
        });
    }, [studentsWithStats, searchTerm, statusFilter]);

    // Resumen global del período activo (semana o mes)
    const globalStats = useMemo(() => {
        let totalAbsences = 0;
        let totalLates = 0;
        let totalPresent = 0;

        studentsWithStats.forEach(st => {
            totalAbsences += st.stats.absentCount;
            totalLates += st.stats.lateCount;
            totalPresent += st.stats.presentCount;
        });

        const totalMarked = totalAbsences + totalLates + totalPresent;
        const avgAttendance = totalMarked > 0 
            ? Math.round(((totalPresent + (totalLates * 0.5)) / totalMarked) * 100) 
            : 100;

        return {
            totalAbsences,
            totalLates,
            totalPresent,
            avgAttendance,
            sessionsCount: activeSessions.filter(s => !s.courseId.startsWith("empty-")).length,
            instructorsCount: new Set(activeSessions.map(s => s.teacherName).filter(t => t !== "-")).size
        };
    }, [studentsWithStats, activeSessions]);

    // =========================================================================
    // 8. EXPORTACIÓN A EXCEL (.XLSX) PARA SEMANA O MES
    // =========================================================================
    const handleExportExcel = async () => {
        if (!groupData) return;

        const isMonthMode = viewMode === "month";
        const toastId = toast.loading(
            isMonthMode 
                ? `Generando Excel de Asistencia Mensual (${selectedMonth?.label || "Mes"})...` 
                : "Generando Excel de Asistencia Semanal..."
        );

        try {
            const workbook = new ExcelJS.Workbook();
            workbook.creator = "AcademiX Plataforma";
            workbook.created = new Date();

            const periodName = isMonthMode
                ? (selectedMonth ? selectedMonth.label.replace(/\s+/g, "_") : "Mes")
                : `Semana_${currentWeek?.weekNumber || 1}`;

            const sheetName = periodName.slice(0, 31);
            const sheet = workbook.addWorksheet(sheetName, {
                views: [{ showGridLines: true }]
            });

            // Título Principal
            sheet.mergeCells("A1:K1");
            const titleCell = sheet.getCell("A1");
            titleCell.value = isMonthMode
                ? `ACADEMIX — SÁBANA MENSUAL DE ASISTENCIA • FICHA ${groupData.group.name} • ${selectedMonth?.label || ""}`
                : `ACADEMIX — SÁBANA SEMANAL DE ASISTENCIA • FICHA ${groupData.group.name}`;
            titleCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
            titleCell.alignment = { horizontal: "center", vertical: "middle" };
            titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
            sheet.getRow(1).height = 36;

            // Subtítulo con Metadatos
            sheet.mergeCells("A2:K2");
            const subCell = sheet.getCell("A2");
            const scheduleTitle = activeSchedule ? activeSchedule.name : "Horario General";
            const periodDetail = isMonthMode
                ? `Mes: ${selectedMonth?.label || ""} • Total Sesiones: ${activeSessions.length}`
                : `Semana ${currentWeek?.weekNumber || 1} (${currentWeek?.startDateStr || ""} al ${currentWeek?.endDateStr || ""})`;

            subCell.value = `Período / Horario: ${scheduleTitle} • ${periodDetail} • ${groupData.students.length} Aprendices`;
            subCell.font = { name: "Arial", size: 10, italic: true, color: { argb: "FF334155" } };
            subCell.alignment = { horizontal: "center", vertical: "middle" };
            subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
            sheet.getRow(2).height = 24;

            sheet.addRow([]); // Espaciador

            // Encabezados de Columna
            const validSessions = activeSessions.filter(s => !s.courseId.startsWith("empty-"));
            const headerRow1 = ["#", "Documento", "Aprendiz", "Estado"];
            const headerRow2 = ["", "", "", ""];

            validSessions.forEach(s => {
                headerRow1.push(`${s.dayMeta.shortDay} ${s.dayMeta.formattedDate}`);
                headerRow2.push(`${s.courseTitle}\n(${s.teacherName})`);
            });

            headerRow1.push("Asist.", "Fallas", "Tardes", "% Cumpl.");
            headerRow2.push("", "", "", "");

            const row4 = sheet.addRow(headerRow1);
            const row5 = sheet.addRow(headerRow2);
            sheet.getRow(4).height = 22;
            sheet.getRow(5).height = 30;

            // Estilos de los encabezados
            [row4, row5].forEach(r => {
                r.eachCell((cell) => {
                    cell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FFFFFFFF" } };
                    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
                    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3B82F6" } };
                    cell.border = {
                        top: { style: "thin", color: { argb: "FFE2E8F0" } },
                        left: { style: "thin", color: { argb: "FFE2E8F0" } },
                        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
                        right: { style: "thin", color: { argb: "FFE2E8F0" } }
                    };
                });
            });

            // Filas de Aprendices
            filteredStudents.forEach((st, idx) => {
                const rowData: any[] = [
                    idx + 1,
                    st.profile?.identificacion || "-",
                    formatName(st.name),
                    st.profile?.novedad || "ACTIVO"
                ];

                validSessions.forEach(s => {
                    const key = `${st.id}_${s.courseId}_${s.dateStr}`;
                    const rec = attendanceMap.get(key);
                    if (!rec) {
                        rowData.push("-");
                    } else if (rec.status === "PRESENT") {
                        rowData.push("P");
                    } else if (rec.status === "ABSENT") {
                        rowData.push(rec.justification ? "AJ" : "A");
                    } else if (rec.status === "LATE") {
                        rowData.push("R");
                    } else if (rec.status === "LEAVE_EARLY") {
                        rowData.push("S");
                    }
                });

                rowData.push(
                    st.stats.presentCount,
                    st.stats.absentCount,
                    st.stats.lateCount,
                    `${st.stats.attendancePct}%`
                );

                const dataRow = sheet.addRow(rowData);
                dataRow.height = 20;

                dataRow.eachCell((cell, colNum) => {
                    cell.font = { name: "Arial", size: 9 };
                    cell.border = {
                        top: { style: "thin", color: { argb: "FFE2E8F0" } },
                        left: { style: "thin", color: { argb: "FFE2E8F0" } },
                        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
                        right: { style: "thin", color: { argb: "FFE2E8F0" } }
                    };

                    // Alineación
                    if (colNum === 3) {
                        cell.alignment = { horizontal: "left", vertical: "middle" };
                    } else {
                        cell.alignment = { horizontal: "center", vertical: "middle" };
                    }

                    // Colores condicionales en las celdas de asistencia
                    const cellVal = String(cell.value);
                    if (cellVal === "P") {
                        cell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF047857" } };
                        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } };
                    } else if (cellVal === "A" || cellVal === "AJ") {
                        cell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FFB91C1C" } };
                        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } };
                    } else if (cellVal === "R") {
                        cell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FFB45309" } };
                        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
                    }
                });
            });

            // Ajuste de anchos de columna
            sheet.getColumn(1).width = 5;  // #
            sheet.getColumn(2).width = 14; // Documento
            sheet.getColumn(3).width = 30; // Nombre
            sheet.getColumn(4).width = 12; // Novedad

            for (let c = 5; c <= 4 + validSessions.length; c++) {
                sheet.getColumn(c).width = 15;
            }

            sheet.getColumn(5 + validSessions.length).width = 8;
            sheet.getColumn(6 + validSessions.length).width = 8;
            sheet.getColumn(7 + validSessions.length).width = 8;
            sheet.getColumn(8 + validSessions.length).width = 10;

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const prefix = isMonthMode ? `Asistencia_Mes_${selectedMonth?.key || "General"}` : `Asistencia_Semana_${currentWeek?.weekNumber || 1}`;
            a.download = `${prefix}_${groupData.group.name.replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);

            toast.success("Excel generado exitosamente", { id: toastId });
        } catch (exportErr: any) {
            console.error("Error al exportar Excel:", exportErr);
            toast.error("Error al exportar la sábana a Excel", { id: toastId });
        }
    };

    // =========================================================================
    // 9. RENDERIZADO VISUAL
    // =========================================================================

    if (isLoading && !groupData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[450px] p-8 gap-4 bg-card rounded-3xl border border-border/80 shadow-xs animate-in fade-in duration-300">
                <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center animate-pulse">
                        <CalendarDays className="w-8 h-8 text-primary animate-bounce" />
                    </div>
                </div>
                <div className="text-center space-y-1">
                    <h3 className="text-base font-extrabold text-foreground">
                        Cargando Sábana de Asistencia Semanal y Mensual...
                    </h3>
                    <p className="text-xs text-muted-foreground max-w-sm">
                        Consultando programación de materias, instructores y asistencia consolidada de la ficha en la base de datos.
                    </p>
                </div>
            </div>
        );
    }

    if (error && !groupData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[350px] p-8 gap-4 bg-card rounded-3xl border border-destructive/30 text-center">
                <AlertCircle className="w-12 h-12 text-destructive" />
                <div className="space-y-1">
                    <h3 className="text-base font-black text-foreground">Error al cargar la asistencia</h3>
                    <p className="text-xs text-muted-foreground max-w-md">{error}</p>
                </div>
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => loadGroupData(selectedGroupId, true)}
                    className="rounded-xl font-bold gap-2 text-xs"
                >
                    <RefreshCw className="w-3.5 h-3.5" /> Reintentar Consulta
                </Button>
            </div>
        );
    }

    if (!groupData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[350px] p-8 gap-4 bg-card rounded-3xl border border-border text-center">
                <CalendarDays className="w-12 h-12 text-muted-foreground/50" />
                <p className="text-sm font-semibold text-muted-foreground">
                    Abre esta pestaña para consultar la asistencia consolidada de la ficha.
                </p>
            </div>
        );
    }

    return (
        <TooltipProvider>
            <div 
                ref={fullscreenContainerRef}
                className={cn(
                    "w-full space-y-5 animate-in fade-in-50 duration-200 transition-all",
                    isFullscreen && "fixed inset-0 z-50 bg-background text-foreground p-4 sm:p-6 overflow-y-auto h-screen w-screen m-0"
                )}
            >
                {/* ── AGRUPACIÓN POR HORARIO ACTUAL Y CONTROLES DE VISTA / EXPORTACIÓN ── */}
                <div className="bg-card border border-border/80 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-black uppercase text-muted-foreground flex items-center gap-1.5 mr-1">
                            <Layers className="w-3.5 h-3.5 text-primary" />
                            PERÍODO HORARIO:
                        </span>

                        {/* Botón Horario Actual */}
                        {groupData.currentSchedule && (
                            <Button
                                type="button"
                                size="sm"
                                variant={selectedScheduleMode === "current" ? "default" : "outline"}
                                onClick={() => setSelectedScheduleMode("current")}
                                className={cn(
                                    "h-8 text-xs font-black rounded-xl gap-1.5 transition-all",
                                    selectedScheduleMode === "current"
                                        ? "bg-primary text-primary-foreground shadow-xs ring-2 ring-primary/25"
                                        : "border-border text-foreground hover:bg-primary/10"
                                )}
                            >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Horario Actual ({groupData.currentSchedule.name})</span>
                                <Badge variant="secondary" className="text-[10px] py-0 px-1.5 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 ml-1">
                                    Vigente
                                </Badge>
                            </Button>
                        )}

                        {/* Botón / Selector de Horarios Anteriores */}
                        {groupData.pastSchedules.length > 0 && (
                            <div className="flex items-center gap-1.5">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={selectedScheduleMode === "past" ? "default" : "outline"}
                                    onClick={() => setSelectedScheduleMode("past")}
                                    className={cn(
                                        "h-8 text-xs font-black rounded-xl gap-1.5 transition-all",
                                        selectedScheduleMode === "past"
                                            ? "bg-slate-800 text-white shadow-xs dark:bg-slate-700"
                                            : "border-border text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                                    )}
                                >
                                    <History className="w-3.5 h-3.5 text-amber-500" />
                                    <span>Horarios Anteriores ({groupData.pastSchedules.length})</span>
                                </Button>

                                {selectedScheduleMode === "past" && (
                                    <Select
                                        value={selectedPastScheduleId}
                                        onValueChange={(val) => setSelectedPastScheduleId(val)}
                                    >
                                        <SelectTrigger className="h-8 text-xs font-bold rounded-xl border-border bg-background w-[220px]">
                                            <SelectValue placeholder="Seleccionar horario histórico" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl shadow-md border-border">
                                            {groupData.pastSchedules.map(ps => (
                                                <SelectItem key={ps.id} value={ps.id} className="text-xs font-semibold">
                                                    {ps.name} ({formatCalendarDate(ps.startDate, "MMM yyyy")})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                        )}

                        {/* Rango de Fechas del Horario Seleccionado */}
                        {activeSchedule && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1.5 shrink-0 bg-muted/40 px-3 py-1.5 rounded-xl border border-border/60">
                                <Clock className="w-3.5 h-3.5 text-primary" />
                                <span>Vigencia:</span>
                                <strong className="text-foreground">
                                    {formatCalendarDate(activeSchedule.startDate, "d MMM yyyy")} al {formatCalendarDate(activeSchedule.endDate, "d MMM yyyy")}
                                </strong>
                            </div>
                        )}
                    </div>

                    {/* Controles de Acción Rápida (Semana/Mes, Actualizar, Exportar) */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto justify-start sm:justify-end">
                        {/* ALTERNADOR DE VISTA: SEMANA / MES */}
                        <div className="flex items-center gap-1 bg-background/90 dark:bg-card/90 p-1 rounded-2xl border border-border/80 shadow-2xs">
                            <Button
                                type="button"
                                size="sm"
                                variant={viewMode === "week" ? "default" : "ghost"}
                                onClick={() => setViewMode("week")}
                                className={cn(
                                    "h-8 px-3 text-xs font-black rounded-xl transition-all gap-1.5",
                                    viewMode === "week"
                                        ? "bg-primary text-primary-foreground shadow-xs"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                )}
                            >
                                <Calendar className="w-3.5 h-3.5" />
                                <span>Semana</span>
                            </Button>

                            <Button
                                type="button"
                                size="sm"
                                variant={viewMode === "month" ? "default" : "ghost"}
                                onClick={() => setViewMode("month")}
                                className={cn(
                                    "h-8 px-3 text-xs font-black rounded-xl transition-all gap-1.5",
                                    viewMode === "month"
                                        ? "bg-primary text-primary-foreground shadow-xs"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                )}
                            >
                                <CalendarRange className="w-3.5 h-3.5" />
                                <span>Mes</span>
                            </Button>
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleRefresh}
                            disabled={isLoading}
                            className="h-8 px-3 rounded-xl border-border bg-background/80 hover:bg-muted text-xs font-bold gap-1.5 shadow-2xs cursor-pointer"
                            title="Actualizar datos desde la base de datos"
                        >
                            <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin text-primary")} />
                            <span>{isLoading ? "Consultando..." : "Actualizar"}</span>
                        </Button>

                        <Button
                            type="button"
                            variant="default"
                            size="sm"
                            onClick={handleExportExcel}
                            className="h-8 px-3.5 rounded-xl text-xs font-black gap-2 shadow-xs bg-emerald-100 hover:bg-emerald-200/90 text-emerald-900 border border-emerald-300/80 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-700/60 cursor-pointer transition-all"
                        >
                            <FileSpreadsheet className="w-4 h-4" />
                            <span>Exportar {viewMode === "month" ? "Mes" : "Semana"}</span>
                        </Button>

                        {/* Botón de Pantalla Completa */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={toggleFullscreen}
                                    className={cn(
                                        "h-8 px-3 rounded-xl border-border bg-background/80 hover:bg-muted text-xs font-bold gap-1.5 shadow-2xs cursor-pointer transition-all",
                                        isFullscreen && "bg-primary text-primary-foreground hover:bg-primary/90 border-primary shadow-xs"
                                    )}
                                >
                                    {isFullscreen ? (
                                        <>
                                            <Minimize2 className="w-3.5 h-3.5" />
                                            <span>Restaurar</span>
                                        </>
                                    ) : (
                                        <>
                                            <Maximize2 className="w-3.5 h-3.5 text-primary" />
                                            <span>Pantalla Completa</span>
                                        </>
                                    )}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs">
                                {isFullscreen ? "Salir de pantalla completa (Esc)" : "Ampliar vista de asistencia a pantalla completa"}
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </div>

                {/* ── BARRA DE NAVEGACIÓN TEMPORAL (SEMANAL O MENSUAL) ── */}
                <div className="bg-card border border-border/80 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    
                    {/* MODO SEMANA */}
                    {viewMode === "week" && weeks.length > 0 && currentWeek && (
                        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                            <div className="flex items-center gap-1.5 shrink-0">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={selectedWeekIndex <= 0}
                                    onClick={() => setSelectedWeekIndex(prev => Math.max(0, prev - 1))}
                                    className="h-8 w-8 p-0 rounded-xl border-border shrink-0"
                                    title="Semana anterior"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={selectedWeekIndex >= weeks.length - 1}
                                    onClick={() => setSelectedWeekIndex(prev => Math.min(weeks.length - 1, prev + 1))}
                                    className="h-8 w-8 p-0 rounded-xl border-border shrink-0"
                                    title="Semana siguiente"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>

                            <div className="flex items-center gap-2 flex-1 sm:flex-initial min-w-[200px] max-w-full">
                                <Select
                                    value={String(selectedWeekIndex)}
                                    onValueChange={(val) => setSelectedWeekIndex(Number(val))}
                                >
                                    <SelectTrigger className="h-8 text-xs font-black rounded-xl border-border bg-background w-full sm:w-[260px] min-w-0">
                                        <Calendar className="w-3.5 h-3.5 mr-1 text-primary shrink-0" />
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl shadow-md border-border max-h-[300px]">
                                        {weeks.map((w, idx) => (
                                            <SelectItem key={idx} value={String(idx)} className="text-xs font-semibold">
                                                Semana {w.weekNumber} ({formatCalendarDate(w.startDateStr, "d MMM")} — {formatCalendarDate(w.endDateStr, "d MMM")})
                                                {w.isCurrentWeek && " • [Semana Actual]"}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {currentWeek.isCurrentWeek && (
                                    <Badge variant="secondary" className="text-[10px] font-black py-0.5 px-2 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-lg shrink-0">
                                        Esta Semana
                                    </Badge>
                                )}
                            </div>
                        </div>
                    )}

                    {/* MODO MES */}
                    {viewMode === "month" && months.length > 0 && selectedMonth && (
                        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                            {(() => {
                                const currentMonthIdx = months.findIndex(m => m.key === selectedMonthKey);
                                const hasPrev = currentMonthIdx > 0;
                                const hasNext = currentMonthIdx < months.length - 1;

                                return (
                                    <>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                disabled={!hasPrev}
                                                onClick={() => {
                                                    if (hasPrev) setSelectedMonthKey(months[currentMonthIdx - 1].key);
                                                }}
                                                className="h-8 w-8 p-0 rounded-xl border-border shrink-0"
                                                title="Mes anterior"
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                disabled={!hasNext}
                                                onClick={() => {
                                                    if (hasNext) setSelectedMonthKey(months[currentMonthIdx + 1].key);
                                                }}
                                                className="h-8 w-8 p-0 rounded-xl border-border shrink-0"
                                                title="Mes siguiente"
                                            >
                                                <ChevronRight className="w-4 h-4" />
                                            </Button>
                                        </div>

                                        <div className="flex items-center gap-2 flex-1 sm:flex-initial min-w-[200px] max-w-full">
                                            <Select
                                                value={selectedMonthKey}
                                                onValueChange={(val) => setSelectedMonthKey(val)}
                                            >
                                                <SelectTrigger className="h-8 text-xs font-black rounded-xl border-border bg-background w-full sm:w-[200px] min-w-0">
                                                    <CalendarDays className="w-3.5 h-3.5 mr-1 text-primary shrink-0" />
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl shadow-md border-border">
                                                    {months.map(m => (
                                                        <SelectItem key={m.key} value={m.key} className="text-xs font-semibold">
                                                            {m.label} {m.isCurrentMonth && " • [Mes Actual]"}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>

                                            {selectedMonth.isCurrentMonth && (
                                                <Badge variant="secondary" className="text-[10px] font-black py-0.5 px-2 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-lg shrink-0">
                                                    Mes Actual
                                                </Badge>
                                            )}

                                            <Badge variant="outline" className="text-[10px] font-bold py-0.5 px-2 bg-muted/60 rounded-lg border-border shrink-0 hidden sm:inline-flex">
                                                {allMonthSessions.length} clases
                                            </Badge>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    )}

                    {/* Barra de Búsqueda, Filtro de Estado y Switch de Encabezado Compacto */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto flex-wrap">
                        <div className="relative w-full sm:w-56">
                            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <Input
                                type="text"
                                placeholder="Buscar por nombre o documento..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="h-8 pl-8 text-xs rounded-xl border-border bg-background w-full"
                            />
                        </div>

                        <Select
                            value={statusFilter}
                            onValueChange={(val: any) => setStatusFilter(val)}
                        >
                            <SelectTrigger className="h-8 text-xs font-bold rounded-xl border-border bg-background w-full sm:w-[160px]">
                                <Filter className="w-3.5 h-3.5 mr-1 text-primary shrink-0" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl shadow-md border-border">
                                <SelectItem value="ALL" className="text-xs">Todos los aprendices</SelectItem>
                                <SelectItem value="WITH_ABSENCES" className="text-xs">Con inasistencias</SelectItem>
                                <SelectItem value="WITH_LATES" className="text-xs">Con retardos</SelectItem>
                                <SelectItem value="PERFECT" className="text-xs">100% Asistencia</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Switch para Encabezado Compacto (Días abreviados) */}
                        <div className="flex items-center gap-2 bg-background px-3 py-1 rounded-xl border border-border/80 shadow-2xs h-8 shrink-0 w-full sm:w-auto justify-between sm:justify-start">
                            <Switch
                                id="compact-headers-switch"
                                checked={compactHeaders}
                                onCheckedChange={(checked) => {
                                    setCompactHeaders(checked);
                                    try {
                                        localStorage.setItem("attendance_compact_headers", String(checked));
                                    } catch {}
                                }}
                                className="scale-75 cursor-pointer data-[state=checked]:bg-primary"
                            />
                            <label
                                htmlFor="compact-headers-switch"
                                className="text-[11px] font-bold text-muted-foreground cursor-pointer select-none whitespace-nowrap"
                                title="Oculta materias e instructores de la cabecera y deja solo los nombres de los días abreviados con tooltip"
                            >
                                Días abreviados
                            </label>
                        </div>
                    </div>
                </div>

                {/* ── TABLA PRINCIPAL: SÁBANA MULTIGRUPO (SEMANAL O MENSUAL) ── */}
                <Card className="border border-border/80 shadow-md rounded-3xl overflow-hidden bg-card p-0 gap-0">
                    {/* Indicador de ayuda táctil en móviles */}
                    <div className="md:hidden px-3.5 py-2 bg-primary/5 border-b border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1 font-medium text-foreground">
                            <ChevronLeft className="w-3.5 h-3.5 text-primary animate-pulse" />
                            Desliza para explorar todas las sesiones
                            <ChevronRight className="w-3.5 h-3.5 text-primary animate-pulse" />
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground/80 font-bold">
                            {activeSessions.length} ses.
                        </span>
                    </div>

                    <CardContent className="p-0">
                        <div 
                            className="overflow-x-auto overflow-y-hidden w-full max-w-full overscroll-x-contain overscroll-y-auto scrollbar-thin"
                            style={{ 
                                WebkitOverflowScrolling: "touch", 
                                touchAction: "pan-x pan-y",
                                overscrollBehaviorX: "contain",
                                overscrollBehaviorY: "auto"
                            }}
                        >
                            <table className="w-full border-collapse text-left text-xs">
                                <thead>
                                    {compactHeaders ? (
                                        /* ── MODO COMPACTO: SOLO DÍAS ABREVIADOS CON TOOLTIP DE SHADCN ── */
                                        <tr className="bg-muted border-b border-border/80">
                                            <th 
                                                className="p-2 sm:p-2.5 text-left font-black text-muted-foreground uppercase text-[11px] border-r border-border/60 min-w-[160px] md:min-w-[220px] bg-muted md:sticky md:left-0 md:z-20 md:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="w-5 sm:w-6 text-center font-mono text-[10px] text-muted-foreground/80 shrink-0">#</span>
                                                    <span className="font-black text-foreground">Aprendiz</span>
                                                </div>
                                            </th>

                                            {activeSessions.length === 0 ? (
                                                <th className="p-3 text-center text-muted-foreground italic font-normal">
                                                    No hay sesiones programadas en este período.
                                                </th>
                                            ) : (
                                                activeSessions.map((session, sIdx) => {
                                                    const isEmpty = session.courseId.startsWith("empty-");
                                                    const isToday = session.dayMeta.dateStr === getTodayColombianDate();
                                                    const dayShort = session.dayMeta.shortDay || DAY_LABELS[session.dayOfWeekKey]?.short || "";
                                                    const dateFormatted = session.dayMeta.formattedDate || "";

                                                    return (
                                                        <th
                                                            key={`compact_${session.dayOfWeekKey}_${session.dateStr}_${sIdx}`}
                                                            className={cn(
                                                                "p-1.5 sm:p-2 text-center border-r border-border/60 align-middle min-w-[65px] sm:min-w-[85px] transition-colors select-none",
                                                                isToday ? "bg-primary/15 text-primary border-primary/30" : "bg-muted hover:bg-muted/80 text-foreground"
                                                            )}
                                                        >
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <div className="flex flex-col items-center justify-center cursor-pointer group py-0.5">
                                                                        <div className="flex items-center justify-center gap-1">
                                                                            <span className={cn(
                                                                                "font-black text-xs uppercase tracking-tight",
                                                                                isToday ? "text-primary font-black" : "text-foreground group-hover:text-primary transition-colors"
                                                                            )}>
                                                                                {dayShort}
                                                                            </span>
                                                                            {isToday && (
                                                                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                                                                            )}
                                                                        </div>
                                                                        <span className={cn(
                                                                            "font-mono text-[10px] font-bold leading-none mt-0.5",
                                                                            isToday ? "text-primary/90" : "text-muted-foreground"
                                                                        )}>
                                                                            {dateFormatted}
                                                                        </span>
                                                                    </div>
                                                                </TooltipTrigger>
                                                                <TooltipContent side="top" className="p-3 max-w-xs space-y-2 bg-popover text-popover-foreground border border-border shadow-xl rounded-xl z-50 text-left">
                                                                    <div className="font-extrabold text-xs text-foreground flex items-center gap-1.5 border-b border-border/60 pb-1.5">
                                                                        <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                                                                        <span>{session.dayMeta.dayName || dayShort}, {dateFormatted}</span>
                                                                        {isToday && (
                                                                            <Badge variant="secondary" className="text-[9px] py-0 px-1.5 bg-primary/20 text-primary ml-auto font-bold">
                                                                                Hoy
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                    {isEmpty ? (
                                                                        <div className="text-xs text-muted-foreground italic py-1">
                                                                            Sin sesiones programadas este día.
                                                                        </div>
                                                                    ) : (
                                                                        <div className="space-y-1.5 text-xs">
                                                                            <div className="font-bold text-foreground flex items-start gap-1.5">
                                                                                <BookOpen className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                                                                                <span className="leading-snug">{session.courseTitle}</span>
                                                                            </div>
                                                                            <div className="text-muted-foreground flex items-center gap-1.5">
                                                                                <GraduationCap className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                                                                <span>Instructor: <strong className="text-foreground">{session.teacherName}</strong></span>
                                                                            </div>
                                                                            <div className="text-muted-foreground flex items-center gap-1.5 font-mono text-[11px]">
                                                                                <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                                                                <span>{session.startTime} - {session.endTime}</span>
                                                                            </div>
                                                                            {session.environmentName && (
                                                                                <div className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
                                                                                    <Building className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                                                                    <span>Ambiente: <strong className="text-foreground">{session.environmentName}</strong></span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </th>
                                                    );
                                                })
                                            )}

                                            {/* Columnas de Resumen */}
                                            <th className="p-1.5 sm:p-2 text-center font-black text-muted-foreground uppercase text-[11px] border-l border-border/60 w-16 bg-muted/60">
                                                Asist.
                                            </th>
                                            <th className="p-1.5 sm:p-2 text-center font-black text-muted-foreground uppercase text-[11px] border-l border-border/60 w-16 bg-muted/60">
                                                Fallas
                                            </th>
                                            <th className="p-1.5 sm:p-2 text-center font-black text-muted-foreground uppercase text-[11px] border-l border-border/60 w-16 bg-muted/60">
                                                Tardes
                                            </th>
                                            <th className="p-1.5 sm:p-2 text-center font-black text-muted-foreground uppercase text-[11px] border-l border-border/60 w-20 bg-muted/60">
                                                % Cumpl.
                                            </th>
                                        </tr>
                                    ) : (
                                        /* ── MODO COMPLETO: 2 FILAS CON DÍAS Y MATERIAS DETALLADAS ── */
                                        <>
                                            <tr className="bg-muted border-b border-border/80">
                                                <th 
                                                    rowSpan={2} 
                                                    className="p-2 sm:p-3 text-left font-black text-muted-foreground uppercase text-[11px] border-r border-border/60 min-w-[160px] md:min-w-[220px] bg-muted md:sticky md:left-0 md:z-20 md:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-5 sm:w-6 text-center font-mono text-[10px] text-muted-foreground/80 shrink-0">#</span>
                                                        <span className="font-black text-foreground">Aprendiz</span>
                                                    </div>
                                                </th>

                                                {/* Columnas de sesiones (semanales o mensuales) */}
                                                {viewMode === "week" ? (
                                                    currentWeek?.days.map(day => {
                                                        const daySessions = weekClassesByDay.get(day.dayOfWeekKey) || [];
                                                        const colSpan = Math.max(1, daySessions.length);

                                                        return (
                                                            <th
                                                                key={day.dayOfWeekKey}
                                                                colSpan={colSpan}
                                                                className={cn(
                                                                    "p-2 text-center font-black text-xs border-r border-border/60 uppercase tracking-wide",
                                                                    day.dateStr === getTodayColombianDate()
                                                                        ? "bg-primary/15 text-primary border-primary/30"
                                                                        : "text-foreground"
                                                                )}
                                                            >
                                                                <div className="flex items-center justify-center gap-1.5">
                                                                    <span>{day.dayName}</span>
                                                                    <span className="font-mono text-[11px] font-bold text-muted-foreground">
                                                                        {day.formattedDate}
                                                                    </span>
                                                                    {day.dateStr === getTodayColombianDate() && (
                                                                        <span className="inline-block w-2 h-2 rounded-full bg-primary animate-ping" />
                                                                    )}
                                                                </div>
                                                            </th>
                                                        );
                                                    })
                                                ) : (
                                                    /* MODO MES: encabezado agrupador */
                                                    <th
                                                        colSpan={Math.max(1, allMonthSessions.length)}
                                                        className="p-2.5 text-center font-black text-xs border-r border-border/60 uppercase tracking-wide bg-primary/10 text-primary"
                                                    >
                                                        <div className="flex items-center justify-center gap-2">
                                                            <CalendarRange className="w-4 h-4 text-primary" />
                                                            <span>CLASES Y SESIONES DEL MES: {selectedMonth?.label}</span>
                                                            <Badge variant="secondary" className="text-[10px] py-0 px-2 bg-primary/20 text-primary font-mono">
                                                                {allMonthSessions.length} Sesiones
                                                            </Badge>
                                                        </div>
                                                    </th>
                                                )}

                                                {/* Columnas de Resumen */}
                                                <th 
                                                    rowSpan={2} 
                                                    className="p-2 text-center font-black text-muted-foreground uppercase text-[11px] border-l border-border/60 w-16 bg-muted/60"
                                                >
                                                    Asist.
                                                </th>
                                                <th 
                                                    rowSpan={2} 
                                                    className="p-2 text-center font-black text-muted-foreground uppercase text-[11px] border-l border-border/60 w-16 bg-muted/60"
                                                >
                                                    Fallas
                                                </th>
                                                <th 
                                                    rowSpan={2} 
                                                    className="p-2 text-center font-black text-muted-foreground uppercase text-[11px] border-l border-border/60 w-16 bg-muted/60"
                                                >
                                                    Tardes
                                                </th>
                                                <th 
                                                    rowSpan={2} 
                                                    className="p-2 text-center font-black text-muted-foreground uppercase text-[11px] border-l border-border/60 w-20 bg-muted/60"
                                                >
                                                    % Cumpl.
                                                </th>
                                            </tr>

                                            {/* Fila 2: Materias e Instructores de cada sesión */}
                                            <tr className="bg-muted/80 border-b border-border/80">
                                                {activeSessions.length === 0 ? (
                                                    <th className="p-3 text-center text-muted-foreground italic font-normal">
                                                        No hay sesiones programadas en este período.
                                                    </th>
                                                ) : (
                                                    activeSessions.map((session, sIdx) => {
                                                        const isEmpty = session.courseId.startsWith("empty-");

                                                        return (
                                                            <th
                                                                key={`${session.dayOfWeekKey}_${session.dateStr}_${sIdx}`}
                                                                className={cn(
                                                                    "p-2 sm:p-2.5 border-r border-border/60 text-center align-top min-w-[150px] sm:min-w-[185px]",
                                                                    session.dayMeta.dateStr === getTodayColombianDate() && "bg-primary/5"
                                                                )}
                                                            >
                                                                {isEmpty ? (
                                                                    <span className="text-[11px] font-semibold text-muted-foreground/60 italic">
                                                                        Sin sesiones
                                                                    </span>
                                                                ) : (
                                                                    <div className="space-y-1">
                                                                        {/* En vista mensual, destacar el día y la fecha de cada columna */}
                                                                        {viewMode === "month" && (
                                                                            <div className="text-[10px] font-black uppercase text-primary/80 flex items-center justify-center gap-1 border-b border-border/50 pb-1">
                                                                                <span>{session.dayMeta.shortDay}</span>
                                                                                <span>{session.dayMeta.formattedDate}</span>
                                                                            </div>
                                                                        )}
                                                                        <span 
                                                                            className="font-bold text-foreground text-[11px] sm:text-xs line-clamp-2 block leading-snug"
                                                                            title={session.courseTitle}
                                                                        >
                                                                            {session.courseTitle}
                                                                        </span>
                                                                        <div className="flex items-center justify-center gap-1 text-[10px] sm:text-[11px] text-primary font-semibold">
                                                                            <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                                                                            <span className="line-clamp-1 break-words" title={`Instructor: ${session.teacherName}`}>
                                                                                {session.teacherName}
                                                                            </span>
                                                                        </div>
                                                                        <div className="text-[9px] sm:text-[10px] font-mono text-muted-foreground">
                                                                            {session.startTime} - {session.endTime}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </th>
                                                        );
                                                    })
                                                )}
                                            </tr>
                                        </>
                                    )}
                                </thead>

                                <tbody className="divide-y divide-border/60">
                                    {filteredStudents.length === 0 ? (
                                        <tr>
                                            <td 
                                                colSpan={Math.max(1, activeSessions.length) + 5}
                                                className="p-8 text-center text-muted-foreground font-medium"
                                            >
                                                No se encontraron aprendices con los filtros seleccionados.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredStudents.map((st, idx) => (
                                            <tr 
                                                key={st.id} 
                                                className="hover:bg-muted/40 transition-colors group"
                                            >
                                                {/* Columna Aprendiz con número de orden */}
                                                <td className="p-2 sm:p-2.5 border-r border-border/60 bg-card group-hover:bg-muted/50 transition-colors min-w-[160px] md:min-w-[220px] md:sticky md:left-0 md:z-10 md:bg-card md:group-hover:bg-muted md:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                                    <div className="flex items-center gap-2 sm:gap-2.5">
                                                        <span className="w-5 sm:w-6 text-center font-mono font-bold text-muted-foreground text-[10px] sm:text-[11px] shrink-0">
                                                            {idx + 1}
                                                        </span>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="font-extrabold text-foreground text-xs leading-tight whitespace-nowrap sm:whitespace-normal" title={formatName(st.name)}>
                                                                {formatName(st.name)}
                                                            </span>
                                                            <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5">
                                                                <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                                                                    {st.profile?.identificacion || "S/D"}
                                                                </span>
                                                                {st.profile?.novedad && (
                                                                    <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0">
                                                                        {st.profile.novedad}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Celdas de Asistencia por Sesión */}
                                                {activeSessions.length === 0 ? (
                                                    <td className="p-2 text-center text-muted-foreground/50 italic">
                                                        -
                                                    </td>
                                                ) : (
                                                    activeSessions.map((session, sIdx) => {
                                                        if (session.courseId.startsWith("empty-")) {
                                                            return (
                                                                <td 
                                                                    key={`${session.dayOfWeekKey}_${session.dateStr}_${sIdx}`}
                                                                    className="p-2 text-center border-r border-border/60 text-muted-foreground/40 font-mono"
                                                                >
                                                                    -
                                                                </td>
                                                            );
                                                        }

                                                        const key = `${st.id}_${session.courseId}_${session.dateStr}`;
                                                        const rec = attendanceMap.get(key);
                                                        const isToday = session.dateStr === getTodayColombianDate();

                                                        return (
                                                            <td 
                                                                key={`${session.dayOfWeekKey}_${session.dateStr}_${sIdx}`}
                                                                className={cn(
                                                                    "p-2 text-center border-r border-border/60",
                                                                    isToday && "bg-primary/5"
                                                                )}
                                                            >
                                                                <AttendanceStatusCell
                                                                    record={rec}
                                                                    studentName={st.name}
                                                                    courseTitle={session.courseTitle}
                                                                    teacherName={session.teacherName}
                                                                    dateStr={session.dateStr}
                                                                />
                                                            </td>
                                                        );
                                                    })
                                                )}

                                                {/* Estadísticas de la fila */}
                                                <td className="p-2 text-center font-bold text-emerald-700 dark:text-emerald-300 border-l border-border/60 bg-muted/10 font-bold">
                                                    {st.stats.presentCount}
                                                </td>
                                                <td className="p-2 text-center font-bold text-rose-700 dark:text-rose-300 border-l border-border/60 bg-muted/10 font-bold">
                                                    {st.stats.absentCount > 0 ? (
                                                        <span className="px-1.5 py-0.5 rounded-md bg-rose-100/70 text-rose-800 border border-rose-200/60 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-700/60">
                                                            {st.stats.absentCount}
                                                        </span>
                                                    ) : "0"}
                                                </td>
                                                <td className="p-2 text-center font-bold text-amber-800 dark:text-amber-300 border-l border-border/60 bg-muted/10 font-bold">
                                                    {st.stats.lateCount > 0 ? (
                                                        <span className="px-1.5 py-0.5 rounded-md bg-amber-100/70 text-amber-900 border border-amber-200/60 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700/60">
                                                            {st.stats.lateCount}
                                                        </span>
                                                    ) : "0"}
                                                </td>
                                                <td className="p-2 text-center font-black border-l border-border/60 bg-muted/10">
                                                    <span className={cn(
                                                        "text-[11px] font-black",
                                                        st.stats.attendancePct >= 85 ? "text-emerald-600 dark:text-emerald-400" :
                                                        st.stats.attendancePct >= 70 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"
                                                    )}>
                                                        {st.stats.attendancePct}%
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* ── CONVENCIONES Y GUÍA RÁPIDA ── */}
                <div className="p-3.5 bg-muted/30 border border-border/70 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="font-extrabold text-foreground mr-1">Convenciones:</span>
                        <div className="flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-md bg-emerald-100/70 text-emerald-800 border border-emerald-200/60 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-700/60 font-black flex items-center justify-center text-[10px]">
                                P
                            </span>
                            <span className="text-muted-foreground">Presente</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-md bg-rose-100/70 text-rose-800 border border-rose-200/60 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-700/60 font-black flex items-center justify-center text-[10px]">
                                A
                            </span>
                            <span className="text-muted-foreground">Falla</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-md bg-amber-100/70 text-amber-900 border border-amber-200/60 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700/60 font-black flex items-center justify-center text-[10px]">
                                R
                            </span>
                            <span className="text-muted-foreground">Retardo</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-md bg-sky-100/70 text-sky-900 border border-sky-200/60 dark:bg-sky-950/60 dark:text-sky-200 dark:border-sky-700/60 font-black flex items-center justify-center text-[10px]">
                                S
                            </span>
                            <span className="text-muted-foreground">Retiro Anticipado</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-md bg-muted text-muted-foreground font-black flex items-center justify-center text-[10px]">
                                -
                            </span>
                            <span className="text-muted-foreground">Sin registro</span>
                        </div>
                    </div>

                    <div className="text-[11px] text-muted-foreground italic flex items-center gap-1">
                        <Info className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>Pasa el cursor sobre cualquier celda para consultar los detalles del instructor y justificación.</span>
                    </div>
                </div>

            </div>
        </TooltipProvider>
    );
}

// =============================================================================
// SUBCOMPONENTE DE CELDA DE ASISTENCIA CON TOOLTIP DETALLADO
// =============================================================================
function AttendanceStatusCell({
    record,
    studentName,
    courseTitle,
    teacherName,
    dateStr
}: {
    record?: GroupScheduleAttendanceData["attendances"][0];
    studentName: string;
    courseTitle: string;
    teacherName: string;
    dateStr: string;
}) {
    if (!record) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-md text-[11px] font-bold text-muted-foreground/50 hover:bg-muted/80 transition-colors cursor-default">
                        -
                    </span>
                </TooltipTrigger>
                <TooltipContent className="text-xs p-2.5 max-w-xs space-y-1">
                    <p className="font-bold text-foreground">{studentName}</p>
                    <p className="text-muted-foreground">{courseTitle}</p>
                    <p className="text-primary font-medium">Instructor: {teacherName}</p>
                    <p className="text-[10px] text-muted-foreground/80">{dateStr} • Sin toma de asistencia registrada</p>
                </TooltipContent>
            </Tooltip>
        );
    }

    if (record.status === "PRESENT") {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-md text-[11px] font-black bg-emerald-100/70 text-emerald-800 border border-emerald-200/60 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-700/60 shadow-2xs hover:scale-110 transition-transform cursor-pointer">
                        P
                    </span>
                </TooltipTrigger>
                <TooltipContent className="text-xs p-2.5 max-w-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                        <Check className="w-3.5 h-3.5" />
                        <span>Presente</span>
                    </div>
                    <p className="font-bold text-foreground">{studentName}</p>
                    <p className="text-muted-foreground">{courseTitle}</p>
                    <p className="text-primary font-medium">Instructor: {teacherName}</p>
                    <p className="text-[10px] text-muted-foreground/80">{dateStr}</p>
                </TooltipContent>
            </Tooltip>
        );
    }

    if (record.status === "ABSENT") {
        const hasJustification = Boolean(record.justification || record.justificationUrl);
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className={cn(
                        "inline-flex items-center justify-center w-6 h-6 rounded-md text-[11px] font-black shadow-2xs hover:scale-110 transition-transform cursor-pointer",
                        hasJustification 
                            ? "bg-rose-100/70 text-rose-800 border border-rose-200/60 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-700/60"
                            : "bg-rose-100 hover:bg-rose-200/80 text-rose-800 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-700/60 font-black ring-1 ring-rose-400/25"
                    )}>
                        {hasJustification ? "AJ" : "A"}
                    </span>
                </TooltipTrigger>
                <TooltipContent className="text-xs p-2.5 max-w-xs space-y-1 border-rose-300">
                    <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold">
                        <X className="w-3.5 h-3.5" />
                        <span>{hasJustification ? "Falla Justificada" : "Inasistencia (Falla)"}</span>
                    </div>
                    <p className="font-bold text-foreground">{studentName}</p>
                    <p className="text-muted-foreground">{courseTitle}</p>
                    <p className="text-primary font-medium">Instructor: {teacherName}</p>
                    {record.justification && (
                        <p className="text-xs bg-muted p-1.5 rounded text-foreground italic">
                            Motivo: &quot;{record.justification}&quot;
                        </p>
                    )}
                    <p className="text-[10px] text-muted-foreground/80">{dateStr}</p>
                </TooltipContent>
            </Tooltip>
        );
    }

    if (record.status === "LATE") {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-md text-[11px] font-black bg-amber-100/70 text-amber-900 border border-amber-200/60 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700/60 shadow-2xs hover:scale-110 transition-transform cursor-pointer">
                        R
                    </span>
                </TooltipTrigger>
                <TooltipContent className="text-xs p-2.5 max-w-xs space-y-1 border-amber-300">
                    <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
                        <Clock3 className="w-3.5 h-3.5" />
                        <span>Llegada Tarde (Retardo)</span>
                    </div>
                    <p className="font-bold text-foreground">{studentName}</p>
                    <p className="text-muted-foreground">{courseTitle}</p>
                    <p className="text-primary font-medium">Instructor: {teacherName}</p>
                    {record.arrivalTime && (
                        <p className="text-xs text-muted-foreground">
                            Hora de ingreso: {new Date(record.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    )}
                    <p className="text-[10px] text-muted-foreground/80">{dateStr}</p>
                </TooltipContent>
            </Tooltip>
        );
    }

    if (record.status === "LEAVE_EARLY") {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-md text-[11px] font-black bg-sky-100/70 text-sky-900 border border-sky-200/60 dark:bg-sky-950/60 dark:text-sky-200 dark:border-sky-700/60 shadow-2xs hover:scale-110 transition-transform cursor-pointer">
                        S
                    </span>
                </TooltipTrigger>
                <TooltipContent className="text-xs p-2.5 max-w-xs space-y-1">
                    <p className="font-bold text-indigo-600 dark:text-indigo-400">Retiro Anticipado</p>
                    <p className="font-bold text-foreground">{studentName}</p>
                    <p className="text-muted-foreground">{courseTitle}</p>
                    <p className="text-primary font-medium">Instructor: {teacherName}</p>
                    <p className="text-[10px] text-muted-foreground/80">{dateStr}</p>
                </TooltipContent>
            </Tooltip>
        );
    }

    return null;
}
