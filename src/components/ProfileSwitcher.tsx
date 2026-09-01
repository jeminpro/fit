import { useApp } from '../context/AppContext';

export function ProfileSwitcher() {
  const { profiles, activeProfile, setActiveProfile } = useApp();

  if (profiles.length <= 1) {
    return (
      <div className="text-sm font-medium text-slate-600">
        {activeProfile?.name ?? 'No profile'}
      </div>
    );
  }

  return (
    <select
      value={activeProfile?.id ?? ''}
      onChange={(e) => setActiveProfile(e.target.value)}
      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
      aria-label="Switch profile"
    >
      {profiles.map((profile) => (
        <option key={profile.id} value={profile.id}>
          {profile.name}
        </option>
      ))}
    </select>
  );
}
