import type { Measurement, MeasurementType, Sex } from './types';

export type MetricStatus = 'healthy' | 'moderate' | 'bad';

export interface DerivedMetric {
  key: string;
  label: string;
  value: number;
  formatted: string;
  hint?: string;
  /** Undefined when adult thresholds don't apply (e.g. under-18 profiles). */
  status?: MetricStatus;
}

export interface DerivedMetricsProfile {
  sex: Sex;
  birthDate: string;
}

function bmiStatus(bmi: number): MetricStatus {
  if (bmi < 16 || bmi >= 30) return 'bad';
  if (bmi < 18.5 || bmi >= 25) return 'moderate';
  return 'healthy';
}

function whrStatus(ratio: number, sex: Sex): MetricStatus {
  const [healthyBelow, badFrom] =
    sex === 'male' ? [0.9, 1.0] : sex === 'female' ? [0.8, 0.85] : [0.85, 0.95];
  if (ratio < healthyBelow) return 'healthy';
  if (ratio >= badFrom) return 'bad';
  return 'moderate';
}

function whtrStatus(ratio: number): MetricStatus {
  if (ratio < 0.5) return 'healthy';
  if (ratio >= 0.6) return 'bad';
  return 'moderate';
}

function isAdult(birthDate: string): boolean {
  const age =
    (Date.now() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  return age >= 18;
}

export function getLatestByType(
  measurements: Measurement[],
  type: MeasurementType,
): Measurement | null {
  const filtered = measurements
    .filter((m) => m.type === type)
    .sort(
      (a, b) =>
        new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
    );
  return filtered[0] ?? null;
}

export function computeDerivedMetrics(
  measurements: Measurement[],
  profile?: DerivedMetricsProfile,
): DerivedMetric[] {
  const weight = getLatestByType(measurements, 'weight');
  const height = getLatestByType(measurements, 'height');
  const waist = getLatestByType(measurements, 'waist');
  const hips = getLatestByType(measurements, 'hips');

  // Adult reference ranges don't apply to kids, so skip status for them.
  const useAdultRanges = profile ? isAdult(profile.birthDate) : false;

  const derived: DerivedMetric[] = [];

  if (weight && height) {
    const heightM = height.value / 100;
    const bmi = weight.value / (heightM * heightM);
    derived.push({
      key: 'bmi',
      label: 'BMI',
      value: bmi,
      formatted: bmi.toFixed(1),
      hint: 'Body mass index from latest weight and height. Healthy adult range: 18.5–24.9.',
      status: useAdultRanges ? bmiStatus(bmi) : undefined,
    });
  }

  if (waist && hips) {
    const ratio = waist.value / hips.value;
    derived.push({
      key: 'whr',
      label: 'Waist-to-hip',
      value: ratio,
      formatted: ratio.toFixed(2),
      hint: 'Ratio of latest waist and hip measurements. Lower is generally healthier.',
      status:
        useAdultRanges && profile ? whrStatus(ratio, profile.sex) : undefined,
    });
  }

  if (waist && height) {
    const ratio = waist.value / height.value;
    derived.push({
      key: 'whtr',
      label: 'Waist-to-height',
      value: ratio,
      formatted: ratio.toFixed(2),
      hint: 'Below 0.5 is often associated with lower health risk.',
      status: useAdultRanges ? whtrStatus(ratio) : undefined,
    });
  }

  return derived;
}

export function getMeasurementsByType(
  measurements: Measurement[],
  type: MeasurementType,
): Measurement[] {
  return measurements
    .filter((m) => m.type === type)
    .sort(
      (a, b) =>
        new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
    );
}

export function deltaBetween(
  current: Measurement | null,
  previous: Measurement | null,
): number | null {
  if (!current || !previous) return null;
  return current.value - previous.value;
}

export function findPreviousMeasurement(
  measurements: Measurement[],
  type: MeasurementType,
  before?: string,
): Measurement | null {
  const sorted = getMeasurementsByType(measurements, type);
  if (!before) {
    return sorted.length > 1 ? sorted[sorted.length - 2] : null;
  }
  const filtered = sorted.filter((m) => m.recordedAt < before);
  return filtered[filtered.length - 1] ?? null;
}

export function findMeasurementDaysAgo(
  measurements: Measurement[],
  type: MeasurementType,
  days: number,
): Measurement | null {
  const sorted = getMeasurementsByType(measurements, type);
  if (sorted.length === 0) return null;
  const latest = sorted[sorted.length - 1];
  const target = new Date(latest.recordedAt);
  target.setDate(target.getDate() - days);

  let closest: Measurement | null = null;
  let closestDiff = Infinity;

  for (const m of sorted) {
    const diff = Math.abs(
      new Date(m.recordedAt).getTime() - target.getTime(),
    );
    if (diff < closestDiff) {
      closestDiff = diff;
      closest = m;
    }
  }

  return closest;
}
