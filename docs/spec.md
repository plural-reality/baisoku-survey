# 設計書: 倍速アンケート

## 1. 概要

Google Formsのような固定質問に対する回答をもとに、AIがリアルタイムに深掘り質問を自動生成し、最終的に構造化されたレポートを自動生成するアンケートプラットフォーム。

管理者が「目的」「固定質問」「探索テーマ」を設定してアンケートを作成し、回答用URLを配布する。回答者は固定質問に答えた後、AIが回答傾向に応じて追加の深掘り質問を生成。目標問数に達するとAIが自動でレポートを生成する。管理者は全回答者のレポートを集約して閲覧できる。

Tech stack: Next.js 16 (App Router) + Supabase + OpenRouter API (google/gemini-3-flash-preview) + Tailwind CSS v4

## 2. 目的とゴール

- **目的**: 従来のアンケートでは得られない「深い意見」をAIの対話的深掘りで引き出し、意思決定に直結するレポートを自動生成する。
- **ゴール**: 管理者が設定した目標問数（デフォルト10問、5問刻みで5〜95問まで設定可能）に達した時点で最終レポートを生成する。目標到達後も追加質問を続けることが可能。

## 3. 利用モード

| モード | 対象 | 入口 | 概要 |
|--------|------|------|------|
| プリセットモード | 組織向けアンケート配布 | `/create` → `/preset/[slug]` | 管理者が設計、回答者に配布 |
| ソロモード | 個人の思考整理 | `/solo` | 個人がAIと壁打ち |

## 4. 機能要件

### 4.1 アンケート作成（管理者）

管理者がアンケートを設計する。3つのセクションで構成：

#### セクション1: 回答者に表示される情報
- **タイトル**（必須）: アンケートの表題
- **説明文**（任意）: 回答者に表示される背景・前提情報。AIによる自動生成も可能
- **PDF添付**: PDFをアップロードするとフロントエンドでテキスト抽出し、説明文に追記。PDFの生ファイルはサーバーに保存しない

#### セクション2: 固定質問
- 全回答者に共通で出題する質問を定義
- 質問タイプ: ラジオボタン / チェックボックス / プルダウン / 短文テキスト / 段落テキスト / 均等目盛
- ラジオ/チェックボックス/プルダウン: 選択肢を2〜10個設定
- 均等目盛: min/max値 + 左右ラベル

#### セクション3: AI深掘り設定（回答者には非表示）
- **深掘りの目的**（必須）: AIが質問を生成する際の指針
- **探索テーマ**（任意）: AIが重点的に深掘りするテーマのリスト。AIによる自動生成・ドラッグ並べ替え可能

#### 詳細設定
- **レポートのカスタマイズ**: レポート生成時のAIへの追加指示
- **質問数**: 5問刻みで設定（5〜95問、デフォルト10問）

### 4.2 質問フロー（回答者）

#### 回答の流れ
1. 回答者がプリセットURL (`/preset/[slug]`) にアクセスすると、自動的にセッションが作成され質問画面へリダイレクト
2. 固定質問がある場合、まず固定質問に回答（セクション区切り表示）
3. 固定質問完了後（または固定質問がない場合）、AIが5問ずつ質問を自動生成
4. 5問回答完了 → 分析生成と次の5問生成を並列実行
5. 目標問数到達 → レポート生成可能（「回答を終えて結果を見る」ボタン表示）
6. 目標到達後も「もっと深掘りする（さらに5問追加）」で追加質問を続行可能
7. 目標到達前でも5問バッチ完了時に「回答を中断する」でレポート生成可能

#### AI生成質問の回答形式（3+1構造）
全質問は固定6選択肢 + 自由記述：
- `options[0]` = 「はい」
- `options[1]` = 「わからない」
- `options[2]` = 「いいえ」
- `options[3-5]` = AIが回答傾向から予測する中間的立場（条件付き賛成、部分的否定など）
- `options[6]` = 「その他」（自由記述、UIで追加）

