<script lang="ts">
  import { safetyFactor } from '$lib/stores/safetyFactor';
  import { toast } from '$lib/stores/toast';
  import { locale } from '$lib/stores/locale';
  import { t } from '$lib/i18n/dict';

  function handleChange(e: Event) {
    const raw = (e.target as HTMLInputElement).value;
    const num = parseFloat(raw);
    safetyFactor.set(isNaN(num) ? 0 : num);
  }

  function handleSave() {
    toast.notify(t($locale, 'settingsSaved'), 'success');
  }
</script>

<h1>{t($locale, 'settingsTitle')}</h1>

<div class="card">
  <div class="card-head">
    <h3>{t($locale, 'safetyFactorLabel')}</h3>
    <p>{t($locale, 'safetyFactorDesc')}</p>
  </div>
  <div class="card-body">
    <input type="text" inputmode="decimal" value={$safetyFactor} on:input={handleChange} class="sf-input" />
    <span class="sf-suffix">%</span>
  </div>
  <div class="card-foot">
    <button class="btn-save" on:click={handleSave}>💾 {t($locale, 'save')}</button>
  </div>
</div>

<div class="card muted-card">
  <h3>{t($locale, 'materialPrices')}</h3>
  <p>{t($locale, 'materialPricesStubDesc')}</p>
</div>

<style>
  h1 {
    margin: 0 0 16px;
  }
  .card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: 20px;
    margin-bottom: 16px;
  }
  .card-head h3 {
    margin: 0 0 4px;
    font-size: 15px;
  }
  .card-head p {
    margin: 0 0 14px;
    font-size: 12.5px;
    color: var(--ink-soft);
  }
  .card-body {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .sf-input {
    width: 100px;
    padding: 8px 10px;
    border: 1px solid var(--border);
    border-radius: 8px;
    font-family: var(--font-mono);
    font-size: 14px;
    text-align: center;
  }
  .sf-suffix {
    font-weight: 700;
    color: var(--ink-soft);
  }
  .card-foot {
    margin-top: 14px;
  }
  .btn-save {
    background: var(--navy);
    color: #fff;
    border: none;
    padding: 8px 18px;
    border-radius: 8px;
    font-weight: 700;
    cursor: pointer;
  }
  .muted-card {
    color: var(--ink-soft);
    font-size: 13px;
  }
  .muted-card h3 {
    color: var(--ink);
    font-size: 15px;
    margin: 0 0 6px;
  }
  .muted-card p {
    margin: 0;
  }
</style>
