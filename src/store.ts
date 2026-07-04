import { Student, Group, Attendance, Payment, Exam, ExamResult, Message, User, Teacher, Expense, AuditLog, StudentSubscription, StudentEnrollment, Notification, AcademicYear, TeacherPayment, TeacherStats } from './types';
import { isSupabaseConfigured, supabase } from './lib/supabase';

const KEYS = {
  students: 'center_students',
  groups: 'center_groups',
  attendance: 'center_attendance',
  payments: 'center_payments',
  exams: 'center_exams',
  examResults: 'center_exam_results',
  messages: 'center_messages',
  users: 'center_users',
  currentUser: 'center_current_user',
  teachers: 'center_teachers',
  expenses: 'center_expenses',
  auditLogs: 'center_audit_logs',
  subscriptions: 'center_subscriptions',
  academicYears: 'center_academic_years',
  teacherPayments: 'center_teacher_payments',
  enrollments: 'center_enrollments',
  settings: 'center_settings',
};

let currentUserCache: User | null = null;
let suppressCloudSync = false;

const TABLE_BY_KEY: Partial<Record<string, string>> = {
  [KEYS.academicYears]: 'academic_years',
  [KEYS.teachers]: 'teachers',
  [KEYS.groups]: 'groups',
  [KEYS.students]: 'students',
  [KEYS.enrollments]: 'enrollments',
  [KEYS.attendance]: 'attendance',
  [KEYS.payments]: 'payments',
  [KEYS.subscriptions]: 'subscriptions',
  [KEYS.expenses]: 'expenses',
  [KEYS.teacherPayments]: 'teacher_payments',
  [KEYS.exams]: 'exams',
  [KEYS.examResults]: 'exam_results',
  [KEYS.messages]: 'messages',
  [KEYS.auditLogs]: 'audit_logs',
};

const SYNC_TABLES = [
  { key: KEYS.academicYears, table: 'academic_years' },
  { key: KEYS.teachers, table: 'teachers' },
  { key: KEYS.groups, table: 'groups' },
  { key: KEYS.students, table: 'students' },
  { key: KEYS.enrollments, table: 'enrollments' },
  { key: KEYS.attendance, table: 'attendance' },
  { key: KEYS.payments, table: 'payments' },
  { key: KEYS.subscriptions, table: 'subscriptions' },
  { key: KEYS.expenses, table: 'expenses' },
  { key: KEYS.teacherPayments, table: 'teacher_payments' },
  { key: KEYS.exams, table: 'exams' },
  { key: KEYS.examResults, table: 'exam_results' },
  { key: KEYS.messages, table: 'messages' },
  { key: KEYS.auditLogs, table: 'audit_logs' },
] as const;

const UUID_FIELDS = new Set([
  'id',
  'teacher_id',
  'user_id',
  'academic_year_id',
  'student_id',
  'group_id',
  'recorded_by',
  'payment_id',
  'exam_id',
  'user_id',
  'entity_id',
]);

function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c =>
    (Number(c) ^ (Math.random() * 16 >> (Number(c) / 4))).toString(16)
  );
}

function getItems<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function isCloudReady(): boolean {
  return isSupabaseConfigured && !!currentUserCache;
}

function cleanDbRow<T extends Record<string, unknown>>(row: T): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  Object.entries(row).forEach(([field, value]) => {
    if (value === undefined) return;
    if (UUID_FIELDS.has(field) && value === '') {
      clean[field] = null;
      return;
    }
    clean[field] = value;
  });
  return clean;
}

function writeLocal<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function queueCloudSync<T>(key: string, previousItems: T[], nextItems: T[]): void {
  const table = TABLE_BY_KEY[key];
  if (!table || suppressCloudSync || !isCloudReady()) return;

  void (async () => {
    try {
      const rows = nextItems.map(item => cleanDbRow(item as Record<string, unknown>));
      if (rows.length > 0) {
        const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id' });
        if (error) throw error;
      }

      const nextIds = new Set(rows.map(row => row.id).filter(Boolean));
      const removedIds = previousItems
        .map(item => (item as Record<string, unknown>).id)
        .filter((id): id is string => typeof id === 'string' && !nextIds.has(id));

      if (removedIds.length > 0) {
        const { error } = await supabase.from(table).delete().in('id', removedIds);
        if (error) throw error;
      }
    } catch (error) {
      console.warn(`Supabase sync failed for ${table}`, error);
    }
  })();
}

