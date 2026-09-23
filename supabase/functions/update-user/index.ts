import { authenticatedStaff, corsHeaders, createAdminClient, respond } from '../_shared/staffAuth.ts';

const STAFF_ROLES = new Set(['designer', 'admin', 'factory', 'procurement', 'accounting', 'developer', 'followup']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (request.method !== 'POST') return respond(405, { error: 'Method not allowed' });

  try {
    const admin = createAdminClient();
    const actor = await authenticatedStaff(request, admin);
    if (!actor) return respond(401, { error: 'Sign in required' });
    // A Factory user must not use this endpoint to promote an existing account.
    if (actor.role !== 'admin' && actor.role !== 'developer') {
      return respond(403, { error: 'Only Admin can edit staff accounts' });
    }

    const input = await request.json();
    const userId = typeof input?.user_id === 'string' ? input.user_id : '';
    const fullName = typeof input?.full_name === 'string' ? input.full_name.trim() : '';
    const role = typeof input?.role === 'string' ? input.role : '';
    const email = typeof input?.email === 'string' ? input.email.trim().toLowerCase() : '';
    const password = typeof input?.password === 'string' ? input.password : '';
    if (!UUID.test(userId) || !fullName || fullName.length > 120 || !STAFF_ROLES.has(role)
      || (email && (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254))
      || (password && password.length < 6)) {
      return respond(400, { error: 'Invalid staff account details or role' });
    }

    const { data: existing, error: lookupError } = await admin.from('profiles')
      .select('id').eq('id', userId).single();
    if (lookupError || !existing) return respond(404, { error: 'Staff account not found' });

    const authChanges: { email?: string; password?: string } = {};
    if (email) authChanges.email = email;
    if (password) authChanges.password = password;
    if (Object.keys(authChanges).length > 0) {
      const { error: authError } = await admin.auth.admin.updateUserById(userId, authChanges);
      if (authError) return respond(400, { error: authError.message });
    }

    const { error: profileError } = await admin.from('profiles')
      .update({ full_name: fullName, role }).eq('id', userId);
    if (profileError) {
      console.error('Could not update staff profile', profileError);
      return respond(500, { error: 'Could not update staff profile' });
    }
    return respond(200, { id: userId });
  } catch (error) {
    console.error('update-user failed', error);
    return respond(500, { error: 'Could not update account' });
  }
});
