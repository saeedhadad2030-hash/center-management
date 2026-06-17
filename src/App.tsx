import { useState, useEffect } from 'react';
import { User, Page } from './types';
import { setCurrentUser } from './store';
import { getSupabaseCurrentUser, signOutFromSupabase } from './services/auth';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Students from './components/Students';
import Groups from './components/Groups';
import Attendance from './components/Attendance';
import Payments from './components/Payments';
import Exams from './components/Exams';
import Messages from './components/Messages';
import Settings from './components/Settings';
import Teachers from './components/Teachers';
import Expenses from './components/Expenses';
import Finance from './components/Finance';
import ParentPortal from './components/ParentPortal';
import GlobalSearch from './components/GlobalSearch';
import NotificationsBell from './components/NotificationsBell';
import TeacherPayments from './components/TeacherPayments';
import Reports from './components/Reports';
import Users from './components/Users';
import AcademicYears from './components/AcademicYears';
import QRAttendance from './components/QRAttendance';
import TeacherDashboard from './components/TeacherDashboard';
import AdminPaymentOverview from './components/AdminPaymentOverview';
import ResponsiveTables from './components/ResponsiveTables';
import { Menu } from 'lucide-react';

const pageRoles: Record<Page, User['role'][]> = {
  dashboard: ['admin', 'employee', 'teacher'],
  students: ['admin', 'employee', 'teacher'],
  teachers: ['admin'],
  groups: ['admin', 'employee', 'teacher'],
  attendance: ['admin', 'employee', 'teacher'],
  'qr-attendance': ['admin', 'employee', 'teacher'],
  payments: ['admin', 'employee', 'teacher'],
  'admin-payment-overview': ['admin'],
  'teacher-payments': ['admin'],
  expenses: ['admin'],
  finance: ['admin'],
  reports: ['admin'],
  exams: ['admin', 'teacher'],
  messages: ['admin', 'employee'],
  users: ['admin'],
  'academic-years': ['admin'],
  settings: ['admin'],
  'parent-portal': ['admin', 'employee', 'teacher'],
};