function setItems<T>(key: string, items: T[]): void {
  const previousItems = getItems<T>(key);
  writeLocal(key, items);
  queueCloudSync(key, previousItems, items);
}

export async function loadSupabaseData(): Promise<void> {
  if (!isCloudReady()) return;

  suppressCloudSync = true;
  try {
    for (const { key, table } of SYNC_TABLES) {
      const { data, error } = await supabase.from(table).select('*');
      if (error) {
        console.warn(`Supabase load failed for ${table}`, error);
      } else {
        writeLocal(key, data || []);
      }
    }

    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('hidden_teachers,hidden_groups,center_name,center_phone,center_address')
      .eq('id', 1)
      .maybeSingle();
    if (settingsError) {
      console.warn('Supabase settings load failed', settingsError);
    } else if (settings) {
      writeLocal(KEYS.settings, {
        hiddenTeachers: settings.hidden_teachers || [],
        hiddenGroups: settings.hidden_groups || [],
        centerName: settings.center_name || undefined,
        centerPhone: settings.center_phone || undefined,
        centerAddress: settings.center_address || undefined,
      });
    }
  } finally {
    suppressCloudSync = false;
  }
}

export async function syncLocalDataToSupabase(): Promise<void> {
  if (!isCloudReady()) return;

  for (const { key, table } of SYNC_TABLES) {
    const rows = getItems<Record<string, unknown>>(key).map(cleanDbRow);
    if (rows.length === 0) continue;
    const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id' });
    if (error) throw error;
  }
}

// Settings (public schedule visibility)
export interface CenterSettings {
  hiddenTeachers: string[];   // teacher IDs to hide from public view
  hiddenGroups: string[];     // group IDs to hide from public view
  centerName?: string;
  centerPhone?: string;
  centerAddress?: string;
}

export function getSettings(): CenterSettings {
  try {
    const data = localStorage.getItem(KEYS.settings);
    return data ? JSON.parse(data) : { hiddenTeachers: [], hiddenGroups: [] };
  } catch {
    return { hiddenTeachers: [], hiddenGroups: [] };
  }
}

export function saveSettings(settings: CenterSettings): void {
  localStorage.setItem(KEYS.settings, JSON.stringify(settings));
  if (isCloudReady()) {
    void supabase
      .from('settings')
      .upsert({
        id: 1,
        hidden_teachers: settings.hiddenTeachers || [],
        hidden_groups: settings.hiddenGroups || [],
        center_name: settings.centerName || null,
        center_phone: settings.centerPhone || null,
        center_address: settings.centerAddress || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })
      .then(({ error }) => {
        if (error) console.warn('Supabase settings sync failed', error);
      });
  }
}

// Academic Years
export function getAcademicYears(): AcademicYear[] {
  return getItems<AcademicYear>(KEYS.academicYears);
}

export function getCurrentAcademicYear(): AcademicYear | null {
  const years = getAcademicYears();
  return years.find(y => y.is_current) || years[0] || null;
}

export function addAcademicYear(year: Omit<AcademicYear, 'id' | 'created_at'>): AcademicYear {
  const years = getAcademicYears();
  if (year.is_current) {
    years.forEach(y => y.is_current = false);
  }
  const newYear: AcademicYear = {
    ...year,
    id: generateId(),
    created_at: new Date().toISOString(),
  };
  years.push(newYear);
  setItems(KEYS.academicYears, years);
  logAction('إنشاء سنة دراسية', 'academic_year', newYear.id, newYear.name);
  return newYear;
}

export function setCurrentAcademicYear(id: string): void {
  const years = getAcademicYears();
  years.forEach(y => y.is_current = y.id === id);
  setItems(KEYS.academicYears, years);
  logAction('تغيير السنة الدراسية الحالية', 'academic_year', id);
}

export function deleteAcademicYear(id: string): void {
  const years = getAcademicYears().filter(y => y.id !== id);
  setItems(KEYS.academicYears, years);
}

// Audit Logging
export function logAction(action: string, entityType: string, entityId?: string, details?: string): void {
  const user = getCurrentUser();
  if (!user) return;
  
  const logs = getAuditLogs();
  const newLog: AuditLog = {
    id: generateId(),
    user_id: user.id,
    user_name: user.name,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details,
    timestamp: new Date().toISOString(),
  };
  logs.push(newLog);
  if (logs.length > 500) logs.shift();
  setItems(KEYS.auditLogs, logs);
}

export function getAuditLogs(): AuditLog[] {
  return getItems<AuditLog>(KEYS.auditLogs);
}

