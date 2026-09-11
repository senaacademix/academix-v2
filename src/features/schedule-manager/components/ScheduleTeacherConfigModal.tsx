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
import { Users, Clock, BookOpen, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AcademicScheduleItem } from "../types";
import { getTeachersListAction } from "../actions/scheduleManagerActions";
import { TeacherAvailabilityView } from "@/features/schedule/components/TeacherAvailabilityView";
import { TeacherQualificationsView } from "@/features/teacher/components/TeacherQualificationsView";
import { SchedulePanelHelpModal } from "./SchedulePanelHelpModal";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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

  useEffect(() => {
    if (open) {
      const initialSchedId = defaultScheduleId || schedules.find(s => s.isActive)?.id || schedules[0]?.id || "";
      setSelectedScheduleId(initialSchedId);
      fetchTeachers(programId);
    }
  }, [open, defaultScheduleId, schedules, programId]);

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
      <DialogContent className="fixed inset-0 top-0 left-0 translate-x-0 translate-y-0 w-screen h-screen max-w-none sm:max-w-none !max-w-none !w-screen min-w-full min-h-full rounded-none m-0 border-0 flex flex-col p-3 sm:p-4 overflow-hidden bg-background shadow-none z-50">
        
        {/* Compact Header & Controls Bar */}
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          
          {/* Row 1: Modal Header (Minimalist 1-line) */}
          <div className="flex items-center justify-between gap-2 shrink-0 pb-2 border-b border-border/70 mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <DialogTitle className="text-base font-extrabold text-foreground tracking-tight">
                Gestión Académica de Profesores
              </DialogTitle>
              <Badge variant="outline" className="hidden sm:inline-flex text-[10px] font-mono px-2 py-0.5 border-primary/30 text-primary">
                Disponibilidad y Materias por Horario
              </Badge>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsHelpOpen(true)}
                  className="w-8 h-8 rounded-lg border-border/80 hover:bg-muted text-foreground shadow-2xs shrink-0 mr-8"
                >
                  <HelpCircle className="w-4 h-4 text-primary" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">¿Qué puedo hacer acá? Guía de Profesores</TooltipContent>
            </Tooltip>
          </div>

          {/* Row 2: Selectors & Tabs in 1 compact bar */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/40 p-1.5 rounded-xl border border-border/60 shrink-0 mb-2">
              
              {/* Selectors */}
              <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                {/* Teacher Selector */}
                <div className="w-full sm:w-[320px] shrink-0">
                  {loadingTeachers ? (
                    <div className="h-8 bg-background animate-pulse rounded-lg border" />
                  ) : (
                    <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                      <SelectTrigger className="h-8 text-xs font-bold bg-background border-border/80 rounded-lg">
                        <SelectValue placeholder="Seleccionar Profesor..." />
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

                {/* Fixed Academic Schedule Indicator (Strictly locked to the selected schedule card) */}
                <div className="h-8 px-3 flex items-center gap-2 bg-primary/10 border border-primary/30 text-primary rounded-lg text-xs font-black shrink-0">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span>Horario: {schedules.find(s => s.id === selectedScheduleId)?.name || "Horario Seleccionado"}</span>
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
                <p className="text-xs font-bold">Selecciona un profesor para gestionar su disponibilidad y materias.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto min-h-0 pt-1 pb-1">
                <TabsContent value="availability" className="m-0 h-full">
                  <TeacherAvailabilityView 
                    key={`avail-${selectedTeacherId}-${selectedScheduleId}`}
                    teacherId={selectedTeacherId} 
                    scheduleId={selectedScheduleId}
                    isAdminMode={true} 
                  />
                </TabsContent>

                <TabsContent value="qualifications" className="m-0 h-full">
                  <TeacherQualificationsView 
                    key={`qual-${selectedTeacherId}-${selectedScheduleId}-${programId}`}
                    teacherId={selectedTeacherId} 
                    scheduleId={selectedScheduleId}
                    isAdminMode={true} 
                    programId={programId}
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
