-- Valderrama Learning Center | Fase 1: identidad y datos mínimos
-- Aplicar en un proyecto Supabase dedicado; NO aplicar en proyectos existentes no relacionados.
-- Requiere PostgreSQL y Supabase Auth/Storage.
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 2 and 100),
  account_type text not null check (account_type in ('guardian','adult_learner','tutor')),
  created_at timestamptz not null default now()
);

create table if not exists public.staff_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  staff_role text not null check (staff_role in ('reviewer','safeguarding','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.learners (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid not null references public.user_profiles(user_id) on delete cascade,
  nickname text not null check (char_length(trim(nickname)) between 2 and 50),
  educational_stage text not null check (educational_stage in ('preschool','primary','secondary','high_school')),
  grade_label text not null check (char_length(trim(grade_label)) between 1 and 40),
  guardian_attested_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.guardian_reviews (
  learner_id uuid primary key references public.learners(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','verified','rejected','suspended')),
  reviewer_id uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.tutor_profiles (
  user_id uuid primary key references public.user_profiles(user_id) on delete cascade,
  professional_name text not null check (char_length(trim(professional_name)) between 2 and 100),
  headline text not null default '' check (char_length(headline) <= 160),
  biography text not null default '' check (char_length(biography) <= 2000),
  subjects text[] not null default '{}'::text[] check (array_length(subjects,1) <= 15),
  modes text[] not null default '{virtual}'::text[] check (modes <@ array['virtual','presencial']::text[]),
  city text not null default '' check (char_length(city) <= 100),
  photo_path text check (photo_path is null or photo_path like user_id::text || '/%'),
  submitted_at timestamptz,
  public_visible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tutor_verifications (
  tutor_id uuid primary key references public.tutor_profiles(user_id) on delete cascade,
  status text not null default 'draft'
    check (status in ('draft','in_review','approved_adults','approved_minors','rejected','suspended')),
  reviewer_id uuid references auth.users(id),
  reviewed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.tutor_credentials (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.tutor_profiles(user_id) on delete cascade,
  credential_type text not null check (credential_type in ('degree','certificate','license','other')),
  issuing_institution text not null check (char_length(trim(issuing_institution)) between 2 and 160),
  qualification text not null check (char_length(trim(qualification)) between 2 and 160),
  file_path text not null unique check (file_path like tutor_id::text || '/%'),
  created_at timestamptz not null default now()
);

create table if not exists public.credential_reviews (
  credential_id uuid primary key references public.tutor_credentials(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','verified','rejected')),
  reviewer_id uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.tutor_checks (
  tutor_id uuid not null references public.tutor_profiles(user_id) on delete cascade,
  check_type text not null check (check_type in ('identity','academic','legal_eligibility','safeguarding_training')),
  result text not null check (result in ('passed','failed')),
  reviewer_id uuid not null references auth.users(id),
  reviewed_at timestamptz not null default now(),
  primary key(tutor_id,check_type)
);

create table if not exists public.review_audit (
  id bigint generated always as identity primary key,
  reviewer_id uuid not null references auth.users(id),
  action text not null check (char_length(action) <= 80),
  target_id uuid not null,
  details jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

-- No confiar en campos de usuario para controlar funciones privilegiadas.
-- Los registros de plantilla de review solo los crean triggers (service-side).
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.on_new_tutor() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.tutor_verifications(tutor_id) values (new.user_id);
  return new;
end;
$$;
revoke all on function private.on_new_tutor() from public, anon, authenticated;
drop trigger if exists init_tutor_verification on public.tutor_profiles;
create trigger init_tutor_verification after insert on public.tutor_profiles
for each row execute function private.on_new_tutor();

create or replace function private.on_new_learner() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.guardian_reviews(learner_id) values (new.id);
  return new;
end;
$$;
revoke all on function private.on_new_learner() from public, anon, authenticated;
drop trigger if exists init_guardian_review on public.learners;
create trigger init_guardian_review after insert on public.learners
for each row execute function private.on_new_learner();

create or replace function private.on_new_credential() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.credential_reviews(credential_id) values (new.id);
  return new;
end;
$$;
revoke all on function private.on_new_credential() from public, anon, authenticated;
drop trigger if exists init_credential_review on public.tutor_credentials;
create trigger init_credential_review after insert on public.tutor_credentials
for each row execute function private.on_new_credential();

-- Nunca conceder permisos amplios de escritura a authenticated.
revoke all on public.user_profiles, public.staff_members, public.learners,
  public.guardian_reviews, public.tutor_profiles, public.tutor_verifications,
  public.tutor_credentials, public.credential_reviews, public.tutor_checks,
  public.review_audit from anon, authenticated;
grant usage on schema public to anon, authenticated;

grant select on public.user_profiles, public.staff_members, public.learners,
  public.guardian_reviews, public.tutor_profiles, public.tutor_verifications,
  public.tutor_credentials, public.credential_reviews, public.tutor_checks
  to authenticated;
grant select on public.tutor_profiles to anon;
grant insert(user_id,display_name,account_type) on public.user_profiles to authenticated;
grant update(display_name) on public.user_profiles to authenticated;
grant insert(guardian_id,nickname,educational_stage,grade_label) on public.learners to authenticated;
grant update(nickname,educational_stage,grade_label) on public.learners to authenticated;
grant insert(user_id,professional_name,headline,biography,subjects,modes,city,photo_path,submitted_at)
  on public.tutor_profiles to authenticated;
grant update(professional_name,headline,biography,subjects,modes,city,photo_path,submitted_at)
  on public.tutor_profiles to authenticated;
grant insert(tutor_id,credential_type,issuing_institution,qualification,file_path)
  on public.tutor_credentials to authenticated;

alter table public.user_profiles enable row level security;
alter table public.staff_members enable row level security;
alter table public.learners enable row level security;
alter table public.guardian_reviews enable row level security;
alter table public.tutor_profiles enable row level security;
alter table public.tutor_verifications enable row level security;
alter table public.tutor_credentials enable row level security;
alter table public.credential_reviews enable row level security;
alter table public.tutor_checks enable row level security;
alter table public.review_audit enable row level security;

create policy "user reads self" on public.user_profiles
 for select to authenticated using (user_id = (select auth.uid()));
create policy "user creates self" on public.user_profiles
 for insert to authenticated with check (user_id = (select auth.uid()));
create policy "user edits display name" on public.user_profiles
 for update to authenticated using (user_id = (select auth.uid()))
 with check (user_id = (select auth.uid()));

create policy "staff reads own membership" on public.staff_members
 for select to authenticated using (user_id = (select auth.uid()));

create policy "guardian reads own learners" on public.learners
 for select to authenticated using (guardian_id = (select auth.uid())
   or exists(select 1 from public.staff_members s where s.user_id=(select auth.uid())
   and s.staff_role in ('safeguarding','admin')));
create policy "guardian inserts own learners" on public.learners
 for insert to authenticated with check (
 guardian_id = (select auth.uid()) and
 exists (select 1 from public.user_profiles u
 where u.user_id = (select auth.uid()) and u.account_type='guardian'));
create policy "guardian edits own learners" on public.learners
 for update to authenticated using (guardian_id = (select auth.uid()))
 with check (guardian_id = (select auth.uid()));

create policy "guardian reads review of own learner" on public.guardian_reviews
 for select to authenticated using (
 exists(select 1 from public.learners l where l.id=learner_id
 and l.guardian_id=(select auth.uid())) or
 exists(select 1 from public.staff_members s where s.user_id=(select auth.uid())
 and s.staff_role in ('safeguarding','admin')));

create policy "anonymous reads approved tutors only" on public.tutor_profiles
 for select to anon using (public_visible);
create policy "authenticated reads own, approved or reviewable tutors" on public.tutor_profiles
 for select to authenticated using (
 public_visible or user_id = (select auth.uid()) or
 exists(select 1 from public.staff_members s where s.user_id=(select auth.uid())
 and s.staff_role in ('reviewer','admin')));
create policy "tutor creates own draft" on public.tutor_profiles
 for insert to authenticated with check (
 user_id=(select auth.uid()) and public_visible=false and
 exists(select 1 from public.user_profiles u
 where u.user_id=(select auth.uid()) and u.account_type='tutor'));
create policy "tutor edits unapproved draft" on public.tutor_profiles
 for update to authenticated using (
 user_id=(select auth.uid()) and
 not exists(select 1 from public.tutor_verifications v where v.tutor_id=user_id
 and v.status in ('approved_adults','approved_minors','suspended','in_review')))
 with check (
 user_id=(select auth.uid()) and public_visible=false and
 not exists(select 1 from public.tutor_verifications v where v.tutor_id=user_id
 and v.status in ('approved_adults','approved_minors','suspended','in_review')));

create policy "tutor and reviewers read status" on public.tutor_verifications
 for select to authenticated using (tutor_id=(select auth.uid()) or
 exists(select 1 from public.staff_members s where s.user_id=(select auth.uid())
 and s.staff_role in ('reviewer','admin')));

create policy "tutor and reviewers read credentials" on public.tutor_credentials
 for select to authenticated using (tutor_id=(select auth.uid()) or
 exists(select 1 from public.staff_members s where s.user_id=(select auth.uid())
 and s.staff_role in ('reviewer','admin')));
create policy "tutor inserts own credentials when editable" on public.tutor_credentials
 for insert to authenticated with check (
 tutor_id=(select auth.uid()) and
 exists(select 1 from public.tutor_profiles p where p.user_id=(select auth.uid())
 and p.public_visible=false) and
 not exists(select 1 from public.tutor_verifications v where v.tutor_id=tutor_id
 and v.status in ('approved_adults','approved_minors','suspended','in_review')));

create policy "tutor and reviewers read credential review" on public.credential_reviews
 for select to authenticated using (
 exists(select 1 from public.tutor_credentials c where c.id=credential_id
 and c.tutor_id=(select auth.uid())) or
 exists(select 1 from public.staff_members s where s.user_id=(select auth.uid())
 and s.staff_role in ('reviewer','admin')));

create policy "tutor and reviewers read checks" on public.tutor_checks
 for select to authenticated using (
 tutor_id=(select auth.uid()) or
 exists(select 1 from public.staff_members s where s.user_id=(select auth.uid())
 and s.staff_role in ('reviewer','admin')));

-- Review audit has NO policy for regular client reads or writes.
create index if not exists idx_learners_guardian on public.learners(guardian_id);
create index if not exists idx_credentials_tutor on public.tutor_credentials(tutor_id);
create index if not exists idx_tutor_visible on public.tutor_profiles(public_visible) where public_visible=true;
