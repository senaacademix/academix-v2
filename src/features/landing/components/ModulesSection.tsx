"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarDays,
  ShieldCheck,
  GraduationCap,
  Users2,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Lock,
  Layers,
  FileCheck,
  SlidersHorizontal,
  Clock,
  Eye
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const modules = [
  {
    id: "gestor",
    role: "Gestor Académico",
    badge: "Mando y Programación",
    tagline: "Planificación integral de mallas horarias y control operativo de instructores",
    color: "from-blue-500/20 via-primary/10 to-transparent",
    accent: "text-blue-400 border-blue-500/30 bg-blue-500/10",
    icon: CalendarDays,
    features: [
      "Malla horaria visual interactiva con validación anti-cruces de instructores y ambientes",
      "Control de bloqueos de disponibilidad y materias asignadas (individual y masivo)",
      "Gestión independiente por horarios y trimestres académicos",
      "Autorización de permisos para edición de asistencias de fechas anteriores",
      "Exportación vectorial de mallas generales y agendas docentes en PDF"
    ],
    metric: "100%",
    metricLabel: "Detección preventiva de cruces"
  },
  {
    id: "admin",
    role: "Administrador General",
    badge: "Gobernanza del Sistema",
    tagline: "Configuración de infraestructura, sedes, fichas y control institucional",
    color: "from-purple-500/20 via-indigo-500/10 to-transparent",
    accent: "text-purple-400 border-purple-500/30 bg-purple-500/10",
    icon: ShieldCheck,
    features: [
      "Administración integral de sedes, pisos y ambientes de formación",
      "Parametrización de programas académicos, fichas de formación y vigencias",
      "Gestión centralizada de usuarios, activación de credenciales y asignación de roles",
      "Supervisión global de calendarios académicos y periodos de ejecución",
      "Trazabilidad y auditoría de cambios en todas las entidades del sistema"
    ],
    metric: "Multi-Sede",
    metricLabel: "Gestión centralizada de infraestructura"
  },
  {
    id: "instructor",
    role: "Portal del Instructor",
    badge: "Docencia y Evaluación",
    tagline: "Disponibilidad horaria, pase de lista ágil y planes pedagógicos",
    color: "from-emerald-500/20 via-teal-500/10 to-transparent",
    accent: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
    icon: GraduationCap,
    features: [
      "Configuración de disponibilidad horaria semanal por trimestre",
      "Pase de asistencia rápido por sesión (Presente, Falla, Retardo, Excusado)",
      "Edición de sesiones anteriores bajo autorización del Gestor Académico",
      "Radicación, seguimiento y registro de evidencias de Planes de Mejoramiento",
      "Consulta directa de cronograma de clases y ambientes asignados"
    ],
    metric: "Tiempo Real",
    metricLabel: "Registro y cierre semanal de asistencia"
  },
  {
    id: "aprendiz",
    role: "Portal del Aprendiz",
    badge: "Comunidad Estudiantil",
    tagline: "Consulta de horarios de formación, récord de asistencia y compromisos",
    color: "from-amber-500/20 via-orange-500/10 to-transparent",
    accent: "text-amber-400 border-amber-500/30 bg-amber-500/10",
    icon: Users2,
    features: [
      "Visualización en tiempo real del horario de formación de su ficha",
      "Consulta de instructores y ambientes designados para cada competencia",
      "Historial detallado de asistencias con cálculo automático de porcentajes",
      "Acceso y seguimiento a planes de mejoramiento concertados",
      "Descarga de constancias y cronogramas en formato optimizado para móviles"
    ],
    metric: "24 / 7",
    metricLabel: "Acceso permanente desde cualquier dispositivo"
  },
  {
    id: "observador",
    role: "Perfil Observador",
    badge: "Supervisión y Calidad",
    tagline: "Acompañamiento pedagógico, auditoría y monitoreo integral sin alteración de datos",
    color: "from-cyan-500/20 via-sky-500/10 to-transparent",
    accent: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
    icon: Eye,
    features: [
      "Acceso de supervisión y sólo lectura a programas y fichas asignadas",
      "Monitoreo en tiempo real de mallas horarias y ocupación de ambientes",
      "Consulta del cumplimiento de asistencias y reportes consolidados de ausentismo",
      "Seguimiento preventivo a la concertación y ejecución de Planes de Mejoramiento",
      "Verificación de novedades académicas para aseguramiento de la calidad"
    ],
    metric: "Supervisión",
    metricLabel: "Control de calidad y acompañamiento"
  }
];

