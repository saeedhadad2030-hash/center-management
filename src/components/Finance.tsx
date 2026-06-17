import { useState, useEffect, useCallback } from 'react';
import { getStudents, getGroups, getPayments, getExpenses, getTeachers } from '../store';
import { TrendingUp, TrendingDown, DollarSign, CreditCard, Building, Users, Percent, Calendar } from 'lucide-react';

export default function Finance() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState({
    expectedRevenue: 0,
    collectedRevenue: 0,
    remainingRevenue: 0,
    collectionRate: 0,
    totalExpenses: 0,
    netProfit: 0,
    teachersSalaries: 0,
    paidStudents: 0,
    unpaidStudents: 0,
    totalStudents: 0,
  });

  const refresh = useCallback(() => {
    const students = getStudents();
    const groups = getGroups();
    const payments = getPayments();
    const expenses = getExpenses();
    const teachers = getTeachers();

    const monthPayments = payments.filter(p => p.month === month);
    const monthExpenses = expenses.filter(e => e.date.startsWith(month));

    const expectedRevenue = students.reduce((sum, s) => {
      const group = groups.find(g => g.id === s.group_id);
      return sum + (group?.fees || 0);
    }, 0);

    const collectedRevenue = monthPayments.reduce((s, p) => s + p.amount, 0);
    const remainingRevenue = expectedRevenue - collectedRevenue;
    const collectionRate = expectedRevenue > 0 ? (collectedRevenue / expectedRevenue) * 100 : 0;

    const totalExpenses = monthExpenses.reduce((s, e) => s + e.amount, 0);
    const teachersSalaries = teachers.reduce((s, t) => s + t.salary, 0);

    const netProfit = collectedRevenue - totalExpenses;

    const paidStudentIds = new Set(monthPayments.map(p => p.student_id));
    const paidStudents = paidStudentIds.size;
    const unpaidStudents = students.length - paidStudents;

    setData({
      expectedRevenue,
      collectedRevenue,
      remainingRevenue,
      collectionRate,
      totalExpenses,
      netProfit,
      teachersSalaries,
      paidStudents,
      unpaidStudents,
      totalStudents: students.length,
    });
  }, [month]);

  useEffect(() => { refresh(); }, [refresh]);

  const cards = [
    { label: 'الإيرادات المتوقعة', value: data.expectedRevenue, icon: DollarSign, color: 'blue', suffix: 'ج.م' },
    { label: 'الإيرادات المحصّلة', value: data.collectedRevenue, icon: TrendingUp, color: 'green', suffix: 'ج.م' },
    { label: 'المتبقي من الطلاب', value: data.remainingRevenue, icon: CreditCard, color: 'amber', suffix: 'ج.م' },
    { label: 'نسبة التحصيل', value: Math.round(data.collectionRate), icon: Percent, color: 'purple', suffix: '%' },
    { label: 'إجمالي المصروفات', value: data.totalExpenses, icon: TrendingDown, color: 'red', suffix: 'ج.م' },
    { label: 'صافي الربح', value: data.netProfit, icon: Building, color: data.netProfit >= 0 ? 'emerald' : 'red', suffix: 'ج.م' },
  ];

  const colorMap: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    amber: 'from-amber-500 to-amber-600',
    purple: 'from-purple-500 to-purple-600',
    red: 'from-red-500 to-red-600',
    emerald: 'from-emerald-500 to-emerald-600',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">التقرير المالي</h1>
          <p className="text-gray-500 text-sm mt-1">نظرة شاملة على الوضع المالي</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm">
          <Calendar size={18} className="text-gray-400" />
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="outline-none text-sm font-medium" />
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="bg-white rounded-2xl shadow-sm p-5 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">{card.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${card.color === 'red' && card.label !== 'إجمالي المصروفات' ? 'text-red-600' : card.color === 'emerald' ? 'text-emerald-600' : 'text-gray-800'}`}>
                    {card.value.toLocaleString()} {card.suffix}
                  </p>
                </div>
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colorMap[card.color]} flex items-center justify-center text-white shadow-lg`}>
                  <Icon size={26} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Net Profit Highlight */}
      <div className={`rounded-2xl p-6 ${data.netProfit >= 0 ? 'bg-gradient-to-l from-emerald-600 to-emerald-500' : 'bg-gradient-to-l from-red-600 to-red-500'} text-white`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80">صافي الربح الشهري</p>
            <p className="text-4xl font-bold mt-2">{data.netProfit.toLocaleString()} ج.م</p>
            <p className="text-white/80 text-sm mt-2">
              الإيرادات ({data.collectedRevenue.toLocaleString()}) - المصروفات ({data.totalExpenses.toLocaleString()})
            </p>
          </div>
          <div className={`w-20 h-20 rounded-full ${data.netProfit >= 0 ? 'bg-emerald-400/30' : 'bg-red-400/30'} flex items-center justify-center`}>
            {data.netProfit >= 0 ? <TrendingUp size={40} /> : <TrendingDown size={40} />}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Collection Progress */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Percent size={18} className="text-primary-600" /> نسبة التحصيل
          </h3>
          <div className="space-y-4">
            <div className="relative pt-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">التقدم</span>
                <span className="text-lg font-bold text-primary-600">{Math.round(data.collectionRate)}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-4">
                <div
                  className="bg-gradient-to-l from-primary-600 to-primary-400 h-4 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(data.collectionRate, 100)}%` }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{data.paidStudents}</p>
                <p className="text-xs text-green-700">طالب سدد</p>
              </div>
              <div className="bg-red-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-red-600">{data.unpaidStudents}</p>
                <p className="text-xs text-red-700">طالب متأخر</p>
              </div>
            </div>
          </div>
        </div>

        {/* Expenses Breakdown */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingDown size={18} className="text-red-600" /> توزيع المصروفات
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-blue-600" />
                <span className="text-sm">مرتبات المدرسين</span>
              </div>
              <span className="font-bold text-blue-600">{data.teachersSalaries.toLocaleString()} ج.م</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
              <div className="flex items-center gap-2">
                <Building size={18} className="text-red-600" />
                <span className="text-sm">مصروفات أخرى</span>
              </div>
              <span className="font-bold text-red-600">{(data.totalExpenses).toLocaleString()} ج.م</span>
            </div>
            <div className="border-t pt-3 flex items-center justify-between">
              <span className="font-medium">إجمالي المصروفات</span>
              <span className="font-bold text-lg text-red-600">{(data.totalExpenses + data.teachersSalaries).toLocaleString()} ج.م</span>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="font-bold text-gray-800 mb-4">ملخص مالي</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b">
                <td className="py-3 text-gray-600">إجمالي الطلاب</td>
                <td className="py-3 font-bold text-left">{data.totalStudents}</td>
              </tr>
              <tr className="border-b">
                <td className="py-3 text-gray-600">الإيرادات المتوقعة (الاشتراكات)</td>
                <td className="py-3 font-bold text-left text-blue-600">{data.expectedRevenue.toLocaleString()} ج.م</td>
              </tr>
              <tr className="border-b">
                <td className="py-3 text-gray-600">الإيرادات المحصّلة</td>
                <td className="py-3 font-bold text-left text-green-600">{data.collectedRevenue.toLocaleString()} ج.م</td>
              </tr>
              <tr className="border-b">
                <td className="py-3 text-gray-600">المتبقي من الطلاب</td>
                <td className="py-3 font-bold text-left text-amber-600">{data.remainingRevenue.toLocaleString()} ج.م</td>
              </tr>
              <tr className="border-b">
                <td className="py-3 text-gray-600">مرتبات المدرسين</td>
                <td className="py-3 font-bold text-left text-red-500">{data.teachersSalaries.toLocaleString()} ج.م</td>
              </tr>
              <tr className="border-b">
                <td className="py-3 text-gray-600">مصروفات تشغيلية</td>
                <td className="py-3 font-bold text-left text-red-500">{data.totalExpenses.toLocaleString()} ج.م</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="py-3 font-bold text-gray-800">صافي الربح</td>
                <td className={`py-3 font-bold text-left text-lg ${data.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {data.netProfit.toLocaleString()} ج.م
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
