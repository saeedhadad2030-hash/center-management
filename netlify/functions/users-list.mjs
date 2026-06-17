import { errorResponse, handleOptions, json, requireAdmin, toPublicUser } from './_shared.mjs';

export async function handler(event) {
  const options = handleOptions(event);
  if (options) return options;

  try {
    if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed.' });

    const { admin } = await requireAdmin(event);
    const { data: usersData, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (usersError) throw usersError;

    const ids = usersData.users.map(user => user.id);
    const { data: profiles, error: profilesError } = await admin
      .from('profiles')
      .select('id,name,role,teacher_id,is_active,created_at')
      .in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);
    if (profilesError) throw profilesError;

    const profileById = new Map((profiles || []).map(profile => [profile.id, profile]));
    return json(200, {
      users: usersData.users.map(user => toPublicUser(user, profileById.get(user.id))),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
