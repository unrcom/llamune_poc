export interface Model {
  id: number
  model_name: string
  version: number
  base_model: string
  description: string | null
  created_at: string
}

export interface Poc {
  default_system_prompt: string | null
  id: number
  name: string
  domain: string
  created_at: string
}

export interface SessionResponse {
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
