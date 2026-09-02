import type { Measurement, MeasurementType, Sex } from './types';
import { ageInMonths } from './dates';
import {
  ADULT_YEARS,
  WHTR_KID_MIN_YEARS,
  bmiForAgePercentile,
  cdcChartSex,
  formatPercentileLabel,
  formatPercentileShort,
  heightForAgePercentile,
} from './growth';

export type MetricStatus = 'healthy' | 'moderate' | 'bad';

export interface DerivedMetric {
  key: string;
  label: string;
  value: number;
  formatted: string;
  hint?: string;
  /** Extra line under the value, e.g. CDC percentile. */
  detail?: string;
  /** Undefined when thresholds don't apply. */
  status?: MetricStatus;
  /** Overrides the default Healthy / Moderate / At risk badge copy. */
  statusLabel?: string;
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

function bmiForAgeStatus(percentile: number): {
  status: MetricStatus;
  statusLabel: string;
} {
  if (percentile >= 95) return { status: 'bad', statusLabel: 'At risk' };
  if (percentile >= 85)
    return { status: 'moderate', statusLabel: 'Above typical' };
  if (percentile < 5)
    return { status: 'moderate', statusLabel: 'Below typical' };
  return { status: 'healthy', statusLabel: 'Typical' };
}

function heightForAgeStatus(percentile: number): {
  status: MetricStatus;
  statusLabel: string;
} {
  if (percentile < 3)
    return { status: 'moderate', statusLabel: 'Short for age' };
  if (percentile > 97)
    return { status: 'moderate', statusLabel: 'Tall for age' };
  return { status: 'healthy', statusLabel: 'Typical' };
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

function latestIso(...dates: string[]): string {
  return dates.reduce((a, b) => (a > b ? a : b));
}

function yearsAt(birthDate: string, recordedAt: string): number {
  return ageInMonths(birthDate, recordedAt) / 12;
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

  const derived: DerivedMetric[] = [];

  if (weight && height) {
    const heightM = height.value / 100;
    const bmi = weight.value / (heightM * heightM);
    const recordedAt = latestIso(weight.recordedAt, height.recordedAt);
    const years = profile ? yearsAt(profile.birthDate, recordedAt) : undefined;
    const months = profile
      ? ageInMonths(profile.birthDate, recordedAt)
      : undefined;

    const metric: DerivedMetric = {
      key: 'bmi',
      label: 'BMI',
      value: bmi,
      formatted: bmi.toFixed(1),
      hint: 'Body mass index from latest weight and height.',
    };

    if (years !== undefined && years >= ADULT_YEARS) {
      metric.hint =
        'Body mass index from latest weight and height. Healthy adult range: 18.5–24.9.';
      metric.status = bmiStatus(bmi);
    } else if (
      years !== undefined &&
      months !== undefined &&
      years >= 2 &&
      years < ADULT_YEARS &&
      profile &&
      cdcChartSex(profile.sex)
    ) {
      const percentile = bmiForAgePercentile(bmi, profile.sex, months);
      if (percentile != null) {
        const scored = bmiForAgeStatus(percentile);
        metric.detail = formatPercentileLabel(percentile);
        metric.status = scored.status;
        metric.statusLabel = scored.statusLabel;
        metric.hint =
          'Compared with children of the same age and sex (CDC). Typical: 5th–85th percentile.';
      }
    } else if (years !== undefined && years < 2) {
      metric.hint =
        'Body mass index from latest weight and height. CDC percentiles start at age 2.';
    } else if (profile && !cdcChartSex(profile.sex) && years !== undefined && years < ADULT_YEARS) {
      metric.hint =
        'Body mass index from latest weight and height. Percentiles need male or female sex.';
    }

    derived.push(metric);
  }

  if (height && profile) {
    const months = ageInMonths(profile.birthDate, height.recordedAt);
    const years = months / 12;
    if (years >= 2 && years < ADULT_YEARS && cdcChartSex(profile.sex)) {
      const percentile = heightForAgePercentile(
        height.value,
        profile.sex,
        months,
      );
      if (percentile != null) {
        const scored = heightForAgeStatus(percentile);
        derived.push({
          key: 'height-for-age',
          label: 'Height-for-age',
          value: percentile,
          formatted: formatPercentileShort(percentile),
          hint: 'Compared with children of the same age and sex (CDC). Typical: 3rd–97th percentile.',
          status: scored.status,
          statusLabel: scored.statusLabel,
        });
      }
    }
  }

  if (waist && height) {
    const ratio = waist.value / height.value;
    const recordedAt = latestIso(waist.recordedAt, height.recordedAt);
    const years = profile ? yearsAt(profile.birthDate, recordedAt) : undefined;
    const scoreWhtr =
      years !== undefined &&
      (years >= ADULT_YEARS ||
        (years >= WHTR_KID_MIN_YEARS && years < ADULT_YEARS));

    derived.push({
      key: 'whtr',
      label: 'Waist-to-height',
      value: ratio,
      formatted: ratio.toFixed(2),
      hint:
        years !== undefined && years < ADULT_YEARS
          ? years >= WHTR_KID_MIN_YEARS
            ? 'Keep waist below half of height (ages 5+).'
            : 'Waist-to-height is scored from age 5. Below 0.5 is generally lower risk.'
          : 'Below 0.5 is often associated with lower health risk.',
      status: scoreWhtr ? whtrStatus(ratio) : undefined,
    });
  }

  if (waist && hips) {
    const ratio = waist.value / hips.value;
    const recordedAt = latestIso(waist.recordedAt, hips.recordedAt);
    const years = profile ? yearsAt(profile.birthDate, recordedAt) : undefined;
    const isAdult = years !== undefined && years >= ADULT_YEARS;

    // WHR cutoffs are only validated for adults; hide the metric for under-18s.
    if (isAdult) {
      derived.push({
        key: 'whr',
        label: 'Waist-to-hip',
        value: ratio,
        formatted: ratio.toFixed(2),
        hint: 'Ratio of latest waist and hip measurements. Lower is generally healthier.',
        status: profile ? whrStatus(ratio, profile.sex) : undefined,
      });
    }
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
