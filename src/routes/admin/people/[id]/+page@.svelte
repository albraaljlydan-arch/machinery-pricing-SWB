<script lang="ts">
  // ==========================================================================
  //  ADMIN — ONE PERSON, EVERYTHING
  //
  //  Reached from the topbar search. Answers "how is this designer actually
  //  doing?" from the project_events audit trail rather than from current
  //  status alone: how many projects they created, how often work came back
  //  rejected, and how long they take between starting a project and handing
  //  it over.
  // ==========================================================================
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { fly, fade } from 'svelte/transition';
  import { supabase } from '$lib/supabaseClient';
  import { locale } from '$lib/stores/locale';
  import { t, roleLabel, statusLabel, eventLabel } from '$lib/i18n/dict';
  import { toast } from '$lib/stores/toast';
  import { formatDate } from '$lib/calc/formatDate';
  import { formatNum } from '$lib/utils';
  import { summarizeDesignerPerformance, type DesignerPerformance } from '$lib/calc/projectEvents';
  import type { ProjectEvent, UserRole } from '$lib/types';

  $: personId = $page.params.id;

  interface ProjectRow {
    id: string;
    project_name: string;
    client: string | null;
    status: string;
    total_cost: number;
    created_at: string;
  }

  let loading = true;
  let person: { id: string; full_name: string; role: UserRole; phone: string | null; company_name: string | null } | null = null;
  let projects: ProjectRow[] = [];
  let events: ProjectEvent[] = [];
  let projectNames: Record<string, string> = {};
  let stats: DesignerPerformance | null = null;

  async function load() {
    loading = true;
    const { data: profile, error } = await supabase.from('profiles').select('id, full_name, role, phone, company_name').eq('id', personId).single();
    if (error || !profile) {
      toast.notify(t($locale, 'couldNotLoadProject'), 'error');
      goto('/admin/users');
      return;
    }
    person = profile as typeof person;

    const [{ data: ownProjects }, { data: ownEvents }] = await Promise.all([
      supabase.from('projects').select('id, project_name, client, status, total_cost, created_at').eq('user_id', personId).order('created_at', { ascending: false }),
      supabase.from('project_events').select('*').eq('actor_id', personId).order('created_at', { ascending: false }),
    ]);
    projects = (ownProjects as ProjectRow[]) ?? [];
    events = (ownEvents as ProjectEvent[]) ?? [];

    // The performance figures need each project's 'created' event even when
    // somebody else logged it, so they're derived from the project's own
    // events, not only from rows this person happens to be the actor on.
    const projectIds = [...new Set([...projects.map((p) => p.id), ...events.map((e) => e.project_id)])];
    if (projectIds.length > 0) {
      const [{ data: allEvents }, { data: named }] = await Promise.all([
        supabase.from('project_events').select('*').in('project_id', projectIds),
        supabase.from('projects').select('id, project_name').in('id', projectIds),
      ]);
      stats = summarizeDesignerPerformance((allEvents as ProjectEvent[]) ?? []);
      projectNames = Object.fromEntries(((named as { id: string; project_name: string }[]) ?? []).map((p) => [p.id, p.project_name]));
    } else {
      stats = summarizeDesignerPerformance([]);
    }
    loading = false;
  }
  onMount(load);

  $: isDesigner = person?.role === 'designer';
  $: initials = (person?.full_name ?? '?').trim().slice(0, 2);
</script>

