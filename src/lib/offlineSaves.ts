import { writable, get } from 'svelte/store';
import { supabase } from './supabaseClient';

// ============================================================================
//  OFFLINE DRAFT SAVES — when a designer clicks Save on a weak or dropped
//  connection, the save is kept in this browser and pushed to Supabase as
//  soon as the connection returns. Only saves the person asked for are queued
//  (nothing is saved behind their back), and a queued save never overwrites
//  a project that has since left Draft/Rejected.
// ============================================================================

const STORAGE_KEY = 'swb-pending-project-saves';

export interface ProjectDraftUpdate {
  project_name: string;
  client: string;
  total_cost: number;
  project_data: Record<string, unknown>;
}

export interface PendingSave {
  projectId: string;
  userId: string;
  update: ProjectDraftUpdate;
  queuedAt: string;
}

type PendingMap = Record<string, PendingSave>;

function read(): PendingMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PendingMap) : {};
  } catch {
    return {};
  }
}

function write(map: PendingMap) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (e) {
    console.error('Could not store offline save:', e);
  }
}

export const pendingSaves = writable<PendingMap>(typeof localStorage === 'undefined' ? {} : read());

function update(fn: (map: PendingMap) => PendingMap) {
  pendingSaves.update((map) => {
    const next = fn({ ...map });
    write(next);
    return next;
  });
}

export function pendingSaveFor(projectId: string, userId: string | undefined): PendingSave | undefined {
  const entry = get(pendingSaves)[projectId];
  return entry && entry.userId === userId ? entry : undefined;
}

export function queueSave(entry: Omit<PendingSave, 'queuedAt'>) {
  update((map) => ({ ...map, [entry.projectId]: { ...entry, queuedAt: new Date().toISOString() } }));
}

export function clearPendingSave(projectId: string) {
  update((map) => {
    delete map[projectId];
    return map;
  });
}

/** A failed request caused by the connection rather than by the server. */
export function isNetworkError(error: { message?: string } | null | undefined): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  return !!error?.message && /failed to fetch|networkerror|network request failed|load failed|fetch failed|timed? ?out|err_/i.test(error.message);
}

export type PushResult =
  | { ok: true }
  | { ok: false; reason: 'network' | 'locked' | 'error'; message: string };

/** Writes a draft save. The status filter makes a stale save a no-op once
 *  the project was submitted, instead of overwriting what Admin now reviews. */
export async function pushProjectSave(projectId: string, update: ProjectDraftUpdate): Promise<PushResult> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .update(update)
      .eq('id', projectId)
      .in('status', ['Draft', 'Rejected'])
      .select('id');
    if (error) return { ok: false, reason: isNetworkError(error) ? 'network' : 'error', message: error.message };
    if (!data?.length) return { ok: false, reason: 'locked', message: 'Project is no longer editable' };
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, reason: 'network', message };
  }
}

let syncing = false;

/** Pushes this user's queued saves. Stops at the first connection failure
 *  (the rest wait for the next attempt); drops saves for projects that are
 *  no longer editable, reporting their names. */
export async function syncPendingSaves(userId: string): Promise<{ synced: string[]; locked: string[] }> {
  const result = { synced: [] as string[], locked: [] as string[] };
  if (syncing) return result;
  syncing = true;
  try {
    for (const entry of Object.values(get(pendingSaves))) {
      if (entry.userId !== userId) continue;
      const pushed = await pushProjectSave(entry.projectId, entry.update);
      if (pushed.ok) {
        clearPendingSave(entry.projectId);
        result.synced.push(entry.update.project_name);
      } else if (pushed.reason === 'locked') {
        clearPendingSave(entry.projectId);
        result.locked.push(entry.update.project_name);
      } else if (pushed.reason === 'network') {
        break;
      }
    }
  } finally {
    syncing = false;
  }
  return result;
}
