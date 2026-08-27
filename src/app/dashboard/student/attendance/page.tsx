import { StudentRecords } from "@/features/student/components/StudentRecords";

export const metadata = {
    title: "Historial de Asistencia | AcademiX",
    description: "Consulta tu historial de asistencias, inasistencias, llegadas tarde y justificaciones.",
};

export default function StudentAttendancePage() {
    return (
        <div className="flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 min-h-screen max-w-6xl mx-auto w-full">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Historial de Asistencia</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Revisa el registro de tus asistencias, inasistencias y gestiona tus justificaciones con soporte.
                </p>
            </div>
            
            <StudentRecords defaultTab="attendance" />
        </div>
    );
}
