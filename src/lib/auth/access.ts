import type { UserRole } from '$lib/types';

// ============================================================================
//  ROUTE ACCESS — WHICH ROLE MAY OPEN WHICH SECTION
//
//  Until this file existed there was no such check anywhere. The root layout
//  redirected an anonymous visitor to /login, and sent a freshly signed-in
//  user to /<their role> — and that was all. Once you held ANY valid session,
//  typing another section's URL straight into the address bar loaded that
//  section in full: an Accounting login could open /admin, and from there
//  /admin/users (where roles are reassigned) and /admin/material-prices.
//
//  ---- READ THIS BEFORE TRUSTING IT ----
//  This is a NAVIGATION guard, not a security boundary. Everything here runs
//  in the browser, so anyone willing to open devtools can walk straight past
//  it. It exists to stop the wrong screen being reached by accident, by a
//  stale bookmark, or by a shared link.
//
//  The actual boundary has to live in the database, because this app talks to
//  Supabase directly from the browser with the public anon key: whatever a
//  signed-in user's key is permitted to SELECT or UPDATE, they can reach with
//  one fetch() regardless of what the UI shows them. That means Row Level
//  Security policies on projects / profiles / material_prices /
//  factory_operations / notifications / field_configs. Hiding the Users page
//  does not stop `supabase.from('profiles').update({ role: 'admin' })` from
//  the console — only an RLS policy does.
// ============================================================================

/** The first path segment of each dashboard, and the role that owns it.
 *  One entry per section; there is deliberately no wildcard fallback, so a
 *  NEW section added without a line here is treated as unknown and locked
 *  rather than silently open to everyone. */
const SECTION_OWNER: Record<string, UserRole> = {
  admin: 'admin',
  designer: 'designer',
  factory: 'factory',
  procurement: 'procurement',
  accounting: 'accounting',
  followup: 'followup',
  developer: 'developer',
  customer: 'customer',
};

/** Paths that belong to no section and are open to any signed-in user (the
 *  root redirector and the sign-in screen itself), or to a signed-out visitor
 *  (the customer self-registration and staff invitation screens). */
const NEUTRAL_PATHS = new Set(['/', '/login', '/signup', '/accept-invite']);

/** 'developer' is exempt from the section check by existing spec: it is a
 *  technical role that can reach and use any screen. It still has no
 *  Owner-level authority — that distinction is enforced per action, not by
 *  routing. */
const UNRESTRICTED: UserRole = 'developer';

/** The section a path belongs to, or null for a neutral path. */
export function sectionOf(pathname: string): string | null {
  if (NEUTRAL_PATHS.has(pathname)) return null;
  const first = pathname.split('/').filter(Boolean)[0];
  return first ?? null;
}

/** May this role open this path? Unknown sections return false. */
export function canAccess(role: UserRole | null, pathname: string): boolean {
  if (!role) return false;
  const section = sectionOf(pathname);
  if (section === null) return true; // neutral path
  if (role === UNRESTRICTED) return true;
  return SECTION_OWNER[section] === role;
}

/** Where a role belongs — used both for the post-sign-in redirect and for
 *  bouncing someone out of a section that isn't theirs. */
export function homeFor(role: UserRole): string {
  return `/${role}`;
}
