import { supabase } from './supabaseClient';

/** Subscribes to every insert/update/delete on `table` and calls `onChange`
 *  each time one happens — used by every dashboard layout to keep its
 *  sidebar badge counts (pending approvals, new requests...) live instead
 *  of frozen at whatever they were when the page first loaded. Returns an
 *  unsubscribe function to call from onDestroy.
 *
 *  Callers don't care WHAT changed, only THAT something did — they just
 *  re-run their own count query in response, so this stays a one-line,
 *  table-agnostic primitive rather than something that tries to interpret
 *  the payload. */
export function subscribeToTable(table: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(`badges:${table}:${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, onChange)
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