// Teachers
export function getTeachers(): Teacher[] {
  return getItems<Teacher>(KEYS.teachers);
}

export function getTeacherById(id: string): Teacher | undefined {
  return getTeachers().find(t => t.id === id);
}

export function addTeacher(teacher: Omit<Teacher, 'id' | 'created_at'>): Teacher {
  const teachers = getTeachers();
  const newTeacher: Teacher = {
    ...teacher,
    id: generateId(),
    created_at: new Date().toISOString(),
  };
  teachers.push(newTeacher);
  setItems(KEYS.teachers, teachers);
  logAction('إضافة مدرس', 'teacher', newTeacher.id, newTeacher.name);
  return newTeacher;
}

export function updateTeacher(id: string, updates: Partial<Teacher>): void {
  const teachers = getTeachers();
  const index = teachers.findIndex(t => t.id === id);
  if (index !== -1) {
    teachers[index] = { ...teachers[index], ...updates };
    setItems(KEYS.teachers, teachers);
    logAction('تعديل مدرس', 'teacher', id, teachers[index].name);
  }
}

export function deleteTeacher(id: string): void {
  const teacher = getTeachers().find(t => t.id === id);
  const teachers = getTeachers().filter(t => t.id !== id);
  setItems(KEYS.teachers, teachers);
  logAction('حذف مدرس', 'teacher', id, teacher?.name);
}

// Teacher Payments
export function getTeacherPayments(): TeacherPayment[] {
  return getItems<TeacherPayment>(KEYS.teacherPayments);
}

export function addTeacherPayment(payment: Omit<TeacherPayment, 'id'>): TeacherPayment {
  const payments = getTeacherPayments();
  const newPayment: TeacherPayment = { ...payment, id: generateId() };
  payments.push(newPayment);
  setItems(KEYS.teacherPayments, payments);
  
  // Add as expense
  const teacher = getTeacherById(payment.teacher_id);
  addExpense({
    category: 'teacher_payment',
    description: `دفعة للمدرس: ${teacher?.name || ''}`,
    amount: payment.amount,
    date: payment.payment_date,
    notes: payment.notes,
    teacher_id: payment.teacher_id,
  });
  
  logAction('دفع مستحقات مدرس', 'teacher_payment', newPayment.id, `${teacher?.name}: ${payment.amount} ج.م`);
  return newPayment;
}

export function getTeacherPaymentsByTeacher(teacherId: string): TeacherPayment[] {
  return getTeacherPayments().filter(p => p.teacher_id === teacherId);
}

export function getTeacherPaymentsByMonth(teacherId: string, month: string): TeacherPayment[] {
  return getTeacherPayments().filter(p => p.teacher_id === teacherId && p.month === month);
}

// Calculate Teacher Stats
export function getTeacherStats(teacherId: string, month: string): TeacherStats {
  const teacher = getTeacherById(teacherId);
  const groups = getGroups().filter(g => g.teacher_id === teacherId);
  const groupIds = groups.map(g => g.id);
  
  // Count unique students across all groups (legacy + enrollments)
  const studentIds = new Set<string>();
  const allStudents = getStudents();
  const allEnrollments = getEnrollments();
  allStudents.forEach(s => { if (groupIds.includes(s.group_id)) studentIds.add(s.id); });
  allEnrollments.forEach(e => { if (groupIds.includes(e.group_id)) studentIds.add(e.student_id); });
  
  const payments = getPayments().filter(p => p.teacher_id === teacherId && p.month === month);
  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
  const commissionRate = teacher?.commission || 0;
  const teacherShare = Math.round(totalCollected * (commissionRate / 100));
  const centerShare = totalCollected - teacherShare;
  const teacherPayments = getTeacherPaymentsByMonth(teacherId, month);
  const paidAmount = teacherPayments.reduce((sum, p) => sum + p.amount, 0);
  
  return {
    teacher_id: teacherId,
    teacher_name: teacher?.name || '',
    total_students: studentIds.size,
    total_groups: groups.length,
    total_collected: totalCollected,
    commission_rate: commissionRate,
    teacher_share: teacherShare,
    center_share: centerShare,
    paid_amount: paidAmount,
    remaining: teacherShare - paidAmount,
  };
}

export function getAllTeachersStats(month: string): TeacherStats[] {
  const teachers = getTeachers();
  return teachers.map(t => getTeacherStats(t.id, month));
}

// Expenses
export function getExpenses(): Expense[] {
  return getItems<Expense>(KEYS.expenses);
}

