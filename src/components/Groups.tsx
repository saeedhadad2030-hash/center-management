import { useState, useEffect, useCallback } from 'react';
import { Group, Student, Teacher } from '../types';
import {
  getGroups,
  addGroup,
  updateGroup,
  deleteGroup,
  getTeachers,
  getCurrentUser,
  getStudentsByGroup,
  getStudents,
  addEnrollment,
  getEnrollmentsByGroup,
  removeStudentFromGroup,
} from '../store';
import { Plus, Edit2, Trash2, Users, X, Clock, Calendar, UserPlus, UserMinus } from 'lucide-react';

export default function Groups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Group | null>(null);
  const [showStudents, setShowStudents] = useState<Group | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState('');

  const allDays = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

  const [form, setForm] = useState({
    name: '',
    teacher_id: '',
    teacher: '',
    days: [] as string[],
    time: '',
    max_students: 25,
    fees: 0,
  });

  const user = getCurrentUser();
  const isTeacher = user?.role === 'teacher';

  const refresh = useCallback(() => {
    let loadedGroups = getGroups();
    if (isTeacher && user?.teacher_id) {
      loadedGroups = loadedGroups.filter(g => g.teacher_id === user.teacher_id);
    }
    setGroups(loadedGroups);
    setTeachers(getTeachers());
    setStudents(getStudents().filter(s => s.status === 'active'));
  }, [isTeacher, user?.teacher_id]);

  useEffect(() => { refresh(); }, [refresh]);

  const resetForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm({ name: '', teacher_id: '', teacher: '', days: [], time: '', max_students: 25, fees: 0 });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const schedule = form.days.join(' و ');
    const selectedTeacher = teachers.find(t => t.id === form.teacher_id);
    if (editing) {
      updateGroup(editing.id, { ...form, schedule, teacher: selectedTeacher?.name || form.teacher });
    } else {
      addGroup({ ...form, schedule, teacher: selectedTeacher?.name || '', academic_year_id: '' });
    }
    resetForm();
    refresh();
  };

  const handleEdit = (group: Group) => {
    setEditing(group);
    setForm({
      name: group.name,
      teacher_id: group.teacher_id || '',
      teacher: group.teacher || '',
      days: group.days || [],
      time: group.time || '',
      max_students: group.max_students,
      fees: group.fees,
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    const groupStudents = getStudentsByGroup(id);
    if (groupStudents.length > 0) {
      alert(`لا يمكن حذف المجموعة - يوجد بها ${groupStudents.length} طالب`);
      return;
    }
    if (confirm('هل أنت متأكد من حذف هذه المجموعة؟')) {
      deleteGroup(id);
      refresh();
    }
  };

  const toggleDay = (day: string) => {
    setForm(f => ({
      ...f,
      days: f.days.includes(day) ? f.days.filter(d => d !== day) : [...f.days, day],
    }));
  };

  const handleShowStudents = (group: Group) => {
    setSelectedStudentId('');
    setShowStudents(group);
  };

  const handleAddStudentToGroup = () => {
    if (!showStudents || !selectedStudentId) return;
    addEnrollment(selectedStudentId, showStudents.id);
    setSelectedStudentId('');
    refresh();
  };

  const handleRemoveStudentFromGroup = (student: Student) => {
    if (!showStudents) return;
    removeStudentFromGroup(student.id, showStudents.id);
    refresh();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{isTeacher ? 'مجموعاتي' : 'إدارة المجموعات'}</h1>
          <p className="text-gray-500 text-sm mt-1">إجمالي {groups.length} مجموعة</p>
        </div>
        {!isTeacher && (
          <button
            onClick={() => { setEditing(null); setForm({ name: '', teacher_id: '', teacher: '', days: [], time: '', max_students: 25, fees: 0 }); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition text-sm"
          >
            <Plus size={16} /> إنشاء مجموعة
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map(group => {
          const groupStudents = getStudentsByGroup(group.id);
          const percentage = group.max_students > 0 ? (groupStudents.length / group.max_students) * 100 : 0;
          const teacher = teachers.find(t => t.id === group.teacher_id);
          return (
            <div key={group.id} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-gray-800">{group.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{teacher?.name || group.teacher}</p>
                </div>
                {!isTeacher && (
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(group)} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(group.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar size={14} className="text-primary-500" />
                  <span>{group.schedule || group.days?.join(' - ') || '-'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock size={14} className="text-primary-500" />
                  <span>{group.time || '-'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-green-600 font-bold">{group.fees} ج.م</span>
                  <span className="text-gray-400">/ شهريا</span>
                </div>
              </div>

              <div className="border-t pt-3">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-500">{groupStudents.length}/{group.max_students} طالب</span>
                  <span className={percentage >= 90 ? 'text-red-500 font-bold' : 'text-gray-500'}>{Math.round(percentage)}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${percentage >= 90 ? 'bg-red-500' : percentage >= 70 ? 'bg-amber-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
              </div>

              <button
                onClick={() => handleShowStudents(group)}
                className="w-full mt-3 flex items-center justify-center gap-2 py-2 text-sm text-primary-600 bg-primary-50 rounded-xl hover:bg-primary-100 transition"
              >
                <Users size={14} /> عرض الطلاب ({groupStudents.length})
              </button>
            </div>
          );
        })}
        {groups.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-400">
            <Users size={48} className="mx-auto mb-3 opacity-50" />
            <p className="font-medium">لا توجد مجموعات بعد</p>
            <p className="text-sm mt-1">أنشئ مجموعة جديدة للبدء</p>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={resetForm}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-lg">{editing ? 'تعديل المجموعة' : 'إنشاء مجموعة جديدة'}</h3>
              <button onClick={resetForm} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم المجموعة *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="مثال: مجموعة الرياضيات"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المدرس *</label>
                {teachers.length > 0 ? (
                  <select
                    required
                    value={form.teacher_id}
                    onChange={e => setForm({ ...form, teacher_id: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                  >
                    <option value="">اختر المدرس</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name} - {t.specialization}</option>)}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    value={form.teacher}
                    onChange={e => setForm({ ...form, teacher: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="اسم المدرس"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">أيام المجموعة</label>
                <div className="flex flex-wrap gap-2">
                  {allDays.map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition ${form.days.includes(day) ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الموعد</label>
                  <input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الحد الأقصى</label>
                  <input type="number" min={1} value={form.max_students} onChange={e => setForm({ ...form, max_students: parseInt(e.target.value) || 1 })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الرسوم (ج.م)</label>
                  <input type="number" min={0} value={form.fees} onChange={e => setForm({ ...form, fees: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-primary-600 text-white py-2.5 rounded-xl font-medium hover:bg-primary-700 transition">
                  {editing ? 'حفظ التعديلات' : 'إنشاء المجموعة'}
                </button>
                <button type="button" onClick={resetForm} className="px-6 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showStudents && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowStudents(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
              <h3 className="font-bold">طلاب {showStudents.name}</h3>
              <button onClick={() => setShowStudents(null)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-5">
              {(() => {
                const groupStudents = getStudentsByGroup(showStudents.id);
                const groupStudentIds = new Set(groupStudents.map(s => s.id));
                const availableStudents = students.filter(s => !groupStudentIds.has(s.id));
                const enrollmentStudentIds = new Set(getEnrollmentsByGroup(showStudents.id).map(e => e.student_id));

                return (
                  <div className="space-y-4">
                    {!isTeacher && (
                      <div className="p-3 bg-primary-50 rounded-xl border border-primary-100">
                        <label className="block text-sm font-medium text-primary-800 mb-2">إضافة طالب للمجموعة</label>
                        <div className="flex gap-2">
                          <select
                            value={selectedStudentId}
                            onChange={e => setSelectedStudentId(e.target.value)}
                            className="min-w-0 flex-1 px-3 py-2 border border-primary-100 rounded-xl text-sm bg-white focus:ring-2 focus:ring-primary-500 outline-none"
                          >
                            <option value="">اختر طالب</option>
                            {availableStudents.map(student => (
                              <option key={student.id} value={student.id}>{student.name} - {student.phone}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={handleAddStudentToGroup}
                            disabled={!selectedStudentId}
                            className="w-10 h-10 flex items-center justify-center bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                            title="إضافة طالب"
                          >
                            <UserPlus size={18} />
                          </button>
                        </div>
                        {availableStudents.length === 0 && (
                          <p className="text-xs text-primary-600 mt-2">كل الطلاب النشطين موجودون بالفعل في هذه المجموعة.</p>
                        )}
                      </div>
                    )}

                    {groupStudents.length === 0 ? (
                      <p className="text-center text-gray-400 py-8">لا يوجد طلاب في هذه المجموعة</p>
                    ) : (
                      <div className="space-y-2">
                        {groupStudents.map((s, i) => (
                          <div key={s.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                            <span className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 text-sm font-bold">{i + 1}</span>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate">{s.name}</p>
                              <p className="text-xs text-gray-500">{s.phone}</p>
                            </div>
                            {!isTeacher && (enrollmentStudentIds.has(s.id) || s.group_id === showStudents.id) && (
                              <button
                                type="button"
                                onClick={() => handleRemoveStudentFromGroup(s)}
                                className="w-9 h-9 flex items-center justify-center text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition"
                                title="حذف الطالب من المجموعة"
                              >
                                <UserMinus size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
