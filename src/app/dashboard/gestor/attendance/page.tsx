import { auth } from "@/lib/auth";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { gestorService } from "@/features/gestor/services/gestorService";
import { getGestorGroupsAction } from "@/features/gestor/actions/gestorActions";
import { GestorAttendanceView } from "@/features/gestor/components/GestorAttendanceView";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Sábana Semanal de Asistencia | AcademiX",
    description: "Supervisión institucional de asistencia semanal y mensual de fichas por horarios e instructores.",
};

export default async function GestorAttendancePage({
    searchParams,
}: {
    searchParams?: Promise<{ programId?: string; groupId?: string }>;
}) {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session || (session.user.role !== "gestor" && session.user.role !== "admin" && session.user.role !== "observer")) {
        redirect("/dashboard/student");
    }

    const resolvedSearchParams = searchParams ? await searchParams : undefined;
    const programIdParam = resolvedSearchParams?.programId;
    const requestedGroupId = resolvedSearchParams?.groupId;

    const cookieStore = await cookies();
    const cookieProgramId = cookieStore.get("academix_gestor_program_id")?.value;
    let effectiveProgramId = programIdParam || cookieProgramId;

    let managedPrograms: Array<{ id: string; name: string }> = [];

    if (session.user.role === "gestor") {
        managedPrograms = await gestorService.getManagedPrograms(session.user.id);
        if (!effectiveProgramId) {
            if (managedPrograms.length >= 1) {
                effectiveProgramId = managedPrograms[0].id;
            } else {
                redirect("/dashboard/gestor");
            }
        }
    } else {
        // Para admin u observer
        managedPrograms = await prisma.program.findMany({
            select: { id: true, name: true },
            orderBy: { name: "asc" }
        });
        if (!effectiveProgramId && managedPrograms.length > 0) {
            effectiveProgramId = managedPrograms[0].id;
        }
    }

    // Obtener las fichas del programa activo
    const groups = await getGestorGroupsAction(effectiveProgramId);

    const mappedGroups = groups.map((g) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        programId: g.programId,
        programName: g.program?.name || "",
        studentCount: g._count?.students || 0,
        categoria: g.categoria,
    }));

    // Determinar grupo seleccionado
    const selectedGroupId = requestedGroupId && mappedGroups.some(g => g.id === requestedGroupId)
        ? requestedGroupId
        : (mappedGroups[0]?.id || "");

    return (
        <div className="container mx-auto py-6 sm:py-8 px-3 sm:px-6 max-w-7xl">
            <GestorAttendanceView
                groups={mappedGroups}
                initialGroupId={selectedGroupId}
                programId={effectiveProgramId}
                programs={managedPrograms}
                userRole={session.user.role}
                userName={session.user.name || undefined}
            />
        </div>
    );
}