**制約**: options[3-5]は元の問いの軸から外れてはいけない。前提を疑う立場はOKだが、論点をすり替える選択肢はNG。

UI上は「はい / わからない / いいえ」の3ボタンを横並びで表示し、「どちらでもない」を展開すると中間的立場3つ + 自由記述が表示される。

#### 固定質問の回答形式
質問タイプに応じたUI：
- ラジオボタン: 通常のリスト選択
- チェックボックス: 複数選択 + 「確定する」ボタン
- プルダウン: セレクトボックス
- 短文テキスト / 段落テキスト: テキスト入力 + 「送信する」ボタン
- 均等目盛: 数値ボタンの横並び（min〜max）

### 4.3 分析

- 5問回答ごとに500文字程度の中間分析を自動生成
- 共感的で、矛盾や揺らぎも丁寧に扱う
- 次の探索/深掘り方向を1-2文で示す

### 4.4 レポート

- 目標問数到達後にAIが詳細レポートを自動生成
- レポート内で質問番号を引用表記（例: `[Q12]`）
- 引用はインタラクティブなカードに変換（ホバーで質問内容とユーザーの回答を表示）
- Markdownレンダリング
- 印刷用専用ページ対応（`@media print`）
- Web Share API / クリップボードコピー対応
- Markdownテキストのコピー対応

### 4.5 管理画面

- アンケート所有者のみアクセス可能（ログイン + 所有権チェック）
- 全回答者の回答一覧閲覧
- 集約レポート（全回答者の傾向をまとめたレポート）の生成・閲覧
- レガシー管理画面: トークンベースのURL直接アクセスも維持（`/admin/[token]`）

### 4.6 認証

- Supabase Auth マジックリンク認証（PKCE フロー）
- 未ログインでもプリセット回答・ソロモードは利用可能
- `/create`（アンケート作成）と `/manage/*`（管理画面）はログイン必須
- ログイン済みユーザーが `/login` にアクセスすると `/lp` にリダイレクト

### 4.7 音声入力モード

- `?mode=voice` パラメータで有効化
- フルスクリーン専用UI（VoiceQuestionFlow）
- Deepgram STT（Speech-to-Text）連携

### 4.8 セッション管理

- セッションIDはLocalStorageに保存（最大20件）
- 同一デバイスから再開可能
- 回答修正可能（過去の回答は変更可。ただし後続質問の再生成はしない）

## 5. フェーズシステム

質問はフェーズに基づいて生成される。5問ごとにフェーズが変わる：

| バッチ | フェーズ | 内容 |
|--------|---------|------|
| Batch 1-2 (Q1-10) | exploration | テーマを広く網羅。まだ聞けていないテーマをカバー |
| Batch 3+ | deep-dive → reframing → exploration | 3フェーズ繰り返し |

- **exploration（探索）**: テーマの幅を広げ、カバレッジの欠落を埋める
- **deep-dive（深掘り）**: 条件分岐の探索、「なぜ」の根拠や価値観の引き出し、矛盾の境界線の明確化
- **reframing（視点変換）**: 主語・スコープ・時間軸・条件・立場を変えて再質問。事実認識 vs 理想像、原則 vs 程度、目的 vs 手段の分離

## 6. システム構成

### 6.1 フロントエンド
- Next.js 16 (App Router)
- Tailwind CSS v4
- 状態管理: `use-session` カスタムhook

### 6.2 バックエンド
- Next.js Route Handlers
- OpenRouter API (model: `google/gemini-3-flash-preview`)
- リクエスト検証: Zod

### 6.3 データベース
- Supabase PostgreSQL
- RLS有効（現在は全操作許可。アプリケーション層でsession_idベースのアクセス制御）

### 6.4 認証
- Supabase Auth（`@supabase/ssr` 0.8+ PKCE フロー）

