import { useState, useEffect, useCallback } from 'react';
import { TeacherStats } from '../types';
import { getAllTeachersStats, addTeacherPayment, getTeacherPaymentsByTeacher, getPaymentsByTeacher, getGroups, getStudents } from '../store';
import { exportToCSV } from '../utils/export';
import { Download, X, DollarSign, Users, Printer, Eye } from 'lucide-react';

export default function TeacherPayments() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [stats, setStats] = useState<TeacherStats[]>([]);
  const [showPayForm, setShowPayForm] = useState<TeacherStats | null>(null);
  const [showDetails, setShowDetails] = useState<TeacherStats | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payNotes, setPayNotes] = useState('');

  const refresh = useCallback(() => {
    setStats(getAllTeachersStats(month));
  }, [month]);

  useEffect(() => { refresh(); }, [refresh]);

  const totalCollected = stats.reduce((sum, s) => sum + s.total_collected, 0);
  const totalTeacherShare = stats.reduce((sum, s) => sum + s.teacher_share, 0);
  const totalCenterShare = stats.reduce((sum, s) => sum + s.center_share, 0);
  const totalPaid = stats.reduce((sum, s) => sum + s.paid_amount, 0);
  const totalRemaining = stats.reduce((sum, s) => sum + s.remaining, 0);

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    if (showPayForm) {
      addTeacherPayment({
        teacher_id: showPayForm.teacher_id,
        amount: payAmount,
        month,
        payment_date: new Date().toISOString().split('T')[0],
        notes: payNotes,
      });
      setShowPayForm(null);
      setPayAmount(0);
      setPayNotes('');
      refresh();
    }
  };

  const handleExport = () => {
    const data = stats.map(s => ({
      المدرس: s.teacher_name,
      'عدد الطلاب': s.total_students,
      'عدد المجموعات': s.total_groups,
      'إجمالي التحصيل': s.total_collected,
      'نسبة المدرس': `${s.commission_rate}%`,
      'مستحق المدرس': s.teacher_share,
      'مستحق السنتر': s.center_share,
      المدفوع: s.paid_amount,
      المتبقي: s.remaining,
    }));
    exportToCSV(data, `teacher_payments_${month}`);
  };

  const printStatement = (stat: TeacherStats) => {
    const payments = getTeacherPaymentsByTeacher(stat.teacher_id).filter(p => p.month === month);
    const studentPayments = getPaymentsByTeacher(stat.teacher_id).filter(p => p.month === month);
    const groups = getGroups().filter(g => g.teacher_id === stat.teacher_id);
    const students = getStudents().filter(s => groups.some(g => g.id === s.group_id));

    const w = window.open('', '_blank');
    if (!w) return;
    
    const paymentRows = studentPayments.map(p => {
      const student = students.find(s => s.id === p.student_id);
      return `<tr><td>${student?.name || '-'}</td><td>${p.amount} ج.م</td><td>${p.payment_date}</td></tr>`;
    }).join('');

    const teacherPaymentRows = payments.map(p => 
      `<tr><td>${p.amount} ج.م</td><td>${p.payment_date}</td><td>${p.notes || '-'}</td></tr>`
    ).join('');

    w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>كشف حساب مدرس</title>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
      <style>* { font-family: 'Cairo', sans-serif; } body { padding: 20px; }
      table { width: 100%; border-collapse: collapse; margin: 15px 0; }
      th, td { border: 1px solid #333; padding: 8px; text-align: right; }
      th { background: #1e3a8a; color: white; }
      .header { text-align: center; border-bottom: 3px solid #1e3a8a; padding-bottom: 15px; margin-bottom: 20px; }
      .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0; }
      .summary div { background: #f8fafc; padding: 15px; border-radius: 8px; text-align: center; }
      .summary .label { font-size: 12px; color: #666; }
      .summary .value { font-size: 20px; font-weight: bold; color: #1e3a8a; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style></head><body>
      <div class="header"><h1>السنتر التعليمي</h1><h2>كشف حساب مدرس - ${month}</h2><p>${stat.teacher_name}</p></div>
      <div class="summary">
        <div><p class="label">إجمالي التحصيل</p><p class="value">${stat.total_collected.toLocaleString()} ج.م</p></div>
        <div><p class="label">نسبة المدرس (${stat.commission_rate}%)</p><p class="value">${stat.teacher_share.toLocaleString()} ج.م</p></div>
        <div><p class="label">نصيب السنتر</p><p class="value">${stat.center_share.toLocaleString()} ج.م</p></div>
      </div>
      <div class="summary">
        <div><p class="label">عدد الطلاب</p><p class="value">${stat.total_students}</p></div>
        <div><p class="label">المدفوع للمدرس</p><p class="value">${stat.paid_amount.toLocaleString()} ج.م</p></div>
        <div><p class="label">المتبقي</p><p class="value" style="color:${stat.remaining > 0 ? '#dc2626' : '#16a34a'}">${stat.remaining.toLocaleString()} ج.م</p></div>
      </div>
      <h3>تفاصيل التحصيل</h3>
      <table><thead><tr><th>الطالب</th><th>المبلغ</th><th>التاريخ</th></tr></thead><tbody>${paymentRows || '<tr><td colspan="3" style="text-align:center">لا توجد مدفوعات</td></tr>'}</tbody></table>
      <h3>المدفوع للمدرس</h3>
      <table><thead><tr><th>المبلغ</th><th>التاريخ</th><th>ملاحظات</th></tr></thead><tbody>${teacherPaymentRows || '<tr><td colspan="3" style="text-align:center">لا توجد دفعات</td></tr>'}</tbody></table>
      </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 500);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">مستحقات المدرسين</h1>
          <p className="text-gray-500 text-sm mt-1">إدارة حسابات ومستحقات المدرسين</p>
        </div>
        <div className="flex gap-2">
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition text-sm">
            <Download size={16} /> تصدير
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-gray-500 text-sm">إجمالي التحصيل</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{totalCollected.toLocaleString()} ج.م</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-gray-500 text-sm">مستحقات المدرسين</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{totalTeacherShare.toLocaleString()} ج.م</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-gray-500 text-sm">نصيب السنتر</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{totalCenterShare.toLocaleString()} ج.م</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-gray-500 text-sm">المدفوع للمدرسين</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">{totalPaid.toLocaleString()} ج.م</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-gray-500 text-sm">المتبقي للمدرسين</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{totalRemaining.toLocaleString()} ج.م</p>
        </div>
      </div>

      {/* Teachers Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">المدرس</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">الطلاب</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">التحصيل</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">النسبة</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">مستحق المدرس</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">مستحق السنتر</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">المدفوع</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">المتبقي</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {stats.map(stat => (
                <tr key={stat.teacher_id} className="border-b hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                        {stat.teacher_name.charAt(0)}
                      </div>
                      <span className="font-medium text-sm">{stat.teacher_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{stat.total_students}</td>
                  <td className="px-4 py-3 font-bold text-blue-600">{stat.total_collected.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-medium">{stat.commission_rate}%</span>
                  </td>
                  <td className="px-4 py-3 font-bold text-amber-600">{stat.teacher_share.toLocaleString()}</td>
                  <td className="px-4 py-3 font-bold text-green-600">{stat.center_share.toLocaleString()}</td>
                  <td className="px-4 py-3 text-purple-600">{stat.paid_amount.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`font-bold ${stat.remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {stat.remaining.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setShowDetails(stat)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="تفاصيل">
                        <Eye size={16} />
                      </button>
                      <button onClick={() => printStatement(stat)} className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition" title="طباعة كشف">
                        <Printer size={16} />
                      </button>
                      {stat.remaining > 0 && (
                        <button onClick={() => { setShowPayForm(stat); setPayAmount(stat.remaining); }}
                          className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition" title="دفع">
                          <DollarSign size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {stats.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-400">
                    <Users size={40} className="mx-auto mb-2 opacity-50" />
                    <p>لا توجد بيانات</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pay Modal */}
      {showPayForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowPayForm(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-lg">دفع مستحقات المدرس</h3>
              <button onClick={() => setShowPayForm(null)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
            </div>
            <form onSubmit={handlePay} className="p-5 space-y-4">
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <p className="text-lg font-bold text-blue-800">{showPayForm.teacher_name}</p>
                <p className="text-sm text-blue-600">المتبقي: {showPayForm.remaining.toLocaleString()} ج.م</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ (ج.م) *</label>
                <input type="number" required min={1} max={showPayForm.remaining} value={payAmount}
                  onChange={e => setPayAmount(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                <input type="text" value={payNotes} onChange={e => setPayNotes(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-green-600 text-white py-2.5 rounded-xl font-medium hover:bg-green-700 transition">
                  تأكيد الدفع
                </button>
                <button type="button" onClick={() => setShowPayForm(null)} className="px-6 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDetails(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
              <h3 className="font-bold text-lg">تفاصيل حساب - {showDetails.teacher_name}</h3>
              <button onClick={() => setShowDetails(null)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{showDetails.total_collected.toLocaleString()}</p>
                  <p className="text-sm text-blue-500">إجمالي التحصيل</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{showDetails.teacher_share.toLocaleString()}</p>
                  <p className="text-sm text-green-500">مستحق المدرس ({showDetails.commission_rate}%)</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-purple-600">{showDetails.center_share.toLocaleString()}</p>
                  <p className="text-sm text-purple-500">نصيب السنتر</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500">المدفوع للمدرس</p>
                  <p className="text-xl font-bold text-gray-800">{showDetails.paid_amount.toLocaleString()} ج.م</p>
                </div>
                <div className={`rounded-xl p-4 ${showDetails.remaining > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                  <p className={`text-sm ${showDetails.remaining > 0 ? 'text-red-500' : 'text-green-500'}`}>المتبقي</p>
                  <p className={`text-xl font-bold ${showDetails.remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>{showDetails.remaining.toLocaleString()} ج.م</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-bold text-gray-800 mb-3">الدفعات للمدرس</h4>
                {(() => {
                  const payments = getTeacherPaymentsByTeacher(showDetails.teacher_id).filter(p => p.month === month);
                  if (payments.length === 0) return <p className="text-center text-gray-400 py-4">لا توجد دفعات</p>;
                  return (
                    <div className="space-y-2">
                      {payments.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                          <div>
                            <p className="font-bold text-green-600">{p.amount.toLocaleString()} ج.م</p>
                            <p className="text-xs text-gray-500">{p.notes || '-'}</p>
                          </div>
                          <p className="text-sm text-gray-600">{p.payment_date}</p>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
