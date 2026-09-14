<script lang="ts">
  import { onDestroy } from 'svelte';
  import type { SearchableSelectOption } from './searchableSelectTypes';
  export type { SearchableSelectOption };

  export let displayValue: string;
  export let value: string | undefined = undefined;
  export let options: SearchableSelectOption[];
  export let placeholder = 'Select…';
  export let searchPlaceholder = 'Search…';
  export let emptyMessage = 'No matches found';
  export let disabled = false;
  // When true, a "+ Add New Item" row is offered whenever the person has
  // typed a search query — so items missing from the catalog can be added
  // on the spot instead of dead-ending on "no matches".
  export let allowAddNew = false;

  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher<{ change: string; addNew: string }>();

  let open = false;
  let query = '';
  let wrapperEl: HTMLDivElement;
  let searchInputEl: HTMLInputElement;

  function handleDocClick(e: MouseEvent) {
    if (open && wrapperEl && !wrapperEl.contains(e.target as Node)) {
      open = false;
      query = '';
    }
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('mousedown', handleDocClick);
  }
  onDestroy(() => {
    if (typeof document !== 'undefined') document.removeEventListener('mousedown', handleDocClick);
  });

  // Ranked search: exact label match, then label-starts-with, then any word
  // in the label starting with the query, then label-contains, then a
  // keywords-field match (only reached when nothing in the label itself
  // matched) — same priority order as the original.
  function rankedFilter(opts: SearchableSelectOption[], q: string): SearchableSelectOption[] {
    const query = q.trim().toLowerCase();
    if (!query) return opts;
    const labelExact: SearchableSelectOption[] = [];
    const labelStarts: SearchableSelectOption[] = [];
    const labelWords: SearchableSelectOption[] = [];
    const labelContains: SearchableSelectOption[] = [];
    const keywordsMatch: SearchableSelectOption[] = [];

    for (const opt of opts) {
      const label = opt.label.toLowerCase();
      const keywords = (opt.keywords || '').toLowerCase();
      if (label === query) labelExact.push(opt);
      else if (label.startsWith(query)) labelStarts.push(opt);
      else if (label.split(' ').some((w) => w.startsWith(query))) labelWords.push(opt);
      else if (label.includes(query)) labelContains.push(opt);
      else if (keywords && (keywords.startsWith(query) || keywords.split(' ').some((w) => w.startsWith(query)) || keywords.includes(query))) {
        keywordsMatch.push(opt);
      }
    }
    return [...labelExact, ...labelStarts, ...labelWords, ...labelContains, ...keywordsMatch];
  }

  $: filtered = rankedFilter(options, query);
  $: trimmedQuery = query.trim();
  $: showAddNew = allowAddNew && trimmedQuery.length > 0;
  $: isEmptyDisplay = !displayValue;

  function toggleOpen() {
    if (disabled) return;
    open = !open;
    query = '';
    if (open) {
      setTimeout(() => searchInputEl?.focus(), 0);
    }
  }

  function handleSelect(opt: SearchableSelectOption) {
    dispatch('change', opt.value);
    open = false;
    query = '';
  }

  function handleAddNew() {
    dispatch('addNew', trimmedQuery);
    open = false;
    query = '';
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      open = false;
      query = '';
    } else if (e.key === 'Enter' && filtered.length === 1) {
      handleSelect(filtered[0]);
    } else if (e.key === 'Enter' && filtered.length === 0 && showAddNew) {
      handleAddNew();
    }
  }
</script>

