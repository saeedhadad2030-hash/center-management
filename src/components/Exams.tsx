import { useState, useEffect, useCallback } from 'react';
import { getExams, addExam, deleteExam, getGroups, getStudents, addExamResult, getResultsByExam } from '../store';
import { Exam, ExamResult, Group, Student } from '../types';
import { exportToCSV } from '../utils/export';
import { Plus, Trash2, X, Download, FileText, Award, Eye } from 'lucide-react';

export default function Exams() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showResults, setShowResults] = useState<Exam | null>(null);
  const [showGrades, setShowGrades] = useState<Exam | null>(null);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [gradeInputs, setGradeInputs] = useState<Record<string, number>>({});

  const [form, setForm] = useState({
    title: '', group_id: '', date: new Date().toISOString().split('T')[0], total_score: 100,
  });

  const refresh = useCallback(() => {
    setExams(getExams());
    setGroups(getGroups());
    setStudents(getStudents());
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addExam(form);
    setShowForm(false);
    setForm({ title: '', group_id: '', date: new Date().toISOString().split('T')[0], total_score: 100 });
    refresh();
  };

  const handleDelete = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الامتحان؟')) {
      deleteExam(id);
      refresh();
    }
  };

  const openGrades = (exam: Exam) => {
    setShowGrades(exam);
    const examStudents = students.filter(s => s.group_id === exam.group_id);
    const existingResults = getResultsByExam(exam.id);
    const inputs: Record<string, number> = {};
    examStudents.forEach(s => {
      const existing = existingResults.find(r => r.student_id === s.id);
      inputs[s.id] = existing?.score || 0;
    });
    setGradeInputs(inputs);
  };

  const saveGrades = () => {
    if (!showGrades) return;
    Object.entries(gradeInputs).forEach(([studentId, score]) => {
      addExamResult({ exam_id: showGrades.id, student_id: studentId, score });
    });
    setShowGrades(null);
    refresh();
  };

  const openResults = (exam: Exam) => {
    const examResults = getResultsByExam(exam.id);
    const sorted = [...examResults].sort((a, b) => b.score - a.score);
    setResults(sorted);
    setShowResults(exam);
  };

  const handleExportResults = (exam: Exam) => {
    const examResults = getResultsByExam(exam.id);
    const sorted = [...examResults].sort((a, b) => b.score - a.score);
    const data = sorted.map((r, i) => {
      const student = students.find(s => s.id === r.student_id);
      return {
        الترتيب: i + 1,
        الطالب: student?.name || '',
        الدرجة: r.score,
        'من أصل': exam.total_score,
        النسبة: `${Math.round((r.score / exam.total_score) * 100)}%`,
        التقدير: getGrade(r.score, exam.total_score),
      };
    });
    exportToCSV(data, `exam_${exam.title}`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">الامتحانات</h1>
          <p className="text-gray-500 text-sm mt-1">إنشاء الامتحانات وإدخال الدرجات</p>
        </div>
        <button onClick={() => { setForm({ title: '', group_id: '', date: new Date().toISOString().split('T')[0], total_score: 100 }); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition text-sm">
          <Plus size={16} /> إنشاء امتحان
        </button>
      </div>

      {/* Exams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {exams.map(exam => {
          const group = groups.find(g => g.id === exam.group_id);
          const examResults = getResultsByExam(exam.id);
          const avgScore = examResults.length > 0 ? Math.round(examResults.reduce((s, r) => s + r.score, 0) / examResults.length) : 0;
          return (
            <div key={exam.id} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition p-5">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-3">
                  <FileText size={24} className="text-purple-600" />
                </div>
                <button onClick={() => handleDelete(exam.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                  <Trash2 size={16} />
                </button>
              </div>
              <h3 className="font-bold text-gray-800 mb-1">{exam.title}</h3>
              <p className="text-sm text-gray-500">{group?.name || '-'}</p>
              <p className="text-xs text-gray-400 mt-1">📅 {exam.date} • الدرجة الكبرى: {exam.total_score}</p>

              {examResults.length > 0 && (
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1 bg-blue-50 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-blue-600">{avgScore}</p>
                    <p className="text-[10px] text-blue-500">متوسط</p>
                  </div>
                  <div className="flex-1 bg-green-50 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-green-600">{Math.max(...examResults.map(r => r.score))}</p>
                    <p className="text-[10px] text-green-500">أعلى درجة</p>
                  </div>
                  <div className="flex-1 bg-red-50 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-red-600">{Math.min(...examResults.map(r => r.score))}</p>
                    <p className="text-[10px] text-red-500">أقل درجة</p>
                  </div>
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <button onClick={() => openGrades(exam)}
                  className="flex-1 flex items-center justify-center gap-1 py-2 text-sm bg-amber-50 text-amber-700 rounded-xl hover:bg-amber-100 transition">
                  <Award size={14} /> إدخال درجات
                </button>
                <button onClick={() => openResults(exam)}
                  className="flex-1 flex items-center justify-center gap-1 py-2 text-sm bg-primary-50 text-primary-700 rounded-xl hover:bg-primary-100 transition">
                  <Eye size={14} /> النتائج
                </button>
                <button onClick={() => handleExportResults(exam)}
                  className="p-2 text-green-600 bg-green-50 rounded-xl hover:bg-green-100 transition" title="تصدير">
                  <Download size={14} />
                </button>
              </div>
            </div>
          );
        })}
        {exams.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-400">
            <FileText size={48} className="mx-auto mb-3 opacity-50" />
            <p className="font-medium">لا توجد امتحانات بعد</p>
          </div>
        )}
      </div>

      {/* Add Exam Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-lg">إنشاء امتحان جديد</h3>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">عنوان الامتحان *</label>
                <input type="text" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المجموعة *</label>
                <select required value={form.group_id} onChange={e => setForm({ ...form, group_id: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white">
                  <option value="">اختر المجموعة</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ</label>
                  <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الدرجة الكبرى</label>
                  <input type="number" min={1} value={form.total_score} onChange={e => setForm({ ...form, total_score: parseInt(e.target.value) || 100 })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-primary-600 text-white py-2.5 rounded-xl font-medium hover:bg-primary-700 transition">
                  إنشاء الامتحان
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enter Grades Modal */}
      {showGrades && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowGrades(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
              <div>
                <h3 className="font-bold text-lg">إدخال الدرجات</h3>
                <p className="text-sm text-gray-500">{showGrades.title} (من {showGrades.total_score})</p>
              </div>
              <button onClick={() => setShowGrades(null)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-3">
              {students.filter(s => s.group_id === showGrades.group_id).map(s => (
                <div key={s.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{s.name}</p>
                  </div>
                  <input type="number" min={0} max={showGrades.total_score}
                    value={gradeInputs[s.id] || 0}
                    onChange={e => setGradeInputs({ ...gradeInputs, [s.id]: parseInt(e.target.value) || 0 })}
                    className="w-20 px-3 py-2 border border-gray-200 rounded-xl text-sm text-center focus:ring-2 focus:ring-primary-500 outline-none" />
                  <span className="text-xs text-gray-400">/ {showGrades.total_score}</span>
                </div>
              ))}
              <button onClick={saveGrades}
                className="w-full bg-primary-600 text-white py-2.5 rounded-xl font-medium hover:bg-primary-700 transition mt-4">
                حفظ الدرجات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results Modal */}
      {showResults && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowResults(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
              <div>
                <h3 className="font-bold text-lg">نتائج الامتحان</h3>
                <p className="text-sm text-gray-500">{showResults.title}</p>
              </div>
              <button onClick={() => setShowResults(null)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-5">
              {results.length === 0 ? (
                <p className="text-center text-gray-400 py-8">لم يتم إدخال درجات بعد</p>
              ) : (
                <div className="space-y-2">
                  {results.map((r, i) => {
                    const student = students.find(s => s.id === r.student_id);
                    const percentage = Math.round((r.score / showResults.total_score) * 100);
                    const grade = getGrade(r.score, showResults.total_score);
                    return (
                      <div key={r.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-amber-700' : 'bg-primary-400'}`}>
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{student?.name || ''}</p>
                          <p className="text-xs text-gray-500">{grade}</p>
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-sm">{r.score}/{showResults.total_score}</p>
                          <p className={`text-xs ${percentage >= 80 ? 'text-green-600' : percentage >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{percentage}%</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getGrade(score: number, total: number): string {
  const percentage = (score / total) * 100;
  if (percentage >= 90) return 'ممتاز';
  if (percentage >= 80) return 'جيد جداً';
  if (percentage >= 70) return 'جيد';
  if (percentage >= 60) return 'مقبول';
  return 'ضعيف';
}
