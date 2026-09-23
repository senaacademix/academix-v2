/**
 * Utilidades de cálculo para Penalización por Inasistencia en Calificaciones
 * 
 * Reglas de negocio:
 * 1. Consolidación de ausencias: Horas de Faltas (ABSENT) + Llegadas tarde (LATE) + Retiros anticipados (LEAVE_EARLY).
 * 2. Porcentaje de inasistencia: Horas de ausencia / Horas programadas del trimestre.
 * 3. Puntos a descontar: Nota original * (% penalización / 100) * (% inasistencia).
 * 4. Nota definitiva: max(0.0, Nota original - Puntos a descontar).
 */

export interface AttendanceRecordLike {
  userId?: string;
  studentId?: string;
  courseId: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "LEAVE_EARLY" | string;
  date: string | Date;
  arrivalTime?: string | Date | null;
  departureTime?: string | Date | null;
  justification?: string | null;
}

export interface CourseScheduleLike {
  id?: string;
  dayOfWeek: string; // "MONDAY", "TUESDAY", etc.
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
}

export interface CourseLike {
  id: string;
  title?: string;
  weeklyHours?: number | null;
  usePercentageWeights?: boolean;
  attendancePenaltyEnabled?: boolean;
  maxPenaltyPercentage?: number | null;
  schedules?: CourseScheduleLike[];
  academicSchedule?: {
    startDate?: string | Date | null;
    endDate?: string | Date | null;
  } | null;
}

export interface GroupLike {
  id?: string;
  name?: string;
  startTime?: string | null;
  endTime?: string | null;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  scheduleSlots?: any[];
  program?: {
    startDate?: string | Date | null;
    endDate?: string | Date | null;
  } | null;
}

export interface PenaltyCalculationResult {
  rawGrade: number;
  finalGrade: number;
  totalScheduledHours: number;
  totalLostHours: number;
  absentHours: number;
  lateHours: number;
  leaveHours: number;
  absentCount: number;
  lateCount: number;
  leaveCount: number;
  absenceRate: number; // 0.0 to 1.0 (e.g. 0.50)
  absencePercentage: number; // 0 to 100 (e.g. 50)
  maxPenaltyPercentage: number; // e.g. 50
  discountPoints: number; // e.g. 1.25
  isPenaltyEnabled: boolean;
  isPenaltyApplied: boolean;
  transparencyMessage: string;
}

const DAY_MAP: Record<string, number> = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

/**
 * Calcula la diferencia en horas entre dos cadenas de tiempo "HH:mm"
 */
export function calculateHoursDiff(startTimeStr?: string | null, endTimeStr?: string | null): number {
  if (!startTimeStr || !endTimeStr) return 0;
  
  const parseTime = (str: string): number => {
    let time = str;
    if (time.includes("T")) {
      time = time.substring(11, 16);
    }
    const [h, m] = time.split(":").map(Number);
    return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
  };

  const startMins = parseTime(startTimeStr);
  const endMins = parseTime(endTimeStr);

  if (endMins <= startMins) return 0;
  return Math.round(((endMins - startMins) / 60) * 100) / 100;
}

/**
 * Extrae la hora "HH:mm" de un Date o string
 */
