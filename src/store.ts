import { Submission } from './types';
import {
  getAllSubmissions,
  getDatapoint,
  updateDatapoint,
} from './db/datapoints';

// Re-export as a getter so routes always get fresh data from SQLite
export function getSubmissions(): Submission[] {
  return getAllSubmissions();
}

// Keep `submissions` as a getter for backward compat with views that reference it
export const submissions: Submission[] = new Proxy([] as Submission[], {
  get(target, prop) {
    const fresh = getAllSubmissions();
    if (prop === 'length') return fresh.length;
    if (prop === 'filter') return fresh.filter.bind(fresh);
    if (prop === 'map') return fresh.map.bind(fresh);
    if (prop === 'find') return fresh.find.bind(fresh);
    if (prop === 'findIndex') return fresh.findIndex.bind(fresh);
    if (prop === Symbol.iterator) return fresh[Symbol.iterator].bind(fresh);
    if (typeof prop === 'string' && !isNaN(Number(prop))) return fresh[Number(prop)];
    return Reflect.get(fresh, prop);
  },
});

export function getSubmission(id: string): Submission | undefined {
  return getDatapoint(id);
}

export function updateSubmission(
  id: string,
  updates: Partial<Submission>
): Submission | undefined {
  return updateDatapoint(id, updates);
}
