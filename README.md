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

## Netlify

Build settings:

```txt
Build command: npm run build
Publish directory: dist
```

Add environment variables in Netlify:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

`netlify.toml` already includes the SPA redirect.

`SUPABASE_SERVICE_ROLE_KEY` is used only by Netlify Functions for admin user management. Never put it in frontend code and never prefix it with `VITE_`.

User management from the app uses these functions:

- `/.netlify/functions/users-list`
- `/.netlify/functions/users-create`
- `/.netlify/functions/users-update`
- `/.netlify/functions/users-delete`

For local testing of those functions, run the app through Netlify Dev or deploy to Netlify. Plain `npm run dev` starts Vite only, so `/.netlify/functions/*` will not be available.

## Checks

```bash
npm run typecheck
npm run build
```
