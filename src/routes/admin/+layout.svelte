<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabaseClient';
  import { locale } from '$lib/stores/locale';
  import { t } from '$lib/i18n/dict';
  import { subscribeToTable } from '$lib/realtime';
  import AppShell from '$lib/components/AppShell.svelte';
  import type { NavGroup, NavItem } from '$lib/components/navTypes';

  let pendingCount = 0;
  let rejectedCount = 0;
  let awaitingProductionCount = 0;
  let newRequestsCount = 0;

  async function loadCounts() {
    const [{ data, error }, { data: requests, error: reqError }] = await Promise.all([
      supabase.from('projects_with_designer').select('status'),
      supabase.from('customer_requests').select('id').eq('status', 'New'),
    ]);
    if (!error && data) {
      pendingCount = data.filter((p) => p.status === 'Pending Admin').length;
      rejectedCount = data.filter((p) => p.status === 'Rejected').length;
      awaitingProductionCount = data.filter((p) => p.status === 'Awaiting Production').length;
    }
    if (!reqError && requests) newRequestsCount = requests.length;
  }

  // Live, not just fetched once on mount. projects_with_designer is a plain
  // view over `projects` with no data of its own, so subscribing to the
  // underlying table is what actually catches its changes.
  let unsubscribers: (() => void)[] = [];
  onMount(() => {
    loadCounts();
    unsubscribers = [subscribeToTable('projects', loadCounts), subscribeToTable('customer_requests', loadCounts)];
  });
  onDestroy(() => unsubscribers.forEach((unsub) => unsub()));

  // Reads $locale so this whole block re-runs (and every label re-translates)
  // the instant the language toggle is clicked — same pattern every
  // dashboard layout should follow as it gets built out.
  $: navGroups = [
    { section: $locale === 'ar' ? 'الرئيسية' : 'Home', items: [{ href: '/admin', label: t($locale, 'overview'), icon: 'overview' as const }] },
    {
      section: $locale === 'ar' ? 'إدارة المشاريع' : 'Project Management',
      items: [
        { href: '/admin/projects', label: t($locale, 'allProjects'), icon: 'grid' as const },
        { href: '/admin/projects?status=Pending Admin', label: t($locale, 'pendingApproval'), icon: 'clock' as const, badgeCount: pendingCount },
        { href: '/admin/projects?status=Rejected', label: t($locale, 'rejectedAtDesigner'), icon: 'x' as const, badgeCount: rejectedCount },
        { href: '/admin/projects?status=Awaiting Production', label: t($locale, 'statusAwaitingProduction'), icon: 'clock' as const, badgeCount: awaitingProductionCount },
        { href: '/admin/projects?status=In Production', label: t($locale, 'inProduction'), icon: 'gear' as const },
        { href: '/admin/factory-progress', label: t($locale, 'operationsProgressNav'), icon: 'chart' as const, badgeText: t($locale, 'new') },
      ],
    },
    {
      section: t($locale, 'customerRequestsNav'),
      items: [{ href: '/admin/requests', label: t($locale, 'customerRequestsNav'), icon: 'grid' as const, badgeCount: newRequestsCount }],
    },
    { section: $locale === 'ar' ? 'الأشخاص' : 'People', items: [{ href: '/admin/users', label: t($locale, 'usersAndRoles'), icon: 'users' as const }] },
    {
      section: $locale === 'ar' ? 'تحليل' : 'Analytics',
      items: [
        { href: '/admin/reports', label: t($locale, 'reportsExport'), icon: 'bars' as const },
        { href: '/admin/material-prices', label: t($locale, 'materialPrices'), icon: 'tag' as const },
      ],
    },
  ] as NavGroup[];

  // Picks the title of whichever nav item matches the current route — this
  // used to always say "Overview" no matter which page you were actually on
  // (Users, Reports, a filtered project list, etc.), because it was
  // hardcoded instead of derived from the route. Full path+query is tried
  // first so a filtered link (e.g. ?status=Rejected) gets its own title
  // rather than falling through to "All Projects"; a path-only match is the
  // fallback for every unfiltered page.
  $: currentPath = $page.url.pathname;
  $: currentFull = currentPath + decodeURIComponent($page.url.search);
  $: allNavItems = navGroups.flatMap((g) => g.items) as NavItem[];
  $: pageTitle =
    currentPath === '/admin/search'
      ? t($locale, 'searchResultsTitle')
      : (allNavItems.find((item) => item.href === currentFull)?.label ??
        allNavItems.find((item) => !item.href.includes('?') && item.href === currentPath)?.label ??
        t($locale, 'overview'));
</script>

<AppShell {navGroups} {pageTitle}>
  <slot />
</AppShell>
