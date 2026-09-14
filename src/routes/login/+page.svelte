<script lang="ts">
  // ==========================================================================
  //  SIGN-IN — the one screen everybody sees first, and the last one that was
  //  still hardcoded: English-only labels, a fixed light background, inline
  //  styles, and a stray Bootstrap blue button that belonged to no palette in
  //  this app. It now goes through the dictionary and the design tokens like
  //  every other screen, and carries its own language switch because there is
  //  no AppShell here to provide one.
  // ==========================================================================
  import { supabase } from '$lib/supabaseClient';
  import { locale } from '$lib/stores/locale';
  import { t } from '$lib/i18n/dict';
  import logoUrl from '$lib/assets/logo.svg';

  let email = '';
  let password = '';
  let loading = false;
  let error: string | null = null;

  async function handleLogin() {
    loading = true;
    error = null;
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      error = signInError.message;
    }
    // On success, the root layout's reactive redirect takes over once the
    // auth store resolves the role — no explicit navigation needed here.
    loading = false;
  }
</script>

<div class="login-page">
  <div class="lang-switch">
    <button class:active={$locale === 'ar'} on:click={() => locale.set('ar')}>العربية</button>
    <button class:active={$locale === 'en'} on:click={() => locale.set('en')}>English</button>
  </div>

  <div class="brand">
    <div class="logo-card"><img src={logoUrl} alt="SWB Technology" /></div>
    <div class="brand-name">SWB Manufacturing System</div>
  </div>

  <div class="card">
    <h2>{t($locale, 'loginHeading')}</h2>

    {#if error}
      <div class="error" role="alert">{error}</div>
    {/if}

    <form on:submit|preventDefault={handleLogin}>
      <label for="email">{t($locale, 'loginEmailLabel')}</label>
      <!-- dir="ltr" on both fields: an email address and a password are
           always Latin, and typing them into an RTL input puts the caret and
           any punctuation on the wrong side. -->
      <input id="email" type="email" dir="ltr" autocomplete="username" bind:value={email} required />

      <label for="password">{t($locale, 'loginPasswordLabel')}</label>
      <input id="password" type="password" dir="ltr" autocomplete="current-password" bind:value={password} required />

      <button class="submit" type="submit" disabled={loading}>
        {loading ? t($locale, 'loginSubmitting') : t($locale, 'loginSubmit')}
      </button>
    </form>

    <a class="switch-link" href="/signup">{t($locale, 'loginNoAccountLink')}</a>
  </div>
</div>

<style>
  .login-page {
    position: relative;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 26px;
    background: var(--paper);
    color: var(--ink);
    padding: 24px;
    box-sizing: border-box;
  }

  .lang-switch {
    position: absolute;
    top: 20px;
    inset-inline-end: 20px;
    display: flex;
    border: 1px solid var(--border);
    border-radius: 10px;
    overflow: hidden;
    background: var(--card);
  }
  .lang-switch button {
    border: none;
    background: transparent;
    color: var(--ink-soft);
    font-family: inherit;
    font-size: 12.5px;
    font-weight: 700;
    padding: 8px 12px;
  }
  .lang-switch button.active {
    background: var(--navy);
    color: #fff;
  }

  .brand {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }
  .logo-card {
    /* Stays white in both themes on purpose: the logo artwork is a dark mark
       with no light variant, so it needs a light plate behind it. */
    background: #ffffff;
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 14px 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--shadow);
  }
  .logo-card img {
    height: 60px;
    width: auto;
    object-fit: contain;
    display: block;
  }
  .brand-name {
    font-family: var(--font-en);
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.3px;
    text-align: center;
  }

  .card {
    width: 100%;
    max-width: 400px;
    box-sizing: border-box;
    padding: 24px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--card);
    box-shadow: var(--shadow);
  }
  .card h2 {
    margin: 0 0 20px;
    text-align: center;
    font-size: 16px;
    font-weight: 600;
    color: var(--ink-soft);
  }
  .error {
    background: var(--danger-bg);
    color: var(--danger-deep);
    border: 1px solid color-mix(in srgb, var(--danger-deep) 40%, transparent);
    border-radius: 8px;
    padding: 10px 12px;
    margin-bottom: 15px;
    font-size: 12.5px;
  }
  label {
    display: block;
    margin-bottom: 6px;
    font-size: 12.5px;
    font-weight: 600;
    color: var(--ink-soft);
  }
  input {
    width: 100%;
    box-sizing: border-box;
    padding: 10px 12px;
    margin-bottom: 16px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--paper);
    color: var(--ink);
    font-family: var(--font-en);
    font-size: 14px;
    outline: none;
  }
  input:focus {
    border-color: var(--navy-3);
  }
  .submit {
    width: 100%;
    padding: 12px;
    background: var(--navy);
    color: #fff;
    border: none;
    border-radius: 8px;
    font-family: inherit;
    font-weight: 700;
    font-size: 14px;
    cursor: pointer;
  }
  .submit:hover:not(:disabled) {
    background: var(--navy-3);
  }
  .submit:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .switch-link {
    display: block;
    text-align: center;
    margin-top: 16px;
    font-size: 12.5px;
    font-weight: 600;
    color: var(--navy-3);
  }
</style>
