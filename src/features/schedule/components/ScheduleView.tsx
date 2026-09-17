"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    ChevronLeft,
    ChevronRight,
    Calendar,
    Clock,
    BookOpen,
    Info,
    Users,
    GraduationCap,
    ExternalLink,
    FileEdit,
    Star,
    Sun,
    Cloud,
    Moon,
    Building,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCalendarDate, getScheduleCalendarYear } from "@/lib/dateUtils";
import { getScheduleViewAction } from "@/features/schedule/actions/scheduleActions";
import { useSession } from "@/lib/auth-client";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
    addDays as addDaysFn,
    addWeeks,
    subWeeks,
    addMonths,
    subMonths,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    format,
    isSameDay,
    getDay,
    startOfDay,
    getDaysInMonth,
} from "date-fns";
import { es } from "date-fns/locale";
import { fromUTC } from "@/lib/dateUtils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

// Day index helpers (0 = Monday, 6 = Sunday)
const DAY_INDEX: Record<string, number> = {
    MONDAY: 0,
    TUESDAY: 1,
    WEDNESDAY: 2,
    THURSDAY: 3,
    FRIDAY: 4,
    SATURDAY: 5,
    SUNDAY: 6,
};

const DAY_NAMES_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const DAY_NAMES_ES_FULL = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const toFormat12h = (t24: string) => {
    if (!t24) return "";
    const [h, m] = t24.split(":").map(Number);
    const ap = h >= 12 ? "p.m." : "a.m.";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ap}`;
};

const formatHour12h = (h24: number) => {
    const ap = h24 >= 12 ? "p.m." : "a.m.";
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return `${h12} ${ap}`;
};

const renderTimeOfDayIcon = (startTime: string, endTime: string) => {
    const [sh] = startTime.split(":").map(Number);
    const [eh] = endTime.split(":").map(Number);
    const midHour = (sh + eh) / 2;

    if (midHour < 12) {
        return (
            <span title="Jornada Mañana" className="inline-flex items-center">
                <Cloud className="w-3.5 h-3.5 text-sky-500 shrink-0" />
            </span>
        );
    } else if (midHour < 18) {
        return (
            <span title="Jornada Tarde" className="inline-flex items-center">
                <Sun className="w-3.5 h-3.5 text-orange-500 shrink-0" />
            </span>
        );
    } else {
        return (
            <span title="Jornada Noche" className="inline-flex items-center">
                <Moon className="w-3.5 h-3.5 text-purple-600 shrink-0" />
            </span>
        );
    }
};

// Paleta de colores consistente y vibrante para las materias
const COURSE_COLORS = [
    "bg-blue-500/15 border-blue-500/40 text-blue-950 dark:text-blue-200 hover:bg-blue-500/25",
    "bg-emerald-500/15 border-emerald-500/40 text-emerald-950 dark:text-emerald-200 hover:bg-emerald-500/25",
    "bg-purple-500/15 border-purple-500/40 text-purple-950 dark:text-purple-200 hover:bg-purple-500/25",
    "bg-amber-500/15 border-amber-500/40 text-amber-950 dark:text-amber-200 hover:bg-amber-500/25",
    "bg-rose-500/15 border-rose-500/40 text-rose-950 dark:text-rose-200 hover:bg-rose-500/25",
    "bg-cyan-500/15 border-cyan-500/40 text-cyan-950 dark:text-cyan-200 hover:bg-cyan-500/25",
    "bg-indigo-500/15 border-indigo-500/40 text-indigo-950 dark:text-indigo-200 hover:bg-indigo-500/25",
    "bg-teal-500/15 border-teal-500/40 text-teal-950 dark:text-teal-200 hover:bg-teal-500/25",
    "bg-fuchsia-500/15 border-fuchsia-500/40 text-fuchsia-950 dark:text-fuchsia-200 hover:bg-fuchsia-500/25",
    "bg-orange-500/15 border-orange-500/40 text-orange-950 dark:text-orange-200 hover:bg-orange-500/25",
];

const DOT_COLORS = [
    "bg-blue-500",
    "bg-emerald-500",
    "bg-purple-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-cyan-500",
    "bg-indigo-500",
    "bg-teal-500",
    "bg-fuchsia-500",
    "bg-orange-500",
];

type ScheduleViewData = NonNullable<Awaited<ReturnType<typeof getScheduleViewAction>>>;
type CourseWithSchedules = ScheduleViewData["courses"][number];

interface ScheduleEvent {
    courseId: string;
    courseTitle: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    colorIndex: number;
    course: CourseWithSchedules;
}

function getWeekDays(weekStart: Date): Date[] {
    return Array.from({ length: 7 }, (_, i) => addDaysFn(weekStart, i));
}

function getMonthDays(monthDate: Date): Date[] {
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);
    const days = getDaysInMonth(monthDate);
    // Start from Monday
    const startDow = (getDay(start) + 6) % 7; // Convert Sunday=0 to Monday=0
    const totalCells = Math.ceil((startDow + days) / 7) * 7;
    return Array.from({ length: totalCells }, (_, i) =>
        addDaysFn(start, i - startDow)
    );
}

export function ScheduleView() {
    const { data: session } = useSession();
    const router = useRouter();
    const [courses, setCourses] = useState<CourseWithSchedules[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [view, setView] = useState<"week" | "month">("week");
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedCourse, setSelectedCourse] = useState<CourseWithSchedules | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [globalDates, setGlobalDates] = useState<{title: string, start: Date | null, end: Date | null}>({title: "", start: null, end: null});
    const [scheduleEvents, setScheduleEvents] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<"schedule" | "events">("schedule");
    const [currentEventIndex, setCurrentEventIndex] = useState(0);

    const [allSchedules, setAllSchedules] = useState<Array<{
        id: string;
        name: string;
        startDate: string | Date;
        endDate: string | Date;
        isActive: boolean;
        isPublished: boolean;
    }>>([]);
    const [currentSchedule, setCurrentSchedule] = useState<{
        id: string;
        name: string;
        startDate: string | Date;
        endDate: string | Date;
        isActive: boolean;
        isPublished: boolean;
    } | null>(null);
    const [selectedScheduleId, setSelectedScheduleId] = useState<string>("");
    const [isDraft, setIsDraft] = useState(false);
    const currentYearStr = new Date().getFullYear().toString();
    const [selectedYear, setSelectedYear] = useState<string>(currentYearStr);

    const getScheduleYear = (s: { name?: string; startDate?: string | Date | null }): string => {
        return getScheduleCalendarYear(s);
    };

    const availableYears = useMemo(() => {
        const yearsSet = new Set<string>();
        const currentYear = new Date().getFullYear().toString();
        yearsSet.add(currentYear);
        allSchedules.forEach(s => {
            yearsSet.add(getScheduleYear(s));
        });
        return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
    }, [allSchedules]);

    const filteredSchedules = useMemo(() => {
        if (selectedYear === "ALL") return allSchedules;
        return allSchedules.filter(s => getScheduleYear(s) === selectedYear);
    }, [allSchedules, selectedYear]);

    const handleYearChange = (year: string) => {
        setSelectedYear(year);
        const filtered = year === "ALL" ? allSchedules : allSchedules.filter(s => getScheduleYear(s) === year);
        if (filtered.length > 0) {
            const active = filtered.find(s => s.isActive)?.id || filtered[0].id;
            setSelectedScheduleId(active);
            loadScheduleData(active);
        }
    };

    const loadScheduleData = (requestedId?: string) => {
        setIsLoading(true);
        getScheduleViewAction(requestedId)
            .then(data => {
                setIsDraft(data.isDraft ?? false);
                setAllSchedules(data.allSchedules || []);
                setCurrentSchedule(data.currentSchedule || null);
                if (data.currentSchedule) {
                    setSelectedScheduleId(data.currentSchedule.id);
                }
                setCourses(data.courses || []);
                const start = data.scheduleStartDate ? fromUTC(data.scheduleStartDate) : null;
                const end = data.scheduleEndDate ? fromUTC(data.scheduleEndDate) : null;
                setGlobalDates({ title: data.scheduleTitle || "", start, end });
                setScheduleEvents(data.events || []);
                
                // Adjust current date if outside bounds
                setCurrentDate(prev => {
                    if (start && startOfDay(prev) < startOfDay(start)) return start;
                    if (end && startOfDay(prev) > startOfDay(end)) return end;
                    return prev;
                });
            })
            .catch(console.error)
            .finally(() => setIsLoading(false));
    };

    useEffect(() => {
        loadScheduleData();
    }, []);

    // Build schedule events with color indices
    const events: ScheduleEvent[] = [];
    courses.forEach((course, idx) => {
        const colorIndex = idx % COURSE_COLORS.length;
        (course.schedules || []).forEach((schedule: any) => {
            events.push({
                courseId: course.id,
                courseTitle: course.title,
                dayOfWeek: schedule.dayOfWeek,
                startTime: schedule.startTime,
                endTime: schedule.endTime,
                colorIndex,
                course: {
                    ...course,
                    teacher: schedule.teacher || course.teacher,
                },
            });
        });
    });

    // Build color map for courses
    const courseColorMap: Record<string, number> = {};
    courses.forEach((c, idx) => {
        courseColorMap[c.id] = idx % COURSE_COLORS.length;
    });

    // Navigation
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = getWeekDays(weekStart);
    const monthDays = getMonthDays(currentDate);
    const today = new Date();

    let canGoBack = true;
    if (globalDates.start) {
        if (view === "week") canGoBack = weekStart > startOfWeek(globalDates.start, { weekStartsOn: 1 });
        else canGoBack = startOfMonth(currentDate) > startOfMonth(globalDates.start);
    }
    
    let canGoForward = true;
    if (globalDates.end) {
        if (view === "week") canGoForward = weekEnd < endOfWeek(globalDates.end, { weekStartsOn: 1 });
        else canGoForward = startOfMonth(currentDate) < startOfMonth(globalDates.end);
    }

    function goBack() {
        if (!canGoBack) return;
        if (view === "week") setCurrentDate(d => subWeeks(d, 1));
        else setCurrentDate(d => subMonths(d, 1));
    }
    function goForward() {
        if (!canGoForward) return;
        if (view === "week") setCurrentDate(d => addWeeks(d, 1));
        else setCurrentDate(d => addMonths(d, 1));
    }
    function goToday() {
        const t = new Date();
        if (globalDates.start && startOfDay(t) < startOfDay(globalDates.start)) setCurrentDate(globalDates.start);
        else if (globalDates.end && startOfDay(t) > startOfDay(globalDates.end)) setCurrentDate(globalDates.end);
        else setCurrentDate(t);
    }

    const sortedEvents = [...scheduleEvents].sort(
        (a, b) => new Date(a.date || a.startDate || 0).getTime() - new Date(b.date || b.startDate || 0).getTime()
    );

    const handleTabChange = (tab: "schedule" | "events") => {
        setActiveTab(tab);
        if (tab === "schedule") {
            setView("week");
            // Reset to current date (or bounded by period) to show current week classes
            const t = new Date();
            if (globalDates.start && startOfDay(t) < startOfDay(globalDates.start)) {
                setCurrentDate(globalDates.start);
            } else if (globalDates.end && startOfDay(t) > startOfDay(globalDates.end)) {
                setCurrentDate(globalDates.end);
            } else {
                setCurrentDate(t);
            }
        } else {
            setView("month");
            if (sortedEvents.length > 0 && (sortedEvents[0]?.date || sortedEvents[0]?.startDate)) {
                const firstDate = fromUTC(sortedEvents[0].date || sortedEvents[0].startDate);
                setCurrentDate(firstDate);
            } else if (globalDates.start) {
                setCurrentDate(globalDates.start);
            }
        }
    };

    function goPrevEvent() {
        if (currentEventIndex > 0) {
            const newIdx = currentEventIndex - 1;
            setCurrentEventIndex(newIdx);
            setCurrentDate(fromUTC(sortedEvents[newIdx].date || sortedEvents[newIdx].startDate));
        }
    }

    function goNextEvent() {
        if (currentEventIndex < sortedEvents.length - 1) {
            const newIdx = currentEventIndex + 1;
            setCurrentEventIndex(newIdx);
            setCurrentDate(fromUTC(sortedEvents[newIdx].date || sortedEvents[newIdx].startDate));
        }
    }

    // Get events for a specific day
    function getEventsForDay(date: Date): ScheduleEvent[] {
        const dow = (getDay(date) + 6) % 7; // Monday=0
        const dayName = Object.keys(DAY_INDEX).find(k => DAY_INDEX[k] === dow);
        if (!dayName) return [];
        return events.filter(e => e.dayOfWeek === dayName);
    }

    // Header label
    const headerLabel =
        view === "week"
            ? `${format(weekStart, "d MMM", { locale: es })} – ${format(weekEnd, "d MMM yyyy", { locale: es })}`
            : format(currentDate, "MMMM yyyy", { locale: es });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <LoadingSpinner />
            </div>
        );
    }

    const noSchedules = activeTab === "schedule" ? events.length === 0 : scheduleEvents.length === 0;

    // Calculate grid start and end hours dynamically based on classes and events
    let minHour = 6;
    let maxHour = 20;

    courses.forEach(c => {
        (c.schedules || []).forEach((s: any) => {
            if (s.startTime) {
                const hour = parseInt(s.startTime.split(":")[0], 10);
                if (hour < minHour) minHour = hour;
            }
            if (s.endTime) {
                const hour = Math.ceil(parseFloat(s.endTime.split(":")[0]) + parseFloat(s.endTime.split(":")[1])/60);
                if (hour > maxHour) maxHour = hour;
            }
        });
    });

    scheduleEvents.forEach((e: any) => {
        if (e.startTime) {
            const hour = parseInt(e.startTime.split(":")[0], 10);
            if (hour < minHour) minHour = hour;
        }
        if (e.endTime) {
            const hour = Math.ceil(parseFloat(e.endTime.split(":")[0]) + parseFloat(e.endTime.split(":")[1])/60);
            if (hour > maxHour) maxHour = hour;
        }
    });

    minHour = Math.max(0, Math.min(minHour, 6));
    maxHour = Math.min(24, Math.max(maxHour, 20));
    const gridHoursLength = maxHour - minHour;

    // Calculate teacher hours
    let weeklyHoursStr = "0";
    let periodHoursStr = "0";
    let execWeeklyStr = "0";
    let execPeriodStr = "0";
    
    if (session?.user?.role === "teacher") {
        let weeklyMinutes = 0;
        const dailyMinutes: Record<string, number> = { MONDAY: 0, TUESDAY: 0, WEDNESDAY: 0, THURSDAY: 0, FRIDAY: 0, SATURDAY: 0, SUNDAY: 0 };
        
        courses.forEach(course => {
            (course.schedules || []).forEach((schedule: any) => {
                const [sh, sm] = schedule.startTime.split(":").map(Number);
                const [eh, em] = schedule.endTime.split(":").map(Number);
                const mins = (eh * 60 + em) - (sh * 60 + sm);
                weeklyMinutes += mins;
                if (schedule.dayOfWeek in dailyMinutes) {
                    dailyMinutes[schedule.dayOfWeek] += mins;
                }
            });
        });
        
        const weeklyHours = weeklyMinutes / 60;
        weeklyHoursStr = weeklyHours.toFixed(1).replace(".0", "");
        
        let execPeriodMins = 0;
        if (globalDates.start && globalDates.end) {
            const diffTime = Math.abs(globalDates.end.getTime() - globalDates.start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            const weeks = diffDays / 7;
            periodHoursStr = (weeklyHours * weeks).toFixed(1).replace(".0", "");
            
            // Calculate executed period
            const startCalc = startOfDay(globalDates.start);
            const endCalc = startOfDay(today) > startOfDay(globalDates.end) ? startOfDay(globalDates.end) : startOfDay(today);
            let d = startCalc;
            while (d < endCalc) {
                const dow = (getDay(d) + 6) % 7;
                const dayName = Object.keys(DAY_INDEX).find(k => DAY_INDEX[k] === dow);
                if (dayName) execPeriodMins += dailyMinutes[dayName];
                d = addDaysFn(d, 1);
            }
        }
        
        execPeriodStr = (execPeriodMins / 60).toFixed(1).replace(".0", "");
        
        // Calculate executed weekly
        let execWeeklyMins = 0;
        const weekStart = startOfWeek(today, { weekStartsOn: 1 });
        let dw = weekStart;
        while (dw < startOfDay(today)) {
            if ((!globalDates.start || dw >= startOfDay(globalDates.start)) && (!globalDates.end || dw <= startOfDay(globalDates.end))) {
                const dow = (getDay(dw) + 6) % 7;
                const dayName = Object.keys(DAY_INDEX).find(k => DAY_INDEX[k] === dow);
                if (dayName) execWeeklyMins += dailyMinutes[dayName];
            }
            dw = addDaysFn(dw, 1);
        }
        execWeeklyStr = (execWeeklyMins / 60).toFixed(1).replace(".0", "");
    }

    // Calculate global period progress percentage
    let periodProgress = 0;
    if (globalDates.start && globalDates.end) {
        const totalTime = globalDates.end.getTime() - globalDates.start.getTime();
        const passedTime = today.getTime() - globalDates.start.getTime();
        if (passedTime < 0) {
            periodProgress = 0;
        } else if (passedTime > totalTime) {
            periodProgress = 100;
        } else {
            periodProgress = (passedTime / totalTime) * 100;
        }
    }

    return (
        <TooltipProvider delayDuration={200}>
            <div className="flex-1 flex flex-col gap-4 focus-visible:outline-none">
                {/* Unified Control Toolbar Card */}
                <div className="bg-card/90 dark:bg-card/60 backdrop-blur-xl border border-border/80 rounded-3xl p-3.5 sm:p-4 shadow-sm flex flex-col gap-3">
                    {/* Row 1: Mode [Horario | Eventos] (Full width on mobile, inline on desktop) */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        {/* Mode Segmented Control: Horario vs Eventos */}
                        <div className="grid grid-cols-2 sm:inline-flex bg-muted/60 p-1 rounded-2xl border border-border/70 shadow-2xs w-full sm:w-auto">
                            <button
                                type="button"
                                onClick={() => handleTabChange("schedule")}
                                className={cn(
                                    "flex items-center justify-center gap-1.5 px-4 py-2 sm:py-1.5 rounded-xl text-xs font-bold transition-all duration-200",
                                    activeTab === "schedule"
                                        ? "bg-background text-foreground shadow-xs"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                                <span>Horario</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleTabChange("events")}
                                className={cn(
                                    "flex items-center justify-center gap-1.5 px-4 py-2 sm:py-1.5 rounded-xl text-xs font-bold transition-all duration-200",
                                    activeTab === "events"
                                        ? "bg-background text-foreground shadow-xs"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Info className="w-3.5 h-3.5 text-primary shrink-0" />
                                <span>Eventos</span>
                                {scheduleEvents.length > 0 && (
                                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] bg-primary/10 text-primary font-black">
                                        {scheduleEvents.length}
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* Desktop View Switcher */}
                        <div className="hidden sm:inline-flex bg-muted/60 p-1 rounded-2xl border border-border/70 shadow-2xs">
                            <button
                                type="button"
                                onClick={() => setView("week")}
                                className={cn(
                                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200",
                                    view === "week"
                                        ? "bg-background text-foreground shadow-xs"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                Semana
                            </button>
                            <button
                                type="button"
                                onClick={() => setView("month")}
                                className={cn(
                                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200",
                                    view === "month"
                                        ? "bg-background text-foreground shadow-xs"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                Mes
                            </button>
                        </div>
                    </div>

                    {/* Row 2: Date Navigation + (Mobile View Switcher / Desktop Date Label) */}
                    <div className="flex items-center justify-between gap-2 w-full">
                        {/* Date Navigation Buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                            <Button variant="outline" size="sm" className="h-8.5 w-8.5 p-0 rounded-xl shadow-2xs shrink-0" onClick={goBack} disabled={!canGoBack}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" className="h-8.5 px-3 rounded-xl font-bold text-xs shadow-2xs shrink-0" onClick={goToday}>
                                Hoy
                            </Button>
                            <Button variant="outline" size="sm" className="h-8.5 w-8.5 p-0 rounded-xl shadow-2xs shrink-0" onClick={goForward} disabled={!canGoForward}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Date Label on Desktop / Center on Mobile */}
                        <span className="text-xs sm:text-sm font-extrabold capitalize text-foreground tracking-tight truncate px-1">
                            {headerLabel}
                        </span>

                        {/* Mobile View Switcher [Semana | Mes] */}
                        <div className="inline-flex sm:hidden bg-muted/60 p-1 rounded-2xl border border-border/70 shadow-2xs shrink-0">
                            <button
                                type="button"
                                onClick={() => setView("week")}
                                className={cn(
                                    "px-2.5 py-1 rounded-xl text-xs font-bold transition-all duration-200",
                                    view === "week"
                                        ? "bg-background text-foreground shadow-xs"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                Sem
                            </button>
                            <button
                                type="button"
                                onClick={() => setView("month")}
                                className={cn(
                                    "px-2.5 py-1 rounded-xl text-xs font-bold transition-all duration-200",
                                    view === "month"
                                        ? "bg-background text-foreground shadow-xs"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                Mes
                            </button>
                        </div>

                        {/* Event Carousel if in Events tab */}
                        {activeTab === "events" && sortedEvents.length > 0 && (
                            <div className="hidden sm:flex items-center gap-1 border border-border/80 rounded-xl p-0.5 bg-muted/40 shadow-2xs ml-auto shrink-0">
                                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-lg" onClick={goPrevEvent} disabled={currentEventIndex === 0}>
                                    <ChevronLeft className="h-3.5 w-3.5" />
                                </Button>
                                <span className="text-[11px] font-bold px-1 text-muted-foreground">
                                    {currentEventIndex + 1}/{sortedEvents.length}
                                </span>
                                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-lg" onClick={goNextEvent} disabled={currentEventIndex === sortedEvents.length - 1}>
                                    <ChevronRight className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Row 3: Academic Period Selector (Full width on mobile, with Year Filter) */}
                    <div className="w-full flex flex-col sm:flex-row items-center gap-2">
                        {allSchedules.length > 0 ? (
                            <>
                                {/* Year Filter */}
                                <Select value={selectedYear} onValueChange={handleYearChange}>
                                    <SelectTrigger className="h-9 rounded-xl text-xs font-bold bg-muted/40 hover:bg-muted/70 text-foreground border-border/80 gap-1.5 shadow-2xs w-full sm:w-[145px] px-2.5 shrink-0">
                                        <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                                        <SelectValue placeholder="Año" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl text-xs shadow-xl border-border/80">
                                        <SelectItem value="ALL" className="font-bold">Todos los años</SelectItem>
                                        {availableYears.map(yr => (
                                            <SelectItem key={yr} value={yr} className="font-bold">Año {yr}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {/* Schedule Selector */}
                                <Select
                                    value={selectedScheduleId}
                                    onValueChange={(val) => {
                                        setSelectedScheduleId(val);
                                        loadScheduleData(val);
                                    }}
                                >
                                    <SelectTrigger className="h-9 rounded-xl text-xs font-bold bg-muted/40 hover:bg-muted/70 text-foreground border-border/80 gap-2 shadow-2xs w-full flex-1">
                                        <div className="flex items-center gap-2 truncate">
                                            <div className={cn("w-2 h-2 rounded-full shrink-0", currentSchedule?.isActive ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/50")} />
                                            <SelectValue placeholder="Seleccionar Período" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl text-xs max-h-64 shadow-xl border-border/80">
                                        {filteredSchedules.length === 0 ? (
                                            <div className="px-3 py-2 text-xs text-muted-foreground italic">
                                                Sin horarios para {selectedYear}
                                            </div>
                                        ) : (
                                            filteredSchedules.map((s) => (
                                                <SelectItem key={s.id} value={s.id} className="cursor-pointer rounded-xl my-0.5">
                                                    <div className="flex items-center justify-between gap-3 w-full">
                                                        <span className="font-bold text-foreground">{s.name}</span>
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            {s.isActive && (
                                                                <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0 h-4 font-extrabold rounded-md">
                                                                    Vigente
                                                                </Badge>
                                                            )}
                                                            {!s.isPublished ? (
                                                                <Badge variant="outline" className="text-amber-600 border-amber-500/40 bg-amber-500/10 text-[9px] px-1.5 py-0 h-4 font-bold rounded-md">
                                                                    Borrador
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="outline" className="text-blue-600 border-blue-500/40 bg-blue-500/10 text-[9px] px-1.5 py-0 h-4 font-bold rounded-md">
                                                                    Público
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </>
                        ) : (
                            globalDates.title && (
                                <div className="text-xs text-primary font-bold bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-xl truncate w-full text-center sm:text-left">
                                    {globalDates.title}
                                </div>
                            )
                        )}
                    </div>

                    {/* Row 3: Period Dates + Hours Stats / Group Badge */}
                    <div className="flex items-center flex-wrap gap-2 text-xs">
                        {/* Period Dates Badge */}
                        {(globalDates.start || globalDates.end) && (
                            <div className="text-xs text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-xl border border-border/70 font-semibold flex items-center gap-1.5 shadow-2xs">
                                <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                                <span>
                                    {globalDates.start ? format(globalDates.start, "dd/MM/yyyy") : "Inicio"} – {globalDates.end ? format(globalDates.end, "dd/MM/yyyy") : "Fin"}
                                </span>
                            </div>
                        )}

                        {/* Timeline Denomination Badge */}
                        {(() => {
                            const firstCourseWithTimeline = courses.find((c: any) => c.timelineName);
                            const activeTimelineName = (firstCourseWithTimeline as any)?.timelineName;
                            if (!activeTimelineName) return null;
                            return (
                                <div className="text-xs text-primary bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/25 font-bold flex items-center gap-1.5 shadow-2xs">
                                    <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
                                    <span>Línea: {activeTimelineName}</span>
                                </div>
                            );
                        })()}

                        {/* Teacher Hours Stats Badge */}
                        {session?.user?.role === "teacher" && (
                            <div className="text-xs text-foreground bg-primary/5 px-3 py-1.5 rounded-xl border border-primary/20 font-bold flex items-center gap-2 shadow-2xs">
                                <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                                <span><span className="text-primary font-black">{execWeeklyStr}h</span>/{weeklyHoursStr}h Sem.</span>
                                <span className="text-border">|</span>
                                <span><span className="text-primary font-black">{execPeriodStr}h</span>/{periodHoursStr}h Total</span>
                            </div>
                        )}

                        {/* Student Group & Course Badge */}
                        {session?.user?.role === "student" && courses.length > 0 && (
                            <div className="text-xs text-foreground bg-primary/5 px-3 py-1.5 rounded-xl border border-primary/20 font-bold flex items-center gap-2 shadow-2xs">
                                <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
                                <span>{courses.length} {courses.length === 1 ? "Materia" : "Materias"}</span>
                                {courses[0]?.group && (
                                    <>
                                        <span className="text-border">|</span>
                                        <span className="text-muted-foreground flex items-center gap-1 font-semibold">
                                            <Users className="w-3 h-3 text-primary shrink-0" />
                                            Ficha {courses[0].group.name}
                                        </span>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Bottom Progress Bar Row */}
                    {globalDates.start && globalDates.end && !isDraft && (
                        <div className="pt-2.5 border-t border-border/50 flex items-center gap-3">
                            <span className="text-[10px] text-muted-foreground font-extrabold shrink-0 uppercase tracking-wider">
                                Progreso del Período
                            </span>
                            <div className="relative flex-1 h-2 bg-muted/60 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-primary/80 to-primary rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(100, Math.max(0, periodProgress))}%` }}
                                />
                            </div>
                            <span className="text-[10px] text-primary font-black shrink-0 w-9 text-right">
                                {Math.round(periodProgress)}%
                            </span>
                        </div>
                    )}
                </div>

                {/* DRAFT STATE NOTICE (Horario aún no disponible) */}
                {isDraft ? (
                    <div className="rounded-3xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/10 p-8 sm:p-12 flex flex-col items-center justify-center text-center gap-4 shadow-sm my-4 animate-in fade-in-50 duration-300">
                        <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-inner">
                            <FileEdit className="w-8 h-8" />
                        </div>
                        <div className="space-y-2 max-w-lg">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 text-xs font-bold border border-amber-500/30">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Horario No Disponible — En Preparación</span>
                            </div>
                            <h2 className="text-xl sm:text-2xl font-black text-foreground">
                                El horario aún no está disponible para consulta
                            </h2>
                            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                                El horario <strong>"{currentSchedule?.name || globalDates.title}"</strong> se encuentra en modo <strong>Borrador</strong>. La administración académica se encuentra ajustando la programación y estará visible tan pronto sea publicado.
                            </p>
                        </div>
                        {session?.user?.role !== "student" && allSchedules.filter((s) => s.isPublished).length > 0 && (
                            <div className="mt-2 text-xs text-muted-foreground bg-muted/40 px-4 py-2 rounded-xl border border-border/70">
                                💡 Puedes seleccionar otros periodos académicos publicados en el desplegable superior.
                            </div>
                        )}
                    </div>
                ) : (
                    <>

                    {/* Legend */}
                    {activeTab === "schedule" && courses.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1 pb-1">
                            {courses.map((course, idx) => (
                                <button
                                    key={course.id}
                                    onClick={() => { setSelectedCourse(course); setIsDialogOpen(true); }}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-1 rounded-xl text-xs font-bold border transition-all shadow-2xs hover:scale-102 hover:shadow-xs",
                                        COURSE_COLORS[idx % COURSE_COLORS.length]
                                    )}
                                >
                                    <span className={cn("w-2.5 h-2.5 rounded-full shrink-0 shadow-xs", DOT_COLORS[idx % DOT_COLORS.length])} />
                                    <span className="truncate">{course.title}</span>
                                </button>
                            ))}
                        </div>
                    )}

            {/* No schedules placeholder */}
            {noSchedules && (
                <div className="flex flex-col items-center justify-center flex-1 py-16 text-center gap-3 text-muted-foreground border-2 border-dashed rounded-xl">
                    <Calendar className="w-12 h-12 opacity-30" />
                    <div>
                        <p className="font-semibold text-base">
                            {activeTab === "schedule" ? "Sin horarios configurados" : "Sin eventos configurados"}
                        </p>
                        <p className="text-sm mt-1">
                            {activeTab === "schedule" 
                                ? "Las materias aún no tienen horarios asignados. Edita una materia y agrega sus días y horas de clase." 
                                : "No hay eventos ni festivos programados para este rango de fechas."}
                        </p>
                    </div>
                </div>
            )}

            {/* Scroll Indicator for mobile */}
            {!noSchedules && (
                <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-semibold md:hidden bg-muted/40 px-3 py-2 rounded-xl border border-border/50 w-fit select-none animate-pulse">
                    <Info className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>Desliza horizontalmente para ver el horario completo.</span>
                </div>
            )}

            {/* Week View */}
            {!noSchedules && view === "week" && (
                <div 
                    className="w-full max-w-full rounded-2xl border border-border/80 bg-card/60 backdrop-blur-sm overflow-x-auto touch-pan-x overscroll-x-contain select-none scrollbar-thin pb-2"
                    style={{ WebkitOverflowScrolling: "touch" }}
                >
                    <div className="min-w-[750px] flex flex-col">
                        <div className="grid grid-cols-[55px_repeat(7,1fr)] sm:grid-cols-[65px_repeat(7,1fr)] divide-x border-b bg-muted/40 sticky top-0 z-30">
                            <div className="py-2 px-1 text-xs text-muted-foreground text-center sticky left-0 bg-background/95 z-40 border-r backdrop-blur-md" />
                        {weekDays.map((day, i) => {
                            const allDbEventsForDay = scheduleEvents.filter(e => {
                                const eventDate = e.date || e.startDate;
                                if (!eventDate) return false;
                                const sDate = startOfDay(fromUTC(eventDate));
                                const eDate = startOfDay(fromUTC(e.endDate || eventDate));
                                const d = startOfDay(day);
                                return d >= sDate && d <= eDate;
                            });
                            const dbEventsForDay = allDbEventsForDay;
                            const holidays = dbEventsForDay.filter(e => e.type === "HOLIDAY");
                            const isHoliday = holidays.length > 0;

                            return (
                                <div
                                    key={i}
                                    className={cn(
                                        "py-2 px-1 text-center flex flex-col items-center overflow-hidden",
                                        isSameDay(day, today) && !isHoliday && "bg-primary/5",
                                        isHoliday && "bg-red-50/50 dark:bg-red-950/20"
                                    )}
                                >
                                    <div className={cn("text-xs font-semibold uppercase", isHoliday ? "text--600 dark:text--400 dark:text-red-400" : "text-muted-foreground")}>{DAY_NAMES_ES[i]}</div>
                                    <div className={cn(
                                        "text-sm font-bold mt-0.5 w-7 h-7 mx-auto flex items-center justify-center rounded-full shrink-0",
                                        isSameDay(day, today) && !isHoliday && "bg-primary text-primary-foreground",
                                        isSameDay(day, today) && isHoliday && "bg-red-600 text-white",
                                        !isSameDay(day, today) && isHoliday && "text--600 dark:text--400 dark:text-red-400"
                                    )}>
                                        {format(day, "d")}
                                    </div>
                                    {activeTab === "events" && dbEventsForDay.filter(e => !e.startTime).length > 0 && (
                                        <div className="flex flex-col gap-0.5 mt-1.5 w-full px-0.5">
                                            {dbEventsForDay.filter(e => !e.startTime).map(evt => (
                                                <Popover key={evt.id}>
                                                    <PopoverTrigger asChild>
                                                        <div className={cn(
                                                            "text-[10px] leading-tight font-bold text-center rounded py-1 px-1.5 truncate w-full shadow-sm cursor-pointer transition-all hover:brightness-110",
                                                            evt.type === "HOLIDAY" ? "bg-gradient-to-r from-red-500/10 to-rose-500/10 border border-red-500/30 text-red-700 dark:text-red-300" : "bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-500/40 text-amber-800 dark:text-amber-300"
                                                        )}>
                                                            {evt.startTime && <span className="opacity-70 mr-1">[{evt.startTime}]</span>}
                                                            {evt.title}
                                                        </div>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-80 p-5 shadow-2xl border-muted/20 z-[100]" side="bottom" align="start">
                                                        <div className="space-y-1">
                                                            <div className="font-extrabold text-lg leading-tight text-foreground">{evt.title}</div>
                                                            <div className="text-sm font-semibold text-muted-foreground">{evt.type === "HOLIDAY" ? "Día Festivo" : "Evento Institucional"}</div>
                                                            {(evt.startTime || evt.endTime) && (
                                                                <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-2">
                                                                    <Clock className="w-4 h-4" />
                                                                    {evt.startTime || "--:--"} hasta {evt.endTime || "--:--"}
                                                                </div>
                                                            )}
                                                            {evt.description && (
                                                                <p className="text-sm text-foreground/80 mt-3 bg-muted/40 p-3 rounded-lg border border-border/50 break-words">
                                                                    {evt.description}
                                                                </p>
                                                            )}
                                                            {evt.externalUrl && (
                                                                <div className="mt-3">
                                                                    <a 
                                                                        href={evt.externalUrl} 
                                                                        target="_blank" 
                                                                        rel="noopener noreferrer"
                                                                        className="text-xs text-blue-500 hover:underline inline-flex items-center gap-1 font-semibold"
                                                                    >
                                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                                        <span>Ver información externa</span>
                                                                    </a>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <div className="grid grid-cols-[55px_repeat(7,1fr)] sm:grid-cols-[65px_repeat(7,1fr)] divide-x min-h-[400px]">
                        {/* Time labels placeholder (Sticky on scroll) */}
                        <div className="flex flex-col divide-y text-xs text-muted-foreground sticky left-0 bg-background/95 z-20 shadow-xs border-r backdrop-blur-md">
                            {Array.from({ length: gridHoursLength }, (_, i) => i + minHour).map(h => (
                                <div key={h} className="px-1 py-1 min-h-[40px] flex items-start justify-center font-bold text-[10px] text-muted-foreground/80">
                                    {formatHour12h(h)}
                                </div>
                            ))}
                        </div>
                        {weekDays.map((day, i) => {
                            const originalDayEvents = getEventsForDay(day);
                            const isOutside = (globalDates.start && startOfDay(day) < startOfDay(globalDates.start)) || 
                                              (globalDates.end && startOfDay(day) > startOfDay(globalDates.end));
                                              
                            // Check for DB Events / Holidays
                            const allDbEventsForDay = scheduleEvents.filter(e => {
                                const eventDate = e.date || e.startDate;
                                if (!eventDate) return false;
                                const sDate = startOfDay(fromUTC(eventDate));
                                const eDate = startOfDay(fromUTC(e.endDate || eventDate));
                                const d = startOfDay(day);
                                return d >= sDate && d <= eDate;
                            });
                            const dbEventsForDay = allDbEventsForDay;
                            
                            const dayNameString = Object.keys(DAY_INDEX).find(k => DAY_INDEX[k] === ((getDay(day) + 6) % 7)) || "MONDAY";
                            const timeBoundEvents = dbEventsForDay.filter(e => e.startTime && e.endTime).map((e, idx) => ({
                                startTime: e.startTime,
                                endTime: e.endTime,
                                courseTitle: e.title,
                                dayOfWeek: dayNameString,
                                colorIndex: idx % COURSE_COLORS.length,
                                course: { 
                                    id: e.id, 
                                    title: e.title, 
                                    description: e.description, 
                                    teacher: null, 
                                    group: null, 
                                    schedules: [],
                                    isEvent: true,
                                    startTime: e.startTime,
                                    endTime: e.endTime,
                                    externalUrl: e.externalUrl,
                                    type: e.type
                                } as any
                            }));
                            const dayEvents = activeTab === "schedule" ? originalDayEvents : timeBoundEvents;
                            const holidays = dbEventsForDay.filter(e => e.type === "HOLIDAY");
                            const isHoliday = holidays.length > 0;
                            const isPast = startOfDay(day) < startOfDay(today);

                            return (
                                <div
                                    key={i}
                                    className={cn(
                                        "relative flex flex-col divide-y min-h-[560px]",
                                        isSameDay(day, today) && !isHoliday && "bg-primary/5",
                                        isOutside && "bg-muted/40 opacity-50 pointer-events-none"
                                    )}
                                    style={isHoliday ? { 
                                        backgroundColor: 'rgba(239, 68, 68, 0.05)',
                                        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(239, 68, 68, 0.05) 10px, rgba(239, 68, 68, 0.05) 20px)' 
                                    } : undefined}
                                >

                                    {Array.from({ length: gridHoursLength }, (_, h) => (
                                        <div key={h} className="min-h-[40px] relative" />
                                    ))}
                                    {/* Event blocks */}
                                    {dayEvents.map((event, ei) => {
                                        const [sh, sm] = event.startTime.split(":").map(Number);
                                        const [eh, em] = event.endTime.split(":").map(Number);
                                        const startMinutes = (sh - minHour) * 60 + sm;
                                        const durationMinutes = (eh - minHour) * 60 + em - startMinutes;
                                        const top = (startMinutes / 60) * 40;
                                        const height = (durationMinutes / 60) * 40;
                                        return (
                                            <Tooltip key={ei}>
                                                <TooltipTrigger asChild>
                                                    <button
                                                        onClick={() => { setSelectedCourse(event.course); setIsDialogOpen(true); }}
                                                        className={cn(
                                                            "absolute left-1 right-1 rounded-xl border p-2 text-left text-xs font-medium overflow-hidden transition-all shadow-2xs hover:shadow-md z-10 flex flex-col justify-between group/card",
                                                            COURSE_COLORS[event.colorIndex]
                                                        )}
                                                        style={{ top: `${top}px`, height: `${Math.max(height, 36)}px` }}
                                                    >
                                                        <div className="space-y-0.5 overflow-hidden">
                                                            <div className="flex items-center justify-between gap-1">
                                                                <span className="font-extrabold text-[11px] truncate leading-tight text-foreground">
                                                                    {event.courseTitle}
                                                                </span>
                                                                <div className="shrink-0">
                                                                    {renderTimeOfDayIcon(event.startTime, event.endTime)}
                                                                </div>
                                                            </div>
                                                            <div className="text-[9.5px] opacity-90 truncate flex flex-col gap-0.5 font-medium">
                                                                {event.course.group && (
                                                                    <span className="flex items-center gap-1 truncate text-foreground/80">
                                                                        <Users className="w-2.5 h-2.5 text-primary shrink-0" />
                                                                        <strong className="font-semibold">Ficha:</strong> {event.course.group.name}
                                                                    </span>
                                                                )}
                                                                {(event.course as any)?.timelineName && (
                                                                    <span className="flex items-center gap-1 truncate text-primary font-bold text-[9px] bg-primary/10 px-1 py-0.2 rounded" title={`Línea: ${(event.course as any).timelineName}`}>
                                                                        <BookOpen className="w-2.5 h-2.5 text-primary shrink-0" />
                                                                        <span className="truncate">{(event.course as any).timelineName}</span>
                                                                    </span>
                                                                )}
                                                                {event.course.teacher && (
                                                                    <span className="flex items-center gap-1 truncate text-foreground/80">
                                                                        <GraduationCap className="w-2.5 h-2.5 text-primary shrink-0" />
                                                                        {event.course.teacher.name}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="text-[9.5px] font-mono font-bold opacity-90 flex items-center gap-1 pt-0.5">
                                                            <Clock className="w-2.5 h-2.5 text-primary" />
                                                            {toFormat12h(event.startTime)} – {toFormat12h(event.endTime)}
                                                        </div>
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent className="rounded-2xl p-2.5 max-w-xs space-y-1">
                                                    <p className="font-extrabold text-xs text-foreground">{event.courseTitle}</p>
                                                    <p className="text-[11px] text-muted-foreground">
                                                        {DAY_NAMES_ES_FULL[DAY_INDEX[event.dayOfWeek]]} de {toFormat12h(event.startTime)} a {toFormat12h(event.endTime)}
                                                    </p>
                                                    {event.course.teacher && <p className="text-[11px] text-primary font-medium">Docente: {event.course.teacher.name}</p>}
                                                    {event.course.group && <p className="text-[11px] text-muted-foreground">Ficha: {event.course.group.name}</p>}
                                                </TooltipContent>
                                            </Tooltip>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                    </div>
                </div>
            )}

            {/* Month View */}
            {!noSchedules && view === "month" && (
                <div 
                    className="w-full max-w-full rounded-2xl border border-border/80 bg-card/60 backdrop-blur-sm overflow-x-auto touch-pan-x overscroll-x-contain select-none scrollbar-thin pb-2"
                    style={{ WebkitOverflowScrolling: "touch" }}
                >
                    <div className="min-w-[700px] flex flex-col">
                        <div className="grid grid-cols-7 divide-x border-b bg-muted/30">
                        {DAY_NAMES_ES.map(d => (
                            <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground">{d}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 divide-x divide-y">
                        {monthDays.map((day, i) => {
                            const originalDayEvents = getEventsForDay(day);
                            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                            const isOutside = (globalDates.start && startOfDay(day) < startOfDay(globalDates.start)) || 
                                              (globalDates.end && startOfDay(day) > startOfDay(globalDates.end));

                            // Check for DB Events / Holidays
                            const allDbEventsForDay = scheduleEvents.filter(e => {
                                const eventDate = e.date || e.startDate;
                                if (!eventDate) return false;
                                const sDate = startOfDay(fromUTC(eventDate));
                                const eDate = startOfDay(fromUTC(e.endDate || eventDate));
                                const d = startOfDay(day);
                                return d >= sDate && d <= eDate;
                            });
                            const dbEventsForDay = allDbEventsForDay;
                            
                            const dayNameString = Object.keys(DAY_INDEX).find(k => DAY_INDEX[k] === ((getDay(day) + 6) % 7)) || "MONDAY";
                            const timeBoundEvents = dbEventsForDay.filter(e => e.startTime && e.endTime).map((e, idx) => ({
                                startTime: e.startTime,
                                endTime: e.endTime,
                                courseTitle: e.title,
                                dayOfWeek: dayNameString,
                                colorIndex: idx % COURSE_COLORS.length,
                                course: { 
                                    id: e.id, 
                                    title: e.title, 
                                    description: e.description, 
                                    teacher: null, 
                                    group: null, 
                                    schedules: [],
                                    isEvent: true,
                                    startTime: e.startTime,
                                    endTime: e.endTime,
                                    externalUrl: e.externalUrl,
                                    type: e.type
                                } as any
                            }));
                            const dayEvents = activeTab === "schedule" ? originalDayEvents : timeBoundEvents;
                            const isHoliday = dbEventsForDay.some(e => e.type === "HOLIDAY");
                            const isPast = startOfDay(day) < startOfDay(today);

                            return (
                                <div
                                    key={i}
                                    className={cn(
                                        "min-h-[80px] p-1.5 flex flex-col",
                                        !isCurrentMonth && "bg-muted/20",
                                        isSameDay(day, today) && "bg-primary/5",
                                        isOutside && "bg-muted/40 opacity-50 pointer-events-none",
                                        isHoliday && "bg-red-50/50 dark:bg-red-950/20"
                                    )}
                                >
                                    <div className={cn(
                                        "text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full shrink-0",
                                        isSameDay(day, today) ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                                        !isCurrentMonth && "opacity-40"
                                    )}>
                                        {format(day, "d")}
                                    </div>
                                    
                                    {activeTab === "events" && (
                                        <div className="flex flex-col gap-0.5 mb-1 shrink-0">
                                            {dbEventsForDay.filter(e => !e.startTime).map(evt => (
                                            <Popover key={evt.id}>
                                                <PopoverTrigger asChild>
                                                    <div className={cn(
                                                        "text-[9px] font-bold px-1.5 py-0.5 rounded border truncate cursor-pointer transition-all hover:brightness-110",
                                                        evt.type === "HOLIDAY" ? "bg-gradient-to-r from-red-500/10 to-rose-500/10 border-red-500/30 text-red-700 dark:text-red-300" : "bg-gradient-to-r from-amber-500/15 to-orange-500/15 border-amber-500/40 text-amber-800 dark:text-amber-300"
                                                    )}>
                                                        {evt.startTime && <span className="opacity-70 mr-1">[{evt.startTime}]</span>}
                                                        {evt.title}
                                                    </div>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-80 p-5 shadow-2xl border-muted/20 z-[100]" side="right" align="start">
                                                    <div className="space-y-1">
                                                        <div className="font-extrabold text-lg leading-tight text-foreground">{evt.title}</div>
                                                        <div className="text-sm font-semibold text-muted-foreground">{evt.type === "HOLIDAY" ? "Día Festivo" : "Evento Institucional"}</div>
                                                        {(evt.startTime || evt.endTime) && (
                                                            <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-2">
                                                                <Clock className="w-4 h-4" />
                                                                {evt.startTime || "--:--"} hasta {evt.endTime || "--:--"}
                                                            </div>
                                                        )}
                                                        {evt.description && (
                                                            <p className="text-sm text-foreground/80 mt-3 bg-muted/40 p-3 rounded-lg border border-border/50 break-words">
                                                                {evt.description}
                                                            </p>
                                                        )}
                                                        {evt.externalUrl && (
                                                            <div className="mt-3">
                                                                <a 
                                                                    href={evt.externalUrl} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer"
                                                                    className="text-xs text-blue-500 hover:underline inline-flex items-center gap-1 font-semibold"
                                                                >
                                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                                    <span>Ver información externa</span>
                                                                </a>
                                                            </div>
                                                        )}
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                        ))}
                                    </div>
                                    )}

                                    <div className="space-y-0.5 overflow-hidden">
                                        {dayEvents.slice(0, 3).map((event, ei) => (
                                            <button
                                                key={ei}
                                                onClick={() => { setSelectedCourse(event.course); setIsDialogOpen(true); }}
                                                className={cn(
                                                    "w-full text-left text-[10px] px-1.5 py-0.5 rounded-lg truncate border font-bold leading-tight transition-all hover:brightness-105 shadow-2xs",
                                                    COURSE_COLORS[event.colorIndex]
                                                )}
                                            >
                                                {toFormat12h(event.startTime)} {event.courseTitle}
                                            </button>
                                        ))}
                                        {dayEvents.length > 3 && (
                                            <div className="text-[10px] text-muted-foreground pl-1">
                                                +{dayEvents.length - 3} más
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    </div>
                </div>
            )}

            {/* Agenda de Eventos Programados en la pestaña Eventos */}
            {activeTab === "events" && sortedEvents.length > 0 && (
                <div className="p-5 rounded-3xl bg-card border border-border/80 shadow-xs space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-primary" />
                            <h3 className="font-extrabold text-sm text-foreground">
                                Agenda de Eventos Programados ({sortedEvents.length})
                            </h3>
                        </div>
                        {globalDates.title && (
                            <span className="text-xs text-muted-foreground font-semibold">
                                Período {globalDates.title}
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {sortedEvents.map((evt: any) => {
                            const evtDate = evt.date || evt.startDate;
                            const isPast = evtDate ? startOfDay(fromUTC(evtDate)) < startOfDay(today) : false;
                            return (
                                <div
                                    key={evt.id}
                                    onClick={() => {
                                        setSelectedCourse({
                                            id: evt.id,
                                            title: evt.title,
                                            description: evt.description,
                                            teacher: null,
                                            group: null,
                                            schedules: [],
                                            isEvent: true,
                                            startTime: evt.startTime,
                                            endTime: evt.endTime,
                                            externalUrl: evt.externalUrl || evt.linkUrl,
                                            type: evt.type,
                                            date: evtDate,
                                            location: evt.location,
                                        } as any);
                                        setIsDialogOpen(true);
                                    }}
                                    className={cn(
                                        "p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md hover:scale-101 flex flex-col justify-between gap-3 group/event",
                                        evt.type === "HOLIDAY"
                                            ? "bg-red-500/5 border-red-500/30 hover:border-red-500/60"
                                            : "bg-primary/5 border-primary/25 hover:border-primary/50",
                                        isPast && "opacity-80"
                                    )}
                                >
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between gap-2">
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "text-[10px] font-extrabold px-2 py-0.5 rounded-lg",
                                                    evt.type === "HOLIDAY"
                                                        ? "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30"
                                                        : "bg-primary/10 text-primary border-primary/30"
                                                )}
                                            >
                                                {evt.type === "HOLIDAY" ? "DÍA FESTIVO" : "EVENTO INSTITUCIONAL"}
                                            </Badge>
                                            {evtDate && (
                                                <span className="text-[11px] font-extrabold text-foreground/80 flex items-center gap-1">
                                                    <Calendar className="w-3 h-3 text-primary" />
                                                    {formatCalendarDate(evtDate, "dd MMM yyyy")}
                                                </span>
                                            )}
                                        </div>

                                        <h4 className="font-extrabold text-sm text-foreground line-clamp-1 leading-tight group-hover/event:text-primary transition-colors">
                                            {evt.title}
                                        </h4>

                                        {evt.description && (
                                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                                {evt.description}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/40 font-medium">
                                        <div className="flex items-center gap-1.5 truncate">
                                            {evt.startTime && evt.endTime ? (
                                                <span className="flex items-center gap-1 text-primary font-bold">
                                                    <Clock className="w-3 h-3" />
                                                    {toFormat12h(evt.startTime)} – {toFormat12h(evt.endTime)}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground">Todo el día</span>
                                            )}
                                            {evt.location && (
                                                <span className="truncate flex items-center gap-1 ml-2">
                                                    <Building className="w-3 h-3 text-primary" />
                                                    {evt.location}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-primary font-bold text-[11px] shrink-0">Ver detalles →</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            </>
            )}

            {/* Course Detail Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[480px] rounded-2xl">
                    {(selectedCourse as any)?.isEvent ? (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 font-black text-lg">
                                    <Calendar className="w-5 h-5 text-primary" />
                                    {selectedCourse?.title}
                                </DialogTitle>
                                <DialogDescription className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    {(selectedCourse as any)?.type === "HOLIDAY" ? "Día Festivo" : "Evento Institucional"}
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 pt-2">
                                {/* Date & Time range */}
                                <div className="grid grid-cols-2 gap-3 bg-muted/40 p-3 rounded-xl border border-border/60">
                                    {((selectedCourse as any)?.date || (selectedCourse as any)?.startDate) && (
                                        <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground flex items-center gap-1 font-semibold">
                                                <Calendar className="w-3.5 h-3.5 text-primary" /> Fecha
                                            </p>
                                            <p className="text-xs font-bold text-foreground">
                                                {formatCalendarDate((selectedCourse as any).date || (selectedCourse as any).startDate, "dd 'de' MMMM 'de' yyyy")}
                                            </p>
                                        </div>
                                    )}
                                    {((selectedCourse as any)?.startTime || (selectedCourse as any)?.endTime) && (
                                        <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground flex items-center gap-1 font-semibold">
                                                <Clock className="w-3.5 h-3.5 text-primary" /> Horario
                                            </p>
                                            <p className="text-xs font-bold text-foreground">
                                                {toFormat12h((selectedCourse as any).startTime) || "--:--"} a {toFormat12h((selectedCourse as any).endTime) || "--:--"}
                                            </p>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Location if any */}
                                {(selectedCourse as any)?.location && (
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                                            <Building className="w-3.5 h-3.5 text-primary" /> Ubicación / Lugar
                                        </p>
                                        <p className="text-xs font-bold text-foreground bg-muted/40 p-2.5 rounded-xl border border-border/50">
                                            {(selectedCourse as any).location}
                                        </p>
                                    </div>
                                )}

                                {/* Description */}
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground font-semibold">Descripción del Evento</p>
                                    <p className="text-xs text-foreground/90 bg-muted/40 p-3 rounded-xl border border-border/50 break-words whitespace-pre-wrap leading-relaxed">
                                        {selectedCourse?.description || "Sin descripción adicional."}
                                    </p>
                                </div>

                                {/* External URL Button / Link */}
                                {((selectedCourse as any)?.externalUrl || (selectedCourse as any)?.linkUrl) && (
                                    <div className="pt-1">
                                        <a 
                                            href={(selectedCourse as any).externalUrl || (selectedCourse as any).linkUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-xs text-primary hover:underline inline-flex items-center gap-1.5 font-bold bg-primary/10 hover:bg-primary/20 px-3 py-2 rounded-xl transition-all"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                            <span>Abrir enlace / Más información</span>
                                        </a>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 font-black">
                                    <BookOpen className="w-5 h-5 text-primary" />
                                    {selectedCourse?.title}
                                </DialogTitle>
                                <DialogDescription className="text-xs uppercase tracking-wider font-bold">
                                    Detalles de la Materia Académica
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 pt-2">
                                {/* Description / Competencies / RAP */}
                                <div className="space-y-1.5">
                                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Descripción, Competencias y RAP</p>
                                    <div className="text-xs text-foreground/80 bg-muted/40 p-3 rounded-xl border border-border/50 break-words whitespace-pre-wrap max-h-[140px] overflow-y-auto scrollbar-thin">
                                        {selectedCourse?.description || "Esta materia no tiene descripción, competencias o resultados de aprendizaje registrados todavía."}
                                    </div>
                                </div>
                                {/* Docente & Grupo */}
                                <div className="grid grid-cols-2 gap-4">

                                    {selectedCourse?.group && (
                                        <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                <GraduationCap className="w-3 h-3" /> Grupo
                                            </p>
                                            <p className="text-sm font-medium">{selectedCourse.group.name}</p>
                                        </div>
                                    )}
                                    {selectedCourse?.teacher && (
                                        <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Users className="w-3 h-3" /> Docente
                                            </p>
                                            <p className="text-sm font-medium">{selectedCourse.teacher.name}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Línea Curricular & Periodo */}
                                {((selectedCourse as any)?.timelineName || (selectedCourse as any)?.period?.name) && (
                                    <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-1.5">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider">
                                            <BookOpen className="w-3.5 h-3.5" />
                                            <span>Línea Curricular & Periodo</span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            {(selectedCourse as any)?.timelineName && (
                                                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 font-bold text-xs py-1 px-2.5">
                                                    {(selectedCourse as any).timelineName}
                                                </Badge>
                                            )}
                                            {(selectedCourse as any)?.period?.name && (
                                                <Badge variant="secondary" className="font-semibold text-xs py-1 px-2.5">
                                                    {(selectedCourse as any).period.name}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Dates */}
                                {(selectedCourse?.group?.startDate || selectedCourse?.group?.endDate) && (
                                    <div className="flex gap-4">
                                        {selectedCourse?.group?.startDate && (
                                            <div className="space-y-1">
                                                <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Inicio</p>
                                                <p className="text-sm font-medium">{formatCalendarDate(selectedCourse.group.startDate, "dd 'de' MMMM 'de' yyyy")}</p>
                                            </div>
                                        )}
                                        {selectedCourse?.group?.endDate && (
                                            <div className="space-y-1">
                                                <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Fin</p>
                                                <p className="text-sm font-medium">{formatCalendarDate(selectedCourse.group.endDate, "dd 'de' MMMM 'de' yyyy")}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Schedules */}
                                {selectedCourse?.schedules && selectedCourse.schedules.length > 0 ? (
                                    <div className="space-y-2">
                                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Horarios</p>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedCourse.schedules.map((schedule: any, index: number) => (
                                                <Badge key={index} variant="outline" className={cn("text-sm py-1", COURSE_COLORS[courseColorMap[selectedCourse.id] ?? 0])}>
                                                    {DAY_NAMES_ES_FULL[DAY_INDEX[schedule.dayOfWeek]]} · {toFormat12h(schedule.startTime)} – {toFormat12h(schedule.endTime)}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Info className="w-4 h-4" />
                                        <span>Esta materia no tiene horarios configurados</span>
                                    </div>
                                )}
                            
                                {selectedCourse?.group && session?.user?.role === "teacher" && (
                                    <DialogFooter className="mt-4 pt-4 border-t border-border/50">
                                        <Button 
                                            className="w-full sm:w-auto font-bold" 
                                            onClick={() => router.push(`/dashboard/teacher?group=${selectedCourse?.group?.id}`)}
                                        >
                                            <Users className="w-4 h-4 mr-2" />
                                            Ir al Grupo
                                        </Button>
                                    </DialogFooter>
                                )}
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
        </TooltipProvider>
    );
}
