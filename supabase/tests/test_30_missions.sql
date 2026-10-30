-- La selección diaria del servidor coincide con la del cliente (vectors/missions*.json).
create temp table vec (name text primary key, data jsonb);
insert into vec values ('missions', :'missions'::jsonb), ('expected', :'missions_expected'::jsonb);

do $$
declare v jsonb; i int := 0; got text[]; want text[]; u uuid; d date; n int;
begin
  for v in select jsonb_array_elements(data -> 'daily') from vec where name = 'missions' loop
    u := (v ->> 'userId')::uuid; d := (v ->> 'date')::date; n := (v ->> 'priorSessions')::int;
    insert into auth.users (id) values (u) on conflict do nothing;
    delete from public.workout_sessions where user_id = u;
    delete from public.mission_assignments where user_id = u;
    -- Sesiones previas sintéticas (antes de la fecha) para fijar priorSessions.
    insert into public.workout_sessions (id, user_id, exercise_id, started_at, ended_at, tz, local_date, status, active_seconds, reps_total, reps_valid, avg_form_score)
    select gen_random_uuid(), u, 1, now(), now(), 'UTC', d - 1, 'completed', 60, 10, 10, 80 from generate_series(1, n);
    perform app_private.ensure_daily(u, d);
    select array_agg(template_code order by case tier when 'easy' then 1 when 'medium' then 2 else 3 end) into got
      from public.mission_assignments where user_id = u and scope = 'daily' and period_start = d;
    select array(select jsonb_array_elements_text(data -> i)) into want from (select data -> 'daily' as data from vec where name = 'expected') e;
    if got <> want then raise exception 'misiones % %: % <> %', u, d, got, want; end if;
    i := i + 1;
  end loop;
  raise notice 'misiones: OK';
end $$;
