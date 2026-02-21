"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="light min-h-screen overflow-x-hidden" style={{ colorScheme: "light" }}>
      <LPHeader />
      <HeroSection />
      <PainPointsSection />
      <HowItWorksSection />
      <UIShowcaseSection />
      <FeaturesSection />
      <ComparisonSection />
      <UseCasesSection />
      <PricingSection />
      <FAQSection />
      <FinalCTA />
      <LPFooter />
    </div>
  );
}

/* ─────────────────────────── Header ─────────────────────────── */
function LPHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[var(--background)]/90 backdrop-blur-xl border-b border-[var(--border)] shadow-sm"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/lp" className="no-underline">
          <span
            className="inline-block font-black italic tracking-tighter text-xl leading-none text-[var(--foreground)]"
            style={{ transform: "skewX(-6deg)" }}
          >
            倍速アンケート
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8 text-sm text-[var(--muted-foreground)]">
          <a href="#features" className="hover:text-[var(--foreground)] transition-colors">機能</a>
          <a href="#comparison" className="hover:text-[var(--foreground)] transition-colors">比較</a>
          <a href="#usecases" className="hover:text-[var(--foreground)] transition-colors">活用例</a>
          <a href="#pricing" className="hover:text-[var(--foreground)] transition-colors">料金</a>
          <a href="#faq" className="hover:text-[var(--foreground)] transition-colors">FAQ</a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden md:inline-flex text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            ログイン
          </Link>
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-black transition-all hover:shadow-lg hover:shadow-slate-900/20"
          >
            無料で始める
          </Link>
          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-[var(--muted-foreground)]"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="メニュー"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileOpen ? (
                <path d="M4 4l12 12M16 4L4 16" />
              ) : (
                <path d="M3 5h14M3 10h14M3 15h14" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <nav className="md:hidden border-t border-[var(--border)] bg-[var(--background)]/95 backdrop-blur-xl px-4 py-4 flex flex-col gap-3 text-sm">
          <a href="#features" className="py-2 text-[var(--muted-foreground)]" onClick={() => setMobileOpen(false)}>機能</a>
          <a href="#comparison" className="py-2 text-[var(--muted-foreground)]" onClick={() => setMobileOpen(false)}>比較</a>
          <a href="#usecases" className="py-2 text-[var(--muted-foreground)]" onClick={() => setMobileOpen(false)}>活用例</a>
          <a href="#pricing" className="py-2 text-[var(--muted-foreground)]" onClick={() => setMobileOpen(false)}>料金</a>
          <a href="#faq" className="py-2 text-[var(--muted-foreground)]" onClick={() => setMobileOpen(false)}>FAQ</a>
          <Link href="/login" className="py-2 text-[var(--muted-foreground)]">ログイン</Link>
        </nav>
      )}
    </header>
  );
}

/* ─────────────────────────── Hero ─────────────────────────── */
// Hero demo: shows the full product flow
// Stage 0: Fixed question list (admin sets up) → Stage 1: User answers → Stage 2: AI generates next → Stage 3: Report generated
const HERO_STAGES = [
  { label: "固定質問を設定", sublabel: "管理者がキー質問を準備" },
  { label: "回答者がサクサク回答", sublabel: "3択＋深掘り選択肢でテンポよく" },
  { label: "AIが深掘り質問を自動生成", sublabel: "回答に応じて次の質問を最適化" },
  { label: "レポートを自動生成", sublabel: "合意点・対立点・提言を構造化" },
] as const;