### 6.5 アクセス方針
- クライアントはDBへ直接アクセスしない
- 全てNext.js API経由で読み書き、サーバー側で検証
- session_id を基準にアクセス制御

## 7. データモデル

### sessions
| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID (PK) | |
| title | TEXT | アンケートタイトル |
| purpose | TEXT (NOT NULL) | 深掘りの目的 |
| background_text | TEXT | 説明文・背景情報 |
| phase_profile | JSONB | フェーズ割り当て定義 |
| status | TEXT | `active` / `completed` / `paused` |
| current_question_index | INTEGER | 現在の質問インデックス |
| preset_id | UUID (FK → presets) | 紐づくプリセット |
| report_target | INTEGER | 目標問数 |
| report_instructions | TEXT | レポートカスタマイズ指示 |
| key_questions | JSONB | 探索テーマリスト |
| created_at / updated_at | TIMESTAMPTZ | |

### presets
| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID (PK) | |
| slug | TEXT (UNIQUE) | URL用スラッグ |
| admin_token | UUID (UNIQUE) | レガシー管理画面用トークン |
| user_id | UUID (FK → auth.users) | 作成者 |
| title | TEXT (NOT NULL) | アンケートタイトル |
| purpose | TEXT (NOT NULL) | 深掘りの目的 |
| background_text | TEXT | 説明文 |
| report_instructions | TEXT | レポートカスタマイズ |
| report_target | INTEGER | 目標問数 |
| key_questions | JSONB | 探索テーマ |
| fixed_questions | JSONB | 固定質問定義 |
| exploration_themes | JSONB | 探索テーマ |
| og_title / og_description / og_image | TEXT | OGP設定 |
| notification_email | TEXT | 通知用メール |
| created_at / updated_at | TIMESTAMPTZ | |

### questions
| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID (PK) | |
| session_id | UUID (FK) | |
| question_index | INTEGER | 1-indexed |
| statement | TEXT (NOT NULL) | 質問文 |
| detail | TEXT | 補足説明 |
| options | JSONB (NOT NULL) | 選択肢配列 |
| phase | TEXT | `exploration` / `deep-dive` / `reframing` |
| source | TEXT | `fixed` / `ai` |
| question_type | TEXT | `radio` / `checkbox` / `dropdown` / `text` / `textarea` / `scale` |
| scale_config | JSONB | 均等目盛の設定 |
| created_at | TIMESTAMPTZ | |
| UNIQUE(session_id, question_index) | | |

### answers
| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID (PK) | |
| question_id | UUID (FK) | |
| session_id | UUID (FK) | |
| selected_option | INTEGER (nullable) | 選択したオプションのインデックス |
| free_text | TEXT | 自由記述テキスト |
| selected_options | JSONB | チェックボックスの複数選択 |
| answer_text | TEXT | テキスト入力の回答 |
| created_at / updated_at | TIMESTAMPTZ | |
| UNIQUE(session_id, question_id) | | |

### analyses
| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID (PK) | |
| session_id | UUID (FK) | |
| batch_index | INTEGER | 何番目の5問バッチか |
| start_index / end_index | INTEGER | 対象質問範囲 |
| analysis_text | TEXT (NOT NULL) | 分析テキスト |
| created_at | TIMESTAMPTZ | |
| UNIQUE(session_id, batch_index) | | |

### reports
| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID (PK) | |
| session_id | UUID (FK) | |
| version | INTEGER | バージョン管理 |
| report_text | TEXT (NOT NULL) | レポート本文（Markdown） |
| created_at | TIMESTAMPTZ | |
| UNIQUE(session_id, version) | | |

### survey_reports
- プリセット横断の集約レポートを保存

## 8. API設計

全て `/src/app/api/` 配下。Zodでリクエスト検証。エラーメッセージは日本語。

