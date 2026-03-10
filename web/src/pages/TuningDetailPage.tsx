import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api, logsApi, datasetsApi, systemPromptsApi } from '@/api/client'
import type { Poc, Log, Dataset, SystemPrompt } from '@/types'

const EVAL_LABEL: Record<number, string> = { 1: '良い', 2: '不十分', 3: '間違い' }
const EVAL_COLOR: Record<number, string> = {
  1: 'bg-green-100 text-green-800',
  2: 'bg-yellow-100 text-yellow-800',
  3: 'bg-red-100 text-red-800',
}

const PRIORITY_LABEL: Record<number, string> = { 1: '高', 2: '中', 3: '低' }

function LogItem({ log, datasets, pocId }: { log: import('@/types').Log; datasets: import('@/types').Dataset[]; pocId: number }) {
  const [open, setOpen] = React.useState(false)
  const navigate = useNavigate()
  return (
    <div className="border rounded-md text-sm overflow-hidden">
      <div
        className="flex items-center gap-2 p-3 cursor-pointer hover:bg-muted/50"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="font-medium truncate flex-1">{log.question}</span>
        <div className="flex items-center gap-1 shrink-0">
          {log.evaluation && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${EVAL_COLOR[log.evaluation]}`}>
              {EVAL_LABEL[log.evaluation]}
            </span>
          )}
          <span className="text-muted-foreground text-xs">{open ? '▲' : '▼'}</span>
        </div>
      </div>
      {open && (
        <div className="px-3 pb-3 space-y-3 border-t bg-muted/20">
          <div className="pt-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">質問</p>
            <p className="whitespace-pre-wrap">{log.question}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">回答</p>
            <p className="whitespace-pre-wrap">{log.answer}</p>
          </div>
          {log.evaluation && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">評価</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${EVAL_COLOR[log.evaluation]}`}>
                  {EVAL_LABEL[log.evaluation]}
                </span>
                {log.priority && (
                  <span className="text-xs bg-muted px-1.5 py-0.5 rounded">優先度: {PRIORITY_LABEL[log.priority]}</span>
                )}
              </div>
              {log.reason && <p className="text-xs text-muted-foreground">理由: {log.reason}</p>}
              {log.correct_answer && <p className="text-xs text-muted-foreground">正解: {log.correct_answer}</p>}
              {log.memo && <p className="text-xs text-muted-foreground">メモ: {log.memo}</p>}
            </div>
          )}
          {log.dataset_ids.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">分類</p>
              <div className="flex gap-1 flex-wrap">
                {log.dataset_ids.map((did) => {
                  const d = datasets.find((ds) => ds.id === did)
                  return d ? (
                    <span key={did} className="text-xs bg-muted px-1.5 py-0.5 rounded">{d.name}</span>
                  ) : null
                })}
              </div>
            </div>
          )}
          {log.system_prompt_version && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">システムプロンプト</p>
              <div className="flex items-start gap-2">
                <span className="text-xs bg-muted px-1.5 py-0.5 rounded shrink-0">v{log.system_prompt_version}</span>
                {log.system_prompt_content && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{log.system_prompt_content}</p>
                )}
              </div>
            </div>
          )}
          <button
            className="text-xs text-muted-foreground hover:text-foreground underline"
            onClick={() => navigate(`/chat/${log.session_id}`, { state: { poc_id: pocId, edit_log_id: log.id, evaluation: log.evaluation, reason: log.reason, correct_answer: log.correct_answer, priority: log.priority, dataset_ids: log.dataset_ids } })}
          >
            編集
          </button>
        </div>
      )}
    </div>
  )
}

