<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabaseClient';
  import { auth } from '$lib/stores/auth';
  import { locale } from '$lib/stores/locale';
  import { t } from '$lib/i18n/dict';
  import AppShell from '$lib/components/AppShell.svelte';
  import type { NavGroup } from '$lib/components/navTypes';

  let pendingCount = 0;
  let rejectedCount = 0;

  onMount(async () => {
    const userId = $auth.session?.user?.id;
    if (!userId) return;
    const { data, error } = await supabase.from('projects').select('status').eq('user_id', userId);
    if (!error && data) {
      pendingCount = data.filter((p) => p.status === 'Pending Admin').length;
      rejectedCount = data.filter((p) => p.status === 'Rejected').length;
    }
  });

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
    { section: t($locale, 'referenceSection'), items: [{ href: '/designer/material-prices', label: t($locale, 'settingsAndPrices'), icon: 'tag' as const }] },
  ] satisfies NavGroup[];

  $: pageTitle = $page.url.pathname === '/designer/material-prices' ? t($locale, 'settingsAndPrices') : t($locale, 'myProjects');
</script>

<AppShell {navGroups} {pageTitle} roleLabel={t($locale, 'designer')}>
  <slot />
</AppShell>
