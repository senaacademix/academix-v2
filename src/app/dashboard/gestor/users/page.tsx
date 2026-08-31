import { auth } from "@/lib/auth";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { UnifiedUserManagement } from "@/features/admin/components/UnifiedUserManagement";
import { getAllUsersAction, getAdminsAndObserversAction } from "@/features/admin/actions/adminActions";
import { getGroupsAction, getProgramsAction } from "@/features/admin/actions/academicActions";
import { getAllImprovementPlansAdmin } from "@/features/student/actions/improvementPlanActions";

export const metadata = {
    title: "Gestión y Matrícula | AcademiX",
    description: "Matrícula de aprendices y planes de mejoramiento.",
};

export default async function GestorUsersPage({
    searchParams,
}: {
    searchParams?: Promise<{ tab?: string; subtab?: string; programId?: string }>;
}) {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session || (session.user.role !== "gestor" && session.user.role !== "admin")) {
        redirect("/dashboard/student");
    }

    const resolvedSearchParams = searchParams ? await searchParams : undefined;
    const tabParam = resolvedSearchParams?.tab;
    const programIdParam = resolvedSearchParams?.programId;
    
    const [groups, programs, admins, teachersResult, improvementPlansRes] = await Promise.all([
        getGroupsAction(),
        getProgramsAction(),
        getAdminsAndObserversAction(),
        getAllUsersAction({ role: "teacher", limit: 500 }),
        getAllImprovementPlansAdmin(),
    ]);

    const cookieStore = await cookies();
    const cookieProgramId = cookieStore.get("academix_gestor_program_id")?.value;
    let effectiveProgramId = programIdParam || cookieProgramId;

    if (session.user.role === "gestor" && !effectiveProgramId) {
        if (programs.length === 1) {
            effectiveProgramId = programs[0].id;
        } else {
            redirect("/dashboard/gestor");
        }
    }

    const initialTab =
        tabParam === "teachers" ? "teachers" : "students";
    const initialSubTab = resolvedSearchParams?.subtab === "plans" ? "plans" : "directory";

    const plans = improvementPlansRes.success && improvementPlansRes.data ? improvementPlansRes.data : [];

    const targetProgramId = effectiveProgramId || (programs.length > 0 ? programs[0].id : "none");
    const initialLectivaGroup = groups.find(
        (g) => (targetProgramId === "none" || g.programId === targetProgramId) && (g as any).categoria === "LECTIVA"
    ) || groups.find((g) => targetProgramId === "none" || g.programId === targetProgramId) || groups[0];
    const defaultGroupId = initialLectivaGroup ? initialLectivaGroup.id : "none";

    const { users: students, total: totalStudents } = await getAllUsersAction({
        limit: 20,
        role: "student",
        groupId: defaultGroupId !== "none" ? defaultGroupId : undefined,
        programId: defaultGroupId === "none" && targetProgramId !== "none" ? targetProgramId : undefined,
    });

    const filteredPrograms = session.user.role === "gestor" && effectiveProgramId
        ? programs.filter((p) => p.id === effectiveProgramId)
        : programs;

    const mappedPrograms = filteredPrograms.map((p) => ({
        id: p.id,
        name: p.name,
    }));

    return (
        <div className="p-4 sm:p-8">
            <UnifiedUserManagement
                studentData={{
                    initialUsers: students,
                    totalCount: totalStudents,
                    initialGroupId: defaultGroupId,
                    initialGroups: groups.map((g) => ({
                        id: g.id,
                        name: g.name,
                        programId: g.programId,
                        categoria: (g as any).categoria,
                    })),
                    initialPrograms: mappedPrograms,
                    isObserver: false,
                    plans,
                }}
                teacherData={{
                    initialTeachers: teachersResult.users as any,
                }}
                adminData={{
                    initialUsers: admins as any,
                    programs: mappedPrograms,
                    currentUserId: session.user.id,
                }}
                currentUserRole={session.user.role}
                defaultTab={initialTab}
                defaultSubTab={initialSubTab}
            />
        </div>
    );
}
