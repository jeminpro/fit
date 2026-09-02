import type { Measurement, HabitDay, Profile } from './types';
import type { WorkoutDay } from './workoutTypes';
import { MEASUREMENT_LABELS, HABIT_LABELS, HABIT_KEYS } from './constants';
import { formatDisplayDate } from './dates';
import { formatMeasurementValue } from './units';
import type { UnitSystem } from './types';

export function measurementsToCsv(
  measurements: Measurement[],
  units: UnitSystem,
): string {
  const header = 'date,type,value,unit,note';
  const rows = measurements.map((m) => {
    const value = formatMeasurementValue(m.type, m.value, units).split(' ')[0];
    const unit = formatMeasurementValue(m.type, m.value, units).split(' ')[1];
    const note = (m.note ?? '').replace(/"/g, '""');
    return `${formatDisplayDate(m.recordedAt)},${MEASUREMENT_LABELS[m.type]},${value},${unit},"${note}"`;
  });
  return [header, ...rows].join('\n');
}

export function habitDaysToCsv(habitDays: HabitDay[]): string {
  const header = 'date,' + HABIT_KEYS.join(',') + ',note';
  const levelLabel = (n: number) => ['low', 'med', 'high'][n] ?? '';
  const rows = habitDays
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((d) => {
      const note = (d.note ?? '').replace(/"/g, '""');
      const values = HABIT_KEYS.map((k) => levelLabel(d[k])).join(',');
      return `${d.id},${values},"${note}"`;
    });
  return [header, ...rows].join('\n');
}

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportProfileCsv(
  profile: Profile,
  measurements: Measurement[],
  habitDays: HabitDay[],
  units: UnitSystem,
): void {
  const slug = profile.name.toLowerCase().replace(/\s+/g, '-');
  downloadCsv(`${slug}-measurements.csv`, measurementsToCsv(measurements, units));
  downloadCsv(`${slug}-habits.csv`, habitDaysToCsv(habitDays));
}

export function exportAllProfilesJson(
  profiles: Profile[],
  data: Record<
    string,
    {
      measurements: Measurement[];
      habitDays: HabitDay[];
      workoutDays?: WorkoutDay[];
    }
  >,
): void {
  const payload = profiles.map((p) => ({
    profile: p,
    measurements: data[p.id]?.measurements ?? [],
    habitDays: data[p.id]?.habitDays ?? [],
    workoutDays: data[p.id]?.workoutDays ?? [],
  }));
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'fit-export.json';
  link.click();
  URL.revokeObjectURL(url);
}
