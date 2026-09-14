<script lang="ts">
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';

  export let icon: 'clock' | 'gear' | 'check' | 'x' | 'grid' = 'grid';
  export let label: string;
  export let value: number;
  export let deltaPct: number | null = null;
  export let deltaLabel: string = '';
  export let prefix: string = '';
  export let loading: boolean = false;

  const shown = tweened(0, { duration: 700, easing: cubicOut });
  $: if (!loading) shown.set(value);

  $: deltaSign = deltaPct === null ? 'flat' : deltaPct > 0 ? 'up' : deltaPct < 0 ? 'down' : 'flat';
</script>

<div class="stat-card">
  <div class="top-row">
    <div class="icon-wrap">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        {#if icon === 'clock'}
          <path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M6 3h8l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
        {:else if icon === 'gear'}
          <path d="M12 2v20M17 5.5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        {:else if icon === 'check'}
          <path d="M20 6 9 17l-5-5" />
        {:else if icon === 'x'}
          <path d="M18 6 6 18M6 6l12 12" />
        {:else}
          <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
        {/if}
      </svg>
    </div>
    {#if deltaPct !== null}
      <span class="delta" class:up={deltaSign === 'up'} class:down={deltaSign === 'down'} class:flat={deltaSign === 'flat'}>
        {#if deltaSign === 'up'}▲{:else if deltaSign === 'down'}▼{/if}
        <span class="mono">{Math.abs(deltaPct).toFixed(0)}%</span>
      </span>
    {/if}
  </div>
  <div class="value mono">{loading ? '—' : `${prefix}${Math.round($shown).toLocaleString()}`}</div>
  <div class="label">{label}</div>
  {#if deltaLabel}
    <div class="sub">{deltaLabel}</div>
  {/if}
</div>

<style>
  .stat-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    transition: transform 0.18s ease, box-shadow 0.18s ease;
  }
  .stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 10px rgba(15, 34, 46, 0.06), 0 14px 28px -12px rgba(15, 34, 46, 0.18);
  }
  .top-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .icon-wrap {
    width: 34px;
    height: 34px;
    border-radius: 9px;
    background: var(--paper);
    color: var(--navy-3);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .icon-wrap svg {
    width: 17px;
    height: 17px;
  }
  .delta {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 11.5px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 20px;
  }
  .delta.up {
    background: var(--success-bg);
    color: var(--success-deep);
  }
  .delta.down {
    background: var(--danger-bg);
    color: var(--danger-deep);
  }
  .delta.flat {
    background: var(--paper);
    color: var(--steel-2);
  }
  .value {
    font-size: 26px;
    font-weight: 800;
    letter-spacing: -0.5px;
    font-variant-numeric: tabular-nums;
  }
  .label {
    font-size: 12.5px;
    color: var(--ink-soft);
    font-weight: 500;
  }
  .sub {
    font-size: 10.5px;
    color: var(--steel-2);
  }
</style>
