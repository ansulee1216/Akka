/** Minutes shown in the picker. 5-minute steps keep the wheel short but still precise enough for a pickup window. */
export const MINUTE_STEP = 5;

export const HOURS = Array.from({ length: 24 }, (_, i) => i);
export const MINUTES = Array.from({ length: 60 / MINUTE_STEP }, (_, i) => i * MINUTE_STEP);

export const pad2 = (n: number) => String(n).padStart(2, '0');

/** "21:30" → { hour: 21, minute: 30 }. Returns null for anything unparseable. */
export function parseTime(value: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value?.trim() ?? '');
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

export function formatTime(hour: number, minute: number): string {
  return `${pad2(hour)}:${pad2(minute)}`;
}

/**
 * Rounds a minute value onto the picker's step so an existing time like
 * "21:07" still lands on a real wheel position rather than between two.
 */
export function snapMinute(minute: number): number {
  const snapped = Math.round(minute / MINUTE_STEP) * MINUTE_STEP;
  return snapped >= 60 ? 0 : snapped;
}

/** Total minutes since midnight, for comparing two times. */
export function toMinutes(value: string): number | null {
  const parsed = parseTime(value);
  return parsed ? parsed.hour * 60 + parsed.minute : null;
}

/**
 * Length of a pickup window in minutes, treating an end earlier than the
 * start as crossing midnight (e.g. 23:30 → 00:30 is 60 minutes, not -1380).
 */
export function windowLengthMinutes(start: string, end: string): number | null {
  const from = toMinutes(start);
  const to = toMinutes(end);
  if (from === null || to === null) return null;
  const diff = to - from;
  return diff > 0 ? diff : diff + 24 * 60;
}

/** Human label for the picker, e.g. "21:00 – 21:30 (30분)". */
export function describeWindow(start: string, end: string): string {
  const length = windowLengthMinutes(start, end);
  if (length === null) return '';
  if (length < 60) return `${length}분`;
  const hours = Math.floor(length / 60);
  const minutes = length % 60;
  return minutes === 0 ? `${hours}시간` : `${hours}시간 ${minutes}분`;
}