function HeroSection() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const durations = [3500, 3000, 4000, 4000];
    const timer = setTimeout(() => {
      setStage((prev) => (prev + 1) % HERO_STAGES.length);
    }, durations[stage]);
    return () => clearTimeout(timer);
  }, [stage]);

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-transparent to-purple-50 dark:from-blue-950/30 dark:via-transparent dark:to-purple-950/30" />

      <div className="relative max-w-6xl mx-auto px-4 py-20 md:py-32">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left: Text */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-medium mb-8">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              AIが質問設計から分析まで自動化
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] mb-6">
              アンケートを、
              <br />
              <span className="text-blue-600 dark:text-blue-400">倍速</span>で。
            </h1>
            <p className="text-lg md:text-xl text-[var(--muted-foreground)] leading-relaxed mb-8 max-w-lg">
              設問設計も、分析も、レポート作成も不要。
              <br className="hidden sm:block" />
              AIがインタビューのように深掘りし、
              <br className="hidden sm:block" />
              <strong className="text-[var(--foreground)]">意思決定に直結する</strong>レポートまで自動生成。
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/"
                className="inline-flex items-center justify-center px-6 py-3.5 rounded-lg bg-slate-900 text-white font-semibold text-base hover:bg-black transition-colors shadow-lg shadow-slate-900/25"
              >
                無料で始める
                <svg className="ml-2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center px-6 py-3.5 rounded-lg border-2 border-[var(--border)] text-[var(--foreground)] font-semibold text-base hover:bg-[var(--muted)] transition-colors"
              >
                使い方を見る
              </a>
            </div>
            <p className="mt-4 text-xs text-[var(--muted-foreground)]">
              クレジットカード不要 ・ 3分で最初のアンケート作成
            </p>
          </div>

          {/* Right: Product flow demo */}
          <div className="relative">
            {/* Stage label — outside the card */}
            <div className="mb-3 flex items-center gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">
                {stage + 1}
              </span>
              <div>
                <div className="text-sm font-semibold">{HERO_STAGES[stage].label}</div>
                <div className="text-xs text-[var(--muted-foreground)]">{HERO_STAGES[stage].sublabel}</div>
              </div>
            </div>

            {/* Card — content changes per stage */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl shadow-black/5 dark:shadow-black/30 overflow-hidden">
              {stage === 0 && <HeroDemoQuestionList />}
              {stage === 1 && <HeroDemoAnswering />}
              {stage === 2 && <HeroDemoGenerating />}
              {stage === 3 && <HeroDemoReport />}
            </div>

            {/* Stage indicator */}
            <div className="flex justify-center gap-1.5 mt-4">
              {HERO_STAGES.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    i === stage ? "w-8 bg-blue-500" : "w-1.5 bg-gray-300 dark:bg-gray-600"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* --- Hero demo sub-components --- */

function HeroDemoQuestionList() {
  const questions = [
    "現在の働き方に満足していますか？",
    "チーム内の情報共有は十分ですか？",
    "評価制度は公平だと感じますか？",
  ];
  return (
    <div className="p-5 space-y-3">
      <div className="flex items-center gap-2 pb-3 border-b border-[var(--border)]">
        <span className="inline-block font-black italic tracking-tighter text-xs" style={{ transform: "skewX(-6deg)" }}>倍速アンケート</span>
        <span className="text-[10px] text-[var(--muted-foreground)]">/ 質問設定</span>
      </div>
      <div className="text-[10px] font-medium text-[var(--muted-foreground)] uppercase tracking-wide">キー質問（必ず聞く項目）</div>
      {questions.map((q, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm">
          <span className="text-[10px] font-bold text-blue-500">Q{i + 1}</span>
          <span className="text-xs">{q}</span>
        </div>
      ))}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-xs text-[var(--muted-foreground)]">
        + AIが追加質問を自動生成
      </div>
    </div>
  );
}

function HeroDemoAnswering() {
  return (
    <div className="p-5 space-y-3">
      {/* Progress */}
      <div>
        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
          <span>進捗</span>
          <span>5 / 25</span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full" style={{ width: "20%" }} />
        </div>
      </div>
      {/* Question card with selected answer */}
      <div className="bg-white dark:bg-[var(--card)] rounded-xl border border-gray-200 dark:border-[var(--border)] p-4 shadow-sm">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1 leading-snug">
            現在の働き方に満足していますか？
          </h3>
          <p className="text-gray-500 text-xs">ワークライフバランスや業務環境への満足度について</p>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 py-2.5 px-3 rounded-xl font-medium text-xs border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-center shadow-sm">
            <div className="flex items-center justify-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              はい
            </div>
          </div>
          <div className="flex-1 py-2.5 px-3 rounded-xl font-medium text-xs border-2 border-gray-200 dark:border-gray-600 text-gray-500 text-center">わからない</div>
          <div className="flex-1 py-2.5 px-3 rounded-xl font-medium text-xs border-2 border-gray-200 dark:border-gray-600 text-gray-500 text-center">いいえ</div>
        </div>
      </div>
      {/* Next question skeleton */}
      <div className="bg-white dark:bg-[var(--card)] rounded-xl border border-gray-200 dark:border-[var(--border)] p-4 shadow-sm animate-pulse">
        <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
        <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
      </div>
    </div>
  );
}

function HeroDemoGenerating() {
  return (
    <div className="p-5 space-y-3">
      {/* Progress */}
      <div>
        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
          <span>進捗</span>
          <span>10 / 25</span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full" style={{ width: "40%" }} />
        </div>
      </div>
      {/* Generating indicator */}
      <div className="bg-white dark:bg-[var(--card)] rounded-xl border border-gray-200 dark:border-[var(--border)] p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-4 h-4 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
          </svg>
          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">回答傾向を分析して次の質問を生成中...</span>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
          <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-3/5" />
          <div className="flex gap-2 mt-3">
            <div className="flex-1 h-9 bg-gray-100 dark:bg-gray-800 rounded-xl" />
            <div className="flex-1 h-9 bg-gray-100 dark:bg-gray-800 rounded-xl" />
            <div className="flex-1 h-9 bg-gray-100 dark:bg-gray-800 rounded-xl" />
          </div>
        </div>
      </div>
      {/* Previous answers summary */}
      <div className="text-xs text-[var(--muted-foreground)] px-1 flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
        Q1-10の回答パターンから、深掘りポイントを特定
      </div>
    </div>
  );
}

function HeroDemoReport() {
  return (
    <div className="p-5 space-y-3">
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
        <div>
          <div className="text-xs font-bold text-gray-900 dark:text-gray-100">AIレポート</div>
          <div className="text-[9px] text-[var(--muted-foreground)]">25問回答 ・ 自動生成</div>
        </div>
        <div className="flex gap-1">
          <span className="px-2 py-0.5 border border-gray-200 dark:border-gray-600 rounded text-[9px] text-gray-500">シェア</span>
          <span className="px-2 py-0.5 bg-blue-600 text-white rounded text-[9px]">印刷</span>
        </div>
      </div>
      <div className="space-y-2.5 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
        <div>
          <div className="font-semibold text-green-600 dark:text-green-400 mb-0.5">合意が得られた点</div>
          <p>回答者の87%が「柔軟な働き方を維持したい」と回答 <span className="text-blue-500">[Q3]</span><span className="text-blue-500">[Q12]</span></p>
        </div>
        <div>
          <div className="font-semibold text-amber-600 dark:text-amber-400 mb-0.5">意見が分かれた点</div>
          <p>出社頻度は「週2-3日」派と「完全リモート」派で二極化 <span className="text-blue-500">[Q5]</span><span className="text-blue-500">[Q15]</span></p>
        </div>
        <div>
          <div className="font-semibold text-blue-600 dark:text-blue-400 mb-0.5">提言</div>
          <p>チームごとに柔軟なハイブリッド制度を導入し、雑談の場を意図的に設計することを推奨</p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Pain Points ─────────────────────────── */
function PainPointsSection() {
  const pains = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: "そもそも、良い質問を作るのが難しい",
      desc: "バイアスのない設問設計は専門技術。聞きたいことはあるのに、どう聞けばいいかわからない。チーム内で何度もレビューして、結局ありきたりな質問に。",
      color: "text-red-500",
      bg: "bg-red-50 dark:bg-red-900/20",
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
        </svg>
      ),
      title: "回答が浅い・本音が見えない",
      desc: "選択式では表面的な回答しか得られず、自由記述は空欄か一言。さらに複数部署が似たアンケートを別々に実施し、回答者は疲弊するのに深い意見は集まらない。",
      color: "text-amber-500",
      bg: "bg-amber-50 dark:bg-amber-900/20",
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      ),
      title: "集めたデータが意思決定に使えない",
      desc: "せっかくアンケートを実施しても、出てくるのは円グラフと平均値だけ。「で、結局どうすればいい？」が見えないまま報告書だけが残る。",
      color: "text-blue-500",
      bg: "bg-blue-50 dark:bg-blue-900/20",
    },
  ];

  return (
    <section className="py-24 md:py-32 bg-[var(--muted)] relative">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">アンケートを「とっただけ」にしていませんか？</h2>
          <p className="text-[var(--muted-foreground)] max-w-xl mx-auto">
            設問に悩み、浅い回答に苦しみ、結局レポートは意思決定に使えない。
            <br className="hidden sm:block" />
            この悪循環を、AIが根本から変えます。
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {pains.map((p, i) => (
            <div
              key={i}
              className="bg-[var(--card)] rounded-2xl p-6 border-2 border-[var(--border)]"
            >
              <div className={`w-12 h-12 rounded-xl ${p.bg} ${p.color} flex items-center justify-center mb-4`}>
                {p.icon}
              </div>
              <h3 className="font-bold text-lg mb-2">{p.title}</h3>
              <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── How It Works ─────────────────────────── */
function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 md:py-32 relative">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">3ステップで完結</h2>
          <p className="text-[var(--muted-foreground)]">
            設問設計も分析もAIにおまかせ。あなたは目的を入力するだけ。
          </p>
        </div>
        <div className="space-y-20 md:space-y-28">

          {/* Step 01: SessionForm UI */}
          <div className="grid md:grid-cols-2 gap-8 md:gap-16 items-center">
            <div>
              <div className="flex items-baseline gap-3 mb-3">
                <span className="text-6xl font-black text-blue-600/10 leading-none" style={{ fontFeatureSettings: "'tnum'" }}>01</span>
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-3">目的を入力するだけ</h3>
              <p className="text-[var(--muted-foreground)] leading-relaxed">「社員の働き方について聞きたい」など、目的と背景を自由に入力。専門的な設問設計は不要です。</p>
            </div>
            <div>
              <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-sm p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">明確にしたいこと・言語化したいこと</label>
                  <div className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-[var(--muted)]">
                    リモートワーク導入後の社員満足度と課題を把握したい
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">背景情報（任意）</label>
                  <div className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-[var(--muted)] min-h-[72px]">
                    2024年からフルリモート移行。最近離職率が上昇傾向にあり、社員の不満や課題を構造的に把握したい...
                  </div>
                </div>
                <button className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors">
                  セッションを開始する
                </button>
              </div>
            </div>
          </div>

          {/* Step 02: QuestionCard AI answer UI */}
          <div className="grid md:grid-cols-2 gap-8 md:gap-16 items-center">
            <div className="md:order-2">
              <div className="flex items-baseline gap-3 mb-3">
                <span className="text-6xl font-black text-blue-600/10 leading-none" style={{ fontFeatureSettings: "'tnum'" }}>02</span>
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-3">AIが質問＆深掘り</h3>
              <p className="text-[var(--muted-foreground)] leading-relaxed">回答に応じてAIがリアルタイムで次の質問を生成。インタビューのように一人ひとりに最適化された質問を投げかけます。</p>
            </div>
            <div className="md:order-1">
              <div className="bg-gray-50 dark:bg-[var(--muted)] rounded-xl p-4 space-y-3">
                <div>
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                    <span>進捗</span>
                    <span>8 / 25</span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: "32%" }} />
                  </div>
                </div>
                <div className="bg-white dark:bg-[var(--card)] rounded-xl border border-gray-200 dark:border-[var(--border)] p-5 shadow-sm">
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1 leading-snug">
                      リモートワークによって、チーム内の信頼関係は変化したと思いますか？
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-xs">対面コミュニケーションの減少が信頼関係に与える影響について</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div className="flex-1 py-2.5 px-3 rounded-xl font-medium text-xs border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-center shadow-sm">
                        <div className="flex items-center justify-center gap-1.5">
                          <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          はい
                        </div>
                      </div>
                      <div className="flex-1 py-2.5 px-3 rounded-xl font-medium text-xs border-2 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          わからない
                        </div>
                      </div>
                      <div className="flex-1 py-2.5 px-3 rounded-xl font-medium text-xs border-2 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          いいえ
                        </div>
                      </div>
                    </div>
                    <div className="w-full py-2 px-4 rounded-xl text-xs border-2 border-gray-200 dark:border-gray-600 text-gray-500 text-center flex items-center justify-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      どちらでもない
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                </div>
                {/* Next question generating skeleton */}
                <div className="bg-white dark:bg-[var(--card)] rounded-xl border border-gray-200 dark:border-[var(--border)] p-5 shadow-sm animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3" />
                  <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2 mb-4" />
                  <div className="flex gap-2">
                    <div className="flex-1 h-9 bg-gray-100 dark:bg-gray-800 rounded-xl" />
                    <div className="flex-1 h-9 bg-gray-100 dark:bg-gray-800 rounded-xl" />
                    <div className="flex-1 h-9 bg-gray-100 dark:bg-gray-800 rounded-xl" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 03: AnalysisBlock + ReportView UI */}
          <div className="grid md:grid-cols-2 gap-8 md:gap-16 items-center">
            <div>
              <div className="flex items-baseline gap-3 mb-3">
                <span className="text-6xl font-black text-blue-600/10 leading-none" style={{ fontFeatureSettings: "'tnum'" }}>03</span>
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-3">意思決定に使えるレポート</h3>
              <p className="text-[var(--muted-foreground)] leading-relaxed">円グラフや平均値だけのレポートではありません。「何が合意されていて、何が対立していて、次に何をすべきか」—意思決定に直結する構造化レポートを自動生成します。</p>
            </div>
            <div className="space-y-3">
              {/* AnalysisBlock */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl border border-blue-200 dark:border-blue-800 p-5">
                <div className="flex items-center gap-2.5 mb-3 pb-2.5 border-b border-blue-200 dark:border-blue-800">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                  </div>
                  <h3 className="text-sm font-bold text-blue-800 dark:text-blue-300">分析 #2（Q6-Q10）</h3>
                </div>
                <p className="text-gray-700 dark:text-gray-300 text-xs leading-relaxed">
                  コミュニケーション不足を課題と感じる回答者が多い一方、リモートワークの柔軟性は高く評価されています。特にQ8の回答では「雑談の場の必要性」に言及が集中しており...
                </p>
              </div>
              {/* ReportView card */}
              <div className="bg-white dark:bg-[var(--card)] rounded-xl border border-gray-200 dark:border-[var(--border)] shadow-sm p-5">
                <div className="flex items-center gap-2.5 mb-3 pb-2.5 border-b border-gray-200 dark:border-[var(--border)]">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                  </div>
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100">AIレポート</span>
                </div>
                <div className="space-y-2 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                  <div>
                    <span className="font-semibold text-green-600 dark:text-green-400">合意が得られた点：</span>
                    回答者の87%が「柔軟な働き方を維持したい」と回答 <span className="text-blue-500">[Q3]</span><span className="text-blue-500">[Q12]</span>
                  </div>
                  <div>
                    <span className="font-semibold text-amber-600 dark:text-amber-400">意見が分かれた点：</span>
                    出社頻度は「週2-3日」派と「完全リモート」派で二極化 <span className="text-blue-500">[Q5]</span><span className="text-blue-500">[Q15]</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── UI Showcase ─────────────────────────── */
function UIShowcaseSection() {
  const screens = [
    {
      label: "管理画面で作成",
      desc: "目的・背景・キー質問を設定してアンケートをすぐに公開",
      content: (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
            <span className="inline-block font-black italic tracking-tighter text-xs" style={{ transform: "skewX(-6deg)" }}>倍速アンケート</span>
            <span className="text-[10px] text-gray-400">/ 管理画面</span>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <div className="text-[10px] font-medium text-gray-500 mb-1">アンケートの目的</div>
              <div className="text-xs px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                リモートワークの課題と満足度を把握したい
              </div>
            </div>
            <div>
              <div className="text-[10px] font-medium text-gray-500 mb-1">キー質問（必ず聞く項目）</div>
              <div className="space-y-1">
                {["現在の働き方に満足していますか？", "チームの連携はスムーズですか？"].map((q, i) => (
                  <div key={i} className="text-xs px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 flex items-center gap-2">
                    <span className="text-[9px] font-bold text-blue-500">Q{i + 1}</span>
                    {q}
                  </div>
                ))}
              </div>
            </div>
            <button className="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-medium">公開する</button>
          </div>
        </div>
      ),
    },
    {
      label: "回答者のモバイルUI",
      desc: "URLを共有するだけ。スマホで直感的に、3択+深掘り選択肢でサクサク回答",
      content: (
        <div className="flex justify-center">
          {/* iPhone-style phone frame */}
          <div className="relative w-[240px]">
            <div className="bg-gray-900 dark:bg-gray-700 rounded-[2.5rem] p-[10px] shadow-xl shadow-black/20">
              <div className="absolute top-[14px] left-1/2 -translate-x-1/2 w-[80px] h-[22px] bg-gray-900 dark:bg-gray-700 rounded-full z-10" />
              <div className="bg-gray-50 dark:bg-gray-950 rounded-[2rem] overflow-hidden relative">
                <div className="h-12 flex items-end justify-between px-6 pb-1">
                  <span className="text-[9px] font-semibold text-gray-900 dark:text-gray-100">9:41</span>
                  <div className="flex items-center gap-1">
                    <svg className="w-3 h-3 text-gray-900 dark:text-gray-100" fill="currentColor" viewBox="0 0 24 24"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z" /></svg>
                    <svg className="w-3 h-3 text-gray-900 dark:text-gray-100" fill="currentColor" viewBox="0 0 24 24"><path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z" /></svg>
                  </div>
                </div>
                <div className="px-3 pb-3 space-y-2">
                  <div className="flex items-center justify-between py-1">
                    <span className="font-black italic tracking-tighter text-[9px]" style={{ transform: "skewX(-6deg)" }}>倍速アンケート</span>
                    <span className="text-[8px] text-gray-400">Q15 / 25</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: "60%" }} />
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
                    <div className="text-[10px] font-semibold mb-1.5 text-gray-900 dark:text-gray-100 leading-snug">
                      雑談の機会を意図的に作ることは業務効率を下げると思いますか？
                    </div>
                    <p className="text-[8px] text-gray-500 mb-2 leading-relaxed">インフォーマルなコミュニケーションの効果について</p>
                    <div className="flex gap-1 mb-1.5">
                      <div className="flex-1 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-[8px] text-center text-gray-500">はい</div>
                      <div className="flex-1 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-[8px] text-center text-gray-500">わからない</div>
                      <div className="flex-1 py-1.5 rounded-lg border-2 border-rose-500 bg-rose-50 dark:bg-rose-900/30 text-[8px] text-center text-rose-700 dark:text-rose-300 font-bold">いいえ</div>
                    </div>
                    <div className="py-1.5 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-[8px] text-center text-gray-400">
                      どちらでもない ▾
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 animate-pulse">
                    <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded w-4/5 mb-2" />
                    <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-5 flex items-center justify-center">
                  <div className="w-[100px] h-[4px] bg-gray-900 dark:bg-gray-400 rounded-full opacity-20" />
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      label: "意思決定に使えるレポート",
      desc: "「で、どうすればいい？」に答える。合意点・対立点・提言を構造化",
      content: (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-gray-900 dark:text-gray-100">診断レポート</div>
              <div className="text-[9px] text-gray-500">バージョン 1 ・ 25問回答済み</div>
            </div>
            <div className="flex gap-1">
              <span className="px-2 py-0.5 border border-gray-200 dark:border-gray-600 rounded text-[9px] text-gray-500">シェア</span>
              <span className="px-2 py-0.5 bg-blue-600 text-white rounded text-[9px]">印刷</span>
            </div>
          </div>
          <div className="p-4 space-y-3 text-[11px] text-gray-700 dark:text-gray-300 leading-relaxed">
            <div className="font-bold text-gray-900 dark:text-gray-100 text-xs">リモートワーク満足度に関する分析</div>
            <div>
              <span className="font-semibold text-green-600 dark:text-green-400">1. 合意が得られた点</span>
              <p className="mt-0.5">回答者の87%が「柔軟な働き方を維持したい」と回答。<span className="text-blue-500">[Q3]</span><span className="text-blue-500">[Q8]</span><span className="text-blue-500">[Q12]</span></p>
            </div>
            <div>
              <span className="font-semibold text-amber-600 dark:text-amber-400">2. 意見が分かれた点</span>
              <p className="mt-0.5">出社頻度は「週2-3日」派と「完全リモート」派で二極化。<span className="text-blue-500">[Q5]</span><span className="text-blue-500">[Q15]</span></p>
            </div>
            <div>
              <span className="font-semibold text-blue-600 dark:text-blue-400">3. 提言</span>
              <p className="mt-0.5">チームごとに柔軟なハイブリッド制度を導入し、雑談の場をオンラインで意図的に設計することを推奨。</p>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <section className="py-24 md:py-32 bg-[var(--muted)]">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">実際の画面イメージ</h2>
          <p className="text-[var(--muted-foreground)] max-w-xl mx-auto">
            管理者も回答者も迷わない、シンプルなUI。作成から分析まで一気通貫。
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {screens.map((screen, i) => (
            <div key={i} className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">{i + 1}</span>
                <span className="font-semibold text-sm">{screen.label}</span>
              </div>
              <p className="text-xs text-[var(--muted-foreground)] mb-3">{screen.desc}</p>
              <div className="bg-[var(--background)] rounded-2xl p-4 border border-[var(--border)]">
                {screen.content}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── Features (Tab style) ─────────────────────────── */
function FeaturesSection() {
  const [activeTab, setActiveTab] = useState(0);

  const features = [
    {
      tab: "質問生成",
      title: "AIが最適な質問を自動設計",
      desc: "アンケートの目的と背景を入力するだけで、AIが適切な質問を5問ずつ自動生成。フェーズに応じて「探索」「深掘り」「リフレーミング」を使い分け、多角的な意見を引き出します。",
      points: [
        "目的を入力するだけで即座に質問生成",
        "回答傾向に合わせた選択肢の自動最適化",
        "「はい/いいえ」だけでなく中間的な立場も提示",
      ],
      visual: (
        <div className="space-y-3">
          <div
            className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]"
            style={{ animation: "lp-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) 0s both" }}
          >
            <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-medium">探索フェーズ</span>
            <span>Batch 1 / Q1-5</span>
          </div>
          {["社員の満足度は高いと感じますか？", "リモートワークの頻度は適切ですか？", "チーム内の情報共有は十分ですか？"].map((q, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 rounded-lg bg-[var(--background)] border border-[var(--border)] text-sm transition-colors hover:border-blue-300"
              style={{ animation: `lp-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) ${0.3 + i * 0.4}s both` }}
            >
              <span className="text-xs font-bold text-[var(--muted-foreground)] w-6">Q{i + 1}</span>
              <span>{q}</span>
            </div>
          ))}
          <div
            className="flex items-center gap-2 p-3 rounded-lg border-2 border-dashed border-blue-300 dark:border-blue-700 text-sm text-blue-600 dark:text-blue-400"
            style={{ animation: "lp-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) 1.5s both" }}
          >
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
            Q4, Q5 を生成中...
          </div>
        </div>
      ),
    },
    {
      tab: "動的深掘り",
      title: "一人ひとりに合わせたインタビュー体験",
      desc: "デプスインタビューのように、回答内容に応じてAIが次の質問をリアルタイムで生成。回答者ごとに異なる質問で、表面的な回答では得られない本音を引き出します。",
      points: [
        "回答に応じて質問が動的に変化",
        "インタビューの深さ × アンケートの手軽さ",
        "音声入力モードで対話的に回答",
      ],
      visual: (
        <div className="space-y-3">
          <div
            className="flex items-center gap-2 text-xs mb-1"
            style={{ animation: "lp-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) 0s both" }}
          >
            <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 font-medium">深掘りフェーズ</span>
          </div>
          <div
            className="p-3 rounded-lg bg-[var(--background)] border border-[var(--border)] text-sm"
            style={{ animation: "lp-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) 0.3s both" }}
          >
            <div className="text-xs text-[var(--muted-foreground)] mb-1">Q8 — 前の回答「コミュニケーション不足」から深掘り</div>
            <div className="font-medium">具体的にどの場面でコミュニケーション不足を感じますか？</div>
          </div>
          <div
            className="flex items-center gap-2 text-xs text-[var(--muted-foreground)] px-1"
            style={{ animation: "lp-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) 0.7s both" }}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            回答者Aは「雑談がない」→ さらに深掘り
          </div>
          <div
            className="p-3 rounded-lg bg-[var(--background)] border border-[var(--border)] text-sm"
            style={{ animation: "lp-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) 1.0s both" }}
          >
            <div className="text-xs text-[var(--muted-foreground)] mb-1">Q9 — 個別最適化</div>
            <div className="font-medium">雑談の機会を意図的に作ることは、業務効率を下げると思いますか？</div>
          </div>
        </div>
      ),
    },
    {
      tab: "自動分析",
      title: "「とっただけ」で終わらない。意思決定に使えるレポート",
      desc: "円グラフと平均値だけでは次のアクションが見えません。倍速アンケートは「何が合意されて、何が対立し、結局どうすべきか」を構造化。レポートをそのまま意思決定の場に持ち込めます。",
      points: [
        "合意点・対立点・提言を自動で構造化",
        "[Q番号] 引用付きで「なぜその結論か」が明確",
        "複数部署の重複アンケートも横串で一元分析",
      ],
      visual: (
        <div className="space-y-3">
          <div className="p-4 rounded-lg bg-[var(--background)] border border-[var(--border)] text-sm space-y-3">
            <div className="font-bold">リモートワーク満足度調査 — 分析レポート</div>
            <div className="h-px bg-[var(--border)]" />
            <div>
              <div className="font-semibold text-green-600 dark:text-green-400 text-xs mb-1">合意が得られた点</div>
              <div className="text-[var(--muted-foreground)] text-xs leading-relaxed">
                回答者の87%が「柔軟な働き方を維持したい」と回答 <span className="text-blue-500">[Q3]</span><span className="text-blue-500">[Q12]</span>
              </div>
            </div>
            <div>
              <div className="font-semibold text-amber-600 dark:text-amber-400 text-xs mb-1">意見が分かれた点</div>
              <div className="text-[var(--muted-foreground)] text-xs leading-relaxed">
                出社頻度は「週2-3日」派と「完全リモート」派で二極化 <span className="text-blue-500">[Q5]</span><span className="text-blue-500">[Q15]</span>
              </div>
            </div>
            <div>
              <div className="font-semibold text-blue-600 dark:text-blue-400 text-xs mb-1">提言</div>
              <div className="text-[var(--muted-foreground)] text-xs leading-relaxed">
                チームごとに出社ルールを設定する柔軟なハイブリッド制度の導入を推奨
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <section id="features" className="py-24 md:py-32 relative overflow-hidden">
      {/* Subtle background */}
      <div className="relative max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">インタビューとアンケートのいいとこどり</h2>
          <p className="text-[var(--muted-foreground)] max-w-xl mx-auto">
            AIが設問設計・動的深掘り・分析の全てを自動化。今までにない調査体験を実現します。
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex bg-[var(--muted)] rounded-full p-1 border border-[var(--border)]">
            {features.map((f, i) => (
              <button
                key={i}
                onClick={() => setActiveTab(i)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  activeTab === i
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                {f.tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-start">
          <div>
            <h3 className="text-xl md:text-2xl font-bold mb-4">{features[activeTab].title}</h3>
            <p className="text-[var(--muted-foreground)] leading-relaxed mb-6">{features[activeTab].desc}</p>
            <ul className="space-y-3">
              {features[activeTab].points.map((point, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <svg className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
          <div key={activeTab} className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-5 shadow-sm" style={{ animation: "lp-fade-in 0.3s ease both" }}>
            {features[activeTab].visual}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── Comparison ─────────────────────────── */
function ComparisonSection() {
  const rows = [
    { label: "設問設計", trad: "人力で数日", interview: "不要（対話形式）", sonar: "AIが自動生成" },
    { label: "回答の深さ", trad: "浅い（選択式）", interview: "深い", sonar: "深い（動的深掘り）" },
    { label: "スケーラビリティ", trad: "数百〜数千人", interview: "5〜10人が限界", sonar: "無制限" },
    { label: "1人あたりコスト", trad: "低い", interview: "高い", sonar: "低い" },
    { label: "分析工数", trad: "手動集計で数日", interview: "文字起こし+分析", sonar: "自動レポート" },
    { label: "意思決定への接続", trad: "円グラフ止まり", interview: "メモ頼み", sonar: "合意・対立・提言を構造化" },
    { label: "所要時間（全体）", trad: "1〜2週間", interview: "2〜4週間", sonar: "最短1日" },
  ];

  return (
    <section id="comparison" className="py-24 md:py-32 bg-[var(--muted)]">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">従来手法との比較</h2>
          <p className="text-[var(--muted-foreground)]">
            インタビューの深さと、アンケートの効率性を両立。
          </p>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--muted)]">
                <th className="text-left p-4 font-medium text-[var(--muted-foreground)]" />
                <th className="text-left p-4 font-medium text-[var(--muted-foreground)]">従来のアンケート</th>
                <th className="text-left p-4 font-medium text-[var(--muted-foreground)]">デプスインタビュー</th>
                <th className="text-left p-4 font-semibold text-blue-600 dark:text-blue-400">
                  <span className="inline-flex items-center gap-1.5">
                    倍速アンケート
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold">NEW</span>
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-t border-[var(--border)] transition-colors hover:bg-[var(--muted)]/50">
                  <td className="p-4 font-medium">{row.label}</td>
                  <td className="p-4 text-[var(--muted-foreground)]">{row.trad}</td>
                  <td className="p-4 text-[var(--muted-foreground)]">{row.interview}</td>
                  <td className="p-4 font-medium text-blue-600 dark:text-blue-400">{row.sonar}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-4">
          {rows.map((row, i) => (
            <div key={i} className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4">
              <div className="font-medium mb-3">{row.label}</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">従来</span>
                  <span className="text-[var(--muted-foreground)]">{row.trad}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">インタビュー</span>
                  <span className="text-[var(--muted-foreground)]">{row.interview}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-blue-600 dark:text-blue-400">倍速アンケート</span>
                  <span className="font-medium text-blue-600 dark:text-blue-400">{row.sonar}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── Use Cases ─────────────────────────── */
function UseCasesSection() {
  const cases = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
        </svg>
      ),
      title: "行政・自治体",
      desc: "全住民アンケートの集計・分析に1週間かかっていませんか？紙で回収→手入力→Excel集計→報告書作成の工程を、AIが一気通貫で自動化。政策立案に直結するインサイトを即日取得。",
      examples: ["全住民アンケート", "総合計画策定", "パブリックコメント"],
      color: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600",
      borderColor: "hover:border-emerald-300 dark:hover:border-emerald-700",
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
        </svg>
      ),
      title: "企業・人事",
      desc: "複数部署で似たアンケートを何度も実施していませんか？倍速アンケートなら、部署横断で意見を一元収集。「集めたけど使えない」サーベイから、施策に直結するレポートへ。",
      examples: ["エンゲージメント調査", "社内AI活用調査", "退職理由分析"],
      color: "bg-blue-50 dark:bg-blue-900/20 text-blue-600",
      borderColor: "hover:border-blue-300 dark:hover:border-blue-700",
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      ),
      title: "マーケティング・UXリサーチ",
      desc: "「ほとんどの人はアンケートでどんな質問をすれば、どんなレポートが作れるか逆算できない」。AIが最適な質問設計からインサイト抽出まで一貫して実行。",
      examples: ["顧客ニーズ調査", "プロダクト評価", "ユーザビリティ調査"],
      color: "bg-purple-50 dark:bg-purple-900/20 text-purple-600",
      borderColor: "hover:border-purple-300 dark:hover:border-purple-700",
    },
  ];

  return (
    <section id="usecases" className="py-24 md:py-32">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">活用シーン</h2>
          <p className="text-[var(--muted-foreground)]">
            「アンケートをとっただけ」で終わらせない。意思決定に直結する使い方。
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {cases.map((c, i) => (
            <div
              key={i}
              className={`bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6 ${c.borderColor} transition-colors`}
            >
              <div className={`w-12 h-12 rounded-xl ${c.color} flex items-center justify-center mb-4`}>
                {c.icon}
              </div>
              <h3 className="font-bold text-lg mb-2">{c.title}</h3>
              <p className="text-sm text-[var(--muted-foreground)] leading-relaxed mb-4">{c.desc}</p>
              <div className="flex flex-wrap gap-2">
                {c.examples.map((ex, j) => (
                  <span key={j} className="text-xs px-2.5 py-1 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)]">
                    {ex}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── Pricing ─────────────────────────── */
function PricingSection() {
  const plans = [
    {
      name: "フリー",
      price: "¥0",
      period: "",
      desc: "まずは試してみたい方に",
      highlight: false,
      cta: "無料で始める",
      ctaHref: "/",
      ctaExternal: false,
      features: [
        "月3件までアンケート作成",
        "各アンケート100回答まで",
        "AIによる質問自動生成",
        "基本レポート",
        "URLでの共有",
      ],
      limits: [
        "回答数上限あり",
        "レポートのカスタマイズ不可",
      ],
    },
    {
      name: "プロ",
      price: "¥3,980",
      period: "/月",
      desc: "本格的なアンケート運用に",
      highlight: true,
      cta: "14日間無料お試し",
      ctaHref: "/",
      ctaExternal: false,
      features: [
        "無制限のアンケート作成",
        "月1,000回答まで",
        "高度なAI分析レポート",
        "合意点・対立点の自動抽出",
        "複数アンケートの横串分析",
        "CSVエクスポート",
        "チーム3名まで",
      ],
      limits: [],
    },
    {
      name: "ビジネス",
      price: "¥9,800",
      period: "/月",
      desc: "組織全体での活用に",
      highlight: false,
      cta: "お問い合わせ",
      ctaHref: "https://calendar.app.google/dYxRJC3mcM6vMw3EA",
      ctaExternal: true,
      features: [
        "月10,000回答まで",
        "チーム無制限",
        "部署横断の一元分析",
        "カスタムレポートテンプレート",
        "Googleフォームからのインポート",
        "優先サポート",
        "SSO対応",
      ],
      limits: [],
    },
  ];

  return (
    <section id="pricing" className="py-24 md:py-32 bg-[var(--muted)]">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">料金プラン</h2>
          <p className="text-[var(--muted-foreground)] max-w-xl mx-auto">
            まずは無料で。本格運用はプロプランから。
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 items-start">
          {plans.map((plan, i) => (
            <div
              key={i}
              className={`rounded-2xl border p-6 md:p-8 flex flex-col transition-all ${
                plan.highlight
                  ? "border-blue-600 dark:border-blue-400 bg-[var(--card)] shadow-xl shadow-blue-600/10 relative scale-[1.02] md:scale-105"
                  : "border-[var(--border)] bg-[var(--card)]"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-600 text-white text-xs font-bold rounded-full shadow-lg shadow-blue-600/20">
                  おすすめ
                </div>
              )}
              <div className="mb-6">
                <h3 className="text-lg font-bold mb-1">{plan.name}</h3>
                <p className="text-sm text-[var(--muted-foreground)] mb-4">{plan.desc}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl md:text-4xl font-black">{plan.price}</span>
                  {plan.period && <span className="text-sm text-[var(--muted-foreground)]">{plan.period}</span>}
                </div>
              </div>
              <Link
                href={plan.ctaHref}
                target={plan.ctaExternal ? "_blank" : undefined}
                rel={plan.ctaExternal ? "noopener noreferrer" : undefined}
                className={`w-full py-3 px-4 rounded-lg font-medium text-sm text-center transition-all mb-6 block ${
                  plan.cta === "無料で始める"
                    ? "bg-slate-900 text-white hover:bg-black"
                    : plan.highlight
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "border-2 border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)]"
                }`}
              >
                {plan.cta}
              </Link>
              <ul className="space-y-2.5 flex-1">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-start gap-2.5 text-sm">
                    <svg className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{f}</span>
                  </li>
                ))}
                {plan.limits.map((l, j) => (
                  <li key={`limit-${j}`} className="flex items-start gap-2.5 text-sm text-[var(--muted-foreground)]">
                    <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 12H6" />
                    </svg>
                    <span>{l}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-[var(--muted-foreground)] mt-8">
          10,000回答以上の大規模利用はお問い合わせください。年間契約で20%割引。
        </p>
      </div>
    </section>
  );
}

/* ─────────────────────────── FAQ ─────────────────────────── */
function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      q: "無料で使えますか？",
      a: "はい、フリープランでは月3件・各100回答まで無料でお使いいただけます。AIによる質問生成と基本レポートも含まれます。本格運用にはプロプラン（月額¥3,980）がおすすめです。",
    },
    {
      q: "回答者はアプリのインストールが必要ですか？",
      a: "不要です。URLを共有するだけで、スマートフォンやPCのブラウザからそのまま回答できます。",
    },
    {
      q: "AIが生成する質問の品質は？",
      a: "最新のAIモデルを活用し、アンケートの目的と背景に基づいて適切な質問を生成します。さらに回答傾向を学習し、バッチごとに質問の質が向上します。「はい/いいえ」だけでなく、中間的な立場や前提を疑う選択肢も自動生成されます。",
    },
    {
      q: "何人まで回答できますか？",
      a: "回答者数に上限はありません。従来のインタビューと異なり、AIが一人ひとりに最適化された質問を生成するため、大規模でも深い意見収集が可能です。",
    },
    {
      q: "既存のGoogleフォームから移行できますか？",
      a: "Googleフォームからのインポート機能を準備中です。CSVエクスポートしたデータを取り込み、倍速アンケートの質問形式に変換できるようになります。",
    },
    {
      q: "データのセキュリティは？",
      a: "回答データはSupabaseの暗号化されたデータベースに安全に保存されます。通信はすべてHTTPS暗号化されており、第三者にデータが共有されることはありません。",
    },
  ];

  return (
    <section id="faq" className="py-24 md:py-32">
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">よくある質問</h2>
        </div>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--card)]"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-[var(--muted)] transition-colors"
              >
                <span className="font-medium text-sm pr-4">{faq.q}</span>
                <svg
                  className={`w-5 h-5 text-[var(--muted-foreground)] shrink-0 transition-transform duration-300 ${openIndex === i ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  openIndex === i ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <div className="px-5 pb-5 text-sm text-[var(--muted-foreground)] leading-relaxed">
                  {faq.a}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── Final CTA ─────────────────────────── */
function FinalCTA() {
  return (
    <section className="py-24 md:py-32 bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-800 dark:to-blue-900 text-white">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-black mb-4">
          次のアンケート運用を、
          <br className="sm:hidden" />
          倍速で試しませんか？
        </h2>
        <p className="text-blue-100 text-lg mb-8 max-w-lg mx-auto">
          まずは気になっている調査テーマを共有いただければ、
          <br className="hidden sm:block" />
          倍速アンケートでの進め方をご提案します。
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-8 py-4 rounded-lg bg-slate-900 text-white font-bold text-base hover:bg-black transition-colors shadow-lg shadow-slate-900/25"
          >
            3分で無料体験
            <svg className="ml-2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          <Link
            href="https://calendar.app.google/dYxRJC3mcM6vMw3EA"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-8 py-4 rounded-lg border border-white bg-white text-slate-900 font-bold text-base hover:bg-slate-100 transition-colors shadow-lg"
          >
            デモを予約
            <svg className="ml-2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
        <p className="mt-4 text-sm text-blue-200">アカウント登録不要 ・ デモ予約は無料</p>
      </div>
    </section>
  );
}

/* ─────────────────────────── Footer ─────────────────────────── */
const footerProductLinks = [
  {
    href: "https://baisoku-kaigi.plural-reality.com",
    label: "倍速会議（社内会議向け）",
    external: true,
  },
  {
    href: "https://baisoku-kaigi.plural-reality.com/hearing",
    label: "倍速商談（営業ヒアリング）",
    external: true,
  },
  {
    href: "https://baisoku-kaigi.plural-reality.com/gov",
    label: "千人会議（住民会議・住民アンケート）",
    external: true,
  },
  { href: "/lp", label: "倍速アンケート（AIアンケート）", active: true },
];

function ExternalLinkIcon() {
  return (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
    </svg>
  );
}

function LPFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex w-full flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <a
          href="https://www.plural-reality.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-slate-600 hover:text-slate-900 underline decoration-slate-400 hover:decoration-slate-900 transition-colors inline-flex items-center gap-1.5"
        >
          合同会社 多元現実
          <ExternalLinkIcon />
        </a>

        <nav className="flex flex-wrap items-center gap-2">
          {footerProductLinks.map((link) => (
            <div key={link.href}>
              {"active" in link && link.active ? (
                <span className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-900 cursor-default">
                  {link.label}
                  <span className="rounded bg-slate-900 px-1.5 py-0.5 text-xs text-white">
                    閲覧中
                  </span>
                </span>
              ) : "external" in link && link.external ? (
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                >
                  {link.label}
                  <ExternalLinkIcon />
                </a>
              ) : (
                <Link
                  href={link.href}
                  className="inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                >
                  {link.label}
                </Link>
              )}
            </div>
          ))}
        </nav>
      </div>
    </footer>
  );
}
