import { redirect } from "next/navigation";

export default async function TeacherElectionsPage() {
    redirect("/dashboard/teacher/tools?tool=vocero-election");
}
