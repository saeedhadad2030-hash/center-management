export interface Student {
  id: string;
  name: string;
  phone: string;
  parent_phone: string;
  grade: string;
  group_id: string;
  notes: string;
  photo: string;
  academic_year_id: string;
  status: 'active' | 'graduated' | 'archived';
  created_at: string;
}

export interface Teacher {
  id: string;
  name: string;
  phone: string;
  specialization: string;
  salary: number;
  commission: number; // نسبة المدرس من التحصيل (مثل 75%)
  user_id?: string; // ربط بحساب مستخدم
  created_at: string;
}

export interface TeacherPayment {
  id: string;
  teacher_id: string;
  amount: number;
  month: string;
  payment_date: string;
  notes: string;
}

export interface Group {
  id: string;
  name: string;
  teacher_id: string;
  teacher: string;
  schedule: string;
  days: string[];
  time: string;
  max_students: number;
  fees: number;
  academic_year_id: string;
  created_at: string;
}

export interface Attendance {
  id: string;
  student_id: string;
  group_id: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  recorded_by?: string;
  recorded_at?: string;
}

export interface Payment {
  id: string;
  student_id: string;
  group_id: string;
  teacher_id: string;
  amount: number;
  payment_date: string;
  month: string;
  notes: string;
}

export interface StudentSubscription {
  id: string;
  student_id: string;
  group_id?: string;
  month: string;
  status: 'paid' | 'pending' | 'overdue';
  amount: number;
  payment_id?: string;
  due_date: string;
}

export interface StudentEnrollment {
  id: string;
  student_id: string;
  group_id: string;
  enrolled_at: string;
}

export interface Expense {
  id: string;
  category: 'salary' | 'rent' | 'electricity' | 'water' | 'marketing' | 'supplies' | 'teacher_payment' | 'other';
  description: string;
  amount: number;
  date: string;
  notes: string;
  teacher_id?: string;
}

export interface Exam {
  id: string;
  title: string;
  group_id: string;
  date: string;
  total_score: number;
}

export interface ExamResult {
  id: string;
  exam_id: string;
  student_id: string;
  score: number;
}

export interface Message {
  id: string;
  student_id: string;
  type: 'absence' | 'payment' | 'general';
  content: string;
  date: string;
  sent: boolean;
}

export interface AuditLog {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: string;
  timestamp: string;
}

export interface AcademicYear {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  created_at: string;
}

export type UserRole = 'admin' | 'employee' | 'teacher';

export interface User {
  id: string;
  name: string;
  username: string;
  password: string;
  role: UserRole;
  teacher_id?: string;
  is_active: boolean;
  created_at?: string;
}

export interface Notification {
  id: string;
  type: 'warning' | 'info' | 'danger' | 'success';
  title: string;
  message: string;
  link?: string;
}

export interface TeacherStats {
  teacher_id: string;
  teacher_name: string;
  total_students: number;
  total_groups: number;
  total_collected: number;
  commission_rate: number;
  teacher_share: number;
  center_share: number;
  paid_amount: number;
  remaining: number;
}

export type Page = 
  | 'dashboard' 
  | 'students' 
  | 'groups' 
  | 'attendance' 
  | 'payments' 
  | 'exams' 
  | 'messages' 
  | 'settings' 
  | 'teachers' 
  | 'expenses' 
  | 'finance' 
  | 'parent-portal'
  | 'teacher-payments'
  | 'reports'
  | 'users'
  | 'academic-years'
  | 'qr-attendance'
  | 'admin-payment-overview';
