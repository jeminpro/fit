import type { ExerciseTemplate, Routine, WeeklyPlan } from './workoutTypes';

export type UnitSystem = 'metric' | 'imperial';
export type Sex = 'male' | 'female' | 'other';
export type MeasurementType =
  | 'height'
  | 'weight'
  | 'waist'
  | 'hips'
  | 'arm';
export type HabitKey =
  | 'exercise'
  | 'water'
  | 'sleep'
  | 'meditation'
  | 'snacks';
export type HabitLevel = 0 | 1 | 2;

export interface UserPrefs {
  units: UnitSystem;
  activeProfileId: string | null;
  profileOrder?: string[];
}

export interface ProfileGoals {
  weight?: number;
  waist?: number;
}

export interface Profile {
  id: string;
  name: string;
  sex: Sex;
  birthDate: string;
  enabledMeasurements: MeasurementType[];
  goals: ProfileGoals;
  recentExerciseIds?: string[];
  favouriteExerciseIds?: string[];
  routines?: Routine[];
  weeklyPlan?: WeeklyPlan;
  warmupTemplates?: ExerciseTemplate[];
  cooldownTemplates?: ExerciseTemplate[];
}

export interface Measurement {
  id: string;
  type: MeasurementType;
  value: number;
  recordedAt: string;
  note?: string;
}

export interface HabitDay {
  id: string;
  exercise: HabitLevel;
  water: HabitLevel;
  sleep: HabitLevel;
  meditation: HabitLevel;
  snacks: HabitLevel;
  note?: string;
}

export interface HabitDayInput {
  exercise?: HabitLevel;
  water?: HabitLevel;
  sleep?: HabitLevel;
  meditation?: HabitLevel;
  snacks?: HabitLevel;
  note?: string;
}

export interface MeasurementInput {
  type: MeasurementType;
  value: number;
  recordedAt: string;
  note?: string;
}
