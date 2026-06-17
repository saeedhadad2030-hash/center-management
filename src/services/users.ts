import { UserRole } from '../types';
import { supabase } from '../lib/supabase';

export interface ManagedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  teacher_id: string;
  is_active: boolean;
  created_at?: string;
  last_sign_in_at?: string | null;
  email_confirmed_at?: string | null;
}

export interface UserPayload {
  id?: string;
  email: string;
  password?: string;
  name: string;
  role: UserRole;
  teacher_id?: string;
  is_active: boolean;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('يجب تسجيل الدخول أولا.');

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function callUsersFunction<T>(name: string, body?: unknown): Promise<T> {
  const headers = await getAuthHeaders();
  const response = await fetch(`/.netlify/functions/${name}`, {
    method: body ? 'POST' : 'GET',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('خدمة إدارة المستخدمين غير متاحة الآن. تأكد من إعداد النشر ثم حاول مرة أخرى.');
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || 'فشل تنفيذ العملية.');
  }

  return payload as T;
}

export async function listManagedUsers(): Promise<ManagedUser[]> {
  const result = await callUsersFunction<{ users: ManagedUser[] }>('users-list');
  if (!Array.isArray(result.users)) {
    throw new Error('تعذر تحميل قائمة المستخدمين. حاول مرة أخرى لاحقا.');
  }
  return result.users;
}

export async function createManagedUser(payload: UserPayload): Promise<ManagedUser> {
  const result = await callUsersFunction<{ user: ManagedUser }>('users-create', payload);
  return result.user;
}

export async function updateManagedUser(payload: UserPayload & { id: string }): Promise<ManagedUser> {
  const result = await callUsersFunction<{ user: ManagedUser }>('users-update', payload);
  return result.user;
}

export async function disableManagedUser(id: string): Promise<void> {
  await callUsersFunction<{ ok: boolean }>('users-delete', { id, mode: 'disable' });
}
