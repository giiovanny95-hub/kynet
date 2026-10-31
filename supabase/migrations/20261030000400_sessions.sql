-- KYNET 0004: sesiones y resúmenes por repetición (nunca landmarks ni vídeo). Escritura solo por la RPC sync_session.
create table public.workout_sessions (
  id uuid primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  exercise_id smallint not null references public.exercises (id),
  started_at timestamptz not null,
  ended_at timestamptz not null,
  tz text not null,
  local_date date not null,
  status text not null check (status in ('completed', 'abandoned')),
  active_seconds int not null check (active_seconds between 0 and 14400),
  reps_total smallint not null check (reps_total between 0 and 1000),
  reps_valid smallint not null check (reps_valid between 0 and 1000),
  avg_form_score smallint not null check (avg_form_score between 0 and 100),
  counts_for_streak boolean not null default true,
  algo_version smallint not null default 1,
  app_version text,
  received_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (ended_at >= started_at),
  check (reps_valid <= reps_total)
);
create index workout_sessions_user_day on public.workout_sessions (user_id, local_date);
create index workout_sessions_user_started on public.workout_sessions (user_id, started_at desc);

create table public.rep_summaries (
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  rep_index smallint not null check (rep_index >= 0),
  user_id uuid not null references public.profiles (id) on delete cascade,
  t_start_ms int not null check (t_start_ms >= 0),
  duration_ms int not null check (duration_ms >= 0),
  form_score smallint not null check (form_score between 0 and 100),
  valid boolean not null,
  fault_codes text[] not null default '{}',
  primary key (session_id, rep_index)
);

create trigger workout_sessions_updated before update on public.workout_sessions
  for each row execute function app_private.set_updated_at();

alter table public.workout_sessions enable row level security;
alter table public.rep_summaries enable row level security;
create policy sessions_select on public.workout_sessions for select to authenticated
  using (user_id = (select auth.uid()) and deleted_at is null);
create policy reps_select on public.rep_summaries for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.workout_sessions, public.rep_summaries from anon, authenticated;
grant select on public.workout_sessions, public.rep_summaries to authenticated;
