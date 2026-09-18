"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Clock, BookOpen, HelpCircle, X, Lock, Unlock, CalendarDays, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import { AcademicScheduleItem } from "../types";
import { getTeachersListAction } from "../actions/scheduleManagerActions";
import { TeacherAvailabilityView } from "@/features/schedule/components/TeacherAvailabilityView";
import { TeacherQualificationsView } from "@/features/teacher/components/TeacherQualificationsView";
import { SchedulePanelHelpModal } from "./SchedulePanelHelpModal";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  getTeacherScheduleLockStatusAction, 
  adminLockBothTeacherScheduleAction,
  toggleTeacherSchedulePastAttendanceAction,
  adminLockBothAllTeachersScheduleAction
} from "@/features/teacher/actions/qualificationActions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ScheduleTeacherConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedules: AcademicScheduleItem[];
  defaultScheduleId?: string | null;
  programId?: string;
}

export function ScheduleTeacherConfigModal({
  open,
  onOpenChange,
  schedules,
  defaultScheduleId,
  programId,
}: ScheduleTeacherConfigModalProps) {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>(
    defaultScheduleId || schedules.find(s => s.isActive)?.id || schedules[0]?.id || ""
  );
  const [activeTab, setActiveTab] = useState<string>("availability");
  const [loadingTeachers, setLoadingTeachers] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [lockStatus, setLockStatus] = useState<{ 
    availabilityLocked: boolean; 
    qualificationsLocked: boolean;
    allowPastAttendanceEdit?: boolean;
  } | null>(null);
  const [lockLoading, setLockLoading] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [bulkDialogOpen, setBulkDialogOpen] = useState<boolean>(false);
  const [bulkActionToConfirm, setBulkActionToConfirm] = useState<boolean | null>(null);
  const [bulkLoading, setBulkLoading] = useState<boolean>(false);
  const prevOpenRef = React.useRef<boolean>(false);

  useEffect(() => {
    if (open) {
      const targetSchedId = defaultScheduleId || schedules.find(s => s.isActive)?.id || schedules[0]?.id || "";
      setSelectedScheduleId(targetSchedId);
      fetchTeachers(programId, targetSchedId);
    }
  }, [open, defaultScheduleId, programId]);

  useEffect(() => {
    if (open && selectedScheduleId) {
      fetchTeachers(programId, selectedScheduleId);
    }
  }, [selectedScheduleId, refreshKey]);

  const fetchLockStatus = async () => {
    if (!selectedTeacherId || !selectedScheduleId) {
      setLockStatus(null);
      return;
    }
    try {
      const status = await getTeacherScheduleLockStatusAction(selectedTeacherId, selectedScheduleId);
      setLockStatus(status);
    } catch (err) {
      console.error("Error fetching lock status", err);
    }
  };

  useEffect(() => {
    fetchLockStatus();
  }, [selectedTeacherId, selectedScheduleId, refreshKey]);

  const handleToggleBothLocks = async (lock: boolean) => {
    if (!selectedTeacherId || !selectedScheduleId) return;
    setLockLoading(true);
    try {
      await adminLockBothTeacherScheduleAction(selectedTeacherId, selectedScheduleId, lock);
      toast.success(lock ? "Horario y materias bloqueados con éxito para este horario" : "Horario y materias desbloqueados para este horario");
      setRefreshKey(prev => prev + 1);
    } catch (err: any) {
      toast.error(err.message || "Error al actualizar bloqueo");
    } finally {
      setLockLoading(false);
    }
  };

  const handleTogglePastAttendance = async (checked: boolean) => {
    if (!selectedTeacherId || !selectedScheduleId) return;
    setLockLoading(true);
    try {
      await toggleTeacherSchedulePastAttendanceAction(selectedTeacherId, selectedScheduleId, checked);
      toast.success(checked 
        ? "Edición de fechas anteriores permitida para este instructor en este horario" 
        : "Edición de fechas anteriores restringida a la semana actual"
      );
      setLockStatus(prev => prev ? { ...prev, allowPastAttendanceEdit: checked } : null);
    } catch (err: any) {
      toast.error(err.message || "Error al actualizar configuración");
    } finally {
      setLockLoading(false);
    }
  };

  const openBulkConfirmDialog = (lock: boolean) => {
    setBulkActionToConfirm(lock);
    setBulkDialogOpen(true);
  };

  const handleExecuteBulkAction = async () => {
    if (bulkActionToConfirm === null || !selectedScheduleId) return;
    setBulkLoading(true);
    try {
      const res = await adminLockBothAllTeachersScheduleAction({
        academicScheduleId: selectedScheduleId,
        lock: bulkActionToConfirm,
        teacherIds: teachers.map(t => t.id),
        programId
      });
      toast.success(res.message || (bulkActionToConfirm 
        ? "Todos los instructores han sido bloqueados con éxito para este horario" 
        : "Todos los instructores han sido desbloqueados para este horario"
      ));
      setRefreshKey(prev => prev + 1);
      await fetchLockStatus();
      setBulkDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Error al aplicar acción masiva");
    } finally {
      setBulkLoading(false);
    }
  };

  const fetchTeachers = async (progId?: string, schedId?: string) => {
    setLoadingTeachers(true);
    try {
      const currentSched = schedId || selectedScheduleId;
      const list = await getTeachersListAction(progId || programId, currentSched);
      setTeachers(list);
      if (list.length > 0 && (!selectedTeacherId || !list.some(t => t.id === selectedTeacherId))) {
        setSelectedTeacherId(list[0].id);
      } else if (list.length === 0) {
        setSelectedTeacherId("");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingTeachers(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="fixed inset-0 top-0 left-0 translate-x-0 translate-y-0 w-screen h-screen max-w-none sm:max-w-none !max-w-none !w-screen min-w-full min-h-full rounded-none m-0 border-0 flex flex-col p-3 sm:p-4 overflow-hidden bg-background shadow-none z-50">
        
        {/* Compact Header & Controls Bar */}
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          
          {/* Row 1: Modal Header (Minimalist 1-line) */}
          <div className="flex items-center justify-between gap-2 shrink-0 pb-2 border-b border-border/70 mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <DialogTitle className="text-base font-extrabold text-foreground tracking-tight">
                Gestión Académica de Instructores
              </DialogTitle>
              <Badge variant="outline" className="hidden sm:inline-flex text-[10px] font-mono px-2 py-0.5 border-primary/30 text-primary">
                Disponibilidad y Materias por Horario
              </Badge>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Botón de Bloqueo / Desbloqueo Masivo */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={bulkLoading || loadingTeachers || teachers.length === 0}
                    className="h-8 px-3 rounded-lg border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary font-black text-xs gap-1.5 shadow-2xs shrink-0 cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Bloquear / Desbloquear Todos ({teachers.length})</span>
                    <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72 p-1.5 shadow-lg">
                  <DropdownMenuLabel className="text-xs font-black px-2 py-1 flex items-center justify-between">
                    <span>Gestión Masiva ({teachers.length} docentes)</span>
                    <Badge variant="outline" className="text-[10px] font-mono text-primary border-primary/30">
                      {schedules.find(s => s.id === selectedScheduleId)?.name || "Horario"}
                    </Badge>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem
                    onClick={() => openBulkConfirmDialog(true)}
                    className="gap-2.5 p-2 rounded-md font-bold text-xs cursor-pointer text-amber-700 dark:text-amber-300 hover:!bg-amber-500/10 focus:!bg-amber-500/10"
                  >
                    <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-600 shrink-0">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex flex-col">
                      <span>Bloquear a todos</span>
                      <span className="text-[10px] font-normal text-muted-foreground">Disponibilidad y materias ({teachers.length} docentes)</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => openBulkConfirmDialog(false)}
                    className="gap-2.5 p-2 rounded-md font-bold text-xs cursor-pointer text-emerald-700 dark:text-emerald-300 hover:!bg-emerald-500/10 focus:!bg-emerald-500/10"
                  >
                    <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 shrink-0">
                      <Unlock className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex flex-col">
                      <span>Desbloquear a todos</span>
                      <span className="text-[10px] font-normal text-muted-foreground">Pasa todo a borrador ({teachers.length} docentes)</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setIsHelpOpen(true)}
                    className="w-8 h-8 rounded-lg border-border/80 hover:bg-muted text-foreground shadow-2xs shrink-0"
                  >
                    <HelpCircle className="w-4 h-4 text-primary" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">¿Qué puedo hacer acá? Guía de Instructores</TooltipContent>
              </Tooltip>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-8 px-3 rounded-lg border-border/80 hover:bg-muted text-foreground font-bold text-xs gap-1.5 shadow-2xs shrink-0"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cerrar</span>
              </Button>
            </div>
          </div>

          {/* Row 2: Selectors & Tabs in 1 compact bar */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/40 p-1.5 rounded-xl border border-border/60 shrink-0 mb-2">
              
              {/* Selectors */}
              <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                {/* Teacher Selector */}
                <div className="w-full sm:w-[380px] lg:w-[420px] shrink-0">
                  {loadingTeachers ? (
                    <div className="h-8 bg-background animate-pulse rounded-lg border" />
                  ) : (
                    <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                      <SelectTrigger className="h-8 text-xs font-bold bg-background border-border/80 rounded-lg">
                        <SelectValue placeholder="Seleccionar Instructor...">
                          {(() => {
                            const selectedTeacher = teachers.find(t => t.id === selectedTeacherId);
                            return selectedTeacher ? (
                              <span className="font-bold text-xs text-foreground whitespace-nowrap truncate">
                                👨‍🏫 {selectedTeacher.name} {selectedTeacher.profile?.identificacion ? `(CC. ${selectedTeacher.profile.identificacion})` : ""}
                              </span>
                            ) : (
                              "Seleccionar Instructor..."
                            );
                          })()}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="max-h-[380px] !w-[620px] !min-w-[620px] max-w-[95vw] p-1.5 shadow-2xl">
                        {teachers.map((t) => {
                          const isAvailLocked = !!t.scheduleLock?.availabilityLocked;
                          const isQualLocked = !!t.scheduleLock?.qualificationsLocked;

                          return (
                            <SelectItem 
                              key={t.id} 
                              value={t.id} 
                              className="text-xs font-medium py-2 pr-9 pl-3 my-0.5 cursor-pointer rounded-lg hover:bg-muted/80 focus:bg-muted transition-colors"
                            >
                              <div className="flex items-center justify-between gap-4 w-full">
                                {/* Nombre y Documento completos sin recortes */}
                                <div className="flex flex-col min-w-0 text-left">
                                  <span className="text-foreground font-bold text-xs leading-tight whitespace-nowrap">
                                    👨‍🏫 {t.name}
                                  </span>
                                  {t.profile?.identificacion && (
                                    <span className="text-[10px] text-muted-foreground font-medium font-mono mt-0.5 whitespace-nowrap">
                                      CC. {t.profile.identificacion}
                                    </span>
                                  )}
                                </div>

                                {/* Badges de estado completos */}
                                <div className="flex items-center gap-2 shrink-0 ml-auto">
                                  <span
                                    title={isAvailLocked ? "Disponibilidad Horaria: Bloqueada" : "Disponibilidad Horaria: En Borrador"}
                                    className={cn(
                                      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap shrink-0",
                                      isAvailLocked 
                                        ? "bg-emerald-500/15 border-emerald-500/35 text-emerald-700 dark:text-emerald-300" 
                                        : "bg-amber-500/15 border-amber-500/35 text-amber-700 dark:text-amber-300"
                                    )}
                                  >
                                    {isAvailLocked ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
                                    <span>Horario: {isAvailLocked ? "Bloqueado" : "Borrador"}</span>
                                  </span>

                                  <span
                                    title={isQualLocked ? "Materias Habilitadas: Bloqueadas" : "Materias Habilitadas: En Borrador"}
                                    className={cn(
                                      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap shrink-0",
                                      isQualLocked 
                                        ? "bg-emerald-500/15 border-emerald-500/35 text-emerald-700 dark:text-emerald-300" 
                                        : "bg-amber-500/15 border-amber-500/35 text-amber-700 dark:text-amber-300"
                                    )}
                                  >
                                    {isQualLocked ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
                                    <span>Materias: {isQualLocked ? "Bloqueadas" : "Borrador"}</span>
                                  </span>
                                </div>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Fixed Academic Schedule Indicator & Status Badges */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <div className="h-8 px-2.5 flex items-center gap-1.5 bg-primary/10 border border-primary/30 text-primary rounded-lg text-xs font-black shrink-0">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span>Horario: {schedules.find(s => s.id === selectedScheduleId)?.name || "Horario Seleccionado"}</span>
                  </div>

                  {lockStatus && (
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-[10px] font-bold px-2 py-0.5 h-7 rounded-md shrink-0 flex items-center gap-1",
                          lockStatus.availabilityLocked 
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                            : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
                        )}
                      >
                        {lockStatus.availabilityLocked ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
                        <span>Horario: {lockStatus.availabilityLocked ? "Bloqueado" : "Borrador"}</span>
                      </Badge>

                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-[10px] font-bold px-2 py-0.5 h-7 rounded-md shrink-0 flex items-center gap-1",
                          lockStatus.qualificationsLocked 
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                            : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
                        )}
                      >
                        {lockStatus.qualificationsLocked ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
                        <span>Materias: {lockStatus.qualificationsLocked ? "Bloqueadas" : "Borrador"}</span>
                      </Badge>

                      {lockStatus.availabilityLocked && lockStatus.qualificationsLocked ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={lockLoading}
                          onClick={() => handleToggleBothLocks(false)}
                          className="h-7 px-2 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/10 gap-1 rounded-md"
                        >
                          <Unlock className="w-3 h-3" />
                          <span>Desbloquear Ambos</span>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          disabled={lockLoading}
                          onClick={() => handleToggleBothLocks(true)}
                          className="h-7 px-2 text-[10px] font-bold bg-amber-600 hover:bg-amber-700 text-white gap-1 rounded-md"
                        >
                          <Lock className="w-3 h-3" />
                          <span>Bloquear Horario y Materias</span>
                        </Button>
                      )}

                      {/* Control para permitir edición de fechas anteriores para este instructor en este horario */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div 
                            className={cn(
                              "flex items-center gap-1.5 px-2.5 h-7 rounded-md border text-[10px] font-bold transition-all select-none",
                              lockStatus.allowPastAttendanceEdit 
                                ? "bg-primary/10 border-primary/40 text-primary shadow-2xs" 
                                : "bg-background border-border/80 text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                          >
                            <CalendarDays className={cn("w-3.5 h-3.5 shrink-0", lockStatus.allowPastAttendanceEdit ? "text-primary" : "text-muted-foreground")} />
                            <span className="hidden sm:inline">Fechas anteriores:</span>
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-[9px] px-1.5 py-0 h-4 rounded font-extrabold uppercase tracking-wider border-0",
                                lockStatus.allowPastAttendanceEdit 
                                  ? "bg-primary text-primary-foreground" 
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              {lockStatus.allowPastAttendanceEdit ? "Habilitadas" : "Bloqueadas"}
                            </Badge>
                            <Switch
                              id="teacher-allow-past-attendance"
                              checked={!!lockStatus.allowPastAttendanceEdit}
                              disabled={lockLoading}
                              onCheckedChange={handleTogglePastAttendance}
                              className="scale-75 data-[state=checked]:bg-primary ml-0.5 cursor-pointer"
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs max-w-xs font-medium">
                          {lockStatus.allowPastAttendanceEdit
                            ? "Fechas anteriores HABILITADAS: Este instructor puede registrar o modificar asistencias y novedades de semanas anteriores en este horario."
                            : "Fechas anteriores BLOQUEADAS: Este instructor solo puede registrar asistencias de la semana en curso en este horario."}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                </div>
              </div>

              {/* Tabs Triggers */}
              <TabsList className="h-8.5 bg-background border border-border/70 p-0.5 rounded-xl shrink-0 gap-1 overflow-hidden select-none">
                <TabsTrigger value="availability" className="h-7.5 rounded-lg text-xs font-bold gap-1.5 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Disponibilidad Horaria</span>
                </TabsTrigger>
                <TabsTrigger value="qualifications" className="h-7.5 rounded-lg text-xs font-bold gap-1.5 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Materias Habilitadas</span>
                </TabsTrigger>
              </TabsList>

            </div>

            {/* Content Container */}
            {!selectedTeacherId ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <Users className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-xs font-bold">Selecciona un instructor para gestionar su disponibilidad y materias.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto min-h-0 pt-1 pb-1">
                <TabsContent value="availability" className="m-0 h-full">
                  <TeacherAvailabilityView 
                    key={`avail-${selectedTeacherId}-${selectedScheduleId}-${refreshKey}`}
                    teacherId={selectedTeacherId} 
                    scheduleId={selectedScheduleId}
                    isAdminMode={true} 
                    onAdminActionComplete={() => {
                      fetchLockStatus();
                      setRefreshKey(k => k + 1);
                    }}
                  />
                </TabsContent>

                <TabsContent value="qualifications" className="m-0 h-full">
                  <TeacherQualificationsView 
                    key={`qual-${selectedTeacherId}-${selectedScheduleId}-${programId}-${refreshKey}`}
                    teacherId={selectedTeacherId} 
                    scheduleId={selectedScheduleId}
                    isAdminMode={true} 
                    programId={programId}
                    onAdminActionComplete={() => {
                      fetchLockStatus();
                      setRefreshKey(k => k + 1);
                    }}
                  />
                </TabsContent>
              </div>
            )}
          </Tabs>

          <SchedulePanelHelpModal
            panel="teachers"
            open={isHelpOpen}
            onOpenChange={setIsHelpOpen}
            scheduleName={schedules.find(s => s.id === selectedScheduleId)?.name}
          />

          {/* Diálogo de Confirmación para Acción Masiva */}
          <AlertDialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
            <AlertDialogContent className="max-w-md">
              <AlertDialogHeader>
                <div className="flex items-center gap-2.5 mb-1">
                  <div className={cn(
                    "p-2 rounded-xl shrink-0",
                    bulkActionToConfirm ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  )}>
                    {bulkActionToConfirm ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                  </div>
                  <AlertDialogTitle className="text-base font-extrabold text-foreground">
                    {bulkActionToConfirm 
                      ? `¿Bloquear a todos los instructores?`
                      : `¿Desbloquear a todos los instructores?`
                    }
                  </AlertDialogTitle>
                </div>
                <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
                  {bulkActionToConfirm ? (
                    <>
                      Esta acción bloqueará simultáneamente la <strong className="text-foreground font-bold">Disponibilidad Horaria</strong> y las <strong className="text-foreground font-bold">Materias Asignadas</strong> para los <strong className="text-foreground font-bold">{teachers.length} instructores</strong> en el horario <strong className="text-primary font-bold">{schedules.find(s => s.id === selectedScheduleId)?.name || "seleccionado"}</strong>.
                      <span className="block mt-2 font-medium">
                        Ningún instructor podrá realizar modificaciones en su horario o materias hasta que sea desbloqueado individual o masivamente.
                      </span>
                    </>
                  ) : (
                    <>
                      Esta acción pasará a estado borrador (desbloqueado) la <strong className="text-foreground font-bold">Disponibilidad Horaria</strong> y las <strong className="text-foreground font-bold">Materias Asignadas</strong> de los <strong className="text-foreground font-bold">{teachers.length} instructores</strong> para el horario <strong className="text-primary font-bold">{schedules.find(s => s.id === selectedScheduleId)?.name || "seleccionado"}</strong>.
                      <span className="block mt-2 font-medium">
                        Los instructores podrán editar libremente su disponibilidad y asignaturas para este horario.
                      </span>
                    </>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-3">
                <AlertDialogCancel disabled={bulkLoading} className="text-xs font-bold">
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  disabled={bulkLoading}
                  onClick={(e) => {
                    e.preventDefault();
                    handleExecuteBulkAction();
                  }}
                  className={cn(
                    "text-xs font-bold gap-1.5 text-white shadow-xs cursor-pointer",
                    bulkActionToConfirm 
                      ? "bg-amber-600 hover:bg-amber-700" 
                      : "bg-emerald-600 hover:bg-emerald-700"
                  )}
                >
                  {bulkLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    {bulkActionToConfirm ? "Sí, Bloquear Todos" : "Sí, Desbloquear Todos"}
                  </span>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </DialogContent>
    </Dialog>
  );
}
