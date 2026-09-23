<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabaseClient';
  import { locale } from '$lib/stores/locale';
  import { t } from '$lib/i18n/dict';
  import logoUrl from '$lib/assets/logo.svg';

  type Problem = 'invalid' | 'missing_role' | 'short' | 'mismatch' | null;
  let checking = true;
  let saving = false;
  let ready = false;
  let finished = false;
  let problem: Problem = null;
  let serviceError = '';
  let invitedUserId = '';
  let invitedEmail = '';
  let password = '';
  let confirmation = '';

  onMount(async () => {
    // Supabase adds these query parameters when a link is expired or consumed.
    // Check them before considering a session already stored in this browser.
    const params = new URLSearchParams(window.location.search);
    if (params.has('error') || params.has('error_code')) {
      problem = 'invalid';
      checking = false;
      return;
    }

    // getUser waits for the client to process the invitation URL, and verifies
    // the resulting session with Supabase Auth instead of trusting URL data.
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      problem = 'invalid';
      checking = false;
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles').select('role').eq('id', user.id).single();
    if (profileError || !profile) {
      problem = 'missing_role';
      checking = false;
      return;
    }

    invitedUserId = user.id;
    invitedEmail = user.email ?? '';
    ready = true;
    checking = false;
  });

  async function savePassword() {
    problem = null;
    serviceError = '';
    if (password.length < 8) { problem = 'short'; return; }
    if (password !== confirmation) { problem = 'mismatch'; return; }

    saving = true;
    // A different account may have signed in while the form was open.
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || user?.id !== invitedUserId) {
      problem = 'invalid';
      ready = false;
      saving = false;
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    saving = false;
    if (error) {
      serviceError = error.message;
      return;
    }

    password = '';
    confirmation = '';
    ready = false;
    finished = true;
    await supabase.auth.signOut();
  }

  async function backToLogin() {
    await supabase.auth.signOut();
    goto('/login');
  }
</script>

<div class="invite-page">
  <div class="lang-switch">
    <button class:active={$locale === 'ar'} on:click={() => locale.set('ar')}>العربية</button>
    <button class:active={$locale === 'en'} on:click={() => locale.set('en')}>English</button>
  </div>
  <div class="card">
    <img class="logo" src={logoUrl} alt="SWB Technology" />
    <h1>{t($locale, 'acceptInviteHeading')}</h1>
    {#if checking}
      <p>{t($locale, 'loading')}</p>
    {:else if finished}
      <p role="status">{t($locale, 'invitePasswordSet')}</p>
      <button class="primary" on:click={backToLogin}>{t($locale, 'inviteBackToLogin')}</button>
    {:else if ready}
      <p>{t($locale, 'acceptInviteDescription')}</p>
      <p class="email" dir="ltr">{invitedEmail}</p>
      {#if problem || serviceError}
        <p class="error" role="alert">{problem === 'short' ? t($locale, 'invitePasswordShort') : problem === 'mismatch' ? t($locale, 'invitePasswordMismatch') : problem === 'invalid' ? t($locale, 'inviteInvalidLink') : serviceError}</p>
      {/if}
      <form on:submit|preventDefault={savePassword}>
        <label for="invite-password">{t($locale, 'invitePasswordLabel')}</label>
        <input id="invite-password" type="password" dir="ltr" autocomplete="new-password" minlength="8" bind:value={password} required />
        <label for="invite-confirm">{t($locale, 'inviteConfirmPasswordLabel')}</label>
        <input id="invite-confirm" type="password" dir="ltr" autocomplete="new-password" minlength="8" bind:value={confirmation} required />
        <button class="primary" type="submit" disabled={saving}>{saving ? t($locale, 'inviteSavingPassword') : t($locale, 'inviteSetPasswordButton')}</button>
      </form>
    {:else}
      <p class="error" role="alert">{problem === 'missing_role' ? t($locale, 'inviteMissingRole') : t($locale, 'inviteInvalidLink')}</p>
      <button class="primary" on:click={backToLogin}>{t($locale, 'inviteBackToLogin')}</button>
    {/if}
  </div>
</div>

<style>
  .invite-page{min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--paper);color:var(--ink);padding:24px;box-sizing:border-box}
  .lang-switch{position:absolute;top:20px;inset-inline-end:20px;display:flex;border:1px solid var(--border);border-radius:10px;overflow:hidden;background:var(--card)}
  .lang-switch button{border:0;background:transparent;color:var(--ink-soft);padding:9px 13px;cursor:pointer}.lang-switch button.active{background:var(--navy);color:#fff}
  .card{width:100%;max-width:420px;background:var(--card);border:1px solid var(--border);border-radius:14px;box-shadow:var(--shadow);padding:28px;display:flex;flex-direction:column;gap:14px}
  .logo{width:210px;max-width:100%;height:auto;align-self:center;background:#fff;border-radius:8px;padding:8px}
  h1{margin:2px 0 0;font-size:21px;text-align:center}p{margin:0;line-height:1.7;color:var(--ink-soft);text-align:center}.email{font-weight:700;color:var(--ink);overflow-wrap:anywhere}
  .error{color:var(--danger-deep)}form{display:flex;flex-direction:column;gap:9px}label{font-size:13px;font-weight:700}input{border:1px solid var(--border);border-radius:8px;padding:10px 12px;background:var(--paper);color:var(--ink);font:inherit}
  .primary{border:0;border-radius:8px;background:var(--navy);color:#fff;padding:11px 15px;font:inherit;font-weight:700;cursor:pointer;margin-top:7px}.primary:disabled{opacity:.6;cursor:not-allowed}
</style>
