-- KYNET 0007: misiones diarias y semanales (mismo catálogo, orden y FNV-1a que src/gamification/missions.ts).
create table public.mission_templates (
  code text primary key,
  sort smallint not null,
  scope text not null check (scope in ('daily', 'weekly')),
  tier text not null check (tier in ('easy', 'medium', 'quality', 'explore', 'weekly')),
  metric text not null check (metric in ('valid_reps', 'active_seconds', 'sessions', 'good_form_sessions', 'active_days', 'exercises_done')),
  exercise_code text references public.exercises (code),
  target int not null check (target > 0),
  xp_reward int not null check (xp_reward >= 0),
  active boolean not null default true
);
insert into public.mission_templates (code, sort, scope, tier, metric, exercise_code, target, xp_reward) values
  ('d_easy_squat15', 1, 'daily', 'easy', 'valid_reps', 'squat', 15, 20),
  ('d_easy_active3', 2, 'daily', 'easy', 'active_seconds', null, 180, 20),
  ('d_easy_jj20', 3, 'daily', 'easy', 'valid_reps', 'jumpingJack', 20, 20),
  ('d_med_squat25', 4, 'daily', 'medium', 'valid_reps', 'squat', 25, 30),
  ('d_med_jj40', 5, 'daily', 'medium', 'valid_reps', 'jumpingJack', 40, 30),
  ('d_med_pu10', 6, 'daily', 'medium', 'valid_reps', 'pushUp', 10, 30),
  ('d_med_sessions2', 7, 'daily', 'medium', 'sessions', null, 2, 30),
  ('d_q_clean', 8, 'daily', 'quality', 'good_form_sessions', null, 1, 30),
  ('d_explore', 9, 'daily', 'explore', 'exercises_done', null, 2, 20),
  ('w_consistency', 10, 'weekly', 'weekly', 'active_days', null, 3, 100),
  ('w_volume', 11, 'weekly', 'weekly', 'valid_reps', null, 150, 80),
  ('w_variety', 12, 'weekly', 'weekly', 'exercises_done', null, 3, 60)
on conflict (code) do update set sort = excluded.sort, scope = excluded.scope, tier = excluded.tier, metric = excluded.metric,
  exercise_code = excluded.exercise_code, target = excluded.target, xp_reward = excluded.xp_reward;

create table public.mission_assignments (
  id uuid primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  template_code text not null references public.mission_templates (code),
  scope text not null,
  tier text not null,
  metric text not null,
  exercise_code text,
  target int not null,
  xp_reward int not null,
  period_start date not null,
  period_end date not null,
  progress int not null default 0,
  status text not null default 'active' check (status in ('active', 'completed')),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, template_code, period_start)
);
create index mission_assignments_user_period on public.mission_assignments (user_id, period_start desc);
create trigger mission_assignments_updated before update on public.mission_assignments
  for each row execute function app_private.set_updated_at();

