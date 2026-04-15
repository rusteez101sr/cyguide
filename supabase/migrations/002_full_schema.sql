-- ============================================================
-- CyGuide Full Schema Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable pgvector for RAG embeddings
create extension if not exists vector;

-- ============================================================
-- Students (extends profiles — full student record)
-- ============================================================
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique,
  name text,
  net_id text,
  major text,
  class_year text,  -- Freshman, Sophomore, Junior, Senior
  advisor_name text,
  advisor_email text,
  advisor_phone text,
  advisor_office text,
  on_campus boolean default false,
  meal_plan text default 'None',  -- None, Cyclone, Cardinal, Gold
  gpa text,
  interests text,
  internships text,
  research text,
  transcript_summary text,
  transcript_uploaded_at timestamptz,
  transcript_file_name text,
  schedule_summary text,
  schedule_uploaded_at timestamptz,
  schedule_file_name text,
  canvas_ical_url text,
  onboarding_complete boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.students enable row level security;
create policy "Students can view own record" on public.students for select using (auth.uid() = user_id);
create policy "Students can insert own record" on public.students for insert with check (auth.uid() = user_id);
create policy "Students can update own record" on public.students for update using (auth.uid() = user_id);

-- ============================================================
-- Student Courses
-- ============================================================
create table if not exists public.student_courses (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id) on delete cascade,
  course_code text,
  course_name text,
  professor_name text,
  professor_email text,
  professor_office text,
  professor_office_hours text,
  credits integer default 3,
  semester text default 'Spring 2026',
  grade text,
  status text default 'manual' check (status in ('completed', 'current', 'next', 'planned', 'manual')),
  source text default 'manual',
  created_at timestamptz default now()
);

alter table public.student_courses enable row level security;
create policy "Students can view own courses" on public.student_courses for select
  using (student_id in (select id from public.students where user_id = auth.uid()));
create policy "Students can insert own courses" on public.student_courses for insert
  with check (student_id in (select id from public.students where user_id = auth.uid()));
create policy "Students can update own courses" on public.student_courses for update
  using (student_id in (select id from public.students where user_id = auth.uid()));
create policy "Students can delete own courses" on public.student_courses for delete
  using (student_id in (select id from public.students where user_id = auth.uid()));

-- ============================================================
-- Chat Messages (persistent history)
-- ============================================================
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  intent text,
  model_used text,
  created_at timestamptz default now()
);

alter table public.chat_messages enable row level security;
create policy "Students can view own messages" on public.chat_messages for select
  using (student_id in (select id from public.students where user_id = auth.uid()));
create policy "Students can insert own messages" on public.chat_messages for insert
  with check (student_id in (select id from public.students where user_id = auth.uid()));

-- ============================================================
-- Calendar Events
-- ============================================================
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id) on delete cascade,
  title text not null,
  description text,
  event_type text default 'assignment' check (event_type in ('assignment', 'exam', 'deadline', 'event', 'project')),
  course_code text,
  due_date timestamptz,
  source text default 'manual' check (source in ('syllabus', 'manual', 'isu_academic_calendar', 'canvas')),
  created_at timestamptz default now()
);

alter table public.calendar_events enable row level security;
create policy "Students can view own events" on public.calendar_events for select
  using (student_id in (select id from public.students where user_id = auth.uid()));
create policy "Students can insert own events" on public.calendar_events for insert
  with check (student_id in (select id from public.students where user_id = auth.uid()));
create policy "Students can update own events" on public.calendar_events for update
  using (student_id in (select id from public.students where user_id = auth.uid()));
create policy "Students can delete own events" on public.calendar_events for delete
  using (student_id in (select id from public.students where user_id = auth.uid()));

-- ============================================================
-- Campus Events (pre-seeded, readable by all authenticated users)
-- ============================================================
create table if not exists public.campus_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  location text,
  event_date timestamptz,
  category text,  -- Academic, Social, Career, Sports, Cultural
  url text,
  created_at timestamptz default now()
);

alter table public.campus_events enable row level security;
create policy "Authenticated users can view campus events" on public.campus_events
  for select using (auth.role() = 'authenticated');

-- ============================================================
-- Canvas Courses (mock Canvas data)
-- ============================================================
create table if not exists public.canvas_courses (
  id uuid primary key default gen_random_uuid(),
  course_code text unique,
  course_name text,
  major text,
  class_year text,
  credits integer default 3,
  prerequisites text[],
  professor_name text,
  professor_email text,
  professor_office text,
  professor_office_hours text,
  description text
);

alter table public.canvas_courses enable row level security;
create policy "Authenticated users can view canvas courses" on public.canvas_courses
  for select using (auth.role() = 'authenticated');

-- ============================================================
-- Dining Menus
-- ============================================================
create table if not exists public.dining_menus (
  id uuid primary key default gen_random_uuid(),
  dining_hall text not null,
  meal_period text check (meal_period in ('breakfast', 'lunch', 'dinner')),
  menu_date date,
  items text[],
  hours text
);

alter table public.dining_menus enable row level security;
create policy "Authenticated users can view dining menus" on public.dining_menus
  for select using (auth.role() = 'authenticated');

-- ============================================================
-- ISU Documents (RAG source chunks with pgvector)
-- ============================================================
create table if not exists public.isu_documents (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  embedding vector(1536),
  source_document text,
  section text,
  page_number integer,
  created_at timestamptz default now()
);

alter table public.isu_documents enable row level security;
create policy "Authenticated users can view ISU documents" on public.isu_documents
  for select using (auth.role() = 'authenticated');

-- Index for fast similarity search
create index if not exists isu_documents_embedding_idx
  on public.isu_documents using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- ============================================================
-- ISU Academic Calendar (pre-seeded, global)
-- ============================================================
create table if not exists public.isu_academic_calendar (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date,
  end_date date,
  category text,
  description text
);

alter table public.isu_academic_calendar enable row level security;
create policy "All authenticated users can view academic calendar" on public.isu_academic_calendar
  for select using (auth.role() = 'authenticated');

-- Seed ISU Spring 2026 Academic Calendar
insert into public.isu_academic_calendar (title, event_date, end_date, category, description) values
  ('Spring Semester Begins', '2026-01-12', null, 'semester', 'First day of Spring 2026 classes'),
  ('Last Day to Add Classes', '2026-01-23', null, 'deadline', 'Last day to add a course without instructor permission'),
  ('Last Day to Drop Without W', '2026-02-06', null, 'deadline', 'Last day to drop a course without a W grade on transcript'),
  ('Spring Break', '2026-03-16', '2026-03-20', 'break', 'No classes — Spring Break'),
  ('Last Day to Withdraw from University', '2026-04-03', null, 'deadline', 'Last day to withdraw from all courses'),
  ('Last Day of Classes', '2026-05-01', null, 'semester', 'Last day of regular Spring 2026 classes'),
  ('Finals Week Begins', '2026-05-04', null, 'exams', 'Spring 2026 final examinations begin'),
  ('Finals Week Ends', '2026-05-08', null, 'exams', 'Spring 2026 final examinations end'),
  ('Commencement', '2026-05-09', null, 'graduation', 'Spring 2026 Commencement Ceremonies'),
  ('Summer Session I Begins', '2026-05-18', null, 'semester', 'First day of Summer Session I'),
  ('Fall 2026 Registration Opens', '2026-04-06', null, 'deadline', 'Priority registration for Fall 2026 opens'),
  ('FAFSA Priority Deadline', '2026-03-01', null, 'financial', 'Priority FAFSA filing deadline for maximum aid consideration')
on conflict do nothing;
