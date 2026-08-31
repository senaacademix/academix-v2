"use client";

import React, { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  AlertTriangle,
  Calendar,
  Clock,
  Plus,
  Trash2,
  BookOpen,
  Loader2,
  Search,
  CheckCircle2,
  FileText,
  UserX,
  RefreshCw,
  Info,
  Filter,
  Users,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  List,
  Eye,
  Wrench,
  Laptop,
  Building,
  FileSpreadsheet,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  parseISO,
} from "date-fns";
import { es } from "date-fns/locale";
import { ScheduleNoveltyType } from "@/generated/prisma/client";
import { formatCalendarDate, fromUTC } from "@/lib/dateUtils";
import {
  createScheduleNoveltyAction,
  deleteScheduleNoveltyAction,
} from "../../actions/scheduleNoveltyActions";
import { generateAndDownloadNoveltiesExcel } from "../../utils/scheduleNoveltiesExport";
import { generateAndDownloadNoveltiesPdf } from "../../utils/scheduleNoveltiesPdf";

interface ScheduleNoveltiesManagerViewProps {
  schedule: {
    id: string;
    name: string;
    startDate: Date | null;
    endDate: Date | null;
    isActive: boolean;
  };
  groups: Array<{ id: string; name: string }>;
  environments: Array<{ id: string; name: string }>;
  initialNovelties: any[];
  baseUrl?: string;
}

const NOVELTY_TYPES: Array<{
  type: ScheduleNoveltyType;
  label: string;
  badgeClass: string;
  pillClass: string;
  icon: React.ReactNode;
}> = [
  {
    type: "SCHEDULE_SUSPENSION",
    label: "Suspensión de Jornada / Festivo",
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    pillClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800",
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
  },
  {
    type: "ROOM_CHANGE",
    label: "Cambio de Aula / Ambiente",
    badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    pillClass: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800",
    icon: <BookOpen className="w-3.5 h-3.5" />,
  },
  {
    type: "CLASS_RESCHEDULE",
    label: "Reprogramación / Recuperación",
    badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800",
    pillClass: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800",
    icon: <RefreshCw className="w-3.5 h-3.5" />,
  },
  {
    type: "TECHNICAL_OUTAGE",
    label: "Falla Técnica / Mantenimiento",
    badgeClass: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800",
    pillClass: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-800",
    icon: <Wrench className="w-3.5 h-3.5" />,
  },
  {
    type: "INSTITUTIONAL_EVENT",
    label: "Evento Institucional / Gira",
    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
    pillClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800",
    icon: <Building className="w-3.5 h-3.5" />,
  },
  {
    type: "VIRTUAL_SESSION",
    label: "Clase Virtual / Asincrónica",
    badgeClass: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800",
    pillClass: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800",
    icon: <Laptop className="w-3.5 h-3.5" />,
  },
  {
    type: "OTHER",
    label: "Otra Novedad de Horario",
    badgeClass: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800",
    pillClass: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-800",
    icon: <Info className="w-3.5 h-3.5" />,
  },
];

