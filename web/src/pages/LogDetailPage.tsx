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
import type { Log, SessionDetail } from '@/types'

const EVALUATION_LABELS: Record<number, string> = { 1: '良い', 2: '不十分', 3: '間違い' }
const EVALUATION_VARIANTS: Record<number, 'default' | 'secondary' | 'destructive'> = {
  1: 'default', 2: 'secondary', 3: 'destructive'
}
const PRIORITY_LABELS: Record<number, string> = { 1: '高', 2: '中', 3: '低' }
const TRAINING_ROLE_LABELS: Record<number, string> = {
  1: 'correction（修正）',
  2: 'reinforcement（強化）',
  3: 'graduated（修了）',
  4: 'negative（否定例）',
  5: 'synthetic（合成）',
  6: 'boundary（境界）',
}
const STATUS_LABELS: Record<number, string> = { 1: '未処理', 2: '訓練済み', 3: '検証済み' }

export function LogDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [log, setLog] = useState<Log | null>(null)
  const [session, setSession] = useState<SessionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const [evaluation, setEvaluation] = useState('')
  const [correctParts, setCorrectParts] = useState('')
  const [incorrectParts, setIncorrectParts] = useState('')
  const [missingParts, setMissingParts] = useState('')
  const [priority, setPriority] = useState('')
  const [trainingRole, setTrainingRole] = useState('')

  useEffect(() => {
    async function fetchLog() {
      if (!id) return
      setError('')
      try {
        const res = await api.getLog(Number(id))
        setLog(res)
        setEvaluation(res.evaluation ? String(res.evaluation) : '')
        setCorrectParts(res.correct_parts ?? '')
        setIncorrectParts(res.incorrect_parts ?? '')
        setMissingParts(res.missing_parts ?? '')
        setPriority(res.priority ? String(res.priority) : '')
        setTrainingRole(res.training_role ? String(res.training_role) : '')
        const sessionRes = await api.getSession(res.session_id)
        setSession(sessionRes)
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
      await api.updateLog(Number(id), {
        evaluation: Number(evaluation),
        correct_parts: correctParts || undefined,
        incorrect_parts: incorrectParts || undefined,
        missing_parts: missingParts || undefined,
        priority: priority ? Number(priority) : undefined,
        training_role: trainingRole ? Number(trainingRole) : undefined,
      })
      const updated = await api.getLog(Number(id))
      setLog(updated)
      setSaved(true)
      setTimeout(() => navigate('/logs'), 1500)
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
          セッション #{log.session_id} · {new Date(log.timestamp).toLocaleString('ja-JP')}
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

      {/* セッション情報 */}
      {session && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">セッション情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex gap-2">
              <span className="text-muted-foreground w-32 shrink-0">PoC</span>
              <span>{session.poc_name}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-muted-foreground w-32 shrink-0">モデル</span>
              <span>{session.model_name}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-muted-foreground w-32 shrink-0">システムプロンプト</span>
              <span className="whitespace-pre-wrap">{session.system_prompt || '（未設定）'}</span>
            </div>
          </CardContent>
        </Card>
      )}

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
          <Label>トレーニングロール</Label>
          <Select value={trainingRole} onValueChange={setTrainingRole}>
            <SelectTrigger>
              <SelectValue placeholder="トレーニングロールを選択（任意）" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TRAINING_ROLE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="correct-parts">正しい部分</Label>
          <Textarea
            id="correct-parts"
            placeholder="モデル回答の正しい部分（任意）"
            value={correctParts}
            onChange={(e) => setCorrectParts(e.target.value)}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="incorrect-parts">誤っている部分</Label>
          <Textarea
            id="incorrect-parts"
            placeholder="モデル回答の誤っている部分（任意）"
            value={incorrectParts}
            onChange={(e) => setIncorrectParts(e.target.value)}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="missing-parts">不足している部分</Label>
          <Textarea
            id="missing-parts"
            placeholder="モデル回答の不足している部分（任意）"
            value={missingParts}
            onChange={(e) => setMissingParts(e.target.value)}
            rows={3}
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
