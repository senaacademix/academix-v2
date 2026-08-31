"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  format,
  startOfWeek,
  endOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  isSameDay,
  getDay,
  startOfDay,
  getDaysInMonth,
} from "date-fns";
import { es } from "date-fns/locale";
import { fromUTC, formatCalendarDate } from "@/lib/dateUtils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  GraduationCap,
  Plus,
  Trash2,
  Sun,
  Cloud,
  Moon,
  AlertTriangle,
  Lock,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DayOfWeek } from "@/generated/prisma/client";
import { ScheduleBuilderData } from "../../actions/scheduleBuilderActions";
import {
  getCompactTeacherName,
  getCleanTeacherName,
} from "../../utils/teacherNameFormatter";

// Helper for Cloud (blue), Sun (orange), Moon indicators based on time of day
function renderTimeOfDayIcon(startTime: string, endTime: string) {
  if (!startTime || !endTime) return null;
  const [sh] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const effectiveEndH = em > 0 ? eh + 1 : eh;

  const touchesMorning = sh < 12;
  const touchesAfternoon = (sh >= 12 && sh < 18) || (sh < 12 && effectiveEndH > 12);
  const touchesNight = effectiveEndH > 18 || sh >= 18;

  const icons: React.ReactNode[] = [];

  if (touchesMorning) {
    icons.push(
      <span key="cloud" title="Jornada Mañana" className="text-sky-500">
        <Cloud className="w-2.5 h-2.5 shrink-0" />
      </span>
    );
  }
  if (touchesAfternoon) {
    icons.push(
      <span key="sun" title="Jornada Tarde" className="text-orange-500">
        <Sun className="w-2.5 h-2.5 shrink-0" />
      </span>
    );
  }
  if (touchesNight) {
    icons.push(
      <span key="moon" title="Jornada Noche" className="text-purple-600 dark:text-purple-400">
        <Moon className="w-2.5 h-2.5 shrink-0" />
      </span>
    );
  }

  return <div className="flex items-center gap-0.5 shrink-0">{icons}</div>;
}

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
const DAY_NAMES_ES_FULL = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

const COURSE_COLORS = [
  "bg-blue-500/15 border-blue-500/50 text-blue-700 dark:text-blue-300 hover:bg-blue-500/25",
  "bg-emerald-500/15 border-emerald-500/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25",
  "bg-violet-500/15 border-violet-500/50 text-violet-700 dark:text-violet-300 hover:bg-violet-500/25",
  "bg-amber-500/15 border-amber-500/50 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25",
  "bg-rose-500/15 border-rose-500/50 text-rose-700 dark:text-rose-300 hover:bg-rose-500/25",
  "bg-cyan-500/15 border-cyan-500/50 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/25",
  "bg-indigo-500/15 border-indigo-500/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/25",
];

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

interface InteractiveWeeklyCalendarGridProps {
  schedule: ScheduleBuilderData["schedule"];
  group: ScheduleBuilderData["groups"][0];
  novelties?: any[];
  onOpenScheduleModal: (
    day?: DayOfWeek,
    startTime?: string,
    endTime?: string,
    editingSlot?: {
      courseScheduleId: string;
      courseTitle: string;
      teacherId?: string;
      dayOfWeek: DayOfWeek;
      startTime: string;
      endTime: string;
    }
  ) => void;
  onDeleteClassSlot: (courseScheduleId: string) => void;
}

