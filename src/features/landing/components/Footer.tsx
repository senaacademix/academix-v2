"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Sparkles, ArrowUp } from "lucide-react";

export function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="border-t border-slate-900 bg-slate-950 text-slate-400 py-16 px-4 sm:px-6 relative overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-slate-900">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 group-hover:border-primary/60 transition-all">
                <Image
                  src="/logo.png"
                  alt="AcademiX Logo"
                  width={28}
                  height={28}
                  className="object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-extrabold text-white tracking-tight flex items-center gap-1">
                  Academi<span className="text-primary">X</span>
                </span>
                <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                  Gestión y Malla Académica
                </span>
              </div>
            </Link>
            <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
              Plataforma integral para la programación horaria, gestión trimestral docente, control de asistencia y seguimiento de planes pedagógicos.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Plataforma Activa • En Línea</span>
            </div>
          </div>

          {/* Quick Navigation */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">Navegación</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#caracteristicas" className="hover:text-primary transition-colors">
                  Características
                </a>
              </li>
              <li>
                <a href="#modulos" className="hover:text-primary transition-colors">
                  Módulos por Rol
                </a>
              </li>
              <li>
                <a href="#beneficios" className="hover:text-primary transition-colors">
                  Beneficios Institucionales
                </a>
              </li>
              <li>
                <Link href="/signin" className="hover:text-primary transition-colors">
                  Ingreso a la Plataforma
                </Link>
              </li>
            </ul>
          </div>

          {/* Roles Supported */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">Portales</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <span className="text-slate-300">Gestor Académico</span>
                <p className="text-xs text-slate-500">Mallas, trimestres y bloqueos</p>
              </li>
              <li>
                <span className="text-slate-300">Administrador</span>
                <p className="text-xs text-slate-500">Sedes, fichas y gobernanza</p>
              </li>
              <li>
                <span className="text-slate-300">Instructor</span>
                <p className="text-xs text-slate-500">Disponibilidad y asistencias</p>
              </li>
              <li>
                <span className="text-slate-300">Aprendiz</span>
                <p className="text-xs text-slate-500">Consulta de horarios en vivo</p>
              </li>
              <li>
                <span className="text-slate-300">Observador</span>
                <p className="text-xs text-slate-500">Supervisión y auditoría</p>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} AcademiX. Desarrollado para instituciones de formación técnica y superior.</p>
          <button
            type="button"
            onClick={scrollToTop}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
          >
            <span>Volver arriba</span>
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
}