export function TuningDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const pocId = Number(id)

  const [poc, setPoc] = useState<Poc | null>(null)
  const [systemPrompt, setSystemPrompt] = useState('')
  const [promptSaving, setPromptSaving] = useState(false)
  const [promptSaved, setPromptSaved] = useState(false)
  const [systemPromptHistory, setSystemPromptHistory] = useState<SystemPrompt[]>([])

  const [logs, setLogs] = useState<Log[]>([])
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [keyword, setKeyword] = useState('')
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | undefined>()
  const [logsLoading, setLogsLoading] = useState(false)

  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchInitial() {
      try {
        const [pocsRes, datasetsRes, promptsRes] = await Promise.all([
          api.getPocs(),
          datasetsApi.getDatasets(),
          systemPromptsApi.getSystemPrompts(pocId),
        ])
        setSystemPromptHistory(promptsRes)
        const found = pocsRes.find((p) => p.id === pocId)
        if (!found) { navigate('/'); return }
        setPoc(found)
        setSystemPrompt(found.default_system_prompt ?? '')
        setDatasets(datasetsRes)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'データ取得に失敗しました')
      }
    }
    fetchInitial()
  }, [pocId, navigate])

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true)
    try {
      const res = await logsApi.getLogs({
        poc_id: pocId,
        keyword: keyword || undefined,
        dataset_id: selectedDatasetId,
      })
      setLogs(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ログ取得に失敗しました')
    } finally {
      setLogsLoading(false)
    }
  }, [pocId, keyword, selectedDatasetId])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  async function handleSavePrompt() {
    if (!poc) return
    setPromptSaving(true)
    try {
      await systemPromptsApi.createSystemPrompt(poc.id, systemPrompt)
      setPromptSaved(true)
      setTimeout(() => setPromptSaved(false), 2000)
      // 履歴を再取得
      const prompts = await systemPromptsApi.getSystemPrompts(poc.id)
      setSystemPromptHistory(prompts)
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました')
    } finally {
      setPromptSaving(false)
    }
  }

  function handleStartSession() {
    if (!poc) return
    navigate('/chat', { state: { poc_id: poc.id, app_name: poc.app_name, system_prompt: systemPrompt } })
  }

  if (!poc) return <p className="text-muted-foreground">読み込み中...</p>

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => navigate('/')} className="text-sm text-muted-foreground hover:text-foreground mb-1">
            ← チューニング対象一覧
          </button>
          <h1 className="text-2xl font-bold">{poc.name}</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <span>{poc.domain}</span>
            <span>·</span>
            {poc.model_name ? (
              <Badge variant="outline">{poc.model_name} v{poc.model_version}</Badge>
            ) : (
              <span className="text-destructive text-xs">モデル未設定</span>
            )}
            <span>·</span>
            <code className="text-xs bg-muted px-1 rounded">{poc.app_name}</code>
            <span>·</span>
            <span>{poc.session_count} セッション</span>
          </div>
        </div>
        <Button
          onClick={handleStartSession}
          disabled={!poc.model_name}
        >
          チャット開始
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* システムプロンプト */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">システムプロンプト</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={4}
            placeholder="例：あなたは会計の専門家です。日本語で回答してください。"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={handleSavePrompt}
            disabled={promptSaving}
          >
            {promptSaved ? '保存しました' : promptSaving ? '保存中...' : '新バージョンとして保存'}
          </Button>
          {systemPromptHistory.length > 0 && (
            <div className="mt-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">履歴</p>
              <div className="space-y-1">
                {systemPromptHistory.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-start gap-2 text-xs border rounded p-2 cursor-pointer hover:bg-muted/50"
                    onClick={() => setSystemPrompt(p.content)}
                  >
                    <span className="shrink-0 font-medium">v{p.version}</span>
                    <span className="text-muted-foreground truncate">{p.content}</span>
                    <span className="shrink-0 text-muted-foreground">{new Date(p.created_at).toLocaleDateString('ja-JP')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* トレーニング履歴 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">トレーニング履歴</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">準備中</p>
        </CardContent>
      </Card>

      {/* チャット履歴 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">チャット履歴</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* フィルタ */}
          <div className="flex gap-2">
            <Input
              placeholder="キーワード検索"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="max-w-xs"
            />
            <div className="flex gap-1 flex-wrap">
              <button
                onClick={() => setSelectedDatasetId(undefined)}
                className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                  selectedDatasetId === undefined
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'text-muted-foreground border-border hover:bg-muted'
                }`}
              >
                すべて
              </button>
              {datasets.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setSelectedDatasetId(d.id === selectedDatasetId ? undefined : d.id)}
                  className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                    selectedDatasetId === d.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'text-muted-foreground border-border hover:bg-muted'
                  }`}
                >
                  {d.name}
                </button>
              ))}
            </div>
          </div>

          {/* ログ一覧 */}
          {logsLoading ? (
            <p className="text-sm text-muted-foreground">読み込み中...</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">チャット履歴がありません</p>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <LogItem key={log.id} log={log} datasets={datasets} pocId={pocId} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
