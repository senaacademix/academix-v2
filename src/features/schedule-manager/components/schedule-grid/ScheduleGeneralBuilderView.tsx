"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  ArrowLeft,
  Calendar,
  Clock,
  Globe,
  FileEdit,
  Star,
  Users,
  RefreshCw,
  FileText,
  FileSpreadsheet,
  ShieldAlert,
  Building,
  GraduationCap,
  Sparkles,
  Maximize2,
  Minimize2,
  HelpCircle,
} from "lucide-react";
import { SchedulePanelHelpModal } from "../SchedulePanelHelpModal";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { DayOfWeek } from "@/generated/prisma/client";
import {
  ScheduleBuilderData,
  getScheduleBuilderDataAction,
  deleteGroupClassScheduleAction,
} from "../../actions/scheduleBuilderActions";
import { togglePublishScheduleAction } from "../../actions/scheduleManagerActions";
import { GroupSelectorSidebar } from "./GroupSelectorSidebar";
import { GroupTrimesterCurriculumPanel } from "./GroupTrimesterCurriculumPanel";
import { InteractiveWeeklyCalendarGrid } from "./InteractiveWeeklyCalendarGrid";
import { ScheduleClassModal } from "./ScheduleClassModal";
import { SchedulePanoramicView } from "./SchedulePanoramicView";
import { ScheduleExportModal } from "./ScheduleExportModal";
import { ScheduleAuditModal } from "./ScheduleAuditModal";
import { EnvironmentOccupancyModal } from "./EnvironmentOccupancyModal";
import { TeacherOccupancyModal } from "./TeacherOccupancyModal";

interface ScheduleGeneralBuilderViewProps {
  initialData: ScheduleBuilderData;
}

