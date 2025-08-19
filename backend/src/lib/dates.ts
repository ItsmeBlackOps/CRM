export function todayUTC(): string {
  return new Date().toISOString().split('T')[0];
}
