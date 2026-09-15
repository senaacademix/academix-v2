import {
    FileSpreadsheet,
    BookOpenCheck,
    CalendarClock,
    FileCode2,
    LucideIcon
} from "lucide-react";

export interface ToolDefinition {
    id: string;
    title: string;
    shortTitle: string;
    description: string;
    category: "Evaluación" | "Curricular" | "Horarios" | "Analítica";
    status: "available" | "coming-soon";
    isAutonomous: boolean;
    version: string;
    icon: LucideIcon;
    color: string;
    badgeBg: string;
    features: string[];
    author?: string;
}

export const TOOLS_REGISTRY: ToolDefinition[] = [
    {
        id: "sofia-reports",
        title: "Reporte de Juicios Evaluativos",
        shortTitle: "Juicios Evaluativos",
        description: "Carga archivos Excel de Sofia Plus para generar matrices visuales de juicios evaluativos, analítica interactiva de aprendices y organizador curricular de RA con exportación a Excel y PDF.",
        category: "Evaluación",
        status: "available",
        isAutonomous: true,
        version: "v1.2",
        icon: FileSpreadsheet,
        color: "text-emerald-600 dark:text-emerald-400",
        badgeBg: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
        features: [
            "Matriz dinámica de juicios (Aprobados y Por Evaluar)",
            "Organizador interactivo de Resultados de Aprendizaje por periodo",
            "Analítica gráfica con filtros, avance y estado por ficha",
            "Exportación corporativa a Excel estilizado y PDF oficial",
            "Procesamiento autónomo y 100% seguro en el navegador"
        ],
        author: "AcademiX Labs"
    }
];
