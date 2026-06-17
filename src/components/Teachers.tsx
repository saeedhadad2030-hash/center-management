import { useState, useEffect, useCallback } from 'react';
import { Teacher, Group, User } from '../types';
import { getTeachers, addTeacher, updateTeacher, deleteTeacher, getGroups, getTeacherStats, getUsers } from '../store';
import { Plus, Edit2, Trash2, X, Users, Phone, Percent, BookOpen, Key, UserPlus } from 'lucide-react';

export default function Teachers() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showAccountForm, setShowAccountForm] = useState<Teacher | null>(null);
  const [editing, setEditing] = useState<Teacher | null>(null);

  const [form, setForm] = useState({
    name: '', phone: '', specialization: '', salary: 0, commission: 70,
  });

  const currentMonth = new Date().toISOString().slice(0, 7);

  const refresh = useCallback(() => {
    setTeachers(getTeachers());
    setGroups(getGroups());
    setUsers(getUsers());
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      updateTeacher(editing.id, form);
    } else {
      addTeacher(form);
    }
    resetForm();
    refresh();
  };

  const resetForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm({ name: '', phone: '', specialization: '', salary: 0, commission: 70 });
  };

  const handleEdit = (teacher: Teacher) => {
    setEditing(teacher);
    setForm({
      name: teacher.name, phone: teacher.phone,
      specialization: teacher.specialization, salary: teacher.salary,
      commission: teacher.commission,
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    const teacherGroups = groups.filter(g => g.teacher_id === id);
    if (teacherGroups.length > 0) {
      alert(`لا يمكن حذف المدرس - مرتبط بـ ${teacherGroups.length} مجموعة`);
      return;
    }
    if (confirm('هل أنت متأكد من حذف هذا المدرس؟')) {
      deleteTeacher(id);
      refresh();
    }
  };

  const getTeacherGroups = (teacherId: string) => {
    return groups.filter(g => g.teacher_id === teacherId);
  };

  const hasAccount = (teacherId: string) => {
    return users.some(u => u.teacher_id === teacherId);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">إدارة المدرسين</h1>
          <p className="text-gray-500 text-sm mt-1">{teachers.length} مدرس</p>
        </div>
        <button onClick={() => { setEditing(null); setForm({ name: '', phone: '', specialization: '', salary: 0, commission: 70 }); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition text-sm">
          <Plus size={16} /> إضافة مدرس
        </button>
      </div>

      {/* Teachers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teachers.map(teacher => {
          const teacherGroups = getTeacherGroups(teacher.id);
          const stats = getTeacherStats(teacher.id, currentMonth);
          const hasUserAccount = hasAccount(teacher.id);
          return (
            <div key={teacher.id} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                    {teacher.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">{teacher.name}</h3>
                    <p className="text-sm text-gray-500">{teacher.specialization}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  {!hasUserAccount && (
                    <button onClick={() => setShowAccountForm(teacher)}
                      className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition" title="إنشاء حساب">
                      <UserPlus size={16} />
                    </button>
                  )}
                  <button onClick={() => handleEdit(teacher)} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(teacher.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone size={14} className="text-gray-400" />
                  <span dir="ltr">{teacher.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <BookOpen size={14} className="text-gray-400" />
                  <span>{teacher.specialization}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Percent size={14} className="text-green-500" />
                  <span className="font-bold text-green-600">نسبة المدرس: {teacher.commission}%</span>
                </div>
                {hasUserAccount && (
                  <div className="flex items-center gap-2 text-sm text-primary-600">
                    <Key size={14} />
                    <span>لديه حساب دخول</span>
                  </div>
                )}
              </div>

              {/* Monthly Stats */}
              <div className="mt-4 pt-3 border-t">
                <p className="text-xs text-gray-500 mb-2">إحصائيات الشهر الحالي</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-blue-50 rounded-lg p-2">
                    <p className="text-blue-600 font-bold">{stats.total_collected.toLocaleString()} ج.م</p>
                    <p className="text-blue-500">التحصيل</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-2">
                    <p className="text-green-600 font-bold">{stats.teacher_share.toLocaleString()} ج.م</p>
                    <p className="text-green-500">مستحقاته</p>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Users size={14} />
                  <span>{teacherGroups.length} مجموعة • {stats.total_students} طالب</span>
                </div>
              </div>
            </div>
          );
        })}
        {teachers.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-400">
            <Users size={48} className="mx-auto mb-3 opacity-50" />
            <p className="font-medium">لا يوجد مدرسين</p>
            <p className="text-sm mt-1">أضف مدرس جديد للبدء</p>
          </div>
        )}
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={resetForm}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-lg">{editing ? 'تعديل المدرس' : 'إضافة مدرس جديد'}</h3>
              <button onClick={resetForm} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم المدرس *</label>
                <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" placeholder="أ/ ..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
                <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" placeholder="01xxxxxxxxx" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">التخصص</label>
                <input type="text" value={form.specialization} onChange={e => setForm({ ...form, specialization: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" placeholder="رياضيات، فيزياء، ..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">نسبة المدرس من التحصيل (%)</label>
                <div className="relative">
                  <input type="number" min={0} max={100} value={form.commission} onChange={e => setForm({ ...form, commission: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">%</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">مثال: إذا كانت النسبة 75%، المدرس يحصل على 75% من التحصيل والسنتر 25%</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-primary-600 text-white py-2.5 rounded-xl font-medium hover:bg-primary-700 transition">
                  {editing ? 'حفظ التعديلات' : 'إضافة المدرس'}
                </button>
                <button type="button" onClick={resetForm} className="px-6 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Account Modal */}
      {showAccountForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAccountForm(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-lg">إنشاء حساب للمدرس</h3>
              <button onClick={() => setShowAccountForm(null)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <p className="text-sm text-blue-800">{showAccountForm.name}</p>
              </div>
              <p className="text-sm text-gray-600 leading-6">
                لإنشاء حساب دخول لهذا المدرس، افتح صفحة المستخدمين واضغط إضافة مستخدم ثم اختر صلاحية مدرس واربط الحساب بهذا المدرس.
              </p>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAccountForm(null)} className="px-6 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition">
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
