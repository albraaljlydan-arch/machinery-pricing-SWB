<script lang="ts">
  import { onMount } from 'svelte';
  import { locale } from '$lib/stores/locale';
  import { t } from '$lib/i18n/dict';
  import { toast } from '$lib/stores/toast';
  import { loadFieldConfig, saveFieldConfig, emptyFieldConfig } from '$lib/calc/fieldConfig';
  import type { CustomFieldDef, CustomFieldType } from '$lib/calc/fieldConfig';
  import { MILL_COLUMNS, SHEET_COLUMNS, PROFILE_COLUMNS, PIPE_COLUMNS, SQUARE_COLUMNS, ORDER_COLUMNS, PROCESSING_COLUMNS } from '$lib/calc/tableColumns';
  import type { ColumnDef } from '$lib/calc/tableColumns';

  // Every tab is now read by both the live Designer calculator and the
  // PDF/preview report (see each Tab.svelte + FullReport.svelte) — none of
  // these are cosmetic-only anymore. Column definitions come straight from
  // tableColumns.ts so this list can never drift from what the calculator
  // actually renders.
  const TABS: { key: string; label: string; enabled: boolean; builtin: ColumnDef[] }[] = [
    { key: 'designer_sheet', label: 'Sheet Metal', enabled: true, builtin: SHEET_COLUMNS },
    { key: 'designer_profile', label: 'Profiles & Tubes', enabled: true, builtin: PROFILE_COLUMNS },
    { key: 'designer_mill', label: 'Mill (Round)', enabled: true, builtin: MILL_COLUMNS },
    { key: 'designer_pipe', label: 'Pipes & Bushings', enabled: true, builtin: PIPE_COLUMNS },
    { key: 'designer_square', label: 'Square & Blocks', enabled: true, builtin: SQUARE_COLUMNS },
    { key: 'designer_order', label: 'Orders', enabled: true, builtin: ORDER_COLUMNS },
    { key: 'designer_processing', label: 'Processing Costs', enabled: true, builtin: PROCESSING_COLUMNS },
  ];

  let activeTab = 'designer_mill';
  $: activeTabDef = TABS.find((tb) => tb.key === activeTab)!;
  let loading = true;
  let saving = false;
  let customColumns: CustomFieldDef[] = [];
  let labelOverrides: Record<string, string> = {};
  let dragIndex: number | null = null;

  async function loadTab(key: string) {
    loading = true;
    const data = await loadFieldConfig(key);
    customColumns = data.customColumns;
    labelOverrides = { ...data.labelOverrides };
    loading = false;
    expandedBuiltin = null;
    cancelEdit();
  }
  onMount(() => loadTab(activeTab));

  function selectTab(tab: (typeof TABS)[number]) {
    if (!tab.enabled) return;
    activeTab = tab.key;
    loadTab(tab.key);
  }

  // ---- built-in column rename ----
  let expandedBuiltin: string | null = null;
  let labelDraft = '';
  function openBuiltin(key: string, currentLabel: string) {
    if (expandedBuiltin === key) {
      expandedBuiltin = null;
      return;
    }
    expandedBuiltin = key;
    labelDraft = labelOverrides[key] ?? currentLabel;
  }
  function applyLabelOverride(key: string) {
    const trimmed = labelDraft.trim();
    labelOverrides = trimmed ? { ...labelOverrides, [key]: trimmed } : labelOverrides;
    expandedBuiltin = null;
  }
  function resetLabelOverride(key: string) {
    const next = { ...labelOverrides };
    delete next[key];
    labelOverrides = next;
    expandedBuiltin = null;
  }

  // ---- add / edit custom column form ----
  let editingId: string | null = null;
  let editingOriginalName = '';
  let newName = '';
  let newType: CustomFieldType = 'text';
  let numFormat: 'integer' | 'decimal' = 'decimal';
  let positiveOnly = false;
  let allowNegative = false;
  let unit = '';
  let optionsList: string[] = [];
  let newOption = '';
  let allowCustom = false;
  let customValueType: 'text' | 'number' = 'text';
  let nameError = '';

  function togglePositive() {
    if (positiveOnly) allowNegative = false;
  }
  function toggleNegative() {
    if (allowNegative) positiveOnly = false;
  }

  function resetForm() {
    newName = '';
    newType = 'text';
    numFormat = 'decimal';
    positiveOnly = false;
    allowNegative = false;
    unit = '';
    optionsList = [];
    newOption = '';
    allowCustom = false;
    customValueType = 'text';
    nameError = '';
  }

  function startEdit(c: CustomFieldDef) {
    editingId = c.id;
    editingOriginalName = c.name;
    newName = c.name;
    newType = c.type;
    numFormat = c.constraints?.numberFormat ?? 'decimal';
    positiveOnly = !!c.constraints?.positiveOnly;
    allowNegative = !!c.constraints?.allowNegative;
    unit = c.constraints?.unit ?? '';
    optionsList = c.constraints?.options ? [...c.constraints.options] : [];
    allowCustom = !!c.constraints?.allowCustomValue;
    customValueType = c.constraints?.customValueType ?? 'text';
    nameError = '';
  }
  function cancelEdit() {
    editingId = null;
    editingOriginalName = '';
    resetForm();
  }

  function addOption() {
    const v = newOption.trim();
    if (!v) return;
    optionsList = [...optionsList, v];
    newOption = '';
  }
  function removeOption(i: number) {
    optionsList = optionsList.filter((_, idx) => idx !== i);
  }

  function submitColumn() {
    const trimmed = newName.trim();
    if (!trimmed) {
      nameError = t($locale, 'nameRequiredError');
      return;
    }
    if (!/^[A-Za-z0-9 ()$%./_-]+$/.test(trimmed)) {
      nameError = t($locale, 'englishOnlyError');
      return;
    }
    nameError = '';
    const def: CustomFieldDef = { id: editingId ?? crypto.randomUUID(), name: trimmed, type: newType };
    if (newType === 'number') {
      def.constraints = { numberFormat: numFormat, positiveOnly, allowNegative, unit: unit.trim() || undefined };
    } else if (newType === 'dropdown') {
      def.constraints = { options: optionsList, allowCustomValue: allowCustom, customValueType };
    }
    customColumns = editingId ? customColumns.map((c) => (c.id === editingId ? def : c)) : [...customColumns, def];
    cancelEdit();
  }

  function removeColumn(id: string) {
    customColumns = customColumns.filter((c) => c.id !== id);
    if (editingId === id) cancelEdit();
  }

  function onDrop(i: number) {
    if (dragIndex === null || dragIndex === i) return;
    const next = [...customColumns];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(i, 0, moved);
    customColumns = next;
    dragIndex = null;
  }

  async function save() {
    saving = true;
    const { error } = await saveFieldConfig(activeTab, { customColumns, labelOverrides });
    saving = false;
    if (error) toast.notify('❌ ' + error, 'error');
    else toast.notify(t($locale, 'fieldConfigSaved'), 'success');
  }

  const WIDTH: Record<CustomFieldType, string> = { number: '90px', dropdown: '140px', text: '' };
