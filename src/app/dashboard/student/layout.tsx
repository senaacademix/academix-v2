import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { ShieldAlert } from "lucide-react";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
    const session = await auth.api.getSession({ headers: await headers() });

    if (session?.user?.role === "student") {
        const settings = await prisma.systemSettings.findUnique({
            where: { id: "settings" },
            select: { studentAccessEnabled: true }
        });

        if (settings && settings.studentAccessEnabled === false) {
            return (
                <div className="min-h-screen flex items-center justify-center p-4 bg-background">
                    <div className="max-w-md w-full p-8 rounded-3xl bg-card border border-border shadow-xl text-center space-y-4">
                        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto border border-amber-500/20 shadow-inner">
                            <ShieldAlert className="w-8 h-8" />
                        </div>
                        <h2 className="text-xl font-bold tracking-tight text-foreground">
                            Acceso Temporalmente Deshabilitado
                        </h2>
                        <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                            El acceso a la plataforma para estudiantes se encuentra deshabilitado temporalmente por la administración del sistema. Por favor, intenta de nuevo más tarde o consulta con tu Gestor Académico.
                        </p>
                    </div>
                </div>
            );
        }
    }

    return <>{children}</>;
}
