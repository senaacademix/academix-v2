import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { UnifiedUserManagement } from "@/features/admin/components/UnifiedUserManagement";
import { getAllUsersAction, getAdminsAndObserversAction } from "@/features/admin/actions/adminActions";
import { getGroupsAction, getProgramsAction } from "@/features/admin/actions/academicActions";
import { getAllImprovementPlansAdmin } from "@/features/student/actions/improvementPlanActions";

export const metadata = {
    title: "Gestión de Usuarios | AcademiX",
    description: "Administra los estudiantes, docentes y administradores del sistema.",
};

export default async function AdminUsersPage({
    searchParams,
}: {
    searchParams?: Promise<{ tab?: string; subtab?: string }>;
}) {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session || (session.user.role !== "admin" && session.user.role !== "gestor" && session.user.role !== "observer")) {
        redirect("/dashboard/student");
    }

    const resolvedSearchParams = searchParams ? await searchParams : undefined;
    const tabParam = resolvedSearchParams?.tab;
    const initialTab =
        tabParam === "teachers" ? "teachers" : tabParam === "admins" ? "admins" : "students";
    const initialSubTab = resolvedSearchParams?.subtab === "plans" ? "plans" : "directory";

    const [groups, programs, admins, teachersResult, improvementPlansRes] = await Promise.all([
        getGroupsAction(),
        getProgramsAction(),
        getAdminsAndObserversAction(),
        getAllUsersAction({ role: "teacher", limit: 500 }),
        getAllImprovementPlansAdmin(),
    ]);

    const plans = improvementPlansRes.success && improvementPlansRes.data ? improvementPlansRes.data : [];

    const initialProgramId = programs.length > 0 ? programs[0].id : "none";
    const initialLectivaGroup = groups.find(
        (g) => (initialProgramId === "none" || g.programId === initialProgramId) && (g as any).categoria === "LECTIVA"
    ) || groups.find((g) => initialProgramId === "none" || g.programId === initialProgramId) || groups[0];
    const defaultGroupId = initialLectivaGroup ? initialLectivaGroup.id : "none";

    const { users: students, total: totalStudents } = await getAllUsersAction({
        limit: 20,
        role: "student",
        groupId: defaultGroupId !== "none" ? defaultGroupId : undefined,
        programId: defaultGroupId === "none" && initialProgramId !== "none" ? initialProgramId : undefined,
    });

    const mappedPrograms = programs.map((p) => ({
        id: p.id,
        name: p.name,
        groups: (p.groups || []).map((g: any) => ({
            id: g.id,
            name: g.name,
            code: g.code,
            programId: p.id,
            categoria: g.categoria
        }))
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
