import { useState, useEffect, useCallback } from 'react';
import { Expense } from '../types';
import { getExpenses, addExpense, deleteExpense } from '../store';
import { exportToCSV } from '../utils/export';
import { Plus, Trash2, X, Download, Building, Zap, Droplet, Megaphone, Package, DollarSign, MoreHorizontal } from 'lucide-react';

const CATEGORIES = {
  salary: { label: 'مرتبات', icon: DollarSign, color: 'bg-blue-100 text-blue-600' },
  rent: { label: 'إيجار', icon: Building, color: 'bg-purple-100 text-purple-600' },
  electricity: { label: 'كهرباء', icon: Zap, color: 'bg-yellow-100 text-yellow-600' },
  water: { label: 'مياه', icon: Droplet, color: 'bg-cyan-100 text-cyan-600' },
  marketing: { label: 'دعاية', icon: Megaphone, color: 'bg-pink-100 text-pink-600' },
  supplies: { label: 'مستلزمات', icon: Package, color: 'bg-green-100 text-green-600' },
  other: { label: 'أخرى', icon: MoreHorizontal, color: 'bg-gray-100 text-gray-600' },
};

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
  const [filterCategory, setFilterCategory] = useState('');

  const [form, setForm] = useState<Omit<Expense, 'id'>>({
    category: 'other', description: '', amount: 0, date: new Date().toISOString().split('T')[0], notes: '',
  });

  const refresh = useCallback(() => {
    setExpenses(getExpenses());
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const filtered = expenses.filter(e => {
    const matchMonth = e.date.startsWith(filterMonth);
    const matchCategory = !filterCategory || e.category === filterCategory;
    return matchMonth && matchCategory;
  });

  const totalByCategory = Object.keys(CATEGORIES).reduce((acc, cat) => {
    acc[cat] = filtered.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0);
    return acc;
  }, {} as Record<string, number>);

  const totalExpenses = filtered.reduce((s, e) => s + e.amount, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addExpense(form);
    setShowForm(false);
    setForm({ category: 'other', description: '', amount: 0, date: new Date().toISOString().split('T')[0], notes: '' });
    refresh();
  };

  const handleDelete = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا المصروف؟')) {
      deleteExpense(id);
      refresh();
    }
  };

  const handleExport = () => {
    const data = filtered.map(e => ({
      التصنيف: CATEGORIES[e.category as keyof typeof CATEGORIES]?.label || e.category,
      الوصف: e.description,
      المبلغ: e.amount,
      التاريخ: e.date,
      ملاحظات: e.notes,
    }));
    exportToCSV(data, `expenses_${filterMonth}`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">المصروفات</h1>
          <p className="text-gray-500 text-sm mt-1">إدارة مصروفات السنتر</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition text-sm">
            <Download size={16} /> تصدير
          </button>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition text-sm">
            <Plus size={16} /> إضافة مصروف
          </button>
        </div>
      </div>

      {/* Stats by Category */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {Object.entries(CATEGORIES).map(([key, { label, icon: Icon, color }]) => (
          <div key={key} className="bg-white rounded-xl shadow-sm p-3 text-center cursor-pointer hover:shadow-md transition"
            onClick={() => setFilterCategory(filterCategory === key ? '' : key)}>
            <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mx-auto mb-2`}>
              <Icon size={18} />
            </div>
            <p className="text-xs text-gray-500">{label}</p>
            <p className="font-bold text-sm">{totalByCategory[key]?.toLocaleString() || 0}</p>
          </div>
        ))}
      </div>

      {/* Total Card */}
      <div className="bg-gradient-to-l from-red-600 to-red-500 rounded-2xl p-5 text-white">
        <p className="text-red-100">إجمالي المصروفات - {filterMonth}</p>
        <p className="text-3xl font-bold mt-1">{totalExpenses.toLocaleString()} ج.م</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">الشهر:</label>
          <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
        </div>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white">
          <option value="">كل التصنيفات</option>
          {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">#</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">التصنيف</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">الوصف</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">المبلغ</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">التاريخ</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((expense, i) => {
                const cat = CATEGORIES[expense.category as keyof typeof CATEGORIES];
                const Icon = cat?.icon || MoreHorizontal;
                return (
                  <tr key={expense.id} className="border-b hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-sm text-gray-500">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg ${cat?.color || 'bg-gray-100'} flex items-center justify-center`}>
                          <Icon size={14} />
                        </div>
                        <span className="text-sm">{cat?.label || expense.category}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{expense.description}</td>
                    <td className="px-4 py-3 font-bold text-red-600">{expense.amount.toLocaleString()} ج.م</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{expense.date}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleDelete(expense.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    <Package size={40} className="mx-auto mb-2 opacity-50" />
                    <p>لا توجد مصروفات</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-lg">إضافة مصروف جديد</h3>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">التصنيف *</label>
                <select required value={form.category} onChange={e => setForm({ ...form, category: e.target.value as Expense['category'] })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white">
                  {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الوصف *</label>
                <input type="text" required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" placeholder="وصف المصروف" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ (ج.م) *</label>
                  <input type="number" required min={1} value={form.amount} onChange={e => setForm({ ...form, amount: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ</label>
                  <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                <input type="text" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-primary-600 text-white py-2.5 rounded-xl font-medium hover:bg-primary-700 transition">
                  إضافة المصروف
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
