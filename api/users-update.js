import { errorResponse, handleOptions, normalizeRole, normalizeTeacherId, readBody, requireAdmin, setCorsHeaders, toPublicUser } from './_shared.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCorsHeaders(res);

  try {
    if (req.method !== 'POST' && req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed.' });

    const { admin, authUser } = await requireAdmin(req);
    const body = await readBody(req);
    const id = String(body.id || '').trim();
    if (!id) return res.status(400).json({ error: 'User id is required.' });

    const role = normalizeRole(body.role || 'employee');
    const isActive = body.is_active !== false;
    if (id === authUser.id && (!isActive || role !== 'admin')) {
      return res.status(400).json({ error: 'You cannot disable yourself or remove your own admin role.' });
    }

    const authUpdates = {};
    if (body.email) authUpdates.email = String(body.email).trim().toLowerCase();
    if (body.password) authUpdates.password = String(body.password);
    if (body.name) authUpdates.user_metadata = { name: String(body.name).trim() };

    let updatedAuthUser = null;
    if (Object.keys(authUpdates).length > 0) {
      const { data, error } = await admin.auth.admin.updateUserById(id, authUpdates);
      if (error) throw error;
      updatedAuthUser = data.user;
    } else {
      const { data, error } = await admin.auth.admin.getUserById(id);
      if (error) throw error;
      updatedAuthUser = data.user;
    }

    const profileUpdates = {
      name: String(body.name || '').trim(),
      role,
      teacher_id: normalizeTeacherId(role, body.teacher_id),
      is_active: isActive,
    };

    if (!profileUpdates.name) return res.status(400).json({ error: 'Name is required.' });

    const { data: profileData, error: profileError } = await admin
      .from('profiles')
      .update(profileUpdates)
      .eq('id', id)
      .select('id,name,role,teacher_id,is_active,created_at')
      .single();
    if (profileError) throw profileError;

    return res.status(200).json({ user: toPublicUser(updatedAuthUser, profileData) });
  } catch (error) {
    return errorResponse(res, error);
  }
}
