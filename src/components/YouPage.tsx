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
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-700">Account</h3>
        {isGuest ? (
          <div className="mt-2">
            <p className="text-sm text-slate-600">
              Using local storage on this device.
            </p>
            <button
              type="button"
              onClick={() => signIn()}
              className="mt-3 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Sign in with Google
            </button>
          </div>
        ) : (
          <p className="mt-1 text-sm text-slate-600">{user?.email}</p>
        )}
        <label className="mt-4 block">
          <span className="text-sm font-medium text-slate-700">Units</span>
          <select
            value={units}
            onChange={(e) => setUnits(e.target.value as UnitSystem)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
          >
            <option value="metric">Metric (kg, cm)</option>
            <option value="imperial">Imperial (lb, in)</option>
          </select>
        </label>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Profiles</h3>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowAddProfile(true);
            }}
            className="text-sm font-semibold text-brand-600"
          >
            Add profile
          </button>
        </div>

        <div className="space-y-2">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                activeProfile?.id === profile.id
                  ? 'border-brand-300 bg-brand-50'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div>
                <p className="font-semibold text-slate-900">{profile.name}</p>
                <p className="text-xs text-slate-500">
                  Born {profile.birthDate} · {profile.sex}
                </p>
              </div>
              <div className="flex gap-2">
                {activeProfile?.id !== profile.id && (
                  <button
                    type="button"
                    onClick={() => setActiveProfile(profile.id)}
                    className="text-xs font-medium text-brand-600"
                  >
                    Switch
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => loadProfileForEdit(profile.id)}
                  className="text-xs font-medium text-slate-600"
                >
                  Edit
                </button>
                {profiles.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeProfile(profile.id)}
                    className="text-xs font-medium text-red-600"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {showAddProfile && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h4 className="font-semibold text-slate-800">
              {editingId ? 'Edit profile' : 'New profile'}
            </h4>
            <div className="mt-3 space-y-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                className="w-full rounded-lg border border-slate-200 px-3 py-2"
              />
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value as Sex)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2"
              />
              <p className="text-xs font-medium text-slate-500">Measurements</p>
              {[...DEFAULT_ENABLED_MEASUREMENTS, ...OPTIONAL_MEASUREMENTS].map(
                (type) => (
                  <label key={type} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={enabled.includes(type)}
                      onChange={() => toggleMeasurement(type)}
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
                className="w-full rounded-lg border border-slate-200 px-3 py-2"
              />
              <input
                type="number"
                step="0.1"
                value={targetWaist}
                onChange={(e) => setTargetWaist(e.target.value)}
                placeholder={`Target waist (${units === 'metric' ? 'cm' : 'in'})`}
                className="w-full rounded-lg border border-slate-200 px-3 py-2"
              />
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveProfile}
                disabled={saving}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-slate-700">
          Habit history
        </h3>
        <HabitHeatmap />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-700">Export data</h3>
        <p className="mt-1 text-sm text-slate-500">
          Download CSV for the active profile or JSON for all profiles.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportActiveProfile}
            disabled={exporting || !activeProfile}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Export active (CSV)
          </button>
          <button
            type="button"
            onClick={exportAll}
            disabled={exporting}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
          >
            Export all (JSON)
          </button>
        </div>
      </section>

      {!isGuest && (
        <button
          type="button"
          onClick={() => signOut()}
          className="w-full rounded-xl border border-red-200 py-3 text-sm font-semibold text-red-600"
        >
          Sign out
        </button>
      )}
    </div>
  );
}
