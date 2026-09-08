<script lang="ts">
  import './shared-tab.css';
  import type { InvoiceRow } from '$lib/types';
  import { generateUid, sanitizeNum, formatNum } from '$lib/utils';
  import DecimalInput from './DecimalInput.svelte';

  // Procurement-only — the one tab the Designer's calculator never shows.
  // No Discount column here by design (matches the earlier decision: the
  // person explicitly said the Invoices tab should NOT carry that column).
  export let rows: InvoiceRow[];

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function addRow() {
    rows = [...rows, { id: generateUid(), invoiceNo: '', date: today(), client: '', driveLink: '', notes: '', invoiceValue: 0 }];
  }
  function removeRow(id: string) {
    rows = rows.filter((r) => r.id !== id);
  }

  $: totalValue = rows.reduce((sum, r) => sum + Math.max(0, sanitizeNum(r.invoiceValue)), 0);
</script>

<div class="card">
  <div class="card-header">
    <div class="card-title"><span class="tag">08</span><h2>Invoices</h2></div>
    <button class="btn-add" on:click={addRow}>+ Add Invoice</button>
  </div>

  <div class="table-wrap">
    <table>
      <thead>
        <tr><th>#</th><th>Invoice No.</th><th>Date</th><th>Client</th><th>Drive Link</th><th>Notes</th><th>Value ($)</th><th></th></tr>
      </thead>
      <tbody>
        {#each rows as row, i (row.id)}
          <tr>
            <td class="idx">{i + 1}</td>
            <td><input class="input" type="text" bind:value={row.invoiceNo} placeholder="001" /></td>
            <td><input class="input" type="date" bind:value={row.date} /></td>
            <td><input class="input" type="text" bind:value={row.client} placeholder="Client / shop name…" /></td>
            <td><input class="input" type="url" bind:value={row.driveLink} placeholder="https://drive.google.com/…" /></td>
            <td><input class="input" type="text" bind:value={row.notes} placeholder="Notes…" /></td>
            <td><DecimalInput bind:value={row.invoiceValue} placeholder="$" /></td>
            <td class="text-center"><button class="btn-del" on:click={() => removeRow(row.id)}>✕</button></td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <div class="ledger">
    <div><span class="lbl">Total Invoiced</span><span class="val price">${formatNum(totalValue, 2)}</span></div>
  </div>
</div>
