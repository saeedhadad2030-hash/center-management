import { errorResponse, handleOptions, json, normalizeRole, normalizeTeacherId, readJson, requireAdmin, toPublicUser } from './_shared.mjs';

export async function handler(event) {
  const options = handleOptions(event);
  if (options) return options;

  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed.' });

    const { admin } = await requireAdmin(event);
    const body = await readJson(event);
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const name = String(body.name || '').trim();
    const role = normalizeRole(body.role || 'employee');
    const teacherId = normalizeTeacherId(role, body.teacher_id);
    const isActive = body.is_active !== false;

    if (!email || !password || !name) {
      return json(400, { error: 'Name, email, and password are required.' });
    }

    const { data: createData, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });
    if (createError || !createData.user) throw createError || new Error('Could not create user.');

    const profile = {
      id: createData.user.id,
      name,
      role,
      teacher_id: teacherId,
      is_active: isActive,
    };

    const { data: profileData, error: profileError } = await admin
      .from('profiles')
      .insert(profile)
      .select('id,name,role,teacher_id,is_active,created_at')
      .single();

    if (profileError) {
      await admin.auth.admin.deleteUser(createData.user.id);
      throw profileError;
    }

    return json(200, { user: toPublicUser(createData.user, profileData) });
  } catch (error) {
    return errorResponse(error);
  }
}
