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

  let assignedCount = 0;

  async function loadCount() {
    const userId = $auth.session?.user?.id;
    if (!userId) return;
    const { data, error } = await supabase.from('customer_requests').select('status').eq('customer_id', userId);
    if (!error && data) assignedCount = data.filter((r) => r.status === 'Assigned').length;
  }

  // Live, not just fetched once on mount — a customer sees the moment
  // Factory assigns them a designer without needing to refresh.
  let unsubscribe: (() => void) | null = null;
  onMount(() => {
    loadCount();
    unsubscribe = subscribeToTable('customer_requests', loadCount);
  });
  onDestroy(() => unsubscribe?.());

  // A customer only ever needs their own requests — no other section of
  // this app is theirs to see, so the sidebar is a single item.
  $: navGroups = [{ section: t($locale, 'homeSection'), items: [{ href: '/customer', label: t($locale, 'myRequests'), icon: 'overview' as const, badgeCount: assignedCount }] }] satisfies NavGroup[];

  $: pageTitle = t($locale, 'myRequests');
</script>

<AppShell {navGroups} {pageTitle}>
  <slot />
</AppShell>
