"use client";

import React from "react";
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
import {
  HelpCircle,
  Users,
  UserCheck,
  Sparkles,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock,
  BookOpen,
  CalendarDays,
  FileSpreadsheet,
  FileText,
  ShieldCheck,
  Lock,
  Search,
  ExternalLink,
  Info,
} from "lucide-react";

export type SchedulePanelType = "groups" | "teachers" | "events" | "novelties" | "builder";

interface PanelHelpConfig {
  title: string;
  badge: string;
  badgeColor: string;
  icon: React.ReactNode;
  bgIcon: string;
  subtitle: string;
  features: Array<{
    title: string;
    description: string;
    icon: React.ReactNode;
  }>;
  workflowTip: string;
}

const PANEL_HELP_CONFIG: Record<SchedulePanelType, PanelHelpConfig> = {
  groups: {
    title: "Gestión de Fichas y Franjas Horarias",
    badge: "Panel de Grupos",
    badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    icon: <Users className="w-6 h-6 text-blue-500" />,
    bgIcon: "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400",
    subtitle: "Configura qué grupos de formación participan en este horario y establece sus días y horas de formación.",
    features: [
      {
        title: "Vinculación de Fichas / Grupos",
        description: "Selecciona y asocia los grupos de formación del programa que estarán activos durante la vigencia de este período académico.",
        icon: <Users className="w-4 h-4 text-blue-500" />,
      },
      {
        title: "Definición de Días Lectivos",
        description: "Establece los días de la semana (Lunes a Domingo) en los que cada grupo asiste a formación presencial o virtual.",
        icon: <CalendarDays className="w-4 h-4 text-blue-500" />,
      },
      {
        title: "Franjas Horarias (Inicio y Fin)",
        description: "Configura la jornada exacta (hora de entrada y salida) para cada día. Puedes añadir múltiples franjas por jornada si el grupo tiene descansos o turnos partidos.",
        icon: <Clock className="w-4 h-4 text-blue-500" />,
      },
      {
        title: "Base para el Constructor de Clases",
        description: "Las franjas definidas aquí crean automáticamente la estructura de celdas en el constructor interactivo de horarios donde se ubicarán los instructores y ambientes.",
        icon: <CalendarClock className="w-4 h-4 text-blue-500" />,
      },
    ],
    workflowTip: "Asegúrate de guardar las franjas de cada grupo antes de pasar al constructor de horarios. Si una ficha no tiene franjas activas, no aparecerá disponible en la matriz.",
  },

  teachers: {
    title: "Disponibilidad y Asignación de Instructores",
    badge: "Panel de Instructores",
    badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    icon: <UserCheck className="w-6 h-6 text-emerald-500" />,
    bgIcon: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
    subtitle: "Administra los horarios disponibles de cada instructor y las competencias o materias que pueden impartir.",
    features: [
      {
        title: "Disponibilidad Horaria Semanal",
        description: "Consulta y edita los bloques de tiempo (mañana, tarde o noche) en que cada instructor está disponible para orientar formación.",
        icon: <Clock className="w-4 h-4 text-emerald-500" />,
      },
      {
        title: "Materias y Competencias Habilitadas",
        description: "Activa o desactiva las asignaturas del programa formativo que cada instructor tiene el perfil profesional para impartir.",
        icon: <BookOpen className="w-4 h-4 text-emerald-500" />,
      },
      {
        title: "Trazabilidad por Rol (Instructor vs Gestor)",
        description: "Cada modificación individual queda firmada por el rol que la realizó (Instructor o Gestor), garantizando auditoría clara de los acuerdos de jornada.",
        icon: <ShieldCheck className="w-4 h-4 text-emerald-500" />,
      },
      {
        title: "Bloqueo y Seguridad de Datos",
        description: "Permite bloquear la edición de los instructores una vez concertada la disponibilidad, evitando modificaciones posteriores no autorizadas.",
        icon: <Lock className="w-4 h-4 text-emerald-500" />,
      },
    ],
    workflowTip: "Puedes guardar franjas individuales con el botón '✓ Guardar' de cada tarjeta o usar 'Guardar Cambios' para sincronizar todas las modificaciones del instructor a la vez.",
  },

  events: {
    title: "Cronograma de Eventos Institucionales",
    badge: "Panel de Eventos",
    badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    icon: <Sparkles className="w-6 h-6 text-purple-500" />,
    bgIcon: "bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400",
    subtitle: "Programa y comunica actividades especiales, inducciones, conferencias o reuniones durante este período.",
    features: [
      {
        title: "Programación de Actividades",
        description: "Crea eventos con título, descripción, fecha válida dentro del horario, horas de inicio y fin, ubicación física y enlaces virtuales.",
        icon: <CalendarDays className="w-4 h-4 text-purple-500" />,
      },
      {
        title: "Segmentación por Audiencia",
        description: "Elige quién puede ver el evento: Público General, Solo Instructores, Solo Aprendices o Fichas/Grupos específicos.",
        icon: <Users className="w-4 h-4 text-purple-500" />,
      },
      {
        title: "Vistas Mes y Lista con Búsqueda",
        description: "Explora la agenda en un calendario interactivo mensual con indicadores visuales por audiencia o en una lista ordenada con buscador instantáneo.",
        icon: <Search className="w-4 h-4 text-purple-500" />,
      },
      {
        title: "Integración con Horario de Aprendices e Instructores",
        description: "Los eventos públicos o dirigidos se reflejan automáticamente en la vista de horario semanal de los aprendices e instructores respectivos.",
        icon: <ExternalLink className="w-4 h-4 text-purple-500" />,
      },
    ],
    workflowTip: "Los eventos deben tener una fecha comprendida estrictamente dentro del rango de vigencia de este horario académico.",
  },

  novelties: {
    title: "Control de Novedades y Contingencias",
    badge: "Panel de Novedades",
    badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    icon: <AlertTriangle className="w-6 h-6 text-amber-500" />,
    bgIcon: "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",
    subtitle: "Registra incidencias, suspensiones, cambios de aula o instructores que alteren temporalmente la rutina de clases.",
    features: [
      {
        title: "Suspensiones de Jornada y Festivos",
        description: "Registra días no lectivos, asambleas institucionales o mantenimientos generales que cancelen temporalmente las franjas horarias.",
        icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
      },
      {
        title: "Cambios de Aula y Ambientes",
        description: "Traslada clases de un ambiente a otro en caso de reparaciones, mantenimiento o requerimientos técnicos temporales.",
        icon: <CalendarClock className="w-4 h-4 text-amber-500" />,
      },
      {
        title: "Alcance General o por Ficha",
        description: "Aplica la novedad a todas las fichas del horario o delimítala a un grupo específico con fechas de inicio y retorno.",
        icon: <Users className="w-4 h-4 text-amber-500" />,
      },
      {
        title: "Exportación de Reportes Oficiales",
        description: "Descarga reportes consolidados en formato PDF institucional o Excel con el resumen de todas las contingencias del trimestre.",
        icon: <FileSpreadsheet className="w-4 h-4 text-amber-500" />,
      },
    ],
    workflowTip: "Las novedades activas alertan visualmente en los calendarios mensual y semanal para que coordinadores y gestores conozcan las alteraciones en tiempo real.",
  },

  builder: {
    title: "Constructor y Matriz Oficial de Horarios",
    badge: "Panel de Horario",
    badgeColor: "bg-blue-600/10 text-blue-600 dark:text-blue-400 border-blue-600/20",
    icon: <CalendarClock className="w-6 h-6 text-blue-600 dark:text-blue-400" />,
    bgIcon: "bg-blue-600/10 border-blue-600/20 text-blue-600 dark:text-blue-400",
    subtitle: "Matriz interactiva para asignar asignaturas, instructores y ambientes de formación sin solapamientos.",
    features: [
      {
        title: "Matriz de Asignación Semanal",
        description: "Organiza las materias de cada ficha en su respectiva franja horaria arrastrando o seleccionando el instructor y ambiente adecuado.",
        icon: <CalendarDays className="w-4 h-4 text-blue-600" />,
      },
      {
        title: "Detección de Colisiones y Cruces",
        description: "El sistema valida en tiempo real que ningún instructor ni aula de formación tenga dos clases asignadas a la misma hora.",
        icon: <ShieldCheck className="w-4 h-4 text-blue-600" />,
      },
      {
        title: "Control de Intensidad Horaria",
        description: "Monitorea las horas programadas por materia frente a las horas requeridas del trimestre y la carga laboral semanal del instructor.",
        icon: <Clock className="w-4 h-4 text-blue-600" />,
      },
      {
        title: "Exportación Oficial en PDF y Excel",
        description: "Genera el consolidado general de fichas o los horarios individuales por instructor listos para imprimir o remitir a coordinación.",
        icon: <FileText className="w-4 h-4 text-blue-600" />,
      },
    ],
    workflowTip: "Antes de publicar el horario oficial a los aprendices, verifica que no queden horas pendientes por asignar y que ningún instructor exceda su tope semanal.",
  },
};

