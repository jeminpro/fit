import type { Profile } from './types';

export function normalizeProfileOrder(
  profiles: Profile[],
  order?: string[],
): string[] {
  const ids = profiles.map((p) => p.id);
  const remaining = new Set(ids);
  const result: string[] = [];

  if (order) {
    for (const id of order) {
      if (remaining.has(id)) {
        result.push(id);
        remaining.delete(id);
      }
    }
  }

  for (const id of ids) {
    if (remaining.has(id)) {
      result.push(id);
    }
  }

  return result;
}

export function sortProfilesByOrder(
  profiles: Profile[],
  order?: string[],
): Profile[] {
  const normalized = normalizeProfileOrder(profiles, order);
  const byId = new Map(profiles.map((p) => [p.id, p]));
  return normalized
    .map((id) => byId.get(id))
    .filter((profile): profile is Profile => profile !== undefined);
}

export function moveProfileInOrder(
  order: string[],
  profileId: string,
  direction: 'up' | 'down',
): string[] {
  const index = order.indexOf(profileId);
  if (index === -1) return order;

  const target = direction === 'up' ? index - 1 : index + 1;
  if (target < 0 || target >= order.length) return order;

  const next = [...order];
  [next[index], next[target]] = [next[target]!, next[index]!];
  return next;
}

export function appendToProfileOrder(order: string[], profileId: string): string[] {
  if (order.includes(profileId)) return order;
  return [...order, profileId];
}

export function removeFromProfileOrder(order: string[], profileId: string): string[] {
  return order.filter((id) => id !== profileId);
}
