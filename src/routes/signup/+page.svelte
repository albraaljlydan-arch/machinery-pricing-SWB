<script lang="ts">
  // ==========================================================================
  //  CUSTOMER SELF-REGISTRATION — the only self-signup screen in the app.
  //  Every staff role (designer/admin/factory/...) is still created by
  //  Factory via the create-user function; this screen exists solely so an
  //  external customer can open an account without staff involvement. The
  //  profiles row itself isn't inserted here — it's created the first time
  //  the resulting session resolves (see lib/stores/auth.ts), which also
  //  covers the case where Supabase requires email confirmation before a
  //  session exists.
  // ==========================================================================
  import { supabase } from '$lib/supabaseClient';
  import { locale } from '$lib/stores/locale';
  import { t } from '$lib/i18n/dict';
  import logoUrl from '$lib/assets/logo.svg';

  let fullName = '';
  let companyName = '';
  let phone = '';
  let email = '';
  let password = '';
  let loading = false;
  let error: string | null = null;
  let checkEmailNotice = false;

  async function handleSignup() {
    loading = true;
    error = null;
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role: 'customer', full_name: fullName.trim(), company_name: companyName.trim() || null, phone: phone.trim() || null } },
    });
    loading = false;
    if (signUpError) {
      error = signUpError.message;
      return;
    }
    // With a session, the root layout's auth store resolves the role (and
    // creates the profiles row) and redirects on its own — no navigation
    // needed here. Without one, email confirmation is required first.
    if (!data.session) checkEmailNotice = true;
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
    <h2>{t($locale, 'signupHeading')}</h2>

    {#if checkEmailNotice}
      <div class="notice" role="status">{t($locale, 'signupCheckEmailNotice')}</div>
    {:else}
      {#if error}
        <div class="error" role="alert">{t($locale, 'signupErrorPrefix')}{error}</div>
      {/if}

      <form on:submit|preventDefault={handleSignup}>
        <label for="fullName">{t($locale, 'signupFullNameLabel')}</label>
        <input id="fullName" type="text" dir="auto" bind:value={fullName} required />

        <label for="companyName">{t($locale, 'signupCompanyLabel')}</label>
        <input id="companyName" type="text" dir="auto" bind:value={companyName} />

        <label for="phone">{t($locale, 'signupPhoneLabel')}</label>
        <input id="phone" type="tel" dir="ltr" bind:value={phone} required />
        <small class="field-hint">{t($locale, 'signupPhoneHint')}</small>

        <label for="email">{t($locale, 'loginEmailLabel')}</label>
        <input id="email" type="email" dir="ltr" autocomplete="username" bind:value={email} required />

        <label for="password">{t($locale, 'loginPasswordLabel')}</label>
        <input id="password" type="password" dir="ltr" autocomplete="new-password" minlength="6" bind:value={password} required />

        <button class="submit" type="submit" disabled={loading}>
          {loading ? t($locale, 'signupSubmitting') : t($locale, 'signupSubmit')}
        </button>
      </form>
    {/if}

    <a class="switch-link" href="/login">{t($locale, 'signupHaveAccountLink')}</a>
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
  .notice {
    background: var(--paper);
    color: var(--ink);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 12px 14px;
    font-size: 13px;
    line-height: 1.6;
    text-align: center;
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
  .field-hint {
    display: block;
    margin: -12px 0 16px;
    font-size: 11.5px;
    color: var(--ink-soft);
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
