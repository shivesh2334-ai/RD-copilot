export type Sex = "male" | "female" | "other";

export interface Patient {
  id: string;
  name: string;
  age: number;
  sex: Sex;
  mobile?: string | null;
  email?: string | null;
  created_at: string;
  created_by?: string | null;
}

export interface Consult {
  id: string;
  patient_id: string;
  notes: string;
  plan_treatment: string;
  plan_investigation: string;
  plan_comments: string;
  ai_summary?: string | null;
  ai_raw_response?: string | null;
  created_at: string;
  updated_at: string;
}

export type FeedbackSource = "consult_ai" | "ask_ai";
export type FeedbackVote = "up" | "down";

export interface AiFeedback {
  id?: string;
  source: FeedbackSource;
  vote: FeedbackVote;
  prompt: string;
  ai_output: string;
  patient_id?: string | null;
  consult_id?: string | null;
  created_at?: string;
}
