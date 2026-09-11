import { auth } from "@/lib/auth";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { GestorDashboardView } from "@/features/gestor/components/GestorDashboardView";
import { 
    getGestorDashboardStatsAction, 
    getGestorRecentActivityAction 
} from "@/features/gestor/actions/gestorActions";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Panel del Gestor Académico | AcademiX",
    description: "Gestión curricular, matrícula de aprendices, franjas horarias y ambientes de formación.",
};

export default async function GestorDashboardPage({
    searchParams,
}: {
    searchParams?: Promise<{ programId?: string }>;
}) {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session || (session.user.role !== "gestor" && session.user.role !== "admin")) {
        redirect("/dashboard/student");
    }

    const resolvedSearchParams = searchParams ? await searchParams : undefined;
    const cookieStore = await cookies();
    const cookieProgramId = cookieStore.get("academix_gestor_program_id")?.value;
    const effectiveProgramId = resolvedSearchParams?.programId || cookieProgramId;

    const [stats, recentActivity] = await Promise.all([
        getGestorDashboardStatsAction(),
        getGestorRecentActivityAction(10, effectiveProgramId)
    ]);

    return (
        <div className="container mx-auto py-8">
            <GestorDashboardView 
                stats={stats} 
                recentActivity={recentActivity} 
                userName={session.user.name || undefined}
            />
        </div>
    );
}
