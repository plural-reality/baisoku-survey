import { describe, it, expect } from "vitest";
import {
  generatePhaseProfile,
  getPhaseForQuestionIndex,
  getPhaseDescription,
  DEFAULT_REPORT_TARGET,
  DEFAULT_PHASE_PROFILE,
} from "./phase";

describe("generatePhaseProfile", () => {
  it("デフォルト(10問)で2バッチ分のexplorationを生成する", () => {
    const profile = generatePhaseProfile(10);
    expect(profile.ranges).toHaveLength(2);
    expect(profile.ranges[0]).toEqual({ start: 1, end: 5, phase: "exploration" });
    expect(profile.ranges[1]).toEqual({ start: 6, end: 10, phase: "exploration" });
  });

  it("25問で正しいフェーズサイクルを生成する", () => {
    const profile = generatePhaseProfile(25);
    expect(profile.ranges).toHaveLength(5);
    expect(profile.ranges[0].phase).toBe("exploration");
    expect(profile.ranges[1].phase).toBe("exploration");
    expect(profile.ranges[2].phase).toBe("deep-dive");
    expect(profile.ranges[3].phase).toBe("reframing");
    expect(profile.ranges[4].phase).toBe("exploration");
  });

  it("50問でフェーズサイクルが繰り返される", () => {
    const profile = generatePhaseProfile(50);
    expect(profile.ranges).toHaveLength(10);
    // Batch 1-2: exploration
    expect(profile.ranges[0].phase).toBe("exploration");
    expect(profile.ranges[1].phase).toBe("exploration");
    // Batch 3-5: deep-dive → reframing → exploration
    expect(profile.ranges[2].phase).toBe("deep-dive");
    expect(profile.ranges[3].phase).toBe("reframing");
    expect(profile.ranges[4].phase).toBe("exploration");
    // Batch 6-8: deep-dive → reframing → exploration (repeat)
    expect(profile.ranges[5].phase).toBe("deep-dive");
    expect(profile.ranges[6].phase).toBe("reframing");
    expect(profile.ranges[7].phase).toBe("exploration");
  });

  it("5問で1バッチのexplorationを生成する", () => {
    const profile = generatePhaseProfile(5);
    expect(profile.ranges).toHaveLength(1);
    expect(profile.ranges[0]).toEqual({ start: 1, end: 5, phase: "exploration" });
  });

  it("デフォルト引数はDEFAULT_REPORT_TARGETを使う", () => {
    const profile = generatePhaseProfile();
    expect(profile.ranges).toHaveLength(DEFAULT_REPORT_TARGET / 5);
  });
});

describe("getPhaseForQuestionIndex", () => {
  it("Q1-5はexploration", () => {
    expect(getPhaseForQuestionIndex(1)).toBe("exploration");
    expect(getPhaseForQuestionIndex(3)).toBe("exploration");
    expect(getPhaseForQuestionIndex(5)).toBe("exploration");
  });

  it("Q6-10はexploration（デフォルト10問プロファイル）", () => {
    expect(getPhaseForQuestionIndex(6)).toBe("exploration");
    expect(getPhaseForQuestionIndex(10)).toBe("exploration");
  });

  it("25問プロファイルでQ11-15はdeep-dive", () => {
    const profile = generatePhaseProfile(25);
    expect(getPhaseForQuestionIndex(11, profile)).toBe("deep-dive");
    expect(getPhaseForQuestionIndex(15, profile)).toBe("deep-dive");
  });

  it("25問プロファイルでQ16-20はreframing", () => {
    const profile = generatePhaseProfile(25);
    expect(getPhaseForQuestionIndex(16, profile)).toBe("reframing");
    expect(getPhaseForQuestionIndex(20, profile)).toBe("reframing");
  });

  it("プロファイル範囲外の質問はラップアラウンドする", () => {
    const profile = generatePhaseProfile(10);
    // Q11 should wrap to Q1 (exploration)
    expect(getPhaseForQuestionIndex(11, profile)).toBe("exploration");
  });
});

describe("getPhaseDescription", () => {
  it("各フェーズで空でない説明文を返す", () => {
    expect(getPhaseDescription("exploration")).toContain("探索フェーズ");
    expect(getPhaseDescription("deep-dive")).toContain("深掘りフェーズ");
    expect(getPhaseDescription("reframing")).toContain("視点変換フェーズ");
  });
});

describe("DEFAULT_PHASE_PROFILE", () => {
  it("デフォルトプロファイルがDEFAULT_REPORT_TARGETに基づく", () => {
    expect(DEFAULT_PHASE_PROFILE.ranges).toHaveLength(DEFAULT_REPORT_TARGET / 5);
  });
});
