import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/api/client'

export function SetupPage() {
  const [apiKey, setApiKey] = useState(localStorage.getItem('api_key') ?? '')
  const [username, setUsername] = useState('')
  const [newApiKey, setNewApiKey] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [creating, setCreating] = useState(false)

  function handleSaveApiKey() {
    localStorage.setItem('api_key', apiKey)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleCreateUser() {
    if (!username.trim()) return
    setCreating(true)
    setError('')
    setNewApiKey('')
    try {
      const res = await api.createUser(username.trim())
      setNewApiKey(res.api_key)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">設定</h1>

      {/* APIキー設定 */}
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
          <Button onClick={handleSaveApiKey}>
            {saved ? '保存しました ✓' : '保存'}
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
          {error && <p className="text-sm text-destructive">{error}</p>}
          {newApiKey && (
            <div className="space-y-1">
              <Label>発行されたAPIキー</Label>
              <div className="p-3 bg-muted rounded-md font-mono text-sm break-all">
                {newApiKey}
              </div>
              <p className="text-xs text-muted-foreground">
                このAPIキーをコピーして上の「APIキー」欄に設定してください
              </p>
            </div>
          )}
          <Button onClick={handleCreateUser} disabled={creating || !username.trim()}>
            {creating ? '作成中...' : 'ユーザーを作成'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
