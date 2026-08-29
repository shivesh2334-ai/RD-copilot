-- Supabase Free plan schema for Rounds.
-- Enable Authentication -> Providers -> Anonymous Sign-Ins before using the app.

create extension if not exists "uuid-ossp";

create table if not exists patients (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  age int not null check (age between 0 and 130),
  sex text not null check (sex in ('male', 'female', 'other')),
  mobile text,
  email text,
  ward text,
  admission_date date,
  status text not null default 'admitted' check (status in ('admitted', 'discharged')),
  notes text,
  created_by text,
  created_at timestamptz not null default now()
);

create table if not exists consults (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
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
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  source text not null check (source in ('consult_ai', 'ask_ai')),
  vote text not null check (vote in ('up', 'down')),
  prompt text not null,
  ai_output text not null,
  patient_id uuid references patients(id) on delete set null,
  consult_id uuid references consults(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists patients_owner_id_idx on patients(owner_id);
create index if not exists consults_owner_id_idx on consults(owner_id);
create index if not exists consults_patient_id_idx on consults(patient_id);
create index if not exists ai_feedback_owner_id_idx on ai_feedback(owner_id);
create index if not exists ai_feedback_source_idx on ai_feedback(source);

alter table patients enable row level security;
alter table consults enable row level security;
alter table ai_feedback enable row level security;

-- Remove the original prototype policies, if this is an upgrade.
drop policy if exists "dev_all_patients" on patients;
drop policy if exists "dev_all_consults" on consults;
drop policy if exists "dev_all_feedback" on ai_feedback;

drop policy if exists "owners_manage_patients" on patients;
create policy "owners_manage_patients" on patients
  for all to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "owners_manage_consults" on consults;
create policy "owners_manage_consults" on consults
  for all to authenticated using (auth.uid() = owner_id) with check (
    auth.uid() = owner_id and exists (
      select 1 from patients where patients.id = patient_id and patients.owner_id = auth.uid()
    )
  );

drop policy if exists "owners_manage_feedback" on ai_feedback;
create policy "owners_manage_feedback" on ai_feedback
  for all to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
