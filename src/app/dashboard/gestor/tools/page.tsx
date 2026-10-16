import { auth } from "@/lib/auth";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ToolsDashboard } from "@/features/tools/components/ToolsDashboard";
import prisma from "@/lib/prisma";
import { gestorService } from "@/features/gestor/services/gestorService";

export const metadata = {
    title: "Centro de Herramientas Académicas | AcademiX",
    description: "Panel modular y catálogo de herramientas y utilidades autónomas para la gestión formativa.",
};

export default async function GestorToolsPage({
    searchParams,
}: {
    searchParams?: Promise<{ programId?: string; tool?: string }>;
}) {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session || (session.user.role !== "gestor" && session.user.role !== "admin")) {
        redirect("/dashboard");
    }

    const resolvedSearchParams = searchParams ? await searchParams : undefined;
    const programIdParam = resolvedSearchParams?.programId;

    const cookieStore = await cookies();
    const cookieProgramId = cookieStore.get("academix_gestor_program_id")?.value;
    let effectiveProgramId = programIdParam || cookieProgramId;

    let programName = "";

    if (session.user.role === "gestor") {
        const managedPrograms = await gestorService.getManagedPrograms(session.user.id);
        const hasEffective = managedPrograms.some((p) => p.id === effectiveProgramId);
        if (!effectiveProgramId || !hasEffective) {
            if (managedPrograms.length >= 1) {
                effectiveProgramId = managedPrograms[0].id;
                programName = managedPrograms[0].name;
            } else {
                redirect("/dashboard/gestor");
            }
        } else {
            const found = managedPrograms.find((p) => p.id === effectiveProgramId);
            if (found) programName = found.name;
        }
    } else {
        // Admin or observer
        if (effectiveProgramId) {
            const prog = await prisma.program.findUnique({
                where: { id: effectiveProgramId },
                select: { name: true }
            });
            if (prog) programName = prog.name;
        } else {
            const firstProg = await prisma.program.findFirst({
                select: { id: true, name: true },
                orderBy: { name: "asc" }
            });
            if (firstProg) {
                effectiveProgramId = firstProg.id;
                programName = firstProg.name;
            }
        }
    }

    return (
        <div className="p-4 md:p-6 lg:p-8 max-w-[1900px] mx-auto w-full">
            <ToolsDashboard
                userRole={session.user.role}
                programId={effectiveProgramId}
                programName={programName}
            />
        </div>
    );
}
