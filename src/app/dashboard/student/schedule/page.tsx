import { ScheduleView } from "@/features/schedule/components/ScheduleView";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata = {
  title: "Horarios y Eventos | AcademiX",
  description: "Visualiza el horario semanal de tus clases programadas y consulta los eventos institucionales del período.",
};

export default function StudentSchedulePage() {
  return (
    <div className="flex flex-col gap-6 w-full min-w-0">
      {/* Header Adaptativo al Tema Seleccionado */}
      <div className="relative rounded-3xl bg-card border border-border/80 p-5 sm:p-7 backdrop-blur-2xl shadow-sm overflow-hidden transition-colors">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative z-10">
          <h1 className="text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            Horarios y{" "}
            <span className="bg-gradient-to-r from-foreground via-foreground/80 to-primary bg-clip-text text-transparent">
              Eventos Académicos
            </span>
          </h1>
        </div>
      </div>

      <TooltipProvider>
        <ScheduleView />
      </TooltipProvider>
    </div>
  );
}
