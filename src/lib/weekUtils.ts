import { formatInTimeZone } from 'date-fns-tz';

// All week math is UTC-based so results are stable regardless of the machine's
// local timezone. (The test suite pins TZ to a non-UTC zone precisely to keep
// this honest — see package.json.)
const DAY_MS = 24 * 60 * 60 * 1000;

function utcMidnight(date: Date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function getWeekStart(date: Date) {
  const dayStart = utcMidnight(date);
  const dow = new Date(dayStart).getUTCDay(); // 0=Sun … 6=Sat
  const daysSinceMonday = (dow + 6) % 7;
  return new Date(dayStart - daysSinceMonday * DAY_MS);
}

export function getLastCompletedWeekStart(date: Date): Date {
  return new Date(getWeekStart(date).getTime() - 7 * DAY_MS);
}

export function formatWeekLabel(date: Date) {
  return formatInTimeZone(date, 'UTC', 'EEE dd MMM yyyy');
}