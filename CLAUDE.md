# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Sonar**（倍速アンケート）は、AIを活用した内省支援プラットフォーム。ユーザーが目的・背景を入力し、AIが5問ずつ質問を生成→回答→分析を繰り返し、最終的に詳細なレポートを生成する。

Tech stack: Next.js 16 (App Router) + Supabase + OpenRouter API (google/gemini-3-flash-preview) + Tailwind CSS v4

## Local Development

### 前提条件

- Node.js 20+, Docker Desktop, [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started) (`brew install supabase/tap/supabase`)

### セットアップ手順

```bash
# 1. 依存関係インストール
npm install

# 2. 環境変数をコピーして OPENROUTER_API_KEY を設定
cp .env.example .env.local

# 3. ローカル Supabase 起動（初回は Docker イメージ DL で 5〜10分）
supabase start

# 4. supabase start の出力から Publishable key を .env.local にコピー
#    NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
#    NEXT_PUBLIC_SUPABASE_ANON_KEY=<Publishable key>

# 5. 開発サーバー起動
npm run dev
```

### ローカルツール一覧

| ツール | URL | 用途 |
|--------|-----|------|
| Next.js App | http://localhost:3939 | メインアプリ |
| Supabase Studio | http://127.0.0.1:54323 | DB管理・SQL実行 |
| Mailpit | http://127.0.0.1:54324 | マジックリンクメール確認 |

### マジックリンク認証テスト

1. `/login` でメール入力 → 2. Mailpit (`:54324`) でメール確認 → 3. リンクをクリック

ローカルではメールは Mailpit に届く（実際には送信されない）。

### Supabase CLI 操作

```bash
supabase status              # ステータス確認
supabase stop                # 停止
supabase db reset            # 全マイグレーション再適用
supabase migration new <name> # 新規マイグレーション作成
```

### .env.local の切り替え

