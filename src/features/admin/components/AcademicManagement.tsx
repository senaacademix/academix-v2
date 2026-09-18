"use client";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";


import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Search, Trash2, Edit, Plus, Folder, BookOpen, Users, Calendar, 
    ChevronRight, Layers, Clock, X, Info, GraduationCap, ArrowLeft, ArrowUpRight, GripVertical,
    AlertCircle, Building, Code, Database, Binary, MessageSquare, Terminal,
    ShieldCheck, Cloud, Rocket, NotebookTabs, Lock as LockIcon, Download,
    Activity, Upload, AlertTriangle, School, Eye, HelpCircle, FileText, Loader2,
    ImageIcon, Link as LinkIcon, Copy, Check, MoreVertical, GitBranch,
    CalendarDays, FileSpreadsheet
} from "lucide-react";
import { generateAndDownloadCurriculumPdf, CurriculumExportOptions } from "../utils/curriculumPdfExport";
import { exportProgramOverviewPdf, exportProgramOverviewExcel } from "../utils/programExportUtils";
import { Switch } from "@/components/ui/switch";
import { formatCalendarDate } from "@/lib/dateUtils";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    rectSortingStrategy,
    useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { format } from "date-fns";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { cn } from "@/lib/utils";

// Server Actions
import { deleteCourseAction, getAllUsersAction, deleteUserAction } from "@/app/admin-actions";
import {
    getProgramTimelinesAction,
    createTimelineAction,
    updateTimelineAction,
    deleteTimelineAction,
    duplicateTimelineAction,
} from "../actions/timelineActions";
import {
    getProgramsAction,
    createProgramAction,
    updateProgramAction,
    deleteProgramAction,
    getGestoresAction,
    createPeriodAction,
    updatePeriodAction,
    deletePeriodAction,
    getGroupsAction,
    createGroupAction,
    updateGroupAction,
    deleteGroupAction,
    assignStudentToGroupAction,
    assignCourseToPeriodAction,
    reorderCoursesAction,
    reorderPeriodsAction,
    registerStudentManualAction,
    registerStudentsBulkAction,
    assignTeacherToProgramAction,
    registerTeacherManualAction,
    registerTeachersBulkAction,
    registerSingleTeacherAction,
    assignGroupsToTeacherAction,
    getTeacherGroupsAction,
    scheduleGroupCourseAction,
    updateGroupCourseScheduleAction,
    deleteGroupCourseAction,
    checkScheduleConflictsAction,
    updateTeacherAction,
    importPeriodsAndCoursesAction,
    importGroupsAndStudentsAction,
    registerSingleStudentAction,
    importSinglePeriodAndCoursesAction,
    importSingleGroupAndStudentsAction,
    createOrGetGroupForImportAction,
} from "@/features/admin/actions/academicActions";
import { createCourseAction, updateCourseAction } from "@/features/teacher/actions/courseActions";
import { 
    getTeacherAvailabilityForAdminAction, 
    unlockTeacherAvailabilityAction,
    adminSaveTeacherAvailabilityAction,
    adminLockTeacherAvailabilityAction 
} from "@/features/schedule/actions/availabilityActions";
import {
    getTeacherQualificationsAction,
    unlockTeacherQualificationsAction,
    adminSaveTeacherQualificationsAction,
    adminLockTeacherQualificationsAction
} from "@/features/teacher/actions/qualificationActions";
import * as XLSX from "xlsx";
import { TeacherAvailabilityView } from "@/features/schedule/components/TeacherAvailabilityView";
import { TeacherQualificationsView } from "@/features/teacher/components/TeacherQualificationsView";
import { DayOfWeek } from "@/generated/prisma/client";
import { EnvironmentManagement, TrainingEnvironment } from "@/features/admin/components/EnvironmentManagement";
import { StudentNovedadBadge } from "@/components/StudentNovedadBadge";
import { AdminProgramReadOnlyView } from "./program-view/AdminProgramReadOnlyView";
import { AcademicTabsHelpModal, AcademicTabKey } from "./AcademicTabsHelpModal";

const DAYS_OF_WEEK_ORDERED: { value: DayOfWeek; label: string }[] = [
    { value: "MONDAY", label: "Lunes" },
    { value: "TUESDAY", label: "Martes" },
    { value: "WEDNESDAY", label: "Miércoles" },
    { value: "THURSDAY", label: "Jueves" },
    { value: "FRIDAY", label: "Viernes" },
    { value: "SATURDAY", label: "Sábado" },
    { value: "SUNDAY", label: "Domingo" }
];

