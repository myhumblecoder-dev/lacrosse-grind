import { startOfWeek, addDays, differenceInDays, startOfDay } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

const EPOCH_START = startOfDay(new Date('2024-01-01T00:00:00Z'));

export function getWeekStart(date: Date) {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function get2WeekBlockStart(date: Date) {
  const daysSinceEpoch = differenceInDays(startOfDay(date), EPOCH_START);
  const blockIndex = Math.floor(daysSinceEpoch / 14);
  return addDays(EPOCH_START, blockIndex * 14);
}

export function formatWeekLabel(date: Date) {
  return formatInTimeZone(date, 'UTC', 'EEE dd MMM yyyy');
}