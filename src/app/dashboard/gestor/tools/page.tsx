import { auth } from "@/lib/auth";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ToolsDashboard } from "@/features/tools/components/ToolsDashboard";
import prisma from "@/lib/prisma";
import { gestorService } from "@/features/gestor/services/gestorService";

export const dynamic = "force-dynamic";

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
    const user = session?.user as any;
    const role = user?.role || (Array.isArray(user?.roles) ? user?.roles[0] : undefined);

    if (!session || (role !== "gestor" && role !== "admin")) {
        redirect("/dashboard");
    }

    const resolvedSearchParams = searchParams ? await searchParams : undefined;
    const programIdParam = resolvedSearchParams?.programId;

    const cookieStore = await cookies();
    const cookieProgramId = cookieStore.get("academix_gestor_program_id")?.value;
    let effectiveProgramId = programIdParam || cookieProgramId;

    let programName = "";

    if (role === "gestor") {
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
                userRole={role || "gestor"}
                programId={effectiveProgramId}
                programName={programName}
            />
        </div>
    );
}
