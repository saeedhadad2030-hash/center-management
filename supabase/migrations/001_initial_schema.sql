create extension if not exists "pgcrypto";

create type public.user_role as enum ('admin', 'employee', 'teacher');
create type public.student_status as enum ('active', 'graduated', 'archived');
create type public.attendance_status as enum ('present', 'absent', 'late');
create type public.subscription_status as enum ('paid', 'pending', 'overdue');
create type public.expense_category as enum (
  'salary',
  'rent',
  'electricity',
  'water',
  'marketing',
  'supplies',
  'teacher_payment',
  'other'
);
create type public.message_type as enum ('absence', 'payment', 'general');
create type public.notification_type as enum ('warning', 'info', 'danger', 'success');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role public.user_role not null default 'employee',
  teacher_id uuid,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.academic_years (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.teachers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null default '',
  specialization text not null default '',
  salary numeric(12,2) not null default 0,
  commission numeric(5,2) not null default 0 check (commission >= 0 and commission <= 100),
  user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_teacher_id_fkey foreign key (teacher_id) references public.teachers(id) on delete set null;

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  teacher text not null default '',
  schedule text not null default '',
  days text[] not null default '{}',
  time text not null default '',
  max_students integer not null default 25 check (max_students > 0),
  fees numeric(12,2) not null default 0 check (fees >= 0),
  academic_year_id uuid references public.academic_years(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null default '',
  parent_phone text not null default '',
  grade text not null default '',
  group_id uuid references public.groups(id) on delete set null,
  notes text not null default '',
  photo text not null default '',
  academic_year_id uuid references public.academic_years(id) on delete set null,
  status public.student_status not null default 'active',
  created_at timestamptz not null default now()
);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  unique (student_id, group_id)
);

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  date date not null,
  status public.attendance_status not null,
  recorded_by uuid references public.profiles(id) on delete set null,
  recorded_at timestamptz not null default now(),
  unique (student_id, group_id, date)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete restrict,
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  payment_date date not null,
  month text not null,
  notes text not null default '',
  unique (student_id, group_id, month)
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  month text not null,
  status public.subscription_status not null default 'pending',
  amount numeric(12,2) not null default 0,
  payment_id uuid references public.payments(id) on delete set null,
  due_date date not null,
  unique (student_id, group_id, month)
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  category public.expense_category not null default 'other',
  description text not null default '',
  amount numeric(12,2) not null check (amount >= 0),
  date date not null,
  notes text not null default '',
  teacher_id uuid references public.teachers(id) on delete set null
);

create table public.teacher_payments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  month text not null,
  payment_date date not null,
  notes text not null default ''
);

create table public.exams (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  group_id uuid not null references public.groups(id) on delete cascade,
  date date not null,
  total_score numeric(10,2) not null check (total_score > 0)
);

