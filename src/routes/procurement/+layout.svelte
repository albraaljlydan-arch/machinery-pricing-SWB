<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabaseClient';
  import { locale } from '$lib/stores/locale';
  import { t } from '$lib/i18n/dict';
  import AppShell from '$lib/components/AppShell.svelte';
  import type { NavGroup } from '$lib/components/navTypes';

  // Procurement previously had NO dashboard shell at all — no sidebar, no
  // language/theme toggle, no notifications, just a bare page. This gives
  // it the same AppShell every other role gets, wired to the locale toggle
  // the same way Admin/Designer/Factory/Accounting already are.
  let readyCount = 0;

  onMount(async () => {
    const { data, error } = await supabase.from('projects').select('status').eq('status', 'Complete Production');
    if (!error && data) readyCount = data.length;
  });

  $: navGroups = [
    { section: t($locale, 'homeSection'), items: [{ href: '/procurement', label: t($locale, 'overview'), icon: 'overview' as const, badgeCount: readyCount }] },
    { section: t($locale, 'settingsAndPrices'), items: [{ href: '/procurement/material-prices', label: t($locale, 'materialPrices'), icon: 'gear' as const }] },
  ] satisfies NavGroup[];

  $: pageTitle = $page.url.pathname === '/procurement/material-prices' ? t($locale, 'editMaterialPricesTitle') : t($locale, 'procurementHomeTitle');
</script>

<AppShell {navGroups} {pageTitle} roleLabel={t($locale, 'procurement')}>
  <slot />
</AppShell>
