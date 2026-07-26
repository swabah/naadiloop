export type MedicationFrequency = 1 | 2 | 3 | 4;

export interface StructuredMedicationSchedule {
  frequencyPerDay: MedicationFrequency;
  doseTimes: string[];
  startDate: string;
  durationDays?: number;
}

export const suggestedDoseTimes: Record<MedicationFrequency, string[]> = {
  1: ["08:00"],
  2: ["08:00", "20:00"],
  3: ["08:00", "14:00", "20:00"],
  4: ["08:00", "12:00", "16:00", "20:00"],
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function isStructuredMedicationSchedule(
  payload: unknown,
): payload is StructuredMedicationSchedule {
  if (!payload || typeof payload !== "object") return false;
  const candidate = payload as Partial<StructuredMedicationSchedule>;
  return (
    [1, 2, 3, 4].includes(candidate.frequencyPerDay ?? 0) &&
    Array.isArray(candidate.doseTimes) &&
    candidate.doseTimes.length === candidate.frequencyPerDay &&
    candidate.doseTimes.every((time) => timePattern.test(time)) &&
    new Set(candidate.doseTimes).size === candidate.doseTimes.length &&
    typeof candidate.startDate === "string" &&
    datePattern.test(candidate.startDate) &&
    (candidate.durationDays === undefined ||
      (Number.isInteger(candidate.durationDays) &&
        candidate.durationDays > 0 &&
        candidate.durationDays <= 365))
  );
}

function parseDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return { year: year ?? 0, month: month ?? 0, day: day ?? 0 };
}

export function addCalendarDays(date: string, days: number): string {
  const { year, month, day } = parseDate(date);
  const value = new Date(Date.UTC(year, month - 1, day + days));
  return value.toISOString().slice(0, 10);
}

export function localDateTimeToUtc(
  date: string,
  time: string,
  timezoneOffsetMinutes: number,
): Date {
  const { year, month, day } = parseDate(date);
  const [hour, minute] = time.split(":").map(Number);
  return new Date(
    Date.UTC(year, month - 1, day, hour ?? 0, minute ?? 0) + timezoneOffsetMinutes * 60_000,
  );
}

export function localDateFromUtc(date: Date, timezoneOffsetMinutes: number): string {
  return new Date(date.getTime() - timezoneOffsetMinutes * 60_000).toISOString().slice(0, 10);
}

export function scheduleEndDate(schedule: StructuredMedicationSchedule): string | null {
  return schedule.durationDays
    ? addCalendarDays(schedule.startDate, schedule.durationDays - 1)
    : null;
}

export function isDateInSchedule(date: string, schedule: StructuredMedicationSchedule): boolean {
  if (date < schedule.startDate) return false;
  const endDate = scheduleEndDate(schedule);
  return endDate === null || date <= endDate;
}

export function scheduledDosesForDate(
  schedule: StructuredMedicationSchedule,
  date: string,
  timezoneOffsetMinutes: number,
) {
  if (!isDateInSchedule(date, schedule)) return [];
  return [...schedule.doseTimes].sort().map((time) => ({
    date,
    time,
    scheduledFor: localDateTimeToUtc(date, time, timezoneOffsetMinutes),
  }));
}

export function scheduledDosesThroughDate(
  schedule: StructuredMedicationSchedule,
  throughDate: string,
  timezoneOffsetMinutes: number,
) {
  const endDate = scheduleEndDate(schedule);
  const lastDate = endDate && endDate < throughDate ? endDate : throughDate;
  if (lastDate < schedule.startDate) return [];
  const doses = [];
  for (let date = schedule.startDate; date <= lastDate; date = addCalendarDays(date, 1)) {
    doses.push(...scheduledDosesForDate(schedule, date, timezoneOffsetMinutes));
  }
  return doses;
}
