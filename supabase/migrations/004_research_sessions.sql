-- Research sessions table for Citation & Research Assistant
create table if not exists public.research_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  course_code text,
  course_name text,
  topic text not null,
  citation_style text not null,
  sources jsonb not null default '[]',
  created_at timestamptz default now()
);

alter table public.research_sessions enable row level security;
create policy "Users can view own research sessions" on public.research_sessions
  for select using (auth.uid() = user_id);
create policy "Users can insert own research sessions" on public.research_sessions
  for insert with check (auth.uid() = user_id);
