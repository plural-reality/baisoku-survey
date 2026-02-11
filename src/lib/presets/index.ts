import shugiin2026 from "./2026-shugiin-election.json";
import { createClient } from "@/lib/supabase/server";

export interface SessionPreset {
  id?: string;
  title: string;
  purpose: string;
  backgroundText?: string;
  reportInstructions?: string;
  reportTarget?: number;
}

export interface PresetMetadata {
  ogTitle: string;
  ogDescription: string;
  ogImage?: string;
}

const PRESETS: Record<string, SessionPreset> = {
  "2026-shugiin-election": shugiin2026,
};

const PRESET_METADATA: Record<string, PresetMetadata> = {
  "2026-shugiin-election": {
    ogTitle: "2026年 衆議院選挙 AIボートマッチ",
    ogDescription:
      "AIとの対話を通じて、あなたの価値観に近い政党を見つけましょう。各政党のマニフェストに基づいて相性を診断します。",
    ogImage: "/images/ogp.png",
  },
};

export function getPreset(slug: string): SessionPreset | null {
  return PRESETS[slug] ?? null;
}

export function getPresetMetadata(slug: string): PresetMetadata | null {
  return PRESET_METADATA[slug] ?? null;
}

export async function getPresetFromDB(slug: string): Promise<SessionPreset | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("presets")
      .select("id, title, purpose, background_text, report_instructions, report_target")
      .eq("slug", slug)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      title: data.title,
      purpose: data.purpose,
      backgroundText: data.background_text ?? undefined,
      reportInstructions: data.report_instructions ?? undefined,
      reportTarget: data.report_target ?? undefined,
    };
  } catch {
    return null;
  }
}

export async function getPresetMetadataFromDB(slug: string): Promise<PresetMetadata | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("presets")
      .select("title, purpose, og_title, og_description")
      .eq("slug", slug)
      .single();

    if (error || !data) return null;

    return {
      ogTitle: data.og_title || data.title,
      ogDescription: data.og_description || data.purpose,
    };
  } catch {
    return null;
  }
}
