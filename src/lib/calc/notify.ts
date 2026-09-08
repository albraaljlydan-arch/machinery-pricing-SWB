import { supabase } from '$lib/supabaseClient';

export async function notifyUser(userId: string, message: string, link?: string): Promise<void> {
  await supabase.from('notifications').insert({ user_id: userId, message, link });
}

/** Notifies every user currently holding the given role — e.g. every
 *  Admin, or every Procurement account. Used whenever the recipient isn't
 *  one specific known person (like the project's own designer) but
 *  "whoever holds this job". */
export async function notifyRole(role: string, message: string, link?: string): Promise<void> {
  const { data, error } = await supabase.from('profiles').select('id').eq('role', role);
  if (error || !data || data.length === 0) return;
  await supabase.from('notifications').insert(data.map((p) => ({ user_id: p.id, message, link })));
}
