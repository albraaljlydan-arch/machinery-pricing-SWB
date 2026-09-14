<script lang="ts">
  // ==========================================================================
  //  CALCULATOR SHELL — the one place that decides which tabs to show.
  //  Both /designer and /procurement render THIS component, passing their
  //  row state down and mode="designer" | "procurement". The only structural
  //  difference between the two calculators — the extra Invoices tab, and no
  //  Safety Factor in Procurement — is decided right here, in one place,
  //  rather than duplicated across two separate calculator pages.
  // ==========================================================================
  import type { SheetRow, ProfileRow, MillRow, PipeRow, SquareRow, OrderRow, OperationRow, InvoiceRow } from '$lib/types';
  import type { FlagSet } from '$lib/calc/reviewFlags';
  import { safetyFactor as safetyFactorStore } from '$lib/stores/safetyFactor';

  import SheetTab from './SheetTab.svelte';
  import ProfileTab from './ProfileTab.svelte';
  import MillTab from './MillTab.svelte';
  import PipeTab from './PipeTab.svelte';
  import SquareTab from './SquareTab.svelte';
  import OrderTab from './OrderTab.svelte';
  import ProcessingTab from './ProcessingTab.svelte';
  import InvoicesTab from './InvoicesTab.svelte';
  import SummaryTab from './SummaryTab.svelte';

  export let mode: 'designer' | 'procurement';
  export let currentUserRole: string;

  export let sheetRows: SheetRow[];
  export let profileRows: ProfileRow[];
  export let millRows: MillRow[];
  export let pipeRows: PipeRow[];
  export let squareRows: SquareRow[];
  export let orderRows: OrderRow[];
  export let operations: OperationRow[];
  export let invoiceRows: InvoiceRow[] = [];

  // Only set when a Rejected project is reopened — each category's Map is
  // rowId -> Admin's reason. Passed straight through to the matching tab so
  // the flagged row lights up right inside the real, live, editable table
  // instead of a separate read-only copy of it sitting above the
  // calculator (that used to look like two calculators stacked on top of
  // each other, which is exactly the confusing part this replaces).
  export let reviewFlags: FlagSet | undefined = undefined;

  export let projectName: string;
  export let designerName = '';
  export let clientName = '';
  export let status = 'Draft';
  /** The margin the Designer's report applies. Passed in rather than read
   *  from the store directly, so a project that has left the Designer's hands
   *  renders the factor it was SUBMITTED with instead of whatever the current
   *  viewer happens to have set in their own browser. Defaults to the live
   *  setting for any caller that doesn't care. */
  export let safetyFactor: number | undefined = undefined;
  $: appliedSafetyFactor = mode === 'designer' ? (safetyFactor ?? $safetyFactorStore) : 0;
  // Only the Designer who owns this project, and only while it's still
  // theirs to touch (Draft/Rejected), can rename it here — everyone else
  // (Admin/Factory/Procurement reviewing it, or the Designer once it's
  // out of their hands) sees it locked. Ported from the old metadata-bar
  // rule; the Name field just lives up here now instead of in Summary.
  $: nameLocked = mode === 'procurement' || currentUserRole !== 'designer' || (status !== 'Draft' && status !== 'Rejected');

  const baseTabs = [
    { id: 'sheets', label: 'Sheet Metal' },
    { id: 'profiles', label: 'Profiles & Tubes' },
    { id: 'mills', label: 'Mill (Round)' },
    { id: 'pipes', label: 'Pipes & Bushings' },
    { id: 'squares', label: 'Square & Blocks' },
    { id: 'orders', label: 'Orders' },
    { id: 'processing', label: 'Processing Costs' },
  ];
  // Invoices is the ONE tab Procurement has that Designer doesn't — decided
  // here, in the shell, not duplicated into two separate page files. Tabs
  // always flex to fill the row evenly (see CSS) so this stays visually
  // consistent whether there are 8 tabs (Designer) or 9 (Procurement).
  $: tabs = mode === 'procurement' ? [...baseTabs, { id: 'invoices', label: 'Invoices' }, { id: 'summary', label: 'Summary' }] : [...baseTabs, { id: 'summary', label: 'Summary' }];

  let activeTab = 'sheets';

  // Same visual reminder as the dashboard list: an unnamed project stays
  // visibly grey/italic here too, even after auto-saving under a
  // placeholder name, so it never quietly looks "finished".
  $: isUntitled = projectName.trim().toLowerCase().startsWith('untitled project');
</script>

