-- KYNET 0003: catálogo de ejercicios (códigos iguales a los de la app).
create table public.exercises (
  id smallint primary key,
  code text not null unique,
  name_i18n jsonb not null,
  camera_setup text not null check (camera_setup in ('front', 'side')),
  fsm_version smallint not null default 1,
  active boolean not null default true,
  sort smallint not null default 0
);
insert into public.exercises (id, code, name_i18n, camera_setup, sort) values
  (1, 'squat', '{"es": "Sentadilla", "en": "Squat"}', 'side', 1),
  (2, 'jumpingJack', '{"es": "Jumping jack", "en": "Jumping jack"}', 'front', 2),
  (3, 'pushUp', '{"es": "Flexión", "en": "Push-up"}', 'side', 3)
on conflict (id) do update set code = excluded.code, name_i18n = excluded.name_i18n, camera_setup = excluded.camera_setup, sort = excluded.sort;

alter table public.exercises enable row level security;
create policy exercises_read on public.exercises for select to authenticated using (true);
revoke all on public.exercises from anon, authenticated;
grant select on public.exercises to authenticated;
