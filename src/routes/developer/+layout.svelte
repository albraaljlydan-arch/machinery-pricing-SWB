<script lang="ts">
  import { page } from '$app/stores';
  import { locale } from '$lib/stores/locale';
  import { t } from '$lib/i18n/dict';
  import AppShell from '$lib/components/AppShell.svelte';
  import type { NavGroup, NavItem } from '$lib/components/navTypes';

  $: navGroups = [
    { section: t($locale, 'homeSection'), items: [{ href: '/developer', label: t($locale, 'overview'), icon: 'overview' as const }] },
    {
      section: t($locale, 'settingsAndPrices'),
      items: [
        { href: '/developer/calculator-designer', label: t($locale, 'editCalcDesigner'), icon: 'gear' as const },
        { href: '/developer/calculator-procurement', label: t($locale, 'editCalcProcurement'), icon: 'gear' as const, badgeText: t($locale, 'comingSoonTag') },
      ],
    },
  ] as NavGroup[];

  $: currentPath = $page.url.pathname;
  $: allNavItems = navGroups.flatMap((g) => g.items) as NavItem[];
  $: pageTitle = allNavItems.find((item) => item.href === currentPath)?.label ?? t($locale, 'overview');
</script>

<AppShell {navGroups} {pageTitle}>
  <slot />
</AppShell>
