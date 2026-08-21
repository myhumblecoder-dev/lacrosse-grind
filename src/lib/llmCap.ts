export function coachCapExceeded(todayCount: number, envLimit?: string): boolean {
  const parsedLimit = Number(envLimit);
  const limit = (parsedLimit > 0 && Number.isInteger(parsedLimit)) ? parsedLimit : 20;
  return todayCount >= limit;
}