export function addExpense(expense: Omit<Expense, 'id'>): Expense {
  const expenses = getExpenses();
  const newExpense: Expense = { ...expense, id: generateId() };
  expenses.push(newExpense);
  setItems(KEYS.expenses, expenses);
  if (expense.category !== 'teacher_payment') {
    logAction('إضافة مصروف', 'expense', newExpense.id, `${expense.category}: ${expense.amount} ج.م`);
  }
  return newExpense;
}

export function deleteExpense(id: string): void {
  const expense = getExpenses().find(e => e.id === id);
  const expenses = getExpenses().filter(e => e.id !== id);
  setItems(KEYS.expenses, expenses);
  logAction('حذف مصروف', 'expense', id, expense?.description);
}

// Subscriptions
export function getSubscriptions(): StudentSubscription[] {
  return getItems<StudentSubscription>(KEYS.subscriptions);
}

export function updateSubscription(studentId: string, month: string, status: 'paid' | 'pending' | 'overdue', paymentId?: string): void {
  const subs = getSubscriptions();
  const existing = subs.find(s => s.student_id === studentId && s.month === month);
  if (existing) {
    existing.status = status;
    if (paymentId) existing.payment_id = paymentId;
    setItems(KEYS.subscriptions, subs);
  } else {
    const student = getStudentById(studentId);
    const group = student ? getGroups().find(g => g.id === student.group_id) : null;
    const newSub: StudentSubscription = {
      id: generateId(),
      student_id: studentId,
      month,
      status,
      amount: group?.fees || 0,
      payment_id: paymentId,
      due_date: `${month}-10`,
    };
    subs.push(newSub);
    setItems(KEYS.subscriptions, subs);
  }
}

// Student Enrollments (multi-group)
export function getEnrollments(): StudentEnrollment[] {
  return getItems<StudentEnrollment>(KEYS.enrollments);
}

export function addEnrollment(studentId: string, groupId: string): StudentEnrollment {
  const enrollments = getEnrollments();
  // Check if already enrolled
  const existing = enrollments.find(e => e.student_id === studentId && e.group_id === groupId);
  if (existing) return existing;
  
  const newEnrollment: StudentEnrollment = {
    id: generateId(),
    student_id: studentId,
    group_id: groupId,
    enrolled_at: new Date().toISOString(),
  };
  enrollments.push(newEnrollment);
  setItems(KEYS.enrollments, enrollments);
  const student = getStudentById(studentId);
  const group = getGroups().find(g => g.id === groupId);
  logAction('تسجيل طالب في مجموعة', 'enrollment', newEnrollment.id, `${student?.name} → ${group?.name}`);
  return newEnrollment;
}

export function deleteEnrollment(studentId: string, groupId: string): void {
  const enrollments = getEnrollments().filter(e => !(e.student_id === studentId && e.group_id === groupId));
  setItems(KEYS.enrollments, enrollments);
}

export function removeStudentFromGroup(studentId: string, groupId: string): void {
  const student = getStudentById(studentId);
  deleteEnrollment(studentId, groupId);

  if (student?.group_id === groupId) {
    const remainingGroups = getGroupsForStudent(studentId).filter(g => g.id !== groupId);
    updateStudent(studentId, { group_id: remainingGroups[0]?.id || '' });
  }
}

export function getEnrollmentsByStudent(studentId: string): StudentEnrollment[] {
  return getEnrollments().filter(e => e.student_id === studentId);
}

export function getEnrollmentsByGroup(groupId: string): StudentEnrollment[] {
  return getEnrollments().filter(e => e.group_id === groupId);
}

// Get all students in a group (combining legacy group_id and enrollments)
export function getStudentsByGroup(groupId: string): Student[] {
  const allStudents = getStudents();
  const enrollmentStudentIds = new Set(getEnrollmentsByGroup(groupId).map(e => e.student_id));
  return allStudents.filter(s => s.group_id === groupId || enrollmentStudentIds.has(s.id));
}

// Get all groups a student is in (combining legacy group_id and enrollments)
export function getGroupsForStudent(studentId: string): Group[] {
  const allGroups = getGroups();
  const enrollmentGroupIds = new Set(getEnrollmentsByStudent(studentId).map(e => e.group_id));
  const student = getStudentById(studentId);
  return allGroups.filter(g => g.id === student?.group_id || enrollmentGroupIds.has(g.id));
}

