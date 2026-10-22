/**
 * Shared Attendance Status Styles & Colors
 * Harmonized with the Instructor (Teacher) Attendance Matrix & SENA visual identity.
 * Used uniformly across all roles: Student, Teacher, Gestor, Admin, Committee.
 */

export interface AttendanceStatusStyle {
  label: string;
  code: string;
  badgeClass: string;
  dotColor: string;
  textColor: string;
  softBg: string;
  borderClass: string;
}

export const ATTENDANCE_STATUS_STYLES = {
  PRESENT: {
    label: "Presente",
    code: "P",
    badgeClass: "bg-emerald-100/80 text-emerald-800 border-emerald-300/80 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-700/60",
    dotColor: "bg-emerald-500",
    textColor: "text-emerald-600 dark:text-emerald-400",
    softBg: "bg-emerald-500/10",
    borderClass: "border-emerald-500/20",
  },
  ABSENT: {
    label: "Inasistencia",
    code: "F",
    badgeClass: "bg-rose-100/80 text-rose-800 border-rose-300/80 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-700/60",
    dotColor: "bg-rose-500",
    textColor: "text-rose-600 dark:text-rose-400",
    softBg: "bg-rose-500/10",
    borderClass: "border-rose-500/20",
  },
  LATE: {
    label: "Llegada Tarde",
    code: "T",
    badgeClass: "bg-amber-100/80 text-amber-900 border-amber-300/80 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700/60",
    dotColor: "bg-amber-500",
    textColor: "text-amber-600 dark:text-amber-400",
    softBg: "bg-amber-500/10",
    borderClass: "border-amber-500/20",
  },
  LEAVE_EARLY: {
    label: "Retiro Anticipado",
    code: "R",
    badgeClass: "bg-sky-100/80 text-sky-900 border-sky-300/80 dark:bg-sky-950/60 dark:text-sky-200 dark:border-sky-700/60",
    dotColor: "bg-sky-500",
    textColor: "text-sky-600 dark:text-sky-400",
    softBg: "bg-sky-500/10",
    borderClass: "border-sky-500/20",
  },
  DUAL: {
    label: "Tarde + Retiro",
    code: "T+R",
    badgeClass: "bg-amber-100/80 text-amber-900 border-amber-300/80 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700/60",
    dotColor: "bg-amber-500",
    textColor: "text-amber-600 dark:text-amber-400",
    softBg: "bg-amber-500/10",
    borderClass: "border-amber-500/20",
  },
  JUSTIFIED: {
    label: "Justificado",
    code: "AJ",
    badgeClass: "bg-emerald-100/80 text-emerald-800 border-emerald-300/80 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-700/60",
    dotColor: "bg-emerald-500",
    textColor: "text-emerald-600 dark:text-emerald-400",
    softBg: "bg-emerald-500/10",
    borderClass: "border-emerald-500/20",
  },
  EXCUSED: {
    label: "Excusa",
    code: "E",
    badgeClass: "bg-indigo-100/80 text-indigo-800 border-indigo-300/80 dark:bg-indigo-950/60 dark:text-indigo-200 dark:border-indigo-700/60",
    dotColor: "bg-indigo-500",
    textColor: "text-indigo-600 dark:text-indigo-400",
    softBg: "bg-indigo-500/10",
    borderClass: "border-indigo-500/20",
  },
} as const;

export function resolveAttendanceStatusStyle(att: {
  status?: string;
  arrivalTime?: string | null;
  departureTime?: string | null;
  justification?: string | null;
}) {
  const isAbsent = att.status === "ABSENT";
  const isLate = att.status === "LATE" || !!att.arrivalTime;
  const isLeaveEarly = att.status === "LEAVE_EARLY" || !!att.departureTime;
  const isDual = isLate && isLeaveEarly;

  if (isDual) return ATTENDANCE_STATUS_STYLES.DUAL;
  if (isAbsent) return ATTENDANCE_STATUS_STYLES.ABSENT;
  if (isLate) return ATTENDANCE_STATUS_STYLES.LATE;
  if (isLeaveEarly) return ATTENDANCE_STATUS_STYLES.LEAVE_EARLY;
  if (att.status === "EXCUSED") return ATTENDANCE_STATUS_STYLES.EXCUSED;
  return ATTENDANCE_STATUS_STYLES.PRESENT;
}