</script>

<div class="wrap">
  <aside class="tabs">
    {#each TABS as tb}
      <button class:active={activeTab === tb.key} class:disabled={!tb.enabled} on:click={() => selectTab(tb)}>
        {tb.label}
        {#if !tb.enabled}<span class="tag">{t($locale, 'comingSoonTag')}</span>{/if}
      </button>
    {/each}
  </aside>

  <div class="main">
    <p class="hint">{t($locale, 'manageFieldsHint')}</p>
    <p class="hint">{t($locale, 'dragReorderHint')}</p>

    {#if loading}
      <p class="muted">{t($locale, 'loading')}</p>
    {:else}
      <div class="col-list">
        {#each activeTabDef.builtin as bc (bc.key)}
          <div class="col-row">
            <button class="row-main" on:click={() => openBuiltin(bc.key, bc.label)}>
              <span class="name">{labelOverrides[bc.key] ?? bc.label}</span>
              <span class="tag builtin">{t($locale, 'builtinTag')}</span>
            </button>
          </div>
          {#if expandedBuiltin === bc.key}
            <div class="expand-panel">
              <input class="name-input" dir="ltr" bind:value={labelDraft} placeholder={bc.label} />
              <div class="expand-actions">
                <button class="add-btn" on:click={() => applyLabelOverride(bc.key)}>{t($locale, 'save')}</button>
                <button class="ghost-btn" on:click={() => resetLabelOverride(bc.key)}>{t($locale, 'cancelBtn')}</button>
              </div>
            </div>
          {/if}
        {/each}

        {#each customColumns as c, i (c.id)}
          <div
            class="col-row"
            role="listitem"
            draggable="true"
            on:dragstart={() => (dragIndex = i)}
            on:dragover|preventDefault
            on:drop={() => onDrop(i)}
          >
            <span class="grip">☰</span>
            <button class="row-main" on:click={() => startEdit(c)}>
              <span class="name">{c.name}</span><span class="tag type">{c.type}</span><span class="tag added">{t($locale, 'addedTag')}</span>
            </button>
            <button class="rm" title={t($locale, 'removeColumnTitle')} aria-label={t($locale, 'removeColumnTitle')} on:click|stopPropagation={() => removeColumn(c.id)}>✕</button>
          </div>
        {/each}
      </div>

      <div class="add-box">
        {#if editingId}
          <p class="editing-banner">{t($locale, 'editingLabel')} <b>{editingOriginalName}</b></p>
        {/if}
        <div class="add-row">
          <input class="name-input" bind:value={newName} placeholder={t($locale, 'newColumnNamePlaceholder')} dir="ltr" />
          <select bind:value={newType}>
            <option value="text">{t($locale, 'typeText')}</option>
            <option value="number">{t($locale, 'typeNumber')}</option>
            <option value="dropdown">{t($locale, 'typeDropdown')}</option>
          </select>
        </div>
        <p class="en-hint">{t($locale, 'englishNameHint')}</p>
        {#if nameError}<p class="err">{nameError}</p>{/if}

        {#if newType === 'number'}
          <div class="extra">
            <div class="radio-row">
              <label><input type="radio" name="numfmt" checked={numFormat === 'decimal'} on:change={() => (numFormat = 'decimal')} /> {t($locale, 'numberFormatDecimal')}</label>
              <label><input type="radio" name="numfmt" checked={numFormat === 'integer'} on:change={() => (numFormat = 'integer')} /> {t($locale, 'numberFormatInteger')}</label>
            </div>
            <label><input type="checkbox" bind:checked={positiveOnly} on:change={togglePositive} /> {t($locale, 'positiveOnlyLabel')}</label>
            <label><input type="checkbox" bind:checked={allowNegative} on:change={toggleNegative} /> {t($locale, 'allowNegativeLabel')}</label>
            <input type="text" bind:value={unit} placeholder={t($locale, 'unitPlaceholder')} dir="ltr" />
          </div>
        {:else if newType === 'dropdown'}
          <div class="extra">
            <div class="opt-add-row">
              <input
                type="text"
                bind:value={newOption}
                placeholder={t($locale, 'dropdownOptionsPlaceholder')}
                dir="ltr"
                on:keydown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addOption();
                  }
                }}
              />
              <button type="button" class="opt-add-btn" on:click={addOption}>+</button>
            </div>
            {#if optionsList.length}
              <div class="opt-chips">
                {#each optionsList as opt, i}
                  <span class="chip">{opt}<button type="button" on:click={() => removeOption(i)}>✕</button></span>
                {/each}
              </div>
            {/if}
            <label><input type="checkbox" bind:checked={allowCustom} /> {t($locale, 'allowCustomValueLabel')}</label>
            {#if allowCustom}
              <div class="radio-row">
                <label><input type="radio" name="cvtype" checked={customValueType === 'text'} on:change={() => (customValueType = 'text')} /> {t($locale, 'typeText')}</label>
                <label><input type="radio" name="cvtype" checked={customValueType === 'number'} on:change={() => (customValueType = 'number')} /> {t($locale, 'typeNumber')}</label>
              </div>
            {/if}
          </div>
        {/if}

        <div class="form-actions">
          <button class="add-btn" on:click={submitColumn}>{editingId ? t($locale, 'save') : t($locale, 'addColumnBtn')}</button>
          {#if editingId}<button class="ghost-btn" on:click={cancelEdit}>{t($locale, 'cancelBtn')}</button>{/if}
        </div>
      </div>

      <div class="preview-lbl">{t($locale, 'livePreviewLabel')}</div>
      <div class="table-wrap">
        <table dir="ltr">
          <colgroup>
            {#each activeTabDef.builtin as _}<col />{/each}
            {#each customColumns as c}<col style={WIDTH[c.type] ? `width:${WIDTH[c.type]}` : ''} />{/each}
          </colgroup>
          <thead>
            <tr>
              {#each activeTabDef.builtin as bc}<th>{labelOverrides[bc.key] ?? bc.label}</th>{/each}
              {#each customColumns as c}<th class="added-th">{c.name}</th>{/each}
            </tr>
          </thead>
          <tbody>
            <tr>
              {#each activeTabDef.builtin as _}<td>—</td>{/each}
              {#each customColumns as c}
                <td class="added-th">{c.type === 'dropdown' ? c.constraints?.options?.[0] ?? '' : c.type === 'number' && c.constraints?.unit ? '0 ' + c.constraints.unit : ''}</td>
              {/each}
            </tr>
          </tbody>
        </table>
      </div>

      <button class="save-btn" on:click={save} disabled={saving}>{saving ? t($locale, 'savingGeneric') : t($locale, 'save')}</button>
    {/if}
  </div>
</div>

<style>
  .wrap {
    display: grid;
    grid-template-columns: 190px 1fr;
    gap: 20px;
  }
  .tabs {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .tabs button {
    text-align: start;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 9px 12px;
    font-size: 12.5px;
    color: var(--ink);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  .tabs button.active {
    background: var(--navy);
    color: #fff;
    border-color: var(--navy);
  }
  .tabs button.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .tabs .tag {
    font-size: 9px;
    background: var(--purple, #6d4fc1);
    color: #fff;
    padding: 1px 6px;
    border-radius: 8px;
  }
  .main {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: 16px 20px;
  }
  .hint {
    margin: 0 0 4px;
    font-size: 11.5px;
    color: var(--ink-soft);
  }
  .muted {
    color: var(--ink-soft);
    font-size: 13px;
  }
  .col-list {
    margin-top: 12px;
  }
  .col-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 3px 4px;
    border-bottom: 1px solid var(--border);
    font-size: 13px;
    direction: ltr;
  }
  .col-row .grip {
    cursor: grab;
    color: var(--steel-2);
    font-size: 13px;
  }
  .row-main {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    background: transparent;
    border: none;
    text-align: start;
    padding: 8px 4px;
    cursor: pointer;
    font: inherit;
    color: inherit;
  }
  .row-main .name {
    flex: 1;
  }
  .col-row .tag {
    font-size: 10px;
    color: var(--ink-soft);
    background: var(--paper);
    border: 1px solid var(--border);
    padding: 1px 7px;
    border-radius: 10px;
  }
  .col-row .tag.added {
    color: var(--purple-ink, #3f2e82);
    background: var(--purple-bg, #e9e3fa);
    border-color: transparent;
  }
  .col-row .rm {
    border: 1px solid var(--danger, #d9503a);
    color: var(--danger, #d9503a);
    background: transparent;
    width: 22px;
    height: 22px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    flex-shrink: 0;
  }
  .expand-panel {
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 8px 4px 12px 24px;
    direction: ltr;
  }
  .expand-actions {
    display: flex;
    gap: 6px;
  }
  .add-box {
    border: 1px dashed var(--border);
    border-radius: 8px;
    padding: 12px;
    margin: 14px 0 18px;
  }
  .editing-banner {
    margin: 0 0 8px;
    font-size: 12px;
    color: var(--ink-soft);
    direction: ltr;
  }
  .add-row {
    display: flex;
    gap: 8px;
    direction: ltr;
  }
  .add-row input,
  .add-row select,
  .expand-panel input {
    border: 1px solid var(--border);
    border-radius: 7px;
    padding: 6px 10px;
    font-size: 12.5px;
    background: var(--card);
    color: var(--ink);
  }
  .add-row .name-input,
  .expand-panel .name-input {
    flex: 1;
  }
  .en-hint {
    margin: 6px 0 0;
    font-size: 11px;
    color: var(--ink-soft);
  }
  .err {
    margin: 4px 0 0;
    font-size: 11.5px;
    color: var(--danger-deep, #b91c1c);
  }
  .extra {
    display: flex;
    flex-direction: column;
    gap: 7px;
    padding-top: 10px;
    margin-top: 8px;
    border-top: 1px solid var(--border);
    direction: ltr;
  }
  .extra label {
    font-size: 12.5px;
    color: var(--ink);
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .extra input[type='text'] {
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 6px 10px;
    font-size: 12.5px;
    background: var(--card);
    color: var(--ink);
  }
  .radio-row {
    display: flex;
    gap: 16px;
  }
  .opt-add-row {
    display: flex;
    gap: 6px;
  }
  .opt-add-row input {
    flex: 1;
  }
  .opt-add-btn {
    background: var(--navy-3, #17456a);
    color: #fff;
    border: none;
    border-radius: 6px;
    width: 30px;
    font-weight: 700;
    cursor: pointer;
  }
  .opt-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: var(--paper);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 3px 6px 3px 10px;
    font-size: 12px;
    color: var(--ink);
  }
  .chip button {
    border: none;
    background: transparent;
    color: var(--ink-soft);
    cursor: pointer;
    font-size: 11px;
    width: 16px;
    height: 16px;
  }
  .form-actions {
    display: flex;
    gap: 8px;
    margin-top: 10px;
  }
  .add-btn {
    background: var(--navy-3, #17456a);
    color: #fff;
    border: none;
    border-radius: 7px;
    padding: 7px 14px;
    font-size: 12.5px;
    font-weight: 700;
    cursor: pointer;
  }
  .ghost-btn {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--ink-soft);
    border-radius: 7px;
    padding: 7px 14px;
    font-size: 12.5px;
    cursor: pointer;
  }
  .preview-lbl {
    font-size: 10.5px;
    color: var(--ink-soft);
    text-transform: uppercase;
    letter-spacing: 0.4px;
    margin: 4px 0 6px;
  }
  .table-wrap {
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12.5px;
    table-layout: fixed;
  }
  th {
    text-align: center;
    background: var(--paper);
    padding: 7px 10px;
    border-bottom: 1px solid var(--border);
    font-weight: 600;
    color: var(--ink-soft);
    font-size: 10.5px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  td {
    text-align: center;
    padding: 8px 10px;
    border-bottom: 1px solid var(--border);
    color: var(--ink);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .added-th {
    background: var(--amber-bg, #fceed4);
  }
  .save-btn {
    background: var(--success, #3f9463);
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 8px 18px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    margin-top: 16px;
  }
  .save-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (max-width: 720px) {
    .wrap {
      grid-template-columns: 1fr;
    }
  }
</style>
