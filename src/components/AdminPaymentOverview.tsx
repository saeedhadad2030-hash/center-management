import { useState, useMemo } from 'react';
import { getTeachers, getTeacherGroups, getStudentsByGroup, getPayments } from '../store';
import { Teacher, Group, Student, Payment } from '../types';
import { Eye, CreditCard, Users, ChevronDown, ChevronUp, Search, Download, Check, AlertTriangle } from 'lucide-react';
import { exportToCSV } from '../utils/export';

interface TeacherPaymentInfo {
  teacher: Teacher;
  groups: {
    group: Group;
    students: {
      student: Student;
      paid: boolean;
      payment?: Payment;
    }[];
  }[];
  totalStudents: number;
  paidStudents: number;
  totalExpected: number;
  totalCollected: number;
}

export default function AdminPaymentOverview() {
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
  const [expandedTeacher, setExpandedTeacher] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const data = useMemo<TeacherPaymentInfo[]>(() => {
    const teachers = getTeachers();
    const allPayments = getPayments().filter(p => p.month === filterMonth);

    return teachers.map(teacher => {
      const groups = getTeacherGroups(teacher.id);
      let totalStudents = 0;
      let paidStudents = 0;
      let totalExpected = 0;
      let totalCollected = 0;

      const groupsData = groups.map(group => {
        const students = getStudentsByGroup(group.id).filter(s => s.status === 'active');
        const studentsData = students.map(student => {
          const payment = allPayments.find(p => p.student_id === student.id && p.group_id === group.id);
          return { student, paid: !!payment, payment };
        });

        totalStudents += students.length;
        paidStudents += studentsData.filter(s => s.paid).length;
        totalExpected += students.length * group.fees;
        totalCollected += studentsData.filter(s => s.paid).reduce((sum, s) => sum + (s.payment?.amount || 0), 0);

        return { group, students: studentsData };
      });

      return {
        teacher,
        groups: groupsData,
        totalStudents,
        paidStudents,
        totalExpected,
        totalCollected,
      };
    });
  }, [filterMonth]);

  const filteredData = data.filter(d => {
    if (!search) return true;
    return d.teacher.name.includes(search) || d.groups.some(g => g.group.name.includes(search));
  });

  const totalAll = data.reduce((acc, d) => ({
    students: acc.students + d.totalStudents,
    paid: acc.paid + d.paidStudents,
    expected: acc.expected + d.totalExpected,
    collected: acc.collected + d.totalCollected,
  }), { students: 0, paid: 0, expected: 0, collected: 0 });

  const handleExport = () => {
    const rows: Record<string, string | number>[] = [];
    data.forEach(d => {
      d.groups.forEach(g => {
        g.students.forEach(s => {
          rows.push({
            المدرس: d.teacher.name,
            المجموعة: g.group.name,
            الطالب: s.student.name,
            'رسوم الشهر': g.group.fees,
            'الحالة': s.paid ? 'دفع' : 'لم يدفع',
            'المبلغ المدفوع': s.payment?.amount || 0,
            'تاريخ الدفع': s.payment?.payment_date || '-',
          });
        });
      });
    });
    exportToCSV(rows, `payment_overview_${filterMonth}`);
  };

  const toggleTeacher = (id: string) => {
    setExpandedTeacher(prev => prev === id ? null : id);
  };

  const monthName = new Date(filterMonth + '-01').toLocaleDateString('ar-EG', { year: 'numeric', month: 'long' });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">ملخص الدفع لكل مدرس</h1>
          <p className="text-gray-500 text-sm mt-1">نظرة شاملة على حالة الدفع لكل المدرسين - {monthName}</p>
        </div>
        <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition text-sm">
          <Download size={16} /> تصدير التقرير
        </button>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
              <Users size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-gray-500 text-xs">إجمالي الطلاب</p>
              <p className="text-2xl font-bold text-gray-800">{totalAll.students}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
              <Check size={24} className="text-green-600" />
            </div>
            <div>
              <p className="text-gray-500 text-xs">دفعوا</p>
              <p className="text-2xl font-bold text-green-600">{totalAll.paid}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
              <AlertTriangle size={24} className="text-red-600" />
            </div>
            <div>
              <p className="text-gray-500 text-xs">لم يدفعوا</p>
              <p className="text-2xl font-bold text-red-600">{totalAll.students - totalAll.paid}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
              <CreditCard size={24} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-gray-500 text-xs">المحصّل</p>
              <p className="text-xl font-bold text-emerald-600">{totalAll.collected.toLocaleString()}<span className="text-sm font-normal text-gray-400 mr-1">ج.م</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">الشهر:</label>
          <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
        </div>
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالمدرس أو المجموعة..."
            className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
        </div>
      </div>

      {/* Teacher Cards */}
      <div className="space-y-4">
        {filteredData.map(info => {
          const isExpanded = expandedTeacher === info.teacher.id;
          const paymentRate = info.totalStudents > 0 ? Math.round((info.paidStudents / info.totalStudents) * 100) : 0;
          
          return (
            <div key={info.teacher.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {/* Teacher Header */}
              <button
                onClick={() => toggleTeacher(info.teacher.id)}
                className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                    {info.teacher.name.charAt(0)}
                  </div>
                  <div className="text-right">
                    <h3 className="font-bold text-gray-800">{info.teacher.name}</h3>
                    <p className="text-xs text-gray-500">{info.teacher.specialization} • {info.groups.length} مجموعة</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {/* Progress */}
                  <div className="hidden md:flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-gray-500">نسبة التحصيل</p>
                      <p className={`text-lg font-bold ${paymentRate >= 80 ? 'text-green-600' : paymentRate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                        {paymentRate}%
                      </p>
                    </div>
                    <div className="w-24 bg-gray-100 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all ${paymentRate >= 80 ? 'bg-green-500' : paymentRate >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${paymentRate}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex gap-4 text-sm">
                    <div className="text-center">
                      <p className="font-bold text-green-600">{info.paidStudents}</p>
                      <p className="text-xs text-gray-400">دفع</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-red-600">{info.totalStudents - info.paidStudents}</p>
                      <p className="text-xs text-gray-400">لم يدفع</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-gray-800">{info.totalCollected.toLocaleString()}</p>
                      <p className="text-xs text-gray-400">ج.م</p>
                    </div>
                  </div>

                  {isExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                </div>
              </button>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t px-5 pb-5 space-y-4 animate-fade-in">
                  {info.groups.map(({ group, students: groupStudents }) => {
                    const paidInGroup = groupStudents.filter(s => s.paid).length;
                    return (
                      <div key={group.id} className="mt-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                            <h4 className="font-bold text-sm text-gray-700">{group.name}</h4>
                            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-500">{group.fees} ج.م</span>
                          </div>
                          <span className="text-xs text-gray-500">
                            <span className="text-green-600 font-medium">{paidInGroup}</span> / {groupStudents.length} دفعوا
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {groupStudents.map(({ student, paid, payment }) => (
                            <div key={`${student.id}_${group.id}`} className={`flex items-center justify-between p-2.5 rounded-xl text-sm ${paid ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
                              <div className="flex items-center gap-2">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${paid ? 'bg-green-500 text-white' : 'bg-red-200 text-red-600'}`}>
                                  {paid ? <Check size={14} /> : '!'}
                                </div>
                                <span className="font-medium">{student.name}</span>
                              </div>
                              {paid ? (
                                <span className="text-xs text-green-600">{payment?.amount} ج.م • {payment?.payment_date}</span>
                              ) : (
                                <span className="text-xs text-red-500 font-medium">لم يدفع</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Teacher Summary */}
                  <div className="bg-gradient-to-l from-primary-50 to-blue-50 rounded-xl p-4 mt-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-xs text-gray-500">المتوقع</p>
                        <p className="font-bold text-gray-800">{info.totalExpected.toLocaleString()} ج.م</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">المحصّل</p>
                        <p className="font-bold text-green-600">{info.totalCollected.toLocaleString()} ج.م</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">المتبقي</p>
                        <p className="font-bold text-red-600">{(info.totalExpected - info.totalCollected).toLocaleString()} ج.م</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredData.length === 0 && (
          <div className="text-center py-12 text-gray-400 bg-white rounded-2xl shadow-sm">
            <Eye size={48} className="mx-auto mb-3 opacity-50" />
            <p className="font-medium">لا توجد بيانات</p>
          </div>
        )}
      </div>
    </div>
  );
}
