import { useState } from 'react';
import type { Routine } from '../lib/workoutTypes';
import { MAX_ROUTINES } from '../lib/workoutTypes';

interface RoutineSheetProps {
  routines: Routine[];
  canSave: boolean;
  onSave: (name: string) => void;
  onApply: (routine: Routine) => void;
  onRename: (routineId: string, name: string) => void;
  onDelete: (routineId: string) => void;
  onClose: () => void;
}

export function RoutineSheet({
  routines,
  canSave,
  onSave,
  onApply,
  onRename,
  onDelete,
  onClose,
}: RoutineSheetProps) {
  const [name, setName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const atCap = routines.length >= MAX_ROUTINES;

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed || atCap) return;
    onSave(trimmed);
    setName('');
  }

  function startRename(routine: Routine) {
    setRenamingId(routine.id);
    setRenameValue(routine.name);
  }

  function commitRename() {
    if (!renamingId) return;
    const trimmed = renameValue.trim();
    if (trimmed) onRename(renamingId, trimmed);
    setRenamingId(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl border border-surface-700 bg-surface-900 shadow-2xl shadow-black/50 sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-surface-800 px-4 py-3">
          <h2 className="text-lg font-bold text-slate-100">Routines</h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg px-2 py-1 text-sm text-slate-400 transition hover:bg-surface-800 hover:text-slate-200"
          >
            Close
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-4 py-4">
          {canSave && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Save this day
              </p>
              {atCap ? (
                <p className="text-sm text-slate-500">
                  You already have {MAX_ROUTINES} routines. Delete one to save another.
                </p>
              ) : (
                <div className="flex gap-2">
                  <input
                    className="input flex-1"
                    placeholder="Routine name, e.g. Push"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSave();
                    }}
                  />
                  <button
                    type="button"
                    className="btn-primary px-3 py-2 text-sm"
                    disabled={!name.trim()}
                    onClick={handleSave}
                  >
                    Save
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Use a routine
            </p>
            {routines.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                No routines yet. Plan a day, then save it as a routine.
              </p>
            ) : (
              routines.map((routine) => (
                <div
                  key={routine.id}
                  className="flex items-center gap-2 rounded-xl border border-surface-700/60 bg-surface-900/40 px-3 py-2.5"
                >
                  {renamingId === routine.id ? (
                    <input
                      className="input flex-1 py-1.5 text-sm"
                      value={renameValue}
                      autoFocus
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename();
                        if (e.key === 'Escape') setRenamingId(null);
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => onApply(routine)}
                    >
                      <p className="truncate text-sm font-medium text-slate-100">
                        {routine.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {routine.exercises.length} exercise
                        {routine.exercises.length === 1 ? '' : 's'}
                      </p>
                    </button>
                  )}
                  <button
                    type="button"
                    className="cursor-pointer rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-surface-800 hover:text-slate-200"
                    onClick={() => startRename(routine)}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    className="cursor-pointer rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-rose-500/10 hover:text-rose-300"
                    onClick={() => {
                      if (confirm(`Delete routine “${routine.name}”?`)) {
                        onDelete(routine.id);
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
