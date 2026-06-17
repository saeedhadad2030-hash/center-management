import { useState } from 'react';
import { Student } from '../types';
import { getStudentByParentPhone, getGroups, getAttendanceByStudent, getPaymentsByStudent, getExamResults, getExams, getSubscriptions } from '../store';
import { Phone, Calendar, CreditCard, FileText, Clock, CheckCircle, XCircle, AlertTriangle, GraduationCap, LogOut } from 'lucide-react';
import DeveloperCredit from './DeveloperCredit';

export default function ParentPortal() {
  const [phone, setPhone] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const found = getStudentByParentPhone(phone);
    if (found.length > 0) {
      setStudents(found);
      setSelectedStudent(found[0]);
      setIsLoggedIn(true);
      setError('');
    } else {
      setError('رقم الهاتف غير مسجل في النظام');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setStudents([]);
    setSelectedStudent(null);
    setPhone('');
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-800 via-green-700 to-green-500 p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8 animate-fade-in">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="w-10 h-10 text-green-700" />
              </div>
              <h1 className="text-2xl font-bold text-gray-800">بوابة ولي الأمر</h1>
              <p className="text-gray-500 mt-2">متابعة أداء الطالب</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">رقم هاتف ولي الأمر</label>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => { setPhone(e.target.value); setError(''); }}
                    className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                    placeholder="01xxxxxxxxx"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm text-center">{error}</div>
              )}

              <button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold transition-colors shadow-lg"
              >
                دخول
              </button>
            </form>

            <div className="mt-6 p-4 bg-gray-50 rounded-xl text-center">
              <p className="text-xs text-gray-500">أدخل رقم الهاتف المسجل في بيانات الطالب</p>
            </div>

            <div className="mt-3">
              <DeveloperCredit />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const groups = getGroups();
  const group = selectedStudent ? groups.find(g => g.id === selectedStudent.group_id) : null;
  const attendance = selectedStudent ? getAttendanceByStudent(selectedStudent.id) : [];
  const payments = selectedStudent ? getPaymentsByStudent(selectedStudent.id) : [];
  const examResults = selectedStudent ? getExamResults().filter(r => r.student_id === selectedStudent.id) : [];
  const exams = getExams();
  const subscriptions = selectedStudent ? getSubscriptions().filter(s => s.student_id === selectedStudent.id) : [];

  const presentCount = attendance.filter(a => a.status === 'present').length;
  const absentCount = attendance.filter(a => a.status === 'absent').length;
  const attendanceRate = attendance.length > 0 ? Math.round((presentCount / attendance.length) * 100) : 0;

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentSubscription = subscriptions.find(s => s.month === currentMonth);

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-gradient-to-l from-green-700 to-green-600 text-white p-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GraduationCap size={28} />
            <div>
              <h1 className="font-bold text-lg">بوابة ولي الأمر</h1>
              <p className="text-green-200 text-xs">السنتر التعليمي</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-lg hover:bg-white/30 transition text-sm">
            <LogOut size={16} /> خروج
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Student Selector */}
        {students.length > 1 && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">اختر الطالب</label>
            <div className="flex gap-2 flex-wrap">
              {students.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedStudent(s)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition ${selectedStudent?.id === s.id ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Student Info */}
        {selectedStudent && (
          <>
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-700 text-2xl font-bold">
                  {selectedStudent.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">{selectedStudent.name}</h2>
                  <p className="text-gray-500 text-sm">{selectedStudent.grade}</p>
                  <p className="text-green-600 text-sm mt-1">{group?.name || '-'}</p>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                <div className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center ${attendanceRate >= 80 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                  {attendanceRate >= 80 ? <CheckCircle size={24} /> : <AlertTriangle size={24} />}
                </div>
                <p className="text-2xl font-bold">{attendanceRate}%</p>
                <p className="text-xs text-gray-500">نسبة الحضور</p>
              </div>
              <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                <div className="w-12 h-12 bg-blue-100 rounded-full mx-auto mb-2 flex items-center justify-center text-blue-600">
                  <Calendar size={24} />
                </div>
                <p className="text-2xl font-bold">{presentCount}</p>
                <p className="text-xs text-gray-500">أيام حضور</p>
              </div>
              <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                <div className="w-12 h-12 bg-red-100 rounded-full mx-auto mb-2 flex items-center justify-center text-red-600">
                  <XCircle size={24} />
                </div>
                <p className="text-2xl font-bold">{absentCount}</p>
                <p className="text-xs text-gray-500">أيام غياب</p>
              </div>
              <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                <div className="w-12 h-12 bg-green-100 rounded-full mx-auto mb-2 flex items-center justify-center text-green-600">
                  <CreditCard size={24} />
                </div>
                <p className="text-2xl font-bold">{totalPaid}</p>
                <p className="text-xs text-gray-500">إجمالي المدفوع</p>
              </div>
            </div>

            {/* Current Month Status */}
            <div className={`rounded-2xl p-5 ${currentSubscription?.status === 'paid' ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">حالة الاشتراك - {currentMonth}</p>
                  <p className={`text-xl font-bold mt-1 ${currentSubscription?.status === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>
                    {currentSubscription?.status === 'paid' ? '✅ مسدد' : '⏳ في انتظار السداد'}
                  </p>
                </div>
                <div className="text-left">
                  <p className="text-sm text-gray-500">قيمة الاشتراك</p>
                  <p className="text-xl font-bold text-gray-800">{group?.fees || 0} ج.م</p>
                </div>
              </div>
            </div>

            {/* Group Schedule */}
            {group && (
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <Clock size={18} className="text-primary-600" /> جدول المجموعة
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">الأيام</p>
                    <p className="font-medium">{group.schedule || group.days?.join(' - ')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">الموعد</p>
                    <p className="font-medium">{group.time}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">المدرس</p>
                    <p className="font-medium">{group.teacher}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">الرسوم الشهرية</p>
                    <p className="font-medium text-green-600">{group.fees} ج.م</p>
                  </div>
                </div>
              </div>
            )}

            {/* Exam Results */}
            {examResults.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <FileText size={18} className="text-purple-600" /> نتائج الامتحانات
                </h3>
                <div className="space-y-2">
                  {examResults.map(result => {
                    const exam = exams.find(e => e.id === result.exam_id);
                    if (!exam) return null;
                    const percentage = Math.round((result.score / exam.total_score) * 100);
                    return (
                      <div key={result.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div>
                          <p className="font-medium text-sm">{exam.title}</p>
                          <p className="text-xs text-gray-500">{exam.date}</p>
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-lg">{result.score}/{exam.total_score}</p>
                          <p className={`text-xs ${percentage >= 80 ? 'text-green-600' : percentage >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                            {percentage}%
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Attendance History */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Calendar size={18} className="text-blue-600" /> سجل الحضور (آخر 10)
              </h3>
              {attendance.length === 0 ? (
                <p className="text-center text-gray-400 py-4">لا يوجد سجل حضور</p>
              ) : (
                <div className="space-y-2">
                  {[...attendance].reverse().slice(0, 10).map(a => (
                    <div key={a.id} className="flex items-center justify-between p-2 border-b last:border-0">
                      <span className="text-sm text-gray-600">{a.date}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${a.status === 'present' ? 'bg-green-100 text-green-700' : a.status === 'absent' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {a.status === 'present' ? '✅ حاضر' : a.status === 'absent' ? '❌ غائب' : '⏰ متأخر'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payment History */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <CreditCard size={18} className="text-green-600" /> سجل المدفوعات
              </h3>
              {payments.length === 0 ? (
                <p className="text-center text-gray-400 py-4">لا توجد مدفوعات</p>
              ) : (
                <div className="space-y-2">
                  {[...payments].reverse().map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                      <div>
                        <p className="font-medium text-sm">شهر {p.month}</p>
                        <p className="text-xs text-gray-500">{p.payment_date}</p>
                      </div>
                      <span className="font-bold text-green-600">{p.amount} ج.م</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <DeveloperCredit />
      </main>
    </div>
  );
}
