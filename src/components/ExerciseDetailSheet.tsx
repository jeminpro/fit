import { useEffect, useRef, useState } from 'react';
import { ExerciseAnimation } from './ExerciseAnimation';
import {
  exerciseImageUrl,
  formatLabel,
  getExerciseDetail,
  isCustomExerciseId,
  MAX_EXERCISE_NOTE_LENGTH,
  youtubeSearchUrl,
  type ExerciseDetail,
  type ExerciseIndexItem,
} from '../lib/exerciseCatalog';
import { fromCanonical, toCanonical, unitLabel } from '../lib/units';
import type { UnitSystem } from '../lib/types';

export interface ExercisePlanDraft {
  sets: number;
  reps: number;
  durationSec?: number;
  weight?: number;
}

interface ExerciseDetailSheetProps {
  exercise: ExerciseIndexItem;
  sha: string;
  units: UnitSystem;
  initial?: ExercisePlanDraft;
  isFavourite?: boolean;
  onToggleFavourite?: () => void;
  note?: string;
  onSaveNote?: (note: string) => void;
  onSave?: (draft: ExercisePlanDraft) => void;
  onClose: () => void;
  saveLabel?: string;
}

export function ExerciseDetailSheet({
  exercise,
  sha,
  units,
  initial,
  isFavourite,
  onToggleFavourite,
  note,
  onSaveNote,
  onSave,
  onClose,
  saveLabel = 'Save',
}: ExerciseDetailSheetProps) {
  const [detail, setDetail] = useState<ExerciseDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(
    () => !isCustomExerciseId(exercise.id),
  );
  const [sets, setSets] = useState(String(initial?.sets ?? 3));
  const [reps, setReps] = useState(String(initial?.reps ?? 10));
  const [durationSec, setDurationSec] = useState(
    initial?.durationSec != null ? String(initial.durationSec) : '',
  );
  const [weight, setWeight] = useState(() => {
    if (initial?.weight == null) return '';
    return String(fromCanonical('weight', initial.weight, units));
  });
  const [noteDraft, setNoteDraft] = useState(note ?? '');
  const noteDraftRef = useRef(noteDraft);
  noteDraftRef.current = noteDraft;

  useEffect(() => {
    setNoteDraft(note ?? '');
  }, [exercise.id, note]);

  useEffect(() => {
    let cancelled = false;
    if (isCustomExerciseId(exercise.id)) {
      setDetail(null);
      setLoadingDetail(false);
      return;
    }
    setLoadingDetail(true);
    void getExerciseDetail(exercise.id).then((d) => {
      if (!cancelled) {
        setDetail(d);
        setLoadingDetail(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [exercise.id]);

  function flushNote() {
    if (!onSaveNote) return;
    const next = noteDraftRef.current.trim();
    const prev = (note ?? '').trim();
    if (next !== prev) onSaveNote(next);
  }

  function handleClose() {
    flushNote();
    onClose();
  }

  function handleSave() {
    flushNote();
    if (!onSave) return;
    const setsNum = Math.max(1, Math.round(Number(sets) || 3));
    const repsNum = Math.max(1, Math.round(Number(reps) || 10));
    const durationNum = durationSec.trim() === '' ? undefined : Number(durationSec);
    const weightNum = weight.trim() === '' ? undefined : Number(weight);
    onSave({
      sets: setsNum,
      reps: repsNum,
      durationSec:
        durationNum != null && Number.isFinite(durationNum) && durationNum > 0
          ? Math.round(durationNum)
          : undefined,
      weight:
        weightNum != null && Number.isFinite(weightNum) && weightNum > 0
          ? toCanonical('weight', weightNum, units)
          : undefined,
    });
  }

  const frame0 = exerciseImageUrl(sha, exercise.id, 0);
  const frame1 = exerciseImageUrl(sha, exercise.id, 1);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-surface-700 bg-surface-900 p-5 shadow-2xl shadow-black/50">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-100">{exercise.name}</h2>
            <p className="mt-1 text-xs text-slate-400">
              {[exercise.level, exercise.equipment, exercise.category]
                .filter(Boolean)
                .map((v) => formatLabel(String(v)))
                .join(' · ')}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {onToggleFavourite && (
              <button
                type="button"
                onClick={onToggleFavourite}
                className={`cursor-pointer rounded-lg px-2 py-1 text-sm transition hover:bg-surface-800 ${
                  isFavourite ? 'text-brand-400' : 'text-slate-400 hover:text-slate-200'
                }`}
                aria-label={isFavourite ? 'Remove favourite' : 'Add favourite'}
              >
                {isFavourite ? '★' : '☆'}
              </button>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="cursor-pointer rounded-lg px-2 py-1 text-sm text-slate-400 transition hover:bg-surface-800 hover:text-slate-200"
            >
              Close
            </button>
          </div>
        </div>

        {exercise.hasImages ? (
          <ExerciseAnimation frame0={frame0} frame1={frame1} alt={exercise.name} />
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-surface-700 bg-surface-800 text-sm text-slate-500">
            No demonstration images
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {exercise.primaryMuscles.map((m) => (
            <span
              key={m}
              className="rounded-full border border-brand-500/40 bg-brand-500/10 px-2.5 py-0.5 text-xs font-medium text-brand-300"
            >
              {formatLabel(m)}
            </span>
          ))}
          {(detail?.secondaryMuscles ?? []).map((m) => (
            <span
              key={`sec-${m}`}
              className="rounded-full border border-surface-700 bg-surface-800 px-2.5 py-0.5 text-xs text-slate-400"
            >
              {formatLabel(m)}
            </span>
          ))}
        </div>

        <div className="mt-5">
          <h3 className="text-sm font-semibold text-slate-200">How to do it</h3>
          {loadingDetail ? (
            <p className="mt-2 text-sm text-slate-500">Loading instructions…</p>
          ) : detail && detail.instructions.length > 0 ? (
            <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-300">
              {detail.instructions.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          ) : (
            <p className="mt-2 text-sm text-slate-500">
              {isCustomExerciseId(exercise.id)
                ? 'Custom exercise — no built-in instructions. Try YouTube below.'
                : 'No instructions available.'}
            </p>
          )}
        </div>

        <a
          href={youtubeSearchUrl(exercise.name)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex text-sm font-medium text-brand-400 transition hover:text-brand-300"
        >
          Watch on YouTube →
        </a>

        {onSaveNote && (
          <label className="mt-5 block">
            <span className="text-sm font-semibold text-slate-200">Your note</span>
            <textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value.slice(0, MAX_EXERCISE_NOTE_LENGTH))}
              onBlur={flushNote}
              rows={2}
              maxLength={MAX_EXERCISE_NOTE_LENGTH}
              className="input mt-2 text-sm"
              placeholder="Cues, setup, or anything to remember"
            />
          </label>
        )}

        {onSave && (
          <div className="mt-5 space-y-3 border-t border-surface-800 pt-4">
            <h3 className="text-sm font-semibold text-slate-200">Plan</h3>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs text-slate-400">
                Sets
                <input
                  className="input mt-1"
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={sets}
                  onChange={(e) => setSets(e.target.value)}
                />
              </label>
              <label className="block text-xs text-slate-400">
                Reps
                <input
                  className="input mt-1"
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                />
              </label>
              <label className="block text-xs text-slate-400">
                Time (sec)
                <input
                  className="input mt-1"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  placeholder="Optional"
                  value={durationSec}
                  onChange={(e) => setDurationSec(e.target.value)}
                />
              </label>
              <label className="block text-xs text-slate-400">
                Weight ({unitLabel('weight', units)})
                <input
                  className="input mt-1"
                  type="number"
                  min={0}
                  step={0.5}
                  inputMode="decimal"
                  placeholder="Optional"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                />
              </label>
            </div>
            <button type="button" className="btn-primary w-full px-4 py-2.5 text-sm" onClick={handleSave}>
              {saveLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