-- FNV-1a de 32 bits sobre los bytes (ASCII en la práctica: uuid y fecha).
create function app_private.fnv1a(p_text text) returns bigint
language plpgsql immutable set search_path = '' as $$
declare h bigint := 2166136261; b bytea := convert_to(p_text, 'UTF8'); i int;
begin
  for i in 0 .. length(b) - 1 loop
    h := (h # get_byte(b, i)) & 4294967295;
    h := (h * 16777619) & 4294967295;
  end loop;
  return h;
end $$;

create function app_private.assignment_id(p_user uuid, p_code text, p_start date) returns uuid
language sql immutable set search_path = '' as $$ select md5(p_user::text || '|' || p_code || '|' || p_start::text)::uuid $$;

create function app_private.insert_assignment(p_user uuid, t public.mission_templates, p_start date, p_end date, p_target int) returns void
language sql security definer set search_path = '' as $$
  insert into public.mission_assignments (id, user_id, template_code, scope, tier, metric, exercise_code, target, xp_reward, period_start, period_end)
  values (app_private.assignment_id(p_user, t.code, p_start), p_user, t.code, t.scope, t.tier, t.metric, t.exercise_code, p_target, t.xp_reward, p_start, p_end)
  on conflict (user_id, template_code, period_start) do nothing
$$;

-- 3 diarias (fácil, media y calidad o exploración) elegidas con FNV-1a de 'usuario|fecha|tier'; estables una vez creadas.
create function app_private.ensure_daily(p_user uuid, p_date date) returns void
language plpgsql security definer set search_path = '' as $$
declare v_prior int; v_tier text; v_n int; t public.mission_templates;
begin
  if exists (select 1 from public.mission_assignments where user_id = p_user and scope = 'daily' and period_start = p_date) then return; end if;
  select count(*) into v_prior from public.workout_sessions where user_id = p_user and local_date < p_date and deleted_at is null;
  foreach v_tier in array array['easy', 'medium', case when v_prior >= 3 then 'quality' else 'explore' end] loop
    select count(*) into v_n from public.mission_templates where tier = v_tier and active;
    select * into t from public.mission_templates where tier = v_tier and active order by sort
      offset (app_private.fnv1a(p_user::text || '|' || p_date::text || '|' || v_tier) % v_n) limit 1;
    perform app_private.insert_assignment(p_user, t, p_date, p_date, t.target);
  end loop;
end $$;

create function app_private.ensure_weekly(p_user uuid, p_week_start date) returns void
language plpgsql security definer set search_path = '' as $$
declare v_goal int; t public.mission_templates;
begin
  select weekly_goal_days into v_goal from public.profiles where id = p_user;
  for t in select * from public.mission_templates where scope = 'weekly' and active order by sort loop
    perform app_private.insert_assignment(p_user, t, p_week_start, p_week_start + 6,
      case when t.code = 'w_consistency' then least(5, greatest(2, coalesce(v_goal, 3))) else t.target end);
  end loop;
end $$;

-- Progreso derivado de las sesiones del periodo (como progress() en el cliente), limitado al objetivo.
create function app_private.mission_progress(a public.mission_assignments) returns int
language plpgsql stable security definer set search_path = '' as $$
declare v int;
begin
  if a.metric = 'valid_reps' then
    select coalesce(sum(s.reps_valid), 0) into v from public.workout_sessions s join public.exercises e on e.id = s.exercise_id
     where s.user_id = a.user_id and s.deleted_at is null and s.local_date between a.period_start and a.period_end
       and (a.exercise_code is null or e.code = a.exercise_code);
  elsif a.metric = 'active_seconds' then
    select coalesce(sum(s.active_seconds), 0) into v from public.workout_sessions s join public.exercises e on e.id = s.exercise_id
     where s.user_id = a.user_id and s.deleted_at is null and s.local_date between a.period_start and a.period_end
       and (a.exercise_code is null or e.code = a.exercise_code);
  elsif a.metric = 'sessions' then
    select count(*) into v from public.workout_sessions s join public.exercises e on e.id = s.exercise_id
     where s.user_id = a.user_id and s.deleted_at is null and s.status = 'completed'
       and s.local_date between a.period_start and a.period_end and (a.exercise_code is null or e.code = a.exercise_code);
  elsif a.metric = 'good_form_sessions' then
    select count(*) into v from public.workout_sessions s
     where s.user_id = a.user_id and s.deleted_at is null and s.status = 'completed'
       and s.local_date between a.period_start and a.period_end
       and (select count(*) filter (where r.valid and r.form_score >= 80)::numeric / nullif(count(*) filter (where r.valid), 0)
              from public.rep_summaries r where r.session_id = s.id) >= 0.8;
  elsif a.metric = 'active_days' then
    select count(*) into v from (
      select s.local_date from public.workout_sessions s
       where s.user_id = a.user_id and s.deleted_at is null and s.local_date between a.period_start and a.period_end
       group by s.local_date having sum(s.reps_valid) >= 20 or sum(s.active_seconds) >= 180) q;
  elsif a.metric = 'exercises_done' then
    select count(distinct s.exercise_id) into v from public.workout_sessions s
     where s.user_id = a.user_id and s.deleted_at is null and s.reps_valid > 0
       and s.local_date between a.period_start and a.period_end;
  end if;
  return least(a.target, coalesce(v, 0));
end $$;

-- Recalcula las misiones que cubren p_date; las recién completadas dan su XP una sola vez (y +15 por las tres diarias).
create function app_private.recompute_missions(p_user uuid, p_date date) returns text[]
language plpgsql security definer set search_path = '' as $$
declare a public.mission_assignments; v_prog int; v_done text[] := '{}';
begin
  for a in select * from public.mission_assignments
            where user_id = p_user and p_date between period_start and period_end for update loop
    v_prog := app_private.mission_progress(a);
    update public.mission_assignments set progress = v_prog where id = a.id and progress <> v_prog;
    if v_prog >= a.target and a.status = 'active' then
      update public.mission_assignments set status = 'completed', completed_at = now() where id = a.id;
      insert into public.xp_events (user_id, source_type, source_id, amount, local_date)
      values (p_user, 'mission', a.id, a.xp_reward, p_date) on conflict do nothing;
      v_done := v_done || a.template_code;
    end if;
  end loop;
  if (select count(*) = 3 and bool_and(status = 'completed') from public.mission_assignments
       where user_id = p_user and scope = 'daily' and period_start = p_date) then
    insert into public.xp_events (user_id, source_type, source_id, amount, local_date)
    values (p_user, 'mission_bonus', md5(p_user::text || '|' || p_date::text || '|daily_bonus')::uuid, 15, p_date)
    on conflict do nothing;
  end if;
  return v_done;
end $$;

alter table public.mission_templates enable row level security;
alter table public.mission_assignments enable row level security;
create policy templates_read on public.mission_templates for select to authenticated using (true);
create policy assignments_select on public.mission_assignments for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.mission_templates, public.mission_assignments from anon, authenticated;
grant select on public.mission_templates, public.mission_assignments to authenticated;
