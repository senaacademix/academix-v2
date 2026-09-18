"use client";

import { useEffect, useState } from "react";
import { getSettingsAction } from "@/features/admin/actions/settingsActions";
import { getDashboardMetricsAction, DashboardMetricData } from "@/features/home/actions/dashboardActions";
import { authClient } from "@/lib/auth-client";
import { getRoleFromUser } from "@/features/auth/services/authService";
import Link from "next/link";
import { cn, formatName } from "@/lib/utils";
import { motion } from "framer-motion";
import { getFormattedTodayDate } from "@/lib/dateUtils";
import {
  Users,
  BookOpen,
  Calendar,
  Settings2,
  CalendarClock,
  ClipboardList,
  Sparkles,
  ArrowRight,
  BarChart3,
  Wrench
} from "lucide-react";

import { PageTransition, StaggerGroup, StaggerItem } from "@/components/ui/animated-container";
import { SpotlightCard } from "@/components/ui/spotlight-card";

import { StatWidget } from "@/components/aicanvas/stat-widget";
import { QuickCalendarWidget } from "@/components/aicanvas/quick-calendar-widget";
import { ProgressTrackerCard } from "@/components/aicanvas/progress-tracker-card";
import { GraduationCap, CheckCircle, Activity, Award } from "lucide-react";

interface HomePageProps {
  initialUserName?: string;
  initialUserRole?: string;
  initialDate?: string;
  initialMetrics?: DashboardMetricData | null;
}

