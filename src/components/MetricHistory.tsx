import { useEffect, useMemo, useRef, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import { useApp } from '../context/AppContext';
import type { MeasurementType } from '../lib/types';
import { MEASUREMENT_LABELS } from '../lib/constants';
import { getMeasurementsByType } from '../lib/derived';
import {
  formatMeasurementValue,
  fromCanonical,
  unitLabel,
  toCanonical,
} from '../lib/units';
import {
  formatDisplayDate,
  formatShortDate,
  ageInYears,
  ageInMonths,
} from '../lib/dates';
import {
  cdcChartSex,
  formatPercentileLabel,
  heightForAgePercentile,
  statureCmAtZ,
  Z_P3,
  Z_P50,
  Z_P97,
} from '../lib/growth';

type Range = '30' | '90' | 'all';

const CHART_TOOLTIP_STYLE = {
  backgroundColor: '#0f1626',
  border: '1px solid #233049',
  borderRadius: '0.75rem',
  color: '#f1f5f9',
};

interface MetricHistoryProps {
  type: MeasurementType;
  tip: string;
  onClose: () => void;
}

export function MetricHistory({ type, tip, onClose }: MetricHistoryProps) {
  const {
    activeProfile,
    measurements,
    prefs,
    addMeasurement,
    updateMeasurement,
    deleteMeasurement,
  } = useApp();
  const units = prefs?.units ?? 'metric';
  const [range, setRange] = useState<Range>('90');
  const [editId, setEditId] = useState<string | null>(null);
  const [value, setValue] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const valueInputRef = useRef<HTMLInputElement>(null);

  const allData = getMeasurementsByType(measurements, type);
  const filtered = useMemo(() => {
    if (range === 'all') return allData;
    const days = range === '30' ? 30 : 90;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return allData.filter((m) => new Date(m.recordedAt) >= cutoff);
  }, [allData, range]);

  const chartData = filtered.map((m) => ({
    id: m.id,
    date: formatShortDate(m.recordedAt),
    fullDate: m.recordedAt,
    value: fromCanonical(type, m.value, units),
    note: m.note,
  }));

  const currentAgeYears = activeProfile
    ? ageInYears(activeProfile.birthDate, new Date().toISOString())
    : 0;

  const isGrowthChart =
    type === 'height' && activeProfile && currentAgeYears < 18;

  const chartSex =
    isGrowthChart && activeProfile && currentAgeYears >= 2
      ? cdcChartSex(activeProfile.sex)
      : null;

  const latestHeightPercentile = useMemo(() => {
    if (!isGrowthChart || !activeProfile || !chartSex || allData.length === 0) {
      return null;
    }
    const latest = allData[allData.length - 1];
    const months = ageInMonths(activeProfile.birthDate, latest.recordedAt);
    return heightForAgePercentile(latest.value, activeProfile.sex, months);
  }, [isGrowthChart, activeProfile, chartSex, allData]);

  const growthData = useMemo(() => {
    if (!isGrowthChart || !activeProfile) return [];

    const childPoints = allData.map((m) => ({
      age: ageInYears(activeProfile.birthDate, m.recordedAt),
      height: fromCanonical(type, m.value, units),
      date: formatShortDate(m.recordedAt),
    }));

    if (childPoints.length === 0) return [];

    const showBands = Boolean(chartSex);
    const ages = childPoints.map((p) => p.age);
    const minChild = Math.min(...ages);
    const maxChild = Math.max(...ages);
    const minAge = showBands ? Math.max(2, minChild - 0.5) : minChild;
    const maxAge = showBands ? Math.min(20, maxChild + 0.5) : maxChild;

    type GrowthPoint = {
      age: number;
      height?: number;
      date?: string;
      p3?: number;
      p50?: number;
      p97?: number;
    };

    const points = new Map<string, GrowthPoint>();
    const keyFor = (age: number) => age.toFixed(3);

    const bandsAt = (ageYears: number) => {
      if (!chartSex || ageYears < 2) return {};
      const months = ageYears * 12;
      const p3 = statureCmAtZ(chartSex, months, Z_P3);
      const p50 = statureCmAtZ(chartSex, months, Z_P50);
      const p97 = statureCmAtZ(chartSex, months, Z_P97);
      if (p3 == null || p50 == null || p97 == null) return {};
      return {
        p3: fromCanonical('height', p3, units),
        p50: fromCanonical('height', p50, units),
        p97: fromCanonical('height', p97, units),
      };
    };

    if (showBands) {
      const start = Math.floor(minAge * 2) / 2;
      for (let age = start; age <= maxAge + 1e-9; age += 0.5) {
        const rounded = Math.round(age * 10) / 10;
        points.set(keyFor(rounded), {
          age: rounded,
          ...bandsAt(rounded),
        });
      }
    }

    for (const child of childPoints) {
      const key = keyFor(child.age);
      const existing = points.get(key) ?? { age: child.age };
      points.set(key, {
        ...existing,
        age: child.age,
        height: child.height,
        date: child.date,
        ...(showBands ? bandsAt(child.age) : {}),
      });
    }

    return [...points.values()].sort((a, b) => a.age - b.age);
  }, [isGrowthChart, activeProfile, allData, chartSex, type, units]);

  function resetNewEntry() {
    setEditId(null);
    setValue('');
    setNote('');
    setDate(new Date().toISOString().slice(0, 10));
    setSaveError('');
  }

  function focusValueField() {
    requestAnimationFrame(() => {
      valueInputRef.current?.focus();
      valueInputRef.current?.select();
    });
  }

  useEffect(() => {
    focusValueField();
  }, []);

  async function handleSave() {
    if (!activeProfile || !value.trim()) return;
    setSaving(true);
    setSaveError('');
    try {
      const recordedAt = new Date(date).toISOString();
      const canonical = toCanonical(type, Number(value), units);
      if (editId) {
        await updateMeasurement(editId, {
          type,
          value: canonical,
          recordedAt,
          note: note.trim() || undefined,
        });
        resetNewEntry();
      } else {
        await addMeasurement({
          type,
          value: canonical,
          recordedAt,
          note: note.trim() || undefined,
        });
        setValue('');
        setNote('');
        setDate(new Date().toISOString().slice(0, 10));
        setSaveError('');
      }
      focusValueField();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!activeProfile) return;
    if (!confirm('Delete this entry?')) return;
    await deleteMeasurement(id);
    if (editId === id) {
      resetNewEntry();
      focusValueField();
    }
  }

  function startEdit(id: string) {
    const entry = allData.find((m) => m.id === id);
    if (!entry) return;
    setEditId(id);
    setValue(String(fromCanonical(type, entry.value, units)));
    setDate(entry.recordedAt.slice(0, 10));
    setNote(entry.note ?? '');
    setSaveError('');
    focusValueField();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-surface-700 bg-surface-900 p-6 shadow-2xl shadow-black/50">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-100">
              {MEASUREMENT_LABELS[type]} history
            </h2>
            <p className="mt-1 text-sm text-slate-400">{tip}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg px-2 py-1 text-sm text-slate-400 transition hover:bg-surface-800 hover:text-slate-200"
          >
            Close
          </button>
        </div>

        <div className="mb-4 rounded-xl border border-surface-700 bg-surface-800/50 p-4">
          <h3 className="text-sm font-semibold text-slate-200">
            {editId ? 'Edit entry' : 'New entry'}
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input
              ref={valueInputRef}
              type="number"
              step="0.1"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={`Value (${unitLabel(type, units)})`}
              className="input rounded-lg px-3 py-2 ring-2 ring-brand-500/40"
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input rounded-lg px-3 py-2"
            />
          </div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            className="input mt-3 rounded-lg px-3 py-2 text-sm"
          />
          {saveError && (
            <p className="mt-2 text-sm text-rose-400">{saveError}</p>
          )}
          <div className="mt-3 flex gap-2">
            {editId && (
              <button
                type="button"
                onClick={() => {
                  resetNewEntry();
                  focusValueField();
                }}
                className="btn-secondary rounded-lg px-4 py-2 text-sm"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !value.trim()}
              className="btn-primary rounded-lg px-4 py-2 text-sm"
            >
              {saving ? 'Saving…' : editId ? 'Update' : 'Save'}
            </button>
          </div>
        </div>

        <div className="mb-4 flex gap-2">
          {(['30', '90', 'all'] as Range[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                range === r
                  ? 'bg-brand-500 text-surface-950'
                  : 'bg-surface-800 text-slate-400 hover:bg-surface-700 hover:text-slate-200'
              }`}
            >
              {r === 'all' ? 'All' : `${r}d`}
            </button>
          ))}
        </div>

        {chartData.length > 1 ? (
          <div className="mb-6 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#233049" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} stroke="#334155" />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  stroke="#334155"
                  domain={['auto', 'auto']}
                  unit={` ${unitLabel(type, units)}`}
                />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  formatter={(v: number) => [
                    `${v} ${unitLabel(type, units)}`,
                    MEASUREMENT_LABELS[type],
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#34d399"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#34d399', stroke: '#34d399' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="mb-6 text-center text-sm text-slate-500">
            Add at least two entries to see a chart.
          </p>
        )}

        {isGrowthChart && allData.length > 1 && (
          <div className="mb-6">
            <h3 className="mb-1 text-sm font-semibold text-slate-300">
              Growth chart (height vs age)
            </h3>
            {latestHeightPercentile != null && (
              <p className="mb-2 text-xs text-slate-500">
                Latest: {formatPercentileLabel(latestHeightPercentile)} (CDC)
              </p>
            )}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={growthData}
                  margin={{ top: 8, right: 8, bottom: 12, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#233049" />
                  <XAxis
                    dataKey="age"
                    type="number"
                    domain={['dataMin', 'dataMax']}
                    tickFormatter={(v: number) => Number(v).toFixed(1)}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    stroke="#334155"
                    label={{
                      value: 'Age (years)',
                      position: 'insideBottom',
                      offset: -5,
                      fill: '#94a3b8',
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    stroke="#334155"
                    unit={` ${unitLabel(type, units)}`}
                  />
                  <Tooltip
                    contentStyle={CHART_TOOLTIP_STYLE}
                    labelFormatter={(label) => `Age ${Number(label).toFixed(1)}y`}
                    formatter={(value: number, name: string) => [
                      `${value} ${unitLabel(type, units)}`,
                      name,
                    ]}
                  />
                  {chartSex && (
                    <Legend
                      wrapperStyle={{ fontSize: 11, color: '#94a3b8' }}
                    />
                  )}
                  {chartSex && (
                    <>
                      <Line
                        type="monotone"
                        dataKey="p3"
                        name="P3"
                        stroke="#64748b"
                        strokeDasharray="4 4"
                        dot={false}
                        connectNulls
                        strokeWidth={1}
                      />
                      <Line
                        type="monotone"
                        dataKey="p50"
                        name="P50"
                        stroke="#94a3b8"
                        strokeDasharray="2 2"
                        dot={false}
                        connectNulls
                        strokeWidth={1}
                      />
                      <Line
                        type="monotone"
                        dataKey="p97"
                        name="P97"
                        stroke="#64748b"
                        strokeDasharray="4 4"
                        dot={false}
                        connectNulls
                        strokeWidth={1}
                      />
                    </>
                  )}
                  <Line
                    type="monotone"
                    dataKey="height"
                    name="Height"
                    stroke="#60a5fa"
                    strokeWidth={2}
                    connectNulls
                    dot={{ r: 3, fill: '#60a5fa', stroke: '#60a5fa' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {[...filtered].reverse().map((m) => (
            <div
              key={m.id}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 transition ${
                editId === m.id
                  ? 'border-brand-500/50 bg-brand-500/10'
                  : 'border-surface-700 bg-surface-800/40'
              }`}
            >
              <div>
                <p className="font-semibold text-slate-100">
                  {formatMeasurementValue(type, m.value, units)}
                </p>
                <p className="text-xs text-slate-500">
                  {formatDisplayDate(m.recordedAt)}
                  {m.note ? ` · ${m.note}` : ''}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(m.id)}
                  className="cursor-pointer rounded-md px-2 py-1 text-xs font-medium text-brand-400 transition hover:bg-brand-500/10 hover:text-brand-300"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(m.id)}
                  className="cursor-pointer rounded-md px-2 py-1 text-xs font-medium text-rose-400 transition hover:bg-rose-500/10 hover:text-rose-300"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
