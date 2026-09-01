import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { HABIT_KEYS, HABIT_LABELS } from '../lib/constants';
import { getLastNDays, habitScore } from '../lib/dates';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';

function scoreColor(score: number | null): string {
  if (score === null) return 'bg-slate-100';
  if (score >= 7) return 'bg-brand-500';
  if (score >= 4) return 'bg-amber-400';
  return 'bg-red-400';
}

export function HabitHeatmap() {
  const { habitDaysMap } = useApp();
  const [selectedHabit, setSelectedHabit] = useState<(typeof HABIT_KEYS)[number] | 'all'>('all');

  const last90 = useMemo(() => getLastNDays(90), []);
  const weeks = useMemo(() => {
    const groups: string[][] = [];
    for (let i = 0; i < last90.length; i += 7) {
      groups.push(last90.slice(i, i + 7));
    }
    return groups;
  }, [last90]);

  function cellScore(dayId: string): number | null {
    const day = habitDaysMap.get(dayId);
    if (!day) return null;
    if (selectedHabit === 'all') return habitScore(day);
    const value = day[selectedHabit];
    if (selectedHabit === 'snacks') return 2 - value;
    return value;
  }

  const weeklyScores = useMemo(() => {
    const now = new Date();
    const weeksBack = 8;
    const data = [];

    for (let i = weeksBack - 1; i >= 0; i--) {
      const weekStart = startOfWeek(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 7));
      const weekEnd = endOfWeek(weekStart);
      const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
      const scores = days
        .map((d) => habitScore(habitDaysMap.get(format(d, 'yyyy-MM-dd'))))
        .filter((s): s is number => s !== null);
      const avg =
        scores.length > 0
          ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
          : 0;
      data.push({
        week: format(weekStart, 'MMM d'),
        score: avg,
      });
    }
    return data;
  }, [habitDaysMap]);

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedHabit('all')}
            className={`rounded-lg px-3 py-1 text-xs font-semibold ${
              selectedHabit === 'all'
                ? 'bg-brand-600 text-white'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            Overall
          </button>
          {HABIT_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedHabit(key)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                selectedHabit === key
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {HABIT_LABELS[key]}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <div className="inline-flex gap-1">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.map((dayId) => {
                  const score =
                    selectedHabit === 'all'
                      ? cellScore(dayId)
                      : cellScore(dayId);
                  const normalized =
                    selectedHabit === 'all'
                      ? score
                      : score !== null
                        ? (score / 2) * 10
                        : null;
                  return (
                    <div
                      key={dayId}
                      title={`${dayId}: ${normalized ?? 'no data'}`}
                      className={`h-3 w-3 rounded-sm ${scoreColor(normalized)}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">Last 90 days</p>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-700">
          Weekly average score
        </h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyScores}>
              <XAxis dataKey="week" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="score" fill="#16a34a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
