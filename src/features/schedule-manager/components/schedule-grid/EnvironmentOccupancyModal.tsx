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
} from "lucide-react";
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
  const [isExporting, setIsExporting] = useState(false);

  // Sync selected environment when modal opens
  React.useEffect(() => {
    if (open && environments.length > 0 && !selectedEnvId) {
      setSelectedEnvId(environments[0].id);
    }
  }, [open, environments, selectedEnvId]);

  const currentEnv = environments.find((e) => e.id === selectedEnvId) || environments[0] || null;

  const handleExportCurrentEnvPdf = async () => {
    if (!currentEnv) return;
    setIsExporting(true);
    try {
      toast.info(`Generando PDF de ${currentEnv.name}...`);
      const allData = extractEnvironmentsExportData(
        [currentEnv],
        groups,
        schedule.startDate,
        schedule.endDate
      );
      await exportEnvironmentsToPdf(
        schedule,
        allData,
        `Horario_Ambiente_${currentEnv.name.replace(/\s+/g, "_")}.pdf`
      );
      toast.success("PDF de ambiente descargado");
    } catch (err: any) {
      toast.error(err.message || "Error al exportar PDF");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCurrentEnvExcel = async () => {
    if (!currentEnv) return;
    setIsExporting(true);
    try {
      toast.info(`Generando Excel de ${currentEnv.name}...`);
      const allData = extractEnvironmentsExportData(
        [currentEnv],
        groups,
        schedule.startDate,
        schedule.endDate
      );
      await exportEnvironmentsToExcel(
        schedule,
        allData,
        `Horario_Ambiente_${currentEnv.name.replace(/\s+/g, "_")}.xlsx`
      );
      toast.success("Excel de ambiente descargado");
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
      <DialogContent className="sm:max-w-5xl p-0 overflow-hidden rounded-3xl border-border bg-background shadow-2xl">
        <div className="flex flex-col">
          {/* Header with Environment Selector */}
          <DialogHeader className="p-6 pb-4 border-b border-border/80 bg-muted/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-black text-foreground">
                    Matriz de Ocupación por Ambientes
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    {schedule.name} • Distribución vertical por horario con acumulado total del período académico.
                  </DialogDescription>
                </div>
              </div>

              {/* Environment Select Dropdown */}
              <div className="flex items-center gap-2">
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
              </div>
            </div>
          </DialogHeader>

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

                <Badge className="bg-primary/10 text-primary border-primary/20 font-bold text-[10px]">
                  <Clock className="w-3 h-3 mr-1" />
                  {totalWeeklyHours}h / semana ({totalClassesInEnv} clases)
                </Badge>

                <Badge className="bg-primary text-primary-foreground font-bold text-[10px] shadow-2xs">
                  <span>📊 {totalPeriodHours}h Totales Periodo ({totalWeeks} sem)</span>
                </Badge>
              </div>
            </div>
          )}

          {/* Vertical Hourly Schedule Grid */}
          <div className="p-4 overflow-y-auto max-h-[56vh] scrollbar-thin">
            <div className="border border-border/80 rounded-2xl overflow-hidden bg-card shadow-xs">
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
                <div className="border-r border-border/60 bg-muted/20 relative select-none">
                  {timeLabels.map((h, i) => (
                    <div
                      key={h}
                      className="absolute left-0 right-0 text-center text-[9px] font-mono text-muted-foreground -translate-y-1/2 font-bold px-0.5 truncate"
                      style={{ top: i * ROW_HEIGHT }}
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
                                : "bg-primary/15 border-primary/30 text-foreground hover:bg-primary/20"
                            }`}
                            title={`Ficha ${c.groupName}: ${c.courseTitle} (${toFormat12h(c.startTime)} a ${toFormat12h(c.endTime)}) - Docente: ${c.teacherName || "Sin profesor"}`}
                          >
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-black text-[10px] text-primary truncate">
                                  Ficha {c.groupName}
                                </span>

                                {/* Sun / CloudSun / Moon Icon Indicator */}
                                {renderTimeOfDayIcon(c.startTime, c.endTime)}
                              </div>

                              <p className="text-[9px] font-bold text-foreground line-clamp-1 leading-tight">
                                {c.courseTitle}
                              </p>
                            </div>

                            <div className="flex items-center justify-between text-[8.5px] text-muted-foreground pt-0.5 border-t border-border/40 font-mono mt-auto">
                              <span className="truncate">
                                {toFormat12h(c.startTime)} - {toFormat12h(c.endTime)}
                              </span>
                              {c.teacherName && (
                                <span className="truncate font-semibold text-primary ml-1">
                                  {c.teacherName}
                                </span>
                              )}
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
                disabled={isExporting || !currentEnv}
                className="rounded-xl text-xs font-bold gap-1.5 h-8 bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30 hover:bg-red-500/20"
                title="Exportar horario de este ambiente a PDF"
              >
                {isExporting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <FileText className="w-3 h-3 text-red-600" />
                )}
                <span>Exportar PDF</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExportCurrentEnvExcel}
                disabled={isExporting || !currentEnv}
                className="rounded-xl text-xs font-bold gap-1.5 h-8 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
                title="Exportar horario de este ambiente a Excel"
              >
                {isExporting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                )}
                <span>Exportar Excel</span>
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