export default function HomePage({ initialUserName, initialUserRole, initialDate, initialMetrics }: HomePageProps) {
  const [settings, setSettings] = useState<{ institutionName?: string | null }>({});
  const [metrics, setMetrics] = useState<DashboardMetricData | null>(initialMetrics || null);
  const [loadingMetrics, setLoadingMetrics] = useState(!initialMetrics);
  const [mounted, setMounted] = useState(false);
  const [clientDate, setClientDate] = useState<string>("");
  const { data: session } = authClient.useSession();

  const role = initialUserRole || getRoleFromUser(session?.user);
  const userName = initialUserName || session?.user?.name;

  useEffect(() => {
    setMounted(true);
    setClientDate(getFormattedTodayDate());
  }, []);

  const displayDate = mounted && clientDate ? clientDate : (initialDate || "");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [settingsData, metricsData] = await Promise.all([
          getSettingsAction(),
          getDashboardMetricsAction(),
        ]);
        setSettings(settingsData || {});
        setMetrics(metricsData);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setLoadingMetrics(false);
      }
    };
    fetchData();
  }, []);

  const getNavigationItems = () => {
    const activeRole = role;
    if (!activeRole) return [];

    if (activeRole === "admin") {
      return [
        {
          title: "Gestión de Usuarios",
          description: "Aprendices, planes de mejoramiento, instructores, gestores y coordinadores.",
          url: "/dashboard/admin/users",
          icon: Users,
          color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
        },
        {
          title: "Estructura Académica",
          description: "Configura programas de formación, sedes, materias y asignaciones.",
          url: "/dashboard/admin/courses",
          icon: BookOpen,
          color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
        },
        {
          title: "Programación de Horarios y Eventos",
          description: "Supervisa horarios y publica eventos y actividades institucionales.",
          url: "/dashboard/admin/schedules",
          icon: CalendarClock,
          color: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20"
        },
        {
          title: "Reportes y Analítica",
          description: "Estadísticas académicas, asistencia y métricas globales.",
          url: "/dashboard/admin/analytics",
          icon: BarChart3,
          color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
        },
        {
          title: "Configuración General",
          description: "Parámetros globales del colegio e institución.",
          url: "/dashboard/admin/settings",
          icon: Settings2,
          color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
        }
      ];
    } else if (activeRole === "gestor") {
      return [
        {
          title: "Gestión de Usuarios",
          description: "Matrícula de aprendices, carga masiva e instructores vinculados.",
          url: "/dashboard/gestor/users",
          icon: Users,
          color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
        },
        {
          title: "Estructura Curricular",
          description: "Administra fichas/grupos, competencias, resultados y ambientes.",
          url: "/dashboard/gestor/courses",
          icon: BookOpen,
          color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
        },
        {
          title: "Programación Horaria",
          description: "Diseño y validación de mallas horarias, jornadas y bloqueos.",
          url: "/dashboard/gestor/schedules",
          icon: CalendarClock,
          color: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20"
        },
        {
          title: "Herramientas Sofia Plus",
          description: "Analítica de juicios evaluativos, auditoría y trazabilidad.",
          url: "/dashboard/gestor/tools",
          icon: Wrench,
          color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
        }
      ];
    } else if (activeRole === "observer") {
      return [
        {
          title: "Gestión de Usuarios",
          description: "Consulta de aprendices, instructores y planes de mejoramiento.",
          url: "/dashboard/admin/users",
          icon: Users,
          color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
        },
        {
          title: "Estructura Académica",
          description: "Consulta de programas, fichas, competencias y materias.",
          url: "/dashboard/admin/courses",
          icon: BookOpen,
          color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
        },
        {
          title: "Horarios y Eventos",
          description: "Consulta de programación de clases, mallas y eventos.",
          url: "/dashboard/admin/schedules",
          icon: CalendarClock,
          color: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20"
        },
        {
          title: "Reportes y Analítica",
          description: "Métricas académicas, control de asistencia y estadísticas.",
          url: "/dashboard/admin/analytics",
          icon: BarChart3,
          color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
        }
      ];
    } else if (activeRole === "teacher") {
      return [
        {
          title: "Mis Grupos",
          description: "Toma asistencia, califica actividades y gestiona aprendices de tus fichas.",
          url: "/dashboard/teacher",
          icon: Users,
          color: "bg-primary/10 text-primary border-primary/20"
        },
        {
          title: "Horario y Configuración",
          description: "Consulta tus clases asignadas, disponibilidad y materias declaradas.",
          url: "/dashboard/teacher/schedule",
          icon: CalendarClock,
          color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
        },
        {
          title: "Reporte de Juicios Evaluativos",
          description: "Procesa archivos Sofia Plus, analítica de juicios y matrices por ficha.",
          url: "/dashboard/teacher/tools",
          icon: Wrench,
          color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
        }
      ];
    } else {
      return [
        {
          title: "Mis Materias",
          description: "Accede a tus asignaturas, actividades, evidencias y calificaciones.",
          url: "/dashboard/student",
          icon: BookOpen,
          color: "bg-primary/10 text-primary border-primary/20"
        },
        {
          title: "Horario Semanal",
          description: "Consulta el calendario de tus clases, franjas y ambientes asignados.",
          url: "/dashboard/student/schedule",
          icon: CalendarClock,
          color: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20"
        },
        {
          title: "Registro Académico",
          description: "Revisa tus notas acumuladas, inasistencias y justificaciones.",
          url: "/dashboard/student/records",
          icon: ClipboardList,
          color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
        }
      ];
    }
  };

  const getRoleLabel = () => {
    switch (role) {
      case "admin":
        return "Administrador";
      case "gestor":
        return "Gestor Académico";
      case "teacher":
        return "Instructor";
      case "observer":
        return "Observador / Auditor";
      case "student":
        return "Aprendiz";
      default:
        return "Usuario";
    }
  };

  const navItems = getNavigationItems();

  return (
    <PageTransition className="w-full space-y-8 pb-12">
      {/* Banner Hero Estilo AI Canvas Adaptativo */}
      <section className="relative rounded-3xl overflow-hidden bg-card/80 border border-border/80 p-6 sm:p-12 backdrop-blur-2xl shadow-xl dark:shadow-2xl dark:shadow-primary/5 transition-colors">
        {/* Background Grid & Glow */}
        <div className="absolute inset-0 bg-grid-pattern pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/10 dark:bg-primary/15 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center max-w-3xl mx-auto space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold backdrop-blur-md badge-glow"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Panel de {getRoleLabel()}</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-5xl font-extrabold text-foreground tracking-tight leading-tight text-balance"
          >
            ¡Hola, <span className="bg-gradient-to-r from-foreground via-foreground/80 to-primary bg-clip-text text-transparent">{userName ? formatName(userName) : 'Instructor'}</span>!
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-muted-foreground text-sm sm:text-base capitalize flex items-center justify-center gap-2 font-medium text-pretty"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span suppressHydrationWarning>{displayDate}</span>
            {settings.institutionName && (
              <>
                <span className="text-muted-foreground/60">•</span>
                <span className="text-foreground font-semibold">{settings.institutionName}</span>
              </>
            )}
          </motion.p>
        </div>
      </section>

      {/* Metrics Grid AI Canvas */}
      <StaggerGroup className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StaggerItem>
          <StatWidget
            title={metrics?.stat1.title || "Asistencia General"}
            value={loadingMetrics ? "..." : (metrics?.stat1.value || "100%")}
            change={metrics?.stat1.change}
            isPositive={metrics?.stat1.isPositive ?? true}
            icon={CheckCircle}
            description={metrics?.stat1.description || "Historial de asistencia"}
          />
        </StaggerItem>
        <StaggerItem>
          <StatWidget
            title={metrics?.stat2.title || "Fichas / Cursos"}
            value={loadingMetrics ? "..." : (metrics?.stat2.value || "0 Materias")}
            change={metrics?.stat2.change}
            isPositive={metrics?.stat2.isPositive ?? true}
            icon={GraduationCap}
            description={metrics?.stat2.description || "Cursos asignados"}
          />
        </StaggerItem>
        <StaggerItem>
          <StatWidget
            title={metrics?.stat3.title || "Rendimiento Promedio"}
            value={loadingMetrics ? "..." : (metrics?.stat3.value || "Sin Notas")}
            change={metrics?.stat3.change}
            isPositive={metrics?.stat3.isPositive ?? true}
            icon={Award}
            description={metrics?.stat3.description || "Promedio de notas"}
          />
        </StaggerItem>
        <StaggerItem>
          <StatWidget
            title={metrics?.stat4.title || "Actividades Pendientes"}
            value={loadingMetrics ? "..." : (metrics?.stat4.value || "0 Pendientes")}
            change={metrics?.stat4.change}
            isPositive={metrics?.stat4.isPositive ?? true}
            icon={Activity}
            description={metrics?.stat4.description || "Entregas del período"}
          />
        </StaggerItem>
      </StaggerGroup>

      {/* Main Grid: Quick Access & AI Canvas Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Access Section */}
        <section className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-2">
            <div>
              <h2 className="text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2 text-balance">
                <span>Acceso Rápido</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-1 text-pretty">Selecciona el módulo al que deseas acceder</p>
            </div>
          </div>

          <StaggerGroup className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <StaggerItem key={index}>
                  <Link href={item.url} className="group block h-full">
                    <SpotlightCard className="h-full flex items-center gap-4 transition-all duration-300">
                      <div className={cn("w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300", item.color)}>
                        <Icon className="w-6 h-6" />
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors truncate">
                            {item.title}
                          </h3>
                          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 text-pretty">
                          {item.description}
                        </p>
                      </div>
                    </SpotlightCard>
                  </Link>
                </StaggerItem>
              );
            })}
          </StaggerGroup>
        </section>

        {/* Sidebar Widgets Section */}
        <section className="space-y-6">
          <QuickCalendarWidget events={metrics?.events || []} />
          <ProgressTrackerCard
            title={metrics?.progress.title || "Progreso del Período"}
            subtitle={metrics?.progress.subtitle || "Período Académico Actual"}
            progressPercentage={metrics?.progress.progressPercentage || 0}
            completedTasks={metrics?.progress.completedTasks || 0}
            totalTasks={metrics?.progress.totalTasks || 0}
          />
        </section>
      </div>
    </PageTransition>
  );
}
