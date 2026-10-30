#!/usr/bin/env bash
# Prueba las migraciones de supabase/migrations en un Postgres 16 temporal (nunca contra Supabase).
# Requiere los binarios de PostgreSQL 16 (initdb, pg_ctl, psql). Uso: bash scripts/test-sql.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
WORK="$(mktemp -d)"
PORT="${PGPORT_TEST:-54329}"
RUN=()
if [ "$(id -u)" = "0" ]; then chown postgres "$WORK"; RUN=(runuser -u postgres --); fi
cleanup() { "${RUN[@]}" "$PGBIN/pg_ctl" -D "$WORK/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$WORK"; }
trap cleanup EXIT
"${RUN[@]}" "$PGBIN/initdb" -D "$WORK/data" -A trust -U postgres >/dev/null
"${RUN[@]}" "$PGBIN/pg_ctl" -D "$WORK/data" -o "-p $PORT -k $WORK -c listen_addresses=''" -l "$WORK/log" -w start >/dev/null
PSQL=("${RUN[@]}" psql -h "$WORK" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q -X)
"${PSQL[@]}" -f "$ROOT/supabase/tests/auth_stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do "${PSQL[@]}" -f "$f"; done
VEC="$ROOT/src/gamification/vectors"
for t in "$ROOT"/supabase/tests/test_*.sql; do
  echo "· $(basename "$t")"
  "${PSQL[@]}" -v xp="$(cat "$VEC/xp.json")" -v streak="$(cat "$VEC/streak.json")" -v localdate="$(cat "$VEC/localDate.json")" \
    -v missions="$(cat "$VEC/missions.json")" -v missions_expected="$(cat "$VEC/missions.expected.json")" -f "$t"
done
echo "SQL: todas las pruebas pasan"