// Teacher-specific helpers
export function getTeacherGroups(teacherId: string): Group[] {
  return getGroups().filter(g => g.teacher_id === teacherId);
}

export function getTeacherStudents(teacherId: string): Student[] {
  const teacherGroups = getTeacherGroups(teacherId);
  const groupIds = new Set(teacherGroups.map(g => g.id));
  const allStudents = getStudents();
  const allEnrollments = getEnrollments();
  
  const studentIds = new Set<string>();
  allStudents.forEach(s => {
    if (groupIds.has(s.group_id)) studentIds.add(s.id);
  });
  allEnrollments.forEach(e => {
    if (groupIds.has(e.group_id)) studentIds.add(e.student_id);
  });
  
  return allStudents.filter(s => studentIds.has(s.id));
}

// Get payment status for a teacher's students in a specific month
export function getTeacherPaymentStatus(teacherId: string, month: string): {
  group: Group;
  students: { student: Student; paid: boolean; payment?: Payment }[];
}[] {
  const teacherGroups = getTeacherGroups(teacherId);
  const allPayments = getPayments().filter(p => p.month === month);
  
  return teacherGroups.map(group => {
    const groupStudents = getStudentsByGroup(group.id).filter(s => s.status === 'active');
    return {
      group,
      students: groupStudents.map(student => {
        const payment = allPayments.find(p => p.student_id === student.id && p.group_id === group.id);
        return { student, paid: !!payment, payment };
      }),
    };
  });
}

// Students
export function getStudents(): Student[] {
  return getItems<Student>(KEYS.students);
}

export function addStudent(student: Omit<Student, 'id' | 'created_at'>): Student {
  const students = getStudents();
  const currentYear = getCurrentAcademicYear();
  const newStudent: Student = {
    ...student,
    academic_year_id: student.academic_year_id || currentYear?.id || '',
    status: student.status || 'active',
    id: generateId(),
    created_at: new Date().toISOString(),
  };
  students.push(newStudent);
  setItems(KEYS.students, students);
  logAction('إضافة طالب', 'student', newStudent.id, newStudent.name);
  return newStudent;
}

export function updateStudent(id: string, updates: Partial<Student>): void {
  const students = getStudents();
  const index = students.findIndex(s => s.id === id);
  if (index !== -1) {
    students[index] = { ...students[index], ...updates };
    setItems(KEYS.students, students);
    logAction('تعديل بيانات طالب', 'student', id, students[index].name);
  }
}

export function deleteStudent(id: string): void {
  const student = getStudents().find(s => s.id === id);
  const students = getStudents().filter(s => s.id !== id);
  setItems(KEYS.students, students);
  logAction('حذف طالب', 'student', id, student?.name);
}

export function getStudentById(id: string): Student | undefined {
  return getStudents().find(s => s.id === id);
}

export function getStudentByParentPhone(phone: string): Student[] {
  return getStudents().filter(s => s.parent_phone === phone);
}

// Promote Students
export function promoteStudents(studentIds: string[], newGrade: string, newGroupId?: string): void {
  const students = getStudents();
  studentIds.forEach(id => {
    const index = students.findIndex(s => s.id === id);
    if (index !== -1) {
      students[index].grade = newGrade;
      if (newGroupId) students[index].group_id = newGroupId;
    }
  });
  setItems(KEYS.students, students);
  logAction('ترقية طلاب', 'student', undefined, `${studentIds.length} طالب`);
}

export function archiveStudents(studentIds: string[]): void {
  const students = getStudents();
  studentIds.forEach(id => {
    const index = students.findIndex(s => s.id === id);
    if (index !== -1) {
      students[index].status = 'archived';
    }
  });
  setItems(KEYS.students, students);
  logAction('أرشفة طلاب', 'student', undefined, `${studentIds.length} طالب`);
}

export function graduateStudents(studentIds: string[]): void {
  const students = getStudents();
  studentIds.forEach(id => {
    const index = students.findIndex(s => s.id === id);
    if (index !== -1) {
      students[index].status = 'graduated';
    }
  });
  setItems(KEYS.students, students);
  logAction('تخريج طلاب', 'student', undefined, `${studentIds.length} طالب`);
}

// Groups
export function getGroups(): Group[] {
  return getItems<Group>(KEYS.groups);
}

