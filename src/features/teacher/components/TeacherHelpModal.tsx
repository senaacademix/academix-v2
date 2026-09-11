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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  HelpCircle,
  ClipboardList,
  Users,
  AlertTriangle,
  FileText,
  GraduationCap,
  BookOpen,
  BarChart3,
  Calendar,
  Clock,
  Dices,
  Shuffle,
  Mail,
  FileSpreadsheet,
  CheckCircle2,
  Sparkles,
  Search,
  ExternalLink,
  RotateCcw,
  Percent,
} from "lucide-react";

export type TeacherTabKey =
  | "attendance"
  | "students"
  | "remarks"
  | "improvement"
  | "grades"
  | "documentation"
  | "analytics"
  | "schedule";

interface TabHelpConfig {
  key: TeacherTabKey;
  tabLabel: string;
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

const TEACHER_TABS_HELP_CONFIG: Record<TeacherTabKey, TabHelpConfig> = {
  attendance: {
    key: "attendance",
    tabLabel: "Asistencia",
    title: "Control Diario y Matriz de Asistencia",
    badge: "Módulo: Toma de Asistencia",
    badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    icon: <ClipboardList className="w-5 h-5 text-emerald-500" />,
    bgIcon: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
    subtitle: "Registro en tiempo real de presencia, inasistencias justificadas o injustificadas y retardos de cada aprendiz.",
    features: [
      {
        title: "Toma Rápida por Estudiante",
        description: "Marca el estado con un clic: Presente (verde), Falta Injustificada (rojo), Falta Justificada (amarillo) o Retardo (naranja).",
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
      },
      {
        title: "Marcado Masivo",
        description: "Usa el botón 'Todos Presentes' para agilizar la toma al inicio de la jornada y solo registrar las excepciones.",
        icon: <Users className="w-4 h-4 text-emerald-500" />,
      },
      {
        title: "Gestión de Justificaciones",
        description: "Revisa los enlaces a soportes médicos o laborales cargados por los estudiantes y valida si procede la excusa.",
        icon: <ExternalLink className="w-4 h-4 text-emerald-500" />,
      },
      {
        title: "Matriz Histórica de Asistencia",
        description: "Visualiza la cuadrícula completa de todas las sesiones de clase del trimestre con totales de inasistencias por aprendiz.",
        icon: <Calendar className="w-4 h-4 text-emerald-500" />,
      },
      {
        title: "Exportación a Excel y PDF",
        description: "Descarga reportes oficiales de asistencia listos para control de coordinación académica o auditorías SENA.",
        icon: <FileSpreadsheet className="w-4 h-4 text-emerald-500" />,
      },
      {
        title: "Alertas por Límite de Faltas",
        description: "El sistema resalta en color crítico a los aprendices que se acercan al porcentaje máximo de inasistencias no justificadas.",
        icon: <AlertTriangle className="w-4 h-4 text-emerald-500" />,
      },
    ],
    workflowTip: "Toma asistencia al iniciar o finalizar la franja horaria. Guarda los cambios con el botón flotante y exporta la matriz mensual para tener respaldo físico o digital.",
  },

  students: {
    key: "students",
    tabLabel: "Estudiantes",
    title: "Directorio de Aprendices y Dinámicas de Aula",
    badge: "Módulo: Directorio y Dinámicas",
    badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    icon: <Users className="w-5 h-5 text-blue-500" />,
    bgIcon: "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400",
    subtitle: "Listado de estudiantes matriculados en la ficha, herramientas interactivas de participación y comunicación directa.",
    features: [
      {
        title: "Búsqueda y Filtros Rápidos",
        description: "Encuentra aprendices al instante por nombres, apellidos o número de documento de identidad.",
        icon: <Search className="w-4 h-4 text-blue-500" />,
      },
      {
        title: "Ruleta de Participación Aleatoria",
        description: "Lanza la ruleta para seleccionar aprendices al azar para exposiciones, preguntas de control o resolución de ejercicios.",
        icon: <Dices className="w-4 h-4 text-blue-500" />,
      },
      {
        title: "Generador Automático de Grupos",
        description: "Organiza equipos de trabajo de 2 a 6 integrantes de forma equitativa o arrastra estudiantes manualmente.",
        icon: <Shuffle className="w-4 h-4 text-blue-500" />,
      },
      {
        title: "Envío Masivo de Correo",
        description: "Selecciona aprendices o toda la ficha y abre tu cliente de correo con las direcciones cargadas automáticamente.",
        icon: <Mail className="w-4 h-4 text-blue-500" />,
      },
      {
        title: "Información de Contacto y Novedades",
        description: "Consulta el correo institucional, teléfono y las novedades activas (cambio de ficha, aplazamiento, etc.).",
        icon: <Sparkles className="w-4 h-4 text-blue-500" />,
      },
      {
        title: "Restablecimiento de Clave Doc",
        description: "Ayuda a los estudiantes que olvidaron su clave restableciéndola a su número de documento en un solo clic.",
        icon: <RotateCcw className="w-4 h-4 text-blue-500" />,
      },
    ],
    workflowTip: "Aprovecha la Ruleta y el Creador de Grupos para dinamizar tus sesiones de formación presencial y virtual, fomentando el trabajo colaborativo.",
  },

  remarks: {
    key: "remarks",
    tabLabel: "Observaciones",
    title: "Observaciones Disciplinarias y Seguimiento Formativo",
    badge: "Módulo: Observaciones",
    badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
    bgIcon: "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",
    subtitle: "Registro de anotaciones de comportamiento, llamados de atención verbales o felicitaciones con acuse de recibo.",
    features: [
      {
        title: "Registro de Anotaciones",
        description: "Crea observaciones individuales o grupales categorizadas por tipo (Llamado de atención, Felicitación, Compromiso).",
        icon: <FileText className="w-4 h-4 text-amber-500" />,
      },
      {
        title: "Plantillas Rápidas Predefinidas",
        description: "Utiliza y administra plantillas de texto frecuentes (uso indebido de celular, porte de uniforme, participación destacada).",
        icon: <ClipboardList className="w-4 h-4 text-amber-500" />,
      },
      {
        title: "Acuse de Lectura del Aprendiz",
        description: "Verifica si el estudiante ya abrió y leyó la observación registrada en su panel personal.",
        icon: <CheckCircle2 className="w-4 h-4 text-amber-500" />,
      },
      {
        title: "Historial Cronológico de Anotaciones",
        description: "Consulta todos los registros disciplinarios previos para sustentar comités de evaluación y seguimiento.",
        icon: <Clock className="w-4 h-4 text-amber-500" />,
      },
      {
        title: "Notificación Automática",
        description: "El aprendiz recibe una alerta inmediata en su portal informando la novedad registrada por el docente.",
        icon: <Mail className="w-4 h-4 text-amber-500" />,
      },
      {
        title: "Retiro y Corrección de Anotaciones",
        description: "Posibilidad de retirar o anular anotaciones que hayan sido superadas o ingresadas por error involuntario.",
        icon: <RotateCcw className="w-4 h-4 text-amber-500" />,
      },
    ],
    workflowTip: "Sé específico y descriptivo en las anotaciones. Esta información es la base documental para los Comités de Evaluación de Centro.",
  },

  improvement: {
    key: "improvement",
    tabLabel: "Planes de Mejoramiento",
    title: "Planes de Mejoramiento Académico y Recuperaciones",
    badge: "Módulo: Planes de Mejoramiento",
    badgeColor: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    icon: <FileText className="w-5 h-5 text-indigo-500" />,
    bgIcon: "bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400",
    subtitle: "Gestión paso a paso de planes de nivelación académica para aprendices con resultados pendientes o por mejorar.",
    features: [
      {
        title: "Asignación de Actividades de Nivelación",
        description: "Redacta las competencias no alcanzadas, actividades a desarrollar y fecha límite estricta de entrega.",
        icon: <BookOpen className="w-4 h-4 text-indigo-500" />,
      },
      {
        title: "Firma Digital de Compromiso",
        description: "Flujo formal donde el aprendiz revisa y firma digitalmente el compromiso antes de iniciar la entrega.",
        icon: <CheckCircle2 className="w-4 h-4 text-indigo-500" />,
      },
      {
        title: "Recepción de Enlaces y Evidencias",
        description: "Recibe los enlaces de Google Drive, GitHub o documentos con las evidencias de recuperación cargadas por el estudiante.",
        icon: <ExternalLink className="w-4 h-4 text-indigo-500" />,
      },
      {
        title: "Evaluación y Calificación Final",
        description: "Emite el concepto final (Aprobado / No Aprobado) y califica la superación de la competencia formativa.",
        icon: <GraduationCap className="w-4 h-4 text-indigo-500" />,
      },
      {
        title: "Firma del Instructor y Cierre",
        description: "Cierra el acta del plan con la firma docente y genera el soporte en PDF para archivo institucional.",
        icon: <FileSpreadsheet className="w-4 h-4 text-indigo-500" />,
      },
      {
        title: "Reinicio o Corrección de Pasos",
        description: "Devuelve el plan a un paso previo si el aprendiz debe corregir su soporte o evidencia antes de evaluar.",
        icon: <RotateCcw className="w-4 h-4 text-indigo-500" />,
      },
    ],
    workflowTip: "Fija plazos de entrega realistas y asegúrate de calificar el plan antes del cierre trimestral para actualizar el libro de calificaciones.",
  },

  grades: {
    key: "grades",
    tabLabel: "Calificaciones",
    title: "Evaluación por Competencias y Registro de Notas",
    badge: "Módulo: Calificaciones",
    badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    icon: <GraduationCap className="w-5 h-5 text-purple-500" />,
    bgIcon: "bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400",
    subtitle: "Configuración de actividades evaluativas, ponderación porcentual y consolidado de notas por cortes académicos.",
    features: [
      {
        title: "Creación de Actividades Evaluativas",
        description: "Crea tareas, talleres, quices y proyectos vinculados a los resultados de aprendizaje del programa.",
        icon: <BookOpen className="w-4 h-4 text-purple-500" />,
      },
      {
        title: "Ponderaciones y Cortes",
        description: "Define el peso porcentual de cada actividad dentro de la materia para el cálculo automático de la nota final.",
        icon: <Percent className="w-4 h-4 text-purple-500" />,
      },
      {
        title: "Calificación Individual y Grupal",
        description: "Ingresa notas cuantitativas (0.0 a 5.0) y retroalimentación pedagógica personalizada para cada aprendiz.",
        icon: <CheckCircle2 className="w-4 h-4 text-purple-500" />,
      },
      {
        title: "Consolidado de Promedios",
        description: "Visualiza en tiempo real el promedio ponderado de la ficha y el porcentaje de aprobación general.",
        icon: <BarChart3 className="w-4 h-4 text-purple-500" />,
      },
      {
        title: "Recepción de Entregas Digitales",
        description: "Revisa los enlaces de proyectos enviados directamente por los aprendices desde su interfaz de estudiante.",
        icon: <ExternalLink className="w-4 h-4 text-purple-500" />,
      },
      {
        title: "Exportación de Sábana de Notas",
        description: "Descarga la planilla de calificaciones completa en Excel para archivar en las actas de finalización de curso.",
        icon: <FileSpreadsheet className="w-4 h-4 text-purple-500" />,
      },
    ],
    workflowTip: "Publica las notas con retroalimentación oportuna para que los aprendices que requieran refuerzo puedan iniciar un plan de mejoramiento a tiempo.",
  },

  documentation: {
    key: "documentation",
    tabLabel: "Documentación",
    title: "Repositorio de Guías, Enlaces y Material de Clase",
    badge: "Módulo: Recursos y Enlaces",
    badgeColor: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
    icon: <BookOpen className="w-5 h-5 text-cyan-500" />,
    bgIcon: "bg-cyan-500/10 border-cyan-500/20 text-cyan-600 dark:text-cyan-400",
    subtitle: "Publicación de enlaces a guías curriculares, carpetas de Drive, repositorios de código y material didáctico.",
    features: [
      {
        title: "Publicación de Enlaces de Acceso",
        description: "Comparte enlaces directos a carpetas compartidas de Google Drive, OneDrive, Teams o repositorios de GitHub.",
        icon: <ExternalLink className="w-4 h-4 text-cyan-500" />,
      },
      {
        title: "Visibilidad Inmediata para Aprendices",
        description: "Los recursos añadidos quedan accesibles de inmediato en la pestaña de documentación de todos los aprendices de la ficha.",
        icon: <Users className="w-4 h-4 text-cyan-500" />,
      },
      {
        title: "Categorización de Materiales",
        description: "Organiza el material por unidades temáticas, guías de aprendizaje y lecturas complementarias.",
        icon: <Sparkles className="w-4 h-4 text-cyan-500" />,
      },
      {
        title: "Actualización Continua",
        description: "Modifica o añade nuevos vínculos durante el trimestre a medida que avanza la programación temática.",
        icon: <RotateCcw className="w-4 h-4 text-cyan-500" />,
      },
    ],
    workflowTip: "Centraliza aquí los enlaces a tus diapositivas y guías de taller para evitar que los estudiantes pierdan los vínculos en chats informales.",
  },

  analytics: {
    key: "analytics",
    tabLabel: "Analítica",
    title: "Analítica del Grupo y Diagnóstico de Rendimiento",
    badge: "Módulo: Métricas y Diagnóstico",
    badgeColor: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    icon: <BarChart3 className="w-5 h-5 text-rose-500" />,
    bgIcon: "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400",
    subtitle: "Estadísticas avanzadas de presencialidad, porcentaje de retención, distribución de notas y alertas de deserción.",
    features: [
      {
        title: "Tasa Global de Asistencia",
        description: "Visualiza el porcentaje de asistencia promedio de toda la ficha a lo largo de las semanas lectivas.",
        icon: <Percent className="w-4 h-4 text-rose-500" />,
      },
      {
        title: "Radar de Aprendices en Riesgo",
        description: "Identifica rápidamente a los estudiantes con acumulación crítica de faltas o rendimiento académico bajo.",
        icon: <AlertTriangle className="w-4 h-4 text-rose-500" />,
      },
      {
        title: "Comparativa por Sesiones",
        description: "Compara el comportamiento de asistencia entre días de la semana y diferentes jornadas de formación.",
        icon: <Calendar className="w-4 h-4 text-rose-500" />,
      },
      {
        title: "Reportes Listos para Coordinación",
        description: "Gráficas e indicadores ejecutivos listos para sustentar el avance del grupo en reuniones de área.",
        icon: <FileSpreadsheet className="w-4 h-4 text-rose-500" />,
      },
    ],
    workflowTip: "Revisa la analítica cada dos semanas para detectar aprendices en riesgo antes de que alcancen el límite de inasistencias o pierdan la materia.",
  },

  schedule: {
    key: "schedule",
    tabLabel: "Mi Horario",
    title: "Horario Semanal, Disponibilidad y Asignaturas",
    badge: "Módulo: Horarios y Franjas",
    badgeColor: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
    icon: <Calendar className="w-5 h-5 text-teal-500" />,
    bgIcon: "bg-teal-500/10 border-teal-500/20 text-teal-600 dark:text-teal-400",
    subtitle: "Visualización de franjas horarias asignadas, ambientes de formación asignados y configuración de disponibilidad docente.",
    features: [
      {
        title: "Calendario Semanal Interactivo",
        description: "Revisa los días, bloques de horas, fichas y ambientes donde debes impartir tus clases.",
        icon: <Calendar className="w-4 h-4 text-teal-500" />,
      },
      {
        title: "Detalle del Ambiente y Ficha",
        description: "Haz clic en cada bloque para conocer el aula o taller asignado, capacidad y código de la ficha.",
        icon: <Users className="w-4 h-4 text-teal-500" />,
      },
      {
        title: "Configuración de Disponibilidad Semanal",
        description: "Declara las franjas horarias en las que te encuentras disponible para que coordinación planifique sin cruces.",
        icon: <Clock className="w-4 h-4 text-teal-500" />,
      },
      {
        title: "Materias y Competencias Habilitadas",
        description: "Consulta las asignaturas que tienes asignadas y certificadas para dictar durante el ciclo lectivo.",
        icon: <BookOpen className="w-4 h-4 text-teal-500" />,
      },
    ],
    workflowTip: "Verifica periódicamente tu horario semanal ante cualquier reasignación de ambiente o ajuste de franja realizado por la coordinación académica.",
  },
};

interface TeacherHelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: TeacherTabKey;
}

