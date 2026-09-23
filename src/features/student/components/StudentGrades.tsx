"use client";

import React, { useEffect, useState } from "react";
import { getStudentGrades } from "@/features/teacher/actions/gradeActions";
import { authClient } from "@/lib/auth-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BookOpen, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { calculateTotalScheduledHours, calculateStudentAttendanceLoss, calculatePenalizedGrade } from "@/lib/gradePenaltyUtils";

export function StudentGrades() {
  const [courses, setCourses] = useState<any[]>([]);
  const [studentUserId, setStudentUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGrades = async () => {
      try {
        const session = await authClient.getSession();
        if (session?.data?.user?.id) {
          setStudentUserId(session.data.user.id);
          const data = await getStudentGrades(session.data.user.id);
          setCourses(data);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchGrades();
  }, []);

  if (loading) {
    return <div className="py-12 text-center text-muted-foreground animate-pulse">Cargando calificaciones...</div>;
  }

  if (courses.length === 0) {
    return (
      <Card className="py-24 text-center border-dashed">
        <CardContent className="flex flex-col items-center justify-center pt-6">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <CardTitle className="text-xl font-bold mb-2">Sin Materias</CardTitle>
          <p className="text-muted-foreground">No estás inscrito en ninguna materia actualmente.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {courses.map(course => {
        let totalScore = 0;
        let totalWeight = 0;
        let count = 0;
        
        course.activities.forEach((act: any) => {
          const grade = act.grades[0];
          if (grade) {
            totalScore += grade.score * (act.weight / 100);
            totalWeight += act.weight;
            count++;
          }
        });

        const hasGrades = totalWeight > 0 || count > 0;
        const rawGrade = hasGrades ? (totalWeight > 0 ? totalScore / (totalWeight / 100) : totalScore / count) : null;

        // Cálculo de horas de inasistencia y penalización
        let loss: any = null;
        let totalScheduledHours = 0;
        let penaltyResult: any = null;
        let finalDisplay = rawGrade !== null ? rawGrade.toFixed(2) : "-";

        if (course.attendancePenaltyEnabled) {
          totalScheduledHours = calculateTotalScheduledHours(course, course.group, null, course.attendances || []);
          loss = calculateStudentAttendanceLoss(studentUserId, course.id, course.attendances || [], course, course.group);
          
          if (rawGrade !== null) {
            penaltyResult = calculatePenalizedGrade({
              rawGrade,
              penaltyEnabled: true,
              maxPenaltyPercentage: course.maxPenaltyPercentage || 0,
              totalLostHours: loss.totalLostHours,
              totalScheduledHours,
              lossDetails: {
                absentHours: loss.absentHours,
                lateHours: loss.lateHours,
                leaveHours: loss.leaveHours,
                absentCount: loss.absentCount,
                lateCount: loss.lateCount,
                leaveCount: loss.leaveCount,
              },
            });

            finalDisplay = penaltyResult.finalGrade.toFixed(2);
          }
        }

        const avgNum = parseFloat(finalDisplay);

        return (
          <Card key={course.id} className="overflow-hidden border-border/50 shadow-sm">
            <CardHeader className="bg-muted/10 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-xl">{course.title}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Actividades Evaluativas
                </p>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-sm font-medium text-muted-foreground">
                  {course.attendancePenaltyEnabled ? "Nota Definitiva" : "Promedio Actual"}
                </span>
                <div className="flex items-baseline gap-2">
                  {penaltyResult?.isPenaltyApplied && (
                    <span className="text-xs text-muted-foreground line-through font-semibold">
                      {rawGrade?.toFixed(2)}
                    </span>
                  )}
                  <span className={`text-2xl font-black ${!isNaN(avgNum) && avgNum < 3.0 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {finalDisplay}
                  </span>
                </div>
                {/* Badge visible con las horas de inasistencia acumuladas */}
                {course.attendancePenaltyEnabled && loss && (
                  <div className="flex items-center gap-1.5 mt-1">
                    {loss.totalLostHours > 0 ? (
                      <Badge variant="outline" className="text-[11px] font-bold border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 gap-1 py-0.5 shadow-2xs">
                        <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>{loss.totalLostHours}h inasistencia</span>
                        {penaltyResult?.isPenaltyApplied && (
                          <span className="font-extrabold text-amber-800 dark:text-amber-200">
                            (-{penaltyResult.discountPoints.toFixed(2)} pts)
                          </span>
                        )}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] font-medium border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 gap-1 py-0">
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                        <span>0h inasist.</span>
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>

            {/* Mensaje de transparencia UX para el aprendiz con horas exactas */}
            {course.attendancePenaltyEnabled && loss && (
              <div className="p-4 sm:p-5 pb-0">
                {penaltyResult?.isPenaltyApplied ? (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-950 dark:text-amber-200 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/20 pb-1.5">
                        <p className="font-extrabold text-sm text-amber-900 dark:text-amber-300">
                          Penalización por Inasistencia Aplicada
                        </p>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-200">
                          Descuento: -{penaltyResult.discountPoints.toFixed(2)} pts
                        </span>
                      </div>
                      <p className="leading-relaxed font-medium">
                        {penaltyResult.transparencyMessage}
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                        <div className="bg-background/60 dark:bg-background/30 rounded-lg p-2 border border-amber-500/15">
                          <span className="text-muted-foreground block text-[10px]">Horas ausente:</span>
                          <span className="font-black text-amber-700 dark:text-amber-400">{loss.totalLostHours} hrs</span>
                        </div>
                        <div className="bg-background/60 dark:bg-background/30 rounded-lg p-2 border border-amber-500/15">
                          <span className="text-muted-foreground block text-[10px]">Faltas ({loss.absentCount}):</span>
                          <span className="font-bold text-foreground">{loss.absentHours} hrs</span>
                        </div>
                        <div className="bg-background/60 dark:bg-background/30 rounded-lg p-2 border border-amber-500/15">
                          <span className="text-muted-foreground block text-[10px]">Tardanzas ({loss.lateCount}):</span>
                          <span className="font-bold text-foreground">{loss.lateHours} hrs</span>
                        </div>
                        <div className="bg-background/60 dark:bg-background/30 rounded-lg p-2 border border-amber-500/15">
                          <span className="text-muted-foreground block text-[10px]">Retiros ({loss.leaveCount}):</span>
                          <span className="font-bold text-foreground">{loss.leaveHours} hrs</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : rawGrade === null && loss.totalLostHours > 0 ? (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-950 dark:text-amber-200 flex items-start gap-3">
                    <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1.5 flex-1">
                      <p className="font-extrabold text-sm text-amber-900 dark:text-amber-300">
                        Penalización por Inasistencia Vigente
                      </p>
                      <p className="leading-relaxed">
                        Tienes <strong>{loss.totalLostHours} horas de inasistencia</strong> registradas ({loss.absentHours}h por faltas, {loss.lateHours}h por tardanzas, {loss.leaveHours}h por retiros) de un total de <strong>{totalScheduledHours} horas programadas</strong> ({totalScheduledHours > 0 ? Math.round((loss.totalLostHours / totalScheduledHours) * 100) : 0}%).
                        Tu instructor ha configurado una penalización de hasta el <strong>{course.maxPenaltyPercentage}%</strong> que se aplicará en tu nota definitiva una vez se registren tus calificaciones.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-950 dark:text-emerald-200 flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>
                      Regla de penalización activa ({course.maxPenaltyPercentage}% máx.), pero tienes <strong>0 horas de inasistencia acumuladas (0%)</strong>. Tu nota definitiva se mantiene intacta.
                    </span>
                  </div>
                )}
              </div>
            )}
            <CardContent className="p-0">
              {course.activities.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  El instructor aún no ha asignado actividades evaluativas en esta materia.
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-muted/5">
                    <TableRow>
                      <TableHead>Actividad</TableHead>
                      <TableHead className="w-[100px] text-center">Peso (%)</TableHead>
                      <TableHead className="w-[120px] text-center">Calificación</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {course.activities.map((act: any) => {
                      const grade = act.grades[0];
                      return (
                        <TableRow key={act.id}>
                          <TableCell>
                            <div className="font-semibold">{act.title}</div>
                            {act.description && <div className="text-xs text-muted-foreground">{act.description}</div>}
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground font-medium">
                            {act.weight}%
                          </TableCell>
                          <TableCell className="text-center font-bold">
                            {grade ? (
                              <Badge variant="outline" className={grade.score < 3.0 ? "text--600 dark:text--400 bg--50 dark:bg--950/20 border--200 dark:border--800/50" : "text--700 dark:text--300 bg--50 dark:bg--950/20 border--200 dark:border--800/50"}>
                                {grade.score.toFixed(1)}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs italic">Pendiente</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
