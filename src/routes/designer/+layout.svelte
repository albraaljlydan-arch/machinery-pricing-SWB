<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabaseClient';
  import { auth } from '$lib/stores/auth';
  import { locale } from '$lib/stores/locale';
  import { t } from '$lib/i18n/dict';
  import { subscribeToTable } from '$lib/realtime';
  import AppShell from '$lib/components/AppShell.svelte';
  import type { NavGroup } from '$lib/components/navTypes';

  let pendingCount = 0;
  let rejectedCount = 0;
  let assignedRequestsCount = 0;

  async function loadCounts() {
    const userId = $auth.session?.user?.id;
    if (!userId) return;
    const [{ data, error }, { data: requests, error: reqError }] = await Promise.all([
      supabase.from('projects').select('status').eq('user_id', userId),
      supabase.from('customer_requests').select('id').eq('assigned_designer_id', userId).eq('status', 'Assigned'),
    ]);
    if (!error && data) {
      pendingCount = data.filter((p) => p.status === 'Pending Admin').length;
      rejectedCount = data.filter((p) => p.status === 'Rejected').length;
    }
    if (!reqError && requests) assignedRequestsCount = requests.length;
  }

  // Badge counts used to be fetched once on mount and stay frozen until a
  // manual refresh — now re-run the same query whenever the underlying
  // table actually changes, so the sidebar number is always live.
  let unsubscribers: (() => void)[] = [];
  onMount(() => {
    loadCounts();
    unsubscribers = [subscribeToTable('projects', loadCounts), subscribeToTable('customer_requests', loadCounts)];
  });
  onDestroy(() => unsubscribers.forEach((unsub) => unsub()));

  // Same shell as Admin, deliberately much shorter — a Designer only ever
  // needs their own projects and the read-only material price list, none
  // of Admin's management/user/report sections. Reads $locale directly so
  // this re-translates the instant the toggle is clicked, same pattern as
  // Admin's layout — this was the actual gap behind "Arabic doesn't work
  // right": only Admin's nav ever responded to the toggle before.
  $: navGroups = [
    { section: t($locale, 'homeSection'), items: [{ href: '/designer', label: t($locale, 'myProjects'), icon: 'overview' as const }] },
    {
      section: t($locale, 'projectsSection'),
      items: [
        { href: '/designer?status=Pending Admin', label: t($locale, 'pendingAdminNav'), icon: 'clock' as const, badgeCount: pendingCount },
        { href: '/designer?status=Rejected', label: t($locale, 'rejectedNeedsFix'), icon: 'x' as const, badgeCount: rejectedCount },
      ],
    },
    {
      section: t($locale, 'customerRequestsNav'),
      items: [{ href: '/designer/requests', label: t($locale, 'assignedRequestsNav'), icon: 'grid' as const, badgeCount: assignedRequestsCount }],
    },
    { section: t($locale, 'referenceSection'), items: [{ href: '/designer/material-prices', label: t($locale, 'settingsAndPrices'), icon: 'tag' as const }] },
  ] satisfies NavGroup[];

  $: pageTitle = $page.url.pathname === '/designer/material-prices' ? t($locale, 'settingsAndPrices') : $page.url.pathname === '/designer/requests' ? t($locale, 'assignedRequestsNav') : t($locale, 'myProjects');
</script>

<AppShell {navGroups} {pageTitle}>
  <slot />
</AppShell>