<div class="ss-wrap" bind:this={wrapperEl}>
  <div
    class="input ss-trigger"
    class:empty={isEmptyDisplay}
    class:disabled
    on:click={toggleOpen}
    title={displayValue || placeholder}
    role="button"
    tabindex="0"
    on:keydown={(e) => e.key === 'Enter' && toggleOpen()}
  >
    <span class="ss-trigger-text">{displayValue || placeholder}</span>
    <span class="ss-caret">▾</span>
  </div>

  {#if open && !disabled}
    <div class="ss-panel">
      <div class="ss-search-wrap">
        <input
          bind:this={searchInputEl}
          type="text"
          bind:value={query}
          on:keydown={handleKeyDown}
          on:click={(e) => e.stopPropagation()}
          placeholder={searchPlaceholder}
          class="ss-search-input"
        />
      </div>
      <div class="ss-list">
        {#if filtered.length === 0 && !showAddNew}
          <div class="ss-empty">{emptyMessage}</div>
        {:else}
          {#each filtered as opt (opt.value)}
            {@const active = value !== undefined && value === opt.value}
            <div class="ss-option" class:active role="option" aria-selected={active} tabindex="0" on:click={() => handleSelect(opt)} on:keydown={(e) => e.key === 'Enter' && handleSelect(opt)}>
              <div class="ss-option-label" class:active>{opt.label}</div>
              {#if opt.sublabel}<div class="ss-option-sub">{opt.sublabel}</div>{/if}
            </div>
          {/each}
        {/if}
      </div>
      {#if showAddNew}
        <div class="ss-addnew" role="button" tabindex="0" on:click={handleAddNew} on:keydown={(e) => e.key === 'Enter' && handleAddNew()}>
          <span class="ss-addnew-icon">+</span>
          <span class="ss-addnew-text">Add New Item: "{trimmedQuery}"</span>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .ss-wrap {
    position: relative;
    width: 100%;
  }
  .ss-trigger {
    cursor: pointer;
    user-select: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 4px;
    min-height: 30px;
  }
  /* Same "not filled in yet" treatment as .input:placeholder-shown in
     shared-tab.css — a dashed outline and a faint tint, not a solid grey
     fill that flips to the card colour the instant a value is picked. */
  .ss-trigger.empty {
    border-style: dashed !important;
    border-color: var(--steel-2) !important;
    background-color: color-mix(in srgb, var(--steel-2) 12%, var(--card)) !important;
    color: var(--ink-soft) !important;
  }
  .ss-trigger.disabled {
    background-color: var(--paper) !important;
    color: var(--ink-soft) !important;
    cursor: not-allowed;
  }
  .ss-trigger-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    text-align: center;
  }
  .ss-caret {
    font-size: 9px;
    opacity: 0.8;
    flex-shrink: 0;
  }
  .ss-panel {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    min-width: 220px;
    /* Was a hardcoded white panel with light-grey chrome. On a dark theme
       the trigger stayed dark and then this popped open as a sheet of
       white — the single most jarring dark-mode defect in the calculator.
       Every surface in here is a token now. */
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 6px;
    box-shadow: var(--shadow);
    z-index: 500;
    overflow: hidden;
    text-align: left;
  }
  .ss-search-wrap {
    padding: 6px;
    border-bottom: 1px solid var(--border);
    background: var(--paper);
  }
  .ss-search-input {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 5px 8px;
    font-size: 12px;
    outline: none;
    font-family: inherit;
    background: var(--card);
    color: var(--ink);
  }
  .ss-list {
    max-height: 220px;
    overflow-y: auto;
  }
  .ss-empty {
    padding: 10px;
    font-size: 12px;
    color: var(--ink-soft);
    text-align: center;
  }
  .ss-option {
    padding: 7px 10px;
    font-size: 12px;
    cursor: pointer;
    border-bottom: 1px solid var(--border);
  }
  /* --card-hover, not --paper: a hovered option has to read as lifted in
     BOTH themes, and --paper is darker than --card once the theme flips. */
  .ss-option:hover:not(.active) {
    background-color: var(--card-hover);
  }
  .ss-option.active {
    background-color: var(--info-bg);
  }
  .ss-option-label {
    color: var(--ink);
    font-weight: 400;
  }
  .ss-option-label.active {
    font-weight: 600;
  }
  .ss-option-sub {
    color: var(--ink-soft);
    font-size: 11px;
    margin-top: 1px;
  }
  .ss-addnew {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 9px 10px;
    font-size: 12px;
    font-weight: 600;
    color: var(--info-ink);
    background-color: var(--info-bg);
    border-top: 1px solid var(--info-border);
    cursor: pointer;
  }
  .ss-addnew:hover {
    background-color: color-mix(in srgb, var(--info-ink) 18%, var(--info-bg));
  }
  .ss-addnew-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background-color: var(--info-ink);
    color: var(--info-bg);
    font-size: 11px;
    flex-shrink: 0;
  }
  .ss-addnew-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
