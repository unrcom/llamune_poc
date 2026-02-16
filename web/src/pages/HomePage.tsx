import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api } from '@/api/client'
import type { Model, Poc } from '@/types'

export function HomePage() {
  const navigate = useNavigate()
  const [models, setModels] = useState<Model[]>([])
  const [pocs, setPocs] = useState<Poc[]>([])
  const [selectedModelId, setSelectedModelId] = useState('')
  const [selectedPocId, setSelectedPocId] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchData() {
      setError('')
      try {
        const [modelsRes, pocsRes] = await Promise.allSettled([
          api.getModels(),
          api.getPocs(),
        ])
        if (modelsRes.status === 'fulfilled') setModels(modelsRes.value)
        if (pocsRes.status === 'fulfilled') setPocs(pocsRes.value)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'データ取得に失敗しました')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  async function handleStartSession() {
    if (!selectedModelId || !selectedPocId) return
    setStarting(true)
    setError('')
    try {
      const session = await api.startSession(
        Number(selectedPocId),
        Number(selectedModelId),
        systemPrompt
      )
      navigate(`/chat/${session.session_id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'セッション開始に失敗しました')
      setStarting(false)
    }
  }

  if (loading) {
    return <p className="text-muted-foreground">読み込み中...</p>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">セッション開始</h1>

      <Card>
        <CardHeader>
          <CardTitle>設定</CardTitle>
          <CardDescription>チャットを開始する前に PoC・モデル・システムプロンプトを選択してください</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">

          {/* PoC選択 */}
          <div className="space-y-2">
            <Label>PoC</Label>
            {pocs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                PoCが登録されていません。DBに直接登録してください。
              </p>
            ) : (
              <Select value={selectedPocId} onValueChange={setSelectedPocId}>
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

          {/* モデル選択 */}
          <div className="space-y-2">
            <Label>モデル</Label>
            {models.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                モデルが登録されていません。DBに直接登録してください。
              </p>
            ) : (
              <Select value={selectedModelId} onValueChange={setSelectedModelId}>
                <SelectTrigger>
                  <SelectValue placeholder="モデルを選択" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model.id} value={String(model.id)}>
                      {model.model_name}（v{model.version}）
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

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
            disabled={starting || !selectedModelId || !selectedPocId}
            className="w-full"
          >
            {starting ? '開始中...' : 'チャットを開始'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
