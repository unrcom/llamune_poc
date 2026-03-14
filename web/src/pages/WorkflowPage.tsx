import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { workflowsApi, systemPromptsApi } from '@/api/client'
import type { Workflow, WorkflowQuestion, SystemPrompt } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const WF_STATUS: Record<number, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  1: { label: '下書き', variant: 'outline' },
  2: { label: '実行中', variant: 'default' },
  3: { label: '完了', variant: 'secondary' },
  4: { label: 'エラー', variant: 'destructive' },
}
const Q_STATUS: Record<number, string> = {
  1: '待機中',
  2: '実行中',
  3: '完了',
  4: 'エラー',
}

type View = 'list' | 'create' | 'detail'

interface QuestionDraft {
  question: string
  expected_answer: string
}

export function WorkflowPage() {
  const { pocId } = useParams<{ pocId: string }>()
  const navigate = useNavigate()
  const numPocId = Number(pocId)
  const qc = useQueryClient()

  const [view, setView] = useState<View>('list')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [error, setError] = useState('')

  // 新規作成フォーム
  const [newName, setNewName] = useState('')
  const [newSpId, setNewSpId] = useState<number | ''>('')
  const [questions, setQuestions] = useState<QuestionDraft[]>([{ question: '', expected_answer: '' }])

  // 質問追加フォーム
  const [showAddQuestion, setShowAddQuestion] = useState(false)
  const [addQuestions, setAddQuestions] = useState<QuestionDraft[]>([{ question: '', expected_answer: '' }])

  // 実行確認モーダル
  const [showConfirm, setShowConfirm] = useState(false)

  // ワークフロー一覧
  const { data: workflows = [] } = useQuery({
    queryKey: ['workflows', numPocId],
    queryFn: () => workflowsApi.getWorkflows(numPocId),
  })

  // 選択中ワークフロー詳細
  const { data: selected } = useQuery({
    queryKey: ['workflow', selectedId],
    queryFn: () => workflowsApi.getWorkflow(selectedId!),
    enabled: selectedId !== null,
  })

  // システムプロンプト一覧
  const { data: systemPrompts = [] } = useQuery({
    queryKey: ['systemPrompts', numPocId],
    queryFn: () => systemPromptsApi.getSystemPrompts(numPocId),
  })

  // 新規作成
  const createMutation = useMutation({
    mutationFn: workflowsApi.createWorkflow,
    onSuccess: (wf) => {
      qc.invalidateQueries({ queryKey: ['workflows', numPocId] })
      setSelectedId(wf.id)
      qc.setQueryData(['workflow', wf.id], wf)
      setView('detail')
      setNewName(''); setNewSpId(''); setQuestions([{ question: '', expected_answer: '' }])
      setError('')
    },
    onError: (e: any) => setError(e.message),
  })

  // 実行
  const executeMutation = useMutation({
    mutationFn: (id: number) => workflowsApi.executeWorkflow(id),
    onSuccess: (updated) => {
      setShowConfirm(false)
      qc.setQueryData(['workflow', updated.id], updated)
      qc.invalidateQueries({ queryKey: ['workflows', numPocId] })
    },
    onError: (e: any) => setError(e.message),
  })

  // 質問追加
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof workflowsApi.updateWorkflow>[1] }) =>
      workflowsApi.updateWorkflow(id, data),
    onSuccess: (wf) => {
      qc.setQueryData(['workflow', wf.id], wf)
      qc.invalidateQueries({ queryKey: ['workflows', numPocId] })
      setShowAddQuestion(false)
      setAddQuestions([{ question: '', expected_answer: '' }])
      setError('')
    },
    onError: (e: any) => setError(e.message),
  })

  // 削除
  const deleteMutation = useMutation({
    mutationFn: workflowsApi.deleteWorkflow,
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['workflows', numPocId] })
      if (selectedId === id) { setSelectedId(null); setView('list') }
    },
    onError: (e: any) => setError(e.message),
  })

  function handleCreate() {
    if (!newName.trim()) { setError('ワークフロー名を入力してください'); return }
    const validQs = questions.filter(q => q.question.trim())
    if (validQs.length === 0) { setError('質問を1つ以上入力してください'); return }
    createMutation.mutate({
      poc_id: numPocId,
      name: newName.trim(),
      system_prompt_id: newSpId !== '' ? newSpId : undefined,
      questions: validQs.map((q, i) => ({
        order_index: i + 1,
        question: q.question.trim(),
        expected_answer: q.expected_answer.trim() || undefined,
      })),
    })
  }

  function handleAddQuestions() {
    if (!selected) return
    const validQs = addQuestions.filter(q => q.question.trim())
    if (validQs.length === 0) { setError('質問を入力してください'); return }
    updateMutation.mutate({
      id: selected.id,
      data: {
        questions: validQs.map((q, i) => ({
          order_index: selected.questions.length + i + 1,
          question: q.question.trim(),
          expected_answer: q.expected_answer.trim() || undefined,
        })),
      },
    })
  }

  const confirmSp = systemPrompts.find((sp: SystemPrompt) => sp.id === selected?.system_prompt_id)
  const pendingCount = selected?.questions.filter((q: WorkflowQuestion) => q.status !== 3).length ?? 0
  const doneCount = selected?.questions.filter((q: WorkflowQuestion) => q.status === 3).length ?? 0

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={() => navigate(`/tuning/${numPocId}`)}>← 戻る</Button>
        <h1 className="text-2xl font-bold">ワークフロー</h1>
        {view !== 'create' && (
          <Button className="ml-auto" onClick={() => { setView('create'); setError('') }}>
            ＋ 新規作成
          </Button>
        )}
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded">{error}</div>}

      {/* 一覧 */}
      {view === 'list' && (
        <div className="space-y-3">
          {workflows.length === 0 && (
            <p className="text-muted-foreground text-center py-12">ワークフローがありません。新規作成してください。</p>
          )}
          {workflows.map((wf: Workflow) => (
            <Card key={wf.id} className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => { setSelectedId(wf.id); setView('detail') }}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">{wf.name}</p>
                  <p className="text-sm text-muted-foreground">{wf.questions.length} 件の質問</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={WF_STATUS[wf.status]?.variant}>{WF_STATUS[wf.status]?.label}</Badge>
                  <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); deleteMutation.mutate(wf.id) }}>削除</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 新規作成 */}
      {view === 'create' && (
        <Card>
          <CardHeader><CardTitle>新規ワークフロー作成</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="text-sm font-medium mb-1 block">ワークフロー名 *</label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="例: 製品QA評価バッチ" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">システムプロンプト</label>
              <select
                className="w-full border rounded px-3 py-2 text-sm bg-background"
                value={newSpId}
                onChange={e => setNewSpId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">未選択（PoC共通を使用）</option>
                {systemPrompts.map((sp: SystemPrompt) => (
                  <option key={sp.id} value={sp.id}>v{sp.version} — {sp.content.slice(0, 40)}...</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">質問リスト *</label>
              <div className="space-y-4">
                {questions.map((q, i) => (
                  <div key={i} className="border rounded p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Q{i + 1}</span>
                      {questions.length > 1 && (
                        <Button variant="ghost" size="sm" onClick={() => setQuestions(prev => prev.filter((_, idx) => idx !== i))}>✕</Button>
                      )}
                    </div>
                    <Textarea
                      placeholder="質問を入力"
                      value={q.question}
                      onChange={e => setQuestions(prev => prev.map((item, idx) => idx === i ? { ...item, question: e.target.value } : item))}
                      rows={2}
                    />
                    <Input
                      placeholder="期待する回答（任意）"
                      value={q.expected_answer}
                      onChange={e => setQuestions(prev => prev.map((item, idx) => idx === i ? { ...item, expected_answer: e.target.value } : item))}
                    />
                  </div>
                ))}
              </div>
              <Button variant="outline" className="mt-3 w-full" onClick={() => setQuestions(prev => [...prev, { question: '', expected_answer: '' }])}>
                ＋ 質問を追加
              </Button>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setView('list')}>キャンセル</Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? '作成中...' : '作成'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 詳細・実行 */}
      {view === 'detail' && selected && (
        <div className="space-y-4">
          <Card>
            <CardContent className="py-4 flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold">{selected.name}</p>
                <p className="text-sm text-muted-foreground">
                  {selected.questions.length} 件の質問
                  {selected.executed_at && ` ・ 実行: ${new Date(selected.executed_at).toLocaleString('ja-JP')}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={WF_STATUS[selected.status]?.variant}>
                  {WF_STATUS[selected.status]?.label}
                </Badge>
                {(selected.status === 1 || selected.status === 4) && (
                  <Button onClick={() => { setShowConfirm(true); setError('') }}>
                    実行
                  </Button>
                )}
                <Button variant="outline" onClick={() => { setSelectedId(null); setView('list') }}>← 一覧</Button>
              </div>
            </CardContent>
          </Card>

          {/* 質問進捗リスト */}
          <div className="space-y-2">
            {selected.questions.map((q: WorkflowQuestion) => (
              <Card key={q.id}>
                <CardContent className="py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium">Q{q.order_index}. {q.question}</p>
                      {q.expected_answer && (
                        <p className="text-xs text-muted-foreground mt-1">期待: {q.expected_answer}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        q.status === 3 ? 'bg-green-100 text-green-700' :
                        q.status === 2 ? 'bg-blue-100 text-blue-700' :
                        q.status === 4 ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {Q_STATUS[q.status]}
                      </span>
                      {q.log_id && (
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/logs/${q.log_id}`)}>
                          ログ
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 質問追加 */}
          {selected.status !== 2 && (
            <div>
              {!showAddQuestion ? (
                <Button variant="outline" className="w-full" onClick={() => {
                  setShowAddQuestion(true)
                  setAddQuestions([{ question: '', expected_answer: '' }])
                }}>
                  ＋ 質問を追加
                </Button>
              ) : (
                <Card>
                  <CardHeader><CardTitle className="text-base">質問を追加</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    {addQuestions.map((q, i) => (
                      <div key={i} className="border rounded p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-muted-foreground">Q{selected.questions.length + i + 1}</span>
                          {addQuestions.length > 1 && (
                            <Button variant="ghost" size="sm" onClick={() => setAddQuestions(prev => prev.filter((_, idx) => idx !== i))}>✕</Button>
                          )}
                        </div>
                        <Textarea
                          placeholder="質問を入力"
                          value={q.question}
                          onChange={e => setAddQuestions(prev => prev.map((item, idx) => idx === i ? { ...item, question: e.target.value } : item))}
                          rows={2}
                        />
                        <Input
                          placeholder="期待する回答（任意）"
                          value={q.expected_answer}
                          onChange={e => setAddQuestions(prev => prev.map((item, idx) => idx === i ? { ...item, expected_answer: e.target.value } : item))}
                        />
                      </div>
                    ))}
                    <Button variant="outline" className="w-full" onClick={() => setAddQuestions(prev => [...prev, { question: '', expected_answer: '' }])}>
                      ＋ さらに追加
                    </Button>
                    <div className="flex justify-end gap-3">
                      <Button variant="outline" onClick={() => setShowAddQuestion(false)}>キャンセル</Button>
                      <Button onClick={handleAddQuestions} disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? '保存中...' : '保存'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {/* 実行確認モーダル */}
      {showConfirm && selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg mx-4">
            <CardHeader><CardTitle>実行確認</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">以下の設定でワークフローを実行します。</p>
              <div className="bg-muted rounded p-3 space-y-2 text-sm">
                <p><span className="font-medium">ワークフロー:</span> {selected.name}</p>
                <p><span className="font-medium">実行予定:</span> {pendingCount} 件（完了済み {doneCount} 件はスキップ）</p>
                <div>
                  <p className="font-medium mb-1">システムプロンプト:</p>
                  {confirmSp ? (
                    <pre className="text-xs bg-background rounded p-2 whitespace-pre-wrap max-h-40 overflow-y-auto">
                      {confirmSp.content}
                    </pre>
                  ) : (
                    <p className="text-muted-foreground text-xs">PoC共通のシステムプロンプトを使用</p>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowConfirm(false)}>キャンセル</Button>
                <Button onClick={() => executeMutation.mutate(selected.id)} disabled={executeMutation.isPending}>
                  {executeMutation.isPending ? '送信中...' : '実行する'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
