import { Page, User } from '../types';
import {
  LayoutDashboard, Users, Layers, ClipboardCheck, CreditCard,
  FileText, MessageSquare, Settings, LogOut, GraduationCap, ChevronLeft,
  UserCheck, Wallet, PieChart, DollarSign, BarChart3, UserCog, Calendar, QrCode, Eye, X
} from 'lucide-react';
import DeveloperCredit from './DeveloperCredit';

interface SidebarProps {
  currentPage: Page;
  onPageChange: (page: Page) => void;
  user: User;
  onLogout: () => void;
  collapsed: boolean;
  onToggle: () => void;
  isMobile?: boolean;
  onClose?: () => void;
}

const menuItems: { page: Page; label: string; icon: React.ReactNode; roles: string[] }[] = [
  { page: 'dashboard', label: 'لوحة التحكم', icon: <LayoutDashboard size={20} />, roles: ['admin', 'employee', 'teacher'] },
  { page: 'students', label: 'إدارة الطلاب', icon: <Users size={20} />, roles: ['admin', 'employee', 'teacher'] },
  { page: 'teachers', label: 'إدارة المدرسين', icon: <UserCheck size={20} />, roles: ['admin'] },
  { page: 'groups', label: 'إدارة المجموعات', icon: <Layers size={20} />, roles: ['admin', 'employee', 'teacher'] },
  { page: 'attendance', label: 'الحضور والغياب', icon: <ClipboardCheck size={20} />, roles: ['admin', 'employee', 'teacher'] },
  { page: 'qr-attendance', label: 'حضور QR', icon: <QrCode size={20} />, roles: ['admin', 'employee', 'teacher'] },
  { page: 'payments', label: 'المدفوعات', icon: <CreditCard size={20} />, roles: ['admin', 'employee', 'teacher'] },
  { page: 'admin-payment-overview', label: 'ملخص الدفع', icon: <Eye size={20} />, roles: ['admin'] },
  { page: 'teacher-payments', label: 'مستحقات المدرسين', icon: <DollarSign size={20} />, roles: ['admin'] },
  { page: 'expenses', label: 'المصروفات', icon: <Wallet size={20} />, roles: ['admin'] },
  { page: 'finance', label: 'التقرير المالي', icon: <PieChart size={20} />, roles: ['admin'] },
  { page: 'reports', label: 'التقارير', icon: <BarChart3 size={20} />, roles: ['admin'] },
  { page: 'exams', label: 'الامتحانات', icon: <FileText size={20} />, roles: ['admin', 'teacher'] },
  { page: 'messages', label: 'الرسائل', icon: <MessageSquare size={20} />, roles: ['admin', 'employee'] },
  { page: 'users', label: 'المستخدمين', icon: <UserCog size={20} />, roles: ['admin'] },
  { page: 'academic-years', label: 'السنوات الدراسية', icon: <Calendar size={20} />, roles: ['admin'] },
  { page: 'settings', label: 'الإعدادات', icon: <Settings size={20} />, roles: ['admin'] },
];

export default function Sidebar({ currentPage, onPageChange, user, onLogout, collapsed, onToggle, isMobile = false, onClose }: SidebarProps) {
  const filteredItems = menuItems.filter(item => item.roles.includes(user.role));

  const roleLabel = user.role === 'admin' ? 'مدير النظام' : user.role === 'employee' ? 'موظف' : 'مدرس';
  const closeMobileMenu = (event: React.SyntheticEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onClose?.();
  };

  return (
    <aside className={`fixed top-0 right-0 h-full bg-gradient-to-b from-primary-900 to-primary-800 text-white ${isMobile ? 'z-50 w-[min(88vw,22rem)] max-w-sm' : `z-40 ${collapsed ? 'w-20' : 'w-64'}`} shadow-2xl flex flex-col transition-all duration-300`}>
      {/* Header */}
      <div className="p-4 border-b border-primary-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <GraduationCap size={22} />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h2 className="font-bold text-lg leading-tight">السنتر التعليمي</h2>
              <p className="text-primary-300 text-xs">نظام إدارة متكامل</p>
            </div>
          )}
          {isMobile && (
            <button
              type="button"
              onClick={closeMobileMenu}
              onPointerDown={closeMobileMenu}
              className="mr-auto w-10 h-10 rounded-xl bg-white/10 hover:bg-white/15 flex items-center justify-center transition"
              aria-label="إغلاق القائمة"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Toggle Button */}
      {!isMobile && (
        <button
          onClick={onToggle}
          className="absolute -left-3 top-20 w-7 h-7 bg-primary-600 rounded-full flex items-center justify-center hover:bg-primary-500 transition shadow-lg"
          aria-label={collapsed ? 'فتح القائمة' : 'طي القائمة'}
        >
          <ChevronLeft size={15} className={`transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      )}

      {/* User Info */}
      {!collapsed && (
        <div className="p-4 border-b border-primary-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary-500 rounded-full flex items-center justify-center text-sm font-bold">
              {user.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{user.name}</p>
              <p className="text-primary-300 text-xs">{roleLabel}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-3">
          {filteredItems.map(item => (
            <li key={item.page}>
              <button
                onClick={() => onPageChange(item.page)}
                className={`w-full flex items-center gap-3 px-3 ${isMobile ? 'py-3' : 'py-2.5'} rounded-xl transition-all ${
                  currentPage === item.page
                    ? 'bg-white/15 text-white shadow-lg'
                    : 'text-primary-200 hover:bg-white/10 hover:text-white'
                } ${collapsed ? 'justify-center' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-primary-700">
        {!collapsed && (
          <div className="mb-2">
            <DeveloperCredit variant="dark" compact />
          </div>
        )}
        <button
          onClick={onLogout}
          className={`w-full flex items-center gap-3 px-3 ${isMobile ? 'py-3' : 'py-2.5'} rounded-xl text-red-300 hover:bg-red-500/20 hover:text-red-200 transition ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut size={20} />
          {!collapsed && <span className="text-sm font-medium">تسجيل الخروج</span>}
        </button>
      </div>
    </aside>
  );
}
