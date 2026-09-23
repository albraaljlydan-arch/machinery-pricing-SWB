import { authenticatedStaff, corsHeaders, createAdminClient, respond } from '../_shared/staffAuth.ts';

// Factory may invite operational accounts only. Privileged roles are provisioned by Admin.
const CREATABLE_ROLES = new Set(['designer', 'factory', 'procurement', 'accounting', 'followup']);
const DEFAULT_INVITE_REDIRECT = 'https://swbmanufacturing.albaraaljolidan.workers.dev/accept-invite';

function inviteRedirectUrl(): string {
  const url = new URL(Deno.env.get('STAFF_INVITE_REDIRECT_URL') ?? DEFAULT_INVITE_REDIRECT);
  if (url.protocol !== 'https:' || url.pathname !== '/accept-invite' || url.search || url.hash) {
    throw new Error('Invalid STAFF_INVITE_REDIRECT_URL');
  }
  return url.toString();
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (request.method !== 'POST') return respond(405, { error: 'Method not allowed' });

  try {
    const admin = createAdminClient();
    const actor = await authenticatedStaff(request, admin);
    if (!actor) return respond(401, { error: 'Sign in required' });
    if (actor.role !== 'factory' && actor.role !== 'developer') {
      return respond(403, { error: 'You cannot create staff accounts' });
    }

    const input = await request.json();
    const fullName = typeof input?.full_name === 'string' ? input.full_name.trim() : '';
    const email = typeof input?.email === 'string' ? input.email.trim().toLowerCase() : '';
    const role = typeof input?.role === 'string' ? input.role : '';
    if (!fullName || fullName.length > 120 || !/^\S+@\S+\.\S+$/.test(email) || email.length > 254 || !CREATABLE_ROLES.has(role)) {
      return respond(400, { error: 'Invalid staff account details or role' });
    }

    const { data, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName },
      redirectTo: inviteRedirectUrl(),
    });
    if (inviteError || !data.user) {
      return respond(400, { error: inviteError?.message ?? 'Could not send invitation' });
    }

    // A previously invited account may already have a profile. A repeated
    // invitation must never let Factory overwrite an existing role.
    const { data: existingProfile, error: lookupError } = await admin.from('profiles')
      .select('role').eq('id', data.user.id).maybeSingle();
    if (lookupError) {
      console.error('Could not inspect invited staff profile', lookupError);
      return respond(500, { error: 'Invitation sent but staff profile could not be checked' });
    }
    if (existingProfile) {
      if (existingProfile.role !== role) return respond(409, { error: 'This account already has a different role' });
      return respond(200, { id: data.user.id, invited: true });
    }

    const { error: profileError } = await admin.from('profiles').insert({
      id: data.user.id,
      full_name: fullName,
      role,
    });
    if (profileError) {
      // Do not delete Auth here: this may be a re-invite of an existing
      // unconfirmed user. With no profile the account has no app permissions.
      console.error('Invitation sent but staff profile insert failed', profileError);
      return respond(500, { error: 'Invitation sent but staff profile could not be created' });
    }
    return respond(200, { id: data.user.id, invited: true });
  } catch (error) {
    console.error('create-user invitation failed', error);
    return respond(500, { error: 'Could not send invitation' });
  }
});
