-- sync_session: XP, idempotencia, tope diario, RLS y día local (spec-datos-supabase §2.3, §3).
insert into auth.users (id, raw_user_meta_data) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '{"full_name": "Ana Pérez"}'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '{}');

create function pg_temp.reps(n int, form int, dur int) returns jsonb language sql as $$
  select coalesce(jsonb_agg(jsonb_build_object('index', i, 't_start_ms', i * 2000, 'duration_ms', dur, 'form_score', form, 'valid', true, 'faults', '[]'::jsonb)), '[]'::jsonb)
    from generate_series(0, n - 1) i
$$;
create function pg_temp.sess(id uuid, ex text, started timestamptz, n int, tz text default 'UTC') returns jsonb language sql as $$
  select jsonb_build_object('id', id, 'exercise', ex, 'started_at', started, 'ended_at', started + interval '5 minutes', 'tz', tz,
    'status', 'completed', 'active_seconds', 120, 'avg_form_score', 90, 'algo_version', 1, 'app_version', 'test')
$$;
grant execute on function pg_temp.reps(int, int, int), pg_temp.sess(uuid, text, timestamptz, int, text) to authenticated;

do $$
begin
  if (select display_name from public.profiles where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') <> 'Ana' then raise exception 'alta: nombre de pila'; end if;
  if (select display_name from public.profiles where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') is not null then raise exception 'alta sin nombre'; end if;
  if not exists (select 1 from public.gamification_state where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') then raise exception 'alta: estado'; end if;
end $$;

set role authenticated;
select set_config('request.jwt.claims', '{"sub": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"}', false);

do $$
declare r jsonb; r2 jsonb; xp_before bigint; s1 uuid := '00000000-0000-4000-8000-000000000001';
begin
  -- 30 repeticiones limpias: 60 + 20 (completada) + 10 (primera del día) + 10 (forma) + 15 (primera vez) = 115.
  r := public.sync_session(pg_temp.sess(s1, 'squat', now() - interval '1 hour', 30), pg_temp.reps(30, 90, 2000));
  if (select sum(amount) from public.xp_events where source_id = s1) <> 115 then raise exception 'XP de sesión: %', r; end if;
  if (r -> 'state' ->> 'current_streak')::int < 1 then raise exception 'racha tras 30 repeticiones: %', r; end if;
  if jsonb_array_length(r -> 'assignments') < 6 then raise exception 'misiones de hoy y de la semana: %', r -> 'assignments'; end if;
  xp_before := (select total_xp from public.gamification_state);

  -- Reintento: no duplica nada (Review Focus 2).
  r2 := public.sync_session(pg_temp.sess(s1, 'squat', now() - interval '1 hour', 30), pg_temp.reps(30, 90, 2000));
  if not (r2 ->> 'duplicate')::boolean or (select total_xp from public.gamification_state) <> xp_before
     or (select count(*) from public.rep_summaries where session_id = s1) <> 30 then raise exception 'reintento duplica: %', r2; end if;

  -- Tope diario de 300 XP por repeticiones: 200 limpias (400) solo dan 240 más.
  perform public.sync_session(pg_temp.sess('00000000-0000-4000-8000-000000000002', 'squat', now() - interval '30 minutes', 200),
    pg_temp.reps(200, 90, 2000));
  if (select amount from public.xp_events where source_id = '00000000-0000-4000-8000-000000000002' and source_type = 'session_reps') <> 240 then
    raise exception 'tope diario';
  end if;

  -- Flexión rápida (< 800 ms) no da XP de repeticiones.
  perform public.sync_session(pg_temp.sess('00000000-0000-4000-8000-000000000003', 'pushUp', now() - interval '20 minutes', 5),
    pg_temp.reps(5, 95, 600));
  if (select amount from public.xp_events where source_id = '00000000-0000-4000-8000-000000000003' and source_type = 'session_reps') <> 0 then
    raise exception 'flexión rápida';
  end if;
  raise notice 'sync: XP, reintento y tope OK';
end $$;

do $$
declare v_tz text := 'America/Mexico_City'; v_ts timestamptz; v_today date; d date;
begin
  -- 00:40 local de ayer cuenta para anteayer (Review Focus 1).
  v_today := ((now() at time zone v_tz) - interval '3 hours')::date;
  v_ts := ((date_trunc('day', now() at time zone v_tz) - interval '1 day') + interval '40 minutes') at time zone v_tz;
  perform public.sync_session(pg_temp.sess('00000000-0000-4000-8000-000000000004', 'jumpingJack', v_ts, 10, v_tz), pg_temp.reps(10, 90, 1000));
  select local_date into d from public.workout_sessions where id = '00000000-0000-4000-8000-000000000004';
  if d <> (date_trunc('day', now() at time zone v_tz) - interval '2 days')::date then raise exception '00:40 local: %', d; end if;

  -- Sesión de hace 10 días: fuera de la ventana de 3 días no cuenta para la racha; en la importación inicial sí.
  perform public.sync_session(pg_temp.sess('00000000-0000-4000-8000-000000000005', 'squat', now() - interval '10 days', 5), pg_temp.reps(5, 90, 2000));
  perform public.sync_session(pg_temp.sess('00000000-0000-4000-8000-000000000006', 'squat', now() - interval '10 days', 5), pg_temp.reps(5, 90, 2000), true);
  if (select counts_for_streak from public.workout_sessions where id = '00000000-0000-4000-8000-000000000005') then raise exception 'ventana de gracia'; end if;
  if not (select counts_for_streak from public.workout_sessions where id = '00000000-0000-4000-8000-000000000006') then raise exception 'importación inicial'; end if;

  -- Reloj fuera de rango.
  begin
    perform public.sync_session(pg_temp.sess(gen_random_uuid(), 'squat', now() - interval '20 days', 1), pg_temp.reps(1, 90, 2000));
    raise exception 'debió rechazar 20 días';
  exception when sqlstate '22023' then null;
  end;
  if (public.get_state() -> 'state' ->> 'total_xp')::int <= 0 then raise exception 'get_state'; end if;
  raise notice 'sync: día local, gracia, importación y reloj OK';
end $$;

-- RLS: B no ve nada de A, no puede reutilizar su sesión y nadie escribe XP directamente.
select set_config('request.jwt.claims', '{"sub": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"}', false);
do $$
begin
  if (select count(*) from public.workout_sessions) <> 0 or (select count(*) from public.xp_events) <> 0
     or (select count(*) from public.profiles) <> 1 then raise exception 'RLS: B ve datos ajenos'; end if;
  begin
    perform public.sync_session(pg_temp.sess('00000000-0000-4000-8000-000000000001', 'squat', now() - interval '1 hour', 1), pg_temp.reps(1, 90, 2000));
    raise exception 'B reutilizó la sesión de A';
  exception when sqlstate '42501' then null;
  end;
  begin
    insert into public.xp_events (user_id, source_type, source_id, amount, local_date)
    values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'adjustment', gen_random_uuid(), 999999, current_date);
    raise exception 'escritura directa de XP';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.gamification_state set total_xp = 999999;
    raise exception 'update directo del estado';
  exception when insufficient_privilege then null;
  end;
  raise notice 'RLS autenticado OK';
end $$;

reset role;
set role anon;
do $$
begin
  begin
    perform 1 from public.profiles;
    raise exception 'anon lee perfiles';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.get_state();
    raise exception 'anon llama a get_state';
  exception when insufficient_privilege then null;
  end;
  raise notice 'anon OK';
end $$;
reset role;
