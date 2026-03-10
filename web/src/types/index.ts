export interface Model {
  id: number
  model_name: string
  version: number
  base_model: string
  description: string | null
  session_count: number
  created_at: string
}

export interface Poc {
  id: number
  name: string
  domain: string
  app_name: string
  model_id: number | null
  model_name: string | null
  model_version: number | null
  default_system_prompt: string | null
  session_count: number
  created_at: string
}

export interface SessionResponse {
  app_name: string
  session_id: number
  poc_name: string
  model_name: string
  started_at: string
}

export interface Session {
  id: number
  poc_id: number
  model_id: number
  system_prompt: string
  started_at: string
  ended_at: string | null
}

export interface ChatResponse {
  log_id: number
  answer: string
}

export interface Log {
  id: number
  session_id: number
  question: string
  answer: string
  timestamp: string
  evaluation: number | null
  reason: string | null
  correct_answer: string | null
  priority: number | null
  status: number
  memo: string | null
  dataset_ids: number[]
  system_prompt_version: number | null
  system_prompt_content: string | null
}

export type Evaluation = 1 | 2 | 3
export type Priority = 1 | 2 | 3
export type Status = 1 | 2 | 3

export interface SessionDetail {
  session_id: number
  poc_name: string
  model_name: string
  system_prompt: string
  started_at: string
  ended_at: string | null
}

export interface Dataset {
  id: number
  name: string
  description: string | null
  is_system: boolean
  created_by: number | null
  created_at: string
}

export interface SystemPrompt {
  id: number
  poc_id: number
  content: string
  version: number
  created_by: number | null
  created_at: string
}
