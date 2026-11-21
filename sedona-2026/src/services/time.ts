import type { Activity, Day } from '../data/types';
export const TIME_ZONE = 'America/Phoenix';
export function localDate(now = new Date(), timeZone = TIME_ZONE) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (type: string) => parts.find(p => p.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function localTime(now = new Date(), timeZone = TIME_ZONE) {
  return new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now);
}
export function currentTripDay(days: Day[], now = new Date()) {
  const today = localDate(now);
  return days.find(d => d.date === today) ?? days[0];
}
export function daysUntil(date: string, now = new Date()) {
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${localDate(now)}T00:00:00Z`)) / 86400000);
}
export function activityInstant(date: string, activity: Activity) {
  // Both zones use standard time during the November 2026 trip.
  const offset = activity.timeZone === 'America/Los_Angeles' ? '-08:00' : '-07:00';
  return new Date(`${date}T${activity.time}:00${offset}`).getTime();
}
export function nextActivity(day: Day, activities: Activity[], now = new Date()) {
  const pending = activities.filter(a => activityInstant(day.date, a) >= now.getTime());
  return pending.sort((a, b) => activityInstant(day.date, a) - activityInstant(day.date, b))[0];
}
export function formatDate(date: string) { return `${Number(date.slice(5, 7))} 月 ${Number(date.slice(8))} 日`; }
export function weatherTime(value?: string) { return value?.split('T')[1]?.slice(0, 5) ?? '—'; }
