import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { electionService } from "@/features/elections/services/electionService";
import { StudentElectionDashboard } from "@/features/elections/components/student/StudentElectionDashboard";
import { Award, Sparkles } from "lucide-react";

export const metadata = {
    title: "Elección de Vocero y Representante | AcademiX",
    description: "Participa democráticamente en la postulación y elección de Vocero Principal y Suplente de tu ficha.",
};

export default async function StudentElectionsPage() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || session.user.role !== "student") {
        redirect("/signin");
    }

    const { election, group } = await electionService.getStudentElection(session.user.id);

    return (
        <div className="flex flex-col gap-6 w-full min-w-0 max-w-full pb-12">
            {/* Header Hero Banner SENA */}
            <div className="relative rounded-3xl bg-card border border-border/80 p-6 sm:p-8 backdrop-blur-2xl shadow-sm overflow-hidden transition-colors">
                <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 blur-[100px] rounded-full pointer-events-none" />

                <div className="relative z-10 space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold shadow-2xs">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Democracia y Liderazgo Formativo</span>
                    </div>
                    <h1 className="text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight">
                        Elección de{" "}
                        <span className="bg-gradient-to-r from-foreground via-foreground/80 to-amber-500 bg-clip-text text-transparent">
                            Vocero de Ficha
                        </span>
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed font-medium">
                        Ejerce tu derecho democrático postulándote como candidato o votando por quien representará a tu grupo formativo ante los instructores y coordinación.
                    </p>
                </div>
            </div>

            <StudentElectionDashboard
                initialElection={election}
                group={group}
                studentName={session.user.name}
            />
        </div>
    );
}
