export interface ExerciseIndexItem {
  id: string;
  name: string;
  primaryMuscles: string[];
  equipment: string | null;
  category: string | null;
  level: string | null;
  hasImages: boolean;
}

export interface ExerciseDetail {
  instructions: string[];
  secondaryMuscles: string[];
  force: string | null;
  mechanic: string | null;
}

export interface ExerciseCatalogIndex {
  sha: string;
  source: string;
  generatedAt: string;
  count: number;
  exercises: ExerciseIndexItem[];
}

export interface ExerciseFilters {
  query?: string;
  muscle?: string | null;
  equipment?: string | null;
  category?: string | null;
  level?: string | null;
}

let indexCache: ExerciseCatalogIndex | null = null;
let detailsCache: Record<string, ExerciseDetail> | null = null;
let indexPromise: Promise<ExerciseCatalogIndex> | null = null;
let detailsPromise: Promise<Record<string, ExerciseDetail>> | null = null;

function dataUrl(path: string): string {
  const base = import.meta.env.BASE_URL ?? '/';
  const normalized = base.endsWith('/') ? base : `${base}/`;
  return `${normalized}${path.replace(/^\//, '')}`;
}

export async function loadExerciseIndex(): Promise<ExerciseCatalogIndex> {
  if (indexCache) return indexCache;
  if (!indexPromise) {
    indexPromise = fetch(dataUrl('data/exercises.index.json'))
      .then(async (res) => {
        if (!res.ok) throw new Error(`Failed to load exercise index (${res.status})`);
        const data = (await res.json()) as ExerciseCatalogIndex;
        indexCache = data;
        return data;
      })
      .catch((err) => {
        indexPromise = null;
        throw err;
      });
  }
  return indexPromise;
}

export async function loadExerciseDetails(): Promise<
  Record<string, ExerciseDetail>
> {
  if (detailsCache) return detailsCache;
  if (!detailsPromise) {
    detailsPromise = fetch(dataUrl('data/exercises.details.json'))
      .then(async (res) => {
        if (!res.ok) throw new Error(`Failed to load exercise details (${res.status})`);
        const data = (await res.json()) as Record<string, ExerciseDetail>;
        detailsCache = data;
        return data;
      })
      .catch((err) => {
        detailsPromise = null;
        throw err;
      });
  }
  return detailsPromise;
}

export function prefetchExerciseDetails(): void {
  void loadExerciseDetails().catch(() => {
    /* ignore background prefetch errors */
  });
}

export async function getExerciseDetail(
  exerciseId: string,
): Promise<ExerciseDetail | null> {
  const details = await loadExerciseDetails();
  return details[exerciseId] ?? null;
}

export function exerciseImageUrl(
  sha: string,
  exerciseId: string,
  frame: 0 | 1 = 0,
): string {
  return `https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@${sha}/exercises/${exerciseId}/${frame}.jpg`;
}

export function youtubeSearchUrl(name: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`how to ${name}`)}`;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

export function filterExercises(
  exercises: ExerciseIndexItem[],
  filters: ExerciseFilters,
): ExerciseIndexItem[] {
  const query = filters.query?.trim().toLowerCase() ?? '';
  const tokens = query ? tokenize(query) : [];

  return exercises.filter((ex) => {
    if (filters.muscle && !ex.primaryMuscles.includes(filters.muscle)) {
      return false;
    }
    if (filters.equipment && ex.equipment !== filters.equipment) {
      return false;
    }
    if (filters.category && ex.category !== filters.category) {
      return false;
    }
    if (filters.level && ex.level !== filters.level) {
      return false;
    }
    if (!query) return true;

    const haystack = `${ex.name} ${ex.primaryMuscles.join(' ')} ${ex.equipment ?? ''}`.toLowerCase();
    if (haystack.includes(query)) return true;
    const nameTokens = tokenize(ex.name);
    return tokens.every((t) => nameTokens.some((n) => n.startsWith(t) || n.includes(t)));
  });
}

export function uniqueFacets(exercises: ExerciseIndexItem[]): {
  muscles: string[];
  equipment: string[];
  categories: string[];
  levels: string[];
} {
  const muscles = new Set<string>();
  const equipment = new Set<string>();
  const categories = new Set<string>();
  const levels = new Set<string>();

  for (const ex of exercises) {
    for (const m of ex.primaryMuscles) muscles.add(m);
    if (ex.equipment) equipment.add(ex.equipment);
    if (ex.category) categories.add(ex.category);
    if (ex.level) levels.add(ex.level);
  }

  const sort = (a: string, b: string) => a.localeCompare(b);
  return {
    muscles: [...muscles].sort(sort),
    equipment: [...equipment].sort(sort),
    categories: [...categories].sort(sort),
    levels: [...levels].sort(sort),
  };
}

export function formatLabel(value: string): string {
  return value
    .split(/[\s_-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
