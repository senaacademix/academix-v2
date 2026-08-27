import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getProgramsAction } from "@/features/admin/actions/academicActions";
import { getEnvironmentsAction } from "@/features/admin/actions/environmentActions";
import { AdvancedAnalyticsView } from "@/features/admin/components/AdvancedAnalyticsView";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Reportes y Asistencia | AcademiX",
    description: "Tablero interactivo de análisis horario, carga de instructores y ocupación de aulas.",
};

export default async function GestorAnalyticsPage() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session || (session.user.role !== "gestor" && session.user.role !== "admin")) {
        redirect("/dashboard/student");
    }

    const programs = await getProgramsAction();
    const environments = await getEnvironmentsAction();

    // Map programs/groups to match the frontend AdvancedAnalyticsView data structures
    const mappedPrograms = programs.map((program: any) => ({
        id: program.id,
        name: program.name,
        description: program.description,
        maxTeacherHours: program.maxTeacherHours,
        startDate: program.startDate ? program.startDate.toISOString() : null,
        endDate: program.endDate ? program.endDate.toISOString() : null,
        teachers: program.teachers.map((t: any) => ({
            id: t.id,
            name: t.name,
            email: t.email,
        })),
        periods: program.periods.map((period: any) => ({
            id: period.id,
            name: period.name,
        })),
        groups: program.groups.map((group: any) => ({
            id: group.id,
            name: group.name,
            description: group.description,
            environmentId: group.environmentId,
            environment: group.environment ? {
                id: group.environment.id,
                name: group.environment.name,
            } : null,
            periodId: group.periodId,
            period: group.period ? {
                id: group.period.id,
                name: group.period.name,
            } : null,
            courses: group.courses.map((c: any) => ({
                id: c.id,
                title: c.title,
                teacherId: c.teacherId,
                weeklyHours: c.weeklyHours,
                color: c.color,
                startDate: c.startDate ? c.startDate.toISOString() : null,
                endDate: c.endDate ? c.endDate.toISOString() : null,
                teacher: c.teacher ? {
                    id: c.teacher.id,
                    name: c.teacher.name,
                } : null,
                schedules: (c.schedules || []).map((s: any) => ({
                    id: s.id,
                    dayOfWeek: s.dayOfWeek,
                    startTime: s.startTime,
                    endTime: s.endTime,
                })),
            })),
        })),
    }));

    const mappedEnvironments = environments.map((env: any) => ({
        id: env.id,
        name: env.name,
        type: env.type,
        capacity: env.capacity,
    }));

    return (
        <div className="p-4 sm:p-8">
            <AdvancedAnalyticsView
                programs={mappedPrograms}
                environments={mappedEnvironments}
            />
        </div>
    );
}
