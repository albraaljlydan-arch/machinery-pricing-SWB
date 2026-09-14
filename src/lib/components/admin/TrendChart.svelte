<script lang="ts">
  import { onMount, tick } from 'svelte';

  export let labels: string[] = [];
  export let current: number[] = [];
  export let previous: number[] = [];
  export let currentLabel: string = '';
  export let previousLabel: string = '';
  export let formatValue: (n: number) => string = (n) => Math.round(n).toLocaleString();
  export let height = 220;

  let wrap: HTMLDivElement;
  let width = 600;
  let curPath: SVGPathElement;
  let prevPath: SVGPathElement;
  let hoverIndex: number | null = null;

  $: max = Math.max(1, ...current, ...previous);
  $: padTop = 14;
  $: padBottom = 22;
  $: plotH = height - padTop - padBottom;
  $: n = Math.max(current.length, previous.length, 1);
  $: stepX = n > 1 ? width / (n - 1) : width;

  function toXY(arr: number[], i: number) {
    const v = arr[i] ?? 0;
    const x = i * stepX;
    const y = padTop + plotH - (v / max) * plotH;
    return [x, y];
  }
  function buildPath(arr: number[]) {
    if (!arr.length) return '';
    return arr.map((_, i) => toXY(arr, i)).map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  }
  $: curD = buildPath(current);
  $: prevD = buildPath(previous);

  async function animateDraw() {
    await tick();
    for (const p of [curPath, prevPath]) {
      if (!p) continue;
      const len = p.getTotalLength();
      p.style.transition = 'none';
      p.style.strokeDasharray = `${len}`;
      p.style.strokeDashoffset = `${len}`;
      // force reflow before enabling the transition
      p.getBoundingClientRect();
      p.style.transition = 'stroke-dashoffset 900ms ease';
      p.style.strokeDashoffset = '0';
    }
  }

  onMount(() => {
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) width = e.contentRect.width;
    });
    ro.observe(wrap);
    animateDraw();
    return () => ro.disconnect();
  });

  $: if (curD || prevD) animateDraw();

  function onMove(e: PointerEvent) {
    const rect = wrap.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const i = Math.round(x / stepX);
    hoverIndex = Math.min(n - 1, Math.max(0, i));
  }
  function onLeave() {
    hoverIndex = null;
  }
</script>

<div class="trend-wrap" bind:this={wrap} style="height:{height}px" role="img" aria-label={currentLabel}>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <svg viewBox="0 0 {width} {height}" preserveAspectRatio="none" on:pointermove={onMove} on:pointerleave={onLeave}>
    <path bind:this={prevPath} d={prevD} class="line prev" vector-effect="non-scaling-stroke" fill="none" />
    <path bind:this={curPath} d={curD} class="line cur" vector-effect="non-scaling-stroke" fill="none" />
    {#if hoverIndex !== null}
      {@const [gx] = toXY(current, hoverIndex)}
      <line x1={gx} x2={gx} y1={padTop} y2={height - padBottom} class="guide" />
      {@const [cx, cy] = toXY(current, hoverIndex)}
      {@const [px, py] = toXY(previous, hoverIndex)}
      <circle cx={cx} cy={cy} r="4" class="dot cur" />
      <circle cx={px} cy={py} r="4" class="dot prev" />
    {/if}
  </svg>
  {#if hoverIndex !== null}
    {@const leftPct = n > 1 ? (hoverIndex / (n - 1)) * 100 : 50}
    <div class="tooltip" style="left:{leftPct}%">
      <div class="tt-date">{labels[hoverIndex] ?? ''}</div>
      <div class="tt-row"><span class="dot-mark cur"></span>{currentLabel} <b class="mono">{formatValue(current[hoverIndex] ?? 0)}</b></div>
      <div class="tt-row"><span class="dot-mark prev"></span>{previousLabel} <b class="mono">{formatValue(previous[hoverIndex] ?? 0)}</b></div>
    </div>
  {/if}
</div>

<style>
  .trend-wrap {
    position: relative;
    width: 100%;
  }
  svg {
    width: 100%;
    height: 100%;
    overflow: visible;
    cursor: crosshair;
  }
  .line {
    stroke-width: 2.4px;
  }
  .line.cur {
    stroke: var(--navy-3);
  }
  .line.prev {
    stroke: var(--steel-2);
    stroke-dasharray: 5 5 !important;
    opacity: 0.7;
  }
  .guide {
    stroke: var(--border);
    stroke-width: 1.2px;
    stroke-dasharray: 3 3;
  }
  .dot {
    stroke: var(--card);
    stroke-width: 2px;
  }
  .dot.cur {
    fill: var(--navy-3);
  }
  .dot.prev {
    fill: var(--steel-2);
  }
  .tooltip {
    position: absolute;
    top: 6px;
    transform: translateX(-50%);
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 10px;
    box-shadow: var(--shadow);
    padding: 8px 12px;
    font-size: 11.5px;
    white-space: nowrap;
    pointer-events: none;
    z-index: 2;
  }
  .tt-date {
    font-weight: 700;
    margin-bottom: 4px;
    color: var(--ink);
  }
  .tt-row {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--ink-soft);
  }
  .tt-row b {
    color: var(--ink);
    margin-inline-start: auto;
  }
  .dot-mark {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .dot-mark.cur {
    background: var(--navy-3);
  }
  .dot-mark.prev {
    background: var(--steel-2);
  }
</style>
