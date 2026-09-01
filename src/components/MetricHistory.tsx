import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
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
import { formatDisplayDate, formatShortDate, ageInYears } from '../lib/dates';

type Range = '30' | '90' | 'all';

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
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [value, setValue] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

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

  const isGrowthChart =
    type === 'height' &&
    activeProfile &&
    ageInYears(activeProfile.birthDate, new Date().toISOString()) < 18;

  const growthData = isGrowthChart
    ? allData.map((m) => ({
        age: ageInYears(activeProfile!.birthDate, m.recordedAt).toFixed(1),
        value: fromCanonical(type, m.value, units),
        date: formatShortDate(m.recordedAt),
      }))
    : [];

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
      } else {
        await addMeasurement({
          type,
          value: canonical,
          recordedAt,
          note: note.trim() || undefined,
        });
      }
      setShowAdd(false);
      setEditId(null);
      setValue('');
      setNote('');
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
  }

  function startEdit(id: string) {
    const entry = allData.find((m) => m.id === id);
    if (!entry) return;
    setEditId(id);
    setValue(String(fromCanonical(type, entry.value, units)));
    setDate(entry.recordedAt.slice(0, 10));
    setNote(entry.note ?? '');
    setShowAdd(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {MEASUREMENT_LABELS[type]} history
            </h2>
            <p className="mt-1 text-sm text-slate-500">{tip}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            Close
          </button>
        </div>

        <div className="mb-4 flex gap-2">
          {(['30', '90', 'all'] as Range[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                range === r
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {r === 'all' ? 'All' : `${r}d`}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setShowAdd(true);
              setEditId(null);
              setValue('');
              setNote('');
              setDate(new Date().toISOString().slice(0, 10));
            }}
            className="ml-auto rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white"
          >
            Add entry
          </button>
        </div>

        {chartData.length > 1 ? (
          <div className="mb-6 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  domain={['auto', 'auto']}
                  unit={` ${unitLabel(type, units)}`}
                />
                <Tooltip
                  formatter={(v: number) => [
                    `${v} ${unitLabel(type, units)}`,
                    MEASUREMENT_LABELS[type],
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#16a34a"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="mb-6 text-center text-sm text-slate-500">
            Add at least two entries to see a chart.
          </p>
        )}

        {isGrowthChart && growthData.length > 1 && (
          <div className="mb-6">
            <h3 className="mb-2 text-sm font-semibold text-slate-700">
              Growth chart (height vs age)
            </h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={growthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="age"
                    tick={{ fontSize: 11 }}
                    label={{ value: 'Age (years)', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    unit={` ${unitLabel(type, units)}`}
                  />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {showAdd && (
          <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-800">
              {editId ? 'Edit entry' : 'New entry'}
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <input
                type="number"
                step="0.1"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={`Value (${unitLabel(type, units)})`}
                className="rounded-lg border border-slate-200 px-3 py-2"
              />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2"
              />
            </div>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note (optional)"
              className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            {saveError && (
              <p className="mt-2 text-sm text-red-600">{saveError}</p>
            )}
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAdd(false);
                  setEditId(null);
                }}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {[...filtered].reverse().map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3"
            >
              <div>
                <p className="font-semibold text-slate-900">
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
                  className="text-xs font-medium text-brand-600"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(m.id)}
                  className="text-xs font-medium text-red-600"
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
