export interface Model {
  id: number
  model_name: string
  version: number
  base_model: string
  description: string | null
  created_at: string
}

export interface Poc {
  id: number
  name: string
  domain: string
  created_at: string
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
  evaluation: number | null
  reason: string | null
  correct_answer: string | null
  priority: number | null
  status: number
  created_at: string
}

export type Evaluation = 1 | 2 | 3
export type Priority = 1 | 2 | 3
export type Status = 1 | 2 | 3
