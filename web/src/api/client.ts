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
export function getRefreshToken(): string {
  return localStorage.getItem('refresh_token') ?? ''
}
export function setRefreshToken(token: string) {
  localStorage.setItem('refresh_token', token)
}
export function clearRefreshToken() {
  localStorage.removeItem('refresh_token')
}
export function clearTokens() {
  clearToken()
  clearRefreshToken()
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false
  try {
    const res = await fetch(`${MONKEY_URL}/api/poc/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
    if (!res.ok) {
      clearTokens()
      return false
    }
    const data = await res.json()
    setToken(data.access_token)
    setRefreshToken(data.refresh_token)
    return true
  } catch {
    clearTokens()
    return false
  }
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
  let res = await fetch(`${MONKEY_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 401 && requireAuth) {
    const refreshed = await tryRefresh()
    if (refreshed) {
      headers['Authorization'] = `Bearer ${getToken()}`
      res = await fetch(`${MONKEY_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      })
    }
  }
  if (res.status === 401) {
    clearTokens()
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
  let res = await fetch(`${MONKEY_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ session_id, app_name, question }),
  })
  if (res.status === 401) {
    const refreshed = await tryRefresh()
    if (refreshed) {
      res = await fetch(`${MONKEY_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ session_id, app_name, question }),
      })
    }
  }
  if (res.status === 401) {
    clearTokens()
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

export const MONKEY_WS_URL = import.meta.env.VITE_MONKEY_WS_URL ?? MONKEY_URL.replace(/^http/, 'ws')

export const api = {
  // Auth
  login: (username: string, password: string) =>
    request<{ access_token: string; refresh_token: string; token_type: string }>(
      'POST', '/api/poc/auth/login', { username, password }, false
    ),
  refresh: (refresh_token: string) =>
    request<{ access_token: string; refresh_token: string }>(
      'POST', '/api/poc/auth/refresh', { refresh_token }, false
    ),
  logout: (refresh_token: string) =>
    request<{ message: string }>(
      'POST', '/api/poc/auth/logout', { refresh_token }, false
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
      dataset_ids?: number[]
    }
  ) => request<{ log_id: number; updated_at: string }>('PUT', `/api/poc/logs/${id}`, data),
}

// datasets追加分（client.tsのapi objectを拡張するため別途export）
export const datasetsApi = {
  getDatasets: () =>
    request<import('../types').Dataset[]>('GET', '/api/poc/datasets'),
  createSystemDataset: (data: { name: string; description?: string }) =>
    request<import('../types').Dataset>('POST', '/api/poc/datasets', data),
  createUserDataset: (data: { name: string; description?: string }) =>
    request<import('../types').Dataset>('POST', '/api/poc/datasets/user', data),
  updateDataset: (id: number, data: { name?: string; description?: string }) =>
    request<import('../types').Dataset>('PUT', `/api/poc/datasets/${id}`, data),
  deleteDataset: (id: number) =>
    request<void>('DELETE', `/api/poc/datasets/${id}`),
}

export const logsApi = {
  getLogs: (params?: { poc_id?: number; keyword?: string; dataset_id?: number }) => {
    const query = new URLSearchParams()
    if (params?.poc_id !== undefined) query.set('poc_id', String(params.poc_id))
    if (params?.keyword) query.set('keyword', params.keyword)
    if (params?.dataset_id !== undefined) query.set('dataset_id', String(params.dataset_id))
    const qs = query.toString()
    return request<import('../types').Log[]>('GET', `/api/poc/logs${qs ? `?${qs}` : ''}`)
  },
}