export function InteractiveWeeklyCalendarGrid({
  schedule,
  group,
  novelties = [],
  onOpenScheduleModal,
  onDeleteClassSlot,
}: InteractiveWeeklyCalendarGridProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [view, setView] = useState<"week" | "month">("week");

  const scheduleStartDate = useMemo(() => fromUTC(schedule.startDate), [schedule.startDate]);
  const scheduleEndDate = useMemo(() => fromUTC(schedule.endDate), [schedule.endDate]);

  const [currentDate, setCurrentDate] = useState<Date>(scheduleStartDate);

  useEffect(() => {
    setIsMounted(true);
    const today = new Date();
    if (today >= scheduleStartDate && today <= scheduleEndDate) {
      setCurrentDate(today);
    }
  }, [schedule.startDate, schedule.endDate, scheduleStartDate, scheduleEndDate]);

  // Check if a day is disabled/non-lectivo for this group
  const isDayDisabledForGroup = (dayEnum: DayOfWeek): boolean => {
    if (group.daySlotsConfig && group.daySlotsConfig.length > 0) {
      const hasSlot = group.daySlotsConfig.some((s) => s.dayOfWeek === dayEnum);
      if (!hasSlot) return true;
    }
    return false;
  };

  // Calculate week / month days
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Navigation bounds
  const canGoBack =
    view === "week"
      ? weekStart > startOfWeek(scheduleStartDate, { weekStartsOn: 1 })
      : startOfMonth(currentDate) > startOfMonth(scheduleStartDate);

  const canGoForward =
    view === "week"
      ? weekEnd < endOfWeek(scheduleEndDate, { weekStartsOn: 1 })
      : startOfMonth(currentDate) < startOfMonth(scheduleEndDate);

  const goBack = () => {
    if (!canGoBack) return;
    if (view === "week") setCurrentDate((d) => subWeeks(d, 1));
    else setCurrentDate((d) => subMonths(d, 1));
  };

  const goForward = () => {
    if (!canGoForward) return;
    if (view === "week") setCurrentDate((d) => addWeeks(d, 1));
    else setCurrentDate((d) => addMonths(d, 1));
  };

  const goToday = () => {
    const t = new Date();
    if (t < scheduleStartDate) setCurrentDate(scheduleStartDate);
    else if (t > scheduleEndDate) setCurrentDate(scheduleEndDate);
    else setCurrentDate(t);
  };

  // Build course color map
  const courseColorMap: Record<string, number> = {};
  group.scheduledClasses.forEach((c, idx) => {
    courseColorMap[c.id] = idx % COURSE_COLORS.length;
  });

  // Get scheduled classes for a specific date (replicated across the schedule range [startDate, endDate])
  const getEventsForDay = (date: Date) => {
    const dayStart = startOfDay(date);
    if (dayStart < startOfDay(scheduleStartDate) || dayStart > startOfDay(scheduleEndDate)) {
      return [];
    }

    const dow = (getDay(date) + 6) % 7; // Monday = 0
    const dayName = Object.keys(DAY_INDEX).find((k) => DAY_INDEX[k] === dow) as DayOfWeek | undefined;
    if (!dayName) return [];

    const result: Array<{
      courseScheduleId: string;
      courseId: string;
      courseTitle: string;
      description: string | null;
      teacherId?: string;
      teacherName: string | null;
      dayOfWeek: DayOfWeek;
      startTime: string;
      endTime: string;
      colorIndex: number;
      hasOverlap: boolean;
    }> = [];

    const rawList: Array<{
      courseScheduleId: string;
      courseId: string;
      courseTitle: string;
      description: string | null;
      teacherId?: string;
      teacherName: string | null;
      dayOfWeek: DayOfWeek;
      startTime: string;
      endTime: string;
      colorIndex: number;
    }> = [];

    group.scheduledClasses.forEach((c) => {
      c.schedules.forEach((s) => {
        if (s.dayOfWeek === dayName) {
          rawList.push({
            courseScheduleId: s.id,
            courseId: c.id,
            courseTitle: c.title,
            description: c.description,
            teacherId: s.teacher?.id || c.teacher?.id || undefined,
            teacherName: s.teacher?.name || c.teacher?.name || null,
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
            colorIndex: courseColorMap[c.id] ?? 0,
          });
        }
      });
    });

    const sorted = rawList.sort((a, b) => a.startTime.localeCompare(b.startTime));

    return sorted.map((item, idx, arr) => {
      const hasOverlap = arr.some(
        (other, oIdx) =>
          idx !== oIdx &&
          item.startTime < other.endTime &&
          item.endTime > other.startTime
      );
      return { ...item, hasOverlap };
    });
  };

  // Dynamically calculate the extreme earliest start hour and latest end hour for the group
  let earliestHour = 24;
  let latestHour = 0;

  // 1. Check configured base day slots of the group
  group.daySlotsConfig.forEach((ds) => {
    const startH = parseInt(ds.startTime.split(":")[0], 10);
    const [eh, em] = ds.endTime.split(":").map(Number);
    const endH = em > 0 ? eh + 1 : eh;
    if (startH < earliestHour) earliestHour = startH;
    if (endH > latestHour) latestHour = endH;
  });

  // 2. Also check all scheduled classes
  group.scheduledClasses.forEach((c) => {
    c.schedules.forEach((s) => {
      const startH = parseInt(s.startTime.split(":")[0], 10);
      const [eh, em] = s.endTime.split(":").map(Number);
      const endH = em > 0 ? eh + 1 : eh;
      if (startH < earliestHour) earliestHour = startH;
      if (endH > latestHour) latestHour = endH;
    });
  });

  // Safe fallback if no slots exist
  const minHour = earliestHour !== 24 ? Math.max(0, earliestHour) : 6;
  const maxHour = latestHour !== 0 ? Math.min(24, Math.max(minHour + 4, latestHour)) : 18;
  const gridHoursLength = Math.max(1, maxHour - minHour);

  // Month days builder
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDay = (getDay(monthStart) + 6) % 7;
  const daysInMonth = getDaysInMonth(currentDate);
  const monthDays: Date[] = [];
  for (let i = startDay - 1; i >= 0; i--) {
    monthDays.push(addDays(monthStart, -i - 1));
  }
  for (let i = 0; i < daysInMonth; i++) {
    monthDays.push(addDays(monthStart, i));
  }
  const remaining = 7 - (monthDays.length % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      monthDays.push(addDays(monthEnd, i));
    }
  }

  const today = isMounted ? new Date() : scheduleStartDate;

  return (
    <div className="flex-1 h-full flex flex-col rounded-2xl border border-border/80 bg-card p-3 space-y-2 shadow-xs min-h-0 overflow-hidden">
      {/* Calendar Top Controls & Title Bar */}
      <div className="flex items-center justify-between gap-2 shrink-0 pb-1.5 border-b border-border/70">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
            <CalendarIcon className="w-3.5 h-3.5" />
          </div>
          <span className="font-black text-xs sm:text-sm text-foreground truncate">
            Ficha {group.name}
          </span>
          <Badge variant="outline" className="text-[10px] font-semibold hidden md:inline shrink-0">
            {group.program.name}
          </Badge>
          {group.period && (
            <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold shrink-0">
              {group.period.name}
            </Badge>
          )}
        </div>

        {/* Navigation buttons & View switcher */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-0.5 bg-muted/40 p-0.5 rounded-lg border border-border/60">
            <Button
              variant="ghost"
              size="icon"
              onClick={goBack}
              disabled={!canGoBack}
              className="w-6 h-6 rounded-md"
              title="Anterior"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToday}
              className="h-6 text-[11px] font-semibold px-2 rounded-md"
            >
              Hoy
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={goForward}
              disabled={!canGoForward}
              className="w-6 h-6 rounded-md"
              title="Siguiente"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          <span className="text-[11px] font-bold text-foreground capitalize hidden lg:inline">
            {view === "week"
              ? `${format(weekStart, "d MMM", { locale: es })} - ${format(weekEnd, "d MMM yyyy", { locale: es })}`
              : format(currentDate, "MMMM yyyy", { locale: es })}
          </span>

          {isMounted ? (
            <Tabs value={view} onValueChange={(v) => setView(v as "week" | "month")} className="h-7">
              <TabsList className="h-7 rounded-lg bg-muted/50 p-0.5">
                <TabsTrigger value="week" className="h-6 text-[11px] rounded-md px-2">
                  Semana
                </TabsTrigger>
                <TabsTrigger value="month" className="h-6 text-[11px] rounded-md px-2">
                  Mes
                </TabsTrigger>
              </TabsList>
            </Tabs>
          ) : (
            <div className="h-7 rounded-lg bg-muted/50 p-0.5 flex items-center gap-1 text-[11px] font-medium text-muted-foreground px-2">
              Semana
            </div>
          )}

          <Button
            size="sm"
            onClick={() => onOpenScheduleModal()}
            className="rounded-xl text-xs gap-1 font-semibold bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 h-7 px-2.5"
          >
            <Plus className="w-3 h-3" />
            <span className="hidden sm:inline">Programar Clase</span>
          </Button>
        </div>
      </div>

      {/* WEEK VIEW (Dynamic height - 0 Scroll) */}
      {view === "week" && (
        <div className="flex-1 min-h-0 border border-border/80 rounded-xl overflow-y-hidden overflow-x-auto scrollbar-thin bg-background relative shadow-2xs flex flex-col">
          <div className="min-w-[700px] flex flex-col h-full min-h-0 flex-1">
            {/* Header: Sticky Day columns */}
            <div className="grid grid-cols-8 divide-x divide-border/70 border-b border-border/70 bg-muted/95 backdrop-blur-xs shrink-0 z-20 shadow-2xs">
              <div className="py-1.5 px-1 text-[11px] font-bold text-muted-foreground text-center flex items-center justify-center">
                <Clock className="w-3.5 h-3.5 text-muted-foreground/70" />
              </div>
              {weekDays.map((day, i) => {
                const isToday = isSameDay(day, today);
                const isOutside =
                  startOfDay(day) < startOfDay(scheduleStartDate) ||
                  startOfDay(day) > startOfDay(scheduleEndDate);

                const dow = (getDay(day) + 6) % 7;
                const dayEnum = (Object.keys(DAY_INDEX).find(
                  (k) => DAY_INDEX[k] === dow
                ) || "MONDAY") as DayOfWeek;

                const isDayDisabled = isDayDisabledForGroup(dayEnum);

                return (
                  <div
                    key={i}
                    className={`py-1 px-1 text-center flex flex-col items-center justify-center transition-colors ${
                      isToday ? "bg-primary/10 font-bold" : ""
                    } ${isOutside ? "opacity-50 bg-muted/30" : ""} ${
                      isDayDisabled ? "bg-muted/70 opacity-80" : ""
                    }`}
                  >
                    <div className="text-[10px] font-bold uppercase text-muted-foreground flex items-center justify-center gap-1">
                      <span>{DAY_NAMES_ES[i]}</span>
                      {isDayDisabled && (
                        <Lock className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400 shrink-0" />
                      )}
                    </div>
                    <div
                      className={`text-[11px] font-extrabold w-5 h-5 flex items-center justify-center rounded-full ${
                        isToday
                          ? "bg-primary text-primary-foreground"
                          : isDayDisabled
                          ? "text-muted-foreground line-through"
                          : "text-foreground"
                      }`}
                    >
                      {format(day, "d")}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Calendar Body: Time rows & day columns adapted to 100% height without vertical scroll */}
            <div className="grid grid-cols-8 divide-x divide-border/70 relative flex-1 min-h-0 h-full">
              {/* Hour labels on left column */}
              <div className="flex flex-col text-[9px] text-muted-foreground font-mono bg-muted/10 select-none h-full min-h-0 divide-y divide-border/30">
                {Array.from({ length: gridHoursLength }, (_, i) => i + minHour).map((h) => (
                  <div
                    key={h}
                    className="flex-1 min-h-0 px-1 py-0.5 flex items-center justify-center text-[10px] font-mono text-muted-foreground border-b border-border/30 last:border-b-0"
                  >
                    {formatHour12h(h)}
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {weekDays.map((day, di) => {
                const isToday = isSameDay(day, today);
                const isOutside =
                  startOfDay(day) < startOfDay(scheduleStartDate) ||
                  startOfDay(day) > startOfDay(scheduleEndDate);

                const dow = (getDay(day) + 6) % 7;
                const dayEnum = (Object.keys(DAY_INDEX).find(
                  (k) => DAY_INDEX[k] === dow
                ) || "MONDAY") as DayOfWeek;

                const isDayDisabled = isDayDisabledForGroup(dayEnum);
                const dayEvents = getEventsForDay(day);

                // Active Novelties on this date for the group or general
                const dayStr = format(day, "yyyy-MM-dd");
                const activeDayNovelties = (novelties || []).filter((n) => {
                  const isTargetGroup = n.isGeneral || n.groupId === group.id;
                  const startStr = formatCalendarDate(n.startDate, "yyyy-MM-dd");
                  const endStr = formatCalendarDate(n.endDate, "yyyy-MM-dd");
                  return isTargetGroup && dayStr >= startStr && dayStr <= endStr;
                });

                return (
                  <div
                    key={di}
                    className={`relative flex flex-col transition-colors h-full min-h-0 ${
                      isToday ? "bg-primary/5" : ""
                    } ${isOutside ? "bg-muted/30 opacity-60" : ""} ${
                      isDayDisabled
                        ? "bg-muted/40 opacity-75 select-none bg-[linear-gradient(135deg,rgba(0,0,0,0.03)_25%,transparent_25%,transparent_50%,rgba(0,0,0,0.03)_50%,rgba(0,0,0,0.03)_75%,transparent_75%,transparent)] bg-[length:16px_16px]"
                        : ""
                    }`}
                  >
                    {activeDayNovelties.length > 0 && (
                      <div
                        className="bg-amber-500/20 border-b border-amber-300 dark:border-amber-700 px-1 py-0.5 text-[9px] font-black text-amber-700 dark:text-amber-300 flex items-center gap-1 shrink-0 z-10"
                        title={activeDayNovelties.map((n) => `${n.title}: ${n.description || ""}`).join(" | ")}
                      >
                        <AlertTriangle className="w-2.5 h-2.5 shrink-0 text-amber-600" />
                        <span className="truncate">{activeDayNovelties[0].title}</span>
                      </div>
                    )}

                    {/* Inner Slots and Events Container stretching 100% */}
                    <div className="relative flex-1 min-h-0 flex flex-col h-full divide-y divide-border/30">
                      {/* Hour slots background */}
                      {Array.from({ length: gridHoursLength }, (_, h) => {
                        const hourNum = h + minHour;
                        const hourStr = `${String(hourNum).padStart(2, "0")}:00`;
                        const nextHourStr = `${String(hourNum + 1).padStart(2, "0")}:00`;

                        return (
                          <div
                            key={h}
                            onClick={() => {
                              if (isDayDisabled) {
                                toast.info(`El día ${DAY_NAMES_ES_FULL[di]} está configurado como NO LECTIVO para la Ficha ${group.name}`);
                              } else if (!isOutside) {
                                onOpenScheduleModal(dayEnum, hourStr, nextHourStr);
                              }
                            }}
                            className={`flex-1 min-h-0 relative group/cell cursor-pointer transition-colors border-b border-border/30 last:border-b-0 ${
                              isDayDisabled
                                ? "cursor-not-allowed hover:bg-amber-500/5"
                                : !isOutside
                                ? "hover:bg-primary/10"
                                : ""
                            }`}
                            title={
                              isDayDisabled
                                ? `Día No Lectivo (Bloqueado) - Ficha ${group.name}`
                                : !isOutside
                                ? `Programar clase el ${DAY_NAMES_ES_FULL[di]} a las ${hourStr}`
                                : undefined
                            }
                          >
                            {!isOutside && !isDayDisabled && (
                              <Plus className="w-2.5 h-2.5 text-primary absolute right-0.5 top-0.5 opacity-0 group-hover/cell:opacity-100 transition-opacity" />
                            )}
                          </div>
                        );
                      })}

                      {/* Watermark badge for disabled non-lectivo days */}
                      {isDayDisabled && dayEvents.length === 0 && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-2 text-center text-muted-foreground/60 z-0">
                          <div className="w-7 h-7 rounded-full bg-card/90 border border-border/80 flex items-center justify-center mb-1 shadow-2xs">
                            <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          </div>
                          <span className="text-[10px] font-extrabold tracking-tight text-foreground/70">
                            Día No Lectivo
                          </span>
                          <span className="text-[9px] text-muted-foreground font-mono">
                            Bloqueado
                          </span>
                        </div>
                      )}

                      {/* Scheduled Class Cards positioned dynamically with percentages */}
                      {dayEvents.map((evt) => {
                        const [sh, sm] = evt.startTime.split(":").map(Number);
                        const [eh, em] = evt.endTime.split(":").map(Number);
                        const startMinutes = (sh - minHour) * 60 + sm;
                        const durationMinutes = (eh - minHour) * 60 + em - startMinutes;
                        const totalGridMinutes = gridHoursLength * 60;
                        const topPercent = (startMinutes / totalGridMinutes) * 100;
                        const heightPercent = (durationMinutes / totalGridMinutes) * 100;

                        const colorClass = COURSE_COLORS[evt.colorIndex];

                        return (
                          <Tooltip key={evt.courseScheduleId}>
                            <TooltipTrigger asChild>
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenScheduleModal(
                                    evt.dayOfWeek,
                                    evt.startTime,
                                    evt.endTime,
                                    {
                                      courseScheduleId: evt.courseScheduleId,
                                      courseTitle: evt.courseTitle,
                                      teacherId: evt.teacherId,
                                      dayOfWeek: evt.dayOfWeek,
                                      startTime: evt.startTime,
                                      endTime: evt.endTime,
                                    }
                                  );
                                }}
                                style={{
                                  top: `${topPercent}%`,
                                  height: `calc(${heightPercent}% - 2px)`,
                                }}
                                className={`absolute left-0.5 right-0.5 rounded-lg border p-1.5 text-left text-xs font-medium overflow-hidden transition-all shadow-2xs z-10 flex flex-col justify-between group/card cursor-pointer hover:ring-2 hover:ring-primary/40 ${colorClass} ${
                                  evt.hasOverlap ? "ring-2 ring-red-500 border-red-500/80 shadow-md" : ""
                                }`}
                              >
                                <div className="space-y-0.5 overflow-hidden">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-extrabold text-[10px] truncate leading-tight text-foreground flex items-center gap-1">
                                      {evt.hasOverlap && (
                                        <AlertTriangle className="w-3 h-3 text-red-600 dark:text-red-400 shrink-0" />
                                      )}
                                      <span className="truncate">{evt.courseTitle}</span>
                                    </span>
                                    <div className="flex items-center gap-1 shrink-0">
                                      {renderTimeOfDayIcon(evt.startTime, evt.endTime)}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onDeleteClassSlot(evt.courseScheduleId);
                                        }}
                                        className="text-muted-foreground/60 hover:text-destructive opacity-0 group-hover/card:opacity-100 transition-opacity shrink-0"
                                        title="Eliminar franja"
                                      >
                                        <Trash2 className="w-2.5 h-2.5" />
                                      </button>
                                    </div>
                                  </div>

                                  {evt.teacherName && (
                                    <div className="flex items-center gap-0.5 text-[9px] text-muted-foreground truncate">
                                      <GraduationCap className="w-2.5 h-2.5 text-primary shrink-0" />
                                      <span className="truncate">{getCompactTeacherName(evt.teacherName)}</span>
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center justify-between gap-1">
                                  <div className="text-[9px] font-mono font-bold opacity-80 flex items-center gap-0.5">
                                    <Clock className="w-2 h-2" />
                                    {toFormat12h(evt.startTime)} – {toFormat12h(evt.endTime)}
                                  </div>
                                  {evt.hasOverlap && (
                                    <span className="text-[8px] font-black text-red-600 dark:text-red-400 bg-red-500/15 px-1 py-0 rounded border border-red-500/30 shrink-0">
                                      Solapado
                                    </span>
                                  )}
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="rounded-2xl p-2.5 max-w-xs space-y-1.5">
                              {evt.hasOverlap && (
                                <div className="text-[11px] text-red-700 dark:text-red-300 font-bold flex items-center gap-1.5 bg-red-500/15 p-1.5 rounded-xl border border-red-500/30">
                                  <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                                  <span>¡Conflicto de superposición con otra clase en esta misma ficha!</span>
                                </div>
                              )}
                              <p className="font-extrabold text-xs text-foreground">{evt.courseTitle}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {DAY_NAMES_ES_FULL[DAY_INDEX[evt.dayOfWeek]]} de {toFormat12h(evt.startTime)} a {toFormat12h(evt.endTime)}
                              </p>
                              {evt.teacherName && (
                                <p className="text-[11px] text-primary font-medium">Docente: {getCleanTeacherName(evt.teacherName)}</p>
                              )}
                              {group.environment && (
                                <p className="text-[11px] text-muted-foreground">Ambiente: {group.environment.name}</p>
                              )}
                              <p className="text-[10px] text-primary/80 font-bold pt-1 border-t border-border/40">
                                Haz clic para editar esta clase
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MONTH VIEW */}
      {view === "month" && (
        <div className="flex-1 min-h-0 border border-border/80 rounded-xl overflow-y-auto overflow-x-auto scrollbar-thin bg-background relative shadow-2xs">
          <div className="min-w-[650px] flex flex-col h-full">
            <div className="grid grid-cols-7 divide-x divide-border/70 border-b border-border/70 bg-muted/95 backdrop-blur-xs sticky top-0 z-20">
              {DAY_NAMES_ES.map((d) => (
                <div key={d} className="py-1 text-center text-[10px] font-bold text-muted-foreground uppercase">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 divide-x divide-y divide-border/70 flex-1">
              {monthDays.map((day, idx) => {
                const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                const isToday = isSameDay(day, today);
                const isOutside =
                  startOfDay(day) < startOfDay(scheduleStartDate) ||
                  startOfDay(day) > startOfDay(scheduleEndDate);

                const dayEvents = getEventsForDay(day);

                return (
                  <div
                    key={idx}
                    className={`min-h-[85px] p-1.5 flex flex-col justify-between transition-colors ${
                      !isCurrentMonth ? "bg-muted/30 opacity-40" : ""
                    } ${isToday ? "bg-primary/5 font-bold" : ""} ${
                      isOutside ? "opacity-40 bg-muted/20" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span
                        className={`text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full ${
                          isToday ? "bg-primary text-primary-foreground" : "text-foreground"
                        }`}
                      >
                        {format(day, "d")}
                      </span>

                      {!isOutside && (
                        <button
                          type="button"
                          onClick={() => {
                            const dow = (getDay(day) + 6) % 7;
                            const dayEnum = (Object.keys(DAY_INDEX).find(
                              (k) => DAY_INDEX[k] === dow
                            ) || "MONDAY") as DayOfWeek;
                            onOpenScheduleModal(dayEnum, "08:00", "12:00");
                          }}
                          className="text-muted-foreground/60 hover:text-primary p-0.5 rounded"
                          title="Programar clase"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-0.5 overflow-y-auto max-h-16">
                      {dayEvents.map((evt) => {
                        const colorClass = COURSE_COLORS[evt.colorIndex];

                        return (
                          <div
                            key={evt.courseScheduleId}
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenScheduleModal(
                                evt.dayOfWeek,
                                evt.startTime,
                                evt.endTime,
                                {
                                  courseScheduleId: evt.courseScheduleId,
                                  courseTitle: evt.courseTitle,
                                  teacherId: evt.teacherId,
                                  dayOfWeek: evt.dayOfWeek,
                                  startTime: evt.startTime,
                                  endTime: evt.endTime,
                                }
                              );
                            }}
                            className={`p-0.5 px-1 rounded border text-[9px] truncate leading-tight font-medium cursor-pointer hover:opacity-80 transition-all ${colorClass}`}
                            title={`${evt.courseTitle} (${evt.startTime} - ${evt.endTime})`}
                          >
                            <span className="font-bold">{evt.startTime}</span> {evt.courseTitle}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
