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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GraduationCap,
  Clock,
  Users,
  Building,
  AlertTriangle,
  Sun,
  Cloud,
  Moon,
  FileText,
  FileSpreadsheet,
  Loader2,
  Calendar,
  BookOpen,
  CheckCircle2,
  XCircle,
  BarChart3,
  Percent,
  Sparkles,
  User,
  Search,
  ChevronRight,
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
  extractTeachersExportData,
  generateAndDownloadTeacherSchedulePdf,
} from "../../utils/teacherSchedulePdfExport";
import { generateAndDownloadTeacherScheduleExcel } from "../../utils/teacherScheduleExcelExport";

const DAYS_ES: { key: DayOfWeek; label: string; short: string }[] = [
  { key: "MONDAY", label: "Lunes", short: "L" },
  { key: "TUESDAY", label: "Martes", short: "M" },
  { key: "WEDNESDAY", label: "Miércoles", short: "X" },
  { key: "THURSDAY", label: "Jueves", short: "J" },
  { key: "FRIDAY", label: "Viernes", short: "V" },
  { key: "SATURDAY", label: "Sábado", short: "S" },
  { key: "SUNDAY", label: "Domingo", short: "D" },
];

const COURSE_PALETTE = [
  "bg-indigo-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-purple-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-blue-500",
  "bg-teal-500",
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

interface TeacherOccupancyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: ScheduleBuilderData["schedule"];
  groups: ScheduleBuilderData["groups"];
  teachers: ScheduleBuilderData["teachers"];
  onSelectGroup?: (groupId: string) => void;
}

