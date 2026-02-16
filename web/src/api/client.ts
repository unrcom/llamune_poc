const BASE_URL = 'http://localhost:8000'

function getApiKey(): string {
  return localStorage.getItem('api_key') ?? ''
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  requireAuth = true
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (requireAuth) {
    headers['X-API-Key'] = getApiKey()
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(error.detail ?? 'APIエラーが発生しました')
  }

  return res.json() as Promise<T>
}

export const api = {
  // Users
  createUser: (username: string) =>
    request<{ id: number; username: string; api_key: string }>(
      'POST', '/users', { username }, false
    ),

  // Models
  getModels: () =>
    request<import('../types').Model[]>('GET', '/models'),

  // Pocs
  getPocs: () =>
    request<import('../types').Poc[]>('GET', '/pocs'),

  // Sessions
  startSession: (poc_id: number, model_id: number, system_prompt: string) =>
    request<import('../types').SessionResponse>(
      'POST', '/sessions', { poc_id, model_id, system_prompt }
    ),
  endSession: (id: number) =>
    request<unknown>('PUT', `/sessions/${id}/end`),

  // Chat
  chat: (session_id: number, question: string) =>
    request<import('../types').ChatResponse>(
      'POST', '/chat', { session_id, question }
    ),

  // Logs
  getLogs: () =>
    request<import('../types').Log[]>('GET', '/logs'),
  getLog: (id: number) =>
    request<import('../types').Log>('GET', `/logs/${id}`),
  updateLog: (
    id: number,
    data: {
      evaluation?: number
      reason?: string
      correct_answer?: string
      priority?: number
    }
  ) => request<{ log_id: number; updated_at: string }>('PUT', `/logs/${id}`, data),
}
