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
  import { theme } from '$lib/stores/theme';
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
  <!-- Pinned to the physical left and laid out LTR so the controls never
       jump sides when the language flips the page direction. -->
  <div class="corner-controls" dir="ltr">
    <div class="lang-switch">
      <button class:active={$locale === 'ar'} on:click={() => locale.set('ar')}>العربية</button>
      <button class:active={$locale === 'en'} on:click={() => locale.set('en')}>English</button>
    </div>
    <button class="theme-btn" on:click={() => theme.set($theme === 'light' ? 'dark' : 'light')} aria-label={$theme === 'light' ? t($locale, 'darkMode') : t($locale, 'lightMode')} title={$theme === 'light' ? t($locale, 'darkMode') : t($locale, 'lightMode')}>
      {#if $theme === 'light'}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" /></svg>
      {:else}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
      {/if}
    </button>
  </div>

  <div class="brand">
    <img class="logo" src={logoUrl} alt="SWB Technology" />
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

  .corner-controls {
    position: fixed;
    top: 20px;
    left: 20px;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .theme-btn {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--border);
    background: var(--card);
    color: var(--ink-soft);
    cursor: pointer;
    transition: color 0.15s ease, transform 0.15s ease;
  }
  .theme-btn:hover {
    color: var(--navy-3);
    transform: translateY(-1px);
  }
  .theme-btn svg {
    width: 18px;
    height: 18px;
  }
  .lang-switch {
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
  .logo {
    display: block;
    width: min(360px, 80vw);
    height: auto;
  }
  /* Same treatment as the sidebar logo: the mark is dark navy, so it is
     lifted in dark mode instead of sitting on a white plate. */
  :global(html[data-theme='dark']) .logo {
    filter: brightness(1.7);
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
