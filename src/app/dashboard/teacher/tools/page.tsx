import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ToolsDashboard } from "@/features/tools/components/ToolsDashboard";

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

    return (
        <div className="p-4 md:p-6 lg:p-8 max-w-[1900px] mx-auto w-full">
            <ToolsDashboard />
        </div>
    );
}
