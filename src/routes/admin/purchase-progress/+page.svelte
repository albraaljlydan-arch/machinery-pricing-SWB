<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  onMount(() => {
    goto('/admin/factory-progress', { replaceState: true });
  });
</script>

<div class="redirecting">Loding SWB System</div>

<style>
  .redirecting {
    padding: 32px;
    text-align: center;
    color: var(--ink-soft);
  }
</style>
