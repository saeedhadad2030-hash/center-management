# Student Management System

React + Vite app for managing students, groups, attendance, payments, exams, and reports.

## Local Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Fill `.env` with your Supabase project values:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Supabase Setup

1. Create a Supabase project.
2. Open SQL Editor.
3. Run `supabase/migrations/001_initial_schema.sql`.
4. Create users from Authentication.
5. Insert matching rows into `profiles`:

```sql
insert into public.profiles (id, name, role, teacher_id, is_active)
values ('auth-user-id', 'Admin', 'admin', null, true);
```

For teacher accounts, set `role = 'teacher'` and fill `teacher_id` with the teacher row id.

## Vercel

Build settings:

```txt
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
```

Add environment variables in Vercel Settings -> Environment Variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

`vercel.json` already includes the SPA redirect and API route configuration.

`SUPABASE_SERVICE_ROLE_KEY` is used only by Vercel Serverless Functions (`api/*`) for admin user management and parent portal. Never put it in frontend code and never prefix it with `VITE_`.

User management from the app uses these functions:

- `/api/users-list`
- `/api/users-create`
- `/api/users-update`
- `/api/users-delete`
- `/api/parent-portal`

## Checks

```bash
npm run typecheck
npm run build
```
