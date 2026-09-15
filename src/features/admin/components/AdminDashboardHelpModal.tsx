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
  Activity,
  FolderKanban,
  Users,
  CalendarClock,
  Settings,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Layers,
  GraduationCap,
  Building2,
  UserCheck,
  RotateCcw,
  BarChart3,
  Sliders,
} from "lucide-react";

export type AdminDashboardTabKey = "overview" | "programs" | "users" | "schedules" | "settings";

interface TabHelpConfig {
  key: AdminDashboardTabKey;
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

const ADMIN_DASHBOARD_HELP_CONFIG: Record<AdminDashboardTabKey, TabHelpConfig> = {
  overview: {
    key: "overview",
    tabLabel: "Métricas y KPIs",
    title: "Panel Ejecutivo y Métricas en Tiempo Real",
    badge: "Módulo: Control Institucional",
    badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    icon: <Activity className="w-5 h-5 text-blue-500" />,
    bgIcon: "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400",
    subtitle: "Consolidado institucional de aprendices matriculados, instructores activos, fichas vigentes y programas.",
    features: [
      {
        title: "Tarjetas de Indicadores Clave",
        description: "Monitorea en tiempo real el censo de aprendices, fichas activas, competencias y instructores vinculados.",
        icon: <BarChart3 className="w-4 h-4 text-blue-500" />,
      },
      {
        title: "Distribución Poblacional",
        description: "Visualiza gráficas de distribución de roles (coordinadores, gestores e instructores).",
        icon: <Users className="w-4 h-4 text-blue-500" />,
      },
      {
        title: "Registro de Actividad Reciente",
        description: "Audita las últimas acciones ejecutadas en la plataforma como creación de fichas, asignación de instructores y cambios de estado.",
        icon: <Activity className="w-4 h-4 text-blue-500" />,
      },
      {
        title: "Atajos a Módulos Operativos",
        description: "Accede con un solo clic a la gestión de usuarios, malla curricular, horarios y configuración institucional.",
        icon: <Sparkles className="w-4 h-4 text-blue-500" />,
      },
    ],
    workflowTip: "Revisa este panel al inicio de cada jornada para supervisar el crecimiento de matrículas y detectar novedades institucionales.",
  },

  programs: {
    key: "programs",
    tabLabel: "Programas",
    title: "Programas de Formación y Navegación Curricular",
    badge: "Módulo: Programas",
    badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    icon: <FolderKanban className="w-5 h-5 text-emerald-500" />,
    bgIcon: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
    subtitle: "Selección y monitoreo de programas asignados a gestores o administración global de mallas curriculares.",
    features: [
      {
        title: "Selector de Programa para Gestores",
        description: "Si eres Gestor Académico, filtra todo el sistema seleccionando el programa de formación que tienes a cargo.",
        icon: <FolderKanban className="w-4 h-4 text-emerald-500" />,
      },
      {
        title: "Métricas por Programa",
        description: "Conoce el conteo específico de aprendices, asignaturas e instructores de cada programa de formación.",
        icon: <Layers className="w-4 h-4 text-emerald-500" />,
      },
      {
        title: "Cambio Rápido de Contexto",
        description: "Alterna fácilmente entre los diferentes programas asignados usando el botón 'Cambiar Programa'.",
        icon: <RotateCcw className="w-4 h-4 text-emerald-500" />,
      },
    ],
    workflowTip: "Para el rol Gestor, seleccionar un programa adapta instantáneamente las vistas de usuarios, mallas y horarios a ese programa.",
  },

  users: {
    key: "users",
    tabLabel: "Usuarios",
    title: "Gestión Unificada de Población Académica",
    badge: "Módulo: Población",
    badgeColor: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    icon: <Users className="w-5 h-5 text-indigo-500" />,
    bgIcon: "bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400",
    subtitle: "Control de aprendices, instructores, gestores y directivos con carga masiva de Excel y restablecimiento de claves.",
    features: [
      {
        title: "Directorio Segmentado por Roles",
        description: "Gestiona de manera independiente a aprendices, instructores, planes de mejoramiento y administradores.",
        icon: <Users className="w-4 h-4 text-indigo-500" />,
      },
      {
        title: "Importación Masiva de Matrícula",
        description: "Carga cientos de aprendices e instructores en segundos mediante archivos de plantilla Excel.",
        icon: <CheckCircle2 className="w-4 h-4 text-indigo-500" />,
      },
      {
        title: "Asignación de Fichas y Estados",
        description: "Vincula aprendices a sus fichas respectivas y actualiza estados de formación (Lectiva, Productiva, Retirado).",
        icon: <GraduationCap className="w-4 h-4 text-indigo-500" />,
      },
      {
        title: "Seguridad y Accesos",
        description: "Restablece contraseñas a número de documento y gestiona permisos de acceso al sistema.",
        icon: <ShieldCheck className="w-4 h-4 text-indigo-500" />,
      },
    ],
    workflowTip: "Usa la pestaña 'Usuarios' para mantener las listas de clase sincronizadas antes del inicio de cada trimestre formativo.",
  },

  schedules: {
    key: "schedules",
    tabLabel: "Horarios",
    title: "Planificación de Horarios, Aulas y Eventos",
    badge: "Módulo: Horarios",
    badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    icon: <CalendarClock className="w-5 h-5 text-amber-500" />,
    bgIcon: "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",
    subtitle: "Programación semanal de franjas horarias con validación automática de solapamientos entre instructores y aulas.",
    features: [
      {
        title: "Creación de Horarios con Vigencia",
        description: "Define horarios con fecha de inicio, fin y días de la semana sincronizados con el calendario escolar.",
        icon: <CalendarClock className="w-4 h-4 text-amber-500" />,
      },
      {
        title: "Prevención de Cruces",
        description: "Algoritmo en tiempo real que alerta si un instructor o aula ya se encuentra ocupado en esa franja.",
        icon: <Building2 className="w-4 h-4 text-amber-500" />,
      },
      {
        title: "Gestión de Eventos Institucionales",
        description: "Programa suspensiones de clase, izadas de bandera o jornadas pedagógicas con impacto en el horario.",
        icon: <Activity className="w-4 h-4 text-amber-500" />,
      },
    ],
    workflowTip: "Asegúrate de que las fechas de vigencia del horario coincidan con el trimestre oficial para habilitar la toma de asistencia de instructores.",
  },

  settings: {
    key: "settings",
    tabLabel: "Configuración",
    title: "Ajustes del Sistema y Políticas Institucionales",
    badge: "Módulo: Parámetros del Sistema",
    badgeColor: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
    icon: <Settings className="w-5 h-5 text-cyan-500" />,
    bgIcon: "bg-cyan-500/10 border-cyan-500/20 text-cyan-600 dark:text-cyan-400",
    subtitle: "Configuración de límites de acceso diario para aprendices, temas visuales y parámetros institucionales.",
    features: [
      {
        title: "Límite Diario de Accesos a Aprendices",
        description: "Configura el número máximo de sesiones diarias permitidas para los aprendices (control de congestión y hábitos).",
        icon: <Sliders className="w-4 h-4 text-cyan-500" />,
      },
      {
        title: "Períodos y Fechas Globales",
        description: "Establece las fechas oficiales de apertura y cierre de semestres o trimestres lectivos.",
        icon: <CalendarClock className="w-4 h-4 text-cyan-500" />,
      },
      {
        title: "Personalización Visual",
        description: "Configura la paleta de colores y estilos institucionales adaptables a modo claro y oscuro.",
        icon: <Sparkles className="w-4 h-4 text-cyan-500" />,
      },
    ],
    workflowTip: "Solo los administradores globales tienen privilegios para modificar los parámetros de configuración y límites del sistema.",
  },
};

interface AdminDashboardHelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: AdminDashboardTabKey;
}

