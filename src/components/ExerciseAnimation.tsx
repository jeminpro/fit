import { useEffect, useState } from 'react';

interface ExerciseAnimationProps {
  frame0: string;
  frame1: string;
  alt: string;
  intervalMs?: number;
}

export function ExerciseAnimation({
  frame0,
  frame1,
  alt,
  intervalMs = 700,
}: ExerciseAnimationProps) {
  const [frame, setFrame] = useState<0 | 1>(0);
  const [paused, setPaused] = useState(false);
  const [ready, setReady] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setFrame(0);

    const preload = (src: string) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = src;
      });

    void Promise.all([preload(frame0), preload(frame1)]).then(() => {
      if (!cancelled) setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [frame0, frame1]);

  useEffect(() => {
    if (!ready || paused || reduceMotion) return;
    const id = window.setInterval(() => {
      setFrame((f) => (f === 0 ? 1 : 0));
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [ready, paused, reduceMotion, intervalMs]);

  const src = frame === 0 || reduceMotion ? frame0 : frame1;

  return (
    <button
      type="button"
      onClick={() => setPaused((p) => !p)}
      className="relative block w-full overflow-hidden rounded-xl border border-surface-700 bg-surface-800"
      aria-label={paused || reduceMotion ? `${alt} (paused)` : `${alt} (playing, tap to pause)`}
    >
      <img
        src={src}
        alt={alt}
        className={`aspect-[4/3] w-full object-contain transition-opacity ${
          ready ? 'opacity-100' : 'opacity-0'
        }`}
        draggable={false}
      />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">
          Loading…
        </div>
      )}
      {ready && !reduceMotion && (
        <span className="absolute bottom-2 right-2 rounded-md bg-black/50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-200">
          {paused ? 'Paused' : 'Tap to pause'}
        </span>
      )}
    </button>
  );
}
