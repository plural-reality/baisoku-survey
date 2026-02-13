import { getPhaseDescription } from "@/lib/utils/phase";

const OTHER_OPTION_INDEX = 6;

function formatAnswerText(
  options: string[],
  selectedOption: number | null | undefined,
  freeText?: string | null,
  questionType?: string,
  selectedOptions?: number[] | null,
  answerText?: string | null,
  scaleConfig?: { min: number; max: number; minLabel?: string; maxLabel?: string } | null
): string {
  const qt = questionType || 'radio';

  // text/textarea: return the answer text
  if (qt === 'text' || qt === 'textarea') {
    return answerText?.trim() || "未回答";
  }

  // checkbox: join selected option labels
  if (qt === 'checkbox') {
    if (!selectedOptions || selectedOptions.length === 0) return "未回答";
    return selectedOptions.map(i => options[i] ?? `選択肢${i}`).join(", ");
  }

  // scale: show numeric value with labels
  if (qt === 'scale') {
    if (selectedOption === null || selectedOption === undefined) return "未回答";
    const label = scaleConfig
      ? `${selectedOption}（${scaleConfig.minLabel || scaleConfig.min} 〜 ${scaleConfig.maxLabel || scaleConfig.max}）`
      : String(selectedOption);
    return label;
  }

  // radio/dropdown: existing logic
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
  explorationThemes?: string[];
  /** @deprecated Use explorationThemes instead */
  keyQuestions?: string[];
  fixedQuestionsInBatch?: Array<{
    index: number;
    statement: string;
  }>;
  previousQA: Array<{
    index: number;
    statement: string;
    detail: string;
    options: string[];
    selectedOption: number | null;
    freeText?: string | null;
    questionType?: string;
    selectedOptions?: number[] | null;
    answerText?: string | null;
    scaleConfig?: { min: number; max: number; minLabel?: string; maxLabel?: string } | null;
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
        qa.selectedOption !== null || qa.selectedOptions || qa.answerText
          ? `回答: ${formatAnswerText(
            qa.options,
            qa.selectedOption,
            qa.freeText,
            qa.questionType,
            qa.selectedOptions,
            qa.answerText,
            qa.scaleConfig
          )}`
          : "未回答";
      return `Q${qa.index}: ${qa.statement}\n詳細: ${qa.detail}\n選択肢: ${qa.options.join(" / ")}\n${selectedText}`;
    })
    .join("\n\n");

  // Support both explorationThemes (new) and keyQuestions (legacy)
  const themes = ctx.explorationThemes ?? ctx.keyQuestions;
  const themesSection =
    themes && themes.length > 0
      ? `## 深掘りテーマ（調査の軸となるテーマ）
以下のテーマを軸として、多角的に深掘りするステートメントを生成してください。
各テーマに対して偏りなくカバーするよう意識してください。

${themes.map((q, i) => `${i + 1}. ${q}`).join("\n")}

`
      : "";

  const fixedQuestionsSection =
    ctx.fixedQuestionsInBatch && ctx.fixedQuestionsInBatch.length > 0
      ? `## 既出の固定質問（重複回避）
以下の質問はこのバッチに含まれる固定質問です。これらと内容が重複するステートメントは生成しないでください。

${ctx.fixedQuestionsInBatch.map((q) => `- Q${q.index}: ${q.statement}`).join("\n")}

`
      : "";

  return `あなたは内省支援の専門家であり、ステートメント設計のプロフェッショナルです。
ユーザーが自分自身のスタンスや価値観を明確にするためのステートメントを生成してください。

## ユーザーの目的
${ctx.purpose}

## 背景情報
${ctx.backgroundText || "特になし"}

${themesSection}${fixedQuestionsSection}## これまでのステートメントと回答
${qaHistory || "まだ項目はありません（最初の5問を生成）"}

## 現在のフェーズと指針
${getPhaseDescription(ctx.phase)}

## 今回生成する項目番号
Q${ctx.startIndex} から Q${ctx.endIndex} までの ${ctx.endIndex - ctx.startIndex + 1} 件

## ステートメント設計の核心（最重要）

### 分かりやすさと深さの両立
ユーザーが直感的にスタンスを取れる、シンプルで分かりやすいステートメントを作ってください。
複雑すぎたり、ディテールに入りすぎたりしないこと。

重要なのは「答えやすさ」と「本質へのアクセス」の両立です：
- 難しい質問＝良い質問ではない
- ユーザーが迷わず自分の立場を表明できる明快な文言を心がける
- それでいて、回答からユーザーの重要な価値観やスタンスが見えてくるような問いを設計する
- 抽象的すぎず、具体的すぎず、ちょうど良い粒度を探る

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
「はい」でも「いいえ」でもないなら、**元の問いに対して**どういうスタンスなのか？を表現する選択肢を作る。

重要な制約：
- 論点をずらさないこと。元のstatementが問うていることに対する立場でなければならない
- 「別の視点から見ると…」のような論点の横滑りは禁止（ただし元の問いの前提自体を疑う立場はOK）
- 元の問いの土俵から降りる選択肢は禁止。例：「Aの主軸をXに置くべきか？」に対して「Aより別のことに注力すべき」はNG（問いはAの中での方向性を問うているのに、A自体をやめる話にすり替えている）
- あくまで元の問いへの賛否のグラデーション（条件付き賛成、部分的否定、程度の留保など）を表現する

**過去の回答傾向を踏まえて**、このユーザーがありえそうな立場トップ3を作成する：

- options[3]: 最もありそうな中間的立場（例：条件付きで賛成、一部についてのみ賛成）
- options[4]: 二番目にありそうな中間的立場（例：原則は賛成だが程度に留保がある）
- options[5]: 三番目にありそうな中間的立場（例：賛成寄りだが特定の状況では反対）

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
    selectedOption: number | null;
    freeText?: string | null;
    questionType?: string;
    selectedOptions?: number[] | null;
    answerText?: string | null;
    scaleConfig?: { min: number; max: number; minLabel?: string; maxLabel?: string } | null;
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
回答: ${formatAnswerText(qa.options, qa.selectedOption, qa.freeText, qa.questionType, qa.selectedOptions, qa.answerText, qa.scaleConfig)}`;
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
  explorationThemes?: string[];
  fixedQuestions?: Array<{ statement: string; detail: string }>;
  /** @deprecated Use explorationThemes instead */
  keyQuestions?: string[];
  allQA: Array<{
    index: number;
    statement: string;
    detail: string;
    options: string[];
    selectedOption: number | null;
    freeText?: string | null;
    source?: "ai" | "fixed";
    questionType?: string;
    selectedOptions?: number[] | null;
    answerText?: string | null;
    scaleConfig?: { min: number; max: number; minLabel?: string; maxLabel?: string } | null;
  }>;
  allAnalyses: string[];
  version: number;
}

