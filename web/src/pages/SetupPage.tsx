import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api } from '@/api/client'
import type { Poc, Model } from '@/types'

export function SetupPage() {
  const [pocs, setPocs] = useState<Poc[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [pocsLoading, setPocsLoading] = useState(true)
  const [pocsError, setPocsError] = useState('')

  const [newPocName, setNewPocName] = useState('')
  const [newPocDomain, setNewPocDomain] = useState('')
  const [newPocModelId, setNewPocModelId] = useState('')
  const [newPocPrompt, setNewPocPrompt] = useState('')
  const [creatingPoc, setCreatingPoc] = useState(false)
  const [createPocError, setCreatePocError] = useState('')

  const [editingPocId, setEditingPocId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editDomain, setEditDomain] = useState('')
  const [editModelId, setEditModelId] = useState('')
  const [editPrompt, setEditPrompt] = useState('')
  const [savingPoc, setSavingPoc] = useState(false)
  const [savePocError, setSavePocError] = useState('')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setPocsLoading(true)
    setPocsError('')
    try {
      const [pocsRes, modelsRes] = await Promise.all([api.getPocs(), api.getModels()])
      setPocs(pocsRes)
      setModels(modelsRes)
    } catch (e) {
      setPocsError(e instanceof Error ? e.message : 'データの取得に失敗しました')
    } finally {
      setPocsLoading(false)
    }
  }

  async function handleCreatePoc() {
    if (!newPocName.trim() || !newPocDomain.trim()) return
    setCreatingPoc(true)
    setCreatePocError('')
    try {
      await api.createPoc({
        name: newPocName.trim(),
        domain: newPocDomain.trim(),
        model_id: newPocModelId ? Number(newPocModelId) : undefined,
        default_system_prompt: newPocPrompt.trim() || undefined,
      })
      setNewPocName(''); setNewPocDomain(''); setNewPocModelId(''); setNewPocPrompt('')
      await fetchAll()
    } catch (e) {
      setCreatePocError(e instanceof Error ? e.message : 'PoC作成に失敗しました')
    } finally {
      setCreatingPoc(false)
    }
  }

  function handleStartEdit(poc: Poc) {
    setEditingPocId(poc.id)
    setEditName(poc.name)
    setEditDomain(poc.domain)
    setEditModelId(poc.model_id ? String(poc.model_id) : '')
    setEditPrompt(poc.default_system_prompt ?? '')
    setSavePocError('')
  }

  async function handleSavePoc(id: number) {
    setSavingPoc(true)
    setSavePocError('')
    try {
      await api.updatePoc(id, {
        name: editName.trim() || undefined,
        domain: editDomain.trim() || undefined,
        model_id: editModelId ? Number(editModelId) : undefined,
        default_system_prompt: editPrompt.trim() || undefined,
      })
      setEditingPocId(null)
      await fetchAll()
    } catch (e) {
      setSavePocError(e instanceof Error ? e.message : 'PoC更新に失敗しました')
    } finally {
      setSavingPoc(false)
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">設定</h1>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">PoC管理</h2>
        {pocsLoading ? (
          <p className="text-muted-foreground text-sm">読み込み中...</p>
        ) : pocsError ? (
          <p className="text-sm text-destructive">{pocsError}</p>
        ) : pocs.length === 0 ? (
          <p className="text-muted-foreground text-sm">PoCが登録されていません</p>
        ) : (
          <div className="space-y-3">
            {pocs.map((poc) => (
              <Card key={poc.id}>
                <CardContent className="px-4 py-3">
                  {editingPocId === poc.id ? (
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <div className="space-y-1 flex-1">
                          <Label className="text-xs">名前</Label>
                          <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                        </div>
                        <div className="space-y-1 flex-1">
                          <Label className="text-xs">ドメイン</Label>
                          <Input value={editDomain} onChange={(e) => setEditDomain(e.target.value)} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">モデル</Label>
                        <Select value={editModelId} onValueChange={setEditModelId}>
                          <SelectTrigger><SelectValue placeholder="モデルを選択" /></SelectTrigger>
                          <SelectContent>
                            {models.map((m) => (
                              <SelectItem key={m.id} value={String(m.id)}>{m.model_name}（v{m.version}）</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">デフォルトシステムプロンプト</Label>
                        <Textarea value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)} rows={3} />
                      </div>
                      {savePocError && <p className="text-sm text-destructive">{savePocError}</p>}
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleSavePoc(poc.id)} disabled={savingPoc}>
                          {savingPoc ? '保存中...' : '保存'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingPocId(null)}>キャンセル</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{poc.name}（{poc.domain}）</p>
                          <code className="text-xs bg-muted px-1 rounded">{poc.app_name}</code>
                        </div>
                        {poc.model_name ? (
                          <Badge variant="outline" className="text-xs">{poc.model_name} v{poc.model_version}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">モデル未設定</span>
                        )}
                        <p className="text-muted-foreground text-xs">{poc.default_system_prompt || '（システムプロンプト未設定）'}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => handleStartEdit(poc)}>編集</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">新規PoC作成</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3">
              <div className="space-y-1 flex-1">
                <Label className="text-xs">名前 *</Label>
                <Input placeholder="例：会計システム向けPoC" value={newPocName} onChange={(e) => setNewPocName(e.target.value)} />
              </div>
              <div className="space-y-1 flex-1">
                <Label className="text-xs">ドメイン *</Label>
                <Input placeholder="例：会計" value={newPocDomain} onChange={(e) => setNewPocDomain(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">モデル</Label>
              <Select value={newPocModelId} onValueChange={setNewPocModelId}>
                <SelectTrigger><SelectValue placeholder="モデルを選択（任意）" /></SelectTrigger>
                <SelectContent>
                  {models.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>{m.model_name}（v{m.version}）</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">デフォルトシステムプロンプト</Label>
              <Textarea placeholder="例：あなたは会計の専門家です。日本語で回答してください。" value={newPocPrompt} onChange={(e) => setNewPocPrompt(e.target.value)} rows={3} />
            </div>
            {createPocError && <p className="text-sm text-destructive">{createPocError}</p>}
            <Button onClick={handleCreatePoc} disabled={creatingPoc || !newPocName.trim() || !newPocDomain.trim()}>
              {creatingPoc ? '作成中...' : 'PoCを作成'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">モデル一覧</h2>
        <p className="text-xs text-muted-foreground">モデルの登録はDBに直接行ってください。</p>
        {models.length === 0 ? (
          <p className="text-muted-foreground text-sm">モデルが登録されていません</p>
        ) : (
          <div className="space-y-2">
            {models.map((model) => (
              <Card key={model.id}>
                <CardContent className="px-4 py-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{model.model_name}</span>
                    <Badge variant="outline">v{model.version}</Badge>
                    {model.description && <span className="text-muted-foreground text-xs">{model.description}</span>}
                  </div>
                  {model.base_model && model.base_model !== model.model_name && (
                    <p className="text-xs text-muted-foreground mt-1">base: {model.base_model}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
