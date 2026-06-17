import { useState, useEffect, useCallback } from 'react';
import { getStudents, getGroups, getPayments, addPayment, deletePayment, getCurrentUser, getStudentsByGroup, getTeacherGroups } from '../store';
import { Student, Group, Payment } from '../types';
import { exportToCSV } from '../utils/export';
import { Plus, Download, Trash2, X, AlertTriangle, CreditCard, Search, MessageSquare, Check, Users } from 'lucide-react';

export default function Payments() {
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
  const [filterGroup, setFilterGroup] = useState('');
  const [search, setSearch] = useState('');
  const [showUnpaid, setShowUnpaid] = useState(false);
  const [showPaymentTracker, setShowPaymentTracker] = useState(false);

  const user = getCurrentUser();
  const isTeacher = user?.role === 'teacher';

  const [form, setForm] = useState({
    student_id: '', amount: 0, payment_date: new Date().toISOString().split('T')[0], month: new Date().toISOString().slice(0, 7), notes: '', group_id: '', teacher_id: '',
  });

  const refresh = useCallback(() => {
    let loadedGroups = getGroups();
    let loadedStudents = getStudents().filter(s => s.status === 'active');
    
    if (isTeacher && user?.teacher_id) {
      loadedGroups = getTeacherGroups(user.teacher_id);
      // Get students from teacher's groups (including enrollments)
      const studentIds = new Set<string>();
      loadedGroups.forEach(g => {
        getStudentsByGroup(g.id).forEach(s => studentIds.add(s.id));
      });
      loadedStudents = loadedStudents.filter(s => studentIds.has(s.id));
    }
    
    setStudents(loadedStudents);
    setGroups(loadedGroups);
    setPayments(getPayments());
  }, [isTeacher, user?.teacher_id]);

  useEffect(() => { refresh(); }, [refresh]);

  // Filter payments by teacher's groups if teacher
  const relevantPayments = isTeacher && user?.teacher_id
    ? payments.filter(p => p.teacher_id === user.teacher_id)
    : payments;

  const monthPayments = relevantPayments.filter(p => p.month === filterMonth);
  const totalRevenue = monthPayments.reduce((s, p) => s + p.amount, 0);

  const filteredMonthPayments = monthPayments.filter(p => {
    const matchGroup = !filterGroup || p.group_id === filterGroup;
    const matchSearch = !search || students.find(s => s.id === p.student_id)?.name.includes(search);
    return matchGroup && matchSearch;
  });

  const paidStudentGroupKeys = new Set(monthPayments.map(p => `${p.student_id}_${p.group_id}`));
  
  // Calculate unpaid per group
  const unpaidEntries: { student: Student; group: Group }[] = [];
  groups.forEach(g => {
    const groupStudents = getStudentsByGroup(g.id).filter(s => s.status === 'active');
    groupStudents.forEach(s => {
      if (!paidStudentGroupKeys.has(`${s.id}_${g.id}`)) {
        unpaidEntries.push({ student: s, group: g });
      }
    });
  });

  const expectedRevenue = groups.reduce((sum, g) => {
    const groupStudents = getStudentsByGroup(g.id).filter(s => s.status === 'active');
    return sum + (groupStudents.length * g.fees);
  }, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addPayment(form);
    setShowForm(false);
    setForm({ student_id: '', amount: 0, payment_date: new Date().toISOString().split('T')[0], month: filterMonth, notes: '', group_id: '', teacher_id: '' });
    refresh();
  };

  const handleDelete = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الدفع؟')) {
      deletePayment(id);
      refresh();
    }
  };

  const handleExport = () => {
    const data = filteredMonthPayments.map(p => {
      const student = students.find(s => s.id === p.student_id);
      const group = groups.find(g => g.id === p.group_id);
      return {
        الطالب: student?.name || '',
        المجموعة: group?.name || '',
        المبلغ: p.amount,
        'تاريخ السداد': p.payment_date,
        الشهر: p.month,
        ملاحظات: p.notes,
      };
    });
    exportToCSV(data, `payments_${filterMonth}`);
  };

  const sendWhatsApp = (student: Student, message: string) => {
    const phone = student.parent_phone || student.phone;
    if (!phone) { alert('لا يوجد رقم هاتف'); return; }
    const formattedPhone = phone.startsWith('0') ? '2' + phone : phone;
    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleSelectStudent = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    const group = groups.find(g => g.id === student?.group_id);
    setForm(f => ({ 
      ...f, 
      student_id: studentId, 
      amount: group?.fees || f.amount,
      group_id: student?.group_id || '',
      teacher_id: group?.teacher_id || '',
    }));
  };

  // Quick payment toggle for a student in a group
  const handleQuickPayment = (studentId: string, groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    const existingPayment = monthPayments.find(p => p.student_id === studentId && p.group_id === groupId);
    
    if (existingPayment) {
      if (confirm('هل تريد حذف هذه الدفعة؟')) {
        deletePayment(existingPayment.id);
        refresh();
      }
    } else {
      addPayment({
        student_id: studentId,
        group_id: groupId,
        teacher_id: group?.teacher_id || '',
        amount: group?.fees || 0,
        payment_date: new Date().toISOString().split('T')[0],
        month: filterMonth,
        notes: '',
      });
      refresh();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{isTeacher ? 'مدفوعات طلابي' : 'الأقساط والمدفوعات'}</h1>
          <p className="text-gray-500 text-sm mt-1">إدارة الأقساط والمتابعة المالية</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowPaymentTracker(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition text-sm">
            <Users size={16} /> تتبع الدفع
          </button>
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition text-sm">
            <Download size={16} /> تصدير
          </button>
          <button onClick={() => { setForm({ student_id: '', amount: 0, payment_date: new Date().toISOString().split('T')[0], month: filterMonth, notes: '', group_id: '', teacher_id: '' }); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition text-sm">
            <Plus size={16} /> تسجيل دفعة
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-gray-500 text-sm">إجمالي المحصّل</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{totalRevenue.toLocaleString()} ج.م</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-gray-500 text-sm">المتوقع</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{expectedRevenue.toLocaleString()} ج.م</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-gray-500 text-sm">المتبقي</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{(expectedRevenue - totalRevenue).toLocaleString()} ج.م</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-5 cursor-pointer hover:shadow-md transition" onClick={() => setShowUnpaid(true)}>
          <p className="text-gray-500 text-sm">متأخرين عن السداد</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{unpaidEntries.length} طالب</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">الشهر:</label>
          <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
        </div>
        <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)}
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
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">#</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">الطالب</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">المجموعة</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">المبلغ</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">تاريخ السداد</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">ملاحظات</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredMonthPayments.map((p, i) => {
                const student = students.find(s => s.id === p.student_id);
                const group = groups.find(g => g.id === p.group_id);
                return (
                  <tr key={p.id} className="border-b hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-sm text-gray-500">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-sm">{student?.name || 'غير معروف'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{group?.name || '-'}</td>
                    <td className="px-4 py-3 font-bold text-green-600">{p.amount} ج.م</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{p.payment_date}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{p.notes || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleDelete(p.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredMonthPayments.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    <CreditCard size={40} className="mx-auto mb-2 opacity-50" />
                    <p>لا توجد مدفوعات لهذا الشهر</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Payment Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-lg">تسجيل دفعة جديدة</h3>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المجموعة *</label>
                <select required value={form.group_id} onChange={e => {
                  const gId = e.target.value;
                  const g = groups.find(g => g.id === gId);
                  setForm(f => ({ ...f, group_id: gId, teacher_id: g?.teacher_id || '', amount: g?.fees || f.amount, student_id: '' }));
                }}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white">
                  <option value="">اختر المجموعة</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name} - {g.fees} ج.م</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الطالب *</label>
                <select required value={form.student_id} onChange={e => handleSelectStudent(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white">
                  <option value="">اختر الطالب</option>
                  {(form.group_id ? getStudentsByGroup(form.group_id).filter(s => s.status === 'active') : students).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ (ج.م) *</label>
                  <input type="number" required min={1} value={form.amount} onChange={e => setForm({ ...form, amount: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الشهر</label>
                  <input type="month" value={form.month} onChange={e => setForm({ ...form, month: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ السداد</label>
                <input type="date" value={form.payment_date} onChange={e => setForm({ ...form, payment_date: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                <input type="text" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" placeholder="ملاحظات إضافية" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-primary-600 text-white py-2.5 rounded-xl font-medium hover:bg-primary-700 transition">
                  تسجيل الدفعة
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Tracker Modal - Quick toggle paid/unpaid per group */}
      {showPaymentTracker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowPaymentTracker(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
              <div>
                <h3 className="font-bold text-lg">تتبع دفع الطلاب</h3>
                <p className="text-sm text-gray-500">شهر {filterMonth} - اضغط على الطالب لتغيير حالة الدفع</p>
              </div>
              <button onClick={() => setShowPaymentTracker(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-6">
              {groups.map(group => {
                const groupStudents = getStudentsByGroup(group.id).filter(s => s.status === 'active');
                const paidCount = groupStudents.filter(s => paidStudentGroupKeys.has(`${s.id}_${group.id}`)).length;
                
                return (
                  <div key={group.id} className="border border-gray-100 rounded-2xl overflow-hidden">
                    <div className="bg-gradient-to-l from-primary-50 to-white p-4 flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-gray-800">{group.name}</h4>
                        <p className="text-xs text-gray-500">{group.fees} ج.م / شهرياً</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-green-600">{paidCount}</span>
                        <span className="text-sm text-gray-400">/</span>
                        <span className="text-sm font-medium text-gray-600">{groupStudents.length}</span>
                        <span className="text-xs text-gray-400">دفعوا</span>
                      </div>
                    </div>
                    <div className="p-3 space-y-1">
                      {groupStudents.map(student => {
                        const isPaid = paidStudentGroupKeys.has(`${student.id}_${group.id}`);
                        return (
                          <button
                            key={`${student.id}_${group.id}`}
                            onClick={() => handleQuickPayment(student.id, group.id)}
                            className={`w-full flex items-center justify-between p-3 rounded-xl transition ${
                              isPaid 
                                ? 'bg-green-50 hover:bg-green-100 border border-green-200' 
                                : 'bg-red-50 hover:bg-red-100 border border-red-200'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                isPaid ? 'bg-green-500 text-white' : 'bg-red-200 text-red-600'
                              }`}>
                                {isPaid ? <Check size={16} /> : student.name.charAt(0)}
                              </div>
                              <span className="font-medium text-sm">{student.name}</span>
                            </div>
                            <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                              isPaid ? 'bg-green-200 text-green-700' : 'bg-red-200 text-red-700'
                            }`}>
                              {isPaid ? `✅ دفع ${group.fees} ج.م` : '❌ لم يدفع'}
                            </span>
                          </button>
                        );
                      })}
                      {groupStudents.length === 0 && (
                        <p className="text-center text-gray-400 py-4 text-sm">لا يوجد طلاب في هذه المجموعة</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Unpaid Students Modal */}
      {showUnpaid && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowUnpaid(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <AlertTriangle className="text-amber-500" size={20} />
                <h3 className="font-bold text-lg">المتأخرين عن السداد ({unpaidEntries.length})</h3>
              </div>
              <button onClick={() => setShowUnpaid(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-2">
              {unpaidEntries.map(({ student: s, group }) => (
                <div key={`${s.id}_${group.id}`} className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
                  <div>
                    <p className="font-medium text-sm">{s.name}</p>
                    <p className="text-xs text-gray-500">{group.name} - {group.fees} ج.م</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { handleQuickPayment(s.id, group.id); }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-primary-500 text-white rounded-lg text-xs hover:bg-primary-600 transition">
                      <Check size={14} /> تسجيل دفع
                    </button>
                    <button
                      onClick={() => sendWhatsApp(s, `السلام عليكم ورحمة الله\nنود تذكيركم بسداد قسط شهر ${filterMonth} لـ ${s.name}\nالمجموعة: ${group.name}\nالمبلغ: ${group.fees} ج.م\nشكراً لكم 🙏\nالسنتر التعليمي`)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs hover:bg-green-600 transition">
                      <MessageSquare size={14} /> واتساب
                    </button>
                  </div>
                </div>
              ))}
              {unpaidEntries.length === 0 && (
                <p className="text-center text-gray-400 py-8">🎉 جميع الطلاب سددوا هذا الشهر</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
