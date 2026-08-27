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
import { Calendar, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AcademicScheduleItem, BasicSchedulePayload } from "../types";
import {
  createBasicScheduleAction,
  updateBasicScheduleAction,
} from "../actions/scheduleManagerActions";

interface ScheduleBasicModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingSchedule?: AcademicScheduleItem | null;
  onSuccess: (scheduleId?: string) => void;
}

export function ScheduleBasicModal({
  open,
  onOpenChange,
  editingSchedule,
  onSuccess,
}: ScheduleBasicModalProps) {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form Fields
  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [isActive, setIsActive] = useState<boolean>(true);

  useEffect(() => {
    if (!open) return;

    if (editingSchedule) {
      setName(editingSchedule.name);
      setDescription(editingSchedule.description || "");
      setStartDate(editingSchedule.startDate.slice(0, 10));
      setEndDate(editingSchedule.endDate.slice(0, 10));
      setIsActive(editingSchedule.isActive);
    } else {
      const today = new Date();
      const nextSemester = new Date();
      nextSemester.setMonth(today.getMonth() + 6);

      setName("");
      setDescription("");
      setStartDate(today.toISOString().slice(0, 10));
      setEndDate(nextSemester.toISOString().slice(0, 10));
      setIsActive(true);
    }
  }, [open, editingSchedule]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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

    const payload: BasicSchedulePayload = {
      name: name.trim(),
      description: description.trim() || null,
      startDate,
      endDate,
      isActive: editingSchedule ? editingSchedule.isActive : isActive,
    };

    setIsSubmitting(true);
    try {
      if (editingSchedule) {
        await updateBasicScheduleAction(editingSchedule.id, payload);
        toast.success("Horario actualizado exitosamente");
        onSuccess(editingSchedule.id);
      } else {
        const res = await createBasicScheduleAction(payload);
        toast.success("Horario creado exitosamente");
        onSuccess(res.scheduleId);
      }
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error al guardar el horario");
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
                onChange={(e) => setName(e.target.value)}
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
                  onChange={(e) => setStartDate(e.target.value)}
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
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-xl font-mono text-sm"
                  required
                />
              </div>
            </div>

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
              disabled={isSubmitting}
              className="rounded-xl text-xs font-semibold bg-primary text-primary-foreground shadow-md"
            >
              {isSubmitting
                ? "Guardando..."
                : editingSchedule
                ? "Guardar Cambios"
                : "Crear Horario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
