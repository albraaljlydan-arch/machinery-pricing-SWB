import { writable } from 'svelte/store';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import type { UserRole } from '../types';

export interface AuthState {
  loading: boolean;
  session: Session | null;
  userRole: UserRole | null;
  profileError: string | null;
}

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>({
    loading: true,
    session: null,
    userRole: null,
    profileError: null,
  });

  // The ONE source of truth for "which user's role are we currently
  // resolved for / currently fetching for". This is what was missing
  // before and caused the account-switching bug: fetchUserProfile had no
  // way to tell, once its async call finally resolved, whether the person
  // had ALREADY signed out and into a DIFFERENT account in the meantime —
  // so a slow, stale response for the OLD account could land last and
  // silently overwrite the store with the wrong role. Every check below
  // compares against this single variable before applying a result.
  let activeUserId: string | null = null;

  async function fetchUserProfile(user: { id: string; user_metadata?: Record<string, unknown> }) {
    const userId = user.id;
    activeUserId = userId;
    let { data, error } = await supabase.from('profiles').select('role').eq('id', userId).single();
    let insertErrorMessage: string | null = null;

    // Self-registered customers have no profiles row created by staff — the
    // signup screen stamps role:'customer' onto the auth user's metadata,
    // and the row is created here the first time a session for this id
    // resolves (right after signup, or later, after confirming their
    // email and signing in). Every other role is still created by Factory
    // via the create-user function, which writes profiles itself.
    if (error && user.user_metadata?.role === 'customer') {
      const meta = user.user_metadata as { full_name?: string; company_name?: string; phone?: string };
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({ id: userId, full_name: meta.full_name ?? '', role: 'customer', company_name: meta.company_name ?? null, phone: meta.phone ?? null });
      if (!insertError) {
        ({ data, error } = await supabase.from('profiles').select('role').eq('id', userId).single());
      } else {
        insertErrorMessage = insertError.message;
        console.error('Could not create customer profile row:', insertError);
      }
    }

    // The person may have signed out (or into a different account) while
    // this request was in flight — a stale response must never overwrite
    // whatever the CURRENT session actually is.
    if (activeUserId !== userId) return;

    if (error || !data) {
      // The real Postgres/RLS error (when there is one) is appended so this
      // is actually debuggable instead of always saying the same generic
      // line no matter the cause.
      const detail = insertErrorMessage ?? error?.message;
      update((s) => ({ ...s, loading: false, profileError: detail ? `Could not load your account role: ${detail}` : 'Could not load your account role. Please contact an admin.' }));
      return;
    }
    update((s) => ({ ...s, loading: false, userRole: data.role as UserRole, profileError: null }));
  }

  function init() {
    // onAuthStateChange fires an initial event with the current session
    // the moment you subscribe (Supabase v2), so a separate getSession()
    // call isn't needed and was the other half of the race: both used to
    // fire handleSession independently for the same session.
    supabase.auth.onAuthStateChange((_event, newSession) => {
      handleSession(newSession);
    });
  }

  function handleSession(newSession: Session | null) {
    if (!newSession) {
      activeUserId = null;
      set({ loading: false, session: null, userRole: null, profileError: null });
      return;
    }

    // Already resolved (or already fetching) for this exact user — the
    // guard that was missing before. Without it, a second identical
    // session event (which does happen — token refreshes fire
    // onAuthStateChange too) would re-trigger a full re-fetch and briefly
    // flash back to loading:true for no reason.
    if (activeUserId === newSession.user.id) {
      update((s) => ({ ...s, session: newSession }));
      return;
    }

    update((s) => ({ ...s, session: newSession, loading: true, userRole: null, profileError: null }));
    fetchUserProfile(newSession.user);
  }

  return { subscribe, init };
}

export const auth = createAuthStore();
