<script lang="ts">
  import { locale } from '$lib/stores/locale';
  import { t } from '$lib/i18n/dict';
  import AppShell from '$lib/components/AppShell.svelte';
  import type { NavGroup } from '$lib/components/navTypes';

  $: navGroups = [
    { section: t($locale, 'homeSection'), items: [{ href: '/accounting', label: t($locale, 'overview'), icon: 'overview' as const }] },
  ] satisfies NavGroup[];
</script>

<AppShell {navGroups} pageTitle={t($locale, 'accountingHomeTitle')} roleLabel={t($locale, 'accounting')}>
  <slot />
</AppShell>
