#!/bin/bash
# アプリケーションのマイグレーションを適用する
# docker-entrypoint-initdb.d から自動実行される（DB 初回起動時のみ）

set -e

echo "=== Applying application migrations ==="

for f in /app-migrations/*.sql; do
  echo "Applying: $(basename "$f")"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$f"
done

echo "=== All application migrations applied ==="
