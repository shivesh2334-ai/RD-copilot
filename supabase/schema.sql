-- Run this in the Supabase SQL editor for a new project.

create extension if not exists "uuid-ossp";

create table if not exists patients (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  age int not null,
  sex text not null check (sex in ('male', 'female', 'other')),
  mobile text,
  email text,
  created_by text,
  created_at timestamptz not null default now()
);

create table if not exists consults (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references patients(id) on delete cascade,
  notes text default '',
  plan_treatment text default '',
  plan_investigation text default '',
  plan_comments text default '',
  ai_summary text,
  ai_raw_response text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ai_feedback (
  id uuid primary key default uuid_generate_v4(),
  source text not null check (source in ('consult_ai', 'ask_ai')),
  vote text not null check (vote in ('up', 'down')),
  prompt text not null,
  ai_output text not null,
  patient_id uuid references patients(id) on delete set null,
  consult_id uuid references consults(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists consults_patient_id_idx on consults(patient_id);
create index if not exists ai_feedback_source_idx on ai_feedback(source);

-- Row Level Security: enable and open up for the anon key during development.
-- Tighten these policies before handling real patient data in production
-- (e.g. scope by authenticated resident, add Supabase Auth).
alter table patients enable row level security;
alter table consults enable row level security;
alter table ai_feedback enable row level security;

create policy "dev_all_patients" on patients for all using (true) with check (true);
create policy "dev_all_consults" on consults for all using (true) with check (true);
create policy "dev_all_feedback" on ai_feedback for all using (true) with check (true);
