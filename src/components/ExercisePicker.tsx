import { useEffect, useMemo, useState } from 'react';
import {
  exerciseImageUrl,
  filterExercises,
  formatLabel,
  isCustomExerciseId,
  uniqueFacets,
  type ExerciseIndexItem,
} from '../lib/exerciseCatalog';

interface ExercisePickerProps {
  exercises: ExerciseIndexItem[];
  sha: string;
  favouriteIds: string[];
  recentIds: string[];
  addedIds: string[];
  notes?: Record<string, string>;
  onAdd: (exercise: ExerciseIndexItem) => void;
  onRemove: (exercise: ExerciseIndexItem) => void;
  onCreateCustom: (name: string) => Promise<ExerciseIndexItem>;
  onClose: () => void;
  onOpenDetail: (exercise: ExerciseIndexItem) => void;
  title?: string;
  overlayClassName?: string;
}

function FacetSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | null;
  options: string[];
  onChange: (value: string | null) => void;
}) {
  return (
    <label className="min-w-0">
      <span className="sr-only">{label}</span>
      <select
        className="input !px-2 !py-1.5 text-xs"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">{label}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {formatLabel(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function Thumb({ sha, ex }: { sha: string; ex: ExerciseIndexItem }) {
  if (!ex.hasImages) {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-surface-700 bg-surface-800 text-[9px] font-semibold uppercase tracking-wide text-slate-500">
        Custom
      </div>
    );
  }
  return (
    <img
      src={exerciseImageUrl(sha, ex.id, 0)}
      alt=""
      className="h-12 w-12 shrink-0 rounded-lg border border-surface-700 object-cover"
      loading="lazy"
    />
  );
}

