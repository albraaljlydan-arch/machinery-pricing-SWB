<script lang="ts">
  import { supabase } from '$lib/supabaseClient';
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

<div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#f8fafc;font-family:var(--font-en);padding:24px;box-sizing:border-box;">
  <div style="margin-bottom:28px;display:flex;flex-direction:column;align-items:center;">
    <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:14px 22px;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 16px rgba(0,0,0,0.08);">
      <img src={logoUrl} alt="SWB Logo" style="height:60px;width:auto;object-fit:contain;display:block;" />
    </div>
    <div style="margin-top:16px;font-size:22px;font-weight:700;color:#0f172a;letter-spacing:-0.3px;text-align:center;">
      SWB Manufacturing System
    </div>
  </div>

  <div style="max-width:400px;width:100%;padding:24px;border:1px solid #e0e0e0;border-radius:8px;background:#ffffff;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);box-sizing:border-box;">
    <h2 style="text-align:center;margin-bottom:20px;font-size:16px;color:#64748b;font-weight:600;">Sign in to your account</h2>

    {#if error}
      <div style="color:#d9534f;padding:10px;margin-bottom:15px;background:#fdf7f7;border:1px solid #d9534f;border-radius:4px;">{error}</div>
    {/if}

    <form on:submit|preventDefault={handleLogin}>
      <div style="margin-bottom:15px;">
        <label for="email" style="display:block;margin-bottom:5px;">Email Address</label>
        <input
          id="email"
          type="email"
          bind:value={email}
          required
          style="width:100%;padding:10px;box-sizing:border-box;border-radius:4px;border:1px solid #ccc;"
        />
      </div>
      <div style="margin-bottom:20px;">
        <label for="password" style="display:block;margin-bottom:5px;">Password</label>
        <input
          id="password"
          type="password"
          bind:value={password}
          required
          style="width:100%;padding:10px;box-sizing:border-box;border-radius:4px;border:1px solid #ccc;"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        style="width:100%;padding:12px;background:#0d6efd;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:bold;"
      >
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  </div>
</div>
