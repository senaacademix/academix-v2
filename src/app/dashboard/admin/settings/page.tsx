import { AdminSettings } from "@/features/admin/components/AdminSettings";
import { getSystemSettingsAction } from "@/features/admin/actions/adminActions";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session || session.user.role !== "admin") {
        redirect("/dashboard/student");
    }

    const settings = await getSystemSettingsAction();

    return (
        <AdminSettings 
            initialSettings={settings as any} 
            initialRequests={[]} 
            isObserver={false}
        />
    );
}