export function ExercisePicker({
  exercises,
  sha,
  favouriteIds,
  recentIds,
  addedIds,
  notes,
  onAdd,
  onRemove,
  onCreateCustom,
  onClose,
  onOpenDetail,
  title = 'Add exercises',
  overlayClassName = 'z-50',
}: ExercisePickerProps) {
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [level, setLevel] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState<Set<string>>(() => new Set());
  const [justRemoved, setJustRemoved] = useState<Set<string>>(() => new Set());
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createdItems, setCreatedItems] = useState<ExerciseIndexItem[]>([]);
  const addedSet = useMemo(() => new Set(addedIds), [addedIds]);

  const allExercises = useMemo(() => {
    if (createdItems.length === 0) return exercises;
    const seen = new Set(exercises.map((e) => e.id));
    return [...createdItems.filter((e) => !seen.has(e.id)), ...exercises];
  }, [createdItems, exercises]);

  const facets = useMemo(() => uniqueFacets(allExercises), [allExercises]);
  const byId = useMemo(
    () => new Map(allExercises.map((e) => [e.id, e])),
    [allExercises],
  );

  const filtered = useMemo(
    () =>
      filterExercises(allExercises, {
        query,
        muscle,
        equipment,
        category,
        level,
      }),
    [allExercises, query, muscle, equipment, category, level],
  );

  const showBrowseSections = !query.trim() && !muscle && !equipment && !category && !level;
  const trimmedQuery = query.trim();

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
  const customExercises = useMemo(
    () => allExercises.filter((e) => isCustomExerciseId(e.id)),
    [allExercises],
  );
  const browseCatalog = useMemo(
    () =>
      showBrowseSections
        ? filtered.filter((e) => !isCustomExerciseId(e.id))
        : filtered,
    [filtered, showBrowseSections],
  );
  const exactNameExists = useMemo(() => {
    if (!trimmedQuery) return false;
    const needle = trimmedQuery.toLowerCase();
    return allExercises.some((e) => e.name.toLowerCase() === needle);
  }, [allExercises, trimmedQuery]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function isAdded(id: string) {
    if (justRemoved.has(id)) return false;
    return addedSet.has(id) || justAdded.has(id);
  }

  function markAdded(id: string) {
    setJustRemoved((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setJustAdded((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }

  function markRemoved(id: string) {
    setJustAdded((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setJustRemoved((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }

  function addOne(ex: ExerciseIndexItem) {
    if (isAdded(ex.id)) return;
    onAdd(ex);
    markAdded(ex.id);
  }

  function toggleOne(ex: ExerciseIndexItem) {
    if (isAdded(ex.id)) {
      onRemove(ex);
      markRemoved(ex.id);
      return;
    }
    addOne(ex);
  }

  async function createCustom(name: string) {
    const trimmed = name.trim();
    if (!trimmed || creating) return;
    const existing = allExercises.find(
      (e) => e.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (existing) {
      addOne(existing);
      setShowCreateForm(false);
      setCreateName('');
      return;
    }
    setCreating(true);
    try {
      const created = await onCreateCustom(trimmed);
      setCreatedItems((prev) =>
        prev.some((e) => e.id === created.id) ? prev : [created, ...prev],
      );
      addOne(created);
      setShowCreateForm(false);
      setCreateName('');
    } finally {
      setCreating(false);
    }
  }

  function renderRow(ex: ExerciseIndexItem) {
    const added = isAdded(ex.id);
    return (
      <div
        key={ex.id}
        className={`flex items-center gap-3 rounded-xl border px-2.5 py-2 transition ${
          added
            ? 'border-brand-500/50 bg-brand-500/10'
            : 'border-surface-700/60 bg-surface-900/40'
        }`}
      >
        <button
          type="button"
          onClick={() => toggleOne(ex)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <Thumb sha={sha} ex={ex} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-100">{ex.name}</p>
            <p className="truncate text-xs text-slate-400">
              {isCustomExerciseId(ex.id)
                ? 'Custom'
                : [
                    ex.primaryMuscles.map(formatLabel).join(', '),
                    ex.equipment ? formatLabel(ex.equipment) : '',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
            </p>
            {notes?.[ex.id] && (
              <p className="truncate text-xs italic text-slate-500">{notes[ex.id]}</p>
            )}
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
          onClick={() => toggleOne(ex)}
          className={`flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full border text-xs font-bold transition ${
            added
              ? 'border-brand-500 bg-brand-500 text-surface-950'
              : 'border-surface-600 text-slate-400'
          }`}
          aria-label={added ? `Remove ${ex.name}` : `Add ${ex.name}`}
          aria-pressed={added}
        >
          {added ? '✓' : '+'}
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 ${overlayClassName} flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4`}>
      <div className="flex h-[92vh] w-full max-w-lg flex-col rounded-t-2xl border border-surface-700 bg-surface-900 shadow-2xl shadow-black/50 sm:h-[85vh] sm:rounded-2xl">
        <div className="sticky top-0 z-10 border-b border-surface-800 bg-surface-900/95 px-4 pb-3 pt-4 backdrop-blur">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-100">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-lg px-2 py-1 text-sm text-slate-400 transition hover:bg-surface-800 hover:text-slate-200"
            >
              Done
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
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <FacetSelect
              label="All muscles"
              value={muscle}
              options={facets.muscles}
              onChange={setMuscle}
            />
            <FacetSelect
              label="All equipment"
              value={equipment}
              options={facets.equipment}
              onChange={setEquipment}
            />
            <FacetSelect
              label="All levels"
              value={level}
              options={facets.levels}
              onChange={setLevel}
            />
            <FacetSelect
              label="All categories"
              value={category}
              options={facets.categories}
              onChange={setCategory}
            />
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3">
          {trimmedQuery && !exactNameExists && (
            <button
              type="button"
              disabled={creating}
              onClick={() => void createCustom(trimmedQuery)}
              className="btn-secondary w-full px-3 py-2.5 text-sm"
            >
              {creating ? 'Creating…' : `Create “${trimmedQuery}”`}
            </button>
          )}
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
          {showBrowseSections && customExercises.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Your exercises
              </h3>
              <div className="space-y-2">{customExercises.map(renderRow)}</div>
            </section>
          )}
          <section>
            {showBrowseSections &&
              (favourites.length > 0 || recents.length > 0 || customExercises.length > 0) && (
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  All exercises
                </h3>
              )}
            <div className="space-y-2">
              {browseCatalog.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  No exercises match your filters.
                </p>
              ) : (
                browseCatalog.map(renderRow)
              )}
            </div>
          </section>
        </div>

        <div className="border-t border-surface-800 bg-surface-900 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {showCreateForm ? (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void createCustom(createName);
              }}
            >
              <input
                className="input flex-1"
                type="text"
                placeholder="Exercise name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                autoFocus
                maxLength={80}
              />
              <button
                type="submit"
                className="btn-primary shrink-0 px-3 py-2 text-sm"
                disabled={creating || !createName.trim()}
              >
                {creating ? 'Creating…' : 'Create'}
              </button>
            </form>
          ) : (
            <button
              type="button"
              className="btn-secondary w-full px-4 py-2.5 text-sm"
              disabled={creating}
              onClick={() => {
                setCreateName(trimmedQuery);
                setShowCreateForm(true);
              }}
            >
              Create custom exercise
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
