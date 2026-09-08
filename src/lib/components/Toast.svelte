<script lang="ts">
  import { toast } from '$lib/stores/toast';
  import { locale } from '$lib/stores/locale';
  import { t } from '$lib/i18n/dict';
</script>

{#if $toast}
  {#key $toast.id}
    <div class="toast-wrap">
      <div class="toast" class:error={$toast.kind === 'error'} class:success={$toast.kind === 'success'}>
        {#if $toast.isUndo}
          <div class="toast-ring">
            <svg viewBox="0 0 36 36" class="ring-svg">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="3" />
              <!-- Driven by ONE continuous CSS animation over the exact
                   duration, not re-triggered every JS tick — that mismatch
                   (a 1s transition racing a 1s interval, always one step
                   behind) was exactly why the ring never matched the
                   number. The {#key} above forces this element to remount
                   (so the animation restarts from full) every time a new
                   countdown starts, even if one was already showing. -->
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                stroke="#f2a93b"
                stroke-width="3"
                stroke-linecap="round"
                stroke-dasharray="97.4"
                class="ring-progress"
                style="animation-duration: {$toast.totalSeconds}s;"
              />
            </svg>
            <span class="ring-num">{$toast.seconds}</span>
          </div>
        {:else}
          <span class="toast-icon">{$toast.kind === 'error' ? '⚠️' : $toast.kind === 'success' ? '✅' : 'ℹ️'}</span>
        {/if}
        <div class="toast-msg">{$toast.message}</div>
        {#if $toast.isUndo}
          <button class="toast-undo" on:click={() => toast.cancelUndo()}>{t($locale, 'toastUndo')}</button>
        {:else}
          <button class="toast-close" on:click={() => toast.dismiss()} aria-label={t($locale, 'toastClose')}>✕</button>
        {/if}
      </div>
    </div>
  {/key}
{/if}

<style>
  .toast-wrap {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 100000;
  }
  .toast {
    background: var(--navy, #0e2a3f);
    color: #eaf4f8;
    border-radius: 12px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
    padding: 12px 16px;
    display: flex;
    align-items: center;
    gap: 14px;
    min-width: 340px;
    max-width: 90vw;
    border: 1px solid var(--navy-3, #17456a);
  }
  .toast.error {
    border-color: var(--danger, #d9503a);
  }
  .toast.success {
    border-color: var(--success, #3f9463);
  }
  .toast-icon {
    font-size: 18px;
    flex-shrink: 0;
  }
  .toast-msg {
    flex: 1;
    font-size: 13.5px;
    font-weight: 600;
    line-height: 1.4;
  }
  .toast-ring {
    position: relative;
    width: 32px;
    height: 32px;
    flex-shrink: 0;
  }
  .ring-svg {
    width: 32px;
    height: 32px;
    transform: rotate(-90deg);
  }
  .ring-progress {
    animation-name: countdown-ring;
    animation-timing-function: linear;
    animation-fill-mode: forwards;
  }
  @keyframes countdown-ring {
    from {
      stroke-dashoffset: 0;
    }
    to {
      stroke-dashoffset: 97.4;
    }
  }
  .ring-num {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: 700;
    color: #f2a93b;
  }
  .toast-undo {
    background: var(--amber, #f2a93b);
    color: #1b1103;
    border: none;
    padding: 7px 14px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 12.5px;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .toast-close {
    background: transparent;
    border: none;
    color: #8fb0bd;
    font-size: 14px;
    cursor: pointer;
    flex-shrink: 0;
    padding: 2px 4px;
  }
  .toast-close:hover {
    color: #fff;
  }
</style>
