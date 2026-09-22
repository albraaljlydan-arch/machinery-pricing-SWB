<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { auth } from '$lib/stores/auth';
  import { locale } from '$lib/stores/locale';
  import { t, roleLabel, statusLabel, requestStatusLabel } from '$lib/i18n/dict';
  import { globalSearch, totalHits, personHref, projectHref, requestHref, EMPTY_RESULTS, type SearchResults } from '$lib/search';

  $: q = $page.url.searchParams.get('q') ?? '';
  $: role = $auth.userRole;

  let results: SearchResults = EMPTY_RESULTS;
  let loading = false;
  let lastQuery = '';

  // Re-runs whenever the URL's ?q= changes (a fresh search from the topbar
  // box, or the user editing the address bar directly) — not on every
  // keystroke, since there's no input on this page itself.
  $: if (q !== lastQuery) {
    lastQuery = q;
    if (q.trim().length >= 2) {
      loading = true;
      globalSearch(q, role, 40).then((r) => {
        results = r;
        loading = false;
      });
    } else {
      results = EMPTY_RESULTS;
    }
  }

  $: hitCount = totalHits(results);
</script>

<section class="panel">
  <div class="panel-head">
    <h2>{t($locale, 'searchResultsForTemplate').replace('{q}', q)}</h2>
    {#if !loading}<span class="count-tag">{t($locale, 'searchHitsCountTemplate').replace('{n}', String(hitCount))}</span>{/if}
  </div>

  {#if loading}
    <div class="empty">{t($locale, 'loading')}</div>
  {:else if hitCount === 0}
    <div class="empty">{t($locale, 'searchNoResults')}</div>
  {:else}
    {#if results.people.length > 0}
      <div class="group">
        <h3>{t($locale, 'searchPeopleGroup')}</h3>
        <div class="grid">
          {#each results.people as person (person.id)}
            <button class="card" on:click={() => goto(personHref(role, person.id))}>
              <span class="avatar">{person.full_name.slice(0, 1)}</span>
              <span class="card-body">
                <b>{person.full_name}</b>
                <small>{roleLabel($locale, person.role)}</small>
              </span>
            </button>
          {/each}
        </div>
      </div>
    {/if}

    {#if results.projects.length > 0}
      <div class="group">
        <h3>{t($locale, 'searchProjectsGroup')}</h3>
        <div class="grid">
          {#each results.projects as project (project.id)}
            <button class="card" on:click={() => goto(projectHref(role, project.id))}>
              <span class="icon-box">⚙</span>
              <span class="card-body">
                <b>{project.project_name}</b>
                <small>{project.designer_name || '—'} · {statusLabel($locale, project.status)}</small>
              </span>
            </button>
          {/each}
        </div>
      </div>
    {/if}

    {#if results.requests.length > 0}
      <div class="group">
        <h3>{t($locale, 'customerRequestsNav')}</h3>
        <div class="grid">
          {#each results.requests as request (request.id)}
            <button class="card" on:click={() => goto(requestHref(role, request.id))}>
              <span class="icon-box">◷</span>
              <span class="card-body">
                <b>{request.title}</b>
                <small>{request.machine_type || '—'} · {requestStatusLabel($locale, request.status)}</small>
              </span>
            </button>
          {/each}
        </div>
      </div>
    {/if}
  {/if}
</section>

<style>
  .panel {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: 20px 22px;
  }
  .panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
  }
  .panel-head h2 {
    margin: 0;
    font-size: 16px;
  }
  .count-tag {
    padding: 3px 10px;
    border: 1px solid var(--border);
    border-radius: 20px;
    background: var(--paper);
    color: var(--ink-soft);
    font-size: 11px;
    font-weight: 700;
    flex-shrink: 0;
  }
  .empty {
    padding: 40px;
    text-align: center;
    color: var(--ink-soft);
    font-size: 13px;
  }
  .group + .group {
    margin-top: 22px;
  }
  .group h3 {
    margin: 0 0 10px;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    color: var(--steel-2);
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 10px;
  }
  .card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--paper);
    text-align: start;
    cursor: pointer;
    transition: transform 0.14s ease, box-shadow 0.14s ease;
  }
  .card:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 22px rgba(7, 26, 40, 0.1);
  }
  .avatar,
  .icon-box {
    width: 34px;
    height: 34px;
    flex-shrink: 0;
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 15px;
  }
  .avatar {
    background: linear-gradient(155deg, var(--navy-3), var(--navy));
    color: #eaf4f8;
  }
  .icon-box {
    background: var(--card);
    border: 1px solid var(--border);
    color: var(--navy-3);
  }
  .card-body {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
  }
  .card-body b {
    font-size: 13px;
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .card-body small {
    font-size: 11px;
    color: var(--ink-soft);
  }
</style>
