import { useEffect, useMemo, useState } from 'react';
import {
  exerciseImageUrl,
  filterExercises,
  formatLabel,
  uniqueFacets,
  type ExerciseIndexItem,
} from '../lib/exerciseCatalog';

interface ExercisePickerProps {
  exercises: ExerciseIndexItem[];
  sha: string;
  favouriteIds: string[];
  recentIds: string[];
  onAdd: (selected: ExerciseIndexItem[]) => void;
  onClose: () => void;
  onOpenDetail: (exercise: ExerciseIndexItem) => void;
}

type FacetKey = 'muscle' | 'equipment' | 'category' | 'level';

function Chip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition ${
        active
          ? 'border-brand-500/60 bg-brand-500/15 text-brand-300'
          : 'border-surface-700 bg-surface-900/60 text-slate-300 hover:border-slate-500'
      }`}
    >
      {label}
    </button>
  );
}

export function ExercisePicker({
  exercises,
  sha,
  favouriteIds,
  recentIds,
  onAdd,
  onClose,
  onOpenDetail,
}: ExercisePickerProps) {
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [level, setLevel] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const facets = useMemo(() => uniqueFacets(exercises), [exercises]);
  const byId = useMemo(
    () => new Map(exercises.map((e) => [e.id, e])),
    [exercises],
  );

  const filtered = useMemo(
    () =>
      filterExercises(exercises, {
        query,
        muscle,
        equipment,
        category,
        level,
      }),
    [exercises, query, muscle, equipment, category, level],
  );

  const showBrowseSections = !query.trim() && !muscle && !equipment && !category && !level;

  const favourites = useMemo(
    () => favouriteIds.map((id) => byId.get(id)).filter(Boolean) as ExerciseIndexItem[],
    [favouriteIds, byId],
  );
  const recents = useMemo(
    () =>
      recentIds
        .map((id) => byId.get(id))
        .filter((e): e is ExerciseIndexItem => Boolean(e) && !favouriteIds.includes(e.id)),
    [recentIds, byId, favouriteIds],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleFacet(key: FacetKey, value: string) {
    const setters = {
      muscle: setMuscle,
      equipment: setEquipment,
      category: setCategory,
      level: setLevel,
    } as const;
    const current = { muscle, equipment, category, level }[key];
    setters[key](current === value ? null : value);
  }

  function handleAdd() {
    const items = [...selected]
      .map((id) => byId.get(id))
      .filter((e): e is ExerciseIndexItem => Boolean(e));
    if (items.length === 0) return;
    onAdd(items);
  }

  function renderRow(ex: ExerciseIndexItem) {
    const isSelected = selected.has(ex.id);
    return (
      <div
        key={ex.id}
        className={`flex items-center gap-3 rounded-xl border px-2.5 py-2 transition ${
          isSelected
            ? 'border-brand-500/50 bg-brand-500/10'
            : 'border-surface-700/60 bg-surface-900/40'
        }`}
      >
        <button
          type="button"
          onClick={() => toggle(ex.id)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <img
            src={exerciseImageUrl(sha, ex.id, 0)}
            alt=""
            className="h-12 w-12 shrink-0 rounded-lg border border-surface-700 object-cover"
            loading="lazy"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-100">{ex.name}</p>
            <p className="truncate text-xs text-slate-400">
              {ex.primaryMuscles.map(formatLabel).join(', ')}
              {ex.equipment ? ` · ${formatLabel(ex.equipment)}` : ''}
            </p>
          </div>
        </button>
        <button
          type="button"
          onClick={() => onOpenDetail(ex)}
          className="cursor-pointer rounded-lg px-2 py-1 text-xs text-slate-400 transition hover:bg-surface-800 hover:text-slate-200"
        >
          Info
        </button>
        <button
          type="button"
          onClick={() => toggle(ex.id)}
          aria-pressed={isSelected}
          className={`flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full border text-xs font-bold transition ${
            isSelected
              ? 'border-brand-500 bg-brand-500 text-surface-950'
              : 'border-surface-600 text-slate-400'
          }`}
        >
          {isSelected ? '✓' : '+'}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex h-[92vh] w-full max-w-lg flex-col rounded-t-2xl border border-surface-700 bg-surface-900 shadow-2xl shadow-black/50 sm:h-[85vh] sm:rounded-2xl">
        <div className="sticky top-0 z-10 border-b border-surface-800 bg-surface-900/95 px-4 pb-3 pt-4 backdrop-blur">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-100">Add exercises</h2>
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-lg px-2 py-1 text-sm text-slate-400 transition hover:bg-surface-800 hover:text-slate-200"
            >
              Close
            </button>
          </div>
          <input
            className="input"
            type="search"
            placeholder="Search exercises…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <div className="mt-3 space-y-2">
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {facets.muscles.map((m) => (
                <Chip
                  key={m}
                  label={formatLabel(m)}
                  active={muscle === m}
                  onClick={() => toggleFacet('muscle', m)}
                />
              ))}
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {facets.equipment.map((e) => (
                <Chip
                  key={e}
                  label={formatLabel(e)}
                  active={equipment === e}
                  onClick={() => toggleFacet('equipment', e)}
                />
              ))}
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {facets.levels.map((l) => (
                <Chip
                  key={l}
                  label={formatLabel(l)}
                  active={level === l}
                  onClick={() => toggleFacet('level', l)}
                />
              ))}
              {facets.categories.map((c) => (
                <Chip
                  key={c}
                  label={formatLabel(c)}
                  active={category === c}
                  onClick={() => toggleFacet('category', c)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3">
          {showBrowseSections && favourites.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Favourites
              </h3>
              <div className="space-y-2">{favourites.map(renderRow)}</div>
            </section>
          )}
          {showBrowseSections && recents.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Recent
              </h3>
              <div className="space-y-2">{recents.map(renderRow)}</div>
            </section>
          )}
          <section>
            {showBrowseSections && (favourites.length > 0 || recents.length > 0) && (
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                All exercises
              </h3>
            )}
            <div className="space-y-2">
              {filtered.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  No exercises match your filters.
                </p>
              ) : (
                filtered.map(renderRow)
              )}
            </div>
          </section>
        </div>

        <div className="border-t border-surface-800 bg-surface-900 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            className="btn-primary w-full px-4 py-3 text-sm"
            disabled={selected.size === 0}
            onClick={handleAdd}
          >
            Add {selected.size > 0 ? selected.size : ''} exercise
            {selected.size === 1 ? '' : 's'}
          </button>
        </div>
      </div>
    </div>
  );
}
