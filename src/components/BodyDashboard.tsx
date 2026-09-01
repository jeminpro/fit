import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { MetricCard } from './MetricCard';
import { DerivedMetricCard } from './DerivedMetricCard';
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
  const derived = computeDerivedMetrics(measurements, activeProfile);

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => setShowWizard(true)}
        className="btn-primary w-full py-3 text-sm"
      >
        Weekly check-in
      </button>

      {derived.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-slate-300">
            Derived metrics
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {derived.map((d) => (
              <DerivedMetricCard key={d.key} metric={d} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="mb-3 text-sm font-semibold text-slate-300">
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
