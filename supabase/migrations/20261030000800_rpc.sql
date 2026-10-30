-- KYNET 0008: RPC públicas. El cliente nunca escribe tablas directamente (spec-datos-supabase §3.4).

create function app_private.state_json(p_user uuid, p_today date) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'state', (select to_jsonb(g) - 'user_id' from public.gamification_state g where g.user_id = p_user),
    'today', p_today,
    'at_risk', coalesce((select g.current_streak > 0 and not exists (
        select 1 from public.daily_activity d where d.user_id = p_user and d.local_date = p_today and d.qualified)
      from public.gamification_state g where g.user_id = p_user), false),
    'assignments', coalesce((select jsonb_agg(to_jsonb(a) - 'user_id' order by a.scope, a.period_start, a.template_code)
        from public.mission_assignments a
       where a.user_id = p_user and (a.period_start = p_today or (a.scope = 'weekly' and p_today between a.period_start and a.period_end))), '[]'::jsonb)
  )
$$;

create function public.sync_session(p_session jsonb, p_reps jsonb, p_initial_import boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_owner uuid;
  v_ex public.exercises;
  v_started timestamptz;
  v_ended timestamptz;
  v_tz text;
  v_date date;
  v_today date;
  v_status text;
  v_raw int;
  v_room int;
  v_rep int;
  v_bonus int := 0;
  v_valid int;
  v_clean int;
  v_done text[] := '{}';
  v_xp int;
begin
  if v_uid is null then raise exception 'Sin sesión' using errcode = '42501'; end if;
  if jsonb_typeof(p_reps) is distinct from 'array' or jsonb_array_length(p_reps) > 1000 then
    raise exception 'Repeticiones no válidas' using errcode = '22023';
  end if;
  v_id := (p_session ->> 'id')::uuid;
  select * into v_ex from public.exercises where code = p_session ->> 'exercise';
  if not found then raise exception 'Ejercicio desconocido' using errcode = '22023'; end if;
  v_started := (p_session ->> 'started_at')::timestamptz;
  v_ended := (p_session ->> 'ended_at')::timestamptz;
  if v_started > now() + interval '10 minutes' or v_started < now() - interval '14 days' then
    raise exception 'started_at fuera de rango' using errcode = '22023';
  end if;
  v_tz := coalesce(nullif(p_session ->> 'tz', ''), 'UTC');
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = v_tz) then v_tz := 'UTC'; end if;
  v_status := p_session ->> 'status';
  v_date := app_private.local_date(v_started, v_tz);
  v_today := app_private.local_date(now(), v_tz);

  -- Serializa los dispositivos del mismo usuario.
  perform 1 from public.gamification_state where user_id = v_uid for update;
  if not found then
    insert into public.profiles (id) values (v_uid) on conflict do nothing;
    insert into public.gamification_state (user_id) values (v_uid) on conflict do nothing;
  end if;

  -- Reintento: la sesión ya existe; si es de otro usuario, error; si es propia, se devuelve el estado sin duplicar nada.
  select user_id into v_owner from public.workout_sessions where id = v_id;
  if found then
    if v_owner <> v_uid then raise exception 'Sesión ajena' using errcode = '42501'; end if;
    select coalesce(sum(amount), 0) into v_xp from public.xp_events
     where user_id = v_uid and source_id = v_id and source_type in ('session_reps', 'session_bonus');
    return jsonb_build_object('session_id', v_id, 'xp_awarded', v_xp, 'duplicate', true, 'newly_completed', '[]'::jsonb)
           || app_private.state_json(v_uid, v_today);
  end if;

  insert into public.workout_sessions (id, user_id, exercise_id, started_at, ended_at, tz, local_date, status, active_seconds,
    reps_total, reps_valid, avg_form_score, counts_for_streak, algo_version, app_version)
  values (v_id, v_uid, v_ex.id, v_started, greatest(v_ended, v_started), v_tz, v_date, v_status,
    (p_session ->> 'active_seconds')::int, jsonb_array_length(p_reps),
    (select count(*) from jsonb_array_elements(p_reps) r where (r ->> 'valid')::boolean),
    least(100, greatest(0, (p_session ->> 'avg_form_score')::int)),
    p_initial_import or v_date >= v_today - 3,
    coalesce((p_session ->> 'algo_version')::smallint, 1), p_session ->> 'app_version');

  insert into public.rep_summaries (session_id, rep_index, user_id, t_start_ms, duration_ms, form_score, valid, fault_codes)
  select v_id, (r ->> 'index')::smallint, v_uid, greatest(0, (r ->> 't_start_ms')::int), greatest(0, (r ->> 'duration_ms')::int),
         least(100, greatest(0, (r ->> 'form_score')::int))::smallint, (r ->> 'valid')::boolean,
         coalesce(array(select jsonb_array_elements_text(r -> 'faults')), '{}')
    from jsonb_array_elements(p_reps) r
  on conflict do nothing;

  -- XP de repeticiones con tope diario de 300 (los bonos no cuentan para el tope).
  select coalesce(sum(app_private.rep_xp(form_score, duration_ms, valid, v_ex.code)), 0),
         count(*) filter (where valid), count(*) filter (where valid and form_score >= 80)
    into v_raw, v_valid, v_clean
    from public.rep_summaries where session_id = v_id;
  select greatest(0, 300 - coalesce(sum(amount), 0)) into v_room from public.xp_events
   where user_id = v_uid and local_date = v_date and source_type = 'session_reps';
  v_rep := least(v_raw, v_room);
  if v_status = 'completed' then v_bonus := v_bonus + 20; end if;
  if not exists (select 1 from public.workout_sessions where user_id = v_uid and local_date = v_date and id <> v_id) then v_bonus := v_bonus + 10; end if;
  if v_valid > 0 and v_clean::numeric / v_valid >= 0.8 then v_bonus := v_bonus + 10; end if;
  if not exists (select 1 from public.workout_sessions where user_id = v_uid and exercise_id = v_ex.id and id <> v_id) then v_bonus := v_bonus + 15; end if;
  insert into public.xp_events (user_id, source_type, source_id, amount, local_date) values
    (v_uid, 'session_reps', v_id, v_rep, v_date), (v_uid, 'session_bonus', v_id, v_bonus, v_date);

  -- Misiones del día y de la semana de la sesión (y las de hoy, para mostrarlas).
  perform app_private.ensure_daily(v_uid, v_date);
  perform app_private.ensure_weekly(v_uid, date_trunc('week', v_date)::date);
  if v_today <> v_date then
    perform app_private.ensure_daily(v_uid, v_today);
    perform app_private.ensure_weekly(v_uid, date_trunc('week', v_today)::date);
  end if;
  v_done := app_private.recompute_missions(v_uid, v_date);

  perform app_private.rebuild_day(v_uid, v_date);
  perform app_private.compute_streak(v_uid, v_today);

  select coalesce(sum(amount), 0) into v_xp from public.xp_events
   where user_id = v_uid and (source_id = v_id or (source_type in ('mission', 'mission_bonus') and created_at >= statement_timestamp()));
  return jsonb_build_object('session_id', v_id, 'xp_awarded', v_xp, 'duplicate', false, 'newly_completed', to_jsonb(v_done))
         || app_private.state_json(v_uid, v_today);
