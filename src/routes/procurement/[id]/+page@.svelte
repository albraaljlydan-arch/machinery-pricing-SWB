<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabaseClient';
  import { auth } from '$lib/stores/auth';
  import Calculator from '$lib/components/calculator/Calculator.svelte';
  import type { SheetRow, ProfileRow, MillRow, PipeRow, SquareRow, OrderRow, OperationRow, InvoiceRow } from '$lib/types';
  import { computeGrandTotals } from '$lib/calc/grandTotals';

  $: projectId = $page.params.id;

  let loading = true;
  let saving = false;
  let completing = false;
  let status = 'Complete Production';
  let projectName = '';
  let clientName = '';
  let designerName = '';

  let sheetRows: SheetRow[] = [];
  let profileRows: ProfileRow[] = [];
  let millRows: MillRow[] = [];
  let pipeRows: PipeRow[] = [];
  let squareRows: SquareRow[] = [];
  let orderRows: OrderRow[] = [];
  let operations: OperationRow[] = [];
  let invoiceRows: InvoiceRow[] = [];

  async function load() {
    loading = true;
    const { data, error } = await supabase.from('projects_with_designer').select('*').eq('id', projectId).single();
    if (error || !data) {
      alert('Could not load this project.');
      goto('/procurement');
      return;
    }
    const d = data.project_data || {};
    projectName = data.project_name || '';
    clientName = d.client || data.client || '';
    designerName = data.designer_name || '';
    status = data.status;
    sheetRows = d.sheetRows || [];
    profileRows = d.profileRows || [];
    millRows = d.millRows || [];
    pipeRows = d.pipeRows || [];
    squareRows = d.squareRows || [];
    orderRows = d.orderRows || [];
    operations = d.operations || [];
    invoiceRows = d.invoiceRows || [];
    loading = false;
  }

  onMount(load);

  function buildProjectData() {
    return {
      projectName,
      client: clientName,
      safetyFactor: 0,
      sheetRows,
      profileRows,
      millRows,
      pipeRows,
      squareRows,
      orderRows,
      operations,
      invoiceRows,
    };
  }

  async function saveProgress() {
    saving = true;
    const totals = computeGrandTotals({ sheets: sheetRows, profiles: profileRows, mills: millRows, pipes: pipeRows, squares: squareRows, orders: orderRows, operations });
    const { error } = await supabase.from('projects').update({ total_cost: totals.totalPrice, project_data: buildProjectData() }).eq('id', projectId);
    saving = false;
    if (error) alert('❌ Error saving: ' + error.message);
    else alert('💾 Progress saved.');
  }

  async function completeAndSend() {
    completing = true;
    const totals = computeGrandTotals({ sheets: sheetRows, profiles: profileRows, mills: millRows, pipes: pipeRows, squares: squareRows, orders: orderRows, operations });
    const { error } = await supabase
      .from('projects')
      .update({ status: 'Completed', total_cost: totals.totalPrice, project_data: buildProjectData() })
      .eq('id', projectId);
    completing = false;
    if (error) alert('❌ Error completing: ' + error.message);
    else goto('/procurement');
  }
</script>

<div class="page" dir="ltr">
  <div class="topbar">
    <a class="btn-back" href="/procurement">← Back to Dashboard</a>
    <div class="spacer"></div>
    <button class="btn-save" on:click={saveProgress} disabled={saving}>{saving ? 'Saving…' : '💾 Save Progress'}</button>
    <button class="btn-complete" on:click={completeAndSend} disabled={completing}>{completing ? 'Sending…' : '✅ Complete & Send to Accounting'}</button>
  </div>

  {#if loading}
    <p class="muted">Loading…</p>
  {:else}
    <Calculator
      mode="procurement"
      currentUserRole={$auth.userRole ?? 'procurement'}
      bind:sheetRows
      bind:profileRows
      bind:millRows
      bind:pipeRows
      bind:squareRows
      bind:orderRows
      bind:operations
      bind:invoiceRows
      bind:projectName
      {designerName}
      bind:clientName
      {status}
    />
  {/if}
</div>

<style>
  .page {
    max-width: 1400px;
    margin: 0 auto;
    padding: 20px 20px 60px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  .topbar {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 18px;
  }
  .spacer {
    flex: 1;
  }
  .btn-back {
    background: #64748b;
    color: #fff;
    padding: 9px 16px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 13px;
  }
  .btn-save {
    background: var(--navy-3, #17456a);
    color: #fff;
    border: none;
    padding: 9px 16px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 13px;
  }
  .btn-complete {
    background: var(--success, #3f9463);
    color: #fff;
    border: none;
    padding: 9px 16px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 13px;
  }
  .muted {
    color: var(--ink-soft, #4c616c);
  }
</style>
