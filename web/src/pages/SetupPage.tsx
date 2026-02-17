import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { api } from '@/api/client'
import type { Poc } from '@/types'

export function SetupPage() {
  // APIキー
  const [apiKey, setApiKey] = useState(localStorage.getItem('api_key') ?? '')
  const [apiKeySaved, setApiKeySaved] = useState(false)

  // ユーザー作成
  const [username, setUsername] = useState('')
  const [createdApiKey, setCreatedApiKey] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  // PoC一覧
  const [pocs, setPocs] = useState<Poc[]>([])
  const [pocsLoading, setPocsLoading] = useState(false)
  const [pocsError, setPocsError] = useState('')

  // PoC新規作成
  const [newPocName, setNewPocName] = useState('')
  const [newPocDomain, setNewPocDomain] = useState('')
  const [newPocPrompt, setNewPocPrompt] = useState('')
  const [creatingPoc, setCreatingPoc] = useState(false)
  const [createPocError, setCreatePocError] = useState('')

  // PoC編集
  const [editingPocId, setEditingPocId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editDomain, setEditDomain] = useState('')
  const [editPrompt, setEditPrompt] = useState('')
  const [savingPoc, setSavingPoc] = useState(false)
  const [savePocError, setSavePocError] = useState('')

  useEffect(() => {
    fetchPocs()
  }, [])

  async function fetchPocs() {
    setPocsLoading(true)
    setPocsError('')
    try {
      const res = await api.getPocs()
      setPocs(res)
    } catch (e) {
      setPocsError(e instanceof Error ? e.message : 'PoCの取得に失敗しました')
    } finally {
      setPocsLoading(false)
    }
  }

  function handleSaveApiKey() {
    localStorage.setItem('api_key', apiKey)
    setApiKeySaved(true)
    setTimeout(() => setApiKeySaved(false), 2000)
  }

  async function handleCreateUser() {
    if (!username.trim()) return
    setCreating(true)
    setCreateError('')
    setCreatedApiKey('')
    try {
      const res = await api.createUser(username.trim())
      setCreatedApiKey(res.api_key)
      setUsername('')
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'ユーザー作成に失敗しました')
    } finally {
      setCreating(false)
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
        default_system_prompt: newPocPrompt.trim() || undefined,
      })
      setNewPocName('')
      setNewPocDomain('')
      setNewPocPrompt('')
      await fetchPocs()
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
    setEditPrompt(poc.default_system_prompt ?? '')
    setSavePocError('')
  }

  function handleCancelEdit() {
    setEditingPocId(null)
    setSavePocError('')
  }

  async function handleSavePoc(id: number) {
    setSavingPoc(true)
    setSavePocError('')
    try {
      await api.updatePoc(id, {
        name: editName.trim() || undefined,
        domain: editDomain.trim() || undefined,
        default_system_prompt: editPrompt.trim() || undefined,
      })
      setEditingPocId(null)
      await fetchPocs()
    } catch (e) {
      setSavePocError(e instanceof Error ? e.message : 'PoC更新に失敗しました')
    } finally {
      setSavingPoc(false)
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">設定</h1>

      {/* APIキー */}
      <Card>
        <CardHeader>
          <CardTitle>APIキー</CardTitle>
          <CardDescription>バックエンドAPIへの認証キーを設定します</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-key">APIキー</Label>
            <Input
              id="api-key"
              type="password"
              placeholder="APIキーを入力"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
          <Button onClick={handleSaveApiKey} disabled={!apiKey.trim()}>
            {apiKeySaved ? '保存しました ✓' : '保存'}
          </Button>
        </CardContent>
      </Card>

      {/* ユーザー作成 */}
      <Card>
        <CardHeader>
          <CardTitle>ユーザー作成</CardTitle>
          <CardDescription>新しいユーザーを作成してAPIキーを発行します</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">ユーザー名</Label>
            <Input
              id="username"
              placeholder="ユーザー名を入力"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          {createdApiKey && (
            <div className="space-y-1">
              <Label>発行されたAPIキー</Label>
              <Input value={createdApiKey} readOnly className="bg-muted font-mono text-sm" />
              <p className="text-xs text-muted-foreground">このAPIキーをコピーして上の「APIキー」欄に設定してください</p>
            </div>
          )}
          {createError && <p className="text-sm text-destructive">{createError}</p>}
          <Button onClick={handleCreateUser} disabled={creating || !username.trim()}>
            {creating ? '作成中...' : 'ユーザーを作成'}
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* PoC管理 */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">PoC管理</h2>

        {/* PoC一覧 */}
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
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1 flex-1">
                          <Label className="text-xs">ドメイン</Label>
                          <Input
                            value={editDomain}
                            onChange={(e) => setEditDomain(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">デフォルトシステムプロンプト</Label>
                        <Textarea
                          value={editPrompt}
                          onChange={(e) => setEditPrompt(e.target.value)}
                          rows={3}
                        />
                      </div>
                      {savePocError && <p className="text-sm text-destructive">{savePocError}</p>}
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleSavePoc(poc.id)} disabled={savingPoc}>
                          {savingPoc ? '保存中...' : '保存'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                          キャンセル
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 text-sm">
                        <p className="font-medium">{poc.name}（{poc.domain}）</p>
                        <p className="text-muted-foreground text-xs">
                          {poc.default_system_prompt || '（システムプロンプト未設定）'}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => handleStartEdit(poc)}>
                        編集
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* PoC新規作成 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">新規PoC作成</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3">
              <div className="space-y-1 flex-1">
                <Label className="text-xs">名前 *</Label>
                <Input
                  placeholder="例：会計システム向けPoC"
                  value={newPocName}
                  onChange={(e) => setNewPocName(e.target.value)}
                />
              </div>
              <div className="space-y-1 flex-1">
                <Label className="text-xs">ドメイン *</Label>
                <Input
                  placeholder="例：会計"
                  value={newPocDomain}
                  onChange={(e) => setNewPocDomain(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">デフォルトシステムプロンプト</Label>
              <Textarea
                placeholder="例：あなたは会計の専門家です。日本語で回答してください。"
                value={newPocPrompt}
                onChange={(e) => setNewPocPrompt(e.target.value)}
                rows={3}
              />
            </div>
            {createPocError && <p className="text-sm text-destructive">{createPocError}</p>}
            <Button
              onClick={handleCreatePoc}
              disabled={creatingPoc || !newPocName.trim() || !newPocDomain.trim()}
            >
              {creatingPoc ? '作成中...' : 'PoCを作成'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
