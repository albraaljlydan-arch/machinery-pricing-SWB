<script lang="ts">
  import { onMount } from 'svelte';
  import { formatDate } from '$lib/calc/formatDate';
  import { supabase } from '$lib/supabaseClient';
  import { locale } from '$lib/stores/locale';
  import { t } from '$lib/i18n/dict';
  import StatusBadge from '$lib/components/StatusBadge.svelte';

  interface ProjectRow {
    id: string;
    project_name: string;
    client: string | null;
    total_cost: number;
    status: string;
    created_at: string;
    designer_name?: string;
  }

  let projects: ProjectRow[] = [];
  let loading = true;
  let loadError: string | null = null;

  $: pending = projects.filter((p) => p.status === 'Pending Admin');
  $: inProduction = projects.filter((p) => p.status === 'In Production');
  $: completeProduction = projects.filter((p) => p.status === 'Complete Production');
  $: rejected = projects.filter((p) => p.status === 'Rejected');
  $: completed = projects.filter((p) => p.status === 'Completed');
  $: approvedValueThisMonth = projects
    .filter((p) => {
      const d = new Date(p.created_at);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && p.status !== 'Draft' && p.status !== 'Rejected';
    })
    .reduce((sum, p) => sum + Number(p.total_cost || 0), 0);

  onMount(async () => {
    const { data, error } = await supabase
      .from('projects_with_designer')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      loadError = error.message;
    } else {
      projects = data || [];
    }
    loading = false;
  });

  function fmt(n: number) {
    return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }
</script>

<span class="preview-pill">{t($locale, 'liveDataBadge')}</span>