export function AdminDashboardHelpModal({
  open,
  onOpenChange,
  initialTab = "overview",
}: AdminDashboardHelpModalProps) {
  const [selectedTab, setSelectedTab] = useState<AdminDashboardTabKey>(initialTab);

  useEffect(() => {
    if (open) {
      setSelectedTab(initialTab);
    }
  }, [open, initialTab]);

  const currentConfig = ADMIN_DASHBOARD_HELP_CONFIG[selectedTab] || ADMIN_DASHBOARD_HELP_CONFIG.overview;

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
                  Guía de administración, monitoreo de indicadores y gestión para Coordinadores y Gestores.
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Interactive Tab Selector Inside Modal */}
          <Tabs
            value={selectedTab}
            onValueChange={(val) => setSelectedTab(val as AdminDashboardTabKey)}
            className="w-full mt-3"
          >
            <TabsList className="w-full flex overflow-x-auto bg-muted/50 p-1 rounded-2xl scrollbar-none justify-start sm:justify-center gap-1 h-auto">
              {(Object.keys(ADMIN_DASHBOARD_HELP_CONFIG) as AdminDashboardTabKey[]).map((tabKey) => {
                const cfg = ADMIN_DASHBOARD_HELP_CONFIG[tabKey];
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
              Capacidades y Herramientas del Panel:
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
                💡 Recomendación de Gestión:
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
            AcademiX • Panel de Administración y Coordinación
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