```env
# === ローカル開発 ===
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase start の Publishable key>

# === 本番（Vercel 環境変数で設定。ローカルでは通常使わない） ===
# NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

### トラブルシューティング

- **`supabase start` 失敗** → Docker Desktop 起動確認。`supabase stop && supabase start` で再起動
- **"No such container" エラー** → `supabase start` で起動
- **認証コールバックエラー** → `config.toml` の `site_url` と Next.js のポートが一致しているか確認
- **マイグレーション重複エラー** → ファイル名の番号が一意か確認。`supabase db reset` で再適用

## Commands

```bash
npm run dev        # 開発サーバー起動 (http://localhost:3939)
npm run build      # プロダクションビルド
npm run lint       # ESLint実行
npm test           # テスト実行 (vitest run)
npm run test:watch # テスト監視モード (vitest)
```

### テスト

Vitest を使用。テストファイルは対象コードと同階層に `*.test.ts` として配置。

```
src/
├── lib/
│   ├── utils/phase.test.ts          # フェーズ管理ロジック (12テスト)
│   └── openrouter/
│       ├── client.test.ts           # OpenRouter API クライアント (8テスト)
│       └── prompts.test.ts          # formatAnswerText (16テスト)
├── app/api/
│   ├── sessions/sessions.test.ts    # セッション作成スキーマ (14テスト)
│   ├── answers/answers.test.ts      # 回答保存スキーマ (12テスト)
│   ├── questions/json-parser.test.ts # LLMレスポンスJSON解析 (11テスト)
│   ├── analysis/analysis.test.ts    # 分析スキーマ+未回答チェック (13テスト)
│   └── report/report.test.ts        # レポートスキーマ+バージョン管理 (9テスト)
```

テスト方針: Supabase/外部APIに依存しない純粋ロジック（Zodスキーマ検証、ビジネスロジック関数）を抽出してテスト。`fetch` は `vi.stubGlobal` でモック。

### CI

GitHub Actions (`.github/workflows/ci.yml`) で `main`/`develop` への push と PR 時に test → lint → build を実行。

## Environment Variables

`.env.example` を参照。必須:
```
NEXT_PUBLIC_SUPABASE_URL    # ローカル: http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY  # supabase start で生成
OPENROUTER_API_KEY          # OpenRouter API キー
```

## Architecture

### Core Flow

1. セッション作成（purpose + background）→ 最初の5問を自動生成
2. 5問回答完了 → 分析生成 + 次の5問生成（並列実行）
3. 目標数（デフォルト25問）到達 → 最終レポート生成

### Phase System (`src/lib/utils/phase.ts`)

質問はフェーズに基づいて生成される。5問ごとにフェーズが変わる：
- Batch 1-2 (Q1-10): **exploration** — テーマを広く網羅
- Batch 3+: **deep-dive** → **reframing** → **exploration** の3フェーズ繰り返し

### Question Options Design

全質問は固定6選択肢:
- `options[0]` = 「はい」, `[1]` = 「わからない」, `[2]` = 「いいえ」
- `options[3-5]` = AIが回答傾向から予測する中間的立場（条件付き賛成、部分的否定など）
- `options[6]` = 「その他」（自由記述、UIで追加）

**重要な制約**: options[3-5]は元の問いの軸から外れてはいけない。前提を疑う立場はOKだが、論点をすり替える選択肢はNG。

### Key Files

| ファイル | 役割 |
|---------|------|
| `src/hooks/use-session.ts` | メインの状態管理hook（質問・回答・分析・レポートの全ライフサイクル） |
| `src/lib/openrouter/prompts.ts` | 全LLMプロンプト（質問生成・分析・レポート・集約レポート） |
| `src/lib/openrouter/client.ts` | OpenRouter API呼び出し（model: gemini-3-flash-preview） |
| `src/lib/utils/phase.ts` | フェーズ管理ロジックとフェーズ説明文 |
| `src/lib/supabase/types.ts` | DB型定義（手動管理） |
| `src/lib/presets/index.ts` | プリセット定義（選挙アンケートなど） |

### Database

Supabase PostgreSQL。マイグレーションは `supabase/migrations/` にある。主要テーブル:
- `sessions` — セッション（purpose, background, phase_profile, key_questions, report_target）
- `questions` — 質問（statement, detail, options as JSONB, phase）。unique: (session_id, question_index)
- `answers` — 回答（selected_option 0-6, free_text）。upsert対応
- `analyses` — 5問バッチごとの分析テキスト
- `reports` — 最終レポート（version管理）
- `presets` — アンケートテンプレート（admin_token でアクセス制御）
- `survey_reports` — プリセット横断の集約レポート

### API Routes

全て `/src/app/api/` 配下。Zodでリクエスト検証。エラーメッセージは日本語。

- `POST /api/sessions` — セッション作成
- `GET /api/sessions/:id` — セッション全状態取得
- `POST /api/questions/generate` — 質問バッチ生成
- `POST /api/answers` — 回答保存（upsert）
- `POST /api/analysis/generate` — バッチ分析生成
- `POST /api/report/generate` — 最終レポート生成
- `/api/presets/*` — プリセットCRUD
- `/api/admin/[token]/*` — 管理者ダッシュボード

### Preset System

ハードコードプリセット（`src/lib/presets/`）とDB保存プリセット（`presets`テーブル）の2系統。プリセットはpurpose・background・key_questionsを事前設定し、参加者はそのまま回答開始できる。admin_tokenで管理画面にアクセス。

### UI Patterns

- スマホファースト・縦1カラム設計
- Skeleton placeholder で生成中の体感速度を改善
- `/report/[id]/print` で印刷用プレビュー（@media print対応）
- 音声入力モード（Deepgram STT）対応

### Authentication (Issue #18+)

Supabase Auth マジックリンク認証。`@supabase/ssr` 0.8+ の PKCE フローを使用。

| ファイル | 役割 |
|---------|------|
| `src/lib/supabase/server.ts` | Server Client（getAll/setAll パターン） |
| `src/lib/supabase/client.ts` | Browser Client（変更不要） |
| `src/middleware.ts` | セッションリフレッシュ専用（リダイレクトなし） |
| `src/app/auth/confirm/route.ts` | コールバック（PKCE `code` + legacy `token_hash` 両対応） |
| `src/app/auth/signout/route.ts` | POST でサインアウト |
| `src/app/login/page.tsx` | マジックリンク送信フォーム |

**重要**: Supabase のマジックリンクは**デフォルトで PKCE フロー**。コールバックには `?code=...` が来る。`exchangeCodeForSession(code)` で処理すること。`token_hash` + `type` だけ期待すると認証が常に失敗する。

## Branch Strategy

| ブランチ | 用途 |
|----------|------|
| `main` | **本番環境**（Vercel 自動デプロイ）。直接 push/merge 禁止 |
| `develop` | 開発ブランチ。push で Vercel Preview 生成 |
| `feat/*` | 機能ブランチ。PR で develop にマージ |

**重要**: `main` は本番 Vercel に接続。マイグレーションの適用は本番DBに影響するため、ローカル Supabase で十分テストしてから develop → main にマージすること。

## Conventions

- ユーザー向けエラーメッセージは**日本語**
- 質問番号は1-indexed（Q1, Q2, ...）
- レポート内の引用は `[Q番号]` 形式、集約レポートは `[U1-Q12]` 形式
- DB: snake_case、TypeScript: PascalCase（型）/ camelCase（変数）
- 認証: Supabase Auth マジックリンク（PKCE フロー）。未ログインでも既存機能は使える
