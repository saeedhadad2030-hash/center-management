import { createClient } from '@supabase/supabase-js';

export function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
}

export function handleOptions(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') {
    res.status(200).json({ ok: true });
    return true;
  }
  return false;
}

export function getAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    const error = new Error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
    error.statusCode = 500;
    throw error;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function readBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      const error = new Error('Invalid JSON body.');
      error.statusCode = 400;
      throw error;
    }
  }
  return req.body;
}

export function normalizeRole(role) {
  if (['admin', 'employee', 'teacher'].includes(role)) return role;
  const error = new Error('Invalid role.');
  error.statusCode = 400;
  throw error;
}

export function normalizeTeacherId(role, teacherId) {
  if (role !== 'teacher' && role !== 'employee' && role !== 'admin') return null;
  if (!teacherId || typeof teacherId !== 'string' || !teacherId.trim()) return null;
  return teacherId.trim();
}

export async function requireAdmin(req) {
  const admin = getAdminClient();
  const header = req.headers.authorization || req.headers.Authorization || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    const error = new Error('Missing Authorization bearer token.');
    error.statusCode = 401;
    throw error;
  }

  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) {
    const error = new Error('Invalid session.');
    error.statusCode = 401;
    throw error;
  }

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id,name,role,is_active')
    .eq('id', authData.user.id)
    .single();

  if (profileError || !profile || profile.role !== 'admin' || !profile.is_active) {
    const error = new Error('Admin access required.');
    error.statusCode = 403;
    throw error;
  }

  return { admin, authUser: authData.user, profile };
}

export function toPublicUser(authUser, profile) {
  return {
    id: authUser.id,
    email: authUser.email || '',
    name: profile?.name || authUser.user_metadata?.name || '',
    role: profile?.role || 'employee',
    teacher_id: profile?.teacher_id || '',
    is_active: profile?.is_active ?? false,
    created_at: profile?.created_at || authUser.created_at,
    last_sign_in_at: authUser.last_sign_in_at || null,
    email_confirmed_at: authUser.email_confirmed_at || null,
  };
}

export function errorResponse(res, error) {
  setCorsHeaders(res);
  return res.status(error.statusCode || 500).json({
    error: error.message || 'Unexpected server error.',
  });
}
