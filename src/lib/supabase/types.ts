export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      sessions: {
        Row: {
          id: string;
          title: string | null;
          purpose: string;
          background_text: string | null;
          report_instructions: string | null;
          fixed_questions: Json;
          exploration_themes: Json;
          phase_profile: Json;
          status: "active" | "completed" | "paused";
          current_question_index: number;
          form_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title?: string | null;
          purpose: string;
          background_text?: string | null;
          report_instructions?: string | null;
          fixed_questions?: Json;
          exploration_themes?: Json;
          phase_profile?: Json;
          status?: "active" | "completed" | "paused";
          current_question_index?: number;
          form_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string | null;
          purpose?: string;
          background_text?: string | null;
          report_instructions?: string | null;
          fixed_questions?: Json;
          exploration_themes?: Json;
          phase_profile?: Json;
          status?: "active" | "completed" | "paused";
          current_question_index?: number;
          form_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      questions: {
        Row: {
          id: string;
          session_id: string;
          question_index: number;
          statement: string;
          detail: string | null;
          options: Json;
          phase: "exploration" | "deep-dive";
          source: string | null;
          question_type: string;
          scale_config: Json | null;
          form_question_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          question_index: number;
          statement: string;
          detail?: string | null;
          options: Json;
          phase: "exploration" | "deep-dive";
          source?: string | null;
          question_type?: string;
          scale_config?: Json | null;
          form_question_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          question_index?: number;
          statement?: string;
          detail?: string | null;
          options?: Json;
          phase?: "exploration" | "deep-dive";
          source?: string | null;
          question_type?: string;
          scale_config?: Json | null;
          form_question_id?: string | null;
          created_at?: string;
        };
      };
      answers: {
        Row: {
          id: string;
          question_id: string;
          session_id: string;
          selected_option: number | null;
          free_text: string | null;
          selected_options: Json | null;
          answer_text: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          question_id: string;
          session_id: string;
          selected_option?: number | null;
          free_text?: string | null;
          selected_options?: Json | null;
          answer_text?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          question_id?: string;
          session_id?: string;
          selected_option?: number | null;
          free_text?: string | null;
          selected_options?: Json | null;
          answer_text?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      analyses: {
        Row: {
          id: string;
          session_id: string;
          batch_index: number;
          start_index: number;
          end_index: number;
          analysis_text: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          batch_index: number;
          start_index: number;
          end_index: number;
          analysis_text: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          batch_index?: number;
          start_index?: number;
          end_index?: number;
          analysis_text?: string;
          created_at?: string;
        };
      };
      reports: {
        Row: {
          id: string;
          session_id: string;
          version: number;
          report_text: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          version?: number;
          report_text: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          version?: number;
          report_text?: string;
          created_at?: string;
        };
      };
      forms: {
        Row: {
          id: string;
          slug: string;
          user_id: string;
          title: string;
          purpose: string;
          background_text: string | null;
          report_instructions: string | null;
          exploration_themes: Json;
          report_target: number;
          status: "draft" | "published" | "closed";
          og_title: string | null;
          og_description: string | null;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          user_id: string;
          title: string;
          purpose: string;
          background_text?: string | null;
          report_instructions?: string | null;
          exploration_themes?: Json;
          report_target?: number;
          status?: "draft" | "published" | "closed";
          og_title?: string | null;
          og_description?: string | null;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          user_id?: string;
          title?: string;
          purpose?: string;
          background_text?: string | null;
          report_instructions?: string | null;
          exploration_themes?: Json;
          report_target?: number;
          status?: "draft" | "published" | "closed";
          og_title?: string | null;
          og_description?: string | null;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      form_questions: {
        Row: {
          id: string;
          form_id: string;
          position: number;
          statement: string;
          detail: string | null;
          question_type: string;
          options: Json;
          scale_config: Json | null;
          is_required: boolean;
          source: string;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          form_id: string;
          position: number;
          statement: string;
          detail?: string | null;
          question_type?: string;
          options?: Json;
          scale_config?: Json | null;
          is_required?: boolean;
          source?: string;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          form_id?: string;
          position?: number;
          statement?: string;
          detail?: string | null;
          question_type?: string;
          options?: Json;
          scale_config?: Json | null;
          is_required?: boolean;
          source?: string;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