interface SchedulePanelHelpModalProps {
  panel: SchedulePanelType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduleName?: string;
}

export function SchedulePanelHelpModal({
  panel,
  open,
  onOpenChange,
  scheduleName,
}: SchedulePanelHelpModalProps) {
  const config = PANEL_HELP_CONFIG[panel] || PANEL_HELP_CONFIG.groups;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-6xl xl:max-w-7xl max-h-[84vh] flex flex-col p-0 overflow-hidden rounded-3xl border border-border/80 shadow-2xl bg-card">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border/70 bg-muted/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 shadow-xs ${config.bgIcon}`}>
              {config.icon}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-base sm:text-lg font-black text-foreground tracking-tight">
                  {config.title}
                </DialogTitle>
                <Badge className={`text-[10px] font-bold border ${config.badgeColor}`}>
                  {config.badge}
                </Badge>
                {scheduleName && (
                  <Badge variant="outline" className="text-[10px] font-mono font-semibold">
                    {scheduleName}
                  </Badge>
                )}
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {config.subtitle}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto max-h-[50vh] sm:max-h-[52vh] pr-4 scrollbar-thin">
          <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-primary" /> ¿Qué puedes hacer en este panel?
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {config.features.map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl border border-border/70 bg-card/60 hover:bg-muted/20 hover:border-primary/30 transition-all space-y-2 shadow-2xs flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      {item.icon}
                    </div>
                    <h5 className="font-extrabold text-xs text-foreground tracking-tight">
                      {item.title}
                    </h5>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Practical Advice Banner */}
          <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20 flex items-start gap-3 text-xs text-muted-foreground">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="space-y-0.5 min-w-0">
              <span className="font-bold text-foreground block text-xs">
                Recomendación práctica:
              </span>
              <p className="leading-relaxed text-[11px]">
                {config.workflowTip}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-3 px-5 border-t border-border/70 bg-muted/20 flex flex-row items-center justify-between shrink-0">
          <span className="text-xs text-muted-foreground font-medium hidden sm:inline-block">
            AcademiX • Guía Interactiva del Módulo
          </span>
          <Button
            onClick={() => onOpenChange(false)}
            className="rounded-xl px-5 font-bold shadow-xs ml-auto text-xs h-8 cursor-pointer"
          >
            Entendido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
