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
import { Users, Clock, BookOpen, HelpCircle, X, Lock, Unlock, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AcademicScheduleItem } from "../types";
import { getTeachersListAction } from "../actions/scheduleManagerActions";
import { TeacherAvailabilityView } from "@/features/schedule/components/TeacherAvailabilityView";
import { TeacherQualificationsView } from "@/features/teacher/components/TeacherQualificationsView";
import { SchedulePanelHelpModal } from "./SchedulePanelHelpModal";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  getTeacherScheduleLockStatusAction, 
  adminLockBothTeacherScheduleAction,
  toggleTeacherSchedulePastAttendanceAction 
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
  const prevOpenRef = React.useRef<boolean>(false);

  useEffect(() => {
    if (open) {
      const targetSchedId = defaultScheduleId || schedules.find(s => s.isActive)?.id || schedules[0]?.id || "";
      setSelectedScheduleId(targetSchedId);
      fetchTeachers(programId);
    }
  }, [open, defaultScheduleId, programId]);

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

  const fetchTeachers = async (progId?: string) => {
    setLoadingTeachers(true);
    try {
      const list = await getTeachersListAction(progId || programId);
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
                <div className="w-full sm:w-[280px] shrink-0">
                  {loadingTeachers ? (
                    <div className="h-8 bg-background animate-pulse rounded-lg border" />
                  ) : (
                    <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                      <SelectTrigger className="h-8 text-xs font-bold bg-background border-border/80 rounded-lg">
                        <SelectValue placeholder="Seleccionar Instructor..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-[220px]">
                        {teachers.map((t) => (
                          <SelectItem key={t.id} value={t.id} className="text-xs font-bold">
                            👨‍🏫 {t.name} {t.profile?.identificacion ? `(CC. ${t.profile.identificacion})` : ""}
                          </SelectItem>
                        ))}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
