# 倍速アンケート — リファクタリング後テックスタック仕様書

> **本ドキュメントの目的**: AIコーディングエージェントがこのプロジェクトのコードを生成・修正する際に参照する、技術スタックの網羅的な仕様書。全ての実装判断はこのドキュメントに準拠すること。

## 1. アーキテクチャ概要

```
┌─────────────────────────────────────────────────────┐
│  Elm (Browser.application)                          │
│  UI: elm-ui (メイン) + elm-css (メディアクエリ)       │
│  API Client: servant-elm 自動生成                    │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP JSON (型は servant-elm が保証)
┌──────────────────────▼──────────────────────────────┐
│  Haskell Backend                                     │
│  Web: Servant                                        │
│  Effects: Polysemy                                   │
│  AI: OpenRouter API (google/gemini-3-flash-preview)  │
└──────────────────────┬──────────────────────────────┘
                       │ Haskell ADT 直接永続化
┌──────────────────────▼──────────────────────────────┐
│  Project:M36                                         │
│  イベントストア + プロジェクション                      │
│  トランザクショングラフ = 追加安全網                    │
└─────────────────────────────────────────────────────┘
```

### 設計原則

1. **型で制約する**: 文字列・JSON・Any型を可能な限り排除し、ADTとnewtypeで表現する
2. **イベントが一次データ**: ドメインイベントはappend-only。プロジェクションはキャッシュ
3. **境界を自動生成で繋ぐ**: Haskell ↔ Elm のAPI境界は servant-elm でコード生成し、手書きしない
4. **エフェクトで分離する**: ビジネスロジックはPolysemyエフェクトで記述し、インフラ実装と分離する


## 2. バックエンド

### 2.1 言語・フレームワーク

| レイヤー | 技術 | 役割 |
|----------|------|------|
| Web API | **Servant** | 型レベルAPI定義、ルーティング、リクエスト/レスポンスのシリアライズ |
| エフェクトシステム | **Polysemy** | ビジネスロジックのエフェクト抽象化 |
| データベース | **Project:M36** | 関係代数DB、HaskellのADTを直接永続化 |
| AI連携 | **OpenRouter API** | HTTP client (servant-client or http-conduit) 経由 |
| 認証 | **Supabase Auth** 互換 or 自前JWT | マジックリンク認証 |
| バリデーション | Servantの型レベル制約 | リクエスト検証はServantの型で表現。Zodは不要 |

### 2.2 Servantによる型レベルAPI定義

Servant APIは型として定義する。このAPIの型からElmクライアントコードが自動生成される。

```haskell
type BaisokuAPI =
       -- セッション
       "api" :> "sessions" :> ReqBody '[JSON] CreateSessionReq :> Post '[JSON] SessionId
  :<|> "api" :> "sessions" :> Capture "id" SessionId :> Get '[JSON] SessionState

       -- 質問生成
  :<|> "api" :> "questions" :> "generate" :> ReqBody '[JSON] GenerateQuestionsReq :> Post '[JSON] [QuestionData]

       -- 回答
  :<|> "api" :> "answers" :> ReqBody '[JSON] SubmitAnswerReq :> Post '[JSON] AnswerResult

       -- 分析
  :<|> "api" :> "analysis" :> "generate" :> ReqBody '[JSON] GenerateAnalysisReq :> Post '[JSON] AnalysisData

       -- レポート
  :<|> "api" :> "report" :> "generate" :> ReqBody '[JSON] GenerateReportReq :> Post '[JSON] ReportData

       -- プリセット
  :<|> "api" :> "presets" :> ReqBody '[JSON] CreatePresetReq :> Post '[JSON] PresetId
  :<|> "api" :> "presets" :> Capture "slug" Text :> Get '[JSON] PresetData
  :<|> "api" :> "presets" :> Capture "slug" Text :> ReqBody '[JSON] UpdatePresetReq :> Put '[JSON] PresetData

       -- プリセット AI生成
  :<|> "api" :> "presets" :> "generate-key-questions" :> ReqBody '[JSON] GenKeyQuestionsReq :> Post '[JSON] [ExplorationTheme]
  :<|> "api" :> "presets" :> "generate-background" :> ReqBody '[JSON] GenBackgroundReq :> Post '[JSON] BackgroundText

       -- 管理者
  :<|> "api" :> "admin" :> Capture "token" AdminToken :> Get '[JSON] PresetData
  :<|> "api" :> "admin" :> Capture "token" AdminToken :> "responses" :> Get '[JSON] [ResponseSummary]
  :<|> "api" :> "admin" :> Capture "token" AdminToken :> "survey-report" :> "generate" :> Post '[JSON] SurveyReportData

       -- Elm SPA配信 (全ての未マッチパスにindex.htmlを返す)
  :<|> Raw
```