export function addGroup(group: Omit<Group, 'id' | 'created_at'>): Group {
  const groups = getGroups();
  const currentYear = getCurrentAcademicYear();
  const newGroup: Group = {
    ...group,
    academic_year_id: group.academic_year_id || currentYear?.id || '',
    id: generateId(),
    created_at: new Date().toISOString(),
  };
  groups.push(newGroup);
  setItems(KEYS.groups, groups);
  logAction('إنشاء مجموعة', 'group', newGroup.id, newGroup.name);
  return newGroup;
}

export function updateGroup(id: string, updates: Partial<Group>): void {
  const groups = getGroups();
  const index = groups.findIndex(g => g.id === id);
  if (index !== -1) {
    groups[index] = { ...groups[index], ...updates };
    setItems(KEYS.groups, groups);
    logAction('تعديل مجموعة', 'group', id, groups[index].name);
  }
}

export function deleteGroup(id: string): void {
  const group = getGroups().find(g => g.id === id);
  const groups = getGroups().filter(g => g.id !== id);
  setItems(KEYS.groups, groups);
  logAction('حذف مجموعة', 'group', id, group?.name);
}

// Attendance
export function getAttendance(): Attendance[] {
  return getItems<Attendance>(KEYS.attendance);
}

export function addAttendance(record: Omit<Attendance, 'id'>): Attendance {
  const records = getAttendance();
  const existing = records.find(
    r => r.student_id === record.student_id && r.date === record.date && r.group_id === record.group_id
  );
  if (existing) {
    existing.status = record.status;
    existing.recorded_at = new Date().toISOString();
    setItems(KEYS.attendance, records);
    return existing;
  }
  const newRecord: Attendance = { 
    ...record, 
    id: generateId(),
    recorded_at: new Date().toISOString(),
  };
  records.push(newRecord);
  setItems(KEYS.attendance, records);
  return newRecord;
}

export function removeAttendance(studentId: string, groupId: string, date: string): void {
  const records = getAttendance().filter(
    r => !(r.student_id === studentId && r.group_id === groupId && r.date === date)
  );
  setItems(KEYS.attendance, records);
}

export function recordQRAttendance(studentId: string, groupId: string): { success: boolean; message: string } {
  const today = new Date().toISOString().split('T')[0];
  const records = getAttendance();
  const existing = records.find(r => r.student_id === studentId && r.date === today && r.group_id === groupId);
  
  if (existing) {
    return { success: false, message: 'تم تسجيل الحضور مسبقاً اليوم' };
  }
  
  const user = getCurrentUser();
  addAttendance({
    student_id: studentId,
    group_id: groupId,
    date: today,
    status: 'present',
    recorded_by: user?.id,
  });
  
  return { success: true, message: 'تم تسجيل الحضور بنجاح' };
}

export function getAttendanceByDate(date: string): Attendance[] {
  return getAttendance().filter(a => a.date === date);
}

export function getAttendanceByStudent(studentId: string): Attendance[] {
  return getAttendance().filter(a => a.student_id === studentId);
}

// Payments
export function getPayments(): Payment[] {
  return getItems<Payment>(KEYS.payments);
}

export function addPayment(payment: Omit<Payment, 'id'>): Payment {
  const payments = getPayments();
  const existing = payments.find(
    p => p.student_id === payment.student_id && p.group_id === payment.group_id && p.month === payment.month
  );
  if (existing) return existing;

  const newPayment: Payment = { ...payment, id: generateId() };
  payments.push(newPayment);
  setItems(KEYS.payments, payments);
  
  updateSubscription(payment.student_id, payment.month, 'paid', newPayment.id);
  
  const student = getStudentById(payment.student_id);
  logAction('تسجيل دفعة', 'payment', newPayment.id, `${student?.name}: ${payment.amount} ج.م`);
  return newPayment;
}

export function deletePayment(id: string): void {
  const payment = getPayments().find(p => p.id === id);
  const payments = getPayments().filter(p => p.id !== id);
  setItems(KEYS.payments, payments);
  
  if (payment) {
    updateSubscription(payment.student_id, payment.month, 'pending');
    logAction('حذف دفعة', 'payment', id, `${payment.amount} ج.م`);
  }
}

export function getPaymentsByStudent(studentId: string): Payment[] {
  return getPayments().filter(p => p.student_id === studentId);
}

export function getPaymentsByTeacher(teacherId: string): Payment[] {
  return getPayments().filter(p => p.teacher_id === teacherId);
}

// Exams
export function getExams(): Exam[] {
  return getItems<Exam>(KEYS.exams);
}

