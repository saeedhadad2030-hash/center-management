import { useMemo } from 'react';
import { getStudents, getGroups, getAttendance, getPayments, getNotifications, getTeachers, getExpenses, getStudentsByGroup } from '../store';
import { Notification } from '../types';
import { Users, Layers, ClipboardCheck, CreditCard, TrendingUp, Calendar, AlertTriangle, AlertCircle, Info, UserCheck, Wallet, PieChart } from 'lucide-react';

export default function Dashboard() {
  const stats = useMemo(() => {
    const students = getStudents();
    const groups = getGroups();
    const teachers = getTeachers();
    const allAttendance = getAttendance();
    const payments = getPayments();
    const expenses = getExpenses();
    const notifications = getNotifications();
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().toISOString().slice(0, 7);

    const todayAttendance = allAttendance.filter(a => a.date === today);
    const presentToday = todayAttendance.filter(a => a.status === 'present').length;
    const absentToday = todayAttendance.filter(a => a.status === 'absent').length;

    const monthlyPayments = payments.filter(p => p.payment_date.startsWith(currentMonth));
    const monthlyRevenue = monthlyPayments.reduce((sum, p) => sum + p.amount, 0);

    const monthlyExpenses = expenses.filter(e => e.date.startsWith(currentMonth));
    const totalExpenses = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
    const teachersSalaries = teachers.reduce((sum, t) => sum + t.salary, 0);

    const recentPayments = [...payments].sort((a, b) => b.payment_date.localeCompare(a.payment_date)).slice(0, 5);

    const expectedRevenue = groups.reduce((sum, g) => {
      const groupStudents = getStudentsByGroup(g.id).filter(s => s.status === 'active');
      return sum + (groupStudents.length * g.fees);
    }, 0);

    const paidStudentIds = new Set(monthlyPayments.map(p => p.student_id));
    const unpaidStudents = students.filter(s => !paidStudentIds.has(s.id));

    const netProfit = monthlyRevenue - totalExpenses - teachersSalaries;

    return {
      totalStudents: students.length,
      totalGroups: groups.length,
      totalTeachers: teachers.length,
      presentToday,
      absentToday,
      todayTotal: todayAttendance.length,
      monthlyRevenue,
      totalExpenses: totalExpenses + teachersSalaries,
      netProfit,
      expectedRevenue,
      recentPayments,
      unpaidStudents: unpaidStudents.length,
      students,
      groups,
      notifications,
    };
  }, []);

  const cards = [
    { label: 'عدد الطلاب', value: stats.totalStudents, icon: <Users size={28} />, color: 'from-blue-500 to-blue-600' },
    { label: 'عدد المجموعات', value: stats.totalGroups, icon: <Layers size={28} />, color: 'from-purple-500 to-purple-600' },
    { label: 'عدد المدرسين', value: stats.totalTeachers, icon: <UserCheck size={28} />, color: 'from-indigo-500 to-indigo-600' },
    { label: 'الحضور اليوم', value: `${stats.presentToday}/${stats.todayTotal}`, icon: <ClipboardCheck size={28} />, color: 'from-green-500 to-green-600' },
    { label: 'إيرادات الشهر', value: `${stats.monthlyRevenue.toLocaleString()}`, icon: <CreditCard size={28} />, color: 'from-emerald-500 to-emerald-600', suffix: 'ج.م' },
    { label: 'مصروفات الشهر', value: `${stats.totalExpenses.toLocaleString()}`, icon: <Wallet size={28} />, color: 'from-red-500 to-red-600', suffix: 'ج.م' },
  ];

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'warning': return <AlertTriangle size={18} className="text-amber-500" />;
      case 'danger': return <AlertCircle size={18} className="text-red-500" />;
      default: return <Info size={18} className="text-blue-500" />;
    }
  };

  const getNotificationBg = (type: Notification['type']) => {
    switch (type) {
      case 'warning': return 'bg-amber-50 border-amber-200';
      case 'danger': return 'bg-red-50 border-red-200';
      default: return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">لوحة التحكم</h1>
          <p className="text-gray-500 text-sm mt-1">مرحباً بك في نظام إدارة السنتر التعليمي</p>
        </div>
        <div className="hidden md:flex items-center gap-2 text-sm text-gray-500 bg-white px-4 py-2 rounded-xl shadow-sm">
          <Calendar size={16} />
          <span>{new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      {/* Notifications */}
      {stats.notifications.length > 0 && (
        <div className="space-y-2">
          {stats.notifications.map(n => (
            <div key={n.id} className={`flex items-center gap-3 p-3 rounded-xl border ${getNotificationBg(n.type)}`}>
              {getNotificationIcon(n.type)}
              <div className="flex-1">
                <span className="font-medium text-sm">{n.title}:</span>
                <span className="text-sm text-gray-600 mr-2">{n.message}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map((card, i) => (
          <div key={i} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow p-4">
            <div className="flex flex-col">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${card.color} flex items-center justify-center text-white shadow-lg mb-3`}>
                {card.icon}
              </div>
              <p className="text-gray-500 text-xs">{card.label}</p>
              <p className="text-xl font-bold text-gray-800 mt-1">
                {card.value}
                {card.suffix && <span className="text-sm font-normal text-gray-500 mr-1">{card.suffix}</span>}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Net Profit Card */}
      <div className={`rounded-2xl p-6 ${stats.netProfit >= 0 ? 'bg-gradient-to-l from-emerald-600 to-emerald-500' : 'bg-gradient-to-l from-red-600 to-red-500'} text-white shadow-lg`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-white/80">
              <PieChart size={20} />
              <span>صافي ربح الشهر</span>
            </div>
            <p className="text-4xl font-bold mt-2">{stats.netProfit.toLocaleString()} ج.م</p>
            <p className="text-white/80 text-sm mt-2">
              الإيرادات ({stats.monthlyRevenue.toLocaleString()}) - المصروفات ({stats.totalExpenses.toLocaleString()})
            </p>
          </div>
          <div className={`w-20 h-20 rounded-full ${stats.netProfit >= 0 ? 'bg-white/20' : 'bg-white/20'} flex items-center justify-center`}>
            <TrendingUp size={40} className={stats.netProfit >= 0 ? '' : 'rotate-180'} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Progress */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={20} className="text-primary-600" />
            <h3 className="font-bold text-gray-800">تقدم الإيرادات الشهرية</h3>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">المحصّل</span>
              <span className="font-bold text-green-600">{stats.monthlyRevenue.toLocaleString()} ج.م</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-4">
              <div
                className="bg-gradient-to-l from-green-400 to-green-600 h-4 rounded-full transition-all duration-500"
                style={{ width: `${stats.expectedRevenue > 0 ? Math.min((stats.monthlyRevenue / stats.expectedRevenue) * 100, 100) : 0}%` }}
              />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">المتوقع</span>
              <span className="font-bold text-gray-800">{stats.expectedRevenue.toLocaleString()} ج.م</span>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-600" />
              <span className="text-amber-600 text-sm">{stats.unpaidStudents} طالب لم يسددوا هذا الشهر</span>
            </div>
          </div>
        </div>

        {/* Recent Payments */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard size={20} className="text-primary-600" />
            <h3 className="font-bold text-gray-800">آخر المدفوعات</h3>
          </div>
          {stats.recentPayments.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <CreditCard size={40} className="mx-auto mb-2 opacity-50" />
              <p>لا توجد مدفوعات بعد</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recentPayments.map(payment => {
                const student = stats.students.find(s => s.id === payment.student_id);
                return (
                  <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-sm">
                        {student?.name.charAt(0) || '؟'}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-gray-800">{student?.name || 'غير معروف'}</p>
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

      {/* Groups Overview */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Layers size={20} className="text-primary-600" />
          <h3 className="font-bold text-gray-800">نظرة عامة على المجموعات</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.groups.slice(0, 6).map(group => {
            const groupStudents = getStudentsByGroup(group.id);
            const percentage = group.max_students > 0 ? (groupStudents.length / group.max_students) * 100 : 0;
            return (
              <div key={group.id} className="border border-gray-100 rounded-xl p-4 hover:shadow-md transition">
                <h4 className="font-bold text-gray-800 text-sm mb-2 truncate">{group.name}</h4>
                <p className="text-xs text-gray-500 mb-1">المدرس: {group.teacher}</p>
                <p className="text-xs text-gray-500 mb-3">{group.schedule} - {group.time}</p>
                <div className="flex justify-between text-xs mb-1">
                  <span>{groupStudents.length}/{group.max_students} طالب</span>
                  <span className={percentage >= 90 ? 'text-red-500' : 'text-green-500'}>{Math.round(percentage)}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${percentage >= 90 ? 'bg-red-500' : percentage >= 70 ? 'bg-amber-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