end $$;

create function public.get_state() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_tz text; v_today date;
begin
  if v_uid is null then raise exception 'Sin sesión' using errcode = '42501'; end if;
  insert into public.profiles (id) values (v_uid) on conflict do nothing;
  insert into public.gamification_state (user_id) values (v_uid) on conflict do nothing;
  select timezone into v_tz from public.profiles where id = v_uid;
  v_today := app_private.local_date(now(), coalesce(v_tz, 'UTC'));
  perform app_private.ensure_daily(v_uid, v_today);
  perform app_private.ensure_weekly(v_uid, date_trunc('week', v_today)::date);
  perform app_private.recompute_missions(v_uid, v_today);
  perform app_private.compute_streak(v_uid, v_today);
  return app_private.state_json(v_uid, v_today);
end $$;

-- Portabilidad (spec §6.2): todos los datos del usuario en JSON.
create function public.export_my_data() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'profile', (select to_jsonb(p) from public.profiles p where p.id = auth.uid()),
    'state', (select to_jsonb(g) from public.gamification_state g where g.user_id = auth.uid()),
    'sessions', coalesce((select jsonb_agg(to_jsonb(s)) from public.workout_sessions s where s.user_id = auth.uid()), '[]'::jsonb),
    'reps', coalesce((select jsonb_agg(to_jsonb(r)) from public.rep_summaries r where r.user_id = auth.uid()), '[]'::jsonb),
    'xp_events', coalesce((select jsonb_agg(to_jsonb(x)) from public.xp_events x where x.user_id = auth.uid()), '[]'::jsonb),
    'missions', coalesce((select jsonb_agg(to_jsonb(m)) from public.mission_assignments m where m.user_id = auth.uid()), '[]'::jsonb)
  )
$$;

revoke all on all functions in schema app_private from public, anon, authenticated;
revoke all on function public.sync_session(jsonb, jsonb, boolean), public.get_state(), public.export_my_data() from public, anon;
grant execute on function public.sync_session(jsonb, jsonb, boolean), public.get_state(), public.export_my_data() to authenticated;
