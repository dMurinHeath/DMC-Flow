const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

export type CalendarDay = {
  year: number;
  month: number;
  day: number;
};

export function parseDateOnly(value: string): CalendarDay | null {
  const match = DATE_ONLY.exec(value);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }
  const probe = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

export function isValidDateOnly(value: string): boolean {
  return parseDateOnly(value) !== null;
}

export function dayToOrdinal(day: CalendarDay): number {
  return Math.floor(
    Date.UTC(day.year, day.month - 1, day.day) / (24 * 60 * 60 * 1000),
  );
}
