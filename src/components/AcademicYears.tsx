import { useState, useEffect, useCallback } from 'react';
import { AcademicYear } from '../types';
import { getAcademicYears, addAcademicYear, setCurrentAcademicYear, deleteAcademicYear } from '../store';
import { Plus, Trash2, X, Calendar, Check, Star } from 'lucide-react';

export default function AcademicYears() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    name: '', start_date: '', end_date: '', is_current: false,
  });

  const refresh = useCallback(() => {
    setYears(getAcademicYears());
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addAcademicYear(form);
    setShowForm(false);
    setForm({ name: '', start_date: '', end_date: '', is_current: false });
    refresh();
  };

  const handleSetCurrent = (id: string) => {
    setCurrentAcademicYear(id);
    refresh();
  };

  const handleDelete = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذه السنة الدراسية؟')) {
      deleteAcademicYear(id);
      refresh();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">السنوات الدراسية</h1>
          <p className="text-gray-500 text-sm mt-1">إدارة السنوات الدراسية والتنقل بينها</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition text-sm">
          <Plus size={16} /> إضافة سنة دراسية
        </button>
      </div>

      {/* Years Grid */}
      <div className="space-y-3">
        {years.map(year => (
          <div key={year.id} className={`bg-white rounded-2xl shadow-sm p-5 ${year.is_current ? 'ring-2 ring-primary-500' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${year.is_current ? 'bg-primary-100' : 'bg-gray-100'}`}>
                  <Calendar size={24} className={year.is_current ? 'text-primary-600' : 'text-gray-500'} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-800">{year.name}</h3>
                    {year.is_current && (
                      <span className="flex items-center gap-1 text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
                        <Star size={10} /> الحالية
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    من {year.start_date} إلى {year.end_date}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {!year.is_current && (
                  <button onClick={() => handleSetCurrent(year.id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg text-xs hover:bg-primary-100 transition">
                    <Check size={14} /> تعيين كحالية
                  </button>
                )}
                <button onClick={() => handleDelete(year.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {years.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Calendar size={48} className="mx-auto mb-3 opacity-50" />
            <p className="font-medium">لا توجد سنوات دراسية</p>
            <p className="text-sm mt-1">أضف سنة دراسية جديدة للبدء</p>
          </div>
        )}
      </div>

      {/* Add Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-lg">إضافة سنة دراسية</h3>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم السنة الدراسية *</label>
                <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="مثال: العام الدراسي 2024-2025" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ البداية *</label>
                  <input type="date" required value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ النهاية *</label>
                  <input type="date" required value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_current" checked={form.is_current} onChange={e => setForm({ ...form, is_current: e.target.checked })}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                <label htmlFor="is_current" className="text-sm text-gray-700">تعيين كسنة حالية</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-primary-600 text-white py-2.5 rounded-xl font-medium hover:bg-primary-700 transition">
                  إضافة السنة الدراسية
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