#### リクエスト/レスポンス型

全てのリクエスト・レスポンス型は専用のモジュールに定義し、`ToJSON`/`FromJSON`/`Elm`インスタンスを持たせる。

```haskell
-- src/BaisokuAnketo/Api/Types.hs
module BaisokuAnketo.Api.Types where

-- リクエスト型には必ず Req サフィックス
data CreateSessionReq = CreateSessionReq
  { csrPresetSlug :: Maybe Text
  , csrTitle      :: Text
  , csrPurpose    :: Text
  } deriving (Generic, ToJSON, FromJSON, Elm)

-- レスポンス型にはドメインに即した名前
data SessionState = SessionState
  { ssSession   :: SessionProjection
  , ssQuestions :: [QuestionProjection]
  , ssAnswers   :: [AnswerProjection]
  , ssAnalyses  :: [AnalysisProjection]
  , ssReports   :: [ReportProjection]
  } deriving (Generic, ToJSON, FromJSON, Elm)
```

**制約**: API型にプリミティブ型を直接使わない。`SessionId`, `PresetId`, `BatchIndex` などのnewtypeを一貫して使う。


### 2.3 Polysemyエフェクト設計

ビジネスロジックはPolysemyエフェクトとして定義する。Servantハンドラーはエフェクトの呼び出しのみを行い、ロジックを含まない。

```haskell
-- =============================================================================
-- エフェクト定義
-- =============================================================================

-- | セッション管理
data SessionEffect m a where
  CreateSession    :: CreateSessionReq -> SessionEffect m SessionId
  GetSessionState  :: SessionId -> SessionEffect m SessionState
  UpdateStatus     :: SessionId -> SessionStatus -> SessionEffect m ()
makeSem ''SessionEffect

-- | 質問管理
data QuestionEffect m a where
  PlaceFixedQuestions   :: SessionId -> [FixedQuestionDef] -> QuestionEffect m [QuestionId]
  GenerateAiQuestions   :: SessionId -> BatchIndex -> Phase -> QuestionEffect m [QuestionData]
makeSem ''QuestionEffect

-- | 回答管理
data AnswerEffect m a where
  SubmitAnswer  :: SessionId -> QuestionId -> AnswerValue -> AnswerEffect m AnswerResult
  ReviseAnswer  :: SessionId -> QuestionId -> AnswerValue -> AnswerEffect m AnswerResult
makeSem ''AnswerEffect

-- | 分析・レポート
data AnalysisEffect m a where
  GenerateAnalysis :: SessionId -> BatchIndex -> AnalysisEffect m AnalysisData
  GenerateReport   :: SessionId -> AnalysisEffect m ReportData
makeSem ''AnalysisEffect

-- | AI呼び出し (OpenRouter)
data AiEffect m a where
  AiGenerateQuestions :: AiQuestionContext -> AiEffect m [GeneratedQuestion]
  AiGenerateAnalysis  :: AiAnalysisContext -> AiEffect m Text
  AiGenerateReport    :: AiReportContext -> AiEffect m Text
  AiGenerateThemes    :: Text -> AiEffect m [ExplorationTheme]
  AiGenerateBackground :: Text -> AiEffect m Text
makeSem ''AiEffect

-- | 永続化 (Project:M36)
data PersistenceEffect m a where
  AppendEvent       :: SessionId -> SurveyEvent -> PersistenceEffect m EventId
  QueryProjection   :: (forall ctx. RelationalExpr) -> PersistenceEffect m (Relation)
  -- ... 他のクエリ操作
makeSem ''PersistenceEffect
```

#### Servantハンドラーの実装パターン

```haskell
-- ハンドラーはエフェクトの呼び出しのみ。ロジックを含まない。
submitAnswerHandler
  :: Members '[AnswerEffect, Error AppError] r
  => SubmitAnswerReq -> Sem r AnswerResult
submitAnswerHandler req =
  submitAnswer (sarSessionId req) (sarQuestionId req) (sarValue req)
```

#### インタープリターの分離

