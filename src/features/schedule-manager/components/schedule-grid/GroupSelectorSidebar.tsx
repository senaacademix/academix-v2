"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Search,
  Users,
  Clock,
  GraduationCap,
  Building,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldAlert,
  Sun,
  Cloud,
  Moon,
  FolderKanban,
  GitBranch,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DayOfWeek } from "@/generated/prisma/client";
import { ScheduleBuilderData } from "../../actions/scheduleBuilderActions";

const getDayJornadaIcon = (startTime?: string, endTime?: string) => {
  if (!startTime || !endTime) return null;
  const [sh] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const effectiveEndH = em > 0 ? eh + 1 : eh;

  if (sh < 12 && effectiveEndH <= 12) {
    return <Cloud className="w-2 h-2 text-sky-500 shrink-0" />;
  }
  if (sh >= 12 && effectiveEndH <= 18) {
    return <Sun className="w-2 h-2 text-orange-500 shrink-0" />;
  }
  if (sh >= 18) {
    return <Moon className="w-2 h-2 text-purple-600 dark:text-purple-400 shrink-0" />;
  }
  if (sh < 12 && effectiveEndH > 12) {
    return (
      <span className="inline-flex items-center gap-0.5 shrink-0">
        <Cloud className="w-1.5 h-1.5 text-sky-500" />
        <Sun className="w-1.5 h-1.5 text-orange-500" />
      </span>
    );
  }
  return <Cloud className="w-2 h-2 text-sky-500 shrink-0" />;
};

const DAYS_ORDER: { key: DayOfWeek; label: string; short: string }[] = [
  { key: "MONDAY", label: "Lunes", short: "L" },
  { key: "TUESDAY", label: "Martes", short: "M" },
  { key: "WEDNESDAY", label: "Miércoles", short: "X" },
  { key: "THURSDAY", label: "Jueves", short: "J" },
  { key: "FRIDAY", label: "Viernes", short: "V" },
  { key: "SATURDAY", label: "Sábado", short: "S" },
  { key: "SUNDAY", label: "Domingo", short: "D" },
];

