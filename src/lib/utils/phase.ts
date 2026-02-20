export interface PhaseRange {
  start: number;
  end: number;
  phase: "exploration" | "deep-dive" | "reframing";
}

export interface PhaseProfile {
  ranges: PhaseRange[];
}

export const DEFAULT_REPORT_TARGET = 10;

/**
 * Phase cycle for batches after the initial exploration phase.
 * deep-dive → reframing → exploration, repeating.
 */
const PHASE_CYCLE: Array<"exploration" | "deep-dive" | "reframing"> = [
  "deep-dive",
  "reframing",
  "exploration",
];

/**
 * Generate a phase profile for the given report target.
 *
 * Batch 1-2 (questions 1-10): exploration
 * Batch 3+: deep-dive → reframing → exploration (repeating cycle)
 */
export function generatePhaseProfile(reportTarget: number = DEFAULT_REPORT_TARGET): PhaseProfile {
  const batchCount = reportTarget / 5;
  const ranges: PhaseRange[] = [];

  for (let i = 0; i < batchCount; i++) {
    const start = i * 5 + 1;
    const end = (i + 1) * 5;
    const phase = i < 2
      ? "exploration"
      : PHASE_CYCLE[(i - 2) % PHASE_CYCLE.length];

    ranges.push({ start, end, phase });
  }

  return { ranges };
}

export const DEFAULT_PHASE_PROFILE: PhaseProfile = generatePhaseProfile(DEFAULT_REPORT_TARGET);

export function getPhaseForQuestionIndex(
  questionIndex: number,
  phaseProfile: PhaseProfile = DEFAULT_PHASE_PROFILE
): "exploration" | "deep-dive" | "reframing" {
  const maxEnd = phaseProfile.ranges.length > 0
    ? phaseProfile.ranges[phaseProfile.ranges.length - 1].end
    : 50;

  // For questions beyond the profile range, cycle through phases
  const normalizedIndex =
    questionIndex > maxEnd ? ((questionIndex - 1) % maxEnd) + 1 : questionIndex;

  for (const range of phaseProfile.ranges) {
    if (normalizedIndex >= range.start && normalizedIndex <= range.end) {
      return range.phase;
    }
  }

  return "exploration"; // Default fallback
}

export function getPhaseDescription(
  phase: "exploration" | "deep-dive" | "reframing"
): string {
  if (phase === "exploration") {
    return `【現在のフェーズ：探索フェーズ】
このフェーズの目的は、アンケートの目的・背景情報に対して「まだ聞けていないテーマ」を網羅的にカバーすることです。

1. 調査目的に必要な、まだ一度も触れていないテーマがあれば優先的に扱う
2. テーマ間の優先度を問うようなメタ質問によって、回答者の重視する領域を確認する
3. 各テーマに対する回答者の基本的な立場を把握する

■ 大局観の維持
- 直近の回答に引きずられすぎず、調査全体のカバレッジを常に意識する
- 「この調査目的に対して、あと何を聞くべきか」を俯瞰して考える
- テーマの幅を広げることに集中する`;
  }

  if (phase === "reframing") {
    return `【現在のフェーズ：視点変換フェーズ】
このフェーズの目的は、既に触れたテーマについて「別の角度・切り口」から問い直し、多角的なデータを得ることです。

■ 視点変換のアプローチ
1. 主語・スコープを変える
   - 全体 ↔ 個人、組織 ↔ 個人、自分 ↔ 他者 ↔ 社会
2. 時間軸を変える
   - 過去 → 現在 → 未来、短期 ↔ 長期
3. 条件・状況を変える
   - 理想 ↔ 現実 ↔ 制約下、平常時 ↔ 緊急時
4. 立場・役割を変える
   - 当事者 ↔ 傍観者、提供者 ↔ 受益者

■ 概念の分離による深い理解
- 事実認識 vs 理想像：「今どうなっているか」と「どうあるべきか」を分けて問う
- 原則 vs 程度：「そもそもの考え方」と「どの程度か」を分けて問う
- 目的 vs 手段：「何のためか」と「どうやるか」を分けて問う
- 問題 vs 課題 vs 解決策：現状の問題、取り組むべき課題、具体的な手段を区別する

■ このフェーズの価値
- 同じテーマでも角度を変えることで、テーマの異なる側面に対する態度が見える
- 多角的な情報により、より立体的・包括的な調査結果が得られる`;
  }

  return `【現在のフェーズ：深掘りフェーズ】
このフェーズの目的は、探索フェーズで見えてきたテーマについて「より詳細な意見」を収集することです。

■ 深掘りの方向性
1. 「このテーマについて、こういう場合はどうか？」という条件分岐を探る
2. 回答の背後にある具体的な判断基準や前提条件を明確にする
3. 意見が分かれそうなポイントの境界条件を明らかにする

■ 新規情報の獲得
- 既に聞いたことと同じことを聞いても意味がない
- 常に「この質問で調査として新たな情報が得られるか」を自問する
- 一般論ではなく、具体的な場面・条件での判断を引き出すことを目指す`;
}