### コア機能
| メソッド | パス | 概要 |
|----------|------|------|
| POST | `/api/sessions` | セッション作成 |
| GET | `/api/sessions/:id` | セッション全状態取得（質問・回答・分析・レポート） |
| POST | `/api/questions/generate` | 質問バッチ生成（5問） |
| POST | `/api/answers` | 回答保存（upsert） |
| POST | `/api/analysis/generate` | バッチ分析生成 |
| POST | `/api/report/generate` | 最終レポート生成 |

### プリセット管理
| メソッド | パス | 概要 |
|----------|------|------|
| POST | `/api/presets` | プリセット作成 |
| GET/PUT | `/api/presets/[slug]` | プリセット取得・更新 |
| POST | `/api/presets/generate-key-questions` | 探索テーマのAI生成 |
| POST | `/api/presets/generate-background` | 説明文のAI生成 |

### 管理者
| メソッド | パス | 概要 |
|----------|------|------|
| GET | `/api/admin/[token]` | プリセット情報取得 |
| GET | `/api/admin/[token]/responses` | 全回答一覧取得 |
| POST | `/api/admin/[token]/survey-report/generate` | 集約レポート生成 |

### その他
| メソッド | パス | 概要 |
|----------|------|------|
| GET | `/api/deepgram/key` | 音声入力用の一時APIキー取得 |

## 9. 画面構成

| パス | ページ | アクセス条件 |
|------|--------|-------------|
| `/lp` | ランディングページ | 公開 |
| `/` | ダッシュボード（アンケート一覧） | ログイン必須 |
| `/create` | アンケート作成 | ログイン必須 |
| `/solo` | ソロモード（個人壁打ち） | 公開 |
| `/login` | ログイン | 公開 |
| `/preset/[slug]` | プリセット入口（自動セッション作成→リダイレクト） | 公開 |
| `/session/[id]` | 質問回答フロー | 公開 |
| `/report/[id]` | レポート閲覧 | 公開 |
| `/report/[id]/print` | 印刷用レポート | 公開 |
| `/manage/[slug]` | 管理画面（認証ベース） | ログイン + 所有者のみ |
| `/admin/[token]` | レガシー管理画面（トークンベース） | トークン所持者 |
| `/auth/confirm` | 認証コールバック | システム |
| `/auth/signout` | サインアウト | POST |

## 10. 質問生成ロジック

### 10.1 コンテキスト制御
- 目的/背景は常に全文を送る
- 過去の質問/回答は全量を送る
- 探索テーマがある場合は指針として含める

### 10.2 生成タイミング
1. セッション開始時: 固定質問を先行配置 → AI質問の最初の5問を生成
2. 5問すべて回答されたら: 分析生成と次の5問生成を並列で開始
3. 目標問数到達: レポート生成可能に
4. 追加質問モード: 5問ずつ追加、レポートは新バージョンで再生成

### 10.3 AI質問の出力フォーマット
```json
{
  "questions": [
    {
      "statement": "30-50文字の質問文",
      "detail": "80-120文字の補足説明",
      "options": ["はい", "わからない", "いいえ", "中間的立場1", "中間的立場2", "中間的立場3"]
    }
  ]
}
```

## 11. 非機能要件

- スマホファースト（縦1列フロー）
- ライト/ダークモード対応（CSS変数ベース。LPのみライトモード強制）
- `prefers-reduced-motion` 対応
- APIキーはサーバー側のみ保持
- PDFの生ファイルはサーバーに保存しない
- OGP対応（プリセットごとのtitle/description/image）
- 印刷レイアウト対応（`@media print`）
- Web Share API対応

## 12. ブランチ戦略

| ブランチ | 用途 |
|----------|------|
| `main` | 本番環境（Vercel 自動デプロイ）。直接push/merge禁止 |
| `develop` | 開発ブランチ。pushでVercel Preview生成 |
| `feat/*` | 機能ブランチ。PRでdevelopにマージ |