{#if loadError}
  <div class="error-box">{t($locale, 'loadErrorPrefix')}{loadError}</div>
{/if}

<section class="hero">
  <div>
    <h2>{t($locale, 'heroGreeting')}</h2>
    <p>
      {t($locale, 'heroPendingTemplate').replace('{n}', String(pending.length))}
      {#if rejected.length > 0}{t($locale, 'heroRejectedTemplate').replace('{n}', String(rejected.length))}{/if}.
      {#if completeProduction.length > 0}{t($locale, 'heroCompleteTemplate').replace('{n}', String(completeProduction.length))}.{/if}
    </p>
  </div>
  <div class="hero-stat">
    <div class="num mono">${fmt(approvedValueThisMonth)}</div>
    <div class="lbl">{t($locale, 'heroValueLabel')}</div>
  </div>
</section>

<section>
  <div class="sec-head"><span class="eyebrow">{t($locale, 'sectionIndicators')}</span></div>
  <div class="kpi-grid">
    <div class="plate warn">
      <div class="top-row">
        <div class="icon-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8v5M12 16h.01" /><path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></svg>
        </div>
        <span class="trend flat mono">{t($locale, 'kpiPendingBadge')}</span>
      </div>
      <div class="num mono">{loading ? '—' : pending.length}</div>
      <div class="lbl">{t($locale, 'kpiPendingLabel')}</div>
    </div>
    <div class="plate">
      <div class="top-row">
        <div class="icon-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5.5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
        </div>
      </div>
      <div class="num mono">{loading ? '—' : inProduction.length}</div>
      <div class="lbl">{t($locale, 'kpiInProdLabel')}</div>
    </div>
    <div class="plate">
      <div class="top-row">
        <div class="icon-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18M16 10a4 4 0 0 1-8 0" /></svg>
        </div>
        <span class="trend flat mono">{t($locale, 'kpiCompleteProdBadge')}</span>
      </div>
      <div class="num mono">{loading ? '—' : completeProduction.length}</div>
      <div class="lbl">{t($locale, 'kpiCompleteProdLabel')}</div>
    </div>
    <div class="plate">
      <div class="top-row">
        <div class="icon-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
        </div>
      </div>
      <div class="num mono">{loading ? '—' : completed.length}</div>
      <div class="lbl">{t($locale, 'kpiCompletedLabel')}</div>
    </div>
    <div class="plate warn">
      <div class="top-row">
        <div class="icon-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </div>
        <span class="trend flat mono">{t($locale, 'kpiRejectedBadge')}</span>
      </div>
      <div class="num mono">{loading ? '—' : rejected.length}</div>
      <div class="lbl">{t($locale, 'kpiRejectedLabel')}</div>
    </div>
    <div class="plate">
      <div class="top-row">
        <div class="icon-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" /></svg>
        </div>
      </div>
      <div class="num mono">{loading ? '—' : projects.length}</div>
      <div class="lbl">{t($locale, 'kpiAllProjectsLabel')}</div>
    </div>
  </div>
</section>

<section class="two-col">
  <div class="panel">
    <div class="panel-head">
      <h3>{t($locale, 'panelPendingTitle')}</h3>
      <span class="count-tag mono">{pending.length} {t($locale, 'projectsCountSuffix')}</span>
    </div>
    {#if loading}
      <div class="empty-state">{t($locale, 'loading')}</div>
    {:else if pending.length === 0}
      <div class="empty-state">{t($locale, 'pendingEmpty')}</div>
    {:else}
      <table>
        <thead>
          <tr><th>{t($locale, 'colClient')}</th><th>{t($locale, 'colProject')}</th><th>{t($locale, 'colEstCost')}</th><th>{t($locale, 'colDesignerName')}</th><th>{t($locale, 'colStatus')}</th><th></th></tr>
        </thead>
        <tbody>
          {#each pending as proj}
            <tr>
              <td class="who-cell"><b>{proj.client || 'SWB Technology'}</b></td>
              <td>{proj.project_name}</td>
              <td class="price mono">${fmt(Number(proj.total_cost))}</td>
              <td>{proj.designer_name || '—'}</td>
              <td><StatusBadge status={proj.status} userRole="admin" locale={$locale} /></td>
              <td><a class="review-link" href="/admin/projects/{proj.id}">{t($locale, 'reviewAction')}</a></td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>

  <div class="panel">
    <div class="panel-head">
      <h3>{t($locale, 'panelRecentTitle')}</h3>
      <span class="count-tag mono">{t($locale, 'panelRecentTag')}</span>
    </div>
    <ul class="log-list">
      {#each projects.slice(0, 5) as proj}
        <li class="log-item">
          <span class="log-dot" class:success={proj.status === 'Completed'} class:danger={proj.status === 'Rejected'} class:amber={proj.status === 'Pending Admin'}></span>
          <div class="log-body">
            <p>{proj.project_name} — <StatusBadge status={proj.status} userRole="admin" locale={$locale} /></p>
            <time>{formatDate(proj.created_at)}</time>
          </div>
        </li>
      {/each}
      {#if !loading && projects.length === 0}
        <li class="log-item"><div class="log-body"><p>{t($locale, 'noProjectsAtAll')}</p></div></li>
      {/if}
    </ul>
  </div>
</section>

<section>
  <div class="sec-head"><span class="eyebrow">{t($locale, 'sectionSystemMgmt')}</span></div>
  <div class="mgmt-grid">
    <a class="mgmt-card" href="/admin/projects">
      <div class="icon-wrap"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" /></svg></div>
      <h4>{t($locale, 'allProjects')}</h4>
      <p>{t($locale, 'mgmtAllProjectsDesc')}</p>
      <div class="foot"><span>{loading ? '—' : projects.length} {t($locale, 'projectsCountSuffix')}</span><span>{t($locale, 'openArrow')}</span></div>
    </a>
    <a class="mgmt-card new" href="/admin/factory-progress">
      <span class="new-tag">{t($locale, 'comingSoonTag')}</span>
      <div class="icon-wrap"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg></div>
      <h4>{t($locale, 'factoryProgress')}</h4>
      <p>{t($locale, 'mgmtFactoryProgressDesc')}</p>
      <div class="foot"><span>{t($locale, 'dailyProgressReport')}</span><span>{t($locale, 'openArrow')}</span></div>
    </a>
    <a class="mgmt-card" href="/admin/users">
      <div class="icon-wrap"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2" /><path d="M2.5 20c.8-3.6 3.4-5.6 6.5-5.6s5.7 2 6.5 5.6" /><circle cx="17.5" cy="8.5" r="2.4" /><path d="M16.3 14.6c2.4.3 4.1 2 4.7 4.6" /></svg></div>
      <h4>{t($locale, 'usersAndRoles')}</h4>
      <p>{t($locale, 'mgmtUsersDesc')}</p>
      <div class="foot"><span>{t($locale, 'openArrow')}</span></div>
    </a>
    <a class="mgmt-card" href="/admin/material-prices">
      <div class="icon-wrap"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.6 12.9 12.9 20.6a2 2 0 0 1-2.8 0l-6.7-6.7a2 2 0 0 1 0-2.8L11.1 3.4a2 2 0 0 1 1.4-.6H18a2 2 0 0 1 2 2v5.6a2 2 0 0 1-.6 1.5Z" /><circle cx="15.5" cy="8.5" r="1.4" /></svg></div>
      <h4>{t($locale, 'materialPrices')}</h4>
      <p>{t($locale, 'mgmtMaterialPricesDesc')}</p>
      <div class="foot"><span>{t($locale, 'openArrow')}</span></div>
    </a>
    <a class="mgmt-card" href="/admin/projects?status=Complete Production">
      <div class="icon-wrap"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18M16 10a4 4 0 0 1-8 0" /></svg></div>
      <h4>{t($locale, 'procurement')}</h4>
      <p>{t($locale, 'mgmtProcurementDesc')}</p>
      <div class="foot"><span>{loading ? '—' : completeProduction.length} {t($locale, 'awaitingCount')}</span><span>{t($locale, 'openArrow')}</span></div>
    </a>
    <a class="mgmt-card" href="/admin/reports">
      <div class="icon-wrap"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M11 20V4M18 20v-7" /></svg></div>
      <h4>{t($locale, 'reportsExport')}</h4>
      <p>{t($locale, 'mgmtReportsDesc')}</p>
      <div class="foot"><span>{t($locale, 'openArrow')}</span></div>
    </a>
  </div>
</section>

<style>
  .preview-pill {
    font-family: var(--font-mono);
    font-size: 10.5px;
    font-weight: 700;
    background: var(--success-bg);
    color: var(--success-deep);
    padding: 3px 9px;
    border-radius: 20px;
    border: 1px solid #bfe2cc;
  }
  .error-box {
    background: var(--danger-bg);
    color: var(--danger-deep);
    border: 1px solid #f3c6bb;
    border-radius: 10px;
    padding: 12px 16px;
    font-size: 13px;
  }
  .sec-head {
    margin-bottom: 12px;
  }
  .sec-head .eyebrow {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--steel-2);
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  .hero {
    background: var(--navy);
    background-image: linear-gradient(var(--cyan-line) 1px, transparent 1px), linear-gradient(90deg, var(--cyan-line) 1px, transparent 1px);
    background-size: 26px 26px;
    border-radius: 18px;
    padding: 26px 30px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    color: #eaf4f8;
    position: relative;
    overflow: hidden;
    border: 1px solid #0a2033;
  }
  .hero::after {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(560px 220px at 82% 0%, rgba(242, 169, 59, 0.16), transparent 65%);
    pointer-events: none;
  }
  .hero h2 {
    font-size: 22px;
    margin: 0 0 6px;
    font-weight: 900;
  }
  .hero p {
    margin: 0;
    color: #afcbda;
    font-size: 13.5px;
    max-width: 540px;
    line-height: 1.7;
  }
  .hero-stat {
    text-align: center;
    padding-inline-start: 26px;
    border-inline-start: 1px dashed rgba(255, 255, 255, 0.22);
    flex-shrink: 0;
  }
  .hero-stat .num {
    font-family: var(--font-mono);
    font-size: 30px;
    font-weight: 700;
    color: var(--cyan);
  }
  .hero-stat .lbl {
    font-size: 11.5px;
    color: #9fc2d2;
    margin-top: 2px;
  }

  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 14px;
  }
  .plate {
    background: radial-gradient(circle 3px at 12px 12px, #c4cdc7 92%, transparent 93%), radial-gradient(circle 3px at calc(100% - 12px) 12px, #c4cdc7 92%, transparent 93%),
      radial-gradient(circle 3px at 12px calc(100% - 12px), #c4cdc7 92%, transparent 93%), radial-gradient(circle 3px at calc(100% - 12px) calc(100% - 12px), #c4cdc7 92%, transparent 93%),
      linear-gradient(var(--card), var(--card));
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 18px 18px 16px;
    box-shadow: var(--shadow);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .plate.warn {
    background: radial-gradient(circle 3px at 12px 12px, #e8ce9e 92%, transparent 93%), radial-gradient(circle 3px at calc(100% - 12px) 12px, #e8ce9e 92%, transparent 93%),
      radial-gradient(circle 3px at 12px calc(100% - 12px), #e8ce9e 92%, transparent 93%), radial-gradient(circle 3px at calc(100% - 12px) calc(100% - 12px), #e8ce9e 92%, transparent 93%),
      linear-gradient(var(--amber-bg), var(--amber-bg));
    border-color: #f0d6a0;
  }
  .plate .top-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .plate .icon-wrap {
    width: 30px;
    height: 30px;
    border-radius: 8px;
    background: var(--paper);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--navy-3);
  }
  .plate.warn .icon-wrap {
    background: #fff6e6;
    color: var(--amber-ink);
  }
  .plate .icon-wrap svg {
    width: 16px;
    height: 16px;
  }
  .plate .num {
    font-family: var(--font-mono);
    font-size: 25px;
    font-weight: 700;
    letter-spacing: -0.5px;
  }
  .plate .lbl {
    font-size: 11.5px;
    color: var(--ink-soft);
    font-weight: 500;
  }
  .plate .trend {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 700;
  }
  .trend.flat {
    color: var(--steel-2);
  }

  .two-col {
    display: grid;
    grid-template-columns: 1.7fr 1fr;
    gap: 20px;
    align-items: start;
  }
  .panel {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    overflow: hidden;
  }
  .panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 18px;
    border-bottom: 1px solid var(--border);
  }
  .panel-head h3 {
    margin: 0;
    font-size: 14.5px;
    font-weight: 900;
  }
  .count-tag {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 700;
    background: var(--paper);
    padding: 2px 9px;
    border-radius: 20px;
    color: var(--ink-soft);
    border: 1px solid var(--border);
  }
  .empty-state {
    padding: 30px 18px;
    text-align: center;
    color: var(--ink-soft);
    font-size: 13px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  thead th {
    text-align: right;
    font-size: 10.5px;
    color: var(--steel-2);
    font-family: var(--font-mono);
    letter-spacing: 0.4px;
    text-transform: uppercase;
    padding: 10px 18px;
    background: var(--paper);
    border-bottom: 1px solid var(--border);
    font-weight: 600;
  }
  tbody td {
    padding: 13px 18px;
    border-bottom: 1px solid var(--border);
    vertical-align: middle;
  }
  tbody tr:last-child td {
    border-bottom: none;
  }
  td.price {
    font-family: var(--font-mono);
    font-weight: 700;
  }
  .review-link {
    background: var(--navy-3);
    color: #fff;
    padding: 5px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 700;
    white-space: nowrap;
  }
  .who-cell b {
    display: block;
    font-size: 13px;
    font-weight: 700;
  }

  .log-list {
    list-style: none;
    margin: 0;
    padding: 8px 6px;
    display: flex;
    flex-direction: column;
  }
  .log-item {
    display: flex;
    gap: 11px;
    padding: 11px 12px;
    border-radius: 10px;
  }
  .log-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--navy-3);
    margin-top: 6px;
    flex-shrink: 0;
  }
  .log-dot.amber {
    background: var(--amber);
  }
  .log-dot.danger {
    background: var(--danger);
  }
  .log-dot.success {
    background: var(--success);
  }
  .log-body p {
    margin: 0 0 3px;
    font-size: 12.5px;
    line-height: 1.5;
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  .log-body time {
    font-size: 11px;
    color: var(--steel-2);
    font-family: var(--font-mono);
  }

  .mgmt-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }
  .mgmt-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 18px;
    box-shadow: var(--shadow);
    display: flex;
    flex-direction: column;
    gap: 10px;
    position: relative;
    color: var(--ink);
  }
  .mgmt-card.new {
    border-color: var(--purple);
  }
  .mgmt-card .new-tag {
    position: absolute;
    top: 14px;
    left: 18px;
    background: var(--purple-bg);
    color: var(--purple-ink);
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 20px;
  }
  .mgmt-card .icon-wrap {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    background: var(--navy);
    color: var(--amber);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .mgmt-card.new .icon-wrap {
    background: var(--purple);
    color: #fff;
  }
  .mgmt-card .icon-wrap svg {
    width: 19px;
    height: 19px;
  }
  .mgmt-card h4 {
    margin: 0;
    font-size: 14.5px;
    font-weight: 900;
  }
  .mgmt-card p {
    margin: 0;
    font-size: 12.5px;
    color: var(--ink-soft);
    line-height: 1.6;
    flex: 1;
  }
  .mgmt-card .foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-family: var(--font-mono);
    font-size: 11.5px;
    font-weight: 700;
    color: var(--navy-3);
    padding-top: 8px;
    border-top: 1px dashed var(--border);
  }

  @media (max-width: 1180px) {
    .kpi-grid {
      grid-template-columns: repeat(3, 1fr);
    }
    .two-col {
      grid-template-columns: 1fr;
    }
    .mgmt-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 640px) {
    .hero {
      flex-direction: column;
      align-items: stretch;
      padding: 20px;
    }
    .hero-stat {
      border-inline-start: none;
      border-top: 1px dashed rgba(255, 255, 255, 0.22);
      padding-inline-start: 0;
      padding-top: 14px;
      text-align: start;
    }
    .kpi-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    .mgmt-grid {
      grid-template-columns: 1fr;
    }
    table {
      font-size: 12px;
    }
    .panel-head,
    .sec-head {
      flex-wrap: wrap;
    }
  }
</style>