<div class="page">
  {#if loading}
    <p class="muted">{t($locale, 'loading')}</p>
  {:else if person}
    <div class="topbar" in:fly={{ y: -8, duration: 240 }}>
      <a class="btn-back" href="/admin/users">{t($locale, 'usersAndRoles')}</a>
      <div class="identity">
        <div class="avatar">{initials}</div>
        <div>
          <h2>{person.full_name}</h2>
          <span class="role-chip">{roleLabel($locale, person.role)}</span>
          {#if person.phone}<span class="meta mono" dir="ltr">{person.phone}</span>{/if}
          {#if person.company_name}<span class="meta">{person.company_name}</span>{/if}
        </div>
      </div>
    </div>

    {#if isDesigner && stats}
      <div class="stat-grid">
        {#each [{ label: t($locale, 'personProjectsCreated'), value: String(stats.created), tone: 'navy' }, { label: t($locale, 'personProjectsSubmitted'), value: String(stats.submitted), tone: 'navy' }, { label: t($locale, 'personProjectsApproved'), value: String(stats.approved), tone: 'success' }, { label: t($locale, 'personProjectsRejected'), value: String(stats.rejected), tone: 'danger' }, { label: t($locale, 'personAvgDelivery'), value: stats.avgDaysToDeliver === null ? '—' : `${formatNum(stats.avgDaysToDeliver, 1)} ${t($locale, 'personDaysUnit')}`, tone: 'amber' }, { label: t($locale, 'personRejectionRate'), value: `${stats.rejectionRate}%`, tone: stats.rejectionRate > 30 ? 'danger' : 'success' }] as card, i}
          <article class="stat tone-{card.tone}" in:fly={{ y: 14, duration: 320, delay: 60 + i * 55 }}>
            <span class="stat-label">{card.label}</span>
            <strong class="mono">{card.value}</strong>
          </article>
        {/each}
      </div>
    {/if}

    <section class="panel" in:fade={{ duration: 300, delay: 220 }}>
      <div class="panel-head">
        <h3>{t($locale, 'personRecentProjects')}</h3>
        <span class="count-tag mono">{projects.length}</span>
      </div>
      {#if projects.length === 0}
        <div class="empty">{t($locale, 'personNoProjects')}</div>
      {:else}
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t($locale, 'colProject')}</th>
                <th>{t($locale, 'colClient')}</th>
                <th>{t($locale, 'colCost')}</th>
                <th>{t($locale, 'colStatus')}</th>
                <th>{t($locale, 'colCreated')}</th>
              </tr>
            </thead>
            <tbody>
              {#each projects as project (project.id)}
                <tr class="clickable-row" on:click={() => goto(`/admin/machines/${project.id}`)}>
                  <td class="name">{project.project_name}</td>
                  <td>{project.client || '—'}</td>
                  <td class="mono">${formatNum(project.total_cost, 2)}</td>
                  <td>{statusLabel($locale, project.status)}</td>
                  <td class="muted mono">{formatDate(project.created_at)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </section>

    <section class="panel" in:fade={{ duration: 300, delay: 300 }}>
      <div class="panel-head">
        <h3>{t($locale, 'personActivityLog')}</h3>
        <span class="count-tag mono">{events.length}</span>
      </div>
      {#if events.length === 0}
        <div class="empty">{t($locale, 'personNoActivity')}</div>
      {:else}
        <ol class="timeline">
          {#each events.slice(0, 40) as event, i (event.id)}
            <li in:fly={{ x: 10, duration: 260, delay: Math.min(i, 12) * 30 }}>
              <span class="dot dot-{event.event_type}"></span>
              <div class="tl-body">
                <b>{eventLabel($locale, event.event_type)}</b>
                <small>
                  {projectNames[event.project_id] ?? '—'}
                  {#if event.event_type === 'rejected' && event.note}
                    · {t($locale, 'eventFlaggedRowsTemplate').replace('{n}', event.note)}
                  {:else if event.note}
                    · <span class="mono">{event.note}</span>
                  {/if}
                </small>
              </div>
              <time class="mono">{formatDate(event.created_at)}</time>
            </li>
          {/each}
        </ol>
      {/if}
    </section>
  {/if}
</div>

<style>
  .page {
    max-width: 1100px;
    margin: 0 auto;
    padding: 24px;
    font-family: var(--font-body);
    background: var(--paper);
    color: var(--ink);
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .muted {
    color: var(--ink-soft);
  }
  .topbar {
    display: flex;
    align-items: center;
    gap: 18px;
    background: var(--card);
    padding: 18px 24px;
    border-radius: 14px;
    border: 1px solid var(--border);
    flex-wrap: wrap;
  }
  .btn-back {
    background: var(--steel);
    color: #fff;
    padding: 8px 16px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 13px;
  }
  .identity {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .avatar {
    width: 52px;
    height: 52px;
    border-radius: 16px;
    background: linear-gradient(155deg, var(--navy-3), var(--navy));
    color: #eaf4f8;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 19px;
    font-weight: 800;
    flex-shrink: 0;
  }
  .identity h2 {
    margin: 0 0 4px;
    font-size: 19px;
  }
  .role-chip {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 20px;
    background: var(--paper);
    border: 1px solid var(--border);
    color: var(--navy-3);
    font-size: 11px;
    font-weight: 800;
  }
  .meta {
    margin-inline-start: 10px;
    font-size: 12px;
    color: var(--ink-soft);
  }

  .stat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
    gap: 12px;
  }
  .stat {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 16px 18px;
    border: 1px solid var(--border);
    border-inline-start: 4px solid var(--navy-3);
    border-radius: 14px;
    background: var(--card);
    box-shadow: var(--shadow);
    transition: transform 0.18s ease, box-shadow 0.18s ease;
  }
  .stat:hover {
    transform: translateY(-3px);
    box-shadow: 0 14px 30px rgba(7, 26, 40, 0.14);
  }
  .stat.tone-success {
    border-inline-start-color: var(--success);
  }
  .stat.tone-danger {
    border-inline-start-color: var(--danger);
  }
  .stat.tone-amber {
    border-inline-start-color: var(--amber);
  }
  .stat-label {
    font-size: 11.5px;
    font-weight: 700;
    color: var(--ink-soft);
  }
  .stat strong {
    font-size: 26px;
    font-weight: 800;
  }

  .panel {
    padding: 18px 20px;
    border: 1px solid var(--border);
    border-radius: 14px;
    background: var(--card);
    box-shadow: var(--shadow);
    min-width: 0;
  }
  .panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 14px;
  }
  .panel-head h3 {
    margin: 0;
    font-size: 15px;
  }
  .count-tag {
    padding: 3px 9px;
    border: 1px solid var(--border);
    border-radius: 20px;
    background: var(--paper);
    color: var(--ink-soft);
    font-size: 11px;
  }
  .empty {
    padding: 30px;
    text-align: center;
    color: var(--ink-soft);
    font-size: 13px;
  }
  .table-wrap {
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  th {
    text-align: center;
    font-size: 10.5px;
    color: var(--steel-2);
    text-transform: uppercase;
    padding: 9px 12px;
    background: var(--paper);
    border-bottom: 1px solid var(--border);
    font-weight: 700;
  }
  td {
    text-align: center;
    padding: 11px 12px;
    border-bottom: 1px solid var(--border);
  }
  tr:last-child td {
    border-bottom: none;
  }
  .name {
    font-weight: 700;
  }
  .clickable-row {
    cursor: pointer;
    transition: background 0.14s ease;
  }
  .clickable-row:hover td {
    background: var(--card-hover);
  }

  .timeline {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
  }
  .timeline li {
    display: grid;
    grid-template-columns: 14px 1fr auto;
    align-items: center;
    gap: 12px;
    padding: 11px 4px;
    border-bottom: 1px solid var(--border);
  }
  .timeline li:last-child {
    border-bottom: none;
  }
  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--steel-2);
  }
  .dot-created {
    background: var(--steel-2);
  }
  .dot-submitted {
    background: var(--navy-3);
  }
  .dot-approved {
    background: var(--success);
  }
  .dot-rejected {
    background: var(--danger);
  }
  .dot-production_finished {
    background: var(--amber);
  }
  .dot-completed {
    background: var(--purple, #9a7bea);
  }
  .tl-body {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .tl-body b {
    font-size: 13px;
  }
  .tl-body small {
    font-size: 11.5px;
    color: var(--ink-soft);
  }
  .timeline time {
    font-size: 11.5px;
    color: var(--ink-soft);
  }

  @media (max-width: 640px) {
    .stat-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
