import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api, chatStream, logsApi, datasetsApi } from '@/api/client'
import type { Log, Dataset } from '@/types'

const EVALUATION_LABELS: Record<number, string> = { 1: '良い', 2: '不十分', 3: '間違い' }
const EVALUATION_VARIANTS: Record<number, 'default' | 'secondary' | 'destructive'> = {
  1: 'default', 2: 'secondary', 3: 'destructive'
}
const PRIORITY_LABELS: Record<number, string> = { 1: '高', 2: '中', 3: '低' }

interface EvalFormState {
  evaluation: string
  correct_parts: string
  incorrect_parts: string
  missing_parts: string
  priority: string
  dataset_ids: number[]
}

export function ChatPage() {
  const { sessionId: sessionIdParam } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { app_name?: string; poc_id?: number; system_prompt?: string; edit_log_id?: number; evaluation?: number; correct_parts?: string; incorrect_parts?: string; missing_parts?: string; priority?: number; dataset_ids?: number[] } | null
  const app_name = state?.app_name ?? ''
  const poc_id = state?.poc_id
  const initial_system_prompt = state?.system_prompt ?? ''

  const [sessionId, setSessionId] = useState<number | null>(
    sessionIdParam ? Number(sessionIdParam) : null
  )
  const [question, setQuestion] = useState('')
  const [logs, setLogs] = useState<Log[]>([])
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [loading, setLoading] = useState(!!sessionIdParam)
  const [sending, setSending] = useState(false)
  const [ending] = useState(false)
  const [error, setError] = useState('')
  const [streamingAnswer, setStreamingAnswer] = useState('')
  const [evalForms, setEvalForms] = useState<Record<number, EvalFormState>>(() => {
    if (state?.edit_log_id) {
      return {
        [state.edit_log_id]: {
          evaluation: state.evaluation ? String(state.evaluation) : '',
          correct_parts: state.correct_parts ?? '',
          incorrect_parts: state.incorrect_parts ?? '',
          missing_parts: state.missing_parts ?? '',
          priority: state.priority ? String(state.priority) : '',
          dataset_ids: state.dataset_ids ?? [],
        }
      }
    }
    return {}
  })
  const [savingEval, setSavingEval] = useState<Record<number, boolean>>({})
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function fetchInitial() {
      try {
        const [allLogs, datasetsRes] = await Promise.all([
          sessionIdParam ? logsApi.getLogs() : Promise.resolve([]),
          datasetsApi.getDatasets(),
        ])
        if (sessionIdParam) {
          setLogs(allLogs as Log[])
        }
        setDatasets(datasetsRes)
      } catch {
        // ログ取得失敗は無視
      } finally {
        setLoading(false)
      }
    }
    fetchInitial()
  }, [sessionIdParam])

  // sessionIdParamがあるがstateがない場合（リロード時）はセッション情報を取得
  const [resolvedAppName, setResolvedAppName] = useState(app_name)
  const [resolvedPocId, setResolvedPocId] = useState<number | undefined>(poc_id)
  useEffect(() => {
    if (sessionIdParam && !state?.app_name) {
      api.getSession(Number(sessionIdParam)).then((session) => {
        setResolvedAppName(session.app_name)
        setResolvedPocId(session.poc_id)
      }).catch(() => {})
    }
  }, [sessionIdParam, state?.app_name])

  // 自動スクロール無効

  async function refreshLogs(sid?: number) {
    const id = sid ?? sessionId
    if (!id) return
    const allLogs = await logsApi.getLogs()
    setLogs(allLogs)
  }

  async function handleSend() {
    if (!question.trim()) return
    setSending(true)
    setError('')
    const q = question.trim()
    setQuestion('')
    setStreamingAnswer('')
    try {
      let currentSessionId = sessionId
      // 初回メッセージ時にセッションを作成
      if (!currentSessionId) {
        if (!poc_id) throw new Error('チューニング対象が指定されていません')
        const session = await api.startSession(poc_id, initial_system_prompt)
        currentSessionId = session.session_id
        setSessionId(currentSessionId)
      }
      let answer = ''
      await chatStream(currentSessionId, app_name, q, (token) => {
        answer += token
        setStreamingAnswer(answer)
      })
      await refreshLogs(currentSessionId)
      setStreamingAnswer('')
    } catch (e) {
      const msg = e instanceof Error ? e.message : '送信に失敗しました'
      console.error('handleSend error:', msg)
      setError(msg)
      setStreamingAnswer('')
    } finally {
      setSending(false)
    }
  }

  async function handleEndSession() {
    if (poc_id) {
      navigate(`/tuning/${poc_id}`)
    } else {
      navigate('/')
    }
    if (!sessionId) return
    try {
      await api.endSession(sessionId)
    } catch {
      // 終了失敗は無視
    }
  }

  function handleEvalChange(logId: number, field: keyof EvalFormState, value: string | number[]) {
    setEvalForms((prev) => ({
      ...prev,
      [logId]: {
        ...{ evaluation: '', correct_parts: '', incorrect_parts: '', missing_parts: '', priority: '', dataset_ids: [] },
        ...prev[logId],
        [field]: value,
      },
    }))
  }

  function toggleDataset(logId: number, datasetId: number) {
    const current = evalForms[logId]?.dataset_ids ?? []
    const next = current.includes(datasetId)
      ? current.filter((id) => id !== datasetId)
      : [...current, datasetId]
    handleEvalChange(logId, 'dataset_ids', next)
  }

  async function handleSaveEval(logId: number) {
    const form = evalForms[logId]
    if (!form?.evaluation) return
    setSavingEval((prev) => ({ ...prev, [logId]: true }))
    try {
      await api.updateLog(logId, {
        evaluation: Number(form.evaluation),
        correct_parts: form.correct_parts || undefined,
        incorrect_parts: form.incorrect_parts || undefined,
        missing_parts: form.missing_parts || undefined,
        priority: form.priority ? Number(form.priority) : undefined,
        dataset_ids: form.dataset_ids,
      })
      await refreshLogs()
      setEvalForms((prev) => { const next = { ...prev }; delete next[logId]; return next })
    } catch (e) {
      setError(e instanceof Error ? e.message : '評価の保存に失敗しました')
    } finally {
      setSavingEval((prev) => ({ ...prev, [logId]: false }))
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSend()
    }
  }

  if (loading) {
    return <p className="text-muted-foreground">読み込み中...</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">チャット</h1>
        <div className="flex items-center gap-2">
          {sessionId && <span className="text-sm text-muted-foreground">チャット #{sessionId}</span>}
          <Button variant="outline" size="sm" onClick={handleEndSession} disabled={ending}>
            {ending ? '終了中...' : 'チャット終了'}
          </Button>
        </div>
      </div>

      <div className="sticky top-0 bg-background pb-2 space-y-2 z-10">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Textarea
          placeholder="質問を入力（Cmd+Enter で送信）"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          disabled={sending}
        />
        <Button onClick={handleSend} disabled={sending || !question.trim()} className="w-full">
          {sending ? '回答待ち...' : '送信'}
        </Button>
      </div>

      <div className="space-y-4">
        {logs.length === 0 && !streamingAnswer && (
          <p className="text-muted-foreground text-sm">質問を入力してチャットを開始してください</p>
        )}
        {logs.map((log) => (
          <div key={log.id} className="space-y-2">
            <div className="flex justify-end">
              <div className="max-w-[80%] bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm whitespace-pre-wrap">
                {log.question}
              </div>
            </div>
            <div className="flex justify-start">
              <div className="max-w-[80%] bg-muted rounded-lg px-4 py-2 text-sm whitespace-pre-wrap">
                {log.answer}
              </div>
            </div>
            {log.evaluation && !evalForms[log.id] || (!log.evaluation && !evalForms[log.id]) ? (
              <div className="flex items-center gap-2 pl-1 flex-wrap">
                {log.evaluation ? (
                  <Badge variant={EVALUATION_VARIANTS[log.evaluation]}>
                    {EVALUATION_LABELS[log.evaluation]}
                  </Badge>
                ) : (
                  <Badge variant="outline">未評価</Badge>
                )}
                {log.priority && (
                  <Badge variant="outline">優先度: {PRIORITY_LABELS[log.priority]}</Badge>
                )}
                {log.dataset_ids.map((did) => {
                  const d = datasets.find((ds) => ds.id === did)
                  return d ? (
                    <span key={did} className="text-xs bg-muted px-1.5 py-0.5 rounded">{d.name}</span>
                  ) : null
                })}
                <button
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                  onClick={() => setEvalForms((prev) => ({
                    ...prev,
                    [log.id]: {
                      evaluation: String(log.evaluation),
                      correct_parts: log.correct_parts ?? '',
                      incorrect_parts: log.incorrect_parts ?? '',
                      missing_parts: log.missing_parts ?? '',
                      priority: log.priority ? String(log.priority) : '',
                      dataset_ids: log.dataset_ids,
                    }
                  }))}
                >
                  編集
                </button>
              </div>
            ) : (
              <Card className="border-dashed">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-sm">回答を評価する</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-3">
                  <div className="flex gap-3">
                    <div className="space-y-1 flex-1">
                      <Label className="text-xs">評価 *</Label>
                      <Select
                        value={evalForms[log.id]?.evaluation ?? ''}
                        onValueChange={(v) => handleEvalChange(log.id, 'evaluation', v)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="選択" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">良い</SelectItem>
                          <SelectItem value="2">不十分</SelectItem>
                          <SelectItem value="3">間違い</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1 flex-1">
                      <Label className="text-xs">優先度</Label>
                      <Select
                        value={evalForms[log.id]?.priority ?? ''}
                        onValueChange={(v) => handleEvalChange(log.id, 'priority', v)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="選択" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">高</SelectItem>
                          <SelectItem value="2">中</SelectItem>
                          <SelectItem value="3">低</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">正しい部分</Label>
                    <Textarea
                      className="text-xs min-h-[60px]"
                      placeholder="モデル回答の正しい部分（任意）"
                      value={evalForms[log.id]?.correct_parts ?? ''}
                      onChange={(e) => handleEvalChange(log.id, 'correct_parts', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">誤っている部分</Label>
                    <Textarea
                      className="text-xs min-h-[60px]"
                      placeholder="モデル回答の誤っている部分（任意）"
                      value={evalForms[log.id]?.incorrect_parts ?? ''}
                      onChange={(e) => handleEvalChange(log.id, 'incorrect_parts', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">不足している部分</Label>
                    <Textarea
                      className="text-xs min-h-[60px]"
                      placeholder="モデル回答の不足している部分（任意）"
                      value={evalForms[log.id]?.missing_parts ?? ''}
                      onChange={(e) => handleEvalChange(log.id, 'missing_parts', e.target.value)}
                    />
                  </div>
                  {datasets.length > 0 && (
                    <div className="space-y-1">
                      <Label className="text-xs">データセットタグ</Label>
                      <div className="flex gap-1 flex-wrap">
                        {datasets.map((d) => {
                          const selected = evalForms[log.id]?.dataset_ids?.includes(d.id) ?? false
                          return (
                            <button
                              key={d.id}
                              onClick={() => toggleDataset(log.id, d.id)}
                              className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                                selected
                                  ? 'bg-primary text-primary-foreground border-primary'
                                  : 'text-muted-foreground border-border hover:bg-muted'
                              }`}
                            >
                              {d.name}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleSaveEval(log.id)}
                      disabled={savingEval[log.id] || !evalForms[log.id]?.evaluation}
                    >
                      {savingEval[log.id] ? '保存中...' : '評価を保存'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEvalForms((prev) => { const next = { ...prev }; delete next[log.id]; return next })}
                    >
                      キャンセル
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ))}

        {streamingAnswer && (
          <div className="space-y-2">
            <div className="flex justify-start">
              <div className="max-w-[80%] bg-muted rounded-lg px-4 py-2 text-sm whitespace-pre-wrap">
                {streamingAnswer}
                <span className="animate-pulse">▌</span>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

    </div>
  )
}
