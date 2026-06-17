import { useState, useMemo } from 'react';
import { getTeachers, getGroups, getSettings } from '../store';
import { signInWithSupabase } from '../services/auth';
import { User, Teacher, Group } from '../types';
import { GraduationCap, Lock, User as UserIcon, BookOpen, X, Clock, Calendar, ChevronDown, ChevronUp, Users, UserRoundSearch } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
  onParentPortal: () => void;
}

// Public schedule data grouped by specialization
interface SpecializationGroup {
  specialization: string;
  teachers: {
    teacher: Teacher;
    groups: Group[];
  }[];
}

export default function Login({ onLogin, onParentPortal }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [expandedSpec, setExpandedSpec] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const user = await signInWithSupabase(email.trim(), password);
      onLogin(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل تسجيل الدخول');
    } finally {
      setSubmitting(false);
    }
  };

  // Build schedule data grouped by specialization
  const scheduleData = useMemo<SpecializationGroup[]>(() => {
    const teachers = getTeachers();
    const allGroups = getGroups();
    
    // Check settings for visibility
    const settings = getSettings();
    const hiddenTeachers = settings?.hiddenTeachers || [];
    const hiddenGroups = settings?.hiddenGroups || [];
    
    // Filter visible teachers and groups
    const visibleTeachers = teachers.filter(t => !hiddenTeachers.includes(t.id));
    
    // Group by specialization
    const specMap = new Map<string, { teacher: Teacher; groups: Group[] }[]>();
    
    visibleTeachers.forEach(teacher => {
      const teacherGroups = allGroups.filter(g => 
        g.teacher_id === teacher.id && !hiddenGroups.includes(g.id)
      );
      
      if (teacherGroups.length === 0) return; // Skip teachers with no visible groups
      
      const spec = teacher.specialization || 'أخرى';
      if (!specMap.has(spec)) {
        specMap.set(spec, []);
      }
      specMap.get(spec)!.push({ teacher, groups: teacherGroups });
    });
    
    return Array.from(specMap.entries()).map(([specialization, teachers]) => ({
      specialization,
      teachers,
    }));
  }, [showSchedule]);

  const toggleSpec = (spec: string) => {
    setExpandedSpec(prev => prev === spec ? null : spec);
  };

  // Specialization icons/colors
  const specStyles: Record<string, { color: string; bg: string; border: string }> = {
    'الرياضيات': { color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
    'الفيزياء': { color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
    'الكيمياء': { color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
    'الأحياء': { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    'اللغة العربية': { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
    'اللغة الإنجليزية': { color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
    'اللغة الفرنسية': { color: 'text-pink-700', bg: 'bg-pink-50', border: 'border-pink-200' },
    'التاريخ': { color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
    'الجغرافيا': { color: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-200' },
  };

  const getSpecStyle = (spec: string) => {
    return specStyles[spec] || { color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200' };
  };

  const dayNames: Record<string, string> = {
    'السبت': 'سبت',
    'الأحد': 'أحد',
    'الاثنين': 'اثنين',
    'الثلاثاء': 'ثلاثاء',
    'الأربعاء': 'أربعاء',
    'الخميس': 'خميس',
    'الجمعة': 'جمعة',
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-primary-600 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8 animate-fade-in">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="w-10 h-10 text-primary-700" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800">saeed</h1>
            <p className="text-gray-500 mt-2">نظام إدارة متكامل</p>
          </div>

          {/* Public Schedule Button */}
          <button
            type="button"
            onClick={() => setShowSchedule(true)}
            className="w-full mb-6 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-l from-emerald-500 to-teal-500 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all shadow-md hover:shadow-lg"
          >
            <BookOpen size={20} />
            <span>تصفح المدرسين والمواعيد</span>
          </button>

          <button
            type="button"
            onClick={onParentPortal}
            className="w-full mb-6 flex items-center justify-center gap-2 px-4 py-3 bg-white border border-primary-200 text-primary-700 rounded-xl font-semibold hover:bg-primary-50 transition-all"
          >
            <UserRoundSearch size={20} />
            <span>بوابة ولي الأمر</span>
          </button>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">البريد الإلكتروني</label>
              <div className="relative">
                <UserIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
                  placeholder="admin@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
                  placeholder="أدخل كلمة المرور"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm text-center">{error}</div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold transition-colors shadow-lg hover:shadow-xl"
            >
              {submitting ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
            </button>
          </form>
        </div>
      </div>

      {/* Public Schedule Modal */}
      {showSchedule && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowSchedule(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-l from-primary-700 to-primary-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <GraduationCap size={28} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">المدرسين والمواعيد</h2>
                    <p className="text-primary-200 text-sm">تصفح جميع المواد والمجموعات المتاحة</p>
                  </div>
                </div>
                <button onClick={() => setShowSchedule(false)} className="p-2 hover:bg-white/20 rounded-xl transition">
                  <X size={22} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto p-5 space-y-4 flex-1">
              {scheduleData.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <BookOpen size={48} className="mx-auto mb-3 opacity-50" />
                  <p className="font-medium text-lg">لا توجد بيانات متاحة حالياً</p>
                  <p className="text-sm mt-1">يتم تحديث المواعيد بشكل مستمر</p>
                </div>
              ) : (
                scheduleData.map(specGroup => {
                  const style = getSpecStyle(specGroup.specialization);
                  const isExpanded = expandedSpec === specGroup.specialization || expandedSpec === null;
                  const totalGroups = specGroup.teachers.reduce((sum, t) => sum + t.groups.length, 0);
                  
                  return (
                    <div key={specGroup.specialization} className={`border ${style.border} rounded-2xl overflow-hidden`}>
                      {/* Specialization Header */}
                      <button
                        onClick={() => toggleSpec(specGroup.specialization)}
                        className={`w-full ${style.bg} p-4 flex items-center justify-between hover:brightness-95 transition`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl ${style.bg} border ${style.border} flex items-center justify-center`}>
                            <BookOpen size={20} className={style.color} />
                          </div>
                          <div className="text-right">
                            <h3 className={`font-bold text-lg ${style.color}`}>{specGroup.specialization}</h3>
                            <p className="text-xs text-gray-500">{specGroup.teachers.length} مدرس • {totalGroups} مجموعة</p>
                          </div>
                        </div>
                        {isExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                      </button>

                      {/* Teachers in this specialization */}
                      {isExpanded && (
                        <div className="p-4 space-y-4">
                          {specGroup.teachers.map(({ teacher, groups: teacherGroups }) => (
                            <div key={teacher.id} className="border border-gray-100 rounded-xl overflow-hidden">
                              {/* Teacher name */}
                              <div className="bg-gray-50 px-4 py-3 flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-sm shadow-sm`}>
                                  {teacher.name.charAt(0)}
                                </div>
                                <div>
                                  <h4 className="font-bold text-gray-800">{teacher.name}</h4>
                                  <p className="text-xs text-gray-500">{teacher.specialization}</p>
                                </div>
                              </div>

                              {/* Groups/Schedule */}
                              <div className="p-3 space-y-2">
                                {teacherGroups.map(group => (
                                  <div key={group.id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 transition">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 bg-primary-50 rounded-lg flex items-center justify-center">
                                        <Users size={16} className="text-primary-600" />
                                      </div>
                                      <div>
                                        <p className="font-medium text-sm text-gray-800">{group.name}</p>
                                        <div className="flex items-center gap-3 mt-1">
                                          <span className="flex items-center gap-1 text-xs text-gray-500">
                                            <Calendar size={12} />
                                            {group.days?.map(d => dayNames[d] || d).join(' - ') || group.schedule}
                                          </span>
                                          <span className="flex items-center gap-1 text-xs text-gray-500">
                                            <Clock size={12} />
                                            {group.time}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="border-t bg-gray-50 px-6 py-4 text-center">
              <p className="text-xs text-gray-400">للاستفسار والتسجيل، تواصل معنا عبر الهاتف أو تفضل بزيارة السنتر</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
