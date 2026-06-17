import { useMemo } from 'react';
import { getTeacherById, getGroups, getStudents, getAttendance, getPaymentsByTeacher, getTeacherStats, getExams, getStudentsByGroup, getPayments } from '../store';
import { Users, Layers, ClipboardCheck, CreditCard, Calendar, DollarSign, FileText, Check, X } from 'lucide-react';

interface TeacherDashboardProps {
  teacherId: string;
}

export default function TeacherDashboard({ teacherId }: TeacherDashboardProps) {
  const stats = useMemo(() => {
    const teacher = getTeacherById(teacherId);
    const allGroups = getGroups();
    const allAttendance = getAttendance();
    const payments = getPaymentsByTeacher(teacherId);
    const allPayments = getPayments();
    const exams = getExams();
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().toISOString().slice(0, 7);

    const teacherGroups = allGroups.filter(g => g.teacher_id === teacherId);
    const groupIds = teacherGroups.map(g => g.id);
    
    // Count unique students across all groups (with enrollments)
    const teacherStudentIds = new Set<string>();
    teacherGroups.forEach(g => {
      getStudentsByGroup(g.id).forEach(s => teacherStudentIds.add(s.id));
    });

    const todayAttendance = allAttendance.filter(a => a.date === today && groupIds.includes(a.group_id));
    const presentToday = todayAttendance.filter(a => a.status === 'present').length;

    const monthPayments = payments.filter(p => p.month === currentMonth);
    const monthlyRevenue = monthPayments.reduce((sum, p) => sum + p.amount, 0);

    const teacherStat = getTeacherStats(teacherId, currentMonth);

    const teacherExams = exams.filter(e => groupIds.includes(e.group_id));

    // Payment status per group
    const groupPaymentStatus = teacherGroups.map(group => {
      const groupStudents = getStudentsByGroup(group.id).filter(s => s.status === 'active');
      const paidStudents = groupStudents.filter(s => 
        allPayments.some(p => p.student_id === s.id && p.group_id === group.id && p.month === currentMonth)
      );
      return {
        group,
        total: groupStudents.length,
        paid: paidStudents.length,
        unpaid: groupStudents.length - paidStudents.length,
      };
    });

    return {
      teacher,
      groups: teacherGroups,
      totalStudents: teacherStudentIds.size,
      presentToday,
      todayTotal: todayAttendance.length,
      monthlyRevenue,
      teacherShare: teacherStat.teacher_share,
      paidAmount: teacherStat.paid_amount,
      remaining: teacherStat.remaining,
      exams: teacherExams,
      recentPayments: monthPayments.slice(0, 5),
      groupPaymentStatus,
      allStudents: getStudents(),
    };
  }, [teacherId]);

  const cards = [
    { label: 'عدد طلابي', value: stats.totalStudents, icon: <Users size={24} />, color: 'from-blue-500 to-blue-600' },
    { label: 'عدد مجموعاتي', value: stats.groups.length, icon: <Layers size={24} />, color: 'from-purple-500 to-purple-600' },
    { label: 'الحضور اليوم', value: `${stats.presentToday}/${stats.todayTotal}`, icon: <ClipboardCheck size={24} />, color: 'from-green-500 to-green-600' },
    { label: 'إجمالي التحصيل', value: `${stats.monthlyRevenue.toLocaleString()}`, icon: <CreditCard size={24} />, color: 'from-emerald-500 to-emerald-600', suffix: 'ج.م' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">مرحباً، {stats.teacher?.name}</h1>
          <p className="text-gray-500 text-sm mt-1">لوحة تحكم المدرس</p>
        </div>
        <div className="hidden md:flex items-center gap-2 text-sm text-gray-500 bg-white px-4 py-2 rounded-xl shadow-sm">
          <Calendar size={16} />
          <span>{new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <div key={i} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">{card.label}</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">
                  {card.value}
                  {card.suffix && <span className="text-sm font-normal text-gray-500 mr-1">{card.suffix}</span>}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${card.color} flex items-center justify-center text-white shadow-lg`}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* My Earnings */}
      <div className={`rounded-2xl p-6 ${stats.remaining > 0 ? 'bg-gradient-to-l from-amber-500 to-amber-400' : 'bg-gradient-to-l from-green-600 to-green-500'} text-white shadow-lg`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-white/80">
              <DollarSign size={20} />
              <span>مستحقاتي هذا الشهر</span>
            </div>
            <p className="text-4xl font-bold mt-2">{stats.teacherShare.toLocaleString()} ج.م</p>
            <div className="flex gap-6 mt-3 text-white/80 text-sm">
              <span>المدفوع: {stats.paidAmount.toLocaleString()} ج.م</span>
              <span>المتبقي: {stats.remaining.toLocaleString()} ج.م</span>
            </div>
          </div>
          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">
            <DollarSign size={40} />
          </div>
        </div>
      </div>

      {/* Payment Status Per Group */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard size={20} className="text-primary-600" />
          <h3 className="font-bold text-gray-800">حالة الدفع هذا الشهر</h3>
        </div>
        <div className="space-y-4">
          {stats.groupPaymentStatus.map(({ group, total, paid, unpaid }) => {
            const rate = total > 0 ? Math.round((paid / total) * 100) : 0;
            return (
              <div key={group.id} className="border border-gray-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">{group.name}</h4>
                  <span className="text-xs text-gray-500">{group.fees} ج.م / شهر</span>
                </div>
                <div className="flex items-center gap-4 mb-2">
                  <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full transition-all ${rate >= 80 ? 'bg-green-500' : rate >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                      style={{ width: `${rate}%` }}
                    />
                  </div>
                  <span className={`text-sm font-bold ${rate >= 80 ? 'text-green-600' : rate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                    {rate}%
                  </span>
                </div>
                <div className="flex gap-4 text-xs">
                  <span className="flex items-center gap-1 text-green-600">
                    <Check size={12} /> {paid} دفعوا
                  </span>
                  <span className="flex items-center gap-1 text-red-500">
                    <X size={12} /> {unpaid} لم يدفعوا
                  </span>
                  <span className="text-gray-400">من {total} طالب</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Groups */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Layers size={20} className="text-primary-600" />
            <h3 className="font-bold text-gray-800">مجموعاتي</h3>
          </div>
          <div className="space-y-3">
            {stats.groups.map(group => {
              const groupStudents = getStudentsByGroup(group.id);
              return (
                <div key={group.id} className="p-3 bg-gray-50 rounded-xl">
                  <h4 className="font-medium text-sm">{group.name}</h4>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                    <span>{groupStudents.length} طالب</span>
                    <span>{group.schedule}</span>
                    <span>{group.time}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* My Exams */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={20} className="text-purple-600" />
            <h3 className="font-bold text-gray-800">امتحاناتي</h3>
          </div>
          {stats.exams.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <FileText size={32} className="mx-auto mb-2 opacity-50" />
              <p>لا توجد امتحانات</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.exams.slice(0, 5).map(exam => {
                const group = stats.groups.find(g => g.id === exam.group_id);
                return (
                  <div key={exam.id} className="p-3 bg-purple-50 rounded-xl">
                    <h4 className="font-medium text-sm">{exam.title}</h4>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                      <span>{group?.name}</span>
                      <span>{exam.date}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Payments */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard size={20} className="text-green-600" />
          <h3 className="font-bold text-gray-800">آخر المدفوعات</h3>
        </div>
        {stats.recentPayments.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <CreditCard size={32} className="mx-auto mb-2 opacity-50" />
            <p>لا توجد مدفوعات هذا الشهر</p>
          </div>
        ) : (
          <div className="space-y-2">
            {stats.recentPayments.map(payment => {
              const student = stats.allStudents.find(s => s.id === payment.student_id);
              return (
                <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-sm font-bold">
                      {student?.name.charAt(0) || '؟'}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{student?.name || 'غير معروف'}</p>
                      <p className="text-xs text-gray-500">{payment.payment_date}</p>
                    </div>
                  </div>
                  <span className="font-bold text-green-600">{payment.amount} ج.م</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