```haskell
-- 本番用: M36 + OpenRouter
runAppEffects :: AppConfig -> Sem '[...] a -> IO a
runAppEffects cfg = runM
  . runPersistenceM36 (cfgM36Connection cfg)
  . runAiOpenRouter (cfgOpenRouterKey cfg)
  . runSessionEffectReal
  . runQuestionEffectReal
  . runAnswerEffectReal
  . runAnalysisEffectReal

-- テスト用: インメモリ
runTestEffects :: Sem '[...] a -> IO a
runTestEffects = runM
  . runPersistenceInMemory
  . runAiMock
  . runSessionEffectReal
  . runQuestionEffectReal
  . runAnswerEffectReal
  . runAnalysisEffectReal
```


### 2.4 Project:M36 スキーマ

#### relvar一覧

| relvar | 種別 | 説明 |
|--------|------|------|
| `session_events` | イベントストア | 全ドメインイベント (append-only) |
| `sessions` | プロジェクション | セッション現在状態 |
| `questions` | プロジェクション | 質問一覧 |
| `answers` | プロジェクション | 回答 (最新値) |
| `analyses` | プロジェクション | バッチ分析 |
| `reports` | プロジェクション | レポート (全バージョン) |
| `presets` | マスター (CRUD) | アンケートテンプレート |

#### ドメインイベント型

```haskell
-- イベントストアのスキーマ
-- session_events : {event_id EventId, session_id SessionId, event SurveyEvent, occurred_at UTCTime}
-- key: {event_id}

data SurveyEvent
  = SSession  SessionEvent
  | SQuestion QuestionEvent
  | SAnswer   AnswerEvent
  | SAnalysis AnalysisEvent
  | SReport   ReportEvent
  deriving (Generic, Atomable, Eq, Show)

data SessionEvent
  = SessionCreated
      { sePresetId           :: Maybe PresetId
      , seTitle              :: Text
      , sePurpose            :: Text
      , seBackgroundText     :: Text
      , seReportTarget       :: Int
      , seReportInstructions :: Text
      , seExplorationThemes  :: [ExplorationTheme]
      }
  | SessionStatusChanged { seNewStatus :: SessionStatus }
  deriving (Generic, Atomable, Eq, Show)

data QuestionEvent
  = FixedQuestionsPlaced  { qeQuestions :: [FixedQuestionDef] }
  | AiBatchGenerated      { qeBatchIndex :: BatchIndex, qePhase :: Phase, qeQuestions :: [GeneratedQuestion] }
  deriving (Generic, Atomable, Eq, Show)

data AnswerEvent
  = AnswerSubmitted { aeQuestionId :: QuestionId, aeValue :: AnswerValue }
  | AnswerRevised   { aeQuestionId :: QuestionId, aePrevValue :: AnswerValue, aeNewValue :: AnswerValue }
  deriving (Generic, Atomable, Eq, Show)

data AnalysisEvent
  = AnalysisGenerated { anBatchIndex :: BatchIndex, anStartIndex :: QuestionIndex, anEndIndex :: QuestionIndex, anText :: Text }
  deriving (Generic, Atomable, Eq, Show)

data ReportEvent
  = ReportGenerated { reVersion :: ReportVersion, reText :: Text }
  deriving (Generic, Atomable, Eq, Show)
```

#### 回答値の直和型

```haskell
data AnswerValue
  = SingleChoice Int
  | MultipleChoice [Int]
  | TextAnswer Text
  | ChoiceWithComment Int Text
  deriving (Generic, Atomable, Eq, Show)
```

#### トランザクションパターン

イベント挿入とプロジェクション更新は必ず同一M36トランザクション (`MultipleExpr`) で実行する:

```haskell
submitAnswerTx :: SessionId -> QuestionId -> AnswerValue -> UTCTime -> DatabaseContextExpr
submitAnswerTx sid qid val now = MultipleExpr
  [ -- 1. イベント追記
    insertEvent sid (SAnswer (AnswerSubmitted qid val)) now
  , -- 2. プロジェクション更新 (delete + insert = upsert)
    deleteAnswerProjection sid qid
  , insertAnswerProjection sid qid val 0 now now
  ]
```

#### プロジェクション再構築

障害復旧・デバッグ用に、イベントストアからプロジェクションを再構築する関数を必ず用意する:

```haskell
rebuildProjections :: SessionId -> DatabaseContextExpr
-- session_events から sid のイベントを occurred_at 順に取得し、
-- 空のプロジェクション状態から fold して現在の状態を構築し、
-- プロジェクション relvars を上書きする
```


### 2.5 AI連携 (OpenRouter)

| 設定 | 値 |
|------|-----|
| エンドポイント | `https://openrouter.ai/api/v1/chat/completions` |
| モデル | `google/gemini-3-flash-preview` |
| APIキー | サーバー側環境変数のみ。フロントエンドに露出させない |

