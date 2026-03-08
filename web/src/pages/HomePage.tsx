import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { api } from '@/api/client'
import type { Poc } from '@/types'

export function HomePage() {
  const navigate = useNavigate()
  const [pocs, setPocs] = useState<Poc[]>([])
  const [selectedPocId, setSelectedPocId] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchData() {
      setError('')
      try {
        const pocsRes = await api.getPocs()
        setPocs(pocsRes)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'データ取得に失敗しました')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  function handlePocChange(pocId: string) {
    setSelectedPocId(pocId)
    const poc = pocs.find((p) => String(p.id) === pocId)
    setSystemPrompt(poc?.default_system_prompt ?? '')
  }

  async function handleStartSession() {
    if (!selectedPocId) return
    setStarting(true)
    setError('')
    try {
      const session = await api.startSession(Number(selectedPocId), systemPrompt)
      navigate(`/chat/${session.session_id}`, { state: { app_name: session.app_name } })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'セッション開始に失敗しました')
      setStarting(false)
    }
  }

  const selectedPoc = pocs.find((p) => String(p.id) === selectedPocId)

  if (loading) {
    return <p className="text-muted-foreground">読み込み中...</p>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">セッション開始</h1>

      <Card>
        <CardHeader>
          <CardTitle>設定</CardTitle>
          <CardDescription>チャットを開始する前に PoC を選択してください</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">

          {/* PoC選択 */}
          <div className="space-y-2">
            <Label>PoC</Label>
            {pocs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                PoCが登録されていません。設定画面から作成してください。
              </p>
            ) : (
              <Select value={selectedPocId} onValueChange={handlePocChange}>
                <SelectTrigger>
                  <SelectValue placeholder="PoCを選択" />
                </SelectTrigger>
                <SelectContent>
                  {pocs.map((poc) => (
                    <SelectItem key={poc.id} value={String(poc.id)}>
                      {poc.name}（{poc.domain}）
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* 選択されたPoCの情報 */}
          {selectedPoc && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>モデル:</span>
              {selectedPoc.model_name ? (
                <Badge variant="outline">{selectedPoc.model_name} v{selectedPoc.model_version}</Badge>
              ) : (
                <span className="text-destructive text-xs">モデル未設定（設定画面で設定してください）</span>
              )}
              <span className="ml-2">app:</span>
              <code className="text-xs bg-muted px-1 rounded">{selectedPoc.app_name}</code>
            </div>
          )}

          {/* システムプロンプト */}
          <div className="space-y-2">
            <Label htmlFor="system-prompt">システムプロンプト</Label>
            <Textarea
              id="system-prompt"
              placeholder="例：あなたは会計の専門家です。日本語で回答してください。"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={4}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            onClick={handleStartSession}
            disabled={starting || !selectedPocId || !selectedPoc?.model_name}
            className="w-full"
          >
            {starting ? '開始中...' : 'チャットを開始'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
