import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { api } from '@/api/client'
import type { Log } from '@/types'

const EVALUATION_LABELS: Record<number, string> = { 1: '良い', 2: '不十分', 3: '間違い' }
const EVALUATION_VARIANTS: Record<number, 'default' | 'secondary' | 'destructive'> = {
  1: 'default', 2: 'secondary', 3: 'destructive'
}
const PRIORITY_LABELS: Record<number, string> = { 1: '高', 2: '中', 3: '低' }
const STATUS_LABELS: Record<number, string> = { 1: '未処理', 2: '訓練済み', 3: '検証済み' }

export function LogsPage() {
  const navigate = useNavigate()
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchLogs() {
      setError('')
      try {
        const res = await api.getLogs()
        setLogs(res)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'ログの取得に失敗しました')
      } finally {
        setLoading(false)
      }
    }
    fetchLogs()
  }, [])

  if (loading) {
    return <p className="text-muted-foreground">読み込み中...</p>
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">ログ一覧</h1>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {logs.length === 0 ? (
        <p className="text-muted-foreground text-sm">ログがありません</p>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <Card
              key={log.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => navigate(`/logs/${log.id}`)}
            >
              <CardContent className="px-4 py-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    #{log.id} · セッション #{log.session_id} · {new Date(log.timestamp).toLocaleString('ja-JP')}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
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
                    <Badge variant="outline">{STATUS_LABELS[log.status]}</Badge>
                  </div>
                </div>
                <p className="text-sm font-medium line-clamp-1">{log.question}</p>
                <p className="text-sm text-muted-foreground line-clamp-2">{log.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