#### コンテキスト制御ルール

- 目的 (`purpose`) と背景 (`background_text`) は常に全文をプロンプトに含める
- 過去の質問・回答は全量を含める（トークン制限に達するまで）
- 探索テーマ (`exploration_themes`) がある場合はフェーズに応じて指針として含める
- フェーズ情報 (`Phase`) をシステムプロンプトに含め、生成の方向性を制御する

#### 生成タイミング

1. セッション作成時: 固定質問を先行配置 → AI質問の最初の5問を生成
2. 5問すべて回答完了時: 分析生成と次の5問生成を**並列実行** (`Polysemy.Async`)
3. 目標問数到達: レポート生成可能
4. 追加質問モード: 5問ずつ追加、レポートは新バージョンで再生成


### 2.6 認証

Supabase Authからの移行方針:

| 方式 | 実装 |
|------|------|
| マジックリンク | メール送信 → JWT発行 (jose ライブラリ) |
| セッション管理 | Servantの`AuthProtect`で保護エンドポイントを型レベルで区別 |
| 認可 | 管理画面: JWT内のuser_idとプリセットのowner_idを照合 |
| レガシー | `/admin/[token]`: トークン直接照合 (認証不要) |
| 回答者 | 認証不要。session_idのみで識別 |

```haskell
-- 認証が必要なエンドポイントと不要なエンドポイントが型で区別される
type ProtectedAPI =
       AuthProtect "jwt" :> "api" :> "presets" :> ReqBody '[JSON] CreatePresetReq :> Post '[JSON] PresetId
  :<|> AuthProtect "jwt" :> "api" :> "manage" :> Capture "slug" Text :> Get '[JSON] ManageData

type PublicAPI =
       "api" :> "sessions" :> ReqBody '[JSON] CreateSessionReq :> Post '[JSON] SessionId
  :<|> "api" :> "preset" :> Capture "slug" Text :> Get '[JSON] PresetPublicData
```


## 3. フロントエンド

### 3.1 Elm アプリケーション構成

| 項目 | 選択 | 理由 |
|------|------|------|
| アプリケーション型 | `Browser.application` | URLルーティングが必要 |
| UIライブラリ | **elm-ui** (メイン) | 型安全なレイアウト、バイブコーディング耐性 |
| CSS補助 | **elm-css** (部分的) | メディアクエリ対応 (`@media print`, ダークモード) |
| APIクライアント | **servant-elm 自動生成** | Haskellとの型一貫性保証 |
| ルーティング | `Url.Parser` | `Browser.application`のURL解析 |

#### elm-pagesは使わない

理由: Servantがバックエンドを担うため、SSGフレームワークは二重構造になる。動的コンテンツ中心のアプリにSSGの恩恵は薄い。


### 3.2 elm-ui スタイリングルール

#### 基本原則

```elm
-- ✅ 正しい: elm-ui で型安全にレイアウト
view model =
    column [ spacing 24, padding 24, width fill ]
        [ el [ Region.heading 1, Font.size 24, Font.bold ] (text model.title)
        , submitButton model
        ]

submitButton model =
    Input.button
        [ Background.color (rgb255 59 130 246)
        , Font.color (rgb255 255 255 255)
        , Border.rounded 8
        , paddingXY 16 8
        ]
        { onPress = Just SubmitClicked
        , label = text "回答する"
        }

-- ❌ 禁止: Tailwindクラス名の文字列
view model =
    div [ class "flex flex-col gap-4 p-6" ] [ ... ]
```

#### レスポンシブ対応

```elm
-- elm-ui のレスポンシブはDevice判定で分岐
view model =
    let
        device = classifyDevice model.windowSize
    in
    case device.class of
        Phone ->
            column [ width fill, padding 16 ] [ ... ]
        _ ->
            column [ width (maximum 720 fill), centerX, padding 32 ] [ ... ]
```

#### カラーシステム

テーマカラーは専用モジュールで一元管理する:

```elm
-- src/UI/Theme.elm
module UI.Theme exposing (..)

import Element exposing (Color, rgb255)

-- プライマリ
primary : Color
primary = rgb255 59 130 246

primaryHover : Color
primaryHover = rgb255 37 99 235

-- セマンティック
success : Color
success = rgb255 34 197 94

warning : Color
warning = rgb255 234 179 8

danger : Color
danger = rgb255 239 68 68

-- テキスト
textPrimary : Color
textPrimary = rgb255 17 24 39

textSecondary : Color
textSecondary = rgb255 107 114 128

-- 背景
bgPrimary : Color
bgPrimary = rgb255 255 255 255

bgSecondary : Color
bgSecondary = rgb255 249 250 251
```

