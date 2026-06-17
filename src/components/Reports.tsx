import { useState } from 'react';
import { getStudents, getGroups, getTeachers, getPayments, getExpenses, getAttendance, getExams, getExamResults, getAllTeachersStats } from '../store';
import { exportToCSV } from '../utils/export';
import { FileText, Users, CreditCard, ClipboardCheck, GraduationCap, Download } from 'lucide-react';

type ReportType = 'financial' | 'attendance' | 'students' | 'teachers' | 'exams';

export default function Reports() {
  const [reportType, setReportType] = useState<ReportType>('financial');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  const reports = [
    { type: 'financial' as const, label: 'تقرير مالي', icon: CreditCard, color: 'bg-green-100 text-green-600' },
    { type: 'attendance' as const, label: 'تقرير الحضور', icon: ClipboardCheck, color: 'bg-blue-100 text-blue-600' },
    { type: 'students' as const, label: 'تقرير الطلاب', icon: Users, color: 'bg-purple-100 text-purple-600' },
    { type: 'teachers' as const, label: 'تقرير المدرسين', icon: GraduationCap, color: 'bg-amber-100 text-amber-600' },
    { type: 'exams' as const, label: 'تقرير الامتحانات', icon: FileText, color: 'bg-red-100 text-red-600' },
  ];

  const renderReport = () => {
    const students = getStudents().filter(s => s.status === 'active');
    const groups = getGroups();
    const teachers = getTeachers();
    const payments = getPayments().filter(p => p.month === month);
    const expenses = getExpenses().filter(e => e.date.startsWith(month));
    const attendance = getAttendance();

    switch (reportType) {
      case 'financial': {
        const totalRevenue = payments.reduce((s, p) => s + p.amount, 0);
        const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
        const teacherStats = getAllTeachersStats(month);
        const totalTeacherShare = teacherStats.reduce((s, t) => s + t.teacher_share, 0);
        
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="إجمالي الإيرادات" value={`${totalRevenue.toLocaleString()} ج.م`} color="green" />
              <StatCard label="إجمالي المصروفات" value={`${totalExpenses.toLocaleString()} ج.م`} color="red" />
              <StatCard label="مستحقات المدرسين" value={`${totalTeacherShare.toLocaleString()} ج.م`} color="amber" />
              <StatCard label="صافي الربح" value={`${(totalRevenue - totalExpenses - totalTeacherShare).toLocaleString()} ج.م`} color="blue" />
            </div>
            
            <div className="bg-white rounded-xl p-4">
              <h4 className="font-bold mb-3">تفاصيل الإيرادات حسب المدرس</h4>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-right py-2">المدرس</th>
                    <th className="text-right py-2">التحصيل</th>
                    <th className="text-right py-2">النسبة</th>
                    <th className="text-right py-2">حصة المدرس</th>
                    <th className="text-right py-2">حصة السنتر</th>
                  </tr>
                </thead>
                <tbody>
                  {teacherStats.map(stat => (
                    <tr key={stat.teacher_id} className="border-b">
                      <td className="py-2">{stat.teacher_name}</td>
                      <td className="py-2">{stat.total_collected.toLocaleString()}</td>
                      <td className="py-2">{stat.commission_rate}%</td>
                      <td className="py-2 text-amber-600">{stat.teacher_share.toLocaleString()}</td>
                      <td className="py-2 text-green-600">{stat.center_share.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }
      
      case 'attendance': {
        const groupAttendance = groups.map(g => {
          const groupStudents = students.filter(s => s.group_id === g.id);
          const groupAtt = attendance.filter(a => a.group_id === g.id && a.date.startsWith(month));
          const present = groupAtt.filter(a => a.status === 'present').length;
          const absent = groupAtt.filter(a => a.status === 'absent').length;
          return { ...g, students: groupStudents.length, present, absent, rate: groupAtt.length > 0 ? Math.round((present / groupAtt.length) * 100) : 0 };
        });
        
        return (
          <div className="space-y-4">
            {groupAttendance.map(g => (
              <div key={g.id} className="bg-white rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold">{g.name}</h4>
                  <span className={`text-sm font-bold ${g.rate >= 80 ? 'text-green-600' : g.rate >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                    {g.rate}% نسبة الحضور
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="bg-blue-50 rounded-lg p-2 text-center">
                    <p className="font-bold text-blue-600">{g.students}</p>
                    <p className="text-xs text-blue-500">طالب</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-2 text-center">
                    <p className="font-bold text-green-600">{g.present}</p>
                    <p className="text-xs text-green-500">حضور</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-2 text-center">
                    <p className="font-bold text-red-600">{g.absent}</p>
                    <p className="text-xs text-red-500">غياب</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      }
      
      case 'students': {
        const studentsByGroup = groups.map(g => ({
          group: g.name,
          count: students.filter(s => s.group_id === g.id).length,
        }));
        
        const studentsByGrade = students.reduce((acc, s) => {
          acc[s.grade] = (acc[s.grade] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        return (
          <div className="space-y-4">
            <StatCard label="إجمالي الطلاب النشطين" value={students.length.toString()} color="blue" />
            
            <div className="bg-white rounded-xl p-4">
              <h4 className="font-bold mb-3">توزيع الطلاب حسب الصف</h4>
              <div className="space-y-2">
                {Object.entries(studentsByGrade).map(([grade, count]) => (
                  <div key={grade} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <span>{grade}</span>
                    <span className="font-bold">{count} طالب</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-4">
              <h4 className="font-bold mb-3">توزيع الطلاب حسب المجموعة</h4>
              <div className="space-y-2">
                {studentsByGroup.map((g, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <span>{g.group}</span>
                    <span className="font-bold">{g.count} طالب</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      }
      
      case 'teachers': {
        const teacherStats = getAllTeachersStats(month);
        
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <StatCard label="عدد المدرسين" value={teachers.length.toString()} color="blue" />
              <StatCard label="إجمالي التحصيل" value={`${teacherStats.reduce((s, t) => s + t.total_collected, 0).toLocaleString()} ج.م`} color="green" />
            </div>
            
            <div className="bg-white rounded-xl p-4">
              <h4 className="font-bold mb-3">ترتيب المدرسين حسب التحصيل</h4>
              <div className="space-y-2">
                {[...teacherStats].sort((a, b) => b.total_collected - a.total_collected).map((t, i) => (
                  <div key={t.teacher_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-amber-700' : 'bg-gray-300'}`}>
                        {i + 1}
                      </span>
                      <div>
                        <p className="font-medium">{t.teacher_name}</p>
                        <p className="text-xs text-gray-500">{t.total_students} طالب • {t.total_groups} مجموعة</p>
                      </div>
                    </div>
                    <span className="font-bold text-green-600">{t.total_collected.toLocaleString()} ج.م</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      }
      
      case 'exams': {
        const exams = getExams();
        const results = getExamResults();
        
        return (
          <div className="space-y-4">
            <StatCard label="عدد الامتحانات" value={exams.length.toString()} color="purple" />
            
            {exams.map(exam => {
              const examResults = results.filter(r => r.exam_id === exam.id);
              const avgScore = examResults.length > 0 ? Math.round(examResults.reduce((s, r) => s + r.score, 0) / examResults.length) : 0;
              const group = groups.find(g => g.id === exam.group_id);
              
              return (
                <div key={exam.id} className="bg-white rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-bold">{exam.title}</h4>
                      <p className="text-sm text-gray-500">{group?.name} • {exam.date}</p>
                    </div>
                    <span className="text-lg font-bold text-primary-600">{avgScore}/{exam.total_score}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="bg-blue-50 rounded-lg p-2 text-center">
                      <p className="font-bold text-blue-600">{examResults.length}</p>
                      <p className="text-xs text-blue-500">طالب</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-2 text-center">
                      <p className="font-bold text-green-600">{examResults.length > 0 ? Math.max(...examResults.map(r => r.score)) : 0}</p>
                      <p className="text-xs text-green-500">أعلى درجة</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-2 text-center">
                      <p className="font-bold text-red-600">{examResults.length > 0 ? Math.min(...examResults.map(r => r.score)) : 0}</p>
                      <p className="text-xs text-red-500">أقل درجة</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      }
    }
  };

  const handleExport = () => {
    // Export based on report type
    switch (reportType) {
      case 'financial': {
        const payments = getPayments().filter(p => p.month === month);
        const data = payments.map(p => {
          const student = getStudents().find(s => s.id === p.student_id);
          return { الطالب: student?.name || '', المبلغ: p.amount, التاريخ: p.payment_date };
        });
        exportToCSV(data, `financial_report_${month}`);
        break;
      }
      case 'students': {
        const students = getStudents().filter(s => s.status === 'active');
        const data = students.map(s => ({
          الاسم: s.name, الهاتف: s.phone, الصف: s.grade,
          المجموعة: getGroups().find(g => g.id === s.group_id)?.name || '',
        }));
        exportToCSV(data, 'students_report');
        break;
      }
      case 'teachers': {
        const stats = getAllTeachersStats(month);
        const data = stats.map(s => ({
          المدرس: s.teacher_name, الطلاب: s.total_students, التحصيل: s.total_collected,
          النسبة: `${s.commission_rate}%`, المستحق: s.teacher_share,
        }));
        exportToCSV(data, `teachers_report_${month}`);
        break;
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">التقارير</h1>
          <p className="text-gray-500 text-sm mt-1">تقارير شاملة ومفصلة</p>
        </div>
        <div className="flex gap-2">
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition text-sm">
            <Download size={16} /> تصدير
          </button>
        </div>
      </div>

      {/* Report Type Selection */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {reports.map(r => {
          const Icon = r.icon;
          return (
            <button key={r.type} onClick={() => setReportType(r.type)}
              className={`p-4 rounded-xl text-center transition ${reportType === r.type ? 'bg-primary-600 text-white shadow-lg' : 'bg-white hover:shadow-md'}`}>
              <div className={`w-10 h-10 rounded-xl ${reportType === r.type ? 'bg-white/20' : r.color} flex items-center justify-center mx-auto mb-2`}>
                <Icon size={20} className={reportType === r.type ? 'text-white' : ''} />
              </div>
              <p className="text-sm font-medium">{r.label}</p>
            </button>
          );
        })}
      </div>

      {/* Report Content */}
      <div className="bg-gray-50 rounded-2xl p-6">
        {renderReport()}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  
  return (
    <div className={`rounded-xl p-4 ${colorMap[color]}`}>
      <p className="text-sm opacity-80">{label}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
    </div>
  );
}
