<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabaseClient';
  import { locale } from '$lib/stores/locale';
  import { t } from '$lib/i18n/dict';
  import { subscribeToTable } from '$lib/realtime';
  import AppShell from '$lib/components/AppShell.svelte';
  import type { NavGroup, NavItem } from '$lib/components/navTypes';

  let queueCount = 0;
  let pendingCount = 0;
  let pendingPurchaseCount = 0;
  let pendingRequestsCount = 0;

  async function loadCounts() {
    const [{ data: inProd, error: e1 }, { data: pending, error: e2 }, { data: pendingPurchase, error: e3 }, { data: pendingRequests, error: e4 }] = await Promise.all([
      supabase.from('projects').select('status').eq('status', 'In Production'),
      supabase.from('factory_operations').select('id').eq('approval_status', 'pending'),
      supabase.from('purchase_requests').select('id').eq('approval_status', 'pending'),
      supabase.from('customer_requests').select('id').eq('status', 'New'),
    ]);
    if (!e1 && inProd) queueCount = inProd.length;
    if (!e2 && pending) pendingCount = pending.length;
    if (!e3 && pendingPurchase) pendingPurchaseCount = pendingPurchase.length;
    if (!e4 && pendingRequests) pendingRequestsCount = pendingRequests.length;
  }

  // Badge counts used to be fetched once on mount and stay frozen until a
  // manual refresh — now re-run the same query whenever the underlying
  // table actually changes, so every sidebar number here is always live.
  let unsubscribers: (() => void)[] = [];
  onMount(() => {
    loadCounts();
    unsubscribers = [
      subscribeToTable('projects', loadCounts),
      subscribeToTable('factory_operations', loadCounts),
      subscribeToTable('purchase_requests', loadCounts),
      subscribeToTable('customer_requests', loadCounts),
    ];
  });
  onDestroy(() => unsubscribers.forEach((unsub) => unsub()));

  // The factory now runs the factory: besides its build queue it owns the
  // worker roster, the approval of their reported percentages, AND the
  // progress monitor over the result — the same oversight the Admin has, but
  // scoped to the shop floor. It was previously the only role that could
  // approve numbers without being able to look at them afterwards.
  $: navGroups = [
    { section: t($locale, 'homeSection'), items: [{ href: '/factory', label: t($locale, 'overview'), icon: 'overview' as const, badgeCount: queueCount }] },
    {
      section: $locale === 'ar' ? 'إدارة المعمل' : 'Shop Floor',
      // No worker roster any more: progress is tracked per MACHINE, which is
      // what the factory and the Admin actually plan against. Naming an
      // individual on every line added a maintenance chore (keeping the
      // roster current) and a mandatory field, without changing any decision
      // downstream — and an empty roster silently made it impossible to log
      // anything at all.
      items: [
        { href: '/factory/users', label: t($locale, 'usersAndRoles'), icon: 'users' as const },
        { href: '/factory/requests', label: t($locale, 'customerRequestsNav'), icon: 'grid' as const, badgeCount: pendingRequestsCount },
        { href: '/factory/approve-progress', label: t($locale, 'pendingApprovalTitle'), icon: 'clock' as const, badgeCount: pendingCount },
        { href: '/factory/approve-purchase-requests', label: t($locale, 'approvePurchaseRequestsNav'), icon: 'tag' as const, badgeCount: pendingPurchaseCount },
        { href: '/factory/progress', label: t($locale, 'factoryProgress'), icon: 'chart' as const },
      ],
    },
  ] as NavGroup[];

  $: currentPath = $page.url.pathname;
  $: allNavItems = navGroups.flatMap((g) => g.items) as NavItem[];
  $: pageTitle = allNavItems.find((item) => item.href === currentPath)?.label ?? t($locale, 'factoryHomeTitle');
</script>

<AppShell {navGroups} {pageTitle}>
  <slot />
</AppShell>
