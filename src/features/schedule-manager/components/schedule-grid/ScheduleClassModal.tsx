"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BookOpen,
  Calendar,
  Clock,
  GraduationCap,
  Building,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Trash2,
  Edit2,
  Users,
} from "lucide-react";
import { DayOfWeek } from "@/generated/prisma/client";
import { toast } from "sonner";
import { assignGroupClassScheduleAction } from "../../actions/scheduleBuilderActions";
import { ScheduleBuilderData } from "../../actions/scheduleBuilderActions";

const DAYS_ES: { value: DayOfWeek; label: string }[] = [
  { value: "MONDAY", label: "Lunes" },
  { value: "TUESDAY", label: "Martes" },
  { value: "WEDNESDAY", label: "Miércoles" },
  { value: "THURSDAY", label: "Jueves" },
  { value: "FRIDAY", label: "Viernes" },
  { value: "SATURDAY", label: "Sábado" },
  { value: "SUNDAY", label: "Domingo" },
];

function generate15MinIntervals(minTime: string, maxTime: string): string[] {
  const [minH, minM] = minTime.split(":").map(Number);
  const [maxH, maxM] = maxTime.split(":").map(Number);
  const startTotalMinutes = minH * 60 + minM;
  const endTotalMinutes = maxH * 60 + maxM;

  const intervals: string[] = [];
  for (let m = startTotalMinutes; m <= endTotalMinutes; m += 15) {
    const hours = Math.floor(m / 60);
    const mins = m % 60;
    intervals.push(
      `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`
    );
  }
  return intervals;
}

