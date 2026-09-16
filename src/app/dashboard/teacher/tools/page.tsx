import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ToolsDashboard } from "@/features/tools/components/ToolsDashboard";
import { courseService } from "@/features/teacher/services/courseService";

export const metadata = {
    title: "Centro de Herramientas Académicas | AcademiX",
    description: "Panel modular y catálogo de herramientas y utilidades autónomas para la gestión formativa.",
};

export default async function TeacherToolsPage() {
    const session = await auth.api.getSession({ headers: await headers() });
    const user = session?.user as any;
    const role = Array.isArray(user?.roles) ? user?.roles[0] : user?.role;

    if (!session || (role !== "teacher" && role !== "admin")) {
        redirect("/dashboard");
    }

    const groups = role === "teacher"
        ? await courseService.getTeacherGroups(session.user.id)
        : [];

    return (
        <div className="w-full max-w-[1900px] mx-auto h-full flex-1 flex flex-col min-h-0">
            <ToolsDashboard initialGroups={groups} userRole="teacher" />
        </div>
    );
}
