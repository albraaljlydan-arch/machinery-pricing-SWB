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

  async function fetchUserProfile(userId: string) {
    activeUserId = userId;
    const { data, error } = await supabase.from('profiles').select('role').eq('id', userId).single();

    // The person may have signed out (or into a different account) while
    // this request was in flight — a stale response must never overwrite
    // whatever the CURRENT session actually is.
    if (activeUserId !== userId) return;

    if (error || !data) {
      update((s) => ({ ...s, loading: false, profileError: 'Could not load your account role. Please contact an admin.' }));
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
    fetchUserProfile(newSession.user.id);
  }

  return { subscribe, init };
}

export const auth = createAuthStore();
