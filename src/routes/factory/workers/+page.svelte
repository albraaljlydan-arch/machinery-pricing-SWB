<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import { locale } from '$lib/stores/locale';
  import { t } from '$lib/i18n/dict';
  import { toast } from '$lib/stores/toast';

  interface Worker {
    id: string;
    full_name: string;
  }

  let workers: Worker[] = [];
  let loading = true;
  let newName = '';
  let adding = false;

  async function loadWorkers() {
    loading = true;
    const { data, error } = await supabase.from('factory_workers').select('*').order('full_name');
    if (!error) workers = data || [];
    loading = false;
  }
  onMount(loadWorkers);

  async function addWorker() {
    if (!newName.trim()) return;
    adding = true;
    const { error } = await supabase.from('factory_workers').insert({ full_name: newName.trim() });
    adding = false;
    if (error) {
      toast.notify(t($locale, 'workerAddErrorPrefix') + error.message, 'error');
    } else {
      toast.notify(t($locale, 'workerAddedSuccess'), 'success');
      newName = '';
      loadWorkers();
    }
  }

  function removeWorker(worker: Worker) {
    toast.confirmWithUndo(t($locale, 'removingWorkerTemplate').replace('{name}', worker.full_name), 3, async () => {
      const { error } = await supabase.from('factory_workers').delete().eq('id', worker.id);
      if (error) toast.notify('❌ ' + error.message, 'error');
      else workers = workers.filter((w) => w.id !== worker.id);
    });
  }
</script>

<div class="panel">
  <div class="add-row">
    <input type="text" bind:value={newName} placeholder={t($locale, 'workerNamePlaceholder')} dir="auto" on:keydown={(e) => e.key === 'Enter' && addWorker()} />
    <button class="btn-add" on:click={addWorker} disabled={adding || !newName.trim()}>{t($locale, 'addWorkerBtn')}</button>
  </div>

  {#if loading}
    <div class="empty">{t($locale, 'loading')}</div>
  {:else if workers.length === 0}
    <div class="empty">{t($locale, 'noWorkersYet')}</div>
  {:else}
    <table>
      <thead><tr><th>{t($locale, 'colFullName')}</th><th></th></tr></thead>
      <tbody>
        {#each workers as w (w.id)}
          <tr>
            <td class="name">{w.full_name}</td>
            <td class="actions"><button class="btn-remove" on:click={() => removeWorker(w)}>{t($locale, 'removeWorkerAction')}</button></td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>

<style>
  .panel {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: 18px 20px;
    overflow-x: auto;
  }
  .add-row {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
    max-width: 420px;
  }
  .add-row input {
    flex: 1;
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 7px 12px;
    font-size: 13px;
    background: var(--paper);
    color: var(--ink);
  }
  .btn-add {
    background: var(--navy);
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 7px 14px;
    font-size: 12.5px;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
  }
  .btn-add:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .empty {
    padding: 30px;
    text-align: center;
    color: var(--ink-soft);
    font-size: 13px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  th {
    text-align: start;
    font-size: 10.5px;
    color: var(--steel-2);
    text-transform: uppercase;
    padding: 8px 12px;
    background: var(--paper);
    border-bottom: 1px solid var(--border);
    font-weight: 600;
  }
  td {
    text-align: start;
    padding: 10px 12px;
    border-bottom: 1px solid var(--border);
  }
  tr:last-child td {
    border-bottom: none;
  }
  .name {
    font-weight: 700;
  }
  .actions {
    text-align: end;
  }
  .btn-remove {
    background: transparent;
    border: 1px solid var(--danger, #d9503a);
    color: var(--danger, #d9503a);
    border-radius: 7px;
    padding: 5px 12px;
    font-size: 12px;
    cursor: pointer;
  }
</style>