export function ScheduleGeneralBuilderView({
  initialData,
}: ScheduleGeneralBuilderViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const schedulesBaseUrl = pathname?.startsWith("/dashboard/gestor")
    ? "/dashboard/gestor/schedules"
    : "/dashboard/admin/schedules";

  const [data, setData] = useState<ScheduleBuilderData>(initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTogglingPublish, setIsTogglingPublish] = useState(false);

  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    initialData.groups.length > 0 ? initialData.groups[0].id : ""
  );

  // Modals & View Mode State
  const [builderViewMode, setBuilderViewMode] = useState<"detail" | "panoramic">("detail");
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportDefaultFormat, setExportDefaultFormat] = useState<"pdf" | "excel">("pdf");
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isEnvModalOpen, setIsEnvModalOpen] = useState(false);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);

  // Synchronize state when initialData changes from Server Component
  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  // Modal State for scheduling
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [modalEditingCourseScheduleId, setModalEditingCourseScheduleId] = useState<string | undefined>();
  const [modalInitialCourseTitle, setModalInitialCourseTitle] = useState<string | undefined>();
  const [modalInitialTeacherId, setModalInitialTeacherId] = useState<string | undefined>();
  const [modalInitialDay, setModalInitialDay] = useState<DayOfWeek | undefined>();
  const [modalInitialStartTime, setModalInitialStartTime] = useState<string | undefined>();
  const [modalInitialEndTime, setModalInitialEndTime] = useState<string | undefined>();

  // Delete Slot State
  const [slotToDelete, setSlotToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fullscreen State (Full Viewport Z-40 Overlay)
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  const selectedGroup =
    data.groups.find((g) => g.id === selectedGroupId) || data.groups[0] || null;

  // Quick live count of pending/warning items including schedule overlaps
  const quickConflictCount = useMemo(() => {
    let count = 0;
    data.groups.forEach((g) => {
      if (!g.environment) count++;
      if (g.scheduledClasses.length === 0) count++;

      const daySlots: Array<{ day: DayOfWeek; start: string; end: string }> = [];
      g.scheduledClasses.forEach((c) => {
        c.schedules.forEach((s) => {
          if (!s.teacher && !c.teacher) count++;
          daySlots.push({ day: s.dayOfWeek, start: s.startTime, end: s.endTime });
        });
      });

      // Count overlaps within the group
      for (let i = 0; i < daySlots.length; i++) {
        for (let j = i + 1; j < daySlots.length; j++) {
          if (
            daySlots[i].day === daySlots[j].day &&
            daySlots[i].start < daySlots[j].end &&
            daySlots[i].end > daySlots[j].start
          ) {
            count++;
          }
        }
      }
    });
    return count;
  }, [data.groups]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const freshData = await getScheduleBuilderDataAction(data.schedule.id);
      if (freshData) {
        setData(freshData);
      }
      router.refresh();
    } catch (err) {
      console.error("Error al refrescar horario:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleTogglePublish = async () => {
    setIsTogglingPublish(true);
    try {
      const res = await togglePublishScheduleAction(data.schedule.id);
      setData((prev) => ({
        ...prev,
        schedule: {
          ...prev.schedule,
          isPublished: res.isPublished,
        },
      }));
      toast.success(
        res.isPublished
          ? "Horario marcado como PÚBLICO (Visible para todos)"
          : "Horario marcado como BORRADOR (Solo administradores)"
      );
      await handleRefresh();
    } catch (err: any) {
      toast.error(err.message || "Error al cambiar estado de publicación");
    } finally {
      setIsTogglingPublish(false);
    }
  };

  const handleOpenScheduleModal = (
    courseTitle?: string,
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
  ) => {
    if (editingSlot) {
      setModalEditingCourseScheduleId(editingSlot.courseScheduleId);
      setModalInitialCourseTitle(editingSlot.courseTitle);
      setModalInitialTeacherId(editingSlot.teacherId);
      setModalInitialDay(editingSlot.dayOfWeek);
      setModalInitialStartTime(editingSlot.startTime);
      setModalInitialEndTime(editingSlot.endTime);
    } else {
      setModalEditingCourseScheduleId(undefined);
      setModalInitialCourseTitle(courseTitle);
      setModalInitialTeacherId(undefined);
      setModalInitialDay(day);
      setModalInitialStartTime(startTime);
      setModalInitialEndTime(endTime);
    }
    setIsScheduleModalOpen(true);
  };

  const handleConfirmDeleteSlot = async () => {
    if (!slotToDelete) return;
    setIsDeleting(true);
    try {
      await deleteGroupClassScheduleAction(data.schedule.id, slotToDelete);
      toast.success("Clase eliminada del horario");
      setSlotToDelete(null);
      await handleRefresh();
    } catch (err: any) {
      toast.error(err.message || "Error al eliminar la clase");
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (isoString: string) => {
    if (!isoString) return "";
    const d = new Date(isoString);
    return d.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  };

  return (
    <div
      className={`flex flex-col gap-2 animate-in fade-in-50 duration-300 overflow-hidden min-h-0 ${
        isFullscreen
          ? "fixed inset-0 z-40 bg-background p-3.5 h-screen w-screen space-y-2"
          : "h-[calc(100vh-5.5rem)] sm:h-[calc(100vh-6rem)] md:h-[calc(100vh-6.5rem)]"
      }`}
    >
      {/* Sleek Compact Header Bar */}
      <div className="shrink-0 rounded-2xl px-4 py-2 bg-card border border-border/80 shadow-2xs flex flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link href={schedulesBaseUrl}>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg hover:bg-muted/80 shrink-0"
              title="Volver a la lista de horarios"
            >
              <ArrowLeft className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            </Button>
          </Link>
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-sm sm:text-base font-black text-foreground truncate">
              {data.schedule.name}
            </h1>

            {data.schedule.isActive ? (
              <Badge className="bg-emerald-600 text-white border-transparent text-[10px] gap-1 font-bold px-1.5 py-0 h-4 shadow-2xs shrink-0">
                <Star className="w-2.5 h-2.5 fill-white" /> VIGENTE
              </Badge>
            ) : new Date(data.schedule.startDate) > new Date() ? (
              <Badge variant="outline" className="bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30 text-[10px] gap-1 font-bold h-4 shrink-0">
                <Clock className="w-2.5 h-2.5 text-sky-600 dark:text-sky-400" /> Vigencia Futura
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-400/30 text-[10px] gap-1 font-bold h-4 shrink-0">
                <Calendar className="w-2.5 h-2.5 text-slate-500" /> Vigencia Pasada
              </Badge>
            )}

            <span className="text-[11px] text-muted-foreground font-mono hidden md:inline ml-1 truncate">
              📅 {formatDate(data.schedule.startDate)} — {formatDate(data.schedule.endDate)}
            </span>
          </div>
        </div>

        {/* Header Actions: View Switcher + Audit + Environments + Exports + Toggle Publish + Refresh */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Single Compact View Toggle Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBuilderViewMode((prev) => (prev === "detail" ? "panoramic" : "detail"))}
            className="rounded-xl text-xs gap-1.5 h-7 px-2.5 font-bold transition-all border-border/80 hover:bg-accent shrink-0"
            title={
              builderViewMode === "detail"
                ? "Cambiar a Vista Panorámica (matriz de ocupación de todas las fichas)"
                : "Cambiar a Vista por Ficha (malla interactiva individual)"
            }
          >
            {builderViewMode === "detail" ? (
              <>
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span>Por Ficha</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Panorámica</span>
              </>
            )}
          </Button>

          <div className="h-4 w-px bg-border hidden sm:block shrink-0" />
          {/* Audit Conflicts Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAuditModalOpen(true)}
            className="rounded-xl text-xs gap-1.5 h-7 px-2.5 font-bold transition-all bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/20"
            title="Auditoría de cruces, disponibilidad, ambientes y horas"
          >
            <ShieldAlert className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            <span>Auditoría</span>
            {quickConflictCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-600 text-white text-[9px] flex items-center justify-center font-mono">
                {quickConflictCount}
              </span>
            )}
          </Button>

          {/* Environment Occupancy Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEnvModalOpen(true)}
            className="rounded-xl text-xs gap-1.5 h-7 px-2.5 font-bold transition-all bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/20"
            title="Matriz de ocupación por aulas y ambientes de formación"
          >
            <Building className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
            <span>Ambientes</span>
          </Button>

          {/* Teacher Schedule & Hours Matrix Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsTeacherModalOpen(true)}
            className="rounded-xl text-xs gap-1.5 h-7 px-2.5 font-bold transition-all bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/20"
            title="Matriz de horario y horas asignadas por instructor"
          >
            <GraduationCap className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
            <span>Docentes</span>
          </Button>

          <div className="h-4 w-px bg-border hidden sm:block shrink-0" />

          {/* PDF Export Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setExportDefaultFormat("pdf");
              setIsExportModalOpen(true);
            }}
            className="rounded-xl text-xs gap-1.5 h-7 px-2.5 bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30 hover:bg-red-500/20 font-bold"
            title="Exportar horario en PDF (@react-pdf/renderer)"
          >
            <FileText className="w-3 h-3 text-red-600 dark:text-red-400" />
            <span>PDF</span>
          </Button>

          {/* Excel Export Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setExportDefaultFormat("excel");
              setIsExportModalOpen(true);
            }}
            className="rounded-xl text-xs gap-1.5 h-7 px-2.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20 font-bold"
            title="Exportar horario en Excel estilizado (ExcelJS)"
          >
            <FileSpreadsheet className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>Excel</span>
          </Button>

          <div className="h-4 w-px bg-border hidden sm:block shrink-0" />

          {/* Public / Draft Toggle Button */}
          {data.schedule.isActive ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleTogglePublish}
              disabled={isTogglingPublish || isRefreshing}
              className={`rounded-xl text-xs gap-1.5 h-7 px-2.5 font-bold transition-all shadow-2xs ${
                data.schedule.isPublished
                  ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 hover:bg-blue-500/20"
                  : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/20"
              }`}
              title={
                data.schedule.isPublished
                  ? "Horario público. Clic para cambiar a Borrador"
                  : "Horario en borrador. Clic para Publicar horario"
              }
            >
              {data.schedule.isPublished ? (
                <>
                  <Globe className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                  <span>Público</span>
                </>
              ) : (
                <>
                  <FileEdit className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  <span>Borrador</span>
                </>
              )}
            </Button>
          ) : (
            <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 text-[10px] gap-1 font-bold px-2 py-0 h-7 shrink-0">
              <Globe className="w-3 h-3" /> Público
            </Badge>
          )}

          <div className="h-4 w-px bg-border hidden sm:block shrink-0" />

          {/* Fullscreen Toggle Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            className="rounded-xl text-xs gap-1.5 h-7 px-2.5 font-bold transition-all border-border/80 hover:bg-accent shrink-0"
            title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-primary" />
                <span className="hidden sm:inline">Salir</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-primary" />
                <span className="hidden sm:inline">Pantalla Completa</span>
              </>
            )}
          </Button>

          {/* Help Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsHelpOpen(true)}
                className="rounded-xl text-xs gap-1.5 h-7 px-2 font-bold transition-all border-border/80 hover:bg-accent shrink-0"
              >
                <HelpCircle className="w-3.5 h-3.5 text-primary" />
                <span className="hidden md:inline">Ayuda</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">¿Qué puedo hacer acá? Guía del Constructor de Horarios</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Main Layout: Left Groups Sidebar + Right Workspace */}
      {data.groups.length === 0 ? (
        <div className="flex-1 rounded-2xl border border-dashed border-border/80 p-8 text-center bg-card flex flex-col items-center justify-center gap-3">
          <Users className="w-10 h-10 text-muted-foreground" />
          <h3 className="font-bold text-sm text-foreground">
            No hay grupos asignados a este horario
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            Regresa a la lista de horarios y haz clic en "Configurar Grupos y Franjas" para vincular las fichas correspondientes.
          </p>
          <Link href={schedulesBaseUrl}>
            <Button className="rounded-xl text-xs font-semibold mt-1">
              Volver a Horarios
            </Button>
          </Link>
        </div>
      ) : builderViewMode === "panoramic" ? (
        <SchedulePanoramicView
          data={data}
          onSelectGroupAndEdit={(groupId) => {
            setSelectedGroupId(groupId);
            setBuilderViewMode("detail");
          }}
          onOpenScheduleModal={(groupId, courseTitle) => {
            setSelectedGroupId(groupId);
            handleOpenScheduleModal(courseTitle);
          }}
        />
      ) : (
        <div className="flex-1 min-h-0 flex flex-row gap-2.5 overflow-hidden items-stretch">
          {/* Left Sidebar: Groups Selector */}
          <GroupSelectorSidebar
            groups={data.groups}
            teachers={data.teachers}
            selectedGroupId={selectedGroupId}
            onSelectGroup={setSelectedGroupId}
          />

          {/* Center & Right Workspace */}
          {selectedGroup && (
            <div className="flex-1 min-w-0 h-full flex flex-row gap-2.5 overflow-hidden">
              {/* Visual Weekly Interactive Calendar Grid */}
              <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
                <InteractiveWeeklyCalendarGrid
                  schedule={data.schedule}
                  group={selectedGroup}
                  onOpenScheduleModal={(day, start, end, editingSlot) =>
                    handleOpenScheduleModal(undefined, day, start, end, editingSlot)
                  }
                  onDeleteClassSlot={(id) => setSlotToDelete(id)}
                />
              </div>

              {/* Right Sidebar: Trimester Curriculum Panel (Materias del Periodo) */}
              <GroupTrimesterCurriculumPanel
                group={selectedGroup}
                teachers={data.teachers}
                onSelectCourseToSchedule={(courseTitle) => handleOpenScheduleModal(courseTitle)}
              />
            </div>
          )}
        </div>
      )}

      {/* Schedule Class Modal */}
      {selectedGroup && (
        <ScheduleClassModal
          open={isScheduleModalOpen}
          onOpenChange={setIsScheduleModalOpen}
          scheduleId={data.schedule.id}
          group={selectedGroup}
          teachers={data.teachers}
          environments={data.environments}
          editingCourseScheduleId={modalEditingCourseScheduleId}
          initialCourseTitle={modalInitialCourseTitle}
          initialTeacherId={modalInitialTeacherId}
          initialDay={modalInitialDay}
          initialStartTime={modalInitialStartTime}
          initialEndTime={modalInitialEndTime}
          onDelete={(id) => {
            setSlotToDelete(id);
          }}
          onSuccess={handleRefresh}
        />
      )}

      {/* Schedule Export Modal (PDF / Excel with Groups, Teachers & Environments tabs) */}
      <ScheduleExportModal
        open={isExportModalOpen}
        onOpenChange={setIsExportModalOpen}
        schedule={data.schedule}
        groups={data.groups}
        teachers={data.teachers}
        environments={data.environments}
        defaultFormat={exportDefaultFormat}
      />

      {/* Schedule Global Audit Modal */}
      <ScheduleAuditModal
        open={isAuditModalOpen}
        onOpenChange={setIsAuditModalOpen}
        schedule={data.schedule}
        groups={data.groups}
        teachers={data.teachers}
        environments={data.environments}
        onSelectGroup={(gid) => setSelectedGroupId(gid)}
      />

      {/* Environment Occupancy Matrix Modal */}
      <EnvironmentOccupancyModal
        open={isEnvModalOpen}
        onOpenChange={setIsEnvModalOpen}
        schedule={data.schedule}
        groups={data.groups}
        environments={data.environments}
      />

      {/* Teacher Schedule & Hours Matrix Modal */}
      <TeacherOccupancyModal
        open={isTeacherModalOpen}
        onOpenChange={setIsTeacherModalOpen}
        schedule={data.schedule}
        groups={data.groups}
        teachers={data.teachers}
        onSelectGroup={(gid) => setSelectedGroupId(gid)}
      />

      {/* Delete Slot Confirmation Dialog */}
      <AlertDialog open={!!slotToDelete} onOpenChange={(open) => !open && setSlotToDelete(null)}>
        <AlertDialogContent className="rounded-3xl border-border bg-background shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-foreground">
              ¿Eliminar Clase del Horario?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Esta acción removerá esta sesión del calendario de la ficha seleccionada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="rounded-xl text-xs">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteSlot}
              disabled={isDeleting}
              className="rounded-xl text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold"
            >
              {isDeleting ? "Eliminando..." : "Sí, Eliminar Clase"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SchedulePanelHelpModal
        panel="builder"
        open={isHelpOpen}
        onOpenChange={setIsHelpOpen}
        scheduleName={data.schedule.name}
      />
    </div>
  );
}
