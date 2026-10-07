"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users,
  Search,
  BookOpen,
  Clock,
  Building,
  GraduationCap,
  LayoutGrid,
  ChevronRight,
  Check,
  AlertCircle,
  Calendar,
  Lock,
  FileSpreadsheet,
  Download,
} from "lucide-react";
import { ScheduleBuilderData } from "../../actions/scheduleBuilderActions";
import { DayOfWeek } from "@/generated/prisma/client";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  getCompactTeacherName,
  getCleanTeacherName,
} from "../../utils/teacherNameFormatter";
import { generateAndDownloadScheduleExcel } from "../../utils/scheduleExcelExport";

const toFormat12h = (time24: string) => {
  if (!time24) return "";
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "p.m." : "a.m.";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
};

interface SchedulePanoramicViewProps {
  data: ScheduleBuilderData;
  isReadOnly?: boolean;
  onSelectGroupAndEdit: (groupId: string) => void;
  onOpenScheduleModal: (groupId: string, courseTitle?: string) => void;
}

const DAYS: Array<{ key: DayOfWeek; label: string; short: string }> = [
  { key: "MONDAY", label: "Lunes", short: "Lun" },
  { key: "TUESDAY", label: "Martes", short: "Mar" },
  { key: "WEDNESDAY", label: "Miércoles", short: "Mié" },
  { key: "THURSDAY", label: "Jueves", short: "Jue" },
  { key: "FRIDAY", label: "Viernes", short: "Vie" },
  { key: "SATURDAY", label: "Sábado", short: "Sáb" },
  { key: "SUNDAY", label: "Domingo", short: "Dom" },
];

interface ClassSlotItem {
  courseTitle: string;
  description: string | null;
  teacherName: string;
  environmentName: string | null;
  startTime: string;
  endTime: string;
}

interface DayTimelineItem {
  type: "class" | "free";
  startTime: string;
  endTime: string;
  durationHours: number;
  classData?: ClassSlotItem;
}

