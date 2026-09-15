"use client";

import React, { useState, useMemo } from "react";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Users,
    CheckCircle2,
    AlertTriangle,
    Clock,
    TrendingUp,
    Award,
    Search,
    Filter,
    ArrowUpDown,
    BarChart3,
    X,
} from "lucide-react";
import { SofiaReportData } from "../types/sofiaReportTypes";
import { cn } from "@/lib/utils";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

interface SofiaReportAnalyticsProps {
    data: SofiaReportData;
}

export function SofiaReportAnalytics({ data }: SofiaReportAnalyticsProps) {
    const rows = data.rows || [];
    const isGroupedHeader = rows[0] && rows[0][0]?.rowSpan === 2;
    const headerRowCount = isGroupedHeader ? 2 : 1;

    // Filter student rows safely (checking all cells for footer mentions)
    const bodyRows = useMemo(() => {
        return rows.filter((row, index) => {
            if (index < headerRowCount) return false;
            const isFooter = row.some((c) => {
                const val = String(c?.value || "").toUpperCase();
                return val.includes("RESULTADOS DE APRENDIZAJE") || val.includes("COMPETENCIAS");
            });
            return !isFooter;
        });
    }, [rows, headerRowCount]);

    // Outcomes row and count
    const bottomResultsRow = useMemo(() => {
        return rows.find((r) =>
            r.some((c) => String(c?.value || "").toUpperCase().includes("RESULTADOS DE APRENDIZAJE"))
        );
    }, [rows]);

    const totalOutcomesCount = useMemo(() => {
        if (isGroupedHeader && rows[1]) {
            return rows[1].length;
        }
        return Math.max(0, (rows[0]?.length || 6) - 6);
    }, [isGroupedHeader, rows]);

    // 1. Status Counts
    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        bodyRows.forEach((row) => {
            const st = row[4] ? String(row[4].value).trim().toUpperCase() : "DESCONOCIDO";
            counts[st] = (counts[st] || 0) + 1;
        });
        return counts;
    }, [bodyRows]);

    const statusChartData = {
        labels: Object.keys(statusCounts),
        datasets: [
            {
                label: "# Aprendices",
                data: Object.values(statusCounts),
                backgroundColor: [
                    "rgba(34, 197, 94, 0.75)",
                    "rgba(239, 68, 68, 0.75)",
                    "rgba(245, 158, 11, 0.75)",
                    "rgba(59, 130, 246, 0.75)",
                    "rgba(168, 85, 247, 0.75)",
                ],
                borderWidth: 1,
            },
        ],
    };

    // 2. Juicios Counts
    const { countApproved, countFailed, countPending, totalEvaluations } = useMemo(() => {
        let approved = 0;
        let failed = 0;
        let pending = 0;
        let total = 0;

        bodyRows.forEach((row) => {
            const evals = row.slice(6);
            evals.forEach((cell) => {
                total++;
                const val = cell ? String(cell.value || "").trim().toUpperCase() : "";
                if (val === "A") {
                    approved++;
                } else if (val === "NA") {
                    failed++;
                } else {
                    pending++;
                }
            });
        });

        return {
            countApproved: approved,
            countFailed: failed,
            countPending: pending,
            totalEvaluations: total,
        };
    }, [bodyRows]);

    const juiciosChartData = {
        labels: ["Aprobados (A)", "Por Evaluar", "No Aprobados (NA)"],
        datasets: [
            {
                data: [countApproved, countPending, countFailed],
                backgroundColor: [
                    "rgba(34, 197, 94, 0.8)",
                    "rgba(148, 163, 184, 0.8)",
                    "rgba(239, 68, 68, 0.8)",
                ],
                borderWidth: 1,
            },
        ],
    };

    // Periods / Trimestres mapping
    const periods = useMemo(() => {
        if (!isGroupedHeader || !rows[0]) return [];
        const list: { id: string; name: string; startIndex: number; endIndex: number }[] = [];
        let offset = 0;
        for (let i = 6; i < rows[0].length; i++) {
            const cell = rows[0][i];
            const span = cell?.colSpan || 1;
            const name = String(cell?.value || `Periodo ${i - 5}`).trim();
            list.push({
                id: `period-${i}`,
                name,
                startIndex: offset,
                endIndex: offset + span,
            });
            offset += span;
        }
        return list;
    }, [isGroupedHeader, rows]);

    // 3. Outcomes Analytics (Approval, Failure, Pending per outcome)
    const [outcomeSearch, setOutcomeSearch] = useState("");
    const [outcomeEvalFilter, setOutcomeEvalFilter] = useState<
        "all" | "evaluated" | "approved" | "deficit" | "pending"
    >("all");
    const [outcomePeriodFilter, setOutcomePeriodFilter] = useState<string>("all");
    const [outcomeLimit, setOutcomeLimit] = useState<"all" | "25" | "10">("all");
    const [outcomeSortOrder, setOutcomeSortOrder] = useState<
        "asc" | "desc" | "deficit" | "index"
    >("asc");
    const [outcomeOrientation, setOutcomeOrientation] = useState<"horizontal" | "vertical">("horizontal");

    const outcomeStats = useMemo(() => {
        const list = [];
        const totalStudents = bodyRows.length;

        for (let i = 0; i < totalOutcomesCount; i++) {
            const shortLabel = isGroupedHeader && rows[1]?.[i]
                ? String(rows[1][i].value || `RA ${i + 1}`)
                : `RA ${i + 1}`;

            const fullDesc = bottomResultsRow?.[6 + i]
                ? String(bottomResultsRow[6 + i].value || shortLabel)
                : shortLabel;

            const periodObj = periods.find((p) => i >= p.startIndex && i < p.endIndex);
            const periodName = periodObj ? periodObj.name : "";

            let outcomeA = 0;
            let outcomeNA = 0;
            let outcomePE = 0;

            bodyRows.forEach((row) => {
                const cell = row[6 + i];
                const val = cell ? String(cell.value || "").trim().toUpperCase() : "";
                if (val === "A") outcomeA++;
                else if (val === "NA") outcomeNA++;
                else outcomePE++;
            });

            const rateA = totalStudents > 0 ? parseFloat(((outcomeA / totalStudents) * 100).toFixed(1)) : 0;
            const rateNA = totalStudents > 0 ? parseFloat(((outcomeNA / totalStudents) * 100).toFixed(1)) : 0;
            const ratePE = Math.max(0, parseFloat((100 - rateA - rateNA).toFixed(1)));
            const totalEvaluated = outcomeA + outcomeNA;

            list.push({
                index: i + 1,
                label: shortLabel,
                fullName: fullDesc,
                period: periodName,
                approved: outcomeA,
                failed: outcomeNA,
                pending: outcomePE,
                rateA,
                rateNA,
                ratePE,
                totalEvaluated,
            });
        }
        return list;
    }, [bodyRows, totalOutcomesCount, isGroupedHeader, rows, bottomResultsRow, periods]);

    // Summary metrics across all outcomes
    const outcomeMetrics = useMemo(() => {
        let evaluated = 0;
        let approvedAll = 0;
        let deficit = 0;
        let pendingAll = 0;

        outcomeStats.forEach((o) => {
            if (o.totalEvaluated > 0) evaluated++;
            if (o.rateA >= 99.9) approvedAll++;
            if (o.failed > 0) deficit++;
            if (o.totalEvaluated === 0) pendingAll++;
        });

        return {
            total: outcomeStats.length,
            evaluated,
            approvedAll,
            deficit,
            pendingAll,
        };
    }, [outcomeStats]);

    // Filter and sort outcomes based on user selections
    const filteredOutcomes = useMemo(() => {
        let pool = [...outcomeStats];

        // Filter by search text
        if (outcomeSearch.trim()) {
            const q = outcomeSearch.toLowerCase();
            pool = pool.filter(
                (o) =>
                    o.label.toLowerCase().includes(q) ||
                    o.fullName.toLowerCase().includes(q) ||
                    o.period.toLowerCase().includes(q) ||
                    `ra ${o.index}`.toLowerCase().includes(q)
            );
        }

        // Filter by Period
        if (outcomePeriodFilter !== "all") {
            pool = pool.filter((o) => o.period === outcomePeriodFilter);
        }

        // Filter by Evaluation status
        if (outcomeEvalFilter === "evaluated") {
            pool = pool.filter((o) => o.totalEvaluated > 0);
        } else if (outcomeEvalFilter === "approved") {
            pool = pool.filter((o) => o.rateA >= 99.9);
        } else if (outcomeEvalFilter === "deficit") {
            pool = pool.filter((o) => o.failed > 0);
        } else if (outcomeEvalFilter === "pending") {
            pool = pool.filter((o) => o.totalEvaluated === 0);
        }

        // Sort
        pool.sort((a, b) => {
            if (outcomeSortOrder === "asc") {
                if (a.rateA !== b.rateA) return a.rateA - b.rateA;
                return b.rateNA - a.rateNA;
            } else if (outcomeSortOrder === "desc") {
                if (b.rateA !== a.rateA) return b.rateA - a.rateA;
                return a.rateNA - b.rateNA;
            } else if (outcomeSortOrder === "deficit") {
                if (b.rateNA !== a.rateNA) return b.rateNA - a.rateNA;
                return a.rateA - b.rateA;
            } else {
                return a.index - b.index;
            }
        });

        // Limit
        if (outcomeLimit === "10") {
            return pool.slice(0, 10);
        } else if (outcomeLimit === "25") {
            return pool.slice(0, 25);
        }
        return pool;
    }, [
        outcomeStats,
        outcomeSearch,
        outcomePeriodFilter,
        outcomeEvalFilter,
        outcomeSortOrder,
        outcomeLimit,
    ]);

    // Stacked Bar Chart for Outcomes: guarantees NO blank/empty chart even when rateA is 0!
    const outcomesBarData = useMemo(() => {
        return {
            labels: filteredOutcomes.map((o) => {
                if (outcomeOrientation === "horizontal") {
                    const cleanLabel = o.label || `RA ${o.index}`;
                    const desc = o.fullName && o.fullName !== o.label ? `: ${o.fullName}` : "";
                    const full = `${cleanLabel}${desc}`;
                    return full.length > 38 ? full.substring(0, 36) + "..." : full;
                } else {
                    const labelText = o.label || `RA ${o.index}`;
                    return labelText.length > 18 ? labelText.substring(0, 16) + "..." : labelText;
                }
            }),
            datasets: [
                {
                    label: "% Aprobados (A)",
                    data: filteredOutcomes.map((o) => o.rateA),
                    backgroundColor: "rgba(34, 197, 94, 0.85)",
                    borderColor: "rgba(34, 197, 94, 1)",
                    borderWidth: 1,
                },
                {
                    label: "% No Aprobados (NA)",
                    data: filteredOutcomes.map((o) => o.rateNA),
                    backgroundColor: "rgba(239, 68, 68, 0.85)",
                    borderColor: "rgba(239, 68, 68, 1)",
                    borderWidth: 1,
                },
                {
                    label: "% Por Evaluar",
                    data: filteredOutcomes.map((o) => o.ratePE),
                    backgroundColor: "rgba(148, 163, 184, 0.45)",
                    borderColor: "rgba(148, 163, 184, 0.8)",
                    borderWidth: 1,
                },
            ],
        };
    }, [filteredOutcomes, outcomeOrientation]);

    const outcomeChartOptions = useMemo(() => {
        const isHorizontal = outcomeOrientation === "horizontal";
        return {
            indexAxis: isHorizontal ? ("y" as const) : ("x" as const),
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true,
                    min: 0,
                    max: 100,
                    ticks: {
                        callback: (v: any) => `${v}%`,
                        font: { size: isHorizontal ? 10 : 8.5 },
                        ...(isHorizontal ? {} : { maxRotation: 35, minRotation: 20 }),
                    },
                    grid: {
                        color: isHorizontal ? "rgba(148, 163, 184, 0.15)" : undefined,
                        display: !isHorizontal ? false : undefined,
                    },
                },
                y: {
                    stacked: true,
                    min: isHorizontal ? undefined : 0,
                    max: isHorizontal ? undefined : 100,
                    ticks: {
                        callback: isHorizontal ? undefined : (v: any) => `${v}%`,
                        font: { size: isHorizontal ? 9.5 : 9 },
                    },
                    grid: {
                        display: isHorizontal ? false : undefined,
                        color: !isHorizontal ? "rgba(148, 163, 184, 0.15)" : undefined,
                    },
                },
            },
            plugins: {
                legend: {
                    position: "top" as const,
                    labels: { boxWidth: 12, font: { size: 11 } },
                },
                tooltip: {
                    callbacks: {
                        title: (items: any[]) => {
                            const idx = items[0]?.dataIndex;
                            const o = filteredOutcomes[idx];
                            if (!o) return "";
                            return `${o.label} — ${o.fullName}${o.period ? ` (${o.period})` : ""}`;
                        },
                        label: (item: any) => {
                            const idx = item.dataIndex;
                            const o = filteredOutcomes[idx];
                            if (!o) return "";
                            if (item.datasetIndex === 0) {
                                return `Aprobados: ${o.approved} de ${bodyRows.length} (${o.rateA}%)`;
                            } else if (item.datasetIndex === 1) {
                                return `No Aprobados: ${o.failed} de ${bodyRows.length} (${o.rateNA}%)`;
                            } else {
                                return `Por Evaluar: ${o.pending} de ${bodyRows.length} (${o.ratePE}%)`;
                            }
                        },
                    },
                },
            },
        };
    }, [outcomeOrientation, filteredOutcomes, bodyRows.length]);

    // 4. Students Analytics & Full Bar Chart for ALL Students
    const [studentSearch, setStudentSearch] = useState("");
    const [studentStatusFilter, setStudentStatusFilter] = useState("all");
    const [studentSortOrder, setStudentSortOrder] = useState<"asc" | "desc" | "name">("asc");

    const allStudents = useMemo(() => {
        return bodyRows.map((row, idx) => {
            const doc = String(row[1]?.value || "");
            const firstName = String(row[2]?.value || "");
            const lastName = String(row[3]?.value || "");
            const fullName = `${lastName} ${firstName}`.trim() || `Aprendiz ${row[0]?.value || idx + 1}`;
            const estado = String(row[4]?.value || "EN FORMACION").trim().toUpperCase();
            const percentStr = String(row[5]?.value || "0%");
            const percent = parseFloat(percentStr.replace("%", "")) || 0;

            let countA = 0;
            let countNA = 0;
            let countPE = 0;

            for (let k = 0; k < totalOutcomesCount; k++) {
                const cell = row[6 + k];
                const val = cell ? String(cell.value || "").trim().toUpperCase() : "";
                if (val === "A") countA++;
                else if (val === "NA") countNA++;
                else countPE++;
            }

            const total = totalOutcomesCount || (countA + countNA + countPE);
            const pctA = total > 0 ? parseFloat(((countA / total) * 100).toFixed(1)) : 0;
            const pctNA = total > 0 ? parseFloat(((countNA / total) * 100).toFixed(1)) : 0;
            const pctPE = Math.max(0, parseFloat((100 - pctA - pctNA).toFixed(1)));

            return {
                idx: idx + 1,
                doc,
                firstName,
                lastName,
                fullName,
                estado,
                percent,
                countA,
                countNA,
                countPE,
                total,
                pctA,
                pctNA,
                pctPE,
            };
        });
    }, [bodyRows, totalOutcomesCount]);

    // Filter and sort students for the chart
    const filteredStudents = useMemo(() => {
        return allStudents
            .filter((s) => {
                if (studentStatusFilter !== "all" && s.estado !== studentStatusFilter) {
                    return false;
                }
                if (studentSearch.trim()) {
                    const q = studentSearch.toLowerCase();
                    return (
                        s.fullName.toLowerCase().includes(q) ||
                        s.doc.toLowerCase().includes(q)
                    );
                }
                return true;
            })
            .sort((a, b) => {
                if (studentSortOrder === "asc") {
                    return a.pctA - b.pctA; // Lowest progress first
                } else if (studentSortOrder === "desc") {
                    return b.pctA - a.pctA; // Highest progress first
                } else {
                    return a.fullName.localeCompare(b.fullName);
                }
            });
    }, [allStudents, studentStatusFilter, studentSearch, studentSortOrder]);

    // Horizontal Bar Chart for ALL Students
    const studentsBarData = useMemo(() => {
        return {
            labels: filteredStudents.map((s) => {
                return s.fullName.length > 25 ? s.fullName.substring(0, 23) + "..." : s.fullName;
            }),
            datasets: [
                {
                    label: "% Aprobados (A)",
                    data: filteredStudents.map((s) => s.pctA),
                    backgroundColor: "rgba(34, 197, 94, 0.85)",
                    borderColor: "rgba(34, 197, 94, 1)",
                    borderWidth: 1,
                },
                {
                    label: "% No Aprobados (NA)",
                    data: filteredStudents.map((s) => s.pctNA),
                    backgroundColor: "rgba(239, 68, 68, 0.85)",
                    borderColor: "rgba(239, 68, 68, 1)",
                    borderWidth: 1,
                },
                {
                    label: "% Por Evaluar",
                    data: filteredStudents.map((s) => s.pctPE),
                    backgroundColor: "rgba(148, 163, 184, 0.45)",
                    borderColor: "rgba(148, 163, 184, 0.8)",
                    borderWidth: 1,
                },
            ],
        };
    }, [filteredStudents]);

    // Student summary metrics
    const studentMetrics = useMemo(() => {
        let high = 0;
        let medium = 0;
        let low = 0;
        allStudents.forEach((s) => {
            if (s.pctA >= 70) high++;
            else if (s.pctA >= 40) medium++;
            else low++;
        });
        return { high, medium, low };
    }, [allStudents]);

    // Priority learners
    const lowestLearners = useMemo(() => {
        return allStudents
            .filter((l) => l.estado === "EN FORMACION" || l.estado === "CONDICIONADO")
            .sort((a, b) => a.pctA - b.pctA)
            .slice(0, 6);
    }, [allStudents]);

    const generalApprovalRate =
        totalEvaluations > 0 ? ((countApproved / totalEvaluations) * 100).toFixed(1) : "0.0";

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border border-border/70 shadow-2xs">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Total Aprendices
                            </span>
                            <h3 className="text-2xl font-bold text-foreground">{bodyRows.length}</h3>
                            <p className="text-[11px] text-muted-foreground">
                                {statusCounts["EN FORMACION"] || bodyRows.length} en formación activa
                            </p>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 border border-blue-500/20">
                            <Users className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-border/70 shadow-2xs">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Tasa de Aprobación
                            </span>
                            <h3 className="text-2xl font-bold text-emerald-600">{generalApprovalRate}%</h3>
                            <p className="text-[11px] text-muted-foreground">{countApproved} juicios aprobados</p>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 border border-emerald-500/20">
                            <CheckCircle2 className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-border/70 shadow-2xs">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Juicios Pendientes
                            </span>
                            <h3 className="text-2xl font-bold text-amber-500">{countPending}</h3>
                            <p className="text-[11px] text-muted-foreground">Por evaluar en plataforma</p>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 border border-amber-500/20">
                            <Clock className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-border/70 shadow-2xs">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                No Aprobados (Deficit)
                            </span>
                            <h3 className="text-2xl font-bold text-rose-500">{countFailed}</h3>
                            <p className="text-[11px] text-muted-foreground">Requieren plan de mejoramiento</p>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600 border border-rose-500/20">
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Global Distribution Doughnuts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Juicios Breakdown Doughnut */}
                <Card className="border border-border/70 shadow-2xs">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
                            Distribución Global de Juicios
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Proporción general de calificaciones emitidas en la ficha ({totalEvaluations} registros)
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center pt-2">
                        <div className="w-52 h-52 relative">
                            <Doughnut
                                data={juiciosChartData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: { legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 10 } } } },
                                }}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Aprendices Status Breakdown */}
                <Card className="border border-border/70 shadow-2xs">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
                            Condición de Aprendices
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Distribución de aprendices por estado en la ficha ({bodyRows.length} aprendices)
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center pt-2">
                        <div className="w-52 h-52 relative">
                            <Doughnut
                                data={statusChartData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: { legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 10 } } } },
                                }}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ── 3. RESULTADOS DE APRENDIZAJE (RA) ── */}
            <Card className="border border-border/70 shadow-2xs">
                <CardHeader className="pb-3 border-b border-border/50">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div>
                            <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-primary" />
                                Resultados de Aprendizaje ({filteredOutcomes.length} de {outcomeStats.length})
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Distribución de Aprobados, No Aprobados y Pendientes por cada Resultado de Aprendizaje
                            </CardDescription>
                        </div>

                        {/* Summary Badges */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant="outline" className="text-[10px] text-muted-foreground border-border/60 bg-muted/20 gap-1 font-semibold">
                                Total: {outcomeMetrics.total} RA
                            </Badge>
                            <Badge variant="outline" className="text-[10px] text-blue-700 dark:text-blue-300 border-blue-500/30 bg-blue-500/10 gap-1 font-semibold">
                                Evaluados: {outcomeMetrics.evaluated}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] text-emerald-700 dark:text-emerald-300 border-emerald-500/30 bg-emerald-500/10 gap-1 font-semibold">
                                <CheckCircle2 className="w-3 h-3" />
                                100% Aprobados: {outcomeMetrics.approvedAll}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] text-rose-700 dark:text-rose-300 border-rose-500/30 bg-rose-500/10 gap-1 font-semibold">
                                <AlertTriangle className="w-3 h-3" />
                                Con Déficit (NA): {outcomeMetrics.deficit}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] text-amber-700 dark:text-amber-300 border-amber-500/30 bg-amber-500/10 gap-1 font-semibold">
                                <Clock className="w-3 h-3" />
                                Pendientes: {outcomeMetrics.pendingAll}
                            </Badge>
                        </div>
                    </div>

                    {/* Filter & Search Toolbar */}
                    <div className="pt-2.5 flex flex-col gap-2">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 flex-wrap">
                            {/* Search Input */}
                            <div className="relative flex-1 min-w-[220px] max-w-sm">
                                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground pointer-events-none" />
                                <Input
                                    value={outcomeSearch}
                                    onChange={(e) => setOutcomeSearch(e.target.value)}
                                    placeholder="Buscar RA por nombre, código o competencia..."
                                    className="h-8 text-xs pl-8 pr-7 rounded-lg"
                                />
                                {outcomeSearch && (
                                    <button
                                        type="button"
                                        onClick={() => setOutcomeSearch("")}
                                        className="absolute right-2 top-2 text-muted-foreground hover:text-foreground cursor-pointer"
                                        title="Limpiar búsqueda"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            {/* Evaluation Status Filter */}
                            <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border border-border/50 text-xs flex-wrap">
                                <span className="text-[10px] text-muted-foreground font-semibold px-1.5">Estado:</span>
                                {[
                                    { id: "all", label: "Todos" },
                                    { id: "evaluated", label: "Evaluados" },
                                    { id: "approved", label: "100% Aprobados" },
                                    { id: "deficit", label: "Con No Aprobados" },
                                    { id: "pending", label: "Pendientes" },
                                ].map((f) => (
                                    <button
                                        key={f.id}
                                        type="button"
                                        onClick={() => setOutcomeEvalFilter(f.id as any)}
                                        className={cn(
                                            "px-2 py-0.5 rounded text-[10.5px] font-medium transition-all cursor-pointer",
                                            outcomeEvalFilter === f.id
                                                ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                        )}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>

                            {/* Period Filter if available */}
                            {periods.length > 1 && (
                                <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border border-border/50 text-xs">
                                    <span className="text-[10px] text-muted-foreground font-semibold px-1.5">Periodo:</span>
                                    <select
                                        value={outcomePeriodFilter}
                                        onChange={(e) => setOutcomePeriodFilter(e.target.value)}
                                        className="bg-transparent text-[11px] font-medium text-foreground py-0.5 px-1 rounded border-none focus:outline-none cursor-pointer"
                                    >
                                        <option value="all" className="bg-popover text-foreground">Todos los Periodos</option>
                                        {periods.map((p) => (
                                            <option key={p.id} value={p.name} className="bg-popover text-foreground">
                                                {p.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* Secondary Toolbar: Quantity Limit + Sort + Orientation */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1 border-t border-border/40 flex-wrap">
                            {/* Quantity Limit */}
                            <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border border-border/50 text-xs">
                                <span className="text-[10px] text-muted-foreground font-semibold px-1.5">Mostrar:</span>
                                {[
                                    { id: "all", label: `Todos (${outcomeStats.length})` },
                                    { id: "25", label: "Top 25" },
                                    { id: "10", label: "Top 10" },
                                ].map((l) => (
                                    <button
                                        key={l.id}
                                        type="button"
                                        onClick={() => setOutcomeLimit(l.id as any)}
                                        className={cn(
                                            "px-2 py-0.5 rounded text-[10.5px] font-medium transition-all cursor-pointer",
                                            outcomeLimit === l.id
                                                ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                        )}
                                    >
                                        {l.label}
                                    </button>
                                ))}
                            </div>

                            {/* Sort Order */}
                            <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border border-border/50 text-xs flex-wrap">
                                <span className="text-[10px] text-muted-foreground font-semibold px-1.5 flex items-center gap-0.5">
                                    <ArrowUpDown className="w-2.5 h-2.5" /> Orden:
                                </span>
                                {[
                                    { id: "asc", label: "Menor Avance", title: "Menor porcentaje de aprobación primero" },
                                    { id: "desc", label: "Mayor Avance", title: "Mayor porcentaje de aprobación primero" },
                                    { id: "deficit", label: "Mayor Déficit", title: "Mayor porcentaje de no aprobados primero" },
                                    { id: "index", label: "Curricular (1..N)", title: "Orden según plan de estudios" },
                                ].map((s) => (
                                    <button
                                        key={s.id}
                                        type="button"
                                        onClick={() => setOutcomeSortOrder(s.id as any)}
                                        className={cn(
                                            "px-2 py-0.5 rounded text-[10.5px] font-medium transition-all cursor-pointer",
                                            outcomeSortOrder === s.id
                                                ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                        )}
                                        title={s.title}
                                    >
                                        {s.label}
                                    </button>
                                ))}
                            </div>

                            {/* Orientation Toggle */}
                            <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border border-border/50 text-xs self-end sm:self-auto">
                                <span className="text-[10px] text-muted-foreground font-semibold px-1.5">Vista:</span>
                                <button
                                    type="button"
                                    onClick={() => setOutcomeOrientation("horizontal")}
                                    className={cn(
                                        "px-2 py-0.5 rounded text-[10.5px] font-medium transition-all cursor-pointer",
                                        outcomeOrientation === "horizontal"
                                            ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                    )}
                                    title="Barras horizontales con nombres legibles"
                                >
                                    Barras Horizontales
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setOutcomeOrientation("vertical")}
                                    className={cn(
                                        "px-2 py-0.5 rounded text-[10.5px] font-medium transition-all cursor-pointer",
                                        outcomeOrientation === "vertical"
                                            ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                    )}
                                    title="Columnas verticales panorámicas"
                                >
                                    Columnas
                                </button>
                            </div>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-4">
                    {filteredOutcomes.length === 0 ? (
                        <div className="p-8 text-center text-xs text-muted-foreground">
                            <p>No se encontraron resultados de aprendizaje con los filtros aplicados.</p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setOutcomeSearch("");
                                    setOutcomeEvalFilter("all");
                                    setOutcomePeriodFilter("all");
                                    setOutcomeLimit("all");
                                    setOutcomeSortOrder("asc");
                                }}
                                className="mt-3 text-xs h-7"
                            >
                                Restablecer filtros
                            </Button>
                        </div>
                    ) : outcomeOrientation === "horizontal" ? (
                        <div
                            className="w-full overflow-y-auto max-h-[620px] pr-2"
                            style={{
                                height: `${Math.max(340, filteredOutcomes.length * 30 + 60)}px`,
                            }}
                        >
                            <Bar data={outcomesBarData} options={outcomeChartOptions} />
                        </div>
                    ) : (
                        <div className="w-full overflow-x-auto pb-2">
                            <div
                                style={{
                                    minWidth: `${Math.max(600, filteredOutcomes.length * 48)}px`,
                                    height: "380px",
                                }}
                            >
                                <Bar data={outcomesBarData} options={outcomeChartOptions} />
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ── 5. GRÁFICO DE BARRAS POR TODOS LOS ESTUDIANTES ── */}
            <Card className="border border-border/70 shadow-2xs">
                <CardHeader className="pb-3 border-b border-border/50">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div>
                            <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-primary" />
                                Avance Individual — Todos los Estudiantes ({filteredStudents.length} de {allStudents.length})
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Gráfico de barras comparativo del avance de juicios para cada aprendiz de la ficha
                            </CardDescription>
                        </div>

                        {/* Summary Badges */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant="outline" className="text-[10px] text-emerald-700 dark:text-emerald-300 border-emerald-500/30 bg-emerald-500/10 gap-1 font-semibold">
                                <CheckCircle2 className="w-3 h-3" />
                                Al Día (&gt;70%): {studentMetrics.high}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] text-amber-700 dark:text-amber-300 border-amber-500/30 bg-amber-500/10 gap-1 font-semibold">
                                <Clock className="w-3 h-3" />
                                En Riesgo (40-70%): {studentMetrics.medium}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] text-rose-700 dark:text-rose-300 border-rose-500/30 bg-rose-500/10 gap-1 font-semibold">
                                <AlertTriangle className="w-3 h-3" />
                                Crítico (&lt;40%): {studentMetrics.low}
                            </Badge>
                        </div>
                    </div>

                    {/* Filter & Search Toolbar */}
                    <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                        {/* Search Input */}
                        <div className="relative flex-1 max-w-sm">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground pointer-events-none" />
                            <Input
                                value={studentSearch}
                                onChange={(e) => setStudentSearch(e.target.value)}
                                placeholder="Buscar estudiante por nombre o documento..."
                                className="h-8 text-xs pl-8 pr-7 rounded-lg"
                            />
                            {studentSearch && (
                                <button
                                    type="button"
                                    onClick={() => setStudentSearch("")}
                                    className="absolute right-2 top-2 text-muted-foreground hover:text-foreground cursor-pointer"
                                    title="Limpiar búsqueda"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Controls: Status & Sort */}
                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Status Filter */}
                            <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border border-border/50 text-xs">
                                <span className="text-[10px] text-muted-foreground font-semibold px-1.5">Estado:</span>
                                {["all", "EN FORMACION", "CONDICIONADO"].map((st) => (
                                    <button
                                        key={st}
                                        type="button"
                                        onClick={() => setStudentStatusFilter(st)}
                                        className={cn(
                                            "px-2 py-0.5 rounded text-[10.5px] font-medium transition-all cursor-pointer",
                                            studentStatusFilter === st
                                                ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                        )}
                                    >
                                        {st === "all" ? "Todos" : st === "EN FORMACION" ? "En Formación" : "Condicionados"}
                                    </button>
                                ))}
                            </div>

                            {/* Sort Filter */}
                            <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border border-border/50 text-xs">
                                <span className="text-[10px] text-muted-foreground font-semibold px-1.5 flex items-center gap-0.5">
                                    <ArrowUpDown className="w-2.5 h-2.5" /> Orden:
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setStudentSortOrder("asc")}
                                    className={cn(
                                        "px-2 py-0.5 rounded text-[10.5px] font-medium transition-all cursor-pointer",
                                        studentSortOrder === "asc"
                                            ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                    )}
                                    title="Aprendices con menor avance primero"
                                >
                                    Menor Avance
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStudentSortOrder("desc")}
                                    className={cn(
                                        "px-2 py-0.5 rounded text-[10.5px] font-medium transition-all cursor-pointer",
                                        studentSortOrder === "desc"
                                            ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                    )}
                                    title="Aprendices con mayor avance primero"
                                >
                                    Mayor Avance
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStudentSortOrder("name")}
                                    className={cn(
                                        "px-2 py-0.5 rounded text-[10.5px] font-medium transition-all cursor-pointer",
                                        studentSortOrder === "name"
                                            ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                    )}
                                    title="Orden alfabético por apellidos"
                                >
                                    A - Z
                                </button>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-4">
                    {filteredStudents.length === 0 ? (
                        <div className="p-8 text-center text-xs text-muted-foreground">
                            No se encontraron aprendices con los filtros especificados.
                        </div>
                    ) : (
                        <div
                            className="w-full overflow-y-auto max-h-[600px] pr-2"
                            style={{
                                height: `${Math.max(320, filteredStudents.length * 28 + 60)}px`,
                            }}
                        >
                            <Bar
                                data={studentsBarData}
                                options={{
                                    indexAxis: "y",
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    scales: {
                                        x: {
                                            stacked: true,
                                            min: 0,
                                            max: 100,
                                            ticks: { callback: (v) => `${v}%`, font: { size: 10 } },
                                            grid: { color: "rgba(148, 163, 184, 0.15)" },
                                        },
                                        y: {
                                            stacked: true,
                                            ticks: { font: { size: 9.5 } },
                                            grid: { display: false },
                                        },
                                    },
                                    plugins: {
                                        legend: {
                                            position: "top",
                                            labels: { boxWidth: 12, font: { size: 11 } },
                                        },
                                        tooltip: {
                                            callbacks: {
                                                title: (items) => {
                                                    const index = items[0]?.dataIndex;
                                                    const s = filteredStudents[index];
                                                    return s ? `${s.fullName} • Doc: ${s.doc} (${s.estado})` : "";
                                                },
                                                label: (item) => {
                                                    const index = item.dataIndex;
                                                    const s = filteredStudents[index];
                                                    if (!s) return "";
                                                    if (item.datasetIndex === 0) {
                                                        return `Aprobados: ${s.countA} de ${s.total} RA (${s.pctA}%)`;
                                                    } else if (item.datasetIndex === 1) {
                                                        return `No Aprobados: ${s.countNA} de ${s.total} RA (${s.pctNA}%)`;
                                                    } else {
                                                        return `Por Evaluar: ${s.countPE} de ${s.total} RA (${s.pctPE}%)`;
                                                    }
                                                },
                                            },
                                        },
                                    },
                                }}
                            />
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Learners at Risk Table */}
            <Card className="border border-border/70 shadow-2xs">
                <CardHeader className="pb-3 border-b border-border/50">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                        <Award className="w-4 h-4 text-amber-500" />
                        Aprendices que Requieren Atención Prioritaria (Menor % de Aprobación)
                    </CardTitle>
                    <CardDescription className="text-xs">
                        Listado de aprendices en formación con menor avance acumulado en la ficha
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-border/60 text-xs">
                        {lowestLearners.length === 0 ? (
                            <div className="p-4 text-center text-muted-foreground">
                                No se identificaron aprendices en riesgo crítico.
                            </div>
                        ) : (
                            lowestLearners.map((learner, idx) => (
                                <div
                                    key={`risk-${learner.doc}-${idx}`}
                                    className="p-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center font-bold text-[11px] text-muted-foreground">
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <span className="font-bold text-foreground block">{learner.fullName}</span>
                                            <span className="text-[11px] text-muted-foreground">Doc: {learner.doc}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge
                                            variant="outline"
                                            className={
                                                learner.pctA >= 70
                                                    ? "text-emerald-600 border-emerald-500/30 bg-emerald-500/5 font-bold"
                                                    : learner.pctA >= 40
                                                    ? "text-amber-600 border-amber-500/30 bg-amber-500/5 font-bold"
                                                    : "text-rose-600 border-rose-500/30 bg-rose-500/5 font-bold"
                                            }
                                        >
                                            {learner.pctA.toFixed(1)}% Avance
                                        </Badge>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
