<script lang="ts">
  // Guarantees: no negative (the "-" character never survives
  // sanitizeDecimalInput), decimals allowed, "0" is always the shown
  // default rather than a blank/grey box (formatDiscountBlur never clears
  // back to empty the way a normal price field does). The "can't exceed
  // this row's own total" rule is enforced by the caller before it clamps
  // the value passed in here.
  import { sanitizeDecimalInput, formatDiscountBlur } from '$lib/utils';

  export let value: number | undefined = undefined;

  let display = String(value ?? 0);
  let focused = false;
  $: if (!focused) display = String(value ?? 0);

  function handleInput(e: Event) {
    display = sanitizeDecimalInput((e.target as HTMLInputElement).value);
    const num = parseFloat(display);
    value = isNaN(num) ? 0 : Math.max(0, num);
  }
  function handleFocus() {
    focused = true;
  }
  function handleBlur() {
    focused = false;
    display = formatDiscountBlur(display);
    const num = parseFloat(display);
    value = isNaN(num) ? 0 : Math.max(0, num);
  }
</script>

<input class="discount-input" type="text" inputmode="decimal" bind:value={display} aria-label="Discount" on:input={handleInput} on:focus={handleFocus} on:blur={handleBlur} />
