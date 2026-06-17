import { useState, useEffect, useCallback } from 'react';
import { getStudents, getGroups, getPayments, getAttendance, addMessage, getMessages } from '../store';
import { Student, Group } from '../types';
import { MessageSquare, Send, AlertTriangle, Clock, Users, Search } from 'lucide-react';

export default function Messages() {
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [messages, setMessages] = useState<ReturnType<typeof getMessages>>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [messageText, setMessageText] = useState('');
  const [messageType, setMessageType] = useState<'general' | 'absence' | 'payment'>('general');
  const [filterGroup, setFilterGroup] = useState('');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'send' | 'history'>('send');

  const refresh = useCallback(() => {
    setStudents(getStudents());
    setGroups(getGroups());
    setMessages(getMessages());
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const today = new Date().toISOString().split('T')[0];

  const filteredStudents = students.filter(s => {
    const matchGroup = !filterGroup || s.group_id === filterGroup;
    const matchSearch = !search || s.name.includes(search);
    return matchGroup && matchSearch;
  });

  const getAbsentStudents = () => {
    const attendance = getAttendance();
    const todayAbsent = attendance.filter(a => a.date === today && a.status === 'absent');
    return todayAbsent.map(a => a.student_id);
  };

  const getUnpaidStudents = () => {
    const payments = getPayments();
    const monthPayments = payments.filter(p => p.month === currentMonth);
    const paidIds = new Set(monthPayments.map(p => p.student_id));
    return students.filter(s => !paidIds.has(s.id)).map(s => s.id);
  };

  const selectAbsent = () => {
    setSelectedStudents(getAbsentStudents());
    setMessageType('absence');
    setMessageText('السلام عليكم ورحمة الله\nنود إبلاغكم بأن الطالب/ة لم يحضر اليوم.\nنرجو المتابعة.');
  };

  const selectUnpaid = () => {
    setSelectedStudents(getUnpaidStudents());
    setMessageType('payment');
    setMessageText(`السلام عليكم ورحمة الله\nنود تذكيركم بسداد قسط شهر ${currentMonth}\nشكراً لكم 🙏`);
  };

  const toggleStudent = (id: string) => {
    setSelectedStudents(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const selectAll = () => {
    setSelectedStudents(filteredStudents.map(s => s.id));
  };

  const sendMessages = () => {
    if (selectedStudents.length === 0 || !messageText.trim()) {
      alert('اختر طلاب واكتب رسالة');
      return;
    }

    selectedStudents.forEach(studentId => {
      const student = students.find(s => s.id === studentId);
      if (!student) return;

      const phone = student.parent_phone || student.phone;
      if (!phone) return;

      // Personalize message
      const personalizedMsg = messageText.replace('{اسم_الطالب}', student.name);

      // Log message
      addMessage({
        student_id: studentId,
        type: messageType,
        content: personalizedMsg,
        date: new Date().toISOString(),
        sent: true,
      });

      // Open WhatsApp
      const formattedPhone = phone.startsWith('0') ? '2' + phone : phone;
      const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(personalizedMsg)}`;
      window.open(url, '_blank');
    });

    refresh();
    setSelectedStudents([]);
    setMessageText('');
  };

  const templates = [
    { label: 'إشعار غياب', text: 'السلام عليكم ورحمة الله\nنود إبلاغكم بأن الطالب/ة {اسم_الطالب} لم يحضر اليوم.\nنرجو المتابعة والاهتمام.' },
    { label: 'تذكير سداد', text: `السلام عليكم ورحمة الله\nنود تذكيركم بسداد القسط الشهري لـ {اسم_الطالب}\nشكراً لتعاونكم 🙏` },
    { label: 'إشعار امتحان', text: 'السلام عليكم ورحمة الله\nنود إبلاغكم بأنه سيتم عقد امتحان قريباً.\nنرجو مراجعة المواد الدراسية.\nبالتوفيق 📚' },
    { label: 'تهنئة', text: 'السلام عليكم ورحمة الله\nنبارك لكم تفوق الطالب/ة {اسم_الطالب}\nنتمنى مزيداً من التقدم والنجاح 🌟' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">الرسائل والإشعارات</h1>
        <p className="text-gray-500 text-sm mt-1">إرسال رسائل واتساب لأولياء الأمور</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab('send')}
          className={`px-5 py-2 rounded-xl text-sm font-medium transition ${tab === 'send' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
          إرسال رسالة
        </button>
        <button onClick={() => setTab('history')}
          className={`px-5 py-2 rounded-xl text-sm font-medium transition ${tab === 'history' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
          سجل الرسائل ({messages.length})
        </button>
      </div>

      {tab === 'send' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Student Selection */}
          <div className="lg:col-span-1 space-y-4">
            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-sm p-4 space-y-2">
              <h3 className="font-bold text-sm text-gray-800 mb-2">إجراءات سريعة</h3>
              <button onClick={selectAbsent} className="w-full flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-xl text-sm hover:bg-red-100 transition">
                <AlertTriangle size={16} /> إشعار الغائبين اليوم
              </button>
              <button onClick={selectUnpaid} className="w-full flex items-center gap-2 p-3 bg-amber-50 text-amber-700 rounded-xl text-sm hover:bg-amber-100 transition">
                <Clock size={16} /> تذكير المتأخرين بالسداد
              </button>
              <button onClick={selectAll} className="w-full flex items-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-xl text-sm hover:bg-blue-100 transition">
                <Users size={16} /> تحديد الكل
              </button>
            </div>

            {/* Students List */}
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-bold text-sm text-gray-800">اختر الطلاب ({selectedStudents.length})</h3>
              </div>
              <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm mb-2 outline-none bg-white">
                <option value="">كل المجموعات</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <div className="relative mb-2">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="بحث..."
                  className="w-full pr-8 pl-3 py-2 border border-gray-200 rounded-xl text-xs outline-none" />
              </div>
              <div className="space-y-1 max-h-[300px] overflow-y-auto">
                {filteredStudents.map(s => (
                  <label key={s.id} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition ${selectedStudents.includes(s.id) ? 'bg-primary-50' : 'hover:bg-gray-50'}`}>
                    <input type="checkbox" checked={selectedStudents.includes(s.id)} onChange={() => toggleStudent(s.id)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                    <span className="text-sm">{s.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Message Composition */}
          <div className="lg:col-span-2 space-y-4">
            {/* Templates */}
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <h3 className="font-bold text-sm text-gray-800 mb-3">قوالب جاهزة</h3>
              <div className="flex flex-wrap gap-2">
                {templates.map((t, i) => (
                  <button key={i} onClick={() => setMessageText(t.text)}
                    className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs hover:bg-primary-50 hover:text-primary-600 transition">
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <h3 className="font-bold text-sm text-gray-800 mb-3">نص الرسالة</h3>
              <p className="text-xs text-gray-400 mb-2">💡 استخدم {'{اسم_الطالب}'} ليتم استبدالها تلقائياً</p>
              <textarea value={messageText} onChange={e => setMessageText(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                rows={6} placeholder="اكتب رسالتك هنا..." />
              
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  سيتم إرسال {selectedStudents.length} رسالة عبر واتساب
                </p>
                <button onClick={sendMessages}
                  disabled={selectedStudents.length === 0 || !messageText.trim()}
                  className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
                  <Send size={16} /> إرسال واتساب
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Message History */
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">الطالب</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">النوع</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">الرسالة</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {[...messages].reverse().map(m => {
                  const student = students.find(s => s.id === m.student_id);
                  return (
                    <tr key={m.id} className="border-b hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-medium text-sm">{student?.name || 'غير معروف'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${m.type === 'absence' ? 'bg-red-100 text-red-600' : m.type === 'payment' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                          {m.type === 'absence' ? 'غياب' : m.type === 'payment' ? 'سداد' : 'عام'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{m.content}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{new Date(m.date).toLocaleString('ar-EG')}</td>
                    </tr>
                  );
                })}
                {messages.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-12 text-gray-400">
                      <MessageSquare size={40} className="mx-auto mb-2 opacity-50" />
                      <p>لا توجد رسائل بعد</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
