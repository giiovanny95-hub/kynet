-- KYNET 0006: actividad del día y racha recalculada desde cero (spec-datos-supabase §2.2; igual que streak.ts).

-- Reescribe daily_activity de un día a partir de sus sesiones (derivado, nunca incremental).
create function app_private.rebuild_day(p_user uuid, p_date date) returns void
language plpgsql security definer set search_path = '' as $$
declare v_reps int; v_secs int; v_count int; v_xp int;
begin
  select coalesce(sum(reps_valid), 0), coalesce(sum(active_seconds), 0), count(*)
    into v_reps, v_secs, v_count
    from public.workout_sessions
   where user_id = p_user and local_date = p_date and deleted_at is null and counts_for_streak;
  select coalesce(sum(amount), 0) into v_xp from public.xp_events where user_id = p_user and local_date = p_date;
  insert into public.daily_activity as d (user_id, local_date, xp_total, sessions_count, valid_reps, active_seconds, qualified)
  values (p_user, p_date, v_xp, v_count, v_reps, v_secs, v_reps >= 20 or v_secs >= 180)
  on conflict (user_id, local_date) do update
    set xp_total = excluded.xp_total, sessions_count = excluded.sessions_count, valid_reps = excluded.valid_reps,
        active_seconds = excluded.active_seconds, qualified = excluded.qualified;
end $$;

-- Racha pura sobre un conjunto de días cualificados (sirve también para los vectores de prueba).
create function app_private.streak_of(p_days date[], p_as_of date,
  out current_streak int, out longest_streak int, out last_day date, out at_risk boolean)
language plpgsql immutable set search_path = '' as $$
declare d date; v_first date;
begin
  current_streak := 0; longest_streak := 0; at_risk := false;
  select min(x), max(x) into v_first, last_day from unnest(p_days) x where x <= p_as_of;
  if v_first is null then last_day := null; return; end if;
  d := v_first;
  while d <= p_as_of loop
    if d = any (p_days) then current_streak := current_streak + 1;
    elsif d <> p_as_of then current_streak := 0;
    end if;
    longest_streak := greatest(longest_streak, current_streak);
    d := d + 1;
  end loop;
  at_risk := current_streak > 0 and not (p_as_of = any (p_days));
end $$;

create function app_private.compute_streak(p_user uuid, p_as_of date) returns void
language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  select * into r from app_private.streak_of(
    array(select local_date from public.daily_activity where user_id = p_user and qualified), p_as_of);
  update public.gamification_state
     set current_streak = r.current_streak, longest_streak = r.longest_streak, streak_last_day = r.last_day
   where user_id = p_user;
end $$;
