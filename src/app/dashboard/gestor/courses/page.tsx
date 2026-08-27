import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AcademicManagement } from "@/features/admin/components/AcademicManagement";
import { getAllCoursesAdminAction, getAllUsersAction, getSystemSettingsAction } from "@/features/admin/actions/adminActions";

export const metadata = {
    title: "Estructura y Ambientes | AcademiX",
    description: "Gestión de fichas, competencias curriculares y asignación de ambientes.",
};

export default async function GestorCoursesPage() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session || (session.user.role !== "gestor" && session.user.role !== "admin")) {
        redirect("/dashboard/student");
    }

    const [{ courses, total }, { users: allUsers }, settings] = await Promise.all([
        getAllCoursesAdminAction({ limit: 100 }),
        getAllUsersAction({ role: "teacher", limit: 500 }),
        getSystemSettingsAction()
    ]);

    // Map courses to match UI expected types
    const mappedCourses = courses.map((course: any) => ({
        ...course,
        createdAt: new Date(course.createdAt),
        startDate: course.startDate ? new Date(course.startDate) : null,
        endDate: course.endDate ? new Date(course.endDate) : null,
    }));

    const mappedTeachers = allUsers.map((user: any) => ({
        id: user.id,
        name: user.name,
        email: user.email,
    }));

    return (
        <div className="p-4 sm:p-8">
            <AcademicManagement
                initialCourses={mappedCourses as any}
                teachers={mappedTeachers}
                totalCount={total}
                isObserver={false}
                currentUserRole={session.user.role}
                settings={settings}
            />
        </div>
    );
}
