import type { Measurement, MeasurementType } from './types';

export interface DerivedMetric {
  key: string;
  label: string;
  value: number;
  formatted: string;
  hint?: string;
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
): DerivedMetric[] {
  const weight = getLatestByType(measurements, 'weight');
  const height = getLatestByType(measurements, 'height');
  const waist = getLatestByType(measurements, 'waist');
  const hips = getLatestByType(measurements, 'hips');

  const derived: DerivedMetric[] = [];

  if (weight && height) {
    const heightM = height.value / 100;
    const bmi = weight.value / (heightM * heightM);
    derived.push({
      key: 'bmi',
      label: 'BMI',
      value: bmi,
      formatted: bmi.toFixed(1),
      hint: 'Body mass index from latest weight and height.',
    });
  }

  if (waist && hips) {
    const ratio = waist.value / hips.value;
    derived.push({
      key: 'whr',
      label: 'Waist-to-hip',
      value: ratio,
      formatted: ratio.toFixed(2),
      hint: 'Ratio of latest waist and hip measurements.',
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
