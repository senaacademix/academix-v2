import { DayOfWeek } from "@/generated/prisma/client";

export type EventAudience = "PUBLIC" | "TEACHERS" | "STUDENTS" | "GROUP";

export interface DaySlotConfig {
  dayOfWeek: DayOfWeek;
  enabled: boolean;
  startTime: string; // "08:00"
  endTime: string;   // "12:00"
}

export interface GroupScheduleConfig {
  groupId: string;
  groupName: string;
  programName?: string;
  days: DaySlotConfig[];
}

export interface ScheduleEventItem {
  id: string;
  academicScheduleId: string;
  title: string;
  description?: string | null;
  date: string; // ISO or "YYYY-MM-DD"
  startTime: string; // "08:00"
  endTime: string;   // "12:00"
  targetAudience: EventAudience;
  isGeneral?: boolean;
  groupId?: string | null;
  group?: {
    id: string;
    name: string;
  } | null;
  location?: string | null;
  linkUrl?: string | null;
  color?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SaveScheduleEventPayload {
  id?: string;
  academicScheduleId: string;
  title: string;
  description?: string | null;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "08:00"
  endTime: string;   // "12:00"
  targetAudience: EventAudience;
  isGeneral?: boolean;
  groupId?: string | null;
  location?: string | null;
  linkUrl?: string | null;
  color?: string | null;
}

export interface AcademicScheduleItem {
  id: string;
  name: string;
  description: string | null;
  startDate: string; // ISO string
  endDate: string;   // ISO string
  isActive: boolean;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  groupSlots: {
    id: string;
    academicScheduleId: string;
    groupId: string;
    periodId?: string | null;
    period?: {
      id: string;
      name: string;
    } | null;
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
    group: {
      id: string;
      name: string;
      categoria?: string;
      program: {
        id: string;
        name: string;
      };
    };
  }[];
  events?: ScheduleEventItem[];
}

export interface BasicSchedulePayload {
  name: string;
  description?: string | null;
  startDate: string; // "YYYY-MM-DD"
  endDate: string;   // "YYYY-MM-DD"
  isActive?: boolean;
  isPublished?: boolean;
}

export interface GroupSlotItemPayload {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
}

export interface SaveGroupSlotsPayload {
  scheduleId: string;
  programId?: string;
  groupsConfig: {
    groupId: string;
    periodId?: string | null;
    slots: GroupSlotItemPayload[];
  }[];
}

export interface AvailableGroupOption {
  id: string;
  name: string;
  categoria: string;
  programId: string;
  programName: string;
  periodName?: string | null;
  environmentName?: string | null;
  availablePeriods?: {
    id: string;
    name: string;
    esEspecial?: boolean;
  }[];
}