<!-- dir="ltr" is explicit and non-negotiable here: the calculator must ALWAYS
     read left-to-right, regardless of what the dashboard's language toggle
     is set to (the toggle only ever affects Admin/Designer/Factory/
     Accounting dashboard shells — see routes/+layout.svelte). Since `dir`
     is inherited by descendants unless overridden, this one attribute is
     what keeps the whole calculator subtree LTR even when the document's
     <html> is currently set to dir="rtl". -->
<div class="calc-shell" dir="ltr">
  <!-- Project Name lives here, above the tab bar, precisely because it
       needs to stay visible and editable no matter which tab is active —
       it used to be buried inside the Summary tab, invisible the rest of
       the time. -->
  <div class="name-box">
    <label for="calc-project-name">Project Name{nameLocked ? ' 🔒' : ''}</label>
    <input id="calc-project-name" type="text" bind:value={projectName} disabled={nameLocked} class:untitled={isUntitled} placeholder="Enter project name…" />
  </div>

  <nav class="tabnav">
    {#each tabs as tab}
      <button class:active={activeTab === tab.id} class:has-issue={!!reviewFlags?.[tab.id as keyof FlagSet]?.size} on:click={() => (activeTab = tab.id)}>
        {tab.label}<span class="issue-dot"></span>
      </button>
    {/each}
  </nav>

  <div class="tab-content">
    {#if activeTab === 'sheets'}
      <SheetTab {mode} bind:rows={sheetRows} flagged={reviewFlags?.sheets} />
    {:else if activeTab === 'profiles'}
      <ProfileTab {mode} bind:rows={profileRows} flagged={reviewFlags?.profiles} />
    {:else if activeTab === 'mills'}
      <MillTab {mode} bind:rows={millRows} flagged={reviewFlags?.mills} />
    {:else if activeTab === 'pipes'}
      <PipeTab {mode} bind:rows={pipeRows} flagged={reviewFlags?.pipes} />
    {:else if activeTab === 'squares'}
      <SquareTab {mode} bind:rows={squareRows} flagged={reviewFlags?.squares} />
    {:else if activeTab === 'orders'}
      <OrderTab {mode} bind:rows={orderRows} flagged={reviewFlags?.orders} />
    {:else if activeTab === 'processing'}
      <ProcessingTab {mode} bind:rows={operations} flagged={reviewFlags?.processing} />
    {:else if activeTab === 'invoices'}
      <InvoicesTab bind:rows={invoiceRows} />
    {:else if activeTab === 'summary'}
      <SummaryTab
        {mode}
        {projectName}
        {designerName}
        {clientName}
        {status}
        safetyFactor={appliedSafetyFactor}
        sheets={sheetRows}
        profiles={profileRows}
        mills={millRows}
        pipes={pipeRows}
        squares={squareRows}
        orders={orderRows}
        {operations}
      />
    {/if}
  </div>
</div>

<style>
  .calc-shell {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .name-box {
    background: var(--card, #fff);
    border: 1px solid var(--border, #dee4df);
    border-radius: 12px;
    padding: 12px 18px;
    box-shadow: var(--shadow, 0 1px 2px rgba(0, 0, 0, 0.06));
  }
  .name-box label {
    display: block;
    font-size: 11px;
    font-weight: 700;
    color: var(--ink-soft);
    text-transform: uppercase;
    margin-bottom: 6px;
  }
  /* The project-name field sits on a var(--card) panel but hardcoded its own
     near-black ink, so in dark mode the name was black-on-dark — invisible
     until you selected it. */
  .name-box input {
    width: 100%;
    border: none;
    outline: none;
    font-size: 17px;
    font-weight: 700;
    color: var(--ink);
    font-family: inherit;
    background: transparent;
    padding: 0;
  }
  .name-box input:disabled {
    color: var(--ink-soft);
    cursor: not-allowed;
  }
  .name-box input.untitled {
    color: var(--steel-2);
    font-style: italic;
  }
  .tabnav {
    display: flex;
    gap: 6px;
    padding: 10px;
    background: var(--navy, #0e2a3f);
    border-radius: 12px;
  }
  .tabnav button {
    position: relative;
    flex: 1 1 0;
    min-width: 0;
    background: transparent;
    color: #cfe4ec;
    border: none;
    padding: 11px 8px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 13px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .tabnav button.active {
    background: var(--amber, #f2a93b);
    color: #1b1103;
  }
  .issue-dot {
    display: none;
    position: absolute;
    top: 3px;
    right: 3px;
    width: 13px;
    height: 13px;
    border-radius: 50%;
    background: #d9342b;
    border: 2px solid var(--navy, #0e2a3f);
  }
  .tabnav button.has-issue .issue-dot {
    display: block;
  }
  .tabnav button.has-issue.active .issue-dot {
    border-color: var(--amber, #f2a93b);
  }
</style>
