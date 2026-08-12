/**
 * Returns the UTC midnight of the Monday on or after the provided date.
 * If the provided date is already a Monday, it returns that same Monday at UTC midnight.
 */
export function resolveSeasonStart(now: Date): Date {
  const date = new Date(now.getTime());
  const day = date.getUTCDay();

  // getUTCDay(): 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  // We want to find the distance to the next Monday.
  // If it's Monday (1), distance is 0.
  // If it's Sunday (0), distance is 1.
  // If it's Tuesday (2), distance is 6.
  
  let daysUntilMonday = 0;
  if (day === 0) {
    // Sunday -> Next Monday is 1 day away
    daysUntilMonday = 1;
  } else if (day === 1) {
    // Monday -> 0 days away
    daysUntilMonday = 0;
  } else {
    // Tue (2) through Sat (6) -> distance to next Monday
    daysUntilMonday = 8 - day;
  }

  date.setUTCDate(date.getUTCDate() + daysUntilMonday);
  date.setUTCHours(0, 0, 0, 0);

  return date;
}