export function addExam(exam: Omit<Exam, 'id'>): Exam {
  const exams = getExams();
  const newExam: Exam = { ...exam, id: generateId() };
  exams.push(newExam);
  setItems(KEYS.exams, exams);
  logAction('إنشاء امتحان', 'exam', newExam.id, newExam.title);
  return newExam;
}

export function deleteExam(id: string): void {
  const exam = getExams().find(e => e.id === id);
  const exams = getExams().filter(e => e.id !== id);
  setItems(KEYS.exams, exams);
  const results = getExamResults().filter(r => r.exam_id !== id);
  setItems(KEYS.examResults, results);
  logAction('حذف امتحان', 'exam', id, exam?.title);
}

// Exam Results
export function getExamResults(): ExamResult[] {
  return getItems<ExamResult>(KEYS.examResults);
}

export function addExamResult(result: Omit<ExamResult, 'id'>): ExamResult {
  const results = getExamResults();
  const existing = results.find(r => r.exam_id === result.exam_id && r.student_id === result.student_id);
  if (existing) {
    existing.score = result.score;
    setItems(KEYS.examResults, results);
    return existing;
  }
  const newResult: ExamResult = { ...result, id: generateId() };
  results.push(newResult);
  setItems(KEYS.examResults, results);
  return newResult;
}

export function getResultsByExam(examId: string): ExamResult[] {
  return getExamResults().filter(r => r.exam_id === examId);
}

// Messages
export function getMessages(): Message[] {
  return getItems<Message>(KEYS.messages);
}

export function addMessage(message: Omit<Message, 'id'>): Message {
  const messages = getMessages();
  const newMessage: Message = { ...message, id: generateId() };
  messages.push(newMessage);
  setItems(KEYS.messages, messages);
  return newMessage;
}

// Users
export function getUsers(): User[] {
  const users = getItems<User>(KEYS.users);
  return users;
}

export function addUser(user: Omit<User, 'id' | 'created_at'>): User {
  const users = getUsers();
  const newUser: User = { ...user, id: generateId(), created_at: new Date().toISOString() };
  users.push(newUser);
  setItems(KEYS.users, users);
  logAction('إضافة مستخدم', 'user', newUser.id, newUser.name);
  return newUser;
}

export function updateUser(id: string, updates: Partial<User>): void {
  const users = getUsers();
  const index = users.findIndex(u => u.id === id);
  if (index !== -1) {
    users[index] = { ...users[index], ...updates };
    setItems(KEYS.users, users);
    logAction('تعديل مستخدم', 'user', id, users[index].name);
  }
}

export function deleteUser(id: string): void {
  const user = getUsers().find(u => u.id === id);
  const users = getUsers().filter(u => u.id !== id);
  setItems(KEYS.users, users);
  logAction('حذف مستخدم', 'user', id, user?.name);
}

