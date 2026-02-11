export interface Preset {
  id: string;
  slug: string;
  title: string;
  purpose: string;
  background_text: string | null;
  report_instructions: string | null;
  og_title: string | null;
  og_description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  title: string | null;
  purpose: string;
  background_text: string | null;
  report_instructions: string | null;
  phase_profile: PhaseProfile;
  status: "active" | "completed" | "paused";
  current_question_index: number;
  preset_id: string | null;
  report_target: number;
  created_at: string;
  updated_at: string;
}

export interface PhaseProfile {
  ranges: Array<{
    start: number;
    end: number;
    phase: "exploration" | "deep-dive";
  }>;
}

export interface Question {
  id: string;
  session_id: string;
  question_index: number;
  statement: string;
  detail: string | null;
  options: string[];
  phase: "exploration" | "deep-dive";
  created_at: string;
  selectedOption?: number | null;
  freeText?: string | null;
}

export interface Answer {
  id: string;
  question_id: string;
  session_id: string;
  selected_option: number;
  free_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface Analysis {
  id: string;
  session_id: string;
  batch_index: number;
  start_index: number;
  end_index: number;
  analysis_text: string;
  created_at: string;
}

export interface Report {
  id: string;
  session_id: string;
  version: number;
  report_text: string;
  created_at: string;
}

// API Request/Response types
export interface CreateSessionRequest {
  purpose: string;
  backgroundText?: string;
  title?: string;
  reportInstructions?: string;
  reportTarget?: number;
}

export interface CreateSessionResponse {
  sessionId: string;
}

export interface GenerateQuestionsRequest {
  sessionId: string;
  startIndex: number;
  endIndex: number;
}

export interface GenerateQuestionsResponse {
  questions: Question[];
}

export interface SaveAnswerRequest {
  sessionId: string;
  questionId: string;
  selectedOption: number;
  freeText?: string | null;
}

export interface SaveAnswerResponse {
  answer: Answer;
}

export interface GenerateAnalysisRequest {
  sessionId: string;
  batchIndex: number;
  startIndex: number;
  endIndex: number;
}

export interface GenerateAnalysisResponse {
  analysis: Analysis;
}

export interface GenerateReportRequest {
  sessionId: string;
}

export interface GenerateReportResponse {
  report: Report;
}

export interface SessionStateResponse {
  session: Session;
  questions: Question[];
  analyses: Analysis[];
  report: Report | null;
}

export interface CreatePresetRequest {
  title: string;
  purpose: string;
  backgroundText?: string;
  reportInstructions?: string;
  reportTarget?: number;
  ogTitle?: string;
  ogDescription?: string;
}

export interface CreatePresetResponse {
  preset: {
    slug: string;
    adminToken: string;
  };
}

// Survey (aggregate) reports
export interface SurveyReport {
  id: string;
  preset_id: string;
  version: number;
  report_text: string;
  custom_instructions: string | null;
  status: "generating" | "completed" | "failed";
  created_at: string;
}

export interface GenerateSurveyReportRequest {
  customInstructions?: string;
}

export interface GenerateSurveyReportResponse {
  report: SurveyReport;
}
