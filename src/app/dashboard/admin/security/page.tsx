import { redirect } from "next/navigation";

export default function SecurityRedirectPage() {
  redirect("/dashboard/admin/settings");
}
