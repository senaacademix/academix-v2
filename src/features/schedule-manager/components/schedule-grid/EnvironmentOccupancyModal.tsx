"use client";

import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building,
  Clock,
  Users,
  GraduationCap,
  AlertTriangle,
  Sun,
  Cloud,
  Moon,
  FileText,
  FileSpreadsheet,
  Loader2,
  Search,
  ChevronRight,
  User,
  BarChart3,
  PieChart,
  TrendingUp,
  CheckCircle2,
  Percent,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { DayOfWeek } from "@/generated/prisma/client";
import { ScheduleBuilderData } from "../../actions/scheduleBuilderActions";
import { getCleanTeacherName } from "../../utils/teacherNameFormatter";
import {
  extractEnvironmentsExportData,
  exportEnvironmentsToPdf,
} from "../../utils/environmentSchedulePdfExport";
import { exportEnvironmentsToExcel } from "../../utils/environmentScheduleExcelExport";

const DAYS_ES: { key: DayOfWeek; label: string; short: string }[] = [
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

const formatHourLabel = (h24: number) => {
  const ap = h24 >= 12 ? "p.m." : "a.m.";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12} ${ap}`;
};

// Helper for Cloud (blue), Sun (orange), Moon icons based on time of day
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
        <Cloud className="w-3 h-3" />
      </span>
    );
  }
  if (touchesAfternoon) {
    icons.push(
      <span key="sun" title="Jornada Tarde" className="text-orange-500">
        <Sun className="w-3 h-3" />
      </span>
    );
  }
  if (touchesNight) {
    icons.push(
      <span key="moon" title="Jornada Noche" className="text-purple-600 dark:text-purple-400">
        <Moon className="w-3 h-3" />
      </span>
    );
  }

  return <div className="flex items-center gap-0.5 shrink-0">{icons}</div>;
}

interface EnvironmentOccupancyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: ScheduleBuilderData["schedule"];
  groups: ScheduleBuilderData["groups"];
  environments: ScheduleBuilderData["environments"];
}

export function EnvironmentOccupancyModal({
  open,
  onOpenChange,
  schedule,
  groups,
  environments,
}: EnvironmentOccupancyModalProps) {
  const [selectedEnvId, setSelectedEnvId] = useState<string>(
    environments.length > 0 ? environments[0].id : ""
  );
  const [envViewMode, setEnvViewMode] = useState<"single" | "all" | "chart">("single");
  const [envSearch, setEnvSearch] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  // Extract all environment metrics & scheduled classes across all groups
  const environmentsWithMetrics = useMemo(() => {
    const map = new Map<
      string,
      {
        env: ScheduleBuilderData["environments"][0];
        totalHours: number;
        distinctGroups: Set<string>;
        distinctCourses: Set<string>;
        classesByDay: Record<
          DayOfWeek,
          Array<{
            id: string;
            groupId: string;
            groupName: string;
            programName: string;
            courseTitle: string;
            teacherName?: string;
            startTime: string;
            endTime: string;
            durationHours: number;
            hasCollision: boolean;
          }>
        >;
      }
    >();

    environments.forEach((e) => {
      map.set(e.id, {
        env: e,
        totalHours: 0,
        distinctGroups: new Set(),
        distinctCourses: new Set(),
        classesByDay: {
          MONDAY: [],
          TUESDAY: [],
          WEDNESDAY: [],
          THURSDAY: [],
          FRIDAY: [],
          SATURDAY: [],
          SUNDAY: [],
        },
      });
    });

    groups.forEach((g) => {
      if (g.environment) {
        const entry = map.get(g.environment.id);
        if (entry) {
          entry.distinctGroups.add(g.name);
          g.scheduledClasses.forEach((c) => {
            entry.distinctCourses.add(c.title);
            c.schedules.forEach((s) => {
              const [sh, sm] = s.startTime.split(":").map(Number);
              const [eh, em] = s.endTime.split(":").map(Number);
              const dur = (eh * 60 + em - (sh * 60 + sm)) / 60;
              entry.totalHours += dur;

              if (!entry.classesByDay[s.dayOfWeek]) {
                entry.classesByDay[s.dayOfWeek] = [];
              }

              const hasCollision = (entry.classesByDay[s.dayOfWeek] || []).some(
                (existing) =>
                  existing.groupId !== g.id &&
                  existing.startTime < s.endTime &&
                  existing.endTime > s.startTime
              );

              entry.classesByDay[s.dayOfWeek].push({
                id: `${g.id}-${s.id}`,
                groupId: g.id,
                groupName: g.name,
                programName: g.program.name,
                courseTitle: c.title,
                teacherName: getCleanTeacherName(c.teacher?.name),
                startTime: s.startTime,
                endTime: s.endTime,
                durationHours: dur,
                hasCollision,
              });
            });
          });
        }
      }
    });

    // Sort classes by startTime for each day
    Array.from(map.values()).forEach((entry) => {
      DAYS_ES.forEach((d) => {
        entry.classesByDay[d.key].sort((a, b) => a.startTime.localeCompare(b.startTime));
      });
    });

    // Sort environments: those with hours first, then by name
    return Array.from(map.values()).sort((a, b) => {
      if (b.totalHours !== a.totalHours) return b.totalHours - a.totalHours;
      return a.env.name.localeCompare(b.env.name);
    });
  }, [environments, groups]);

  const filteredEnvironmentsWithMetrics = useMemo(() => {
    if (!envSearch) return environmentsWithMetrics;
    const q = envSearch.toLowerCase();
    return environmentsWithMetrics.filter((e) => {
      const matchName = e.env.name.toLowerCase().includes(q);
      const matchLoc = (e.env.location || "").toLowerCase().includes(q);
      const matchGroup = Array.from(e.distinctGroups).some((g) => g.toLowerCase().includes(q));
      const matchCourse = Array.from(e.distinctCourses).some((c) => c.toLowerCase().includes(q));
      return matchName || matchLoc || matchGroup || matchCourse;
    });
  }, [environmentsWithMetrics, envSearch]);

  // Sync selected environment when modal opens
  React.useEffect(() => {
    if (open && environments.length > 0 && !selectedEnvId) {
      setSelectedEnvId(environments[0].id);
    }
  }, [open, environments, selectedEnvId]);

  const currentEnv = environments.find((e) => e.id === selectedEnvId) || environments[0] || null;

  const handleExportCurrentEnvPdf = async () => {
    if (envViewMode === "single" && !currentEnv) return;
    setIsExporting(true);
    try {
      const targetEnvs = envViewMode === "single" && currentEnv ? [currentEnv] : environments;
      const label =
        envViewMode === "single"
          ? currentEnv?.name || "Ambiente"
          : envViewMode === "all"
          ? "Todos_Los_Ambientes"
          : "Reporte_Ocupacion_Ambientes";

      toast.info(`Generando PDF de ${label.replace(/_/g, " ")}...`);
      const allData = extractEnvironmentsExportData(
        targetEnvs,
        groups,
        schedule.startDate,
        schedule.endDate
      );
      await exportEnvironmentsToPdf(
        schedule,
        allData,
        envViewMode,
        `Horario_Ambiente_${label.replace(/\s+/g, "_")}.pdf`
      );
      toast.success("PDF generado y descargado correctamente");
    } catch (err: any) {
      toast.error(err.message || "Error al exportar PDF");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCurrentEnvExcel = async () => {
    if (envViewMode === "single" && !currentEnv) return;
    setIsExporting(true);
    try {
      const targetEnvs = envViewMode === "single" && currentEnv ? [currentEnv] : environments;
      const label =
        envViewMode === "single"
          ? currentEnv?.name || "Ambiente"
          : envViewMode === "all"
          ? "Todos_Los_Ambientes"
          : "Reporte_Ocupacion_Ambientes";

      toast.info(`Generando Excel de ${label.replace(/_/g, " ")}...`);
      const allData = extractEnvironmentsExportData(
        targetEnvs,
        groups,
        schedule.startDate,
        schedule.endDate
      );
      await exportEnvironmentsToExcel(
        schedule,
        allData,
        envViewMode,
        `Horario_Ambiente_${label.replace(/\s+/g, "_")}.xlsx`
      );
      toast.success("Excel generado y descargado correctamente");
    } catch (err: any) {
      toast.error(err.message || "Error al exportar Excel");
    } finally {
      setIsExporting(false);
    }
  };

  // Extract all scheduled slots using this environment
  const occupancyMap = useMemo(() => {
    const map: Record<
      DayOfWeek,
      Array<{
        id: string;
        groupId: string;
        groupName: string;
        programName: string;
        courseTitle: string;
        teacherName?: string;
        startTime: string;
        endTime: string;
        durationHours: number;
        hasCollision: boolean;
      }>
    > = {
      MONDAY: [],
      TUESDAY: [],
      WEDNESDAY: [],
      THURSDAY: [],
      FRIDAY: [],
      SATURDAY: [],
      SUNDAY: [],
    };

    if (!currentEnv) return map;

    groups.forEach((g) => {
      if (g.environment?.id === currentEnv.id) {
        g.scheduledClasses.forEach((c) => {
          c.schedules.forEach((s) => {
            const [sh, sm] = s.startTime.split(":").map(Number);
            const [eh, em] = s.endTime.split(":").map(Number);
            const dur = (eh * 60 + em - (sh * 60 + sm)) / 60;

            if (!map[s.dayOfWeek]) {
              map[s.dayOfWeek] = [];
            }

            const hasCollision = (map[s.dayOfWeek] || []).some(
              (existing) =>
                existing.groupId !== g.id &&
                existing.startTime < s.endTime &&
                existing.endTime > s.startTime
            );

            map[s.dayOfWeek].push({
              id: `${g.id}-${s.id}`,
              groupId: g.id,
              groupName: g.name,
              programName: g.program.name,
              courseTitle: c.title,
              teacherName: getCleanTeacherName(c.teacher?.name),
              startTime: s.startTime,
              endTime: s.endTime,
              durationHours: dur,
              hasCollision,
            });
          });
        });
      }
    });

    // Sort by startTime
    DAYS_ES.forEach((d) => {
      map[d.key].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });

    return map;
  }, [groups, currentEnv]);

  // Calculate dynamic earliest and latest extreme hours
  const { earliestHour, latestHour, totalCanvasHours } = useMemo(() => {
    let minH = 6;
    let maxH = 22;

    const hours: number[] = [];
    Object.values(occupancyMap).forEach((arr) => {
      arr.forEach((c) => {
        const [sh] = c.startTime.split(":").map(Number);
        const [eh, em] = c.endTime.split(":").map(Number);
        hours.push(sh);
        hours.push(em > 0 ? eh + 1 : eh);
      });
    });

    if (hours.length > 0) {
      minH = Math.max(Math.min(...hours, 6), 5);
      maxH = Math.min(Math.max(...hours, 21), 23);
    }

    const total = Math.max(maxH - minH, 8);
    return { earliestHour: minH, latestHour: maxH, totalCanvasHours: total };
  }, [occupancyMap]);

  // Calculate total weekly hours and accumulated total hours across whole period
  const { totalWeeklyHours, totalPeriodHours, totalWeeks } = useMemo(() => {
    let weeklyHours = 0;
    Object.values(occupancyMap).forEach((arr) => {
      arr.forEach((c) => {
        weeklyHours += c.durationHours;
      });
    });

    if (!schedule.startDate || !schedule.endDate) {
      return { totalWeeklyHours: weeklyHours, totalPeriodHours: weeklyHours * 10, totalWeeks: 10 };
    }

    const start = new Date(schedule.startDate);
    const end = new Date(schedule.endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return { totalWeeklyHours: weeklyHours, totalPeriodHours: weeklyHours * 10, totalWeeks: 10 };
    }

    const jsDayToEnum: Record<number, DayOfWeek> = {
      0: "SUNDAY",
      1: "MONDAY",
      2: "TUESDAY",
      3: "WEDNESDAY",
      4: "THURSDAY",
      5: "FRIDAY",
      6: "SATURDAY",
    };

    let periodHours = 0;
    const cur = new Date(start);
    let daysCount = 0;

    while (cur <= end) {
      daysCount++;
      const dayEnum = jsDayToEnum[cur.getUTCDay()];
      const dayClasses = occupancyMap[dayEnum] || [];
      const daySum = dayClasses.reduce((acc, c) => acc + c.durationHours, 0);
      periodHours += daySum;
      cur.setUTCDate(cur.getUTCDate() + 1);
    }

    const weeks = Math.max(Math.round((daysCount / 7) * 10) / 10, 1);
    return {
      totalWeeklyHours: Math.round(weeklyHours * 10) / 10,
      totalPeriodHours: Math.round(periodHours * 10) / 10,
      totalWeeks: weeks,
    };
  }, [occupancyMap, schedule.startDate, schedule.endDate]);

  const ROW_HEIGHT = 44; // px per hour
  const totalGridHeight = totalCanvasHours * ROW_HEIGHT;
  const timeLabels = Array.from({ length: totalCanvasHours + 1 }, (_, i) => earliestHour + i);

  const totalClassesInEnv = Object.values(occupancyMap).reduce(
    (acc, arr) => acc + arr.length,
    0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] lg:max-w-6xl xl:max-w-7xl p-0 overflow-hidden rounded-3xl border-border bg-background shadow-2xl">
        <div className="flex flex-col">
          {/* Header with Environment Selector */}
          <DialogHeader className="p-6 pb-4 border-b border-border/80 bg-muted/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
                  <Building className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-lg font-black text-foreground truncate">
                    Matriz de Ocupación por Ambientes
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5 truncate">
                    {schedule.name} • Distribución vertical por horario con acumulado total del período académico.
                  </DialogDescription>
                </div>
              </div>

              {/* Mode Switcher & Environment Selector */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {/* View Mode Toggle Button */}
                <div className="flex items-center gap-0.5 bg-muted/60 p-0.5 rounded-xl border border-border/80 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEnvViewMode("single")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer touch-manipulation select-none active:scale-95 ${
                      envViewMode === "single"
                        ? "bg-background text-primary shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Building className="w-3.5 h-3.5" />
                    <span>Por Ambiente</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEnvViewMode("all")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer touch-manipulation select-none active:scale-95 ${
                      envViewMode === "all"
                        ? "bg-background text-primary shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 text-primary" />
                    <span>Todos los Ambientes</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEnvViewMode("chart")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer touch-manipulation select-none active:scale-95 ${
                      envViewMode === "chart"
                        ? "bg-background text-primary shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Gráfico de Ocupación</span>
                  </button>
                </div>

                {/* Environment Select Dropdown (Only in single mode) */}
                {envViewMode === "single" && (
                  <Select value={selectedEnvId} onValueChange={setSelectedEnvId}>
                    <SelectTrigger className="h-8 text-xs font-bold rounded-xl w-60 bg-background border-border/80">
                      <SelectValue placeholder="Seleccionar ambiente..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl text-xs max-h-60">
                      {environments.map((env) => (
                        <SelectItem key={env.id} value={env.id} className="text-xs">
                          🏫 {env.name} ({env.location || "Sede"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </DialogHeader>

          {/* Body Content depending on View Mode */}
          {envViewMode === "chart" ? (
            <div className="p-6 flex flex-col space-y-5 max-h-[70vh] overflow-y-auto scrollbar-thin">
              {/* Overall Summary KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 space-y-1">
                  <span className="text-[11px] font-bold text-primary uppercase flex items-center justify-between">
                    <span>Total Ambientes</span>
                    <Building className="w-4 h-4 text-primary" />
                  </span>
                  <p className="text-2xl font-black text-foreground">
                    {environmentsWithMetrics.length}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-medium">
                    Salas registradas en el sistema
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                  <span className="text-[11px] font-bold text-emerald-600 uppercase flex items-center justify-between">
                    <span>Ambientes Activos</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </span>
                  <p className="text-2xl font-black text-foreground">
                    {environmentsWithMetrics.filter((e) => e.totalHours > 0).length} / {environmentsWithMetrics.length}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-medium">
                    Salas con clases programadas
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-1">
                  <span className="text-[11px] font-bold text-indigo-600 uppercase flex items-center justify-between">
                    <span>Total Horas Ocupadas</span>
                    <Clock className="w-4 h-4 text-indigo-600" />
                  </span>
                  <p className="text-2xl font-black text-foreground">
                    {Math.round(environmentsWithMetrics.reduce((acc, e) => acc + e.totalHours, 0) * 10) / 10}h / sem
                  </p>
                  <p className="text-[10px] text-muted-foreground font-medium">
                    En todas las fichas del periodo
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-1">
                  <span className="text-[11px] font-bold text-purple-600 uppercase flex items-center justify-between">
                    <span>Promedio de Ocupación</span>
                    <Percent className="w-4 h-4 text-purple-600" />
                  </span>
                  <p className="text-2xl font-black text-foreground">
                    {environmentsWithMetrics.length > 0
                      ? Math.round(
                          (environmentsWithMetrics.reduce((acc, e) => acc + e.totalHours, 0) /
                            (environmentsWithMetrics.length * 40)) *
                            100
                        )
                      : 0}%
                  </p>
                  <p className="text-[10px] text-muted-foreground font-medium">
                    Basado en capacidad estándar de 40h/sem
                  </p>
                </div>
              </div>

              {/* Occupancy Progress Chart Per Environment */}
              <div className="border border-border/80 rounded-2xl p-5 bg-card space-y-4 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-primary" />
                      <span>Gráficos de Carga y Ocupación Semanal por Ambiente</span>
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Porcentaje de uso semanal sobre la capacidad recomendada de 40 horas por ambiente.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 text-[10px] font-bold">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Libre (&lt; 70%)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Carga Alta (70%-90%)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Saturado (&gt; 90%)
                    </span>
                  </div>
                </div>

                <div className="space-y-3.5">
                  {filteredEnvironmentsWithMetrics.map((e) => {
                    const capacityHours = 40;
                    const percent = Math.min(Math.round((e.totalHours / capacityHours) * 100), 120);
                    const periodHours = Math.round(e.totalHours * totalWeeks * 10) / 10;
                    const hasCollisions = Object.values(e.classesByDay).some((arr) =>
                      arr.some((c) => c.hasCollision)
                    );

                    // Student capacity calculations
                    const assignedGroupsList = groups.filter((g) => g.environment?.id === e.env.id);
                    const totalStudents = assignedGroupsList.reduce(
                      (acc, g) => acc + (g.studentCount || 25),
                      0
                    );
                    const roomCapacity = e.env.capacity || 20;
                    const studentRatio = roomCapacity > 0 ? Math.round((totalStudents / roomCapacity) * 100) : 0;
                    const isStudentOver = totalStudents > roomCapacity;
                    const studentExcess = Math.max(0, totalStudents - roomCapacity);

                    return (
                      <div
                        key={e.env.id}
                        className="p-4 rounded-2xl border border-border/70 bg-background hover:bg-muted/20 transition-all space-y-3 group"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="font-extrabold text-foreground text-sm group-hover:text-primary transition-colors truncate">
                              🏫 {e.env.name}
                            </span>
                            <span className="text-[11px] text-muted-foreground truncate">
                              (📍 {e.env.location || "Sede Principal"} • Capacidad: {roomCapacity} puestos)
                            </span>

                            {isStudentOver && (
                              <Badge className="bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30 text-[9.5px] font-extrabold shrink-0 animate-pulse">
                                ⚠️ Sobrecupo: +{studentExcess} aprendices del aforo
                              </Badge>
                            )}

                            {hasCollisions && (
                              <Badge className="bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30 text-[9px] font-bold shrink-0">
                                Cruces detectados
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono font-bold text-xs text-foreground">
                              {e.totalHours}h / {capacityHours}h sem
                            </span>
                            <Badge className="font-mono font-bold text-[10px] bg-primary/10 text-primary border-primary/30">
                              {periodHours}h periodo
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedEnvId(e.env.id);
                                setEnvViewMode("single");
                              }}
                              className="h-6 px-2 rounded-lg text-[10px] font-bold text-primary border-primary/30 hover:bg-primary/10 gap-1"
                            >
                              <span>Ver Horario</span>
                              <ChevronRight className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Dual Indicators: Time & Student Capacity */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                          {/* 1. Time Occupancy Bar */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10.5px] text-muted-foreground font-semibold">
                              <span>⏱️ Carga Horaria Semanal</span>
                              <span className="font-bold font-mono text-foreground">{percent}%</span>
                            </div>
                            <div className="w-full h-3 rounded-full bg-muted overflow-hidden relative border border-border/50">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  percent > 90
                                    ? "bg-red-500"
                                    : percent > 70
                                    ? "bg-amber-500"
                                    : "bg-emerald-500"
                                }`}
                                style={{ width: `${Math.min(percent, 100)}%` }}
                              />
                            </div>
                          </div>

                          {/* 2. Student Aforo / Physical Capacity Bar */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10.5px] text-muted-foreground font-semibold">
                              <span>👥 Aforo Físico (Aprendices)</span>
                              <span className={`font-bold font-mono ${isStudentOver ? "text-red-600 font-black" : "text-foreground"}`}>
                                {totalStudents} / {roomCapacity} puestos ({studentRatio}%)
                              </span>
                            </div>
                            <div className="w-full h-3 rounded-full bg-muted overflow-hidden relative border border-border/50">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isStudentOver
                                    ? "bg-gradient-to-r from-red-600 to-rose-600 animate-pulse"
                                    : studentRatio >= 90
                                    ? "bg-amber-500"
                                    : "bg-emerald-500"
                                }`}
                                style={{ width: `${Math.min(studentRatio, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10.5px] text-muted-foreground font-semibold pt-0.5 border-t border-border/40">
                          <span className="truncate">
                            Fichas asignadas ({e.distinctGroups.size}): {e.distinctGroups.size > 0 ? Array.from(e.distinctGroups).join(", ") : "Ninguna"}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground shrink-0 ml-2">
                            Materias: {e.distinctCourses.size}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : envViewMode === "all" ? (
            <div className="p-5 flex flex-col space-y-3">
              {/* Controls & Search */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 pb-2 border-b border-border/70">
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary text-primary-foreground font-bold text-xs px-2.5 py-1">
                    {environmentsWithMetrics.length} Ambientes / Salas Registrados
                  </Badge>
                  <span className="text-xs text-muted-foreground font-medium">
                    (Matriz completa de ocupación por ambiente, una fila por sala)
                  </span>
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={envSearch}
                    onChange={(e) => setEnvSearch(e.target.value)}
                    placeholder="Buscar por ambiente, ubicación, materia o ficha..."
                    className="pl-8 text-xs h-8 rounded-xl bg-background border-border/80 font-medium"
                  />
                </div>
              </div>

              {/* All Environments Table Matrix */}
              <div className="overflow-auto max-h-[58vh] border border-border/80 rounded-2xl bg-background shadow-2xs relative scrollbar-thin touch-scroll">
                <div className="min-w-[1100px]">
                  {/* Table Header with Solid Opaque Background */}
                  <div className="grid grid-cols-12 divide-x divide-border/80 border-b border-border/80 bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 sticky top-0 z-30 text-[11px] font-black shadow-xs">
                    <div className="col-span-3 p-3 flex items-center justify-between bg-slate-100 dark:bg-slate-900">
                      <span>Ambiente / Sala</span>
                      <span className="text-[10px] font-normal text-muted-foreground">Capacidad & Horas</span>
                    </div>
                    {DAYS_ES.map((d) => (
                      <div key={d.key} className="col-span-1 p-2 text-center flex items-center justify-center font-extrabold uppercase bg-slate-100 dark:bg-slate-900">
                        {d.label}
                      </div>
                    ))}
                  </div>

                  {/* Table Body (One Environment Per Row) */}
                  <div className="divide-y divide-border/60">
                    {filteredEnvironmentsWithMetrics.length === 0 ? (
                      <div className="p-8 text-center text-xs text-muted-foreground italic">
                        No se encontraron ambientes de aprendizaje con el criterio de búsqueda.
                      </div>
                    ) : (
                      filteredEnvironmentsWithMetrics.map((e) => {
                        const periodHours = Math.round(e.totalHours * totalWeeks * 10) / 10;
                        const hasAnyCollision = Object.values(e.classesByDay).some((arr) =>
                          arr.some((c) => c.hasCollision)
                        );

                        return (
                          <div
                            key={e.env.id}
                            className="grid grid-cols-12 divide-x divide-border/60 hover:bg-muted/20 transition-colors group"
                          >
                            {/* Column 1: Environment Metadata */}
                            <div className="col-span-3 p-3 flex flex-col justify-between gap-2 bg-card/60">
                              <div className="space-y-1">
                                <div className="flex items-center justify-between gap-1.5">
                                  <span className="font-extrabold text-xs text-foreground group-hover:text-primary transition-colors truncate">
                                    🏫 {e.env.name}
                                  </span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedEnvId(e.env.id);
                                      setEnvViewMode("single");
                                    }}
                                    className="h-5 px-1.5 rounded-md text-[10px] gap-1 font-bold text-primary border-primary/30 hover:bg-primary/10 shrink-0"
                                    title="Ver horario detallado de esta sala"
                                  >
                                    <span>Ver</span>
                                    <ChevronRight className="w-3 h-3" />
                                  </Button>
                                </div>

                                <div className="text-[10px] text-muted-foreground truncate font-medium">
                                  📍 {e.env.location || "Sede Principal"} • Capacidad: {e.env.capacity || "N/A"}
                                </div>

                                <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                                  <Badge variant="outline" className="text-[9px] font-mono font-bold bg-primary/10 text-primary border-primary/30">
                                    {e.totalHours}h/sem
                                  </Badge>
                                  <Badge variant="outline" className="text-[9px] font-mono font-semibold bg-muted/50">
                                    {periodHours}h periodo
                                  </Badge>
                                  <span className="text-[10px] text-muted-foreground font-semibold">
                                    Fichas: {e.distinctGroups.size}
                                  </span>
                                </div>

                                {hasAnyCollision && (
                                  <Badge className="bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30 text-[9px] gap-1 font-bold mt-1">
                                    <AlertTriangle className="w-2.5 h-2.5 text-red-600" />
                                    <span>Cruces de Horario</span>
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Columns 2-8: Monday to Sunday Slots */}
                            {DAYS_ES.map((d) => {
                              const dayClasses = e.classesByDay[d.key] || [];

                              return (
                                <div
                                  key={d.key}
                                  className="col-span-1 p-1.5 space-y-1.5 min-h-[90px] flex flex-col justify-start bg-background/50 hover:bg-background transition-colors"
                                >
                                  {dayClasses.length > 0 ? (
                                    dayClasses.map((cls, idx) => (
                                      <Tooltip key={idx}>
                                        <TooltipTrigger asChild>
                                          <div
                                            onClick={() => {
                                              setSelectedEnvId(e.env.id);
                                              setEnvViewMode("single");
                                            }}
                                            className={`p-1.5 rounded-lg border cursor-pointer transition-all text-[10px] space-y-0.5 shadow-2xs group/card ${
                                              cls.hasCollision
                                                ? "bg-red-500/15 border-red-500/40 text-red-950 dark:text-red-100"
                                                : "bg-primary/10 border-primary/30 text-foreground hover:bg-primary/20"
                                            }`}
                                          >
                                            <div className="flex items-center justify-between gap-1">
                                              <span className="font-extrabold text-[10px] text-primary truncate">
                                                Ficha {cls.groupName}
                                              </span>
                                              {cls.hasCollision && (
                                                <AlertTriangle className="w-3 h-3 text-red-600 shrink-0" />
                                              )}
                                            </div>

                                            <div className="font-bold text-foreground line-clamp-1 leading-tight group-hover/card:text-primary transition-colors">
                                              {cls.courseTitle}
                                            </div>

                                            <div className="text-[9px] font-mono text-primary font-bold flex items-center gap-0.5">
                                              <Clock className="w-2.5 h-2.5 shrink-0" />
                                              <span>{toFormat12h(cls.startTime)} - {toFormat12h(cls.endTime)}</span>
                                            </div>

                                            {cls.teacherName && (
                                              <div className="text-[9px] text-muted-foreground truncate font-medium">
                                                👤 {cls.teacherName}
                                              </div>
                                            )}
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="rounded-2xl p-3 max-w-xs space-y-1.5 shadow-xl border border-border/80 bg-card text-card-foreground z-50">
                                          <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-1.5">
                                            <Badge className="bg-primary text-primary-foreground font-bold text-[10px]">
                                              Sala: {e.env.name}
                                            </Badge>
                                            <span className="text-[10px] font-mono text-muted-foreground font-semibold">
                                              {d.label}
                                            </span>
                                          </div>

                                          <p className="font-extrabold text-xs text-foreground leading-tight">{cls.courseTitle}</p>

                                          <div className="space-y-1 text-[11px] text-muted-foreground font-medium pt-1">
                                            <p className="flex items-center gap-1.5 text-primary font-semibold">
                                              <Clock className="w-3 h-3 text-primary shrink-0" />
                                              <span>{toFormat12h(cls.startTime)} a {toFormat12h(cls.endTime)} ({cls.durationHours}h)</span>
                                            </p>

                                            <p className="flex items-center gap-1.5 text-foreground">
                                              <Users className="w-3 h-3 text-primary shrink-0" />
                                              <span>Ficha: {cls.groupName} ({cls.programName})</span>
                                            </p>

                                            {cls.teacherName && (
                                              <p className="flex items-center gap-1.5">
                                                <GraduationCap className="w-3 h-3 text-indigo-500 shrink-0" />
                                                <span>Instructor: {cls.teacherName}</span>
                                              </p>
                                            )}
                                          </div>

                                          <p className="text-[10px] text-primary font-bold pt-1.5 border-t border-border/40 flex items-center justify-between">
                                            <span>Ver horario detallado de este ambiente</span>
                                            <ChevronRight className="w-3 h-3" />
                                          </p>
                                        </TooltipContent>
                                      </Tooltip>
                                    ))
                                  ) : (
                                    <div className="h-full flex items-center justify-center text-[10px] text-muted-foreground/40 italic p-1">
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
            </div>
          ) : (
            <div className="flex flex-col">
              {/* Environment Meta Card with Legend & Hours */}
              {currentEnv && (
                <div className="px-6 py-2 bg-muted/30 border-b border-border/50 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 font-bold text-foreground">
                    <Building className="w-4 h-4 text-primary" />
                    <span>{currentEnv.name}</span>
                    <span className="text-muted-foreground font-normal">
                      — Ubicación: {currentEnv.location || "Principal"} (Capacidad: {currentEnv.capacity || "N/A"})
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Time of Day Legend */}
                    <div className="hidden lg:flex items-center gap-2.5 bg-background/80 px-2.5 py-1 rounded-xl border border-border/60 text-[10px] font-semibold text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Cloud className="w-3 h-3 text-sky-500" /> Mañana
                      </span>
                      <span className="flex items-center gap-1">
                        <Sun className="w-3 h-3 text-orange-500" /> Tarde
                      </span>
                      <span className="flex items-center gap-1">
                        <Moon className="w-3 h-3 text-purple-600 dark:text-purple-400" /> Noche
                      </span>
                    </div>

                    {/* Weekly Hours Badge */}
                    <Badge className="bg-primary/15 text-primary font-bold text-xs px-2.5 py-1 border border-primary/30">
                      <Clock className="w-3.5 h-3.5 mr-1 text-primary" />
                      <span>{totalWeeklyHours}h / semana ({totalClassesInEnv} clases)</span>
                    </Badge>

                    {/* Total Period Hours Badge */}
                    <Badge className="bg-primary text-primary-foreground font-bold text-xs px-2.5 py-1 shadow-2xs">
                      <span>📊 {totalPeriodHours}h Totales Periodo ({totalWeeks} sem)</span>
                    </Badge>
                  </div>
                </div>
              )}

              {/* Days Header & Timeline Matrix */}
              <div className="p-2 sm:p-4 overflow-x-auto overflow-y-auto max-h-[54vh] scrollbar-thin touch-scroll">
                <div className="min-w-[650px] border border-border/80 rounded-2xl overflow-hidden bg-card shadow-xs">
                  {/* Days Header */}
                  <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-border/70 bg-muted/90 backdrop-blur-xs sticky top-0 z-20">
                    <div className="py-2 px-1 text-center text-[10px] font-extrabold text-muted-foreground uppercase border-r border-border/60">
                      Hora
                    </div>
                    {DAYS_ES.map((d) => {
                      const dayClasses = occupancyMap[d.key] || [];
                      return (
                        <div
                          key={d.key}
                          className="py-1.5 px-2 text-center border-r last:border-r-0 border-border/60"
                        >
                          <span className="font-extrabold text-xs text-foreground uppercase block">
                            {d.label}
                          </span>
                          <span className="text-[9px] text-muted-foreground font-semibold">
                            {dayClasses.length} {dayClasses.length === 1 ? "sesión" : "sesiones"}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Timeline Matrix */}
                  <div
                    className="grid grid-cols-[56px_repeat(7,1fr)] relative bg-background"
                    style={{ height: totalGridHeight }}
                  >
                    {/* Time Scale Column */}
                    <div className="flex flex-col divide-y divide-border/30 text-[9px] font-mono text-muted-foreground bg-muted/20 select-none border-r border-border/60">
                      {Array.from({ length: totalCanvasHours }, (_, i) => earliestHour + i).map((h) => (
                        <div
                          key={h}
                          style={{ height: `${ROW_HEIGHT}px` }}
                          className="px-0.5 pt-1.5 flex items-start justify-center font-bold text-[9px] text-muted-foreground truncate"
                        >
                          {formatHourLabel(h)}
                        </div>
                      ))}
                    </div>

                    {/* Day Columns with Absolute Positioned Classes */}
                    {DAYS_ES.map((d) => {
                      const classes = occupancyMap[d.key] || [];

                      return (
                        <div
                          key={d.key}
                          className="relative border-r last:border-r-0 border-border/60 h-full"
                        >
                          {/* Hour Guideline Horizontal Rules */}
                          {timeLabels.map((_, i) => (
                            <div
                              key={i}
                              className="absolute left-0 right-0 border-b border-border/30"
                              style={{ top: i * ROW_HEIGHT }}
                            />
                          ))}

                          {/* Class Slots Positioned Vertically */}
                          {classes.map((c) => {
                            const [sh, sm] = c.startTime.split(":").map(Number);
                            const [eh, em] = c.endTime.split(":").map(Number);

                            const startMinutes = (sh - earliestHour) * 60 + sm;
                            const durationMinutes = eh * 60 + em - (sh * 60 + sm);

                            const topPx = (startMinutes / 60) * ROW_HEIGHT;
                            const heightPx = Math.max(
                              (durationMinutes / 60) * ROW_HEIGHT - 3,
                              34
                            );

                            return (
                              <div
                                key={c.id}
                                style={{
                                  top: `${topPx}px`,
                                  height: `${heightPx}px`,
                                }}
                                className={`absolute left-1 right-1 rounded-xl p-1.5 border flex flex-col justify-between transition-all select-none shadow-2xs overflow-hidden ${
                                  c.hasCollision
                                    ? "bg-red-500/15 border-red-500/50 text-red-950 dark:text-red-100 ring-2 ring-red-500/30"
                                    : "bg-primary/10 border-primary/30 text-foreground hover:bg-primary/20"
                                }`}
                                title={`Ficha ${c.groupName}: ${c.courseTitle} (${toFormat12h(c.startTime)} a ${toFormat12h(c.endTime)}) en ${currentEnv?.name}`}
                              >
                                <div className="space-y-0.5 min-w-0">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-black text-[10px] text-primary truncate">
                                      {c.groupName}
                                    </span>

                                    {/* Sun / CloudSun / Moon Icon Indicator */}
                                    <div className="shrink-0">
                                      {renderTimeOfDayIcon(c.startTime, c.endTime)}
                                    </div>
                                  </div>

                                  <p className="text-[9px] font-bold text-foreground line-clamp-1 leading-tight">
                                    {c.courseTitle}
                                  </p>
                                </div>

                                <div className="flex items-center justify-between text-[8.5px] text-muted-foreground pt-0.5 border-t border-border/40 font-mono mt-auto">
                                  <span className="truncate font-semibold text-primary">
                                    {c.teacherName || "Sin instructor"}
                                  </span>
                                  <span className="font-bold shrink-0 ml-1">
                                    {c.durationHours}h
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <DialogFooter className="p-4 border-t border-border/80 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-[11px] text-muted-foreground">
              Total de ambientes de aprendizaje: {environments.length}.
            </span>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExportCurrentEnvPdf}
                disabled={isExporting || (envViewMode === "single" && !currentEnv)}
                className="rounded-xl text-xs font-bold gap-1.5 h-8 bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30 hover:bg-red-500/20"
                title="Exportar a PDF según la pestaña activa"
              >
                {isExporting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <FileText className="w-3 h-3 text-red-600" />
                )}
                <span>
                  {envViewMode === "single"
                    ? `PDF (${currentEnv?.name || "Ambiente"})`
                    : envViewMode === "all"
                    ? "PDF (Todos los Ambientes)"
                    : "PDF (Reporte Ocupación)"}
                </span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExportCurrentEnvExcel}
                disabled={isExporting || (envViewMode === "single" && !currentEnv)}
                className="rounded-xl text-xs font-bold gap-1.5 h-8 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
                title="Exportar a Excel según la pestaña activa"
              >
                {isExporting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                )}
                <span>
                  {envViewMode === "single"
                    ? `Excel (${currentEnv?.name || "Ambiente"})`
                    : envViewMode === "all"
                    ? "Excel (Todos los Ambientes)"
                    : "Excel (Reporte Ocupación)"}
                </span>
              </Button>

              <Button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-xl text-xs font-bold h-8"
              >
                Cerrar
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
