import { errorResponse, handleOptions, requireAdmin, setCorsHeaders } from './_shared.js';

/**
 * DELETE /api/users-clear
 * Deletes ALL Supabase Auth users except the currently logged-in admin.
 * Only admins can call this endpoint.
 */
export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCorsHeaders(res);

  try {
    if (req.method !== 'POST' && req.method !== 'DELETE') {
      return res.status(405).json({ error: 'Method not allowed.' });
    }

    const { admin, authUser } = await requireAdmin(req);

    // List all users
    const { data: usersData, error: listError } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (listError) throw listError;

    // Filter: only delete non-admin users (keep the current admin)
    const toDelete = [];
    for (const user of usersData.users) {
      // Never delete the currently logged-in admin
      if (user.id === authUser.id) continue;

      // Check profile role
      const { data: profile } = await admin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile || profile.role !== 'admin') {
        toDelete.push(user.id);
      }
    }

    // Delete each non-admin user from Supabase Auth (cascade deletes profile too)
    const errors = [];
    for (const userId of toDelete) {
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) errors.push({ userId, error: error.message });
    }

    return res.status(200).json({
      ok: true,
      deleted: toDelete.length,
      errors,
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}
