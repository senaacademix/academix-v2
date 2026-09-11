"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  GraduationCap,
  School,
  Globe,
  Sparkles,
  ArrowLeft,
  Plus,
  Search,
  Filter,
  CalendarDays,
  List,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Star,
  FileEdit,
  AlertTriangle,
  Info,
  ExternalLink,
  Link as LinkIcon,
  HelpCircle,
} from "lucide-react";
import { SchedulePanelHelpModal } from "../SchedulePanelHelpModal";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { EventAudience, ScheduleEventItem } from "../../types";
import { ScheduleEventModal } from "./ScheduleEventModal";
import { deleteScheduleEventAction } from "../../actions/scheduleEventsActions";
import { getTodayColombianDate } from "@/lib/dateUtils";

interface ScheduleEventsManagerViewProps {
  schedule: {
    id: string;
    name: string;
    description: string | null;
    startDate: string; // ISO
    endDate: string;   // ISO
    isActive: boolean;
    isPublished: boolean;
  };
  groups?: Array<{ id: string; name: string }>;
  initialEvents: ScheduleEventItem[];
}

const AUDIENCE_CONFIG: Record<
  EventAudience,
  { label: string; icon: any; badgeClass: string; cardClass: string; dotClass: string }
> = {
  PUBLIC: {
    label: "Público General",
    icon: Globe,
    badgeClass: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
    cardClass: "border-blue-300 dark:border-blue-800 bg-blue-500/5 hover:bg-blue-500/10",
    dotClass: "bg-blue-500",
  },
  TEACHERS: {
    label: "Solo Profesores",
    icon: School,
    badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    cardClass: "border-emerald-300 dark:border-emerald-800 bg-emerald-500/5 hover:bg-emerald-500/10",
    dotClass: "bg-emerald-500",
  },
  STUDENTS: {
    label: "Solo Estudiantes",
    icon: GraduationCap,
    badgeClass: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
    cardClass: "border-purple-300 dark:border-purple-800 bg-purple-500/5 hover:bg-purple-500/10",
    dotClass: "bg-purple-500",
  },
  GROUP: {
    label: "Ficha Específica",
    icon: Users,
    badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    cardClass: "border-amber-300 dark:border-amber-800 bg-amber-500/5 hover:bg-amber-500/10",
    dotClass: "bg-amber-500",
  },
};

const COLOR_MAP: Record<string, string> = {
  blue: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 hover:bg-blue-500/25",
  emerald: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25",
  purple: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30 hover:bg-purple-500/25",
  amber: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/25",
  rose: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 hover:bg-rose-500/25",
  indigo: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/25",
};

