<script lang="ts">
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';

  export let value = 0;
  export let label = '';
  export let detail = '';
  export let tone: 'factory' | 'monthly' = 'factory';

  const shown = tweened(0, { duration: 950, easing: cubicOut });
  $: shown.set(Math.max(0, Math.min(100, value)));
  $: gradientId = `donut-${tone}`;
</script>

<div class="metric">
  <div class="donut" aria-label={label}>
    <svg viewBox="0 0 120 120" role="img">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          {#if tone === 'factory'}
            <stop offset="0%" stop-color="var(--cyan)" />
            <stop offset="52%" stop-color="var(--success)" />
            <stop offset="100%" stop-color="var(--amber)" />
          {:else}
            <stop offset="0%" stop-color="var(--purple)" />
            <stop offset="52%" stop-color="var(--cyan)" />
            <stop offset="100%" stop-color="var(--success)" />
          {/if}
        </linearGradient>
      </defs>
      <circle class="track" cx="60" cy="60" r="45" pathLength="100" />
      <circle
        class="value"
        cx="60"
        cy="60"
        r="45"
        pathLength="100"
        stroke="url(#{gradientId})"
        stroke-dasharray="{$shown} 100"
      />
    </svg>
    <div class="readout">
      <strong class="mono">{Math.round($shown)}%</strong>
      <span>SWB</span>
    </div>
  </div>
  <div class="copy">
    <h4>{label}</h4>
    <p>{detail}</p>
  </div>
</div>

<style>
  .metric {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 18px;
    min-width: 0;
    padding: 8px 0;
  }
  .donut {
    position: relative;
    width: 138px;
    height: 138px;
    flex: 0 0 138px;
  }
  svg {
    display: block;
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }
  circle {
    fill: none;
    stroke-width: 13;
  }
  .track {
    stroke: var(--border);
    opacity: 0.72;
  }
  .value {
    stroke-linecap: round;
  }
  .readout {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    line-height: 1.15;
  }
  .readout strong {
    font-size: 29px;
    font-weight: 850;
    color: var(--ink);
  }
  .readout span {
    margin-top: 5px;
    color: var(--steel-2);
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0;
  }
  .copy {
    min-width: 0;
    max-width: 220px;
  }
  .copy h4 {
    margin: 0 0 6px;
    font-size: 13px;
    line-height: 1.45;
  }
  .copy p {
    margin: 0;
    color: var(--ink-soft);
    font-size: 11px;
    line-height: 1.55;
  }

  @media (max-width: 560px) {
    .metric {
      justify-content: flex-start;
    }
    .donut {
      width: 124px;
      height: 124px;
      flex-basis: 124px;
    }
  }
</style>
