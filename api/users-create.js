import { errorResponse, handleOptions, normalizeRole, normalizeTeacherId, readBody, requireAdmin, setCorsHeaders, toPublicUser } from './_shared.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCorsHeaders(res);

  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

    const { admin } = await requireAdmin(req);
    const body = await readBody(req);
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const name = String(body.name || '').trim();
    const role = normalizeRole(body.role || 'employee');
    const teacherId = normalizeTeacherId(role, body.teacher_id);
    const isActive = body.is_active !== false;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
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

    return res.status(200).json({ user: toPublicUser(createData.user, profileData) });
  } catch (error) {
    return errorResponse(res, error);
  }
}
