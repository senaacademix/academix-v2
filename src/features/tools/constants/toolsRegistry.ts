import {
    FileSpreadsheet,
    Dices,
    Shuffle,
    LucideIcon
} from "lucide-react";

export interface ToolDefinition {
    id: string;
    title: string;
    shortTitle: string;
    description: string;
    category: "Evaluación" | "Curricular" | "Horarios" | "Analítica" | "Dinámicas" | "Pedagógica";
    status: "available" | "coming-soon";
    isAutonomous: boolean;
    version: string;
    icon: LucideIcon;
    color: string;
    badgeBg: string;
    features: string[];
    author?: string;
    allowedRoles?: ("teacher" | "gestor" | "admin")[];
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
    },
    {
        id: "roulette",
        title: "Ruleta de Participación y Notas",
        shortTitle: "Ruleta de Aprendices",
        description: "Dinámica interactiva para seleccionar aprendices al azar de tu ficha, ideal para exposiciones, preguntas diagnósticas, participación activa y calificación directa con sonidos retro y animación física.",
        category: "Dinámicas",
        status: "available",
        isAutonomous: true,
        version: "v1.0",
        icon: Dices,
        color: "text-primary",
        badgeBg: "bg-primary/10 text-primary border-primary/20",
        features: [
            "Selección aleatoria ponderada con animación física de ruleta",
            "Historial en vivo de participantes seleccionados",
            "Asignación y registro rápido de calificaciones",
            "Exclusión temporal y reincorporación de aprendices",
            "Exportación corporativa a Excel (.xlsx) y PDF oficial",
            "Efectos de sonido retro y lluvia de confeti para ganadores"
        ],
        author: "AcademiX Instructor",
        allowedRoles: ["teacher"]
    },
    {
        id: "group-generator",
        title: "Creador de Grupos de Trabajo",
        shortTitle: "Organizador de Grupos",
        description: "Distribuye y organiza automáticamente los aprendices de tu ficha en equipos colaborativos de trabajo o arrástralos manualmente mediante drag & drop con exportación a Excel y PDF.",
        category: "Pedagógica",
        status: "available",
        isAutonomous: true,
        version: "v1.0",
        icon: Shuffle,
        color: "text-primary",
        badgeBg: "bg-primary/10 text-primary border-primary/20",
        features: [
            "Generación aleatoria balanceada por número de equipos o aprendices",
            "Organización manual fluida con drag & drop entre columnas",
            "Exportación corporativa a Excel multihoja y PDF institucional",
            "Guardado e importación de proyectos en formato JSON",
            "Nombres personalizables por cada equipo de trabajo"
        ],
        author: "AcademiX Instructor",
        allowedRoles: ["teacher"]
    }
];
