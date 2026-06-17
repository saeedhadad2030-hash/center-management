import { useState, useRef, useEffect, useCallback } from 'react';
import { exportAllData, importAllData, getAuditLogs, getTeachers, getGroups, getSettings, saveSettings, CenterSettings } from '../store';
import { AuditLog, Teacher, Group, Page } from '../types';
import { Download, Upload, Shield, Database, RefreshCw, CheckCircle, AlertTriangle, History, User, Clock, BookOpen, Eye, EyeOff, Layers, UserCheck, Info } from 'lucide-react';

interface SettingsProps {
  onPageChange?: (page: Page) => void;
}

export default function Settings({ onPageChange }: SettingsProps) {
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [teachers, setTeachersState] = useState<Teacher[]>([]);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [settings, setSettingsState] = useState<CenterSettings>({ hiddenTeachers: [], hiddenGroups: [] });
  const [settingsSaved, setSettingsSaved] = useState(false);

  const refresh = useCallback(() => {
    setAuditLogs(getAuditLogs());
    setTeachersState(getTeachers());
    setAllGroups(getGroups());
    setSettingsState(getSettings());
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleExportBackup = () => {
    const data = exportAllData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `center_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      const success = importAllData(content);
      setImportStatus(success ? 'success' : 'error');
      setTimeout(() => setImportStatus('idle'), 3000);
    };
    reader.readAsText(file);
  };

  const handleClearData = () => {
    if (confirm('⚠️ هل أنت متأكد من حذف جميع البيانات؟ لا يمكن التراجع عن هذا الإجراء!')) {
      if (confirm('تأكيد نهائي: سيتم حذف جميع البيانات بشكل دائم!')) {
        localStorage.clear();
        window.location.reload();
      }
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes('إضافة') || action.includes('إنشاء')) return '➕';
    if (action.includes('تعديل')) return '✏️';
    if (action.includes('حذف')) return '🗑️';
    if (action.includes('دخول')) return '🔐';
    if (action.includes('دفع')) return '💰';
    return '📋';
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">الإعدادات</h1>
        <p className="text-gray-500 text-sm mt-1">إدارة النظام والنسخ الاحتياطي</p>
      </div>

      {/* Public Schedule Control */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <BookOpen size={20} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">التحكم في صفحة المواعيد العامة</h3>
              <p className="text-sm text-gray-500">اختر المدرسين والمجموعات التي تظهر للزوار في صفحة تسجيل الدخول</p>
            </div>
          </div>
          {settingsSaved && (
            <span className="flex items-center gap-1 text-green-600 text-sm bg-green-50 px-3 py-1.5 rounded-lg">
              <CheckCircle size={14} /> تم الحفظ
            </span>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3 mb-5">
          <button
            onClick={() => onPageChange?.('teachers')}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 rounded-xl text-sm font-medium hover:bg-blue-100 transition border border-blue-200"
          >
            <UserCheck size={16} /> إدارة المدرسين
          </button>
          <button
            onClick={() => onPageChange?.('groups')}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-50 text-purple-700 rounded-xl text-sm font-medium hover:bg-purple-100 transition border border-purple-200"
          >
            <Layers size={16} /> إدارة المجموعات
          </button>
        </div>

        <div className="mb-5 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-start gap-2">
            <Info size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">كيف يعمل هذا القسم؟</p>
              <ul className="text-xs space-y-1 text-blue-600">
                <li>• أضف المدرسين من صفحة <strong>"إدارة المدرسين"</strong> وحدد التخصص (رياضيات، فيزياء...)</li>
                <li>• أضف المجموعات من صفحة <strong>"إدارة المجموعات"</strong> واختر المدرس والمواعيد</li>
                <li>• البيانات تظهر تلقائياً في زرار <strong>"تصفح المدرسين والمواعيد"</strong> بصفحة الدخول</li>
                <li>• من هنا تقدر تخفي أو تُظهر أي مدرس أو مجموعة من العرض العام</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {teachers.map(teacher => {
            const isTeacherHidden = settings.hiddenTeachers.includes(teacher.id);
            const teacherGroups = allGroups.filter(g => g.teacher_id === teacher.id);
            
            return (
              <div key={teacher.id} className={`border rounded-xl overflow-hidden transition ${isTeacherHidden ? 'border-gray-200 opacity-60' : 'border-emerald-200'}`}>
                {/* Teacher toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ${isTeacherHidden ? 'bg-gray-300 text-gray-600' : 'bg-gradient-to-br from-primary-500 to-primary-700 text-white'}`}>
                      {teacher.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-gray-800">{teacher.name}</h4>
                      <p className="text-xs text-gray-500">{teacher.specialization} • {teacherGroups.length} مجموعة</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const newSettings = { ...settings };
                      if (isTeacherHidden) {
                        newSettings.hiddenTeachers = newSettings.hiddenTeachers.filter(id => id !== teacher.id);
                      } else {
                        newSettings.hiddenTeachers = [...newSettings.hiddenTeachers, teacher.id];
                      }
                      saveSettings(newSettings);
                      setSettingsState(newSettings);
                      setSettingsSaved(true);
                      setTimeout(() => setSettingsSaved(false), 2000);
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      isTeacherHidden
                        ? 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                    }`}
                  >
                    {isTeacherHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                    {isTeacherHidden ? 'مخفي' : 'ظاهر'}
                  </button>
                </div>

                {/* Group toggles */}
                {!isTeacherHidden && teacherGroups.length > 0 && (
                  <div className="p-3 space-y-1.5">
                    {teacherGroups.map(group => {
                      const isGroupHidden = settings.hiddenGroups.includes(group.id);
                      return (
                        <div key={group.id} className={`flex items-center justify-between p-2.5 rounded-lg transition ${isGroupHidden ? 'bg-gray-50' : 'bg-emerald-50'}`}>
                          <div className="flex items-center gap-2">
                            <Layers size={14} className={isGroupHidden ? 'text-gray-400' : 'text-emerald-600'} />
                            <span className={`text-sm font-medium ${isGroupHidden ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{group.name}</span>
                            <span className="text-xs text-gray-400">| {group.schedule} - {group.time}</span>
                          </div>
                          <button
                            onClick={() => {
                              const newSettings = { ...settings };
                              if (isGroupHidden) {
                                newSettings.hiddenGroups = newSettings.hiddenGroups.filter(id => id !== group.id);
                              } else {
                                newSettings.hiddenGroups = [...newSettings.hiddenGroups, group.id];
                              }
                              saveSettings(newSettings);
                              setSettingsState(newSettings);
                              setSettingsSaved(true);
                              setTimeout(() => setSettingsSaved(false), 2000);
                            }}
                            className={`p-1.5 rounded-lg transition ${
                              isGroupHidden
                                ? 'text-gray-400 hover:bg-gray-200'
                                : 'text-emerald-600 hover:bg-emerald-200'
                            }`}
                          >
                            {isGroupHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {teachers.length === 0 && (
            <p className="text-center text-gray-400 py-6">لا يوجد مدرسين لعرضهم</p>
          )}
        </div>
      </div>

      {/* Audit Log Section */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <History size={20} className="text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">سجل العمليات</h3>
              <p className="text-sm text-gray-500">تتبع جميع الإجراءات في النظام</p>
            </div>
          </div>
          <button onClick={() => setShowLogs(!showLogs)}
            className="px-4 py-2 bg-amber-50 text-amber-700 rounded-xl text-sm hover:bg-amber-100 transition">
            {showLogs ? 'إخفاء' : 'عرض'} ({auditLogs.length})
          </button>
        </div>

        {showLogs && (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {auditLogs.length === 0 ? (
              <p className="text-center text-gray-400 py-8">لا توجد عمليات مسجلة</p>
            ) : (
              [...auditLogs].reverse().slice(0, 50).map(log => (
                <div key={log.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
                  <div className="text-xl">{getActionIcon(log.action)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-gray-800">{log.action}</span>
                      {log.details && (
                        <span className="text-xs text-gray-500 truncate">({log.details})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <User size={10} /> {log.user_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={10} /> {new Date(log.timestamp).toLocaleString('ar-EG')}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Backup Section */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Database size={20} className="text-blue-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-800">النسخ الاحتياطي</h3>
            <p className="text-sm text-gray-500">حفظ واستعادة بيانات النظام</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button onClick={handleExportBackup}
            className="flex items-center gap-3 p-4 border-2 border-dashed border-blue-200 rounded-xl hover:bg-blue-50 hover:border-blue-400 transition group">
            <Download size={24} className="text-blue-500 group-hover:text-blue-600" />
            <div className="text-right">
              <p className="font-medium text-gray-800">تصدير نسخة احتياطية</p>
              <p className="text-xs text-gray-500">تنزيل ملف JSON بجميع البيانات</p>
            </div>
          </button>

          <button onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-3 p-4 border-2 border-dashed border-green-200 rounded-xl hover:bg-green-50 hover:border-green-400 transition group">
            <Upload size={24} className="text-green-500 group-hover:text-green-600" />
            <div className="text-right">
              <p className="font-medium text-gray-800">استيراد نسخة احتياطية</p>
              <p className="text-xs text-gray-500">استعادة البيانات من ملف JSON</p>
            </div>
          </button>
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
        </div>

        {importStatus === 'success' && (
          <div className="mt-4 flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-xl text-sm">
            <CheckCircle size={16} /> تم استيراد البيانات بنجاح! أعد تحميل الصفحة لرؤية التغييرات.
          </div>
        )}
        {importStatus === 'error' && (
          <div className="mt-4 flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-xl text-sm">
            <AlertTriangle size={16} /> فشل استيراد البيانات. تأكد من صحة الملف.
          </div>
        )}
      </div>

      {/* Permissions Info */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <Shield size={20} className="text-purple-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-800">الصلاحيات</h3>
            <p className="text-sm text-gray-500">مستويات الوصول للمستخدمين</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="p-4 bg-blue-50 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-8 h-8 bg-blue-500 text-white rounded-lg flex items-center justify-center text-xs font-bold">مد</span>
              <h4 className="font-bold text-blue-800">مدير النظام (admin)</h4>
            </div>
            <p className="text-sm text-blue-700">وصول كامل لجميع الأقسام - إدارة الطلاب والمجموعات والمدفوعات والامتحانات والإعدادات والمالية</p>
            <p className="text-xs text-blue-500 mt-1">الحسابات تدار من Supabase Auth</p>
          </div>

          <div className="p-4 bg-green-50 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-8 h-8 bg-green-500 text-white rounded-lg flex items-center justify-center text-xs font-bold">مو</span>
              <h4 className="font-bold text-green-800">موظف (employee)</h4>
            </div>
            <p className="text-sm text-green-700">إدارة الطلاب والمجموعات والحضور والمدفوعات والرسائل</p>
            <p className="text-xs text-green-500 mt-1">الحسابات تدار من Supabase Auth</p>
          </div>

          <div className="p-4 bg-amber-50 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-8 h-8 bg-amber-500 text-white rounded-lg flex items-center justify-center text-xs font-bold">مد</span>
              <h4 className="font-bold text-amber-800">مدرس (teacher)</h4>
            </div>
            <p className="text-sm text-amber-700">عرض لوحة التحكم والمجموعات والحضور والامتحانات فقط</p>
            <p className="text-xs text-amber-500 mt-1">اربط حساب المدرس من جدول profiles باستخدام teacher_id</p>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-red-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
            <AlertTriangle size={20} className="text-red-600" />
          </div>
          <div>
            <h3 className="font-bold text-red-800">منطقة الخطر</h3>
            <p className="text-sm text-red-500">إجراءات لا يمكن التراجع عنها</p>
          </div>
        </div>

        <button onClick={handleClearData}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm hover:bg-red-700 transition">
          <RefreshCw size={16} /> مسح جميع البيانات
        </button>
      </div>

      {/* System Info */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="font-bold text-gray-800 mb-4">معلومات النظام</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">الإصدار</p>
            <p className="font-medium">2.0.0</p>
          </div>
          <div>
            <p className="text-gray-500">قاعدة البيانات</p>
            <p className="font-medium">Supabase Postgres</p>
          </div>
          <div>
            <p className="text-gray-500">المتصفح</p>
            <p className="font-medium text-xs">{navigator.userAgent.split(' ').slice(-2).join(' ')}</p>
          </div>
          <div>
            <p className="text-gray-500">حجم البيانات</p>
            <p className="font-medium">تدار من Supabase</p>
          </div>
        </div>
      </div>
    </div>
  );
}
