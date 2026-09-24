<script lang="ts">
  // ==========================================================================
  //  SETTINGS — one screen shared by every role (mounted at /<role>/settings
  //  inside that role's AppShell). It replaces the email chip and sign-out
  //  button that used to sit in the topbar: account details, password change,
  //  language/appearance, and signing out all live here now.
  // ==========================================================================
  import { supabase } from '$lib/supabaseClient';
  import { auth } from '$lib/stores/auth';
  import { locale, type Locale } from '$lib/stores/locale';
  import { theme, type Theme } from '$lib/stores/theme';
  import { toast } from '$lib/stores/toast';
  import { t, roleLabel } from '$lib/i18n/dict';
  import { formatDate } from '$lib/calc/formatDate';
  import { initialsOf } from '$lib/initials';

  const MIN_PASSWORD = 8;

  $: user = $auth.session?.user;
  $: email = user?.email ?? '';
  $: displayName = $auth.fullName || email;
  $: initials = initialsOf($auth.fullName, email);

  // ---- password change ----------------------------------------------------
  let currentPassword = '';
  let newPassword = '';
  let confirmPassword = '';
  let showPasswords = false;
  let changing = false;
  let passwordError = '';

  async function changePassword() {
    passwordError = '';
    if (newPassword.length < MIN_PASSWORD) { passwordError = t($locale, 'settingsErrShort'); return; }
    if (newPassword !== confirmPassword) { passwordError = t($locale, 'settingsErrMismatch'); return; }
    if (newPassword === currentPassword) { passwordError = t($locale, 'settingsErrSame'); return; }
    if (!email) return;

    changing = true;
    // Re-checking the current password means an unattended, signed-in screen
    // is not enough to take over the account. Signing in again as the same
    // user only refreshes this session; the auth store keeps its state.
    const { error: verifyError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
    if (verifyError) {
      changing = false;
      passwordError = verifyError.code === 'invalid_credentials'
        ? t($locale, 'settingsErrCurrent')
        : t($locale, 'settingsErrGeneric') + verifyError.message;
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    changing = false;
    if (error) {
      passwordError = error.code === 'same_password'
        ? t($locale, 'settingsErrSame')
        : t($locale, 'settingsErrGeneric') + error.message;
      return;
    }
    currentPassword = '';
    newPassword = '';
    confirmPassword = '';
    showPasswords = false;
    toast.notify(t($locale, 'settingsPasswordChanged'), 'success');
  }

  // ---- preferences ----------------------------------------------------------
  const LANGUAGES: { value: Locale; label: string }[] = [
    { value: 'ar', label: 'العربية' },
    { value: 'en', label: 'English' },
  ];
  $: themes = [
    { value: 'light' as Theme, label: t($locale, 'settingsThemeLight') },
    { value: 'dark' as Theme, label: t($locale, 'settingsThemeDark') },
  ];

  // ---- session --------------------------------------------------------------
  let confirmingGlobal = false;
  let signingOut = false;

  async function signOut(scope: 'local' | 'global') {
    signingOut = true;
    // The root layout's guard sends the user to /login once the session ends.
    await supabase.auth.signOut({ scope });
    signingOut = false;
  }
</script>

<div class="settings">
  <section class="profile card">
    <div class="avatar" aria-hidden="true">{initials}</div>
    <div class="profile-text">
      <h2 dir="auto">{displayName}</h2>
      <p dir="ltr">{email}</p>
    </div>
    <span class="role-pill">{roleLabel($locale, $auth.userRole)}</span>
  </section>

  <section class="card">
    <header>
      <h3>{t($locale, 'settingsAccountSection')}</h3>
      <!-- Customers register themselves; only staff details come from Factory. -->
      {#if $auth.userRole !== 'customer'}<p>{t($locale, 'settingsAccountHint')}</p>{/if}
    </header>
    <dl class="facts">
      <div><dt>{t($locale, 'settingsFullName')}</dt><dd dir="auto">{$auth.fullName || '—'}</dd></div>
      <div><dt>{t($locale, 'settingsEmail')}</dt><dd dir="ltr">{email || '—'}</dd></div>
      <div><dt>{t($locale, 'settingsRole')}</dt><dd>{roleLabel($locale, $auth.userRole) || '—'}</dd></div>
      <div><dt>{t($locale, 'settingsMemberSince')}</dt><dd class="num">{user?.created_at ? formatDate(user.created_at) : '—'}</dd></div>
      <div><dt>{t($locale, 'settingsLastSignIn')}</dt><dd class="num">{user?.last_sign_in_at ? formatDate(user.last_sign_in_at) : '—'}</dd></div>
    </dl>
  </section>

  <section class="card">
    <header>
      <h3>{t($locale, 'settingsSecuritySection')}</h3>
      <p>{t($locale, 'settingsSecurityHint')}</p>
    </header>
    <form class="password-form" on:submit|preventDefault={changePassword}>
      <!-- Lets password managers pair the new password with this account. -->
      <input class="visually-hidden" type="email" autocomplete="username" value={email} readonly tabindex="-1" aria-hidden="true" />
      <label>
        <span>{t($locale, 'settingsCurrentPassword')}</span>
        <input type={showPasswords ? 'text' : 'password'} dir="ltr" autocomplete="current-password" bind:value={currentPassword} required />
      </label>
      <div class="pair">
        <label>
          <span>{t($locale, 'settingsNewPassword')}</span>
          <input type={showPasswords ? 'text' : 'password'} dir="ltr" autocomplete="new-password" minlength={MIN_PASSWORD} bind:value={newPassword} required />
          <small class:ok={newPassword.length >= MIN_PASSWORD}>{t($locale, 'settingsPasswordRule')}</small>
        </label>
        <label>
          <span>{t($locale, 'settingsConfirmPassword')}</span>
          <input type={showPasswords ? 'text' : 'password'} dir="ltr" autocomplete="new-password" minlength={MIN_PASSWORD} bind:value={confirmPassword} required />
        </label>
      </div>
      {#if passwordError}<p class="form-error" role="alert">{passwordError}</p>{/if}
      <div class="form-actions">
        <button type="button" class="btn ghost" on:click={() => (showPasswords = !showPasswords)} aria-pressed={showPasswords}>
          {showPasswords ? t($locale, 'settingsHidePassword') : t($locale, 'settingsShowPassword')}
        </button>
        <button type="submit" class="btn primary" disabled={changing || !currentPassword || !newPassword || !confirmPassword}>
          {changing ? t($locale, 'settingsChangingPassword') : t($locale, 'settingsChangePasswordBtn')}
        </button>
      </div>
    </form>
  </section>

  <section class="card">
    <header><h3>{t($locale, 'settingsPreferencesSection')}</h3></header>
    <div class="pref-row">
      <span class="pref-label">{t($locale, 'settingsLanguage')}</span>
      <div class="segmented" role="radiogroup" aria-label={t($locale, 'settingsLanguage')}>
        {#each LANGUAGES as lang}
          <button type="button" role="radio" aria-checked={$locale === lang.value} class:active={$locale === lang.value} on:click={() => locale.set(lang.value)}>{lang.label}</button>
        {/each}
      </div>
    </div>
    <div class="pref-row">
      <span class="pref-label">{t($locale, 'settingsTheme')}</span>
      <div class="segmented" role="radiogroup" aria-label={t($locale, 'settingsTheme')}>
        {#each themes as option}
          <button type="button" role="radio" aria-checked={$theme === option.value} class:active={$theme === option.value} on:click={() => theme.set(option.value)}>{option.label}</button>
        {/each}
      </div>
    </div>
  </section>

  <section class="card">
    <header>
      <h3>{t($locale, 'settingsSessionSection')}</h3>
      <p>{t($locale, 'settingsSessionHint')}</p>
    </header>
    {#if confirmingGlobal}
      <div class="confirm-box" role="alertdialog" aria-label={t($locale, 'settingsSignOutAll')}>
        <p>{t($locale, 'settingsSignOutAllConfirm')}</p>
        <div class="form-actions">
          <button type="button" class="btn ghost" on:click={() => (confirmingGlobal = false)} disabled={signingOut}>{t($locale, 'cancelBtn')}</button>
          <button type="button" class="btn danger" on:click={() => signOut('global')} disabled={signingOut}>{t($locale, 'settingsSignOutAll')}</button>
        </div>
      </div>
    {:else}
      <div class="form-actions start">
        <button type="button" class="btn danger" on:click={() => signOut('local')} disabled={signingOut}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5M21 12H9" /></svg>
          {t($locale, 'signOut')}
        </button>
        <button type="button" class="btn ghost" on:click={() => (confirmingGlobal = true)} disabled={signingOut}>{t($locale, 'settingsSignOutAll')}</button>
      </div>
    {/if}
  </section>
</div>

<style>
  .settings {
    display: flex;
    flex-direction: column;
    gap: 18px;
    width: 100%;
    max-width: 760px;
  }
  .card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: 20px 22px;
  }
  .card header {
    margin-bottom: 16px;
  }
  .card h3 {
    margin: 0;
    font-size: 15px;
    font-weight: 800;
    color: var(--ink);
  }
  .card header p {
    margin: 5px 0 0;
    font-size: 12.5px;
    line-height: 1.7;
    color: var(--ink-soft);
  }

  .profile {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .avatar {
    width: 58px;
    height: 58px;
    border-radius: 50%;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(155deg, var(--navy-3), var(--navy));
    color: #eaf4f8;
    font-size: 20px;
    font-weight: 800;
  }
  .profile-text {
    min-width: 0;
    flex: 1;
  }
  .profile-text h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 900;
    color: var(--ink);
    overflow-wrap: anywhere;
  }
  .profile-text p {
    margin: 3px 0 0;
    font-size: 12.5px;
    color: var(--ink-soft);
    font-family: var(--font-num);
    text-align: start;
    overflow-wrap: anywhere;
  }
  .role-pill {
    flex-shrink: 0;
    padding: 4px 11px;
    border-radius: 20px;
    border: 1px solid color-mix(in srgb, var(--navy-3) 30%, var(--border));
    color: var(--navy-3);
    font-size: 11.5px;
    font-weight: 800;
  }

  .facts {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin: 0;
  }
  .facts div {
    padding: 11px 13px;
    border-radius: 9px;
    background: var(--paper);
    border: 1px solid var(--border);
    min-width: 0;
  }
  .facts dt {
    font-size: 11px;
    font-weight: 700;
    color: var(--steel-2);
    margin-bottom: 4px;
  }
  .facts dd {
    margin: 0;
    font-size: 13.5px;
    font-weight: 700;
    color: var(--ink);
    overflow-wrap: anywhere;
  }
  .facts dd[dir='ltr'] {
    text-align: start;
  }
  .num {
    font-family: var(--font-num);
    font-variant-numeric: tabular-nums;
  }

  .password-form {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .pair {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 12.5px;
    font-weight: 700;
    color: var(--ink);
  }
  input {
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 10px 12px;
    background: var(--paper);
    color: var(--ink);
    font: inherit;
    font-weight: 400;
  }
  input:focus-visible {
    outline: 2px solid var(--navy-3);
    outline-offset: 1px;
  }
  label small {
    font-size: 11px;
    font-weight: 500;
    color: var(--ink-soft);
  }
  label small.ok {
    color: var(--success);
  }
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    border: 0;
  }
  .form-error {
    margin: 0;
    padding: 9px 12px;
    border-radius: 8px;
    background: var(--danger-bg);
    color: var(--danger-deep);
    font-size: 12.5px;
    font-weight: 600;
  }
  .form-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: flex-end;
  }
  .form-actions.start {
    justify-content: flex-start;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    border-radius: 8px;
    padding: 9px 16px;
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    border: 1px solid transparent;
    transition: opacity 0.15s ease, background 0.15s ease;
  }
  .btn svg {
    width: 16px;
    height: 16px;
  }
  .btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  .btn.primary {
    background: var(--navy);
    color: #fff;
  }
  .btn.ghost {
    background: transparent;
    border-color: var(--border);
    color: var(--ink-soft);
  }
  .btn.ghost:hover:not(:disabled) {
    background: var(--paper);
    color: var(--ink);
  }
  .btn.danger {
    background: var(--danger-bg);
    border-color: color-mix(in srgb, var(--danger) 35%, transparent);
    color: var(--danger-deep);
  }
  .btn.danger:hover:not(:disabled) {
    background: var(--danger);
    color: #fff;
  }

  .pref-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 0;
    border-top: 1px solid var(--border);
  }
  .pref-row:first-of-type {
    border-top: none;
    padding-top: 0;
  }
  .pref-label {
    font-size: 13.5px;
    font-weight: 700;
    color: var(--ink);
  }
  .segmented {
    display: flex;
    border: 1px solid var(--border);
    border-radius: 10px;
    overflow: hidden;
    background: var(--paper);
  }
  .segmented button {
    border: none;
    background: transparent;
    color: var(--ink-soft);
    font: inherit;
    font-size: 12.5px;
    font-weight: 700;
    padding: 8px 16px;
    cursor: pointer;
  }
  .segmented button.active {
    background: var(--navy);
    color: #fff;
  }

  .confirm-box {
    padding: 14px;
    border-radius: 9px;
    border: 1px solid color-mix(in srgb, var(--danger) 35%, var(--border));
    background: var(--danger-bg);
  }
  .confirm-box p {
    margin: 0 0 12px;
    font-size: 13px;
    font-weight: 600;
    color: var(--danger-deep);
  }

  :global(html[data-theme='dark']) .settings .form-error,
  :global(html[data-theme='dark']) .settings .confirm-box p,
  :global(html[data-theme='dark']) .settings .btn.danger {
    color: #ffb4b4;
  }
  :global(html[data-theme='dark']) .settings .form-error,
  :global(html[data-theme='dark']) .settings .confirm-box,
  :global(html[data-theme='dark']) .settings .btn.danger {
    background: color-mix(in srgb, var(--danger) 16%, transparent);
  }

  @media (max-width: 640px) {
    .card {
      padding: 16px;
    }
    .facts,
    .pair {
      grid-template-columns: 1fr;
    }
    .profile {
      flex-wrap: wrap;
    }
    .pref-row {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
