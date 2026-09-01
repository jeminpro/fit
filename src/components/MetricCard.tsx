import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { MeasurementType } from '../lib/types';
import { MEASUREMENT_LABELS } from '../lib/constants';
import { formatShortDate } from '../lib/dates';
import { formatMeasurementValue } from '../lib/units';
import { useApp } from '../context/AppContext';
import { getMeasurementsByType } from '../lib/derived';

interface SparklineProps {
  type: MeasurementType;
  height?: number;
}

export function Sparkline({ type, height = 40 }: SparklineProps) {
  const { measurements, prefs } = useApp();
  const units = prefs?.units ?? 'metric';
  const data = getMeasurementsByType(measurements, type).slice(-14);

  if (data.length < 2) {
    return (
      <div
        className="flex items-center justify-center text-xs text-slate-400"
        style={{ height }}
      >
        —
      </div>
    );
  }

  const chartData = data.map((m) => ({
    date: formatShortDate(m.recordedAt),
    value: Number(
      formatMeasurementValue(type, m.value, units).split(' ')[0],
    ),
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData}>
        <Line
          type="monotone"
          dataKey="value"
          stroke="#16a34a"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

interface MetricCardProps {
  type: MeasurementType;
  onClick?: () => void;
}

export function MetricCard({ type, onClick }: MetricCardProps) {
  const { measurements, prefs } = useApp();
  const units = prefs?.units ?? 'metric';
  const data = getMeasurementsByType(measurements, type);
  const latest = data[data.length - 1] ?? null;
  const previous = data.length > 1 ? data[data.length - 2] : null;
  const delta =
    latest && previous ? latest.value - previous.value : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-brand-300 hover:shadow-sm"
    >
      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
        {MEASUREMENT_LABELS[type]}
      </div>
      <div className="text-xl font-bold text-slate-900">
        {latest
          ? formatMeasurementValue(type, latest.value, units)
          : 'No data'}
      </div>
      {delta !== null && (
        <div
          className={`mt-1 text-xs font-medium ${
            delta <= 0 ? 'text-brand-600' : 'text-amber-600'
          }`}
        >
          {delta > 0 ? '+' : ''}
          {formatMeasurementValue(type, Math.abs(delta), units).split(' ')[0]}{' '}
          vs last
        </div>
      )}
      <div className="mt-2">
        <Sparkline type={type} />
      </div>
    </button>
  );
}
