<script lang="ts">
  import { fly, fade } from 'svelte/transition';
  import { createEventDispatcher } from 'svelte';

  interface WidgetDef {
    key: string;
    title: string;
    desc: string;
    tag: string;
    enabled: boolean;
    disabled?: boolean;
  }

  export let open = false;
  export let title = 'Add Widget';
  export let widgets: WidgetDef[] = [];

  const dispatch = createEventDispatcher<{ toggle: string }>();

  function close() {
    open = false;
  }
  function pick(w: WidgetDef) {
    if (w.disabled) return;
    dispatch('toggle', w.key);
  }
</script>

{#if open}
  <div class="backdrop" on:click={close} on:keydown={(e) => e.key === 'Escape' && close()} role="presentation" transition:fade={{ duration: 150 }}></div>
  <aside class="drawer" transition:fly={{ x: 40, duration: 220 }}>
    <div class="drawer-head">
      <h3>{title}</h3>
      <button class="close-btn" on:click={close} aria-label="close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
      </button>
    </div>
    <div class="drawer-body">
      {#each widgets as w (w.key)}
        <button class="widget-card" class:on={w.enabled} class:disabled={w.disabled} on:click={() => pick(w)}>
          <div class="wc-top">
            <h4>{w.title}</h4>
            <span class="tag" class:soon={w.disabled}>{w.tag}</span>
          </div>
          <p>{w.desc}</p>
          <div class="wc-foot">
            {#if w.disabled}
              <span class="state soon">قريبًا</span>
            {:else}
              <span class="state" class:active={w.enabled}>{w.enabled ? '✓ مُفعّل' : '+ إضافة'}</span>
            {/if}
          </div>
        </button>
      {/each}
    </div>
  </aside>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 34, 46, 0.35);
    z-index: 60;
  }
  .drawer {
    position: fixed;
    top: 0;
    inset-inline-end: 0;
    height: 100vh;
    width: min(360px, 100vw);
    background: var(--card);
    border-inline-start: 1px solid var(--border);
    box-shadow: var(--shadow);
    z-index: 61;
    display: flex;
    flex-direction: column;
  }
  .drawer-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 20px;
    border-bottom: 1px solid var(--border);
  }
  .drawer-head h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 900;
  }
  .close-btn {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--paper);
    color: var(--ink-soft);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .close-btn svg {
    width: 15px;
    height: 15px;
  }
  .drawer-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .widget-card {
    text-align: start;
    background: var(--paper);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    transition: transform 0.15s ease, border-color 0.15s ease;
  }
  .widget-card:not(.disabled):hover {
    transform: translateY(-1px);
    border-color: var(--navy-3);
  }
  .widget-card.on {
    border-color: var(--success-deep);
    background: var(--success-bg);
  }
  .widget-card.disabled {
    opacity: 0.6;
    cursor: default;
  }
  .wc-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .wc-top h4 {
    margin: 0;
    font-size: 13.5px;
    font-weight: 800;
  }
  .tag {
    font-size: 10px;
    font-weight: 700;
    background: var(--purple-bg);
    color: var(--purple-ink);
    padding: 2px 8px;
    border-radius: 20px;
    white-space: nowrap;
  }
  .tag.soon {
    background: var(--border);
    color: var(--ink-soft);
  }
  .widget-card p {
    margin: 0;
    font-size: 12px;
    color: var(--ink-soft);
    line-height: 1.6;
  }
  .wc-foot {
    display: flex;
    justify-content: flex-end;
  }
  .state {
    font-size: 11px;
    font-weight: 700;
    color: var(--navy-3);
  }
  .state.active {
    color: var(--success-deep);
  }
  .state.soon {
    color: var(--steel-2);
  }
</style>
