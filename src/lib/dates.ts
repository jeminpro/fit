import {
  format,
  parseISO,
  subDays,
  differenceInDays,
  differenceInYears,
  differenceInMonths,
} from 'date-fns';
import type { HabitDay, HabitKey } from './types';
import { HABIT_KEYS } from './constants';

export function todayKey(date = new Date()): string {
  return format(date, 'yyyy-MM-dd');
}

export function formatDisplayDate(iso: string): string {
  return format(parseISO(iso), 'MMM d, yyyy');
}

export function formatShortDate(iso: string): string {
  return format(parseISO(iso), 'MMM d');
}

export function daysSince(iso: string): number {
  return differenceInDays(new Date(), parseISO(iso));
}

export function ageFromBirthDate(birthDate: string, atDate = new Date()): {
  years: number;
  months: number;
} {
  const birth = parseISO(birthDate);
  const years = differenceInYears(atDate, birth);
  const months =
    differenceInMonths(atDate, birth) - years * 12;
  return { years, months };
}

export function ageInYears(birthDate: string, atDate: string): number {
  const { years, months } = ageFromBirthDate(birthDate, parseISO(atDate));
  return years + months / 12;
}

export function getLastNDays(n: number): string[] {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    days.push(todayKey(subDays(new Date(), i)));
  }
  return days;
}

export function habitScore(day: HabitDay | null | undefined): number | null {
  if (!day) return null;
  const values = HABIT_KEYS.map((key) => day[key]);
  if (values.some((v) => v === undefined || v === null)) return null;

  const points = HABIT_KEYS.reduce((sum, key) => {
    const value = day[key];
    if (key === 'snacks') {
      return sum + (2 - value);
    }
    return sum + value;
  }, 0);

  return Math.round((points / (HABIT_KEYS.length * 2)) * 10 * 10) / 10;
}

export function computeStreak(
  habitDays: Map<string, HabitDay>,
  key: HabitKey = 'exercise',
): number {
  let streak = 0;
  let cursor = new Date();

  while (true) {
    const keyStr = todayKey(cursor);
    const day = habitDays.get(keyStr);
    if (!day || day[key] === undefined) break;
    streak++;
    cursor = subDays(cursor, 1);
  }

  return streak;
}

export function computeHabitStreak(habitDays: Map<string, HabitDay>): number {
  let streak = 0;
  let cursor = new Date();

  while (true) {
    const keyStr = todayKey(cursor);
    const day = habitDays.get(keyStr);
    const score = habitScore(day);
    if (score === null) break;
    streak++;
    cursor = subDays(cursor, 1);
  }

  return streak;
}

export function emptyHabitDay(id: string): HabitDay {
  return {
    id,
    exercise: 0,
    water: 0,
    sleep: 0,
    meditation: 0,
    snacks: 0,
  };
}