#### elm-ui で表現できない部分 → elm-css

以下の場合のみ `Html.Styled` (elm-css) にフォールバックする:

1. **印刷レイアウト**: `@media print` で非表示要素の制御
2. **ダークモード**: `prefers-color-scheme: dark` の検出
3. **アニメーション**: `@keyframes` / `transition`
4. **`prefers-reduced-motion`**: アクセシビリティ対応

```elm
-- elm-css でメディアクエリを使う場合
import Css
import Css.Media
import Html.Styled
import Html.Styled.Attributes exposing (css)

printHidden : Html.Styled.Attribute msg
printHidden =
    css
        [ Css.Media.withMedia [ Css.Media.print ]
            [ Css.display Css.none ]
        ]
```

**制約**: elm-css は上記4ケースのみに限定する。レイアウトやスタイリングの基本はelm-uiで行う。


### 3.3 Elmモジュール構成

```
frontend/src/
├── Main.elm                    -- エントリポイント、Browser.application
├── Route.elm                   -- URL定義とパーサー
├── Session.elm                 -- フラグ、共有状態
│
├── Page/                       -- ページモジュール (各ページが独立した TEA)
│   ├── Landing.elm             -- /lp
│   ├── Dashboard.elm           -- / (ログイン必須)
│   ├── Create.elm              -- /create
│   ├── Solo.elm                -- /solo
│   ├── Login.elm               -- /login
│   ├── PresetEntry.elm         -- /preset/[slug] (セッション作成→リダイレクト)
│   ├── QuestionFlow.elm        -- /session/[id] (質問回答フロー)
│   ├── Report.elm              -- /report/[id]
│   ├── ReportPrint.elm         -- /report/[id]/print
│   ├── Manage.elm              -- /manage/[slug]
│   └── AdminLegacy.elm         -- /admin/[token]
│
├── UI/                         -- 共有UIコンポーネント
│   ├── Theme.elm               -- カラー、フォント、スペーシング定数
│   ├── Button.elm              -- ボタンバリアント
│   ├── Card.elm                -- カード
│   ├── QuestionCard.elm        -- 質問表示カード (AI質問の3+1構造)
│   ├── FixedQuestionCard.elm   -- 固定質問表示 (ラジオ/チェック/プルダウン/テキスト/目盛)
│   ├── AnalysisCard.elm        -- 分析表示
│   ├── ReportView.elm          -- レポートMarkdownレンダリング + 引用カード
│   ├── ProgressBar.elm         -- 進捗バー
│   └── MediaQuery.elm          -- elm-css フォールバック (print, darkmode)
│
├── Domain/                     -- ドメイン型 (servant-elm 生成物をラップ)
│   ├── Session.elm
│   ├── Question.elm
│   ├── Answer.elm
│   ├── Analysis.elm
│   ├── Report.elm
│   └── Preset.elm
│
├── Api/                        -- servant-elm 自動生成 (手動編集禁止)
│   └── Generated.elm           -- servant-elm が生成するモジュール
│
└── Ports.elm                   -- JavaScript interop (LocalStorage, Web Share, Deepgram)
```

#### ルーティング

```elm
-- src/Route.elm
type Route
    = Landing
    | Dashboard
    | Create
    | Solo
    | Login
    | PresetEntry String            -- slug
    | QuestionFlow SessionId        -- session UUID
    | ReportView SessionId
    | ReportPrint SessionId
    | Manage String                 -- slug
    | AdminLegacy String            -- token
    | NotFound

routeParser : Url.Parser.Parser (Route -> a) a
routeParser =
    Url.Parser.oneOf
        [ Url.Parser.map Landing (Url.Parser.s "lp")
        , Url.Parser.map Dashboard Url.Parser.top
        , Url.Parser.map Create (Url.Parser.s "create")
        , Url.Parser.map Solo (Url.Parser.s "solo")
        , Url.Parser.map Login (Url.Parser.s "login")
        , Url.Parser.map PresetEntry (Url.Parser.s "preset" </> Url.Parser.string)
        , Url.Parser.map QuestionFlow (Url.Parser.s "session" </> sessionIdParser)
        , Url.Parser.map ReportView (Url.Parser.s "report" </> sessionIdParser)
        , Url.Parser.map ReportPrint (Url.Parser.s "report" </> sessionIdParser </> Url.Parser.s "print")
        , Url.Parser.map Manage (Url.Parser.s "manage" </> Url.Parser.string)
        , Url.Parser.map AdminLegacy (Url.Parser.s "admin" </> Url.Parser.string)
        ]
```


