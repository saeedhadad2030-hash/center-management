import { useState, useEffect, useCallback } from 'react';
import { getStudents, getGroups, addAttendance, getAttendanceByDate, getCurrentUser, getStudentsByGroup } from '../store';
import { Student, Group, Attendance as AttendanceType } from '../types';
import { exportToCSV } from '../utils/export';
import { Check, X as XIcon, Clock, Download, Printer, ClipboardCheck, Search } from 'lucide-react';

export default function Attendance() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceType[]>([]);
  const [search, setSearch] = useState('');

  const user = getCurrentUser();
  const isTeacher = user?.role === 'teacher';

  const refresh = useCallback(() => {
    let loadedGroups = getGroups();
    // Teacher sees only their groups
    if (isTeacher && user?.teacher_id) {
      loadedGroups = loadedGroups.filter(g => g.teacher_id === user.teacher_id);
    }
    setGroups(loadedGroups);
    
    // If a group is selected, use getStudentsByGroup (includes enrollments)
    if (selectedGroup) {
      setStudents(getStudentsByGroup(selectedGroup).filter(s => s.status === 'active'));
    } else if (isTeacher && user?.teacher_id) {
      // Teacher: show students from all their groups
      const groupIds = loadedGroups.map(g => g.id);
      const allStudents = getStudents().filter(s => s.status === 'active');
      const studentIds = new Set<string>();
      allStudents.forEach(s => {
        if (groupIds.includes(s.group_id)) studentIds.add(s.id);
      });
      // Also include enrolled students
      loadedGroups.forEach(g => {
        getStudentsByGroup(g.id).forEach(s => studentIds.add(s.id));
      });
      setStudents(allStudents.filter(s => studentIds.has(s.id)));
    } else {
      setStudents(getStudents().filter(s => s.status === 'active'));
    }
    
    setTodayAttendance(getAttendanceByDate(date));
  }, [date, isTeacher, user?.teacher_id, selectedGroup]);

  useEffect(() => { refresh(); }, [refresh]);

  const filteredStudents = students.filter(s => {
    const matchSearch = !search || s.name.includes(search);
    return matchSearch;
  });

  const getStudentStatus = (studentId: string): 'present' | 'absent' | 'late' | null => {
    const student = students.find(s => s.id === studentId);
    const groupId = selectedGroup || student?.group_id;
    const record = todayAttendance.find(a => a.student_id === studentId && (!groupId || a.group_id === groupId));
    return record?.status || null;
  };

  const handleAttendance = (studentId: string, status: 'present' | 'absent' | 'late') => {
    const student = students.find(s => s.id === studentId);
    const groupId = selectedGroup || student?.group_id;
    if (!groupId) return;

    addAttendance({
      student_id: studentId,
      group_id: groupId,
      date,
      status,
    });
    setTodayAttendance(getAttendanceByDate(date));
  };

  const markAllPresent = () => {
    filteredStudents.forEach(s => handleAttendance(s.id, 'present'));
  };

  const presentCount = filteredStudents.filter(s => getStudentStatus(s.id) === 'present').length;
  const absentCount = filteredStudents.filter(s => getStudentStatus(s.id) === 'absent').length;
  const lateCount = filteredStudents.filter(s => getStudentStatus(s.id) === 'late').length;
  const unmarkedCount = filteredStudents.filter(s => !getStudentStatus(s.id)).length;

  const handleExport = () => {
    const data = filteredStudents.map(s => ({
      الاسم: s.name,
      المجموعة: groups.find(g => g.id === s.group_id)?.name || '',
      الحالة: getStudentStatus(s.id) === 'present' ? 'حاضر' : getStudentStatus(s.id) === 'absent' ? 'غائب' : getStudentStatus(s.id) === 'late' ? 'متأخر' : 'لم يسجل',
      التاريخ: date,
    }));
    exportToCSV(data, `attendance_${date}`);
  };

  const handlePrint = () => {
    const groupName = selectedGroup ? groups.find(g => g.id === selectedGroup)?.name : 'كل المجموعات';
    const rows = filteredStudents.map((s, i) => {
      const status = getStudentStatus(s.id);
      const statusText = status === 'present' ? '✅ حاضر' : status === 'absent' ? '❌ غائب' : status === 'late' ? '⏰ متأخر' : '—';
      return `<tr><td>${i + 1}</td><td>${s.name}</td><td>${groups.find(g => g.id === s.group_id)?.name || ''}</td><td>${statusText}</td></tr>`;
    }).join('');

    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>كشف حضور</title>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
      <style>* { font-family: 'Cairo', sans-serif; } body { padding: 20px; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
      th, td { border: 1px solid #333; padding: 8px; text-align: right; }
      th { background: #1e3a8a; color: white; }
      tr:nth-child(even) { background: #f1f5f9; }
      .header { text-align: center; border-bottom: 3px solid #1e3a8a; padding-bottom: 15px; margin-bottom: 20px; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style></head><body>
      <div class="header"><h1> saeed</h1><h2>كشف حضور - ${date}</h2><p>${groupName}</p></div>
      <table><thead><tr><th>#</th><th>الاسم</th><th>المجموعة</th><th>الحالة</th></tr></thead><tbody>${rows}</tbody></table>
      <div style="margin-top:20px;display:flex;gap:30px"><p>حضور: ${presentCount}</p><p>غياب: ${absentCount}</p><p>متأخر: ${lateCount}</p></div>
      </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 500);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">الحضور والغياب</h1>
          <p className="text-gray-500 text-sm mt-1">تسجيل الحضور والغياب اليومي</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition text-sm">
            <Download size={16} /> تصدير
          </button>
          <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition text-sm">
            <Printer size={16} /> طباعة الكشف
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">التاريخ:</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
          </div>
          <select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white">
            <option value="">كل المجموعات</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="بحث بالاسم..."
              className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
          </div>
          <button onClick={markAllPresent}
            className="px-4 py-2 bg-green-100 text-green-700 rounded-xl text-sm hover:bg-green-200 transition font-medium">
            ✅ تحضير الكل
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{presentCount}</p>
          <p className="text-xs text-green-700">حاضر</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-red-600">{absentCount}</p>
          <p className="text-xs text-red-700">غائب</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-amber-600">{lateCount}</p>
          <p className="text-xs text-amber-700">متأخر</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-gray-600">{unmarkedCount}</p>
          <p className="text-xs text-gray-700">لم يسجل</p>
        </div>
      </div>

      {/* Attendance List */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">#</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">الطالب</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">المجموعة</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">تسجيل الحضور</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student, i) => {
                const status = getStudentStatus(student.id);
                const group = groups.find(g => g.id === student.group_id);
                return (
                  <tr key={student.id} className={`border-b transition ${status === 'absent' ? 'bg-red-50/50' : status === 'present' ? 'bg-green-50/30' : ''}`}>
                    <td className="px-4 py-3 text-sm text-gray-500">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-sm">
                          {student.name.charAt(0)}
                        </div>
                        <span className="font-medium text-sm">{student.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{group?.name || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleAttendance(student.id, 'present')}
                          className={`p-2 rounded-xl transition ${status === 'present' ? 'bg-green-500 text-white shadow-md' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                          title="حاضر">
                          <Check size={18} />
                        </button>
                        <button onClick={() => handleAttendance(student.id, 'absent')}
                          className={`p-2 rounded-xl transition ${status === 'absent' ? 'bg-red-500 text-white shadow-md' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                          title="غائب">
                          <XIcon size={18} />
                        </button>
                        <button onClick={() => handleAttendance(student.id, 'late')}
                          className={`p-2 rounded-xl transition ${status === 'late' ? 'bg-amber-500 text-white shadow-md' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'}`}
                          title="متأخر">
                          <Clock size={18} />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {status === 'present' && <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">✅ حاضر</span>}
                      {status === 'absent' && <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-medium">❌ غائب</span>}
                      {status === 'late' && <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-medium">⏰ متأخر</span>}
                      {!status && <span className="text-xs text-gray-400">—</span>}
                    </td>
                  </tr>
                );
              })}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400">
                    <ClipboardCheck size={40} className="mx-auto mb-2 opacity-50" />
                    <p>لا يوجد طلاب</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
