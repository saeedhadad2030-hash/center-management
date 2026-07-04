import { errorResponse, handleOptions, requireAdmin, setCorsHeaders, toPublicUser } from './_shared.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCorsHeaders(res);

  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });

    const { admin } = await requireAdmin(req);
    const { data: usersData, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (usersError) throw usersError;

    const ids = usersData.users.map(user => user.id);
    const { data: profiles, error: profilesError } = await admin
      .from('profiles')
      .select('id,name,role,teacher_id,is_active,created_at')
      .in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);
    if (profilesError) throw profilesError;

    const profileById = new Map((profiles || []).map(profile => [profile.id, profile]));
    return res.status(200).json({
      users: usersData.users.map(user => toPublicUser(user, profileById.get(user.id))),
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}
