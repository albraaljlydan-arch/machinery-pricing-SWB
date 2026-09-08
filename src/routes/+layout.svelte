<script lang="ts">
  import '../lib/design/tokens.css';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { auth } from '$lib/stores/auth';
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
  // 'developer' is the one exception: per spec, that account can add/edit
  // anything on ANY page (it's a technical/design role, not a workflow
  // role — no Owner-level authority over users/approvals, but full reach
  // across every screen). So it's never redirected away from a route the
  // way every other role is confined to its own section.
  $: {
    const path = $page.url.pathname;
    if (!$auth.loading) {
      if (!$auth.session && path !== '/login') {
        goto('/login');
      } else if ($auth.session && $auth.userRole && (path === '/login' || path === '/')) {
        goto(`/${$auth.userRole}`);
      }
    }
  }

  function handleSignOut() {
    supabase.auth.signOut();
  }
</script>

{#if $auth.loading}
  <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--paper);color:var(--ink-soft);">
    Loading…
  </div>
{:else if $auth.profileError}
  <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--paper);flex-direction:column;gap:14px;">
    <div style="color:var(--danger-deep);font-weight:700;">{$auth.profileError}</div>
    <button on:click={handleSignOut} style="background:var(--navy);color:#fff;border:none;padding:8px 18px;border-radius:8px;font-weight:700;">
      Sign Out
    </button>
  </div>
{:else if $page.url.pathname === '/login'}
  <slot />
{:else if $auth.session && $auth.userRole}
  <slot />
{/if}

<Toast />
