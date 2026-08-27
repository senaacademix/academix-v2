"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  CalendarDays,
  Clock,
  Users,
  Plus,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Layers,
  Settings,
  Eye,
  Lock,
  Star,
  ShieldCheck,
  AlertCircle,
  Filter,
  Globe,
  FileEdit,
  CalendarClock,
  FolderKanban,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { AcademicScheduleItem, AvailableGroupOption } from "../types";
import { ScheduleBasicModal } from "./ScheduleBasicModal";
import { ScheduleGroupSlotsModal } from "./ScheduleGroupSlotsModal";
import { ScheduleWeekPreview } from "./ScheduleWeekPreview";
import {
  deleteScheduleAction,
  setActiveScheduleAction,
  togglePublishScheduleAction,
} from "../actions/scheduleManagerActions";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

interface ScheduleManagerViewProps {
  initialSchedules: AcademicScheduleItem[];
  availableGroups: AvailableGroupOption[];
}

export function ScheduleManagerView({
  initialSchedules,
  availableGroups,
}: ScheduleManagerViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const schedulesBaseUrl = pathname?.startsWith("/dashboard/gestor")
    ? "/dashboard/gestor/schedules"
    : "/dashboard/admin/schedules";

  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [schedules, setSchedules] = useState<AcademicScheduleItem[]>(initialSchedules);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedProgramId, setSelectedProgramId] = useState<string>("all");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Compute available training programs dynamically from availableGroups and schedules
  const availablePrograms = useMemo(() => {
    const map = new Map<string, string>();
    availableGroups.forEach((g) => {
      if (g.programId && g.programName) {
        map.set(g.programId, g.programName);
      }
    });
    schedules.forEach((s) => {
      s.groupSlots.forEach((slot) => {
        if (slot.group.program?.id && slot.group.program?.name) {
          map.set(slot.group.program.id, slot.group.program.name);
        }
      });
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [availableGroups, schedules]);

  // Compute available years dynamically from schedules, always including current year
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear().toString();
    const yearsSet = new Set<string>();
    yearsSet.add(currentYear);
    schedules.forEach((s) => {
      if (s.startDate) {
        yearsSet.add(new Date(s.startDate).getUTCFullYear().toString());
      }
      if (s.endDate) {
        yearsSet.add(new Date(s.endDate).getUTCFullYear().toString());
      }
    });
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [schedules]);

  // Basic Info Modal State (Create / Edit Schedule Metadata)
  const [isBasicModalOpen, setIsBasicModalOpen] = useState<boolean>(false);
  const [editingBasicSchedule, setEditingBasicSchedule] = useState<AcademicScheduleItem | null>(null);

  // Group Slots Modal State (Configure Groups & Day slots for a schedule)
  const [isGroupSlotsModalOpen, setIsGroupSlotsModalOpen] = useState<boolean>(false);
  const [activeSlotsSchedule, setActiveSlotsSchedule] = useState<AcademicScheduleItem | null>(null);

  // Delete Alert State
  const [scheduleToDelete, setScheduleToDelete] = useState<AcademicScheduleItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Toggle Publication State
  const [togglingPublishId, setTogglingPublishId] = useState<string | null>(null);

  // Expanded Preview State (Schedule ID expanded for week preview - collapsed by default)
  const [expandedScheduleId, setExpandedScheduleId] = useState<string | null>(null);

  const handleRefresh = () => {
    router.refresh();
  };

  // Toggle Public / Draft status (Only allowed on active schedule)
  const handleTogglePublish = async (schedule: AcademicScheduleItem) => {
    if (!schedule.isActive) {
      toast.warning("Solo el horario vigente puede alternar entre estado Público y Borrador.");
      return;
    }
    setTogglingPublishId(schedule.id);
    try {
      const res = await togglePublishScheduleAction(schedule.id);
      setSchedules((prev) =>
        prev.map((s) =>
          s.id === schedule.id ? { ...s, isPublished: res.isPublished } : s
        )
      );
      toast.success(
        `Horario "${schedule.name}" ahora está en estado: ${
          res.isPublished ? "PÚBLICO" : "BORRADOR"
        }`
      );
    } catch (err: any) {
      toast.error(err.message || "Error al cambiar estado de publicación");
    } finally {
      setTogglingPublishId(null);
    }
  };

  // Open Create Basic Schedule Modal
  const handleOpenCreateBasic = () => {
    setEditingBasicSchedule(null);
    setIsBasicModalOpen(true);
  };

  // Open Edit Basic Schedule Modal
  const handleOpenEditBasic = (schedule: AcademicScheduleItem) => {
    setEditingBasicSchedule(schedule);
    setIsBasicModalOpen(true);
  };

  // Open Groups & Slots Configuration Modal for a schedule
  const handleOpenConfigureSlots = (schedule: AcademicScheduleItem) => {
    setActiveSlotsSchedule(schedule);
    setIsGroupSlotsModalOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!scheduleToDelete) return;
    setIsDeleting(true);
    try {
      await deleteScheduleAction(scheduleToDelete.id);
      setSchedules((prev) => prev.filter((s) => s.id !== scheduleToDelete.id));
      if (expandedScheduleId === scheduleToDelete.id) {
        setExpandedScheduleId(null);
      }
      toast.success(`Horario "${scheduleToDelete.name}" eliminado`);
      setScheduleToDelete(null);
    } catch (err: any) {
      toast.error(err.message || "Error al eliminar el horario");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered and Chronologically Sorted schedules for the selected year and program
  const filteredSchedules = useMemo(() => {
    return schedules
      .filter((s) => {
        const matchesSearch =
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
          s.groupSlots.some(
            (slot) =>
              slot.group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              slot.group.program.name.toLowerCase().includes(searchQuery.toLowerCase())
          );

        const startYear = new Date(s.startDate).getUTCFullYear().toString();
        const endYear = new Date(s.endDate).getUTCFullYear().toString();
        const matchesYear = startYear === selectedYear || endYear === selectedYear;

        const matchesProgram =
          selectedProgramId === "all" ||
          s.groupSlots.some((slot) => slot.group.program.id === selectedProgramId);

        return matchesSearch && matchesYear && matchesProgram;
      })
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [schedules, searchQuery, selectedYear, selectedProgramId]);

  // Calculate stats
  const totalSchedules = schedules.length;
  const activeSchedule = schedules.find((s) => s.isActive) || null;
  const activeSchedulesCount = activeSchedule ? 1 : 0;
  const activeScheduleGroupsCount = activeSchedule
    ? new Set(activeSchedule.groupSlots.map((slot) => slot.groupId)).size
    : 0;
  const activeScheduleSlotsCount = activeSchedule
    ? activeSchedule.groupSlots.length
    : 0;

  const formatDate = (isoString: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  };

  return (
    <div className="flex flex-col gap-6 w-full min-w-0">
      {/* Header Banner */}
      <div className="relative rounded-3xl bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 p-6 sm:p-8 backdrop-blur-2xl shadow-md dark:shadow-xl overflow-hidden transition-colors">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/15 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Gestión de Horarios y Eventos</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Programación de{" "}
              <span className="bg-gradient-to-r from-slate-900 via-slate-700 to-primary dark:from-white dark:via-slate-200 dark:to-primary bg-clip-text text-transparent">
                Horarios y Eventos
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
              Gestiona tus períodos académicos, asignación de franjas horarias y cronograma de eventos institucionales para profesores y estudiantes.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              onClick={handleOpenCreateBasic}
              className="rounded-2xl gap-2 font-semibold shadow-md bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              Nuevo Horario
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Summary Widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-black text-foreground">{totalSchedules}</span>
            <span className="text-xs text-muted-foreground block font-medium">Horarios Registrados</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-sm font-black text-foreground truncate block max-w-[150px]" title={activeSchedule?.name || "Sin horario activo"}>
              {activeSchedule ? activeSchedule.name : "Sin activo"}
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 block font-medium">
              {activeSchedule ? "Horario Vigente Activo" : "Ninguno Activo"}
            </span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-black text-foreground">{activeScheduleGroupsCount}</span>
            <span className="text-xs text-muted-foreground block font-medium">Grupos en Horario Vigente</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-black text-foreground">{activeScheduleSlotsCount}</span>
            <span className="text-xs text-muted-foreground block font-medium">Franjas Activas</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar with Program and Year Selectors */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, grupo o programa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-2xl text-xs bg-card h-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto shrink-0">
          {/* Program Filter */}
          {isMounted && availablePrograms.length > 0 && (
            <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
              <SelectTrigger className="w-full sm:w-[220px] rounded-2xl text-xs bg-card border-border/80 h-9 font-semibold px-3 gap-2 shadow-xs">
                <FolderKanban className="w-3.5 h-3.5 text-primary shrink-0" />
                <SelectValue placeholder="Programa de Formación" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl text-xs max-h-64">
                <SelectItem value="all" className="cursor-pointer font-bold">
                  Todos los Programas ({availablePrograms.length})
                </SelectItem>
                {availablePrograms.map((prog) => (
                  <SelectItem key={prog.id} value={prog.id} className="cursor-pointer font-medium">
                    {prog.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Year Filter positioned on the right */}
          {isMounted && availableYears.length > 0 && (
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[130px] rounded-2xl text-xs bg-card border-border/80 h-9 font-semibold px-3 gap-2 shadow-xs">
                <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                <SelectValue placeholder="Año" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl text-xs">
                {availableYears.map((yr) => (
                  <SelectItem key={yr} value={yr} className="cursor-pointer font-medium">
                    Año {yr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Schedules List */}
      {filteredSchedules.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border/80 p-12 text-center bg-card/50 flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-3xl bg-muted/60 flex items-center justify-center text-muted-foreground">
            <CalendarDays className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-sm">
            <h3 className="font-bold text-base text-foreground">
              {searchQuery || selectedProgramId !== "all" ? "No se encontraron horarios" : "No hay horarios registrados"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {searchQuery || selectedProgramId !== "all"
                ? "Intenta con otros términos de búsqueda o elimina el filtro por programa."
                : "Crea tu primer horario académico indicando su nombre y fechas de vigencia."}
            </p>
          </div>
          {selectedProgramId !== "all" ? (
            <Button 
              variant="outline"
              onClick={() => {
                setSelectedProgramId("all");
                setSearchQuery("");
              }} 
              className="rounded-2xl gap-2 text-xs font-semibold"
            >
              Ver todos los programas
            </Button>
          ) : !searchQuery && (
            <Button onClick={handleOpenCreateBasic} className="rounded-2xl gap-2 text-xs font-semibold">
              <Plus className="w-4 h-4" />
              Crear Horario
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSchedules.map((schedule) => {
            const isExpanded = expandedScheduleId === schedule.id;

            // Unique groups in this schedule
            const scheduleGroupsMap = new Map<string, { id: string; name: string; programName: string; programId: string }>();
            const scheduleProgramsMap = new Map<string, string>();

            schedule.groupSlots.forEach((slot) => {
              const progId = slot.group.program?.id || "";
              const progName = slot.group.program?.name || "";
              if (progId && progName && !scheduleProgramsMap.has(progId)) {
                scheduleProgramsMap.set(progId, progName);
              }

              if (!scheduleGroupsMap.has(slot.groupId)) {
                scheduleGroupsMap.set(slot.groupId, {
                  id: slot.groupId,
                  name: slot.group.name,
                  programName: progName,
                  programId: progId,
                });
              }
            });

            const scheduleGroups = Array.from(scheduleGroupsMap.values());
            const schedulePrograms = Array.from(scheduleProgramsMap.entries()).map(([id, name]) => ({ id, name }));

            return (
              <Card
                key={schedule.id}
                className={`overflow-hidden rounded-3xl transition-all ${
                  schedule.isActive
                    ? isExpanded
                      ? "border-2 border-emerald-500/80 shadow-xl bg-card ring-4 ring-emerald-500/10"
                      : "border-2 border-emerald-500/70 shadow-lg hover:shadow-xl bg-card ring-2 ring-emerald-500/15"
                    : "border border-border/70 bg-muted/20 opacity-80 hover:opacity-100"
                }`}
              >
                {/* Card Top Section: Identity & Metadata */}
                <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-xs transition-colors ${
                        schedule.isActive
                          ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400"
                          : "bg-muted border-border text-muted-foreground"
                      }`}
                    >
                      <CalendarClock className="w-6 h-6" />
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-extrabold text-lg sm:text-xl text-foreground tracking-tight truncate">
                          {schedule.name}
                        </h3>

                        {schedule.isActive ? (
                          <Badge className="bg-emerald-600 text-white hover:bg-emerald-600 border-transparent text-[11px] gap-1 font-extrabold px-2.5 py-0.5 shadow-2xs tracking-wide">
                            <Star className="w-3 h-3 fill-white" /> VIGENTE
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground text-[11px] gap-1 bg-muted/40 font-medium">
                            <Calendar className="w-3 h-3" /> Fuera de Vigencia
                          </Badge>
                        )}

                        {schedule.isPublished ? (
                          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 text-[11px] gap-1 font-bold px-2 py-0.5">
                            <Globe className="w-3 h-3 text-blue-600 dark:text-blue-400" /> Público
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[11px] gap-1 font-bold px-2 py-0.5">
                            <FileEdit className="w-3 h-3 text-amber-600 dark:text-amber-400" /> Borrador
                          </Badge>
                        )}
                      </div>

                      {/* Metadata row */}
                      <div className="flex flex-wrap items-center gap-2.5 text-xs text-muted-foreground font-medium">
                        <span className="flex items-center gap-1 font-mono">
                          <Calendar className="w-3.5 h-3.5 text-primary" />
                          {formatDate(schedule.startDate)} — {formatDate(schedule.endDate)}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-primary" />
                          {scheduleGroups.length} {scheduleGroups.length === 1 ? "grupo asignado" : "grupos asignados"}
                        </span>
                      </div>

                      {/* Program pills */}
                      {schedulePrograms.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {schedulePrograms.map((prog) => (
                            <Badge 
                              key={prog.id} 
                              variant="secondary" 
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all ${
                                selectedProgramId === prog.id
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-primary/10 text-primary border-primary/20"
                              }`}
                            >
                              <FolderKanban className="w-2.5 h-2.5 mr-1" />
                              {prog.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Top Right Options Menu & Actions */}
                  <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenConfigureSlots(schedule)}
                      className="rounded-xl text-xs gap-1.5 font-bold border-border shadow-2xs h-8 px-3"
                    >
                      <Users className="w-3.5 h-3.5 text-primary" />
                      Configurar Grupos
                    </Button>

                    {isMounted ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="rounded-xl w-8 h-8 hover:bg-muted/80">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-2xl text-xs min-w-56 p-1.5 shadow-xl border-border/80">
                          {/* Section: Period Management */}
                          <div className="px-2.5 py-1 text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider">
                            Gestión del Período
                          </div>

                          <DropdownMenuItem
                            onClick={() => handleOpenEditBasic(schedule)}
                            className="gap-2.5 cursor-pointer rounded-xl font-medium py-2"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-primary" />
                            <span>Editar Nombre y Fechas</span>
                          </DropdownMenuItem>

                          {schedule.isActive && (
                            <DropdownMenuItem
                              onClick={() => handleTogglePublish(schedule)}
                              className="gap-2.5 cursor-pointer rounded-xl font-medium py-2"
                            >
                              {schedule.isPublished ? (
                                <>
                                  <FileEdit className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                  <span>Cambiar a Borrador</span>
                                </>
                              ) : (
                                <>
                                  <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                  <span>Publicar Horario</span>
                                </>
                              )}
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator className="my-1" />

                          {/* Section: Quick Links */}
                          <div className="px-2.5 py-1 text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider">
                            Vistas y Módulos
                          </div>

                          <DropdownMenuItem asChild>
                            <Link
                              href={`${schedulesBaseUrl}/${schedule.id}`}
                              className="gap-2.5 cursor-pointer flex items-center w-full rounded-xl font-medium py-2"
                            >
                              <CalendarDays className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                              <span>Horario de Grupos</span>
                            </Link>
                          </DropdownMenuItem>

                          <DropdownMenuItem asChild>
                            <Link
                              href={`${schedulesBaseUrl}/${schedule.id}/events`}
                              className="gap-2.5 cursor-pointer flex items-center w-full rounded-xl font-medium py-2"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                              <span>Calendario de Eventos</span>
                            </Link>
                          </DropdownMenuItem>

                          <DropdownMenuSeparator className="my-1" />

                          {/* Section: Delete */}
                          <DropdownMenuItem
                            onClick={() => setScheduleToDelete(schedule)}
                            className="gap-2.5 text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer rounded-xl font-medium py-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Eliminar Horario</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </div>
                </div>

                {/* Card Bottom Section: Dedicated Action Toolbar */}
                <div className="border-t border-border/60 bg-muted/20 px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  {/* Left: Chronogram preview toggle */}
                  <div>
                    {schedule.groupSlots.length > 0 ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedScheduleId(isExpanded ? null : schedule.id)}
                        className="rounded-xl text-xs gap-1.5 h-8 font-semibold text-muted-foreground hover:text-foreground"
                      >
                        <Eye className="w-3.5 h-3.5 text-primary" />
                        {isExpanded ? "Ocultar Cronograma" : "Vista Previa Cronograma"}
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 ml-0.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
                        )}
                      </Button>
                    ) : (
                      <span className="text-[11px] text-muted-foreground/70 italic">
                        Sin franjas horarias configuradas
                      </span>
                    )}
                  </div>

                  {/* Right: Key Management Action Buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`${schedulesBaseUrl}/${schedule.id}/events`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl text-xs gap-1.5 font-bold border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 bg-purple-500/5 shadow-2xs h-8 px-3"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        Gestionar Eventos
                      </Button>
                    </Link>

                    <Link href={`${schedulesBaseUrl}/${schedule.id}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl text-xs gap-1.5 font-bold border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 bg-blue-500/5 shadow-2xs h-8 px-3.5"
                      >
                        <CalendarDays className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        Gestionar Horario
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Collapsible Week Preview */}
                {isExpanded && schedule.groupSlots.length > 0 && (
                  <div className="border-t border-border/80 bg-muted/10 p-5 sm:p-6 animate-in fade-in-50 duration-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="space-y-0.5">
                        <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                          <CalendarDays className="w-4 h-4 text-primary" />
                          Distribución Semanal de Franjas Horarias (Lunes a Domingo)
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Visualiza los días y horarios asignados a cada grupo académico en este período.
                        </p>
                      </div>
                    </div>

                    <ScheduleWeekPreview schedule={schedule} />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Modals & Dialogs (mounted client-side only to eliminate SSR hydration mismatch) */}
      {isMounted && (
        <>
          {/* 1. Modal for Basic Schedule Creation & Edit */}
          <ScheduleBasicModal
            open={isBasicModalOpen}
            onOpenChange={setIsBasicModalOpen}
            editingSchedule={editingBasicSchedule}
            onSuccess={handleRefresh}
          />

          {/* 2. Modal for Assigning Groups and Time Slots */}
          <ScheduleGroupSlotsModal
            open={isGroupSlotsModalOpen}
            onOpenChange={setIsGroupSlotsModalOpen}
            schedule={activeSlotsSchedule}
            availableGroups={availableGroups}
            onSuccess={handleRefresh}
          />

          {/* 3. Confirm Delete Alert Dialog */}
          <AlertDialog
            open={!!scheduleToDelete}
            onOpenChange={(open) => !open && setScheduleToDelete(null)}
          >
            <AlertDialogContent className="rounded-3xl border-border bg-background shadow-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-lg font-bold text-foreground">
                  ¿Eliminar Horario Académico?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
                  Esta acción eliminará el horario{" "}
                  <strong className="text-foreground">"{scheduleToDelete?.name}"</strong> y todas las
                  franjas horarias configuradas para sus grupos. Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting} className="rounded-xl text-xs">
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="rounded-xl text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold"
                >
                  {isDeleting ? "Eliminando..." : "Sí, Eliminar"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}
