<script lang="ts">
  import { sanitizeQuantityInput } from '$lib/utils';

  export let value: number;

  let display = value ? String(value) : '';
  let focused = false;
  $: if (!focused) display = value ? String(value) : '';

  // Protections, unchanged: whole numbers only, minimum 1 — enforced on
  // every path in, whether typed, blurred, or nudged with the arrows below.
  function commit(next: number) {
    const safe = isNaN(next) || next < 1 ? 1 : Math.round(next);
    value = safe;
    display = String(safe);
  }

  function handleInput(e: Event) {
    display = sanitizeQuantityInput((e.target as HTMLInputElement).value);
    const num = parseInt(display, 10);
    value = isNaN(num) || num < 1 ? 1 : num;
  }
  function handleFocus() {
    focused = true;
  }
  function handleBlur() {
    focused = false;
    commit(parseInt(display, 10));
  }

  // Small up/down steppers inside the box — one shared component, so this
  // reaches every tab (Sheet/Profile/Mill/Pipe/Square/Order) automatically.
  function increment() {
    commit((value || 0) + 1);
  }
  function decrement() {
    commit((value || 1) - 1); // commit()'s own floor still clamps this at 1
  }
</script>

<div class="qty-wrap">
  <input class="input input-qty" type="text" inputmode="numeric" bind:value={display} aria-label="Quantity" on:input={handleInput} on:focus={handleFocus} on:blur={handleBlur} />
  <div class="qty-steppers">
    <button type="button" class="qty-step" tabindex="-1" aria-label="Increase quantity" on:click={increment}>▲</button>
    <button type="button" class="qty-step" tabindex="-1" aria-label="Decrease quantity" on:click={decrement}>▼</button>
  </div>
</div>

<style>
  .qty-wrap {
    position: relative;
    width: 100%;
  }
  .qty-wrap .input-qty {
    padding-inline-end: 16px; /* room for the stepper arrows */
  }
  .qty-steppers {
    position: absolute;
    top: 1px;
    /* inset-inline-end, not right: the calculator is LTR but this component
       is also mounted inside RTL dashboard context in a couple of places,
       and the padding it pairs with (padding-inline-end above) is already
       logical — the two were pointing at opposite edges in RTL. */
    inset-inline-end: 1px;
    bottom: 1px;
    width: 15px;
    display: flex;
    flex-direction: column;
    border-inline-start: 1px solid var(--border);
  }
  /* Was a fixed near-white (#f8fafc) chip with dark-grey glyphs, which stayed
     light against a dark input in dark mode, then went darker still on
     hover while the text went almost black — unreadable both ways. */
  .qty-step {
    flex: 1;
    border: none;
    background: var(--paper);
    color: var(--ink-soft);
    font-size: 7px;
    line-height: 1;
    padding: 0;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .qty-step:hover {
    background: var(--card-hover);
    color: var(--ink);
  }
  .qty-step:first-child {
    border-radius: 0 4px 0 0;
    border-bottom: 1px solid var(--border);
  }
  .qty-step:last-child {
    border-radius: 0 0 4px 0;
  }
</style>