export function extractTimeHHmm(val?: string | Date | null): string | null {
  if (!val) return null;
  if (typeof val === "string") {
    if (val.includes("T")) {
      return val.substring(11, 16);
    }
    if (/^\d{2}:\d{2}/.test(val)) {
      return val.substring(0, 5);
    }
  }
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  const h = String(d.getUTCHours()).padStart(2, "0");
  const m = String(d.getUTCMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Formatea una hora a formato legible de 12 horas con AM/PM (ej: "12:15 PM")
 */
export function formatTime12h(timeVal?: string | Date | null): string {
  if (!timeVal) return "";
  const hhmm = extractTimeHHmm(timeVal);
  if (!hhmm) return "";
  const parts = hhmm.split(":");
  if (parts.length < 2) return hhmm;
  const hour = parseInt(parts[0], 10);
  const min = parseInt(parts[1], 10);
  if (isNaN(hour) || isNaN(min)) return hhmm;
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  const minutesStr = min.toString().padStart(2, "0");
  return `${hour12}:${minutesStr} ${ampm}`;
}


const toISODate = (val: any): string | null => {
  if (!val) return null;
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(val)) return val.slice(0, 10);
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
};

/**
 * Calcula las horas totales programadas para el trimestre/materia
 */
export function calculateTotalScheduledHours(
  course?: CourseLike | null,
  group?: GroupLike | null,
  fallbackScheduleDates?: { startDate?: string | Date | null; endDate?: string | Date | null } | null,
  attendanceRecords?: AttendanceRecordLike[]
): number {
  // 1. Fechas de inicio y fin efectivas (priorizando horario académico del curso o asignado vigente al grupo)
  const slotSchedule = group?.scheduleSlots?.find(s => s.academicSchedule && (s.academicSchedule.isActive || s.academicSchedule.startDate))?.academicSchedule;

  const startRaw = course?.academicSchedule?.startDate ||
    slotSchedule?.startDate ||
    fallbackScheduleDates?.startDate ||
    group?.startDate ||
    group?.program?.startDate;

  const endRaw = course?.academicSchedule?.endDate ||
    slotSchedule?.endDate ||
    fallbackScheduleDates?.endDate ||
    group?.endDate ||
    group?.program?.endDate;

  const schedules = (course?.schedules && course.schedules.length > 0)
    ? course.schedules
    : (group?.scheduleSlots || []);
  
  // Duración diaria por defecto del grupo o curso
  let defaultDailyHours = 4;
  if (group?.startTime && group?.endTime) {
    const diff = calculateHoursDiff(group.startTime, group.endTime);
    if (diff > 0) defaultDailyHours = diff;
  } else if (schedules.length > 0 && schedules[0].startTime && schedules[0].endTime) {
    const diff = calculateHoursDiff(schedules[0].startTime, schedules[0].endTime);
    if (diff > 0) defaultDailyHours = diff;
  }

  // Si tenemos rango de fechas
  if (startRaw && endRaw) {
    const startDate = new Date(startRaw);
    const endDate = new Date(endRaw);

    if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && startDate <= endDate) {
      let totalHours = 0;
      const cur = new Date(startDate);
      cur.setUTCHours(12, 0, 0, 0);
      const endLimit = new Date(endDate);
      endLimit.setUTCHours(12, 0, 0, 0);

      const hasSchedules = schedules.length > 0;

      while (cur <= endLimit) {
        const jsDay = cur.getUTCDay();

        if (hasSchedules) {
          const matchingSchedules = schedules.filter(s => DAY_MAP[s.dayOfWeek] === jsDay);
          matchingSchedules.forEach(s => {
            const h = calculateHoursDiff(s.startTime, s.endTime);
            totalHours += h > 0 ? h : defaultDailyHours;
          });
        } else {
          // Lunes a viernes como días lectivos estándar si no hay horarios específicos
          if (jsDay >= 1 && jsDay <= 5) {
            totalHours += defaultDailyHours;
          }
        }

        cur.setUTCDate(cur.getUTCDate() + 1);
      }

      if (totalHours > 0) {
        return Math.round(totalHours * 10) / 10;
      }
    }
  }

  // 2. Si hay weeklyHours configuradas en el curso (ej. 10 horas semanales * 10 semanas de trimestre = 100 horas)
  if (course?.weeklyHours && course.weeklyHours > 0) {
    const estimatedWeeks = 10; // Duración típica de trimestre SENA
    return Math.round(course.weeklyHours * estimatedWeeks * 10) / 10;
  }

  // 3. Fallback basado en las sesiones únicas de asistencia registradas
  if (attendanceRecords && attendanceRecords.length > 0) {
    const uniqueDates = new Set(
      attendanceRecords
        .filter(a => !course?.id || a.courseId === course.id)
        .map(a => typeof a.date === "string" ? a.date.slice(0, 10) : new Date(a.date).toISOString().slice(0, 10))
    );
    if (uniqueDates.size > 0) {
      return Math.round(uniqueDates.size * defaultDailyHours * 10) / 10;
    }
  }

  // Valor de fallback estándar (trimestre de 100 horas)
  return 100;
}

