-- KYNET 0005: ledger de XP, actividad diaria y reglas de XP/nivel (ruleset 1; igual que src/gamification/xp.ts).
create table public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  source_type text not null check (source_type in ('session_reps', 'session_bonus', 'mission', 'mission_bonus', 'adjustment')),
  source_id uuid not null,
  amount int not null check (amount >= 0),
  local_date date not null,
  ruleset smallint not null default 1,
  created_at timestamptz not null default now(),
  unique (user_id, source_type, source_id)
);
create index xp_events_user_day on public.xp_events (user_id, local_date);

create table public.daily_activity (
  user_id uuid not null references public.profiles (id) on delete cascade,
  local_date date not null,
  xp_total int not null default 0,
  sessions_count smallint not null default 0,
  valid_reps int not null default 0,
  active_seconds int not null default 0,
  qualified boolean not null default false,
  primary key (user_id, local_date)
);

-- Día local con corte a las 03:00 (reloj de pared), como localDate() en el cliente. Zona inválida → UTC.
create function app_private.local_date(p_ts timestamptz, p_tz text) returns date
language plpgsql stable set search_path = '' as $$
begin
  return ((p_ts at time zone p_tz) - interval '3 hours')::date;
exception when others then
  return ((p_ts at time zone 'UTC') - interval '3 hours')::date;
end $$;

create function app_private.xp_for_level(p_level int) returns bigint
language sql immutable set search_path = '' as $$ select (20 * (p_level - 1) * (p_level + 3))::bigint $$;

create function app_private.level_for_xp(p_total bigint) returns int
language plpgsql immutable set search_path = '' as $$
declare v_level int := greatest(1, floor(sqrt(greatest(p_total, 0) / 20.0 + 4))::int - 1);
begin
  while app_private.xp_for_level(v_level + 1) <= p_total loop v_level := v_level + 1; end loop;
  while v_level > 1 and app_private.xp_for_level(v_level) > p_total loop v_level := v_level - 1; end loop;
  return v_level;
end $$;

-- 2 si forma >= 80, 1 si 50-79, 0 si menos; 0 si no es válida o si es sentadilla/flexión de menos de 800 ms.
create function app_private.rep_xp(p_form smallint, p_duration_ms int, p_valid boolean, p_exercise text) returns int
language sql immutable set search_path = '' as $$
  select case
    when not p_valid then 0
    when p_exercise <> 'jumpingJack' and p_duration_ms < 800 then 0
    when p_form >= 80 then 2
    when p_form >= 50 then 1
    else 0 end
$$;

-- El total y el nivel se derivan del ledger; la clave única hace idempotente el reintento.
create function app_private.apply_xp_event() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.gamification_state
     set total_xp = total_xp + new.amount,
         level = app_private.level_for_xp(total_xp + new.amount)
   where user_id = new.user_id;
  return new;
end $$;
create trigger xp_events_apply after insert on public.xp_events
  for each row execute function app_private.apply_xp_event();

alter table public.xp_events enable row level security;
alter table public.daily_activity enable row level security;
create policy xp_select on public.xp_events for select to authenticated using (user_id = (select auth.uid()));
create policy daily_select on public.daily_activity for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.xp_events, public.daily_activity from anon, authenticated;
grant select on public.xp_events, public.daily_activity to authenticated;
