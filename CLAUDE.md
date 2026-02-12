# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Sonar**（倍速アンケート）は、AIを活用した内省支援プラットフォーム。ユーザーが目的・背景を入力し、AIが5問ずつ質問を生成→回答→分析を繰り返し、最終的に詳細なレポートを生成する。

Tech stack: Next.js 16 (App Router) + Supabase + OpenRouter API (google/gemini-3-flash-preview) + Tailwind CSS v4

## Commands

```bash
npm run dev      # 開発サーバー起動 (http://localhost:3000)
npm run build    # プロダクションビルド
npm run lint     # ESLint実行
```

テストフレームワークは未導入。

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
OPENROUTER_API_KEY=[key]
NEXT_PUBLIC_BASE_URL=https://sonar-b-eight.vercel.app  # optional
NEXT_PUBLIC_SITE_URL=http://localhost:3000              # optional, OpenRouter referer
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

## Conventions

- ユーザー向けエラーメッセージは**日本語**
- 質問番号は1-indexed（Q1, Q2, ...）
- レポート内の引用は `[Q番号]` 形式、集約レポートは `[U1-Q12]` 形式
- DB: snake_case、TypeScript: PascalCase（型）/ camelCase（変数）
- 認証なし。セッションIDベースのアクセス、管理者はadmin_tokenベース