create table public.exam_results (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  score numeric(10,2) not null check (score >= 0),
  unique (exam_id, student_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  type public.message_type not null default 'general',
  content text not null,
  date timestamptz not null default now(),
  sent boolean not null default false
);

create table public.settings (
  id integer primary key default 1 check (id = 1),
  hidden_teachers uuid[] not null default '{}',
  hidden_groups uuid[] not null default '{}',
  center_name text,
  center_phone text,
  center_address text,
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  user_name text not null default '',
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details text,
  timestamp timestamptz not null default now()
);

insert into public.settings (id) values (1) on conflict (id) do nothing;

create index idx_students_group_id on public.students(group_id);
create index idx_students_status on public.students(status);
create index idx_enrollments_student_group on public.enrollments(student_id, group_id);
create index idx_attendance_date_group on public.attendance(date, group_id);
create index idx_payments_month_group on public.payments(month, group_id);
create index idx_groups_teacher_id on public.groups(teacher_id);

create or replace function public.current_role()
returns public.user_role
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid() and is_active = true
$$;

create or replace function public.current_teacher_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select teacher_id from public.profiles where id = auth.uid() and is_active = true
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_role() = 'admin'
$$;

create or replace function public.is_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_role() in ('admin', 'employee')
$$;

create or replace function public.teacher_can_access_group(group_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.groups g
    where g.id = group_uuid
      and g.teacher_id = public.current_teacher_id()
  )
$$;

create or replace function public.teacher_can_access_student(student_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.students s
    where s.id = student_uuid
      and public.teacher_can_access_group(s.group_id)
  ) or exists (
    select 1
    from public.enrollments e
    where e.student_id = student_uuid
      and public.teacher_can_access_group(e.group_id)
  )
$$;

alter table public.profiles enable row level security;
alter table public.academic_years enable row level security;
alter table public.teachers enable row level security;
alter table public.groups enable row level security;
alter table public.students enable row level security;
alter table public.enrollments enable row level security;
alter table public.attendance enable row level security;
alter table public.payments enable row level security;
alter table public.subscriptions enable row level security;
alter table public.expenses enable row level security;
alter table public.teacher_payments enable row level security;
alter table public.exams enable row level security;
alter table public.exam_results enable row level security;
alter table public.messages enable row level security;
alter table public.settings enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles select own or admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profiles admin write" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

create policy "academic years staff all" on public.academic_years
  for all using (public.is_staff()) with check (public.is_staff());
create policy "academic years teacher read" on public.academic_years
  for select using (public.current_role() = 'teacher');

create policy "teachers staff all" on public.teachers
  for all using (public.is_staff()) with check (public.is_staff());
create policy "teachers own read" on public.teachers
  for select using (id = public.current_teacher_id());

create policy "groups staff all" on public.groups
  for all using (public.is_staff()) with check (public.is_staff());
create policy "groups teacher read own" on public.groups
  for select using (teacher_id = public.current_teacher_id());

create policy "students staff all" on public.students
  for all using (public.is_staff()) with check (public.is_staff());
create policy "students teacher read own" on public.students
  for select using (public.teacher_can_access_student(id));
create policy "students teacher insert own group" on public.students
  for insert with check (public.current_role() = 'teacher' and public.teacher_can_access_group(group_id));
create policy "students teacher update own" on public.students
  for update using (public.teacher_can_access_student(id)) with check (public.teacher_can_access_student(id));

create policy "enrollments staff all" on public.enrollments
  for all using (public.is_staff()) with check (public.is_staff());
create policy "enrollments teacher read own" on public.enrollments
  for select using (public.teacher_can_access_group(group_id));
create policy "enrollments teacher insert own" on public.enrollments
  for insert with check (public.current_role() = 'teacher' and public.teacher_can_access_group(group_id));

create policy "attendance staff all" on public.attendance
  for all using (public.is_staff()) with check (public.is_staff());
create policy "attendance teacher read own" on public.attendance
  for select using (public.teacher_can_access_group(group_id));
create policy "attendance teacher insert own" on public.attendance
  for insert with check (public.current_role() = 'teacher' and public.teacher_can_access_group(group_id));
create policy "attendance teacher update own" on public.attendance
  for update using (public.teacher_can_access_group(group_id)) with check (public.teacher_can_access_group(group_id));

create policy "payments staff all" on public.payments
  for all using (public.is_staff()) with check (public.is_staff());
create policy "payments teacher read own" on public.payments
  for select using (teacher_id = public.current_teacher_id() or public.teacher_can_access_group(group_id));
create policy "payments teacher insert own" on public.payments
  for insert with check (public.current_role() = 'teacher' and public.teacher_can_access_group(group_id));

create policy "subscriptions staff all" on public.subscriptions
  for all using (public.is_staff()) with check (public.is_staff());
create policy "subscriptions teacher read own" on public.subscriptions
  for select using (group_id is not null and public.teacher_can_access_group(group_id));

create policy "expenses admin all" on public.expenses
  for all using (public.is_admin()) with check (public.is_admin());

create policy "teacher payments admin all" on public.teacher_payments
  for all using (public.is_admin()) with check (public.is_admin());
create policy "teacher payments own read" on public.teacher_payments
  for select using (teacher_id = public.current_teacher_id());

create policy "exams staff all" on public.exams
  for all using (public.is_staff()) with check (public.is_staff());
create policy "exams teacher all own" on public.exams
  for all using (public.teacher_can_access_group(group_id)) with check (public.teacher_can_access_group(group_id));

create policy "exam results staff all" on public.exam_results
  for all using (public.is_staff()) with check (public.is_staff());
create policy "exam results teacher all own" on public.exam_results
  for all using (
    exists (select 1 from public.exams e where e.id = exam_id and public.teacher_can_access_group(e.group_id))
  ) with check (
    exists (select 1 from public.exams e where e.id = exam_id and public.teacher_can_access_group(e.group_id))
  );

create policy "messages staff all" on public.messages
  for all using (public.is_staff()) with check (public.is_staff());
create policy "messages teacher read own" on public.messages
  for select using (public.teacher_can_access_student(student_id));

create policy "settings admin all" on public.settings
  for all using (public.is_admin()) with check (public.is_admin());
create policy "settings authenticated read" on public.settings
  for select using (auth.uid() is not null);

create policy "audit logs admin read" on public.audit_logs
  for select using (public.is_admin());
create policy "audit logs authenticated insert" on public.audit_logs
  for insert with check (auth.uid() is not null);