export function TeacherOccupancyModal({
  open,
  onOpenChange,
  schedule,
  groups,
  teachers,
  onSelectGroup,
}: TeacherOccupancyModalProps) {
  const [activeTab, setActiveTab] = useState<"schedule" | "availability" | "courses">("schedule");
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [teacherViewMode, setTeacherViewMode] = useState<"single" | "all" | "chart">("single");
  const [maxHoursThreshold, setMaxHoursThreshold] = useState<number>(40);
  const [teacherSearch, setTeacherSearch] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  // Extract all teacher assignments and total hours across all groups
  const teachersWithMetrics = useMemo(() => {
    const map = new Map<
      string,
      {
        teacher: ScheduleBuilderData["teachers"][0];
        cleanName: string;
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
            environmentName?: string;
            startTime: string;
            endTime: string;
            durationHours: number;
            hasCollision: boolean;
          }>
        >;
      }
    >();

    teachers.forEach((t) => {
      map.set(t.id, {
        teacher: t,
        cleanName: getCleanTeacherName(t.name),
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

    // Populate from groups scheduledClasses
    groups.forEach((g) => {
      g.scheduledClasses.forEach((c) => {
        c.schedules.forEach((s) => {
          const slotTeacher = s.teacher || c.teacher;
          if (slotTeacher) {
            const entry = map.get(slotTeacher.id);
            if (entry) {
              entry.distinctGroups.add(g.name);
              entry.distinctCourses.add(c.title);

              const [sh, sm] = s.startTime.split(":").map(Number);
              const [eh, em] = s.endTime.split(":").map(Number);
              const dur = (eh * 60 + em - (sh * 60 + sm)) / 60;
              entry.totalHours += dur;

              if (!entry.classesByDay[s.dayOfWeek]) {
                entry.classesByDay[s.dayOfWeek] = [];
              }

              // Check if teacher has collision on this slot
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
                environmentName: g.environment ? g.environment.name : "Sin ambiente",
                startTime: s.startTime,
                endTime: s.endTime,
                durationHours: dur,
                hasCollision,
              });
            }
          }
        });
      });
    });

    // Sort classes by startTime for each day
    Array.from(map.values()).forEach((entry) => {
      DAYS_ES.forEach((d) => {
        entry.classesByDay[d.key].sort((a, b) => a.startTime.localeCompare(b.startTime));
      });
    });

    // Sort teachers: those with hours first, then alphabetically
    return Array.from(map.values()).sort((a, b) => {
      if (b.totalHours !== a.totalHours) return b.totalHours - a.totalHours;
      return a.cleanName.localeCompare(b.cleanName);
    });
  }, [teachers, groups]);

  const filteredTeachersWithMetrics = useMemo(() => {
    if (!teacherSearch) return teachersWithMetrics;
    const q = teacherSearch.toLowerCase();
    return teachersWithMetrics.filter((t) => {
      const matchName = t.cleanName.toLowerCase().includes(q);
      const matchEmail = (t.teacher.email || "").toLowerCase().includes(q);
      const matchGroup = Array.from(t.distinctGroups).some((g) => g.toLowerCase().includes(q));
      const matchCourse = Array.from(t.distinctCourses).some((c) => c.toLowerCase().includes(q));
      return matchName || matchEmail || matchGroup || matchCourse;
    });
  }, [teachersWithMetrics, teacherSearch]);

  // Sync selected teacher when opening modal
  React.useEffect(() => {
    if (open && teachersWithMetrics.length > 0) {
      if (!selectedTeacherId || !teachersWithMetrics.some((t) => t.teacher.id === selectedTeacherId)) {
        const firstActive = teachersWithMetrics.find((t) => t.totalHours > 0) || teachersWithMetrics[0];
        setSelectedTeacherId(firstActive.teacher.id);
      }
    }
  }, [open, teachersWithMetrics, selectedTeacherId]);

  const currentTeacherData =
    teachersWithMetrics.find((t) => t.teacher.id === selectedTeacherId) ||
    teachersWithMetrics[0] ||
    null;

  // Calculate dynamic earliest and latest extreme hours
  const { earliestHour, latestHour, totalCanvasHours } = useMemo(() => {
    let minH = 6;
    let maxH = 22;

    if (currentTeacherData) {
      const hours: number[] = [];
      Object.values(currentTeacherData.classesByDay).forEach((arr) => {
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
    }

    const total = Math.max(maxH - minH, 8);
    return { earliestHour: minH, latestHour: maxH, totalCanvasHours: total };
  }, [currentTeacherData]);

  // Calculate accumulated total hours across entire period (from startDate to endDate)
  const { totalPeriodHours, totalWeeks } = useMemo(() => {
    if (!currentTeacherData || !schedule.startDate || !schedule.endDate) {
      return { totalPeriodHours: (currentTeacherData?.totalHours || 0) * 10, totalWeeks: 10 };
    }

    const start = new Date(schedule.startDate);
    const end = new Date(schedule.endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return { totalPeriodHours: currentTeacherData.totalHours * 10, totalWeeks: 10 };
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
      const dayClasses = currentTeacherData.classesByDay[dayEnum] || [];
      const daySum = dayClasses.reduce((acc, c) => acc + c.durationHours, 0);
      periodHours += daySum;
      cur.setUTCDate(cur.getUTCDate() + 1);
    }

    const weeks = Math.max(Math.round((daysCount / 7) * 10) / 10, 1);
    return { totalPeriodHours: Math.round(periodHours * 10) / 10, totalWeeks: weeks };
  }, [currentTeacherData, schedule.startDate, schedule.endDate]);

  // All Reported & Qualified Courses + Timeline Percentage
  const coursesBreakdown = useMemo(() => {
    if (!currentTeacherData) return [];

    const qualifiedTitles = currentTeacherData.teacher.qualifiedCourseTitles || [];

    const map = new Map<
      string,
      {
        courseTitle: string;
        weeklyHours: number;
        sessionsCount: number;
        distinctGroups: Set<string>;
        isQualified: boolean;
        isAssigned: boolean;
      }
    >();

    // 1. Add all courses explicitly reported/qualified by the teacher
    qualifiedTitles.forEach((title) => {
      map.set(title, {
        courseTitle: title,
        weeklyHours: 0,
        sessionsCount: 0,
        distinctGroups: new Set(),
        isQualified: true,
        isAssigned: false,
      });
    });

    // 2. Add / update with scheduled classes in this schedule
    Object.values(currentTeacherData.classesByDay).forEach((dayClasses) => {
      dayClasses.forEach((c) => {
        if (!map.has(c.courseTitle)) {
          map.set(c.courseTitle, {
            courseTitle: c.courseTitle,
            weeklyHours: 0,
            sessionsCount: 0,
            distinctGroups: new Set(),
            isQualified: qualifiedTitles.length === 0 || qualifiedTitles.includes(c.courseTitle),
            isAssigned: true,
          });
        }

        const entry = map.get(c.courseTitle)!;
        entry.weeklyHours += c.durationHours;
        entry.sessionsCount += 1;
        entry.distinctGroups.add(c.groupName);
        entry.isAssigned = true;
      });
    });

    const teacherTotalHours = currentTeacherData.totalHours || 1;

    return Array.from(map.values())
      .map((item, idx) => {
        const percentage =
          item.weeklyHours > 0
            ? Math.round((item.weeklyHours / teacherTotalHours) * 1000) / 10
            : 0;
        const periodHours = Math.round(item.weeklyHours * totalWeeks * 10) / 10;
        return {
          ...item,
          colorClass: item.isAssigned
            ? COURSE_PALETTE[idx % COURSE_PALETTE.length]
            : "bg-muted-foreground/30",
          percentage,
          periodHours,
        };
      })
      .sort((a, b) => {
        if (b.isAssigned !== a.isAssigned) return b.isAssigned ? 1 : -1;
        return b.weeklyHours - a.weeklyHours;
      });
  }, [currentTeacherData, totalWeeks]);

  // Availability Reported by Teacher Analysis
  const availabilityAnalysis = useMemo(() => {
    if (!currentTeacherData) {
      return {
        maxHours: 40,
        totalAvailableHoursDeclared: 0,
        occupancyPercent: 0,
        availabilityByDay: {} as Record<DayOfWeek, { startTime: string; endTime: string; durationHours: number } | null>,
        outsideAvailabilitySlots: [],
      };
    }

    const maxHours = currentTeacherData.teacher.maxHours || 40;

    let totalAvailableHoursDeclared = 0;
    const avMap: Record<DayOfWeek, { startTime: string; endTime: string; durationHours: number } | null> = {
      MONDAY: null,
      TUESDAY: null,
      WEDNESDAY: null,
      THURSDAY: null,
      FRIDAY: null,
      SATURDAY: null,
      SUNDAY: null,
    };

    (currentTeacherData.teacher.availability || []).forEach((av) => {
      const [sh, sm] = av.startTime.split(":").map(Number);
      const [eh, em] = av.endTime.split(":").map(Number);
      const dur = (eh * 60 + em - (sh * 60 + sm)) / 60;
      totalAvailableHoursDeclared += dur;

      avMap[av.dayOfWeek] = {
        startTime: av.startTime,
        endTime: av.endTime,
        durationHours: dur,
      };
    });

    const occupancyPercent =
      totalAvailableHoursDeclared > 0
        ? Math.min(Math.round((currentTeacherData.totalHours / totalAvailableHoursDeclared) * 100), 100)
        : Math.min(Math.round((currentTeacherData.totalHours / maxHours) * 100), 100);

    const outsideAvailabilitySlots: Array<{
      groupName: string;
      courseTitle: string;
      dayOfWeek: DayOfWeek;
      startTime: string;
      endTime: string;
      avWindow: string;
    }> = [];

    // Check if any class is outside declared availability
    DAYS_ES.forEach((d) => {
      const dayClasses = currentTeacherData.classesByDay[d.key] || [];
      const av = avMap[d.key];

      dayClasses.forEach((c) => {
        if (!av) {
          outsideAvailabilitySlots.push({
            groupName: c.groupName,
            courseTitle: c.courseTitle,
            dayOfWeek: d.key,
            startTime: c.startTime,
            endTime: c.endTime,
            avWindow: "Sin disponibilidad registrada este día",
          });
        } else if (c.startTime < av.startTime || c.endTime > av.endTime) {
          outsideAvailabilitySlots.push({
            groupName: c.groupName,
            courseTitle: c.courseTitle,
            dayOfWeek: d.key,
            startTime: c.startTime,
            endTime: c.endTime,
            avWindow: `${toFormat12h(av.startTime)} - ${toFormat12h(av.endTime)}`,
          });
        }
      });
    });

    return {
      maxHours,
      totalAvailableHoursDeclared,
      occupancyPercent,
      availabilityByDay: avMap,
      outsideAvailabilitySlots,
    };
  }, [currentTeacherData]);

  const handleExportCurrentTeacherPdf = async () => {
    if (teacherViewMode === "single" && !currentTeacherData) return;
    setIsExporting(true);
    try {
      const targetTeachers =
        teacherViewMode === "single" && currentTeacherData
          ? [currentTeacherData.teacher]
          : teachers;
      const label =
        teacherViewMode === "single"
          ? currentTeacherData?.cleanName || "Instructor"
          : teacherViewMode === "all"
          ? "Todos_Los_Instructores"
          : "Reporte_Carga_Instructores";

      toast.info(`Generando PDF de ${label.replace(/_/g, " ")}...`);
      const allTeachersData = extractTeachersExportData(targetTeachers, groups);
      await generateAndDownloadTeacherSchedulePdf(
        schedule,
        allTeachersData,
        teacherViewMode,
        `Horario_Instructor_${label.replace(/\s+/g, "_")}.pdf`,
        maxHoursThreshold
      );
      toast.success("PDF generado y descargado correctamente");
    } catch (err: any) {
      toast.error(err.message || "Error al exportar PDF");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCurrentTeacherExcel = async () => {
    if (teacherViewMode === "single" && !currentTeacherData) return;
    setIsExporting(true);
    try {
      const targetTeachers =
        teacherViewMode === "single" && currentTeacherData
          ? [currentTeacherData.teacher]
          : teachers;
      const label =
        teacherViewMode === "single"
          ? currentTeacherData?.cleanName || "Instructor"
          : teacherViewMode === "all"
          ? "Todos_Los_Instructores"
          : "Reporte_Carga_Instructores";

      toast.info(`Generando Excel de ${label.replace(/_/g, " ")}...`);
      const allTeachersData = extractTeachersExportData(targetTeachers, groups);
      await generateAndDownloadTeacherScheduleExcel(
        schedule,
        allTeachersData,
        teacherViewMode,
        `Horario_Instructor_${label.replace(/\s+/g, "_")}.xlsx`
      );
      toast.success("Excel generado y descargado correctamente");
    } catch (err: any) {
      toast.error(err.message || "Error al exportar Excel");
    } finally {
      setIsExporting(false);
    }
  };

  const ROW_HEIGHT = 44; // px per hour
  const totalGridHeight = totalCanvasHours * ROW_HEIGHT;
  const timeLabels = Array.from({ length: totalCanvasHours + 1 }, (_, i) => earliestHour + i);

  const handleGroupClick = (groupId: string) => {
    if (onSelectGroup) {
      onSelectGroup(groupId);
      onOpenChange(false);
    }
  };

  const assignedCoursesCount = coursesBreakdown.filter((c) => c.isAssigned).length;
  const reportedCoursesCount = coursesBreakdown.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] lg:max-w-6xl xl:max-w-7xl p-0 overflow-hidden rounded-3xl border-border bg-background shadow-2xl">
        <div className="flex flex-col">
          {/* Header */}
          <DialogHeader className="p-6 pb-4 border-b border-border/80 bg-muted/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 font-bold shrink-0">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-lg font-black text-foreground truncate">
                    Matriz de Horario y Carga por Instructor
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5 truncate">
                    {schedule.name} • Disponibilidad reportada, materias habilitadas y distribución horaria.
                  </DialogDescription>
                </div>
              </div>

              {/* Mode Switcher & Teacher Selector */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {/* View Mode Toggle Button */}
                <div className="flex items-center gap-0.5 bg-muted/60 p-0.5 rounded-xl border border-border/80 shrink-0">
                  <button
                    type="button"
                    onClick={() => setTeacherViewMode("single")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      teacherViewMode === "single"
                        ? "bg-background text-indigo-600 shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Por Instructor</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTeacherViewMode("all")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      teacherViewMode === "all"
                        ? "bg-background text-indigo-600 shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Todos los Instructores</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTeacherViewMode("chart")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      teacherViewMode === "chart"
                        ? "bg-background text-indigo-600 shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Gráfico de Horas</span>
                  </button>
                </div>

                {/* Teacher Dropdown (Only in single mode) */}
                {teacherViewMode === "single" && (
                  <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                    <SelectTrigger className="h-8 text-xs font-bold rounded-xl w-60 bg-background border-border/80">
                      <SelectValue placeholder="Seleccionar instructor..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl text-xs max-h-60">
                      {teachersWithMetrics.map((t) => (
                        <SelectItem key={t.teacher.id} value={t.teacher.id} className="text-xs">
                          <div className="flex items-center justify-between w-full gap-2">
                            <span className="truncate">{t.cleanName}</span>
                            <span className="font-mono text-[10px] text-muted-foreground font-bold shrink-0">
                              ({t.totalHours}h/sem)
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </DialogHeader>

          {/* Body Content depending on View Mode */}
          {teacherViewMode === "chart" ? (
            <div className="p-6 flex flex-col space-y-5 max-h-[70vh] overflow-y-auto scrollbar-thin">
              {/* Executive Summary KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-1">
                  <span className="text-[11px] font-bold text-indigo-600 uppercase flex items-center justify-between">
                    <span>Total Instructores</span>
                    <GraduationCap className="w-4 h-4 text-indigo-600" />
                  </span>
                  <p className="text-2xl font-black text-foreground">
                    {teachersWithMetrics.length}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-medium">
                    Instructores registrados en la sede
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                  <span className="text-[11px] font-bold text-emerald-600 uppercase flex items-center justify-between">
                    <span>Con Carga Activa</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </span>
                  <p className="text-2xl font-black text-foreground">
                    {teachersWithMetrics.filter((t) => t.totalHours > 0).length} / {teachersWithMetrics.length}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-medium">
                    Instructores con horas asignadas
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-1">
                  <span className="text-[11px] font-bold text-purple-600 uppercase flex items-center justify-between">
                    <span>Total Horas Asignadas</span>
                    <Clock className="w-4 h-4 text-purple-600" />
                  </span>
                  <p className="text-2xl font-black text-foreground">
                    {Math.round(teachersWithMetrics.reduce((acc, t) => acc + t.totalHours, 0) * 10) / 10}h / sem
                  </p>
                  <p className="text-[10px] text-muted-foreground font-medium">
                    En todos los grupos y materias
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                  <span className="text-[11px] font-bold text-amber-600 uppercase flex items-center justify-between">
                    <span>Promedio de Carga</span>
                    <Percent className="w-4 h-4 text-amber-600" />
                  </span>
                  <p className="text-2xl font-black text-foreground">
                    {teachersWithMetrics.length > 0
                      ? Math.round(
                          (teachersWithMetrics.reduce((acc, t) => acc + t.totalHours, 0) /
                            (teachersWithMetrics.length * maxHoursThreshold)) *
                            100
                        )
                      : 0}%
                  </p>
                  <p className="text-[10px] text-muted-foreground font-medium truncate">
                    Basado en máximo de {maxHoursThreshold}h/sem
                  </p>
                </div>
              </div>

              {/* Teacher Hours Bar Chart List */}
              <div className="border border-border/80 rounded-2xl p-5 bg-card space-y-4 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-indigo-600" />
                      <span>Gráficos de Carga Horaria por Instructor</span>
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Comparativa visual de horas semanales asignadas frente al límite delimitable.
                    </p>
                  </div>

                  {/* Delimiter Threshold Control & Color Legend */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-muted/60 p-1.5 px-3 rounded-xl border border-border/80 text-xs">
                      <span className="font-extrabold text-foreground">Límite Máximo:</span>
                      <Input
                        type="number"
                        min={10}
                        max={60}
                        value={maxHoursThreshold}
                        onChange={(e) =>
                          setMaxHoursThreshold(Math.max(1, Number(e.target.value) || 40))
                        }
                        className="w-16 h-7 rounded-lg border-border bg-background px-2 text-center font-mono font-black text-indigo-600 text-xs focus:ring-2 focus:ring-indigo-500/30"
                      />
                      <span className="font-bold text-muted-foreground">h / sem</span>
                    </div>

                    <div className="flex items-center gap-3 text-[10px] font-bold">
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Normal
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Límite (100%)
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" /> Exceso (&gt; {maxHoursThreshold}h)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {teachersWithMetrics.map((t) => {
                    const hours = t.totalHours;
                    const limit = maxHoursThreshold;
                    const hasExcess = hours > limit;
                    const excessHours = Math.max(0, Math.round((hours - limit) * 10) / 10);
                    const baseHours = Math.min(hours, limit);

                    // Dynamic scale: track total scale is max(limit * 1.25, hours)
                    const scaleMax = Math.max(limit * 1.25, hours);
                    const basePercent = Math.min((baseHours / scaleMax) * 100, 100);
                    const excessPercent = Math.min((excessHours / scaleMax) * 100, 100);
                    const limitMarkerPercent = (limit / scaleMax) * 100;

                    const periodHours = Math.round(hours * totalWeeks * 10) / 10;
                    const hasCollisions = Object.values(t.classesByDay).some((arr) =>
                      arr.some((c) => c.hasCollision)
                    );

                    const baseFillColor =
                      hours <= limit * 0.8
                        ? "bg-emerald-500"
                        : "bg-amber-500";

                    const percentOfLimit = Math.round((hours / limit) * 100);

                    return (
                      <div
                        key={t.teacher.id}
                        className="p-4 rounded-2xl border border-border/70 bg-background hover:bg-muted/20 transition-all space-y-2.5 group"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="font-extrabold text-foreground text-sm group-hover:text-indigo-600 transition-colors truncate">
                              👨‍🏫 {t.cleanName}
                            </span>
                            <span className="text-[11px] text-muted-foreground truncate">
                              ({t.teacher.email || "Sin correo"})
                            </span>

                            {hasExcess && (
                              <Badge className="bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30 text-[9.5px] font-extrabold shrink-0 animate-pulse">
                                ⚠️ Exceso: +{excessHours}h del límite
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
                              {hours}h / {limit}h max
                            </span>
                            <Badge className="font-mono font-bold text-[10px] bg-indigo-500/10 text-indigo-600 border-indigo-500/30">
                              {periodHours}h periodo
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedTeacherId(t.teacher.id);
                                setTeacherViewMode("single");
                              }}
                              className="h-6 px-2 rounded-lg text-[10px] font-bold text-indigo-600 border-indigo-500/30 hover:bg-indigo-500/10 gap-1"
                            >
                              <span>Ver Horario</span>
                              <ChevronRight className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Multi-Tone Visual Progress Bar with Threshold Indicator */}
                        <div className="space-y-1">
                          <div className="w-full h-4 rounded-full bg-muted overflow-hidden relative border border-border/60 flex">
                            {/* Base Portion (Up to Limit) */}
                            <div
                              className={`h-full transition-all duration-500 ${baseFillColor}`}
                              style={{ width: `${basePercent}%` }}
                            />
                            {/* Excess Portion (Hours Exceeding Limit - Painted Red/Rose) */}
                            {hasExcess && (
                              <div
                                className="h-full bg-gradient-to-r from-red-600 to-rose-600 transition-all duration-500 border-l border-white/50 animate-pulse"
                                style={{ width: `${excessPercent}%` }}
                                title={`Exceso de ${excessHours} horas sobre el límite de ${limit}h`}
                              />
                            )}

                            {/* Dashed vertical marker for the limit */}
                            <div
                              className="absolute top-0 bottom-0 w-0.5 bg-foreground/80 z-10 pointer-events-none"
                              style={{ left: `${limitMarkerPercent}%` }}
                              title={`Límite delimitador: ${limit} horas`}
                            />
                          </div>

                          <div className="flex items-center justify-between text-[10.5px] text-muted-foreground font-semibold pt-0.5">
                            <span className="truncate">
                              Fichas a cargo: {t.distinctGroups.size}{" "}
                              {t.distinctGroups.size > 0
                                ? `(${Array.from(t.distinctGroups).join(", ")})`
                                : ""}
                            </span>
                            <span
                              className={`font-bold font-mono shrink-0 ml-2 ${
                                hasExcess ? "text-red-600 font-extrabold" : "text-foreground"
                              }`}
                            >
                              {percentOfLimit}% Ocupación ({hours}h de {limit}h)
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : teacherViewMode === "all" ? (
            <div className="p-5 flex flex-col space-y-3">
              {/* Controls & Search */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 pb-2 border-b border-border/70">
                <div className="flex items-center gap-2">
                  <Badge className="bg-indigo-600 text-white font-bold text-xs px-2.5 py-1">
                    {teachersWithMetrics.length} Instructores Registrados
                  </Badge>
                  <span className="text-xs text-muted-foreground font-medium">
                    (Matriz completa de ocupación por instructor, una fila por instructor)
                  </span>
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={teacherSearch}
                    onChange={(e) => setTeacherSearch(e.target.value)}
                    placeholder="Buscar por instructor, email, materia o ficha..."
                    className="pl-8 text-xs h-8 rounded-xl bg-background border-border/80 font-medium"
                  />
                </div>
              </div>

              {/* All Teachers Table Matrix */}
              <div className="overflow-auto max-h-[58vh] border border-border/80 rounded-2xl bg-background shadow-2xs relative scrollbar-thin">
                <div className="min-w-[1100px]">
                  {/* Table Header with Solid Background */}
                  <div className="grid grid-cols-12 divide-x divide-border/80 border-b border-border/80 bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 sticky top-0 z-30 text-[11px] font-black shadow-xs">
                    <div className="col-span-3 p-3 flex items-center justify-between bg-slate-100 dark:bg-slate-900">
                      <span>Instructor</span>
                      <span className="text-[10px] font-normal text-muted-foreground">Horas & Fichas</span>
                    </div>
                    {DAYS_ES.map((d) => (
                      <div key={d.key} className="col-span-1 p-2 text-center flex items-center justify-center font-extrabold uppercase bg-slate-100 dark:bg-slate-900">
                        {d.label}
                      </div>
                    ))}
                  </div>

                  {/* Table Body (One Teacher Per Row) */}
                  <div className="divide-y divide-border/60">
                    {filteredTeachersWithMetrics.length === 0 ? (
                      <div className="p-8 text-center text-xs text-muted-foreground italic">
                        No se encontraron instructores con el criterio de búsqueda.
                      </div>
                    ) : (
                      filteredTeachersWithMetrics.map((t) => {
                        const periodHours = Math.round(t.totalHours * totalWeeks * 10) / 10;
                        const hasAnyCollision = Object.values(t.classesByDay).some((arr) =>
                          arr.some((c) => c.hasCollision)
                        );

                        return (
                          <div
                            key={t.teacher.id}
                            className="grid grid-cols-12 divide-x divide-border/60 hover:bg-muted/20 transition-colors group"
                          >
                            {/* Column 1: Teacher Metadata */}
                            <div className="col-span-3 p-3 flex flex-col justify-between gap-2 bg-card/60">
                              <div className="space-y-1">
                                <div className="flex items-center justify-between gap-1.5">
                                  <span className="font-extrabold text-xs text-foreground group-hover:text-indigo-600 transition-colors truncate">
                                    {t.cleanName}
                                  </span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedTeacherId(t.teacher.id);
                                      setTeacherViewMode("single");
                                    }}
                                    className="h-5 px-1.5 rounded-md text-[10px] gap-1 font-bold text-indigo-600 border-indigo-500/30 hover:bg-indigo-500/10 shrink-0"
                                    title="Ver horario detallado de este instructor"
                                  >
                                    <span>Ver</span>
                                    <ChevronRight className="w-3 h-3" />
                                  </Button>
                                </div>

                                <div className="text-[10px] text-muted-foreground truncate font-medium">
                                  ✉️ {t.teacher.email || "Sin correo"}
                                </div>

                                <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                                  <Badge variant="outline" className="text-[9px] font-mono font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30">
                                    {t.totalHours}h/sem
                                  </Badge>
                                  <Badge variant="outline" className="text-[9px] font-mono font-semibold bg-muted/50">
                                    {periodHours}h periodo
                                  </Badge>
                                  <span className="text-[10px] text-muted-foreground font-semibold">
                                    Fichas: {t.distinctGroups.size}
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
                              const dayClasses = t.classesByDay[d.key] || [];

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
                                              setSelectedTeacherId(t.teacher.id);
                                              setTeacherViewMode("single");
                                            }}
                                            className={`p-1.5 rounded-lg border cursor-pointer transition-all text-[10px] space-y-0.5 shadow-2xs group/card ${
                                              cls.hasCollision
                                                ? "bg-red-500/15 border-red-500/40 text-red-950 dark:text-red-100"
                                                : "bg-indigo-500/10 border-indigo-500/30 text-foreground hover:bg-indigo-500/20"
                                            }`}
                                          >
                                            <div className="flex items-center justify-between gap-1">
                                              <span className="font-extrabold text-[10px] text-indigo-700 dark:text-indigo-300 truncate">
                                                Ficha {cls.groupName}
                                              </span>
                                              {cls.hasCollision && (
                                                <AlertTriangle className="w-3 h-3 text-red-600 shrink-0" />
                                              )}
                                            </div>

                                            <div className="font-bold text-foreground line-clamp-1 leading-tight group-hover/card:text-indigo-600 transition-colors">
                                              {cls.courseTitle}
                                            </div>

                                            <div className="text-[9px] font-mono text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-0.5">
                                              <Clock className="w-2.5 h-2.5 shrink-0" />
                                              <span>{toFormat12h(cls.startTime)} - {toFormat12h(cls.endTime)}</span>
                                            </div>

                                            {cls.environmentName && (
                                              <div className="text-[9px] text-muted-foreground truncate font-medium">
                                                📍 {cls.environmentName}
                                              </div>
                                            )}
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="rounded-2xl p-3 max-w-xs space-y-1.5 shadow-xl border border-border/80 bg-card text-card-foreground z-50">
                                          <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-1.5">
                                            <Badge className="bg-indigo-600 text-white font-bold text-[10px]">
                                              Instructor: {t.cleanName}
                                            </Badge>
                                            <span className="text-[10px] font-mono text-muted-foreground font-semibold">
                                              {d.label}
                                            </span>
                                          </div>

                                          <p className="font-extrabold text-xs text-foreground leading-tight">{cls.courseTitle}</p>

                                          <div className="space-y-1 text-[11px] text-muted-foreground font-medium pt-1">
                                            <p className="flex items-center gap-1.5 text-indigo-600 font-semibold">
                                              <Clock className="w-3 h-3 text-indigo-600 shrink-0" />
                                              <span>{toFormat12h(cls.startTime)} a {toFormat12h(cls.endTime)} ({cls.durationHours}h)</span>
                                            </p>

                                            <p className="flex items-center gap-1.5 text-foreground">
                                              <Users className="w-3 h-3 text-primary shrink-0" />
                                              <span>Ficha: {cls.groupName} ({cls.programName})</span>
                                            </p>

                                            {cls.environmentName && (
                                              <p className="flex items-center gap-1.5">
                                                <Building className="w-3 h-3 text-indigo-500 shrink-0" />
                                                <span>Ambiente: {cls.environmentName}</span>
                                              </p>
                                            )}
                                          </div>

                                          <p className="text-[10px] text-indigo-600 font-bold pt-1.5 border-t border-border/40 flex items-center justify-between">
                                            <span>Ver horario detallado de este instructor</span>
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
              {/* Single Teacher Metrics Bar */}
              {currentTeacherData && (
                <div className="px-6 py-2 bg-indigo-500/5 border-b border-indigo-500/20 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-1.5 font-bold text-foreground">
                      <GraduationCap className="w-4 h-4 text-indigo-600" />
                      <span>{currentTeacherData.cleanName}</span>
                      <span className="text-muted-foreground font-normal">
                        ({currentTeacherData.teacher.email || "Sin correo"})
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Users className="w-3.5 h-3.5 text-primary" />
                      <span>
                        Fichas: <strong>{currentTeacherData.distinctGroups.size}</strong> (
                        {Array.from(currentTeacherData.distinctGroups).join(", ") || "Ninguna"})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Weekly Hours Badge */}
                    <Badge className="bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 font-bold text-xs px-2.5 py-1">
                      <Clock className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                      <span>{currentTeacherData.totalHours} Horas / Semana</span>
                    </Badge>

                    {/* Total Period Hours Badge */}
                    <Badge className="bg-indigo-600 text-white font-bold text-xs px-2.5 py-1 shadow-2xs">
                      <span>📊 {totalPeriodHours}h Totales Periodo ({totalWeeks} sem)</span>
                    </Badge>
                  </div>
                </div>
              )}

              {/* 3 Interactive Tabs */}
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as any)}
                className="w-full flex flex-col"
              >
                <div className="px-6 pt-3 pb-2 border-b border-border/60 bg-muted/10 flex items-center justify-between">
                  <TabsList className="inline-flex w-auto h-auto rounded-xl bg-muted/60 p-1 gap-1">
                    <TabsTrigger
                      value="schedule"
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:text-indigo-600 data-[state=active]:shadow-xs"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Horario Semanal</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="availability"
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:text-indigo-600 data-[state=active]:shadow-xs"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Disponibilidad Reportada</span>
                      {availabilityAnalysis.outsideAvailabilitySlots.length > 0 && (
                        <span className="ml-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] flex items-center justify-center font-bold shrink-0">
                          !
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger
                      value="courses"
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:text-indigo-600 data-[state=active]:shadow-xs"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Materias Reportadas ({reportedCoursesCount})</span>
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* TAB 1: HORARIO SEMANAL */}
                <TabsContent value="schedule" className="p-4 m-0 overflow-y-auto max-h-[54vh] scrollbar-thin">
                  <div className="border border-border/80 rounded-2xl overflow-hidden bg-card shadow-xs">
                    {/* Days Header */}
                    <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-border/70 bg-muted/90 backdrop-blur-xs sticky top-0 z-20">
                      <div className="py-2 px-1 text-center text-[10px] font-extrabold text-muted-foreground uppercase border-r border-border/60">
                        Hora
                      </div>
                      {DAYS_ES.map((d) => {
                        const dayClasses = currentTeacherData?.classesByDay[d.key] || [];
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
                        const classes = currentTeacherData?.classesByDay[d.key] || [];

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
                                  onClick={() => handleGroupClick(c.groupId)}
                                  style={{
                                    top: `${topPx}px`,
                                    height: `${heightPx}px`,
                                  }}
                                  className={`absolute left-1 right-1 rounded-xl p-1.5 border flex flex-col justify-between transition-all cursor-pointer select-none shadow-2xs overflow-hidden ${
                                    c.hasCollision
                                      ? "bg-red-500/15 border-red-500/50 text-red-950 dark:text-red-100 hover:bg-red-500/25 ring-2 ring-red-500/30"
                                      : "bg-indigo-500/15 border-indigo-500/30 text-indigo-950 dark:text-indigo-100 hover:bg-indigo-500/25"
                                  }`}
                                  title={`Ficha ${c.groupName}: ${c.courseTitle} (${toFormat12h(c.startTime)} a ${toFormat12h(c.endTime)}) en ${c.environmentName}`}
                                >
                                  <div className="space-y-0.5 min-w-0">
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="font-black text-[10px] text-indigo-700 dark:text-indigo-300 truncate">
                                        {c.groupName}
                                      </span>

                                      <div className="shrink-0">
                                        {renderTimeOfDayIcon(c.startTime, c.endTime)}
                                      </div>
                                    </div>

                                    <p className="text-[9px] font-bold text-foreground line-clamp-1 leading-tight">
                                      {c.courseTitle}
                                    </p>
                                  </div>

                                  <div className="flex items-center justify-between text-[8.5px] text-muted-foreground pt-0.5 border-t border-border/40 font-mono mt-auto">
                                    <span className="truncate">
                                      {toFormat12h(c.startTime)} - {toFormat12h(c.endTime)}
                                    </span>
                                    <span className="font-bold text-indigo-600 shrink-0 ml-1">
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
                </TabsContent>

                {/* TAB 2: DISPONIBILIDAD REPORTADA */}
                <TabsContent value="availability" className="p-5 m-0 overflow-y-auto max-h-[54vh] space-y-4 scrollbar-thin">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-2xl border border-border/80 bg-card space-y-1">
                      <span className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-primary" /> Horas Reportadas Disponibles
                      </span>
                      <div className="flex items-baseline gap-1.5">
                        <p className="text-xl font-black text-foreground">
                          {availabilityAnalysis.totalAvailableHoursDeclared}
                        </p>
                        <span className="text-xs font-normal text-muted-foreground">h declaradas en perfil</span>
                      </div>
                    </div>

                <div className="p-4 rounded-2xl border border-border/80 bg-card space-y-1">
                  <span className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5 text-indigo-600" /> Horas Asignadas en Horario
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <p className="text-xl font-black text-indigo-600">
                      {currentTeacherData?.totalHours || 0}
                    </p>
                    <span className="text-xs font-normal text-muted-foreground">h / semana activas</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-border/80 bg-card space-y-1">
                  <span className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-emerald-600" /> Ocupación de Disponibilidad
                  </span>
                  <div className="flex items-baseline gap-2">
                    <p className="text-xl font-black text-foreground">
                      {availabilityAnalysis.occupancyPercent}%
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      ({Math.max(availabilityAnalysis.totalAvailableHoursDeclared - (currentTeacherData?.totalHours || 0), 0)}h aún libres)
                    </span>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden mt-1">
                    <div
                      className={`h-full rounded-full transition-all ${
                        availabilityAnalysis.occupancyPercent > 100
                          ? "bg-red-500"
                          : availabilityAnalysis.occupancyPercent > 80
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      }`}
                      style={{ width: `${Math.min(availabilityAnalysis.occupancyPercent, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Outside Availability Warnings if any */}
              {availabilityAnalysis.outsideAvailabilitySlots.length > 0 && (
                <div className="p-3.5 rounded-2xl border border-amber-500/40 bg-amber-500/10 space-y-2">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>Se detectaron {availabilityAnalysis.outsideAvailabilitySlots.length} clases fuera de la disponibilidad reportada</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {availabilityAnalysis.outsideAvailabilitySlots.map((slot, sIdx) => (
                      <div key={sIdx} className="p-2 rounded-xl bg-background/80 border border-border/60 text-[11px] space-y-0.5">
                        <span className="font-bold text-foreground block">
                          Ficha {slot.groupName} • {slot.courseTitle}
                        </span>
                        <span className="text-muted-foreground block text-[10px]">
                          Programado: {slot.dayOfWeek} de {toFormat12h(slot.startTime)} a {toFormat12h(slot.endTime)}
                        </span>
                        <span className="text-amber-700 dark:text-amber-300 font-semibold block text-[10px]">
                          Franja reportada: {slot.avWindow}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Weekly Availability Window Cards */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider block">
                  Franjas Horarias Reportadas por el Instructor (Lunes a Domingo)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
                  {DAYS_ES.map((d) => {
                    const av = availabilityAnalysis.availabilityByDay[d.key];
                    const dayClasses = currentTeacherData?.classesByDay[d.key] || [];

                    return (
                      <div
                        key={d.key}
                        className={`p-3 rounded-2xl border flex flex-col justify-between min-h-[120px] ${
                          av
                            ? "bg-card border-border/80 shadow-2xs"
                            : "bg-muted/20 border-dashed border-border/50 opacity-60"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between border-b border-border/50 pb-1 mb-1.5">
                            <span className="font-extrabold text-xs text-foreground uppercase">
                              {d.label}
                            </span>
                            {av ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 text-muted-foreground" />
                            )}
                          </div>

                          {av ? (
                            <div className="space-y-1">
                              <span className="text-[10px] text-muted-foreground block">
                                Franja reportada:
                              </span>
                              <span className="font-mono text-[10px] font-bold text-foreground block">
                                {toFormat12h(av.startTime)} - {toFormat12h(av.endTime)}
                              </span>
                              <Badge variant="outline" className="text-[9px] font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/30">
                                {av.durationHours}h disponibles
                              </Badge>
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic">
                              No disponible este día
                            </span>
                          )}
                        </div>

                        <div className="pt-2 border-t border-border/40 text-[10px] text-muted-foreground font-semibold flex items-center justify-between">
                          <span>Asignadas:</span>
                          <span className="font-bold text-indigo-600 font-mono">
                            {dayClasses.length} {dayClasses.length === 1 ? "clase" : "clases"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            {/* TAB 3: MATERIAS REPORTADAS Y CARGA */}
            <TabsContent value="courses" className="p-5 m-0 overflow-y-auto max-h-[54vh] space-y-4 scrollbar-thin">
              {/* Stacked Proportional Timeline Progress Bar */}
              <div className="p-4 rounded-2xl border border-border/80 bg-card space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Línea de Tiempo y Distribución Proporcional de Carga
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Badge className="bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-bold text-[10px]">
                      {assignedCoursesCount} asignadas ({currentTeacherData?.totalHours || 0}h/sem)
                    </Badge>
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      {reportedCoursesCount - assignedCoursesCount} en banco sin asignar
                    </Badge>
                  </div>
                </div>

                {/* Multicolor Stacked Bar */}
                <div className="w-full h-4 rounded-xl bg-muted/60 overflow-hidden flex shadow-inner">
                  {coursesBreakdown
                    .filter((c) => c.isAssigned)
                    .map((item, idx) => (
                      <div
                        key={idx}
                        className={`${item.colorClass} h-full transition-all`}
                        style={{ width: `${item.percentage}%` }}
                        title={`${item.courseTitle}: ${item.weeklyHours}h (${item.percentage}%)`}
                      />
                    ))}
                </div>

                {/* Legend with percentages */}
                <div className="flex items-center gap-3 flex-wrap pt-1 text-[10px]">
                  {coursesBreakdown
                    .filter((c) => c.isAssigned)
                    .map((item, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 font-medium text-muted-foreground">
                        <span className={`w-2.5 h-2.5 rounded-full ${item.colorClass} shrink-0`} />
                        <span className="truncate max-w-[180px] text-foreground font-semibold">
                          {item.courseTitle}
                        </span>
                        <span className="font-mono font-bold text-primary">({item.percentage}%)</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Detailed Courses Cards */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider block">
                  Portafolio de Materias y Competencias Reportadas por el Instructor ({reportedCoursesCount})
                </span>

                {coursesBreakdown.length === 0 ? (
                  <div className="text-center py-10 text-xs text-muted-foreground">
                    Este instructor no tiene materias reportadas en su perfil ni asignaciones activas.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {coursesBreakdown.map((course, idx) => (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs ${
                          course.isAssigned
                            ? "border-border/80 bg-card hover:bg-muted/30"
                            : "border-border/50 bg-muted/15 opacity-70 hover:opacity-100"
                        }`}
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`w-2.5 h-2.5 rounded-full ${course.colorClass} shrink-0`} />
                            <span className="font-extrabold text-xs text-foreground">
                              {course.courseTitle}
                            </span>

                            {course.isAssigned ? (
                              <Badge className="bg-emerald-600 text-white font-bold text-[9px] gap-1 px-2 py-0">
                                <CheckCircle2 className="w-2.5 h-2.5" /> En Horario Activo
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[9px] text-muted-foreground bg-muted/40 border-border font-semibold">
                                Reportada en Perfil (Sin asignar)
                              </Badge>
                            )}

                            {course.isQualified ? (
                              <Badge variant="outline" className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 text-[9px] gap-1 font-semibold">
                                <Sparkles className="w-2.5 h-2.5 text-indigo-600" /> Habilitado
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[9px] gap-1 font-semibold">
                                <AlertTriangle className="w-2.5 h-2.5 text-amber-600" /> Sin registro de habilitación
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                            {course.isAssigned ? (
                              <>
                                <span className="flex items-center gap-1">
                                  <Users className="w-3 h-3 text-primary" /> Fichas:{" "}
                                  <strong className="text-foreground">
                                    {Array.from(course.distinctGroups).join(", ") || "N/A"}
                                  </strong>
                                </span>
                                <span>•</span>
                                <span>
                                  Sesiones: <strong className="text-foreground">{course.sessionsCount} por semana</strong>
                                </span>
                              </>
                            ) : (
                              <span className="text-[10px] text-muted-foreground italic">
                                Disponible en el banco de competencias reportadas por el instructor para asignación.
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Hours and Percentage Badges */}
                        <div className="flex items-center gap-2 shrink-0">
                          {course.isAssigned ? (
                            <>
                              <div className="text-right">
                                <span className="font-extrabold text-xs text-foreground block">
                                  {course.weeklyHours}h / semana
                                </span>
                                <span className="text-[10px] text-muted-foreground block font-mono">
                                  {course.periodHours}h en {totalWeeks} semanas
                                </span>
                              </div>

                              <Badge className="bg-indigo-600 text-white font-bold text-xs px-2.5 py-1 shadow-2xs font-mono">
                                {course.percentage}%
                              </Badge>
                            </>
                          ) : (
                            <span className="text-[10px] text-muted-foreground font-mono font-semibold px-2 py-1 bg-muted/40 rounded-lg">
                              0h asignadas
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
            </div>
          )}

          {/* Footer */}
          <DialogFooter className="p-4 border-t border-border/80 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-[11px] text-muted-foreground">
              Total de instructores registrados: {teachers.length}.
            </span>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExportCurrentTeacherPdf}
                disabled={isExporting || (teacherViewMode === "single" && !currentTeacherData)}
                className="rounded-xl text-xs font-bold gap-1.5 h-8 bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30 hover:bg-red-500/20"
                title="Exportar a PDF según la pestaña activa"
              >
                {isExporting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <FileText className="w-3 h-3 text-red-600" />
                )}
                <span>
                  {teacherViewMode === "single"
                    ? `PDF (${currentTeacherData?.cleanName || "Instructor"})`
                    : teacherViewMode === "all"
                    ? "PDF (Todos los Instructores)"
                    : "PDF (Reporte Carga Horaria)"}
                </span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExportCurrentTeacherExcel}
                disabled={isExporting || (teacherViewMode === "single" && !currentTeacherData)}
                className="rounded-xl text-xs font-bold gap-1.5 h-8 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
                title="Exportar a Excel según la pestaña activa"
              >
                {isExporting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                )}
                <span>
                  {teacherViewMode === "single"
                    ? `Excel (${currentTeacherData?.cleanName || "Instructor"})`
                    : teacherViewMode === "all"
                    ? "Excel (Todos los Instructores)"
                    : "Excel (Reporte Carga Horaria)"}
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
