"use client";

import React, { useState, useEffect, useMemo } from "react";
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
import { Calendar, Sparkles, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AcademicScheduleItem, BasicSchedulePayload } from "../types";
import {
  createBasicScheduleAction,
  updateBasicScheduleAction,
} from "../actions/scheduleManagerActions";
import { getTodayColombianDate, formatCalendarDate } from "@/lib/dateUtils";

interface ScheduleBasicModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingSchedule?: AcademicScheduleItem | null;
  existingSchedules?: AcademicScheduleItem[];
  onSuccess: (scheduleId?: string) => void;
  programId?: string;
  programName?: string;
}

export function ScheduleBasicModal({
  open,
  onOpenChange,
  editingSchedule,
  existingSchedules = [],
  onSuccess,
  programId,
  programName,
}: ScheduleBasicModalProps) {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [isActive, setIsActive] = useState<boolean>(true);

  useEffect(() => {
    if (!open) return;
    setServerError(null);

    if (editingSchedule) {
      setName(editingSchedule.name);
      setDescription(editingSchedule.description || "");
      setStartDate(editingSchedule.startDate.slice(0, 10));
      setEndDate(editingSchedule.endDate.slice(0, 10));
      setIsActive(editingSchedule.isActive);
    } else {
      const todayStr = getTodayColombianDate();

      setName("");
      setDescription("");
      setStartDate(todayStr);
      setEndDate(todayStr);
      setIsActive(true);
    }
  }, [open, editingSchedule]);

  // Validar conflicto de fechas en tiempo real contra los horarios existentes
  const dateConflict = useMemo(() => {
    if (!startDate || !endDate || !existingSchedules || existingSchedules.length === 0) {
      return null;
    }

    const start = new Date(startDate + (startDate.includes("T") ? "" : "T00:00:00.000Z"));
    const end = new Date(endDate + (endDate.includes("T") ? "" : "T23:59:59.999Z"));

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return null;
    }

    const formatDate = (d: Date | string) => formatCalendarDate(d, "dd MMM yyyy");

    const conflict = existingSchedules.find((s) => {
      if (editingSchedule && s.id === editingSchedule.id) return false;
      const sStart = new Date(s.startDate);
      const sEnd = new Date(s.endDate);
      // Dos rangos se traslapan si start <= sEnd && end >= sStart
      return start <= sEnd && end >= sStart;
    });

    if (!conflict) return null;

    return {
      scheduleName: conflict.name,
      period: `${formatDate(conflict.startDate)} a ${formatDate(conflict.endDate)}`,
    };
  }, [startDate, endDate, existingSchedules, editingSchedule]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!name.trim()) {
      toast.error("Por favor ingresa el nombre del horario");
      return;
    }
    if (!startDate || !endDate) {
      toast.error("Por favor define las fechas de inicio y fin");
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      toast.error("La fecha de inicio no puede ser posterior a la fecha de fin");
      return;
    }

    if (dateConflict) {
      const msg = `Conflicto de Fechas: Se traslapa con "${dateConflict.scheduleName}" (${dateConflict.period}). Ninguna fecha puede pertenecer a más de un horario.`;
      toast.error(msg);
      setServerError(msg);
      return;
    }

    const effectiveProgram = programId && programId !== "all" && programId !== "ALL" ? programId : undefined;

    const payload: BasicSchedulePayload = {
      name: name.trim(),
      description: description.trim() || null,
      startDate,
      endDate,
      isActive: editingSchedule ? editingSchedule.isActive : isActive,
      programId: effectiveProgram,
    };

    setIsSubmitting(true);
    try {
      if (editingSchedule) {
        const res = await updateBasicScheduleAction(editingSchedule.id, payload);
        if (!res.success) {
          toast.error(res.error || "Error al actualizar el horario");
          setServerError(res.error || "Error al actualizar el horario");
          return;
        }
        toast.success("Horario actualizado exitosamente");
        onSuccess(editingSchedule.id);
      } else {
        const res = await createBasicScheduleAction(payload);
        if (!res.success) {
          toast.error(res.error || "Error al crear el horario");
          setServerError(res.error || "Error al crear el horario");
          return;
        }
        toast.success("Horario creado exitosamente");
        onSuccess(res.scheduleId);
      }
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error al guardar el horario");
      setServerError(err.message || "Error al guardar el horario");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden rounded-3xl border-border bg-background shadow-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col">
          {/* Header */}
          <DialogHeader className="p-6 pb-4 border-b border-border/80 bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-foreground">
                  {editingSchedule ? "Editar Datos del Horario" : "Nuevo Horario Académico"}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {editingSchedule
                    ? "Modifica el nombre, período de fechas o descripción."
                    : "Ingresa el nombre del horario, su fecha de inicio y fecha de fin."}
                </DialogDescription>
                {programName && (
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <Badge
                      variant="secondary"
                      className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-primary/10 text-primary border-primary/20"
                    >
                      Programa: {programName}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </DialogHeader>

          {/* Form Body */}
          <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="sched-name" className="text-sm font-semibold">
                Nombre del Horario <span className="text-destructive">*</span>
              </Label>
              <Input
                id="sched-name"
                placeholder="Ej. Horario Semestre 2026-I, Jornada Diurna..."
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setServerError(null);
                }}
                className="rounded-xl"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sched-startDate" className="text-sm font-semibold">
                  Fecha de Inicio <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="sched-startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setServerError(null);
                  }}
                  className="rounded-xl font-mono text-sm"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sched-endDate" className="text-sm font-semibold">
                  Fecha de Fin <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="sched-endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setServerError(null);
                  }}
                  className="rounded-xl font-mono text-sm"
                  required
                />
              </div>
            </div>

            {/* Alerta de Conflicto de Fechas en Tiempo Real */}
            {dateConflict && (
              <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-200 flex items-start gap-2.5 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="font-semibold text-amber-800 dark:text-amber-300">Conflicto de Fechas detectado</p>
                  <p className="mt-0.5 opacity-90 leading-relaxed">
                    El rango propuesto se traslapa con el horario existente <strong className="font-bold underline decoration-amber-500/50">"{dateConflict.scheduleName}"</strong> ({dateConflict.period}). Ninguna fecha puede pertenecer a más de un horario.
                  </p>
                </div>
              </div>
            )}

            {/* Alerta de Error del Servidor (si ocurre) */}
            {serverError && !dateConflict && (
              <div className="p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2.5 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">No se pudo guardar el horario</p>
                  <p className="mt-0.5 leading-relaxed">{serverError}</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="sched-description" className="text-sm font-semibold">
                Descripción u Observaciones (Opcional)
              </Label>
              <Textarea
                id="sched-description"
                placeholder="Detalles sobre las jornadas, ciclos o directrices del horario..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="rounded-xl min-h-[90px]"
              />
            </div>
          </div>

          {/* Footer */}
          <DialogFooter className="p-4 border-t border-border/80 bg-muted/20 flex flex-row items-center justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="rounded-xl text-xs"
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting || !!dateConflict}
              className="rounded-xl text-xs font-semibold bg-primary text-primary-foreground shadow-md disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-1.5" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  <span>{editingSchedule ? "Guardar Cambios" : "Crear Horario"}</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
