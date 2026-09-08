<script lang="ts">
  import { locale } from '$lib/stores/locale';
  import { t } from '$lib/i18n/dict';
</script>

<div class="panel">
  <h3>{t($locale, 'editCalcDesigner')}</h3>
  <p>{t($locale, 'developerOverviewDesc')}</p>
  <a class="btn" href="/developer/calculator-designer">{t($locale, 'editCalcDesigner')}</a>
</div>

<style>
  .panel {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: 24px;
    max-width: 560px;
  }
  .panel h3 {
    margin: 0 0 8px;
    font-size: 15px;
  }
  .panel p {
    margin: 0 0 16px;
    font-size: 13px;
    color: var(--ink-soft);
    line-height: 1.6;
  }
  .btn {
    display: inline-block;
    background: var(--navy);
    color: #fff;
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 700;
  }
</style>
