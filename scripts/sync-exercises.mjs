/**
 * Downloads free-exercise-db and emits slim catalog files for the Workout tab.
 * Run: npm run sync:exercises
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'public', 'data');
const REPO = 'yuhonas/free-exercise-db';

async function resolveSha() {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/commits?per_page=1`,
    {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'fit-sync-exercises',
      },
    },
  );
  if (!res.ok) {
    throw new Error(`Failed to resolve commit SHA: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  const sha = data[0]?.sha;
  if (!sha || typeof sha !== 'string') {
    throw new Error('Unexpected GitHub commits response');
  }
  return sha;
}

async function downloadExercises(sha) {
  const url = `https://cdn.jsdelivr.net/gh/${REPO}@${sha}/dist/exercises.json`;
  console.log(`Fetching ${url}`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download exercises: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

function buildIndex(sha, exercises) {
  return {
    sha,
    source: REPO,
    generatedAt: new Date().toISOString(),
    count: exercises.length,
    exercises: exercises.map((e) => ({
      id: e.id,
      name: e.name,
      primaryMuscles: e.primaryMuscles ?? [],
      equipment: e.equipment ?? null,
      category: e.category ?? null,
      level: e.level ?? null,
      hasImages: Array.isArray(e.images) && e.images.length >= 2,
    })),
  };
}

function buildDetails(exercises) {
  /** @type {Record<string, object>} */
  const details = {};
  for (const e of exercises) {
    details[e.id] = {
      instructions: e.instructions ?? [],
      secondaryMuscles: e.secondaryMuscles ?? [],
      force: e.force ?? null,
      mechanic: e.mechanic ?? null,
    };
  }
  return details;
}

async function main() {
  const sha = await resolveSha();
  console.log(`Pinned to ${sha}`);

  const exercises = await downloadExercises(sha);
  if (!Array.isArray(exercises) || exercises.length === 0) {
    throw new Error('exercises.json was empty or invalid');
  }

  const index = buildIndex(sha, exercises);
  const details = buildDetails(exercises);

  await mkdir(OUT_DIR, { recursive: true });
  const indexPath = join(OUT_DIR, 'exercises.index.json');
  const detailsPath = join(OUT_DIR, 'exercises.details.json');

  await writeFile(indexPath, JSON.stringify(index));
  await writeFile(detailsPath, JSON.stringify(details));

  console.log(
    `Wrote ${index.count} exercises → ${indexPath} (${Math.round(JSON.stringify(index).length / 1024)} KB)`,
  );
  console.log(
    `Wrote details → ${detailsPath} (${Math.round(JSON.stringify(details).length / 1024)} KB)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