export function ScheduleNoveltiesManagerView({
  schedule,
  groups,
  environments,
  initialNovelties,
  baseUrl = "/dashboard/gestor/schedules",
}: ScheduleNoveltiesManagerViewProps) {
  const router = useRouter();
  const [novelties, setNovelties] = useState<any[]>(initialNovelties);
  const [isPending, startTransition] = useTransition();

  // View Mode: Month vs Week vs List
  const [viewMode, setViewMode] = useState<"month" | "week" | "list">("month");

  // Filter state
  const [filterGroupId, setFilterGroupId] = useState<string>("ALL");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Schedule date bounds (formatted consistently via UTC components)
  const scheduleStartStr = schedule.startDate ? formatCalendarDate(schedule.startDate, "yyyy-MM-dd") : undefined;
  const scheduleEndStr = schedule.endDate ? formatCalendarDate(schedule.endDate, "yyyy-MM-dd") : undefined;

  // Navigation State
  const initialDate = useMemo(() => (schedule.startDate ? fromUTC(schedule.startDate) : new Date()), [schedule.startDate]);
  const [currentDate, setCurrentDate] = useState<Date>(initialDate);

  // Month bounds restrictions based strictly on schedule start and end dates
  const minMonth = useMemo(() => {
    return schedule.startDate ? startOfMonth(fromUTC(schedule.startDate)) : null;
  }, [schedule.startDate]);

  const maxMonth = useMemo(() => {
    return schedule.endDate ? startOfMonth(fromUTC(schedule.endDate)) : null;
  }, [schedule.endDate]);

  const canGoPrevMonth = useMemo(() => {
    if (!minMonth) return true;
    const prev = startOfMonth(subMonths(currentDate, 1));
    return prev.getTime() >= minMonth.getTime();
  }, [currentDate, minMonth]);

  const canGoNextMonth = useMemo(() => {
    if (!maxMonth) return true;
    const next = startOfMonth(addMonths(currentDate, 1));
    return next.getTime() <= maxMonth.getTime();
  }, [currentDate, maxMonth]);

  const handlePrevMonth = () => {
    if (canGoPrevMonth) {
      setCurrentDate((prev) => subMonths(prev, 1));
    }
  };

  const handleNextMonth = () => {
    if (canGoNextMonth) {
      setCurrentDate((prev) => addMonths(prev, 1));
    }
  };

  // Week Navigation Bounds
  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
  const weekEnd = useMemo(() => endOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
  const weekDays = useMemo(() => eachDayOfInterval({ start: weekStart, end: weekEnd }), [weekStart, weekEnd]);

  const canGoPrevWeek = useMemo(() => {
    if (!schedule.startDate) return true;
    const prevWeekEnd = endOfWeek(subWeeks(currentDate, 1), { weekStartsOn: 1 });
    return prevWeekEnd >= fromUTC(schedule.startDate);
  }, [currentDate, schedule.startDate]);

  const canGoNextWeek = useMemo(() => {
    if (!schedule.endDate) return true;
    const nextWeekStart = startOfWeek(addWeeks(currentDate, 1), { weekStartsOn: 1 });
    return nextWeekStart <= fromUTC(schedule.endDate);
  }, [currentDate, schedule.endDate]);

  const handlePrevWeek = () => {
    if (canGoPrevWeek) {
      setCurrentDate((prev) => subWeeks(prev, 1));
    }
  };

  const handleNextWeek = () => {
    if (canGoNextWeek) {
      setCurrentDate((prev) => addWeeks(prev, 1));
    }
  };

  const handleTodayClick = () => {
    const today = new Date();
    const todayMonth = startOfMonth(today);

    if (minMonth && todayMonth < minMonth) {
      setCurrentDate(minMonth);
    } else if (maxMonth && todayMonth > maxMonth) {
      setCurrentDate(maxMonth);
    } else {
      setCurrentDate(today);
    }
  };

  // Form Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Delete State
  const [noveltyToDelete, setNoveltyToDelete] = useState<string | null>(null);

  // Form Input State
  const [formScope, setFormScope] = useState<"SPECIFIC" | "GENERAL">("SPECIFIC");
  const [formGroupId, setFormGroupId] = useState<string>(groups[0]?.id || "");
  const [formType, setFormType] = useState<ScheduleNoveltyType>("SCHEDULE_SUSPENSION");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStartDate, setFormStartDate] = useState(scheduleStartStr || new Date().toISOString().split("T")[0]);
  const [formEndDate, setFormEndDate] = useState(scheduleStartStr || new Date().toISOString().split("T")[0]);
  const [formNewEnvId, setFormNewEnvId] = useState<string>("none");

  // Export state
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const resetForm = (presetDate?: string) => {
    setFormScope("SPECIFIC");
    setFormGroupId(groups[0]?.id || "");
    setFormType("SCHEDULE_SUSPENSION");
    setFormTitle("");
    setFormDescription("");
    let defaultDate = presetDate || scheduleStartStr || new Date().toISOString().split("T")[0];
    if (scheduleStartStr && defaultDate < scheduleStartStr) defaultDate = scheduleStartStr;
    if (scheduleEndStr && defaultDate > scheduleEndStr) defaultDate = scheduleEndStr;

    setFormStartDate(defaultDate);
    setFormEndDate(defaultDate);
    setFormNewEnvId("none");
  };

  const handleOpenCreateModal = (dateStr?: string) => {
    if (dateStr) {
      if (scheduleStartStr && dateStr < scheduleStartStr) {
        return toast.warning(`La fecha debe estar dentro del rango del horario (a partir de ${scheduleStartStr})`);
      }
      if (scheduleEndStr && dateStr > scheduleEndStr) {
        return toast.warning(`La fecha debe estar dentro del rango del horario (hasta ${scheduleEndStr})`);
      }
    }
    resetForm(dateStr);
    setIsCreateModalOpen(true);
  };

  const handleCreateNovelty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formScope === "SPECIFIC" && !formGroupId) return toast.error("Selecciona una ficha / grupo");
    if (!formTitle.trim()) return toast.error("Ingresa un título para la novedad");
    if (!formStartDate || !formEndDate) return toast.error("Selecciona las fechas");

    startTransition(async () => {
      const res = await createScheduleNoveltyAction({
        groupId: formScope === "GENERAL" ? null : formGroupId,
        isGeneral: formScope === "GENERAL",
        type: formType,
        title: formTitle,
        description: formDescription,
        startDate: formStartDate,
        endDate: formEndDate,
        newEnvironmentId: formNewEnvId !== "none" ? formNewEnvId : null,
      });

      if (res.success && res.data) {
        toast.success("Novedad registrada exitosamente");
        setNovelties((prev) => [res.data, ...prev]);
        setIsCreateModalOpen(false);
        resetForm();
        router.refresh();
      } else {
        toast.error(res.error || "Error al registrar la novedad");
      }
    });
  };

  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    try {
      const rangeFmt = `${schedule.startDate ? format(new Date(schedule.startDate), "dd/MM/yyyy") : ""} - ${schedule.endDate ? format(new Date(schedule.endDate), "dd/MM/yyyy") : ""}`;
      await generateAndDownloadNoveltiesExcel(schedule.name, rangeFmt, filteredNovelties);
      toast.success("Reporte Excel generado correctamente");
    } catch (err) {
      console.error(err);
      toast.error("Error al generar Excel de novedades");
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      const rangeFmt = `${schedule.startDate ? format(new Date(schedule.startDate), "dd/MM/yyyy") : ""} - ${schedule.endDate ? format(new Date(schedule.endDate), "dd/MM/yyyy") : ""}`;
      await generateAndDownloadNoveltiesPdf(schedule.name, rangeFmt, filteredNovelties);
      toast.success("Reporte PDF generado correctamente");
    } catch (err) {
      console.error(err);
      toast.error("Error al generar PDF de novedades");
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleDeleteNovelty = async () => {
    if (!noveltyToDelete) return;
    startTransition(async () => {
      const res = await deleteScheduleNoveltyAction(noveltyToDelete);
      if (res.success) {
        toast.success("Novedad eliminada correctamente");
        setNovelties((prev) => prev.filter((n) => n.id !== noveltyToDelete));
        setNoveltyToDelete(null);
        router.refresh();
      } else {
        toast.error(res.error || "Error al eliminar novedad");
      }
    });
  };

  // Filtered Novelties
  const filteredNovelties = useMemo(() => {
    return novelties.filter((n) => {
      const groupMatch = filterGroupId === "ALL" || n.groupId === filterGroupId;
      const typeMatch = filterType === "ALL" || n.type === filterType;
      const textMatch =
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.group?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (n.description || "").toLowerCase().includes(searchQuery.toLowerCase());
      return groupMatch && typeMatch && textMatch;
    });
  }, [novelties, filterGroupId, filterType, searchQuery]);

  // Calendar Days Computation
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentDate]);

  // Metrics
  const totalCount = novelties.length;
  const incapacityCount = novelties.filter((n) => n.type === "INCAPACITY").length;
  const roomChangeCount = novelties.filter((n) => n.type === "ROOM_CHANGE").length;
  const suspensionCount = novelties.filter(
    (n) => n.type === "SCHEDULE_SUSPENSION" || n.type === "CLASS_RESCHEDULE"
  ).length;

  return (
    <div className="container max-w-full px-4 sm:px-6 md:px-8 py-6 space-y-6">
      {/* ── TOP NAV HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border/80 p-4 rounded-2xl shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            asChild
            variant="outline"
            size="icon"
            className="rounded-xl h-9 w-9 border-border text-muted-foreground hover:text-foreground shrink-0"
          >
            <Link href={baseUrl}>
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>

          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 font-extrabold text-[11px] px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Novedades de Horario
              </Badge>
              {schedule.isActive && (
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold text-[11px] px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  Vigente
                </Badge>
              )}
            </div>
            <h1 className="text-xl font-black text-foreground tracking-tight truncate flex items-center gap-2">
              <span>{schedule.name}</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap justify-between md:justify-end">
          {schedule.startDate && (
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1 bg-muted/40 border border-border/60 px-3 py-1.5 rounded-xl">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              {formatCalendarDate(schedule.startDate, "dd MMM yyyy")} —{" "}
              {schedule.endDate ? formatCalendarDate(schedule.endDate, "dd MMM yyyy") : "En curso"}
            </span>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="h-9 px-3 rounded-xl border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 gap-1.5 font-bold text-xs shadow-2xs"
          >
            {isExportingPdf ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileText className="w-3.5 h-3.5 text-red-600" />
            )}
            <span>PDF</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={isExportingExcel}
            className="h-9 px-3 rounded-xl border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 gap-1.5 font-bold text-xs shadow-2xs"
          >
            {isExportingExcel ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            )}
            <span>Excel</span>
          </Button>

          <Button
            onClick={() => handleOpenCreateModal()}
            className="rounded-xl text-xs font-bold h-9 bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xs gap-1.5 px-4"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Novedad</span>
          </Button>
        </div>
      </div>

      {/* ── CONTROLS BAR: SEARCH, FILTERS & VIEW MODE ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-card p-3.5 rounded-2xl border border-border/80 shadow-2xs">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por ficha, título o descripción..."
            className="pl-9 h-9 text-xs rounded-xl"
          />
        </div>

        {/* Filters + View Mode Switcher */}
        <div className="flex items-center gap-2.5 flex-wrap justify-between md:justify-end">
          {/* Ficha Select */}
          <Select value={filterGroupId} onValueChange={setFilterGroupId}>
            <SelectTrigger className="h-9 text-xs rounded-xl w-44">
              <SelectValue placeholder="Todas las Fichas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs font-bold">
                🌐 Todas las Fichas
              </SelectItem>
              {groups.map((g) => (
                <SelectItem key={g.id} value={g.id} className="text-xs">
                  Ficha {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Tipo Select */}
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-9 text-xs rounded-xl w-44">
              <SelectValue placeholder="Todos los Tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs font-bold">
                📌 Todos los Tipos
              </SelectItem>
              {NOVELTY_TYPES.map((t) => (
                <SelectItem key={t.type} value={t.type} className="text-xs">
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/60">
            <Button
              variant={viewMode === "month" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("month")}
              className="h-7 px-2.5 rounded-lg text-xs gap-1.5 font-bold"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Mes</span>
            </Button>
            <Button
              variant={viewMode === "week" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("week")}
              className="h-7 px-2.5 rounded-lg text-xs gap-1.5 font-bold"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Semana</span>
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="h-7 px-2.5 rounded-lg text-xs gap-1.5 font-bold"
            >
              <List className="w-3.5 h-3.5" />
              <span>Lista ({filteredNovelties.length})</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT AREA ── */}
      {viewMode === "month" && (
        <Card className="rounded-2xl border border-border/80 bg-card shadow-2xs overflow-hidden">
          {/* Calendar Header Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b bg-card/60 gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrevMonth}
                disabled={!canGoPrevMonth}
                className="h-8 w-8 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed"
                title={!canGoPrevMonth ? "Límite de inicio de horario alcanzado" : "Mes anterior"}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              <h2 className="text-base font-black capitalize text-foreground min-w-[160px] text-center">
                {format(currentDate, "MMMM yyyy", { locale: es })}
              </h2>

              <Button
                variant="outline"
                size="icon"
                onClick={handleNextMonth}
                disabled={!canGoNextMonth}
                className="h-8 w-8 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed"
                title={!canGoNextMonth ? "Límite de fin de horario alcanzado" : "Mes siguiente"}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleTodayClick}
                className="h-8 px-2.5 rounded-xl text-xs font-bold text-primary"
              >
                Hoy
              </Button>
            </div>

            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="text-muted-foreground font-semibold">Leyenda:</span>
              {NOVELTY_TYPES.slice(0, 4).map((t) => (
                <Badge key={t.type} variant="outline" className={`text-[10px] font-bold ${t.badgeClass}`}>
                  {t.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="p-3 sm:p-4 overflow-x-auto">
            <div className="min-w-[750px]">
              {/* Day Headers (Mon -> Sun) */}
              <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-black text-muted-foreground uppercase tracking-wider">
                <div>Lun</div>
                <div>Mar</div>
                <div>Mié</div>
                <div>Jue</div>
                <div>Vie</div>
                <div>Sáb</div>
                <div>Dom</div>
              </div>

              {/* Days Cells */}
              <div className="grid grid-cols-7 gap-2 auto-rows-fr">
                {calendarDays.map((day, idx) => {
                  const dayStr = format(day, "yyyy-MM-dd");
                  const isCurrentMonthDay = isSameMonth(day, currentDate);
                  const isToday = isSameDay(day, new Date());

                  // Schedule range check
                  const isInScheduleRange =
                    (!scheduleStartStr || dayStr >= scheduleStartStr) &&
                    (!scheduleEndStr || dayStr <= scheduleEndStr);

                  // Filter novelties active on this date
                  const dayNovelties = filteredNovelties.filter((n) => {
                    const startStr = format(new Date(n.startDate), "yyyy-MM-dd");
                    const endStr = format(new Date(n.endDate), "yyyy-MM-dd");
                    return dayStr >= startStr && dayStr <= endStr;
                  });

                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        if (isInScheduleRange) {
                          handleOpenCreateModal(dayStr);
                        } else {
                          toast.warning("Esta fecha está fuera del rango de inicio y fin del horario.");
                        }
                      }}
                      className={`min-h-[110px] p-2 rounded-xl border transition-all flex flex-col justify-between cursor-pointer group ${
                        !isInScheduleRange
                          ? "bg-muted/10 border-dashed border-border/30 opacity-40 hover:opacity-70"
                          : isCurrentMonthDay
                          ? "bg-card border-border/80 hover:border-primary/50 hover:shadow-xs"
                          : "bg-muted/20 border-border/40 text-muted-foreground/40"
                      } ${isToday ? "ring-2 ring-primary/40 bg-primary/5" : ""}`}
                      title={!isInScheduleRange ? "Fecha fuera del rango del horario vigente" : undefined}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-xs font-bold rounded-md px-1.5 py-0.5 ${
                            isToday
                              ? "bg-primary text-primary-foreground font-black"
                              : isInScheduleRange && isCurrentMonthDay
                              ? "text-foreground"
                              : "text-muted-foreground/60"
                          }`}
                        >
                          {format(day, "d")}
                        </span>

                        {isInScheduleRange && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-primary hover:bg-primary/10 rounded-md"
                            title="Registrar Novedad en este día"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenCreateModal(dayStr);
                            }}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        )}
                      </div>

                      {/* Novelty Pills in Day Cell */}
                      <div className="flex-1 space-y-1 overflow-y-auto max-h-[80px]">
                        {dayNovelties.map((n) => {
                          const typeConfig =
                            NOVELTY_TYPES.find((t) => t.type === n.type) || NOVELTY_TYPES[5];

                          return (
                            <div
                              key={n.id}
                              onClick={(e) => e.stopPropagation()}
                              className={`p-1 px-1.5 rounded-lg border text-[10px] leading-tight font-bold truncate flex items-center justify-between gap-1 group/pill ${typeConfig.pillClass}`}
                              title={`Ficha ${n.group?.name}: ${n.title}`}
                            >
                              <span className="truncate">
                                F{n.group?.name}: {n.title}
                              </span>
                              <button
                                type="button"
                                onClick={() => setNoveltyToDelete(n.id)}
                                className="opacity-0 group-hover/pill:opacity-100 hover:text-red-600 shrink-0"
                                title="Eliminar Novedad"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
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
        </Card>
      )}

      {/* ── WEEK VIEW GRID ── */}
      {viewMode === "week" && (
        <Card className="rounded-2xl border border-border/80 bg-card shadow-2xs overflow-hidden">
          {/* Week Header Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b bg-card/60 gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrevWeek}
                disabled={!canGoPrevWeek}
                className="h-8 w-8 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed"
                title={!canGoPrevWeek ? "Límite de inicio de horario alcanzado" : "Semana anterior"}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              <h2 className="text-sm sm:text-base font-black capitalize text-foreground min-w-[200px] text-center">
                Semana del {format(weekStart, "d 'de' MMM", { locale: es })} al {format(weekEnd, "d 'de' MMM yyyy", { locale: es })}
              </h2>

              <Button
                variant="outline"
                size="icon"
                onClick={handleNextWeek}
                disabled={!canGoNextWeek}
                className="h-8 w-8 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed"
                title={!canGoNextWeek ? "Límite de fin de horario alcanzado" : "Semana siguiente"}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleTodayClick}
                className="h-8 px-2.5 rounded-xl text-xs font-bold text-primary"
              >
                Hoy
              </Button>
            </div>

            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="text-muted-foreground font-semibold">Leyenda:</span>
              {NOVELTY_TYPES.slice(0, 4).map((t) => (
                <Badge key={t.type} variant="outline" className={`text-[10px] font-bold ${t.badgeClass}`}>
                  {t.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* 7-Day Columns (Mon -> Sun) */}
          <div className="p-3 sm:p-4 overflow-x-auto">
            <div className="min-w-[900px]">
              <div className="grid grid-cols-7 gap-3">
                {weekDays.map((day, idx) => {
                  const dayStr = format(day, "yyyy-MM-dd");
                  const isToday = isSameDay(day, new Date());
                  const isInScheduleRange =
                    (!scheduleStartStr || dayStr >= scheduleStartStr) &&
                    (!scheduleEndStr || dayStr <= scheduleEndStr);

                  const dayNovelties = filteredNovelties.filter((n) => {
                    const startStr = format(new Date(n.startDate), "yyyy-MM-dd");
                    const endStr = format(new Date(n.endDate), "yyyy-MM-dd");
                    return dayStr >= startStr && dayStr <= endStr;
                  });

                  return (
                    <div
                      key={idx}
                      className={`flex flex-col rounded-2xl border transition-all min-h-[280px] p-2.5 space-y-2 ${
                        !isInScheduleRange
                          ? "bg-muted/10 border-dashed border-border/30 opacity-40"
                          : isToday
                          ? "bg-primary/5 border-primary/40 ring-2 ring-primary/20"
                          : "bg-card border-border/80"
                      }`}
                    >
                      {/* Day Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-border/60">
                        <div>
                          <span className="text-xs font-black uppercase tracking-wider text-muted-foreground block">
                            {format(day, "EEEE", { locale: es })}
                          </span>
                          <span className="text-sm font-black text-foreground">
                            {format(day, "d MMM", { locale: es })}
                          </span>
                        </div>

                        {isInScheduleRange && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-primary hover:bg-primary/10 rounded-md"
                            title="Registrar novedad en este día"
                            onClick={() => handleOpenCreateModal(dayStr)}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>

                      {/* Novelties list for this day */}
                      <div className="space-y-2 flex-1 overflow-y-auto max-h-[340px]">
                        {dayNovelties.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground/40 text-[11px] font-semibold py-8">
                            Sin novedades
                          </div>
                        ) : (
                          dayNovelties.map((n) => {
                            const typeConfig =
                              NOVELTY_TYPES.find((t) => t.type === n.type) || NOVELTY_TYPES[5];

                            return (
                              <div
                                key={n.id}
                                className={`p-2 rounded-xl border text-xs space-y-1.5 shadow-2xs ${typeConfig.pillClass}`}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <Badge
                                    variant="outline"
                                    className={`text-[9px] font-black px-1.5 py-0 rounded ${typeConfig.badgeClass}`}
                                  >
                                    {typeConfig.label}
                                  </Badge>

                                  <button
                                    type="button"
                                    onClick={() => setNoveltyToDelete(n.id)}
                                    className="text-red-500 hover:text-red-700 opacity-70 hover:opacity-100 transition-opacity"
                                    title="Eliminar"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>

                                <h5 className="font-extrabold text-foreground text-xs leading-snug">
                                  {n.title}
                                </h5>

                                <div className="text-[10px] font-bold text-muted-foreground flex items-center justify-between gap-1">
                                  <span>{n.isGeneral ? "🌐 Todas las Fichas" : `🎯 Ficha ${n.group?.name}`}</span>
                                  {n.newEnvironment && (
                                    <span className="text-blue-600 dark:text-blue-400">
                                      Aula: {n.newEnvironment.name}
                                    </span>
                                  )}
                                </div>

                                {n.description && (
                                  <p className="text-[10px] text-muted-foreground line-clamp-2 italic">
                                    {n.description}
                                  </p>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ── LIST VIEW GRID ── */}
      {viewMode === "list" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNovelties.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center h-64 text-center border border-dashed rounded-2xl p-6 bg-card">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-2 opacity-80" />
              <p className="text-base font-bold text-foreground">Sin Novedades Registradas</p>
              <p className="text-xs text-muted-foreground max-w-sm mt-1">
                No hay contingencias o cambios de horario para los filtros seleccionados.
              </p>
            </div>
          ) : (
            filteredNovelties.map((n) => {
              const typeConfig = NOVELTY_TYPES.find((t) => t.type === n.type) || NOVELTY_TYPES[5];
              const startFmt = format(new Date(n.startDate), "dd MMM yyyy", { locale: es });
              const endFmt = format(new Date(n.endDate), "dd MMM yyyy", { locale: es });

              return (
                <Card
                  key={n.id}
                  className="rounded-2xl border border-border/80 bg-card shadow-2xs hover:border-primary/40 transition-all flex flex-col justify-between overflow-hidden"
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1 border ${typeConfig.badgeClass}`}
                      >
                        {typeConfig.icon}
                        {typeConfig.label}
                      </Badge>
                      <Badge
                        className={
                          n.isGeneral
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-[10px] px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800 flex items-center gap-1"
                            : "bg-primary/10 text-primary font-bold text-[10px] px-2 py-0.5 rounded-md border-0"
                        }
                      >
                        {n.isGeneral ? "🌐 Todas las Fichas" : `Ficha ${n.group?.name || "Desconocida"}`}
                      </Badge>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-foreground">{n.title}</h4>
                      {n.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-3 leading-relaxed">
                          {n.description}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1 pt-2 border-t border-border/40 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>
                          {startFmt === endFmt ? startFmt : `${startFmt} - ${endFmt}`}
                        </span>
                      </div>

                      {n.newEnvironment && (
                        <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-semibold">
                          <BookOpen className="w-3.5 h-3.5 shrink-0" />
                          <span>Aula Destino: {n.newEnvironment.name}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>

                  <div className="p-3 bg-muted/20 border-t border-border/60 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setNoveltyToDelete(n.id)}
                      className="h-8 text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar</span>
                    </Button>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* ── CREATE NOVELTY DIALOG FORM ── */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2 text-foreground">
              <Plus className="w-5 h-5 text-primary" />
              Registrar Novedad de Horario
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Ingresa los detalles de la contingencia o cambio de horario para la ficha seleccionada.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateNovelty} className="space-y-4 py-2">
            {/* Scope Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Ámbito de la Novedad *</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={formScope === "SPECIFIC" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFormScope("SPECIFIC")}
                  className={`h-9 text-xs font-bold rounded-xl gap-1.5 ${
                    formScope === "SPECIFIC"
                      ? "bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Ficha Específica</span>
                </Button>
                <Button
                  type="button"
                  variant={formScope === "GENERAL" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFormScope("GENERAL")}
                  className={`h-9 text-xs font-bold rounded-xl gap-1.5 ${
                    formScope === "GENERAL"
                      ? "bg-amber-500 hover:bg-amber-600 text-white"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Todas las Fichas</span>
                </Button>
              </div>
            </div>

            {formScope === "SPECIFIC" ? (
              <div className="space-y-1.5">
                <Label htmlFor="formGroupId" className="text-xs font-bold">
                  Ficha / Grupo Afectado *
                </Label>
                <Select value={formGroupId} onValueChange={setFormGroupId}>
                  <SelectTrigger id="formGroupId" className="h-9 text-xs rounded-xl">
                    <SelectValue placeholder="Seleccionar Ficha" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={g.id} className="text-xs">
                        Ficha {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-center gap-2">
                <Globe className="w-4 h-4 shrink-0 text-amber-600" />
                <span>Esta novedad se aplicará de forma general a todas las fichas de este horario.</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="formType" className="text-xs font-bold">
                Tipo de Novedad *
              </Label>
              <Select value={formType} onValueChange={(val: any) => setFormType(val)}>
                <SelectTrigger id="formType" className="h-9 text-xs rounded-xl">
                  <SelectValue placeholder="Seleccionar Tipo" />
                </SelectTrigger>
                <SelectContent>
                  {NOVELTY_TYPES.map((t) => (
                    <SelectItem key={t.type} value={t.type} className="text-xs font-semibold">
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="formTitle" className="text-xs font-bold">
                Título o Motivo de la Novedad *
              </Label>
              <Input
                id="formTitle"
                placeholder="Ej: Suspensión por festivo / Mantenimiento de laboratorio / Cambio de ambiente"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="h-9 text-xs rounded-xl"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="formStartDate" className="text-xs font-bold">
                  Fecha Inicio *
                </Label>
                <Input
                  id="formStartDate"
                  type="date"
                  min={scheduleStartStr}
                  max={scheduleEndStr}
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="formEndDate" className="text-xs font-bold">
                  Fecha Fin *
                </Label>
                <Input
                  id="formEndDate"
                  type="date"
                  min={scheduleStartStr}
                  max={scheduleEndStr}
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                  required
                />
              </div>
            </div>

            {formType === "ROOM_CHANGE" && (
              <div className="space-y-1.5">
                <Label htmlFor="formNewEnvId" className="text-xs font-bold text-blue-600 dark:text-blue-400">
                  Nueva Aula / Ambiente Destino (Opcional)
                </Label>
                <Select value={formNewEnvId} onValueChange={setFormNewEnvId}>
                  <SelectTrigger id="formNewEnvId" className="h-9 text-xs rounded-xl border-blue-200">
                    <SelectValue placeholder="Seleccionar nueva aula" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs text-muted-foreground">
                      🚫 Ninguna específica
                    </SelectItem>
                    {environments.map((e) => (
                      <SelectItem key={e.id} value={e.id} className="text-xs">
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="formDescription" className="text-xs font-bold">
                Observaciones / Justificación
              </Label>
              <Textarea
                id="formDescription"
                placeholder="Detalles sobre contingencia o reprogramación..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="text-xs rounded-xl min-h-[80px]"
              />
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={isPending}
                className="rounded-xl text-xs font-bold h-9"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="rounded-xl text-xs font-bold h-9 bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Guardando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Registrar Novedad
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!noveltyToDelete} onOpenChange={() => setNoveltyToDelete(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-bold text-base">¿Eliminar Novedad?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Esta acción eliminará la novedad de horario de forma permanente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl text-xs font-bold">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteNovelty}
              disabled={isPending}
              className="rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white"
            >
              {isPending ? "Eliminando..." : "Sí, Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
