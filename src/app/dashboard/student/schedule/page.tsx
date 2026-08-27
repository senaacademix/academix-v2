import { ScheduleView } from "@/features/schedule/components/ScheduleView";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sparkles } from "lucide-react";

export const metadata = {
  title: "Horarios y Eventos | AcademiX",
  description: "Visualiza el horario semanal de tus clases programadas y consulta los eventos institucionales del período.",
};

export default function StudentSchedulePage() {
  return (
    <div className="flex flex-col gap-6 w-full min-w-0">
      {/* Header Adaptativo al Tema Seleccionado */}
      <div className="relative rounded-3xl bg-card border border-border/80 p-6 sm:p-8 backdrop-blur-2xl shadow-sm overflow-hidden transition-colors">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>Gestión de Horarios y Eventos del Estudiante</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            Horarios y{" "}
            <span className="bg-gradient-to-r from-foreground via-foreground/80 to-primary bg-clip-text text-transparent">
              Eventos Académicos
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Visualiza el horario semanal de todas tus clases programadas de acuerdo a tu ficha/grupo y consulta los eventos institucionales del período.
          </p>
        </div>
      </div>

      <TooltipProvider>
        <ScheduleView />
      </TooltipProvider>
    </div>
  );
}
