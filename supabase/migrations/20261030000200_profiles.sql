-- KYNET 0002: perfil editable y estado de gamificación (solo servidor escribe).
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 1 and 40),
  locale text not null default 'es' check (locale in ('es', 'en', 'pt')),
  timezone text not null default 'UTC',
  weekly_goal_days smallint not null default 3 check (weekly_goal_days between 2 and 5),
  fitness_level text not null default 'beginner' check (fitness_level in ('beginner', 'regular', 'advanced')),
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.gamification_state (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  total_xp bigint not null default 0 check (total_xp >= 0),
  level int not null default 1 check (level >= 1),
  current_streak int not null default 0 check (current_streak >= 0),
  longest_streak int not null default 0 check (longest_streak >= 0),
  streak_last_day date,
  protectors_available smallint not null default 0 check (protectors_available between 0 and 2), -- etapa 2
  ruleset smallint not null default 1,
  updated_at timestamptz not null default now()
);

create function app_private.validate_timezone() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'Zona horaria no válida: %', new.timezone using errcode = '22023';
  end if;
  return new;
end $$;

create trigger profiles_tz before insert or update of timezone on public.profiles
  for each row execute function app_private.validate_timezone();
create trigger profiles_updated before update on public.profiles
  for each row execute function app_private.set_updated_at();
create trigger gamification_updated before update on public.gamification_state
  for each row execute function app_private.set_updated_at();

-- Alta: solo el nombre de pila (minimización); nunca bloquea el registro.
create function app_private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_name text := nullif(split_part(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), ' ', 1), '');
begin
  insert into public.profiles (id, display_name) values (new.id, left(v_name, 40)) on conflict (id) do nothing;
  insert into public.gamification_state (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function app_private.handle_new_user();

alter table public.profiles enable row level security;
alter table public.gamification_state enable row level security;
create policy profiles_select on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_update on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy gamification_select on public.gamification_state for select to authenticated using (user_id = (select auth.uid()));

revoke all on public.profiles, public.gamification_state from anon, authenticated;
grant select on public.profiles, public.gamification_state to authenticated;
grant update (display_name, locale, timezone, weekly_goal_days, fitness_level, onboarded_at) on public.profiles to authenticated;