/**
 * Calcula con precisión las horas perdidas para un registro de asistencia (tarde, retiro o ambos)
 * acotando estrictamente el resultado a la duración real de la sesión.
 */
export function getLostHoursForAttendance(
  sessionStart?: string | null,
  sessionEnd?: string | null,
  arrivalTime?: string | Date | null,
  departureTime?: string | Date | null
): {
  sessionDuration: number;
  lateLostHours: number;
  leaveLostHours: number;
  totalLostHours: number;
  lateHours: number;
  leaveHours: number;
  leaveEarlyHours: number;
} {
  const startStr = extractTimeHHmm(sessionStart) || "08:00";
  const endStr = extractTimeHHmm(sessionEnd) || "12:00";

  const parseTimeToMins = (str?: string | Date | null): number | null => {
    const hhmm = extractTimeHHmm(str);
    if (!hhmm) return null;
    const [h, m] = hhmm.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  };

  const sMins = parseTimeToMins(startStr) ?? 480;
  const eMins = parseTimeToMins(endStr) ?? 720;
  const sessionDuration = Math.max(0.5, eMins > sMins ? Math.round(((eMins - sMins) / 60) * 100) / 100 : 4);

  let lateLostHours = 0;
  const arrMins = parseTimeToMins(arrivalTime);
  if (arrMins !== null) {
    if (arrMins <= sMins) {
      lateLostHours = 0;
    } else if (arrMins >= eMins) {
      lateLostHours = sessionDuration;
    } else {
      lateLostHours = Math.round(((arrMins - sMins) / 60) * 100) / 100;
    }
  }

  let leaveLostHours = 0;
  const depMins = parseTimeToMins(departureTime);
  if (depMins !== null) {
    if (depMins >= eMins) {
      leaveLostHours = 0;
    } else if (depMins <= sMins) {
      leaveLostHours = sessionDuration;
    } else {
      leaveLostHours = Math.round(((eMins - depMins) / 60) * 100) / 100;
    }
  }

  let totalLostHours = 0;
  if (arrMins !== null && depMins !== null) {
    if (depMins <= arrMins) {
      // Retiro antes o al mismo tiempo que el ingreso => perdió toda la sesión
      totalLostHours = sessionDuration;
    } else {
      // Estuvo presente entre arrMins y depMins (acotado a la sesión)
      const effectiveArr = Math.max(arrMins, sMins);
      const effectiveDep = Math.min(depMins, eMins);
      const attendedMins = Math.max(0, effectiveDep - effectiveArr);
      const attendedHours = Math.round((attendedMins / 60) * 100) / 100;
      totalLostHours = Math.max(0, Math.round((sessionDuration - attendedHours) * 100) / 100);
    }
    totalLostHours = Math.min(totalLostHours, sessionDuration);
  } else {
    totalLostHours = Math.min(lateLostHours + leaveLostHours, sessionDuration);
  }

  const finalLate = Math.min(lateLostHours, sessionDuration);
  const finalLeave = Math.min(leaveLostHours, sessionDuration);

  return {
    sessionDuration,
    lateLostHours: finalLate,
    leaveLostHours: finalLeave,
    totalLostHours,
    lateHours: finalLate,
    leaveHours: finalLeave,
    leaveEarlyHours: finalLeave
  };
}

/**
 * Calcula las horas de ausencia consolidadas de un aprendiz:
 * Faltas (ABSENT) + Llegadas tarde (LATE) + Retiros anticipados (LEAVE_EARLY)
 */
