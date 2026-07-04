import { useState, useEffect, useCallback } from 'react';
import { getStudents, getGroups, addAttendance, removeAttendance, getAttendanceByDate, getCurrentUser, getStudentsByGroup, getEnrollments } from '../store';
import { Student, Group, Attendance as AttendanceType } from '../types';
import { exportToCSV } from '../utils/export';
import { Check, X as XIcon, Clock, Download, Printer, ClipboardCheck, Search } from 'lucide-react';

// A row in the attendance sheet = one student in one specific group (subject)
interface AttendanceRow {
  student: Student;
  groupId: string;
  groupName: string;
}

export default function Attendance() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceType[]>([]);
  const [search, setSearch] = useState('');

  const user = getCurrentUser();
  const isTeacher = user?.role === 'teacher';

  const refresh = useCallback(() => {
    let loadedGroups = getGroups();
    if (isTeacher && user?.teacher_id) {
      loadedGroups = loadedGroups.filter(g => g.teacher_id === user.teacher_id);
    }
    setGroups(loadedGroups);
    setTodayAttendance(getAttendanceByDate(date));

    const allStudents = getStudents().filter(s => s.status === 'active');
    const allEnrollments = getEnrollments();

    if (selectedGroup) {
      // ─── Single group selected ───────────────────────────────────────────────
      // Show students enrolled in THIS specific group, with attendance for this group
      const groupStudents = getStudentsByGroup(selectedGroup).filter(s => s.status === 'active');
      const group = loadedGroups.find(g => g.id === selectedGroup);
      setRows(groupStudents.map(s => ({
        student: s,
        groupId: selectedGroup,
        groupName: group?.name || '',
      })));
    } else {
      // ─── All groups: each student appears ONCE PER GROUP they belong to ──────
      // Build rows: for every group, for every student in that group → one row
      const generatedRows: AttendanceRow[] = [];
      const visibleGroupIds = new Set(loadedGroups.map(g => g.id));

      // Collect all (student, group) pairs from enrollments + primary group_id
      const pairSet = new Set<string>(); // "studentId|groupId"

      allStudents.forEach(s => {
        // Primary group_id
        if (s.group_id && visibleGroupIds.has(s.group_id)) {
          pairSet.add(`${s.id}|${s.group_id}`);
        }
        // Extra enrollments
        allEnrollments
          .filter(e => e.student_id === s.id && visibleGroupIds.has(e.group_id))
          .forEach(e => pairSet.add(`${s.id}|${e.group_id}`));
      });

      pairSet.forEach(pair => {
        const [studentId, groupId] = pair.split('|');
        const student = allStudents.find(s => s.id === studentId);
        const group = loadedGroups.find(g => g.id === groupId);
        if (student && group) {
          generatedRows.push({ student, groupId, groupName: group.name });
        }
      });

      // Sort: by group name then student name
      generatedRows.sort((a, b) =>
        a.groupName.localeCompare(b.groupName, 'ar') ||
        a.student.name.localeCompare(b.student.name, 'ar')
      );
      setRows(generatedRows);
    }
  }, [date, isTeacher, user?.teacher_id, selectedGroup]);

  useEffect(() => { refresh(); }, [refresh]);

  const filteredRows = rows.filter(r =>
    !search || r.student.name.includes(search)
  );

  // Attendance status for a specific (student, group) pair
  const getStatus = (studentId: string, groupId: string): 'present' | 'absent' | 'late' | null => {
    const record = todayAttendance.find(
      a => a.student_id === studentId && a.group_id === groupId
    );
    return record?.status || null;
  };

  const handleAttendance = (studentId: string, groupId: string, status: 'present' | 'absent' | 'late') => {
    if (!groupId) return;
    const currentStatus = getStatus(studentId, groupId);
    if (currentStatus === status) {
      removeAttendance(studentId, groupId, date);
    } else {
      addAttendance({ student_id: studentId, group_id: groupId, date, status });
    }
    setTodayAttendance(getAttendanceByDate(date));
  };

  const markAllPresent = () => {
    filteredRows.forEach(r => {
      const status = getStatus(r.student.id, r.groupId);
      if (status !== 'present') {
        addAttendance({ student_id: r.student.id, group_id: r.groupId, date, status: 'present' });
      }
    });
    setTodayAttendance(getAttendanceByDate(date));
  };

  const presentCount = filteredRows.filter(r => getStatus(r.student.id, r.groupId) === 'present').length;
  const absentCount  = filteredRows.filter(r => getStatus(r.student.id, r.groupId) === 'absent').length;
  const lateCount    = filteredRows.filter(r => getStatus(r.student.id, r.groupId) === 'late').length;
  const unmarkedCount = filteredRows.filter(r => !getStatus(r.student.id, r.groupId)).length;

  const handleExport = () => {
    const data = filteredRows.map(r => ({
      الاسم: r.student.name,
      المادة: r.groupName,
      الحالة: getStatus(r.student.id, r.groupId) === 'present' ? 'حاضر'
            : getStatus(r.student.id, r.groupId) === 'absent'  ? 'غائب'
            : getStatus(r.student.id, r.groupId) === 'late'    ? 'متأخر'
            : 'لم يسجل',
      التاريخ: date,
    }));
    exportToCSV(data, `attendance_${date}`);
  };

  const handlePrint = () => {
    const groupName = selectedGroup ? groups.find(g => g.id === selectedGroup)?.name : 'كل المواد';
    const rows_html = filteredRows.map((r, i) => {
      const status = getStatus(r.student.id, r.groupId);
      const statusText = status === 'present' ? '✅ حاضر' : status === 'absent' ? '❌ غائب' : status === 'late' ? '⏰ متأخر' : '—';
      return `<tr><td>${i + 1}</td><td>${r.student.name}</td><td>${r.groupName}</td><td>${statusText}</td></tr>`;
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
      <div class="header"><h2>كشف حضور - ${date}</h2><p>${groupName}</p></div>
      <table><thead><tr><th>#</th><th>الاسم</th><th>المادة</th><th>الحالة</th></tr></thead><tbody>${rows_html}</tbody></table>
      <div style="margin-top:20px;display:flex;gap:30px"><p>حضور: ${presentCount}</p><p>غياب: ${absentCount}</p><p>متأخر: ${lateCount}</p></div>
      </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 500);
  };

  // Group rows by groupName for the "all groups" view
  const groupedRows: { groupId: string; groupName: string; items: AttendanceRow[] }[] = [];
  if (!selectedGroup) {
    const seen = new Map<string, AttendanceRow[]>();
    filteredRows.forEach(r => {
      if (!seen.has(r.groupId)) seen.set(r.groupId, []);
      seen.get(r.groupId)!.push(r);
    });
    seen.forEach((items, groupId) => {
      groupedRows.push({ groupId, groupName: items[0].groupName, items });
    });
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">الحضور والغياب</h1>
          <p className="text-gray-500 text-sm mt-1">تسجيل الحضور اليومي — كل مادة مستقلة</p>
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
            <option value="">كل المواد</option>
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
      {selectedGroup ? (
        // ── Single-group view: simple flat table ──────────────────────────────
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">#</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">الطالب</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">المادة</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">تسجيل الحضور</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r, i) => {
                  const status = getStatus(r.student.id, r.groupId);
                  return (
                    <tr key={`${r.student.id}-${r.groupId}`} className={`border-b transition ${status === 'absent' ? 'bg-red-50/50' : status === 'present' ? 'bg-green-50/30' : ''}`}>
                      <td className="px-4 py-3 text-sm text-gray-500">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-sm">
                            {r.student.name.charAt(0)}
                          </div>
                          <span className="font-medium text-sm">{r.student.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-lg">{r.groupName}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleAttendance(r.student.id, r.groupId, 'present')}
                            className={`p-2 rounded-xl transition ${status === 'present' ? 'bg-green-500 text-white shadow-md' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                            title="حاضر"><Check size={18} /></button>
                          <button onClick={() => handleAttendance(r.student.id, r.groupId, 'absent')}
                            className={`p-2 rounded-xl transition ${status === 'absent' ? 'bg-red-500 text-white shadow-md' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                            title="غائب"><XIcon size={18} /></button>
                          <button onClick={() => handleAttendance(r.student.id, r.groupId, 'late')}
                            className={`p-2 rounded-xl transition ${status === 'late' ? 'bg-amber-500 text-white shadow-md' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'}`}
                            title="متأخر"><Clock size={18} /></button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {status === 'present' && <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">✅ حاضر</span>}
                        {status === 'absent'  && <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-medium">❌ غائب</span>}
                        {status === 'late'    && <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-medium">⏰ متأخر</span>}
                        {!status && <span className="text-xs text-gray-400">—</span>}
                      </td>
                    </tr>
                  );
                })}
                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-gray-400">
                      <ClipboardCheck size={40} className="mx-auto mb-2 opacity-50" />
                      <p>لا يوجد طلاب في هذه المادة</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        // ── All groups: grouped by subject ──────────────────────────────────
        <div className="space-y-4">
          {groupedRows.length === 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-gray-400">
              <ClipboardCheck size={40} className="mx-auto mb-2 opacity-50" />
              <p>لا يوجد طلاب</p>
            </div>
          )}
          {groupedRows.map(({ groupId, groupName, items }) => {
            const gPresent = items.filter(r => getStatus(r.student.id, r.groupId) === 'present').length;
            const gAbsent  = items.filter(r => getStatus(r.student.id, r.groupId) === 'absent').length;
            const filteredItems = items.filter(r => !search || r.student.name.includes(search));
            return (
              <div key={groupId} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {/* Group header */}
                <div className="bg-primary-50 border-b border-primary-100 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary-500 inline-block"></span>
                    <span className="font-bold text-primary-800 text-sm">{groupName}</span>
                    <span className="text-xs text-gray-500">({filteredItems.length} طالب)</span>
                  </div>
                  <div className="flex gap-3 text-xs">
                    <span className="text-green-600 font-medium">✅ {gPresent} حاضر</span>
                    <span className="text-red-500 font-medium">❌ {gAbsent} غائب</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">#</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">الطالب</th>
                        <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500">تسجيل الحضور</th>
                        <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.map((r, i) => {
                        const status = getStatus(r.student.id, r.groupId);
                        return (
                          <tr key={`${r.student.id}-${r.groupId}`} className={`border-b transition ${status === 'absent' ? 'bg-red-50/50' : status === 'present' ? 'bg-green-50/30' : ''}`}>
                            <td className="px-4 py-2 text-sm text-gray-500">{i + 1}</td>
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-sm">
                                  {r.student.name.charAt(0)}
                                </div>
                                <span className="font-medium text-sm">{r.student.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex items-center justify-center gap-2">
                                <button onClick={() => handleAttendance(r.student.id, r.groupId, 'present')}
                                  className={`p-1.5 rounded-lg transition ${status === 'present' ? 'bg-green-500 text-white shadow-sm' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                                  title="حاضر"><Check size={16} /></button>
                                <button onClick={() => handleAttendance(r.student.id, r.groupId, 'absent')}
                                  className={`p-1.5 rounded-lg transition ${status === 'absent' ? 'bg-red-500 text-white shadow-sm' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                                  title="غائب"><XIcon size={16} /></button>
                                <button onClick={() => handleAttendance(r.student.id, r.groupId, 'late')}
                                  className={`p-1.5 rounded-lg transition ${status === 'late' ? 'bg-amber-500 text-white shadow-sm' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'}`}
                                  title="متأخر"><Clock size={16} /></button>
                              </div>
                            </td>
                            <td className="px-4 py-2 text-center">
                              {status === 'present' && <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">✅ حاضر</span>}
                              {status === 'absent'  && <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">❌ غائب</span>}
                              {status === 'late'    && <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">⏰ متأخر</span>}
                              {!status && <span className="text-xs text-gray-400">—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
