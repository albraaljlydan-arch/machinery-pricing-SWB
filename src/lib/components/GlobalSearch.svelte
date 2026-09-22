<script lang="ts">
  // ==========================================================================
  //  GLOBAL SEARCH — the topbar box, which until now was an <input> with no
  //  binding and no handler in either shell. Live grouped results, keyboard
  //  navigable, and scoped by role (see lib/search.ts).
  // ==========================================================================
  import { goto } from '$app/navigation';
  import { fly } from 'svelte/transition';
  import { auth } from '$lib/stores/auth';
  import { locale } from '$lib/stores/locale';
  import { t, roleLabel, statusLabel, requestStatusLabel } from '$lib/i18n/dict';
  import { globalSearch, totalHits, personHref, projectHref, requestHref, EMPTY_RESULTS, type SearchResults } from '$lib/search';

  export let placeholder: string | undefined = undefined;

  let term = '';
  let results: SearchResults = EMPTY_RESULTS;
  let open = false;
  let searching = false;
  let activeIndex = -1;
  let debounce: ReturnType<typeof setTimeout>;

  $: role = $auth.userRole;
  $: hitCount = totalHits(results);

  /** One flat list behind the grouped rendering, so arrow keys can walk the
   *  whole dropdown without caring which group a row belongs to. */
  $: flatHits = [
    ...results.people.map((p) => ({ href: personHref(role, p.id), label: p.full_name })),
    ...results.projects.map((p) => ({ href: projectHref(role, p.id), label: p.project_name })),
    ...results.requests.map((r) => ({ href: requestHref(role, r.id), label: r.title })),
  ];

  function runSearch() {
    clearTimeout(debounce);
    const current = term;
    if (current.trim().length < 2) {
      results = EMPTY_RESULTS;
      searching = false;
      return;
    }
    searching = true;
    debounce = setTimeout(async () => {
      const found = await globalSearch(current, role);
      // A slower earlier request must not overwrite a newer one's results.
      if (current !== term) return;
      results = found;
      searching = false;
      activeIndex = -1;
    }, 220);
  }

  function handleInput() {
    open = true;
    runSearch();
  }

  function close() {
    open = false;
    activeIndex = -1;
  }

  function openHit(href: string) {
    close();
    term = '';
    results = EMPTY_RESULTS;
    goto(href);
  }

  function seeAll() {
    if (term.trim().length < 2) return;
    const q = term;
    close();
    term = '';
    results = EMPTY_RESULTS;
    goto(`/admin/search?q=${encodeURIComponent(q)}`);
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      close();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      activeIndex = Math.min(activeIndex + 1, flatHits.length - 1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      activeIndex = Math.max(activeIndex - 1, -1);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (activeIndex >= 0 && flatHits[activeIndex]) openHit(flatHits[activeIndex].href);
      else if (role === 'admin' || role === 'developer') seeAll();
      else if (flatHits[0]) openHit(flatHits[0].href);
    }
  }

  /** Index of a hit within flatHits, used to mark the arrow-key selection. */
  function indexOfProject(i: number) {
    return results.people.length + i;
  }
  function indexOfRequest(i: number) {
    return results.people.length + results.projects.length + i;
  }
</script>

