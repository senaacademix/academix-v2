"use client";

import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Sparkles, ShieldCheck, Users, Calendar, Lock, CheckCircle2, FileSpreadsheet } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative min-h-[92vh] flex flex-col justify-center items-center pt-32 pb-20 px-4 sm:px-6 overflow-hidden bg-slate-950">
      {/* Dynamic Background Glow & Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[350px] bg-primary/20 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute top-1/3 left-1/3 w-[350px] h-[220px] bg-cyan-500/10 blur-[110px] rounded-full pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 max-w-5xl mx-auto text-center flex flex-col items-center">
        
        {/* Animated Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs sm:text-sm font-bold mb-8 backdrop-blur-xl shadow-lg shadow-primary/10"
        >
          <Sparkles className="w-4 h-4 animate-pulse" />
          <span>AcademiX • Gestión Académica, Horarios y Asistencia</span>
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
        </motion.div>

        {/* Hero Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white mb-6 leading-[1.12]"
        >
          Control Total de Horarios, <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-white via-slate-100 to-primary bg-clip-text text-transparent">
            Asistencia y Formación
          </span>
        </motion.h1>

        {/* Hero Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-slate-400 text-base sm:text-lg md:text-xl max-w-3xl mx-auto mb-10 leading-relaxed font-normal"
        >
          <strong className="text-slate-100 font-bold">AcademiX</strong> centraliza la planificación de mallas horarias sin cruces, gestión de instructores por trimestre, registro de asistencia semanal con auditoría y seguimiento integral a planes de mejoramiento.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
        >
          <Button
            asChild
            size="lg"
            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white font-bold px-8 py-6 rounded-2xl shadow-xl shadow-primary/25 transition-all duration-300 hover:scale-105 active:scale-95 text-base"
          >
            <Link href="/signin" className="flex items-center justify-center gap-2">
              <span>Ingresar a la Plataforma</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </Button>

          <a
            href="#modulos"
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 text-slate-300 hover:text-white font-bold transition-all duration-300 text-center text-base backdrop-blur-md cursor-pointer touch-manipulation select-none active:scale-95"
          >
            Ver Módulos del Sistema
          </a>
        </motion.div>

        {/* Stat Highlights Bar */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mt-16 w-full max-w-4xl pt-8 border-t border-slate-800/60 text-left"
        >
          <div className="flex flex-col p-4 rounded-2xl bg-slate-900/50 border border-slate-800/60 backdrop-blur-md">
            <div className="p-2.5 w-fit rounded-xl bg-primary/15 text-primary mb-3">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-xl font-extrabold text-white">5 Roles Nativos</span>
            <span className="text-xs text-slate-400 mt-0.5">Admin, Gestor, Docente, Estudiante y Observador</span>
          </div>

          <div className="flex flex-col p-4 rounded-2xl bg-slate-900/50 border border-slate-800/60 backdrop-blur-md">
            <div className="p-2.5 w-fit rounded-xl bg-cyan-500/15 text-cyan-400 mb-3">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="text-xl font-extrabold text-white">Malla Horaria</span>
            <span className="text-xs text-slate-400 mt-0.5">Panorámica y sin cruces de ambientes</span>
          </div>

          <div className="flex flex-col p-4 rounded-2xl bg-slate-900/50 border border-slate-800/60 backdrop-blur-md">
            <div className="p-2.5 w-fit rounded-xl bg-emerald-500/15 text-emerald-400 mb-3">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="text-xl font-extrabold text-white">Asistencia Real</span>
            <span className="text-xs text-slate-400 mt-0.5">Cierre semanal y permisos especiales</span>
          </div>

          <div className="flex flex-col p-4 rounded-2xl bg-slate-900/50 border border-slate-800/60 backdrop-blur-md">
            <div className="p-2.5 w-fit rounded-xl bg-amber-500/15 text-amber-400 mb-3">
              <Lock className="w-5 h-5" />
            </div>
            <span className="text-xl font-extrabold text-white">Bloqueo Trimestral</span>
            <span className="text-xs text-slate-400 mt-0.5">Disponibilidad y materias por horario</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
