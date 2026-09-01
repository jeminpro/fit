import type { HabitKey, MeasurementType } from './types';

export const HABIT_KEYS: HabitKey[] = [
  'exercise',
  'water',
  'sleep',
  'meditation',
  'snacks',
];

export const HABIT_LABELS: Record<HabitKey, string> = {
  exercise: 'Exercise',
  water: 'Water',
  sleep: 'Sleep',
  meditation: 'Meditation',
  snacks: 'Unplanned snacks',
};

export const HABIT_LEVEL_LABELS = ['Low', 'Med', 'High'] as const;

export const MEASUREMENT_TYPES: MeasurementType[] = [
  'height',
  'weight',
  'waist',
  'hips',
  'chest',
  'thigh',
  'arm',
];

export const MEASUREMENT_LABELS: Record<MeasurementType, string> = {
  height: 'Height',
  weight: 'Weight',
  waist: 'Waist',
  hips: 'Hips / Glutes',
  chest: 'Chest',
  thigh: 'Thighs',
  arm: 'Arms',
};

export const MEASUREMENT_TIPS: Record<MeasurementType, string> = {
  height: 'Stand straight against a wall, heels together, looking forward.',
  weight: 'Weigh at the same time of day, ideally morning after bathroom.',
  waist:
    'Measure at the navel or midway between your hip bone and ribs to track internal fat and health risks.',
  hips: 'Measure at the widest part of your buttocks.',
  chest: 'Measure across the widest part around the nipple line.',
  thigh: 'Measure at the widest part of each upper leg (same side each time).',
  arm: 'Measure the midpoint of your upper arm or flexed biceps.',
};

export const DEFAULT_ENABLED_MEASUREMENTS: MeasurementType[] = [
  'height',
  'weight',
  'waist',
];

export const OPTIONAL_MEASUREMENTS: MeasurementType[] = [
  'hips',
  'chest',
  'thigh',
  'arm',
];

export const MEASUREMENT_UNITS: Record<
  MeasurementType,
  { metric: string; imperial: string }
> = {
  height: { metric: 'cm', imperial: 'in' },
  weight: { metric: 'kg', imperial: 'lb' },
  waist: { metric: 'cm', imperial: 'in' },
  hips: { metric: 'cm', imperial: 'in' },
  chest: { metric: 'cm', imperial: 'in' },
  thigh: { metric: 'cm', imperial: 'in' },
  arm: { metric: 'cm', imperial: 'in' },
};

export const CM_PER_INCH = 2.54;
export const KG_PER_LB = 0.45359237;
