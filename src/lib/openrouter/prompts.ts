import { getPhaseDescription } from "@/lib/utils/phase";

const OTHER_OPTION_INDEX = 6;

function formatAnswerText(
  options: string[],
  selectedOption: number | null | undefined,
  freeText?: string | null
): string {
  if (selectedOption === null || selectedOption === undefined) {
    return "未回答";
  }

  if (selectedOption === OTHER_OPTION_INDEX) {
    const trimmed = freeText?.trim();
    return trimmed ? `その他（自由記述）: ${trimmed}` : "その他（自由記述）";
  }

  return options[selectedOption] ?? "未回答";
}

export interface QuestionGenerationContext {
  purpose: string;
  backgroundText: string;
  previousQA: Array<{
    index: number;
    statement: string;
    detail: string;
    options: string[];
    selectedOption: number | null;
    freeText?: string | null;
  }>;
  startIndex: number;
  endIndex: number;
  phase: "exploration" | "deep-dive" | "reframing";
}

export function buildQuestionGenerationPrompt(
  ctx: QuestionGenerationContext
): string {
  const qaHistory = ctx.previousQA
    .map((qa) => {
      const selectedText =
        qa.selectedOption !== null
          ? `回答: ${formatAnswerText(
            qa.options,
            qa.selectedOption,
            qa.freeText
          )}`
          : "未回答";
      return `Q${qa.index}: ${qa.statement}\n詳細: ${qa.detail}\n選択肢: ${qa.options.join(" / ")}\n${selectedText}`;
    })
    .join("\n\n");

  return `あなたは内省支援の専門家であり、ステートメント設計のプロフェッショナルです。
ユーザーが自分自身のスタンスや価値観を明確にするためのステートメントを生成してください。

## ユーザーの目的
${ctx.purpose}

## 背景情報
${ctx.backgroundText || "特になし"}

## これまでのステートメントと回答
${qaHistory || "まだ項目はありません（最初の5問を生成）"}

## 現在のフェーズと指針
${getPhaseDescription(ctx.phase)}

## 今回生成する項目番号
Q${ctx.startIndex} から Q${ctx.endIndex} までの ${ctx.endIndex - ctx.startIndex + 1} 件

## ステートメント設計の核心（最重要）

### 「はい」予測 × コントラバーシャル
あなたの仕事は「ユーザーが『はい』と答えるステートメント」を作ることです。
ただし、誰でも即答で「はい」と言える一般論は避け、賛否や条件が分かれるギリギリの争点に踏み込んでください。


重要なのは「外挿と検証の両立」です：
- 既に明確に答えが出ていることを聞いても意味がない
- 予測が当たっても外れても価値がある（当たる=再確認、外れる=新たな発見）
- 「はい」予測が主軸だが、外しに行く問いも必ず混ぜる

### ステートメントの形式
- statementは30-50文字程度の簡潔な命題（断定文）
- 形式は「〜である」「〜であるべき」などのステートメントにする（疑問形は禁止）
- detailは80-120文字程度で、statementを補足し具体的な文脈を提供する。もし深く関連する過去の回答があれば、それも参照しつつstatementの理解を助ける補足説明を書く。（設問意図は説明不要）

## 選択肢設計（最重要）

### 基本構造
- optionsは必ず6つ
- options[0]は必ず「はい」
- options[1]は必ず「わからない」
- options[2]は必ず「いいえ」（単純な否定）
- options[3]〜[5]は「はい」「わからない」「いいえ」のどちらでもない場合の選択肢

### options[3]〜[5]の設計思想
「はい」「わからない」「いいえ」のどれでもない場合、このユーザーはどう答えるか？を**過去の回答傾向を踏まえて**予測し、ありえそうな立場トップ3を作成する：

- options[3]: 最もありそうな立場・理由
- options[4]: 二番目にありそうな立場・理由
- options[5]: 三番目にありそうな立場・理由

例：
- 条件付き・部分的な賛成
- 状況や文脈によるという立場
- 別の角度・視点からの見方
- 程度や範囲についての留保

各選択肢は15-40文字程度で、具体的で互いに重ならない立場にする。

## 出力形式
以下のJSON形式のみで出力してください。説明文は不要です。

{
  "questions": [
    {
      "statement": "ステートメント（30-50文字、断定文）",
      "detail": "補足説明（80-120文字、断定文）",
      "options": ["はい", "わからない", "いいえ", "本命の立場", "次点の立場", "大穴の立場"]
    }
  ]
}`;
}

