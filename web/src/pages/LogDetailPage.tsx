import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { api } from '@/api/client'
import type { Log } from '@/types'

const EVALUATION_LABELS: Record<number, string> = { 1: '良い', 2: '不十分', 3: '間違い' }
const EVALUATION_VARIANTS: Record<number, 'default' | 'secondary' | 'destructive'> = {
  1: 'default', 2: 'secondary', 3: 'destructive'
}
const PRIORITY_LABELS: Record<number, string> = { 1: '高', 2: '中', 3: '低' }
const STATUS_LABELS: Record<number, string> = { 1: '未処理', 2: '訓練済み', 3: '検証済み' }

export function LogDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [log, setLog] = useState<Log | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const [evaluation, setEvaluation] = useState('')
  const [reason, setReason] = useState('')
  const [correctAnswer, setCorrectAnswer] = useState('')
  const [priority, setPriority] = useState('')

  useEffect(() => {
    async function fetchLog() {
      if (!id) return
      setError('')
      try {
        const res = await api.getLog(Number(id))
        setLog(res)
        setEvaluation(res.evaluation ? String(res.evaluation) : '')
        setReason(res.reason ?? '')
        setCorrectAnswer(res.correct_answer ?? '')
        setPriority(res.priority ? String(res.priority) : '')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'ログの取得に失敗しました')
      } finally {
        setLoading(false)
      }
    }
    fetchLog()
  }, [id])

  async function handleSave() {
    if (!id || !evaluation) return
    setSaving(true)
    setError('')
    try {
      const updated = await api.updateLog(Number(id), {
        evaluation: Number(evaluation),
        reason: reason || undefined,
        correct_answer: correctAnswer || undefined,
        priority: priority ? Number(priority) : undefined,
      })
      setLog(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-muted-foreground">読み込み中...</p>
  if (!log) return <p className="text-destructive">ログが見つかりません</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => navigate('/logs')}>
          ← 一覧に戻る
        </Button>
        <h1 className="text-2xl font-bold">ログ詳細 #{log.id}</h1>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground">
          セッション #{log.session_id} · {new Date(log.created_at).toLocaleString('ja-JP')}
        </span>
        <Badge variant="outline">{STATUS_LABELS[log.status]}</Badge>
        {log.evaluation && (
          <Badge variant={EVALUATION_VARIANTS[log.evaluation]}>
            {EVALUATION_LABELS[log.evaluation]}
          </Badge>
        )}
        {log.priority && (
          <Badge variant="outline">優先度: {PRIORITY_LABELS[log.priority]}</Badge>
        )}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">質問</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap">{log.question}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">LLM の回答</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap">{log.answer}</p>
        </CardContent>
      </Card>

      <Separator />

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">評価</h2>

        <div className="flex gap-4">
          <div className="space-y-2 flex-1">
            <Label>評価 *</Label>
            <Select value={evaluation} onValueChange={setEvaluation}>
              <SelectTrigger>
                <SelectValue placeholder="評価を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">良い</SelectItem>
                <SelectItem value="2">不十分</SelectItem>
                <SelectItem value="3">間違い</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 flex-1">
            <Label>優先度</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue placeholder="優先度を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">高</SelectItem>
                <SelectItem value="2">中</SelectItem>
                <SelectItem value="3">低</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reason">理由</Label>
          <Textarea
            id="reason"
            placeholder="評価の理由（任意）"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="correct-answer">正解</Label>
          <Textarea
            id="correct-answer"
            placeholder="正しい回答（任意）"
            value={correctAnswer}
            onChange={(e) => setCorrectAnswer(e.target.value)}
            rows={4}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button onClick={handleSave} disabled={saving || !evaluation}>
          {saved ? '保存しました ✓' : saving ? '保存中...' : '評価を保存'}
        </Button>
      </div>
    </div>
  )
}