export function ModulesSection() {
  const [activeTab, setActiveTab] = useState(modules[0].id);
  const currentModule = modules.find((m) => m.id === activeTab) || modules[0];
  const Icon = currentModule.icon;

  return (
    <section id="modulos" className="py-24 px-4 sm:px-6 bg-slate-950/80 relative overflow-hidden border-t border-slate-900">
      {/* Background Ambient Lighting */}
      <div className="absolute top-1/3 -left-40 w-[600px] h-[300px] bg-primary/10 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 -right-40 w-[600px] h-[300px] bg-blue-500/10 blur-[140px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold">
            <Layers className="w-3.5 h-3.5 text-primary" />
            <span>Ecosistema Académico Modular</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Portales especializados para cada rol
          </h2>
          <p className="text-slate-400 text-base sm:text-lg">
            Cada integrante de la comunidad educativa cuenta con herramientas diseñadas con precisión para maximizar su eficiencia.
          </p>
        </div>

        {/* Tab Selectors */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-10 max-w-5xl mx-auto">
          {modules.map((m) => {
            const isSelected = activeTab === m.id;
            const TabIcon = m.icon;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setActiveTab(m.id)}
                className={`relative flex items-center justify-center gap-2 px-3 py-3 rounded-2xl border text-xs sm:text-sm font-bold transition-all duration-300 cursor-pointer ${
                  isSelected
                    ? "bg-slate-900 border-primary/50 text-white shadow-lg shadow-primary/10"
                    : "bg-slate-900/40 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-900/80"
                }`}
              >
                <TabIcon className={`w-4 h-4 shrink-0 ${isSelected ? "text-primary" : "text-slate-400"}`} />
                <span className="truncate">{m.role}</span>
                {isSelected && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-primary rounded-full"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Module Detail Card */}
        <motion.div
          key={currentModule.id}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative rounded-3xl bg-slate-900/60 border border-slate-800/90 backdrop-blur-2xl p-8 sm:p-12 overflow-hidden shadow-2xl"
        >
          <div
            className={`absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl ${currentModule.color} rounded-full blur-3xl pointer-events-none`}
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            {/* Left Info Column */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold tracking-wide uppercase ${currentModule.accent}">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{currentModule.badge}</span>
              </div>

              <h3 className="text-3xl sm:text-4xl font-extrabold text-white">
                {currentModule.role}
              </h3>

              <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
                {currentModule.tagline}
              </p>

              {/* Feature List */}
              <div className="space-y-3 pt-2">
                {currentModule.features.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="mt-0.5 p-1 rounded-lg bg-primary/10 border border-primary/25 text-primary shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <span className="text-slate-300 text-sm sm:text-base leading-snug">{feat}</span>
                  </div>
                ))}
              </div>

              {/* Action Button */}
              <div className="pt-4">
                <Button
                  asChild
                  className="bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl px-6 py-5 shadow-lg shadow-primary/20"
                >
                  <Link href="/signin" className="flex items-center gap-2">
                    <span>Acceder a este Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* Right Metric / Summary Box */}
            <div className="lg:col-span-5 flex flex-col justify-center">
              <div className="rounded-2xl bg-slate-950/70 border border-slate-800/90 p-8 flex flex-col items-center text-center shadow-xl space-y-4">
                <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center ${currentModule.accent} shadow-inner`}>
                  <Icon className="w-8 h-8" />
                </div>

                <div className="space-y-1">
                  <span className="text-4xl sm:text-5xl font-black tracking-tight text-white">
                    {currentModule.metric}
                  </span>
                  <p className="text-sm font-medium text-slate-400 max-w-xs mx-auto">
                    {currentModule.metricLabel}
                  </p>
                </div>

                <div className="w-full pt-4 border-t border-slate-800/80 flex justify-between items-center text-xs text-slate-400">
                  <span className="flex items-center gap-1.5 font-medium text-slate-300">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
                    Parámetros del Sistema
                  </span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Módulo Activo
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
