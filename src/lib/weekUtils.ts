import { formatInTimeZone } from 'date-fns-tz';

const DAY_MS = 24 * 60 * 60 * 1000;
// Epoch: Monday 2024-01-01 (UTC). All week math is UTC-based so results are
// stable regardless of the machine's local timezone. (The test suite pins TZ
// to a non-UTC zone precisely to keep this honest — see package.json.)
const EPOCH_START = Date.UTC(2024, 0, 1);

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

export function get2WeekBlockStart(date: Date) {
  const daysSinceEpoch = Math.floor((utcMidnight(date) - EPOCH_START) / DAY_MS);
  const blockIndex = Math.floor(daysSinceEpoch / 14);
  return new Date(EPOCH_START + blockIndex * 14 * DAY_MS);
}

export function formatWeekLabel(date: Date) {
  return formatInTimeZone(date, 'UTC', 'EEE dd MMM yyyy');
}