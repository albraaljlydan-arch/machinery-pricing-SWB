<script lang="ts">
  // ==========================================================================
  //  APP SHELL — the light sidebar + topbar chrome shared by every role's
  //  dashboard. Originally built for Admin alone (as AdminShell) and later
  //  adopted everywhere once the owner preferred it over every other
  //  direction tried — so this file, not a per-role variant, is now the one
  //  shell in the app. Each role just passes its own navGroups and page
  //  title; the shell itself never changes.
  // ==========================================================================
  import { page } from '$app/stores';
  import { fade, fly } from 'svelte/transition';
  import { supabase } from '$lib/supabaseClient';
  import { auth } from '$lib/stores/auth';
  import { locale } from '$lib/stores/locale';
  import { theme } from '$lib/stores/theme';
  import { t, roleLabel } from '$lib/i18n/dict';
  import { renderNotification } from '$lib/i18n/notifications';
  import { initialsOf } from '$lib/initials';
  import logoUrl from '$lib/assets/logo.svg';
  import GlobalSearch from './GlobalSearch.svelte';
  import type { NavItem, NavGroup } from './navTypes';

  export let navGroups: NavGroup[];
  export let pageTitle: string;
  export let searchPlaceholder: string | undefined = undefined;

  $: signedInRole = roleLabel($locale, $auth.userRole);

  $: currentPath = $page.url.pathname;
  $: currentFull = currentPath + decodeURIComponent($page.url.search);

  // Settings lives inside whichever section is open (/factory/settings, …),
  // so the developer role — which can browse every section — stays put.
  $: settingsHref = `/${currentPath.split('/')[1] ?? ''}/settings`;
  $: onSettings = currentPath === settingsHref;
  $: shownTitle = onSettings ? t($locale, 'settingsTitle') : pageTitle;
  $: userEmail = $auth.session?.user?.email ?? '';
  $: userInitials = initialsOf($auth.fullName, userEmail);

  interface NotificationRow {
    id: string;
    message: string;
    link: string | null;
    is_read: boolean;
    created_at: string;
  }
  let notifications: NotificationRow[] = [];
  let notifOpen = false;
  $: unreadCount = notifications.filter((n) => !n.is_read).length;

  async function loadNotifications() {
    const userId = $auth.session?.user.id;
    if (!userId) return;
    const { data, error } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(30);
    if (!error) notifications = data || [];
  }
  $: if ($auth.session?.user.id) loadNotifications();

  async function toggleNotifPanel() {
    notifOpen = !notifOpen;
  }

  async function markAllRead() {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    notifications = notifications.map((n) => ({ ...n, is_read: true }));
    await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
  }

  async function openNotification(n: NotificationRow) {
    if (!n.is_read) {
      notifications = notifications.map((x) => (x.id === n.id ? { ...x, is_read: true } : x));
      await supabase.from('notifications').update({ is_read: true }).eq('id', n.id);
    }
    notifOpen = false;
    if (n.link) window.location.href = n.link;
  }

  let mobileNavOpen = false;
  $: if ($page.url.pathname) mobileNavOpen = false;

  function toggleTheme() {
    theme.set($theme === 'light' ? 'dark' : 'light');
  }

  function isNavActive(href: string, path: string, fullPath: string): boolean {
    if (href.includes('?')) return href === fullPath;
    if (path === href) return !fullPath.includes('?');
    // A section's home link (/admin, /factory, …) is only active on the home
    // page itself; otherwise it stayed highlighted on every page under it.
    if (href.split('/').filter(Boolean).length === 1) return false;
    return path.startsWith(href + '/');
  }
</script>