export interface AnalysisGenerationContext {
  purpose: string;
  backgroundText: string;
  batchQA: Array<{
    index: number;
    statement: string;
    detail: string;
    options: string[];
    selectedOption: number;
    freeText?: string | null;
  }>;
  startIndex: number;
  endIndex: number;
  previousAnalyses: string[];
}

export function buildAnalysisPrompt(ctx: AnalysisGenerationContext): string {
  const qaBlock = ctx.batchQA
    .map((qa) => {
      return `Q${qa.index}: ${qa.statement}
詳細: ${qa.detail}
選択肢: ${qa.options.join(" / ")}
回答: ${formatAnswerText(qa.options, qa.selectedOption, qa.freeText)}`;
    })
    .join("\n\n");

  const prevAnalysesText =
    ctx.previousAnalyses.length > 0
      ? `## これまでの分析\n${ctx.previousAnalyses.join("\n\n---\n\n")}`
      : "";

  return `あなたは共感的で洞察力のある内省支援カウンセラーです。
ユーザーの回答を分析し、思考の傾向や価値観について気づきを提供してください。

## ユーザーの目的
${ctx.purpose}

## 背景情報
${ctx.backgroundText || "特になし"}

${prevAnalysesText}

## 今回分析する質問と回答（Q${ctx.startIndex}-Q${ctx.endIndex}）
${qaBlock}

## 分析の指針
- 200文字程度で、この5問の回答から見えてくるパターンや傾向を分析してください
- ユーザーの価値観や考え方の特徴を、共感的な視点で描写してください
- 矛盾や揺らぎがあれば、それも含めて丁寧に扱ってください（批判せず、人間らしさとして受け止める）

## 出力形式
分析テキストのみを出力してください。JSON形式は不要です。`;
}

export interface ReportGenerationContext {
  purpose: string;
  backgroundText: string;
  reportInstructions?: string;
  allQA: Array<{
    index: number;
    statement: string;
    detail: string;
    options: string[];
    selectedOption: number;
    freeText?: string | null;
  }>;
  allAnalyses: string[];
  version: number;
}

export function buildReportPrompt(ctx: ReportGenerationContext): string {
  const qaFull = ctx.allQA
    .map((qa) => {
      return `[Q${qa.index}] ${qa.statement}
詳細: ${qa.detail}
選択: ${formatAnswerText(qa.options, qa.selectedOption, qa.freeText)}`;
    })
    .join("\n\n");

  const analysesText = ctx.allAnalyses
    .map((analysis, i) => `### 分析 ${i + 1}\n${analysis}`)
    .join("\n\n");

  const reportInstructionsSection = ctx.reportInstructions
    ? `## レポート生成時の追加指示
${ctx.reportInstructions}

`
    : "";

  return `あなたは深い洞察力と共感性を持つ内省支援の専門家です。
ユーザーの${ctx.allQA.length}問の回答をもとに、詳細な診断レポートを作成してください。

## ユーザーの目的
${ctx.purpose}

## 背景情報
${ctx.backgroundText || "特になし"}

${reportInstructionsSection}## 中間分析
${analysesText}

## 全質問と回答
${qaFull}

## レポート作成の指針

### トーンと姿勢
- ユーザーが「AIが自分のことを深く理解してくれている」と感じられるように
- 共感的でありながら、新しい気づきも提供する
- 批判や説教ではなく、発見と可能性を示す

### 必須の構成

1. **概観**（400-500文字）
   - 回答全体から見えてくる、ユーザーの現在のスタンスを言語化
   - 「あなたは〜という人です」という断定ではなく、「〜という傾向が見られます」という観察

2. **価値観と関心の軸**（600-1000文字）
   - 回答から浮かび上がる主要な価値観や関心事を3-4点挙げる
   - 各点について、具体的な質問番号を引用 [Q番号] 形式で
   - 例: 「あなたは効率性よりも丁寧さを重視する傾向があります [12][34][67]」

3. **迷いと葛藤**（600-1000文字）
   - 回答の中で揺れや矛盾が見られた部分を丁寧に扱う
   - これは批判ではなく、「考えが深いからこそ生まれる葛藤」として肯定的に捉える
   - 具体的な質問番号を引用

4. **一貫性のある選択肢**（600-800文字）
   - ユーザーの価値観に沿った、具体的なアクションや考え方を3-5点提案
   - 抽象的な助言ではなく、実行可能な具体策

5. **まとめ**（300-500文字）
   - 励ましと、次の一歩へのエール
   - ユーザーの強みを再確認する一文

### 引用形式
- 質問番号は [12] のように角括弧で囲む
- 複数引用は [12][34][56] のように連続させる

## 出力形式
Markdown形式でレポートを出力してください。上記の構成に従い、見出し（##）を使って構造化してください。`;
}
