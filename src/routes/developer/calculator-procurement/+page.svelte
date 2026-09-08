<script lang="ts">
  import { locale } from '$lib/stores/locale';
  import { t } from '$lib/i18n/dict';
</script>

<h1>{t($locale, 'editCalcProcurement')}</h1>
<div class="stub">
  <p>{t($locale, 'underConstruction')}</p>
</div>

<style>
  h1 {
    margin: 0 0 14px;
  }
  .stub {
    background: var(--card);
    border: 1px dashed var(--border);
    border-radius: var(--radius);
    padding: 40px;
    text-align: center;
    color: var(--ink-soft);
    font-size: 14px;
  }
</style>
