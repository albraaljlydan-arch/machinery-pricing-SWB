<script lang="ts">
  // Same behavior as the original: every keystroke is sanitized
  // (sanitizeDecimalInput), on blur formatOnBlur tidies edge cases
  // (".5" -> "0.5", "5." -> "5", empty stays empty so the placeholder-shown
  // grey-fill style below can kick in — a fresh unfilled cell should read
  // as "not filled in yet", not silently become "0").
  import { sanitizeDecimalInput, formatOnBlur } from '$lib/utils';

  export let value: number | undefined = undefined;
  export let placeholder = '';
  export let disabled = false;

  // '' (not '0') so a fresh/blank numeric field shows its placeholder and
  // gets the dark-grey "unfilled" treatment, matching the original design.
  let display = value ? String(value) : '';
  let focused = false;
  $: if (!focused) display = value ? String(value) : '';

  function handleInput(e: Event) {
    display = sanitizeDecimalInput((e.target as HTMLInputElement).value);
    const num = parseFloat(display);
    value = isNaN(num) ? 0 : num;
  }
  function handleFocus() {
    focused = true;
  }
  function handleBlur() {
    focused = false;
    display = display === '' ? '' : formatOnBlur(display);
    const num = parseFloat(display);
    value = isNaN(num) ? 0 : num;
  }
</script>

<input class="input input-dim" type="text" inputmode="decimal" bind:value={display} {placeholder} {disabled} on:input={handleInput} on:focus={handleFocus} on:blur={handleBlur} />
