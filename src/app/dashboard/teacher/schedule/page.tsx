import { ScheduleDashboard } from "@/features/schedule/components/ScheduleDashboard";
import { TooltipProvider } from "@/components/ui/tooltip";
export const metadata = {
  title: "Horarios y Eventos | AcademiX",
  description: "Visualiza tu horario de clases, consulta eventos institucionales y gestiona tu disponibilidad semanal.",
};

export default function TeacherSchedulePage() {
  return (
    <div className="flex flex-col gap-6 w-full min-w-0">
      {/* AI Canvas Header Adaptativo al Tema Seleccionado */}
      <div className="relative rounded-3xl bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 p-5 sm:p-7 backdrop-blur-2xl shadow-md dark:shadow-xl overflow-hidden transition-colors">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/15 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative z-10">
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Horarios, Eventos y{" "}
            <span className="bg-gradient-to-r from-slate-900 via-slate-700 to-primary dark:from-white dark:via-slate-200 dark:to-primary bg-clip-text text-transparent">
              Configuración Académica
            </span>
          </h1>
        </div>
      </div>

      <TooltipProvider>
        <ScheduleDashboard />
      </TooltipProvider>
    </div>
  );
}