<div class="shell" class:nav-open={mobileNavOpen}>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="backdrop" on:click={() => (mobileNavOpen = false)} role="presentation"></div>
  <aside class="sidebar">
    <div class="brand">
      <img class="brand-mark" src={logoUrl} alt="SWB Technology" />
    </div>

    <nav class="navlist">
      {#each navGroups as group, gi}
        <div class="navgroup" class:first={gi === 0}>
          {#each group.items as item}
            <a class="nav-item" class:active={isNavActive(item.href, currentPath, currentFull)} href={item.href}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                {#if item.icon === 'overview'}
                  <circle cx="12" cy="12" r="3.2" /><path d="M12 3v2.2M12 18.8V21M21 12h-2.2M5.2 12H3M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6M18.4 18.4l-1.6-1.6M7.2 7.2 5.6 5.6" />
                {:else if item.icon === 'grid'}
                  <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
                {:else if item.icon === 'clock'}
                  <path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M6 3h8l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
                {:else if item.icon === 'x'}
                  <path d="M18 6 6 18M6 6l12 12" />
                {:else if item.icon === 'gear'}
                  <path d="M12 2v20M17 5.5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                {:else if item.icon === 'chart'}
                  <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" />
                {:else if item.icon === 'users'}
                  <circle cx="9" cy="8" r="3.2" /><path d="M2.5 20c.8-3.6 3.4-5.6 6.5-5.6s5.7 2 6.5 5.6" /><circle cx="17.5" cy="8.5" r="2.4" /><path d="M16.3 14.6c2.4.3 4.1 2 4.7 4.6" />
                {:else if item.icon === 'bars'}
                  <path d="M4 20V10M11 20V4M18 20v-7" />
                {:else if item.icon === 'tag'}
                  <path d="M20.6 12.9 12.9 20.6a2 2 0 0 1-2.8 0l-6.7-6.7a2 2 0 0 1 0-2.8L11.1 3.4a2 2 0 0 1 1.4-.6H18a2 2 0 0 1 2 2v5.6a2 2 0 0 1-.6 1.5Z" /><circle cx="15.5" cy="8.5" r="1.4" />
                {/if}
              </svg>
              {item.label}
              {#if item.badgeCount !== undefined && item.badgeCount > 0}
                <span class="badge">{item.badgeCount}</span>
              {:else if item.badgeText}
                <span class="badge new">{item.badgeText}</span>
              {/if}
            </a>
          {/each}
        </div>
      {/each}
    </nav>

    <a class="user-card" class:active={onSettings} href={settingsHref} aria-label={t($locale, 'settingsOpen')} title={t($locale, 'settingsOpen')}>
      <span class="avatar">{userInitials}</span>
      <span class="who"><b dir="auto">{$auth.fullName || userEmail}</b><span>{signedInRole}</span></span>
      <svg class="gear" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></svg>
    </a>
  </aside>

  <div class="main">
    <header class="topbar">
      <button class="hamburger" on:click={() => (mobileNavOpen = !mobileNavOpen)} aria-label={t($locale, 'homeSection')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
      </button>
      <h1>{shownTitle}</h1>
      <GlobalSearch placeholder={searchPlaceholder} />
      <div class="topbar-right">
        <button class="icon-btn" on:click={toggleTheme} aria-label={$theme === 'light' ? t($locale, 'darkMode') : t($locale, 'lightMode')} title={$theme === 'light' ? t($locale, 'darkMode') : t($locale, 'lightMode')}>
          {#if $theme === 'light'}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" /></svg>
          {:else}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
          {/if}
        </button>
        <div class="notif-wrap">
          <button class="icon-btn" on:click={toggleNotifPanel} aria-label={t($locale, 'notifications')} title={t($locale, 'notifications')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>
            {#if unreadCount > 0}<span class="dot-badge">{unreadCount}</span>{/if}
          </button>
          {#if notifOpen}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <div class="notif-backdrop" on:click={() => (notifOpen = false)} role="presentation"></div>
            <div class="notif-panel">
              <div class="notif-panel-head">
                <span>{t($locale, 'notifications')}</span>
                {#if unreadCount > 0}<button class="notif-markall" on:click={markAllRead}>{t($locale, 'markAllReadBtn')}</button>{/if}
              </div>
              {#if notifications.length === 0}
                <div class="notif-empty">{t($locale, 'noNotificationsYet')}</div>
              {:else}
                <div class="notif-list">
                  {#each notifications as n (n.id)}
                    <button class="notif-item" class:unread={!n.is_read} on:click={() => openNotification(n)}>
                      <span class="notif-dot" class:show={!n.is_read}></span>
                      <span class="notif-msg">{renderNotification($locale, n.message)}</span>
                    </button>
                  {/each}
                </div>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    </header>

    <div class="content">
      {#key $page.url.pathname + $page.url.search}
        <div class="route-view" in:fly={{ y: 10, duration: 260 }} out:fade={{ duration: 110 }}>
          <slot />
        </div>
      {/key}
    </div>
  </div>
</div>

<style>
  .shell {
    display: grid;
    grid-template-columns: 252px 1fr;
    min-height: 100vh;
  }
  .sidebar {
    background: var(--card);
    color: var(--ink);
    padding: 20px 14px 18px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    position: sticky;
    top: 0;
    height: 100vh;
    overflow-y: auto;
    border-inline-end: 1px solid var(--border);
  }
  .brand {
    padding: 6px 8px 16px;
    border-bottom: 1px solid var(--border);
  }
  .brand-mark {
    display: block;
    width: 100%;
    height: 34px;
    object-fit: contain;
    object-position: center;
  }
  nav.navlist {
    display: flex;
    flex-direction: column;
  }
  .navgroup {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-top: 14px;
  }
  .navgroup.first {
    margin-top: 0;
  }
  .nav-item {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 10px 12px;
    border-radius: 10px;
    font-size: 13.5px;
    font-weight: 600;
    color: var(--ink-soft);
    transition: background 0.15s ease, color 0.15s ease;
  }
  .nav-item svg {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    opacity: 0.85;
  }
  .nav-item:hover {
    background: var(--paper);
    color: var(--ink);
  }
  .nav-item.active {
    background: var(--navy);
    color: #ffffff;
    box-shadow: inset 3px 0 0 var(--cyan);
  }
  :global(html[dir='rtl']) .nav-item.active {
    box-shadow: inset -3px 0 0 var(--cyan);
  }
  .nav-item.active svg {
    opacity: 1;
  }
  .nav-item .badge {
    margin-inline-start: auto;
    background: var(--amber);
    color: #3b2504;
    font-family: var(--font-num);
    font-variant-numeric: tabular-nums;
    font-weight: 700;
    font-size: 10.5px;
    padding: 1px 7px;
    border-radius: 20px;
  }
  .nav-item .badge.new {
    background: var(--purple);
    color: #fff;
    font-family: var(--font-body);
    font-size: 9.5px;
  }
  .user-card {
    margin-top: auto;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--paper);
    color: var(--ink);
    transition: border-color 0.15s ease, background 0.15s ease;
  }
  .user-card:hover {
    border-color: color-mix(in srgb, var(--navy-3) 45%, var(--border));
  }
  .user-card.active {
    border-color: var(--navy-3);
    box-shadow: 0 0 0 1px var(--navy-3);
  }
  .user-card .avatar {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: linear-gradient(155deg, var(--navy-3), var(--navy));
    color: #eaf4f8;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 12.5px;
    flex-shrink: 0;
  }
  .user-card .who {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1;
  }
  .user-card .who b {
    font-size: 12.5px;
    font-weight: 800;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .user-card .who span {
    font-size: 10.5px;
    color: var(--ink-soft);
  }
  .user-card .gear {
    width: 17px;
    height: 17px;
    flex-shrink: 0;
    color: var(--ink-soft);
    transition: transform 0.3s ease;
  }
  .user-card:hover .gear {
    transform: rotate(45deg);
    color: var(--navy-3);
  }

  .main {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .topbar {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px 28px;
    background: var(--card);
    border-bottom: 1px solid var(--border);
    position: sticky;
    top: 0;
    z-index: 5;
  }
  .hamburger {
    display: none;
    width: 36px;
    height: 36px;
    border-radius: 9px;
    border: 1px solid var(--border);
    background: var(--paper);
    color: var(--ink-soft);
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .hamburger svg {
    width: 19px;
    height: 19px;
  }
  .backdrop {
    display: none;
  }
  .topbar h1 {
    font-size: 17px;
    margin: 0;
    font-weight: 900;
    white-space: nowrap;
  }
  .topbar-right {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-inline-start: auto;
  }
  .icon-btn {
    position: relative;
    width: 38px;
    height: 38px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--paper);
    border: 1px solid var(--border);
    color: var(--ink-soft);
    transition: transform 0.15s ease, color 0.15s ease;
  }
  .icon-btn:hover {
    color: var(--navy-3);
    transform: translateY(-1px);
  }
  .icon-btn svg {
    width: 18px;
    height: 18px;
  }
  .dot-badge {
    position: absolute;
    top: -4px;
    inset-inline-start: -4px;
    background: var(--danger);
    color: #fff;
    font-family: var(--font-num);
    font-variant-numeric: tabular-nums;
    font-size: 9.5px;
    font-weight: 700;
    min-width: 16px;
    height: 16px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid var(--card);
  }
  .notif-wrap {
    position: relative;
  }
  .notif-backdrop {
    position: fixed;
    inset: 0;
    z-index: 40;
    background: color-mix(in srgb, var(--navy) 8%, transparent);
    backdrop-filter: blur(1px);
  }
  .notif-panel {
    position: absolute;
    top: calc(100% + 8px);
    inset-inline-end: 0;
    width: 320px;
    max-height: 420px;
    background: var(--card);
    border: 1px solid color-mix(in srgb, var(--navy) 32%, var(--border));
    border-radius: 8px;
    box-shadow: 0 20px 50px rgba(7, 26, 40, 0.24), 0 4px 12px rgba(7, 26, 40, 0.14);
    z-index: 41;
    isolation: isolate;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .notif-panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    border-bottom: 1px solid var(--border);
    font-size: 13px;
    font-weight: 700;
    color: var(--ink);
    background: var(--paper);
  }
  .notif-markall {
    background: transparent;
    border: none;
    color: var(--navy-3);
    font-size: 11.5px;
    font-weight: 700;
    cursor: pointer;
  }
  .notif-empty {
    padding: 26px 16px;
    text-align: center;
    font-size: 12.5px;
    color: var(--ink-soft);
  }
  .notif-list {
    overflow-y: auto;
  }
  .notif-item {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    width: 100%;
    text-align: start;
    background: var(--card);
    border: none;
    border-bottom: 1px solid var(--border);
    padding: 10px 14px;
    cursor: pointer;
    font-size: 12.5px;
    color: var(--ink);
  }
  .notif-item:last-child {
    border-bottom: none;
  }
  .notif-item.unread {
    background: var(--paper);
    font-weight: 600;
  }
  .notif-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--danger);
    margin-top: 5px;
    flex-shrink: 0;
    visibility: hidden;
  }
  .notif-dot.show {
    visibility: visible;
  }
  .notif-msg {
    line-height: 1.5;
  }
  .avatar {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: linear-gradient(155deg, var(--navy-3), var(--navy));
    color: #eaf4f8;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 12.5px;
    font-family: var(--font-num);
    flex-shrink: 0;
  }

  .content {
    padding: 24px 28px 60px;
  }
  .route-view {
    display: flex;
    flex-direction: column;
    gap: 22px;
    min-width: 0;
  }

  :global(html[data-theme='dark']) .shell {
    --paper: #111820;
    --card: #1d2832;
    --card-hover: #283641;
    --ink: #f1f5f7;
    --ink-soft: #b5c1ca;
    --steel-2: #91a4b2;
    --border: #3a4a56;
    --navy: #203f55;
    --navy-3: #71b7dc;
    --success: #55bd83;
    --purple: #9a7bea;
    --amber: #efb64e;
    background: var(--paper);
  }
  :global(html[data-theme='dark']) .sidebar,
  :global(html[data-theme='dark']) .topbar {
    background: #1a242d;
  }
  :global(html[data-theme='dark']) .nav-item:hover {
    background: #273642;
    color: #ffffff;
  }
  :global(html[data-theme='dark']) .nav-item.active {
    background: #315b76;
    color: #ffffff;
    box-shadow: inset 3px 0 0 #89d0ed;
  }
  :global(html[dir='rtl'][data-theme='dark']) .nav-item.active {
    box-shadow: inset -3px 0 0 #89d0ed;
  }
  :global(html[data-theme='dark']) .brand-mark {
    filter: brightness(1.7);
  }

  @media (max-width: 820px) {
    .shell {
      grid-template-columns: 1fr;
    }
    .hamburger {
      display: flex;
    }
    .sidebar {
      position: fixed;
      inset-inline-start: 0;
      top: 0;
      height: 100vh;
      width: 252px;
      z-index: 30;
      transform: translateX(-100%);
      transition: transform 0.2s ease;
    }
    :global(html[dir='rtl']) .sidebar {
      transform: translateX(100%);
    }
    .shell.nav-open .sidebar {
      transform: translateX(0);
    }
    .shell.nav-open .backdrop {
      display: block;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.45);
      z-index: 20;
    }
    .topbar {
      padding: 14px 16px;
      gap: 10px;
    }
  }

  @media (max-width: 480px) {
    .topbar-right {
      gap: 6px;
    }
    .content {
      padding: 18px 14px 40px;
    }
  }
</style>
