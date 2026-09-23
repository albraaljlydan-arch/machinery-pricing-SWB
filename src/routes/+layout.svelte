<script lang="ts">
  import '../lib/design/tokens.css';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { auth } from '$lib/stores/auth';
  import { canAccess, homeFor } from '$lib/auth/access';
  import { locale } from '$lib/stores/locale';
  import { theme } from '$lib/stores/theme';
  import { supabase } from '$lib/supabaseClient';
  import Toast from '$lib/components/Toast.svelte';

  onMount(() => {
    auth.init();
  });

  // Dashboard-wide direction + theme, applied at the document level so
  // every dashboard shell (Admin/Designer/Factory/Accounting) flips
  // together. The calculator explicitly overrides dir="ltr" on its own
  // root element (see Calculator.svelte) regardless of what this is set
  // to — it never follows the toggle, per spec.
  $: if (typeof document !== 'undefined') {
    document.documentElement.dir = $locale === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = $locale;
  }
  $: if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = $theme;
  }

  // Route guard — the ONE place this app decides where to send someone,
  // covering every case in one pass instead of splitting logic between
  // this layout and the root page (that split was the actual bug: the
  // root page had its own separate redirect subscription that could race
  // against this one, especially right after switching accounts).
  //
  // The third branch is the one that was missing entirely: being signed in
  // was treated as permission to open ANY section. An Accounting login could
  // type /admin and get the whole admin dashboard, Users page included.
  // Section ownership now lives in lib/auth/access.ts — including the
  // 'developer' exemption, which per spec reaches every screen.
  $: {
    const path = $page.url.pathname;
    if (!$auth.loading && path !== '/accept-invite') {
      if (!$auth.session && path !== '/login' && path !== '/signup') {
        goto('/login');
      } else if ($auth.session && $auth.userRole) {
        if (path === '/login' || path === '/' || path === '/signup') {
          goto(homeFor($auth.userRole));
        } else if (!canAccess($auth.userRole, path)) {
          goto(homeFor($auth.userRole), { replaceState: true });
        }
      }
    }
  }

  // Rendering is gated on the SAME check, not just the redirect. goto() is
  // async, so without this the forbidden page still mounted for a frame or
  // two — long enough for its onMount to fire its own Supabase queries and
  // for the screen to flash into view. Now nothing off-limits is ever
  // instantiated.
  $: routeAllowed = canAccess($auth.userRole, $page.url.pathname);

  function handleSignOut() {
    supabase.auth.signOut();
  }
</script>

{#if $page.url.pathname === '/accept-invite'}
  <slot />
{:else if $auth.loading}
  <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--paper);color:var(--ink-soft);">
    Loding SWB System
  </div>
{:else if $auth.profileError}
  <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--paper);flex-direction:column;gap:14px;">
    <div style="color:var(--danger-deep);font-weight:700;">{$auth.profileError}</div>
    <button on:click={handleSignOut} style="background:var(--navy);color:#fff;border:none;padding:8px 18px;border-radius:8px;font-weight:700;">
      Sign Out
    </button>
  </div>
{:else if $page.url.pathname === '/login' || $page.url.pathname === '/signup'}
  <slot />
{:else if $auth.session && $auth.userRole && routeAllowed}
  <slot />
{:else if $auth.session && $auth.userRole}
  <!-- Signed in, but this section is not theirs. The redirect above is
       already in flight; this is what shows for the frame or two it takes,
       instead of the forbidden page itself. -->
  <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--paper);color:var(--ink-soft);">
    Loding SWB System
  </div>
{/if}

<Toast />
