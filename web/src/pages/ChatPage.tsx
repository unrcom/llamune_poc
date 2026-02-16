import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api } from '@/api/client'
import type { Log } from '@/types'

const EVALUATION_LABELS: Record<number, string> = { 1: '良い', 2: '不十分', 3: '間違い' }
const EVALUATION_VARIANTS: Record<number, 'default' | 'secondary' | 'destructive'> = {
  1: 'default', 2: 'secondary', 3: 'destructive'
}
const PRIORITY_LABELS: Record<number, string> = { 1: '高', 2: '中', 3: '低' }

interface EvalFormState {
  evaluation: string
  reason: string
  correct_answer: string
  priority: string
}

export function ChatPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const [question, setQuestion] = useState('')
  const [logs, setLogs] = useState<Log[]>([])
  const [sending, setSending] = useState(false)
  const [ending, setEnding] = useState(false)
  const [error, setError] = useState('')
  const [evalForms, setEvalForms] = useState<Record<number, EvalFormState>>({})
  const [savingEval, setSavingEval] = useState<Record<number, boolean>>({})
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  async function handleSend() {
    if (!question.trim() || !sessionId) return
    setSending(true)
    setError('')
    try {
      const res = await api.chat(Number(sessionId), question.trim())
      const newLog: Log = {
        id: res.log_id,
        session_id: Number(sessionId),
        question: question.trim(),
        answer: res.answer,
        evaluation: null,
        reason: null,
        correct_answer: null,
        priority: null,
        status: 1,
        created_at: new Date().toISOString(),
      }
      setLogs((prev) => [...prev, newLog])
      setQuestion('')
    } catch (e) {
      setError(e instanceof Error ? e.message : '送信に失敗しました')
    } finally {
      setSending(false)
    }
  }

  async function handleEndSession() {
    if (!sessionId) return
    setEnding(true)
    try {
      await api.endSession(Number(sessionId))
      navigate('/logs')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'セッション終了に失敗しました')
      setEnding(false)
    }
  }

  function handleEvalChange(logId: number, field: keyof EvalFormState, value: string) {
    setEvalForms((prev) => ({
      ...prev,
      [logId]: { ...{ evaluation: '', reason: '', correct_answer: '', priority: '' }, ...prev[logId], [field]: value },
    }))
  }

  async function handleSaveEval(logId: number) {
    const form = evalForms[logId]
    if (!form?.evaluation) return
    setSavingEval((prev) => ({ ...prev, [logId]: true }))
    try {
      const updated = await api.updateLog(logId, {
        evaluation: Number(form.evaluation),
        reason: form.reason || undefined,
        correct_answer: form.correct_answer || undefined,
        priority: form.priority ? Number(form.priority) : undefined,
      })
      setLogs((prev) => prev.map((l) => (l.id === logId ? updated : l)))
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">チャット</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">セッション #{sessionId}</span>
          <Button variant="outline" size="sm" onClick={handleEndSession} disabled={ending}>
            {ending ? '終了中...' : 'セッション終了'}
          </Button>
        </div>
      </div>

      {/* ログ一覧 */}
      <div className="space-y-4">
        {logs.length === 0 && (
          <p className="text-muted-foreground text-sm">質問を入力してチャットを開始してください</p>
        )}
        {logs.map((log) => (
          <div key={log.id} className="space-y-2">
            {/* 質問 */}
            <div className="flex justify-end">
              <div className="max-w-[80%] bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm whitespace-pre-wrap">
                {log.question}
              </div>
            </div>
            {/* 回答 */}
            <div className="flex justify-start">
              <div className="max-w-[80%] bg-muted rounded-lg px-4 py-2 text-sm whitespace-pre-wrap">
                {log.answer}
              </div>
            </div>
            {/* 評価済みバッジ */}
            {log.evaluation && (
              <div className="flex items-center gap-2 pl-1">
                <Badge variant={EVALUATION_VARIANTS[log.evaluation]}>
                  {EVALUATION_LABELS[log.evaluation]}
                </Badge>
                {log.priority && (
                  <Badge variant="outline">優先度: {PRIORITY_LABELS[log.priority]}</Badge>
                )}
              </div>
            )}
            {/* 評価フォーム */}
            {!log.evaluation && (
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
                    <Label className="text-xs">理由</Label>
                    <Textarea
                      className="text-xs min-h-[60px]"
                      placeholder="評価の理由（任意）"
                      value={evalForms[log.id]?.reason ?? ''}
                      onChange={(e) => handleEvalChange(log.id, 'reason', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">正解</Label>
                    <Textarea
                      className="text-xs min-h-[60px]"
                      placeholder="正しい回答（任意）"
                      value={evalForms[log.id]?.correct_answer ?? ''}
                      onChange={(e) => handleEvalChange(log.id, 'correct_answer', e.target.value)}
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleSaveEval(log.id)}
                    disabled={savingEval[log.id] || !evalForms[log.id]?.evaluation}
                  >
                    {savingEval[log.id] ? '保存中...' : '評価を保存'}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* 入力エリア */}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="sticky bottom-0 bg-background pt-2 pb-4 space-y-2">
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
    </div>
  )
}
