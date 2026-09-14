<script lang="ts">
  // ==========================================================================
  //  CHAT THREAD — the customer/assigned-designer conversation for one
  //  customer_requests row. First use of Supabase Realtime in the app: new
  //  messages from the other party arrive over a postgres_changes
  //  subscription instead of a page refresh. Sending still inserts and
  //  appends locally too, so the sender's own message shows up instantly
  //  rather than waiting on the round-trip through Realtime.
  // ==========================================================================
  import { onMount, onDestroy, tick } from 'svelte';
  import type { RealtimeChannel } from '@supabase/supabase-js';
  import { supabase } from '$lib/supabaseClient';
  import { auth } from '$lib/stores/auth';
  import { locale } from '$lib/stores/locale';
  import { t } from '$lib/i18n/dict';
  import { toast } from '$lib/stores/toast';
  import type { ChatMessage } from '$lib/types';

  export let requestId: string;
  /** Whether the thread exists at all yet — false until Factory has assigned a designer. */
  export let enabled: boolean;
  /** Display name for messages that aren't mine. */
  export let otherPartyName: string;

  $: myId = $auth.session?.user.id;

  let messages: ChatMessage[] = [];
  let draft = '';
  let sending = false;
  let listEl: HTMLDivElement | undefined;
  let channel: RealtimeChannel | null = null;

  function timeOf(iso: string): string {
    return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  function scrollToBottom() {
    tick().then(() => {
      if (listEl) listEl.scrollTop = listEl.scrollHeight;
    });
  }

  function appendIfNew(row: ChatMessage) {
    if (messages.some((m) => m.id === row.id)) return;
    messages = [...messages, row];
    scrollToBottom();
  }

  async function load() {
    const { data, error } = await supabase.from('chat_messages').select('*').eq('request_id', requestId).order('created_at', { ascending: true });
    if (!error) messages = data || [];
    scrollToBottom();
  }

  onMount(() => {
    load();
    channel = supabase
      .channel(`chat:${requestId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `request_id=eq.${requestId}` }, (payload) => {
        appendIfNew(payload.new as ChatMessage);
      })
      .subscribe();
  });

  onDestroy(() => {
    if (channel) supabase.removeChannel(channel);
  });

  async function send() {
    const body = draft.trim();
    if (!body || !myId) return;
    sending = true;
    const { data, error } = await supabase.from('chat_messages').insert({ request_id: requestId, sender_id: myId, body }).select().single();
    sending = false;
    if (error) {
      toast.notify(error.message, 'error');
      return;
    }
    draft = '';
    if (data) appendIfNew(data as ChatMessage);
  }
</script>

<div class="chat">
  <div class="chat-head">{t($locale, 'chatTitle')}</div>

  {#if !enabled}
    <div class="chat-empty">{t($locale, 'chatAvailableAfterAssignment')}</div>
  {:else}
    <div class="chat-list" bind:this={listEl}>
      {#if messages.length === 0}
        <div class="chat-empty">{t($locale, 'noMessagesYet')}</div>
      {:else}
        {#each messages as m (m.id)}
          {@const mine = m.sender_id === myId}
          <div class="bubble-row" class:mine>
            <div class="bubble" class:mine>
              <div class="bubble-body">{m.body}</div>
              <div class="bubble-meta">{mine ? t($locale, 'youLabel') : otherPartyName} · {timeOf(m.created_at)}</div>
            </div>
          </div>
        {/each}
      {/if}
    </div>
    <form class="chat-input" on:submit|preventDefault={send}>
      <input type="text" dir="auto" placeholder={t($locale, 'chatMessagePlaceholder')} bind:value={draft} disabled={sending} />
      <button type="submit" disabled={sending || !draft.trim()}>{t($locale, 'sendBtn')}</button>
    </form>
  {/if}
</div>

<style>
  .chat {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .chat-head {
    padding: 12px 16px;
    font-size: 13px;
    font-weight: 700;
    border-bottom: 1px solid var(--border);
    background: var(--paper);
  }
  .chat-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 16px;
    max-height: 360px;
    overflow-y: auto;
  }
  .chat-empty {
    padding: 24px;
    text-align: center;
    color: var(--ink-soft);
    font-size: 12.5px;
  }
  .bubble-row {
    display: flex;
    justify-content: flex-start;
  }
  .bubble-row.mine {
    justify-content: flex-end;
  }
  .bubble {
    max-width: 75%;
    background: var(--paper);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 8px 12px;
  }
  .bubble.mine {
    background: var(--navy);
    color: #fff;
    border-color: var(--navy);
  }
  .bubble-body {
    font-size: 13px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .bubble-meta {
    margin-top: 4px;
    font-size: 10.5px;
    opacity: 0.7;
  }
  .chat-input {
    display: flex;
    gap: 8px;
    padding: 12px 16px;
    border-top: 1px solid var(--border);
  }
  .chat-input input {
    flex: 1;
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 9px 12px;
    font-size: 13px;
    background: var(--paper);
    color: var(--ink);
  }
  .chat-input button {
    background: var(--navy);
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 9px 18px;
    font-weight: 700;
    font-size: 13px;
    cursor: pointer;
  }
  .chat-input button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