const toFormat12h = (t24: string) => {
  if (!t24) return "";
  const [h, m] = t24.split(":").map(Number);
  const ap = h >= 12 ? "p.m." : "a.m.";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ap}`;
};

interface GroupSelectorSidebarProps {
  groups: ScheduleBuilderData["groups"];
  teachers: ScheduleBuilderData["teachers"];
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string) => void;
}

export function GroupSelectorSidebar({
  groups,
  teachers,
  selectedGroupId,
  onSelectGroup,
}: GroupSelectorSidebarProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "complete">("all");
  const [selectedProgramId, setSelectedProgramId] = useState<string>("all");
  const [selectedTimelineId, setSelectedTimelineId] = useState<string>("all");

  const programs = React.useMemo(() => {
    const map = new Map<string, string>();
    groups.forEach((g) => {
      if (g.program?.id && g.program?.name) {
        map.set(g.program.id, g.program.name);
      }
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [groups]);

  const timelines = React.useMemo(() => {
    const map = new Map<string, string>();
    groups.forEach((g) => {
      if (selectedProgramId !== "all" && g.program?.id !== selectedProgramId) return;
      if (g.period?.timeline?.id && g.period?.timeline?.name) {
        map.set(g.period.timeline.id, g.period.timeline.name);
      }
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [groups, selectedProgramId]);

  const hasUnassignedTimeline = React.useMemo(() => {
    return groups.some((g) => {
      if (selectedProgramId !== "all" && g.program?.id !== selectedProgramId) return false;
      return !g.period?.timeline?.id;
    });
  }, [groups, selectedProgramId]);

  // Reset timeline selection if it is no longer valid
  React.useEffect(() => {
    if (
      selectedTimelineId !== "all" &&
      selectedTimelineId !== "unassigned" &&
      !timelines.some((t) => t.id === selectedTimelineId)
    ) {
      setSelectedTimelineId("all");
    }
  }, [timelines, selectedTimelineId]);

  const checkGroupHasPending = (g: typeof groups[0]) => {
    // 1. Horas requeridas vs programadas
    const scheduledHoursByCourseTitle = new Map<string, number>();
    g.scheduledClasses.forEach((c) => {
      let hours = 0;
      c.schedules.forEach((s) => {
        const [sh, sm] = s.startTime.split(":").map(Number);
        const [eh, em] = s.endTime.split(":").map(Number);
        hours += (eh * 60 + em - (sh * 60 + sm)) / 60;
      });
      scheduledHoursByCourseTitle.set(c.title.toLowerCase(), hours);
    });

    const totalRequiredHours = g.trimesterCourses.reduce((acc, c) => acc + c.weeklyHours, 0);
    const totalScheduledHours = Array.from(scheduledHoursByCourseTitle.values()).reduce(
      (acc, h) => acc + h,
      0
    );

    if (totalRequiredHours > 0 && totalScheduledHours < totalRequiredHours) {
      return true;
    }

    // 2. Si no tiene clases
    if (g.scheduledClasses.length === 0) return true;

    // 3. Clases con docente o ambiente faltante, o colisión/sin calificación
    for (const c of g.scheduledClasses) {
      if (!c.teacher) return true;
      const matchedTeacher = teachers.find((t) => t.id === c.teacher?.id);
      if (!matchedTeacher) return true;

      const courseTemplate = g.trimesterCourses.find(
        (tc) => tc.title.toLowerCase() === c.title.toLowerCase()
      );
      const isQualified = courseTemplate
        ? courseTemplate.qualifiedTeacherIds.includes(matchedTeacher.id) ||
          matchedTeacher.qualifiedCourseTitles.some(
            (qt) => qt.toLowerCase() === c.title.toLowerCase()
          )
        : false;
      if (!isQualified) return true;

      for (const s of c.schedules) {
        const isDayAvail = matchedTeacher.availability.some(
          (a) => a.dayOfWeek === s.dayOfWeek && a.startTime <= s.startTime && a.endTime >= s.endTime
        );
        if (!isDayAvail) return true;

        const hasCollision = matchedTeacher.scheduledSlots.some(
          (slot) =>
            slot.groupId !== g.id &&
            slot.dayOfWeek === s.dayOfWeek &&
            slot.startTime < s.endTime &&
            slot.endTime > s.startTime
        );
        if (hasCollision) return true;
      }
    }

    return false;
  };

  const pendingGroupsCount = groups.filter((g) => checkGroupHasPending(g)).length;
  const completeGroupsCount = groups.length - pendingGroupsCount;

  const filteredGroups = groups.filter((g) => {
    const matchesProgram =
      selectedProgramId === "all" || g.program?.id === selectedProgramId;

    const matchesTimeline =
      selectedTimelineId === "all"
        ? true
        : selectedTimelineId === "unassigned"
        ? !g.period?.timeline?.id
        : g.period?.timeline?.id === selectedTimelineId ||
          (g.period as any)?.timelineId === selectedTimelineId;

    const matchesSearch =
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.program.name.toLowerCase().includes(search.toLowerCase()) ||
      (g.period?.name && g.period.name.toLowerCase().includes(search.toLowerCase())) ||
      (g.period?.timeline?.name &&
        g.period.timeline.name.toLowerCase().includes(search.toLowerCase()));

    if (!matchesProgram || !matchesTimeline || !matchesSearch) return false;

    const hasPending = checkGroupHasPending(g);
    if (statusFilter === "pending") return hasPending;
    if (statusFilter === "complete") return !hasPending;
    return true;
  });

  // Automatically select first group in filtered list if active group was filtered out
  React.useEffect(() => {
    if (filteredGroups.length > 0) {
      const isCurrentSelectedInFiltered = filteredGroups.some((g) => g.id === selectedGroupId);
      if (!isCurrentSelectedInFiltered) {
        onSelectGroup(filteredGroups[0].id);
      }
    }
  }, [filteredGroups, selectedGroupId, onSelectGroup]);

  return (
    <div className="w-full md:w-64 shrink-0 h-full flex flex-col rounded-2xl bg-card border border-border/80 p-3 space-y-2 shadow-xs overflow-hidden min-h-0">
      {/* Title & Filter Icon Buttons (Sin texto, solo tooltips) */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-primary" />
          <h3 className="font-extrabold text-xs text-foreground">
            Fichas / Grupos ({groups.length})
          </h3>
        </div>

        {/* Filter Icon Buttons */}
        <div className="flex items-center gap-0.5 bg-muted/40 p-0.5 rounded-xl border border-border/70">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`w-6 h-6 rounded-lg transition-all flex items-center justify-center ${
                  statusFilter === "all"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="text-xs">
              Todas las fichas ({groups.length})
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setStatusFilter("pending")}
                className={`w-6 h-6 rounded-lg transition-all flex items-center justify-center ${
                  statusFilter === "pending"
                    ? "bg-amber-600 text-white shadow-2xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="text-xs">
              Fichas con pendientes ({pendingGroupsCount})
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setStatusFilter("complete")}
                className={`w-6 h-6 rounded-lg transition-all flex items-center justify-center ${
                  statusFilter === "complete"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="text-xs">
              Fichas completas sin pendientes ({completeGroupsCount})
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Program Selector Filter */}
      {programs.length > 1 && (
        <div className="shrink-0">
          <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
            <SelectTrigger className="w-full h-7 text-[11px] rounded-xl bg-muted/40 border-border/70 font-semibold px-2 gap-1.5 shadow-2xs">
              <FolderKanban className="w-3 h-3 text-primary shrink-0" />
              <SelectValue placeholder="Programa" />
            </SelectTrigger>
            <SelectContent className="rounded-xl text-xs max-h-56">
              <SelectItem value="all" className="font-bold cursor-pointer">
                Todos los Programas ({programs.length})
              </SelectItem>
              {programs.map((p) => (
                <SelectItem key={p.id} value={p.id} className="cursor-pointer font-medium">
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Timeline Selector Filter */}
      {timelines.length > 0 && (
        <div className="shrink-0">
          <Select value={selectedTimelineId} onValueChange={setSelectedTimelineId}>
            <SelectTrigger className="w-full h-7 text-[11px] rounded-xl bg-primary/10 border-primary/20 font-semibold px-2 gap-1.5 shadow-2xs text-primary hover:bg-primary/15 transition-colors">
              <GitBranch className="w-3 h-3 text-primary shrink-0" />
              <SelectValue placeholder="Línea de Tiempo" />
            </SelectTrigger>
            <SelectContent className="rounded-xl text-xs max-h-56">
              <SelectItem value="all" className="font-bold cursor-pointer">
                Todas las Líneas ({timelines.length})
              </SelectItem>
              {timelines.map((t) => (
                <SelectItem key={t.id} value={t.id} className="cursor-pointer font-medium">
                  {t.name}
                </SelectItem>
              ))}
              {hasUnassignedTimeline && (
                <SelectItem value="unassigned" className="cursor-pointer text-muted-foreground font-medium">
                  Sin Línea Asignada
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Search */}
      <div className="relative shrink-0">
        <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar ficha..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-7 text-xs rounded-xl bg-muted/30 border-border/70"
        />
      </div>

      {/* Groups List */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-0.5 scrollbar-thin">
        {filteredGroups.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted-foreground">
            No se encontraron grupos con este filtro.
          </div>
        ) : (
          filteredGroups.map((g) => {
            const isSelected = g.id === selectedGroupId;

            // Group classes by day of week
            const dayClassesMap: Record<DayOfWeek, Array<{
              title: string;
              startTime: string;
              endTime: string;
              teacherId?: string;
              teacherName: string | null;
            }>> = {
              MONDAY: [],
              TUESDAY: [],
              WEDNESDAY: [],
              THURSDAY: [],
              FRIDAY: [],
              SATURDAY: [],
              SUNDAY: [],
            };

            g.scheduledClasses.forEach((c) => {
              c.schedules.forEach((s) => {
                if (dayClassesMap[s.dayOfWeek]) {
                  dayClassesMap[s.dayOfWeek].push({
                    title: c.title,
                    startTime: s.startTime,
                    endTime: s.endTime,
                    teacherId: c.teacher?.id,
                    teacherName: c.teacher?.name || null,
                  });
                }
              });
            });

            // Configured day slots map
            const configSlotsMap = new Map<DayOfWeek, { startTime: string; endTime: string }>();
            g.daySlotsConfig.forEach((ds) => {
              configSlotsMap.set(ds.dayOfWeek, {
                startTime: ds.startTime,
                endTime: ds.endTime,
              });
            });

            return (
              <div
                key={g.id}
                onClick={() => onSelectGroup(g.id)}
                className={`p-2.5 rounded-xl border cursor-pointer transition-all flex flex-col gap-1.5 ${
                  isSelected
                    ? "bg-primary/10 border-primary shadow-2xs ring-1 ring-primary/30"
                    : "bg-muted/10 border-border/60 hover:bg-muted/25 hover:border-border"
                }`}
              >
                {/* Header: Ficha & Trimester Badge */}
                <div className="flex items-center justify-between gap-1.5">
                  <span className="font-extrabold text-xs text-foreground truncate">
                    Ficha {g.name}
                  </span>
                  {g.period && (
                    <Badge
                      variant="secondary"
                      className="text-[9px] font-bold px-1.5 py-0 h-4 rounded-md shrink-0"
                    >
                      {g.period.name}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between gap-1 text-[11px] text-muted-foreground leading-tight min-w-0">
                  <span className="truncate">{g.program.name}</span>
                  {g.period?.timeline?.name && (
                    <span
                      title={g.period.timeline.name}
                      className="text-[9px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20 shrink-0 truncate max-w-[120px]"
                    >
                      {g.period.timeline.name}
                    </span>
                  )}
                </div>

                {/* 7-Day Mini Weekly Preview Bar with Direct Visible Compliance Indicators */}
                <div className="pt-1.5 border-t border-border/40 space-y-1.5">
                  <div className="grid grid-cols-7 gap-1">
                    {DAYS_ORDER.map((day) => {
                      const dayClasses = dayClassesMap[day.key];
                      const dayConfig = configSlotsMap.get(day.key);
                      const isConfigured = !!dayConfig;
                      const hasClasses = dayClasses.length > 0;

                      // Evaluation of 4 Compliance Checks for this Day
                      let totalMinutes = 0;
                      let hasTeacherConflict = false;
                      let isTeacherUnqualified = false;
                      let hasNoTeacher = false;

                      dayClasses.forEach((cls) => {
                        const [sh, sm] = cls.startTime.split(":").map(Number);
                        const [eh, em] = cls.endTime.split(":").map(Number);
                        totalMinutes += (eh * 60 + em - (sh * 60 + sm));

                        if (!cls.teacherId) {
                          hasNoTeacher = true;
                        } else {
                          const teacher = teachers.find((t) => t.id === cls.teacherId);
                          if (teacher) {
                            // 1. Availability check
                            const isAvail = teacher.availability.some(
                              (a) =>
                                a.dayOfWeek === day.key &&
                                a.startTime <= cls.startTime &&
                                a.endTime >= cls.endTime
                            );
                            const hasCollision = teacher.scheduledSlots.some(
                              (slot) =>
                                slot.dayOfWeek === day.key &&
                                slot.groupId !== g.id &&
                                !(slot.endTime <= cls.startTime || slot.startTime >= cls.endTime)
                            );
                            if (!isAvail || hasCollision) {
                              hasTeacherConflict = true;
                            }

                            // 2. Qualification check
                            const trimesterCourse = g.trimesterCourses.find(
                              (tc) => tc.title.toLowerCase() === cls.title.toLowerCase()
                            );
                            const isQualified = trimesterCourse
                              ? trimesterCourse.qualifiedTeacherIds.includes(teacher.id) ||
                                teacher.qualifiedCourseTitles.some(
                                  (title) => title.toLowerCase() === cls.title.toLowerCase()
                                )
                              : false;

                            if (!isQualified) {
                              isTeacherUnqualified = true;
                            }
                          }
                        }
                      });

                      // 3. Schedule Completeness Check
                      let configMinutes = 0;
                      let isScheduleIncomplete = false;
                      if (dayConfig) {
                        const [csh, csm] = dayConfig.startTime.split(":").map(Number);
                        const [ceh, cem] = dayConfig.endTime.split(":").map(Number);
                        configMinutes = ceh * 60 + cem - (csh * 60 + csm);
                        if (totalMinutes < configMinutes) {
                          isScheduleIncomplete = true;
                        }
                      }

                      // 4. Environment Check
                      const hasNoEnvironment = !g.environment;

                      // Colors for each individual indicator:
                      // 1. Horario Dot:
                      let horColor = "bg-muted-foreground/20";
                      if (hasClasses) {
                        horColor = isScheduleIncomplete ? "bg-amber-500" : "bg-emerald-500";
                      } else if (isConfigured) {
                        horColor = "bg-muted-foreground/30";
                      }

                      // 2. Docente Disponible Dot:
                      let dispColor = "bg-muted-foreground/20";
                      if (hasClasses) {
                        if (hasNoTeacher) dispColor = "bg-amber-500";
                        else if (hasTeacherConflict) dispColor = "bg-red-500";
                        else dispColor = "bg-emerald-500";
                      }

                      // 3. Docente Calificado Dot:
                      let califColor = "bg-muted-foreground/20";
                      if (hasClasses && !hasNoTeacher) {
                        califColor = isTeacherUnqualified ? "bg-red-500" : "bg-emerald-500";
                      }

                      // 4. Ambiente Dot:
                      let envColor = "bg-muted-foreground/20";
                      if (hasClasses) {
                        envColor = hasNoEnvironment ? "bg-amber-500" : "bg-emerald-500";
                      }

                      // Overall Block Color
                      let blockColor = "bg-emerald-500";
                      let blockBorder = "border-emerald-500/60";

                      if (hasTeacherConflict || isTeacherUnqualified) {
                        blockColor = "bg-red-500";
                        blockBorder = "border-red-500/60";
                      } else if (hasNoTeacher || isScheduleIncomplete || hasNoEnvironment) {
                        blockColor = "bg-amber-500";
                        blockBorder = "border-amber-500/60";
                      }

                      return (
                        <Tooltip key={day.key}>
                          <TooltipTrigger asChild>
                            <div className="flex flex-col items-center gap-0.5 group/day">
                              <div className="flex items-center gap-0.5">
                                <span className="text-[8px] font-black text-muted-foreground group-hover/day:text-foreground select-none">
                                  {day.short}
                                </span>
                                {dayConfig && getDayJornadaIcon(dayConfig.startTime, dayConfig.endTime)}
                              </div>

                              {/* Mini day class slot block */}
                              <div
                                className={`w-full h-5 rounded-md p-0.5 flex flex-col justify-start gap-0.5 border transition-all ${
                                  hasClasses
                                    ? "bg-muted/50 border-border/80 shadow-2xs"
                                    : isConfigured
                                    ? "bg-muted/20 border-dashed border-border/50"
                                    : "bg-muted/10 border-transparent opacity-40"
                                }`}
                              >
                                {hasClasses ? (
                                  dayClasses.map((_, ci) => (
                                    <div
                                      key={ci}
                                      className={`w-full h-1.5 rounded-[2px] ${blockColor} shadow-2xs border ${blockBorder}`}
                                    />
                                  ))
                                ) : isConfigured ? (
                                  <div className="w-full h-full rounded-[2px] bg-primary/10" />
                                ) : null}
                              </div>

                              {/* 4 Visible Compliance Micro-Dots directly in UI without tooltip */}
                              <div className="grid grid-cols-2 gap-0.5 w-full pt-0.5 px-0.5">
                                <div
                                  className={`w-1.5 h-1.5 rounded-full ${horColor} mx-auto`}
                                  title="Horario completo"
                                />
                                <div
                                  className={`w-1.5 h-1.5 rounded-full ${dispColor} mx-auto`}
                                  title="Instructor disponible"
                                />
                                <div
                                  className={`w-1.5 h-1.5 rounded-full ${califColor} mx-auto`}
                                  title="Instructor calificado"
                                />
                                <div
                                  className={`w-1.5 h-1.5 rounded-full ${envColor} mx-auto`}
                                  title="Ambiente asignado"
                                />
                              </div>
                            </div>
                          </TooltipTrigger>

                          {/* Tooltip Content with Full 4-point Compliance Details */}
                          <TooltipContent side="right" className="rounded-2xl p-3 max-w-xs space-y-2 shadow-2xl bg-card border-border text-foreground">
                            <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-1.5">
                              <span className="font-extrabold text-xs text-foreground">
                                {day.label}
                              </span>
                              {dayConfig && (
                                <span className="text-[10px] font-mono text-muted-foreground">
                                  Jornada: {dayConfig.startTime} - {dayConfig.endTime}
                                </span>
                              )}
                            </div>

                            {/* 4 Compliance Checklist Badges */}
                            <div className="space-y-1 text-[10px]">
                              {/* 1. Horario Completo */}
                              <div className="flex items-center justify-between gap-2">
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <Clock className="w-3 h-3 text-primary" /> Horario del grupo:
                                </span>
                                {!hasClasses ? (
                                  <span className="text-muted-foreground font-semibold">Sin clases</span>
                                ) : isScheduleIncomplete ? (
                                  <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-0.5">
                                    <AlertTriangle className="w-3 h-3" /> Incompleto ({totalMinutes / 60}h / {configMinutes / 60}h)
                                  </span>
                                ) : (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                                    <CheckCircle2 className="w-3 h-3" /> Completo ({totalMinutes / 60}h)
                                  </span>
                                )}
                              </div>

                              {/* 2. Docente Disponible */}
                              <div className="flex items-center justify-between gap-2">
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <GraduationCap className="w-3 h-3 text-primary" /> Disponibilidad del instructor:
                                </span>
                                {hasNoTeacher ? (
                                  <span className="text-amber-600 font-semibold flex items-center gap-0.5">
                                    <AlertTriangle className="w-3 h-3" /> Sin instructor
                                  </span>
                                ) : hasTeacherConflict ? (
                                  <span className="text-destructive font-bold flex items-center gap-0.5">
                                    <XCircle className="w-3 h-3" /> No disponible / Colisión
                                  </span>
                                ) : (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                                    <CheckCircle2 className="w-3 h-3" /> Disponible
                                  </span>
                                )}
                              </div>

                              {/* 3. Docente Calificado */}
                              <div className="flex items-center justify-between gap-2">
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <ShieldAlert className="w-3 h-3 text-primary" /> Calificado para materia:
                                </span>
                                {hasNoTeacher ? (
                                  <span className="text-muted-foreground">N/A</span>
                                ) : isTeacherUnqualified ? (
                                  <span className="text-destructive font-bold flex items-center gap-0.5">
                                    <XCircle className="w-3 h-3" /> No calificado
                                  </span>
                                ) : (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                                    <CheckCircle2 className="w-3 h-3" /> Calificado
                                  </span>
                                )}
                              </div>

                              {/* 4. Ambiente de Formación */}
                              <div className="flex items-center justify-between gap-2">
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <Building className="w-3 h-3 text-primary" /> Ambiente de formación:
                                </span>
                                {g.environment ? (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-bold truncate max-w-[120px]">
                                    {g.environment.name}
                                  </span>
                                ) : (
                                  <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-0.5">
                                    <AlertTriangle className="w-3 h-3" /> Sin ambiente
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Classes List */}
                            {dayClasses.length > 0 && (
                              <div className="space-y-1.5 pt-1 border-t border-border/40">
                                {dayClasses.map((cls, ci) => (
                                  <div key={ci} className="space-y-0.5 bg-muted/30 p-1.5 rounded-lg">
                                    <div className="flex items-center justify-between text-[9px] font-mono font-bold text-foreground">
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-2.5 h-2.5 text-primary" />
                                        {toFormat12h(cls.startTime)} - {toFormat12h(cls.endTime)}
                                      </span>
                                    </div>
                                    <p className="font-bold text-[10px] text-foreground leading-tight">
                                      {cls.title}
                                    </p>
                                    {cls.teacherName && (
                                      <p className="text-[9px] text-primary flex items-center gap-1">
                                        <GraduationCap className="w-2.5 h-2.5 shrink-0" />
                                        {cls.teacherName}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>

                  {/* Micro-Legend for the 4 indicators */}
                  <div className="flex items-center justify-between pt-1 border-t border-border/30 text-[8px] text-muted-foreground font-mono">
                    <span className="flex items-center gap-1" title="Horario Completo">
                      🕒 Hor
                    </span>
                    <span className="flex items-center gap-1" title="Instructor Disponible">
                      👨‍🏫 Disp
                    </span>
                    <span className="flex items-center gap-1" title="Instructor Calificado">
                      🎓 Calif
                    </span>
                    <span className="flex items-center gap-1" title="Ambiente Asignado">
                      🏛️ Amb
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
