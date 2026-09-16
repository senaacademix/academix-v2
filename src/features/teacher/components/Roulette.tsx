"use client";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";


import { useState, useEffect, useRef } from "react";
import { motion, useAnimation, PanInfo, useMotionValue, useTransform, animate, useMotionValueEvent } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Trophy, Users, ChevronDown, Check, X, Pencil, Volume2, VolumeX, Download, UserPlus, Trash2, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, formatName } from "@/lib/utils";
import confetti from "canvas-confetti";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
    exportRouletteToCorporateExcel,
    exportRouletteToCorporatePdf,
} from "@/features/tools/utils/rouletteCorporateExport";

interface Student {
    id: string;
    name: string;
    image: string | null;
    profile?: {
        nombres?: string;
        apellido?: string;
        identificacion?: string;
    } | null;
}

interface HistoryItem {
    student: Student;
    timestamp: string;
    grade?: number;
}

interface RouletteProps {
    students: { user: Student }[];
    courseId: string;
    groupName?: string;
    groupCode?: string;
}

// Pastel colors for better readability
const SEGMENT_COLORS = [
    "#FFB3BA", // Pink
    "#BAFFC9", // Green
    "#BAE1FF", // Blue
    "#FFFFBA", // Yellow
    "#FFDFBA", // Orange
    "#E0BBE4", // Purple
    "#957DAD", // Violet
    "#D291BC", // Magenta
    "#FEC8D8", // Rose
    "#FF9AA2", // Salmon
];

