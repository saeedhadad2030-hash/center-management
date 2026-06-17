import { useCallback, useEffect, useState } from 'react';
import { Edit2, KeyRound, Loader2, Plus, Shield, ToggleLeft, ToggleRight, UserCog, X } from 'lucide-react';
import { Teacher, UserRole } from '../types';
import { getCurrentUser, getTeachers } from '../store';
import { createManagedUser, disableManagedUser, listManagedUsers, ManagedUser, updateManagedUser } from '../services/users';

type UserForm = {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  teacher_id: string;
  is_active: boolean;
};

const emptyForm: UserForm = {
  email: '',
  password: '',
  name: '',
  role: 'employee',
  teacher_id: '',
  is_active: true,
};

export default function Users() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const currentUser = getCurrentUser();

  const refresh = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      setTeachers(getTeachers());
      const loadedUsers = await listManagedUsers();
      setUsers(Array.isArray(loadedUsers) ? loadedUsers : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل تحميل المستخدمين.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const resetForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm);
    setError('');
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (user: ManagedUser) => {
    setEditing(user);
    setForm({
      email: user.email,
      password: '',
      name: user.name,
      role: user.role,
      teacher_id: user.teacher_id || '',
      is_active: user.is_active,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate required fields
    if (!form.name.trim()) {
      setError('الاسم مطلوب.');
      return;
    }
    if (!form.email.trim()) {
      setError('الإيميل مطلوب.');
      return;
    }
    if (!editing && !form.password) {
      setError('كلمة المرور مطلوبة.');
      return;
    }
    if (!editing && form.password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل.');
      return;
    }
    if (form.role === 'teacher' && !form.teacher_id) {
      setError('يجب ربط المستخدم بمدرس عند اختيار دور مدرس.');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        email: form.email.trim(),
        password: form.password,
        name: form.name.trim(),
        role: form.role,
        teacher_id: form.teacher_id || '',
        is_active: form.is_active,
      };

      if (editing) {
        await updateManagedUser({ ...payload, id: editing.id });
      } else {
        await createManagedUser(payload);
      }

      resetForm();
      await refresh();
    } catch (err) {
      console.error('User save error:', err);
      const message = err instanceof Error ? err.message : 'فشل حفظ المستخدم.';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDisable = async (user: ManagedUser) => {
    if (user.id === currentUser?.id) {
      setError('لا يمكنك تعطيل حسابك الحالي.');
      return;
    }

    if (!confirm(`تعطيل حساب ${user.email}؟`)) return;

    setError('');
    try {
      await disableManagedUser(user.id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل تعطيل المستخدم.');
    }
  };

  const roleLabel = (role: UserRole) => {
    if (role === 'admin') return 'مدير';
    if (role === 'teacher') return 'مدرس';
    return 'موظف';
  };

  const roleColor = (role: UserRole) => {
    if (role === 'admin') return 'bg-blue-100 text-blue-700';
    if (role === 'teacher') return 'bg-amber-100 text-amber-700';
    return 'bg-green-100 text-green-700';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">إدارة المستخدمين</h1>
          <p className="text-gray-500 text-sm mt-1">إضافة وتعديل حسابات العاملين في النظام</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition text-sm">
          <Plus size={16} /> إضافة مستخدم
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center text-gray-500">
          <Loader2 className="animate-spin mx-auto mb-3" size={28} />
          جاري تحميل المستخدمين...
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">المستخدم</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">الصلاحية</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">المدرس المرتبط</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">الحالة</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => {
                  const teacher = teachers.find(t => t.id === user.teacher_id);
                  const isSelf = user.id === currentUser?.id;

                  return (
                    <tr key={user.id} className="border-b hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold">
                            {(user.name || user.email).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-sm text-gray-800">{user.name || '-'}</p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${roleColor(user.role)}`}>{roleLabel(user.role)}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{teacher?.name || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${user.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                          {user.is_active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                          {user.is_active ? 'نشط' : 'معطل'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openEdit(user)} className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition" title="تعديل">
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDisable(user)}
                            disabled={isSelf || !user.is_active}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
                            title="تعطيل"
                          >
                            <ToggleLeft size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-gray-400">
                      <UserCog size={40} className="mx-auto mb-2 opacity-50" />
                      لا يوجد مستخدمين
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={resetForm}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-lg">{editing ? 'تعديل مستخدم' : 'إضافة مستخدم'}</h3>
              <button onClick={resetForm} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الاسم *</label>
                  <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الإيميل *</label>
                  <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  كلمة المرور {editing ? '(اتركها فارغة بدون تغيير)' : '*'}
                </label>
                <div className="relative">
                  <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    required={!editing}
                    type="password"
                    minLength={6}
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    className="w-full pr-10 pl-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الصلاحية *</label>
                  <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as UserRole })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white">
                    <option value="admin">مدير</option>
                    <option value="employee">موظف</option>
                    <option value="teacher">مدرس</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
                  <select value={form.is_active ? 'active' : 'disabled'} onChange={e => setForm({ ...form, is_active: e.target.value === 'active' })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white">
                    <option value="active">نشط</option>
                    <option value="disabled">معطل</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ربط بمدرس {form.role === 'teacher' ? '*' : '(اختياري)'}
                </label>
                <select
                  required={form.role === 'teacher'}
                  value={form.teacher_id}
                  onChange={e => setForm({ ...form, teacher_id: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                >
                  <option value="">اختر المدرس</option>
                  {teachers.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>{teacher.name} - {teacher.specialization}</option>
                  ))}
                </select>
                {form.role !== 'teacher' && (
                  <p className="text-xs text-gray-400 mt-1">يمكنك ربط الموظف أو المدير بمدرس للوصول لبياناته</p>
                )}
              </div>

              {editing?.id === currentUser?.id && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700 flex items-start gap-2">
                  <Shield size={16} className="mt-0.5" />
                  يمكنك تغيير إيميلك أو كلمة المرور، لكن لا يمكنك تعطيل نفسك أو إزالة صلاحية المدير من حسابك الحالي.
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button disabled={saving} type="submit" className="flex-1 bg-primary-600 text-white py-2.5 rounded-xl font-medium hover:bg-primary-700 transition disabled:opacity-60">
                  {saving ? 'جاري الحفظ...' : editing ? 'حفظ التعديلات' : 'إضافة المستخدم'}
                </button>
                <button type="button" onClick={resetForm} className="px-6 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