export function calculateStudentAttendanceLoss(
  studentId: string,
  courseId: string,
  attendances: AttendanceRecordLike[],
  course?: CourseLike | null,
  group?: GroupLike | null,
  fallbackScheduleDates?: { startDate?: string | Date | null; endDate?: string | Date | null } | null
): {
  absentHours: number;
  lateHours: number;
  leaveHours: number;
  totalLostHours: number;
  absentCount: number;
  lateCount: number;
  leaveCount: number;
} {
  const slotSchedule = group?.scheduleSlots?.find(s => s.academicSchedule && (s.academicSchedule.isActive || s.academicSchedule.startDate))?.academicSchedule;
  const startRaw = course?.academicSchedule?.startDate || slotSchedule?.startDate || fallbackScheduleDates?.startDate;
  const endRaw = course?.academicSchedule?.endDate || slotSchedule?.endDate || fallbackScheduleDates?.endDate;
  const startLimit = startRaw ? new Date((toISODate(startRaw) || "") + "T00:00:00Z") : null;
  const endLimit = endRaw ? new Date((toISODate(endRaw) || "") + "T23:59:59.999Z") : null;

  const studentRecords = attendances.filter(a => {
    const sId = a.userId || a.studentId;
    if (sId !== studentId || a.courseId !== courseId) return false;
    if (startLimit && !isNaN(startLimit.getTime())) {
      const aDate = new Date(a.date);
      if (!isNaN(aDate.getTime()) && aDate < startLimit) return false;
    }
    if (endLimit && !isNaN(endLimit.getTime())) {
      const aDate = new Date(a.date);
      if (!isNaN(aDate.getTime()) && aDate > endLimit) return false;
    }
    return true;
  });

  const schedules = course?.schedules || [];
  const defaultStartTime = group?.startTime || (schedules[0]?.startTime ?? (group?.scheduleSlots?.[0]?.startTime ?? "08:00"));
  const defaultEndTime = group?.endTime || (schedules[0]?.endTime ?? (group?.scheduleSlots?.[0]?.endTime ?? "12:00"));
  const defaultDuration = Math.max(1, calculateHoursDiff(defaultStartTime, defaultEndTime) || 4);

  let absentHours = 0;
  let lateHours = 0;
  let leaveHours = 0;
  let absentCount = 0;
  let lateCount = 0;
  let leaveCount = 0;

  studentRecords.forEach(rec => {
    const recDate = new Date(rec.date);
    const dayOfWeekIndex = !isNaN(recDate.getTime()) ? recDate.getUTCDay() : -1;
    
    // Buscar horario de la sesión para ese día (priorizando curso y luego franjas del grupo)
    const daySchedule = schedules.find(s => DAY_MAP[s.dayOfWeek] === dayOfWeekIndex) ||
                        group?.scheduleSlots?.find(s => DAY_MAP[s.dayOfWeek] === dayOfWeekIndex) ||
                        schedules[0] ||
                        group?.scheduleSlots?.[0];
    const sessionStart = daySchedule?.startTime || defaultStartTime;
    const sessionEnd = daySchedule?.endTime || defaultEndTime;
    const sessionHours = Math.max(0.5, calculateHoursDiff(sessionStart, sessionEnd) || defaultDuration);

    if (rec.status === "ABSENT") {
      absentCount++;
      absentHours += sessionHours;
    } else {
      const hasLate = rec.status === "LATE" || !!rec.arrivalTime;
      const hasLeave = rec.status === "LEAVE_EARLY" || !!rec.departureTime;

      if (hasLate || hasLeave) {
        if (hasLate) lateCount++;
        if (hasLeave) leaveCount++;

        const lost = getLostHoursForAttendance(
          sessionStart,
          sessionEnd,
          rec.arrivalTime,
          rec.departureTime
        );

        if (hasLate && !hasLeave) {
          lateHours += rec.arrivalTime ? lost.lateLostHours : Math.min(1, sessionHours);
        } else if (hasLeave && !hasLate) {
          leaveHours += rec.departureTime ? lost.leaveLostHours : Math.min(1, sessionHours);
        } else {
          // Registro dual (Tarde + Retiro)
          const effLate = rec.arrivalTime ? lost.lateLostHours : Math.min(0.5, sessionHours / 2);
          const effLeave = rec.departureTime ? lost.leaveLostHours : Math.min(0.5, sessionHours / 2);
          const sum = effLate + effLeave;
          if (sum > sessionHours) {
            const ratio = sessionHours / sum;
            lateHours += Math.round(effLate * ratio * 100) / 100;
            leaveHours += Math.round(effLeave * ratio * 100) / 100;
          } else {
            lateHours += effLate;
            leaveHours += effLeave;
          }
        }
      }
    }
  });

  const totalLostHours = Math.round((absentHours + lateHours + leaveHours) * 100) / 100;

  return {
    absentHours: Math.round(absentHours * 100) / 100,
    lateHours: Math.round(lateHours * 100) / 100,
    leaveHours: Math.round(leaveHours * 100) / 100,
    totalLostHours,
    absentCount,
    lateCount,
    leaveCount,
  };
}

