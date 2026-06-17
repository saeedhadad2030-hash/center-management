import { errorResponse, handleOptions, json, readJson, requireAdmin } from './_shared.mjs';

export async function handler(event) {
  const options = handleOptions(event);
  if (options) return options;

  try {
    if (event.httpMethod !== 'POST' && event.httpMethod !== 'DELETE') return json(405, { error: 'Method not allowed.' });

    const { admin, authUser } = await requireAdmin(event);
    const body = await readJson(event);
    const id = String(body.id || '').trim();
    if (!id) return json(400, { error: 'User id is required.' });
    if (id === authUser.id) return json(400, { error: 'You cannot delete or disable yourself.' });

    const mode = body.mode === 'delete' ? 'delete' : 'disable';
    if (mode === 'delete') {
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) throw error;
      return json(200, { ok: true, mode });
    }

    const { error: profileError } = await admin
      .from('profiles')
      .update({ is_active: false })
      .eq('id', id);
    if (profileError) throw profileError;

    return json(200, { ok: true, mode });
  } catch (error) {
    return errorResponse(error);
  }
}