<div class="search-root">
  <div class="search-wrap" class:focused={open}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
    </svg>
    <input
      type="text"
      placeholder={placeholder ?? t($locale, 'searchPlaceholder')}
      bind:value={term}
      on:input={handleInput}
      on:focus={() => (open = true)}
      on:keydown={handleKeydown}
      dir="auto"
      aria-label={t($locale, 'searchPlaceholder')}
    />
    {#if searching}
      <span class="spinner" aria-hidden="true"></span>
    {/if}
  </div>

  {#if open}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="search-backdrop" on:click={close} role="presentation"></div>
    <div class="panel" transition:fly={{ y: -6, duration: 160 }}>
      {#if term.trim().length < 2}
        <div class="hint">{t($locale, 'searchTypeToStart')}</div>
      {:else if hitCount === 0 && !searching}
        <div class="hint">{t($locale, 'searchNoResults')}</div>
      {:else}
        {#if results.people.length > 0}
          <div class="group-label">{t($locale, 'searchPeopleGroup')}</div>
          {#each results.people as person, i (person.id)}
            <button class="hit" class:active={activeIndex === i} on:click={() => openHit(personHref(role, person.id))}>
              <span class="avatar">{person.full_name.slice(0, 1)}</span>
              <span class="hit-body">
                <b>{person.full_name}</b>
                <small>{roleLabel($locale, person.role)}</small>
              </span>
            </button>
          {/each}
        {/if}

        {#if results.projects.length > 0}
          <div class="group-label">{t($locale, 'searchProjectsGroup')}</div>
          {#each results.projects as project, i (project.id)}
            <button class="hit" class:active={activeIndex === indexOfProject(i)} on:click={() => openHit(projectHref(role, project.id))}>
              <span class="icon-box">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
                </svg>
              </span>
              <span class="hit-body">
                <b>{project.project_name}</b>
                <small>{project.designer_name || '—'} · {statusLabel($locale, project.status)}</small>
              </span>
            </button>
          {/each}
        {/if}

        {#if results.requests.length > 0}
          <div class="group-label">{t($locale, 'customerRequestsNav')}</div>
          {#each results.requests as request, i (request.id)}
            <button class="hit" class:active={activeIndex === indexOfRequest(i)} on:click={() => openHit(requestHref(role, request.id))}>
              <span class="icon-box">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M6 3h8l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
                </svg>
              </span>
              <span class="hit-body">
                <b>{request.title}</b>
                <small>{request.machine_type || '—'} · {requestStatusLabel($locale, request.status)}</small>
              </span>
            </button>
          {/each}
        {/if}

        {#if role === 'admin' || role === 'developer'}
          <button class="see-all" on:click={seeAll}>{t($locale, 'searchAllResults')}</button>
        {/if}
      {/if}
    </div>
  {/if}
</div>

<style>
  .search-root {
    position: relative;
    flex: 1;
    max-width: 380px;
    margin-inline-start: 12px;
  }
  .search-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--paper);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 9px 14px;
    transition: border-color 0.18s ease, box-shadow 0.18s ease;
  }
  .search-wrap.focused {
    border-color: var(--navy-3);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--navy-3) 16%, transparent);
  }
  .search-wrap > svg {
    width: 17px;
    height: 17px;
    color: var(--steel-2);
    flex-shrink: 0;
  }
  .search-wrap input {
    border: none;
    background: transparent;
    outline: none;
    font-family: inherit;
    font-size: 13.5px;
    width: 100%;
    color: var(--ink);
  }
  .spinner {
    width: 13px;
    height: 13px;
    flex-shrink: 0;
    border: 2px solid var(--border);
    border-top-color: var(--navy-3);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .search-backdrop {
    position: fixed;
    inset: 0;
    z-index: 40;
  }
  .panel {
    position: absolute;
    top: calc(100% + 8px);
    inset-inline-start: 0;
    width: min(440px, 92vw);
    max-height: 60vh;
    overflow-y: auto;
    background: var(--card);
    border: 1px solid color-mix(in srgb, var(--navy) 30%, var(--border));
    border-radius: 12px;
    box-shadow: 0 20px 50px rgba(7, 26, 40, 0.24), 0 4px 12px rgba(7, 26, 40, 0.14);
    z-index: 41;
    padding: 6px;
  }
  .hint {
    padding: 22px 14px;
    text-align: center;
    font-size: 12.5px;
    color: var(--ink-soft);
  }
  .group-label {
    padding: 9px 12px 5px;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    color: var(--steel-2);
  }
  .hit {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 9px 12px;
    border: none;
    border-radius: 9px;
    background: transparent;
    color: var(--ink);
    text-align: start;
    cursor: pointer;
    transition: background 0.12s ease, transform 0.12s ease;
  }
  .hit:hover,
  .hit.active {
    background: var(--paper);
    transform: translateX(2px);
  }
  :global(html[dir='rtl']) .hit:hover,
  :global(html[dir='rtl']) .hit.active {
    transform: translateX(-2px);
  }
  .avatar,
  .icon-box {
    width: 30px;
    height: 30px;
    flex-shrink: 0;
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 13px;
  }
  .avatar {
    background: linear-gradient(155deg, var(--navy-3), var(--navy));
    color: #eaf4f8;
  }
  .icon-box {
    background: var(--paper);
    border: 1px solid var(--border);
    color: var(--navy-3);
  }
  .icon-box svg {
    width: 15px;
    height: 15px;
  }
  .hit-body {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
  }
  .hit-body b {
    font-size: 13px;
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .hit-body small {
    font-size: 11px;
    color: var(--ink-soft);
  }
  .see-all {
    width: 100%;
    margin-top: 4px;
    padding: 10px;
    border: none;
    border-top: 1px solid var(--border);
    background: transparent;
    color: var(--navy-3);
    font-family: inherit;
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;
    border-radius: 0 0 8px 8px;
  }
  .see-all:hover {
    background: var(--paper);
  }

  @media (max-width: 820px) {
    .search-root {
      display: none;
    }
  }
</style>