/**
 * Ejecuta la fórmula de penalización:
 * 1. Porcentaje de inasistencia = Horas de ausencia / Horas programadas
 * 2. Puntos a descontar = Nota original * (% penalización / 100) * Porcentaje de inasistencia
 * 3. Nota definitiva = max(0.0, Nota original - Puntos a descontar)
 */
export function calculatePenalizedGrade({
  rawGrade,
  penaltyEnabled,
  maxPenaltyPercentage,
  totalLostHours,
  totalScheduledHours,
  lossDetails,
}: {
  rawGrade: number;
  penaltyEnabled: boolean;
  maxPenaltyPercentage: number;
  totalLostHours: number;
  totalScheduledHours: number;
  lossDetails?: {
    absentHours?: number;
    lateHours?: number;
    leaveHours?: number;
    absentCount?: number;
    lateCount?: number;
    leaveCount?: number;
  };
}): {
  finalGrade: number;
  rawGrade: number;
  totalScheduledHours: number;
  totalLostHours: number;
  absenceRate: number;
  absencePercentage: number;
  discountPoints: number;
  isPenaltyApplied: boolean;
  transparencyMessage: string;
} {
  const safeRawGrade = typeof rawGrade === "number" && !isNaN(rawGrade) ? rawGrade : 0;
  const safeScheduledHours = Math.max(1, totalScheduledHours);
  const rawAbsenceRate = totalLostHours / safeScheduledHours;
  // Limitar la tasa entre 0 y 1 (0% a 100%)
  const absenceRate = Math.max(0, Math.min(1, rawAbsenceRate));
  const absencePercentage = Math.round(absenceRate * 100);

  if (!penaltyEnabled || maxPenaltyPercentage <= 0 || safeRawGrade <= 0 || absenceRate <= 0) {
    const finalGrade = Number(safeRawGrade.toFixed(2));
    let message = "";
    if (penaltyEnabled && maxPenaltyPercentage > 0) {
      if (absenceRate <= 0 || totalLostHours <= 0) {
        message = `Regla de penalización activa (${maxPenaltyPercentage}% máx.), pero tienes 0 hrs de inasistencia acumuladas (0%). Tu nota definitiva se mantiene en ${finalGrade.toFixed(2)}.`;
      } else {
        message = `Tu nota definitiva es ${finalGrade.toFixed(2)}.`;
      }
    } else {
      message = `Tu nota definitiva es ${finalGrade.toFixed(2)}.`;
    }

    return {
      finalGrade,
      rawGrade: safeRawGrade,
      totalScheduledHours: safeScheduledHours,
      totalLostHours,
      absenceRate,
      absencePercentage,
      discountPoints: 0,
      isPenaltyApplied: false,
      transparencyMessage: message,
    };
  }

  // Paso 2: Puntos a descontar
  const penaltyFraction = maxPenaltyPercentage / 100;
  const rawDiscount = safeRawGrade * penaltyFraction * absenceRate;
  const discountPoints = Math.round(rawDiscount * 100) / 100;

  // Paso 3: Nota definitiva (restringida a >= 0.0)
  const finalGrade = Math.max(0, Math.round((safeRawGrade - discountPoints) * 100) / 100);

  // Mensaje de transparencia para el aprendiz explicitando las horas de inasistencia
  let detailSnippet = "";
  if (lossDetails) {
    const parts: string[] = [];
    if (lossDetails.absentHours && lossDetails.absentHours > 0) parts.push(`${lossDetails.absentHours}h por faltas`);
    if (lossDetails.lateHours && lossDetails.lateHours > 0) parts.push(`${lossDetails.lateHours}h por tardanzas`);
    if (lossDetails.leaveHours && lossDetails.leaveHours > 0) parts.push(`${lossDetails.leaveHours}h por retiros`);
    if (parts.length > 0) detailSnippet = ` (${parts.join(", ")})`;
  }

  const transparencyMessage = `Tu nota académica de evaluaciones es ${safeRawGrade.toFixed(2)}. Al acumular ${totalLostHours.toFixed(1)} hrs de inasistencia${detailSnippet} (un ${absencePercentage}% de las ${safeScheduledHours} hrs programadas), con una penalización del ${maxPenaltyPercentage}%, se te descuentan ${discountPoints.toFixed(2)} puntos. Tu nota definitiva queda en ${finalGrade.toFixed(2)}.`;

  return {
    finalGrade,
    rawGrade: safeRawGrade,
    totalScheduledHours: safeScheduledHours,
    totalLostHours,
    absenceRate,
    absencePercentage,
    discountPoints,
    isPenaltyApplied: discountPoints > 0,
    transparencyMessage,
  };
}

