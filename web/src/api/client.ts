const MONKEY_URL = import.meta.env.VITE_MONKEY_URL ?? 'http://localhost:4000'

export function getToken(): string {
  return localStorage.getItem('jwt_token') ?? ''
}

export function setToken(token: string) {
  localStorage.setItem('jwt_token', token)
}

export function clearToken() {
  localStorage.removeItem('jwt_token')
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
    const token = getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${MONKEY_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401) {
    clearToken()
    window.location.href = '/login'
    throw new Error('認証が必要です')
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(error.detail ?? 'APIエラーが発生しました')
  }

  return res.json() as Promise<T>
}

// ストリーミングチャット用（fetch直接）
export async function chatStream(
  session_id: number,
  app_name: string,
  question: string,
  onToken: (token: string) => void
): Promise<void> {
  const token = getToken()
  const res = await fetch(`${MONKEY_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ session_id, app_name, question }),
  })

  if (res.status === 401) {
    clearToken()
    window.location.href = '/login'
    throw new Error('認証が必要です')
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(error.detail ?? 'チャットに失敗しました')
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error('ストリーム取得に失敗しました')

  const decoder = new TextDecoder()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    onToken(decoder.decode(value, { stream: true }))
  }
}

export const MONKEY_WS_URL = MONKEY_URL.replace(/^http/, 'ws')

export const api = {
  // Auth
  login: (username: string, password: string) =>
    request<{ access_token: string; token_type: string }>(
      'POST', '/api/poc/auth/login', { username, password }, false
    ),

  // Models
  getModels: () =>
    request<import('../types').Model[]>('GET', '/api/poc/models'),

  // Pocs
  getPocs: () =>
    request<import('../types').Poc[]>('GET', '/api/poc/pocs'),
  createPoc: (data: { name: string; domain: string; model_id?: number; default_system_prompt?: string }) =>
    request<import('../types').Poc>('POST', '/api/poc/pocs', data),
  updatePoc: (id: number, data: { name?: string; domain?: string; model_id?: number; default_system_prompt?: string }) =>
    request<import('../types').Poc>('PUT', `/api/poc/pocs/${id}`, data),

  // Sessions
  getSession: (id: number) =>
    request<import('../types').SessionDetail>('GET', `/api/poc/sessions/${id}`),
  startSession: (poc_id: number, system_prompt: string) =>
    request<import('../types').SessionResponse>(
      'POST', '/api/poc/sessions', { poc_id, system_prompt }
    ),
  endSession: (id: number) =>
    request<unknown>('PUT', `/api/poc/sessions/${id}/end`),

  // Logs
  getLogs: () =>
    request<import('../types').Log[]>('GET', '/api/poc/logs'),
  getLog: (id: number) =>
    request<import('../types').Log>('GET', `/api/poc/logs/${id}`),
  updateLog: (
    id: number,
    data: {
      evaluation?: number
      reason?: string
      correct_answer?: string
      priority?: number
    }
  ) => request<{ log_id: number; updated_at: string }>('PUT', `/api/poc/logs/${id}`, data),
}