// Convert "HH:MM" to total minutes
const toMinutes = (time24: string) => {
  if (!time24) return 0;
  const [h, m] = time24.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

// Calculate duration in decimal hours (e.g. 3, 6, 4.5)
const getDurationHours = (startTime: string, endTime: string): number => {
  if (!startTime || !endTime) return 1;
  const startM = toMinutes(startTime);
  const endM = toMinutes(endTime);
  const diffHours = (endM - startM) / 60;
  return Math.max(0.5, Math.round(diffHours * 10) / 10);
};

// Calculate proportional card height based on duration in hours (for cards mode)
const getCardHeight = (durationHours: number): number => {
  if (durationHours <= 1) return 46;
  if (durationHours <= 1.5) return 52;
  if (durationHours <= 2) return 58;
  if (durationHours <= 2.5) return 68;
  if (durationHours <= 3) return 78;
  if (durationHours <= 4) return 106;
  if (durationHours <= 5) return 134;
  if (durationHours <= 6) return 162;
  if (durationHours <= 7) return 190;
  if (durationHours <= 8) return 218;
  return Math.round(durationHours * 27);
};

// Palette for Teacher Banners in Excel Matrix View (replicating the colorful SENA spreadsheet style)
const TEACHER_COLORS = [
  { bg: "bg-emerald-500 text-white dark:bg-emerald-600", border: "border-emerald-600" },
  { bg: "bg-rose-400 text-white dark:bg-rose-600", border: "border-rose-500" },
  { bg: "bg-amber-400 text-amber-950 dark:bg-amber-500", border: "border-amber-500" },
  { bg: "bg-cyan-500 text-white dark:bg-cyan-600", border: "border-cyan-600" },
  { bg: "bg-purple-500 text-white dark:bg-purple-600", border: "border-purple-600" },
  { bg: "bg-lime-400 text-lime-950 dark:bg-lime-500", border: "border-lime-500" },
  { bg: "bg-sky-500 text-white dark:bg-sky-600", border: "border-sky-600" },
  { bg: "bg-orange-400 text-orange-950 dark:bg-orange-500", border: "border-orange-500" },
  { bg: "bg-teal-500 text-white dark:bg-teal-600", border: "border-teal-600" },
  { bg: "bg-indigo-500 text-white dark:bg-indigo-600", border: "border-indigo-600" },
  { bg: "bg-fuchsia-500 text-white dark:bg-fuchsia-600", border: "border-fuchsia-600" },
  { bg: "bg-yellow-300 text-yellow-950 dark:bg-yellow-500", border: "border-yellow-400" },
];

function getTeacherColor(name: string) {
  if (!name || name === "Sin instructor" || name === "Sin profesor") {
    return {
      bg: "bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200",
      border: "border-slate-400",
    };
  }
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % TEACHER_COLORS.length;
  return TEACHER_COLORS[index];
}

// Accent colors for Fichas on the leftmost bar (Excel style)
const FICHA_ACCENT_COLORS = [
  "border-l-lime-500",
  "border-l-emerald-500",
  "border-l-purple-500",
  "border-l-cyan-500",
  "border-l-amber-500",
  "border-l-rose-500",
  "border-l-blue-500",
  "border-l-indigo-500",
];

// Helper to provide authentic SENA-style competency & learning outcome description
function getCurricularDescription(title: string, description?: string | null) {
  if (description && description.trim().length > 0) {
    return description;
  }
  const shortCode = title
    .replace(
      /^(Desarrollo|Programación|Fundamentos|Bases de Datos|Análisis|Pruebas|Diseño|Gestión)\s+(de\s+|en\s+|con\s+)?/i,
      ""
    )
    .substring(0, 7)
    .toUpperCase()
    .replace(/\s+/g, "_");
  return `${shortCode || "COMP"}: Comp1: Desarrollar soluciones y actividades formativas de ${title}.\nRA1.1: 01 Aplicar principios técnicos y metodologías según diseño curricular.`;
}

// Build chronological timeline including assigned classes and unassigned franjas (Cards Mode)
function buildDayTimeline(
  dayConfig: { startTime: string; endTime: string } | undefined,
  dayClasses: ClassSlotItem[]
): DayTimelineItem[] {
  const sortedClasses = [...dayClasses].sort((a, b) => a.startTime.localeCompare(b.startTime));

  if (!dayConfig) {
    return sortedClasses.map((c) => ({
      type: "class",
      startTime: c.startTime,
      endTime: c.endTime,
      durationHours: getDurationHours(c.startTime, c.endTime),
      classData: c,
    }));
  }

  const items: DayTimelineItem[] = [];
  let currentTime = dayConfig.startTime;

  sortedClasses.forEach((c) => {
    const curMins = toMinutes(currentTime);
    const startMins = toMinutes(c.startTime);

    if (startMins - curMins >= 30) {
      const gapDuration = getDurationHours(currentTime, c.startTime);
      items.push({
        type: "free",
        startTime: currentTime,
        endTime: c.startTime,
        durationHours: gapDuration,
      });
    }

    const classDuration = getDurationHours(c.startTime, c.endTime);
    items.push({
      type: "class",
      startTime: c.startTime,
      endTime: c.endTime,
      durationHours: classDuration,
      classData: c,
    });

    if (toMinutes(c.endTime) > toMinutes(currentTime)) {
      currentTime = c.endTime;
    }
  });

  const finalCurMins = toMinutes(currentTime);
  const endConfigMins = toMinutes(dayConfig.endTime);
  if (endConfigMins - finalCurMins >= 30) {
    const remainingDuration = getDurationHours(currentTime, dayConfig.endTime);
    items.push({
      type: "free",
      startTime: currentTime,
      endTime: dayConfig.endTime,
      durationHours: remainingDuration,
    });
  }

  return items;
}

interface ExcelSubSlot {
  startTime: string;
  endTime: string;
  label: string;
}

// Compute atomic sub-slots for group in Excel mode (e.g. 6:00-9:00 and 9:00-12:00)
function getGroupSubSlots(
  g: ScheduleBuilderData["groups"][0],
  dayClassesMap: Record<DayOfWeek, ClassSlotItem[]>
): ExcelSubSlot[] {
  const slotSet = new Set<string>();

  (g.scheduledClasses || []).forEach((c) => {
    (c.schedules || []).forEach((s) => {
      slotSet.add(`${s.startTime}-${s.endTime}`);
    });
  });

  if (slotSet.size > 0) {
    const timestamps = new Set<string>();
    slotSet.forEach((key) => {
      const [st, et] = key.split("-");
      timestamps.add(st);
      timestamps.add(et);
    });

    (g.daySlotsConfig || []).forEach((ds) => {
      timestamps.add(ds.startTime);
      timestamps.add(ds.endTime);
    });

    const sortedTimes = Array.from(timestamps).sort((a, b) => toMinutes(a) - toMinutes(b));

    if (sortedTimes.length > 2) {
      const granular: ExcelSubSlot[] = [];
      for (let i = 0; i < sortedTimes.length - 1; i++) {
        const st = sortedTimes[i];
        const et = sortedTimes[i + 1];
        if (toMinutes(et) - toMinutes(st) >= 60) {
          granular.push({
            startTime: st,
            endTime: et,
            label: `${toFormat12h(st)} - ${toFormat12h(et)}`,
          });
        }
      }
      if (granular.length > 0) return granular;
    }

    const directSlots: ExcelSubSlot[] = Array.from(slotSet)
      .map((key) => {
        const [st, et] = key.split("-");
        return {
          startTime: st,
          endTime: et,
          label: `${toFormat12h(st)} - ${toFormat12h(et)}`,
        };
      })
      .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));

    return directSlots;
  }

  if (g.daySlotsConfig && g.daySlotsConfig.length > 0) {
    const ds = g.daySlotsConfig[0];
    return [
      {
        startTime: ds.startTime,
        endTime: ds.endTime,
        label: `${toFormat12h(ds.startTime)} - ${toFormat12h(ds.endTime)}`,
      },
    ];
  }

  return [
    {
      startTime: "06:00",
      endTime: "12:00",
      label: "6:00 a.m. - 12:00 p.m.",
    },
  ];
}

