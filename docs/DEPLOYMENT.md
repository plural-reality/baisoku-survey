# Sonar セルフホストデプロイガイド

EC2 (NixOS) 上に Next.js アプリと Supabase を全て自前ホストする手順書。

## 全体像

```
ユーザー
  ↓ https://baisoku-survey.example.com
  ↓
[ EC2 (NixOS) ]
  ├── Nginx (HTTPS → 各サービスに振り分け)
  │     ├── baisoku-survey.example.com     → Next.js (:3000)
  │     └── supabase.example.com           → Kong (:8000)
  ├── Next.js standalone (systemd)
  └── Docker Compose (Supabase)
        ├── Kong        (API Gateway)
        ├── GoTrue      (認証: マジックリンク)
        ├── PostgREST   (DB → REST API)
        ├── PostgreSQL   (データベース)
        ├── postgres-meta
        └── Studio      (DB管理UI, :3100)
```

## 前提条件

ローカル PC に以下をインストール済みであること:

| ツール | インストール方法 | 用途 |
|--------|----------------|------|
| [Terraform](https://developer.hashicorp.com/terraform/install) | `brew install terraform` | サーバー構築 |
| [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) | `brew install awscli` | AWS 操作 |
| SSH キー | `ssh-keygen -t ed25519` | サーバー接続 |

AWS アカウントと、SMTP サービス（[Resend](https://resend.com) 推奨、月100通まで無料）が必要。

---

## ステップ 1: AWS の準備

### 1-1. AWS CLI の設定

```bash
aws configure
# AWS Access Key ID: <IAM で作成したキー>
# AWS Secret Access Key: <シークレットキー>
# Default region name: ap-northeast-1
# Default output format: json
```

> IAM ユーザーは AmazonEC2FullAccess ポリシーがあれば OK。

### 1-2. SSH Key Pair の作成

```bash
# ローカルで SSH キーを作成（まだなければ）
ssh-keygen -t ed25519 -f ~/.ssh/sonar-key -C "sonar-deploy"

# AWS にキーペアを登録
aws ec2 import-key-pair \
  --key-name sonar-key \
  --public-key-material fileb://~/.ssh/sonar-key.pub \
  --region ap-northeast-1
```

### 1-3. NixOS AMI ID を調べる

```bash
aws ec2 describe-images \
  --owners 427812963091 \
  --filters "Name=name,Values=NixOS-24.11*" "Name=architecture,Values=x86_64" \
  --query 'Images | sort_by(@, &CreationDate) | [-1].ImageId' \
  --output text \
  --region ap-northeast-1
```

出力された `ami-xxxxxxxxx` をメモしておく。

> 見つからない場合は [NixOS 公式の AMI 一覧](https://nixos.org/download/#nixos-amazon) で確認。

---

## ステップ 2: Terraform でサーバーを作る

### 2-1. 設定ファイルを作成

```bash
cd deploy/terraform

# テンプレートをコピー
cp terraform.tfvars.example terraform.tfvars
```

`terraform.tfvars` を編集:

```hcl
key_name  = "sonar-key"                    # ステップ 1-2 で作った名前
nixos_ami = "ami-xxxxxxxxxxxxxxxxx"        # ステップ 1-3 で調べた AMI ID

# 推奨: SSH を自分の IP だけに制限
# ssh_cidr = "203.0.113.50/32"             # 自分の IP（ https://checkip.amazonaws.com で確認）
```

### 2-2. サーバーを構築

```bash
# 初回のみ: Terraform の初期化（プラグインをダウンロード）
terraform init

# 何が作られるか確認（実際には何も作らない）
terraform plan

# 実行（EC2 が作られる。"yes" と入力して確定）
terraform apply
```

成功すると以下が表示される:

```
public_ip   = "13.xxx.xxx.xxx"
ssh_command = "ssh root@13.xxx.xxx.xxx"
```

**この IP アドレスをメモ**。DNS 設定で使う。

### 2-3. SSH 接続を確認

```bash
ssh -i ~/.ssh/sonar-key root@<public_ip>
```

> NixOS AMI のデフォルトユーザーは `root`。後ほど `deploy` ユーザーに切り替える。

---

## ステップ 3: DNS を設定する

ドメインの DNS 管理画面で **A レコード** を2つ追加:

| タイプ | ホスト名 | 値 |
|--------|---------|-----|
| A | `baisoku-survey` (または `@`) | `<public_ip>` |
| A | `supabase.baisoku-survey` | `<public_ip>` |

> 反映には数分〜数時間かかる。`ping baisoku-survey.example.com` で IP が返ればOK。

---

## ステップ 4: サーバーを設定する（NixOS）

### 4-1. NixOS 設定ファイルをコピー

ローカル PC から:

```bash
# configuration.nix をサーバーにコピー
scp -i ~/.ssh/sonar-key deploy/nixos/configuration.nix root@<public_ip>:/etc/nixos/configuration.nix
```

### 4-2. 設定を編集

サーバーに SSH して:

```bash
ssh -i ~/.ssh/sonar-key root@<public_ip>

# 設定ファイルを編集
nano /etc/nixos/configuration.nix
```

**変更する箇所（ファイル上部の `let` ブロック内）:**

```nix
let
  appDomain      = "baisoku-survey.your-domain.com";      # ← 自分のドメイン
  supabaseDomain = "supabase.baisoku-survey.your-domain.com"; # ← 自分のドメイン
  acmeEmail      = "you@example.com";                      # ← 自分のメール（SSL証明書用）

  sshKeys = [
    "ssh-ed25519 AAAA... you@your-machine"                 # ← 自分の公開鍵
  ];
```

> 公開鍵は `cat ~/.ssh/sonar-key.pub` で確認できる。

### 4-3. NixOS を適用

```bash
# hardware-configuration.nix を自動生成
nixos-generate-config

# 設定を適用（数分かかる）
nixos-rebuild switch
```

これで以下が自動セットアップされる:
- Docker
- Nginx（リバースプロキシ）
- ファイアウォール
- `deploy` ユーザー
- `sonar` サービスユーザー
- Let's Encrypt（SSL 証明書の自動取得）

### 4-4. deploy ユーザーで SSH できるか確認

ローカル PC から:

```bash
ssh -i ~/.ssh/sonar-key deploy@<public_ip>
```

以降は `deploy` ユーザーで作業する。

---

## ステップ 5: アプリをデプロイする

### 5-1. コードをサーバーにクローン

```bash
ssh -i ~/.ssh/sonar-key deploy@<public_ip>

# アプリディレクトリ作成 & クローン
sudo mkdir -p /opt/sonar
sudo chown deploy:users /opt/sonar
git clone https://github.com/plural-reality/baisoku-survey.git /opt/sonar
cd /opt/sonar
```

### 5-2. 秘密鍵を生成

```bash
bash deploy/scripts/generate-keys.sh
```

対話形式で聞かれるので入力:

```
アプリのドメイン: baisoku-survey.your-domain.com
Supabase APIのドメイン: supabase.baisoku-survey.your-domain.com
SMTP ホスト: smtp.resend.com
SMTP ポート: 587
SMTP ユーザー: resend
SMTP パスワード: re_xxxxxxxx
送信元メールアドレス: noreply@your-domain.com
送信者名: Sonar
OpenRouter API キー: sk-or-xxxxxxxx
```

これで3つのファイルが自動生成される:
- `deploy/supabase/.env` — Supabase 設定
- `deploy/supabase/volumes/api/kong.yml` — API ルーティング設定
- `.env.production` — Next.js 設定

### 5-3. Supabase を起動

```bash
cd /opt/sonar/deploy/supabase
docker-compose up -d
```

起動確認:

```bash
# 全コンテナが running か確認
docker-compose ps

# DB が ready か確認
docker-compose logs db | tail -5

# Kong が動いているか確認
curl -s http://localhost:8000/rest/v1/ -H "apikey: $(grep ANON_KEY .env | cut -d= -f2-)" | head
```

> 初回起動時にアプリのマイグレーション（テーブル作成）も自動実行される。

### 5-4. Next.js をビルド & 起動

```bash
cd /opt/sonar

# 依存関係インストール
npm ci

# ビルド
npm run build

# standalone に静的ファイルをコピー
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public

# /opt/sonar の所有者を sonar ユーザーに変更（読み取り用）
sudo chown -R sonar:sonar /opt/sonar/.next /opt/sonar/public

# サービス起動
sudo systemctl restart sonar

# 動作確認
sudo systemctl status sonar
curl -s http://localhost:3000 | head
```

---

## ステップ 6: 動作確認

ブラウザで以下にアクセス:

| URL | 期待する結果 |
|-----|-------------|
| `https://baisoku-survey.your-domain.com` | LP ページが表示される |
| `https://baisoku-survey.your-domain.com/login` | マジックリンクログイン画面 |
| `https://supabase.your-domain.com/rest/v1/` | JSON レスポンス（401 or テーブル一覧） |

### Studio にアクセスする（SSH トンネル経由）

Studio はセキュリティのため外部公開していない。SSH トンネルでアクセスする:

```bash
# ローカル PC で実行
ssh -i ~/.ssh/sonar-key -L 3100:localhost:3100 deploy@<public_ip>
```

ブラウザで http://localhost:3100 を開くと Supabase Studio が表示される。

---

## 日常運用

### 新しいコードをデプロイする

```bash
ssh -i ~/.ssh/sonar-key deploy@<public_ip>
cd /opt/sonar
bash deploy/scripts/deploy.sh
```

### ログを見る

```bash
# Next.js アプリのログ
sudo journalctl -u sonar -f

# Supabase のログ
cd /opt/sonar/deploy/supabase
docker-compose logs -f          # 全サービス
docker-compose logs -f auth     # 認証サーバーだけ
docker-compose logs -f db       # DB だけ
```

### マイグレーションを追加適用する

新しいマイグレーションファイルを追加した場合:

```bash
cd /opt/sonar
git pull
bash deploy/scripts/apply-migrations.sh 018_new_migration.sql
```

### Supabase を再起動する

```bash
cd /opt/sonar/deploy/supabase
docker-compose restart
```

### サーバーの状態確認

```bash
# サービス状態
sudo systemctl status sonar
sudo systemctl status supabase

# ディスク使用量
df -h

# メモリ使用量
free -h

# Docker コンテナ
docker ps
```

---

## トラブルシューティング

### SSL 証明書が取得できない

```
ACME challenge failed
```

- DNS の A レコードが正しい IP を指しているか確認（`dig baisoku-survey.example.com`）
- DNS 反映に時間がかかることがある（最大48時間、通常は数分）
- ポート 80 と 443 がセキュリティグループで開いているか確認

### マジックリンクのメールが届かない

```bash
# GoTrue のログを確認
cd /opt/sonar/deploy/supabase
docker-compose logs auth | grep -i "email\|smtp\|error"
```

- SMTP の設定（ホスト、ポート、ユーザー、パスワード）が正しいか確認
- Resend の場合: ダッシュボードでドメインが認証されているか確認
- `deploy/supabase/.env` の SMTP 設定を修正して `docker-compose restart auth`

### Next.js が起動しない

```bash
# ログを確認
sudo journalctl -u sonar --no-pager -n 50

# 手動で起動してみる
cd /opt/sonar
node .next/standalone/server.js
```

- `.env.production` が存在するか確認
- `NEXT_PUBLIC_SUPABASE_URL` が `https://supabase.your-domain.com` になっているか確認
- ビルドが成功しているか確認（`npm run build`）

### DB に接続できない

```bash
# DB コンテナの状態確認
cd /opt/sonar/deploy/supabase
docker-compose ps db
docker-compose logs db | tail -20

# 直接接続テスト
docker exec -it deploy-supabase-db-1 psql -U supabase_admin -d postgres -c "SELECT 1"
```

### サーバーを作り直したい

```bash
cd deploy/terraform
terraform destroy   # "yes" で確定。EC2 が削除される
terraform apply     # 新しく作り直し
```

> `terraform destroy` はサーバーとデータを完全に削除する。DB のバックアップが必要なら先に `pg_dump` する。

---

## サーバーを停止する（課金を止める）

```bash
cd deploy/terraform
terraform destroy
```

または AWS コンソールから EC2 インスタンスを停止（Stop）すれば一時的に課金を抑えられる（EBS 料金は継続）。

---

## 費用の目安

| リソース | 月額 (ap-northeast-1) |
|---------|----------------------|
| EC2 t3.medium (オンデマンド) | ~$40 |
| EBS 30GB gp3 | ~$3 |
| Elastic IP | $0（EC2 に紐付いていれば無料） |
| データ転送 | 100GB/月 まで無料枠 |
| **合計** | **~$43/月** |

> リザーブドインスタンス（1年契約）なら約30%安くなる。
