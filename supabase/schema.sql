-- Run this in your Supabase SQL editor (supabase.com → project → SQL Editor)

create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  canvas_token text,
  canvas_url text default 'https://canvas.iastate.edu',
  major text,
  year text,
  created_at timestamptz default now()
);

-- Allow users to read and write only their own profile
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can upsert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);
