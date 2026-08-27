import { redirect } from "next/navigation";

export default function AdminAdminsRedirectPage() {
    redirect("/dashboard/admin/users?tab=admins");
}
