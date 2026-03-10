import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api, datasetsApi } from '@/api/client'
import type { Poc, Model, Dataset } from '@/types'

export function SetupPage() {
  const [pocs, setPocs] = useState<Poc[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [datasets, setDatasets] = useState<Dataset[]>([])
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

  const [newDatasetName, setNewDatasetName] = useState('')
  const [newDatasetDesc, setNewDatasetDesc] = useState('')
  const [creatingDataset, setCreatingDataset] = useState(false)
  const [createDatasetError, setCreateDatasetError] = useState('')
  const [editingDatasetId, setEditingDatasetId] = useState<number | null>(null)
  const [editDatasetName, setEditDatasetName] = useState('')
  const [editDatasetDesc, setEditDatasetDesc] = useState('')
  const [savingDataset, setSavingDataset] = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setPocsLoading(true)
    setPocsError('')
    try {
      const [pocsRes, modelsRes, datasetsRes] = await Promise.all([
        api.getPocs(), api.getModels(), datasetsApi.getDatasets()
      ])
      setPocs(pocsRes)
      setModels(modelsRes)
      setDatasets(datasetsRes)
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
      setCreatePocError(e instanceof Error ? e.message : 'チューニング対象作成に失敗しました')
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
      setSavePocError(e instanceof Error ? e.message : 'チューニング対象更新に失敗しました')
    } finally {
      setSavingPoc(false)
    }
  }

  async function handleCreateDataset() {
    if (!newDatasetName.trim()) return
    setCreatingDataset(true)
    setCreateDatasetError('')
    try {
      await datasetsApi.createUserDataset({
        name: newDatasetName.trim(),
        description: newDatasetDesc.trim() || undefined,
      })
      setNewDatasetName(''); setNewDatasetDesc('')
      await fetchAll()
    } catch (e) {
      setCreateDatasetError(e instanceof Error ? e.message : 'データセット作成に失敗しました')
    } finally {
      setCreatingDataset(false)
    }
  }

  async function handleSaveDataset(id: number) {
    setSavingDataset(true)
    try {
      await datasetsApi.updateDataset(id, {
        name: editDatasetName.trim() || undefined,
        description: editDatasetDesc.trim() || undefined,
      })
      setEditingDatasetId(null)
      await fetchAll()
    } catch (e) {
      setCreateDatasetError(e instanceof Error ? e.message : 'データセット更新に失敗しました')
    } finally {
      setSavingDataset(false)
    }
  }

  async function handleDeleteDataset(id: number) {
    if (!confirm('このデータセットを削除しますか？')) return
    try {
      await datasetsApi.deleteDataset(id)
      await fetchAll()
    } catch (e) {
      setCreateDatasetError(e instanceof Error ? e.message : 'データセット削除に失敗しました')
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">設定</h1>

      {/* チューニング対象管理 */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">チューニング対象管理</h2>
        {pocsLoading ? (
          <p className="text-muted-foreground text-sm">読み込み中...</p>
        ) : pocsError ? (
          <p className="text-sm text-destructive">{pocsError}</p>
        ) : pocs.length === 0 ? (
          <p className="text-muted-foreground text-sm">チューニング対象が登録されていません</p>
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
          <CardHeader className="pb-2"><CardTitle className="text-base">新規チューニング対象作成</CardTitle></CardHeader>
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
              {creatingPoc ? '作成中...' : '作成'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* モデル一覧 */}
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

      <Separator />

      {/* データセット管理 */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">データセット管理</h2>
        {datasets.length === 0 ? (
          <p className="text-muted-foreground text-sm">データセットが登録されていません</p>
        ) : (
          <div className="space-y-2">
            {datasets.map((d) => (
              <Card key={d.id}>
                <CardContent className="px-4 py-3">
                  {editingDatasetId === d.id ? (
                    <div className="space-y-2">
                      <Input value={editDatasetName} onChange={(e) => setEditDatasetName(e.target.value)} placeholder="名前" />
                      <Input value={editDatasetDesc} onChange={(e) => setEditDatasetDesc(e.target.value)} placeholder="説明（任意）" />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleSaveDataset(d.id)} disabled={savingDataset}>
                          {savingDataset ? '保存中...' : '保存'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingDatasetId(null)}>キャンセル</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm">
                        <span className="font-medium">{d.name}</span>
                        {d.is_system && <Badge variant="secondary" className="ml-2 text-xs">システム</Badge>}
                        {d.description && <span className="text-muted-foreground ml-2 text-xs">{d.description}</span>}
                      </div>
                      {!d.is_system && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => {
                            setEditingDatasetId(d.id)
                            setEditDatasetName(d.name)
                            setEditDatasetDesc(d.description ?? '')
                          }}>編集</Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteDataset(d.id)}>削除</Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">新規データセット作成</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">名前 *</Label>
              <Input placeholder="例：勘定科目Q&A" value={newDatasetName} onChange={(e) => setNewDatasetName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">説明</Label>
              <Input placeholder="任意" value={newDatasetDesc} onChange={(e) => setNewDatasetDesc(e.target.value)} />
            </div>
            {createDatasetError && <p className="text-sm text-destructive">{createDatasetError}</p>}
            <Button onClick={handleCreateDataset} disabled={creatingDataset || !newDatasetName.trim()}>
              {creatingDataset ? '作成中...' : '作成'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
