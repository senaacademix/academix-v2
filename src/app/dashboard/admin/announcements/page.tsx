import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { announcementService } from "@/features/announcements/services/announcementService";
import { AdminAnnouncementManager } from "@/features/announcements/components/AdminAnnouncementManager";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Gestor del Blog de Anuncios | AcademiX",
    description: "Panel de administración y redacción en Markdown para comunicados, noticias y anuncios institucionales.",
};

export default async function AdminAnnouncementsPage() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session || session.user.role !== "admin") {
        redirect("/dashboard");
    }

    const announcements = await announcementService.getAllAnnouncementsForAdmin();

    return (
        <div className="container mx-auto py-6 sm:py-8 px-4 sm:px-6 max-w-7xl">
            <AdminAnnouncementManager initialAnnouncements={announcements} />
        </div>
    );
}
