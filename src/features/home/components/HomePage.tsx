"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useAppRefresh } from "@/lib/app-refresh";
import Link from "next/link";
import Image from "next/image";
import { getSettingsAction } from "@/features/admin/actions/settingsActions";
import { authClient } from "@/lib/auth-client";
import { getRoleFromUser } from "@/features/auth/services/authService";
import { formatName } from "@/lib/utils";
import { motion } from "framer-motion";
import { getFormattedTodayDate } from "@/lib/dateUtils";
import { useGestorProgram } from "@/features/gestor/context/GestorProgramContext";
import {
  Sparkles,
  GraduationCap,
  Award,
  ShieldCheck,
  Layers,
  Eye,
  BookOpen,
  School,
  CheckCircle2,
  Users,
  CalendarClock,
  CalendarDays,
  Wrench,
  ClipboardList,
  BarChart3,
  Megaphone,
  Settings2,
  ArrowRight,
  Clock,
  ExternalLink
} from "lucide-react";

import { PageTransition } from "@/components/ui/animated-container";
import { Badge } from "@/components/ui/badge";

interface HomePageProps {
  initialUserName?: string;
  initialUserRole?: string;
  initialDate?: string;
  initialMetrics?: any;
  initialAnnouncements?: any[];
}

export default function HomePage({
  initialUserName,
  initialUserRole,
  initialDate,
  initialMetrics: _initialMetrics,
  initialAnnouncements: _initialAnnouncements
}: HomePageProps) {
  const [settings, setSettings] = useState<{ institutionName?: string | null }>({});
  const [mounted, setMounted] = useState(false);
  const [clientDate, setClientDate] = useState<string>("");
  const { data: session } = authClient.useSession();
  const { selectedProgramId, managedPrograms } = useGestorProgram();

  const role = initialUserRole || getRoleFromUser(session?.user);
  const userName = initialUserName || session?.user?.name;
  const effectiveGestorProgramId = selectedProgramId || (managedPrograms?.length > 0 ? managedPrograms[0].id : null);

  useEffect(() => {
    setMounted(true);
    setClientDate(getFormattedTodayDate());
  }, []);

  const displayDate = mounted && clientDate ? clientDate : (initialDate || "");

  const fetchSettings = useCallback(async () => {
    try {
      const settingsData = await getSettingsAction();
      setSettings(settingsData || {});
    } catch (err) {
      console.error("Error fetching settings:", err);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useAppRefresh(() => fetchSettings());

  // Saludo dinámico según la hora del día
  const timeGreeting = useMemo(() => {
    if (!mounted) return "¡Hola";
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "¡Buenos días";
    if (hour >= 12 && hour < 18) return "¡Buenas tardes";
    return "¡Buenas noches";
  }, [mounted]);

  // Metadatos de rol adaptativos
  const roleInfo = useMemo(() => {
    switch (role) {
      case "admin":
        return {
          label: "Administrador Central",
          icon: ShieldCheck,
          tag: "Gobierno y Control",
          message:
            "Lideras el gobierno del sistema, la administración de usuarios y el aseguramiento continuo de la calidad formativa.",
        };
      case "gestor":
        return {
          label: "Gestor Curricular",
          icon: Layers,
          tag: "Planeación Curricular",
          message:
            "Coordinas la articulación de fichas, competencias y asignación de ambientes de formación en tu área.",
        };
      case "observer":
        return {
          label: "Observador Institucional",
          icon: Eye,
          tag: "Auditoría Formativa",
          message:
            "Supervisas la trazabilidad de procesos, mallas horarias y métricas académicas del centro de formación.",
        };
      case "student":
        return {
          label: "Aprendiz en Formación",
          icon: BookOpen,
          tag: "Formación Técnica",
          message:
            "Construye tus competencias con dedicación, consulta tus horarios, asiste puntualmente y avanza hacia tu certificación.",
        };
      case "teacher":
      default:
        return {
          label: "Instructor Docente",
          icon: GraduationCap,
          tag: "Docencia y Formación",
          message:
            "Tu vocación pedagógica guía a nuestros aprendices. Administra tus grupos, registra asistencias y consulta tu horario semanal.",
        };
    }
  }, [role]);

  // Opciones de navegación enriquecidas con descripciones para cada rol
  const navigationOptions = useMemo(() => {
    switch (role) {
      case "admin":
        return [
          {
            title: "Panel de Control",
            description: "Métricas institucionales, auditoría y resumen general de la plataforma.",
            url: "/dashboard/admin",
            icon: BarChart3,
            badge: "Métricas",
          },
          {
            title: "Gestión de Usuarios",
            description: "Administra instructores, aprendices, roles y permisos de acceso al centro.",
            url: "/dashboard/admin/users",
            icon: Users,
            badge: "Usuarios",
          },
          {
            title: "Áreas de Formación",
            description: "Estructura de programas curriculares, competencias y trimestres académicos.",
            url: "/dashboard/admin/courses",
            icon: BookOpen,
            badge: "Curricular",
          },
          {
            title: "Blog de Anuncios",
            description: "Publica y comunica noticias institucionales clave a la comunidad académica.",
            url: "/dashboard/admin/announcements",
            icon: Megaphone,
            badge: "Noticias",
          },
          {
            title: "Configuración",
            description: "Ajustes globales del sistema, límites de acceso y personalización.",
            url: "/dashboard/admin/settings",
            icon: Settings2,
            badge: "Sistema",
          },
        ];
      case "gestor":
        return [
          {
            title: "Panel del Área",
            description: "Resumen de fichas activas, ocupación de ambientes y métricas del área formativa.",
            url: effectiveGestorProgramId ? `/dashboard/gestor?programId=${effectiveGestorProgramId}` : "/dashboard/gestor",
            icon: BarChart3,
            badge: "Área",
          },
          {
            title: "Gestión de Aprendices",
            description: "Control de matrículas, seguimiento formativo y novedades de aprendices.",
            url: effectiveGestorProgramId ? `/dashboard/gestor/users?programId=${effectiveGestorProgramId}` : "/dashboard/gestor/users",
            icon: GraduationCap,
            badge: "Fichas",
          },
          {
            title: "Estructura Curricular",
            description: "Malla formativa, resultados de aprendizaje y distribución de competencias.",
            url: effectiveGestorProgramId ? `/dashboard/gestor/courses?programId=${effectiveGestorProgramId}` : "/dashboard/gestor/courses",
            icon: BookOpen,
            badge: "Malla",
          },
          {
            title: "Programación Horaria",
            description: "Diseño, asignación y ajuste de franjas horarias y ambientes de aprendizaje.",
            url: effectiveGestorProgramId ? `/dashboard/gestor/schedules?programId=${effectiveGestorProgramId}` : "/dashboard/gestor/schedules",
            icon: CalendarClock,
            badge: "Horarios",
          },
          {
            title: "Asistencia Semanal",
            description: "Monitoreo consolidado de asistencia por ficha, instructor y período.",
            url: effectiveGestorProgramId ? `/dashboard/gestor/attendance?programId=${effectiveGestorProgramId}` : "/dashboard/gestor/attendance",
            icon: CalendarDays,
            badge: "Asistencia",
          },
          {
            title: "Herramientas",
            description: "Utilidades de exportación masiva, reportes PDF y optimización de ambientes.",
            url: effectiveGestorProgramId ? `/dashboard/gestor/tools?programId=${effectiveGestorProgramId}` : "/dashboard/gestor/tools",
            icon: Wrench,
            badge: "Utilidades",
          },
        ];
      case "observer":
        return [
          {
            title: "Panel de Supervisión",
            description: "Auditoría en tiempo real de fichas, horas dictadas y cumplimiento formativo.",
            url: effectiveGestorProgramId ? `/dashboard/admin?programId=${effectiveGestorProgramId}` : "/dashboard/admin",
            icon: BarChart3,
            badge: "Auditoría",
          },
          {
            title: "Programas y Fichas",
            description: "Supervisión de planes formativos y distribución de grupos en formación.",
            url: effectiveGestorProgramId ? `/dashboard/admin/courses?programId=${effectiveGestorProgramId}` : "/dashboard/admin/courses",
            icon: BookOpen,
            badge: "Programas",
          },
          {
            title: "Programación Horaria",
            description: "Monitoreo de mallas horarias institucionales y ocupación de ambientes.",
            url: effectiveGestorProgramId ? `/dashboard/admin/schedules?programId=${effectiveGestorProgramId}` : "/dashboard/admin/schedules",
            icon: CalendarClock,
            badge: "Mallas",
          },
          {
            title: "Asistencia Semanal",
            description: "Trazabilidad de asistencia y novedades formativas consolidadas.",
            url: effectiveGestorProgramId ? `/dashboard/gestor/attendance?programId=${effectiveGestorProgramId}` : "/dashboard/gestor/attendance",
            icon: CalendarDays,
            badge: "Registros",
          },
        ];
      case "student":
        return [
          {
            title: "Mis Materias",
            description: "Accede a tus asignaturas matriculadas, competencias activas y datos del instructor.",
            url: "/dashboard/student",
            icon: BookOpen,
            badge: "Asignaturas",
          },
          {
            title: "Registro Académico",
            description: "Consulta tus calificaciones, inasistencias acumuladas y novedades oficiales.",
            url: "/dashboard/student/records",
            icon: ClipboardList,
            badge: "Notas",
          },
          {
            title: "Programación Horaria",
            description: "Horario de clases en tiempo real, ambientes asignados y eventos del trimestre.",
            url: "/dashboard/student/schedule",
            icon: CalendarClock,
            badge: "Mi Horario",
          },
          {
            title: "Elección de Vocero",
            description: "Participa activamente en las votaciones y procesos democráticos de tu ficha.",
            url: "/dashboard/student/elections",
            icon: Award,
            badge: "Democracia",
          },
        ];
      case "teacher":
      default:
        return [
          {
            title: "Mis Grupos y Fichas",
            description: "Gestiona asistencias por sesión, seguimiento pedagógico y evaluación de aprendices.",
            url: "/dashboard/teacher",
            icon: Users,
            badge: "Grupos",
          },
          {
            title: "Programación Horaria",
            description: "Visualiza tu horario institucional semanal, novedades y disponibilidad de jornada.",
            url: "/dashboard/teacher/schedule",
            icon: CalendarClock,
            badge: "Horario",
          },
          {
            title: "Herramientas Docentes",
            description: "Generador de reportes pedagógicos, certificados y utilidades académicas.",
            url: "/dashboard/teacher/tools",
            icon: Wrench,
            badge: "Utilidades",
          },
        ];
    }
  }, [role, effectiveGestorProgramId]);

  const RoleIcon = roleInfo.icon;
  const institutionName = settings.institutionName || "SERVICIO NACIONAL DE APRENDIZAJE — SENA";

  return (
    <PageTransition className="w-full flex-1 flex flex-col py-3 sm:py-6 max-w-6xl mx-auto space-y-6 sm:space-y-8">
      {/* ── SECCIÓN HERO DE BIENVENIDA ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-3xl border border-border/80 bg-card/85 dark:bg-card/65 backdrop-blur-2xl p-6 sm:p-8 md:p-10 shadow-sm"
      >
        {/* Luces difusas de fondo */}
        <div className="absolute top-0 right-0 w-80 sm:w-96 h-80 sm:h-96 bg-primary/15 blur-[100px] rounded-full pointer-events-none -z-10" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none -z-10" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            {/* Badges superiores: Rol + Fecha + Conexión */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/25 bg-primary/10 text-primary text-xs font-black shadow-2xs">
                <RoleIcon className="w-3.5 h-3.5" />
                <span>{roleInfo.label}</span>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border/80 bg-background/70 text-foreground/80 text-xs font-semibold backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span suppressHydrationWarning>{displayDate}</span>
              </div>

              <Badge variant="outline" className="hidden xs:inline-flex text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground border-border/60">
                PWA Activa
              </Badge>
            </div>

            {/* Nombre institucional */}
            <p className="text-[11px] sm:text-xs font-black tracking-widest text-primary uppercase">
              {institutionName}
            </p>

            {/* Saludo Principal */}
            <h1 className="text-3xl sm:text-5xl font-black text-foreground tracking-tight leading-[1.1] text-balance">
              {timeGreeting},{" "}
              <span className="bg-gradient-to-r from-foreground via-foreground/90 to-primary bg-clip-text text-transparent">
                {userName ? formatName(userName) : roleInfo.label}
              </span>
            </h1>

            {/* Mensaje de bienvenida */}
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed font-normal">
              {roleInfo.message}
            </p>
          </div>

          {/* Sello de Marca AcademiX / PWA */}
          <div className="hidden lg:flex flex-col items-center justify-center p-5 rounded-3xl bg-background/50 border border-border/70 shadow-xs shrink-0 w-48 text-center space-y-2.5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/30 p-2 flex items-center justify-center shadow-md shadow-primary/10">
              <Image
                src="/logo.png"
                alt="Logo AcademiX"
                width={48}
                height={48}
                className="object-contain aspect-square"
                priority
              />
            </div>
            <div>
              <p className="text-sm font-black text-foreground tracking-tight">Academi<span className="text-primary">X</span></p>
              <p className="text-[10px] text-muted-foreground font-semibold">Plataforma PWA</p>
            </div>
            <div className="w-full pt-1.5 border-t border-border/50 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Sincronizada</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── CUADRÍCULA MODULAR DE SERVICIOS / ACCESOS DIRECTOS ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-primary/10 text-primary">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-foreground tracking-tight">
              Módulos y Accesos Directos
            </h2>
          </div>
          <span className="text-xs font-semibold text-muted-foreground">
            {navigationOptions.length} accesos disponibles
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4.5">
          {navigationOptions.map((opt, idx) => {
            const Icon = opt.icon;
            return (
              <motion.div
                key={opt.title}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.05 * idx }}
              >
                <Link
                  href={opt.url}
                  className="group relative rounded-3xl border border-border/80 bg-card/85 dark:bg-card/65 hover:bg-card hover:border-primary/50 backdrop-blur-xl p-5 shadow-2xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between gap-4 h-full cursor-pointer hover:-translate-y-0.5"
                >
                  {/* Top: Icon + Badge */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all duration-300">
                      <Icon className="w-5 h-5 transition-transform" />
                    </div>

                    <Badge variant="outline" className="text-[10px] font-extrabold uppercase tracking-wider bg-background/60 border-border/70 text-muted-foreground group-hover:border-primary/30 group-hover:text-primary transition-colors py-0.5 px-2">
                      {opt.badge}
                    </Badge>
                  </div>

                  {/* Middle: Title & Description */}
                  <div className="space-y-1.5 flex-1">
                    <h3 className="text-base font-extrabold text-foreground tracking-tight group-hover:text-primary transition-colors flex items-center gap-1.5">
                      <span>{opt.title}</span>
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {opt.description}
                    </p>
                  </div>

                  {/* Bottom: Action link */}
                  <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs font-bold text-primary">
                    <span className="text-[11px] font-black uppercase tracking-wider opacity-80 group-hover:opacity-100">
                      Ingresar
                    </span>
                    <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </PageTransition>
  );
}