const toFormat12h = (t24: string) => {
  if (!t24) return "";
  const [h, m] = t24.split(":").map(Number);
  const ap = h >= 12 ? "p.m." : "a.m.";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ap}`;
};

interface ScheduleClassModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduleId: string;
  group: ScheduleBuilderData["groups"][0] | null;
  teachers: ScheduleBuilderData["teachers"];
  environments: ScheduleBuilderData["environments"];
  editingCourseScheduleId?: string;
  initialCourseTitle?: string;
  initialTeacherId?: string;
  initialEnvironmentId?: string;
  initialDay?: DayOfWeek;
  initialStartTime?: string;
  initialEndTime?: string;
  onDelete?: (courseScheduleId: string) => void;
  onSuccess: () => void;
}

export function ScheduleClassModal({
  open,
  onOpenChange,
  scheduleId,
  group,
  teachers,
  environments,
  editingCourseScheduleId,
  initialCourseTitle,
  initialTeacherId,
  initialEnvironmentId,
  initialDay,
  initialStartTime,
  initialEndTime,
  onDelete,
  onSuccess,
}: ScheduleClassModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedCourseTitle, setSelectedCourseTitle] = useState<string>(initialCourseTitle || "");
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(initialTeacherId || "NONE");
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState<string>(
    initialEnvironmentId || group?.environment?.id || "NONE"
  );
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>(initialDay || "MONDAY");
  const [startTime, setStartTime] = useState<string>(initialStartTime || "08:00");
  const [endTime, setEndTime] = useState<string>(initialEndTime || "12:00");

  useEffect(() => {
    if (!open) return;
    if (initialCourseTitle !== undefined) setSelectedCourseTitle(initialCourseTitle);
    if (initialTeacherId !== undefined) setSelectedTeacherId(initialTeacherId || "NONE");
    if (initialEnvironmentId !== undefined) {
      setSelectedEnvironmentId(initialEnvironmentId || group?.environment?.id || "NONE");
    } else if (group?.environment?.id) {
      setSelectedEnvironmentId(group.environment.id);
    }
    if (initialDay) setDayOfWeek(initialDay);
    if (initialStartTime) setStartTime(initialStartTime);
    if (initialEndTime) setEndTime(initialEndTime);
  }, [
    open,
    editingCourseScheduleId,
    initialCourseTitle,
    initialTeacherId,
    initialEnvironmentId,
    initialDay,
    initialStartTime,
    initialEndTime,
    group,
  ]);

  if (!group) return null;

  // Selected trimester course details
  const selectedCourse = group.trimesterCourses.find(
    (c) => c.title.toLowerCase() === selectedCourseTitle.toLowerCase()
  );

  // Qualified teachers for this subject
  const qualifiedTeachers = teachers.filter((t) =>
    selectedCourse
      ? selectedCourse.qualifiedTeacherIds.includes(t.id) ||
        t.qualifiedCourseTitles.some(
          (title) => title.toLowerCase() === selectedCourse.title.toLowerCase()
        )
      : false
  );

  // Allowed bounds from group day slots config
  const currentDayConfig = group.daySlotsConfig.find(
    (ds) => ds.dayOfWeek === dayOfWeek
  );

  const allowedMinTime = currentDayConfig?.startTime || "06:00";
  const allowedMaxTime = currentDayConfig?.endTime || "22:00";

  const allDayIntervals = generate15MinIntervals(allowedMinTime, allowedMaxTime);
  const startTimeOptions = allDayIntervals.slice(0, -1);
  const endTimeOptions = allDayIntervals.filter((t) => t > startTime);

  const handleDayChange = (newDay: DayOfWeek) => {
    setDayOfWeek(newDay);
    const newDayConfig = group.daySlotsConfig.find((ds) => ds.dayOfWeek === newDay);
    const newMin = newDayConfig?.startTime || "06:00";
    const newMax = newDayConfig?.endTime || "22:00";

    let newStart = startTime;
    let newEnd = endTime;

    if (newStart < newMin || newStart >= newMax) {
      newStart = newMin;
    }
    if (newEnd > newMax || newEnd <= newStart) {
      const [sh, sm] = newStart.split(":").map(Number);
      const totalStartMin = sh * 60 + sm;
      const [maxH, maxM] = newMax.split(":").map(Number);
      const totalMaxMin = maxH * 60 + maxM;
      const targetEndMin = Math.min(totalStartMin + 120, totalMaxMin);
      const endH = Math.floor(targetEndMin / 60);
      const endM = targetEndMin % 60;
      newEnd = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
    }

    setStartTime(newStart);
    setEndTime(newEnd);
  };

  // Check teacher availability for selected day and hours
  const checkTeacherAvailable = (teacher: typeof teachers[0]) => {
    const isDayAvail = teacher.availability.some(
      (a) =>
        a.dayOfWeek === dayOfWeek &&
        a.startTime <= startTime &&
        a.endTime >= endTime
    );

    // Check collision in other groups
    const hasCollision = teacher.scheduledSlots.some(
      (slot) =>
        slot.dayOfWeek === dayOfWeek &&
        slot.groupId !== group.id &&
        !(slot.endTime <= startTime || slot.startTime >= endTime)
    );

    return { isDayAvail, hasCollision };
  };

  const [teacherFilter, setTeacherFilter] = useState<"all" | "qualified" | "available" | "perfect">("all");

  const filteredTeachers = teachers.filter((teacher) => {
    const isQualified = qualifiedTeachers.some((qt) => qt.id === teacher.id);
    const { isDayAvail, hasCollision } = checkTeacherAvailable(teacher);
    const isAvailable = isDayAvail && !hasCollision;

    if (teacherFilter === "qualified") return isQualified;
    if (teacherFilter === "available") return isAvailable;
    if (teacherFilter === "perfect") return isQualified && isAvailable;
    return true;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCourseTitle) {
      toast.error("Por favor selecciona una materia o actividad de proyecto");
      return;
    }
    if (!startTime || !endTime) {
      toast.error("Por favor define el horario de inicio y fin");
      return;
    }

    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    if (eh * 60 + em <= sh * 60 + sm) {
      toast.error("La hora de fin debe ser posterior a la hora de inicio");
      return;
    }

    setIsSubmitting(true);
    try {
      await assignGroupClassScheduleAction({
        scheduleId,
        groupId: group.id,
        courseTitle: selectedCourseTitle,
        description: selectedCourse?.description || undefined,
        periodId: undefined,
        teacherId: selectedTeacherId !== "NONE" ? selectedTeacherId : null,
        environmentId: selectedEnvironmentId !== "NONE" ? selectedEnvironmentId : null,
        dayOfWeek,
        startTime,
        endTime,
        weeklyHours: selectedCourse?.weeklyHours || 0,
        editingCourseScheduleId,
      });

      toast.success(
        editingCourseScheduleId
          ? `Clase "${selectedCourseTitle}" actualizada exitosamente`
          : `Clase "${selectedCourseTitle}" programada exitosamente`
      );
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Error al guardar la clase");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl md:max-w-4xl w-[95vw] p-0 overflow-hidden rounded-3xl border-border bg-background shadow-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col">
          {/* Header */}
          <DialogHeader className="p-6 pb-4 border-b border-border/80 bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                {editingCourseScheduleId ? (
                  <Edit2 className="w-5 h-5" />
                ) : (
                  <BookOpen className="w-5 h-5" />
                )}
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-foreground">
                  {editingCourseScheduleId ? "Editar Clase del Horario" : "Programar Clase / Actividad de Proyecto"}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Ficha: <strong className="text-foreground">{group.name}</strong> ({group.program.name}) •{" "}
                  <span className="text-primary font-semibold">
                    {group.period?.name || "Sin trimestre"}
                  </span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Body */}
          <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* 1. Seleccionar Materia del Trimestre Actual */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-primary" />
                Materia / Actividad de Proyecto ({group.period?.name || "Trimestre Actual"}){" "}
                <span className="text-destructive">*</span>
              </Label>
              <Select value={selectedCourseTitle} onValueChange={setSelectedCourseTitle}>
                <SelectTrigger className="rounded-xl text-xs bg-card">
                  <SelectValue placeholder="Selecciona una materia o actividad de proyecto..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl text-xs max-h-60">
                  {group.trimesterCourses.length > 0 ? (
                    group.trimesterCourses.map((course) => (
                      <SelectItem key={course.id} value={course.title} className="cursor-pointer">
                        <div className="flex items-center justify-between gap-3 w-full">
                          <span className="font-semibold">{course.title}</span>
                          {course.weeklyHours > 0 && (
                            <Badge variant="outline" className="text-[10px] ml-2 shrink-0">
                              {course.weeklyHours}h/sem
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-3 text-xs text-muted-foreground text-center">
                      No hay materias registradas en la plantilla de este trimestre.
                    </div>
                  )}
                </SelectContent>
              </Select>

              {selectedCourse?.description && (
                <p className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-xl">
                  {selectedCourse.description}
                </p>
              )}
            </div>

            {/* 2. Día y Horario (Intervalos de 15 min acotados a la jornada del grupo) */}
            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-primary" /> Día
                  </Label>
                  <Select value={dayOfWeek} onValueChange={(val) => handleDayChange(val as DayOfWeek)}>
                    <SelectTrigger className="rounded-xl text-xs bg-card">
                      <SelectValue placeholder="Día" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl text-xs">
                      {DAYS_ES.map((d) => {
                        const isConfigured = group.daySlotsConfig.some((ds) => ds.dayOfWeek === d.value);
                        return (
                          <SelectItem key={d.value} value={d.value} className="cursor-pointer">
                            <div className="flex items-center justify-between gap-2 w-full">
                              <span>{d.label}</span>
                              {isConfigured && (
                                <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5">
                                  Jornada
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-primary" /> Hora Inicio
                  </Label>
                  <Select
                    value={startTime}
                    onValueChange={(val) => {
                      setStartTime(val);
                      if (endTime <= val) {
                        const nextOption = allDayIntervals.find((t) => t > val);
                        if (nextOption) setEndTime(nextOption);
                      }
                    }}
                  >
                    <SelectTrigger className="rounded-xl text-xs font-mono bg-card">
                      <SelectValue placeholder="Hora Inicio" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl text-xs max-h-56">
                      {startTimeOptions.map((t) => (
                        <SelectItem key={t} value={t} className="cursor-pointer font-mono">
                          {toFormat12h(t)} ({t})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-primary" /> Hora Fin
                  </Label>
                  <Select value={endTime} onValueChange={setEndTime}>
                    <SelectTrigger className="rounded-xl text-xs font-mono bg-card">
                      <SelectValue placeholder="Hora Fin" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl text-xs max-h-56">
                      {endTimeOptions.map((t) => (
                        <SelectItem key={t} value={t} className="cursor-pointer font-mono">
                          {toFormat12h(t)} ({t})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Group Schedule Range Feedback */}
              {currentDayConfig ? (
                <p className="text-[11px] text-muted-foreground font-mono flex items-center gap-1.5 bg-muted/30 px-3 py-1.5 rounded-xl border border-border/50">
                  <Clock className="w-3 h-3 text-primary shrink-0" />
                  <span>
                    Jornada permitida del grupo: <strong className="text-foreground">{toFormat12h(currentDayConfig.startTime)} a {toFormat12h(currentDayConfig.endTime)}</strong> (pasos de 15 min)
                  </span>
                </p>
              ) : (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>Este grupo no tiene una jornada fija asignada para este día en la base.</span>
                </p>
              )}
            </div>

            {/* 3. Selección de Docente con Botones de Filtro Tipo Icono */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-sm font-semibold flex items-center gap-1.5 shrink-0">
                  <GraduationCap className="w-4 h-4 text-primary" />
                  Instructor
                </Label>

                {/* Filter Icon Buttons */}
                <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-xl border border-border/70">
                  <button
                    type="button"
                    onClick={() => setTeacherFilter("all")}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ${
                      teacherFilter === "all"
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                    title="Mostrar todos los instructores"
                  >
                    <Users className="w-3 h-3" />
                    <span>Todos ({teachers.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTeacherFilter("qualified")}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ${
                      teacherFilter === "qualified"
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                    title="Solo instructores que pueden impartir esta materia"
                  >
                    <GraduationCap className="w-3 h-3" />
                    <span>Calificados ({qualifiedTeachers.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTeacherFilter("available")}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ${
                      teacherFilter === "available"
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                    title="Solo instructores disponibles en este horario"
                  >
                    <Clock className="w-3 h-3" />
                    <span>Disponibles</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTeacherFilter("perfect")}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ${
                      teacherFilter === "perfect"
                        ? "bg-violet-600 text-white shadow-2xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                    title="Instructores que cumplen todo (Calificados y Disponibles)"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Cumplen Todo</span>
                  </button>
                </div>
              </div>

              <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                <SelectTrigger className="rounded-xl text-xs bg-card">
                  <SelectValue placeholder="Seleccionar instructor..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl text-xs max-h-64">
                  <SelectItem value="NONE" className="cursor-pointer text-muted-foreground">
                    Sin instructor asignado (Pendiente)
                  </SelectItem>
                  {filteredTeachers.length === 0 ? (
                    <div className="p-3 text-xs text-muted-foreground text-center">
                      No hay instructores que cumplan este filtro.
                    </div>
                  ) : (
                    filteredTeachers.map((teacher) => {
                      const isQualified = qualifiedTeachers.some((qt) => qt.id === teacher.id);
                      const { isDayAvail, hasCollision } = checkTeacherAvailable(teacher);

                      return (
                        <SelectItem key={teacher.id} value={teacher.id} className="cursor-pointer">
                          <div className="flex items-center justify-between gap-3 w-full">
                            <span className="font-semibold text-foreground">
                              {teacher.name}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {isQualified ? (
                                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
                                  Puede dictar
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30 text-[10px] font-bold">
                                  No puede dictar
                                </Badge>
                              )}

                              {hasCollision ? (
                                <Badge variant="destructive" className="text-[10px]">
                                  Colisión
                                </Badge>
                              ) : isDayAvail ? (
                                <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 text-[10px]">
                                  Disponible
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-amber-600 text-[10px]">
                                  Fuera de disp.
                                </Badge>
                              )}
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-0.5">
                <Sparkles className="w-3 h-3 text-primary shrink-0" />
                <span>Asignación flexible: puedes programar diferentes instructores para distintos días o franjas horarias de la misma materia.</span>
              </p>
            </div>

            {/* 4. Selección de Ambiente de Formación */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-1.5">
                <Building className="w-4 h-4 text-primary" />
                Ambiente de Formación (Aula / Laboratorio)
              </Label>
              <Select value={selectedEnvironmentId} onValueChange={setSelectedEnvironmentId}>
                <SelectTrigger className="rounded-xl text-xs bg-card">
                  <SelectValue placeholder="Seleccionar ambiente..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl text-xs">
                  <SelectItem value="NONE" className="cursor-pointer text-muted-foreground">
                    Sin ambiente específico
                  </SelectItem>
                  {environments.map((env) => (
                    <SelectItem key={env.id} value={env.id} className="cursor-pointer">
                      <div className="flex items-center justify-between gap-2 w-full">
                        <span className="font-medium">{env.name}</span>
                        {env.location && (
                          <span className="text-muted-foreground text-[11px]">
                            ({env.location})
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Footer */}
          <DialogFooter className="p-4 border-t border-border/80 bg-muted/20 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="rounded-xl text-xs"
              >
                Cancelar
              </Button>

              {editingCourseScheduleId && onDelete && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    onDelete(editingCourseScheduleId);
                    onOpenChange(false);
                  }}
                  disabled={isSubmitting}
                  className="rounded-xl text-xs gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Eliminar Clase
                </Button>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl text-xs font-semibold bg-primary text-primary-foreground shadow-md gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isSubmitting
                ? "Guardando..."
                : editingCourseScheduleId
                ? "Guardar Cambios"
                : "Guardar Clase en Horario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