const toFormat12h = (t24: string) => {
    if (!t24) return "";
    const [h, m] = t24.split(":").map(Number);
    const ap = h >= 12 ? "p.m." : "a.m.";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ap}`;
};

const formatWeeklyHours = (hours: number | null | undefined) => {
    if (hours == null || hours === 0) return "";
    const totalMinutes = Math.round(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const BADGE_COLORS: Record<string, { label: string; bg: string }> = {
    slate: { label: "Gris", bg: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20" },
    blue: { label: "Azul", bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
    green: { label: "Verde", bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
    red: { label: "Rojo", bg: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" },
    amber: { label: "Naranja", bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
    purple: { label: "Púrpura", bg: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20" },
    pink: { label: "Rosa", bg: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20" },
};

const getInitials = (name: string | null) => {
    if (!name) return "NN";
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return "NN";
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

const getCourseIcon = (title: string) => {
    const t = title.toLowerCase().trim();
    if (t.includes("programación") || t.includes("código") || t.includes("programacion")) {
        if (t.includes("introducción") || t.includes("introduccion")) return Terminal;
        return Code;
    }
    if (t.includes("datos") || t.includes("database") || t.includes("sql") || t.includes("nosql")) {
        return Database;
    }
    if (t.includes("matemática") || t.includes("matematica") || t.includes("cálculo") || t.includes("calculo") || t.includes("álgebra") || t.includes("algebra")) {
        return Binary;
    }
    if (t.includes("comunicación") || t.includes("comunicacion") || t.includes("ética") || t.includes("etica") || t.includes("inglés") || t.includes("ingles")) {
        if (t.includes("comunicación") || t.includes("comunicacion")) return MessageSquare;
        return BookOpen;
    }
    if (t.includes("arquitectura") || t.includes("ingeniería") || t.includes("ingenieria") || t.includes("diseño") || t.includes("metodología") || t.includes("metodologia") || t.includes("scrum")) {
        return Layers;
    }
    if (t.includes("pruebas") || t.includes("calidad") || t.includes("qa") || t.includes("seguridad") || t.includes("ciberseguridad")) {
        return ShieldCheck;
    }
    if (t.includes("despliegue") || t.includes("devops") || t.includes("nube") || t.includes("cloud") || t.includes("docker")) {
        return Cloud;
    }
    if (t.includes("proyecto") || t.includes("grado") || t.includes("tesis") || t.includes("innovación") || t.includes("innovacion")) {
        return Rocket;
    }
    return NotebookTabs;
};

interface CurriculumTimeline {
    id: string;
    name: string;
    description: string | null;
    code?: string | null;
    isDefault: boolean;
    programId: string;
    periods?: Period[];
    createdAt?: Date;
}

interface Program {
    id: string;
    name: string;
    description: string | null;
    startDate?: Date | string | null;
    endDate?: Date | string | null;
    scheduleTitle?: string | null;
    maxTeacherHours?: number | null;
    createdAt: Date;
    periods: Period[];
    timelines?: CurriculumTimeline[];
    groups: Group[];
    teachers: Teacher[];
    environments?: TrainingEnvironment[];
}

interface Period {
    id: string;
    name: string;
    description: string | null;
    programId: string;
    createdAt: Date;
    courses: Course[];
    esEspecial?: boolean;
    timelineId?: string | null;
    timeline?: CurriculumTimeline | null;
}

interface Group {
    id: string;
    name: string;
    description: string | null;
    programId: string;
    createdAt: Date;
    students: Student[];
    teachers?: Teacher[];
    courses?: Course[];
    startDate: Date | null;
    endDate: Date | null;
    categoria?: string;
    environmentId?: string | null;
    environment?: {
        id: string;
        name: string;
        capacity: number;
        location: string | null;
        resources: string[];
        description?: string | null;
    } | null;
}

interface Student {
    id: string;
    name: string;
    email: string;
    groupId: string | null;
    profile?: {
        identificacion: string;
        nombres: string;
        apellido: string;
        telefono: string | null;
        novedad?: string | null;
        novedadColor?: string | null;
    } | null;
}

interface Course {
    id: string;
    title: string;
    description: string | null;
    externalUrl: string | null;
    weeklyHours?: number | null;
    badge?: string | null;
    badgeColor?: string | null;
    createdAt: Date;
    groupId?: string | null;
    group?: Group | null;
    periodId: string | null;
    period?: {
        id: string;
        name: string;
        program?: {
            id: string;
            name: string;
        } | null;
    } | null;
    _count: {
        enrollments: number;
    };
}

interface Teacher {
    id: string;
    name: string | null;
    email: string;
    availabilityLocked?: boolean;
    qualifiedCoursesLocked?: boolean;
    profile?: {
        identificacion: string;
        nombres: string;
        apellido: string;
        telefono: string | null;
    } | null;
}

interface AcademicManagementProps {
    initialCourses: Course[];
    teachers: Teacher[];
    totalCount: number;
    isObserver?: boolean;
    currentUserRole?: string;
    settings?: any;
    initialProgramId?: string;
}

interface SortableCourseItemProps {
    course: Course;
    openEditCourse: (course: Course) => void;
    triggerDelete: (type: "program" | "period" | "group" | "course" | "teacher", id: string, name: string) => void;
    setSelectedCourseForDesc: (course: Course) => void;
    setDescriptionDialogOpen: (open: boolean) => void;
}

function SortableCourseItem({
    course,
    openEditCourse,
    triggerDelete,
    setSelectedCourseForDesc,
    setDescriptionDialogOpen
}: SortableCourseItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: course.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? "none" : transition,
        opacity: isDragging ? 0.6 : 1,
        zIndex: isDragging ? 50 : "auto",
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="flex justify-between items-center p-3 rounded-xl bg-background/50 border border-muted/20 hover:border-muted/50 hover:shadow-sm transition-colors duration-200"
        >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <Tooltip><TooltipTrigger asChild><div 
                                    {...attributes} 
                                    {...listeners}
                                    className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground/75 p-1 transition-colors rounded hover:bg-muted/5 shrink-0"
                                >
                                    <GripVertical className="h-4 w-4" />
                                </div></TooltipTrigger><TooltipContent><p>Arrastrar para ordenar</p></TooltipContent></Tooltip>
                <div className="min-w-0 pr-2 flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold truncate text-foreground/90">{course.title}</p>
                    {course.weeklyHours !== undefined && course.weeklyHours !== null && course.weeklyHours > 0 && (
                        <Badge variant="secondary" className="shrink-0 bg-primary/10 text-primary border-primary/20 text-[10px] font-semibold py-0.5 px-1.5 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatWeeklyHours(course.weeklyHours)}
                        </Badge>
                    )}
                    {course.badge && (
                        <Badge className={cn("shrink-0 border text-[10px] font-bold py-0.5 px-1.5", (course.badgeColor && BADGE_COLORS[course.badgeColor]) ? BADGE_COLORS[course.badgeColor].bg : BADGE_COLORS.slate.bg)}>
                            {course.badge}
                        </Badge>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
                <Tooltip><TooltipTrigger asChild><Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-7 w-7 text-muted-foreground hover:bg-muted/10"
                                    onClick={() => {
                                        setSelectedCourseForDesc(course);
                                        setDescriptionDialogOpen(true);
                                    }}
                                >
                                    <Info className="h-3.5 w-3.5" />
                                </Button></TooltipTrigger><TooltipContent><p>Ver Descripción</p></TooltipContent></Tooltip>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => openEditCourse(course)}>
                    <Edit className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => triggerDelete("course", course.id, course.title)}>
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
            </div>
        </div>
    );
}

interface SortablePeriodCardProps {
    period: Period;
    openEditPeriod: (period: Period) => void;
    triggerDelete: (type: "program" | "period" | "group" | "course" | "teacher", id: string, name: string) => void;
    openCreateCourseForPeriod: (periodId: string) => void;
    openEditCourse: (course: Course) => void;
    setSelectedCourseForDesc: (course: Course) => void;
    setDescriptionDialogOpen: (open: boolean) => void;
    formatWeeklyHours: (hours: number | null | undefined) => string;
    BADGE_COLORS: Record<string, { label: string; bg: string }>;
    sensors: any;
    handleDragEnd: (event: any, periodId: string) => void;
}

function SortablePeriodCard({
    period,
    openEditPeriod,
    triggerDelete,
    openCreateCourseForPeriod,
    openEditCourse,
    setSelectedCourseForDesc,
    setDescriptionDialogOpen,
    formatWeeklyHours,
    BADGE_COLORS,
    sensors,
    handleDragEnd
}: SortablePeriodCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: period.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? "none" : transition,
        opacity: isDragging ? 0.6 : 1,
        zIndex: isDragging ? 50 : "auto",
    };

    return (
        <Card
            ref={setNodeRef}
            style={style}
            className="border-none shadow-sm relative overflow-hidden bg-background flex flex-col justify-between"
        >
            <div>
                <CardHeader className="bg-muted/10 pb-4">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2 min-w-0">
                            <Tooltip><TooltipTrigger asChild><div 
                                                {...attributes} 
                                                {...listeners}
                                                className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground/75 p-1 transition-colors rounded hover:bg-muted/5 shrink-0"
                                            >
                                                <GripVertical className="h-4 w-4" />
                                            </div></TooltipTrigger><TooltipContent><p>Arrastrar para ordenar periodos</p></TooltipContent></Tooltip>
                            <div className="min-w-0">
                                <CardTitle className="text-lg font-bold truncate">{period.name}</CardTitle>
                                <CardDescription className="text-xs mt-1 truncate">
                                    {period.description || "Periodo académico del programa"}
                                </CardDescription>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => openEditPeriod(period)}>
                                <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => triggerDelete("period", period.id, period.name)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Materias del Periodo ({period.courses.length})</span>
                    </div>

                    {period.courses.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-xs bg-muted/5 border border-dashed border-muted/50 rounded-xl">
                            No hay materias creadas para este periodo.
                        </div>
                    ) : (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={(event) => handleDragEnd(event, period.id)}
                        >
                            <SortableContext
                                items={period.courses.map(c => c.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                                    {period.courses.map(course => (
                                        <SortableCourseItem
                                            key={course.id}
                                            course={course}
                                            openEditCourse={openEditCourse}
                                            triggerDelete={triggerDelete}
                                            setSelectedCourseForDesc={setSelectedCourseForDesc}
                                            setDescriptionDialogOpen={setDescriptionDialogOpen}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    )}
                    {period.courses.length > 0 && (
                        <div className="pt-3 border-t border-muted/30 flex justify-between items-center text-xs font-bold text-muted-foreground mt-2 animate-in fade-in duration-200">
                            <span>Total Horas Programadas:</span>
                            <span className="flex items-center gap-1 bg-primary/5 text-primary border border-primary/15 px-2.5 py-1 rounded-lg">
                                <Clock className="h-3.5 w-3.5" />
                                {formatWeeklyHours(period.courses.reduce((sum, c) => sum + (c.weeklyHours || 0), 0))}
                            </span>
                        </div>
                    )}
                </CardContent>
            </div>
            <CardContent className="px-5 pb-5 pt-0">
                <Button size="sm" variant="outline" className="w-full h-9 text-xs border-dashed border-primary/30 hover:border-primary/60" onClick={() => openCreateCourseForPeriod(period.id)}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Crear Materia
                </Button>
            </CardContent>
        </Card>
    );
}

export function AcademicManagement({ initialCourses, teachers, totalCount, isObserver = false, currentUserRole = "admin", settings, initialProgramId }: AcademicManagementProps) {
    const coursesBasePath = currentUserRole === "gestor" ? "/dashboard/gestor/courses" : "/dashboard/admin/courses";
    const [programs, setPrograms] = useState<Program[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [teachersList, setTeachersList] = useState<Teacher[]>(teachers);
    const [subTab, setSubTab] = useState<string>("overview");
    const [isTabsHelpOpen, setIsTabsHelpOpen] = useState<boolean>(false);
    const [isPending, startTransition] = useTransition();
    const [progressModal, setProgressModal] = useState<{
        isOpen: boolean;
        title: string;
        progress: number;
        currentCount: number;
        totalCount: number;
        type: "import" | "export";
    }>({
        isOpen: false,
        title: "",
        progress: 0,
        currentCount: 0,
        totalCount: 0,
        type: "import",
    });
    const [importSummary, setImportSummary] = useState<{
        isOpen: boolean;
        title: string;
        description: string;
        entityName: string;
        total: number;
        successCount: number;
        failedList: Array<{ name: string; detail?: string; error?: string }>;
    }>({
        isOpen: false,
        title: "",
        description: "",
        entityName: "",
        total: 0,
        successCount: 0,
        failedList: [],
    });
    const cancelRef = useRef<boolean>(false);

    const router = useRouter();
    const searchParams = useSearchParams();
    const programIdParam = searchParams.get("programId");

    // Selection states
    const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
    const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
    const [bulkDeleteConfirmationOpen, setBulkDeleteConfirmationOpen] = useState(false);
    const [isExportingOverviewPdf, setIsExportingOverviewPdf] = useState(false);
    const [isExportingOverviewExcel, setIsExportingOverviewExcel] = useState(false);

    useEffect(() => {
        setSelectedTeacherIds([]);
    }, [selectedProgram]);

    const handleExportOverviewPdf = async () => {
        if (!selectedProgram) return;
        setIsExportingOverviewPdf(true);
        toast.info("Generando reporte PDF del área de formación...");
        try {
            await exportProgramOverviewPdf(selectedProgram);
            toast.success("Reporte PDF descargado exitosamente");
        } catch (e: any) {
            console.error(e);
            toast.error(e?.message || "Error al exportar reporte PDF");
        } finally {
            setIsExportingOverviewPdf(false);
        }
    };

    const handleExportOverviewExcel = async () => {
        if (!selectedProgram) return;
        setIsExportingOverviewExcel(true);
        toast.info("Generando reporte Excel del área de formación...");
        try {
            await exportProgramOverviewExcel(selectedProgram);
            toast.success("Reporte Excel descargado exitosamente");
        } catch (e: any) {
            console.error(e);
            toast.error(e?.message || "Error al exportar reporte Excel");
        } finally {
            setIsExportingOverviewExcel(false);
        }
    };

    const handleBulkAvailabilityLock = async (lock: boolean) => {
        if (selectedTeacherIds.length === 0) return;
        startTransition(async () => {
            try {
                if (lock) {
                    await Promise.all(selectedTeacherIds.map(id => adminLockTeacherAvailabilityAction(id)));
                    toast.success("Disponibilidad aprobada y bloqueada para los instructores seleccionados");
                } else {
                    await Promise.all(selectedTeacherIds.map(id => unlockTeacherAvailabilityAction(id)));
                    toast.success("Disponibilidad desbloqueada para los instructores seleccionados");
                }
                setSelectedTeacherIds([]);
                await refreshAll();
            } catch (error: any) {
                toast.error(error.message || "Error al procesar la acción en lote");
            }
        });
    };

    const handleBulkQualificationsLock = async (lock: boolean) => {
        if (selectedTeacherIds.length === 0) return;
        startTransition(async () => {
            try {
                if (lock) {
                    await Promise.all(selectedTeacherIds.map(id => adminLockTeacherQualificationsAction(id)));
                    toast.success("Materias aprobadas y bloqueadas para los instructores seleccionados");
                } else {
                    await Promise.all(selectedTeacherIds.map(id => unlockTeacherQualificationsAction(id)));
                    toast.success("Materias desbloqueadas para los instructores seleccionados");
                }
                setSelectedTeacherIds([]);
                await refreshAll();
            } catch (error: any) {
                toast.error(error.message || "Error al procesar la acción en lote");
            }
        });
    };

    const handleBulkDeleteTeachers = async () => {
        if (selectedTeacherIds.length === 0) return;
        startTransition(async () => {
            try {
                await Promise.all(selectedTeacherIds.map(id => deleteUserAction(id)));
                toast.success("Instructores seleccionados eliminados con éxito del sistema");
                setSelectedTeacherIds([]);
                await refreshAll();
            } catch (error: any) {
                toast.error(error.message || "Error al eliminar los instructores seleccionados");
            }
        });
    };
    const [managingGroup, setManagingGroup] = useState<Group | null>(null);

    useEffect(() => {
        if (programs.length > 0) {
            const targetId = programIdParam || initialProgramId;
            if (targetId) {
                const prog = programs.find(p => p.id === targetId);
                if (prog) {
                    setSelectedProgram(prog);
                    return;
                }
            }
            if (currentUserRole !== "admin") {
                setSelectedProgram(programs[0]);
            }
        }
    }, [currentUserRole, programIdParam, initialProgramId, programs]);

    const [selectedSchedulePeriodId, setSelectedSchedulePeriodId] = useState<string>("");

    useEffect(() => {
        if (managingGroup) {
            if (selectedProgram && selectedProgram.periods.length > 0) {
                setSelectedSchedulePeriodId(selectedProgram.periods[0].id);
            } else {
                setSelectedSchedulePeriodId("");
            }
        } else {
            setSelectedSchedulePeriodId("");
        }
    }, [managingGroup, selectedProgram]);

    // Modal/Dialog states
    const [programDialogOpen, setProgramDialogOpen] = useState(false);
    const [programToEdit, setProgramToEdit] = useState<Program | null>(null);
    const [programName, setProgramName] = useState("");
    const [programDescription, setProgramDescription] = useState("");
    const [programStartDate, setProgramStartDate] = useState("");
    const [programEndDate, setProgramEndDate] = useState("");
    const [programScheduleTitle, setProgramScheduleTitle] = useState("");
    const [programMaxHours, setProgramMaxHours] = useState(40);
    const [allGestores, setAllGestores] = useState<Array<{ id: string; name: string; email: string }>>([]);
    const [programGestorIds, setProgramGestorIds] = useState<string[]>([]);

    useEffect(() => {
        getGestoresAction().then(setAllGestores).catch(console.error);
    }, []);

    // Timeline states
    const [selectedTimelineId, setSelectedTimelineId] = useState<string>("");
    const [timelineDialogOpen, setTimelineDialogOpen] = useState(false);
    const [timelineToEdit, setTimelineToEdit] = useState<CurriculumTimeline | null>(null);
    const [timelineName, setTimelineName] = useState("");
    const [timelineDescription, setTimelineDescription] = useState("");
    const [timelineIsDefault, setTimelineIsDefault] = useState(false);
    const [timelineToDelete, setTimelineToDelete] = useState<CurriculumTimeline | null>(null);

    // Duplication states
    const [duplicateTimelineDialogOpen, setDuplicateTimelineDialogOpen] = useState(false);
    const [timelineToDuplicate, setTimelineToDuplicate] = useState<CurriculumTimeline | null>(null);
    const [duplicateTimelineName, setDuplicateTimelineName] = useState("");

    // Period timeline association
    const [periodTimelineId, setPeriodTimelineId] = useState<string>("");

    useEffect(() => {
        if (selectedProgram) {
            const defaultTl = selectedProgram.timelines?.find((t: any) => t.isDefault) || selectedProgram.timelines?.[0];
            setSelectedTimelineId(defaultTl?.id || "");
        } else {
            setSelectedTimelineId("");
        }
    }, [selectedProgram]);

    const [periodDialogOpen, setPeriodDialogOpen] = useState(false);
    const [periodToEdit, setPeriodToEdit] = useState<Period | null>(null);
    const [periodName, setPeriodName] = useState("");
    const [periodDescription, setPeriodDescription] = useState("");

    const [groupDialogOpen, setGroupDialogOpen] = useState(false);
    const [groupToEdit, setGroupToEdit] = useState<Group | null>(null);
    const [groupName, setGroupName] = useState("");
    const [groupDescription, setGroupDescription] = useState("");
    const [groupPeriodId, setGroupPeriodId] = useState<string>("none");
    const [groupCategoria, setGroupCategoria] = useState("LECTIVA");

    const [courseDialogOpen, setCourseDialogOpen] = useState(false);
    const [courseToEdit, setCourseToEdit] = useState<Course | null>(null);
    const [courseTitle, setCourseTitle] = useState("");
    const [courseDescription, setCourseDescription] = useState("");
    const [coursePeriodId, setCoursePeriodId] = useState("");
    const [courseWeeklyHours, setCourseWeeklyHours] = useState<number>(0);
    const [courseBadge, setCourseBadge] = useState("");
    const [courseBadgeColor, setCourseBadgeColor] = useState("slate");

    // Description Dialog States
    const [descriptionDialogOpen, setDescriptionDialogOpen] = useState(false);
    const [selectedCourseForDesc, setSelectedCourseForDesc] = useState<Course | null>(null);

    // Delete dialog states
    const [deleteType, setDeleteType] = useState<"program" | "period" | "group" | "course" | "teacher" | "student" | null>(null);
    const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
    const [deleteItemName, setDeleteItemName] = useState("");
    const [deleteConfirmText, setDeleteConfirmText] = useState("");
    const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);



    // Teacher assignment confirm dialog
    const [teacherConfirmOpen, setTeacherConfirmOpen] = useState(false);
    const [teacherToConfirm, setTeacherToConfirm] = useState<{ id: string; name: string; assign: boolean } | null>(null);

    // Sensors for drag-and-drop (optimized for mobile touch scroll and desktop mouse drag)
    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: {
                distance: 8,
            }
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 200,
                tolerance: 6,
            }
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = async (event: DragEndEvent, periodId: string) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const period = selectedProgram?.periods.find(p => p.id === periodId);
            if (!period) return;

            const oldIndex = period.courses.findIndex(c => c.id === active.id);
            const newIndex = period.courses.findIndex(c => c.id === over.id);

            const reorderedCourses = arrayMove(period.courses, oldIndex, newIndex);

            const updatedPrograms = programs.map(p => {
                if (p.id === selectedProgram?.id) {
                    return {
                        ...p,
                        periods: p.periods.map(per => {
                            if (per.id === periodId) {
                                return {
                                    ...per,
                                    courses: reorderedCourses
                                };
                            }
                            return per;
                        })
                    };
                }
                return p;
            });
            setPrograms(updatedPrograms);

            if (selectedProgram) {
                const updatedSel = updatedPrograms.find(p => p.id === selectedProgram.id);
                if (updatedSel) {
                    setSelectedProgram(updatedSel);
                }
            }

            try {
                const orderedIds = reorderedCourses.map(c => c.id);
                await reorderCoursesAction(orderedIds);
                toast.success("Orden de las materias actualizado");
            } catch (error) {
                toast.error("Error al reordenar las materias");
                refreshAll();
            }
        }
    };

    const handlePeriodDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            if (!selectedProgram) return;

            const oldIndex = selectedProgram.periods.findIndex(p => p.id === active.id);
            const newIndex = selectedProgram.periods.findIndex(p => p.id === over.id);

            const reorderedPeriods = arrayMove(selectedProgram.periods, oldIndex, newIndex);

            const updatedPrograms = programs.map(p => {
                if (p.id === selectedProgram.id) {
                    return {
                        ...p,
                        periods: reorderedPeriods
                    };
                }
                return p;
            });
            setPrograms(updatedPrograms);

            const updatedSel = updatedPrograms.find(p => p.id === selectedProgram.id);
            if (updatedSel) {
                setSelectedProgram(updatedSel);
            }

            try {
                const orderedIds = reorderedPeriods.map(p => p.id);
                await reorderPeriodsAction(orderedIds);
                toast.success("Orden de los periodos actualizado");
            } catch (error) {
                toast.error("Error al reordenar los periodos");
                refreshAll();
            }
        }
    };

    // Assignment states
    const [assignStudentsDialogOpen, setAssignStudentsDialogOpen] = useState(false);
    const [selectedGroupForStudents, setSelectedGroupForStudents] = useState<Group | null>(null);
    const [assignTeachersDialogOpen, setAssignTeachersDialogOpen] = useState(false);
    const [isRegisteringTeacher, setIsRegisteringTeacher] = useState(false);


    // Group Course Scheduling states
    const [groupCourseDialogOpen, setGroupCourseDialogOpen] = useState(false);
    const [groupCourseToEdit, setGroupCourseToEdit] = useState<Course | null>(null);
    const [groupCourseTitle, setGroupCourseTitle] = useState("");
    const [groupCourseDescription, setGroupCourseDescription] = useState("");
    const [groupCourseWeeklyHours, setGroupCourseWeeklyHours] = useState<number>(0);
    const [selectedCatalogCourseId, setSelectedCatalogCourseId] = useState("");
    const [showAllTeachersForAssignment, setShowAllTeachersForAssignment] = useState(false);

    // Schedule slot editor states
    const [scheduleDayOfWeek, setScheduleDayOfWeek] = useState<DayOfWeek>("MONDAY");
    const [scheduleStartTime, setScheduleStartTime] = useState("");
    const [scheduleEndTime, setScheduleEndTime] = useState("");
    const [selectedStartBlockIndex, setSelectedStartBlockIndex] = useState<number | null>(null);
    const [selectedEndBlockIndex, setSelectedEndBlockIndex] = useState<number | null>(null);
    const [hoveredBlockIndex, setHoveredBlockIndex] = useState<number | null>(null);

    // Scheduling conflict states
    const [scheduleConflicts, setScheduleConflicts] = useState<string[]>([]);
    const [conflictChecking, setConflictChecking] = useState(false);

    // Reset group course conflicts when options change
    useEffect(() => {
        setScheduleConflicts([]);
    }, [selectedCatalogCourseId, scheduleDayOfWeek, scheduleStartTime, scheduleEndTime]);

    // Manual registration states
    const [manualIdentificacion, setManualIdentificacion] = useState("");
    const [manualNombres, setManualNombres] = useState("");
    const [manualApellido, setManualApellido] = useState("");
    const [manualEmail, setManualEmail] = useState("");
    const [manualTelefono, setManualTelefono] = useState("");

    // Manual registration states for teachers
    const [manualTeacherIdentificacion, setManualTeacherIdentificacion] = useState("");
    const [manualTeacherNombres, setManualTeacherNombres] = useState("");
    const [manualTeacherApellido, setManualTeacherApellido] = useState("");
    const [manualTeacherEmail, setManualTeacherEmail] = useState("");
    const [manualTeacherTelefono, setManualTeacherTelefono] = useState("");

    // Excel import states
    const [excelStudents, setExcelStudents] = useState<any[]>([]);
    const [importResult, setImportResult] = useState<{
        successCount: number;
        skippedCount: number;
        errors: string[];
    } | null>(null);
    const [excelFileName, setExcelFileName] = useState("");

    // Excel import states for teachers
    const [excelTeachers, setExcelTeachers] = useState<any[]>([]);
    const [importTeacherResult, setImportTeacherResult] = useState<{
        successCount: number;
        skippedCount: number;
        errors: string[];
    } | null>(null);
    const [excelTeacherFileName, setExcelTeacherFileName] = useState("");

    // Teacher Management States
    const [editTeacherDialogOpen, setEditTeacherDialogOpen] = useState(false);
    const [teacherToEdit, setTeacherToEdit] = useState<Teacher | null>(null);
    const [editTeacherDoc, setEditTeacherDoc] = useState("");
    const [editTeacherNames, setEditTeacherNames] = useState("");
    const [editTeacherLastName, setEditTeacherLastName] = useState("");
    const [editTeacherEmail, setEditTeacherEmail] = useState("");
    const [editTeacherPhone, setEditTeacherPhone] = useState("");



    // Teacher Qualifications States
    const [qualDialogOpen, setQualDialogOpen] = useState(false);
    const [qualTeacher, setQualTeacher] = useState<Teacher | null>(null);

    // Admin availability view states
    const [adminTeacherAvailabilityOpen, setAdminTeacherAvailabilityOpen] = useState(false);
    const [selectedTeacherForAvailability, setSelectedTeacherForAvailability] = useState<Teacher | null>(null);

    const scheduledTitles = managingGroup?.courses
        ?.filter(c => !groupCourseToEdit || c.id !== groupCourseToEdit.id)
        ?.map(c => c.title.toLowerCase()) || [];

    const catalogCourses = (selectedProgram?.periods
        .flatMap(p => p.courses) || [])
        .filter(c => !c.group)
        .filter(c => !scheduledTitles.includes(c.title.toLowerCase()));

    const getTimeSlots = () => {
        if (!managingGroup) return [];
        const slots = [];
        const start = "06:00";
        const end = "22:00";
        
        const [startH, startM] = start.split(":").map(Number);
        const [endH, endM] = end.split(":").map(Number);
        
        let currentMinutes = startH * 60 + startM;
        let endMinutes = endH * 60 + endM;

        if (endMinutes < currentMinutes) {
            endMinutes += 1440; // Crosses midnight, add 24 hours
        }
        
        while (currentMinutes <= endMinutes) {
            const h = (Math.floor(currentMinutes / 60)) % 24;
            const m = currentMinutes % 60;
            const timeString = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            slots.push(timeString);
            currentMinutes += 15;
        }
        return slots;
    };

    const timeSlots = getTimeSlots();

    const filteredProgramTeachers = (selectedProgram?.teachers || []);

    const filteredOtherTeachers = teachersList
        .filter(t => !selectedProgram?.teachers?.some(pt => pt.id === t.id));

    // Initial load
    useEffect(() => {
        refreshAll();
        fetchSystemStudents();
        fetchSystemTeachers();
    }, []);

    // Reset managingGroup on tab or program change
    useEffect(() => {
        setManagingGroup(null);
    }, [subTab, selectedProgram]);

    const fetchSystemStudents = async () => {
        try {
            const { users } = await getAllUsersAction({ role: "student", limit: 1000 });
            setStudents(users as any[]);
        } catch (e) {
            console.error("Error al cargar estudiantes:", e);
        }
    };

    const fetchSystemTeachers = async () => {
        try {
            const { users } = await getAllUsersAction({ role: "teacher", limit: 1000 });
            const mapped = users.map((user: any) => ({
                id: user.id,
                name: user.name,
                email: user.email,
            }));
            setTeachersList(mapped);
        } catch (e) {
            console.error("Error al cargar profesores:", e);
        }
    };

    const refreshAll = async () => {
        try {
            const progFilter = currentUserRole === "gestor" ? (initialProgramId || programIdParam || undefined) : undefined;
            const fetched = await getProgramsAction(progFilter);
            const parsed = fetched.map((p: any) => ({
                ...p,
                createdAt: new Date(p.createdAt),
                teachers: p.teachers || [],
                environments: (p.environments || []).map((env: any) => ({
                    ...env,
                    createdAt: new Date(env.createdAt),
                })),
                periods: (p.periods || []).map((per: any) => ({
                    ...per,
                    createdAt: new Date(per.createdAt),
                    courses: (per.courses || []).map((c: any) => ({
                        ...c,
                        createdAt: new Date(c.createdAt),
                        group: c.group ? {
                            ...c.group,
                            createdAt: new Date(c.group.createdAt),
                            
                            endDate: c.group.endDate ? new Date(c.group.endDate) : null,
                        } : null,
                    }))
                })),
                groups: (p.groups || []).map((g: any) => ({
                    ...g,
                    createdAt: new Date(g.createdAt),
                    startDate: g.startDate ? new Date(g.startDate) : null,
                    endDate: g.endDate ? new Date(g.endDate) : null,
                    students: (g.students || []).map((s: any) => ({
                        ...s,
                        createdAt: new Date(s.createdAt)
                    })),
                    courses: (g.courses || []).map((c: any) => ({
                        ...c,
                        createdAt: new Date(c.createdAt),
                        group: c.group ? {
                            ...c.group,
                            createdAt: new Date(c.group.createdAt),
                            
                            endDate: c.group.endDate ? new Date(c.group.endDate) : null,
                        } : null,
                    })) || []
                }))
            })) as Program[];
            
            setPrograms(parsed);
            
            setSelectedProgram(currentSelected => {
                if (!currentSelected) return null;
                const updated = parsed.find(p => p.id === currentSelected.id);
                return updated || currentSelected;
            });

            setManagingGroup(currentGroup => {
                if (!currentGroup) return null;
                const currentProg = parsed.find(p => p.groups.some(g => g.id === currentGroup.id));
                const updatedGroup = currentProg?.groups.find(g => g.id === currentGroup.id);
                return updatedGroup || currentGroup;
            });

            setSelectedGroupForStudents(currentGroup => {
                if (!currentGroup) return null;
                const currentProg = parsed.find(p => p.groups.some(g => g.id === currentGroup.id));
                const updatedGroup = currentProg?.groups.find(g => g.id === currentGroup.id);
                return updatedGroup || currentGroup;
            });
        } catch (error) {
            toast.error("Error al cargar la información académica");
        }
    };


    const openCreateGroupCourse = () => {
        setGroupCourseToEdit(null);
        setGroupCourseTitle("");
        setGroupCourseDescription("");
        setGroupCourseWeeklyHours(0);
        setScheduleDayOfWeek("MONDAY");
        
        const slots = getTimeSlots();
        if (slots.length > 1) {
            setSelectedStartBlockIndex(0);
            setSelectedEndBlockIndex(1);
            setScheduleStartTime(slots[0]);
            setScheduleEndTime(slots[1]);
        } else {
            setSelectedStartBlockIndex(null);
            setSelectedEndBlockIndex(null);
            setScheduleStartTime("");
            setScheduleEndTime("");
        }

        setScheduleConflicts([]);
        setSelectedCatalogCourseId("");
        setShowAllTeachersForAssignment(false);
        setGroupCourseDialogOpen(true);
    };

    const openEditGroupCourse = (course: any) => {
        setGroupCourseToEdit(course);
        setGroupCourseTitle(course.title);
        setGroupCourseDescription(course.description || "");
        setGroupCourseWeeklyHours(course.weeklyHours || 0);
        
        const firstSlot = course.schedules?.[0];
        const slots = getTimeSlots();
        if (firstSlot) {
            setScheduleDayOfWeek(firstSlot.dayOfWeek);
            setScheduleStartTime(firstSlot.startTime);
            setScheduleEndTime(firstSlot.endTime);
            const startIdx = slots.indexOf(firstSlot.startTime);
            const endIdx = slots.indexOf(firstSlot.endTime);
            setSelectedStartBlockIndex(startIdx !== -1 ? startIdx : 0);
            setSelectedEndBlockIndex(endIdx !== -1 ? endIdx : 1);
        } else {
            setScheduleDayOfWeek("MONDAY");
            if (slots.length > 1) {
                setSelectedStartBlockIndex(0);
                setSelectedEndBlockIndex(1);
                setScheduleStartTime(slots[0]);
                setScheduleEndTime(slots[1]);
            } else {
                setSelectedStartBlockIndex(null);
                setSelectedEndBlockIndex(null);
                setScheduleStartTime("");
                setScheduleEndTime("");
            }
        }

        setScheduleConflicts([]);
        
        // Find matching catalog course by title
        const catalogCourse = selectedProgram?.periods
            .flatMap(p => p.courses)
            .find(c => c.title.toLowerCase() === course.title.toLowerCase());
        setSelectedCatalogCourseId(catalogCourse?.id || "");
        setShowAllTeachersForAssignment(false);
        
        setGroupCourseDialogOpen(true);
    };

    const handleSaveGroupCourse = async (isOverride: boolean = false) => {
        if (!groupCourseTitle.trim()) {
            toast.error("Debe ingresar el título de la asignatura");
            return;
        }
        if (!scheduleStartTime || !scheduleEndTime) {
            toast.error("Debe ingresar hora de inicio y fin");
            return;
        }
        if (scheduleStartTime >= scheduleEndTime) {
            toast.error("La hora de inicio debe ser menor a la hora de fin");
            return;
        }

        const schedules = [{
            dayOfWeek: scheduleDayOfWeek,
            startTime: scheduleStartTime,
            endTime: scheduleEndTime
        }];

        startTransition(async () => {
            try {
                if (groupCourseToEdit) {
                    await updateGroupCourseScheduleAction(groupCourseToEdit.id, {
                        title: groupCourseTitle,
                        description: groupCourseDescription || undefined,
                        weeklyHours: groupCourseWeeklyHours,
                        schedules
                    });
                    toast.success("Horario de clase actualizado con éxito");
                } else {
                    const periodId = selectedSchedulePeriodId || (selectedProgram?.periods[0]?.id || "");
                    if (!periodId) {
                        throw new Error("Se requiere un periodo académico seleccionado para poder programar clases.");
                    }

                    await scheduleGroupCourseAction({
                        title: groupCourseTitle,
                        description: groupCourseDescription || undefined,
                        weeklyHours: groupCourseWeeklyHours,
                        groupId: managingGroup!.id,
                        periodId,
                        schedules
                    });
                    toast.success("Clase programada con éxito");
                }

                setGroupCourseDialogOpen(false);
                setScheduleConflicts([]);
                await refreshAll();
            } catch (e: any) {
                const msg = e.message || "Error al programar la clase";
                if (msg.includes("colisiones en el horario:")) {
                    const cleanMsg = msg.replace("No es posible programar la clase por colisiones en el horario: ", "")
                                        .replace("No es posible actualizar la clase por colisiones en el horario: ", "");
                    const conflicts = cleanMsg.split(" | ");
                    setScheduleConflicts(conflicts);
                } else {
                    setScheduleConflicts([msg]);
                }
                toast.error(msg);
            }
        });
    };

    const handleDeleteGroupCourse = async (courseId: string) => {
        if (confirm("¿Está seguro de eliminar esta programación de clase? Esta acción no se puede deshacer.")) {
            startTransition(async () => {
                try {
                    await deleteGroupCourseAction(courseId);
                    toast.success("Programación de clase eliminada");
                    await refreshAll();
                } catch (e: any) {
                    toast.error("Error al eliminar la clase");
                }
            });
        }
    };

    // ============ PROGRAM HANDLERS ============

    const openCreateProgram = () => {
        setProgramToEdit(null);
        setProgramName("");
        setProgramDescription("");
        setProgramStartDate("");
        setProgramEndDate("");
        setProgramScheduleTitle("");
        setProgramMaxHours(40);
        setProgramGestorIds([]);
        setProgramDialogOpen(true);
    };

    const openEditProgram = (program: Program) => {
        setProgramToEdit(program);
        setProgramName(program.name);
        setProgramDescription(program.description || "");
        setProgramStartDate(program.startDate ? new Date(program.startDate).toISOString().split('T')[0] : "");
        setProgramEndDate(program.endDate ? new Date(program.endDate).toISOString().split('T')[0] : "");
        setProgramScheduleTitle(program.scheduleTitle || "");
        setProgramMaxHours(program.maxTeacherHours ?? 40);
        setProgramGestorIds(((program as any).gestores || []).map((g: any) => g.id));
        setProgramDialogOpen(true);
    };

    const handleSaveProgram = async () => {
        if (!programName || programName.trim().length < 2) {
            toast.error("El nombre del área de formación debe tener al menos 2 caracteres");
            return;
        }

        startTransition(async () => {
            try {
                if (programToEdit) {
                    await updateProgramAction(programToEdit.id, {
                        name: programName,
                        description: programDescription,
                        gestorIds: programGestorIds
                    });
                    toast.success("Área de formación actualizada");
                } else {
                    await createProgramAction({
                        name: programName,
                        description: programDescription,
                        gestorIds: programGestorIds
                    });
                    toast.success("Área de formación creada");
                }
                setProgramDialogOpen(false);
                await refreshAll();
            } catch (error: any) {
                toast.error(error.message || "Error al guardar el área de formación");
            }
        });
    };

    // ============ TIMELINE HANDLERS ============

    const openCreateTimeline = () => {
        if (!selectedProgram) return;
        setTimelineToEdit(null);
        setTimelineName(`${selectedProgram.name} - `);
        setTimelineDescription("");
        setTimelineIsDefault(false);
        setTimelineDialogOpen(true);
    };

    const openEditTimeline = (tl: CurriculumTimeline) => {
        setTimelineToEdit(tl);
        setTimelineName(tl.name);
        setTimelineDescription(tl.description || "");
        setTimelineIsDefault(tl.isDefault);
        setTimelineDialogOpen(true);
    };

    const openDuplicateTimeline = (tl: CurriculumTimeline) => {
        setTimelineToDuplicate(tl);
        setDuplicateTimelineName(`${tl.name} (Copia)`);
        setDuplicateTimelineDialogOpen(true);
    };

    const handleSaveTimeline = async () => {
        if (!selectedProgram) return;
        if (!timelineName.trim() || timelineName.trim().length < 2) {
            toast.error("El nombre del programa de formación debe tener al menos 2 caracteres");
            return;
        }

        startTransition(async () => {
            try {
                if (timelineToEdit) {
                    await updateTimelineAction(timelineToEdit.id, {
                        name: timelineName,
                        description: timelineDescription,
                        isDefault: timelineIsDefault,
                    });
                    toast.success("Programa de formación actualizado exitosamente");
                } else {
                    const created = await createTimelineAction({
                        programId: selectedProgram.id,
                        name: timelineName,
                        description: timelineDescription,
                        isDefault: timelineIsDefault,
                    });
                    toast.success("Programa de formación creado exitosamente");
                    setSelectedTimelineId(created.id);
                }
                setTimelineDialogOpen(false);
                await refreshAll();
            } catch (error: any) {
                toast.error(error.message || "Error al guardar el programa de formación");
            }
        });
    };

    const handleConfirmDuplicateTimeline = async () => {
        if (!timelineToDuplicate) return;
        if (!duplicateTimelineName.trim() || duplicateTimelineName.trim().length < 2) {
            toast.error("El nombre del nuevo programa debe tener al menos 2 caracteres");
            return;
        }

        startTransition(async () => {
            try {
                const duplicated = await duplicateTimelineAction(timelineToDuplicate.id, duplicateTimelineName);
                toast.success("Programa de formación duplicado con todos sus periodos y materias");
                setDuplicateTimelineDialogOpen(false);
                setSelectedTimelineId(duplicated.id);
                await refreshAll();
            } catch (error: any) {
                toast.error(error.message || "Error al duplicar el programa de formación");
            }
        });
    };

    const handleDeleteTimeline = (tl: CurriculumTimeline) => {
        if (!selectedProgram) return;
        const count = (selectedProgram.timelines || []).length;
        if (count <= 1) {
            toast.error("No es posible eliminar el único programa de formación de esta área");
            return;
        }
        setTimelineToDelete(tl);
    };

    const confirmDeleteTimeline = async () => {
        if (!timelineToDelete || !selectedProgram) return;
        const tl = timelineToDelete;
        startTransition(async () => {
            try {
                await deleteTimelineAction(tl.id);
                toast.success("Programa de formación eliminado");
                const remaining = (selectedProgram.timelines || []).filter(t => t.id !== tl.id);
                setSelectedTimelineId(remaining[0]?.id || "");
                setTimelineToDelete(null);
                await refreshAll();
            } catch (error: any) {
                toast.error(error.message || "Error al eliminar el programa de formación");
            }
        });
    };

    // ============ PERIOD HANDLERS ============

    const openCreatePeriod = () => {
        if (!selectedProgram) return;
        setPeriodToEdit(null);
        setPeriodName("");
        setPeriodDescription("");
        const defaultTl = selectedProgram.timelines?.find((t: any) => t.isDefault) || selectedProgram.timelines?.[0];
        setPeriodTimelineId(selectedTimelineId || defaultTl?.id || "");
        setPeriodDialogOpen(true);
    };

    const openEditPeriod = (period: Period) => {
        setPeriodToEdit(period);
        setPeriodName(period.name);
        setPeriodDescription(period.description || "");
        setPeriodTimelineId(period.timelineId || selectedTimelineId || "");
        setPeriodDialogOpen(true);
    };

    const handleSavePeriod = async () => {
        if (!selectedProgram) return;
        if (!periodName || periodName.trim().length < 2) {
            toast.error("El nombre del periodo debe tener al menos 2 caracteres");
            return;
        }

        startTransition(async () => {
            try {
                if (periodToEdit) {
                    await updatePeriodAction(periodToEdit.id, {
                        name: periodName,
                        description: periodDescription,
                        esEspecial: false,
                        timelineId: periodTimelineId || null,
                    });
                    toast.success("Periodo académico actualizado");
                } else {
                    await createPeriodAction({
                        name: periodName,
                        description: periodDescription,
                        programId: selectedProgram.id,
                        esEspecial: false,
                        timelineId: periodTimelineId || null,
                    });
                    toast.success("Periodo académico agregado");
                }
                setPeriodDialogOpen(false);
                await refreshAll();
            } catch (error: any) {
                toast.error(error.message || "Error al guardar el periodo");
            }
        });
    };

    // ============ GROUP HANDLERS ============

    const openCreateGroup = () => {
        if (!selectedProgram) return;
        setGroupToEdit(null);
        setGroupName("");
        setGroupDescription("");
        setGroupPeriodId("none");
        setGroupCategoria("LECTIVA");
        setGroupDialogOpen(true);
    };

    const openEditGroup = (group: Group) => {
        setGroupToEdit(group);
        setGroupName(group.name);
        setGroupDescription(group.description || "");
        setGroupCategoria((group as any).categoria || "LECTIVA");
        setGroupDialogOpen(true);
    };

    const handleSaveGroup = async () => {
        if (!selectedProgram) return;
        if (!groupName || groupName.trim().length < 2) {
            toast.error("El nombre del grupo debe tener al menos 2 caracteres");
            return;
        }

        startTransition(async () => {
            try {
                if (groupToEdit) {
                    await updateGroupAction(groupToEdit.id, {
                        name: groupName,
                        description: groupDescription || undefined,
                        categoria: groupCategoria
                    });
                    toast.success("Grupo académico actualizado");
                } else {
                    await createGroupAction({
                        programId: selectedProgram.id,
                        name: groupName,
                        description: groupDescription || undefined,
                        categoria: groupCategoria
                    });
                    toast.success("Grupo académico creado");
                }
                setGroupDialogOpen(false);
                await refreshAll();
            } catch (error: any) {
                toast.error(error.message || "Error al guardar el grupo");
            }
        });
    };

    const renderGroupsTable = (groupsFiltered: Group[]) => {
        if (groupsFiltered.length === 0) {
            return (
                <div className="text-center py-12 bg-muted/5 rounded-2xl border border-dashed border-muted/40 animate-in fade-in-50 duration-200">
                    <Layers className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <h5 className="font-semibold text-sm">Sin grupos en esta categoría</h5>
                    <p className="text-muted-foreground text-xs mt-1 max-w-xs mx-auto">
                        Aún no hay grupos creados en esta etapa para este programa académico.
                    </p>
                </div>
            );
        }

        return (
            <Card className="border-none shadow-sm bg-background overflow-hidden animate-in fade-in-50 duration-200">
                <CardContent className="p-0">
                    <div className="w-full overflow-x-auto">
                        <Table>
                        <TableHeader className="bg-muted/10">
                            <TableRow>
                                <TableHead className="py-3 text-xs font-semibold">Grupo</TableHead>
                                <TableHead className="py-3 text-xs font-semibold">Descripción</TableHead>
                                <TableHead className="py-3 text-xs font-semibold text-center">Cantidad de Alumnos</TableHead>
                                <TableHead className="py-3 text-xs font-semibold text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {groupsFiltered.map(group => (
                                <TableRow key={group.id} className="hover:bg-muted/5">
                                    <TableCell className="py-3 text-xs font-bold text-foreground">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span>{group.name}</span>
                                            <Badge 
                                                variant="outline" 
                                                className={`font-semibold text-[9px] px-1.5 py-0.2 shrink-0 uppercase tracking-wide ${(group as any).categoria === "PRODUCTIVA" ? "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800" : (group as any).categoria === "EGRESADOS" ? "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-800" : "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"}`}
                                            >
                                                {(group as any).categoria === "PRODUCTIVA" ? "Etapa Productiva" : (group as any).categoria === "EGRESADOS" ? "Egresados" : "Etapa Lectiva"}
                                            </Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-3 text-xs text-muted-foreground max-w-xs truncate">
                                        {group.description || "Grupo de alumnos de este programa"}
                                    </TableCell>
                                    <TableCell className="py-3 text-xs text-center font-semibold">
                                        <Badge variant="secondary" className="px-2 py-0.5 font-mono text-[11px]">
                                            {group.students.length}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="py-3 text-right">
                                        <div className="flex justify-end items-center gap-1.5">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline" 
                                                        className="h-8 px-2.5 text-xs text-primary hover:text-primary hover:bg-primary/5 flex items-center gap-1.5"
                                                        onClick={() => setManagingGroup(group)}
                                                    >
                                                        <Users className="h-3.5 w-3.5" />
                                                        <span>Gestionar</span>
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent><p>Gestionar Aprendices</p></TooltipContent>
                                            </Tooltip>
                                            {!isObserver && (
                                                <>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button 
                                                                size="icon" 
                                                                variant="ghost" 
                                                                className="h-8 w-8 text-muted-foreground hover:bg-muted/10" 
                                                                onClick={() => openEditGroup(group)}
                                                            >
                                                                <Edit className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent><p>Editar Grupo</p></TooltipContent>
                                                    </Tooltip>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button 
                                                                size="icon" 
                                                                variant="ghost" 
                                                                className="h-8 w-8 text-destructive hover:bg-destructive/10" 
                                                                onClick={() => triggerDelete("group", group.id, group.name)}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent><p>Eliminar Grupo</p></TooltipContent>
                                                    </Tooltip>
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    </div>
                </CardContent>
            </Card>
        );
    };

    // ============ ASSIGN STUDENT HANDLERS ============

    const openAssignStudents = (group: Group) => {
        setSelectedGroupForStudents(group);
        setAssignStudentsDialogOpen(true);
        // Reset states
        setManualIdentificacion("");
        setManualNombres("");
        setManualApellido("");
        setManualEmail("");
        setManualTelefono("");
        setExcelStudents([]);
        setExcelFileName("");
        setImportResult(null);
    };

    const handleAssignStudent = async (studentId: string, assign: boolean) => {
        if (!selectedGroupForStudents) return;

        startTransition(async () => {
            try {
                await assignStudentToGroupAction(studentId, assign ? selectedGroupForStudents.id : null);
                toast.success(assign ? "Aprendiz agregado al grupo" : "Aprendiz removido del grupo");
                
                await refreshAll();
                await fetchSystemStudents();
            } catch (error: any) {
                toast.error(error.message || "Error al asignar aprendiz");
            }
        });
    };

    const handleAssignTeacher = (teacherId: string, name: string, assign: boolean) => {
        setTeacherToConfirm({ id: teacherId, name, assign });
        setTeacherConfirmOpen(true);
    };

    const confirmTeacherAction = async () => {
        if (!selectedProgram || !teacherToConfirm) return;

        startTransition(async () => {
            try {
                await assignTeacherToProgramAction(selectedProgram.id, teacherToConfirm.id, teacherToConfirm.assign);
                toast.success(teacherToConfirm.assign ? "Instructor asociado exitosamente" : "Instructor desasociado exitosamente");
                setTeacherConfirmOpen(false);
                setTeacherToConfirm(null);
                await refreshAll();
            } catch (error: any) {
                toast.error(error.message || "Error al asociar instructor");
            }
        });
    };

    const handleRegisterStudentManual = async () => {
        if (!selectedGroupForStudents) return;
        if (!manualIdentificacion) {
            toast.error("El número de documento es obligatorio");
            return;
        }
        if (!manualNombres) {
            toast.error("El nombre es obligatorio");
            return;
        }
        if (!manualApellido) {
            toast.error("El apellido es obligatorio");
            return;
        }
        if (!manualEmail) {
            toast.error("El correo electrónico es obligatorio");
            return;
        }

        startTransition(async () => {
            try {
                const res = await registerStudentManualAction({
                    groupId: selectedGroupForStudents.id,
                    identificacion: manualIdentificacion,
                    nombres: manualNombres,
                    apellido: manualApellido,
                    email: manualEmail,
                    telefono: manualTelefono || undefined
                });

                const newStudentItem = {
                    id: res.user.id,
                    name: res.user.name || `${manualNombres.trim()} ${manualApellido.trim()}`,
                    email: res.user.email,
                    role: "student",
                    groupId: selectedGroupForStudents.id,
                    createdAt: new Date(),
                    profile: {
                        identificacion: res.profile.identificacion,
                        nombres: res.profile.nombres,
                        apellido: res.profile.apellido,
                        telefono: res.profile.telefono || null,
                    }
                };

                // Inmediatamente actualizar managingGroup para que el panel muestre al aprendiz
                setManagingGroup(prev => {
                    if (!prev || prev.id !== selectedGroupForStudents.id) return prev;
                    const existing = prev.students || [];
                    const exists = existing.some((s: any) => s.id === newStudentItem.id);
                    return exists ? prev : { ...prev, students: [...existing, newStudentItem] };
                });

                // Inmediatamente actualizar el grupo en el modal de asociación
                setSelectedGroupForStudents(prev => {
                    if (!prev) return prev;
                    const existing = prev.students || [];
                    const exists = existing.some((s: any) => s.id === newStudentItem.id);
                    return exists ? prev : { ...prev, students: [...existing, newStudentItem] };
                });

                // Inmediatamente actualizar los grupos del programa seleccionado
                setSelectedProgram(prev => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        groups: prev.groups.map(g => {
                            if (g.id === selectedGroupForStudents.id) {
                                const existing = g.students || [];
                                const exists = existing.some((s: any) => s.id === newStudentItem.id);
                                return exists ? g : { ...g, students: [...existing, newStudentItem] };
                            }
                            return g;
                        })
                    };
                });

                // Inmediatamente actualizar la lista global de programas
                setPrograms(prev => prev.map(p => ({
                    ...p,
                    groups: p.groups.map(g => {
                        if (g.id === selectedGroupForStudents.id) {
                            const existing = g.students || [];
                            const exists = existing.some((s: any) => s.id === newStudentItem.id);
                            return exists ? g : { ...g, students: [...existing, newStudentItem] };
                        }
                        return g;
                    })
                })));

                toast.success("Aprendiz registrado exitosamente");
                
                // Clear manual inputs
                setManualIdentificacion("");
                setManualNombres("");
                setManualApellido("");
                setManualEmail("");
                setManualTelefono("");
                
                await refreshAll();
                await fetchSystemStudents();
                router.refresh();
            } catch (error: any) {
                toast.error(error.message || "Error al registrar aprendiz");
            }
        });
    };
    const simulateExportProgress = async (title: string, onComplete: () => void) => {
        cancelRef.current = false;
        setProgressModal({
            isOpen: true,
            title,
            progress: 0,
            currentCount: 0,
            totalCount: 100,
            type: "export",
        });

        for (let p = 0; p <= 100; p += 10) {
            if (cancelRef.current) {
                setProgressModal(prev => ({ ...prev, isOpen: false }));
                toast.warning("Exportación cancelada");
                return;
            }
            setProgressModal(prev => ({ ...prev, progress: p }));
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        setProgressModal(prev => ({ ...prev, isOpen: false }));
        onComplete();
    };

    const handleExportPeriodsJSON = () => {
        if (!selectedProgram) return;
        simulateExportProgress("Generando archivo del programa de formación...", () => {
            try {
                const dataToExport = selectedProgram.periods.map(period => ({
                    name: period.name,
                    description: period.description,
                    esEspecial: period.esEspecial,
                    courses: period.courses.map(course => ({
                        title: course.title,
                        description: course.description,
                        externalUrl: course.externalUrl,
                        weeklyHours: course.weeklyHours,
                        badge: course.badge,
                        badgeColor: course.badgeColor,
                    }))
                }));
                const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
                    JSON.stringify(dataToExport, null, 2)
                )}`;
                const downloadAnchor = document.createElement("a");
                downloadAnchor.setAttribute("href", jsonString);
                downloadAnchor.setAttribute("download", `Programa_Formacion_${selectedProgram.name.replace(/\s+/g, "_")}.json`);
                document.body.appendChild(downloadAnchor);
                downloadAnchor.click();
                downloadAnchor.remove();
                toast.success("Estructura del programa exportada con éxito");
            } catch (err: any) {
                toast.error("Error al exportar: " + err.message);
            }
        });
    };

    const [isPdfConfigModalOpen, setIsPdfConfigModalOpen] = useState(false);
    const [pdfConfig, setPdfConfig] = useState<CurriculumExportOptions>({
        institutionTag: "AcademiX • Sistema Institucional de Gestión y Programación Académica",
        mainTitle: "",
        programName: "",
        programDescription: "",
        badgeText: "Plan de Estudios Oficial",
        issueDate: "",
        includeDetailedCatalogue: true,
        logoUrl: "",
        centerLogo: false,
    });
    const [isExportingCurriculumPDF, setIsExportingCurriculumPDF] = useState(false);

    const openPdfConfigModal = () => {
        if (!selectedProgram) {
            toast.error("No hay un programa seleccionado");
            return;
        }
        const allTimelines = selectedProgram.timelines || [];
        const defaultSelectedIds = selectedTimelineId && allTimelines.some((t: any) => t.id === selectedTimelineId)
            ? [selectedTimelineId]
            : allTimelines.map((t: any) => t.id);

        const activeTl = allTimelines.find((t: any) => t.id === selectedTimelineId);
        const titleSuffix = (defaultSelectedIds.length === 1 && activeTl) ? ` (${activeTl.name.toUpperCase()})` : "";

        setPdfConfig(prev => ({
            institutionTag: prev.institutionTag || "AcademiX • Sistema Institucional de Gestión y Programación Académica",
            mainTitle: `PROGRAMA DE FORMACIÓN: ${selectedProgram.name.toUpperCase()}${titleSuffix}`,
            programName: selectedProgram.name,
            programDescription: selectedProgram.description || "",
            badgeText: prev.badgeText || "Plan de Estudios Oficial",
            issueDate: formatCalendarDate(new Date(), "dd 'de' MMMM, yyyy"),
            includeDetailedCatalogue: true,
            logoUrl: prev.logoUrl || "",
            centerLogo: prev.centerLogo || false,
            selectedTimelineIds: defaultSelectedIds,
        }));
        setIsPdfConfigModalOpen(true);
    };

    const handleExecuteDownloadCurriculumPdf = async () => {
        if (!selectedProgram) return;
        if (pdfConfig.selectedTimelineIds && pdfConfig.selectedTimelineIds.length === 0) {
            toast.error("Debes seleccionar al menos un programa de formación para exportar");
            return;
        }
        setIsExportingCurriculumPDF(true);
        const toastId = toast.loading("Generando Programa de Formación en PDF...");
        try {
            await generateAndDownloadCurriculumPdf(selectedProgram, pdfConfig);
            toast.success("Programa de Formación descargado con éxito", { id: toastId });
            setIsPdfConfigModalOpen(false);
        } catch (err: any) {
            console.error("Error al exportar Programa de Formación:", err);
            toast.error("Error al generar el PDF: " + (err.message || "Error desconocido"), { id: toastId });
        } finally {
            setIsExportingCurriculumPDF(false);
        }
    };

    const handleImportPeriodsJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedProgram) return;
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const data = JSON.parse(evt.target?.result as string);
                if (!Array.isArray(data)) {
                    toast.error("El archivo JSON debe contener un arreglo de periodos");
                    return;
                }
                if (data.length === 0) {
                    toast.error("El archivo JSON está vacío");
                    return;
                }

                cancelRef.current = false;
                let successCount = 0;
                let totalCoursesCount = 0;
                const failedList: Array<{ name: string; detail?: string; error?: string }> = [];

                setProgressModal({
                    isOpen: true,
                    title: `Iniciando importación de ${data.length} periodos...`,
                    progress: 0,
                    currentCount: 0,
                    totalCount: data.length,
                    type: "import",
                });

                for (let i = 0; i < data.length; i++) {
                    if (cancelRef.current) {
                        toast.warning("Importación cancelada");
                        break;
                    }

                    const periodItem = data[i];
                    const periodName = periodItem?.name || `Periodo ${i + 1}`;
                    const currentCount = i + 1;
                    const progress = Math.round((i / data.length) * 100);

                    setProgressModal({
                        isOpen: true,
                        title: `Guardando (${currentCount}/${data.length}): Periodo ${periodName}`,
                        progress: progress,
                        currentCount: currentCount,
                        totalCount: data.length,
                        type: "import",
                    });

                    try {
                        const result = await importSinglePeriodAndCoursesAction(selectedProgram.id, periodItem);
                        if (result.success) {
                            successCount++;
                            totalCoursesCount += result.coursesCount;
                        } else {
                            failedList.push({
                                name: result.periodName || periodName,
                                detail: `${periodItem?.courses?.length || 0} materias`,
                                error: result.error || "Error al procesar periodo",
                            });
                        }
                    } catch (err: any) {
                        failedList.push({
                            name: periodName,
                            detail: "Error de ejecución",
                            error: err.message || "Error inesperado",
                        });
                    }
                }

                setProgressModal(prev => ({ ...prev, progress: 100, currentCount: data.length, isOpen: false }));

                if (failedList.length > 0) {
                    setImportSummary({
                        isOpen: true,
                        title: "Reporte de Importación de Programa de Formación",
                        description: "Resumen del proceso de guardado del programa de formación en esta área.",
                        entityName: "Periodos",
                        total: data.length,
                        successCount: successCount,
                        failedList: failedList,
                    });
                    toast.warning(`Importación completada: ${successCount} periodos creados, ${failedList.length} con observaciones.`);
                } else {
                    toast.success(`¡Todos los periodos (${successCount}) y ${totalCoursesCount} materias fueron guardados con éxito!`);
                }

                await refreshAll();
            } catch (err: any) {
                setProgressModal(prev => ({ ...prev, isOpen: false }));
                toast.error("Error al leer el archivo JSON: " + err.message);
            }
        };
        reader.readAsText(file);
        e.target.value = "";
    };

    const handleExportGroupsJSON = () => {
        if (!selectedProgram) return;
        simulateExportProgress("Generando archivo de grupos y alumnos...", () => {
            try {
                const dataToExport = selectedProgram.groups.map(group => ({
                    name: group.name,
                    description: group.description,
                    categoria: group.categoria,
                    periodName: null,
                    students: group.students.map(student => ({
                        identificacion: student.profile?.identificacion,
                        nombres: student.profile?.nombres || student.name.split(" ")[0] || "Aprendiz",
                        apellido: student.profile?.apellido || student.name.split(" ").slice(1).join(" ") || "",
                        email: student.email,
                        telefono: student.profile?.telefono || null
                    }))
                }));
                const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
                    JSON.stringify(dataToExport, null, 2)
                )}`;
                const downloadAnchor = document.createElement("a");
                downloadAnchor.setAttribute("href", jsonString);
                downloadAnchor.setAttribute("download", `Grupos_y_Aprendices_${selectedProgram.name.replace(/\s+/g, "_")}.json`);
                document.body.appendChild(downloadAnchor);
                downloadAnchor.click();
                downloadAnchor.remove();
                toast.success("Grupos y aprendices exportados con éxito");
            } catch (err: any) {
                toast.error("Error al exportar: " + err.message);
            }
        });
    };

    const handleImportGroupsJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedProgram) return;
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const data = JSON.parse(evt.target?.result as string);
                if (!Array.isArray(data)) {
                    toast.error("El archivo JSON debe contener un arreglo de grupos");
                    return;
                }
                if (data.length === 0) {
                    toast.error("El archivo JSON está vacío");
                    return;
                }

                cancelRef.current = false;
                let successCount = 0;
                let totalStudentsCount = 0;
                const failedList: Array<{ name: string; detail?: string; error?: string }> = [];

                // Calculate total steps: 1 per group + 1 per student
                const totalStudentsInFile = data.reduce((acc, g) => acc + (Array.isArray(g.students) ? g.students.length : 0), 0);
                const totalOperations = data.length + totalStudentsInFile;
                let completedOperations = 0;

                setProgressModal({
                    isOpen: true,
                    title: `Iniciando importación de ${data.length} grupos y ${totalStudentsInFile} aprendices...`,
                    progress: 0,
                    currentCount: 0,
                    totalCount: totalOperations,
                    type: "import",
                });

                for (let i = 0; i < data.length; i++) {
                    if (cancelRef.current) {
                        toast.warning("Importación cancelada");
                        break;
                    }

                    const groupItem = data[i];
                    const groupName = groupItem?.name || `Grupo ${i + 1}`;
                    const students = Array.isArray(groupItem?.students) ? groupItem.students : [];

                    completedOperations++;
                    const progress = Math.round((completedOperations / totalOperations) * 100);

                    setProgressModal({
                        isOpen: true,
                        title: `Grupo (${i + 1}/${data.length}): ${groupName} (Registrando grupo...)`,
                        progress: progress,
                        currentCount: completedOperations,
                        totalCount: totalOperations,
                        type: "import",
                    });

                    try {
                        const groupResult = await createOrGetGroupForImportAction(selectedProgram.id, groupItem);
                        if (!groupResult.success || !groupResult.groupId) {
                            failedList.push({
                                name: groupResult.groupName || groupName,
                                detail: `${students.length} aprendices omitidos`,
                                error: groupResult.error || "Error al procesar el grupo",
                            });
                            // Advance skipped students
                            completedOperations += students.length;
                            continue;
                        }

                        successCount++;

                        // Save each student individually with live progress feedback
                        for (let sIdx = 0; sIdx < students.length; sIdx++) {
                            if (cancelRef.current) {
                                toast.warning("Importación cancelada");
                                break;
                            }

                            const student = students[sIdx];
                            if (!student) {
                                completedOperations++;
                                continue;
                            }

                            const studentName = `${student.nombres || student.name || "Aprendiz"} ${student.apellido || ""}`.trim() || student.email || `Aprendiz ${sIdx + 1}`;
                            completedOperations++;
                            const studentProgress = Math.round((completedOperations / totalOperations) * 100);

                            setProgressModal({
                                isOpen: true,
                                title: `Grupo ${groupName} (${i + 1}/${data.length}) → Guardando Aprendiz (${sIdx + 1}/${students.length}): ${studentName}`,
                                progress: studentProgress,
                                currentCount: completedOperations,
                                totalCount: totalOperations,
                                type: "import",
                            });

                            try {
                                const sResult = await registerSingleStudentAction(groupResult.groupId, {
                                    identificacion: student.identificacion,
                                    email: student.email,
                                    nombres: student.nombres || student.name || "Aprendiz",
                                    apellido: student.apellido || "",
                                    telefono: student.telefono,
                                });

                                if (sResult.success) {
                                    totalStudentsCount++;
                                } else {
                                    failedList.push({
                                        name: `${sResult.studentName || studentName} (Grupo ${groupName})`,
                                        detail: `Doc: ${sResult.identificacion || student.identificacion || "N/A"} • ${sResult.email || student.email || "Sin email"}`,
                                        error: sResult.error || "Error al procesar aprendiz",
                                    });
                                }
                            } catch (sErr: any) {
                                failedList.push({
                                    name: `${studentName} (Grupo ${groupName})`,
                                    detail: `Doc: ${student.identificacion || "N/A"}`,
                                    error: sErr.message || "Error al registrar aprendiz",
                                });
                            }
                        }
                    } catch (err: any) {
                        failedList.push({
                            name: groupName,
                            detail: "Error de ejecución",
                            error: err.message || "Error inesperado",
                        });
                        completedOperations += students.length;
                    }
                }

                setProgressModal(prev => ({ ...prev, progress: 100, currentCount: totalOperations, isOpen: false }));

                if (failedList.length > 0) {
                    setImportSummary({
                        isOpen: true,
                        title: "Reporte de Importación de Grupos y Aprendices",
                        description: "Resumen del proceso de guardado individual de grupos y sus aprendices.",
                        entityName: "Registros",
                        total: totalOperations,
                        successCount: successCount + totalStudentsCount,
                        failedList: failedList,
                    });
                    toast.warning(`Importación finalizada: ${successCount} grupos y ${totalStudentsCount} aprendices guardados. ${failedList.length} registros con errores.`);
                } else {
                    toast.success(`¡Se guardaron exitosamente ${successCount} grupos y ${totalStudentsCount} aprendices!`);
                }

                await refreshAll();
            } catch (err: any) {
                setProgressModal(prev => ({ ...prev, isOpen: false }));
                toast.error("Error al leer el archivo JSON: " + err.message);
            }
        };
        reader.readAsText(file);
        e.target.value = "";
    };

    const handleExportTeachersJSON = () => {
        if (!selectedProgram) return;
        simulateExportProgress("Generando archivo de instructores...", () => {
            try {
                const dataToExport = selectedProgram.teachers.map(teacher => ({
                    identificacion: teacher.profile?.identificacion,
                    nombres: teacher.profile?.nombres || teacher.name?.split(" ")[0] || "Instructor",
                    apellido: teacher.profile?.apellido || teacher.name?.split(" ").slice(1).join(" ") || "",
                    email: teacher.email,
                    telefono: teacher.profile?.telefono || null
                }));
                const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
                    JSON.stringify(dataToExport, null, 2)
                )}`;
                const downloadAnchor = document.createElement("a");
                downloadAnchor.setAttribute("href", jsonString);
                downloadAnchor.setAttribute("download", `Instructores_${selectedProgram.name.replace(/\s+/g, "_")}.json`);
                document.body.appendChild(downloadAnchor);
                downloadAnchor.click();
                downloadAnchor.remove();
                toast.success("Instructores exportados con éxito");
            } catch (err: any) {
                toast.error("Error al exportar: " + err.message);
            }
        });
    };

    const handleImportTeachersJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedProgram) return;
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const data = JSON.parse(evt.target?.result as string);
                if (!Array.isArray(data)) {
                    toast.error("El archivo JSON debe contener un arreglo de instructores");
                    return;
                }
                const list = data.map(item => ({
                    identificacion: item.identificacion?.toString() || "",
                    nombres: item.nombres || item.name || "Instructor",
                    apellido: item.apellido || "",
                    email: item.email?.toString() || "",
                    telefono: item.telefono?.toString() || undefined
                }));

                if (list.length === 0) {
                    toast.error("El archivo JSON está vacío");
                    return;
                }

                cancelRef.current = false;
                let successCount = 0;
                const failedList: Array<{ name: string; detail?: string; error?: string }> = [];

                setProgressModal({
                    isOpen: true,
                    title: `Iniciando importación de ${list.length} instructores...`,
                    progress: 0,
                    currentCount: 0,
                    totalCount: list.length,
                    type: "import",
                });

                for (let i = 0; i < list.length; i++) {
                    if (cancelRef.current) {
                        toast.warning("Importación cancelada");
                        break;
                    }

                    const teacher = list[i];
                    const teacherName = `${teacher.nombres} ${teacher.apellido}`.trim() || teacher.email || "Instructor";
                    const currentCount = i + 1;
                    const progress = Math.round(((i) / list.length) * 100);

                    setProgressModal({
                        isOpen: true,
                        title: `Guardando (${currentCount}/${list.length}): ${teacherName}`,
                        progress: progress,
                        currentCount: currentCount,
                        totalCount: list.length,
                        type: "import",
                    });

                    try {
                        const result = await registerSingleTeacherAction(selectedProgram.id, teacher);
                        if (result.success) {
                            successCount++;
                        } else {
                            failedList.push({
                                name: result.teacherName || teacherName,
                                detail: `Doc: ${result.identificacion || teacher.identificacion || 'N/A'} • ${result.email || teacher.email}`,
                                error: result.error || "Error al procesar instructor",
                            });
                        }
                    } catch (err: any) {
                        failedList.push({
                            name: teacherName,
                            detail: `Doc: ${teacher.identificacion || 'N/A'} • ${teacher.email}`,
                            error: err.message || "Error inesperado al guardar",
                        });
                    }
                }

                setProgressModal(prev => ({ ...prev, progress: 100, currentCount: list.length, isOpen: false }));

                if (failedList.length > 0) {
                    setImportSummary({
                        isOpen: true,
                        title: "Reporte de Importación de Instructores",
                        description: "Resumen del proceso de registro y asignación de instructores.",
                        entityName: "Instructores",
                        total: list.length,
                        successCount: successCount,
                        failedList: failedList,
                    });
                    toast.warning(`Importación finalizada: ${successCount} guardados, ${failedList.length} con observaciones.`);
                } else {
                    toast.success(`¡Todos los instructores (${successCount}) fueron registrados y asignados con éxito!`);
                }

                await refreshAll();
            } catch (err: any) {
                setProgressModal(prev => ({ ...prev, isOpen: false }));
                toast.error("Error al leer el archivo JSON: " + err.message);
            }
        };
        reader.readAsText(file);
        e.target.value = "";
    };

    const handleDownloadTemplate = () => {
        try {
            const headers = [["Identificación", "Nombres", "Apellidos", "Email", "Teléfono"]];
            const data = [
                ["10245678", "Juan Carlos", "Pérez Gómez", "juan.perez@correo.com", "3123456789"],
                ["98765432", "María Camila", "Ríos Londoño", "maria.rios@correo.com", ""]
            ];
            
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet([...headers, ...data]);
            
            XLSX.utils.book_append_sheet(wb, ws, "Plantilla Aprendices");
            XLSX.writeFile(wb, "Plantilla_Importar_Aprendices.xlsx");
            toast.success("Plantilla de Excel descargada con éxito");
        } catch (err: any) {
            toast.error("Error al generar la plantilla: " + err.message);
        }
    };

    const handleExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setExcelFileName(file.name);
        setImportResult(null);

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = new Uint8Array(evt.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: "array" });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                if (jsonData.length <= 1) {
                    toast.error("El archivo está vacío o no contiene filas de datos");
                    return;
                }

                // Extrayendo encabezados (fila 0) y normalizándolos
                const firstRow = (jsonData[0] as any[]) || [];
                const headers: string[] = [];
                for (let i = 0; i < firstRow.length; i++) {
                    const val = firstRow[i];
                    headers.push(val ? val.toString().trim().toLowerCase() : "");
                }
                
                // Encontrar los índices de cada columna requerida
                const getIndex = (aliases: string[]) => {
                    // Primero buscar coincidencia exacta
                    const exactIdx = headers.findIndex(h => h && aliases.includes(h));
                    if (exactIdx !== -1) return exactIdx;
                    
                    // Si no, buscar coincidencia parcial (evitando colisión con "tipo de documento")
                    return headers.findIndex(h => h && 
                        h !== "tipo de documento" && 
                        h !== "tipo de doc" && 
                        h !== "tipodoc" && 
                        h !== "tipo_documento" && 
                        aliases.some(alias => h.includes(alias))
                    );
                };

                const numDocIdx = getIndex(["identificación", "identificacion", "número de documento", "numero de documento", "documento", "cedula", "tarjeta", "nro doc"]);
                const nombreIdx = getIndex(["nombres", "nombre", "primer nombre"]);
                const apellidoIdx = getIndex(["apellidos", "apellido"]);
                const emailIdx = getIndex(["email", "mail", "correo electrónico", "correo electronico", "correo"]);
                const telefonoIdx = getIndex(["teléfono", "telefono", "tel", "celular", "movil", "cel"]);

                if (numDocIdx === -1) {
                    toast.error("No se encontró la columna de 'Identificación' en el archivo Excel");
                    return;
                }

                if (nombreIdx === -1) {
                    toast.error("No se encontró la columna de 'Nombres' en el archivo Excel");
                    return;
                }

                if (apellidoIdx === -1) {
                    toast.error("No se encontró la columna de 'Apellidos' en el archivo Excel");
                    return;
                }

                if (emailIdx === -1) {
                    toast.error("No se encontró la columna de 'Email' en el archivo Excel");
                    return;
                }

                const parsedList: any[] = [];
                for (let i = 1; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    if (!row || row.length === 0) continue;

                    const identificacion = row[numDocIdx]?.toString().trim();
                    const nombres = row[nombreIdx]?.toString().trim();
                    const apellido = row[apellidoIdx]?.toString().trim();
                    const email = row[emailIdx]?.toString().trim();
                    const telefono = telefonoIdx !== -1 && row[telefonoIdx] ? row[telefonoIdx].toString().trim() : "";

                    // Si toda la fila está vacía, saltar
                    if (!identificacion && !nombres && !apellido && !email) continue;

                    if (!identificacion) {
                        toast.error(`Fila ${i + 1}: El campo Identificación es obligatorio`);
                        return;
                    }
                    if (!nombres) {
                        toast.error(`Fila ${i + 1}: El campo Nombres es obligatorio`);
                        return;
                    }
                    if (!apellido) {
                        toast.error(`Fila ${i + 1}: El campo Apellidos es obligatorio`);
                        return;
                    }
                    if (!email) {
                        toast.error(`Fila ${i + 1}: El campo Email es obligatorio`);
                        return;
                    }

                    parsedList.push({
                        identificacion,
                        nombres,
                        apellido,
                        email,
                        telefono
                    });
                }

                if (parsedList.length === 0) {
                    toast.error("No se encontraron registros de aprendices válidos en el archivo");
                } else {
                    setExcelStudents(parsedList);
                    toast.success(`Se leyeron ${parsedList.length} aprendices del archivo Excel.`);
                }
            } catch (err: any) {
                toast.error("Error al procesar el archivo Excel: " + err.message);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleImportExcel = async () => {
        if (!selectedGroupForStudents || excelStudents.length === 0) return;

        cancelRef.current = false;
        let successCount = 0;
        const failedList: Array<{ name: string; detail?: string; error?: string }> = [];

        setProgressModal({
            isOpen: true,
            title: `Iniciando importación de ${excelStudents.length} aprendices...`,
            progress: 0,
            currentCount: 0,
            totalCount: excelStudents.length,
            type: "import",
        });

        for (let i = 0; i < excelStudents.length; i++) {
            if (cancelRef.current) {
                toast.warning("Importación cancelada");
                break;
            }

            const student = excelStudents[i];
            const studentName = `${student.nombres} ${student.apellido}`.trim() || student.email || "Aprendiz";
            const currentCount = i + 1;
            const progress = Math.round((i / excelStudents.length) * 100);

            setProgressModal({
                isOpen: true,
                title: `Guardando (${currentCount}/${excelStudents.length}): ${studentName}`,
                progress: progress,
                currentCount: currentCount,
                totalCount: excelStudents.length,
                type: "import",
            });

            try {
                const result = await registerSingleStudentAction(selectedGroupForStudents.id, student);
                if (result.success) {
                    successCount++;
                } else {
                    failedList.push({
                        name: result.studentName || studentName,
                        detail: `Doc: ${result.identificacion || student.identificacion || 'N/A'} • ${result.email || student.email}`,
                        error: result.error || "Error al procesar aprendiz",
                    });
                }
            } catch (err: any) {
                failedList.push({
                    name: studentName,
                    detail: `Doc: ${student.identificacion || 'N/A'} • ${student.email}`,
                    error: err.message || "Error inesperado al guardar",
                });
            }
        }

        setProgressModal(prev => ({ ...prev, progress: 100, currentCount: excelStudents.length, isOpen: false }));
        setExcelStudents([]);
        setExcelFileName("");

        if (failedList.length > 0) {
            setImportSummary({
                isOpen: true,
                title: "Reporte de Importación de Aprendices",
                description: `Resumen del registro de aprendices en el grupo ${selectedGroupForStudents.name}.`,
                entityName: "Aprendices",
                total: excelStudents.length,
                successCount: successCount,
                failedList: failedList,
            });
            toast.warning(`Importación finalizada: ${successCount} guardados, ${failedList.length} con observaciones.`);
        } else {
            toast.success(`¡Todos los aprendices (${successCount}) fueron registrados y asignados con éxito!`);
        }

        await refreshAll();
        await fetchSystemStudents();
    };

    const handleRegisterTeacherManual = async () => {
        if (!selectedProgram) return;
        if (!manualTeacherIdentificacion.trim()) {
            toast.error("El número de documento es obligatorio");
            return;
        }
        if (!manualTeacherNombres.trim()) {
            toast.error("El nombre es obligatorio");
            return;
        }
        if (!manualTeacherApellido.trim()) {
            toast.error("El apellido es obligatorio");
            return;
        }
        if (!manualTeacherEmail.trim()) {
            toast.error("El correo electrónico es obligatorio");
            return;
        }

        setIsRegisteringTeacher(true);
        try {
            const res = await registerTeacherManualAction({
                programId: selectedProgram.id,
                identificacion: manualTeacherIdentificacion.trim(),
                nombres: manualTeacherNombres.trim(),
                apellido: manualTeacherApellido.trim(),
                email: manualTeacherEmail.trim().toLowerCase(),
                telefono: manualTeacherTelefono.trim() || undefined
            });

            if (!res || !res.success) {
                toast.error(res?.error || "Error al registrar instructor");
                return;
            }

            const fullName = `${manualTeacherNombres.trim()} ${manualTeacherApellido.trim()}`;
            const createdTeacher: Teacher = {
                id: res.user.id,
                name: res.user.name || fullName,
                email: res.user.email,
                availabilityLocked: false,
                qualifiedCoursesLocked: false,
                profile: {
                    identificacion: res.profile.identificacion,
                    nombres: res.profile.nombres,
                    apellido: res.profile.apellido,
                    telefono: res.profile.telefono || null,
                },
            };

            // 1. Inmediatamente actualizar la lista de instructores del programa seleccionado
            setSelectedProgram(prev => {
                if (!prev) return null;
                const existing = prev.teachers || [];
                const exists = existing.some(t => t.id === createdTeacher.id);
                return {
                    ...prev,
                    teachers: exists ? existing : [createdTeacher, ...existing]
                };
            });

            // 2. Inmediatamente actualizar el array global de programas en el estado
            setPrograms(prev => prev.map(p => {
                if (p.id === selectedProgram.id) {
                    const existing = p.teachers || [];
                    const exists = existing.some(t => t.id === createdTeacher.id);
                    return {
                        ...p,
                        teachers: exists ? existing : [createdTeacher, ...existing]
                    };
                }
                return p;
            }));

            // 3. Inmediatamente actualizar teachersList
            setTeachersList(prev => {
                const exists = prev.some(t => t.id === createdTeacher.id);
                return exists ? prev : [createdTeacher, ...prev];
            });

            // 4. Cerrar el modal y limpiar el formulario
            setAssignTeachersDialogOpen(false);
            setManualTeacherIdentificacion("");
            setManualTeacherNombres("");
            setManualTeacherApellido("");
            setManualTeacherEmail("");
            setManualTeacherTelefono("");

            toast.success("Instructor registrado exitosamente");

            // 5. Sincronizar en segundo plano con el servidor
            await refreshAll();
            await fetchSystemTeachers();
            router.refresh();
        } catch (error: any) {
            toast.error(error.message || "Error al registrar instructor");
        } finally {
            setIsRegisteringTeacher(false);
        }
    };

    const handleTeacherExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setExcelTeacherFileName(file.name);
        setImportTeacherResult(null);

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = new Uint8Array(evt.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: "array" });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                if (jsonData.length <= 1) {
                    toast.error("El archivo está vacío o no contiene filas de datos");
                    return;
                }

                // Extrayendo encabezados (fila 0) y normalizándolos
                const firstRow = (jsonData[0] as any[]) || [];
                const headers: string[] = [];
                for (let i = 0; i < firstRow.length; i++) {
                    const val = firstRow[i];
                    headers.push(val ? val.toString().trim().toLowerCase() : "");
                }
                
                // Encontrar los índices de cada columna requerida
                const getIndex = (aliases: string[]) => {
                    const exactIdx = headers.findIndex(h => h && aliases.includes(h));
                    if (exactIdx !== -1) return exactIdx;
                    
                    return headers.findIndex(h => h && 
                        h !== "tipo de documento" && 
                        h !== "tipo de doc" && 
                        h !== "tipodoc" && 
                        h !== "tipo_documento" && 
                        aliases.some(alias => h.includes(alias))
                    );
                };

                const numDocIdx = getIndex(["identificacion", "identificación", "número de documento", "numero de documento", "documento", "cedula", "tarjeta", "nro doc"]);
                const nombreIdx = getIndex(["nombre", "nombres", "primer nombre"]);
                const apellidoIdx = getIndex(["apellido", "apellidos"]);
                const emailIdx = getIndex(["email", "mail", "correo electrónico", "correo electronico", "correo"]);
                const telefonoIdx = getIndex(["teléfono", "telefono", "tel", "celular", "movil", "cel"]);

                if (numDocIdx === -1) {
                    toast.error("No se encontró la columna de 'Identificacion' en el archivo Excel");
                    return;
                }

                if (emailIdx === -1) {
                    toast.error("No se encontró la columna de 'Email' en el archivo Excel");
                    return;
                }

                const missingCols: string[] = [];
                if (nombreIdx === -1) missingCols.push("Nombre");
                if (apellidoIdx === -1) missingCols.push("Apellidos");
                if (missingCols.length > 0) {
                    toast.info(`Nota: No se encontraron las columnas: ${missingCols.join(", ")}. Se auto-completarán los datos.`);
                }

                const parsedList: any[] = [];
                for (let i = 1; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    if (!row || row.length === 0) continue;

                    const identificacion = row[numDocIdx]?.toString().trim();
                    if (!identificacion) continue;

                    const nombres = nombreIdx !== -1 && row[nombreIdx] ? row[nombreIdx].toString().trim() : "Profesor";
                    const apellido = apellidoIdx !== -1 && row[apellidoIdx] ? row[apellidoIdx].toString().trim() : "";
                    const email = emailIdx !== -1 && row[emailIdx] ? row[emailIdx].toString().trim() : "";
                    const telefono = telefonoIdx !== -1 && row[telefonoIdx] ? row[telefonoIdx].toString().trim() : "";

                    parsedList.push({
                        identificacion,
                        nombres,
                        apellido,
                        email,
                        telefono
                    });
                }

                if (parsedList.length === 0) {
                    toast.error("No se encontraron registros de instructores válidos en el archivo");
                } else {
                    setExcelTeachers(parsedList);
                    toast.success(`Se leyeron ${parsedList.length} instructores del archivo Excel.`);
                }
            } catch (err: any) {
                toast.error("Error al procesar el archivo Excel: " + err.message);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleImportTeacherExcel = async () => {
        if (!selectedProgram || excelTeachers.length === 0) return;

        cancelRef.current = false;
        let successCount = 0;
        const failedList: Array<{ name: string; detail?: string; error?: string }> = [];

        setProgressModal({
            isOpen: true,
            title: `Iniciando importación de ${excelTeachers.length} instructores...`,
            progress: 0,
            currentCount: 0,
            totalCount: excelTeachers.length,
            type: "import",
        });

        for (let i = 0; i < excelTeachers.length; i++) {
            if (cancelRef.current) {
                toast.warning("Importación cancelada");
                break;
            }

            const teacher = excelTeachers[i];
            const teacherName = `${teacher.nombres} ${teacher.apellido}`.trim() || teacher.email || "Instructor";
            const currentCount = i + 1;
            const progress = Math.round(((i) / excelTeachers.length) * 100);

            setProgressModal({
                isOpen: true,
                title: `Guardando (${currentCount}/${excelTeachers.length}): ${teacherName}`,
                progress: progress,
                currentCount: currentCount,
                totalCount: excelTeachers.length,
                type: "import",
            });

            try {
                const result = await registerSingleTeacherAction(selectedProgram.id, teacher);
                if (result.success) {
                    successCount++;
                } else {
                    failedList.push({
                        name: result.teacherName || teacherName,
                        detail: `Doc: ${result.identificacion || teacher.identificacion || 'N/A'} • ${result.email || teacher.email}`,
                        error: result.error || "Error al procesar instructor",
                    });
                }
            } catch (err: any) {
                failedList.push({
                    name: teacherName,
                    detail: `Doc: ${teacher.identificacion || 'N/A'} • ${teacher.email}`,
                    error: err.message || "Error inesperado al guardar",
                });
            }
        }

        setProgressModal(prev => ({ ...prev, progress: 100, currentCount: excelTeachers.length, isOpen: false }));
        setExcelTeachers([]);
        setExcelTeacherFileName("");

        if (failedList.length > 0) {
            setImportSummary({
                isOpen: true,
                title: "Reporte de Importación de Instructores",
                description: "Resumen del proceso de registro y asignación de instructores desde Excel.",
                entityName: "Instructores",
                total: excelTeachers.length,
                successCount: successCount,
                failedList: failedList,
            });
            toast.warning(`Importación finalizada: ${successCount} guardados, ${failedList.length} con observaciones.`);
        } else {
            toast.success(`¡Todos los instructores (${successCount}) fueron registrados y asignados con éxito!`);
        }

        if (successCount > 0) {
            setAssignTeachersDialogOpen(false);
        }

        await refreshAll();
        await fetchSystemTeachers();
        router.refresh();
    };

    const handleOpenTeacherAvailability = (teacher: Teacher) => {
        setSelectedTeacherForAvailability(teacher);
        setAdminTeacherAvailabilityOpen(true);
    };

    // ============ GENERAL DELETE HANDLER ============


    const handleOpenEditTeacher = (teacher: Teacher) => {
        setTeacherToEdit(teacher);
        setEditTeacherDoc(teacher.profile?.identificacion || "");
        
        let names = teacher.profile?.nombres || "";
        let lastName = teacher.profile?.apellido || "";
        if (!names && teacher.name) {
            const parts = teacher.name.trim().split(/\s+/);
            if (parts.length > 1) {
                names = parts[0];
                lastName = parts.slice(1).join(" ");
            } else {
                names = parts[0];
            }
        }

        setEditTeacherNames(names);
        setEditTeacherLastName(lastName);
        setEditTeacherEmail(teacher.email || "");
        setEditTeacherPhone(teacher.profile?.telefono || "");
        setEditTeacherDialogOpen(true);
    };


    const handleEditTeacherSave = async () => {
        if (!teacherToEdit) return;
        if (!editTeacherDoc || !editTeacherNames || !editTeacherLastName || !editTeacherEmail) {
            toast.error("Por favor completa todos los campos obligatorios");
            return;
        }

        startTransition(async () => {
            try {
                await updateTeacherAction({
                    id: teacherToEdit.id,
                    identificacion: editTeacherDoc,
                    nombres: editTeacherNames,
                    apellido: editTeacherLastName,
                    email: editTeacherEmail,
                    telefono: editTeacherPhone || undefined,
                });
                toast.success("Información del instructor actualizada");
                setEditTeacherDialogOpen(false);
                setTeacherToEdit(null);
                await refreshAll();
            } catch (error: any) {
                toast.error(error.message || "Error al actualizar instructor");
            }
        });
    };



    const handleOpenQual = (teacher: Teacher) => {
        setQualTeacher(teacher);
        setQualDialogOpen(true);
    };



    const triggerDelete = (type: "program" | "period" | "group" | "course" | "teacher" | "student", id: string, name: string) => {
        setDeleteType(type);
        setDeleteItemId(id);
        setDeleteItemName(name);
        setDeleteConfirmText("");
        setDeleteConfirmationOpen(true);
    };



    const handleDeleteConfirm = async () => {
        if (!deleteType || !deleteItemId) return;

        if (deleteType === "program" && deleteConfirmText.trim().toLowerCase() !== deleteItemName.trim().toLowerCase()) {
            toast.error(`Debes escribir "${deleteItemName}" para confirmar la eliminación.`);
            return;
        }

        startTransition(async () => {
            try {
                if (deleteType === "program") {
                    await deleteProgramAction(deleteItemId);
                    toast.success("Área de formación eliminada exitosamente");
                    if (selectedProgram?.id === deleteItemId) {
                        router.push(coursesBasePath);
                    }
                } else if (deleteType === "period") {
                    await deletePeriodAction(deleteItemId);
                    toast.success("Periodo académico eliminado");
                } else if (deleteType === "group") {
                    await deleteGroupAction(deleteItemId);
                    toast.success("Grupo académico eliminado");
                } else if (deleteType === "course") {
                    await deleteCourseAction(deleteItemId);
                    toast.success("Materia académica eliminada");
                } else if (deleteType === "teacher") {
                    if (selectedProgram) {
                        await assignTeacherToProgramAction(selectedProgram.id, deleteItemId, false);
                        toast.success("Instructor desvinculado del programa");
                    } else {
                        await deleteUserAction(deleteItemId);
                        toast.success("Instructor eliminado del sistema");
                    }
                } else if (deleteType === "student") {
                    await deleteUserAction(deleteItemId);
                    toast.success("Aprendiz eliminado del sistema");
                }
                setDeleteConfirmationOpen(false);
                setDeleteConfirmText("");
                await refreshAll();
                await fetchSystemStudents();
            } catch (error: any) {
                toast.error(error.message || "Error al eliminar el elemento");
            }
        });
    };

    // ============ COURSE FORM CRUD HANDLERS ============

    const openCreateCourseForPeriod = (periodId: string) => {
        setCourseToEdit(null);
        setCourseTitle("");
        setCourseDescription("");
        setCourseWeeklyHours(0);
        setCourseBadge("");
        setCourseBadgeColor("slate");
        setCoursePeriodId(periodId);
        setCourseDialogOpen(true);
    };

    const openEditCourse = (course: Course) => {
        setCourseToEdit(course);
        setCourseTitle(course.title);
        setCourseDescription(course.description || "");
        setCourseWeeklyHours(course.weeklyHours || 0);
        setCourseBadge(course.badge || "");
        setCourseBadgeColor(course.badgeColor || "slate");
        setCoursePeriodId(course.periodId || "");
        setCourseDialogOpen(true);
    };

    const handleSaveCourse = async () => {
        if (!courseTitle || courseTitle.trim().length < 3) {
            toast.error("El título de la materia debe tener al menos 3 caracteres");
            return;
        }
        if (!coursePeriodId || coursePeriodId === "none") {
            toast.error("Debes asociar la materia a un periodo académico");
            return;
        }

        const formData = new FormData();
        formData.append("title", courseTitle);
        formData.append("description", courseDescription);
        formData.append("periodId", coursePeriodId);
        formData.append("externalUrl", "");
        formData.append("weeklyHours", courseWeeklyHours.toString());
        formData.append("badge", courseBadge);
        formData.append("badgeColor", courseBadgeColor);
        formData.append("startDate", "");
        formData.append("endDate", "");
        formData.append("schedules", "[]");

        startTransition(async () => {
            try {
                if (courseToEdit) {
                    formData.append("courseId", courseToEdit.id);
                    await updateCourseAction(formData);
                    toast.success("Materia académica actualizada");
                } else {
                    await createCourseAction(formData);
                    toast.success("Materia creada exitosamente");
                }
                setCourseDialogOpen(false);
                await refreshAll();
            } catch (error: any) {
                toast.error(error.message || "Error al guardar la materia");
            }
        });
    };

    return (
        <div className="space-y-6">
            {selectedProgram === null && currentUserRole === "admin" && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Áreas de Formación</h2>
                        <p className="text-muted-foreground">
                            Crea y gestiona las Áreas de Formación de la institución.
                        </p>
                    </div>
                    {!isObserver && (
                        <div className="flex gap-2">
                            <Button onClick={openCreateProgram} className="shadow-md hover:shadow-lg transition-all">
                                <Plus className="mr-2 h-4 w-4" />
                                Nueva Área de Formación
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {selectedProgram === null ? (
                currentUserRole !== "admin" ? (
                    programs.length === 0 ? (
                        <div className="text-center py-20 bg-card rounded-3xl border border-dashed border-border/70 shadow-xs">
                            <GraduationCap className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                            <h3 className="font-bold text-lg text-foreground">Sin Área de Formación Asignada</h3>
                            <p className="text-muted-foreground text-xs max-w-sm mx-auto mt-1">
                                No tienes un área de formación asignada. Contacta al Administrador de la institución para asignarte a una.
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 space-y-4 rounded-3xl border border-border/60 bg-card/50">
                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                            <p className="text-xs text-muted-foreground font-medium">Cargando datos del área de formación...</p>
                        </div>
                    )
                ) : programIdParam ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-4 rounded-3xl border border-border/60 bg-card/50">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs text-muted-foreground font-medium">Cargando datos del área de formación...</p>
                    </div>
                ) : (
                    /* TABLE VIEW OF ALL PROGRAMS FOR ADMIN ONLY */
                    <div className="space-y-4">
                    {programs.length === 0 ? (
                        <div className="text-center py-20 bg-muted/10 rounded-2xl border border-dashed border-muted/50">
                            <GraduationCap className="h-16 w-16 text-muted/30 mx-auto mb-4" />
                            <h3 className="font-semibold text-lg">No hay áreas de formación</h3>
                            <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-1">
                                Crea tu primera área de formación profesional para empezar a organizar periodos académicos y grupos.
                            </p>
                            {!isObserver && (
                                <Button onClick={openCreateProgram} className="mt-4">
                                    <Plus className="mr-2 h-4 w-4" /> Crear Área de Formación
                                </Button>
                            )}
                        </div>
                    ) : (
                        <Card className="border border-border/80 bg-card shadow-xs rounded-3xl overflow-hidden">
                            <div className="p-5 border-b border-border/70 flex items-center justify-between">
                                <div>
                                    <h3 className="text-base font-bold text-foreground">Áreas de Formación Activas</h3>
                                    <p className="text-xs text-muted-foreground font-medium mt-0.5">
                                        Lista de todas las áreas de formación registradas en la institución.
                                    </p>
                                </div>
                                <Badge variant="outline" className="text-xs font-bold px-3 py-1 rounded-xl bg-primary/10 text-primary border-primary/20">
                                    {programs.length} {programs.length === 1 ? "Área" : "Áreas"}
                                </Badge>
                            </div>

                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-muted/30">
                                        <TableRow>
                                            <TableHead className="w-[350px] font-bold">Área de Formación</TableHead>
                                            <TableHead className="text-center font-bold">Aprendices / Alumnos</TableHead>
                                            <TableHead className="font-bold">Gestores Asignados</TableHead>
                                            <TableHead className="text-right font-bold w-[120px]">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {programs.map((program) => {
                                            const totalStudents = program.groups.reduce((acc, g) => acc + g.students.length, 0);
                                            const gestores = (program as any).gestores || [];

                                            return (
                                                <TableRow key={program.id} className="hover:bg-muted/20 transition-colors">
                                                    <TableCell className="font-medium">
                                                        <div className="flex items-center gap-3">
                                                            <div 
                                                                className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20 shrink-0 cursor-pointer hover:bg-primary/20 transition-colors"
                                                                onClick={() => {
                                                                    setSelectedProgram(program);
                                                                    router.push(`${coursesBasePath}?programId=${program.id}`);
                                                                }}
                                                                title="Visualizar esta área"
                                                            >
                                                                <GraduationCap className="h-5 w-5" />
                                                            </div>
                                                            <div 
                                                                className="flex flex-col max-w-xs cursor-pointer group"
                                                                onClick={() => {
                                                                    setSelectedProgram(program);
                                                                    router.push(`${coursesBasePath}?programId=${program.id}`);
                                                                }}
                                                                title="Visualizar esta área"
                                                            >
                                                                <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                                                                    {program.name}
                                                                </span>
                                                                <span className="text-xs text-muted-foreground line-clamp-1">
                                                                    {program.description || "Sin descripción proporcionada."}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </TableCell>

                                                    <TableCell className="text-center">
                                                        <Badge variant="secondary" className="font-bold text-xs px-2.5 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                                                            {totalStudents}
                                                        </Badge>
                                                    </TableCell>

                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            {gestores.length > 0 ? (
                                                                <div className="flex flex-wrap gap-1 items-center">
                                                                    {gestores.map((g: any) => (
                                                                        <Badge key={g.id} variant="outline" className="text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20">
                                                                            {g.name}
                                                                        </Badge>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground italic">Sin gestor asignado</span>
                                                            )}
                                                            {currentUserRole === "admin" && (
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-6 w-6 text-muted-foreground hover:text-foreground shrink-0 rounded-full"
                                                                    onClick={() => openEditProgram(program)}
                                                                    title="Asignar o cambiar gestores"
                                                                >
                                                                    <Plus className="h-3 w-3" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </TableCell>

                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            {!isObserver && (
                                                                <>
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                                        onClick={() => openEditProgram(program)}
                                                                        title="Editar área de formación"
                                                                    >
                                                                        <Edit className="h-4 w-4" />
                                                                    </Button>
                                                                    {currentUserRole === "admin" && (
                                                                        <Button
                                                                            size="icon"
                                                                            variant="ghost"
                                                                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                                                            onClick={() => triggerDelete("program", program.id, program.name)}
                                                                            title="Eliminar área de formación"
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    )}
                                                                </>
                                                            )}
                                                            {currentUserRole !== "admin" ? (
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        router.push(`${coursesBasePath}?programId=${program.id}`);
                                                                        setSubTab("overview");
                                                                    }}
                                                                    className="h-8 text-xs font-bold gap-1 rounded-xl shadow-xs"
                                                                >
                                                                    Administrar
                                                                    <ArrowUpRight className="h-3.5 w-3.5" />
                                                                </Button>
                                                            ) : (
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        setSelectedProgram(program);
                                                                        router.push(`${coursesBasePath}?programId=${program.id}`);
                                                                    }}
                                                                    className="h-8 text-xs font-bold gap-1.5 rounded-xl shadow-xs bg-primary text-primary-foreground hover:bg-primary/90 ml-1"
                                                                >
                                                                    <Eye className="h-3.5 w-3.5" />
                                                                    Visualizar Área
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </Card>
                    )}
                </div>
            )) : (currentUserRole === "admin" || isObserver) ? (
                <AdminProgramReadOnlyView
                    program={selectedProgram}
                    allPrograms={programs}
                    isObserver={isObserver}
                    onBack={() => {
                        setSelectedProgram(null);
                        router.push(coursesBasePath);
                    }}
                    onSelectProgram={(progId) => {
                        const nextProg = programs.find(p => p.id === progId);
                        if (nextProg) {
                            setSelectedProgram(nextProg);
                            router.push(`${coursesBasePath}?programId=${progId}`);
                        }
                    }}
                    onEditProgram={isObserver ? undefined : (prog) => openEditProgram(prog)}
                />
            ) : (
                /* PROGRAM-CENTRIC WORKSPACE FOR GESTOR */
                <div className="space-y-6">
                    {/* Header Panel */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-card p-3.5 sm:p-4 rounded-2xl border border-border/80 shadow-xs">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                                <GraduationCap className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black tracking-tight text-foreground">{selectedProgram.name}</h3>
                                <p className="text-xs text-muted-foreground font-medium">
                                    {selectedProgram.description || "Sin descripción."}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={openPdfConfigModal}
                                disabled={isExportingCurriculumPDF}
                                className="h-8 text-xs font-bold rounded-xl border-rose-500/20 text-rose-600 hover:text-rose-700 hover:bg-rose-500/5 dark:text-rose-400 shadow-2xs hover:scale-105 transition-all"
                            >
                                {isExportingCurriculumPDF ? (
                                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                ) : (
                                    <FileText className="h-3.5 w-3.5 mr-1.5" />
                                )}
                                Programa PDF
                            </Button>
                            {currentUserRole === "admin" && (
                                <>
                                    <Button size="sm" variant="outline" className="h-8 text-xs font-bold rounded-xl" onClick={() => openEditProgram(selectedProgram)}>
                                        <Edit className="h-3.5 w-3.5 mr-1.5" />
                                        Editar
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-8 text-xs font-bold rounded-xl text-destructive hover:bg-destructive/10" onClick={() => triggerDelete("program", selectedProgram.id, selectedProgram.name)}>
                                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                                        Eliminar
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>

                    <Tabs value={subTab} onValueChange={setSubTab} className="space-y-6">
                        <div className="flex items-center gap-2">
                            <TabsList className="flex flex-1 md:max-w-none overflow-x-auto bg-muted/40 p-1 rounded-xl scrollbar-none justify-start md:justify-center">
                                <TabsTrigger value="overview" className="rounded-lg flex-1 shrink-0">Vista General</TabsTrigger>
                                <TabsTrigger value="periods" className="rounded-lg flex-1 shrink-0">Programas de Formación</TabsTrigger>
                                <TabsTrigger value="groups" className="rounded-lg flex-1 shrink-0">Grupos y Aprendices</TabsTrigger>
                                <TabsTrigger value="teachers" className="rounded-lg flex-1 shrink-0">Instructores</TabsTrigger>
                                <TabsTrigger value="environments" className="rounded-lg flex-1 shrink-0">Ambientes</TabsTrigger>
                            </TabsList>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setIsTabsHelpOpen(true)}
                                        className="w-10 h-10 rounded-xl border-border/80 hover:bg-muted text-foreground shadow-2xs hover:scale-105 transition-all shrink-0"
                                    >
                                        <HelpCircle className="w-4.5 h-4.5 text-primary" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">¿Qué puedo hacer acá? Guía de la pestaña</TooltipContent>
                            </Tooltip>
                        </div>

                        {/* SUB-TAB: OVERVIEW */}
                        <TabsContent value="overview" className="space-y-6 mt-0">
                            {(() => {
                                const groups = selectedProgram.groups || [];
                                const periods = selectedProgram.periods || [];
                                const teachers = selectedProgram.teachers || [];
                                const environments = selectedProgram.environments || [];
                                const timelines = selectedProgram.timelines || [];
                                const gestores = (selectedProgram as any).gestores || [];

                                // 1. Student census by stage
                                const totalStudents = groups.reduce((acc, g) => acc + (g.students?.length || 0), 0);
                                const lectivaGroups = groups.filter(g => (g.categoria || "LECTIVA") === "LECTIVA");
                                const productivaGroups = groups.filter(g => g.categoria === "PRODUCTIVA");
                                const egresadosGroups = groups.filter(g => g.categoria === "EGRESADOS");

                                const lectivaStudents = lectivaGroups.reduce((acc, g) => acc + (g.students?.length || 0), 0);
                                const productivaStudents = productivaGroups.reduce((acc, g) => acc + (g.students?.length || 0), 0);
                                const egresadosStudents = egresadosGroups.reduce((acc, g) => acc + (g.students?.length || 0), 0);

                                const percentLectiva = totalStudents > 0 ? Math.round((lectivaStudents / totalStudents) * 100) : 0;
                                const percentProductiva = totalStudents > 0 ? Math.round((productivaStudents / totalStudents) * 100) : 0;
                                const percentEgresados = totalStudents > 0 ? Math.round((egresadosStudents / totalStudents) * 100) : 0;

                                // 2. Courses and hours
                                let totalCoursesCount = 0;
                                let totalWeeklyHours = 0;
                                periods.forEach(p => {
                                    (p.courses || []).forEach(c => {
                                        if (!c.groupId) {
                                            totalCoursesCount++;
                                            totalWeeklyHours += c.weeklyHours || 0;
                                        }
                                    });
                                });

                                // 3. Find largest group
                                let largestGroup: typeof groups[0] | null = null;
                                for (const g of groups) {
                                    if (!largestGroup || (g.students?.length || 0) > (largestGroup.students?.length || 0)) {
                                        largestGroup = g;
                                    }
                                }

                                // 4. Find course with highest hours
                                let maxHoursCourse: { title: string; hours: number; periodName: string } | null = null;
                                for (const p of periods) {
                                    for (const c of (p.courses || [])) {
                                        const h = c.weeklyHours || 0;
                                        if (h > 0 && (!maxHoursCourse || h > maxHoursCourse.hours)) {
                                            maxHoursCourse = {
                                                title: c.title,
                                                hours: h,
                                                periodName: p.name
                                            };
                                        }
                                    }
                                }

                                const schedulesPath = currentUserRole === "gestor" ? "/dashboard/gestor/schedules" : "/dashboard/admin/schedules";

                                return (
                                    <div className="space-y-6 animate-in fade-in-50 duration-200">
                                        {/* Header de Vista General con Acciones de Exportación y Ayuda */}
                                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-card p-4 rounded-2xl border border-border/80 shadow-xs">
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-base font-bold tracking-tight text-foreground">
                                                        Diagnóstico y Resumen: {selectedProgram.name}
                                                    </h4>
                                                    <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 text-primary border-primary/20">
                                                        Área de Formación
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    Indicadores consolidados, censo de aprendices por etapa, mallas curriculares, docentes y ambientes vinculados.
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0 flex-wrap self-start sm:self-auto">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleExportOverviewPdf}
                                                    disabled={isExportingOverviewPdf}
                                                    className="h-8 gap-1.5 rounded-xl text-xs font-bold border-red-500/30 text-red-700 dark:text-red-300 bg-red-500/10 hover:bg-red-500/20 shadow-2xs cursor-pointer"
                                                    title="Exportar reporte del área en PDF"
                                                >
                                                    {isExportingOverviewPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />}
                                                    <span>Reporte PDF</span>
                                                </Button>

                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleExportOverviewExcel}
                                                    disabled={isExportingOverviewExcel}
                                                    className="h-8 gap-1.5 rounded-xl text-xs font-bold border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 shadow-2xs cursor-pointer"
                                                    title="Exportar reporte del área en Excel"
                                                >
                                                    {isExportingOverviewExcel ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />}
                                                    <span>Reporte Excel</span>
                                                </Button>

                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setIsTabsHelpOpen(true)}
                                                            className="h-8 rounded-xl text-xs font-bold gap-1.5 border-border/80 hover:bg-muted text-foreground shadow-2xs hover:scale-105 transition-all"
                                                        >
                                                            <HelpCircle className="w-3.5 h-3.5 text-primary" />
                                                            <span>¿Qué puedo hacer acá?</span>
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="bottom">Guía y Ayuda de la Vista General</TooltipContent>
                                                </Tooltip>
                                            </div>
                                        </div>

                                        {/* Fila de Tarjetas de Métricas Principales (Navegables) */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                                            {/* Card 1: Fichas */}
                                            <Card 
                                                className="bg-card border border-border/80 rounded-2xl p-3.5 relative overflow-hidden shadow-2xs hover:shadow-md hover:border-blue-500/40 transition-all cursor-pointer flex flex-col justify-between gap-1 group"
                                                onClick={() => setSubTab("groups")}
                                                title="Ir a Grupos y Aprendices"
                                            >
                                                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                                                <div className="flex items-center justify-between pl-1">
                                                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Fichas / Grupos</span>
                                                    <div className="p-1.5 bg-blue-500/10 text-blue-500 rounded-xl shrink-0 group-hover:scale-110 transition-transform">
                                                        <Layers className="h-4 w-4" />
                                                    </div>
                                                </div>
                                                <div className="flex items-baseline gap-2 pl-1 mt-1">
                                                    <span className="text-2xl font-black text-foreground tracking-tight">{groups.length}</span>
                                                    <span className="text-[10px] text-muted-foreground font-medium truncate">
                                                        {lectivaGroups.length} Lectiva • {productivaGroups.length} Prod.
                                                    </span>
                                                </div>
                                            </Card>

                                            {/* Card 2: Censo Aprendices */}
                                            <Card 
                                                className="bg-card border border-border/80 rounded-2xl p-3.5 relative overflow-hidden shadow-2xs hover:shadow-md hover:border-violet-500/40 transition-all cursor-pointer flex flex-col justify-between gap-1 group"
                                                onClick={() => setSubTab("groups")}
                                                title="Ir a Grupos y Aprendices"
                                            >
                                                <div className="absolute top-0 left-0 w-1 h-full bg-violet-500" />
                                                <div className="flex items-center justify-between pl-1">
                                                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Aprendices</span>
                                                    <div className="p-1.5 bg-violet-500/10 text-violet-500 rounded-xl shrink-0 group-hover:scale-110 transition-transform">
                                                        <Users className="h-4 w-4" />
                                                    </div>
                                                </div>
                                                <div className="flex items-baseline gap-2 pl-1 mt-1">
                                                    <span className="text-2xl font-black text-foreground tracking-tight">{totalStudents}</span>
                                                    <span className="text-[10px] text-muted-foreground font-medium truncate">
                                                        {lectivaStudents} en etapa lectiva ({percentLectiva}%)
                                                    </span>
                                                </div>
                                            </Card>

                                            {/* Card 3: Programas de Formación */}
                                            <Card 
                                                className="bg-card border border-border/80 rounded-2xl p-3.5 relative overflow-hidden shadow-2xs hover:shadow-md hover:border-emerald-500/40 transition-all cursor-pointer flex flex-col justify-between gap-1 group"
                                                onClick={() => setSubTab("timelines")}
                                                title="Ir a Programas de Formación"
                                            >
                                                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                                                <div className="flex items-center justify-between pl-1">
                                                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Programas</span>
                                                    <div className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-xl shrink-0 group-hover:scale-110 transition-transform">
                                                        <GraduationCap className="h-4 w-4" />
                                                    </div>
                                                </div>
                                                <div className="flex items-baseline gap-2 pl-1 mt-1">
                                                    <span className="text-2xl font-black text-foreground tracking-tight">{timelines.length}</span>
                                                    <span className="text-[10px] text-muted-foreground font-medium truncate">
                                                        {periods.length} {periods.length === 1 ? "trimestre" : "trimestres"}
                                                    </span>
                                                </div>
                                            </Card>

                                            {/* Card 4: Materias */}
                                            <Card 
                                                className="bg-card border border-border/80 rounded-2xl p-3.5 relative overflow-hidden shadow-2xs hover:shadow-md hover:border-amber-500/40 transition-all cursor-pointer flex flex-col justify-between gap-1 group"
                                                onClick={() => setSubTab("timelines")}
                                                title="Ir a Materias y Competencias"
                                            >
                                                <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
                                                <div className="flex items-center justify-between pl-1">
                                                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Materias</span>
                                                    <div className="p-1.5 bg-amber-500/10 text-amber-500 rounded-xl shrink-0 group-hover:scale-110 transition-transform">
                                                        <BookOpen className="h-4 w-4" />
                                                    </div>
                                                </div>
                                                <div className="flex items-baseline gap-2 pl-1 mt-1">
                                                    <span className="text-2xl font-black text-foreground tracking-tight">{totalCoursesCount}</span>
                                                    <span className="text-[10px] text-muted-foreground font-medium truncate">
                                                        {totalWeeklyHours}h semanales
                                                    </span>
                                                </div>
                                            </Card>

                                            {/* Card 5: Instructores & Ambientes */}
                                            <Card 
                                                className="bg-card border border-border/80 rounded-2xl p-3.5 relative overflow-hidden shadow-2xs hover:shadow-md hover:border-cyan-500/40 transition-all cursor-pointer flex flex-col justify-between gap-1 group"
                                                onClick={() => setSubTab("teachers")}
                                                title="Ir a Instructores"
                                            >
                                                <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500" />
                                                <div className="flex items-center justify-between pl-1">
                                                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Instructores</span>
                                                    <div className="p-1.5 bg-cyan-500/10 text-cyan-500 rounded-xl shrink-0 group-hover:scale-110 transition-transform">
                                                        <Building className="h-4 w-4" />
                                                    </div>
                                                </div>
                                                <div className="flex items-baseline gap-2 pl-1 mt-1">
                                                    <span className="text-2xl font-black text-foreground tracking-tight">{teachers.length}</span>
                                                    <span className="text-[10px] text-muted-foreground font-medium truncate">
                                                        {environments.length} ambientes
                                                    </span>
                                                </div>
                                            </Card>
                                        </div>

                                        {/* Distribución en 2 Columnas */}
                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                            {/* Columna Izquierda: Distribución por Etapas y Desglose de Programas Formativos */}
                                            <div className="lg:col-span-2 space-y-6">
                                                {/* Card: Censo de Aprendices por Etapa de Formación */}
                                                <Card className="border border-border/80 bg-card shadow-xs rounded-2xl overflow-hidden">
                                                    <CardHeader className="pb-3 border-b border-border/70">
                                                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                                                            <Activity className="h-4 w-4 text-primary" />
                                                            Distribución de Aprendices por Etapa de Formación
                                                        </CardTitle>
                                                        <CardDescription className="text-xs">
                                                            Censo consolidado de fichas y aprendices según su estado formativo actual.
                                                        </CardDescription>
                                                    </CardHeader>
                                                    <CardContent className="p-5 space-y-5">
                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                                                            {/* Etapa Lectiva */}
                                                            <div className="p-3.5 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-2">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-xs font-bold text-foreground">Etapa Lectiva</span>
                                                                    <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 text-[10px] font-bold">
                                                                        {lectivaGroups.length} {lectivaGroups.length === 1 ? "Ficha" : "Fichas"}
                                                                    </Badge>
                                                                </div>
                                                                <div className="text-2xl font-black text-foreground">
                                                                    {lectivaStudents}
                                                                </div>
                                                                <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden">
                                                                    <div 
                                                                        className="bg-blue-500 h-full rounded-full transition-all duration-500" 
                                                                        style={{ width: `${percentLectiva}%` }}
                                                                    />
                                                                </div>
                                                                <p className="text-[11px] text-muted-foreground font-medium">
                                                                    {percentLectiva}% del total de aprendices
                                                                </p>
                                                            </div>

                                                            {/* Etapa Productiva */}
                                                            <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-2">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-xs font-bold text-foreground">Etapa Productiva</span>
                                                                    <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-bold">
                                                                        {productivaGroups.length} {productivaGroups.length === 1 ? "Ficha" : "Fichas"}
                                                                    </Badge>
                                                                </div>
                                                                <div className="text-2xl font-black text-foreground">
                                                                    {productivaStudents}
                                                                </div>
                                                                <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden">
                                                                    <div 
                                                                        className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                                                                        style={{ width: `${percentProductiva}%` }}
                                                                    />
                                                                </div>
                                                                <p className="text-[11px] text-muted-foreground font-medium">
                                                                    {percentProductiva}% en práctica / pasantía
                                                                </p>
                                                            </div>

                                                            {/* Egresados */}
                                                            <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-xs font-bold text-foreground">Egresados</span>
                                                                    <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                                                                        {egresadosGroups.length} {egresadosGroups.length === 1 ? "Ficha" : "Fichas"}
                                                                    </Badge>
                                                                </div>
                                                                <div className="text-2xl font-black text-foreground">
                                                                    {egresadosStudents}
                                                                </div>
                                                                <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden">
                                                                    <div 
                                                                        className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                                                                        style={{ width: `${percentEgresados}%` }}
                                                                    />
                                                                </div>
                                                                <p className="text-[11px] text-muted-foreground font-medium">
                                                                    {percentEgresados}% culminaron formación
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Parámetros Operativos Rápidos */}
                                                        <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                                <Building className="h-4 w-4 text-primary shrink-0" />
                                                                <span>Ambientes vinculados: <strong className="text-foreground">{environments.length} espacios</strong></span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                                <Clock className="h-4 w-4 text-primary shrink-0" />
                                                                <span>Carga máx. instructor: <strong className="text-foreground">{selectedProgram.maxTeacherHours || 40}h semanales</strong></span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                                <Calendar className="h-4 w-4 text-primary shrink-0" />
                                                                <span>Trimestres activos: <strong className="text-foreground">{periods.length} periodos</strong></span>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>

                                                {/* Card: Programas de Formación y Malla Curricular */}
                                                <Card className="border border-border/80 bg-card shadow-xs rounded-2xl overflow-hidden">
                                                    <CardHeader className="pb-3 border-b border-border/70 flex flex-row items-center justify-between">
                                                        <div>
                                                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                                                <GraduationCap className="h-4 w-4 text-primary" />
                                                                Programas de Formación y Mallas Curriculares
                                                            </CardTitle>
                                                            <CardDescription className="text-xs">
                                                                Líneas curriculares estructuradas dentro de esta área de formación.
                                                            </CardDescription>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setSubTab("timelines")}
                                                            className="text-xs text-primary font-bold hover:bg-primary/10 rounded-xl"
                                                        >
                                                            Gestionar Mallas →
                                                        </Button>
                                                    </CardHeader>
                                                    <CardContent className="p-5">
                                                        {timelines.length === 0 ? (
                                                            <div className="text-center py-6 space-y-2">
                                                                <p className="text-xs text-muted-foreground">
                                                                    No hay programas de formación (líneas curriculares) creados en esta área.
                                                                </p>
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => setSubTab("timelines")}
                                                                    className="rounded-xl text-xs font-semibold"
                                                                >
                                                                    Crear Programa de Formación
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-3">
                                                                {timelines.map((tl: any) => {
                                                                    const tlPeriods = periods.filter(p => p.timelineId === tl.id);
                                                                    const tlCourses = tlPeriods.flatMap(p => (p.courses || []).filter(c => !c.groupId));
                                                                    const tlWeeklyHours = tlCourses.reduce((sum, c) => sum + (c.weeklyHours || 0), 0);
                                                                    return (
                                                                        <div
                                                                            key={tl.id}
                                                                            className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 p-3.5 rounded-xl bg-muted/20 border border-border/60 hover:border-border hover:bg-muted/30 transition-all"
                                                                        >
                                                                            <div className="space-y-1">
                                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                                    <span className="font-bold text-sm text-foreground">{tl.name}</span>
                                                                                    {tl.code && (
                                                                                        <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0 bg-primary/10 text-primary border-primary/20">
                                                                                            {tl.code}
                                                                                        </Badge>
                                                                                    )}
                                                                                    {tl.isDefault && (
                                                                                        <Badge className="text-[9px] font-bold px-1.5 py-0 bg-blue-500/10 text-blue-500 border-blue-500/20">
                                                                                            Principal
                                                                                        </Badge>
                                                                                    )}
                                                                                </div>
                                                                                <p className="text-xs text-muted-foreground line-clamp-1">
                                                                                    {tl.description || "Sin descripción curricular específica."}
                                                                                </p>
                                                                            </div>
                                                                            <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                                                                                <div className="text-right text-xs">
                                                                                    <span className="font-bold text-foreground">{tlPeriods.length} trimestres</span>
                                                                                    <p className="text-[10px] text-muted-foreground">{tlCourses.length} materias • {tlWeeklyHours}h/sem</p>
                                                                                </div>
                                                                                <Button
                                                                                    variant="outline"
                                                                                    size="sm"
                                                                                    onClick={() => setSubTab("timelines")}
                                                                                    className="h-7 text-xs font-semibold rounded-lg"
                                                                                >
                                                                                    Ver Malla
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            </div>

                                            {/* Columna Derecha: Programación Horaria del Área y Ficha Técnica */}
                                            <div className="space-y-6">
                                                {/* Card: Conexión con Programación Horaria */}
                                                <Card className="border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card shadow-xs rounded-2xl overflow-hidden">
                                                    <CardHeader className="pb-3 border-b border-border/70">
                                                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                                                            <CalendarDays className="h-4 w-4 text-primary" />
                                                            Programación Horaria del Área
                                                        </CardTitle>
                                                        <CardDescription className="text-xs">
                                                            Horarios por trimestre, mallas panorámicas y asignaciones sin cruces.
                                                        </CardDescription>
                                                    </CardHeader>
                                                    <CardContent className="p-5 space-y-4">
                                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                                            La planificación de mallas horarias, asignación de aulas sin cruces, bloqueos de disponibilidad docente y permisos de asistencia de esta área se administran en el módulo de <strong className="text-foreground">Programación Horaria</strong>.
                                                        </p>
                                                        <Button
                                                            onClick={() => router.push(schedulesPath)}
                                                            className="w-full bg-primary hover:bg-primary/90 text-white font-bold rounded-xl h-9 text-xs shadow-md shadow-primary/20 gap-2 cursor-pointer"
                                                        >
                                                            <CalendarDays className="w-3.5 h-3.5" />
                                                            <span>Abrir Programación Horaria</span>
                                                            <ChevronRight className="w-3.5 h-3.5 ml-auto" />
                                                        </Button>
                                                        <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
                                                            <span>Control Trimestral</span>
                                                            <span className="text-emerald-500 font-bold flex items-center gap-1">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                                Módulo Operativo
                                                            </span>
                                                        </div>
                                                    </CardContent>
                                                </Card>

                                                {/* Card: Datos Clave y Récords */}
                                                <Card className="border border-border/80 bg-card shadow-xs rounded-2xl overflow-hidden">
                                                    <CardHeader className="pb-3 border-b border-border/70">
                                                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                                                            <Info className="h-4 w-4 text-primary" />
                                                            Datos Clave del Área
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="p-5 space-y-3.5 text-xs">
                                                        <div className="p-3 bg-muted/20 border border-border/60 rounded-xl space-y-1">
                                                            <div className="text-muted-foreground font-semibold">Ficha Más Numerosa</div>
                                                            {largestGroup ? (
                                                                <div>
                                                                    <span className="font-bold text-foreground text-sm">{largestGroup.name}</span>
                                                                    <span className="text-muted-foreground font-medium ml-1.5">
                                                                        ({largestGroup.students?.length || 0} aprendices)
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-muted-foreground font-medium">Sin grupos registrados</span>
                                                            )}
                                                        </div>

                                                        <div className="p-3 bg-muted/20 border border-border/60 rounded-xl space-y-1">
                                                            <div className="text-muted-foreground font-semibold">Materia con Mayor Carga Horaria</div>
                                                            {maxHoursCourse ? (
                                                                <div>
                                                                    <div className="font-bold text-foreground text-sm truncate">{maxHoursCourse.title}</div>
                                                                    <div className="text-[10px] text-muted-foreground font-medium mt-0.5">
                                                                        {maxHoursCourse.hours}h semanales • {maxHoursCourse.periodName}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <span className="text-muted-foreground font-medium">Ninguna registrada</span>
                                                            )}
                                                        </div>

                                                        <div className="p-3 bg-muted/20 border border-border/60 rounded-xl space-y-2">
                                                            <div className="text-muted-foreground font-semibold">Gestores Académicos del Área</div>
                                                            {gestores.length > 0 ? (
                                                                <div className="space-y-1.5">
                                                                    {gestores.map((g: any) => (
                                                                        <div key={g.id} className="flex items-center gap-2">
                                                                            <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                                                                                {(g.name || "G").charAt(0).toUpperCase()}
                                                                            </div>
                                                                            <span className="font-semibold text-foreground truncate">{g.name}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <span className="text-muted-foreground italic">Gestión institucional central</span>
                                                            )}
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </TabsContent>

                        {/* SUB-TAB: PERIODS & COURSES */}
                        <TabsContent value="periods" className="space-y-6 mt-0">
                            {/* Sección de Programas de Formación */}
                            <div className="bg-card/70 border border-border/80 rounded-2xl p-4 shadow-xs space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-2">
                                            <Layers className="w-4 h-4 text-primary" />
                                            <h4 className="text-sm font-bold text-foreground">Programas de Formación</h4>
                                            <Badge variant="outline" className="text-[10px] font-bold text-muted-foreground">
                                                {(selectedProgram.timelines || []).length} disponibles
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Gestiona múltiples programas de formación para esta área. Cada programa cuenta con su propia estructura de periodos y materias.
                                        </p>
                                    </div>

                                    {!isObserver && (
                                        <Button
                                            type="button"
                                            onClick={openCreateTimeline}
                                            size="sm"
                                            variant="outline"
                                            className="h-8 text-xs font-bold border-primary/30 text-primary hover:bg-primary/10 shrink-0"
                                        >
                                            <Plus className="w-3.5 h-3.5 mr-1" />
                                            Nuevo Programa de Formación
                                        </Button>
                                    )}
                                </div>

                                {/* Selector de Líneas de Tiempo */}
                                <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-thin">
                                    {(selectedProgram.timelines || []).map((tl: any) => {
                                        const isSelected = tl.id === (selectedTimelineId || (selectedProgram.timelines || [])[0]?.id);
                                        const tlPeriods = selectedProgram.periods.filter(p => p.timelineId ? p.timelineId === tl.id : tl.isDefault);
                                        return (
                                            <div
                                                key={tl.id}
                                                onClick={() => setSelectedTimelineId(tl.id)}
                                                className={cn(
                                                    "group relative flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-all shrink-0 select-none shadow-2xs",
                                                    isSelected
                                                        ? "bg-primary text-primary-foreground border-primary shadow-sm ring-1 ring-primary/40"
                                                        : "bg-muted/40 hover:bg-muted/80 text-foreground border-border/80"
                                                )}
                                            >
                                                <BookOpen className={cn("w-3.5 h-3.5 shrink-0", isSelected ? "text-primary-foreground" : "text-primary")} />
                                                <span className="truncate max-w-[260px]">{tl.name}</span>
                                                <Badge
                                                    variant={isSelected ? "secondary" : "outline"}
                                                    className={cn("text-[9px] px-1.5 py-0 h-4 font-extrabold rounded-md", isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "text-muted-foreground")}
                                                >
                                                    {tlPeriods.length} {tlPeriods.length === 1 ? "periodo" : "periodos"}
                                                </Badge>
                                                {tl.isDefault && (
                                                    <span className={cn("text-[9px] font-black uppercase px-1 py-0.2 rounded", isSelected ? "bg-white/20 text-white" : "bg-primary/15 text-primary")}>
                                                        Principal
                                                    </span>
                                                )}

                                                {!isObserver && (
                                                    <div className="flex items-center gap-0.5 ml-1 pl-1.5 border-l border-current/20" onClick={(e) => e.stopPropagation()}>
                                                        <button
                                                            type="button"
                                                            title="Editar denominación"
                                                            onClick={() => openEditTimeline(tl)}
                                                            className={cn("p-1 rounded hover:bg-black/10 transition-colors", isSelected ? "hover:bg-white/20" : "")}
                                                        >
                                                            <Edit className="w-3 h-3" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            title="Duplicar programa y materias"
                                                            onClick={() => openDuplicateTimeline(tl)}
                                                            className={cn("p-1 rounded hover:bg-black/10 transition-colors", isSelected ? "hover:bg-white/20" : "")}
                                                        >
                                                            <Copy className="w-3 h-3" />
                                                        </button>
                                                        {(selectedProgram.timelines || []).length > 1 && (
                                                            <button
                                                                type="button"
                                                                title="Eliminar programa de formación"
                                                                onClick={() => handleDeleteTimeline(tl)}
                                                                className={cn("p-1 rounded hover:bg-red-500/20 text-red-400 transition-colors", isSelected ? "hover:bg-red-500/40 text-white" : "")}
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {(() => {
                                    const activeTl = (selectedProgram.timelines || []).find((t: any) => t.id === (selectedTimelineId || (selectedProgram.timelines || [])[0]?.id));
                                    if (!activeTl?.description) return null;
                                    const desc = activeTl.description.replace(/^Línea de tiempo principal para/i, "Programa de formación principal para");
                                    return (
                                        <p className="text-[11px] text-muted-foreground italic px-1 pt-0.5">
                                            {desc}
                                        </p>
                                    );
                                })()}
                            </div>

                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-2">
                                <h4 className="text-base font-semibold text-muted-foreground">Programas de Formación de {selectedProgram.name}</h4>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => setIsTabsHelpOpen(true)}
                                                className="h-8 w-8 rounded-xl border-border/80 hover:bg-muted text-foreground shadow-2xs hover:scale-105 transition-all"
                                            >
                                                <HelpCircle className="w-3.5 h-3.5 text-primary" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom">¿Qué puedo hacer acá? Guía de Programas de Formación</TooltipContent>
                                    </Tooltip>
                                    <Button
                                        onClick={openPdfConfigModal}
                                        disabled={isExportingCurriculumPDF}
                                        variant="outline"
                                        size="sm"
                                        className="shadow-sm border-rose-500/20 text-rose-600 hover:text-rose-700 hover:bg-rose-500/5 dark:text-rose-400 font-semibold"
                                    >
                                        {isExportingCurriculumPDF ? (
                                            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                                        ) : (
                                            <FileText className="h-4 w-4 mr-1.5 text-rose-500" />
                                        )}
                                        Programa de Formación PDF
                                    </Button>
                                    <Button onClick={handleExportPeriodsJSON} variant="outline" size="sm" className="shadow-sm border-blue-500/20 text-blue-600 hover:text-blue-700 hover:bg-blue-500/5 dark:text-blue-400">
                                        <Download className="h-4 w-4 mr-1.5" />
                                        Exportar JSON
                                    </Button>
                                    {!isObserver && (
                                        <>
                                            <div className="relative">
                                                <input
                                                    type="file"
                                                    accept=".json"
                                                    onChange={handleImportPeriodsJSON}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                />
                                                <Button variant="outline" size="sm" className="shadow-sm border-amber-500/20 text-amber-600 hover:text-amber-700 hover:bg-amber-500/5 dark:text-amber-400">
                                                    <Upload className="h-4 w-4 mr-1.5" />
                                                    Importar JSON
                                                </Button>
                                            </div>
                                            <Button onClick={openCreatePeriod} size="sm" className="shadow-sm">
                                                <Plus className="h-4 w-4 mr-1.5" />
                                                Agregar Periodo
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {(() => {
                                const activeTl = (selectedProgram.timelines || []).find((t: any) => t.id === (selectedTimelineId || (selectedProgram.timelines || [])[0]?.id));
                                const filteredPeriods = selectedProgram.periods.filter(p => {
                                    if (p.timelineId) return p.timelineId === activeTl?.id;
                                    return activeTl?.isDefault ?? true;
                                });

                                if (filteredPeriods.length === 0) {
                                    return (
                                        <div className="text-center py-16 bg-muted/5 rounded-2xl border border-dashed border-muted/30 animate-in fade-in duration-200">
                                            <Calendar className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
                                            <h4 className="font-semibold text-sm">Sin Periodos en este Programa de Formación</h4>
                                            <p className="text-muted-foreground text-xs mt-1 max-w-sm mx-auto">
                                                Aún no hay periodos académicos registrados para el programa &quot;{activeTl?.name || "Seleccionado"}&quot;.
                                            </p>
                                            {!isObserver && (
                                                <Button onClick={openCreatePeriod} className="mt-4 h-9 text-xs font-bold" size="sm">
                                                    <Plus className="mr-1.5 h-4 w-4" /> Agregar Periodo a este Programa
                                                </Button>
                                            )}
                                        </div>
                                    );
                                }

                                return (
                                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handlePeriodDragEnd}>
                                        <SortableContext items={filteredPeriods.map(p => p.id)} strategy={rectSortingStrategy}>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {filteredPeriods.map(period => (
                                                    <SortablePeriodCard
                                                        key={period.id}
                                                        period={period}
                                                        openEditPeriod={openEditPeriod}
                                                        triggerDelete={triggerDelete}
                                                        openCreateCourseForPeriod={openCreateCourseForPeriod}
                                                        openEditCourse={openEditCourse}
                                                        setSelectedCourseForDesc={setSelectedCourseForDesc}
                                                        setDescriptionDialogOpen={setDescriptionDialogOpen}
                                                        formatWeeklyHours={formatWeeklyHours}
                                                        BADGE_COLORS={BADGE_COLORS}
                                                        sensors={sensors}
                                                        handleDragEnd={handleDragEnd}
                                                    />
                                                ))}
                                            </div>
                                        </SortableContext>
                                    </DndContext>
                                );
                            })()}
                        </TabsContent>

                        {/* SUB-TAB: GROUPS & STUDENTS */}
                        <TabsContent value="groups" className="space-y-6 mt-0">
                            {managingGroup ? (
                                <div className="space-y-6 animate-in fade-in-50 duration-200">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-muted/20 p-5 rounded-2xl border border-muted/40 shadow-sm">
                                        <div className="space-y-1.5">
                                            <Button 
                                                variant="ghost" 
                                                onClick={() => setManagingGroup(null)}
                                                className="h-8 pl-1 text-muted-foreground hover:text-foreground text-xs"
                                            >
                                                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                                                Volver a Grupos
                                            </Button>
                                            <div className="flex items-center flex-wrap gap-3">
                                                <Users className="h-6 w-6 text-primary" />
                                                <h4 className="text-xl font-bold tracking-tight">Gestión de Grupo: {managingGroup.name}</h4>
                                            </div>
                                            <p className="text-muted-foreground text-xs max-w-2xl pl-7">
                                                {managingGroup.description || "Grupo de alumnos de este programa"}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Segmented sub-tab controller for Students vs Attendance */}
                                    <div className="space-y-4 mt-0">
                                        <div className="flex justify-between items-center">
                                            <h5 className="text-sm font-semibold text-muted-foreground">Listado de Aprendices ({managingGroup.students.length})</h5>
                                            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => openAssignStudents(managingGroup)}>
                                                <Plus className="h-3 w-3 mr-1.5" />
                                                Asociar Aprendices
                                            </Button>
                                        </div>
                                        <Card className="border-none shadow-sm bg-background">
                                            <CardContent className="p-5">
                                                {managingGroup.students.length === 0 ? (
                                                    <div className="text-center py-16 text-muted-foreground text-sm bg-muted/5 border border-dashed border-muted/50 rounded-xl">
                                                        No hay aprendices asignados en este grupo.
                                                        <br />
                                                        <Button size="sm" variant="outline" className="mt-4 text-xs" onClick={() => openAssignStudents(managingGroup)}>
                                                            <Plus className="h-3.5 w-3.5 mr-1.5" /> Asociar Aprendices
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="border border-muted/40 rounded-xl overflow-x-auto">
                                                        <Table>
                                                            <TableHeader className="bg-muted/10">
                                                                <TableRow>
                                                                    <TableHead className="py-3 text-xs font-semibold">Identificación</TableHead>
                                                                    <TableHead className="py-3 text-xs font-semibold">Nombre Completo</TableHead>
                                                                    <TableHead className="py-3 text-xs font-semibold">Correo Electrónico</TableHead>
                                                                    <TableHead className="py-3 text-xs font-semibold">Teléfono</TableHead>
                                                                    <TableHead className="py-3 text-xs font-semibold text-right">Acción</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {[...managingGroup.students].sort((a, b) => a.name.localeCompare(b.name)).map((student) => (
                                                                    <TableRow key={student.id} className="hover:bg-muted/5">
                                                                        <TableCell className="py-3 text-xs font-mono">
                                                                            {student.profile?.identificacion || "S/D"}
                                                                        </TableCell>
                                                                        <TableCell className="py-3 text-xs font-medium flex items-center gap-2">
                                                                            <span>{student.name}</span>
                                                                            <StudentNovedadBadge novedad={student.profile?.novedad} color={student.profile?.novedadColor} />
                                                                        </TableCell>
                                                                        <TableCell className="py-3 text-xs text-muted-foreground font-sans">{student.email}</TableCell>
                                                                        <TableCell className="py-3 text-xs text-muted-foreground font-sans">{student.profile?.telefono || "—"}</TableCell>
                                                                        <TableCell className="py-3 text-right">
                                                                            <div className="flex items-center justify-end gap-1.5">
                                                                                <Tooltip><TooltipTrigger asChild><Button
                                                                                    size="icon"
                                                                                    variant="ghost"
                                                                                    className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                                                                    onClick={() => triggerDelete("student", student.id, student.name)}
                                                                                >
                                                                                    <Trash2 className="h-4 w-4" />
                                                                                </Button></TooltipTrigger><TooltipContent><p>Eliminar aprendiz del sistema</p></TooltipContent></Tooltip>
                                                                            </div>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>
                            ) : (
                                /* GROUPS LIST TABLE VIEW */
                                <div className="space-y-4">
                                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-2">
                                        <h4 className="text-base font-semibold text-muted-foreground">Grupos de Aprendices de {selectedProgram.name}</h4>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        onClick={() => setIsTabsHelpOpen(true)}
                                                        className="h-8 w-8 rounded-xl border-border/80 hover:bg-muted text-foreground shadow-2xs hover:scale-105 transition-all"
                                                    >
                                                        <HelpCircle className="w-3.5 h-3.5 text-primary" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom">¿Qué puedo hacer acá? Guía de Grupos y Aprendices</TooltipContent>
                                            </Tooltip>
                                            <Button onClick={handleExportGroupsJSON} variant="outline" size="sm" className="shadow-sm border-blue-500/20 text-blue-600 hover:text-blue-700 hover:bg-blue-500/5 dark:text-blue-400">
                                                <Download className="h-4 w-4 mr-1.5" />
                                                Exportar JSON
                                            </Button>
                                            {!isObserver && (
                                                <>
                                                    <div className="relative">
                                                        <input
                                                            type="file"
                                                            accept=".json"
                                                            onChange={handleImportGroupsJSON}
                                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                        />
                                                        <Button variant="outline" size="sm" className="shadow-sm border-amber-500/20 text-amber-600 hover:text-amber-700 hover:bg-amber-500/5 dark:text-amber-400">
                                                            <Upload className="h-4 w-4 mr-1.5" />
                                                            Importar JSON
                                                        </Button>
                                                    </div>
                                                    <Button onClick={openCreateGroup} size="sm" className="shadow-sm">
                                                        <Plus className="h-4 w-4 mr-1.5" />
                                                        Agregar Grupo
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {selectedProgram.groups.length === 0 ? (
                                        <div className="text-center py-16 bg-muted/10 rounded-2xl border border-dashed border-muted/50">
                                            <Layers className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                                            <h4 className="font-semibold">Sin Grupos</h4>
                                            <p className="text-muted-foreground text-sm mt-1 max-w-xs mx-auto">
                                                Crea el primer grupo en este programa para empezar a asociar aprendices.
                                            </p>
                                            {!isObserver && (
                                                <Button onClick={openCreateGroup} className="mt-4" size="sm">
                                                    <Plus className="mr-1.5 h-4 w-4" /> Crear Grupo
                                                </Button>
                                            )}
                                        </div>
                                    ) : (
                                        (() => {
                                            const groupsLectiva = selectedProgram.groups.filter(g => (g as any).categoria === "LECTIVA" || !(g as any).categoria);
                                            const groupsProductiva = selectedProgram.groups.filter(g => (g as any).categoria === "PRODUCTIVA");
                                            const groupsEgresados = selectedProgram.groups.filter(g => (g as any).categoria === "EGRESADOS");

                                            return (
                                                <Tabs defaultValue="lectiva" className="space-y-4 w-full">
                                                    <TabsList className="flex w-fit bg-muted/40 p-1 rounded-xl">
                                                        <TabsTrigger value="lectiva" className="rounded-lg text-xs font-semibold px-4">
                                                            Etapa Lectiva ({groupsLectiva.length})
                                                        </TabsTrigger>
                                                        <TabsTrigger value="productiva" className="rounded-lg text-xs font-semibold px-4">
                                                            Etapa Productiva ({groupsProductiva.length})
                                                        </TabsTrigger>
                                                        <TabsTrigger value="egresados" className="rounded-lg text-xs font-semibold px-4">
                                                            Egresados ({groupsEgresados.length})
                                                        </TabsTrigger>
                                                    </TabsList>

                                                    <TabsContent value="lectiva" className="space-y-4 mt-0">
                                                        {renderGroupsTable(groupsLectiva)}
                                                    </TabsContent>

                                                    <TabsContent value="productiva" className="space-y-4 mt-0">
                                                        {renderGroupsTable(groupsProductiva)}
                                                    </TabsContent>

                                                    <TabsContent value="egresados" className="space-y-4 mt-0">
                                                        {renderGroupsTable(groupsEgresados)}
                                                    </TabsContent>
                                                </Tabs>
                                            );
                                        })()
                                    )}
                                </div>
                            )}
                        </TabsContent>

                        {/* SUB-TAB: TEACHERS */}
                        <TabsContent value="teachers" className="space-y-6 mt-0">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl mb-2">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 shrink-0">
                                        <Calendar className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-indigo-900 dark:text-indigo-200">Gestión por Horario / Trimestre</p>
                                        <p className="text-[11px] text-indigo-700 dark:text-indigo-300 truncate">
                                            La disponibilidad y materias habilitadas de instructores se configuran por cada trimestre en el panel de Horarios.
                                        </p>
                                    </div>
                                </div>
                                <Button 
                                    asChild 
                                    size="sm" 
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs shrink-0"
                                >
                                    <Link href="/dashboard/gestor/schedules">
                                        Ir a Panel de Horarios
                                    </Link>
                                </Button>
                            </div>

                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-2">
                                <h4 className="text-base font-semibold text-muted-foreground">Instructores de {selectedProgram.name}</h4>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => setIsTabsHelpOpen(true)}
                                                className="h-8 w-8 rounded-xl border-border/80 hover:bg-muted text-foreground shadow-2xs hover:scale-105 transition-all"
                                            >
                                                <HelpCircle className="w-3.5 h-3.5 text-primary" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom">¿Qué puedo hacer acá? Guía de Instructores</TooltipContent>
                                    </Tooltip>
                                    <Button onClick={handleExportTeachersJSON} variant="outline" size="sm" className="shadow-sm border-blue-500/20 text-blue-600 hover:text-blue-700 hover:bg-blue-500/5 dark:text-blue-400">
                                        <Download className="h-4 w-4 mr-1.5" />
                                        Exportar JSON
                                    </Button>
                                    {!isObserver && (
                                        <>
                                            <div className="relative">
                                                <input
                                                    type="file"
                                                    accept=".json"
                                                    onChange={handleImportTeachersJSON}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                />
                                                <Button variant="outline" size="sm" className="shadow-sm border-amber-500/20 text-amber-600 hover:text-amber-700 hover:bg-amber-500/5 dark:text-amber-400">
                                                    <Upload className="h-4 w-4 mr-1.5" />
                                                    Importar JSON
                                                </Button>
                                            </div>
                                            <Button onClick={() => setAssignTeachersDialogOpen(true)} size="sm" className="shadow-sm">
                                                <Plus className="h-4 w-4 mr-1.5" />
                                                Registrar Instructor
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {(!selectedProgram.teachers || selectedProgram.teachers.length === 0) ? (
                                <div className="text-center py-16 bg-muted/10 rounded-2xl border border-dashed border-muted/50">
                                    <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                                    <h4 className="font-semibold">Sin Instructores</h4>
                                    <p className="text-muted-foreground text-sm mt-1 max-w-xs mx-auto">
                                        Registra instructores en este programa de formación para que puedan ser asignados a impartir materias.
                                    </p>
                                    {!isObserver && (
                                        <Button onClick={() => setAssignTeachersDialogOpen(true)} className="mt-4" size="sm">
                                            <Plus className="mr-1.5 h-4 w-4" /> Registrar Instructor
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <>
                                    {!isObserver && selectedTeacherIds.length > 0 && (
                                        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-primary/5 border border-primary/10 rounded-xl mb-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                            <div className="flex items-center gap-2">
                                                <Checkbox 
                                                    checked={selectedTeacherIds.length === selectedProgram.teachers.length}
                                                    onCheckedChange={(checked) => {
                                                        if (checked) {
                                                            setSelectedTeacherIds(selectedProgram.teachers.map(t => t.id));
                                                        } else {
                                                            setSelectedTeacherIds([]);
                                                        }
                                                    }}
                                                    className="border-primary/30 data-[state=checked]:bg-primary"
                                                />
                                                <span className="text-xs font-black text-primary">
                                                    {selectedTeacherIds.length} seleccionado{selectedTeacherIds.length === 1 ? "" : "s"}
                                                </span>
                                            </div>
                                            <div className="flex items-center flex-wrap gap-1.5 ml-auto">
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="h-7 text-[10px] font-bold border-emerald-500/20 text-emerald-700 bg-emerald-50 hover:bg-emerald-500 hover:text-white cursor-pointer"
                                                    onClick={() => handleBulkAvailabilityLock(true)}
                                                    disabled={isPending}
                                                >
                                                    <LockIcon className="w-3 h-3 mr-1" /> Aprobar Disp.
                                                </Button>
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="h-7 text-[10px] font-bold border-emerald-500/20 text-emerald-700 bg-emerald-50 hover:bg-emerald-500 hover:text-white cursor-pointer"
                                                    onClick={() => handleBulkQualificationsLock(true)}
                                                    disabled={isPending}
                                                >
                                                    <LockIcon className="w-3 h-3 mr-1" /> Aprobar Mat.
                                                </Button>
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="h-7 text-[10px] font-bold border-amber-500/20 text-amber-700 bg-amber-50 hover:bg-amber-500 hover:text-white cursor-pointer"
                                                    onClick={() => handleBulkAvailabilityLock(false)}
                                                    disabled={isPending}
                                                >
                                                    <Clock className="w-3 h-3 mr-1" /> Desbloquear Disp.
                                                </Button>
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="h-7 text-[10px] font-bold border-amber-500/20 text-amber-700 bg-amber-50 hover:bg-amber-500 hover:text-white cursor-pointer"
                                                    onClick={() => handleBulkQualificationsLock(false)}
                                                    disabled={isPending}
                                                >
                                                    <BookOpen className="w-3 h-3 mr-1" /> Desbloquear Mat.
                                                </Button>
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="h-7 text-[10px] font-bold border-destructive/20 text-destructive bg-destructive/5 hover:bg-destructive hover:text-white cursor-pointer"
                                                    onClick={() => setBulkDeleteConfirmationOpen(true)}
                                                    disabled={isPending}
                                                >
                                                    <Trash2 className="w-3 h-3 mr-1" /> Eliminar
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 text-[10px] font-bold cursor-pointer"
                                                    onClick={() => setSelectedTeacherIds([])}
                                                >
                                                    Cancelar
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                    <Card className="border-none shadow-sm bg-background overflow-hidden">
                                        <CardContent className="p-0">
                                            <div className="w-full overflow-x-auto">
                                                <Table>
                                                <TableHeader className="bg-muted/10">
                                                    <TableRow>
                                                        {!isObserver && (
                                                            <TableHead className="w-[45px] py-3 text-center">
                                                                <Checkbox 
                                                                    checked={selectedTeacherIds.length === selectedProgram.teachers.length && selectedProgram.teachers.length > 0}
                                                                    onCheckedChange={(checked) => {
                                                                        if (checked) {
                                                                            setSelectedTeacherIds(selectedProgram.teachers.map(t => t.id));
                                                                        } else {
                                                                            setSelectedTeacherIds([]);
                                                                        }
                                                                    }}
                                                                />
                                                            </TableHead>
                                                        )}
                                                        <TableHead className="py-3 text-xs font-semibold">Identificación</TableHead>
                                                        <TableHead className="py-3 text-xs font-semibold">Nombre Completo</TableHead>
                                                        <TableHead className="py-3 text-xs font-semibold">Correo Electrónico</TableHead>
                                                        <TableHead className="py-3 text-xs font-semibold">Teléfono</TableHead>
                                                        <TableHead className="py-3 text-xs font-semibold text-right">Acciones</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {[...selectedProgram.teachers].sort((a, b) => (a.name || "").localeCompare(b.name || "")).map(teacher => {
                                                        const isTeacherSelected = selectedTeacherIds.includes(teacher.id);
                                                        return (
                                                            <TableRow key={teacher.id} className={cn("hover:bg-muted/5 group", isTeacherSelected && "bg-primary/5 hover:bg-primary/5")}>
                                                                {!isObserver && (
                                                                    <TableCell className="py-3 text-center">
                                                                        <Checkbox 
                                                                            checked={isTeacherSelected}
                                                                            onCheckedChange={(checked) => {
                                                                                if (checked) {
                                                                                    setSelectedTeacherIds(prev => [...prev, teacher.id]);
                                                                                } else {
                                                                                    setSelectedTeacherIds(prev => prev.filter(id => id !== teacher.id));
                                                                                }
                                                                            }}
                                                                        />
                                                                    </TableCell>
                                                                )}
                                                                <TableCell className="py-3 text-xs font-medium text-foreground">
                                                                    {teacher.profile?.identificacion || "—"}
                                                                </TableCell>
                                                                <TableCell className="py-3 text-xs font-bold text-foreground">
                                                                    {teacher.name || "Sin nombre"}
                                                                </TableCell>
                                                                <TableCell className="py-3 text-xs text-muted-foreground font-sans">
                                                                    {teacher.email}
                                                                </TableCell>
                                                                <TableCell className="py-3 text-xs text-muted-foreground font-sans">
                                                                    {teacher.profile?.telefono || "—"}
                                                                </TableCell>
                                                                <TableCell className="py-3 text-right">
                                                                    <div className="flex justify-end items-center gap-1.5 ml-auto opacity-80 group-hover:opacity-100 transition-opacity">
                                                                        {!isObserver && (
                                                                            <Tooltip><TooltipTrigger asChild><Button
                                                                                size="icon"
                                                                                variant="ghost"
                                                                                className="h-7 w-7 text-muted-foreground hover:bg-muted/10"
                                                                                onClick={() => handleOpenEditTeacher(teacher)}
                                                                            >
                                                                                <Edit className="h-3.5 w-3.5" />
                                                                            </Button></TooltipTrigger><TooltipContent><p>Editar Información</p></TooltipContent></Tooltip>
                                                                        )}
                                                                        {!isObserver && (
                                                                            <Tooltip><TooltipTrigger asChild><Button 
                                                                                size="icon" 
                                                                                variant="ghost" 
                                                                                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                                                                onClick={() => triggerDelete("teacher", teacher.id, teacher.name || "Instructor")}
                                                                            >
                                                                                <Trash2 className="h-3.5 w-3.5" />
                                                                            </Button></TooltipTrigger><TooltipContent><p>Desvincular Instructor</p></TooltipContent></Tooltip>
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </CardContent>
                                </Card>
                                </>
                            )}
                        </TabsContent>

                        {/* SUB-TAB: ENVIRONMENTS */}
                        <TabsContent value="environments" className="space-y-6 mt-0">
                            <EnvironmentManagement
                                initialEnvironments={selectedProgram.environments || []}
                                programId={selectedProgram.id}
                                onActionComplete={refreshAll}
                                isObserver={isObserver}
                                onHelpClick={() => setIsTabsHelpOpen(true)}
                            />
                        </TabsContent>
                    </Tabs>
                </div>
            )}

            {/* ============ DIALOG: PROGRAM CRUD ============ */}
            <Dialog open={programDialogOpen} onOpenChange={setProgramDialogOpen}>
                <DialogContent className="max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle>{programToEdit ? "Editar Área de Formación" : "Crear Área de Formación"}</DialogTitle>
                        <DialogDescription>Completa la información del área de formación para tu institución.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-3">
                        <div className="space-y-2">
                            <Label htmlFor="progName">Nombre del Área de Formación</Label>
                            <Input
                                id="progName"
                                placeholder="Ej: Sistemas e Informática, Telecomunicaciones, Gestión..."
                                value={programName}
                                onChange={(e) => setProgramName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="progDesc">Descripción</Label>
                            <Textarea
                                id="progDesc"
                                placeholder="Detalles o descripción breve del área formativa..."
                                value={programDescription}
                                onChange={(e) => setProgramDescription(e.target.value)}
                                className="h-24 min-h-[60px] max-h-[140px] overflow-y-auto resize-y text-xs leading-relaxed [field-sizing:fixed]"
                                rows={3}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-foreground">Gestores Académicos Asignados</Label>
                            {allGestores.length === 0 ? (
                                <p className="text-xs text-muted-foreground italic">No hay gestores académicos registrados en el sistema.</p>
                            ) : (
                                <div className="space-y-2 max-h-[160px] overflow-y-auto p-3 rounded-2xl border border-border/80 bg-muted/10 divide-y divide-border/50">
                                    {allGestores.map((gestor) => {
                                        const isSelected = programGestorIds.includes(gestor.id);
                                        return (
                                            <div key={gestor.id} className="flex items-center justify-between pt-1.5 first:pt-0">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-foreground">{gestor.name}</span>
                                                    <span className="text-[11px] text-muted-foreground">{gestor.email}</span>
                                                </div>
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={(checked) => {
                                                        if (checked) {
                                                            setProgramGestorIds(prev => [...prev, gestor.id]);
                                                        } else {
                                                            setProgramGestorIds(prev => prev.filter(id => id !== gestor.id));
                                                        }
                                                    }}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>


                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setProgramDialogOpen(false)} disabled={isPending}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSaveProgram} disabled={isPending}>
                            {programToEdit ? "Actualizar" : "Crear"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ============ DIALOG: TIMELINE CRUD ============ */}
            <Dialog open={timelineDialogOpen} onOpenChange={setTimelineDialogOpen}>
                <DialogContent className="max-w-[480px] rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Layers className="w-5 h-5 text-primary" />
                            <span>{timelineToEdit ? "Editar Programa de Formación" : "Crear Nuevo Programa de Formación"}</span>
                        </DialogTitle>
                        <DialogDescription>
                            Define una denominación descriptiva para este programa de formación (Ej: &quot;{selectedProgram?.name} - Jornada Diurna&quot;).
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-3">
                        <div className="space-y-2">
                            <Label htmlFor="tlName">Denominación Descriptiva del Programa de Formación</Label>
                            <Input
                                id="tlName"
                                placeholder="Ej: Técnico en Software - Jornada Diurna"
                                value={timelineName}
                                onChange={(e) => setTimelineName(e.target.value)}
                                className="text-xs font-semibold"
                            />
                            <p className="text-[11px] text-muted-foreground">
                                Esta denominación se mostrará claramente en los paneles del instructor y del aprendiz.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tlDesc">Descripción / Enfoque (Opcional)</Label>
                            <Textarea
                                id="tlDesc"
                                placeholder="Notas sobre la modalidad, jornada o variaciones curriculares..."
                                value={timelineDescription}
                                onChange={(e) => setTimelineDescription(e.target.value)}
                                className="h-20 min-h-[50px] max-h-[120px] overflow-y-auto resize-y text-xs leading-relaxed"
                                rows={2}
                            />
                        </div>
                        <div className="flex items-center space-x-2 pt-2">
                            <Checkbox
                                id="tlDefault"
                                checked={timelineIsDefault}
                                onCheckedChange={(checked) => setTimelineIsDefault(checked === true)}
                            />
                            <Label htmlFor="tlDefault" className="text-xs font-semibold cursor-pointer select-none">
                                Establecer como programa principal por defecto de esta área
                            </Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setTimelineDialogOpen(false)} disabled={isPending}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSaveTimeline} disabled={isPending} className="font-bold">
                            {timelineToEdit ? "Actualizar Programa" : "Crear Programa"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ============ DIALOG: DUPLICATE TIMELINE ============ */}
            <Dialog open={duplicateTimelineDialogOpen} onOpenChange={setDuplicateTimelineDialogOpen}>
                <DialogContent className="max-w-[480px] rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Copy className="w-5 h-5 text-primary" />
                            <span>Duplicar Programa de Formación</span>
                        </DialogTitle>
                        <DialogDescription>
                            Se clonarán automáticamente todos los periodos y materias plantilla de &quot;{timelineToDuplicate?.name}&quot; hacia el nuevo programa.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-3">
                        <div className="space-y-2">
                            <Label htmlFor="dupTlName">Denominación para el nuevo Programa</Label>
                            <Input
                                id="dupTlName"
                                placeholder="Ej: Técnico en Software - Fin de Semana"
                                value={duplicateTimelineName}
                                onChange={(e) => setDuplicateTimelineName(e.target.value)}
                                className="text-xs font-semibold"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDuplicateTimelineDialogOpen(false)} disabled={isPending}>
                            Cancelar
                        </Button>
                        <Button onClick={handleConfirmDuplicateTimeline} disabled={isPending} className="font-bold">
                            Duplicar Programa Completo
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ============ DIALOG: TIMELINE DELETE CONFIRMATION ============ */}
            {(() => {
                const timelinePeriods = timelineToDelete && selectedProgram
                    ? (selectedProgram.periods || []).filter((p: any) => p.timelineId === timelineToDelete.id)
                    : [];
                const periodsCount = timelinePeriods.length;
                const coursesCount = timelinePeriods.reduce(
                    (acc: number, p: any) => acc + (p.courses?.filter((c: any) => !c.groupId)?.length ?? 0),
                    0
                );

                return (
                    <AlertDialog 
                        open={Boolean(timelineToDelete)} 
                        onOpenChange={(open) => {
                            if (!open && !isPending) setTimelineToDelete(null);
                        }}
                    >
                        <AlertDialogContent className="max-w-md rounded-3xl p-6 border-border/80 bg-background shadow-2xl">
                            <AlertDialogHeader className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-center shrink-0 shadow-inner">
                                        <AlertTriangle className="w-6 h-6 animate-pulse" />
                                    </div>
                                    <div>
                                        <AlertDialogTitle className="text-xl font-bold text-foreground">
                                            Eliminar Programa de Formación
                                        </AlertDialogTitle>
                                        <p className="text-xs text-muted-foreground font-medium mt-0.5">
                                            Esta acción no se puede deshacer.
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-2">
                                    {/* Timeline Banner */}
                                    <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-between">
                                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                            <Layers className="w-5 h-5 text-primary shrink-0" />
                                            <span className="font-bold text-foreground text-sm truncate">
                                                {timelineToDelete?.name}
                                            </span>
                                        </div>
                                        <Badge variant="destructive" className="rounded-xl text-[10px] font-bold uppercase tracking-wider shrink-0">
                                            Eliminación
                                        </Badge>
                                    </div>

                                    {/* Data Impact Summary if periods/courses exist */}
                                    {(periodsCount > 0 || coursesCount > 0) && (
                                        <div className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/30 space-y-2">
                                            <div className="flex items-center gap-2 text-xs font-bold text-destructive">
                                                <AlertCircle className="w-4 h-4 shrink-0" />
                                                <span>Elementos que se eliminarán en cascada:</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-xs pt-0.5">
                                                <div className="p-2.5 rounded-xl bg-background/90 border border-destructive/20 text-center shadow-2xs">
                                                    <span className="text-sm font-black text-foreground block">{periodsCount}</span>
                                                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">Periodos</span>
                                                </div>
                                                <div className="p-2.5 rounded-xl bg-background/90 border border-destructive/20 text-center shadow-2xs">
                                                    <span className="text-sm font-black text-foreground block">{coursesCount}</span>
                                                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">Materias Plantilla</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
                                        ¿Estás seguro de eliminar el programa de formación <strong className="text-foreground font-bold">&quot;{timelineToDelete?.name}&quot;</strong>? Se eliminarán permanentemente todos los periodos y materias plantilla asociados a este programa.
                                    </AlertDialogDescription>
                                </div>
                            </AlertDialogHeader>

                            <AlertDialogFooter className="mt-5 pt-3 border-t border-border/60 flex items-center justify-end gap-2">
                                <AlertDialogCancel 
                                    disabled={isPending}
                                    onClick={() => setTimelineToDelete(null)}
                                    className="rounded-xl text-xs font-bold h-10 px-4"
                                >
                                    Cancelar
                                </AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={(e) => {
                                        e.preventDefault();
                                        confirmDeleteTimeline();
                                    }}
                                    disabled={isPending}
                                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl text-xs font-bold h-10 px-5 shadow-md shadow-destructive/20 cursor-pointer disabled:opacity-50"
                                >
                                    {isPending ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                                            Eliminando...
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                                            Eliminar Programa
                                        </>
                                    )}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                );
            })()}

            {/* ============ DIALOG: PERIOD CRUD ============ */}
            <Dialog open={periodDialogOpen} onOpenChange={setPeriodDialogOpen}>
                <DialogContent className="max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle>{periodToEdit ? "Editar Periodo Académico" : "Agregar Periodo Académico"}</DialogTitle>
                        <DialogDescription>Define un periodo académico bajo el programa seleccionado de {selectedProgram?.name}.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-3">
                        <div className="space-y-2">
                            <Label htmlFor="perTimeline">Programa de Formación</Label>
                            <select
                                id="perTimeline"
                                value={periodTimelineId}
                                onChange={(e) => setPeriodTimelineId(e.target.value)}
                                className="w-full h-9 rounded-xl border border-input bg-background px-3 py-1 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                                {(selectedProgram?.timelines || []).map((tl: any) => (
                                    <option key={tl.id} value={tl.id}>
                                        {tl.name} {tl.isDefault ? "(Principal)" : ""}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="perName">Nombre del Periodo</Label>
                            <Input
                                id="perName"
                                placeholder="Ej: Semestre I, Trimestre II..."
                                value={periodName}
                                onChange={(e) => setPeriodName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="perDesc">Descripción</Label>
                            <Textarea
                                id="perDesc"
                                placeholder="Notas opcionales del periodo..."
                                value={periodDescription}
                                onChange={(e) => setPeriodDescription(e.target.value)}
                                className="h-20 min-h-[50px] max-h-[120px] overflow-y-auto resize-y text-xs leading-relaxed [field-sizing:fixed]"
                                rows={2}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setPeriodDialogOpen(false)} disabled={isPending}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSavePeriod} disabled={isPending}>
                            {periodToEdit ? "Actualizar" : "Agregar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ============ DIALOG: GROUP CRUD ============ */}
            <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
                <DialogContent className="max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle>{groupToEdit ? "Editar Grupo Académico" : "Crear Grupo Académico"}</DialogTitle>
                        <DialogDescription>Define un grupo de aprendices (Ej: Ficha 25567, Grupo A) bajo {selectedProgram?.name}.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-3">
                        <div className="space-y-2">
                            <Label htmlFor="grpName">Nombre/Código del Grupo</Label>
                            <Input
                                id="grpName"
                                placeholder="Ej: Grupo A, Ficha 2529..."
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="grpCategory">Categoría del Grupo</Label>
                            <Select value={groupCategoria} onValueChange={setGroupCategoria}>
                                <SelectTrigger id="grpCategory">
                                    <SelectValue placeholder="Selecciona la categoría" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="LECTIVA">Etapa Lectiva</SelectItem>
                                    <SelectItem value="PRODUCTIVA">Etapa Productiva</SelectItem>
                                    <SelectItem value="EGRESADOS">Egresados</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="grpDesc">Descripción</Label>
                            <Textarea
                                id="grpDesc"
                                placeholder="Detalles de este grupo..."
                                value={groupDescription}
                                onChange={(e) => setGroupDescription(e.target.value)}
                                className="h-20 min-h-[50px] max-h-[120px] overflow-y-auto resize-y text-xs leading-relaxed [field-sizing:fixed]"
                                rows={2}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setGroupDialogOpen(false)} disabled={isPending}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSaveGroup} disabled={isPending}>
                            {groupToEdit ? "Actualizar" : "Crear"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ============ DIALOG: ASSOCIATE STUDENTS TO GROUP ============ */}
            <Dialog open={assignStudentsDialogOpen} onOpenChange={setAssignStudentsDialogOpen}>
                <DialogContent className="max-w-[550px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Asociar Aprendices al Grupo {selectedGroupForStudents?.name}</DialogTitle>
                        <DialogDescription>Registra aprendices manualmente o impórtalos desde un archivo de Excel.</DialogDescription>
                    </DialogHeader>
                    
                    <Tabs defaultValue="manual" className="w-full mt-2">
                        <TabsList className="grid w-full grid-cols-2 bg-muted/40 p-1 rounded-xl mb-4">
                            <TabsTrigger value="manual" className="rounded-lg text-xs">Registro Manual</TabsTrigger>
                            <TabsTrigger value="excel" className="rounded-lg text-xs">Importar Excel</TabsTrigger>
                        </TabsList>

                        {/* TAB: MANUAL REGISTRATION */}
                        <TabsContent value="manual" className="space-y-4 mt-0">
                            <div className="space-y-3 border border-muted/40 p-4 rounded-xl bg-muted/5">
                                <span className="text-xs font-semibold text-muted-foreground uppercase">Formulario de Registro</span>
                                
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1 col-span-2">
                                        <Label htmlFor="mNumDoc" className="text-xs">Identificación *</Label>
                                        <Input
                                            id="mNumDoc"
                                            placeholder="Ej: 10245678 (Este número será la contraseña inicial)"
                                            className="h-9 text-xs"
                                            value={manualIdentificacion}
                                            onChange={(e) => setManualIdentificacion(e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <Label htmlFor="mNombres" className="text-xs">Nombres *</Label>
                                        <Input
                                            id="mNombres"
                                            placeholder="Ej: Juan Carlos"
                                            className="h-9 text-xs"
                                            value={manualNombres}
                                            onChange={(e) => setManualNombres(e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <Label htmlFor="mApellidos" className="text-xs">Apellidos *</Label>
                                        <Input
                                            id="mApellidos"
                                            placeholder="Ej: Pérez Gómez"
                                            className="h-9 text-xs"
                                            value={manualApellido}
                                            onChange={(e) => setManualApellido(e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-1 col-span-2">
                                        <Label htmlFor="mEmail" className="text-xs">Email *</Label>
                                        <Input
                                            id="mEmail"
                                            type="email"
                                            placeholder="Ej: juan.perez@correo.com"
                                            className="h-9 text-xs"
                                            value={manualEmail}
                                            onChange={(e) => setManualEmail(e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-1 col-span-2">
                                        <Label htmlFor="mTel" className="text-xs">Teléfono (opcional)</Label>
                                        <Input
                                            id="mTel"
                                            placeholder="Ej: 3123456789"
                                            className="h-9 text-xs"
                                            value={manualTelefono}
                                            onChange={(e) => setManualTelefono(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <Button 
                                    onClick={handleRegisterStudentManual} 
                                    className="w-full mt-2 h-9 text-xs"
                                    disabled={isPending}
                                >
                                    {isPending ? "Registrando..." : "Registrar y Asociar"}
                                </Button>
                            </div>
                        </TabsContent>

                        {/* TAB: EXCEL IMPORT */}
                        <TabsContent value="excel" className="space-y-4 mt-0">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-muted-foreground uppercase">Importación Masiva</span>
                                    <Button 
                                        type="button"
                                        variant="outline" 
                                        size="sm" 
                                        onClick={handleDownloadTemplate} 
                                        className="h-8 text-[11px] gap-1 px-3 border-emerald-500/30 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/5 dark:text-emerald-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-500/10"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        Descargar Plantilla
                                    </Button>
                                </div>

                                <div className="border border-dashed border-muted/50 rounded-xl p-4 bg-muted/5 text-center relative hover:bg-muted/10 transition-colors duration-150">
                                    <input 
                                        type="file" 
                                        accept=".xlsx, .xls" 
                                        onChange={handleExcelFileChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        disabled={isPending}
                                    />
                                    <div className="py-2">
                                        <p className="text-xs font-semibold text-foreground/80">
                                            {excelFileName ? `Archivo: ${excelFileName}` : "Haz clic o arrastra un archivo de Excel aquí"}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground mt-1">Soporta .xlsx y .xls</p>
                                    </div>
                                </div>

                                <div className="bg-muted/10 p-3 rounded-lg text-[10px] text-muted-foreground space-y-1">
                                    <p className="font-semibold text-foreground/70">Columnas requeridas en la primera hoja:</p>
                                    <p>• <span className="font-semibold">Identificación</span> (identificación única y contraseña inicial)</p>
                                    <p>• <span className="font-semibold">Nombres</span></p>
                                    <p>• <span className="font-semibold">Apellidos</span></p>
                                    <p>• <span className="font-semibold">Email</span> (correo electrónico único y obligatorio)</p>
                                    <p className="mt-1 font-semibold text-foreground/70">Columnas opcionales:</p>
                                    <p>• <span className="font-semibold">Teléfono</span></p>
                                </div>

                                {excelStudents.length > 0 && (
                                    <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 flex justify-between items-center">
                                        <span className="text-xs font-medium text-primary">Se leyeron {excelStudents.length} aprendices listos para importar.</span>
                                        <Button 
                                            size="sm" 
                                            onClick={handleImportExcel} 
                                            disabled={isPending}
                                            className="h-8 text-xs shrink-0"
                                        >
                                            {isPending ? "Importando..." : "Importar Ahora"}
                                        </Button>
                                    </div>
                                )}

                                {importResult && (
                                    <div className="border border-muted/30 rounded-xl p-3 bg-muted/5 space-y-2 text-xs">
                                        <p className="font-bold text-foreground/90 uppercase tracking-wider text-[10px]">Resultado de la Importación:</p>
                                        <div className="grid grid-cols-2 gap-2 text-center text-xs">
                                            <div className="bg-green-500/10 border border-green-500/20 p-2 rounded text--600 dark:text--400">
                                                <span className="block font-bold text-lg">{importResult.successCount}</span>
                                                Registrados con éxito
                                            </div>
                                            <div className="bg-yellow-500/10 border border-yellow-500/20 p-2 rounded text--600 dark:text--400">
                                                <span className="block font-bold text-lg">{importResult.skippedCount}</span>
                                                Omitidos/Duplicados
                                            </div>
                                        </div>
                                        {importResult.errors && importResult.errors.length > 0 && (
                                            <div className="mt-2">
                                                <p className="font-semibold text-destructive mb-1 text-[11px]">Detalle de omisiones/errores:</p>
                                                <ul className="max-h-[100px] overflow-y-auto space-y-1 list-disc pl-4 text-muted-foreground text-[10px]">
                                                    {importResult.errors.map((err, idx) => (
                                                        <li key={idx}>{err}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>

                    <DialogFooter className="mt-4 pt-2 border-t border-muted/20">
                        <Button onClick={() => setAssignStudentsDialogOpen(false)}>Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ============ DIALOG: REGISTER TEACHER TO PROGRAM ============ */}
            <Dialog open={assignTeachersDialogOpen} onOpenChange={setAssignTeachersDialogOpen}>
                <DialogContent className="max-w-[550px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Registrar Instructor en {selectedProgram?.name}</DialogTitle>
                        <DialogDescription>Crea un instructor manualmente o impórtalo desde Excel. Quedará automáticamente asociado a este programa.</DialogDescription>
                    </DialogHeader>
                    
                    <Tabs defaultValue="manual" className="w-full mt-2">
                        <TabsList className="grid w-full grid-cols-2 bg-muted/40 p-1 rounded-xl mb-4">
                            <TabsTrigger value="manual" className="rounded-lg text-xs">Registro Manual</TabsTrigger>
                            <TabsTrigger value="excel" className="rounded-lg text-xs">Importar Excel</TabsTrigger>
                        </TabsList>

                        {/* TAB: MANUAL TEACHER REGISTRATION */}
                        <TabsContent value="manual" className="space-y-4 mt-0">
                            <div className="space-y-3 border border-muted/40 p-4 rounded-xl bg-muted/5">
                                <span className="text-xs font-semibold text-muted-foreground uppercase">Formulario de Registro</span>
                                
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1 col-span-2">
                                        <Label htmlFor="mtNumDoc" className="text-xs">Número de Documento *</Label>
                                        <Input
                                            id="mtNumDoc"
                                            placeholder="Ej: 10245678 (Contraseña inicial)"
                                            className="h-9 text-xs"
                                            value={manualTeacherIdentificacion}
                                            onChange={(e) => setManualTeacherIdentificacion(e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <Label htmlFor="mtNombres" className="text-xs">Nombres *</Label>
                                        <Input
                                            id="mtNombres"
                                            placeholder="Ej: Ana María"
                                            className="h-9 text-xs"
                                            value={manualTeacherNombres}
                                            onChange={(e) => setManualTeacherNombres(e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <Label htmlFor="mtApellidos" className="text-xs">Apellidos *</Label>
                                        <Input
                                            id="mtApellidos"
                                            placeholder="Ej: López Soto"
                                            className="h-9 text-xs"
                                            value={manualTeacherApellido}
                                            onChange={(e) => setManualTeacherApellido(e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-1 col-span-2">
                                        <Label htmlFor="mtEmail" className="text-xs">Correo Electrónico *</Label>
                                        <Input
                                            id="mtEmail"
                                            type="email"
                                            placeholder="Ej: ana.lopez@correo.com"
                                            className="h-9 text-xs"
                                            value={manualTeacherEmail}
                                            onChange={(e) => setManualTeacherEmail(e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-1 col-span-2">
                                        <Label htmlFor="mtTel" className="text-xs">Teléfono / Celular</Label>
                                        <Input
                                            id="mtTel"
                                            placeholder="Ej: 3001234567"
                                            className="h-9 text-xs"
                                            value={manualTeacherTelefono}
                                            onChange={(e) => setManualTeacherTelefono(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <Button 
                                    onClick={handleRegisterTeacherManual} 
                                    className="w-full mt-2 h-9 text-xs"
                                    disabled={isPending || isRegisteringTeacher}
                                >
                                    {isRegisteringTeacher ? "Registrando..." : "Registrar Instructor"}
                                </Button>
                            </div>
                        </TabsContent>

                        {/* TAB: EXCEL TEACHER IMPORT */}
                        <TabsContent value="excel" className="space-y-4 mt-0">
                            <div className="space-y-3">
                                <div className="border border-dashed border-muted/50 rounded-xl p-4 bg-muted/5 text-center relative hover:bg-muted/10 transition-colors duration-150">
                                    <input 
                                        type="file" 
                                        accept=".xlsx, .xls" 
                                        onChange={handleTeacherExcelFileChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        disabled={isPending}
                                    />
                                    <div className="py-2">
                                        <p className="text-xs font-semibold text-foreground/80">
                                            {excelTeacherFileName ? `Archivo: ${excelTeacherFileName}` : "Haz clic o arrastra un archivo de Excel aquí"}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground mt-1">Soporta .xlsx y .xls</p>
                                    </div>
                                </div>

                                <div className="bg-muted/10 p-3 rounded-lg text-[10px] text-muted-foreground space-y-1">
                                    <p className="font-semibold text-foreground/70">Columnas requeridas en la primera hoja:</p>
                                    <p>• <span className="font-semibold">Identificacion</span> (contraseña inicial)</p>
                                    <p>• <span className="font-semibold">Email</span> (correo único)</p>
                                    <p>• <span className="font-semibold">Nombre</span>, <span className="font-semibold">Apellidos</span></p>
                                    <p className="mt-1 font-semibold text-foreground/70">Columnas opcionales:</p>
                                    <p>• <span className="font-semibold">Teléfono</span></p>
                                </div>

                                {excelTeachers.length > 0 && (
                                    <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 flex justify-between items-center">
                                        <span className="text-xs font-medium text-primary">Se leyeron {excelTeachers.length} instructores listos para importar.</span>
                                        <Button 
                                            size="sm" 
                                            onClick={handleImportTeacherExcel} 
                                            disabled={isPending}
                                            className="h-8 text-xs shrink-0"
                                        >
                                            {isPending ? "Importando..." : "Importar Ahora"}
                                        </Button>
                                    </div>
                                )}

                                {importTeacherResult && (
                                    <div className="border border-muted/30 rounded-xl p-3 bg-muted/5 space-y-2 text-xs">
                                        <p className="font-bold text-foreground/90 uppercase tracking-wider text-[10px]">Resultado de la Importación:</p>
                                        <div className="grid grid-cols-2 gap-2 text-center text-xs">
                                            <div className="bg-green-500/10 border border-green-500/20 p-2 rounded text-green-600 dark:text-green-400">
                                                <span className="block font-bold text-lg">{importTeacherResult.successCount}</span>
                                                Registrados con éxito
                                            </div>
                                            <div className="bg-yellow-500/10 border border-yellow-500/20 p-2 rounded text-yellow-600 dark:text-yellow-400">
                                                <span className="block font-bold text-lg">{importTeacherResult.skippedCount}</span>
                                                Omitidos/Duplicados
                                            </div>
                                        </div>
                                        {importTeacherResult.errors && importTeacherResult.errors.length > 0 && (
                                            <div className="mt-2">
                                                <p className="font-semibold text-destructive mb-1 text-[11px]">Detalle de omisiones/errores:</p>
                                                <ul className="max-h-[100px] overflow-y-auto space-y-1 list-disc pl-4 text-muted-foreground text-[10px]">
                                                    {importTeacherResult.errors.map((err, idx) => (
                                                        <li key={idx}>{err}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>

                    <DialogFooter className="mt-4 pt-2 border-t border-muted/20">
                        <Button onClick={() => setAssignTeachersDialogOpen(false)}>Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ============ DIALOG: EDIT TEACHER ============ */}
            <Dialog open={editTeacherDialogOpen} onOpenChange={setEditTeacherDialogOpen}>
                <DialogContent className="max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle>Editar Instructor</DialogTitle>
                        <DialogDescription>Actualiza la información del instructor seleccionado.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-3">
                        <div className="space-y-2">
                            <Label htmlFor="edTDoc">Número de Documento *</Label>
                            <Input id="edTDoc" value={editTeacherDoc} onChange={(e) => setEditTeacherDoc(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edTName">Nombres *</Label>
                            <Input id="edTName" value={editTeacherNames} onChange={(e) => setEditTeacherNames(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edTLast">Apellidos *</Label>
                            <Input id="edTLast" value={editTeacherLastName} onChange={(e) => setEditTeacherLastName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edTEmail">Correo Electrónico *</Label>
                            <Input id="edTEmail" type="email" value={editTeacherEmail} onChange={(e) => setEditTeacherEmail(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edTTel">Teléfono</Label>
                            <Input id="edTTel" value={editTeacherPhone} onChange={(e) => setEditTeacherPhone(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setEditTeacherDialogOpen(false)} disabled={isPending}>Cancelar</Button>
                        <Button onClick={handleEditTeacherSave} disabled={isPending}>Guardar Cambios</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ============ DIALOG: TEACHER QUALIFICATIONS (MATERIAS) ============ */}
            <Dialog open={qualDialogOpen} onOpenChange={setQualDialogOpen}>
                <DialogContent showCloseButton={false} className="max-w-[100vw] sm:max-w-[100vw] w-screen h-[100dvh] max-h-[100dvh] rounded-none m-0 border-0 flex flex-col p-4 sm:p-6">
                    <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b">
                        <div>
                            <DialogTitle>
                                {qualTeacher ? `Materias de ${qualTeacher.name}` : "Cargando..."}
                            </DialogTitle>
                            <DialogDescription>
                                Selecciona las materias que este instructor está calificado para impartir.
                            </DialogDescription>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setQualDialogOpen(false)}
                            className="h-8 px-3 rounded-lg border-border/80 hover:bg-muted text-foreground font-bold text-xs gap-1.5 shadow-2xs shrink-0 cursor-pointer"
                        >
                            <X className="w-3.5 h-3.5" />
                            <span>Cerrar</span>
                        </Button>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto p-4 max-h-[70vh]">
                        {qualTeacher && (
                            <TeacherQualificationsView 
                                teacherId={qualTeacher.id} 
                                isAdminMode={true} 
                                programId={selectedProgram?.id || initialProgramId || undefined}
                                onAdminActionComplete={refreshAll} 
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>



            {/* ============ DIALOG: COURSE CRUD ============ */}
            <Dialog open={courseDialogOpen} onOpenChange={setCourseDialogOpen}>
                <DialogContent className="max-w-[550px] max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{courseToEdit ? "Editar Materia Académica" : "Crear Nueva Materia Académica"}</DialogTitle>
                        <DialogDescription>Registra una materia e inicializa su planificación.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-3">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2 col-span-2">
                                <Label htmlFor="cTitle">Título de la Materia</Label>
                                <Input
                                    id="cTitle"
                                    placeholder="Ej: Matemáticas Básicas, Algoritmos..."
                                    value={courseTitle}
                                    onChange={(e) => setCourseTitle(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2 col-span-2">
                                <Label htmlFor="cDesc">Descripción</Label>
                                <Textarea
                                    id="cDesc"
                                    placeholder="Temario, objetivos generales, competencias y resultados de aprendizaje (RAP) asociados a la materia..."
                                    value={courseDescription}
                                    onChange={(e) => setCourseDescription(e.target.value)}
                                    className="h-28 min-h-[80px] max-h-[160px] overflow-y-auto resize-y text-xs leading-relaxed [field-sizing:fixed]"
                                    rows={3}
                                />
                                <p className="text-[10px] text-muted-foreground mt-1">
                                    Aquí puedes registrar el temario, objetivos, competencias y resultados de aprendizaje (RAP) asociados a la materia.
                                </p>
                            </div>
                            <div className="space-y-2 col-span-2 md:col-span-1">
                                <Label htmlFor="cWeeklyHours">Horas Semanales</Label>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <Select value={Math.floor(courseWeeklyHours || 0).toString()} onValueChange={(val) => setCourseWeeklyHours(parseInt(val) + ((courseWeeklyHours || 0) % 1))}>
                                            <SelectTrigger id="cWeeklyHours" className="h-9">
                                                <SelectValue placeholder="Horas" />
                                            </SelectTrigger>
                                            <SelectContent className="max-h-[200px]">
                                                {Array.from({ length: 41 }, (_, i) => (
                                                    <SelectItem key={`h-${i}`} value={i.toString()}>{i} hr</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex-1">
                                        <Select value={Math.round(((courseWeeklyHours || 0) % 1) * 60).toString()} onValueChange={(val) => setCourseWeeklyHours(Math.floor(courseWeeklyHours || 0) + parseInt(val) / 60)}>
                                            <SelectTrigger id="cWeeklyMinutes" className="h-9">
                                                <SelectValue placeholder="Minutos" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="0">0 min</SelectItem>
                                                <SelectItem value="15">15 min</SelectItem>
                                                <SelectItem value="30">30 min</SelectItem>
                                                <SelectItem value="45">45 min</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                            {selectedProgram && (
                                <div className="space-y-2 col-span-2 md:col-span-1">
                                    <Label htmlFor="cPeriod">Periodo Académico</Label>
                                    <Select value={coursePeriodId} onValueChange={setCoursePeriodId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecciona un periodo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {selectedProgram.periods.map(per => (
                                                <SelectItem key={per.id} value={per.id}>{per.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            <div className="space-y-2 col-span-2 md:col-span-1">
                                <Label htmlFor="cBadge">Leyenda (Badge Opcional)</Label>
                                <Input
                                    id="cBadge"
                                    placeholder="Ej: Virtual, Electiva, Nivelatorio..."
                                    value={courseBadge}
                                    onChange={(e) => setCourseBadge(e.target.value)}
                                    maxLength={25}
                                    className="h-9"
                                />
                            </div>
                            <div className="space-y-2 col-span-2 md:col-span-1">
                                <Label htmlFor="cBadgeColor">Color de Leyenda</Label>
                                <Select value={courseBadgeColor} onValueChange={setCourseBadgeColor}>
                                    <SelectTrigger id="cBadgeColor" className="h-9">
                                        <SelectValue placeholder="Selecciona un color" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(BADGE_COLORS).map(([key, value]) => (
                                            <SelectItem key={key} value={key}>
                                                <div className="flex items-center gap-2">
                                                    <span className={cn("w-3 h-3 rounded-full border", value.bg)} />
                                                    <span>{value.label}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setCourseDialogOpen(false)} disabled={isPending}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSaveCourse} disabled={isPending}>
                            {courseToEdit ? "Guardar Cambios" : "Crear Materia"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ============ DIALOG: COURSE DESCRIPTION ============ */}
            <Dialog open={descriptionDialogOpen} onOpenChange={setDescriptionDialogOpen}>
                <DialogContent className="max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <Info className="h-5 w-5 text-primary" />
                            {selectedCourseForDesc?.title}
                        </DialogTitle>
                        <DialogDescription>Información detallada de la materia.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        {/* Meta information row */}
                        <div className="flex flex-wrap gap-2">
                            {selectedCourseForDesc?.period && (
                                <Badge variant="outline" className="bg-muted/30 border-muted text-xs font-semibold px-2 py-0.5">
                                    Periodo: {selectedCourseForDesc.period.name}
                                </Badge>
                            )}
                            {selectedCourseForDesc?.weeklyHours !== undefined && selectedCourseForDesc?.weeklyHours !== null && selectedCourseForDesc?.weeklyHours > 0 && (
                                <Badge variant="secondary" className="bg-primary/10 text-primary border border-primary/20 text-xs font-semibold px-2 py-0.5 flex items-center gap-1">
                                    <Clock className="h-3.5 w-3.5" />
                                    {formatWeeklyHours(selectedCourseForDesc.weeklyHours)}
                                </Badge>
                            )}
                            {selectedCourseForDesc?.badge && (
                                <Badge className={cn("border text-xs font-bold px-2 py-0.5", (selectedCourseForDesc.badgeColor && BADGE_COLORS[selectedCourseForDesc.badgeColor]) ? BADGE_COLORS[selectedCourseForDesc.badgeColor].bg : BADGE_COLORS.slate.bg)}>
                                    {selectedCourseForDesc.badge}
                                </Badge>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descripción</h4>
                            <div className="text-sm text-foreground/80 whitespace-pre-wrap bg-muted/20 p-4 rounded-xl border border-muted/40 max-h-[250px] overflow-y-auto custom-scrollbar">
                                {selectedCourseForDesc?.description || "Esta materia no tiene una descripción detallada registrada."}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setDescriptionDialogOpen(false)}>Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ============ DIALOG: CURRICULUM PDF CONFIG ============ */}
            <Dialog open={isPdfConfigModalOpen} onOpenChange={setIsPdfConfigModalOpen}>
                <DialogContent className="max-w-3xl sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-bold">
                            <FileText className="w-5 h-5 text-rose-500 shrink-0" />
                            Configurar y Exportar Programa de Formación
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Personaliza el membrete, logo institucional y parámetros del documento antes de generar el PDF oficial.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 py-2">
                        {/* ── COLUMNA IZQUIERDA: Membrete, Logo y Sello ── */}
                        <div className="space-y-4">
                            <div className="border border-border/70 rounded-xl p-3.5 bg-muted/20 space-y-3.5">
                                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                        <ImageIcon className="w-3.5 h-3.5 text-rose-500" />
                                        Membrete e Identidad Gráfica
                                    </span>
                                    <span className="text-[10px] text-muted-foreground font-medium">Encabezado</span>
                                </div>

                                {/* Membrete institucional */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="pdfInstTag" className="text-xs font-semibold">Membrete / Institución</Label>
                                    <Input
                                        id="pdfInstTag"
                                        value={pdfConfig.institutionTag}
                                        onChange={(e) => setPdfConfig(prev => ({ ...prev, institutionTag: e.target.value }))}
                                        className="h-8 text-xs"
                                        placeholder="Nombre o membrete institucional..."
                                    />
                                </div>

                                {/* Enlace del logo */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="pdfLogoUrl" className="text-xs font-semibold">
                                            Enlace para Logo (Opcional)
                                        </Label>
                                        {pdfConfig.logoUrl && (
                                            <button
                                                type="button"
                                                onClick={() => setPdfConfig(prev => ({ ...prev, logoUrl: "" }))}
                                                className="text-[10px] text-muted-foreground hover:text-destructive underline"
                                            >
                                                Limpiar enlace
                                            </button>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <Input
                                            id="pdfLogoUrl"
                                            value={pdfConfig.logoUrl || ""}
                                            onChange={(e) => setPdfConfig(prev => ({ ...prev, logoUrl: e.target.value }))}
                                            className="h-8 text-xs pr-8"
                                            placeholder="https://ejemplo.com/logo-institucional.png"
                                        />
                                        <LinkIcon className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-muted-foreground pointer-events-none" />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">
                                        {pdfConfig.logoUrl?.trim()
                                            ? "Se creará el encabezado con el logo de tamaño fijo y acorde."
                                            : "Si no se suministra un enlace, no se crea encabezado con logo en el documento."}
                                    </p>

                                    {/* Vista previa del logo si hay URL */}
                                    {pdfConfig.logoUrl?.trim() && (
                                        <div className="mt-2 p-2 bg-background rounded-lg border border-border/70 flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="w-12 h-9 rounded border border-border bg-white flex items-center justify-center p-1 shrink-0 overflow-hidden">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={pdfConfig.logoUrl}
                                                        alt="Logo preview"
                                                        className="max-h-full max-w-full object-contain"
                                                        onError={(e) => {
                                                            (e.currentTarget as HTMLElement).style.opacity = '0.3';
                                                        }}
                                                    />
                                                </div>
                                                <div className="min-w-0 text-[11px]">
                                                    <span className="font-semibold text-foreground block truncate">Vista previa del logo</span>
                                                    <span className="text-[10px] text-muted-foreground truncate block max-w-[200px]">
                                                        {pdfConfig.logoUrl}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Switch: Centrar Logo */}
                                <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/50">
                                    <div className="space-y-0.5 pr-2">
                                        <Label
                                            htmlFor="switch-center-logo"
                                            className={cn(
                                                "text-xs font-semibold cursor-pointer",
                                                !pdfConfig.logoUrl?.trim() && "opacity-60 pointer-events-none"
                                            )}
                                        >
                                            Centrar Logo en Encabezado
                                        </Label>
                                        <p className="text-[10px] text-muted-foreground">
                                            {pdfConfig.centerLogo
                                                ? "El logo se posiciona centrado en la parte superior."
                                                : "El logo se alinea a la izquierda junto a los títulos institucionales."}
                                        </p>
                                    </div>
                                    <Switch
                                        id="switch-center-logo"
                                        checked={Boolean(pdfConfig.centerLogo)}
                                        disabled={!pdfConfig.logoUrl?.trim()}
                                        onCheckedChange={(checked) => setPdfConfig(prev => ({ ...prev, centerLogo: checked }))}
                                    />
                                </div>
                            </div>

                            {/* Sello Oficial y Fecha */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="pdfBadgeText" className="text-xs font-semibold">Texto del Sello / Distintivo</Label>
                                    <Input
                                        id="pdfBadgeText"
                                        value={pdfConfig.badgeText}
                                        onChange={(e) => setPdfConfig(prev => ({ ...prev, badgeText: e.target.value }))}
                                        className="h-8 text-xs"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="pdfIssueDate" className="text-xs font-semibold">Fecha de Emisión</Label>
                                    <Input
                                        id="pdfIssueDate"
                                        value={pdfConfig.issueDate}
                                        onChange={(e) => setPdfConfig(prev => ({ ...prev, issueDate: e.target.value }))}
                                        className="h-8 text-xs"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ── COLUMNA DERECHA: Datos del Programa y Opciones de Contenido ── */}
                        <div className="space-y-4">
                            {/* Título Principal */}
                            <div className="space-y-1.5">
                                <Label htmlFor="pdfMainTitle" className="text-xs font-semibold">Título Principal del Documento</Label>
                                <Input
                                    id="pdfMainTitle"
                                    value={pdfConfig.mainTitle}
                                    onChange={(e) => setPdfConfig(prev => ({ ...prev, mainTitle: e.target.value }))}
                                    className="h-8 text-xs font-medium"
                                    placeholder="Programa de Formación..."
                                />
                            </div>

                            {/* Nombre del Programa */}
                            <div className="space-y-1.5">
                                <Label htmlFor="pdfProgName" className="text-xs font-semibold">Nombre del Programa</Label>
                                <Input
                                    id="pdfProgName"
                                    value={pdfConfig.programName}
                                    onChange={(e) => setPdfConfig(prev => ({ ...prev, programName: e.target.value }))}
                                    className="h-8 text-xs font-bold"
                                />
                            </div>

                            {/* Descripción / Subtítulo */}
                            <div className="space-y-1.5">
                                <Label htmlFor="pdfProgDesc" className="text-xs font-semibold">Descripción o Subtítulo del Programa</Label>
                                <Textarea
                                    id="pdfProgDesc"
                                    value={pdfConfig.programDescription}
                                    onChange={(e) => setPdfConfig(prev => ({ ...prev, programDescription: e.target.value }))}
                                    rows={2}
                                    className="min-h-[50px] max-h-[85px] overflow-y-auto resize-y text-xs [field-sizing:fixed]"
                                    placeholder="Descripción curricular del programa..."
                                />
                            </div>

                            {/* Selección de Programas de Formación */}
                            {Boolean(selectedProgram && (selectedProgram.timelines || []).length > 0) && selectedProgram && (
                                <div className="bg-muted/30 p-3.5 rounded-xl border border-border/70 space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-bold flex items-center gap-1.5">
                                            <GitBranch className="w-3.5 h-3.5 text-primary" />
                                            <span>Programas de Formación a Incluir</span>
                                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-semibold bg-background">
                                                {(pdfConfig.selectedTimelineIds || []).length} de {(selectedProgram.timelines || []).length}
                                            </Badge>
                                        </Label>
                                        <div className="flex items-center gap-1.5 text-[10px]">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const allIds = (selectedProgram.timelines || []).map((t: any) => t.id);
                                                    setPdfConfig(prev => ({
                                                        ...prev,
                                                        selectedTimelineIds: allIds,
                                                        mainTitle: `PROGRAMA DE FORMACIÓN: ${selectedProgram.name.toUpperCase()}`
                                                    }));
                                                }}
                                                className="text-primary hover:underline font-bold px-1.5 py-0.5 rounded hover:bg-primary/10 transition-colors"
                                            >
                                                Todas
                                            </button>
                                            <span className="text-muted-foreground">•</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setPdfConfig(prev => ({ ...prev, selectedTimelineIds: [] }));
                                                }}
                                                className="text-muted-foreground hover:underline hover:text-foreground px-1.5 py-0.5 rounded transition-colors"
                                            >
                                                Ninguna
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">
                                        Elige qué programas de formación se exportarán en el documento.
                                    </p>

                                    <div className="grid grid-cols-1 gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                                        {(selectedProgram.timelines || []).map((tl: any) => {
                                            const isSelected = (pdfConfig.selectedTimelineIds || []).includes(tl.id);
                                            const tlPeriods = selectedProgram.periods.filter(p => p.timelineId ? p.timelineId === tl.id : tl.isDefault);
                                            const tlCourses = tlPeriods.reduce((sum, p) => sum + (p.courses?.length || 0), 0);

                                            return (
                                                <div
                                                    key={tl.id}
                                                    onClick={() => {
                                                        const current = pdfConfig.selectedTimelineIds || [];
                                                        const next = isSelected
                                                            ? current.filter(id => id !== tl.id)
                                                            : [...current, tl.id];
                                                        
                                                        let newTitle = pdfConfig.mainTitle;
                                                        if (next.length === 1) {
                                                            const singleTl = (selectedProgram.timelines || []).find((t: any) => t.id === next[0]);
                                                            newTitle = `PROGRAMA DE FORMACIÓN: ${selectedProgram.name.toUpperCase()} (${singleTl?.name.toUpperCase() || ""})`;
                                                        } else if (next.length > 1) {
                                                            newTitle = `PROGRAMA DE FORMACIÓN: ${selectedProgram.name.toUpperCase()}`;
                                                        }

                                                        setPdfConfig(prev => ({
                                                            ...prev,
                                                            selectedTimelineIds: next,
                                                            mainTitle: newTitle
                                                        }));
                                                    }}
                                                    className={cn(
                                                        "flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all select-none",
                                                        isSelected
                                                            ? "bg-primary/10 border-primary/40 text-foreground shadow-2xs"
                                                            : "bg-background/60 border-border/70 text-muted-foreground hover:bg-muted/40"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <Checkbox
                                                            checked={isSelected}
                                                            onCheckedChange={() => {}}
                                                            className="pointer-events-none"
                                                        />
                                                        <span className="font-bold text-xs truncate max-w-[200px]">
                                                            {tl.name}
                                                        </span>
                                                        {tl.isDefault && (
                                                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-primary/15 text-primary font-extrabold shrink-0">
                                                                Principal
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] font-mono text-muted-foreground shrink-0 ml-2">
                                                        {tlPeriods.length} {tlPeriods.length === 1 ? "periodo" : "periodos"} • {tlCourses} {tlCourses === 1 ? "materia" : "materias"}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {(pdfConfig.selectedTimelineIds || []).length === 0 && (
                                        <p className="text-[11px] text-destructive font-semibold flex items-center gap-1 pt-1">
                                            <AlertCircle className="w-3 h-3 shrink-0" />
                                            Debes seleccionar al menos un programa de formación para exportar.
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Opciones y Switches */}
                            <div className="bg-muted/30 p-3.5 rounded-xl border border-border/70 space-y-3">
                                <h5 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Opciones de Contenido</h5>

                                {/* Switch: Catálogo detallado de RAP */}
                                <div className="flex items-center justify-between gap-3">
                                    <div className="space-y-0.5 pr-2">
                                        <Label htmlFor="switch-detailed-rap" className="text-xs font-bold cursor-pointer">
                                            Incluir Desglose Detallado de Competencias y RAP
                                        </Label>
                                        <p className="text-[11px] text-muted-foreground">
                                            Añade las páginas con la tabla completa de temarios, competencias y RAP de cada asignatura.
                                        </p>
                                    </div>
                                    <Switch
                                        id="switch-detailed-rap"
                                        checked={pdfConfig.includeDetailedCatalogue}
                                        onCheckedChange={(checked) => setPdfConfig(prev => ({ ...prev, includeDetailedCatalogue: checked }))}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/50">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsPdfConfigModalOpen(false)}
                            disabled={isExportingCurriculumPDF}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleExecuteDownloadCurriculumPdf}
                            disabled={isExportingCurriculumPDF || (Boolean(selectedProgram?.timelines?.length) && (pdfConfig.selectedTimelineIds || []).length === 0)}
                            size="sm"
                            className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                        >
                            {isExportingCurriculumPDF ? (
                                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                            ) : (
                                <FileText className="h-4 w-4 mr-1.5" />
                            )}
                            Descargar Malla en PDF
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ============ DIALOG: BULK DELETE CONFIRMATION ============ */}
            <AlertDialog open={bulkDeleteConfirmationOpen} onOpenChange={setBulkDeleteConfirmationOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                            <Trash2 className="w-5 h-5" />
                            ¿Eliminar instructores seleccionados?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará de forma permanente a los <strong>{selectedTeacherIds.length}</strong> instructores seleccionados de este programa y del sistema. Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={handleBulkDeleteTeachers}
                            className="bg-destructive hover:bg-destructive/90 text-white font-bold cursor-pointer"
                            disabled={isPending}
                        >
                            {isPending ? "Eliminando..." : `Eliminar (${selectedTeacherIds.length})`}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* ============ DIALOG: DELETE CONFIRMATION ============ */}
            {(() => {
                const programToDelete = deleteType === "program" ? programs.find(p => p.id === deleteItemId) : null;
                const periodsCount = programToDelete?.periods?.length || 0;
                const groupsCount = programToDelete?.groups?.length || 0;
                const coursesCount = programToDelete?.periods
                    ?.reduce((acc: number, p: any) => acc + (p.courses?.filter((c: any) => !c.groupId)?.length ?? 0), 0) || 0;
                const studentsCount = programToDelete?.groups?.reduce((acc: number, g: any) => acc + (g.students?.length || 0), 0) || 0;
                const teachersCount = programToDelete?.teachers?.length || 0;
                const isProgramValid = deleteConfirmText.trim().toLowerCase() === deleteItemName.trim().toLowerCase();

                return (
                    <AlertDialog 
                        open={deleteConfirmationOpen} 
                        onOpenChange={(open) => {
                            setDeleteConfirmationOpen(open);
                            if (!open) setDeleteConfirmText("");
                        }}
                    >
                        <AlertDialogContent className="max-w-xl rounded-3xl p-6 sm:p-7 border-border/80 bg-background shadow-2xl">
                            <AlertDialogHeader className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-center shrink-0 shadow-inner">
                                        <AlertTriangle className="w-6 h-6 animate-pulse" />
                                    </div>
                                    <div>
                                        <AlertDialogTitle className="text-xl font-bold text-foreground">
                                            {deleteType === "program" ? "Eliminar Área de Formación" : "¿Estás absolutamente seguro?"}
                                        </AlertDialogTitle>
                                        <p className="text-xs text-muted-foreground font-medium mt-0.5">
                                            {deleteType === "program" 
                                                ? "Esta acción es irreversible y eliminará toda la jerarquía académica asociada." 
                                                : "Esta acción no se puede deshacer."}
                                        </p>
                                    </div>
                                </div>

                                {deleteType === "program" ? (
                                    <div className="space-y-4 pt-2">
                                        {/* Banner de Área a Eliminar */}
                                        <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <School className="w-5 h-5 text-primary" />
                                                <span className="font-bold text-foreground text-sm">{deleteItemName}</span>
                                            </div>
                                            <Badge variant="destructive" className="rounded-xl text-[10px] font-bold uppercase tracking-wider">
                                                Eliminación Permanente
                                            </Badge>
                                        </div>

                                        {/* Cuadro de Consecuencias y Datos que se Borrarán */}
                                        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/30 space-y-2.5">
                                            <div className="flex items-center gap-2 text-xs font-bold text-destructive">
                                                <AlertCircle className="w-4 h-4 shrink-0" />
                                                <span>Consecuencias: Todo lo que se borrará en cascada:</span>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1">
                                                <div className="p-2.5 rounded-xl bg-background/90 border border-destructive/20 text-center shadow-2xs">
                                                    <span className="text-sm font-black text-foreground block">{periodsCount}</span>
                                                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">Periodos</span>
                                                </div>
                                                <div className="p-2.5 rounded-xl bg-background/90 border border-destructive/20 text-center shadow-2xs">
                                                    <span className="text-sm font-black text-foreground block">{groupsCount}</span>
                                                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">Fichas / Grupos</span>
                                                </div>
                                                <div className="p-2.5 rounded-xl bg-background/90 border border-destructive/20 text-center shadow-2xs">
                                                    <span className="text-sm font-black text-foreground block">{coursesCount}</span>
                                                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">Materias</span>
                                                </div>
                                                <div className="p-2.5 rounded-xl bg-background/90 border border-destructive/20 text-center shadow-2xs">
                                                    <span className="text-sm font-black text-foreground block">{studentsCount}</span>
                                                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">Aprendices</span>
                                                </div>
                                                <div className="p-2.5 rounded-xl bg-background/90 border border-destructive/20 text-center shadow-2xs">
                                                    <span className="text-sm font-black text-foreground block">{teachersCount}</span>
                                                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">Instructores</span>
                                                </div>
                                                <div className="p-2.5 rounded-xl bg-background/90 border border-destructive/20 text-center shadow-2xs">
                                                    <span className="text-sm font-black text-foreground block">Mallas</span>
                                                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">Horarios</span>
                                                </div>
                                            </div>

                                            <p className="text-[11px] text-destructive/90 font-medium leading-relaxed pt-1">
                                                ⚠️ Se desvincularán o borrarán permanentemente las matrículas de aprendices, planes de mejoramiento, calificaciones registradas, asignaciones de ambientes y franjas horarias pertenecientes a este programa.
                                            </p>
                                        </div>

                                        {/* Input de validación por escritura */}
                                        <div className="space-y-2 pt-1 text-left">
                                            <Label className="text-xs font-bold text-foreground block">
                                                Para confirmar, escribe <span className="text-destructive font-mono underline select-all font-extrabold">&quot;{deleteItemName}&quot;</span>:
                                            </Label>
                                            <Input
                                                value={deleteConfirmText}
                                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                                placeholder={`Escribe "${deleteItemName}" aquí...`}
                                                className={`h-10 rounded-xl text-xs font-medium bg-background border transition-all ${
                                                    isProgramValid 
                                                        ? "border-emerald-500 ring-2 ring-emerald-500/20" 
                                                        : "border-border/80 focus:border-destructive focus:ring-2 focus:ring-destructive/20"
                                                }`}
                                                autoFocus
                                            />
                                            {deleteConfirmText && (
                                                <p className={`text-[11px] font-semibold ${
                                                    isProgramValid
                                                        ? "text-emerald-600 dark:text-emerald-400"
                                                        : "text-muted-foreground"
                                                }`}>
                                                    {isProgramValid
                                                        ? "✓ Texto de confirmación correcto. Ya puedes proceder a eliminar."
                                                        : "El texto ingresado no coincide con el nombre del programa."}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ) : deleteType === "teacher" ? (
                                    <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
                                        Desvincularás al instructor <strong>{deleteItemName}</strong> de <strong>{selectedProgram?.name}</strong>. El instructor mantendrá su cuenta en el sistema pero ya no estará asociado a esta área de formación.
                                    </AlertDialogDescription>
                                ) : (
                                    <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
                                        Eliminarás definitivamente <strong>{deleteItemName}</strong> de la base de datos (junto con todas sus relaciones asociadas si corresponde).
                                    </AlertDialogDescription>
                                )}
                            </AlertDialogHeader>

                            <AlertDialogFooter className="mt-6 pt-4 border-t border-border/60 flex items-center justify-end gap-2">
                                <AlertDialogCancel 
                                    disabled={isPending}
                                    onClick={() => setDeleteConfirmText("")}
                                    className="rounded-xl text-xs font-bold h-10 px-4"
                                >
                                    Cancelar
                                </AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleDeleteConfirm();
                                    }}
                                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl text-xs font-bold h-10 px-5 shadow-md shadow-destructive/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={isPending || (deleteType === "program" && !isProgramValid)}
                                >
                                    {isPending 
                                        ? "Eliminando..." 
                                        : deleteType === "program" 
                                            ? "Eliminar Programa Definitivamente" 
                                            : "Eliminar"}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                );
            })()}

            {/* ============ DIALOG: TEACHER ASSIGN/UNASSIGN CONFIRMATION ============ */}
            <AlertDialog open={teacherConfirmOpen} onOpenChange={setTeacherConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Acción</AlertDialogTitle>
                        <AlertDialogDescription>
                            ¿Estás seguro que deseas {teacherToConfirm?.assign ? "asociar" : "desasociar"} a <strong>{teacherToConfirm?.name}</strong> del programa {selectedProgram?.name}?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                confirmTeacherAction();
                            }}
                            className={teacherToConfirm?.assign ? "" : "bg-destructive hover:bg-destructive/90"}
                            disabled={isPending}
                        >
                            {isPending ? "Procesando..." : (teacherToConfirm?.assign ? "Asociar" : "Desasociar")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>



            {/* ============ DIALOG: VIEW & UNLOCK TEACHER AVAILABILITY ============ */}
            <Dialog open={adminTeacherAvailabilityOpen} onOpenChange={setAdminTeacherAvailabilityOpen}>
                <DialogContent showCloseButton={false} className="max-w-[100vw] sm:max-w-[100vw] w-screen h-[100dvh] max-h-[100dvh] rounded-none m-0 border-0 flex flex-col p-4 sm:p-6">
                    <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b">
                        <div>
                            <DialogTitle className="flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-primary" />
                                <span>Disponibilidad: {selectedTeacherForAvailability?.name}</span>
                            </DialogTitle>
                            <DialogDescription>
                                Visualiza la disponibilidad horaria configurada por el instructor para la semana.
                            </DialogDescription>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAdminTeacherAvailabilityOpen(false)}
                            className="h-8 px-3 rounded-lg border-border/80 hover:bg-muted text-foreground font-bold text-xs gap-1.5 shadow-2xs shrink-0 cursor-pointer"
                        >
                            <X className="w-3.5 h-3.5" />
                            <span>Cerrar</span>
                        </Button>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-4 max-h-[70vh]">
                        {selectedTeacherForAvailability && (
                            <TeacherAvailabilityView 
                                teacherId={selectedTeacherForAvailability.id} 
                                isAdminMode={true} 
                                onAdminActionComplete={refreshAll} 
                            />
                        )}
                    </div>

                    <DialogFooter className="pt-2 border-t border-muted/20">
                        <Button onClick={() => setAdminTeacherAvailabilityOpen(false)}>Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ============ DIALOG: ASSIGN GROUPS TO TEACHER ============ */}
            {/* ============ DIALOG: ASSIGN COURSES TO TEACHER ============ */}


            {/* ============ DIALOG: PROGRAM GROUP COURSE (SCHEDULE COURSE) ============ */}
            <Dialog open={groupCourseDialogOpen} onOpenChange={setGroupCourseDialogOpen}>
                <DialogContent className="max-w-[550px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {groupCourseToEdit ? "Editar Clase Programada" : "Programar Nueva Clase"}
                        </DialogTitle>
                        <DialogDescription>
                            Define la asignatura y configura el horario semanal para el grupo <strong>{managingGroup?.name}</strong>.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-3">
                        <div className="space-y-2">
                            <Label htmlFor="gcCatalogCourse">Seleccionar Asignatura del Catálogo *</Label>
                            {catalogCourses.length === 0 ? (
                                <div className="p-3 text-xs bg-yellow-500/10 border border-yellow-500/20 text--600 dark:text--400 rounded-xl">
                                    No hay asignaturas en el catálogo. Agrégalas en la pestaña "Programas de Formación".
                                </div>
                            ) : (
                                <Select 
                                    value={selectedCatalogCourseId} 
                                    onValueChange={(val) => {
                                        setSelectedCatalogCourseId(val);
                                        const selected = catalogCourses.find(c => c.id === val);
                                        if (selected) {
                                            setGroupCourseTitle(selected.title);
                                            setGroupCourseDescription(selected.description || "");
                                        }
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona una asignatura..." />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[200px] overflow-y-auto">
                                        {catalogCourses.map(course => (
                                            <SelectItem key={course.id} value={course.id}>
                                                {course.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                            {selectedCatalogCourseId && (
                                <div className="text-[10px] text-muted-foreground pl-1 mt-1">
                                    Materia seleccionada: <strong>{groupCourseTitle}</strong>
                                </div>
                            )}
                        </div>

                        <div className="space-y-1 mt-3">
                            <Label htmlFor="gcDesc" className="text-xs">Descripción / Temario (Opcional)</Label>
                            <Textarea
                                id="gcDesc"
                                placeholder="Temario, objetivos generales, competencias y resultados de aprendizaje (RAP)..."
                                value={groupCourseDescription}
                                onChange={(e) => setGroupCourseDescription(e.target.value)}
                                rows={2}
                                className="h-24 min-h-[60px] max-h-[140px] overflow-y-auto resize-y text-xs leading-relaxed [field-sizing:fixed]"
                            />
                        </div>

                        <div className="space-y-1 mt-3">
                            <Label htmlFor="gcWeeklyHours" className="text-xs">Horas Semanales Asignadas</Label>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <Select value={Math.floor(groupCourseWeeklyHours || 0).toString()} onValueChange={(val) => setGroupCourseWeeklyHours(parseInt(val) + ((groupCourseWeeklyHours || 0) % 1))}>
                                        <SelectTrigger id="gcWeeklyHours" className="h-9 text-xs">
                                            <SelectValue placeholder="Horas" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[200px]">
                                            {Array.from({ length: 41 }, (_, i) => (
                                                <SelectItem key={`h-${i}`} value={i.toString()}>{i} hr</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex-1">
                                    <Select value={Math.round(((groupCourseWeeklyHours || 0) % 1) * 60).toString()} onValueChange={(val) => setGroupCourseWeeklyHours(Math.floor(groupCourseWeeklyHours || 0) + parseInt(val) / 60)}>
                                        <SelectTrigger id="gcWeeklyMinutes" className="h-9 text-xs">
                                            <SelectValue placeholder="Minutos" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="0">0 min</SelectItem>
                                            <SelectItem value="15">15 min</SelectItem>
                                            <SelectItem value="30">30 min</SelectItem>
                                            <SelectItem value="45">45 min</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        {/* Schedule slots editor section */}
                        <div className="space-y-3 border border-muted/50 p-4 rounded-xl bg-muted/5">
                            <span className="text-xs font-semibold text-muted-foreground uppercase">Ranuras Horarias</span>
                            
                            <div className="grid grid-cols-1 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs">Día de la Semana</Label>
                                    <Select value={scheduleDayOfWeek} onValueChange={(v: any) => setScheduleDayOfWeek(v)}>
                                        <SelectTrigger className="h-9 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {DAYS_OF_WEEK_ORDERED.map(day => (
                                                <SelectItem key={day.value} value={day.value} className="text-xs">
                                                    {day.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-muted-foreground">Seleccionar Franja Horaria (Intervalos de 15 min)</Label>
                                    <div className="p-4 bg-muted/20 border border-muted/50 rounded-xl space-y-4">
                                        {(() => {
                                            if (timeSlots.length <= 1) {
                                                return (
                                                    <p className="col-span-full text-xs text-muted-foreground italic text-center py-2">
                                                        Configure el horario del grupo para ver los bloques disponibles.
                                                    </p>
                                                );
                                            }

                                            const startIdx = selectedStartBlockIndex !== null ? selectedStartBlockIndex : 0;
                                            const endIdx = selectedEndBlockIndex !== null ? selectedEndBlockIndex : 1;
                                            const totalSlots = timeSlots.length;
                                            
                                            // Progress bar range percentage calculations
                                            const pctStart = (startIdx / (totalSlots - 1)) * 100;
                                            const pctWidth = ((endIdx - startIdx) / (totalSlots - 1)) * 100;

                                            // Calculate duration in hours and minutes
                                            const [startH, startM] = timeSlots[startIdx].split(":").map(Number);
                                            const [endH, endM] = timeSlots[endIdx].split(":").map(Number);
                                            const durStartMinutes = startH * 60 + startM;
                                            let durEndMinutes = endH * 60 + endM;
                                            if (durEndMinutes < durStartMinutes) {
                                                durEndMinutes += 1440; // overnight
                                            }
                                            const durDiff = durEndMinutes - durStartMinutes;
                                            const durHours = Math.floor(durDiff / 60);
                                            const durMins = durDiff % 60;
                                            const durationText = durHours > 0 
                                                ? `${durHours} ${durHours === 1 ? 'hora' : 'horas'}${durMins > 0 ? ` y ${durMins} min` : ''}`
                                                : `${durMins} min`;

                                            return (
                                                <div className="space-y-4">
                                                    {/* Timeline Bar visualization */}
                                                    <div className="space-y-1">
                                                        <div className="relative w-full h-3 bg-muted rounded-full overflow-hidden border border-muted/80 shadow-inner">
                                                            <div 
                                                                className="absolute h-full bg-primary/70 backdrop-blur-xs transition-all duration-150"
                                                                style={{ left: `${pctStart}%`, width: `${pctWidth}%` }}
                                                            />
                                                        </div>
                                                        <div className="flex justify-between text-[10px] text-muted-foreground font-mono px-0.5">
                                                            <span>{timeSlots[0]}</span>
                                                            {totalSlots > 6 && (
                                                                <span>{timeSlots[Math.floor((totalSlots - 1) / 2)]}</span>
                                                            )}
                                                            <span>{timeSlots[totalSlots - 1]}</span>
                                                        </div>
                                                    </div>

                                                    {/* Sliders and badges */}
                                                    <div className="space-y-3">
                                                        {/* Slider 1: Start Time */}
                                                        <div className="space-y-1.5">
                                                            <div className="flex justify-between items-center text-xs">
                                                                <span className="font-semibold text-muted-foreground">Hora de Inicio</span>
                                                                <Badge variant="outline" className="font-mono bg-background/50 border-muted/50 px-2 py-0.5 text-primary text-[11px] font-bold">
                                                                    {timeSlots[startIdx]}
                                                                </Badge>
                                                            </div>
                                                            <input
                                                                type="range"
                                                                min={0}
                                                                max={totalSlots - 2}
                                                                step={1}
                                                                value={startIdx}
                                                                onChange={(e) => {
                                                                    const val = Number(e.target.value);
                                                                    setSelectedStartBlockIndex(val);
                                                                    setScheduleStartTime(timeSlots[val]);
                                                                    
                                                                    // Auto-adjust end time if it falls behind the new start time
                                                                    if (endIdx <= val) {
                                                                        const newEnd = val + 1;
                                                                        setSelectedEndBlockIndex(newEnd);
                                                                        setScheduleEndTime(timeSlots[newEnd]);
                                                                    }
                                                                }}
                                                                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
                                                            />
                                                        </div>

                                                        {/* Slider 2: End Time */}
                                                        <div className="space-y-1.5">
                                                            <div className="flex justify-between items-center text-xs">
                                                                <span className="font-semibold text-muted-foreground">Hora de Fin</span>
                                                                <Badge variant="outline" className="font-mono bg-background/50 border-muted/50 px-2 py-0.5 text-primary text-[11px] font-bold">
                                                                    {timeSlots[endIdx]}
                                                                </Badge>
                                                            </div>
                                                            <input
                                                                type="range"
                                                                min={startIdx + 1}
                                                                max={totalSlots - 1}
                                                                step={1}
                                                                value={endIdx}
                                                                onChange={(e) => {
                                                                    const val = Number(e.target.value);
                                                                    setSelectedEndBlockIndex(val);
                                                                    setScheduleEndTime(timeSlots[val]);
                                                                }}
                                                                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Selected range display */}
                                                    <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-lg p-2.5 mt-2">
                                                        <div className="space-y-0.5">
                                                            <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">Franja Horaria Elegida</span>
                                                            <span className="text-xs font-semibold text-foreground">
                                                                {timeSlots[startIdx]} a {timeSlots[endIdx]}
                                                            </span>
                                                        </div>
                                                        <Badge className="bg-primary/95 text-primary-foreground hover:bg-primary text-[10px] px-2 py-0.5 font-bold">
                                                            {durationText}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                            
                        </div>

                            {scheduleConflicts.length > 0 && (
                                <div className="p-3 rounded-xl space-y-1 border bg-destructive/10 border-destructive/20 text-destructive">
                                    <p className="text-xs font-bold flex items-center gap-1.5">
                                        <AlertCircle className="h-4 w-4" />
                                        <span>Conflictos detectados:</span>
                                    </p>
                                    <ul className="list-disc pl-4 text-[11px] space-y-1 opacity-90">
                                        {scheduleConflicts.map((c, i) => (
                                            <li key={i}>{c}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    <DialogFooter className="mt-4 pt-2 border-t border-muted/20">
                        <Button variant="ghost" onClick={() => setGroupCourseDialogOpen(false)} disabled={isPending}>
                            Cancelar
                        </Button>
                        <Button 
                            onClick={() => handleSaveGroupCourse(false)} 
                            disabled={isPending}
                        >
                            {isPending ? "Insertando..." : groupCourseToEdit ? "Guardar Cambios" : "Insertar Horario"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={progressModal.isOpen} onOpenChange={() => {}}>
                <DialogContent className="max-w-[400px] pointer-events-auto" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            {progressModal.type === "import" ? "Procesando Importación" : "Generando Exportación"}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            {progressModal.title}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-3">
                        <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                            <div 
                                className="bg-primary h-3 rounded-full transition-all duration-300 ease-out" 
                                style={{ width: `${progressModal.progress}%` }}
                            ></div>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{progressModal.progress}% completado</span>
                            {progressModal.type === "import" && (
                                <span>{progressModal.currentCount} de {progressModal.totalCount}</span>
                            )}
                        </div>
                    </div>
                    <div className="flex justify-end pt-2 border-t border-border/20">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                                cancelRef.current = true;
                            }}
                            className="text-xs h-8"
                        >
                            Cancelar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal Universal de Reporte Detallado de Importación */}
            <Dialog 
                open={importSummary.isOpen} 
                onOpenChange={(open) => setImportSummary(prev => ({ ...prev, isOpen: open }))}
            >
                <DialogContent className="max-w-2xl rounded-3xl border-border bg-background shadow-2xl p-6">
                    <DialogHeader>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                                <Layers className="w-5 h-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-bold text-foreground">
                                    {importSummary.title || "Reporte de Importación"}
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground">
                                    {importSummary.description || "Resumen del proceso de guardado y detalle de registros no procesados."}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* Resumen de resultados */}
                    <div className="grid grid-cols-3 gap-3 my-2">
                        <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 text-center">
                            <span className="text-xl font-black text-foreground block">{importSummary.total}</span>
                            <span className="text-[11px] text-muted-foreground font-medium">Total en Archivo</span>
                        </div>
                        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 block">
                                {importSummary.successCount}
                            </span>
                            <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">Guardados con Éxito</span>
                        </div>
                        <div className="p-3 rounded-2xl bg-destructive/10 border border-destructive/20 text-center">
                            <span className="text-xl font-black text-destructive block">
                                {importSummary.failedList.length}
                            </span>
                            <span className="text-[11px] text-destructive font-medium">Con Observaciones</span>
                        </div>
                    </div>

                    {/* Lista detallada de registros con error */}
                    {importSummary.failedList.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <AlertCircle className="w-4 h-4 text-destructive" />
                                {importSummary.entityName ? `${importSummary.entityName} con observaciones:` : "Registros con observaciones:"}
                            </h4>
                            <div className="max-h-[260px] overflow-y-auto rounded-2xl border border-border/80 divide-y divide-border/60 bg-muted/10">
                                {importSummary.failedList.map((item, idx) => (
                                    <div key={idx} className="p-3 space-y-1 text-xs">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <span className="font-bold text-foreground">
                                                {item.name}
                                            </span>
                                            {item.detail && (
                                                <span className="font-mono text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                                                    {item.detail}
                                                </span>
                                            )}
                                        </div>
                                        {item.error && (
                                            <div className="flex items-center text-[11px] pt-0.5">
                                                <span className="text-destructive font-medium bg-destructive/10 px-2 py-0.5 rounded-md">
                                                    {item.error}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <DialogFooter className="pt-2">
                        <Button
                            onClick={() => setImportSummary(prev => ({ ...prev, isOpen: false }))}
                            className="rounded-xl text-xs font-semibold"
                        >
                            Entendido y Cerrar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Ayuda para las pestañas de Gestión Académica */}
            {selectedProgram && (
                <AcademicTabsHelpModal
                    open={isTabsHelpOpen}
                    onOpenChange={setIsTabsHelpOpen}
                    activeTab={subTab as AcademicTabKey}
                    programName={selectedProgram.name}
                />
            )}
        </div>
    );
}
