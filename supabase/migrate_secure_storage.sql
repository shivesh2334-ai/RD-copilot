-- Run once only when upgrading a database created from the original prototype schema.
-- Existing prototype rows cannot be safely assigned to an anonymous browser and are left
-- unowned. Export them first if they contain anything you need to retain.

alter table patients add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table consults add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table ai_feedback add column if not exists owner_id uuid references auth.users(id) on delete cascade;

alter table patients alter column owner_id set default auth.uid();
alter table consults alter column owner_id set default auth.uid();
alter table ai_feedback alter column owner_id set default auth.uid();

create index if not exists patients_owner_id_idx on patients(owner_id);
create index if not exists consults_owner_id_idx on consults(owner_id);
create index if not exists ai_feedback_owner_id_idx on ai_feedback(owner_id);

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
