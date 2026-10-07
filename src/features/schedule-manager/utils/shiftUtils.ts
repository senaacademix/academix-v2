import { DayOfWeek } from "@/generated/prisma/client";
import { ScheduleBuilderData } from "../actions/scheduleBuilderActions";

export type ShiftType = "morning" | "afternoon" | "night";
export type ShiftFilter = "all" | ShiftType;

export interface GroupShiftData {
  shifts: ShiftType[];
  primaryShift: ShiftType;
  earliestMinutes: number;
  timeRangeLabel?: string;
}

export const toMinutes = (time24: string): number => {
  if (!time24) return 0;
  const [h, m] = time24.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

export function getGroupShiftData(group: ScheduleBuilderData["groups"][0]): GroupShiftData {
  const shiftsSet = new Set<ShiftType>();
  let minMinutes = Infinity;
  let minStartTime = "";
  let maxEndTime = "";

  // 1. Inspect configured daySlotsConfig
  if (group.daySlotsConfig && group.daySlotsConfig.length > 0) {
    group.daySlotsConfig.forEach((slot) => {
      if (slot.startTime && slot.endTime) {
        const [sh, sm] = slot.startTime.split(":").map(Number);
        const [eh, em] = slot.endTime.split(":").map(Number);
        const startMins = sh * 60 + (sm || 0);
        if (startMins < minMinutes) {
          minMinutes = startMins;
          minStartTime = slot.startTime;
        }
        if (!maxEndTime || toMinutes(slot.endTime) > toMinutes(maxEndTime)) {
          maxEndTime = slot.endTime;
        }

        const effectiveEndH = em > 0 ? eh + 1 : eh;

        if (sh < 12) {
          shiftsSet.add("morning");
        }
        if ((sh >= 12 && sh < 18) || (sh < 12 && effectiveEndH > 12)) {
          shiftsSet.add("afternoon");
        }
        if (effectiveEndH > 18 || sh >= 18) {
          shiftsSet.add("night");
        }
      }
    });
  }

  // 2. Inspect scheduled classes schedules
  if (group.scheduledClasses && group.scheduledClasses.length > 0) {
    group.scheduledClasses.forEach((cls) => {
      (cls.schedules || []).forEach((s) => {
        if (s.startTime && s.endTime) {
          const [sh, sm] = s.startTime.split(":").map(Number);
          const [eh, em] = s.endTime.split(":").map(Number);
          const startMins = sh * 60 + (sm || 0);
          if (startMins < minMinutes) {
            minMinutes = startMins;
            minStartTime = s.startTime;
          }
          if (!maxEndTime || toMinutes(s.endTime) > toMinutes(maxEndTime)) {
            maxEndTime = s.endTime;
          }

          const effectiveEndH = em > 0 ? eh + 1 : eh;

          if (sh < 12) {
            shiftsSet.add("morning");
          }
          if ((sh >= 12 && sh < 18) || (sh < 12 && effectiveEndH > 12)) {
            shiftsSet.add("afternoon");
          }
          if (effectiveEndH > 18 || sh >= 18) {
            shiftsSet.add("night");
          }
        }
      });
    });
  }

  // 3. Fallback to name/period detection if no slots or schedules found
  if (shiftsSet.size === 0) {
    const textToCheck = `${group.name} ${group.period?.name || ""} ${group.period?.timeline?.name || ""}`.toLowerCase();
    if (textToCheck.includes("noche") || textToCheck.includes("nocturn")) {
      shiftsSet.add("night");
      minMinutes = 18 * 60; // 18:00
    } else if (textToCheck.includes("tarde") || textToCheck.includes("vespertin")) {
      shiftsSet.add("afternoon");
      minMinutes = 12 * 60; // 12:00
    } else {
      shiftsSet.add("morning");
      minMinutes = 6 * 60; // 06:00
    }
  }

  // Primary shift determination
  let primaryShift: ShiftType = "morning";
  if (minMinutes >= 18 * 60) {
    primaryShift = "night";
  } else if (minMinutes >= 12 * 60) {
    primaryShift = "afternoon";
  } else {
    primaryShift = "morning";
  }

  const order: ShiftType[] = ["morning", "afternoon", "night"];
  const sortedShifts = order.filter((s) => shiftsSet.has(s));

  return {
    shifts: sortedShifts.length > 0 ? sortedShifts : [primaryShift],
    primaryShift,
    earliestMinutes:
      minMinutes !== Infinity
        ? minMinutes
        : primaryShift === "night"
        ? 1080
        : primaryShift === "afternoon"
        ? 720
        : 360,
    timeRangeLabel: minStartTime && maxEndTime ? `${minStartTime} - ${maxEndTime}` : undefined,
  };
}

export function sortGroupsMorningToNight(
  groups: ScheduleBuilderData["groups"]
): ScheduleBuilderData["groups"] {
  return [...groups].sort((a, b) => {
    const shiftDataA = getGroupShiftData(a);
    const shiftDataB = getGroupShiftData(b);

    if (shiftDataA.earliestMinutes !== shiftDataB.earliestMinutes) {
      return shiftDataA.earliestMinutes - shiftDataB.earliestMinutes;
    }

    return a.name.localeCompare(b.name, undefined, { numeric: true });
  });
}
