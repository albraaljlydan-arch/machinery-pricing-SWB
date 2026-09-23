<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabaseClient';
  import { locale } from '$lib/stores/locale';
  import { t } from '$lib/i18n/dict';
  import { subscribeToTable } from '$lib/realtime';
  import AppShell from '$lib/components/AppShell.svelte';
  import type { NavGroup } from '$lib/components/navTypes';

  // Procurement previously had NO dashboard shell at all — no sidebar, no
  // language/theme toggle, no notifications, just a bare page. This gives
  // it the same AppShell every other role gets, wired to the locale toggle
  // the same way Admin/Designer/Factory/Accounting already are.
  let readyCount = 0;
  let pendingTaskCount = 0;

  async function loadCounts() {
    const [{ data: ready, error: e1 }, { data: inProd, error: e2 }] = await Promise.all([
      supabase.from('projects').select('status').eq('status', 'Complete Production'),
      supabase.from('procurement_tasks').select('purchased_quantity, total_quantity'),
    ]);
    if (!e1 && ready) readyCount = ready.length;
    if (!e2 && inProd) pendingTaskCount = inProd.filter((task) => Number(task.purchased_quantity) < Number(task.total_quantity)).length;
  }

  // Live, not just fetched once on mount.
  let unsubscribeProjects: (() => void) | null = null;
  let unsubscribeTasks: (() => void) | null = null;
  onMount(() => {
    loadCounts();
    unsubscribeProjects = subscribeToTable('projects', loadCounts);
    unsubscribeTasks = subscribeToTable('procurement_tasks', loadCounts);
  });
  onDestroy(() => {
    unsubscribeProjects?.();
    unsubscribeTasks?.();
  });

  $: navGroups = [
    { section: t($locale, 'homeSection'), items: [{ href: '/procurement', label: t($locale, 'overview'), icon: 'overview' as const, badgeCount: readyCount }] },
    {
      section: $locale === 'ar' ? 'أثناء التصنيع' : 'During Production',
      items: [{ href: '/procurement/purchase-requests', label: t($locale, 'purchaseRequestsNav'), icon: 'clock' as const, badgeCount: pendingTaskCount }],
    },
    { section: t($locale, 'settingsAndPrices'), items: [{ href: '/procurement/material-prices', label: t($locale, 'materialPrices'), icon: 'gear' as const }] },
  ] satisfies NavGroup[];

  $: pageTitle =
    $page.url.pathname === '/procurement/material-prices'
      ? t($locale, 'editMaterialPricesTitle')
      : $page.url.pathname.startsWith('/procurement/purchase-requests')
        ? t($locale, 'purchaseRequestsNav')
        : t($locale, 'procurementHomeTitle');
</script>

<AppShell {navGroups} {pageTitle}>
  <slot />
</AppShell>
