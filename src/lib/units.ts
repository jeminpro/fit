import type { MeasurementType, UnitSystem } from './types';
import { CM_PER_INCH, KG_PER_LB, MEASUREMENT_UNITS } from './constants';

export function isWeightType(type: MeasurementType): boolean {
  return type === 'weight';
}

export function toCanonical(
  type: MeasurementType,
  value: number,
  units: UnitSystem,
): number {
  if (units === 'metric') return value;
  if (isWeightType(type)) return value * KG_PER_LB;
  return value * CM_PER_INCH;
}

export function fromCanonical(
  type: MeasurementType,
  value: number,
  units: UnitSystem,
): number {
  if (units === 'metric') return roundDisplay(value, type);
  if (isWeightType(type)) return roundDisplay(value / KG_PER_LB, type);
  return roundDisplay(value / CM_PER_INCH, type);
}

function roundDisplay(value: number, type: MeasurementType): number {
  if (type === 'weight') return Math.round(value * 10) / 10;
  return Math.round(value * 10) / 10;
}

export function unitLabel(
  type: MeasurementType,
  units: UnitSystem,
): string {
  return MEASUREMENT_UNITS[type][units];
}

export function formatMeasurementValue(
  type: MeasurementType,
  canonicalValue: number,
  units: UnitSystem,
): string {
  const display = fromCanonical(type, canonicalValue, units);
  return `${display} ${unitLabel(type, units)}`;
}

export function formatDelta(
  type: MeasurementType,
  deltaCanonical: number,
  units: UnitSystem,
): string {
  const display = fromCanonical(type, Math.abs(deltaCanonical), units);
  const sign = deltaCanonical > 0 ? '+' : deltaCanonical < 0 ? '-' : '';
  return `${sign}${display} ${unitLabel(type, units)}`;
}