export function TeacherHelpModal({
  open,
  onOpenChange,
  initialTab = "attendance",
}: TeacherHelpModalProps) {
  const [selectedTab, setSelectedTab] = useState<TeacherTabKey>(initialTab);

  useEffect(() => {
    if (open) {
      setSelectedTab(initialTab);
    }
  }, [open, initialTab]);

  const currentConfig = TEACHER_TABS_HELP_CONFIG[selectedTab] || TEACHER_TABS_HELP_CONFIG.attendance;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-6xl xl:max-w-7xl max-h-[84vh] flex flex-col p-0 overflow-hidden rounded-3xl border border-border/80 shadow-2xl bg-card">
        {/* Modal Header */}
        <DialogHeader className="p-4 sm:p-5 pb-3 bg-muted/30 border-b border-border/70 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-2xs">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <DialogTitle className="text-base sm:text-lg font-black text-foreground tracking-tight flex items-center gap-2">
                  <span>¿Qué puedo hacer en este panel?</span>
                  <Badge variant="outline" className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-lg ${currentConfig.badgeColor}`}>
                    {currentConfig.badge}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Guía de herramientas, buenas prácticas y flujo de trabajo para el docente.
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Interactive Tab Selector Inside Modal */}
          <Tabs
            value={selectedTab}
            onValueChange={(val) => setSelectedTab(val as TeacherTabKey)}
            className="w-full mt-3"
          >
            <TabsList className="w-full flex overflow-x-auto bg-muted/50 p-1 rounded-2xl scrollbar-none justify-start sm:justify-center gap-1 h-auto">
              {(Object.keys(TEACHER_TABS_HELP_CONFIG) as TeacherTabKey[]).map((tabKey) => {
                const cfg = TEACHER_TABS_HELP_CONFIG[tabKey];
                return (
                  <TabsTrigger
                    key={tabKey}
                    value={tabKey}
                    className="rounded-xl text-xs font-bold flex-1 shrink-0 gap-1.5 py-1.5 px-3 data-[state=active]:shadow-sm"
                  >
                    {cfg.tabLabel}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </DialogHeader>

        {/* Modal Body - Wide & not so tall with balanced scrolling */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto max-h-[50vh] sm:max-h-[52vh] scrollbar-thin">
          {/* Active Tab Banner */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-muted/30 border border-border/70 flex items-center gap-3.5">
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-xs ${currentConfig.bgIcon}`}>
              {currentConfig.icon}
            </div>
            <div className="space-y-0.5 min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-foreground">
                {currentConfig.title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {currentConfig.subtitle}
              </p>
            </div>
          </div>

          {/* Features Grid (3 Columns on large screens) */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block px-1">
              Funcionalidades y Capacidades Principales:
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
              {currentConfig.features.map((feat, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-card border border-border/70 hover:border-primary/40 transition-colors flex items-start gap-2.5 shadow-2xs"
                >
                  <div className="w-7 h-7 rounded-lg bg-muted/60 border border-border/50 flex items-center justify-center shrink-0 mt-0.5">
                    {feat.icon}
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <h4 className="text-xs font-bold text-foreground">
                      {feat.title}
                    </h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {feat.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Workflow Recommendation Box */}
          <div className="p-3 rounded-2xl bg-primary/5 border border-primary/20 flex items-start gap-2.5 text-xs text-muted-foreground">
            <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="space-y-0.5 min-w-0">
              <span className="font-bold text-foreground block text-xs">
                💡 Consejo de Trabajo Recomendado:
              </span>
              <p className="leading-relaxed text-[11px]">
                {currentConfig.workflowTip}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-3 px-5 border-t border-border/70 bg-muted/20 flex flex-row items-center justify-between shrink-0">
          <span className="text-xs text-muted-foreground font-medium hidden sm:inline-block">
            AcademiX • Guía del Docente
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
