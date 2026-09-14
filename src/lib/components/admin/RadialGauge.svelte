<script lang="ts">
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';

  export let value: number = 0; // 0-100
  export let label: string = '';
  export let size = 180;
  export let strokeWidth = 16;

  const shown = tweened(0, { duration: 900, easing: cubicOut });
  $: shown.set(Math.max(0, Math.min(100, value)));

  $: r = size / 2 - strokeWidth / 2;
  $: cx = size / 2;
  $: cy = size / 2;
  $: half = Math.PI * r;
  $: startX = cx - r;
  $: endX = cx + r;
  $: pathD = `M ${startX} ${cy} A ${r} ${r} 0 0 1 ${endX} ${cy}`;
  $: dashOffset = half * (1 - $shown / 100);
</script>

<div class="gauge" style="width:{size}px">
  <svg viewBox="0 0 {size} {size / 2 + strokeWidth / 2}">
    <path d={pathD} class="track" stroke-width={strokeWidth} fill="none" />
    <path d={pathD} class="value" stroke-width={strokeWidth} fill="none" stroke-dasharray={half} stroke-dashoffset={dashOffset} />
  </svg>
  <div class="readout">
    <div class="num mono">{Math.round($shown)}%</div>
    {#if label}<div class="lbl">{label}</div>{/if}
  </div>
</div>

<style>
  .gauge {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  svg {
    width: 100%;
    height: auto;
    overflow: visible;
  }
  .track {
    stroke: var(--border);
    stroke-linecap: round;
  }
  .value {
    stroke: var(--success);
    stroke-linecap: round;
    transition: stroke 0.2s ease;
  }
  .readout {
    position: absolute;
    top: 46%;
    text-align: center;
  }
  .num {
    font-size: 26px;
    font-weight: 800;
    color: var(--ink);
  }
  .lbl {
    font-size: 11px;
    color: var(--ink-soft);
    margin-top: 2px;
  }
</style>
