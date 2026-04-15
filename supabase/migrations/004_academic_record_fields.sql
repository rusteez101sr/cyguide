-- Add transcript metadata and course-status fields for academic planning uploads
alter table students
  add column if not exists transcript_summary text,
  add column if not exists transcript_uploaded_at timestamptz,
  add column if not exists transcript_file_name text,
  add column if not exists schedule_summary text,
  add column if not exists schedule_uploaded_at timestamptz,
  add column if not exists schedule_file_name text;

alter table student_courses
  add column if not exists status text default 'manual',
  add column if not exists source text default 'manual';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'student_courses_status_check'
  ) then
    alter table student_courses
      add constraint student_courses_status_check
      check (status in ('completed', 'current', 'next', 'planned', 'manual'));
  end if;
end $$;
