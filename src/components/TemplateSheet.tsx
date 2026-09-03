import { useState } from 'react';
import type { ExerciseTemplate, TemplateKind } from '../lib/workoutTypes';
import { MAX_TEMPLATES } from '../lib/workoutTypes';
import { templateLabel } from '../lib/workoutPlan';

interface TemplateSheetProps {
  kind: TemplateKind;
  templates: ExerciseTemplate[];
  canSave: boolean;
  onSave: (name: string) => void;
  onApply: (template: ExerciseTemplate) => void;
  onRename: (templateId: string, name: string) => void;
  onDelete: (templateId: string) => void;
  onBuildNew: (name: string) => void;
  onClose: () => void;
}

export function TemplateSheet({
  kind,
  templates,
  canSave,
  onSave,
  onApply,
  onRename,
  onDelete,
  onBuildNew,
  onClose,
}: TemplateSheetProps) {
  const [name, setName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const label = templateLabel(kind);
  const atCap = templates.length >= MAX_TEMPLATES;
  const trimmed = name.trim();

  function handleSave() {
    if (!trimmed || atCap) return;
    onSave(trimmed);
    setName('');
  }

  function handleBuildNew() {
    if (!trimmed || atCap) return;
    onBuildNew(trimmed);
    setName('');
  }

  function startRename(template: ExerciseTemplate) {
    setRenamingId(template.id);
    setRenameValue(template.name);
  }

  function commitRename() {
    if (!renamingId) return;
    const nextName = renameValue.trim();
    if (nextName) onRename(renamingId, nextName);
    setRenamingId(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl border border-surface-700 bg-surface-900 shadow-2xl shadow-black/50 sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-surface-800 px-4 py-3">
          <h2 className="text-lg font-bold text-slate-100">{label} templates</h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg px-2 py-1 text-sm text-slate-400 transition hover:bg-surface-800 hover:text-slate-200"
          >
            Close
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-4 py-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {canSave ? `Save this ${label.toLowerCase()}` : 'New template'}
            </p>
            {atCap ? (
              <p className="text-sm text-slate-500">
                You already have {MAX_TEMPLATES} {label.toLowerCase()} templates.
                Delete one to save another.
              </p>
            ) : (
              <div className="space-y-2">
                <input
                  className="input"
                  placeholder={
                    kind === 'warmup'
                      ? 'Name, e.g. Dynamic stretch'
                      : 'Name, e.g. Full body stretch'
                  }
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (canSave) handleSave();
                      else handleBuildNew();
                    }
                  }}
                />
                <div className="flex gap-2">
                  {canSave && (
                    <button
                      type="button"
                      className="btn-primary flex-1 px-3 py-2 text-sm"
                      disabled={!trimmed}
                      onClick={handleSave}
                    >
                      Save
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-secondary flex-1 px-3 py-2 text-sm"
                    disabled={!trimmed}
                    onClick={handleBuildNew}
                  >
                    Build new
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Use a template
            </p>
            {templates.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                No {label.toLowerCase()} templates yet. Add exercises, then save,
                or build a new template from the catalog.
              </p>
            ) : (
              templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center gap-2 rounded-xl border border-surface-700/60 bg-surface-900/40 px-3 py-2.5"
                >
                  {renamingId === template.id ? (
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
                      onClick={() => onApply(template)}
                    >
                      <p className="truncate text-sm font-medium text-slate-100">
                        {template.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {template.exercises.length} exercise
                        {template.exercises.length === 1 ? '' : 's'}
                      </p>
                    </button>
                  )}
                  <button
                    type="button"
                    className="cursor-pointer rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-surface-800 hover:text-slate-200"
                    onClick={() => startRename(template)}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    className="cursor-pointer rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-rose-500/10 hover:text-rose-300"
                    onClick={() => {
                      if (confirm(`Delete template “${template.name}”?`)) {
                        onDelete(template.id);
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
