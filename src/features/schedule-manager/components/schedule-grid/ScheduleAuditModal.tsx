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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Users,
  GraduationCap,
  Building,
  Clock,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { DayOfWeek } from "@/generated/prisma/client";
import { ScheduleBuilderData } from "../../actions/scheduleBuilderActions";
import { getCleanTeacherName } from "../../utils/teacherNameFormatter";

const DAY_LABELS_ES: Record<DayOfWeek, string> = {
  MONDAY: "Lunes",
  TUESDAY: "Martes",
  WEDNESDAY: "Miércoles",
  THURSDAY: "Jueves",
  FRIDAY: "Viernes",
  SATURDAY: "Sábado",
  SUNDAY: "Domingo",
};

const toFormat12h = (t24: string) => {
  if (!t24) return "";
  const [h, m] = t24.split(":").map(Number);
  const ap = h >= 12 ? "p.m." : "a.m.";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ap}`;
};

export interface AuditIssue {
  id: string;
  type: "schedule_overlap" | "teacher_collision" | "env_collision" | "availability" | "qualification" | "hours_missing" | "no_env";
  severity: "error" | "warning";
  title: string;
  description: string;
  groupId?: string;
  groupName?: string;
  teacherName?: string;
  dayOfWeek?: DayOfWeek;
  timeRange?: string;
}

interface ScheduleAuditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: ScheduleBuilderData["schedule"];
  groups: ScheduleBuilderData["groups"];
  teachers: ScheduleBuilderData["teachers"];
  environments: ScheduleBuilderData["environments"];
  onSelectGroup?: (groupId: string) => void;
}

export function ScheduleAuditModal({
  open,
  onOpenChange,
  schedule,
  groups,
  teachers,
  environments,
  onSelectGroup,
}: ScheduleAuditModalProps) {
  const [filterType, setFilterType] = useState<string>("all");

  const issues = useMemo<AuditIssue[]>(() => {
    const list: AuditIssue[] = [];

    // 0. Detect Overlapping Class Slots within the Same Group (Superposición de Clases)
    groups.forEach((g) => {
      const groupDaySlots: Array<{
        slotId: string;
        courseId: string;
        courseTitle: string;
        teacherName: string;
        dayOfWeek: DayOfWeek;
        startTime: string;
        endTime: string;
      }> = [];

      g.scheduledClasses.forEach((c) => {
        c.schedules.forEach((s) => {
          const tName = s.teacher?.name || c.teacher?.name || "Sin profesor";
          groupDaySlots.push({
            slotId: s.id,
            courseId: c.id,
            courseTitle: c.title,
            teacherName: tName,
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
          });
        });
      });

      for (let i = 0; i < groupDaySlots.length; i++) {
        for (let j = i + 1; j < groupDaySlots.length; j++) {
          const sA = groupDaySlots[i];
          const sB = groupDaySlots[j];

          if (sA.dayOfWeek === sB.dayOfWeek) {
            // Overlap condition: startA < endB and endA > startB
            if (sA.startTime < sB.endTime && sA.endTime > sB.startTime) {
              list.push({
                id: `overlap-${g.id}-${sA.slotId}-${sB.slotId}`,
                type: "schedule_overlap",
                severity: "error",
                title: `Superposición de Clases: Ficha ${g.name}`,
                description: `En la ficha ${g.name}, la clase "${sA.courseTitle}" (${toFormat12h(sA.startTime)} - ${toFormat12h(sA.endTime)}, Docente: ${sA.teacherName}) se cruza/superpone con "${sB.courseTitle}" (${toFormat12h(sB.startTime)} - ${toFormat12h(sB.endTime)}, Docente: ${sB.teacherName}) el ${DAY_LABELS_ES[sA.dayOfWeek]}.`,
                groupId: g.id,
                groupName: g.name,
                dayOfWeek: sA.dayOfWeek,
                timeRange: `${toFormat12h(sA.startTime)} - ${toFormat12h(sA.endTime)}`,
              });
            }
          }
        }
      }
    });

    // 1. Audit Environment Collisions (Two groups sharing the same environment at same time)
    const envTimeSlots: Array<{
      envId: string;
      envName: string;
      groupId: string;
      groupName: string;
      courseTitle: string;
      dayOfWeek: DayOfWeek;
      startTime: string;
      endTime: string;
    }> = [];

    groups.forEach((g) => {
      if (g.environment) {
        g.scheduledClasses.forEach((c) => {
          c.schedules.forEach((s) => {
            envTimeSlots.push({
              envId: g.environment!.id,
              envName: g.environment!.name,
              groupId: g.id,
              groupName: g.name,
              courseTitle: c.title,
              dayOfWeek: s.dayOfWeek,
              startTime: s.startTime,
              endTime: s.endTime,
            });
          });
        });
      } else {
        list.push({
          id: `no-env-${g.id}`,
          type: "no_env",
          severity: "warning",
          title: `Ficha ${g.name} sin ambiente asignado`,
          description: `La ficha ${g.name} (${g.program.name}) no tiene un ambiente/aula de formación configurado.`,
          groupId: g.id,
          groupName: g.name,
        });
      }
    });

    // Detect overlapping slots in the same environment
    for (let i = 0; i < envTimeSlots.length; i++) {
      for (let j = i + 1; j < envTimeSlots.length; j++) {
        const slotA = envTimeSlots[i];
        const slotB = envTimeSlots[j];

        if (
          slotA.envId === slotB.envId &&
          slotA.groupId !== slotB.groupId &&
          slotA.dayOfWeek === slotB.dayOfWeek
        ) {
          // Check time overlap
          if (slotA.startTime < slotB.endTime && slotA.endTime > slotB.startTime) {
            list.push({
              id: `env-col-${slotA.groupId}-${slotB.groupId}-${slotA.dayOfWeek}-${slotA.startTime}`,
              type: "env_collision",
              severity: "error",
              title: `Cruce de Ambiente en ${slotA.envName}`,
              description: `Las fichas ${slotA.groupName} ("${slotA.courseTitle}") y ${slotB.groupName} ("${slotB.courseTitle}") ocupan el mismo ambiente el ${DAY_LABELS_ES[slotA.dayOfWeek]} entre ${toFormat12h(slotA.startTime)} y ${toFormat12h(slotA.endTime)}.`,
              groupId: slotA.groupId,
              groupName: slotA.groupName,
              dayOfWeek: slotA.dayOfWeek,
              timeRange: `${toFormat12h(slotA.startTime)} - ${toFormat12h(slotA.endTime)}`,
            });
          }
        }
      }
    }

    // 2. Audit Teacher Collisions, Availability & Qualifications per Group
    groups.forEach((g) => {
      // Hours calculation
      const scheduledHoursByTitle = new Map<string, number>();
      g.scheduledClasses.forEach((c) => {
        let h = 0;
        c.schedules.forEach((s) => {
          const [sh, sm] = s.startTime.split(":").map(Number);
          const [eh, em] = s.endTime.split(":").map(Number);
          h += (eh * 60 + em - (sh * 60 + sm)) / 60;
        });
        scheduledHoursByTitle.set(c.title.toLowerCase(), h);
      });

      // Check missing required hours
      g.trimesterCourses.forEach((tc) => {
        const schedH = scheduledHoursByTitle.get(tc.title.toLowerCase()) || 0;
        if (schedH < tc.weeklyHours) {
          list.push({
            id: `hours-${g.id}-${tc.id}`,
            type: "hours_missing",
            severity: "warning",
            title: `Horas Incompletas: ${tc.title}`,
            description: `Ficha ${g.name}: Se han programado ${schedH}h de ${tc.weeklyHours}h requeridas para el trimestre (Faltan ${tc.weeklyHours - schedH}h).`,
            groupId: g.id,
            groupName: g.name,
          });
        }
      });

      // Audit classes
      g.scheduledClasses.forEach((c) => {
        c.schedules.forEach((s) => {
          const slotTeacher = s.teacher || c.teacher;

          if (!slotTeacher) {
            list.push({
              id: `no-teacher-${g.id}-${c.id}-${s.id}`,
              type: "teacher_collision",
              severity: "error",
              title: `Materia sin Docente: ${c.title}`,
              description: `La sesión de "${c.title}" el ${DAY_LABELS_ES[s.dayOfWeek]} (${toFormat12h(s.startTime)} - ${toFormat12h(s.endTime)}) en la ficha ${g.name} no tiene instructor asignado.`,
              groupId: g.id,
              groupName: g.name,
            });
            return;
          }

          const matchedTeacher = teachers.find((t) => t.id === slotTeacher.id);
          const tName = getCleanTeacherName(slotTeacher.name);

          if (!matchedTeacher) return;

          // Qualification check
          const tcTemplate = g.trimesterCourses.find(
            (tc) => tc.title.toLowerCase() === c.title.toLowerCase()
          );
          const isQualified = tcTemplate
            ? tcTemplate.qualifiedTeacherIds.includes(matchedTeacher.id) ||
              matchedTeacher.qualifiedCourseTitles.some(
                (qt) => qt.toLowerCase() === c.title.toLowerCase()
              )
            : false;

          if (!isQualified) {
            list.push({
              id: `qual-${g.id}-${c.id}-${s.id}`,
              type: "qualification",
              severity: "warning",
              title: `Docente no calificado: ${tName}`,
              description: `El instructor ${tName} no tiene registrada la habilitación o competencia para dictar "${c.title}" en la ficha ${g.name}.`,
              groupId: g.id,
              groupName: g.name,
              teacherName: tName,
            });
          }

          // Availability check per schedule slot
          const isAvail = matchedTeacher.availability.some(
            (a) => a.dayOfWeek === s.dayOfWeek && a.startTime <= s.startTime && a.endTime >= s.endTime
          );
          if (!isAvail) {
            list.push({
              id: `avail-${g.id}-${s.id}`,
              type: "availability",
              severity: "warning",
              title: `Fuera de Disponibilidad: ${tName}`,
              description: `El instructor ${tName} está programado el ${DAY_LABELS_ES[s.dayOfWeek]} de ${toFormat12h(s.startTime)} a ${toFormat12h(s.endTime)} en la ficha ${g.name}, fuera de sus franjas declaradas.`,
              groupId: g.id,
              groupName: g.name,
              teacherName: tName,
              dayOfWeek: s.dayOfWeek,
              timeRange: `${toFormat12h(s.startTime)} - ${toFormat12h(s.endTime)}`,
            });
          }

          // Collision check with other groups
          const collision = matchedTeacher.scheduledSlots.find(
            (slot) =>
              slot.groupId !== g.id &&
              slot.dayOfWeek === s.dayOfWeek &&
              slot.startTime < s.endTime &&
              slot.endTime > s.startTime
          );

          if (collision) {
            list.push({
              id: `tcol-${g.id}-${s.id}-${collision.groupId}`,
              type: "teacher_collision",
              severity: "error",
              title: `Doble Asignación: ${tName}`,
              description: `El instructor ${tName} tiene un cruce de horario el ${DAY_LABELS_ES[s.dayOfWeek]} entre la ficha ${g.name} ("${c.title}") y otra ficha (${collision.groupName}).`,
              groupId: g.id,
              groupName: g.name,
              teacherName: tName,
              dayOfWeek: s.dayOfWeek,
              timeRange: `${toFormat12h(s.startTime)} - ${toFormat12h(s.endTime)}`,
            });
          }
        });
      });
    });

    return list;
  }, [groups, teachers]);

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const collisionCount = issues.filter(
    (i) => i.type === "schedule_overlap" || i.type === "teacher_collision" || i.type === "env_collision"
  ).length;
  const hoursCount = issues.filter((i) => i.type === "hours_missing").length;

  const filteredIssues = issues.filter((i) => {
    if (filterType === "all") return true;
    if (filterType === "errors") return i.severity === "error";
    if (filterType === "warnings") return i.severity === "warning";
    if (filterType === "collisions")
      return i.type === "schedule_overlap" || i.type === "teacher_collision" || i.type === "env_collision";
    if (filterType === "hours") return i.type === "hours_missing";
    return true;
  });

  const handleIssueClick = (groupId?: string) => {
    if (groupId && onSelectGroup) {
      onSelectGroup(groupId);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl lg:max-w-5xl p-0 overflow-hidden rounded-3xl border-border bg-background shadow-2xl">
        <div className="flex flex-col">
          {/* Header */}
          <DialogHeader className="p-6 pb-4 border-b border-border/80 bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold border ${
                    errorCount > 0
                      ? "bg-red-500/10 border-red-500/30 text-red-600"
                      : warningCount > 0
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-600"
                      : "bg-emerald-500/10 border-emerald-500/30 text-emerald-600"
                  }`}
                >
                  {errorCount > 0 ? (
                    <ShieldAlert className="w-5 h-5" />
                  ) : warningCount > 0 ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <DialogTitle className="text-lg font-black text-foreground flex items-center gap-2">
                    Auditoría de Conflictos y Consistencia
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    {schedule.name} • Diagnóstico global de cruces, disponibilidad, ambientes y horas.
                  </DialogDescription>
                </div>
              </div>

              {/* Status summary badges */}
              <div className="flex items-center gap-1.5">
                <Badge
                  className={
                    errorCount > 0
                      ? "bg-red-600 text-white font-bold text-xs"
                      : "bg-muted text-muted-foreground text-xs"
                  }
                >
                  {errorCount} Errores
                </Badge>
                <Badge
                  className={
                    warningCount > 0
                      ? "bg-amber-600 text-white font-bold text-xs"
                      : "bg-muted text-muted-foreground text-xs"
                  }
                >
                  {warningCount} Advertencias
                </Badge>
              </div>
            </div>
          </DialogHeader>

          {/* Filter Tabs */}
          <div className="p-4 pb-0 border-b border-border/50 bg-muted/10">
            <Tabs value={filterType} onValueChange={setFilterType} className="w-full">
              <TabsList className="grid grid-cols-5 w-full h-8 rounded-xl bg-muted/60 p-0.5 text-xs">
                <TabsTrigger value="all" className="rounded-lg text-[11px] font-bold">
                  Todos ({issues.length})
                </TabsTrigger>
                <TabsTrigger value="errors" className="rounded-lg text-[11px] font-bold text-red-600">
                  Críticos ({errorCount})
                </TabsTrigger>
                <TabsTrigger value="collisions" className="rounded-lg text-[11px] font-bold">
                  Cruces ({collisionCount})
                </TabsTrigger>
                <TabsTrigger value="hours" className="rounded-lg text-[11px] font-bold">
                  Horas ({hoursCount})
                </TabsTrigger>
                <TabsTrigger value="warnings" className="rounded-lg text-[11px] font-bold text-amber-600">
                  Avisos ({warningCount})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Body Content / Issues List */}
          <div className="p-5 max-h-[58vh] overflow-y-auto space-y-2.5 scrollbar-thin">
            {filteredIssues.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-black text-foreground">
                  ¡Excelente! No hay conflictos en esta categoría
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm">
                  La programación analizada cumple con las reglas de docentes, ambientes y horas.
                </p>
              </div>
            ) : (
              filteredIssues.map((issue) => {
                const isError = issue.severity === "error";

                return (
                  <div
                    key={issue.id}
                    onClick={() => handleIssueClick(issue.groupId)}
                    className={`p-3 rounded-2xl border transition-all flex items-start gap-3 select-none ${
                      isError
                        ? "bg-red-500/5 border-red-500/30 hover:bg-red-500/10"
                        : "bg-amber-500/5 border-amber-500/30 hover:bg-amber-500/10"
                    } ${issue.groupId ? "cursor-pointer" : ""}`}
                  >
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isError
                          ? "bg-red-500/20 text-red-600"
                          : "bg-amber-500/20 text-amber-600"
                      }`}
                    >
                      {issue.type === "teacher_collision" || issue.type === "qualification" ? (
                        <GraduationCap className="w-4 h-4" />
                      ) : issue.type === "env_collision" || issue.type === "no_env" ? (
                        <Building className="w-4 h-4" />
                      ) : issue.type === "hours_missing" ? (
                        <Clock className="w-4 h-4" />
                      ) : (
                        <AlertTriangle className="w-4 h-4" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-foreground block truncate">
                          {issue.title}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] font-mono shrink-0 uppercase ${
                            isError
                              ? "border-red-500/40 text-red-700 dark:text-red-300"
                              : "border-amber-500/40 text-amber-700 dark:text-amber-300"
                          }`}
                        >
                          {issue.type.replace("_", " ")}
                        </Badge>
                      </div>

                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {issue.description}
                      </p>

                      {issue.groupId && (
                        <div className="flex items-center gap-1 text-[10px] text-primary font-bold pt-1">
                          <span>Ir a la ficha {issue.groupName}</span>
                          <ArrowRight className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <DialogFooter className="p-4 border-t border-border/80 bg-muted/20 flex flex-row items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              Total de verificaciones realizadas: {groups.length} fichas y {teachers.length} docentes.
            </span>
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs font-bold"
            >
              Cerrar Auditoría
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