export function buildReportPrompt(ctx: ReportGenerationContext): string {
  const qaFull = ctx.allQA
    .map((qa) => {
      return `[Q${qa.index}] ${qa.statement}
詳細: ${qa.detail}
選択: ${formatAnswerText(qa.options, qa.selectedOption, qa.freeText, qa.questionType, qa.selectedOptions, qa.answerText, qa.scaleConfig)}`;
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

  // Fixed questions section
  const fixedQuestionsInQA = ctx.allQA.filter((qa) => qa.source === "fixed");
  const fixedQuestionsSection =
    fixedQuestionsInQA.length > 0
      ? `## 固定質問（作成者が設定した必須質問）
以下の質問は作成者が事前に定義した固定質問です。レポートでは専用セクションで回答を分析してください。

${fixedQuestionsInQA.map((qa) => `- [Q${qa.index}] ${qa.statement}`).join("\n")}

`
      : "";

  // Exploration themes section (with keyQuestions fallback)
  const themes = ctx.explorationThemes ?? ctx.keyQuestions;
  const themesSection =
    themes && themes.length > 0
      ? `## 深掘りテーマ（調査の軸となるテーマ）
${themes.map((q, i) => `${i + 1}. ${q}`).join("\n")}

`
      : "";

  const fixedQuestionsReportStructure =
    fixedQuestionsInQA.length > 0
      ? `
6. **固定質問への回答**
   - 作成者が設定した固定質問に対する回答を分析してください
${fixedQuestionsInQA.map((qa) => `   - [Q${qa.index}] ${qa.statement}`).join("\n")}
   - 各質問につき150-300文字で、回答内容とそこから読み取れる傾向を記述する
`
      : "";

  const themesReportStructure =
    themes && themes.length > 0
      ? `
${fixedQuestionsInQA.length > 0 ? "7" : "6"}. **テーマごとの結論**
   - 以下の各テーマについて、回答データから読み取れる結論を述べてください
${themes.map((q, i) => `   - テーマ${i + 1}: ${q}`).join("\n")}
   - 各テーマにつき200-400文字で、回答の根拠（質問番号の引用）とともに結論を記述する
   - 明確な傾向がある場合はそれを示し、判断が難しい場合はその旨を正直に述べる
`
      : "";

  return `あなたは深い洞察力と共感性を持つ内省支援の専門家です。
ユーザーの${ctx.allQA.length}問の回答をもとに、詳細な診断レポートを作成してください。

## ユーザーの目的
${ctx.purpose}

## 背景情報
${ctx.backgroundText || "特になし"}

${fixedQuestionsSection}${themesSection}${reportInstructionsSection}## 中間分析
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
${fixedQuestionsReportStructure}${themesReportStructure}
### 引用形式
- 質問番号は [12] のように角括弧で囲む
- 複数引用は [12][34][56] のように連続させる

## 出力形式
Markdown形式でレポートを出力してください。上記の構成に従い、見出し（##）を使って構造化してください。`;
}

// ─── Survey Aggregate Report ─────────────────────────────────────────────────

export interface SurveyReportParticipant {
  userNumber: number; // sequential: 1, 2, 3, …
  sessionId: string;
  qa: Array<{
    index: number;
    statement: string;
    detail: string;
    options: string[];
    selectedOption: number | null;
    freeText?: string | null;
    questionType?: string;
    selectedOptions?: number[] | null;
    answerText?: string | null;
    scaleConfig?: { min: number; max: number; minLabel?: string; maxLabel?: string } | null;
  }>;
  personalReport: string | null; // latest report_text, or null
}

export interface SurveyReportGenerationContext {
  purpose: string;
  backgroundText: string;
  reportInstructions?: string;
  explorationThemes?: string[];
  fixedQuestions?: Array<{ statement: string; detail: string }>;
  /** @deprecated Use explorationThemes instead */
  keyQuestions?: string[];
  customInstructions?: string;
  participants: SurveyReportParticipant[];
}

export function buildSurveyReportPrompt(
  ctx: SurveyReportGenerationContext
): string {
  // Build per-participant blocks
  const participantBlocks = ctx.participants
    .map((p) => {
      const qaBlock = p.qa
        .map((qa) => {
          const ansText = formatAnswerText(
            qa.options,
            qa.selectedOption,
            qa.freeText,
            qa.questionType,
            qa.selectedOptions,
            qa.answerText,
            qa.scaleConfig
          );
          return `[U${p.userNumber}-Q${qa.index}] ${qa.statement}\n詳細: ${qa.detail}\n選択: ${ansText}`;
        })
        .join("\n\n");

      const reportBlock = p.personalReport
        ? `#### 個人レポート\n${p.personalReport}`
        : "#### 個人レポート\nまだ生成されていません";

      return `### 参加者 U${p.userNumber}（回答数: ${p.qa.length}）

#### 回答一覧
${qaBlock}

${reportBlock}`;
    })
    .join("\n\n---\n\n");

  const reportInstructionsSection = ctx.reportInstructions
    ? `## アンケート設計者からのレポート指示\n${ctx.reportInstructions}\n\n`
    : "";

  // Fixed questions section
  const surveyFixedQuestionsSection =
    ctx.fixedQuestions && ctx.fixedQuestions.length > 0
      ? `## 固定質問（作成者が設定した必須質問）
${ctx.fixedQuestions.map((q, i) => `${i + 1}. ${q.statement}`).join("\n")}

`
      : "";

  // Exploration themes section (with keyQuestions fallback)
  const surveyThemes = ctx.explorationThemes ?? ctx.keyQuestions;
  const surveyThemesSection =
    surveyThemes && surveyThemes.length > 0
      ? `## 深掘りテーマ（調査の軸となるテーマ）
${surveyThemes.map((q, i) => `${i + 1}. ${q}`).join("\n")}

`
      : "";

  const customInstructionsSection = ctx.customInstructions
    ? `## レポート生成時の追加指示\n${ctx.customInstructions}\n\n`
    : "";

  const surveyFixedQuestionsReportStructure =
    ctx.fixedQuestions && ctx.fixedQuestions.length > 0
      ? `
7. **固定質問への回答分析**
   - 作成者が設定した固定質問に対する全参加者の回答を分析してください
${ctx.fixedQuestions.map((q, i) => `   - 質問${i + 1}: ${q.statement}`).join("\n")}
   - 各質問につき300-500文字で、参加者間の傾向・分布を記述する
   - 回答の引用（[U1-Q12] 形式）で根拠を示す
`
      : "";

  const surveyThemesReportStructure =
    surveyThemes && surveyThemes.length > 0
      ? `
${ctx.fixedQuestions && ctx.fixedQuestions.length > 0 ? "8" : "7"}. **テーマごとの結論**
   - 以下の各テーマについて、全参加者の回答データから読み取れる結論を述べてください
${surveyThemes.map((q, i) => `   - テーマ${i + 1}: ${q}`).join("\n")}
   - 各テーマにつき300-500文字で、参加者間の傾向・分布を含めた結論を記述する
   - 回答の引用（[U1-Q12] 形式）で根拠を示す
   - 合意が得られた点と意見が分かれた点を区別して述べる
`
      : "";

  return `あなたは調査分析の専門家であり、複数の回答者のデータから全体傾向を読み解くプロフェッショナルです。
以下のアンケートの全参加者の回答データと個人レポートをもとに、全体を俯瞰する総合レポートを作成してください。

## アンケートの目的
${ctx.purpose}

## 背景情報
${ctx.backgroundText || "特になし"}

${surveyFixedQuestionsSection}${surveyThemesSection}${reportInstructionsSection}${customInstructionsSection}## 参加者データ（全${ctx.participants.length}名）

${participantBlocks}

## レポート作成の指針

### トーンと姿勢
- 客観的・分析的でありながら、参加者の多様な声を尊重する
- データに基づいた洞察を提供する
- 単純な多数決ではなく、意見の分布やニュアンスを捉える

### 必須の構成

1. **全体概要**（400-600文字）
   - 参加者全体から見えてくる傾向の概観
   - 回答者数、回答の完了度などの基本的な統計情報

2. **主要な傾向と合意点**（600-1000文字）
   - 多くの参加者が共通して示した傾向や価値観
   - 具体的な質問番号を引用しながら根拠を示す
   - 例: 「多くの参加者が効率性を重視する傾向を示しました [U1-Q12][U3-Q12][U5-Q12]」

3. **意見が分かれたポイント**（600-1000文字）
   - 参加者間で回答が大きく分かれた質問やテーマ
   - 対立する意見の両方を公平に紹介する
   - 具体的な引用で裏付ける

4. **特徴的な回答・少数意見**（400-800文字）
   - 少数だが注目すべき回答やユニークな視点
   - 自由記述で特に印象的だった内容

5. **個人レポートから見える深層的傾向**（400-800文字）
   - 各参加者の個人レポートを横断的に分析して見えてくるパターン
   - 個人レポートに共通して現れるテーマや価値観

6. **まとめと示唆**（300-500文字）
   - 全体として何が言えるか
   - このデータから得られる知見や次のアクションへの示唆
${surveyFixedQuestionsReportStructure}${surveyThemesReportStructure}
### 引用形式
- 特定の参加者の特定の質問への回答を引用するときは [U1-Q12] のように参加者番号と質問番号を角括弧で囲む
- 複数引用は [U1-Q12][U3-Q12][U5-Q12] のように連続させる
- 参加者番号は U1, U2, U3, ... の形式（上記データの順番に対応）
- 質問番号は Q1, Q2, Q3, ... の形式

## 出力形式
Markdown形式でレポートを出力してください。上記の構成に従い、見出し（##）を使って構造化してください。`;
}