### 3.4 AI質問の3+1構造 UI

```elm
-- 「はい / わからない / いいえ」の3ボタンを横並び表示
-- 「どちらでもない」展開で中間的立場3つ + 自由記述

type QuestionUIState
    = Collapsed           -- 3ボタンのみ表示
    | Expanded            -- 中間的立場 + 自由記述も表示
    | Answered AnswerValue

viewAiQuestion : Question -> QuestionUIState -> Element Msg
viewAiQuestion question state =
    column [ spacing 16, width fill ]
        [ -- 質問文
          paragraph [ Font.size 16 ] [ text question.statement ]
        , -- 補足説明
          paragraph [ Font.size 14, Font.color Theme.textSecondary ] [ text question.detail ]
        , -- 3ボタン (はい / わからない / いいえ)
          row [ spacing 12, width fill ]
              [ choiceButton "はい" 0 question.id
              , choiceButton "わからない" 1 question.id
              , choiceButton "いいえ" 2 question.id
              ]
        , -- 展開エリア
          case state of
              Expanded ->
                  column [ spacing 8, width fill ]
                      [ choiceButton question.options[3] 3 question.id
                      , choiceButton question.options[4] 4 question.id
                      , choiceButton question.options[5] 5 question.id
                      , freeTextInput question.id
                      ]
              _ ->
                  Input.button [ Font.size 14, Font.color Theme.textSecondary ]
                      { onPress = Just (ExpandOptions question.id)
                      , label = text "どちらでもない"
                      }
        ]
```


### 3.5 Ports (JavaScript Interop)

Elm から JavaScript の世界にアクセスが必要な機能:

```elm
-- src/Ports.elm

-- LocalStorage (セッションID管理、最大20件)
port saveSessionId : String -> Cmd msg
port loadSessionIds : () -> Cmd msg
port onSessionIdsLoaded : (List String -> msg) -> Sub msg

-- Web Share API
port shareUrl : { title : String, url : String } -> Cmd msg

-- クリップボードコピー
port copyToClipboard : String -> Cmd msg
port onCopyResult : (Bool -> msg) -> Sub msg

-- Deepgram STT (音声入力モード)
port startDeepgramSession : String -> Cmd msg   -- API key
port stopDeepgramSession : () -> Cmd msg
port onTranscript : (String -> msg) -> Sub msg

-- ダークモード検出
port onDarkModeChange : (Bool -> msg) -> Sub msg

-- ウィンドウサイズ (elm-uiのclassifyDevice用)
port onWindowResize : ({ width : Int, height : Int } -> msg) -> Sub msg
```


## 4. API境界: servant-elm

### 4.1 コード生成フロー

```
Haskell API型定義 (BaisokuAPI)
        │
        │  ビルド時に generateElmModule 実行
        ▼
frontend/src/Api/Generated.elm (自動生成)
        │
        │  Elm compiler が型チェック
        ▼
型の不整合 → コンパイルエラー (実行前に検出)
```

### 4.2 生成スクリプト

```haskell
-- codegen/Main.hs
module Main where

import Servant.Elm (defElmImports, defElmOptions, generateElmModuleWith)
import BaisokuAnketo.Api (BaisokuAPI)

main :: IO ()
main = generateElmModuleWith
  defElmOptions
  ["Api", "Generated"]
  defElmImports
  "frontend/src"
  (Proxy :: Proxy BaisokuAPI)
```

### 4.3 ルール

- `frontend/src/Api/Generated.elm` は**手動編集禁止**。gitignoreに入れてもよいが、CIで再生成して差分がないことを検証する
- Haskell側のAPI型を変更したら、必ず `cabal run codegen` を実行する
- 生成されたElmコードをラップする `Domain/` モジュールで、アプリ固有の変換やデフォルト値を追加する


## 5. ビルドシステム

### 5.1 Nix Flake

プロジェクト全体をNix flakeで管理する:

