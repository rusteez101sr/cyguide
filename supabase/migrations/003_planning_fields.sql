-- Add academic planning profile fields to students table
-- Safe to run even if columns already exist (e.g. if 002 was run after this update)
alter table students
  add column if not exists interests text,
  add column if not exists internships text,
  add column if not exists research text;
