import { StudentRecords } from "@/features/student/components/StudentRecords";
import { Sparkles, ClipboardList } from "lucide-react";

export const metadata = {
    title: "Registro Académico | AcademiX",
    description: "Visualiza tu historial de asistencia, observaciones disciplinarias y calificaciones.",
};

export default function StudentRecordsPage() {
    return (
        <div className="flex flex-col gap-6 w-full min-w-0 max-w-full pb-12">
            {/* Header Hero Banner Estilo AI Canvas Adaptativo */}
            <div className="relative rounded-3xl bg-card border border-border/80 p-6 sm:p-8 backdrop-blur-2xl shadow-sm overflow-hidden transition-colors">
                <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 blur-[100px] rounded-full pointer-events-none" />

                <div className="relative z-10 space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold shadow-2xs">
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                        <span>Historial y Rendimiento del Estudiante</span>
                    </div>
                    <h1 className="text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight">
                        Registro Académico{" "}
                        <span className="bg-gradient-to-r from-foreground via-foreground/80 to-primary bg-clip-text text-transparent">
                            Integral
                        </span>
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed font-medium">
                        Consulta tu historial de asistencia, observaciones disciplinarias de instructores, calificaciones por corte y planes de mejoramiento.
                    </p>
                </div>
            </div>
            
            <StudentRecords />
        </div>
    );
}
