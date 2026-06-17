import { User, UserRole } from '../types';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

type ProfileRow = {
  id: string;
  name: string;
  role: UserRole;
  teacher_id: string | null;
  is_active: boolean;
  created_at?: string;
};

function mapProfile(row: ProfileRow, email?: string): User {
  return {
    id: row.id,
    name: row.name,
    username: email || row.id,
    password: '',
    role: row.role,
    teacher_id: row.teacher_id || undefined,
    is_active: row.is_active,
    created_at: row.created_at,
  };
}

export async function getSupabaseCurrentUser(): Promise<User | null> {
  if (!isSupabaseConfigured) return null;

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session?.user) return null;

  const authUser = sessionData.session.user;
  const { data, error } = await supabase
    .from('profiles')
    .select('id,name,role,teacher_id,is_active,created_at')
    .eq('id', authUser.id)
    .single();

  if (error || !data || !data.is_active) {
    await supabase.auth.signOut();
    return null;
  }

  return mapProfile(data, authUser.email);
}

export async function signInWithSupabase(email: string, password: string): Promise<User> {
  if (!isSupabaseConfigured) {
    throw new Error('إعدادات الاتصال غير مكتملة. تواصل مع مدير النظام.');
  }

  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (loginError || !loginData.user) {
    throw new Error(loginError?.message || 'Invalid login credentials.');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id,name,role,teacher_id,is_active,created_at')
    .eq('id', loginData.user.id)
    .single();

  if (profileError || !profile || !profile.is_active) {
    await supabase.auth.signOut();
    throw new Error('User profile is missing or disabled.');
  }

  return mapProfile(profile, loginData.user.email);
}

export async function signOutFromSupabase(): Promise<void> {
  if (isSupabaseConfigured) {
    await supabase.auth.signOut();
  }
}
