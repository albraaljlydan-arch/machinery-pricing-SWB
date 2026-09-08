<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabaseClient';
  import { locale } from '$lib/stores/locale';
  import { t } from '$lib/i18n/dict';
  import AppShell from '$lib/components/AppShell.svelte';
  import type { NavGroup, NavItem } from '$lib/components/navTypes';

  let queueCount = 0;
  let pendingCount = 0;

  onMount(async () => {
    const [{ data: inProd, error: e1 }, { data: pending, error: e2 }] = await Promise.all([
      supabase.from('projects').select('status').eq('status', 'In Production'),
      supabase.from('factory_operations').select('id').eq('approval_status', 'pending'),
    ]);
    if (!e1 && inProd) queueCount = inProd.length;
    if (!e2 && pending) pendingCount = pending.length;
  });

  $: navGroups = [
    { section: t($locale, 'homeSection'), items: [{ href: '/factory', label: t($locale, 'overview'), icon: 'overview' as const, badgeCount: queueCount }] },
    {
      section: t($locale, 'settingsAndPrices'),
      items: [
        { href: '/factory/approve-progress', label: t($locale, 'pendingApprovalTitle'), icon: 'gear' as const, badgeCount: pendingCount },
        { href: '/factory/workers', label: t($locale, 'workersTitle'), icon: 'users' as const },
      ],
    },
  ] as NavGroup[];

  $: currentPath = $page.url.pathname;
  $: allNavItems = navGroups.flatMap((g) => g.items) as NavItem[];
  $: pageTitle = allNavItems.find((item) => item.href === currentPath)?.label ?? t($locale, 'factoryHomeTitle');
</script>

<AppShell {navGroups} {pageTitle} roleLabel={t($locale, 'factory')}>
  <slot />
</AppShell>
