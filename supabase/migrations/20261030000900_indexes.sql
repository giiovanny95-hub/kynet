-- KYNET 0009: índices de claves foráneas que usan RLS, los filtros por ejercicio y el borrado en cascada (advisor 0001).
create index if not exists rep_summaries_user on public.rep_summaries (user_id);
create index if not exists workout_sessions_exercise on public.workout_sessions (exercise_id);
