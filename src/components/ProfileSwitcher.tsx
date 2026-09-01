import { useApp } from '../context/AppContext';

export function ProfileSwitcher() {
  const { profiles, activeProfile, setActiveProfile } = useApp();

  if (profiles.length <= 1) {
    return (
      <div className="text-sm font-medium text-slate-400">
        {activeProfile?.name ?? 'No profile'}
      </div>
    );
  }

  return (
    <select
      value={activeProfile?.id ?? ''}
      onChange={(e) => setActiveProfile(e.target.value)}
      className="cursor-pointer rounded-lg border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm font-medium text-slate-200 transition hover:border-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
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