function canAccessPage(user: User, page: Page): boolean {
  return pageRoles[page]?.includes(user.role) ?? false;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getSupabaseCurrentUser()
      .then(savedUser => {
        if (cancelled) return;
        setCurrentUser(savedUser);
        setUser(savedUser);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (user && !canAccessPage(user, currentPage)) {
      setCurrentPage('dashboard');
    }
  }, [currentPage, user]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';

    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const handleLogin = (u: User) => {
    setUser(u);
    setCurrentUser(u);
  };

  const handleLogout = async () => {
    await signOutFromSupabase();
    setUser(null);
    setCurrentUser(null);
    setCurrentPage('dashboard');
  };

  const handleSearchSelect = (type: string) => {
    if (type === 'student') setCurrentPage('students');
    else if (type === 'group') setCurrentPage('groups');
    else if (type === 'teacher') setCurrentPage('teachers');
    else if (type === 'user') setCurrentPage('users');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-900 to-primary-600">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg font-medium">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  // Parent portal is a standalone page
  if (currentPage === 'parent-portal') {
    return (
      <div>
        <button 
          onClick={() => setCurrentPage('dashboard')}
          className="fixed top-4 left-4 z-50 px-4 py-2 bg-white shadow-lg rounded-xl text-sm font-medium hover:bg-gray-50 transition"
        >
          ← {user ? 'العودة للوحة التحكم' : 'العودة لتسجيل الدخول'}
        </button>
        <ParentPortal />
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} onParentPortal={() => setCurrentPage('parent-portal')} />;
  }

  const renderPage = () => {
    if (!canAccessPage(user, currentPage)) {
      return <Dashboard />;
    }

    // Teacher-specific: show TeacherDashboard for dashboard
    if (user.role === 'teacher' && user.teacher_id && currentPage === 'dashboard') {
      return <TeacherDashboard teacherId={user.teacher_id} />;
    }

    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'students': return <Students />;
      case 'teachers': return <Teachers />;
      case 'groups': return <Groups />;
      case 'attendance': return <Attendance />;
      case 'qr-attendance': return <QRAttendance />;
      case 'payments': return <Payments />;
      case 'admin-payment-overview': return <AdminPaymentOverview />;
      case 'teacher-payments': return <TeacherPayments />;
      case 'expenses': return <Expenses />;
      case 'finance': return <Finance />;
      case 'reports': return <Reports />;
      case 'exams': return <Exams />;
      case 'messages': return <Messages />;
      case 'users': return <Users />;
      case 'academic-years': return <AcademicYears />;
      case 'settings': return <Settings onPageChange={p => setCurrentPage(p)} />;
      default: return <Dashboard />;
    }
  };

  const pageTitle: Record<Page, string> = {
    dashboard: user.role === 'teacher' ? 'لوحة المدرس' : 'لوحة التحكم',
    students: 'إدارة الطلاب',
    teachers: 'إدارة المدرسين',
    groups: user.role === 'teacher' ? 'مجموعاتي' : 'إدارة المجموعات',
    attendance: 'الحضور والغياب',
    'qr-attendance': 'حضور QR',
    payments: user.role === 'teacher' ? 'مدفوعات طلابي' : 'المدفوعات',
    'admin-payment-overview': 'ملخص الدفع',
    'teacher-payments': 'مستحقات المدرسين',
    expenses: 'المصروفات',
    finance: 'التقرير المالي',
    reports: 'التقارير',
    exams: 'الامتحانات',
    messages: 'الرسائل',
    users: 'المستخدمين',
    'academic-years': 'السنوات الدراسية',
    settings: 'الإعدادات',
    'parent-portal': 'بوابة ولي الأمر',
  };

  return (
    <div className="min-h-screen bg-slate-100 overflow-x-hidden">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 right-0 left-0 bg-white shadow-sm z-30 px-3 py-2.5 flex items-center justify-between gap-2">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="w-11 h-11 flex items-center justify-center hover:bg-gray-100 rounded-xl flex-shrink-0"
          aria-label="فتح القائمة"
        >
          <Menu size={22} />
        </button>
        <h1 className="font-bold text-primary-800 text-base truncate min-w-0">{pageTitle[currentPage]}</h1>
        <div className="flex-shrink-0">
          <NotificationsBell onNavigate={(p) => setCurrentPage(p as Page)} />
        </div>
      </div>

      {/* Desktop Header */}
      <div className={`hidden lg:flex fixed top-0 left-0 z-30 h-16 bg-white shadow-sm items-center justify-between px-6 transition-all duration-300 ${sidebarCollapsed ? 'right-20' : 'right-64'}`}>
        <GlobalSearch onSelect={handleSearchSelect} />
        <div className="flex items-center gap-4">
          <NotificationsBell onNavigate={(p) => setCurrentPage(p as Page)} />
        </div>
      </div>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
          onPointerDown={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Desktop */}
      <div className="hidden lg:block">
        <Sidebar
          currentPage={currentPage}
          onPageChange={p => { setCurrentPage(p); setMobileMenuOpen(false); }}
          user={user}
          onLogout={handleLogout}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Sidebar - Mobile */}
      <div className={`lg:hidden fixed top-0 right-0 h-full z-50 transition-transform duration-300 ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <Sidebar
          currentPage={currentPage}
          onPageChange={p => { setCurrentPage(p); setMobileMenuOpen(false); }}
          user={user}
          onLogout={handleLogout}
          collapsed={false}
          onToggle={() => {}}
          isMobile
          onClose={() => setMobileMenuOpen(false)}
        />
      </div>

      {/* Main Content */}
      <main className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:mr-20' : 'lg:mr-64'} pt-16 lg:pt-20`}>
        <div className="px-3 py-4 sm:p-4 lg:p-6 max-w-full">
          <ResponsiveTables page={currentPage} />
          {renderPage()}
        </div>
      </main>
    </div>
  );
}
