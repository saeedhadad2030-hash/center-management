import { useState, useEffect, useCallback } from 'react';
import { Student } from '../types';
import { getStudents, addStudent, updateStudent, deleteStudent, getGroups, getAttendanceByStudent, getPaymentsByStudent, getCurrentAcademicYear, promoteStudents, graduateStudents, archiveStudents, getCurrentUser, getStudentsByGroup, getTeacherGroups, addEnrollment, getGroupsForStudent, getEnrollmentsByStudent, deleteEnrollment, removeStudentFromGroup } from '../store';
import { generateQRCode, generateStudentQRData } from '../utils/qrcode';
import { exportToCSV } from '../utils/export';
import { Plus, Search, Edit2, Trash2, QrCode, Eye, Download, Printer, X, Camera, UserCircle, GraduationCap, Archive, ArrowUp, Layers } from 'lucide-react';

export default function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('active');
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [viewStudent, setViewStudent] = useState<Student | null>(null);
  const [qrData, setQrData] = useState<string>('');
  const [showQR, setShowQR] = useState(false);
  const [qrStudent, setQrStudent] = useState<Student | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [showBulkAction, setShowBulkAction] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<'promote' | 'graduate' | 'archive'>('promote');
  const [newGrade, setNewGrade] = useState('');
  const [newGroupId, setNewGroupId] = useState('');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);

  const user = getCurrentUser();
  const isTeacher = user?.role === 'teacher';
  
  // Get groups based on role
  const allGroups = getGroups();
  const groups = isTeacher && user?.teacher_id ? getTeacherGroups(user.teacher_id) : allGroups;

  const [form, setForm] = useState({
    name: '', phone: '', parent_phone: '', grade: '', group_id: '', notes: '', photo: '', status: 'active' as 'active' | 'graduated' | 'archived', academic_year_id: '',
  });

  const grades = ['الصف الأول الإعدادي', 'الصف الثاني الإعدادي', 'الصف الثالث الإعدادي', 'الصف الأول الثانوي', 'الصف الثاني الثانوي', 'الصف الثالث الثانوي'];

  const refresh = useCallback(() => {
    if (isTeacher && user?.teacher_id) {
      // Teacher sees only students in their groups
      const studentIds = new Set<string>();
      groups.forEach(g => {
        getStudentsByGroup(g.id).forEach(s => studentIds.add(s.id));
      });
      setStudents(getStudents().filter(s => studentIds.has(s.id)));
    } else {
      setStudents(getStudents());
    }
  }, [isTeacher, user?.teacher_id]);

  useEffect(() => { refresh(); }, [refresh]);

  const filtered = students.filter(s => {
    const matchSearch = s.name.includes(search) || s.phone.includes(search) || s.parent_phone.includes(search);
    const matchGroup = !filterGroup || s.group_id === filterGroup || getGroupsForStudent(s.id).some(g => g.id === filterGroup);
    const matchStatus = !filterStatus || s.status === filterStatus;
    return matchSearch && matchGroup && matchStatus;
  });

  const syncStudentGroups = (studentId: string, nextGroupIds: string[]) => {
    const uniqueGroupIds = Array.from(new Set(nextGroupIds.filter(Boolean)));
    const primaryGroupId = uniqueGroupIds[0] || '';
    updateStudent(studentId, { group_id: primaryGroupId });

    const existingEnrollments = getEnrollmentsByStudent(studentId);
    existingEnrollments.forEach(enrollment => {
      if (!uniqueGroupIds.includes(enrollment.group_id)) {
        deleteEnrollment(studentId, enrollment.group_id);
      }
    });
    uniqueGroupIds.forEach(groupId => addEnrollment(studentId, groupId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const currentYear = getCurrentAcademicYear();
    const groupIds = selectedGroupIds.length > 0 ? selectedGroupIds : (form.group_id ? [form.group_id] : []);
    const primaryGroupId = groupIds[0] || '';
    if (editingStudent) {
      updateStudent(editingStudent.id, { ...form, group_id: primaryGroupId });
      syncStudentGroups(editingStudent.id, groupIds);
    } else {
      const newStudent = addStudent({ ...form, group_id: primaryGroupId, academic_year_id: currentYear?.id || '' });
      syncStudentGroups(newStudent.id, groupIds);
    }
    setShowForm(false);
    setEditingStudent(null);
    setSelectedGroupIds([]);
    setForm({ name: '', phone: '', parent_phone: '', grade: '', group_id: '', notes: '', photo: '', status: 'active', academic_year_id: '' });
    refresh();
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setForm({
      name: student.name, phone: student.phone, parent_phone: student.parent_phone,
      grade: student.grade, group_id: student.group_id, notes: student.notes, photo: student.photo,
      status: student.status, academic_year_id: student.academic_year_id,
    });
    setSelectedGroupIds(getGroupsForStudent(student.id).map(g => g.id));
    setShowForm(true);
  };

  const openNewStudentForm = () => {
    const defaultGroups = isTeacher && groups.length === 1 ? [groups[0].id] : [];
    setEditingStudent(null);
    setSelectedGroupIds(defaultGroups);
    setForm({
      name: '',
      phone: '',
      parent_phone: '',
      grade: '',
      group_id: defaultGroups[0] || '',
      notes: '',
      photo: '',
      status: 'active',
      academic_year_id: '',
    });
    setShowForm(true);
  };

  const handleRemoveFromGroup = (student: Student, groupId: string) => {
    removeStudentFromGroup(student.id, groupId);
    const updatedStudent = getStudents().find(s => s.id === student.id) || null;
    setViewStudent(updatedStudent);
    refresh();
  };

  const handleDelete = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الطالب؟')) {
      deleteStudent(id);
      refresh();
    }
  };

  const handleShowQR = async (student: Student) => {
    const data = generateStudentQRData(student.id, student.name);
    const qr = await generateQRCode(data);
    setQrData(qr);
    setQrStudent(student);
    setShowQR(true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setForm({ ...form, photo: ev.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExport = () => {
    const data = filtered.map(s => ({
      الاسم: s.name,
      الهاتف: s.phone,
      'هاتف ولي الأمر': s.parent_phone,
      'الصف الدراسي': s.grade,
      المجموعة: allGroups.find(g => g.id === s.group_id)?.name || '',
      'كل المجموعات': getGroupsForStudent(s.id).map(g => g.name).join(', '),
      الحالة: s.status === 'active' ? 'نشط' : s.status === 'graduated' ? 'خريج' : 'مؤرشف',
      ملاحظات: s.notes,
    }));
    exportToCSV(data, 'students');
  };

  const toggleSelectStudent = (id: string) => {
    setSelectedStudents(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const selectAll = () => {
    if (selectedStudents.length === filtered.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filtered.map(s => s.id));
    }
  };

  const handleBulkAction = () => {
    if (selectedStudents.length === 0) return;
    if (bulkActionType === 'promote') {
      promoteStudents(selectedStudents, newGrade, newGroupId || undefined);
    } else if (bulkActionType === 'graduate') {
      graduateStudents(selectedStudents);
    } else if (bulkActionType === 'archive') {
      archiveStudents(selectedStudents);
    }
    setSelectedStudents([]);
    setShowBulkAction(false);
    refresh();
  };

  const printStudentCard = async (student: Student) => {
    const data = generateStudentQRData(student.id, student.name);
    const qr = await generateQRCode(data);
    
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>كارنيه الطالب</title>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
      <style>* { font-family: 'Cairo', sans-serif; } body { display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
      .card { width: 340px; border: 2px solid #1e3a8a; border-radius: 16px; overflow: hidden; }
      .card-header { background: linear-gradient(135deg, #1e3a8a, #2563eb); color: white; padding: 16px; text-align: center; }
      .card-body { padding: 16px; text-align: center; }
      .card-body img { width: 120px; margin: 0 auto 8px; }
      .info { text-align: right; margin-top: 12px; font-size: 13px; }
      .info p { margin: 4px 0; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style></head><body>
      <div class="card">
        <div class="card-header"><h2 style="margin:0;font-size:18px">السنتر التعليمي</h2><p style="margin:4px 0 0;font-size:12px;opacity:0.9">كارنيه الطالب</p></div>
        <div class="card-body">
          <img src="${qr}" alt="QR"/>
          <h3 style="margin:8px 0;color:#1e3a8a">${student.name}</h3>
          <div class="info">
            <p>📱 ${student.phone}</p>
            <p>📚 ${student.grade}</p>
            <p>👥 ${allGroups.find(g => g.id === student.group_id)?.name || ''}</p>
            <p>🆔 ${student.id}</p>
          </div>
        </div>
      </div></body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 500);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{isTeacher ? 'طلاب مجموعاتي' : 'إدارة الطلاب'}</h1>
          <p className="text-gray-500 text-sm mt-1">إجمالي {filtered.length} طالب</p>
        </div>
        <div className="flex gap-2">
          {!isTeacher && selectedStudents.length > 0 && (
            <button onClick={() => setShowBulkAction(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition text-sm">
              <ArrowUp size={16} /> إجراء جماعي ({selectedStudents.length})
            </button>
          )}
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition text-sm">
            <Download size={16} /> تصدير
          </button>
          <button onClick={openNewStudentForm}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition text-sm">
            <Plus size={16} /> إضافة طالب
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو الهاتف..."
            className="w-full pr-10 pl-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
        </div>
        <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white">
          <option value="">كل المجموعات</option>
          {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white">
          <option value="">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="graduated">خريج</option>
          <option value="archived">مؤرشف</option>
        </select>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                {!isTeacher && (
                  <th className="px-4 py-3 text-right">
                    <input type="checkbox" checked={selectedStudents.length === filtered.length && filtered.length > 0} onChange={selectAll}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                  </th>
                )}
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">الطالب</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">الهاتف</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">ولي الأمر</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">الصف</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">المجموعات</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">الحالة</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(student => {
                const studentGroups = getGroupsForStudent(student.id);
                return (
                  <tr key={student.id} className={`border-b hover:bg-gray-50 transition ${selectedStudents.includes(student.id) ? 'bg-primary-50' : ''}`}>
                    {!isTeacher && (
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selectedStudents.includes(student.id)} onChange={() => toggleSelectStudent(student.id)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {student.photo ? (
                          <img src={student.photo} alt="" className="w-9 h-9 rounded-full object-cover" />
                        ) : (
                          <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-sm">
                            {student.name.charAt(0)}
                          </div>
                        )}
                        <span className="font-medium text-sm">{student.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{student.phone}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{student.parent_phone}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{student.grade}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {studentGroups.length > 0 ? studentGroups.map(g => (
                          <span key={g.id} className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-lg">{g.name}</span>
                        )) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${student.status === 'active' ? 'bg-green-100 text-green-700' : student.status === 'graduated' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                        {student.status === 'active' ? 'نشط' : student.status === 'graduated' ? 'خريج' : 'مؤرشف'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setViewStudent(student)} className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition" title="عرض">
                          <Eye size={16} />
                        </button>
                        <button onClick={() => handleShowQR(student)} className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition" title="QR Code">
                          <QrCode size={16} />
                        </button>
                        <button onClick={() => printStudentCard(student)} className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition" title="طباعة كارنيه">
                          <Printer size={16} />
                        </button>
                        <button onClick={() => handleEdit(student)} className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition" title="تعديل">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(student.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="حذف">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={isTeacher ? 7 : 8} className="text-center py-12 text-gray-400">
                    <UserCircle size={40} className="mx-auto mb-2 opacity-50" />
                    <p>لا يوجد طلاب</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-lg">{editingStudent ? 'تعديل بيانات الطالب' : 'إضافة طالب جديد'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="flex justify-center">
                <label className="cursor-pointer">
                  {form.photo ? (
                    <img src={form.photo} alt="" className="w-24 h-24 rounded-full object-cover border-4 border-primary-200" />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center border-4 border-dashed border-gray-300 hover:border-primary-400 transition">
                      <Camera size={28} className="text-gray-400" />
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">اسم الطالب *</label>
                  <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">هاتف الطالب</label>
                  <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" placeholder="01xxxxxxxxx" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">هاتف ولي الأمر</label>
                  <input type="tel" value={form.parent_phone} onChange={e => setForm({ ...form, parent_phone: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" placeholder="01xxxxxxxxx" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الصف الدراسي</label>
                  <select value={form.grade} onChange={e => setForm({ ...form, grade: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white">
                    <option value="">اختر الصف</option>
                    {grades.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">المجموعة</label>
                  <div className="max-h-36 overflow-y-auto border border-gray-200 rounded-xl p-2 space-y-1">
                    {groups.map(g => (
                      <label key={g.id} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-sm ${selectedGroupIds.includes(g.id) ? 'bg-primary-50 text-primary-700' : 'hover:bg-gray-50'}`}>
                        <input
                          type="checkbox"
                          checked={selectedGroupIds.includes(g.id)}
                          onChange={() => {
                            const nextIds = selectedGroupIds.includes(g.id)
                              ? selectedGroupIds.filter(id => id !== g.id)
                              : [...selectedGroupIds, g.id];
                            setSelectedGroupIds(nextIds);
                            setForm(current => ({ ...current, group_id: nextIds[0] || '' }));
                          }}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span>{g.name}</span>
                      </label>
                    ))}
                    {groups.length === 0 && <p className="text-xs text-gray-400 p-2">لا توجد مجموعات متاحة</p>}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">يمكن اختيار أكثر من مجموعة. أول مجموعة تصبح الأساسية.</p>
                  <select value={form.group_id} onChange={e => setForm({ ...form, group_id: e.target.value })}
                    className="hidden">
                    <option value="">اختر المجموعة</option>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none" rows={3} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-primary-600 text-white py-2.5 rounded-xl font-medium hover:bg-primary-700 transition">
                  {editingStudent ? 'حفظ التعديلات' : 'إضافة الطالب'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Student Modal */}
      {viewStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setViewStudent(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-lg">بيانات الطالب</h3>
              <button onClick={() => setViewStudent(null)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="text-center">
                {viewStudent.photo ? (
                  <img src={viewStudent.photo} alt="" className="w-24 h-24 rounded-full object-cover mx-auto border-4 border-primary-200" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-primary-100 flex items-center justify-center mx-auto text-primary-700 text-3xl font-bold">
                    {viewStudent.name.charAt(0)}
                  </div>
                )}
                <h3 className="text-xl font-bold mt-3">{viewStudent.name}</h3>
                <span className={`text-xs px-2 py-1 rounded-full ${viewStudent.status === 'active' ? 'bg-green-100 text-green-700' : viewStudent.status === 'graduated' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                  {viewStudent.status === 'active' ? 'نشط' : viewStudent.status === 'graduated' ? 'خريج' : 'مؤرشف'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InfoField label="الهاتف" value={viewStudent.phone} />
                <InfoField label="ولي الأمر" value={viewStudent.parent_phone} />
                <InfoField label="الصف" value={viewStudent.grade} />
                <InfoField label="المجموعة الأساسية" value={allGroups.find(g => g.id === viewStudent.group_id)?.name || '-'} />
              </div>

              {/* All Groups */}
              <div>
                <p className="text-xs text-gray-500 mb-1">كل المجموعات</p>
                <div className="flex flex-wrap gap-2">
                  {getGroupsForStudent(viewStudent.id).map(g => (
                    <span key={g.id} className="text-xs bg-primary-50 text-primary-700 px-3 py-1.5 rounded-lg flex items-center gap-1">
                      <Layers size={12} /> {g.name}
                      {!isTeacher && (
                        <button
                          type="button"
                          onClick={() => handleRemoveFromGroup(viewStudent, g.id)}
                          className="mr-1 text-red-500 hover:text-red-700"
                          title="حذف من هذه المجموعة"
                        >
                          ×
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              </div>

              {viewStudent.notes && <InfoField label="ملاحظات" value={viewStudent.notes} />}

              <div className="border-t pt-4">
                <h4 className="font-bold text-sm mb-2">إحصائيات الحضور</h4>
                {(() => {
                  const att = getAttendanceByStudent(viewStudent.id);
                  const present = att.filter(a => a.status === 'present').length;
                  const absent = att.filter(a => a.status === 'absent').length;
                  const total = att.length;
                  const rate = total > 0 ? Math.round((present / total) * 100) : 0;
                  return (
                    <div className="flex gap-4">
                      <div className="flex-1 bg-green-50 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-green-600">{present}</p>
                        <p className="text-xs text-green-700">حضور</p>
                      </div>
                      <div className="flex-1 bg-red-50 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-red-600">{absent}</p>
                        <p className="text-xs text-red-700">غياب</p>
                      </div>
                      <div className="flex-1 bg-blue-50 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-blue-600">{rate}%</p>
                        <p className="text-xs text-blue-700">نسبة الالتزام</p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="border-t pt-4">
                <h4 className="font-bold text-sm mb-2">المدفوعات</h4>
                {(() => {
                  const pays = getPaymentsByStudent(viewStudent.id);
                  const totalPaid = pays.reduce((s, p) => s + p.amount, 0);
                  return (
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-sm">إجمالي المدفوعات: <span className="font-bold text-green-600">{totalPaid.toLocaleString()} ج.م</span></p>
                      <p className="text-sm mt-1">عدد الأقساط المسددة: <span className="font-bold">{pays.length}</span></p>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQR && qrStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowQR(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 text-center max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-br from-primary-800 to-primary-600 text-white p-4 rounded-xl mb-4">
              <h3 className="font-bold text-lg">السنتر التعليمي</h3>
              <p className="text-primary-200 text-sm">كارنيه الطالب</p>
            </div>
            {qrData && <img src={qrData} alt="QR Code" className="mx-auto mb-4" />}
            <h4 className="text-xl font-bold text-gray-800">{qrStudent.name}</h4>
            <p className="text-sm text-gray-500 mt-1">{qrStudent.grade}</p>
            <p className="text-xs text-gray-400 mt-1">ID: {qrStudent.id}</p>
            <div className="mt-4 flex gap-2 justify-center">
              <button onClick={() => printStudentCard(qrStudent)} className="px-4 py-2 bg-primary-600 text-white rounded-xl text-sm hover:bg-primary-700 transition flex items-center gap-1">
                <Printer size={14} /> طباعة
              </button>
              <button onClick={() => setShowQR(false)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm hover:bg-gray-200 transition">
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Action Modal */}
      {showBulkAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowBulkAction(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-lg">إجراء جماعي ({selectedStudents.length} طالب)</h3>
              <button onClick={() => setShowBulkAction(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex gap-2">
                <button onClick={() => setBulkActionType('promote')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition ${bulkActionType === 'promote' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  <ArrowUp size={18} /> ترقية
                </button>
                <button onClick={() => setBulkActionType('graduate')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition ${bulkActionType === 'graduate' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  <GraduationCap size={18} /> تخريج
                </button>
                <button onClick={() => setBulkActionType('archive')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition ${bulkActionType === 'archive' ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  <Archive size={18} /> أرشفة
                </button>
              </div>

              {bulkActionType === 'promote' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الصف الجديد *</label>
                    <select required value={newGrade} onChange={e => setNewGrade(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white">
                      <option value="">اختر الصف</option>
                      {grades.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">المجموعة الجديدة (اختياري)</label>
                    <select value={newGroupId} onChange={e => setNewGroupId(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white">
                      <option value="">بدون تغيير</option>
                      {allGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <button onClick={handleBulkAction}
                className="w-full bg-primary-600 text-white py-2.5 rounded-xl font-medium hover:bg-primary-700 transition">
                تنفيذ الإجراء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-medium text-sm">{value || '-'}</p>
    </div>
  );
}
