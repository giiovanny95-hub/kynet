-- Reglas puras del servidor contra los vectores JSON del cliente (src/gamification/vectors).
create temp table vec (name text primary key, data jsonb);
insert into vec values ('xp', :'xp'::jsonb), ('streak', :'streak'::jsonb), ('localdate', :'localdate'::jsonb),
  ('missions', :'missions'::jsonb), ('missions_expected', :'missions_expected'::jsonb);

do $$
declare v jsonb; got text; r record; i int;
begin
  for v in select jsonb_array_elements(data -> 'localDate') from vec where name = 'localdate' loop
    got := app_private.local_date((v ->> 'utc')::timestamptz, v ->> 'tz')::text;
    if got <> v ->> 'expected' then raise exception 'local_date % %: % <> %', v ->> 'utc', v ->> 'tz', got, v ->> 'expected'; end if;
  end loop;
  for v in select jsonb_array_elements(data -> 'weekStart') from vec where name = 'localdate' loop
    got := date_trunc('week', (v ->> 'date')::date)::date::text;
    if got <> v ->> 'expected' then raise exception 'week_start %: %', v ->> 'date', got; end if;
  end loop;
  for v in select jsonb_array_elements(data -> 'repXp') from vec where name = 'xp' loop
    got := app_private.rep_xp((v ->> 'formScore')::smallint, (v ->> 'durationMs')::int, true, v ->> 'exercise')::text;
    if got <> v ->> 'expected' then raise exception 'rep_xp %: %', v, got; end if;
  end loop;
  for v in select jsonb_array_elements(data -> 'level') from vec where name = 'xp' loop
    got := app_private.level_for_xp((v ->> 'xp')::bigint)::text;
    if got <> v ->> 'level' then raise exception 'level_for_xp %: %', v, got; end if;
  end loop;
  for v in select jsonb_array_elements(data -> 'cases') from vec where name = 'streak' loop
    select * into r from app_private.streak_of(
      array(select (d ->> 0)::date from jsonb_array_elements(v -> 'days') d
             where (d ->> 1)::int >= 20 or (d ->> 2)::int >= 180), (v ->> 'asOf')::date);
    if r.current_streak <> (v -> 'expected' ->> 'current')::int or r.longest_streak <> (v -> 'expected' ->> 'longest')::int
       or r.last_day is distinct from (v -> 'expected' ->> 'lastDay')::date or r.at_risk <> (v -> 'expected' ->> 'atRisk')::boolean then
      raise exception 'racha "%": %', v ->> 'note', r;
    end if;
  end loop;
  for v in select jsonb_array_elements(data -> 'fnv1a') from vec where name = 'missions' loop
    if app_private.fnv1a(v ->> 'text') <> (v ->> 'hash')::bigint then raise exception 'fnv1a %', v; end if;
  end loop;
  raise notice 'reglas: OK';
end $$;