export function Roulette({ students: initialStudents, courseId, groupName, groupCode }: RouletteProps) {
    const [candidates, setCandidates] = useState<Student[]>([]);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [selected, setSelected] = useState<Student | null>(null);
    const [isSpinning, setIsSpinning] = useState(false);
    const [winnerModalOpen, setWinnerModalOpen] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [grade, setGrade] = useState<string>("");
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>("");
    const [keepInRoulette, setKeepInRoulette] = useState(false);
    const [isExporting, setIsExporting] = useState<"excel" | "pdf" | null>(null);

    // Animation controls
    const controls = useAnimation();
    const rotation = useMotionValue(0);
    const audioContextRef = useRef<AudioContext | null>(null);
    const lastTickRef = useRef(0);

    // Initialize Audio Context
    useEffect(() => {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        return () => {
            audioContextRef.current?.close();
        }
    }, []);

    const playTickSound = () => {
        if (!audioContextRef.current || !soundEnabled) return;
        const ctx = audioContextRef.current;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(800 + Math.random() * 200, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.03);

        gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.03);

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.03);
    };

    const playWinSound = () => {
        if (!audioContextRef.current || !soundEnabled) return;
        const ctx = audioContextRef.current;

        // Simple celebratory arpeggio
        [523.25, 659.25, 783.99, 1046.50, 783.99, 1046.50].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);

            gain.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.5);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(ctx.currentTime + i * 0.15);
            osc.stop(ctx.currentTime + i * 0.15 + 0.5);
        });
    };

    const startEditing = (item: HistoryItem) => {
        setEditingKey(item.timestamp);
        setEditValue(item.grade !== undefined ? item.grade.toString() : "");
    };

    const saveGrade = (timestamp: string) => {
        const newGrade = parseFloat(editValue);
        if (isNaN(newGrade) || newGrade < 0 || newGrade > 5) return;

        setHistory(prev => prev.map(item => {
            if (item.timestamp === timestamp) {
                return { ...item, grade: newGrade };
            }
            return item;
        }));
        setEditingKey(null);
    };

    const cancelEdit = () => {
        setEditingKey(null);
        setEditValue("");
    };

    // Track rotation for ticks
    useMotionValueEvent(rotation, "change", (latest) => {
        if (candidates.length === 0) return;
        const segmentAngle = 360 / candidates.length;
        const tickIndex = Math.floor(latest / segmentAngle);
        if (tickIndex !== lastTickRef.current) {
            playTickSound();
            lastTickRef.current = tickIndex;
        }
    });

    // Initialize/Load state
    useEffect(() => {
        const stored = localStorage.getItem(`roulette-storage-${courseId}`);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed.candidates)) setCandidates(parsed.candidates);

                if (Array.isArray(parsed.history)) {
                    // Migration check: Handle old format (Student[]) vs new format (HistoryItem[])
                    const validHistory: HistoryItem[] = parsed.history.map((item: any) => {
                        // Check if it's the new format
                        if (item && typeof item === 'object' && 'student' in item) {
                            return item as HistoryItem;
                        }
                        // Assume old format (Student) and migrate
                        if (item && typeof item === 'object' && 'id' in item) {
                            return {
                                student: item as Student,
                                timestamp: new Date().toISOString()
                            };
                        }
                        return null;
                    }).filter((item: HistoryItem | null): item is HistoryItem => item !== null);

                    setHistory(validHistory);
                }
            } catch (e) {
                console.error("Failed to load roulette state", e);
                const flatStudents = initialStudents.map(s => s.user);
                setCandidates(flatStudents);
            }
        } else {
            const flatStudents = initialStudents.map(s => s.user);
            setCandidates(flatStudents);
        }
        setIsLoaded(true);
        rotation.set(0);
        lastTickRef.current = 0;
    }, [initialStudents, courseId, rotation]);

    // Save state
    useEffect(() => {
        if (!isLoaded) return;
        localStorage.setItem(`roulette-storage-${courseId}`, JSON.stringify({
            candidates,
            history
        }));
    }, [candidates, history, courseId, isLoaded]);

    const getFullName = (student: Student) => {
        return formatName(student.name, student.profile);
    };

    const handleSpin = async () => {
        if (candidates.length === 0 || isSpinning) return;

        setIsSpinning(true);
        setSelected(null);
        setGrade("");

        if (audioContextRef.current?.state === 'suspended') {
            await audioContextRef.current.resume();
        }

        const winnerIndex = Math.floor(Math.random() * candidates.length);
        const winner = candidates[winnerIndex];

        const segmentAngle = 360 / candidates.length;
        const offset = segmentAngle / 2;
        const spins = 5 + Math.floor(Math.random() * 5);

        const currentRot = rotation.get();
        const targetMod = 360 - (winnerIndex * segmentAngle) - offset;
        const currentMod = currentRot % 360;
        let delta = targetMod - currentMod;
        if (delta < 0) delta += 360;

        const finalRotation = currentRot + (360 * spins) + delta;

        await animate(rotation, finalRotation, {
            duration: 5,
            ease: [0.2, 0.8, 0.2, 1],
        });

        playWinSound();

        setTimeout(() => {
            setSelected(winner);
            setWinnerModalOpen(true);
            setIsSpinning(false);

            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                zIndex: 9999
            });
        }, 500);
    };

    const handleWinnerConfirmed = () => {
        if (!selected) return;

        const newHistoryItem: HistoryItem = {
            student: selected,
            timestamp: new Date().toISOString(),
            grade: grade ? parseFloat(grade) : undefined
        };

        setHistory(prev => [newHistoryItem, ...prev]);

        if (!keepInRoulette) {
            setCandidates(prev => prev.filter(c => c.id !== selected.id));
        } else {
            toast.success(`${getFullName(selected)} se mantiene en la ruleta`, {
                description: "El aprendiz puede volver a salir en próximas rondas."
            });
        }

        setSelected(null);
        setWinnerModalOpen(false);
        setGrade("");
        setKeepInRoulette(false);

        rotation.set(0);
        lastTickRef.current = 0;
    };

    const handleReset = () => {
        const flatStudents = initialStudents.map(s => s.user);
        setCandidates(flatStudents);
        setHistory([]);
        setSelected(null);
        setWinnerModalOpen(false);
        rotation.set(0);
        lastTickRef.current = 0;
        localStorage.removeItem(`roulette-storage-${courseId}`);
    };

    const handleReaddStudent = (student: Student) => {
        const isAlreadyIn = candidates.some(c => c.id === student.id);
        if (isAlreadyIn) {
            toast.info(`${getFullName(student)} ya está en la ruleta`);
            return;
        }

        setCandidates(prev => [...prev, student]);
        toast.success(`${getFullName(student)} reincorporado a la ruleta`, {
            description: "El aprendiz ya puede volver a ser seleccionado. Su historial de notas se conserva."
        });

        rotation.set(0);
        lastTickRef.current = 0;
    };

    const handleReaddAllToRoulette = () => {
        const flatStudents = initialStudents.map(s => s.user);
        setCandidates(flatStudents);
        toast.success("Todos los aprendices han sido reincorporados a la ruleta", {
            description: "El historial de turnos y notas registradas se conserva intacto."
        });
        rotation.set(0);
        lastTickRef.current = 0;
    };

    const handleDeleteHistoryItem = (timestamp: string, studentName: string) => {
        setHistory(prev => prev.filter(item => item.timestamp !== timestamp));
        toast.success(`Registro de ${studentName} eliminado del historial`);
    };

    const handleExportExcel = async () => {
        if (history.length === 0) {
            toast.warning("No hay participantes seleccionados para exportar");
            return;
        }
        try {
            setIsExporting("excel");
            toast.loading("Generando Excel corporativo...", { id: "export-roulette" });
            await exportRouletteToCorporateExcel(history, {
                groupName,
                groupCode,
                totalAvailable: candidates.length,
            });
            toast.success("Excel corporativo descargado con éxito", { id: "export-roulette" });
        } catch (error) {
            console.error("Error al exportar a Excel:", error);
            toast.error("Error al generar el archivo Excel", { id: "export-roulette" });
        } finally {
            setIsExporting(null);
        }
    };

    const handleExportPdf = async () => {
        if (history.length === 0) {
            toast.warning("No hay participantes seleccionados para exportar");
            return;
        }
        try {
            setIsExporting("pdf");
            toast.loading("Generando PDF institucional...", { id: "export-roulette" });
            await exportRouletteToCorporatePdf(history, {
                groupName,
                groupCode,
                totalAvailable: candidates.length,
            });
            toast.success("PDF institucional descargado con éxito", { id: "export-roulette" });
        } catch (error) {
            console.error("Error al exportar a PDF:", error);
            toast.error("Error al generar el archivo PDF", { id: "export-roulette" });
        } finally {
            setIsExporting(null);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 h-[calc(100vh-170px)] max-h-[calc(100vh-170px)] w-full overflow-hidden">
            {/* Main Stage (Wheel) */}
            <div className="lg:col-span-7 xl:col-span-8 flex flex-col min-h-0 h-full overflow-hidden">
                <Card className="flex-1 min-h-0 flex flex-col items-center justify-between p-3 sm:p-4 relative overflow-hidden border border-border/70 shadow-2xs bg-card gap-0 py-0">
                    {/* Top Bar inside Card */}
                    <div className="w-full flex items-center justify-between z-10 shrink-0">
                        <Badge variant="outline" className="text-xs px-2.5 py-1 bg-background/80 backdrop-blur font-bold border-border/80">
                            <Users className="w-3.5 h-3.5 mr-1.5 text-primary" />
                            Disponibles: {candidates.length}
                        </Badge>

                        <div className="flex items-center gap-1.5">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        size="icon"
                                        variant="outline"
                                        className="h-8 w-8 rounded-xl bg-background/80 backdrop-blur border-border/80 hover:bg-muted"
                                        onClick={() => setSoundEnabled(!soundEnabled)}
                                    >
                                        {soundEnabled ? <Volume2 className="h-4 w-4 text-primary" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>{soundEnabled ? "Silenciar" : "Activar sonido"}</p></TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        size="icon"
                                        variant="outline"
                                        className="h-8 w-8 rounded-xl bg-background/80 backdrop-blur border-border/80 hover:bg-muted"
                                        onClick={handleReset}
                                        disabled={isSpinning || (candidates.length === initialStudents.length)}
                                    >
                                        <RotateCcw className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Reiniciar Ruleta</p></TooltipContent>
                            </Tooltip>
                        </div>
                    </div>

                    {/* Wheel responsive container - constrained by viewport so it never forces page scroll */}
                    <div className="flex-1 min-h-0 w-full flex items-center justify-center relative p-1 overflow-hidden my-auto">
                        <div className="relative aspect-square h-[min(100%,calc(100vh-210px))] max-h-[min(540px,calc(100vh-210px))] max-w-[min(540px,calc(100vh-210px))] w-auto flex items-center justify-center my-auto">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-3 z-20 text-foreground drop-shadow-md">
                                <ChevronDown className="w-10 h-10 fill-current stroke-[3.5px]" />
                            </div>

                            <motion.div
                                className="w-[92%] h-[92%] rounded-full shadow-2xl border-4 border-muted/80 relative"
                                style={{
                                    rotate: rotation,
                                    originX: 0.5,
                                    originY: 0.5
                                }}
                            >
                                {candidates.length > 0 ? (
                                    <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                                        {candidates.map((student, i) => {
                                            const total = candidates.length;
                                            const angle = 360 / total;
                                            const startAngle = i * angle;
                                            const endAngle = (i + 1) * angle;

                                            const startRad = (startAngle * Math.PI) / 180;
                                            const endRad = (endAngle * Math.PI) / 180;

                                            const x1 = 50 + 50 * Math.cos(startRad);
                                            const y1 = 50 + 50 * Math.sin(startRad);
                                            const x2 = 50 + 50 * Math.cos(endRad);
                                            const y2 = 50 + 50 * Math.sin(endRad);

                                            const largeArc = angle > 180 ? 1 : 0;
                                            const pathData = `M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArc} 1 ${x2} ${y2} Z`;

                                            return (
                                                <g key={student.id}>
                                                    <path
                                                        d={pathData}
                                                        fill={SEGMENT_COLORS[i % SEGMENT_COLORS.length]}
                                                        stroke="white"
                                                        strokeWidth="0.5"
                                                    />
                                                    <text
                                                        x="50"
                                                        y="50"
                                                        fill="black"
                                                        fontSize={Math.max(2, 6 - (total * 0.1))}
                                                        fontWeight="bold"
                                                        textAnchor="end"
                                                        alignmentBaseline="middle"
                                                        transform={`rotate(${startAngle + angle / 2}, 50, 50) translate(46, 0)`}
                                                    >
                                                        {formatName(student.name, student.profile).split(' ')[0]}
                                                    </text>
                                                </g>
                                            );
                                        })}
                                    </svg>
                                ) : (
                                    <div className="w-full h-full rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs font-semibold">
                                        Sin participantes
                                    </div>
                                )}
                            </motion.div>

                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                                <Button
                                    onClick={handleSpin}
                                    disabled={isSpinning || candidates.length === 0}
                                    className={cn(
                                        "w-14 h-14 sm:w-16 sm:h-16 rounded-full shadow-xl border-4 border-background flex flex-col items-center justify-center transition-transform hover:scale-105 active:scale-95 bg-primary text-primary-foreground p-0 cursor-pointer",
                                        isSpinning && "opacity-80 cursor-not-allowed"
                                    )}
                                >
                                    <span className={cn("text-[10px] sm:text-xs font-black uppercase tracking-wider", isSpinning && "animate-pulse")}>
                                        {isSpinning ? "..." : "GIRAR"}
                                    </span>
                                </Button>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Right Stage: History List */}
            <div className="lg:col-span-5 xl:col-span-4 flex flex-col min-h-0 h-full overflow-hidden">
                <Card className="flex-1 min-h-0 flex flex-col h-full overflow-hidden border border-border/70 shadow-2xs bg-card gap-0 py-0">
                    <CardHeader className="p-3 sm:p-3.5 pb-2.5 shrink-0 border-b border-border/50">
                        <div className="flex items-center justify-between gap-2">
                            <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-2">
                                <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
                                <span>Seleccionados ({history.length})</span>
                            </CardTitle>
                            <div className="flex items-center gap-1.5 shrink-0">
                                {candidates.length < initialStudents.length && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 px-2 gap-1 text-[11px] font-semibold rounded-lg text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 shadow-2xs"
                                                onClick={handleReaddAllToRoulette}
                                            >
                                                <RotateCcw className="w-3 h-3" />
                                                <span className="hidden xl:inline">Reincorporar todos</span>
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Reincorporar a todos los aprendices a la ruleta (mantiene las notas e historial)</p>
                                        </TooltipContent>
                                    </Tooltip>
                                )}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 px-2.5 gap-1.5 text-xs font-semibold rounded-lg border-border/80 shadow-2xs"
                                            disabled={history.length === 0 || !!isExporting}
                                        >
                                            {isExporting ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                                            ) : (
                                                <Download className="w-3.5 h-3.5 text-primary" />
                                            )}
                                            <span className="hidden sm:inline">Exportar</span>
                                            <ChevronDown className="w-3 h-3 text-muted-foreground ml-0.5 opacity-70" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5 shadow-xl border-border/80 bg-card">
                                        <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1">
                                            Exportar Historial
                                        </DropdownMenuLabel>
                                        <DropdownMenuItem
                                            onClick={handleExportExcel}
                                            className="flex items-center gap-2.5 py-2 px-2.5 rounded-xl cursor-pointer text-xs font-medium focus:bg-emerald-500/10 focus:text-emerald-700 dark:focus:text-emerald-300"
                                        >
                                            <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                                <FileSpreadsheet className="w-3.5 h-3.5" />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-bold text-foreground">Excel Corporativo</span>
                                                <span className="text-[10px] text-muted-foreground">Formato .xlsx con notas y estados</span>
                                            </div>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={handleExportPdf}
                                            className="flex items-center gap-2.5 py-2 px-2.5 rounded-xl cursor-pointer text-xs font-medium focus:bg-rose-500/10 focus:text-rose-700 dark:focus:text-rose-300"
                                        >
                                            <div className="w-6 h-6 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                                                <FileText className="w-3.5 h-3.5" />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-bold text-foreground">PDF Institucional</span>
                                                <span className="text-[10px] text-muted-foreground">Documento A4 oficial</span>
                                            </div>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                        <CardDescription className="text-[11px]">
                            Historial de turnos y notas registradas
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar p-2.5 sm:p-3">
                        {history.length === 0 ? (
                            <div className="h-full min-h-[150px] flex flex-col items-center justify-center text-center p-6 text-muted-foreground border border-dashed rounded-xl">
                                <Trophy className="w-8 h-8 text-muted-foreground/30 mb-2" />
                                <p className="text-xs font-semibold text-foreground/80">Aún no hay seleccionados</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">Lanza la ruleta para asignar turnos y calificar en vivo.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {history.map((item, i) => {
                                    const isStudentInWheel = candidates.some(c => c.id === item.student?.id);

                                    return (
                                        <div
                                            key={item.timestamp + i}
                                            className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border animate-in slide-in-from-right-5 fade-in duration-300"
                                        >
                                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-background text-xs font-bold text-muted-foreground border">
                                                {history.length - i}
                                            </div>
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={item.student?.image || undefined} />
                                                <AvatarFallback>{formatName(item.student?.name || "", item.student?.profile)[0] || "?"}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                                                <p className="font-medium text-sm bg-transparent truncate">
                                                    {item.student ? getFullName(item.student) : "Aprendiz desconocido"}
                                                </p>

                                                {editingKey === item.timestamp ? (
                                                    <div className="flex items-center gap-1 animate-in fade-in zoom-in-95 shrink-0">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="5"
                                                            step="0.1"
                                                            className="w-12 h-7 text-sm text-center border rounded bg-background"
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            autoFocus
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') saveGrade(item.timestamp);
                                                                if (e.key === 'Escape') cancelEdit();
                                                            }}
                                                        />
                                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => saveGrade(item.timestamp)}>
                                                            <Check className="h-4 w-4" />
                                                        </Button>
                                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={cancelEdit}>
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        {item.grade !== undefined && (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Badge
                                                                        variant={item.grade >= 3 ? "default" : "destructive"}
                                                                        className="text-[10px] h-5 px-1.5 cursor-pointer hover:opacity-80 transition-opacity"
                                                                        onClick={() => startEditing(item)}
                                                                    >
                                                                        {item.grade.toFixed(1)}
                                                                    </Badge>
                                                                </TooltipTrigger>
                                                                <TooltipContent><p>Clic para editar nota</p></TooltipContent>
                                                            </Tooltip>
                                                        )}
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                                                    onClick={() => startEditing(item)}
                                                                >
                                                                    <Pencil className="h-3 w-3" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent><p>Editar nota</p></TooltipContent>
                                                        </Tooltip>

                                                        {isStudentInWheel ? (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Badge
                                                                        variant="outline"
                                                                        className="h-6 px-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 gap-1 select-none cursor-default"
                                                                    >
                                                                        <Check className="w-3 h-3" />
                                                                        <span className="hidden sm:inline">En ruleta</span>
                                                                    </Badge>
                                                                </TooltipTrigger>
                                                                <TooltipContent><p>Este aprendiz ya está activo en la ruleta</p></TooltipContent>
                                                            </Tooltip>
                                                        ) : (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="h-6 px-2 gap-1 text-[10.5px] font-bold rounded-lg text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer"
                                                                        onClick={() => handleReaddStudent(item.student)}
                                                                    >
                                                                        <UserPlus className="h-3 w-3" />
                                                                        <span>Reincorporar</span>
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent><p>Reincorporar a {item.student ? getFullName(item.student) : "este aprendiz"} a la ruleta para que pueda volver a salir</p></TooltipContent>
                                                            </Tooltip>
                                                        )}

                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-6 w-6 text-muted-foreground/60 hover:text-destructive transition-colors"
                                                                    onClick={() => handleDeleteHistoryItem(item.timestamp, item.student ? getFullName(item.student) : "Aprendiz")}
                                                                >
                                                                    <Trash2 className="h-3 w-3" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent><p>Eliminar este registro del historial</p></TooltipContent>
                                                        </Tooltip>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Dialog open={winnerModalOpen} onOpenChange={(open) => {
                if (!open) handleWinnerConfirmed();
            }}>
                <DialogContent className="sm:max-w-md text-center border-none shadow-none bg-transparent">
                    <div className="bg-background rounded-xl border-4 border-primary shadow-2xl p-6 relative overflow-hidden">
                        <div className="absolute inset-0 bg-primary/5 animate-pulse pointer-events-none" />

                        <DialogHeader>
                            <DialogTitle className="text-3xl font-extrabold text-primary mb-2">¡TENEMOS UN GANADOR!</DialogTitle>
                        </DialogHeader>

                        {selected && (
                            <div className="flex flex-col items-center gap-6 py-6 relative z-10">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-yellow-400 rounded-full blur-xl opacity-30 animate-pulse"></div>
                                    <Avatar className="w-32 h-32 border-4 border-background shadow-xl relative z-10">
                                        <AvatarImage src={selected.image || undefined} className="object-cover" />
                                        <AvatarFallback className="text-4xl bg-primary/10 text-primary">
                                            {formatName(selected.name, selected.profile)[0]}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-yellow-900 p-2 rounded-full shadow-lg z-20">
                                        <Trophy className="w-6 h-6 fill-yellow-900" />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <h2 className="text-2xl font-bold">{getFullName(selected)}</h2>
                                </div>

                                <div className="w-full max-w-xs space-y-2">
                                    <label className="text-sm font-medium text-muted-foreground">Asignar Calificación (Opcional)</label>
                                    <div className="flex gap-2 justify-center">
                                        {[1, 2, 3, 4, 5].map((g) => (
                                            <Button
                                                key={g}
                                                variant={grade === g.toString() ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setGrade(g.toString())}
                                                className="w-10 h-10 rounded-full font-bold"
                                            >
                                                {g}
                                            </Button>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2 justify-center mt-2">
                                        <span className="text-xs text-muted-foreground mr-2">O manual:</span>
                                        <input
                                            type="number"
                                            min="0"
                                            max="5"
                                            step="0.1"
                                            value={grade}
                                            onChange={(e) => setGrade(e.target.value)}
                                            className="w-20 p-2 text-center rounded-md border text-sm"
                                            placeholder="0.0"
                                        />
                                    </div>

                                    <div className="pt-2">
                                        <label className="flex items-center justify-center gap-2 p-2 rounded-xl bg-muted/60 border border-border/70 cursor-pointer hover:bg-muted transition-colors select-none">
                                            <input
                                                type="checkbox"
                                                checked={keepInRoulette}
                                                onChange={(e) => setKeepInRoulette(e.target.checked)}
                                                className="rounded border-border text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                                            />
                                            <span className="text-xs font-semibold text-foreground">
                                                Mantener en la ruleta (permitir repetir)
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        <DialogFooter className="justify-center sm:justify-center">
                            <Button
                                size="lg"
                                onClick={handleWinnerConfirmed}
                                className="w-full sm:w-auto text-lg font-semibold"
                            >
                                Confirmar y Continuar
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
        </div >
    );
}
