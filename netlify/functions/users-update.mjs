import { errorResponse, handleOptions, json, normalizeRole, normalizeTeacherId, readJson, requireAdmin, toPublicUser } from './_shared.mjs';

export async function handler(event) {
  const options = handleOptions(event);
  if (options) return options;

  try {
    if (event.httpMethod !== 'POST' && event.httpMethod !== 'PUT') return json(405, { error: 'Method not allowed.' });

    const { admin, authUser } = await requireAdmin(event);
    const body = await readJson(event);
    const id = String(body.id || '').trim();
    if (!id) return json(400, { error: 'User id is required.' });

    const role = normalizeRole(body.role || 'employee');
    const isActive = body.is_active !== false;
    if (id === authUser.id && (!isActive || role !== 'admin')) {
      return json(400, { error: 'You cannot disable yourself or remove your own admin role.' });
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

    if (!profileUpdates.name) return json(400, { error: 'Name is required.' });

    const { data: profileData, error: profileError } = await admin
      .from('profiles')
      .update(profileUpdates)
      .eq('id', id)
      .select('id,name,role,teacher_id,is_active,created_at')
      .single();
    if (profileError) throw profileError;

    return json(200, { user: toPublicUser(updatedAuthUser, profileData) });
  } catch (error) {
    return errorResponse(error);
  }
}
