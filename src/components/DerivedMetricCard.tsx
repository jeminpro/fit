import type { DerivedMetric, MetricStatus } from '../lib/derived';

const STATUS_STYLES: Record<
  MetricStatus,
  { label: string; badge: string; dot: string; ring: string }
> = {
  healthy: {
    label: 'Healthy',
    badge: 'bg-brand-500/15 text-brand-300',
    dot: 'bg-brand-400',
    ring: 'border-brand-500/30',
  },
  moderate: {
    label: 'Moderate',
    badge: 'bg-amber-500/15 text-amber-300',
    dot: 'bg-amber-400',
    ring: 'border-amber-500/30',
  },
  bad: {
    label: 'At risk',
    badge: 'bg-rose-500/15 text-rose-300',
    dot: 'bg-rose-400',
    ring: 'border-rose-500/30',
  },
};

export function DerivedMetricCard({ metric }: { metric: DerivedMetric }) {
  const status = metric.status ? STATUS_STYLES[metric.status] : null;

  return (
    <div
      className={`card p-3 ${status ? status.ring : ''}`}
      title={metric.hint}
    >
      <p className="text-xs font-medium text-slate-400">{metric.label}</p>
      <p className="mt-0.5 text-lg font-bold text-slate-100">
        {metric.formatted}
      </p>
      {status && (
        <span
          className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${status.badge}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>
      )}
    </div>
  );
}
