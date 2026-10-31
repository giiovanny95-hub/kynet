-- KYNET 0001: esquema privado, utilidades y permisos por defecto (spec-datos-supabase §3.1, §7.1).
create schema if not exists app_private;
revoke all on schema app_private from public;

create or replace function app_private.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Las tablas nuevas de public no dan permisos a anon/authenticated salvo GRANT explícito.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on functions from public, anon, authenticated;
