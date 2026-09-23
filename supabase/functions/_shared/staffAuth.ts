import { createClient } from 'npm:@supabase/supabase-js@2.112.4';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function respond(status: number, payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export function createAdminClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Supabase Edge Function secrets are missing');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function authenticatedStaff(
  request: Request,
  admin: ReturnType<typeof createAdminClient>,
): Promise<{ id: string; role: string } | null> {
  const match = /^Bearer\s+(.+)$/i.exec(request.headers.get('authorization') ?? '');
  if (!match) return null;
  // getUser verifies the JWT with Supabase Auth; user_metadata is never used for authorization.
  const { data: { user }, error: authError } = await admin.auth.getUser(match[1]);
  if (authError || !user) return null;
  const { data: profile, error: profileError } = await admin
    .from('profiles').select('role').eq('id', user.id).single();
  if (profileError || !profile) return null;
  return { id: user.id, role: profile.role };
}