/**
 * Obtiene el horario de inicio y fin programado para un curso o grupo en una fecha determinada (día de la semana).
 * Prioriza horarios específicos del curso (course.schedules) y luego franjas del grupo (group.scheduleSlots).
 */
export function getSessionScheduleForDay(group: any, courseId: string, dateStr: string | Date): {
  sessionStart: string;
  sessionEnd: string;
  dayOfWeekStr: string;
  scheduleFound: boolean;
} {
  const dVal = typeof dateStr === "string" 
    ? new Date(dateStr.includes("T") ? dateStr : dateStr + "T12:00:00Z") 
    : new Date(dateStr);
  const daysOfWeek = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
  const dayOfWeekStr = daysOfWeek[dVal.getUTCDay()];

  const course = group?.courses?.find((c: any) => c.id === courseId);

  // 1. Horario específico del curso para el día de la semana
  let schedule = course?.schedules?.find((s: any) => s.dayOfWeek === dayOfWeekStr);

  // 2. Horario asignado al grupo en sus franjas para el día de la semana (priorizando el horario académico vigente/activo)
  if (!schedule && group?.scheduleSlots?.length) {
    schedule = group.scheduleSlots.find((s: any) =>
      s.dayOfWeek === dayOfWeekStr && (
        !s.academicSchedule ||
        s.academicSchedule.isActive ||
        (s.academicSchedule.startDate && s.academicSchedule.endDate)
      )
    ) || group.scheduleSlots.find((s: any) => s.dayOfWeek === dayOfWeekStr);
  }

  // 3. Fallbacks
  if (!schedule) {
    schedule = course?.schedules?.[0] || group?.scheduleSlots?.[0];
  }

  const sessionStart = schedule?.startTime || group?.startTime || "08:00";
  const sessionEnd = schedule?.endTime || group?.endTime || "12:00";

  return { sessionStart, sessionEnd, dayOfWeekStr, scheduleFound: !!schedule };
}

/**
 * Genera las opciones para los selectores de tarde y retiro anticipado estrictamente restringidos
 * al rango programado de la clase [sessionStart, sessionEnd].
 */
export function getSessionTimeOptions(sessionStartStr: string, sessionEndStr: string): {
  startM: number;
  endM: number;
  lateOptions: string[];
  leaveOptions: string[];
} {
  const [sh, sm] = (sessionStartStr || "08:00").split(":").map(Number);
  const [eh, em] = (sessionEndStr || "12:00").split(":").map(Number);
  const startM = (isNaN(sh) ? 8 : sh) * 60 + (sm || 0);
  const endM = (isNaN(eh) ? 12 : eh) * 60 + (em || 0);

  const lateOptions: string[] = [];
  // Tarde (Hora Ingreso): intervalos de 15 min desde inicio + 15 min hasta fin de clase
  for (let m = startM + 15; m <= endM; m += 15) {
    const hh = String(Math.floor(m / 60)).padStart(2, "0");
    const mm = String(m % 60).padStart(2, "0");
    lateOptions.push(`${hh}:${mm}`);
  }

  const leaveOptions: string[] = [];
  // Retiro (Hora Retiro): intervalos de 15 min desde inicio de clase hasta fin - 15 min
  for (let m = startM; m < endM; m += 15) {
    const hh = String(Math.floor(m / 60)).padStart(2, "0");
    const mm = String(m % 60).padStart(2, "0");
    leaveOptions.push(`${hh}:${mm}`);
  }

  return {
    startM,
    endM,
    lateOptions,
    leaveOptions
  };
}

