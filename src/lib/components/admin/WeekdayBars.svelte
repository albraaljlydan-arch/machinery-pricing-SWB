<script lang="ts">
  import { onMount } from 'svelte';

  export let labels: string[] = [];
  export let values: number[] = [];

  $: max = Math.max(1, ...values);
  $: peakIndex = values.indexOf(Math.max(...values));

  let grown = false;
  onMount(() => {
    requestAnimationFrame(() => (grown = true));
  });
</script>

<div class="bars">
  {#each values as v, i}
    <div class="col">
      <div class="track">
        <div
          class="fill"
          class:peak={i === peakIndex && v > 0}
          style="height:{grown ? Math.max(4, (v / max) * 100) : 0}%; transition-delay:{i * 60}ms"
        ></div>
      </div>
      <span class="lbl" class:peak={i === peakIndex && v > 0}>{labels[i] ?? ''}</span>
    </div>
  {/each}
</div>

<style>
  .bars {
    display: flex;
    align-items: flex-end;
    gap: 10px;
    height: 130px;
  }
  .col {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    height: 100%;
  }
  .track {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: flex-end;
    border-radius: 6px;
    overflow: hidden;
  }
  .fill {
    width: 100%;
    background: var(--border);
    border-radius: 6px 6px 0 0;
    transition: height 600ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  .fill.peak {
    background: var(--navy-3);
  }
  .lbl {
    font-size: 11px;
    color: var(--steel-2);
    font-weight: 600;
  }
  .lbl.peak {
    color: var(--navy-3);
    font-weight: 800;
  }
</style>
