#!/usr/bin/env bash
# ============================================================
# マイグレーション手動適用スクリプト
#
# DB 初回起動後に自動適用されるが、追加マイグレーションを
# 手動で適用したい場合にこのスクリプトを使う。
#
# 使い方:
#   cd /opt/sonar
#   bash deploy/scripts/apply-migrations.sh
#
# 特定のマイグレーションだけ適用:
#   bash deploy/scripts/apply-migrations.sh 017_add_notification_email.sql
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MIGRATIONS_DIR="$PROJECT_ROOT/supabase/migrations"

# .env から POSTGRES_PASSWORD を読み込む
if [ -f "$PROJECT_ROOT/deploy/supabase/.env" ]; then
  POSTGRES_PASSWORD=$(grep '^POSTGRES_PASSWORD=' "$PROJECT_ROOT/deploy/supabase/.env" | cut -d= -f2-)
else
  echo "エラー: deploy/supabase/.env が見つかりません"
  exit 1
fi

PSQL_CMD="docker exec -i deploy-supabase-db-1 psql -U supabase_admin -d postgres"

echo "=== マイグレーション適用 ==="

if [ $# -gt 0 ]; then
  # 引数で指定されたファイルのみ適用
  for file in "$@"; do
    filepath="$MIGRATIONS_DIR/$file"
    if [ -f "$filepath" ]; then
      echo "適用中: $file"
      $PSQL_CMD < "$filepath"
    else
      echo "エラー: $filepath が見つかりません"
      exit 1
    fi
  done
else
  # 全マイグレーションを順番に適用（既存テーブルがあればスキップされる）
  for f in "$MIGRATIONS_DIR"/*.sql; do
    echo "適用中: $(basename "$f")"
    $PSQL_CMD < "$f" 2>&1 || echo "  (スキップ: 既に適用済みの可能性)"
  done
fi

echo ""
echo "=== マイグレーション完了 ==="
