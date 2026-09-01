import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { exportProfileCsv, exportAllProfilesJson } from '../lib/export';
import { HabitHeatmap } from './HabitHeatmap';
import type {
  Sex,
  MeasurementType,
  UnitSystem,
  Measurement,
  HabitDay,
} from '../lib/types';
import {
  MEASUREMENT_LABELS,
  OPTIONAL_MEASUREMENTS,
  DEFAULT_ENABLED_MEASUREMENTS,
} from '../lib/constants';
import { toCanonical } from '../lib/units';

export function YouPage() {
  const {
    user,
    isGuest,
    prefs,
    profiles,
    activeProfile,
    setActiveProfile,
    setUnits,
    signIn,
    signOut,
    createProfile,
    updateProfile,
    deleteProfile,
    getProfileExportData,
  } = useApp();

  const [showAddProfile, setShowAddProfile] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [sex, setSex] = useState<Sex>('other');
  const [birthDate, setBirthDate] = useState('');
  const [enabled, setEnabled] = useState<MeasurementType[]>([
    ...DEFAULT_ENABLED_MEASUREMENTS,
  ]);
  const [targetWeight, setTargetWeight] = useState('');
  const [targetWaist, setTargetWaist] = useState('');
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const units = prefs?.units ?? 'metric';

  function resetForm() {
    setName('');
    setSex('other');
    setBirthDate('');
    setEnabled([...DEFAULT_ENABLED_MEASUREMENTS]);
    setTargetWeight('');
    setTargetWaist('');
    setEditingId(null);
    setShowAddProfile(false);
  }

  function loadProfileForEdit(profileId: string) {
    const profile = profiles.find((p) => p.id === profileId);
    if (!profile) return;
    setEditingId(profileId);
    setName(profile.name);
    setSex(profile.sex);
    setBirthDate(profile.birthDate);
    setEnabled(profile.enabledMeasurements);
    setTargetWeight(
      profile.goals.weight
        ? String(
            units === 'metric'
              ? profile.goals.weight
              : profile.goals.weight / 0.45359237,
          )
        : '',
    );
    setTargetWaist(
      profile.goals.waist
        ? String(
            units === 'metric'
              ? profile.goals.waist
              : profile.goals.waist / 2.54,
          )
        : '',
    );
    setShowAddProfile(true);
  }

  async function saveProfile() {
    if (!name.trim() || !birthDate) return;
    setSaving(true);
    try {
      const goals = {
        weight: targetWeight
          ? toCanonical('weight', Number(targetWeight), units)
          : undefined,
        waist: targetWaist
          ? toCanonical('waist', Number(targetWaist), units)
          : undefined,
      };

      if (editingId) {
        await updateProfile(editingId, {
          name: name.trim(),
          sex,
          birthDate,
          enabledMeasurements: enabled,
          goals,
        });
      } else {
        const id = await createProfile({
          name: name.trim(),
          sex,
          birthDate,
          enabledMeasurements: enabled,
          goals,
        });
        await setActiveProfile(id);
      }
      resetForm();
    } finally {
      setSaving(false);
    }
  }

  async function removeProfile(profileId: string) {
    if (!confirm('Delete this profile and all its data?')) return;
    await deleteProfile(profileId);
  }

  async function exportActiveProfile() {
    if (!activeProfile) return;
    setExporting(true);
    try {
      const data = await getProfileExportData(activeProfile);
      exportProfileCsv(activeProfile, data.measurements, data.habitDays, units);
    } finally {
      setExporting(false);
    }
  }

  async function exportAll() {
    setExporting(true);
    try {
      const data: Record<
        string,
        { measurements: Measurement[]; habitDays: HabitDay[] }
      > = {};
      for (const profile of profiles) {
        data[profile.id] = await getProfileExportData(profile);
      }
      exportAllProfilesJson(profiles, data);
    } finally {
      setExporting(false);
    }
  }

  function toggleMeasurement(type: MeasurementType) {
    setEnabled((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  }

  return (
    <div className="space-y-8">
      <section className="card p-4">
        <h3 className="text-sm font-semibold text-slate-300">Account</h3>
        {isGuest ? (
          <div className="mt-2">
            <p className="text-sm text-slate-400">
              Using local storage on this device.
            </p>
            <button
              type="button"
              onClick={() => signIn()}
              className="btn-primary mt-3 px-4 py-2 text-sm"
            >
              Sign in with Google
            </button>
          </div>
        ) : (
          <p className="mt-1 text-sm text-slate-400">{user?.email}</p>
        )}
        <label className="mt-4 block">
          <span className="text-sm font-medium text-slate-300">Units</span>
          <select
            value={units}
            onChange={(e) => setUnits(e.target.value as UnitSystem)}
            className="input mt-1"
          >
            <option value="metric">Metric (kg, cm)</option>
            <option value="imperial">Imperial (lb, in)</option>
          </select>
        </label>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-300">Profiles</h3>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowAddProfile(true);
            }}
            className="cursor-pointer text-sm font-semibold text-brand-400 transition hover:text-brand-300"
          >
            + Add profile
          </button>
        </div>

        <div className="space-y-2">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 transition ${
                activeProfile?.id === profile.id
                  ? 'border-brand-500/50 bg-brand-500/10'
                  : 'border-surface-700 bg-surface-900/60'
              }`}
            >
              <div>
                <p className="font-semibold text-slate-100">{profile.name}</p>
                <p className="text-xs text-slate-500">
                  Born {profile.birthDate} · {profile.sex}
                </p>
              </div>
              <div className="flex gap-1">
                {activeProfile?.id !== profile.id && (
                  <button
                    type="button"
                    onClick={() => setActiveProfile(profile.id)}
                    className="cursor-pointer rounded-md px-2 py-1 text-xs font-medium text-brand-400 transition hover:bg-brand-500/10 hover:text-brand-300"
                  >
                    Switch
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => loadProfileForEdit(profile.id)}
                  className="cursor-pointer rounded-md px-2 py-1 text-xs font-medium text-slate-400 transition hover:bg-surface-700 hover:text-slate-200"
                >
                  Edit
                </button>
                {profiles.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeProfile(profile.id)}
                    className="cursor-pointer rounded-md px-2 py-1 text-xs font-medium text-rose-400 transition hover:bg-rose-500/10 hover:text-rose-300"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {showAddProfile && (
          <div className="card mt-4 p-4">
            <h4 className="font-semibold text-slate-200">
              {editingId ? 'Edit profile' : 'New profile'}
            </h4>
            <div className="mt-3 space-y-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                className="input rounded-lg px-3 py-2"
              />
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value as Sex)}
                className="input rounded-lg px-3 py-2"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="input rounded-lg px-3 py-2"
              />
              <p className="text-xs font-medium text-slate-500">Measurements</p>
              {[...DEFAULT_ENABLED_MEASUREMENTS, ...OPTIONAL_MEASUREMENTS].map(
                (type) => (
                  <label
                    key={type}
                    className="flex cursor-pointer items-center gap-2 text-sm text-slate-300"
                  >
                    <input
                      type="checkbox"
                      checked={enabled.includes(type)}
                      onChange={() => toggleMeasurement(type)}
                      className="accent-brand-500"
                    />
                    {MEASUREMENT_LABELS[type]}
                  </label>
                ),
              )}
              <input
                type="number"
                step="0.1"
                value={targetWeight}
                onChange={(e) => setTargetWeight(e.target.value)}
                placeholder={`Target weight (${units === 'metric' ? 'kg' : 'lb'})`}
                className="input rounded-lg px-3 py-2"
              />
              <input
                type="number"
                step="0.1"
                value={targetWaist}
                onChange={(e) => setTargetWaist(e.target.value)}
                placeholder={`Target waist (${units === 'metric' ? 'cm' : 'in'})`}
                className="input rounded-lg px-3 py-2"
              />
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={resetForm}
                className="btn-secondary rounded-lg px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveProfile}
                disabled={saving}
                className="btn-primary rounded-lg px-4 py-2 text-sm"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-slate-300">
          Habit history
        </h3>
        <HabitHeatmap />
      </section>

      <section className="card p-4">
        <h3 className="text-sm font-semibold text-slate-300">Export data</h3>
        <p className="mt-1 text-sm text-slate-500">
          Download CSV for the active profile or JSON for all profiles.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportActiveProfile}
            disabled={exporting || !activeProfile}
            className="btn-primary rounded-lg px-4 py-2 text-sm"
          >
            Export active (CSV)
          </button>
          <button
            type="button"
            onClick={exportAll}
            disabled={exporting}
            className="btn-secondary rounded-lg px-4 py-2 text-sm"
          >
            Export all (JSON)
          </button>
        </div>
      </section>

      {!isGuest && (
        <button
          type="button"
          onClick={() => signOut()}
          className="w-full cursor-pointer rounded-xl border border-rose-500/30 py-3 text-sm font-semibold text-rose-400 transition hover:border-rose-500/60 hover:bg-rose-500/10"
        >
          Sign out
        </button>
      )}
    </div>
  );
}
