import { supabase } from './supabaseClient';
import type { UserRole } from './types';

// ============================================================================
//  GLOBAL SEARCH
//
//  The topbar search box existed as decoration in both shells for a long time:
//  an <input> with no binding and no handler. This is what actually stands
//  behind it now.
//
//  Scope is decided per role rather than per query, because RLS already
//  decides what a role may READ — searching should not surface a category a
//  role has no business browsing (a designer looking up staff, say), even
//  though `profiles` is readable to everyone for name lookups.
// ============================================================================

export interface PersonHit {
  id: string;
  full_name: string;
  role: UserRole;
}

export interface ProjectHit {
  id: string;
  project_name: string;
  client: string | null;
  status: string;
  total_cost: number;
  designer_name: string | null;
  created_at: string;
}

export interface RequestHit {
  id: string;
  title: string;
  status: string;
  machine_type: string;
  created_at: string;
}

export interface SearchResults {
  people: PersonHit[];
  projects: ProjectHit[];
  requests: RequestHit[];
}

export const EMPTY_RESULTS: SearchResults = { people: [], projects: [], requests: [] };

/** Roles allowed to look staff up by name. Everyone else gets projects only —
 *  see the note at the top of this file. */
const PEOPLE_SEARCH_ROLES: UserRole[] = ['admin', 'developer', 'factory'];
const REQUEST_SEARCH_ROLES: UserRole[] = ['admin', 'developer', 'factory', 'designer'];

/** PostgREST `ilike` treats % and _ as wildcards and , splits the or() filter,
 *  so a raw query string could otherwise turn into a different filter than the
 *  user typed. */
function escapeForIlike(term: string): string {
  return term.replace(/[%_,()]/g, ' ').trim();
}

export async function globalSearch(rawQuery: string, role: UserRole | null, limit = 6): Promise<SearchResults> {
  const term = escapeForIlike(rawQuery);
  if (!role || term.length < 2) return EMPTY_RESULTS;
  const pattern = `%${term}%`;

  const canSeePeople = PEOPLE_SEARCH_ROLES.includes(role);
  const canSeeRequests = REQUEST_SEARCH_ROLES.includes(role);

  const [peopleRes, projectRes, requestRes] = await Promise.all([
    canSeePeople
      ? supabase.from('profiles').select('id, full_name, role').ilike('full_name', pattern).neq('role', 'customer').order('full_name').limit(limit)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from('projects_with_designer')
      .select('id, project_name, client, status, total_cost, designer_name, created_at')
      .or(`project_name.ilike.${pattern},client.ilike.${pattern}`)
      .order('created_at', { ascending: false })
      .limit(limit),
    canSeeRequests
      ? supabase.from('customer_requests').select('id, title, status, spec_data, created_at').ilike('title', pattern).order('created_at', { ascending: false }).limit(limit)
      : Promise.resolve({ data: [], error: null }),
  ]);

  return {
    people: (peopleRes.data as PersonHit[]) ?? [],
    projects: (projectRes.data as ProjectHit[]) ?? [],
    requests: ((requestRes.data as { id: string; title: string; status: string; spec_data: Record<string, unknown> | null; created_at: string }[]) ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      machine_type: String(r.spec_data?.machineType ?? ''),
      created_at: r.created_at,
    })),
  };
}

export function totalHits(results: SearchResults): number {
  return results.people.length + results.projects.length + results.requests.length;
}

/** Where clicking a hit should land, per role — Admin has dedicated 360°
 *  screens for a person and a machine; other roles go to whatever detail page
 *  their own section owns. */
export function personHref(role: UserRole | null, personId: string): string {
  return role === 'admin' || role === 'developer' ? `/admin/people/${personId}` : `/factory/users`;
}

export function projectHref(role: UserRole | null, projectId: string): string {
  switch (role) {
    case 'admin':
    case 'developer':
      return `/admin/machines/${projectId}`;
    case 'factory':
      return `/factory/projects/${projectId}`;
    case 'procurement':
      return `/procurement/${projectId}`;
    case 'accounting':
      return `/accounting/${projectId}`;
    case 'designer':
      return `/designer/${projectId}`;
    default:
      return '/';
  }
}

export function requestHref(role: UserRole | null, requestId: string): string {
  switch (role) {
    case 'admin':
    case 'developer':
      return `/admin/requests/${requestId}`;
    case 'factory':
      return `/factory/requests/${requestId}`;
    case 'designer':
      return `/designer/requests/${requestId}`;
    default:
      return '/';
  }
}
