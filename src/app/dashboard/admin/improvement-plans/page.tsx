import { redirect } from "next/navigation";

export default function AdminImprovementPlansRedirectPage() {
    redirect("/dashboard/admin/users?subtab=plans");
}