```nix
{
  description = "倍速アンケート";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    # Project:M36 は別途overlay or source input
  };

  outputs = { self, nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in {
        packages = {
          backend = pkgs.haskellPackages.callCabal2nix "baisoku-anketo" ./. {};
          frontend = pkgs.elmPackages.buildElmProject { src = ./frontend; };
          codegen = /* servant-elm コード生成 */;
        };

        devShells.default = pkgs.mkShell {
          buildInputs = [
            pkgs.haskellPackages.cabal-install
            pkgs.haskellPackages.ghc
            pkgs.haskellPackages.haskell-language-server
            pkgs.elmPackages.elm
            pkgs.elmPackages.elm-format
            pkgs.elmPackages.elm-test
            # Project:M36
          ];
        };

        checks = {
          # CIで servant-elm 生成コードの一貫性を検証
          elm-codegen-consistent = /* codegen実行後にgit diffが空であること */;
        };
      }
    );
}
```

### 5.2 ビルド手順

```bash
# 1. 開発環境に入る
nix develop

# 2. servant-elm コード生成
cabal run codegen

# 3. Elm ビルド
cd frontend && elm make src/Main.elm --output=dist/main.js

# 4. Haskell バックエンドビルド
cabal build

# 5. 実行 (バックエンドが Elm の成果物も配信)
cabal run baisoku-anketo-server
```

### 5.3 CI チェック項目

1. `cabal build` が通ること
2. `elm make` が通ること
3. servant-elm 生成コードに差分がないこと (API型とElmクライアントの一貫性)
4. `elm-test` が通ること
5. Haskell テスト (`cabal test`) が通ること


## 6. プロジェクトディレクトリ構成

```
baisoku-anketo/
├── flake.nix                          -- Nix flake (全体のビルド定義)
├── flake.lock
├── cabal.project
├── baisoku-anketo.cabal
│
├── src/                               -- Haskell ソース
│   └── BaisokuAnketo/
│       ├── Api.hs                     -- Servant API型定義 (BaisokuAPI)
│       ├── Api/
│       │   ├── Types.hs              -- リクエスト/レスポンス型
│       │   └── Handlers.hs           -- Servantハンドラー (薄い)
│       ├── Domain/
│       │   ├── Types.hs              -- ドメイン型 (ADT, newtype)
│       │   ├── Events.hs             -- ドメインイベント定義
│       │   └── Phases.hs             -- フェーズシステムロジック
│       ├── Effects/
│       │   ├── Session.hs            -- SessionEffect
│       │   ├── Question.hs           -- QuestionEffect
│       │   ├── Answer.hs             -- AnswerEffect
│       │   ├── Analysis.hs           -- AnalysisEffect
│       │   ├── Ai.hs                 -- AiEffect
│       │   └── Persistence.hs        -- PersistenceEffect
│       ├── Interpreters/
│       │   ├── M36.hs                -- Project:M36 インタープリター
│       │   ├── OpenRouter.hs         -- OpenRouter AI インタープリター
│       │   ├── Auth.hs               -- 認証インタープリター
│       │   └── InMemory.hs           -- テスト用インメモリ
│       ├── M36/
│       │   ├── Schema.hs             -- relvar定義、初期化
│       │   ├── Transactions.hs       -- トランザクション構築ヘルパー
│       │   └── Rebuild.hs            -- プロジェクション再構築
│       ├── Ai/
│       │   ├── Prompts.hs            -- プロンプトテンプレート
│       │   └── Context.hs            -- コンテキスト構築ロジック
│       ├── Auth/
│       │   ├── MagicLink.hs          -- マジックリンク送信
│       │   └── Jwt.hs                -- JWT発行・検証
│       ├── Config.hs                 -- 環境設定
│       └── Server.hs                 -- Warp起動、ミドルウェア
│
├── codegen/                           -- servant-elm コード生成
│   └── Main.hs
│
├── test/                              -- Haskell テスト
│   ├── Domain/
│   │   └── EventFoldSpec.hs          -- イベント fold のプロパティテスト
│   ├── Api/
│   │   └── HandlersSpec.hs           -- API結合テスト (InMemoryインタープリター)
│   └── M36/
│       └── TransactionsSpec.hs       -- M36トランザクションテスト
│
├── frontend/                          -- Elm ソース
│   ├── elm.json
│   ├── src/
│   │   ├── Main.elm
│   │   ├── Route.elm
│   │   ├── Session.elm
│   │   ├── Ports.elm
│   │   ├── Page/                     -- 各ページ
│   │   ├── UI/                       -- 共有UIコンポーネント
│   │   ├── Domain/                   -- ドメイン型ラッパー
│   │   └── Api/
│   │       └── Generated.elm         -- servant-elm 自動生成 (手動編集禁止)
│   ├── tests/
│   └── dist/                         -- ビルド成果物
│       ├── index.html
│       └── main.js
│
└── static/                            -- 静的ファイル (OGP画像など)
```


