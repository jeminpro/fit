import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { MetricCard } from './MetricCard';
import { CheckinWizard } from './CheckinWizard';
import { MetricHistory } from './MetricHistory';
import type { MeasurementType } from '../lib/types';
import { computeDerivedMetrics } from '../lib/derived';
import { MEASUREMENT_TIPS } from '../lib/constants';

export function BodyDashboard() {
  const { activeProfile, measurements } = useApp();
  const [showWizard, setShowWizard] = useState(false);
  const [selectedType, setSelectedType] = useState<MeasurementType | null>(null);

  if (!activeProfile) return null;

  const enabled = activeProfile.enabledMeasurements;
  const derived = computeDerivedMetrics(measurements);
  const isKid =
    new Date().getFullYear() - new Date(activeProfile.birthDate).getFullYear() < 18;

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setShowWizard(true)}
          className="flex-1 rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
        >
          Weekly check-in
        </button>
        {isKid && (
          <button
            type="button"
            onClick={() => setSelectedType('height')}
            className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-700"
          >
            Log height
          </button>
        )}
      </div>

      {derived.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-slate-700">
            Derived metrics
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {derived.map((d) => (
              <div
                key={d.key}
                className="rounded-xl border border-slate-200 bg-white p-3"
                title={d.hint}
              >
                <p className="text-xs text-slate-500">{d.label}</p>
                <p className="text-lg font-bold">{d.formatted}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="mb-3 text-sm font-semibold text-slate-700">
          Measurements
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {enabled.map((type) => (
            <MetricCard
              key={type}
              type={type}
              onClick={() => setSelectedType(type)}
            />
          ))}
        </div>
      </section>

      {selectedType && (
        <MetricHistory
          type={selectedType}
          tip={MEASUREMENT_TIPS[selectedType]}
          onClose={() => setSelectedType(null)}
        />
      )}

      {showWizard && (
        <CheckinWizard onClose={() => setShowWizard(false)} />
      )}
    </div>
  );
}
