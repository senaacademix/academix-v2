import { StudentGrades } from "@/features/student/components/StudentGrades";
import { StudentGradesHelpTrigger } from "@/features/student/components/StudentGradesHelpTrigger";

export const metadata = {
    title: "Calificaciones | AcademiX",
    description: "Visualiza tus actividades evaluativas y calificaciones.",
};

export default function StudentGradesPage() {
    return (
        <div className="flex flex-col gap-6 p-4 sm:p-6 min-h-screen max-w-5xl mx-auto w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Mis Calificaciones</h1>
                    <p className="text-muted-foreground text-xs sm:text-sm mt-1">
                        Consulta las actividades evaluativas asignadas por tus profesores y haz seguimiento a tus notas y promedio.
                    </p>
                </div>

                <div className="shrink-0 flex items-center gap-2 self-start sm:self-auto">
                    <StudentGradesHelpTrigger />
                </div>
            </div>
            
            <StudentGrades />
        </div>
    );
}
