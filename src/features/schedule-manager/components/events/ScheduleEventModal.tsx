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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  GraduationCap,
  School,
  Globe,
  Sparkles,
  AlertCircle,
  Check,
  Palette,
  Link as LinkIcon,
} from "lucide-react";
import { toast } from "sonner";
import { EventAudience, SaveScheduleEventPayload, ScheduleEventItem } from "../../types";
import {
  createScheduleEventAction,
  updateScheduleEventAction,
} from "../../actions/scheduleEventsActions";

interface ScheduleEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: {
    id: string;
    name: string;
    startDate: string; // YYYY-MM-DD or ISO
    endDate: string;   // YYYY-MM-DD or ISO
  };
  groupsList?: Array<{ id: string; name: string }>;
  eventToEdit?: ScheduleEventItem | null;
  defaultDate?: string | null;
  onSuccess: (event: ScheduleEventItem, isEdit: boolean) => void;
}

const COLOR_OPTIONS = [
  { id: "blue", label: "Azul", bg: "bg-blue-500", border: "border-blue-500", text: "text-blue-600 dark:text-blue-400" },
  { id: "emerald", label: "Verde", bg: "bg-emerald-500", border: "border-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
  { id: "purple", label: "Púrpura", bg: "bg-purple-500", border: "border-purple-500", text: "text-purple-600 dark:text-purple-400" },
  { id: "amber", label: "Ámbar", bg: "bg-amber-500", border: "border-amber-500", text: "text-amber-600 dark:text-amber-400" },
  { id: "rose", label: "Rosa", bg: "bg-rose-500", border: "border-rose-500", text: "text-rose-600 dark:text-rose-400" },
  { id: "indigo", label: "Índigo", bg: "bg-indigo-500", border: "border-indigo-500", text: "text-indigo-600 dark:text-indigo-400" },
];

const TIME_OPTIONS_24H_15M: string[] = (() => {
  const list: string[] = [];
  for (let h = 0; h < 24; h++) {
    const hh = String(h).padStart(2, "0");
    for (let m = 0; m < 60; m += 15) {
      const mm = String(m).padStart(2, "0");
      list.push(`${hh}:${mm}`);
    }
  }
  return list;
})();

function getTimeOptions(currentVal?: string, isEndTime?: boolean): string[] {
  const base = [...TIME_OPTIONS_24H_15M];
  if (isEndTime && !base.includes("23:59")) {
    base.push("23:59");
  }
  if (currentVal && !base.includes(currentVal)) {
    base.push(currentVal);
    base.sort();
  }
  return base;
}

export function ScheduleEventModal({
  open,
  onOpenChange,
  schedule,
  groupsList = [],
  eventToEdit,
  defaultDate,
  onSuccess,
}: ScheduleEventModalProps) {
  const minDate = schedule.startDate.split("T")[0];
  const maxDate = schedule.endDate.split("T")[0];

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("10:00");
  const [targetAudience, setTargetAudience] = useState<EventAudience>("PUBLIC");
  const [groupId, setGroupId] = useState<string>("");
  const [location, setLocation] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [color, setColor] = useState("blue");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      if (eventToEdit) {
        setTitle(eventToEdit.title);
        setDescription(eventToEdit.description || "");
        setDate(eventToEdit.date);
        setStartTime(eventToEdit.startTime);
        setEndTime(eventToEdit.endTime);
        setTargetAudience(eventToEdit.targetAudience);
        setGroupId(eventToEdit.groupId || groupsList[0]?.id || "");
        setLocation(eventToEdit.location || "");
        setLinkUrl(eventToEdit.linkUrl || "");
        setColor(eventToEdit.color || "blue");
      } else {
        setTitle("");
        setDescription("");
        const initialDate =
          defaultDate && defaultDate >= minDate && defaultDate <= maxDate
            ? defaultDate
            : minDate;
        setDate(initialDate);
        setStartTime("08:00");
        setEndTime("10:00");
        setTargetAudience("PUBLIC");
        setGroupId(groupsList[0]?.id || "");
        setLocation("");
        setLinkUrl("");
        setColor("blue");
      }
    }
  }, [open, eventToEdit, defaultDate, minDate, maxDate, groupsList]);

  // Validation
  const isDateOutOfRange = Boolean(date && (date < minDate || date > maxDate));
  const isTimeInvalid = Boolean(startTime && endTime && startTime >= endTime);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Por favor ingresa un título para el evento.");
      return;
    }

    if (!date) {
      toast.error("Por favor selecciona la fecha del evento.");
      return;
    }

    if (targetAudience === "GROUP" && !groupId) {
      toast.error("Por favor selecciona la ficha a la que se asigna el evento.");
      return;
    }

    if (isDateOutOfRange) {
      toast.error(
        `La fecha debe estar dentro del periodo del horario (${minDate} al ${maxDate}).`
      );
      return;
    }

    if (isTimeInvalid) {
      toast.error("La hora de inicio debe ser anterior a la hora de fin.");
      return;
    }

    setLoading(true);
    try {
      const payload: SaveScheduleEventPayload = {
        id: eventToEdit?.id,
        academicScheduleId: schedule.id,
        title: title.trim(),
        description: description.trim() || null,
        date,
        startTime,
        endTime,
        targetAudience,
        isGeneral: targetAudience !== "GROUP",
        groupId: targetAudience === "GROUP" ? groupId : null,
        location: location.trim() || null,
        linkUrl: linkUrl.trim() || null,
        color,
      };

      if (eventToEdit) {
        const res = await updateScheduleEventAction(payload);
        if (!res.success || !res.data) {
          toast.error(res.error || "Error al actualizar el evento.");
          return;
        }
        toast.success("Evento actualizado exitosamente.");
        onSuccess(res.data, true);
      } else {
        const res = await createScheduleEventAction(payload);
        if (!res.success || !res.data) {
          toast.error(res.error || "Error al crear el evento.");
          return;
        }
        toast.success("Evento programado exitosamente.");
        onSuccess(res.data, false);
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl sm:max-w-4xl rounded-3xl p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[92vh]">
        <DialogHeader className="space-y-1.5 pb-4 border-b border-border/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl sm:text-2xl font-black text-foreground">
                {eventToEdit ? "Editar Evento del Horario" : "Programar Nuevo Evento"}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                Horario: <span className="font-bold text-foreground">{schedule.name}</span> • Periodo permitido: <span className="font-mono font-bold text-primary">{minDate}</span> al <span className="font-mono font-bold text-primary">{maxDate}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-3">
          {/* Título del Evento */}
          <div className="space-y-1.5">
            <Label htmlFor="event-title" className="text-xs sm:text-sm font-bold flex items-center gap-1">
              Título del Evento <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="event-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Inducción General de Aprendices, Jornada Pedagógica Docente, Cierre de Trimestre..."
              className="rounded-xl h-11 text-sm font-medium"
              required
            />
          </div>

          {/* Audiencia / Dirigido a */}
          <div className="space-y-2">
            <Label className="text-xs sm:text-sm font-bold flex items-center gap-1">
              Público Objetivo / Dirigido a <span className="text-rose-500">*</span>
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => setTargetAudience("PUBLIC")}
                className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all text-center ${
                  targetAudience === "PUBLIC"
                    ? "bg-blue-500/15 border-blue-500 text-blue-700 dark:text-blue-300 shadow-sm ring-2 ring-blue-500/20"
                    : "bg-background hover:bg-muted/70 text-muted-foreground border-border"
                }`}
              >
                <div className="flex items-center gap-1 text-xs">
                  <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>🌐 Público General</span>
                </div>
                <span className="text-[10px] font-normal opacity-80">Toda la comunidad</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetAudience("TEACHERS")}
                className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all text-center ${
                  targetAudience === "TEACHERS"
                    ? "bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-sm ring-2 ring-emerald-500/20"
                    : "bg-background hover:bg-muted/70 text-muted-foreground border-border"
                }`}
              >
                <div className="flex items-center gap-1 text-xs">
                  <School className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>👨‍🏫 Solo Profesores</span>
                </div>
                <span className="text-[10px] font-normal opacity-80">Docentes y claustro</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetAudience("STUDENTS")}
                className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all text-center ${
                  targetAudience === "STUDENTS"
                    ? "bg-purple-500/15 border-purple-500 text-purple-700 dark:text-purple-300 shadow-sm ring-2 ring-purple-500/20"
                    : "bg-background hover:bg-muted/70 text-muted-foreground border-border"
                }`}
              >
                <div className="flex items-center gap-1 text-xs">
                  <GraduationCap className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span>🎓 Solo Estudiantes</span>
                </div>
                <span className="text-[10px] font-normal opacity-80">Todos los aprendices</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetAudience("GROUP")}
                className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all text-center ${
                  targetAudience === "GROUP"
                    ? "bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-300 shadow-sm ring-2 ring-amber-500/20"
                    : "bg-background hover:bg-muted/70 text-muted-foreground border-border"
                }`}
              >
                <div className="flex items-center gap-1 text-xs">
                  <Users className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>🎯 Ficha Específica</span>
                </div>
                <span className="text-[10px] font-normal opacity-80">Grupo / Ficha puntual</span>
              </button>
            </div>

            {targetAudience === "GROUP" && (
              <div className="space-y-1.5 p-3 rounded-2xl bg-amber-500/5 border border-amber-500/20 mt-2">
                <Label className="text-xs font-bold flex items-center gap-1 text-amber-700 dark:text-amber-300">
                  <Users className="w-3.5 h-3.5" /> Selecciona la Ficha del Evento <span className="text-rose-500">*</span>
                </Label>
                <Select value={groupId} onValueChange={setGroupId}>
                  <SelectTrigger className="h-9 text-xs rounded-xl bg-background">
                    <SelectValue placeholder="Selecciona una Ficha" />
                  </SelectTrigger>
                  <SelectContent>
                    {groupsList.map((g) => (
                      <SelectItem key={g.id} value={g.id} className="text-xs font-medium">
                        Ficha {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Fila: Fecha y Horarios (3 Columnas en desktop) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-muted/20 p-4 rounded-2xl border border-border/60">
            {/* Fecha del Evento */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="event-date" className="text-xs font-bold flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-primary" /> Fecha del Evento <span className="text-rose-500">*</span>
                </Label>
              </div>
              <Input
                id="event-date"
                type="date"
                min={minDate}
                max={maxDate}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`rounded-xl font-mono h-10 ${
                  isDateOutOfRange ? "border-rose-500 bg-rose-500/5 focus-visible:ring-rose-500" : ""
                }`}
                required
              />
              <span className="text-[10px] text-muted-foreground block">
                Permitido: {minDate} a {maxDate}
              </span>
            </div>

            {/* Hora Inicio (24 Horas, intervalos de 15 min) */}
            <div className="space-y-1.5">
              <Label htmlFor="start-time" className="text-xs font-bold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-primary" /> Hora Inicio <span className="text-rose-500">*</span>
              </Label>
              <div className="flex items-center gap-2 bg-background dark:bg-muted/40 px-3 py-2 rounded-xl border border-input h-10 shadow-2xs">
                <select
                  id="start-time"
                  value={startTime}
                  onChange={(e) => {
                    const val = e.target.value;
                    setStartTime(val);
                    if (val >= endTime) {
                      const [sh, sm] = val.split(":").map(Number);
                      const newEndMin = Math.min(sh * 60 + sm + 120, 23 * 60 + 45);
                      const ehNew = Math.floor(newEndMin / 60);
                      const emNew = newEndMin % 60;
                      setEndTime(`${String(ehNew).padStart(2, "0")}:${String(emNew).padStart(2, "0")}`);
                    }
                  }}
                  className="w-full bg-transparent font-mono text-sm font-bold text-foreground focus:outline-none cursor-pointer"
                  required
                >
                  {getTimeOptions(startTime, false).map((t) => (
                    <option key={t} value={t} className="bg-background text-foreground font-mono">
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <span className="text-[10px] text-muted-foreground block">Inicio (pasos de 15 min)</span>
            </div>

            {/* Hora Fin (24 Horas, intervalos de 15 min) */}
            <div className="space-y-1.5">
              <Label htmlFor="end-time" className="text-xs font-bold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-primary" /> Hora Fin <span className="text-rose-500">*</span>
              </Label>
              <div
                className={`flex items-center gap-2 bg-background dark:bg-muted/40 px-3 py-2 rounded-xl border h-10 shadow-2xs ${
                  isTimeInvalid ? "border-rose-500 bg-rose-500/5 ring-1 ring-rose-500" : "border-input"
                }`}
              >
                <select
                  id="end-time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-transparent font-mono text-sm font-bold text-foreground focus:outline-none cursor-pointer"
                  required
                >
                  {getTimeOptions(endTime, true).map((t) => (
                    <option key={t} value={t} className="bg-background text-foreground font-mono">
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <span className="text-[10px] text-muted-foreground block">Culminación (pasos de 15 min)</span>
            </div>
          </div>

          {isDateOutOfRange && (
            <p className="text-xs text-rose-600 font-bold flex items-center gap-1 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
              <AlertCircle className="w-4 h-4 shrink-0" />
              La fecha seleccionada ({date}) está fuera del periodo de vigencia del horario ({minDate} al {maxDate}).
            </p>
          )}

          {isTimeInvalid && (
            <p className="text-xs text-rose-600 font-bold flex items-center gap-1 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
              <AlertCircle className="w-4 h-4 shrink-0" />
              La hora de inicio ({startTime}) debe ser anterior a la hora de fin ({endTime}).
            </p>
          )}

          {/* Fila: Lugar y Enlace Virtual (2 Columnas) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Ubicación / Lugar */}
            <div className="space-y-1.5">
              <Label htmlFor="event-location" className="text-xs sm:text-sm font-bold flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-primary" /> Lugar / Ubicación (Opcional)
              </Label>
              <Input
                id="event-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ej: Auditorio Simón Bolívar, Sala 102, Coliseo..."
                className="rounded-xl h-10"
              />
            </div>

            {/* Enlace Compartido / Virtual */}
            <div className="space-y-1.5">
              <Label htmlFor="event-link" className="text-xs sm:text-sm font-bold flex items-center gap-1">
                <LinkIcon className="w-3.5 h-3.5 text-primary" /> Enlace / Reunión Virtual (Opcional)
              </Label>
              <Input
                id="event-link"
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="Ej: https://meet.google.com/abc-defg-hij o enlace web..."
                className="rounded-xl h-10 font-mono text-xs"
              />
            </div>
          </div>

          {/* Fila: Color de Identificación */}
          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm font-bold flex items-center gap-1">
              <Palette className="w-3.5 h-3.5 text-primary" /> Color de Identificación
            </Label>
            <div className="flex items-center gap-2.5 pt-1">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColor(c.id)}
                  title={c.label}
                  className={`w-8 h-8 rounded-xl ${c.bg} flex items-center justify-center transition-transform hover:scale-110 shadow-xs ${
                    color === c.id ? "ring-2 ring-offset-2 ring-primary scale-110 shadow-md" : ""
                  }`}
                >
                  {color === c.id && <Check className="w-4 h-4 text-white stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Descripción / Observaciones */}
          <div className="space-y-1.5">
            <Label htmlFor="event-desc" className="text-xs sm:text-sm font-bold">
              Descripción u Observaciones (Opcional)
            </Label>
            <Textarea
              id="event-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalles sobre el orden del día, requisitos, invitados especiales o instrucciones..."
              rows={3}
              className="rounded-xl resize-none text-xs sm:text-sm p-3"
            />
          </div>

          <DialogFooter className="pt-4 border-t border-border/70 gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="rounded-xl h-10 px-5"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || isDateOutOfRange || isTimeInvalid || !title.trim()}
              className="rounded-xl font-bold bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 h-10 px-6"
            >
              {loading ? "Guardando..." : eventToEdit ? "Guardar Cambios" : "Programar Evento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
