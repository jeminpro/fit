import type { Sex } from './types';
import cdcBmiRaw from '../data/cdc-bmi-for-age.json';
import cdcStatureRaw from '../data/cdc-stature-for-age.json';

/** CDC 2000 BMI-for-age and stature-for-age LMS tables (ages 24–240 months). */
export interface LmsParams {
  L: number;
  M: number;
  S: number;
}

interface CdcLmsFile {
  _source: string;
  male: Record<string, LmsParams>;
  female: Record<string, LmsParams>;
}

const cdcBmi = cdcBmiRaw as CdcLmsFile;
const cdcStature = cdcStatureRaw as CdcLmsFile;

export type CdcChartSex = 'male' | 'female';

export const CDC_MIN_MONTHS = 24;
export const ADULT_YEARS = 18;
export const WHTR_KID_MIN_YEARS = 5;

/** Inverse-normal z for the 3rd / 97th percentiles. */
export const Z_P3 = -1.880793608;
export const Z_P50 = 0;
export const Z_P97 = 1.880793608;

const sortedAgesCache = new WeakMap<Record<string, LmsParams>, number[]>();

export function cdcChartSex(sex: Sex): CdcChartSex | null {
  if (sex === 'male' || sex === 'female') return sex;
  return null;
}

function sortedAges(table: Record<string, LmsParams>): number[] {
  let cached = sortedAgesCache.get(table);
  if (!cached) {
    cached = Object.keys(table)
      .map(Number)
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b);
    sortedAgesCache.set(table, cached);
  }
  return cached;
}

export function lookupLms(
  table: Record<string, LmsParams>,
  ageMonths: number,
): LmsParams | null {
  const ages = sortedAges(table);
  if (ages.length === 0) return null;
  const min = ages[0];
  const max = ages[ages.length - 1];
  if (ageMonths < min || ageMonths > max) return null;

  let lo = min;
  let hi = max;
  for (const age of ages) {
    if (age === ageMonths) return table[String(age)] ?? null;
    if (age < ageMonths) lo = age;
    if (age > ageMonths) {
      hi = age;
      break;
    }
  }

  const a = table[String(lo)];
  const b = table[String(hi)];
  if (!a || !b) return null;
  if (lo === hi) return a;
  const t = (ageMonths - lo) / (hi - lo);
  return {
    L: a.L + t * (b.L - a.L),
    M: a.M + t * (b.M - a.M),
    S: a.S + t * (b.S - a.S),
  };
}

export function lmsZ(x: number, { L, M, S }: LmsParams): number {
  if (x <= 0 || M <= 0 || S <= 0) return Number.NaN;
  if (L === 0) return Math.log(x / M) / S;
  return (Math.pow(x / M, L) - 1) / (L * S);
}

export function lmsValue(z: number, { L, M, S }: LmsParams): number {
  if (L === 0) return M * Math.exp(S * z);
  return M * Math.pow(1 + L * S * z, 1 / L);
}

/** Abramowitz and Stegun 7.1.26 error-function approximation. */
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) *
      t +
      0.254829592) *
      t *
      Math.exp(-ax * ax);
  return sign * y;
}

export function zToPercentile(z: number): number {
  if (!Number.isFinite(z)) return Number.NaN;
  return 50 * (1 + erf(z / Math.SQRT2));
}

function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

export function formatPercentileLabel(percentile: number): string {
  if (percentile < 1) return '<1st percentile';
  if (percentile > 99) return '>99th percentile';
  return `${ordinal(Math.round(percentile))} percentile`;
}

export function formatPercentileShort(percentile: number): string {
  if (percentile < 1) return '<1st';
  if (percentile > 99) return '>99th';
  return ordinal(Math.round(percentile));
}

function percentileFor(
  table: Record<string, LmsParams>,
  value: number,
  sex: Sex,
  ageMonths: number,
): number | null {
  const chart = cdcChartSex(sex);
  if (!chart) return null;
  const lms = lookupLms(table[chart], ageMonths);
  if (!lms) return null;
  const percentile = zToPercentile(lmsZ(value, lms));
  return Number.isFinite(percentile) ? percentile : null;
}

function valueAtZ(
  table: Record<string, LmsParams>,
  sex: CdcChartSex,
  ageMonths: number,
  z: number,
): number | null {
  const lms = lookupLms(table[sex], ageMonths);
  if (!lms) return null;
  const value = lmsValue(z, lms);
  return Number.isFinite(value) ? value : null;
}

export function bmiForAgePercentile(
  bmi: number,
  sex: Sex,
  ageMonths: number,
): number | null {
  return percentileFor(cdcBmi, bmi, sex, ageMonths);
}

export function heightForAgePercentile(
  heightCm: number,
  sex: Sex,
  ageMonths: number,
): number | null {
  return percentileFor(cdcStature, heightCm, sex, ageMonths);
}

export function statureCmAtZ(
  sex: CdcChartSex,
  ageMonths: number,
  z: number,
): number | null {
  return valueAtZ(cdcStature, sex, ageMonths, z);
}