export function SchedulePanoramicView({
  data,
  isReadOnly = false,
  onSelectGroupAndEdit,
  onOpenScheduleModal,
}: SchedulePanoramicViewProps) {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "excel">("cards");

  const filteredGroups = data.groups.filter((g) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      g.name.toLowerCase().includes(q) ||
      g.program.name.toLowerCase().includes(q) ||
      (g.period?.name && g.period.name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex-1 min-h-[500px] md:min-h-0 flex flex-col rounded-2xl bg-card border border-border/80 p-3 space-y-3 shadow-xs md:overflow-hidden">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 pb-2 border-b border-border/70">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
            {viewMode === "excel" ? (
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <LayoutGrid className="w-4 h-4 text-primary" />
            )}
          </div>
          <div>
            <h2 className="font-extrabold text-sm text-foreground flex items-center gap-2">
              <span>Vista Panorámica del Horario</span>
              {viewMode === "excel" && (
                <Badge
                  variant="outline"
                  className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                >
                  Matriz Curricular Excel
                </Badge>
              )}
            </h2>
            <p className="text-[11px] text-muted-foreground font-medium">
              Matriz completa de ocupación de {data.groups.length} fichas/grupos
            </p>
          </div>
        </div>

        {/* View Mode Toggle Switch, Excel Export & Search Input */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Segmented Switch: Cards View vs Excel Matrix View */}
          <div className="flex items-center bg-muted/80 p-0.5 rounded-xl border border-border/70 text-xs font-semibold shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${
                viewMode === "cards"
                  ? "bg-background text-primary shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Vista de bloques temporales con alturas proporcionales"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Vista Tarjetas</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("excel")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${
                viewMode === "excel"
                  ? "bg-emerald-600 text-white shadow-xs font-bold dark:bg-emerald-600"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Vista matriz curricular estructurada estilo Excel SENA"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Matriz Excel</span>
            </button>
          </div>

          {/* Quick Export Excel Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => generateAndDownloadScheduleExcel(data.schedule, data.groups)}
            className="h-8 px-2.5 rounded-xl text-xs gap-1.5 font-bold text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/10 shrink-0"
            title="Descargar libro Excel institucional oficial"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exportar Excel</span>
          </Button>

          {/* Search Input */}
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar ficha o programa..."
              className="pl-8 text-xs h-8 rounded-xl bg-background border-border/80 font-medium"
            />
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: EXCEL MATRIX VIEW (Matching User Excel Image) */}
      {viewMode === "excel" ? (
        <div className="flex-1 overflow-x-auto overflow-y-auto scrollbar-thin border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 shadow-xs touch-scroll">
          <table className="w-full border-collapse border border-slate-300 dark:border-slate-700 text-xs min-w-[1250px]">
            {/* Excel Table Header */}
            <thead className="sticky top-0 z-20 shadow-2xs">
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-extrabold border-b border-slate-300 dark:border-slate-700 text-center">
                <th className="border border-slate-300 dark:border-slate-700 p-2 text-center w-[170px] bg-slate-100 dark:bg-slate-800">
                  Ficha / Grupo
                </th>
                <th className="border border-slate-300 dark:border-slate-700 p-2 text-center w-[120px] bg-slate-100 dark:bg-slate-800">
                  Franja Horaria
                </th>
                {DAYS.map((day) => (
                  <th
                    key={day.key}
                    className="border border-slate-300 dark:border-slate-700 p-2 text-center min-w-[170px] bg-slate-100 dark:bg-slate-800 tracking-wider text-[11px]"
                  >
                    {day.label.toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Excel Table Body */}
            <tbody>
              {filteredGroups.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="p-8 text-center text-xs text-muted-foreground italic border border-slate-300 dark:border-slate-700"
                  >
                    No se encontraron fichas con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredGroups.map((g, gIdx) => {
                  // Build classesByDay
                  const classesByDay: Record<DayOfWeek, ClassSlotItem[]> = {
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
                      if (classesByDay[s.dayOfWeek]) {
                        classesByDay[s.dayOfWeek].push({
                          courseTitle: c.title,
                          description: c.description || null,
                          teacherName: s.teacher?.name || c.teacher?.name || "Sin instructor",
                          environmentName: s.environment?.name || g.environment?.name || null,
                          startTime: s.startTime,
                          endTime: s.endTime,
                        });
                      }
                    });
                  });

                  // Calculate sub-slots for this group
                  const subSlots = getGroupSubSlots(g, classesByDay);

                  return subSlots.map((subSlot, slotIdx) => (
                    <tr
                      key={`${g.id}-slot-${slotIdx}`}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      {/* Left Column 1: Group Metadata (renders once with rowSpan for all subSlots) */}
                      {slotIdx === 0 && (
                        <td
                          rowSpan={subSlots.length}
                          className={`border border-slate-300 dark:border-slate-700 p-2.5 bg-slate-50/70 dark:bg-slate-800/40 align-middle border-l-4 ${
                            FICHA_ACCENT_COLORS[gIdx % FICHA_ACCENT_COLORS.length]
                          }`}
                        >
                          <div className="space-y-1 text-center">
                            <div className="font-black text-xs text-slate-900 dark:text-slate-100">
                              {g.name}
                            </div>
                            <div className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 truncate">
                              {g.program.name}
                            </div>
                            {g.period && (
                              <div className="text-[10px] font-bold text-primary truncate">
                                {g.period.name}
                              </div>
                            )}
                            <div className="text-[9px] text-muted-foreground truncate">
                              {g.environment ? `Amb: ${g.environment.name}` : "Amb: -"}
                            </div>
                            <div className="pt-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onSelectGroupAndEdit(g.id)}
                                className="h-5 px-1.5 rounded-md text-[9px] gap-1 font-bold text-primary hover:bg-primary/10 w-full"
                              >
                                <span>Editar</span>
                                <ChevronRight className="w-2.5 h-2.5" />
                              </Button>
                            </div>
                          </div>
                        </td>
                      )}

                      {/* Left Column 2: Sub-slot Time Range */}
                      <td className="border border-slate-300 dark:border-slate-700 p-2 text-center align-middle bg-slate-50/40 dark:bg-slate-800/20 font-mono text-[10px] font-bold text-slate-700 dark:text-slate-300">
                        {subSlot.label}
                      </td>

                      {/* Columns 3-9: Days */}
                      {DAYS.map((day) => {
                        const dayConfig = g.daySlotsConfig?.find((s) => s.dayOfWeek === day.key);
                        const isDayDisabled =
                          g.daySlotsConfig && g.daySlotsConfig.length > 0 ? !dayConfig : false;

                        // Disabled day: render locked cell spanning all subSlots on slotIdx === 0
                        if (isDayDisabled) {
                          if (slotIdx === 0) {
                            return (
                              <td
                                key={day.key}
                                rowSpan={subSlots.length}
                                className="border border-slate-300 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-800/40 text-center select-none p-2 text-slate-400 align-middle"
                                title={`Día no lectivo (Bloqueado) para Ficha ${g.name}`}
                              >
                                <div className="flex flex-col items-center justify-center gap-1 opacity-70">
                                  <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                  <span className="text-[9px] font-bold">No Lectivo</span>
                                </div>
                              </td>
                            );
                          }
                          return null;
                        }

                        // Active day: find matching classes
                        const dayClasses = classesByDay[day.key] || [];
                        const overlappingClasses = dayClasses.filter(
                          (c) =>
                            toMinutes(c.startTime) < toMinutes(subSlot.endTime) &&
                            toMinutes(c.endTime) > toMinutes(subSlot.startTime)
                        );

                        // If no class scheduled in this slot
                        if (overlappingClasses.length === 0) {
                          return (
                            <td
                              key={day.key}
                              className="border border-slate-300 dark:border-slate-700 p-2 text-center align-middle hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                              onClick={() => onSelectGroupAndEdit(g.id)}
                              title="Sin clase programada - Clic para asignar"
                            >
                              <span className="text-slate-300 dark:text-slate-700 text-xs">-</span>
                            </td>
                          );
                        }

                        const cls = overlappingClasses[0];

                        // If this class started in an earlier slot, it was already rendered with rowSpan!
                        if (toMinutes(cls.startTime) < toMinutes(subSlot.startTime)) {
                          return null;
                        }

                        // Determine how many subSlots this class spans forward
                        let spanCount = 1;
                        for (let next = slotIdx + 1; next < subSlots.length; next++) {
                          if (toMinutes(cls.endTime) >= toMinutes(subSlots[next].endTime)) {
                            spanCount++;
                          }
                        }

                        const teacherColor = getTeacherColor(cls.teacherName);

                        return (
                          <td
                            key={day.key}
                            rowSpan={spanCount}
                            className="border border-slate-300 dark:border-slate-700 p-0 align-top bg-white dark:bg-slate-900"
                          >
                            <div className="h-full flex flex-col justify-start overflow-hidden">
                              {/* 1. Header: Course Title */}
                              <div
                                onClick={() => onSelectGroupAndEdit(g.id)}
                                className="bg-slate-50 dark:bg-slate-800/70 px-2 py-1.5 font-bold text-center text-[11px] text-slate-900 dark:text-slate-100 border-b border-slate-300 dark:border-slate-700 leading-tight hover:text-primary transition-colors cursor-pointer"
                                title={cls.courseTitle}
                              >
                                {cls.courseTitle}
                              </div>

                              {/* 2. Middle: Teacher Colored Banner (Excel style) */}
                              <div
                                className={`px-2 py-0.5 text-center text-[10px] font-bold border-b border-slate-300 dark:border-slate-700 uppercase tracking-tight truncate ${teacherColor.bg}`}
                                title={`Instructor: ${cls.teacherName}`}
                              >
                                {cls.teacherName}
                              </div>

                              {/* 3. Bottom: Curricular Competencies & Learning Outcomes */}
                              <div className="p-2 text-[9.5px] leading-snug text-slate-700 dark:text-slate-300 font-sans whitespace-pre-line flex-1 flex flex-col justify-between">
                                <div>{getCurricularDescription(cls.courseTitle, cls.description)}</div>

                                {cls.environmentName && (
                                  <div className="mt-2 pt-1 border-t border-slate-200 dark:border-slate-800 text-[9px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
                                    <span>Ambiente: {cls.environmentName}</span>
                                    <span className="font-mono text-[8.5px] text-slate-400">
                                      {toFormat12h(cls.startTime)} - {toFormat12h(cls.endTime)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ));
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* VIEW MODE 2: CARDS MATRIX VIEW (Proportional time slot height blocks) */
        <div className="flex-1 overflow-x-auto overflow-y-auto scrollbar-thin border border-border/70 rounded-xl bg-background touch-scroll">
          <div className="min-w-[1100px]">
            {/* Table Header: 1 fixed metadata column + 7 day columns spanning full width */}
            <div className="grid grid-cols-[260px_repeat(7,minmax(120px,1fr))] divide-x divide-border/70 border-b border-border/70 bg-muted/90 sticky top-0 z-20 text-[11px] font-bold text-muted-foreground shadow-2xs">
              <div className="p-2.5 flex items-center justify-between">
                <span>Ficha / Grupo</span>
                <span className="text-[10px] font-normal text-muted-foreground">Progreso</span>
              </div>
              {DAYS.map((day) => (
                <div key={day.key} className="p-2 text-center flex flex-col items-center justify-center">
                  <span className="font-bold text-foreground text-xs">{day.label}</span>
                </div>
              ))}
            </div>

            {/* Table Body (Group Rows) */}
            <div className="divide-y divide-border/60">
              {filteredGroups.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground italic">
                  No se encontraron fichas con los filtros aplicados.
                </div>
              ) : (
                filteredGroups.map((g) => {
                  // Calculate required vs scheduled hours
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
                  const progressPercent =
                    totalRequiredHours > 0
                      ? Math.round((totalScheduledHours / totalRequiredHours) * 100)
                      : 0;

                  // Group classes by dayOfWeek
                  const classesByDay: Record<DayOfWeek, ClassSlotItem[]> = {
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
                      if (classesByDay[s.dayOfWeek]) {
                        classesByDay[s.dayOfWeek].push({
                          courseTitle: c.title,
                          description: c.description || null,
                          teacherName: s.teacher?.name || c.teacher?.name || "Sin instructor",
                          environmentName: s.environment?.name || g.environment?.name || null,
                          startTime: s.startTime,
                          endTime: s.endTime,
                        });
                      }
                    });
                  });

                  // Calculate group's max configured franja duration across days for row minimum height
                  let maxGroupFranjaHours = 6;
                  if (g.daySlotsConfig && g.daySlotsConfig.length > 0) {
                    g.daySlotsConfig.forEach((slot) => {
                      const dur = getDurationHours(slot.startTime, slot.endTime);
                      if (dur > maxGroupFranjaHours) maxGroupFranjaHours = dur;
                    });
                  }
                  const rowMinHeight = getCardHeight(maxGroupFranjaHours);

                  return (
                    <div
                      key={g.id}
                      className="grid grid-cols-[260px_repeat(7,minmax(120px,1fr))] divide-x divide-border/60 hover:bg-muted/20 transition-colors group"
                    >
                      {/* Column 1: Group Metadata & Jump Button */}
                      <div
                        style={{ minHeight: `${rowMinHeight}px` }}
                        className="p-2.5 flex flex-col justify-between gap-2 bg-card/60"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="font-extrabold text-xs text-foreground group-hover:text-primary transition-colors truncate">
                              Ficha {g.name}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onSelectGroupAndEdit(g.id)}
                              className="h-5 px-1.5 rounded-md text-[10px] gap-1 font-bold text-primary hover:bg-primary/10"
                              title="Abrir malla de esta ficha"
                            >
                              <span>Editar</span>
                              <ChevronRight className="w-3 h-3" />
                            </Button>
                          </div>
                          <div className="text-[10px] text-muted-foreground font-medium truncate">
                            {g.program.name}
                          </div>
                          {g.period && (
                            <div className="text-[10px] font-semibold text-primary/90 truncate">
                              {g.period.name}
                            </div>
                          )}
                        </div>

                        {/* Hours & Progress Bar */}
                        {totalRequiredHours > 0 && (
                          <div className="space-y-1 pt-1 border-t border-border/40">
                            <div className="flex justify-between text-[10px] font-mono">
                              <span className="text-muted-foreground font-medium">Horas:</span>
                              <span className="font-bold text-foreground">
                                {totalScheduledHours}/{totalRequiredHours}h ({progressPercent}%)
                              </span>
                            </div>
                            <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full transition-all ${
                                  progressPercent >= 100
                                    ? "bg-emerald-500"
                                    : progressPercent > 0
                                    ? "bg-amber-500"
                                    : "bg-primary"
                                }`}
                                style={{ width: `${Math.min(100, progressPercent)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Columns 2-8: Day Slots organized by time slot height */}
                      {DAYS.map((day) => {
                        const dayClasses = classesByDay[day.key] || [];
                        const dayConfig = g.daySlotsConfig?.find((s) => s.dayOfWeek === day.key);
                        const isDayDisabled =
                          g.daySlotsConfig && g.daySlotsConfig.length > 0 ? !dayConfig : false;

                        if (isDayDisabled) {
                          return (
                            <div
                              key={day.key}
                              style={{ minHeight: `${rowMinHeight}px` }}
                              className="p-1.5 flex flex-col items-center justify-center bg-muted/40 opacity-70 text-center select-none border border-dashed border-border/40"
                              title={`Día no lectivo (Bloqueado) para Ficha ${g.name}`}
                            >
                              <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 mb-0.5" />
                              <span className="text-[9px] font-bold text-muted-foreground">No Lectivo</span>
                            </div>
                          );
                        }

                        const timelineItems = buildDayTimeline(dayConfig, dayClasses);

                        return (
                          <div
                            key={day.key}
                            style={{ minHeight: `${rowMinHeight}px` }}
                            className="p-1.5 flex flex-col gap-1.5 bg-background/50 hover:bg-background transition-colors"
                          >
                            {timelineItems.length > 0 ? (
                              timelineItems.map((item, idx) => {
                                if (item.type === "free") {
                                  return (
                                    <div
                                      key={`free-${idx}`}
                                      onClick={() => onSelectGroupAndEdit(g.id)}
                                      style={{
                                        minHeight: `${getCardHeight(item.durationHours)}px`,
                                        flexGrow: item.durationHours,
                                      }}
                                      className="w-full rounded-lg border border-dashed border-border/50 bg-muted/10 hover:bg-primary/5 hover:border-primary/40 cursor-pointer transition-all flex flex-col items-center justify-center p-1.5 text-center group/free select-none"
                                      title={`Franja disponible: ${toFormat12h(item.startTime)} a ${toFormat12h(
                                        item.endTime
                                      )} (${item.durationHours}h) - Clic para programar`}
                                    >
                                      <div className="flex items-center gap-1 text-[9px] font-medium text-muted-foreground/60 group-hover/free:text-primary transition-colors">
                                        <Clock className="w-2.5 h-2.5 shrink-0 opacity-60 group-hover/free:opacity-100" />
                                        <span>
                                          Libre ({toFormat12h(item.startTime)} - {toFormat12h(item.endTime)})
                                        </span>
                                      </div>
                                      {item.durationHours >= 3 && (
                                        <span className="text-[8px] font-mono text-muted-foreground/40 group-hover/free:text-primary/70 transition-colors mt-0.5">
                                          {item.durationHours} hrs disponibles
                                        </span>
                                      )}
                                    </div>
                                  );
                                }

                                const cls = item.classData!;
                                return (
                                  <Tooltip key={`class-${idx}`}>
                                    <TooltipTrigger asChild>
                                      <div
                                        onClick={() => onSelectGroupAndEdit(g.id)}
                                        style={{
                                          minHeight: `${getCardHeight(item.durationHours)}px`,
                                          flexGrow: item.durationHours,
                                        }}
                                        className="p-2 rounded-lg border border-primary/25 bg-primary/5 hover:bg-primary/10 cursor-pointer transition-all text-[10px] shadow-2xs group/card touch-manipulation active:scale-[0.99] flex flex-col justify-between overflow-hidden relative"
                                      >
                                        {/* Top: Course Title and Duration Badge */}
                                        <div className="space-y-1 min-w-0">
                                          <div className="flex items-start justify-between gap-1.5">
                                            <div
                                              className={`font-bold text-foreground leading-snug group-hover/card:text-primary transition-colors ${
                                                item.durationHours >= 4
                                                  ? "line-clamp-2 text-[11px]"
                                                  : "line-clamp-1 text-[10px]"
                                              }`}
                                              title={cls.courseTitle}
                                            >
                                              {cls.courseTitle}
                                            </div>
                                            <Badge
                                              variant="outline"
                                              className="text-[8px] font-mono font-bold px-1 py-0 h-3.5 bg-primary/10 text-primary border-primary/20 shrink-0"
                                            >
                                              {item.durationHours}h
                                            </Badge>
                                          </div>

                                          {/* Teacher */}
                                          <div className="text-[9px] text-muted-foreground truncate font-medium flex items-center gap-1">
                                            <GraduationCap className="w-2.5 h-2.5 text-primary shrink-0" />
                                            <span className="truncate">
                                              {getCompactTeacherName(cls.teacherName)}
                                            </span>
                                          </div>

                                          {/* Environment */}
                                          {cls.environmentName && (
                                            <div className="text-[9px] text-emerald-700 dark:text-emerald-300 truncate font-semibold flex items-center gap-1">
                                              <Building className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                              <span className="truncate">{cls.environmentName}</span>
                                            </div>
                                          )}
                                        </div>

                                        {/* Bottom: Time Range */}
                                        <div
                                          className={`pt-1 border-t border-primary/10 mt-auto ${
                                            item.durationHours >= 3 ? "" : "pt-0.5"
                                          }`}
                                        >
                                          <div className="text-[9px] font-mono text-primary font-semibold flex items-center justify-between gap-1">
                                            <span className="flex items-center gap-1 truncate">
                                              <Clock className="w-2.5 h-2.5 shrink-0" />
                                              <span>
                                                {toFormat12h(cls.startTime)} - {toFormat12h(cls.endTime)}
                                              </span>
                                            </span>
                                            {item.durationHours >= 5 && (
                                              <span className="text-[8px] text-muted-foreground font-sans font-medium hidden sm:inline">
                                                Jornada
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="top"
                                      className="rounded-2xl p-3 max-w-xs space-y-1.5 shadow-xl border border-border/80 bg-card text-card-foreground z-50"
                                    >
                                      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-1.5">
                                        <Badge variant="outline" className="text-[10px] font-bold">
                                          Ficha {g.name}
                                        </Badge>
                                        <span className="text-[10px] font-mono text-muted-foreground font-semibold">
                                          {day.label} · {item.durationHours}h
                                        </span>
                                      </div>

                                      <p className="font-extrabold text-xs text-foreground leading-tight">
                                        {cls.courseTitle}
                                      </p>

                                      <div className="space-y-1 text-[11px] text-muted-foreground font-medium pt-1">
                                        <p className="flex items-center gap-1.5 text-primary font-semibold">
                                          <Clock className="w-3 h-3 text-primary shrink-0" />
                                          <span>
                                            {toFormat12h(cls.startTime)} a {toFormat12h(cls.endTime)} (
                                            {item.durationHours} horas)
                                          </span>
                                        </p>

                                        {cls.teacherName && (
                                          <p className="flex items-center gap-1.5 text-foreground">
                                            <GraduationCap className="w-3 h-3 text-primary shrink-0" />
                                            <span>Instructor: {getCleanTeacherName(cls.teacherName)}</span>
                                          </p>
                                        )}

                                        {cls.environmentName && (
                                          <p className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-semibold">
                                            <Building className="w-3 h-3 text-emerald-600 shrink-0" />
                                            <span>Ambiente: {cls.environmentName}</span>
                                          </p>
                                        )}

                                        {g.period && (
                                          <p className="flex items-center gap-1.5 text-[10px]">
                                            <BookOpen className="w-3 h-3 text-muted-foreground shrink-0" />
                                            <span>Periodo: {g.period.name}</span>
                                          </p>
                                        )}
                                      </div>

                                      <p className="text-[10px] text-primary font-bold pt-1.5 border-t border-border/40 flex items-center justify-between">
                                        <span>
                                          {isReadOnly
                                            ? "Ver en la malla de la ficha"
                                            : "Editar en la malla de la ficha"}
                                        </span>
                                        <ChevronRight className="w-3 h-3" />
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                );
                              })
                            ) : (
                              <div
                                onClick={() => onSelectGroupAndEdit(g.id)}
                                className="h-full min-h-[70px] flex items-center justify-center text-[10px] text-muted-foreground/40 italic cursor-pointer hover:bg-muted/30 rounded-lg transition-colors p-1"
                              >
                                -
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
