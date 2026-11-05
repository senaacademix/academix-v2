import { auth } from "@/lib/auth";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { gestorService } from "@/features/gestor/services/gestorService";

export const dynamic = "force-dynamic";

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
    let effectiveProgramId = resolvedSearchParams?.programId || cookieProgramId;

    if (!effectiveProgramId && session.user.role === "gestor") {
        const managed = await gestorService.getManagedPrograms(session.user.id);
        if (managed.length > 0) {
            effectiveProgramId = managed[0].id;
        }
    }

    if (effectiveProgramId) {
        redirect(`/dashboard/gestor/users?programId=${effectiveProgramId}`);
    }

    redirect("/dashboard/gestor/users");
}