## 7. 制約・禁止事項

バイブコーディング時にAIコーディングエージェントが守るべきルール:

### 7.1 型の制約

| ルール | 理由 |
|--------|------|
| プリミティブ型を直接使わない。`SessionId`, `QuestionId` 等のnewtypeを使う | 引数の取り違えをコンパイル時に検出 |
| `String` を使わない。`Text` を使う | Haskell/Elmの両方で一貫 |
| 部分関数を使わない (`head`, `tail`, `!!`, `fromJust`) | ランタイムクラッシュ防止 |
| JSON を手動でパース/シリアライズしない | servant-elm が保証する |
| `Any` 型, `Dynamic` 型を使わない | 型安全性の穴を作らない |

### 7.2 アーキテクチャの制約

| ルール | 理由 |
|--------|------|
| Servantハンドラーにビジネスロジックを書かない | エフェクトに委譲する |
| フロントエンドからDBに直接アクセスしない | 全てServant API経由 |
| `frontend/src/Api/Generated.elm` を手動編集しない | servant-elmで再生成される |
| イベントストア (`session_events`) を更新・削除しない | append-onlyが前提 |
| プロジェクションの更新はイベント挿入と同一トランザクションで行う | 不整合防止 |
| elm-css は印刷/ダークモード/アニメーション/reduced-motionのみに使う | elm-uiがメイン |
| Tailwind, inline style文字列を使わない | 型安全でない |

### 7.3 命名規則

| 対象 | 規則 | 例 |
|------|------|-----|
| Haskell モジュール | PascalCase, ドット区切り | `BaisokuAnketo.Domain.Events` |
| Haskell 型 | PascalCase | `SessionStatus`, `AnswerValue` |
| Haskell 関数 | camelCase | `submitAnswer`, `generateQuestions` |
| Haskell リクエスト型 | `*Req` サフィックス | `CreateSessionReq` |
| Polysemy エフェクト | `*Effect` サフィックス | `SessionEffect` |
| Elm モジュール | PascalCase, スラッシュ区切り | `Page.QuestionFlow`, `UI.Theme` |
| Elm メッセージ | PascalCase, 動詞 + 名詞 | `SubmitClicked`, `AnswerReceived` |
| M36 relvar | snake_case | `session_events`, `questions` |
| API パス | kebab-case | `/api/questions/generate` |

### 7.4 エラーハンドリング

```haskell
-- カスタムエラー型を定義。文字列エラーメッセージを禁止。
data AppError
  = SessionNotFound SessionId
  | QuestionNotFound QuestionId
  | UnauthorizedAccess
  | PresetNotFound Text            -- slug
  | InvalidBatchIndex BatchIndex
  | AiGenerationFailed Text        -- AIのエラーメッセージのみ Text 許可
  | M36Error DatabaseError
  deriving (Generic, Show)

-- Polysemy の Error エフェクトで伝播
type AppEffects = '[SessionEffect, QuestionEffect, AnswerEffect, AnalysisEffect, AiEffect, PersistenceEffect, Error AppError, Embed IO]
```

```elm
-- Elm側も対応するエラー型を持つ (servant-elm が生成)
type ApiError
    = SessionNotFound String
    | Unauthorized
    | NetworkError Http.Error
    | Unknown String
```


## 8. 移行計画

現在のNext.js + Supabase構成からの段階的移行:

| フェーズ | 作業 | 完了条件 |
|----------|------|----------|
| 0. 準備 | Nix flake でHaskell + Elm開発環境構築 | `nix develop` でGHC + Elm + M36が使える |
| 1. ドメイン型 | `Domain/Types.hs`, `Domain/Events.hs` を定義 | 全ADTがコンパイル通る |
| 2. M36スキーマ | relvar定義、初期化、基本トランザクション | イベント挿入 + プロジェクション更新が動く |
| 3. Polysemyエフェクト | エフェクト定義 + InMemoryインタープリター | テストが通る |
| 4. Servant API | API型定義 + ハンドラー + M36インタープリター | 全エンドポイントが動く |
| 5. servant-elm | コード生成 + Elm側の `Api/Generated.elm` | 生成コードがElmコンパイル通る |
| 6. Elm UI | ページ実装 (elm-ui) | 全画面が動く |
| 7. AI連携 | OpenRouterインタープリター | 質問生成・分析・レポートが動く |
| 8. 認証 | マジックリンク + JWT | 管理画面のアクセス制御が動く |
| 9. 音声入力 | Deepgram Port連携 | 音声入力モードが動く |