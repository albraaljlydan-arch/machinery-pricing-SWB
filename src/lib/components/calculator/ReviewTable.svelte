<script lang="ts">
  // ==========================================================================
  //  REVIEW TABLE — one table per material category, styled like the PDF
  //  report (navy section title, dense bordered table) so Admin can scan
  //  all 7 categories quickly, stacked one after another — not tabs, since
  //  a fast top-to-bottom scan is the whole point of this screen.
  //    1. Admin's review screen: `onToggle` is provided — a checkbox sits at
  //       the end of every row so Admin can flag exactly which rows are
  //       wrong. Checking a row reveals a "Reason" box right under it.
  //    2. The Designer's rejection view: `onToggle` is omitted — read-only,
  //       any row whose id is in `flagged` shows the same red highlight
  //       plus the Admin's actual reason text underneath it.
  //  Categories with zero rows render nothing.
  // ==========================================================================
  export let title: string;
  export let headers: string[];
  export let rows: { id: string }[];
  export let renderCells: (row: any) => (string | number)[];
  export let flagged: Map<string, string>;
  export let onToggle: ((id: string) => void) | undefined = undefined;
  export let onReasonChange: ((id: string, reason: string) => void) | undefined = undefined;
</script>

{#if rows && rows.length > 0}
  <div class="review-card">
    <h3>{title}</h3>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            {#each headers as h}<th>{h}</th>{/each}
            <th>{onToggle ? 'Flag' : ''}</th>
          </tr>
        </thead>
        <tbody>
          {#each rows as row (row.id)}
            {@const isFlagged = flagged.has(row.id)}
            <tr class:flagged={isFlagged}>
              {#each renderCells(row) as cell}<td>{cell}</td>{/each}
              <td class="flag-cell">
                {#if onToggle}
                  <input type="checkbox" checked={isFlagged} on:change={() => onToggle?.(row.id)} />
                {:else if isFlagged}
                  <span class="issue-tag">⚠</span>
                {/if}
              </td>
            </tr>
            {#if onToggle}
              <tr class="reason-row" class:open={isFlagged}>
                <td colspan={headers.length + 1}>
                  <input
                    type="text"
                    class="reason-input"
                    placeholder="Reason for rejection…"
                    value={flagged.get(row.id) ?? ''}
                    on:input={(e) => onReasonChange?.(row.id, e.currentTarget.value)}
                  />
                </td>
              </tr>
            {:else if isFlagged}
              <tr class="reason-row open">
                <td colspan={headers.length + 1}>
                  <div class="reason-note">{flagged.get(row.id) || 'No reason given.'}</div>
                </td>
              </tr>
            {/if}
          {/each}
        </tbody>
      </table>
    </div>
  </div>
{/if}

<style>
  .review-card {
    background: #fff;
    border: 1px solid #dee4df;
    border-radius: 10px;
    padding: 16px 18px;
    margin-bottom: 16px;
  }
  h3 {
    font-size: 13px;
    font-weight: 700;
    margin: 0 0 10px;
    color: #0e2a3f;
    border-bottom: 2px solid #0e2a3f;
    padding-bottom: 6px;
  }
  .table-wrap {
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  th {
    padding: 7px 9px;
    text-align: left;
    color: #fff;
    font-weight: 700;
    font-size: 10.5px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    background: #0e2a3f;
    white-space: nowrap;
  }
  td {
    padding: 7px 9px;
    border-bottom: 1px solid #e2e8f0;
    white-space: nowrap;
    color: #17202b;
  }
  tr.flagged {
    background: #fdecea;
    box-shadow: inset 3px 0 0 #d9342b;
  }
  tr.reason-row td {
    padding: 0;
    border-bottom: none;
    white-space: normal;
  }
  tr.reason-row:not(.open) {
    display: none;
  }
  tr.reason-row.open td {
    padding: 0 9px 10px;
  }
  .reason-input {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid #d9342b;
    background: #fff;
    border-radius: 6px;
    padding: 6px 10px;
    font-size: 12px;
    color: #7a1610;
  }
  .reason-input::placeholder {
    color: #c99;
  }
  .reason-note {
    border: 1px solid #d9342b;
    background: #fdecea;
    border-radius: 6px;
    padding: 6px 10px;
    font-size: 12px;
    color: #7a1610;
  }
  .flag-cell {
    text-align: center;
  }
  .flag-cell input[type='checkbox'] {
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: #d9342b;
  }
  .issue-tag {
    color: #d9342b;
    font-weight: 700;
    font-size: 13px;
  }
</style>