export function ScheduleEventsManagerView({
  schedule,
  groups = [],
  initialEvents,
}: ScheduleEventsManagerViewProps) {
  const pathname = usePathname();
  const schedulesBaseUrl = pathname?.startsWith("/dashboard/gestor")
    ? "/dashboard/gestor/schedules"
    : "/dashboard/admin/schedules";

  const [events, setEvents] = useState<ScheduleEventItem[]>(initialEvents);
  const [searchQuery, setSearchQuery] = useState("");
  const [audienceFilter, setAudienceFilter] = useState<string>("ALL");
  const [filterGroupId, setFilterGroupId] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");

  // Date constraints
  const scheduleStartStr = schedule.startDate.split("T")[0];
  const scheduleEndStr = schedule.endDate.split("T")[0];
  const scheduleStartDate = useMemo(() => parseISO(scheduleStartStr), [scheduleStartStr]);
  const scheduleEndDate = useMemo(() => parseISO(scheduleEndStr), [scheduleEndStr]);

  // Calendar current view month
  const [currentMonth, setCurrentMonth] = useState<Date>(scheduleStartDate);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<ScheduleEventItem | null>(null);
  const [selectedDayForNewEvent, setSelectedDayForNewEvent] = useState<string | null>(null);

  // Delete State
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const matchesSearch =
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.group?.name && e.group.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (e.location && e.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (e.description && e.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (e.linkUrl && e.linkUrl.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesAudience = audienceFilter === "ALL" || e.targetAudience === audienceFilter;

      const matchesGroup =
        filterGroupId === "ALL" ||
        (filterGroupId === "GENERAL" && e.isGeneral) ||
        e.groupId === filterGroupId;

      return matchesSearch && matchesAudience && matchesGroup;
    });
  }, [events, searchQuery, audienceFilter, filterGroupId]);

  // Statistics
  const publicCount = useMemo(() => events.filter((e) => e.targetAudience === "PUBLIC").length, [events]);
  const teacherCount = useMemo(() => events.filter((e) => e.targetAudience === "TEACHERS").length, [events]);
  const studentCount = useMemo(() => events.filter((e) => e.targetAudience === "STUDENTS").length, [events]);
  const groupCount = useMemo(() => events.filter((e) => e.targetAudience === "GROUP" || e.groupId).length, [events]);

  // Calendar Days computation
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  const handleOpenCreate = (dayDateStr?: string) => {
    setEventToEdit(null);
    setSelectedDayForNewEvent(dayDateStr || null);
    setModalOpen(true);
  };

  const handleOpenEdit = (event: ScheduleEventItem) => {
    setEventToEdit(event);
    setSelectedDayForNewEvent(event.date);
    setModalOpen(true);
  };

  const handleEventSaved = (savedEvent: ScheduleEventItem, isEdit: boolean) => {
    if (isEdit) {
      setEvents((prev) => prev.map((e) => (e.id === savedEvent.id ? savedEvent : e)));
    } else {
      setEvents((prev) => [...prev, savedEvent].sort((a, b) => a.date.localeCompare(b.date)));
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteEventId) return;
    setIsDeleting(true);
    try {
      const res = await deleteScheduleEventAction(deleteEventId, schedule.id);
      if (!res.success) {
        toast.error(res.error || "Error al eliminar el evento");
        return;
      }
      setEvents((prev) => prev.filter((e) => e.id !== deleteEventId));
      toast.success("Evento eliminado correctamente.");
      setDeleteEventId(null);
    } catch (err: any) {
      toast.error(err.message || "Error al eliminar el evento");
    } finally {
      setIsDeleting(false);
    }
  };

  const isDayInScheduleRange = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return dateStr >= scheduleStartStr && dateStr <= scheduleEndStr;
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 animate-in fade-in duration-300">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/70">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Link
              href={schedulesBaseUrl}
              className="hover:text-primary transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Volver a Horarios y Eventos
            </Link>
            <span>/</span>
            <span>Gestión de Eventos</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                  Eventos: {schedule.name}
                </h1>
                {schedule.isActive ? (
                  <Badge className="bg-emerald-600 text-white font-extrabold text-xs gap-1 shadow-xs">
                    <Star className="w-3 h-3 fill-white" /> VIGENTE
                  </Badge>
                ) : scheduleStartStr > getTodayColombianDate() ? (
                  <Badge variant="outline" className="bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30 text-xs font-bold gap-1">
                    <Clock className="w-3 h-3 text-sky-600 dark:text-sky-400" /> Vigencia Futura
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-400/30 text-xs font-bold gap-1">
                    <CalendarIcon className="w-3 h-3 text-slate-500" /> Vigencia Pasada
                  </Badge>
                )}
                {schedule.isPublished ? (
                  <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 text-xs gap-1 font-bold">
                    <Globe className="w-3 h-3" /> Público
                  </Badge>
                ) : (
                  <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs gap-1 font-bold">
                    <FileEdit className="w-3 h-3" /> Borrador
                  </Badge>
                )}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 font-medium flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                Periodo válido de programación:{" "}
                <span className="font-mono font-bold text-foreground">{scheduleStartStr}</span> al{" "}
                <span className="font-mono font-bold text-foreground">{scheduleEndStr}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Primary Actions */}
        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsHelpOpen(true)}
                className="w-11 h-11 rounded-2xl border-border/80 hover:bg-muted text-foreground shadow-2xs hover:scale-105 transition-all"
              >
                <HelpCircle className="w-5 h-5 text-primary" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">¿Qué puedo hacer acá? Guía de Eventos</TooltipContent>
          </Tooltip>

          <Button
            onClick={() => handleOpenCreate()}
            className="rounded-2xl font-bold bg-primary text-primary-foreground shadow-md hover:bg-primary/90 gap-2 h-11 px-5"
          >
            <Plus className="w-4 h-4" />
            Programar Evento
          </Button>
        </div>
      </div>

      {/* Metric / Audience Stats Bar (Compact & Low Height) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <Card className="rounded-2xl border border-border/70 shadow-2xs bg-card/80 px-3.5 py-2 flex items-center justify-between hover:border-primary/40 transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div className="leading-tight">
              <span className="text-[11px] font-medium text-muted-foreground block">Total Eventos</span>
              <span className="text-lg font-black text-foreground">{events.length}</span>
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border border-border/70 shadow-2xs bg-card/80 px-3.5 py-2 flex items-center justify-between hover:border-blue-500/40 transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Globe className="w-4 h-4" />
            </div>
            <div className="leading-tight">
              <span className="text-[11px] font-medium text-muted-foreground block">Públicos</span>
              <span className="text-lg font-black text-blue-600 dark:text-blue-400">{publicCount}</span>
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border border-border/70 shadow-2xs bg-card/80 px-3.5 py-2 flex items-center justify-between hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <School className="w-4 h-4" />
            </div>
            <div className="leading-tight">
              <span className="text-[11px] font-medium text-muted-foreground block">Profesores</span>
              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{teacherCount}</span>
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border border-border/70 shadow-2xs bg-card/80 px-3.5 py-2 flex items-center justify-between hover:border-purple-500/40 transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div className="leading-tight">
              <span className="text-[11px] font-medium text-muted-foreground block">Estudiantes</span>
              <span className="text-lg font-black text-purple-600 dark:text-purple-400">{studentCount}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Controls Bar: Search, Filters & View Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border/70 shadow-xs">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por título, lugar, enlace o descripción..."
            className="pl-9 rounded-xl text-xs h-9"
          />
        </div>

        {/* Filters & View Switcher */}
        <div className="flex items-center gap-2 flex-wrap justify-between md:justify-end">
          {/* Ficha Select Filter */}
          <Select value={filterGroupId} onValueChange={setFilterGroupId}>
            <SelectTrigger className="h-9 text-xs rounded-xl w-44 bg-background">
              <SelectValue placeholder="Todas las Fichas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs font-bold">
                🌐 Todas las Fichas
              </SelectItem>
              <SelectItem value="GENERAL" className="text-xs font-medium">
                📌 Eventos Generales
              </SelectItem>
              {groups.map((g) => (
                <SelectItem key={g.id} value={g.id} className="text-xs font-medium">
                  Ficha {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Audience Filter Pills */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/50 text-xs">
            <button
              type="button"
              onClick={() => setAudienceFilter("ALL")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                audienceFilter === "ALL"
                  ? "bg-background text-primary shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Todos ({events.length})
            </button>
            <button
              type="button"
              onClick={() => setAudienceFilter("PUBLIC")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                audienceFilter === "PUBLIC"
                  ? "bg-background text-blue-600 shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              🌐 Público
            </button>
            <button
              type="button"
              onClick={() => setAudienceFilter("TEACHERS")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                audienceFilter === "TEACHERS"
                  ? "bg-background text-emerald-600 shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              👨‍🏫 Profesores
            </button>
            <button
              type="button"
              onClick={() => setAudienceFilter("STUDENTS")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                audienceFilter === "STUDENTS"
                  ? "bg-background text-purple-600 shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              🎓 Estudiantes
            </button>
            <button
              type="button"
              onClick={() => setAudienceFilter("GROUP")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                audienceFilter === "GROUP"
                  ? "bg-background text-amber-600 shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              🎯 Fichas ({groupCount})
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/50">
            <Button
              variant={viewMode === "calendar" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("calendar")}
              className="h-7 px-2.5 rounded-lg text-xs gap-1.5 font-bold"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Mes</span>
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="h-7 px-2.5 rounded-lg text-xs gap-1.5 font-bold"
            >
              <List className="w-3.5 h-3.5" />
              <span>Lista ({filteredEvents.length})</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main View: Calendar vs List */}
      {viewMode === "calendar" ? (
        <div className="space-y-3">
          {/* Month Navigation Bar */}
          <div className="flex items-center justify-between bg-card p-3 rounded-2xl border border-border/70 shadow-xs">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="h-8 w-8 rounded-xl"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h2 className="text-base sm:text-lg font-black capitalize text-foreground min-w-[160px] text-center">
                {format(currentMonth, "MMMM yyyy", { locale: es })}
              </h2>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="h-8 w-8 rounded-xl"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentMonth(scheduleStartDate)}
                className="text-xs font-bold rounded-xl h-8 text-primary hover:bg-primary/10"
              >
                Ir a Inicio del Horario
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(new Date())}
                className="text-xs font-bold rounded-xl h-8"
              >
                Mes Actual
              </Button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="bg-card rounded-3xl border border-border/70 shadow-sm overflow-hidden">
            {/* Weekday Headers (Lun - Dom) */}
            <div className="grid grid-cols-7 border-b border-border/60 bg-muted/40 text-center text-xs font-black uppercase text-muted-foreground py-2.5">
              <span>Lun</span>
              <span>Mar</span>
              <span>Mié</span>
              <span>Jue</span>
              <span>Vie</span>
              <span>Sáb</span>
              <span>Dom</span>
            </div>

            {/* Days Cells */}
            <div className="grid grid-cols-7 divide-x divide-y divide-border/60">
              {calendarDays.map((day) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const inRange = isDayInScheduleRange(day);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isToday = isSameDay(day, new Date());

                // Events on this day (filtered)
                const dayEvents = filteredEvents.filter((e) => e.date === dateStr);

                return (
                  <div
                    key={dateStr}
                    onClick={() => {
                      if (inRange) {
                        handleOpenCreate(dateStr);
                      } else {
                        toast.info(
                          `El día ${dateStr} está fuera del periodo de vigencia de este horario (${scheduleStartStr} a ${scheduleEndStr}).`
                        );
                      }
                    }}
                    className={`min-h-[110px] p-2 flex flex-col justify-between transition-all group ${
                      inRange
                        ? isCurrentMonth
                          ? "bg-card hover:bg-muted/40 cursor-pointer"
                          : "bg-muted/15 hover:bg-muted/40 cursor-pointer opacity-70"
                        : "bg-muted/40 opacity-35 cursor-not-allowed"
                    }`}
                  >
                    {/* Day Number Header */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                          isToday
                            ? "bg-primary text-primary-foreground font-black shadow-xs"
                            : inRange
                            ? "text-foreground group-hover:text-primary"
                            : "text-muted-foreground/60"
                        }`}
                      >
                        {format(day, "d")}
                      </span>

                      {inRange && (
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-primary font-bold">
                          + Evento
                        </span>
                      )}
                    </div>

                    {/* Events List in Day Cell */}
                    <div className="space-y-1 my-1 flex-1">
                      {dayEvents.map((evt) => {
                        const aud = AUDIENCE_CONFIG[evt.targetAudience] || AUDIENCE_CONFIG.PUBLIC;
                        const colorClass = COLOR_MAP[evt.color || "blue"] || COLOR_MAP.blue;
                        const AudIcon = aud.icon;

                        return (
                          <div
                            key={evt.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEdit(evt);
                            }}
                            className={`p-1.5 rounded-xl border text-[11px] font-semibold transition-all hover:scale-[1.02] shadow-2xs cursor-pointer ${colorClass}`}
                            title={`${evt.title} (${evt.startTime} - ${evt.endTime}) • ${aud.label}${evt.linkUrl ? " • Tiene enlace virtual" : ""}`}
                          >
                            <div className="flex items-center justify-between gap-1 truncate leading-tight">
                              <div className="flex items-center gap-1 truncate">
                                <AudIcon className="w-3 h-3 shrink-0" />
                                <span className="truncate">{evt.title}</span>
                              </div>
                              {evt.linkUrl && (
                                <LinkIcon className="w-2.5 h-2.5 shrink-0 opacity-70" />
                              )}
                            </div>
                            <div className="text-[10px] opacity-80 flex items-center gap-1 font-mono font-normal mt-0.5">
                              <Clock className="w-2.5 h-2.5 shrink-0" />
                              <span>{evt.startTime} - {evt.endTime}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Bottom Status Tag */}
                    <div className="text-right">
                      {!inRange && (
                        <span className="text-[9px] text-muted-foreground/50 italic select-none">
                          Fuera de rango
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* List / Chronogram View */
        <div className="space-y-3">
          {filteredEvents.length === 0 ? (
            <Card className="rounded-3xl border border-dashed border-border/80 p-8 text-center bg-card">
              <div className="w-12 h-12 rounded-2xl bg-muted/60 mx-auto flex items-center justify-center text-muted-foreground mb-3">
                <CalendarIcon className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-foreground">No hay eventos registrados</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                {searchQuery || audienceFilter !== "ALL"
                  ? "No se encontraron eventos con los filtros seleccionados."
                  : "Aún no se han programado eventos para este horario. Haz clic en el botón para crear el primero."}
              </p>
              <Button
                onClick={() => handleOpenCreate()}
                className="mt-4 rounded-xl font-bold bg-primary text-primary-foreground text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Programar Primer Evento
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredEvents.map((evt) => {
                const aud = AUDIENCE_CONFIG[evt.targetAudience] || AUDIENCE_CONFIG.PUBLIC;
                const AudIcon = aud.icon;

                return (
                  <Card
                    key={evt.id}
                    className={`rounded-3xl border transition-all hover:shadow-md bg-card overflow-hidden flex flex-col justify-between ${aud.cardClass}`}
                  >
                    <div className="p-4 space-y-2.5">
                      {/* Top Header: Audience badge & Date */}
                      <div className="flex items-center justify-between gap-2">
                        <Badge className={`text-[10px] font-bold gap-1 px-2.5 py-0.5 rounded-lg border ${aud.badgeClass}`}>
                          <AudIcon className="w-3 h-3" /> {evt.targetAudience === "GROUP" ? `🎯 Ficha ${evt.group?.name || "Específica"}` : aud.label}
                        </Badge>
                        <span className="text-xs font-mono font-bold text-foreground">
                          {evt.date}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="font-bold text-base text-foreground leading-tight">
                        {evt.title}
                      </h3>

                      {/* Time & Location */}
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5 font-mono font-medium">
                          <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span>{evt.startTime} - {evt.endTime}</span>
                        </div>
                        {evt.location && (
                          <div className="flex items-center gap-1.5 truncate">
                            <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span className="truncate">{evt.location}</span>
                          </div>
                        )}
                      </div>

                      {/* Link Virtual Button */}
                      {evt.linkUrl && (
                        <div className="pt-0.5">
                          <a
                            href={evt.linkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline bg-primary/10 px-3 py-1 rounded-xl border border-primary/20 transition-all hover:bg-primary/20"
                          >
                            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate max-w-[200px]">Abrir Enlace / Reunión</span>
                          </a>
                        </div>
                      )}

                      {/* Description */}
                      {evt.description && (
                        <p className="text-xs text-muted-foreground/90 line-clamp-3 bg-background/50 p-2 rounded-xl border border-border/40">
                          {evt.description}
                        </p>
                      )}
                    </div>

                    {/* Card Footer Actions */}
                    <div className="p-3 bg-muted/30 border-t border-border/50 flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(evt)}
                        className="h-8 px-2.5 rounded-xl text-xs gap-1.5 font-bold hover:bg-primary/10 hover:text-primary"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteEventId(evt.id)}
                        className="h-8 px-2.5 rounded-xl text-xs gap-1.5 font-bold hover:bg-rose-500/10 text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Eliminar
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal for Create/Edit Event */}
      <ScheduleEventModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        schedule={schedule}
        groupsList={groups}
        eventToEdit={eventToEdit}
        defaultDate={selectedDayForNewEvent}
        onSuccess={handleEventSaved}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={Boolean(deleteEventId)} onOpenChange={(open) => !open && setDeleteEventId(null)}>
        <AlertDialogContent className="rounded-3xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-5 h-5" /> ¿Eliminar este evento?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Esta acción eliminará permanentemente el evento del calendario del horario. Los estudiantes y profesores ya no verán esta actividad programada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={isDeleting} className="rounded-xl">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              {isDeleting ? "Eliminando..." : "Sí, Eliminar Evento"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SchedulePanelHelpModal
        panel="events"
        open={isHelpOpen}
        onOpenChange={setIsHelpOpen}
        scheduleName={schedule.name}
      />
    </div>
  );
}
