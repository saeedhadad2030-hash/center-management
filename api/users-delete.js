import { errorResponse, handleOptions, readBody, requireAdmin, setCorsHeaders } from './_shared.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCorsHeaders(res);

  try {
    if (req.method !== 'POST' && req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed.' });

    const { admin, authUser } = await requireAdmin(req);
    const body = await readBody(req);
    const id = String(body.id || '').trim();
    if (!id) return res.status(400).json({ error: 'User id is required.' });
    if (id === authUser.id) return res.status(400).json({ error: 'You cannot delete or disable yourself.' });

    const mode = body.mode === 'delete' ? 'delete' : 'disable';
    if (mode === 'delete') {
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) throw error;
      return res.status(200).json({ ok: true, mode });
    }

    const { error: profileError } = await admin
      .from('profiles')
      .update({ is_active: false })
      .eq('id', id);
    if (profileError) throw profileError;

    return res.status(200).json({ ok: true, mode });
  } catch (error) {
    return errorResponse(res, error);
  }
}
