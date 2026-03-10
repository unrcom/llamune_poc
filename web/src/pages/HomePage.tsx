import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { api } from '@/api/client'
import type { Poc } from '@/types'

export function HomePage() {
  const navigate = useNavigate()
  const [pocs, setPocs] = useState<Poc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getPocs()
      .then(setPocs)
      .catch((e) => setError(e instanceof Error ? e.message : 'データ取得に失敗しました'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-muted-foreground">読み込み中...</p>
  if (error) return <p className="text-destructive">{error}</p>

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">チューニング</h1>

      {pocs.length === 0 ? (
        <p className="text-muted-foreground">チューニング対象が登録されていません。設定画面から作成してください。</p>
      ) : (
        <div className="grid gap-3">
          {pocs.map((poc) => (
            <Card
              key={poc.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => navigate(`/tuning/${poc.id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{poc.name}</CardTitle>
                  <span className="text-xs text-muted-foreground">{poc.session_count} セッション</span>
                </div>
              </CardHeader>
              <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{poc.domain}</span>
                <span>·</span>
                {poc.model_name ? (
                  <Badge variant="outline">
                    {poc.model_name} v{poc.model_version}
                  </Badge>
                ) : (
                  <span className="text-destructive text-xs">モデル未設定</span>
                )}
                <span>·</span>
                <code className="text-xs bg-muted px-1 rounded">{poc.app_name}</code>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
