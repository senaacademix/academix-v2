"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  ShieldAlert,
  Zap,
  TrendingUp,
  FileCheck2,
  Lock,
  ArrowRight,
  CheckCircle,
  Building2,
  Award
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const benefits = [
  {
    icon: Zap,
    color: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    title: "Cero Cruces Horarios",
    description: "Validación algorítmica preventiva instantánea. Si un instructor o aula ya está ocupado en la franja, el sistema alerta e impide colisiones."
  },
  {
    icon: Lock,
    color: "text-blue-400 bg-blue-500/10 border-blue-500/30",
    title: "Aislamiento por Trimestre",
    description: "Cada trimestre opera de forma autónoma. Puedes bloquear o desbloquear la disponibilidad docente y materias asignadas de forma masiva o individual."
  },
  {
    icon: TrendingUp,
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    title: "Trazabilidad de Asistencias",
    description: "Cierres semanales de asistencia con soporte para permisos especiales. El Gestor Académico habilita ediciones pasadas con total auditoría."
  },
  {
    icon: FileCheck2,
    color: "text-purple-400 bg-purple-500/10 border-purple-500/30",
    title: "PDFs Vectoriales de Alta Fidelidad",
    description: "Exporta la malla general panorámica, cronogramas por ficha o agendas por docente en formato vectorial nítido, ideal para cartelera e impresión."
  }
];

export function BenefitsSection() {
  return (
    <section id="beneficios" className="py-24 px-4 sm:px-6 bg-slate-950 relative overflow-hidden">
      {/* Dynamic Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-primary/10 blur-[160px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold">
            <Award className="w-3.5 h-3.5 text-primary" />
            <span>Impacto Institucional</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Diseñado para la máxima <span className="text-primary">eficiencia operativa</span>
          </h2>
          <p className="text-slate-400 text-base sm:text-lg">
            AcademiX elimina los cuellos de botella en la asignación horaria y agiliza la toma de decisiones académicas.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex items-start gap-5 p-7 rounded-3xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-xl hover:border-slate-700/80 transition-all duration-300 shadow-lg"
              >
                <div className={`p-3.5 rounded-2xl border shrink-0 ${benefit.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white">
                    {benefit.title}
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Big Banner CTA */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative rounded-3xl bg-gradient-to-r from-primary/20 via-slate-900/90 to-primary/10 border border-primary/30 p-8 sm:p-14 text-center overflow-hidden shadow-2xl backdrop-blur-2xl"
        >
          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <h3 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Optimiza la programación académica de tu institución hoy mismo
            </h3>
            <p className="text-slate-300 text-base sm:text-lg">
              Ingresa al panel de control y gestiona horarios, asistencias y planes pedagógicos con total precisión.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                asChild
                size="lg"
                className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white font-bold px-8 py-6 rounded-2xl shadow-xl shadow-primary/25 transition-all duration-300 hover:scale-105 active:scale-95 text-base"
              >
                <Link href="/signin" className="flex items-center gap-2">
                  <span>Acceder a AcademiX</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