export function getCurrentUser(): User | null {
  if (currentUserCache) return currentUserCache;
  if (isSupabaseConfigured) return null;

  try {
    const data = localStorage.getItem(KEYS.currentUser);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function setCurrentUser(user: User | null): void {
  currentUserCache = user;
  if (isSupabaseConfigured) return;

  if (user) {
    localStorage.setItem(KEYS.currentUser, JSON.stringify(user));
  } else {
    localStorage.removeItem(KEYS.currentUser);
  }
}

export function login(username: string, password: string): User | null {
  if (isSupabaseConfigured) return null;

  const users = getUsers();
  const user = users.find(u => u.username === username && u.password === password && u.is_active);
  if (user) {
    setCurrentUser(user);
    logAction('تسجيل دخول', 'auth', user.id, user.name);
    return user;
  }
  return null;
}

// Notifications
export function getNotifications(): Notification[] {
  const notifications: Notification[] = [];
  const students = getStudents().filter(s => s.status === 'active');
  const payments = getPayments();
  const attendance = getAttendance();
  const exams = getExams();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

  // Unpaid students
  const monthPayments = payments.filter(p => p.month === currentMonth);
  const paidIds = new Set(monthPayments.map(p => p.student_id));
  const unpaidCount = students.filter(s => !paidIds.has(s.id)).length;
  if (unpaidCount > 0) {
    notifications.push({
      id: 'unpaid',
      type: 'warning',
      title: 'متأخرين عن السداد',
      message: `${unpaidCount} طالب لم يسددوا قسط هذا الشهر`,
      link: 'payments',
    });
  }

  // Students absent 3+ times
  const recentAttendance = attendance.filter(a => a.date >= thirtyDaysAgo);
  const absentCounts: Record<string, number> = {};
  recentAttendance.filter(a => a.status === 'absent').forEach(a => {
    absentCounts[a.student_id] = (absentCounts[a.student_id] || 0) + 1;
  });
  const frequentlyAbsent = Object.entries(absentCounts).filter(([, count]) => count >= 3);
  if (frequentlyAbsent.length > 0) {
    notifications.push({
      id: 'absent',
      type: 'danger',
      title: 'غياب متكرر',
      message: `${frequentlyAbsent.length} طالب غابوا 3 مرات أو أكثر`,
      link: 'attendance',
    });
  }

  // Exams tomorrow
  const tomorrowExams = exams.filter(e => e.date === tomorrow);
  if (tomorrowExams.length > 0) {
    notifications.push({
      id: 'exam',
      type: 'info',
      title: 'امتحان غداً',
      message: tomorrowExams.map(e => e.title).join('، '),
      link: 'exams',
    });
  }

  // Teachers with pending payments
  const teachers = getTeachers();
  const pendingTeachers = teachers.filter(t => {
    const stats = getTeacherStats(t.id, currentMonth);
    return stats.remaining > 0;
  });
  if (pendingTeachers.length > 0) {
    notifications.push({
      id: 'teacher-payments',
      type: 'info',
      title: 'مستحقات مدرسين',
      message: `${pendingTeachers.length} مدرس لديهم مستحقات هذا الشهر`,
      link: 'teacher-payments',
    });
  }

  return notifications;
}

// Global Search
export function globalSearch(query: string): { type: string; id: string; name: string; subtitle: string }[] {
  if (!query || query.length < 2) return [];
  const results: { type: string; id: string; name: string; subtitle: string }[] = [];
  const q = query.toLowerCase();

  getStudents().filter(s => s.name.toLowerCase().includes(q) || s.phone.includes(q) || s.parent_phone.includes(q))
    .slice(0, 5)
    .forEach(s => results.push({ type: 'student', id: s.id, name: s.name, subtitle: `طالب - ${s.phone}` }));

  getGroups().filter(g => g.name.toLowerCase().includes(q))
    .slice(0, 3)
    .forEach(g => results.push({ type: 'group', id: g.id, name: g.name, subtitle: `مجموعة - ${g.teacher}` }));

  getTeachers().filter(t => t.name.toLowerCase().includes(q) || t.phone.includes(q))
    .slice(0, 3)
    .forEach(t => results.push({ type: 'teacher', id: t.id, name: t.name, subtitle: `مدرس - ${t.specialization}` }));

  getUsers().filter(u => u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q))
    .slice(0, 3)
    .forEach(u => results.push({ type: 'user', id: u.id, name: u.name, subtitle: `مستخدم - ${u.role}` }));

  return results;
}

// Backup
export function exportAllData(): string {
  const data = {
    students: getStudents(),
    groups: getGroups(),
    attendance: getAttendance(),
    payments: getPayments(),
    exams: getExams(),
    examResults: getExamResults(),
    messages: getMessages(),
    users: getUsers(),
    teachers: getTeachers(),
    expenses: getExpenses(),
    subscriptions: getSubscriptions(),
    auditLogs: getAuditLogs(),
    academicYears: getAcademicYears(),
    teacherPayments: getTeacherPayments(),
    enrollments: getEnrollments(),
    exportDate: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
}

export function importAllData(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);
    if (data.students) setItems(KEYS.students, data.students);
    if (data.groups) setItems(KEYS.groups, data.groups);
    if (data.attendance) setItems(KEYS.attendance, data.attendance);
    if (data.payments) setItems(KEYS.payments, data.payments);
    if (data.exams) setItems(KEYS.exams, data.exams);
    if (data.examResults) setItems(KEYS.examResults, data.examResults);
    if (data.messages) setItems(KEYS.messages, data.messages);
    if (data.users) setItems(KEYS.users, data.users);
    if (data.teachers) setItems(KEYS.teachers, data.teachers);
    if (data.expenses) setItems(KEYS.expenses, data.expenses);
    if (data.subscriptions) setItems(KEYS.subscriptions, data.subscriptions);
    if (data.auditLogs) setItems(KEYS.auditLogs, data.auditLogs);
    if (data.academicYears) setItems(KEYS.academicYears, data.academicYears);
    if (data.teacherPayments) setItems(KEYS.teacherPayments, data.teacherPayments);
    if (data.enrollments) setItems(KEYS.enrollments, data.enrollments);
    return true;
  } catch {
    return false;
  }
}
