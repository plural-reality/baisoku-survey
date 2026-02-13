# Sonar（倍速アンケート）

AIを活用した内省支援プラットフォーム。主催者が目的・背景を設定し、AIが5問ずつ質問を生成→回答→分析を繰り返し、最終的に詳細なレポートを生成する。

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL + Auth)
- **AI**: OpenRouter API (google/gemini-3-flash-preview)
- **Styling**: Tailwind CSS v4

## ローカル開発セットアップ

### 前提条件

- Node.js 20+
- Docker Desktop（Supabase ローカル実行に必要）
- [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started)

```bash
# Supabase CLI インストール（未インストールの場合）
brew install supabase/tap/supabase
```

### 1. リポジトリのセットアップ

```bash
git clone <repo-url>
cd sonar
npm install
```

### 2. 環境変数の設定

```bash
cp .env.example .env.local
```

`.env.local` を編集し、`OPENROUTER_API_KEY` を設定してください。
Supabase の URL と Key は次のステップで自動生成されます。

### 3. ローカル Supabase の起動

```bash
supabase start
```

初回は Docker イメージのダウンロードに5〜10分かかります。
起動完了後、以下のような情報が表示されます:

```
         API URL: http://127.0.0.1:54321
      Studio URL: http://127.0.0.1:54323
     Mailpit URL: http://127.0.0.1:54324
 Publishable key: sb_publishable_xxxxx
```

**`.env.local` を更新**:
```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<上記の Publishable key>
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3000 でアクセスできます。

### ローカル開発で使えるツール

| ツール | URL | 用途 |
|--------|-----|------|
| **Next.js App** | http://localhost:3000 | メインアプリケーション |
| **Supabase Studio** | http://127.0.0.1:54323 | DB管理・テーブル閲覧・SQLエディタ |
| **Mailpit** | http://127.0.0.1:54324 | マジックリンクメール確認 |

### マジックリンク認証のローカルテスト

1. http://localhost:3000/login でメールアドレスを入力
2. http://127.0.0.1:54324 (Mailpit) でマジックリンクメールを確認
3. メール内のリンクをクリックしてログイン完了

> **注意**: ローカル環境ではメールは実際に送信されません。全て Mailpit に届きます。

### Supabase の操作

```bash
# ステータス確認
supabase status

# 停止
supabase stop

# DB リセット（全マイグレーションを再適用）
supabase db reset

# 新しいマイグレーション作成
supabase migration new <migration_name>
```

### トラブルシューティング

#### `supabase start` が失敗する

- Docker Desktop が起動しているか確認
- `supabase stop` してから `supabase start` を再実行
- マイグレーションエラーの場合: `supabase db reset` で全マイグレーションを再適用

#### `supabase status` で "No such container" エラー

Supabase が停止しています。`supabase start` で起動してください。

#### 認証コールバックで `/login?error=auth` にリダイレクトされる

ローカル Supabase の `site_url` と Next.js のポートが一致しているか確認してください（デフォルト: `http://127.0.0.1:3000`）。

## ブランチ戦略

| ブランチ | 用途 |
|----------|------|
| `main` | 本番環境（Vercel 自動デプロイ）。直接 push 禁止 |
| `develop` | 開発ブランチ。feature ブランチはここから切る |
| `feat/*` | 機能ブランチ。PR で develop にマージ |

> **重要**: `main` ブランチは本番 Vercel に接続されています。develop ブランチへの push で Vercel Preview が自動生成されます。

## コマンド一覧

```bash
npm run dev      # 開発サーバー起動
npm run build    # プロダクションビルド
npm run lint     # ESLint 実行
npm start        # プロダクションサーバー起動
```

## プロジェクト構成

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   ├── auth/              # 認証コールバック・サインアウト
│   ├── login/             # ログインページ
│   ├── manage/[slug]/     # プリセット管理画面
│   ├── preset/[slug]/     # プリセット回答画面
│   ├── report/[id]/       # レポート表示
│   └── session/[id]/      # セッション回答画面
├── components/            # UIコンポーネント
├── hooks/                 # カスタムhooks
└── lib/                   # ユーティリティ・設定
    ├── openrouter/        # AI API クライアント・プロンプト
    ├── presets/           # ハードコードプリセット
    ├── supabase/          # Supabase クライアント（server/client）
    └── utils/             # ユーティリティ
supabase/
├── config.toml            # Supabase ローカル設定
└── migrations/            # DBマイグレーション（001〜014）
```
